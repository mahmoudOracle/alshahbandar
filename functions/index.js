
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

exports.createCompanyAsAdmin = functions.https.onCall(async (data, context) => {
    functions.logger.info("Function execution started.");
    functions.logger.info("createCompanyAsAdmin function triggered", { data, auth: context.auth });

    try {
        // 1. Authentication & Authorization Check
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
        }
        const adminRef = db.collection('platformAdmins').doc(context.auth.uid);
        const adminDoc = await adminRef.get();
        if (!adminDoc.exists) {
            throw new functions.https.HttpsError('permission-denied', 'The caller is not a platform administrator.');
        }
        functions.logger.info("Caller is authenticated and authorized as platform admin.");

        // 2. Input validation
        const { id, name, address, ownerEmail, ownerFirstName, ownerLastName, ownerMobile } = data;
        if (!id || !name || !address || !ownerEmail || !ownerFirstName || !ownerLastName || !ownerMobile) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required company data.');
        }
        functions.logger.info("Input data validated successfully.");

        // 3. Prepare data and refs
        const companyRef = db.collection('companies').doc(id.trim());
        const invitationRef = companyRef.collection('invitations').doc(); // Auto-generate ID

        // Check if company ID already exists
        const existingCompany = await companyRef.get();
        if (existingCompany.exists) {
            throw new functions.https.HttpsError('already-exists', 'A company with this ID already exists.');
        }
        
        const newCompany = {
            name: name.trim(),
            address: address.trim(),
            ownerEmail: ownerEmail.trim(),
            ownerEmailLower: ownerEmail.trim().toLowerCase(),
            ownerFirstName: ownerFirstName.trim(),
            ownerLastName: ownerLastName.trim(),
            ownerMobile: ownerMobile.trim(),
            plan: "free",
            isActive: true,
            ownerUid: null,
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
        functions.logger.info("Preparing to commit batch write for new company and invitation.");
        const batch = db.batch();
        batch.set(companyRef, newCompany);
        batch.set(invitationRef, ownerInvitation);
        
        await batch.commit();
        functions.logger.info(`Successfully created company ${companyRef.id}.`);

        // 5. Return result
        return { success: true, companyId: companyRef.id };

    } catch (error) {
        // Log the detailed error to the Firebase console
        functions.logger.error("Error in createCompanyAsAdmin:", {
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
            throw new functions.https.HttpsError('internal', 'An unexpected error occurred on the server.');
        }
    }
});


exports.createInvitation = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  
  // Ensure the user has configured the SendGrid key
  if (!process.env.SENDGRID_API_KEY) {
      throw new functions.https.HttpsError('failed-precondition', 'Email service is not configured. Please set the SENDGRID_API_KEY secret.');
  }

  const { email, companyName, notes } = data;
  if (!email || !companyName) throw new functions.https.HttpsError('invalid-argument','Missing fields');

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const companyId = companyName.toLowerCase().replace(/[^\w]+/g,'-') + '-' + Date.now();

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
                expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7*24*60*60*1000)),
                notes: notes || null
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
      throw new functions.https.HttpsError('internal', 'The invitation was created, but failed to send the email.');
  }

  return { success: true, inviteId: inviteRef.id };
});

// Create an invitation for an EXISTING company. This callable validates the caller is a company owner/manager or platform admin,
// stores a top-level invitation (so acceptInvitation can work consistently), and sends an email with a secure token.
exports.createCompanyInvitation = functions.https.onCall(async (data, context) => {
    functions.logger.info('[DEBUG][Invite] createCompanyInvitation called', { data, auth: context.auth });
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');

    if (!process.env.SENDGRID_API_KEY) {
        throw new functions.https.HttpsError('failed-precondition', 'Email service is not configured.');
    }

    const { companyId, email, role = 'manager', notes } = data || {};
    if (!companyId || !email) throw new functions.https.HttpsError('invalid-argument', 'Missing companyId or email');

    try {
        // Authorization: platform admin OR company owner/manager
        const platformAdminRef = db.collection('platformAdmins').doc(context.auth.uid);
        const platformAdminDoc = await platformAdminRef.get();
        let authorized = false;
        if (platformAdminDoc.exists) authorized = true;

        if (!authorized) {
            const memberRef = db.collection('companies').doc(companyId).collection('users').doc(context.auth.uid);
            const memberDoc = await memberRef.get();
            if (memberDoc.exists) {
                const member = memberDoc.data();
                if (member.role === 'owner' || member.role === 'manager') authorized = true;
            }
        }

        if (!authorized) {
            throw new functions.https.HttpsError('permission-denied', 'Caller is not authorized to invite users for this company');
        }

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
            expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7*24*60*60*1000)),
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
            html: `<p>You have been invited to join <strong>${inviterName}</strong> as <strong>${role}</strong>. Click <a href="${acceptUrl}">here</a> to accept.</p>`
        };

        await sgMail.send(msg);

        functions.logger.info('[DEBUG][Invite] Invitation created', { inviteId: inviteRef.id, companyId, emailLower: email.trim().toLowerCase() });
        return { success: true, inviteId: inviteRef.id };
    } catch (err) {
        functions.logger.error('[DEBUG][Invite] createCompanyInvitation failed', { error: err.message, stack: err.stack });
        if (err instanceof functions.https.HttpsError) throw err;
        throw new functions.https.HttpsError('internal', 'Failed to create company invitation');
    }
});

