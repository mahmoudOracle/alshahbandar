const functions = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');
const sgMail = require('@sendgrid/mail');

admin.initializeApp();
const db = admin.firestore();

// Set the SendGrid API Key.
// Make sure to set this in your Firebase Functions environment:
// firebase functions:secrets:set SENDGRID_API_KEY
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const DEFAULT_MAX_USERS = 10;

const PLATFORM_ADMIN_EMAIL = 'mahmoud.shineh3m@gmail.com';

const isPlatformAdminUid = async (uid, email) => {
  const normalized = String(email || '').trim().toLowerCase();
  if (normalized) return normalized === PLATFORM_ADMIN_EMAIL;
  if (!uid) return false;
  try {
    const user = await admin.auth().getUser(uid);
    const resolvedEmail = String(user?.email || '').trim().toLowerCase();
    return resolvedEmail === PLATFORM_ADMIN_EMAIL;
  } catch (err) {
    functions.logger.warn('Failed to resolve platform admin email for uid', { uid, err });
    return false;
  }
};

const getCompanyMaxUsers = async (companyId) => {
  const companySnap = await db.collection('companies').doc(companyId).get();
  if (!companySnap.exists) return DEFAULT_MAX_USERS;
  const plan = companySnap.data().plan || {};
  const maxUsers = Number(plan.maxUsers);
  return Number.isFinite(maxUsers) && maxUsers > 0 ? maxUsers : DEFAULT_MAX_USERS;
};

const getCompanyUserCount = async (companyId) => {
  const usersSnap = await db.collection('companies').doc(companyId).collection('members').get();
  return usersSnap.size;
};

const getPendingInvitationCount = async (companyId) => {
  const invitesSnap = await db
    .collection('invitations')
    .where('companyId', '==', companyId)
    .where('status', '==', 'pending')
    .get();
  return invitesSnap.size;
};

const assertCompanyHasCapacity = async (companyId, opts = { includePendingInvites: false }) => {
  const maxUsers = await getCompanyMaxUsers(companyId);
  const userCount = await getCompanyUserCount(companyId);
  let pendingInvites = 0;
  if (opts.includePendingInvites) {
    pendingInvites = await getPendingInvitationCount(companyId);
  }
  if (userCount + pendingInvites >= maxUsers) {
    throw new functions.https.HttpsError(
      'resource-exhausted',
      `?? ?????? ???? ?????? ?????????? (${maxUsers}).`
    );
  }
};

exports.createCompanyAsAdmin = functions.https.onCall(async (data, context) => {
  functions.logger.info('Function execution started.');
  functions.logger.info('createCompanyAsAdmin function triggered', { data, auth: context.auth });

  try {
    // 1. Authentication & Authorization Check
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'The function must be called while authenticated.'
      );
    }
    const isAdmin = await isPlatformAdminUid(context.auth.uid, context.auth.token?.email);
    if (!isAdmin) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'The caller is not a platform administrator.'
      );
    }
    functions.logger.info('Caller is authenticated and authorized as platform admin.');

    // 2. Input validation
    const {
      id,
      name,
      companyName,
      address,
      companyAddress,
      ownerEmail,
      ownerFirstName,
      ownerLastName,
      ownerMobile,
      maxUsers,
      status,
    } = data;
    if (
      !id ||
      !(name || companyName) ||
      !(address || companyAddress) ||
      !ownerEmail ||
      !ownerFirstName ||
      !ownerLastName ||
      !ownerMobile
    ) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required company data.');
    }
    functions.logger.info('Input data validated successfully.');

    // 3. Prepare data and refs
    const companyRef = db.collection('companies').doc(id.trim());
    const invitationRef = companyRef.collection('invitations').doc(); // Auto-generate ID

    // Check if company ID already exists
    const existingCompany = await companyRef.get();
    if (existingCompany.exists) {
      throw new functions.https.HttpsError(
        'already-exists',
        'A company with this ID already exists.'
      );
    }

    const resolvedCompanyName = String(companyName || name).trim();
    const resolvedAddress = String(companyAddress || address).trim();
    const parsedMaxUsers = Number(maxUsers);
    const statusValue = status === 'pending' || status === 'rejected' ? status : 'approved';
    const newCompany = {
      companyName: resolvedCompanyName,
      companyAddress: resolvedAddress,
      email: ownerEmail.trim(),
      emailLower: ownerEmail.trim().toLowerCase(),
      ownerName: `${ownerFirstName} ${ownerLastName}`.trim(),
      ownerUid: null,
      status: statusValue,
      plan: {
        maxUsers:
          Number.isFinite(parsedMaxUsers) && parsedMaxUsers > 0 ? parsedMaxUsers : DEFAULT_MAX_USERS,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const ownerInvitation = {
      email: ownerEmail.trim(),
      emailLower: ownerEmail.trim().toLowerCase(),
      role: 'owner',
      invitedByUid: context.auth.uid,
      invitedByEmail: context.auth.token.email || 'platform-admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      used: false,
    };

    // 4. Execute batch write
    functions.logger.info('Preparing to commit batch write for new company and invitation.');
    const batch = db.batch();
    batch.set(companyRef, newCompany);
    batch.set(invitationRef, ownerInvitation);

    await batch.commit();
    functions.logger.info(`Successfully created company ${companyRef.id}.`);

    // 5. Return result
    return { success: true, companyId: companyRef.id };
  } catch (error) {
    // Log the detailed error to the Firebase console
    functions.logger.error('Error in createCompanyAsAdmin:', {
      errorMessage: error.message,
      errorCode: error.code,
      errorStack: error.stack,
      requestData: data,
      authContext: context.auth,
    });

    // Re-throw the error so the client gets it
    if (error instanceof functions.https.HttpsError) {
      throw error;
    } else {
      // For unexpected errors, throw a generic internal error
      throw new functions.https.HttpsError(
        'internal',
        'An unexpected error occurred on the server.'
      );
    }
  }
});

exports.createPlatformCompanyWithManager = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  const isAdmin = await isPlatformAdminUid(context.auth.uid, context.auth.token?.email);
  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'The caller is not a platform admin.');
  }

  const {
    companyName,
    managerFullName,
    managerEmail,
    managerPassword,
    maxUsers,
    status,
  } = data || {};

  if (!companyName || !managerFullName || !managerEmail || !managerPassword) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
  }

  const email = String(managerEmail).trim().toLowerCase();
  const password = String(managerPassword);
  if (password.length < 6) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Temporary password must be at least 6 characters.'
    );
  }

  const statusValue = status === 'pending' || status === 'rejected' ? status : 'approved';
  const parsedMaxUsers = Number(maxUsers);
  const planMaxUsers =
    Number.isFinite(parsedMaxUsers) && parsedMaxUsers > 0 ? parsedMaxUsers : DEFAULT_MAX_USERS;

  let createdUser = null;
  try {
    try {
      const existing = await admin.auth().getUserByEmail(email);
      if (existing && existing.uid) {
        throw new functions.https.HttpsError(
          'already-exists',
          'Manager email already exists in Firebase Auth.'
        );
      }
    } catch (err) {
      if (err?.code !== 'auth/user-not-found') throw err;
    }

    const fullName = String(managerFullName).trim();
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ');

    createdUser = await admin.auth().createUser({
      email,
      password,
      displayName: fullName,
      emailVerified: false,
      disabled: false,
    });

    const companyRef = db.collection('companies').doc();
    const companyId = companyRef.id;
    const now = admin.firestore.FieldValue.serverTimestamp();

    const batch = db.batch();
    batch.set(companyRef, {
      companyName: String(companyName).trim(),
      status: statusValue,
      ownerUid: createdUser.uid,
      email,
      emailLower: email,
      plan: { maxUsers: planMaxUsers },
      createdAt: now,
      updatedAt: now,
    });

    batch.set(companyRef.collection('members').doc(createdUser.uid), {
      uid: createdUser.uid,
      email,
      fullName: fullName,
      firstName,
      lastName,
      role: 'manager',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });

    batch.set(db.collection('users').doc(createdUser.uid), {
      uid: createdUser.uid,
      email,
      name: fullName,
      firstName,
      lastName,
      companyId,
      createdAt: now,
      updatedAt: now,
    });

    await batch.commit();

    return {
      success: true,
      companyId,
      managerUid: createdUser.uid,
      managerEmail: email,
      tempPassword: password,
    };
  } catch (error) {
    if (createdUser && createdUser.uid) {
      try {
        await admin.auth().deleteUser(createdUser.uid);
      } catch (cleanupErr) {
        functions.logger.error('Failed to cleanup auth user after company creation error', {
          uid: createdUser.uid,
          error: cleanupErr?.message || cleanupErr,
        });
      }
    }

    if (error instanceof functions.https.HttpsError) throw error;
    functions.logger.error('Error in createPlatformCompanyWithManager', {
      errorMessage: error?.message || error,
      errorStack: error?.stack,
      requestData: data,
      authContext: context.auth,
    });
    throw new functions.https.HttpsError('internal', 'Failed to create company and manager.');
  }
});

// Create goods receipt atomically on the server: increases product stock, writes inventory snapshots,
// appends stockLedger entries and writes goodsReceipt doc in a transaction.
exports.createGoodsReceiptAtomic = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  const { companyId, receipt } = data || {};
  if (!companyId || !receipt || !Array.isArray(receipt.items) || receipt.items.length === 0) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'companyId and receipt with items are required'
    );
  }

  try {
    // Authorization: platform admin OR company member with role owner/manager
    let authorized = await isPlatformAdminUid(context.auth.uid, context.auth.token?.email);
    if (!authorized) {
      const memberRef = db
        .collection('companies')
        .doc(companyId)
        .collection('members')
        .doc(context.auth.uid);
      const memberDoc = await memberRef.get();
      if (memberDoc.exists) {
        const role = (memberDoc.data() || {}).role || '';
        if (['owner', 'manager'].includes(role)) authorized = true;
      }
    }
    if (!authorized) throw new functions.https.HttpsError('permission-denied', 'Not authorized');

    const receiptRef = db.collection('companies').doc(companyId).collection('goodsReceipts').doc();

    await db.runTransaction(async (tx) => {
      const supRef = db
        .collection('companies')
        .doc(companyId)
        .collection('suppliers')
        .doc(receipt.supplierId);
      const supSnap = await tx.get(supRef);
      if (!supSnap.exists) throw new functions.https.HttpsError('not-found', 'Supplier not found');

      const createdLedgerEntries = [];
      for (const it of receipt.items) {
        const prodRef = db
          .collection('companies')
          .doc(companyId)
          .collection('products')
          .doc(it.productId);
        const prodSnap = await tx.get(prodRef);
        if (!prodSnap.exists)
          throw new functions.https.HttpsError('not-found', `Product not found: ${it.productId}`);
        const prodData = prodSnap.data() || {};
        const currentStock = Number(prodData.stock || 0);
        const qty = Number(it.quantity || 0);
        const newStock = currentStock + qty;

        tx.update(prodRef, {
          stock: newStock,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Inventory snapshot
        const invRef = db
          .collection('companies')
          .doc(companyId)
          .collection('inventory')
          .doc(String(it.productId));
        tx.set(
          invRef,
          {
            productId: String(it.productId),
            quantity: newStock,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        // Ledger entry
        const ledgerRef = db.collection('companies').doc(companyId).collection('stockLedger').doc();
        const ledgerPayload = {
          productId: String(it.productId),
          change: qty,
          qtyBefore: currentStock,
          qtyAfter: newStock,
          unitCost: null,
          sourceType: 'PURCHASE',
          referenceId: receiptRef.id,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: context.auth.uid,
        };
        tx.set(ledgerRef, ledgerPayload);
        createdLedgerEntries.push({ id: ledgerRef.id, ...ledgerPayload });
      }

      const payload = {
        supplierId: receipt.supplierId,
        supplierName: (supSnap.data() || {}).name || null,
        items: receipt.items,
        receivedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      tx.set(receiptRef, payload);
    });

    return { success: true, receiptId: receiptRef.id };
  } catch (err) {
    console.error('[createGoodsReceiptAtomic] failed', err);
    if (err instanceof functions.https.HttpsError) throw err;
    throw new functions.https.HttpsError('internal', 'Failed to create goods receipt atomically');
  }
});

// Sales summary callable: returns aggregated totals for a company within optional date range
exports.getSalesSummary = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  const { companyId, from, to } = data || {};
  if (!companyId) throw new functions.https.HttpsError('invalid-argument', 'companyId is required');

  try {
    // Authorization: ensure caller is member of the company or platform admin
    let authorized = await isPlatformAdminUid(context.auth.uid, context.auth.token?.email);
    if (!authorized) {
      const memberRef = db
        .collection('companies')
        .doc(companyId)
        .collection('members')
        .doc(context.auth.uid);
      const memberDoc = await memberRef.get();
      if (memberDoc.exists) authorized = true;
    }
    if (!authorized) throw new functions.https.HttpsError('permission-denied', 'Not authorized');

    let invoicesQuery = db.collection('companies').doc(companyId).collection('invoices');
    if (from)
      invoicesQuery = invoicesQuery.where(
        'date',
        '>=',
        admin.firestore.Timestamp.fromDate(new Date(from))
      );
    if (to)
      invoicesQuery = invoicesQuery.where(
        'date',
        '<=',
        admin.firestore.Timestamp.fromDate(new Date(to))
      );

    const snapshots = await invoicesQuery.limit(500).get();
    let totalSales = 0;
    let invoiceCount = 0;
    snapshots.forEach((docSnap) => {
      const d = docSnap.data();
      const t = Number(d.total) || 0;
      totalSales += t;
      invoiceCount += 1;
    });

    return { totalSales, invoiceCount };
  } catch (err) {
    console.error('[getSalesSummary] failed', err);
    throw new functions.https.HttpsError('internal', 'Failed to compute sales summary');
  }
});

// Export sales CSV: produce a CSV file for the requested date range and store in Cloud Storage.
exports.exportSalesCsv = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  const { companyId, from, to } = data || {};
  if (!companyId) throw new functions.https.HttpsError('invalid-argument', 'companyId is required');

  try {
    // Authorization: company member or platform admin
    let authorized = await isPlatformAdminUid(context.auth.uid, context.auth.token?.email);
    if (!authorized) {
      const memberRef = db
        .collection('companies')
        .doc(companyId)
        .collection('members')
        .doc(context.auth.uid);
      const memberDoc = await memberRef.get();
      if (memberDoc.exists) authorized = true;
    }
    if (!authorized) throw new functions.https.HttpsError('permission-denied', 'Not authorized');

    let invoicesQuery = db.collection('companies').doc(companyId).collection('invoices');
    if (from)
      invoicesQuery = invoicesQuery.where(
        'date',
        '>=',
        admin.firestore.Timestamp.fromDate(new Date(from))
      );
    if (to)
      invoicesQuery = invoicesQuery.where(
        'date',
        '<=',
        admin.firestore.Timestamp.fromDate(new Date(to))
      );

    // For large exports this should be paginated; we limit to 5000 for now
    const snapshots = await invoicesQuery.limit(5000).get();
    const rows = [];
    rows.push(['invoiceId', 'date', 'customerId', 'total']);
    snapshots.forEach((snap) => {
      const d = snap.data();
      rows.push([
        snap.id,
        d.date ? d.date.toDate().toISOString() : '',
        d.customerId || '',
        String(d.total || ''),
      ]);
    });

    const csv = rows
      .map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(','))
      .join('\n');

    // Save to Cloud Storage
    const bucket = admin.storage().bucket();
    const filename = `reports/${companyId}/sales_${Date.now()}.csv`;
    const file = bucket.file(filename);
    await file.save(csv, { contentType: 'text/csv' });

    // Make the file readable for a short time via signed URL
    try {
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 1000 * 60 * 60,
      });
      return { success: true, url, path: filename };
    } catch (err) {
      // Fallback: return path (user can fetch via admin console or presigned setup)
      return { success: true, path: filename };
    }
  } catch (err) {
    console.error('[exportSalesCsv] failed', err);
    throw new functions.https.HttpsError('internal', 'Export failed');
  }
});

// Simple callable to check whether the caller is a platform admin.
// The client uses this to hide/show platform admin UI. Providing this
// callable avoids CORS/preflight errors that happen when the client
// tries to call a non-existent function URL.
exports.isPlatformAdmin = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) return { isAdmin: false };
    const isAdmin = await isPlatformAdminUid(context.auth.uid, context.auth.token?.email);
    return { isAdmin };
  } catch (err) {
    console.error('[isPlatformAdmin] failed', err);
    // Fail closed: treat as not admin to avoid exposing admin UI on errors
    return { isAdmin: false };
  }
});

// Platform summary (admin only): counts + latest companies.
exports.getPlatformSummary = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  const isAdmin = await isPlatformAdminUid(context.auth.uid, context.auth.token?.email);
  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'The caller is not a platform admin.');
  }

  const safeCount = async (query) => {
    if (typeof query.count === 'function') {
      const snap = await query.count().get();
      return Number(snap?.data()?.count || 0);
    }
    const snap = await query.get();
    return snap.size;
  };

  try {
    const [companiesCount, usersCount, invoicesCount, latestCompaniesSnap] = await Promise.all([
      safeCount(db.collection('companies')),
      safeCount(db.collection('users')),
      safeCount(db.collectionGroup('invoices')),
      db.collection('companies').orderBy('createdAt', 'desc').limit(5).get(),
    ]);

    const latestCompanies = latestCompaniesSnap.docs.map((doc) => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        name: data.companyName || data.name || null,
        createdAt: data.createdAt || null,
        isActive: data.isActive !== false,
      };
    });

    return { companiesCount, usersCount, invoicesCount, latestCompanies };
  } catch (err) {
    console.error('[getPlatformSummary] failed', err);
    throw new functions.https.HttpsError('internal', 'Failed to load platform summary');
  }
});