exports.acceptInvitation = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated','Login required');
  const { inviteId, token } = data;
  if (!inviteId || !token) throw new functions.https.HttpsError('invalid-argument','Missing inviteId/token');

  const inviteRef = db.collection('invitations').doc(inviteId);
  const inviteSnap = await inviteRef.get();
  if (!inviteSnap.exists) throw new functions.https.HttpsError('not-found','Invite not found');

  const invite = inviteSnap.data();
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  if (tokenHash !== invite.tokenHash)
    throw new functions.https.HttpsError('permission-denied','Invalid token');

  if (invite.expiresAt.toMillis() < Date.now()) {
    await inviteRef.update({ status: 'expired' });
    throw new functions.https.HttpsError('deadline-exceeded', 'Invite expired');
  }

  const uid = context.auth.uid;
  const companyId = invite.companyId;

    // Create company membership under companies/{companyId}/users/{uid} and mark invite used
    await db.runTransaction(async tx => {
        const companyRef = db.collection('companies').doc(companyId);
        const companySnap = await tx.get(companyRef);
        if (!companySnap.exists) {
            tx.set(companyRef, {
                id: companyId,
                name: invite.companyName,
                ownerUid: (invite.role === 'owner') ? uid : null,
                status: 'trial',
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        const membershipRef = companyRef.collection('users').doc(uid);
        const membershipData = {
            uid,
            email: context.auth.token.email || null,
            role: invite.role || 'manager',
            status: 'active',
            profileCompleted: invite.role === 'owner',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
        tx.set(membershipRef, membershipData, { merge: true });

        // Also update top-level users profile for compatibility (optional merge)
        const userProfileRef = db.collection('users').doc(uid);
        tx.set(userProfileRef, {
            uid,
            email: context.auth.token.email || null,
            role: invite.role || 'manager',
            companyId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        tx.update(inviteRef, { status: 'accepted', acceptedBy: uid, acceptedAt: admin.firestore.FieldValue.serverTimestamp() });

        // If owner invite, ensure company.ownerUid is set
        if (invite.role === 'owner') {
            tx.update(companyRef, { ownerUid: uid, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        }
    });

    functions.logger.info('[DEBUG][AcceptInvitation] Invitation accepted', { inviteId, companyId, uid });
    return { success: true, companyId };
});

// Resolve first login: link any pending invitations for the authenticated user's email to their UID.
// This runs server-side with admin privileges and avoids exposing invitations to the client.
exports.resolveFirstLogin = functions.https.onCall(async (data, context) => {
    functions.logger.info('[DEBUG][OwnerLink] resolveFirstLogin called', { auth: context.auth, data });
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');

    const uid = context.auth.uid;
    const email = (context.auth.token && context.auth.token.email) ? context.auth.token.email.trim() : (data && data.email ? String(data.email).trim() : null);
    if (!email) {
        return { success: false, message: 'no-email' };
    }
    const emailLower = email.toLowerCase();

    try {
        // STEP 1: Check for existing memberships (from createOwnerCompany sign-up flow)
        functions.logger.info('[DEBUG][OwnerLink] Checking for existing memberships created during sign-up', { uid });
        const membershipSnap = await db.collectionGroup('users').where('uid', '==', uid).get();
        if (!membershipSnap.empty) {
            functions.logger.info('[DEBUG][OwnerLink] Found existing memberships from sign-up flow', { count: membershipSnap.size, uid });
            return { success: true, message: 'already-linked' };
        }

        // STEP 2: Query top-level invitations by emailLower (old invitation-based flow)
        const invitesSnap = await db.collection('invitations').where('emailLower', '==', emailLower).where('status', '==', 'pending').get();
        functions.logger.info('[DEBUG][OwnerLink] found invitations', { count: invitesSnap.size, emailLower });

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
                        ownerUid: (invite.role === 'owner') ? uid : null,
                        status: 'trial',
                        createdAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }

                const membershipRef = companyRef.collection('users').doc(uid);
                const membershipData = {
                    uid,
                    email: email,
                    role: invite.role || 'manager',
                    status: 'active',
                    profileCompleted: invite.role === 'owner',
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                };
                tx.set(membershipRef, membershipData, { merge: true });

                const userProfileRef = db.collection('users').doc(uid);
                tx.set(userProfileRef, {
                    uid,
                    email,
                    role: invite.role || 'manager',
                    companyId,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                tx.update(inviteDoc.ref, { status: 'accepted', acceptedBy: uid, acceptedAt: admin.firestore.FieldValue.serverTimestamp() });

                if (invite.role === 'owner') {
                    tx.update(companyRef, { ownerUid: uid, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
                }
            });

            membershipCreated = true;
            functions.logger.info('[DEBUG][OwnerLink] Linked user to company', { uid, companyId, inviteId: inviteDoc.id });
        }

        return { success: membershipCreated };
    } catch (err) {
        functions.logger.error('[DEBUG][OwnerLink] resolveFirstLogin error', { message: err.message, stack: err.stack });
        throw new functions.https.HttpsError('internal', 'Failed to resolve first login');
    }
});

// Platform admin: get list of companies (paged)
exports.getAdminCompanies = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
    const adminRef = db.collection('platformAdmins').doc(context.auth.uid);
    const adminDoc = await adminRef.get();
    if (!adminDoc.exists) throw new functions.https.HttpsError('permission-denied', 'Not a platform admin');

    const { limit = 50, status } = data || {};
    try {
        let q = db.collection('companies').orderBy('createdAt', 'desc');
        if (status !== undefined) {
            q = q.where('isActive', '==', !!status).orderBy('createdAt', 'desc');
        }
        const snapshot = await q.limit(limit).get();
        const companies = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        return { success: true, data: companies };
    } catch (err) {
        console.error('getAdminCompanies error', err);
        throw new functions.https.HttpsError('internal', 'Failed to fetch companies');
    }
});

// Platform admin: update company status
exports.updateCompanyStatus = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
    const adminRef = db.collection('platformAdmins').doc(context.auth.uid);
    const adminDoc = await adminRef.get();
    if (!adminDoc.exists) throw new functions.https.HttpsError('permission-denied', 'Not a platform admin');

    const { companyId, isActive } = data || {};
    if (!companyId || typeof isActive !== 'boolean') throw new functions.https.HttpsError('invalid-argument', 'Missing companyId or isActive');

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
    const adminRef = db.collection('platformAdmins').doc(context.auth.uid);
    const adminDoc = await adminRef.get();
    if (!adminDoc.exists) throw new functions.https.HttpsError('permission-denied', 'Not a platform admin');

    const { companyId } = data || {};
    if (!companyId) throw new functions.https.HttpsError('invalid-argument', 'Missing companyId');

    try {
        const usersSnap = await db.collection('companies').doc(companyId).collection('users').get();
        const invoicesSnap = await db.collection('companies').doc(companyId).collection('invoices').get();
        return { success: true, counts: { userCount: usersSnap.size, invoiceCount: invoicesSnap.size } };
    } catch (err) {
        console.error('getCompanyCounts error', err);
        throw new functions.https.HttpsError('internal', 'Failed to compute company counts');
    }
});

// Get company invitations (pending) for a given company. Only accessible to company owners/managers or platform admins.
exports.getCompanyInvitations = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
    const { companyId } = data || {};
    if (!companyId) throw new functions.https.HttpsError('invalid-argument', 'Missing companyId');

    try {
        const platformAdminDoc = await db.collection('platformAdmins').doc(context.auth.uid).get();
        let authorized = false;
        if (platformAdminDoc.exists) authorized = true;

        if (!authorized) {
            const memberDoc = await db.collection('companies').doc(companyId).collection('users').doc(context.auth.uid).get();
            if (memberDoc.exists) {
                const role = memberDoc.data().role;
                if (role === 'owner' || role === 'manager' || role === 'editor') authorized = true;
            }
        }

        if (!authorized) {
            throw new functions.https.HttpsError('permission-denied', 'Not authorized to view invitations for this company');
        }

        const invitesSnap = await db.collection('invitations').where('companyId', '==', companyId).where('status', '==', 'pending').get();
        const invites = invitesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
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

        const platformAdminDoc = await db.collection('platformAdmins').doc(context.auth.uid).get();
        let authorized = false;
        if (platformAdminDoc.exists) authorized = true;

        if (!authorized) {
            const memberDoc = await db.collection('companies').doc(companyId).collection('users').doc(context.auth.uid).get();
            if (memberDoc.exists) {
                const role = memberDoc.data().role;
                if (role === 'owner' || role === 'manager') authorized = true;
            }
        }

        if (!authorized) throw new functions.https.HttpsError('permission-denied', 'Not authorized to delete this invitation');

        await inviteRef.delete();
        functions.logger.info('[DEBUG][Invite] Deleted invitation', { inviteId, deletedBy: context.auth.uid });
        return { success: true };
    } catch (err) {
        functions.logger.error('[DEBUG][Invite] deleteCompanyInvitation failed', { error: err.message });
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

        const uid = context.auth.uid;
        // Be defensive: token.email may not be present immediately after signup. Normalize safely.
        const rawEmail = (context.auth.token && context.auth.token.email) ? String(context.auth.token.email).trim() : null;
        const userEmail = rawEmail || (data && data.email ? String(data.email).trim() : null);

        // Validate input
        const { ownerFirstName, ownerLastName, companyName, companyAddress, ownerMobile } = data || {};
        if (!ownerFirstName || !ownerLastName || !companyName || !companyAddress) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required company data');
        }

        functions.logger.info('[DEBUG][Register] Input validated', { ownerFirstName, ownerLastName, companyName, uid, userEmailPresent: !!userEmail });

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
        batch.set(companyRef.collection('users').doc(uid), ownerMembership);
        
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
            errorMessage: error && error.message ? error.message : String(error),
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