// Platform: list companies (admin only)
exports.platformListCompanies = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  const isAdmin = await isPlatformAdminUid(context.auth.uid, context.auth.token?.email);
  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'The caller is not a platform admin.');
  }

  const rawLimit = data && data.limit ? Number(data.limit) : 50;
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 200) : 50;

  try {
    const snap = await db.collection('companies').orderBy('createdAt', 'desc').limit(limit).get();
    const companies = snap.docs.map((doc) => {
      const c = doc.data() || {};
      return {
        id: doc.id,
        name: c.name || c.companyName || null,
        isActive: c.isActive !== false,
        plan: c.plan || 'free',
        createdAt: c.createdAt || null,
        contactEmail: c.contactEmail || c.email || null,
        phone: c.phone || null,
        address: c.address || c.companyAddress || null,
        city: c.city || null,
        country: c.country || null,
        contactPersonName: c.contactPersonName || null,
        contactPersonTitle: c.contactPersonTitle || null,
      };
    });
    return { companies };
  } catch (err) {
    console.error('[platformListCompanies] failed', err);
    throw new functions.https.HttpsError('internal', 'Failed to list companies');
  }
});

// Platform: create company (admin only)
exports.platformCreateCompany = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  const isAdmin = await isPlatformAdminUid(context.auth.uid, context.auth.token?.email);
  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'The caller is not a platform admin.');
  }

  const payload = data || {};
  const requiredFields = [
    'name',
    'ownerUid',
    'contactEmail',
    'phone',
    'address',
    'city',
    'country',
    'contactPersonName',
    'contactPersonTitle',
  ];
  for (const field of requiredFields) {
    if (!payload[field] || String(payload[field]).trim().length === 0) {
      throw new functions.https.HttpsError('invalid-argument', `Missing required field: ${field}`);
    }
  }

  const companyRef = db.collection('companies').doc();
  const now = admin.firestore.FieldValue.serverTimestamp();
  const planValue = payload.plan && String(payload.plan).trim() ? String(payload.plan) : 'free';

  const companyDoc = {
    name: String(payload.name).trim(),
    companyName: String(payload.name).trim(),
    ownerUid: String(payload.ownerUid).trim(),
    isActive: true,
    plan: planValue,
    createdAt: now,
    updatedAt: now,
    contactEmail: String(payload.contactEmail).trim(),
    phone: String(payload.phone).trim(),
    address: String(payload.address).trim(),
    city: String(payload.city).trim(),
    country: String(payload.country).trim(),
    contactPersonName: String(payload.contactPersonName).trim(),
    contactPersonTitle: String(payload.contactPersonTitle).trim(),
    notes: payload.notes ? String(payload.notes) : null,
    taxId: payload.taxId ? String(payload.taxId) : null,
    commercialReg: payload.commercialReg ? String(payload.commercialReg) : null,
  };

  const ownerUid = companyDoc.ownerUid;
  const ownerRef = db.collection('users').doc(ownerUid);
  const memberRef = companyRef.collection('members').doc(ownerUid);

  try {
    const ownerSnap = await ownerRef.get();
    const batch = db.batch();
    batch.set(companyRef, companyDoc);
    batch.set(memberRef, {
      uid: ownerUid,
      role: 'owner',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
    if (ownerSnap.exists) {
      batch.set(ownerRef, { updatedAt: now }, { merge: true });
    } else {
      batch.set(ownerRef, { uid: ownerUid, createdAt: now, updatedAt: now }, { merge: true });
    }
    await batch.commit();
    const auditRef = db.collection('auditLogs').doc();
    await auditRef.set({
      uid: context.auth.uid,
      email: context.auth.token?.email || null,
      action: 'company_create',
      companyId: companyRef.id,
      meta: { name: companyDoc.name },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { companyId: companyRef.id };
  } catch (err) {
    console.error('[platformCreateCompany] failed', err);
    throw new functions.https.HttpsError('internal', 'Failed to create company');
  }
});

// Platform audit log (admin only)
exports.logAuditEvent = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  const isAdmin = await isPlatformAdminUid(context.auth.uid, context.auth.token?.email);
  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'The caller is not a platform admin.');
  }

  const { action, companyId, meta } = data || {};
  if (!action) {
    throw new functions.https.HttpsError('invalid-argument', 'action is required');
  }

  const payload = {
    uid: context.auth.uid,
    email: context.auth.token?.email || null,
    action: String(action),
    companyId: companyId || null,
    meta: meta || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  try {
    const ref = db.collection('auditLogs').doc();
    await ref.set(payload);
    return { success: true, id: ref.id };
  } catch (err) {
    console.error('[logAuditEvent] failed', err);
    throw new functions.https.HttpsError('internal', 'Failed to write audit log');
  }
});

// Platform admin: freeze/unfreeze a company
exports.setCompanyActive = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  const isAdmin = await isPlatformAdminUid(context.auth.uid, context.auth.token?.email);
  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'The caller is not a platform admin.');
  }

  const { companyId, isActive } = data || {};
  if (!companyId || typeof isActive !== 'boolean') {
    throw new functions.https.HttpsError('invalid-argument', 'companyId and isActive are required');
  }

  try {
    const companyRef = db.collection('companies').doc(companyId);
    const snap = await companyRef.get();
    if (!snap.exists) {
      throw new functions.https.HttpsError('not-found', 'Company not found');
    }

    await companyRef.set(
      {
        isActive,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const auditRef = db.collection('auditLogs').doc();
    await auditRef.set({
      uid: context.auth.uid,
      email: context.auth.token?.email || null,
      action: isActive ? 'company_unfreeze' : 'company_freeze',
      companyId,
      meta: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (err) {
    if (err instanceof functions.https.HttpsError) throw err;
    console.error('[setCompanyActive] failed', err);
    throw new functions.https.HttpsError('internal', 'Failed to update company status');
  }
});

exports.createInvitation = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');

  // Ensure the user has configured the SendGrid key
  if (!process.env.SENDGRID_API_KEY) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Email service is not configured. Please set the SENDGRID_API_KEY secret.'
    );
  }

  const { email, companyName, notes } = data;
  if (!email || !companyName)
    throw new functions.https.HttpsError('invalid-argument', 'Missing fields');

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const companyId = companyName.toLowerCase().replace(/[^\w]+/g, '-') + '-' + Date.now();

  const inviteRef = db.collection('invitations').doc();
  await inviteRef.set({
    email,
    emailLower: email.trim().toLowerCase(),
    companyName,
    companyId,
    tokenHash,
    status: 'pending',
    createdBy: context.auth.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    notes: notes || null,
  });

  // Fetch the inviter's company name for a professional email
  let inviterBusinessName = 'Alshabandar Business Suite'; // Fallback
  try {
    const inviterProfileSnap = await db.collection('users').doc(context.auth.uid).get();
    if (inviterProfileSnap.exists) {
      const inviterCompanyId = inviterProfileSnap.data().companyId;
      const inviterCompanySnap = await db.collection('companies').doc(inviterCompanyId).get();
      if (inviterCompanySnap.exists) {
        inviterBusinessName = inviterCompanySnap.data().name;
      }
    }
  } catch (e) {
    console.warn("Could not fetch inviter's company name:", e);
  }

  // Use the reliably-injected FIREBASE_CONFIG to get the project ID
  const projectId = JSON.parse(process.env.FIREBASE_CONFIG).projectId;
  // Add '#' for HashRouter compatibility
  const acceptUrl = `https://${projectId}.web.app/#/invite/accept?token=${token}&inviteId=${inviteRef.id}`;

  // Send the invitation email via SendGrid
  const msg = {
    to: email,
    // IMPORTANT: You must configure a verified sender in your SendGrid account.
    from: 'support@yourdomain.com',
    subject: `You're invited to join ${companyName} on ${inviterBusinessName}'s Platform`,
    html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2>Hello!</h2>
            <p>You have been invited by <strong>${inviterBusinessName}</strong> to set up your company, <strong>${companyName}</strong>, on the Alshabandar Business Suite platform.</p>
            <p>Click the button below to accept the invitation and create your account. This link is valid for 7 days.</p>
            <a href="${acceptUrl}" style="background-color: #007bff; color: white; padding: 15px 25px; text-align: center; text-decoration: none; display: inline-block; border-radius: 5px; font-size: 16px;">Accept Invitation</a>
            <p style="margin-top: 20px; font-size: 12px; color: #777;">If you did not expect this invitation, you can safely ignore this email.</p>
        </div>
    `,
  };

  try {
    await sgMail.send(msg);
  } catch (error) {
    console.error('Error sending invitation email:', error);
    // If the email fails, we should still let the user know, but the invitation is still created.
    // For a more robust system, we might delete the invitation or mark it as failed.
    throw new functions.https.HttpsError(
      'internal',
      'The invitation was created, but failed to send the email.'
    );
  }

  return { success: true, inviteId: inviteRef.id };
});

// Create an invitation for an EXISTING company. This callable validates the caller is a company owner/manager or platform admin,
// stores a top-level invitation (so acceptInvitation can work consistently), and sends an email with a secure token.
exports.createCompanyInvitation = functions.https.onCall(async (data, context) => {
  functions.logger.info('[DEBUG][Invite] createCompanyInvitation called', {
    data,
    auth: context.auth,
  });
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');

  if (!process.env.SENDGRID_API_KEY) {
    throw new functions.https.HttpsError('failed-precondition', 'Email service is not configured.');
  }

  const { companyId, email, role = 'manager', notes } = data || {};
  if (!companyId || !email)
    throw new functions.https.HttpsError('invalid-argument', 'Missing companyId or email');

  try {
    // Authorization: platform admin OR company owner/manager
    let authorized = await isPlatformAdminUid(context.auth.uid, context.auth.token?.email);

    if (!authorized) {
      const memberRef = db
        .collection('companies')
        .doc(companyId)
        .collection('members')
        .doc(context.auth.uid);
      const memberDoc = await memberRef.get();
      if (memberDoc.exists) {
        const member = memberDoc.data();
        if (member.role === 'owner' || member.role === 'manager') authorized = true;
      }
    }

    if (!authorized) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Caller is not authorized to invite users for this company'
      );
    }

    await assertCompanyHasCapacity(companyId, { includePendingInvites: true });

    // Create token and store top-level invitation for consistent acceptance flow
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const inviteRef = db.collection('invitations').doc();
    await inviteRef.set({
      email,
      emailLower: email.trim().toLowerCase(),
      companyId,
      companyName: (await db.collection('companies').doc(companyId).get()).data()?.name || null,
      role,
      tokenHash,
      status: 'pending',
      createdBy: context.auth.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      notes: notes || null,
    });

    // Prepare email
    const projectId = JSON.parse(process.env.FIREBASE_CONFIG).projectId;
    const acceptUrl = `https://${projectId}.web.app/#/invite/accept/${companyId}/${inviteRef.id}/${token}`;
    const inviterSnap = await db.collection('companies').doc(companyId).get();
    const inviterName = inviterSnap.exists ? inviterSnap.data().name : 'Alshabandar Business Suite';

    const msg = {
      to: email,
      from: 'support@yourdomain.com',
      subject: `You're invited to join ${inviterName}`,
      html: `<p>You have been invited to join <strong>${inviterName}</strong> as <strong>${role}</strong>. Click <a href="${acceptUrl}">here</a> to accept.</p>`,
    };

    await sgMail.send(msg);

    functions.logger.info('[DEBUG][Invite] Invitation created', {
      inviteId: inviteRef.id,
      companyId,
      emailLower: email.trim().toLowerCase(),
    });
    return { success: true, inviteId: inviteRef.id };
  } catch (err) {
    functions.logger.error('[DEBUG][Invite] createCompanyInvitation failed', {
      error: err.message,
      stack: err.stack,
    });
    if (err instanceof functions.https.HttpsError) throw err;
    throw new functions.https.HttpsError('internal', 'Failed to create company invitation');
  }
});

exports.acceptInvitation = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  const { inviteId, token } = data;
  if (!inviteId || !token)
    throw new functions.https.HttpsError('invalid-argument', 'Missing inviteId/token');

  const inviteRef = db.collection('invitations').doc(inviteId);
  const inviteSnap = await inviteRef.get();
  if (!inviteSnap.exists) throw new functions.https.HttpsError('not-found', 'Invite not found');

  const invite = inviteSnap.data();
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  if (tokenHash !== invite.tokenHash)
    throw new functions.https.HttpsError('permission-denied', 'Invalid token');

  if (invite.expiresAt.toMillis() < Date.now()) {
    await inviteRef.update({ status: 'expired' });
    throw new functions.https.HttpsError('deadline-exceeded', 'Invite expired');
  }

  const uid = context.auth.uid;
  const companyId = invite.companyId;

  await assertCompanyHasCapacity(companyId, { includePendingInvites: false });

  // Create company membership under companies/{companyId}/members/{uid} and mark invite used
  await db.runTransaction(async (tx) => {
    const companyRef = db.collection('companies').doc(companyId);
    const companySnap = await tx.get(companyRef);
    if (!companySnap.exists) {
      tx.set(companyRef, {
        id: companyId,
        name: invite.companyName,
        ownerUid: invite.role === 'owner' ? uid : null,
        status: 'trial',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    const membershipRef = companyRef.collection('members').doc(uid);
    const membershipData = {
      uid,
      email: context.auth.token.email || null,
      role: invite.role || 'manager',
      status: 'active',
      profileCompleted: invite.role === 'owner',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    tx.set(membershipRef, membershipData, { merge: true });

    // Also update top-level users profile for compatibility (optional merge)
    const userProfileRef = db.collection('users').doc(uid);
    tx.set(
      userProfileRef,
      {
        uid,
        email: context.auth.token.email || null,
        role: invite.role || 'manager',
        companyId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    tx.update(inviteRef, {
      status: 'accepted',
      acceptedBy: uid,
      acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // If owner invite, ensure company.ownerUid is set
    if (invite.role === 'owner') {
      tx.update(companyRef, {
        ownerUid: uid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });

  functions.logger.info('[DEBUG][AcceptInvitation] Invitation accepted', {
    inviteId,
    companyId,
    uid,
  });
  return { success: true, companyId };
});

// Safe delete callable: performs server-side validation and a soft-delete with audit logging.
exports.safeDeleteDocument = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  const { companyId, collectionName, id, reason } = data || {};
  if (!companyId || !collectionName || !id)
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing companyId, collectionName or id'
    );

  // Authorization: platform admin OR company owner/manager
  try {
    let authorized = await isPlatformAdminUid(context.auth.uid, context.auth.token?.email);

    if (!authorized) {
      const memberRef = db
        .collection('companies')
        .doc(companyId)
        .collection('members')
        .doc(context.auth.uid);
      const memberDoc = await memberRef.get();
      if (memberDoc.exists) {
        const member = memberDoc.data();
        const role = member && member.role ? String(member.role).toLowerCase() : '';
        if (['owner', 'manager', 'company_owner', 'admin'].includes(role)) authorized = true;
      }
    }

    if (!authorized) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Caller is not authorized to delete this resource'
      );
    }

    const docRef = db.collection('companies').doc(companyId).collection(collectionName).doc(id);
    const snap = await docRef.get();
    if (!snap.exists) throw new functions.https.HttpsError('not-found', 'Document not found');
    const before = snap.data();

    const batch = db.batch();

    // Soft-delete: mark document deleted and keep previous data for audit
    batch.update(docRef, {
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      deletedBy: context.auth.uid,
      deletedByEmail: context.auth.token.email || null,
      deletedReason: reason || null,
      isDeleted: true,
    });

    // If invoices, attempt to restore stock counts for items
    if (collectionName === 'invoices' && Array.isArray(before?.items)) {
      for (const item of before.items) {
        try {
          if (!item.productId || !item.quantity) continue;
          const prodRef = db
            .collection('companies')
            .doc(companyId)
            .collection('products')
            .doc(String(item.productId));
          batch.update(prodRef, {
            stock: admin.firestore.FieldValue.increment(Number(item.quantity) || 0),
          });
        } catch (e) {
          console.warn('Could not enqueue stock increment for item', item, e?.message || e);
        }
      }
    }

    // Audit log entry
    const auditRef = db.collection('companies').doc(companyId).collection('auditLogs').doc();
    batch.set(auditRef, {
      action: 'soft-delete',
      collection: collectionName,
      docId: id,
      performedBy: context.auth.uid,
      performedByEmail: context.auth.token.email || null,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      reason: reason || null,
      before: before || null,
    });

    await batch.commit();
    return { success: true };
  } catch (err) {
    console.error('[safeDeleteDocument] failed', err);
    if (err instanceof functions.https.HttpsError) throw err;
    throw new functions.https.HttpsError('internal', 'Failed to delete document');
  }
});

// Safe undelete callable: reverses a soft-delete performed by safeDeleteDocument
exports.safeUndeleteDocument = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  const { companyId, collectionName, id } = data || {};
  if (!companyId || !collectionName || !id)
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing companyId, collectionName or id'
    );

  try {
    let authorized = await isPlatformAdminUid(context.auth.uid, context.auth.token?.email);

    if (!authorized) {
      const memberRef = db
        .collection('companies')
        .doc(companyId)
        .collection('members')
        .doc(context.auth.uid);
      const memberDoc = await memberRef.get();
      if (memberDoc.exists) {
        const member = memberDoc.data();
        const role = member && member.role ? String(member.role).toLowerCase() : '';
        if (['owner', 'manager', 'company_owner', 'admin'].includes(role)) authorized = true;
      }
    }

    if (!authorized)
      throw new functions.https.HttpsError('permission-denied', 'Caller not authorized');

    const docRef = db.collection('companies').doc(companyId).collection(collectionName).doc(id);
    const snap = await docRef.get();
    if (!snap.exists) throw new functions.https.HttpsError('not-found', 'Document not found');

    const batch = db.batch();
    batch.update(docRef, {
      isDeleted: false,
      deletedAt: admin.firestore.FieldValue.delete(),
      deletedBy: admin.firestore.FieldValue.delete(),
      deletedByEmail: admin.firestore.FieldValue.delete(),
      deletedReason: admin.firestore.FieldValue.delete(),
    });

    const auditRef = db.collection('companies').doc(companyId).collection('auditLogs').doc();
    batch.set(auditRef, {
      action: 'undelete',
      collection: collectionName,
      docId: id,
      performedBy: context.auth.uid,
      performedByEmail: context.auth.token.email || null,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();
    return { success: true };
  } catch (err) {
    console.error('[safeUndeleteDocument] failed', err);
    if (err instanceof functions.https.HttpsError) throw err;
    throw new functions.https.HttpsError('internal', 'Failed to undelete document');
  }
});

// Resolve first login: link any pending invitations for the authenticated user's email to their UID.
// This runs server-side with admin privileges and avoids exposing invitations to the client.
exports.resolveFirstLogin = functions.https.onCall(async (data, context) => {
  functions.logger.info('[DEBUG][OwnerLink] resolveFirstLogin called', {
    auth: context.auth,
    data,
  });
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');

  const uid = context.auth.uid;
  const email =
    context.auth.token && context.auth.token.email
      ? context.auth.token.email.trim()
      : data && data.email
        ? String(data.email).trim()
        : null;
  if (!email) {
    return { success: false, message: 'no-email' };
  }
  const emailLower = email.toLowerCase();

  try {
    // STEP 1: Check for existing memberships (from createOwnerCompany sign-up flow)
    functions.logger.info(
      '[DEBUG][OwnerLink] Checking for existing memberships created during sign-up',
      { uid }
    );
    const membershipSnap = await db.collectionGroup('members').where('uid', '==', uid).get();
    if (!membershipSnap.empty) {
      functions.logger.info('[DEBUG][OwnerLink] Found existing memberships from sign-up flow', {
        count: membershipSnap.size,
        uid,
      });
      return { success: true, message: 'already-linked' };
    }

    // STEP 2: Query top-level invitations by emailLower (old invitation-based flow)
    const invitesSnap = await db
      .collection('invitations')
      .where('emailLower', '==', emailLower)
      .where('status', '==', 'pending')
      .get();
    functions.logger.info('[DEBUG][OwnerLink] found invitations', {
      count: invitesSnap.size,
      emailLower,
    });

    if (invitesSnap.empty) {
      return { success: false, message: 'no-invitations' };
    }

    let membershipCreated = false;

    for (const inviteDoc of invitesSnap.docs) {
      const invite = inviteDoc.data();
      const companyId = invite.companyId;
      if (!companyId) continue;

      await db.runTransaction(async (tx) => {
        const companyRef = db.collection('companies').doc(companyId);
        const companySnap = await tx.get(companyRef);
        if (!companySnap.exists) {
          tx.set(companyRef, {
            id: companyId,
            name: invite.companyName || null,
            ownerUid: invite.role === 'owner' ? uid : null,
            status: 'trial',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        const membershipRef = companyRef.collection('members').doc(uid);
        const membershipData = {
          uid,
          email: email,
          role: invite.role || 'manager',
          status: 'active',
          profileCompleted: invite.role === 'owner',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        tx.set(membershipRef, membershipData, { merge: true });

        const userProfileRef = db.collection('users').doc(uid);
        tx.set(
          userProfileRef,
          {
            uid,
            email,
            role: invite.role || 'manager',
            companyId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        tx.update(inviteDoc.ref, {
          status: 'accepted',
          acceptedBy: uid,
          acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        if (invite.role === 'owner') {
          tx.update(companyRef, {
            ownerUid: uid,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      });

      membershipCreated = true;
      functions.logger.info('[DEBUG][OwnerLink] Linked user to company', {
        uid,
        companyId,
        inviteId: inviteDoc.id,
      });
    }

    return { success: membershipCreated };
  } catch (err) {
    functions.logger.error('[DEBUG][OwnerLink] resolveFirstLogin error', {
      message: err.message,
      stack: err.stack,
    });
    throw new functions.https.HttpsError('internal', 'Failed to resolve first login');
  }
});

// Platform admin: get list of companies (paged)
exports.getAdminCompanies = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  const isAdmin = await isPlatformAdminUid(context.auth.uid, context.auth.token?.email);
  if (!isAdmin)
    throw new functions.https.HttpsError('permission-denied', 'Not a platform admin');

  const { limit = 50, status } = data || {};
  try {
    let q = db.collection('companies').orderBy('createdAt', 'desc');
    if (status !== undefined) {
      q = q.where('isActive', '==', !!status).orderBy('createdAt', 'desc');
    }
    const snapshot = await q.limit(limit).get();
    const companies = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { success: true, data: companies };
  } catch (err) {
    console.error('getAdminCompanies error', err);
    throw new functions.https.HttpsError('internal', 'Failed to fetch companies');
  }
});

// Platform admin: update company status
exports.updateCompanyStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  const isAdmin = await isPlatformAdminUid(context.auth.uid, context.auth.token?.email);
  if (!isAdmin)
    throw new functions.https.HttpsError('permission-denied', 'Not a platform admin');

  const { companyId, isActive } = data || {};
  if (!companyId || typeof isActive !== 'boolean')
    throw new functions.https.HttpsError('invalid-argument', 'Missing companyId or isActive');

  try {
    const companyRef = db.collection('companies').doc(companyId);
    await companyRef.update({ isActive, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    return { success: true };
  } catch (err) {
    console.error('updateCompanyStatus error', err);
    throw new functions.https.HttpsError('internal', 'Failed to update company status');
  }
});

// Platform admin: get counts for a company
exports.getCompanyCounts = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  const isAdmin = await isPlatformAdminUid(context.auth.uid, context.auth.token?.email);
  if (!isAdmin)
    throw new functions.https.HttpsError('permission-denied', 'Not a platform admin');

  const { companyId } = data || {};
  if (!companyId) throw new functions.https.HttpsError('invalid-argument', 'Missing companyId');

  try {
    const usersSnap = await db.collection('companies').doc(companyId).collection('members').get();
    const invoicesSnap = await db
      .collection('companies')
      .doc(companyId)
      .collection('invoices')
      .get();
    return {
      success: true,
      counts: { userCount: usersSnap.size, invoiceCount: invoicesSnap.size },
    };
  } catch (err) {
    console.error('getCompanyCounts error', err);
    throw new functions.https.HttpsError('internal', 'Failed to compute company counts');
  }
});

// Scheduled job: daily sales summary per company
exports.scheduledDailySalesReport = functions.pubsub
  .schedule('every day 01:00')
  .timeZone('UTC')
  .onRun(async (context) => {
    console.log('[scheduledDailySalesReport] started', { time: new Date().toISOString() });
    try {
      const companiesSnap = await db.collection('companies').get();
      const results = [];
      const yesterdayEnd = new Date();
      yesterdayEnd.setUTCDate(yesterdayEnd.getUTCDate() - 1);
      yesterdayEnd.setUTCHours(23, 59, 59, 999);
      const yesterdayStart = new Date(yesterdayEnd);
      yesterdayStart.setUTCHours(0, 0, 0, 0);

      for (const compDoc of companiesSnap.docs) {
        const companyId = compDoc.id;
        const invoicesRef = db.collection('companies').doc(companyId).collection('invoices');
        const q = invoicesRef
          .where('date', '>=', admin.firestore.Timestamp.fromDate(yesterdayStart))
          .where('date', '<=', admin.firestore.Timestamp.fromDate(yesterdayEnd));
        const snap = await q.get();
        let totalSales = 0;
        let invoiceCount = 0;
        snap.forEach((s) => {
          const data = s.data();
          totalSales += Number(data.total) || 0;
          invoiceCount += 1;
        });

        const reportRef = db
          .collection('companies')
          .doc(companyId)
          .collection('reports')
          .doc(`dailySales_${yesterdayStart.toISOString().slice(0, 10)}`);
        const reportData = {
          date: admin.firestore.Timestamp.fromDate(yesterdayStart),
          totalSales,
          invoiceCount,
          generatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        await reportRef.set(reportData, { merge: true });
        results.push({ companyId, totalSales, invoiceCount });
      }

      console.log('[scheduledDailySalesReport] completed', { count: results.length });
      return { success: true, resultsCount: results.length };
    } catch (err) {
      console.error('[scheduledDailySalesReport] failed', err);
      const msg =
        err && err.message
          ? String(err.message)
          : '\u062d\u062f\u062b\u0020\u062e\u0637\u0623\u0020\u0623\u062b\u0646\u0627\u0621\u0020\u0625\u0646\u0634\u0627\u0621\u0020\u062a\u0642\u0631\u064a\u0631\u0020\u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a\u0020\u0627\u0644\u064a\u0648\u0645\u064a\u002e';
      return { success: false, error: msg };
    }
  });

// Get company invitations (pending) for a given company. Only accessible to company owners/managers or platform admins.
exports.getCompanyInvitations = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  const { companyId } = data || {};
  if (!companyId) throw new functions.https.HttpsError('invalid-argument', 'Missing companyId');

  try {
    let authorized = await isPlatformAdminUid(context.auth.uid, context.auth.token?.email);

    if (!authorized) {
      const memberDoc = await db
        .collection('companies')
        .doc(companyId)
        .collection('members')
        .doc(context.auth.uid)
        .get();
      if (memberDoc.exists) {
        const role = memberDoc.data().role;
        if (role === 'owner' || role === 'manager' || role === 'editor') authorized = true;
      }
    }

    if (!authorized) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Not authorized to view invitations for this company'
      );
    }

    const invitesSnap = await db
      .collection('invitations')
      .where('companyId', '==', companyId)
      .where('status', '==', 'pending')
      .get();
    const invites = invitesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { success: true, invites };
  } catch (err) {
    console.error('[DEBUG][Invite] getCompanyInvitations failed', err);
    throw new functions.https.HttpsError('internal', 'Failed to fetch invitations');
  }
});

// Delete an invitation by inviteId. Only company owners/managers or platform admins may delete.
exports.deleteCompanyInvitation = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  const { inviteId } = data || {};
  if (!inviteId) throw new functions.https.HttpsError('invalid-argument', 'Missing inviteId');

  try {
    const inviteRef = db.collection('invitations').doc(inviteId);
    const inviteSnap = await inviteRef.get();
    if (!inviteSnap.exists) throw new functions.https.HttpsError('not-found', 'Invite not found');
    const invite = inviteSnap.data();
    const companyId = invite.companyId;

    let authorized = await isPlatformAdminUid(context.auth.uid, context.auth.token?.email);

    if (!authorized) {
      const memberDoc = await db
        .collection('companies')
        .doc(companyId)
        .collection('members')
        .doc(context.auth.uid)
        .get();
      if (memberDoc.exists) {
        const role = memberDoc.data().role;
        if (role === 'owner' || role === 'manager') authorized = true;
      }
    }

    if (!authorized)
      throw new functions.https.HttpsError(
        'permission-denied',
        'Not authorized to delete this invitation'
      );

    await inviteRef.delete();
    functions.logger.info('[DEBUG][Invite] Deleted invitation', {
      inviteId,
      deletedBy: context.auth.uid,
    });
    return { success: true };
  } catch (err) {
    functions.logger.error('[DEBUG][Invite] deleteCompanyInvitation failed', {
      error: err.message,
    });
    throw new functions.https.HttpsError('internal', 'Failed to delete invitation');
  }
});

// Create owner company during sign-up
exports.createOwnerCompany = functions.https.onCall(async (data, context) => {
  functions.logger.info('[DEBUG][Register] createOwnerCompany called', { uid: context.auth?.uid });

  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    // No-op placeholder: keep behavior unchanged for existing function
    // (function continues below in file)

    const uid = context.auth.uid;
    // Be defensive: token.email may not be present immediately after signup. Normalize safely.
    const rawEmail =
      context.auth.token && context.auth.token.email
        ? String(context.auth.token.email).trim()
        : null;
    const userEmail = rawEmail || (data && data.email ? String(data.email).trim() : null);

    // Validate input
    const { ownerFirstName, ownerLastName, companyName, companyAddress, ownerMobile } = data || {};
    if (!ownerFirstName || !ownerLastName || !companyName || !companyAddress) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required company data');
    }

    functions.logger.info('[DEBUG][Register] Input validated', {
      ownerFirstName,
      ownerLastName,
      companyName,
      uid,
      userEmailPresent: !!userEmail,
    });

    // Generate unique company ID
    const companyId = `company_${uid}_${Date.now()}`;
    const companyRef = db.collection('companies').doc(companyId);

    // Prepare company data (avoid calling toLowerCase on null)
    const newCompany = {
      name: companyName.trim(),
      address: companyAddress.trim(),
      ownerEmail: userEmail || null,
      ownerEmailLower: userEmail ? userEmail.toLowerCase() : null,
      ownerFirstName: ownerFirstName.trim(),
      ownerLastName: ownerLastName.trim(),
      ownerMobile: (ownerMobile || '').trim(),
      ownerUid: uid,
      plan: 'free',
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Prepare owner membership
    const ownerMembership = {
      uid: uid,
      email: userEmail || null,
      emailLower: userEmail ? userEmail.toLowerCase() : null,
      role: 'owner',
      firstName: ownerFirstName.trim(),
      lastName: ownerLastName.trim(),
      mobile: (ownerMobile || '').trim(),
      isActive: true,
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      invitedBy: 'self-signup',
    };

    // Create top-level user profile if not exists
    const userProfileRef = db.collection('users').doc(uid);
    const userProfileDoc = await userProfileRef.get();

    const userProfile = {
      uid: uid,
      email: userEmail || null,
      emailLower: userEmail ? userEmail.toLowerCase() : null,
      firstName: ownerFirstName.trim(),
      lastName: ownerLastName.trim(),
      mobile: (ownerMobile || '').trim(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Batch write: company doc, owner membership, user profile
    const batch = db.batch();
    batch.set(companyRef, newCompany);
    batch.set(companyRef.collection('members').doc(uid), ownerMembership);

    if (!userProfileDoc.exists) {
      batch.set(userProfileRef, userProfile);
    }

    await batch.commit();
    functions.logger.info('[DEBUG][Register] Company created successfully', { companyId, uid });

    return {
      success: true,
      companyId: companyId,
      message: 'Company and owner membership created successfully',
    };
  } catch (error) {
    // Preserve original details in logs for debugging
    functions.logger.error('[DEBUG][Register] createOwnerCompany failed', {
      errorMessage: error && error.message ? error.message : 'unknown error',
      errorStack: error && error.stack ? error.stack : null,
      uid: context.auth?.uid,
      data: data,
    });

    if (error instanceof functions.https.HttpsError) {
      throw error;
    } else {
      throw new functions.https.HttpsError('internal', 'Failed to create owner company');
    }
  }
});

// Create an invoice atomically on the server: snapshots unitCost, updates stock,
// appends stockLedger entries, and writes the invoice within a transaction.
exports.createInvoiceAtomic = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');

  const { companyId, invoice } = data || {};
  if (!companyId || !invoice || !Array.isArray(invoice.items) || invoice.items.length === 0) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'companyId and invoice with items are required'
    );
  }

  try {
    // Authorization: platform admin OR company member
    let authorized = await isPlatformAdminUid(context.auth.uid, context.auth.token?.email);
    if (!authorized) {
      const memberRef = db
        .collection('companies')
        .doc(companyId)
        .collection('members')
        .doc(context.auth.uid);
      const memberDoc = await memberRef.get();
      if (memberDoc.exists) authorized = true;
    }
    if (!authorized) throw new functions.https.HttpsError('permission-denied', 'Not authorized');

    const invoiceId = invoice.id;
    const isUpdate = !!invoiceId;
    const invoiceRef = isUpdate
      ? db.collection('companies').doc(companyId).collection('invoices').doc(invoiceId)
      : db.collection('companies').doc(companyId).collection('invoices').doc();

    const result = await db.runTransaction(async (tx) => {
      let costTotal = 0;
      const itemsWithCost = [];

      // If updating, fetch the old invoice to calculate stock deltas
      let oldInvoice = null;
      if (isUpdate) {
        const oldSnap = await tx.get(invoiceRef);
        if (oldSnap.exists) {
          oldInvoice = oldSnap.data();
        }
      }

      // Build a map of old items by productId for quick lookup during delta calculation
      const oldItemsByProductId = {};
      if (oldInvoice && Array.isArray(oldInvoice.items)) {
        for (const oldItem of oldInvoice.items) {
          const key = String(oldItem.productId);
          if (!oldItemsByProductId[key]) {
            oldItemsByProductId[key] = [];
          }
          oldItemsByProductId[key].push(oldItem);
        }
      }

      // Track which old items have been matched
      const matchedOldItems = new Set();

      // Preload all product docs and validate stock
      for (let itemIndex = 0; itemIndex < invoice.items.length; itemIndex++) {
        const item = invoice.items[itemIndex];
        if (!item.productId)
          throw new functions.https.HttpsError(
            'invalid-argument',
            'Each item must have a productId'
          );
        const prodRef = db
          .collection('companies')
          .doc(companyId)
          .collection('products')
          .doc(String(item.productId));
        const prodSnap = await tx.get(prodRef);
        if (!prodSnap.exists)
          throw new functions.https.HttpsError('not-found', `Product ${item.productId} not found`);
        const prod = prodSnap.data();

        const quantity = Number(item.quantity) || 0;
        if (quantity <= 0)
          throw new functions.https.HttpsError('invalid-argument', 'Item quantity must be > 0');

        const available = Number(prod.stock) || 0;

        // Calculate stock delta: how much stock to adjust
        let stockDelta = quantity; // Default: new quantity (for create)

        if (isUpdate && oldItemsByProductId[String(item.productId)]) {
          // For update: find matching old item and calculate delta
          const oldItems = oldItemsByProductId[String(item.productId)];
          let matchedOldItem = null;

          // Try to match by position first (same index)
          if (itemIndex < oldItems.length && !matchedOldItems.has(`${String(item.productId)}_${itemIndex}`)) {
            matchedOldItem = oldItems[itemIndex];
            matchedOldItems.add(`${String(item.productId)}_${itemIndex}`);
          } else {
            // Fall back to first unmatched item
            for (let i = 0; i < oldItems.length; i++) {
              if (!matchedOldItems.has(`${String(item.productId)}_${i}`)) {
                matchedOldItem = oldItems[i];
                matchedOldItems.add(`${String(item.productId)}_${i}`);
                break;
              }
            }
          }

          if (matchedOldItem) {
            const oldQuantity = Number(matchedOldItem.quantity) || 0;
            stockDelta = quantity - oldQuantity; // Delta: positive = need more stock, negative = return stock
          }
        }

        // Validate stock availability (only for positive deltas)
        if (stockDelta > 0 && available < stockDelta) {
          const productName = prod.name || item.productId;
          const errorMsg = `الصنف "${productName}" لا يملك مخزون كافي. المتاح: ${available}، المطلوب إضافة: ${stockDelta}`;
          throw new functions.https.HttpsError(
            'failed-precondition',
            errorMsg
          );
        }

        // Ensure we don't go below zero (safety check)
        const newStock = available - stockDelta;
        if (newStock < 0) {
          const productName = prod.name || item.productId;
          const errorMsg = `الصنف "${productName}" سيصبح مخزونه سالباً. المتاح: ${available}، المطلوب خصم: ${stockDelta}`;
          throw new functions.https.HttpsError(
            'failed-precondition',
            errorMsg
          );
        }

        const unitCost =
          item.unitCost != null
            ? Number(item.unitCost)
            : Number(prod.averageCost) || Number(prod.defaultCost) || 0;

        const lineCost = unitCost * quantity;
        costTotal += lineCost;

        itemsWithCost.push(Object.assign({}, item, { unitCost }));

        // Update product stock (only if delta != 0)
        if (stockDelta !== 0) {
          tx.update(prodRef, {
            stock: newStock,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Update inventory snapshot (merge)
          const invRef = db
            .collection('companies')
            .doc(companyId)
            .collection('inventory')
            .doc(String(item.productId));
          tx.set(
            invRef,
            {
              productId: String(item.productId),
              quantity: newStock,
              lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );

          // Append stock ledger entry for the change
          const ledgerRef = db.collection('companies').doc(companyId).collection('stockLedger').doc();
          tx.set(ledgerRef, {
            productId: String(item.productId),
            change: -Math.abs(stockDelta), // Negative for deduction, positive for return
            qtyBefore: available,
            qtyAfter: newStock,
            unitCost: unitCost == null ? null : Number(unitCost),
            sourceType: isUpdate ? 'INVOICE_ADJUSTMENT' : 'SALE',
            referenceCollection: 'invoices',
            referenceId: invoiceRef.id,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: context.auth.uid,
          });
        }
      }

      // Handle removed items (in update case): return their stock
      if (isUpdate && oldInvoice && Array.isArray(oldInvoice.items)) {
        for (let oldItemIndex = 0; oldItemIndex < oldInvoice.items.length; oldItemIndex++) {
          const oldItem = oldInvoice.items[oldItemIndex];
          const matchKey = `${String(oldItem.productId)}_${oldItemIndex}`;
          if (!matchedOldItems.has(matchKey)) {
            // This old item was removed, return its stock
            const prodRef = db
              .collection('companies')
              .doc(companyId)
              .collection('products')
              .doc(String(oldItem.productId));
            const prodSnap = await tx.get(prodRef);
            if (prodSnap.exists) {
              const prod = prodSnap.data();
              const oldQuantity = Number(oldItem.quantity) || 0;
              const available = Number(prod.stock) || 0;
              const newStock = available + oldQuantity; // Return stock

              tx.update(prodRef, {
                stock: newStock,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });

              // Update inventory snapshot
              const invRef = db
                .collection('companies')
                .doc(companyId)
                .collection('inventory')
                .doc(String(oldItem.productId));
              tx.set(
                invRef,
                {
                  productId: String(oldItem.productId),
                  quantity: newStock,
                  lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
                },
                { merge: true }
              );

              // Record ledger entry for return
              const unitCost = Number(oldItem.unitCost) || 0;
              const ledgerRef = db.collection('companies').doc(companyId).collection('stockLedger').doc();
              tx.set(ledgerRef, {
                productId: String(oldItem.productId),
                change: oldQuantity, // Positive: stock return
                qtyBefore: available,
                qtyAfter: newStock,
                unitCost: unitCost == null ? null : Number(unitCost),
                sourceType: 'INVOICE_REMOVAL',
                referenceCollection: 'invoices',
                referenceId: invoiceRef.id,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                createdBy: context.auth.uid,
              });
            }
          }
        }
      }

      // Compute totals: prefer client-provided totals, but compute subtotal if missing
      let subtotal = 0;
      for (const it of itemsWithCost) {
        const price = Number(it.unitPrice || it.price || 0);
        subtotal += price * (Number(it.quantity) || 0);
      }

      const total = invoice.total != null ? Number(invoice.total) : subtotal;
      const profit = Number(total) - costTotal;

      const now = admin.firestore.FieldValue.serverTimestamp();
      const invoiceToSave = Object.assign({}, invoice, {
        items: itemsWithCost,
        costTotal,
        profit,
        subtotal,
        total,
        paymentsSummary: invoice.paymentsSummary || { paid: 0, due: total },
        status:
          invoice.paymentsSummary && invoice.paymentsSummary.paid >= total ? 'paid' : 'unpaid',
        createdAt: isUpdate && oldInvoice ? oldInvoice.createdAt : now,
        updatedAt: now,
      });

      tx.set(invoiceRef, invoiceToSave);

      return { invoiceId: invoiceRef.id };
    });

    return { success: true, ...result };
  } catch (err) {
    console.error('[createInvoiceAtomic] failed', err);
    if (err instanceof functions.https.HttpsError) throw err;
    throw new functions.https.HttpsError('internal', 'Failed to create invoice atomically');
  }
});

// Create purchase atomically on the server: updates product stock, inventory snapshots,
// appends stockLedger entries, updates supplier balance and writes purchase doc in a transaction.
exports.createPurchaseAtomic = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  const { companyId, purchase } = data || {};
  if (!companyId || !purchase || !Array.isArray(purchase.items) || purchase.items.length === 0) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'companyId and purchase with items are required'
    );
  }

  try {
    // Authorization: platform admin OR company member with role owner/manager
    let authorized = await isPlatformAdminUid(context.auth.uid, context.auth.token?.email);
    if (!authorized) {
      const memberRef = db
        .collection('companies')
        .doc(companyId)
        .collection('members')
        .doc(context.auth.uid);
      const memberDoc = await memberRef.get();
      if (memberDoc.exists) {
        const role = (memberDoc.data() || {}).role || '';
        if (['owner', 'manager'].includes(role)) authorized = true;
      }
    }
    if (!authorized) throw new functions.https.HttpsError('permission-denied', 'Not authorized');

    const purchaseRef = db.collection('companies').doc(companyId).collection('purchases').doc();

    await db.runTransaction(async (tx) => {
      const supRef = db
        .collection('companies')
        .doc(companyId)
        .collection('suppliers')
        .doc(purchase.supplierId);
      const supSnap = await tx.get(supRef);
      if (!supSnap.exists) throw new functions.https.HttpsError('not-found', 'Supplier not found');

      // Create purchase doc
      const payload = {
        supplierId: purchase.supplierId,
        supplierName: supSnap.data().name || null,
        invoiceNumber: purchase.invoiceNumber || null,
        items: purchase.items,
        totalAmount: purchase.totalAmount || 0,
        paidAmount: 0,
        status: 'unpaid',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      tx.set(purchaseRef, payload);

      for (const it of purchase.items) {
        const prodRef = db
          .collection('companies')
          .doc(companyId)
          .collection('products')
          .doc(it.productId);
        const prodSnap = await tx.get(prodRef);
        if (!prodSnap.exists)
          throw new functions.https.HttpsError('not-found', `Product not found: ${it.productId}`);
        const prodData = prodSnap.data() || {};
        const currentStock = Number(prodData.stock || 0);
        const qty = Number(it.quantity || 0);
        const newStock = currentStock + qty;

        // Recompute average cost
        const prevAvg =
          typeof prodData.averageCost === 'number'
            ? prodData.averageCost
            : typeof prodData.defaultCost === 'number'
              ? prodData.defaultCost
              : 0;
        const unitPrice = typeof it.unitPrice === 'number' ? it.unitPrice : null;
        const newAvg =
          unitPrice !== null && currentStock + qty > 0
            ? Math.round(
                ((prevAvg * currentStock + unitPrice * qty) / (currentStock + qty)) * 100
              ) / 100
            : prevAvg;

        const prodUpdate = {
          stock: newStock,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (unitPrice !== null) prodUpdate.averageCost = newAvg;
        tx.update(prodRef, prodUpdate);

        // Inventory snapshot
        const invRef = db
          .collection('companies')
          .doc(companyId)
          .collection('inventory')
          .doc(it.productId);
        tx.set(
          invRef,
          {
            productId: it.productId,
            quantity: newStock,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        // Ledger entry
        const ledgerRef = db.collection('companies').doc(companyId).collection('stockLedger').doc();
        tx.set(ledgerRef, {
          productId: it.productId,
          change: qty,
          qtyBefore: currentStock,
          qtyAfter: newStock,
          unitCost: unitPrice,
          sourceType: 'PURCHASE',
          referenceId: purchaseRef.id,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: context.auth.uid,
        });
      }

      // Update supplier balance
      const currentBal = supSnap.data().balance || 0;
      const newBal = currentBal + (purchase.totalAmount || 0);
      tx.update(supRef, {
        balance: newBal,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Accounting journal entry
      const journalRef = db
        .collection('companies')
        .doc(companyId)
        .collection('journalEntries')
        .doc();
      const lines = [
        { accountId: 'Purchases', debit: purchase.totalAmount || 0, credit: 0 },
        { accountId: 'Payables', debit: 0, credit: purchase.totalAmount || 0 },
      ];
      tx.set(journalRef, {
        date: admin.firestore.FieldValue.serverTimestamp(),
        lines,
        referenceType: 'purchase',
        referenceId: purchaseRef.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    return { success: true, purchaseId: purchaseRef.id };
  } catch (err) {
    console.error('[createPurchaseAtomic] failed', err);
    if (err instanceof functions.https.HttpsError) throw err;
    throw new functions.https.HttpsError('internal', 'Failed to create purchase atomically');
  }
});

// Create a sales return atomically: validate quantities, increase stock, write return doc and ledger.
exports.createReturnAtomic = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  const { companyId, returnDoc } = data || {};
  if (!companyId || !returnDoc || !returnDoc.invoiceId || !Array.isArray(returnDoc.items)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'companyId, invoiceId, and return items are required'
    );
  }

  try {
    // Authorization: platform admin OR company member with role owner/manager/employee
    let authorized = await isPlatformAdminUid(context.auth.uid, context.auth.token?.email);
    if (!authorized) {
      const memberRef = db
        .collection('companies')
        .doc(companyId)
        .collection('members')
        .doc(context.auth.uid);
      const memberDoc = await memberRef.get();
      if (memberDoc.exists) {
        const role = (memberDoc.data() || {}).role || '';
        if (['owner', 'manager', 'employee', 'staff'].includes(role)) authorized = true;
      }
    }
    if (!authorized) throw new functions.https.HttpsError('permission-denied', 'Not authorized');

    const invoiceRef = db.collection('companies').doc(companyId).collection('invoices').doc(returnDoc.invoiceId);
    const returnRef = db.collection('companies').doc(companyId).collection('returns').doc();

    await db.runTransaction(async (tx) => {
      const invoiceSnap = await tx.get(invoiceRef);
      if (!invoiceSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Invoice not found');
      }
      const invoice = invoiceSnap.data() || {};
      const invoiceItems = Array.isArray(invoice.items) ? invoice.items : [];

      // Build sold quantities map
      const soldMap = {};
      for (const it of invoiceItems) {
        if (!it.productId) continue;
        soldMap[String(it.productId)] = (soldMap[String(it.productId)] || 0) + Number(it.quantity || 0);
      }

      // Validate return quantities and update stock
      for (const it of returnDoc.items) {
        const productId = String(it.productId || '');
        if (!productId) {
          throw new functions.https.HttpsError('invalid-argument', 'Each return item needs productId');
        }
        const qty = Number(it.quantity || 0);
        if (qty <= 0) {
          throw new functions.https.HttpsError('invalid-argument', 'Return quantity must be > 0');
        }
        const soldQty = Number(soldMap[productId] || 0);
        if (qty > soldQty) {
          throw new functions.https.HttpsError(
            'failed-precondition',
            `Return quantity exceeds sold quantity for product ${productId}`
          );
        }

        const prodRef = db.collection('companies').doc(companyId).collection('products').doc(productId);
        const prodSnap = await tx.get(prodRef);
        if (!prodSnap.exists) {
          throw new functions.https.HttpsError('not-found', `Product not found: ${productId}`);
        }
        const prod = prodSnap.data() || {};
        const currentStock = Number(prod.stock || 0);
        const newStock = currentStock + qty;

        tx.update(prodRef, {
          stock: newStock,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const invRef = db.collection('companies').doc(companyId).collection('inventory').doc(productId);
        tx.set(
          invRef,
          {
            productId,
            quantity: newStock,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        const ledgerRef = db.collection('companies').doc(companyId).collection('stockLedger').doc();
        tx.set(ledgerRef, {
          productId,
          change: Math.abs(qty),
          qtyBefore: currentStock,
          qtyAfter: newStock,
          unitCost: it.unitPriceSnapshot != null ? Number(it.unitPriceSnapshot) : null,
          sourceType: 'RETURN',
          referenceCollection: 'returns',
          referenceId: returnRef.id,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: context.auth.uid,
        });
      }

      const now = admin.firestore.FieldValue.serverTimestamp();
      tx.set(returnRef, {
        invoiceId: returnDoc.invoiceId,
        customerId: returnDoc.customerId,
        items: returnDoc.items,
        totalReturnAmount: Number(returnDoc.totalReturnAmount || 0),
        date: returnDoc.date || now,
        reason: returnDoc.reason || null,
        mode: returnDoc.mode || 'credit_note',
        createdAt: now,
        updatedAt: now,
      });
    });

    return { success: true, id: returnRef.id };
  } catch (err) {
    console.error('[createReturnAtomic] failed', err);
    if (err instanceof functions.https.HttpsError) throw err;
    throw new functions.https.HttpsError('internal', 'Failed to create return atomically');
  }
});

// Centralized audit log writer (callable). Use Cloud Functions to ensure honest writes.
exports.logAudit = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  const { companyId, action, before, after, meta } = data || {};
  if (!companyId || !action)
    throw new functions.https.HttpsError('invalid-argument', 'companyId and action are required');

  try {
    const auditRef = db.collection('companies').doc(companyId).collection('auditLogs').doc();
    const payload = {
      action,
      before: before || null,
      after: after || null,
      meta: meta || null,
      performedBy: context.auth.uid,
      performedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await auditRef.set(payload);
    return { success: true, id: auditRef.id };
  } catch (err) {
    console.error('[logAudit] failed', err);
    throw new functions.https.HttpsError('internal', 'Failed to write audit log');
  }
});

// Assign or change a user's role within a company. Only platform admins or company owners/managers may call.
exports.assignCompanyRole = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  const { companyId, uid, role } = data || {};
  if (!companyId || !uid || !role)
    throw new functions.https.HttpsError(
      'invalid-argument',
      'companyId, uid and role are required'
    );

  try {
    let authorized = await isPlatformAdminUid(context.auth.uid, context.auth.token?.email);
    if (!authorized) {
      const memberDoc = await db
        .collection('companies')
        .doc(companyId)
        .collection('members')
        .doc(context.auth.uid)
        .get();
      if (memberDoc.exists) {
        const callerRole = memberDoc.data().role;
        if (callerRole === 'owner' || callerRole === 'manager') authorized = true;
      }
    }
    if (!authorized) throw new functions.https.HttpsError('permission-denied', 'Not authorized');

    const userRef = db.collection('companies').doc(companyId).collection('members').doc(uid);
    await userRef.set({ role }, { merge: true });

    // Audit
    const auditRef = db.collection('companies').doc(companyId).collection('auditLogs').doc();
    await auditRef.set({
      action: 'assign_role',
      performedBy: context.auth.uid,
      performedAt: admin.firestore.FieldValue.serverTimestamp(),
      meta: { uid, role },
    });

    return { success: true };
  } catch (err) {
    console.error('[assignCompanyRole] failed', err);
    throw new functions.https.HttpsError('internal', 'Failed to assign role');
  }
});

// Finalize (post) an invoice: mark as posted and create a basic journal entry.
exports.setInvoicePosted = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  const { companyId, invoiceId } = data || {};
  if (!companyId || !invoiceId)
    throw new functions.https.HttpsError(
      'invalid-argument',
      'companyId and invoiceId are required'
    );

  try {
    // Authorization: platform admin OR company member with owner/manager
    let authorized = await isPlatformAdminUid(context.auth.uid, context.auth.token?.email);
    if (!authorized) {
      const memberRef = db
        .collection('companies')
        .doc(companyId)
        .collection('members')
        .doc(context.auth.uid);
      const memberDoc = await memberRef.get();
      if (memberDoc.exists) {
        const role = memberDoc.data().role;
        if (role === 'owner' || role === 'manager') authorized = true;
      }
    }
    if (!authorized)
      throw new functions.https.HttpsError('permission-denied', 'Not authorized to post invoice');

    const invoiceRef = db
      .collection('companies')
      .doc(companyId)
      .collection('invoices')
      .doc(invoiceId);
    const invoiceSnap = await invoiceRef.get();
    if (!invoiceSnap.exists) throw new functions.https.HttpsError('not-found', 'Invoice not found');
    const invoice = invoiceSnap.data();
    if (invoice.posted === true) return { success: true, message: 'Already posted' };

    // Create a journal entry reflecting revenue and COGS (simple representation)
    const journalRef = db.collection('companies').doc(companyId).collection('journalEntries').doc();
    const total = Number(invoice.total || 0);
    const costTotal = Number(invoice.costTotal || 0);
    const lines = [
      { accountId: 'AccountsReceivable', debit: total, credit: 0 },
      { accountId: 'Sales', debit: 0, credit: total },
    ];
    if (costTotal > 0) {
      lines.push({ accountId: 'COGS', debit: costTotal, credit: 0 });
      lines.push({ accountId: 'Inventory', debit: 0, credit: costTotal });
    }

    await db.runTransaction(async (tx) => {
      tx.update(invoiceRef, {
        posted: true,
        postedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      tx.set(journalRef, {
        date: admin.firestore.FieldValue.serverTimestamp(),
        lines,
        referenceType: 'invoice',
        referenceId: invoiceId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: context.auth.uid,
      });

      // Audit
      const auditRef = db.collection('companies').doc(companyId).collection('auditLogs').doc();
      tx.set(auditRef, {
        action: 'post_invoice',
        performedBy: context.auth.uid,
        performedAt: admin.firestore.FieldValue.serverTimestamp(),
        meta: { invoiceId },
      });
    });

    return { success: true };
  } catch (err) {
    console.error('[setInvoicePosted] failed', err);
    throw new functions.https.HttpsError('internal', 'Failed to post invoice');
  }
});

