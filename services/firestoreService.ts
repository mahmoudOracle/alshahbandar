import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  addDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  orderBy,
  startAfter,
  limit as firestoreLimit,
  QueryConstraint,
  QueryDocumentSnapshot,
  collectionGroup,
  runTransaction,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { User } from 'firebase/auth';
import {
  Invoice,
  Customer,
  Product,
  Payment,
  Settings,
  Expense,
  Quote,
  RecurringInvoice,
  InvoiceStatus,
  PaymentType,
  QuoteStatus,
  Frequency,
  UserRole,
  StoredExpenseCategory,
  StoredVendor,
  PaginatedData,
  CompanyMembership,
  CompanyUser,
  CompanyInvitation,
  Company,
  IncomingReceipt,
  InventoryItem,
  StockLedgerEntry,
} from '../types';
import { db, functions } from './firebase';
import { enqueueOperation } from './syncService';
import * as productsRepo from './repositories/products';
import { serverTimestamp } from 'firebase/firestore';
import { DEBUG_MODE } from '../config';

// --- Retry & Network Helpers ---
const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
const isTransientNetworkError = (err: unknown) => {
  const msg = String((err as { message?: unknown })?.message || '').toLowerCase();
  return (
    /client is offline/.test(msg) ||
    /could not reach cloud firestore backend/.test(msg) ||
    /net::err_connection_closed/.test(msg) ||
    /webchannelconnection/.test(msg) ||
    (err as { code?: unknown })?.code === 'unavailable'
  );
};

async function withRetry<T>(fn: () => Promise<T>, attempts = 3, baseDelay = 400): Promise<T> {
  let lastErr: unknown = null;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isTransientNetworkError(err) || i === attempts - 1) break;
      const delay = baseDelay * Math.pow(2, i);
      if (DEBUG_MODE)
        console.warn(
          `🟡 [FIRESTORE][RETRY] transient error, retrying in ${delay}ms`,
          err?.message || err
        );
      await sleep(delay);
    }
  }
  // Attach a marker for upstream handling
  if (isTransientNetworkError(lastErr)) {
    const offlineErr = new Error('Failed to reach Firestore backend (client offline)') as Error & {
      code?: string;
      original?: unknown;
    };
    offlineErr.code = 'client-offline';
    offlineErr.original = lastErr;
    throw offlineErr;
  }
  throw lastErr;
}

// --- PLATFORM ADMIN REPOSITORY ---

interface PlatformQueryOptions {
  limit?: number;
  startAfter?: QueryDocumentSnapshot;
  status?: boolean; // active/inactive filter
}

export const getCompanies = async (
  options: PlatformQueryOptions = {}
): Promise<PaginatedData<Company>> => {
  // Use callable cloud function for platform admin operations to avoid exposing privileged queries client-side.
  const { limit: queryLimit = 50, status } = options;
  const fn = httpsCallable(functions, 'getAdminCompanies');
  try {
    console.log('[DEBUG][AUTHZ] Calling getAdminCompanies with', { limit: queryLimit, status });
    const res = await fn({ limit: queryLimit, status });
    const payload = res.data as unknown;
    if (!payload || !(payload as Record<string, unknown>)['data'])
      return { data: [], nextCursor: undefined };
    const list = (payload as Record<string, unknown>)['data'] as unknown[];
    const data: Company[] = list.map(
      (d) =>
        ({
          id: (d as Record<string, unknown>)['id'] as string,
          ...(d as Record<string, unknown>),
        }) as Company
    );
    return { data, nextCursor: undefined };
  } catch (err) {
    console.error('[DEBUG][AUTHZ] getAdminCompanies failed', err);
    throw err;
  }
};

export const createCompany = async (
  companyData: Omit<
    Company,
    'id' | 'ownerUid' | 'isActive' | 'plan' | 'createdAt' | 'updatedAt' | 'ownerEmailLower'
  > & { id: string }
): Promise<Company> => {
  const createCompanyFunction = httpsCallable(functions, 'createCompanyAsAdmin');
  try {
    console.log('[DEBUG][CreateCompany] Calling cloud function with payload:', companyData);
    await createCompanyFunction(companyData);

    // For consistency, we can return the company object as the client expects.
    // This is optimistic, but the function throws on failure.
    const ownerEmailLower = (companyData as unknown as Record<string, unknown>)['ownerEmail']
      ? String((companyData as unknown as Record<string, unknown>)['ownerEmail']).toLowerCase()
      : undefined;
    const createdCompany: Record<string, unknown> = {
      ...(companyData as unknown as Record<string, unknown>),
      ownerEmailLower,
      ownerUid: null,
      isActive: true,
      plan: 'free',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    console.log('[DEBUG][CreateCompany] Cloud function executed successfully.');
    return createdCompany as unknown as Company;
  } catch (error) {
    console.error('[DEBUG][CreateCompany] Cloud function failed:', error);
    // Re-throw the error to be caught and mapped by the UI
    throw error;
  }
};

export const updateCompanyStatus = async (companyId: string, isActive: boolean): Promise<void> => {
  try {
    console.log('[DEBUG][AUTHZ] Direct updateCompanyStatus', { companyId, isActive });
    const status = isActive ? 'approved' : 'rejected';
    await updateCompanyStatusDirect(companyId, status as 'approved' | 'rejected');
    console.log('[DEBUG][AUTHZ] updateCompanyStatus success', companyId);
  } catch (err) {
    console.error('[DEBUG][AUTHZ] updateCompanyStatus failed', err);
    throw err;
  }
};

export const getCompanyCounts = async (companyId: string): Promise<Record<string, number>> => {
  const fn = httpsCallable(functions, 'getCompanyCounts');
  try {
    console.log('[DEBUG][AUTHZ] Calling getCompanyCounts for', companyId);
    const res = await fn({ companyId });
    const payload = res.data as unknown;
    const counts = (payload as Record<string, unknown>)['counts'] as
      | Record<string, number>
      | undefined;
    return counts || { userCount: 0, invoiceCount: 0 };
  } catch (err) {
    console.error('[DEBUG][AUTHZ] getCompanyCounts failed', err);
    throw err;
  }
};

// --- Audit logs ---
export const getAuditLogs = async (
  companyId: string,
  options: { limit?: number } = {}
): Promise<any[]> => {
  const { limit: lim = 100 } = options;
  try {
    const col = collection(db, `companies/${companyId}/auditLogs`);
    const q = query(col, orderBy('performedAt', 'desc'), firestoreLimit(lim));
    const snaps = await getDocs(q);
    return snaps.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));
  } catch (err) {
    console.error('[FIRESTORE] getAuditLogs failed', err);
    return [];
  }
};

export const createInvoiceAtomic = async (
  companyId: string,
  invoice: Partial<Invoice>
): Promise<any> => {
  try {
    const fn = httpsCallable(functions, 'createInvoiceAtomic');
    const res = await fn({ companyId, invoice });
    const payload =
      res && (res as unknown as Record<string, unknown>)['data']
        ? (res as unknown as Record<string, unknown>)['data']
        : res;
    return payload;
  } catch (err) {
    console.error('[FIRESTORE] createInvoiceAtomic failed', err);
    throw err;
  }
};

export const createPurchaseAtomic = async (
  companyId: string,
  purchase: Record<string, unknown>
): Promise<any> => {
  try {
    const fn = httpsCallable(functions, 'createPurchaseAtomic');
    const res = await fn({ companyId, purchase });
    const payload =
      res && (res as unknown as Record<string, unknown>)['data']
        ? (res as unknown as Record<string, unknown>)['data']
        : res;
    return payload;
  } catch (err) {
    console.error('[FIRESTORE] createPurchaseAtomic failed', err);
    throw err;
  }
};

export const createGoodsReceiptAtomic = async (
  companyId: string,
  receipt: Record<string, unknown>
): Promise<any> => {
  try {
    const fn = httpsCallable(functions, 'createGoodsReceiptAtomic');
    const res = await fn({ companyId, receipt });
    const payload =
      res && (res as unknown as Record<string, unknown>)['data']
        ? (res as unknown as Record<string, unknown>)['data']
        : res;
    return payload;
  } catch (err) {
    console.error('[FIRESTORE] createGoodsReceiptAtomic failed', err);
    throw err;
  }
};

export const createIncomingReceiptAtomic = async (
  companyId: string,
  receipt: Record<string, unknown>
): Promise<any> => {
  try {
    const fn = httpsCallable(functions, 'createIncomingReceiptAtomic');
    const res = await fn({ companyId, receipt });
    const payload =
      res && (res as unknown as Record<string, unknown>)['data']
        ? (res as unknown as Record<string, unknown>)['data']
        : res;
    return payload;
  } catch (err) {
    console.error('[FIRESTORE] createIncomingReceiptAtomic failed', err);
    throw err;
  }
};

// --- RBAC REPOSITORY GUARDS ---

type WriteableSection =
  | 'invoices'
  | 'customers'
  | 'products'
  | 'expenses'
  | 'settings'
  | 'users'
  | 'quotes'
  | 'recurring'
  | 'payments'
  | 'reports';

// Runtime role helper retained only for UI hints. Do NOT rely on this for security.
function getRuntimeRole(): UserRole | null {
  try {
    const raw = localStorage.getItem('app:activeRole');
    if (raw && Object.values(UserRole).includes(raw as UserRole)) {
      return raw as UserRole;
    }
    return null;
  } catch {
    return null;
  }
}

// IMPORTANT: Client-side RBAC checks are INSECURE and have been disabled for enforcement.
// Firestore security rules and server-side callables must enforce authorization.
function ensureWriteAllowed(section: WriteableSection) {
  const role = getRuntimeRole();
  console.warn(
    '[SECURITY][AUTHZ] Client-side role checks are disabled for enforcement. section=',
    section,
    'runtimeRole=',
    role
  );
  // No-op: allow the UI to attempt actions; server rules must validate.
  return;
}

// --- NEW QUERY INTERFACE ---
interface QueryOptions {
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  startAfter?: QueryDocumentSnapshot;
  filters?: [string, '==', unknown][];
}

// --- HELPER FUNCTIONS ---

const getCollectionRef = (companyId: string, collectionName: string) => {
  return collection(db, 'companies', companyId, collectionName);
};

const DEFAULT_PAGE_LIMIT = 50; // safe default to limit reads for cost control

const getData = async <T>(
  companyId: string,
  collectionName: string,
  options: QueryOptions = {}
): Promise<PaginatedData<T>> => {
  const {
    limit: queryLimitRaw,
    orderBy: orderByField,
    orderDirection = 'desc',
    startAfter: startAfterDoc,
    filters = [],
  } = options;

  // Apply a conservative default limit to prevent unbounded reads.
  // Callers that need to fetch more should explicitly pass a larger `limit`.
  const queryLimit =
    typeof queryLimitRaw === 'number' && queryLimitRaw > 0 ? queryLimitRaw : DEFAULT_PAGE_LIMIT;

  const constraints: QueryConstraint[] = [];

  filters.forEach((f) => constraints.push(where(f[0], f[1], f[2])));

  if (orderByField) {
    constraints.push(orderBy(orderByField, orderDirection));
  }

  if (startAfterDoc) {
    constraints.push(startAfter(startAfterDoc));
  }

  // Fetch one extra to determine if a next page exists
  if (queryLimit) {
    constraints.push(firestoreLimit(queryLimit + 1));
  }

  const q = query(getCollectionRef(companyId, collectionName), ...constraints);
  const querySnapshot = await getDocs(q);

  const docs = querySnapshot.docs;
  let hasMore = false;
  if (queryLimit && docs.length > queryLimit) {
    hasMore = true;
    docs.pop(); // Remove the extra doc
  }

  const data = docs.map((doc) => ({ id: doc.id, ...doc.data() }) as unknown as T);

  return {
    data,
    nextCursor: hasMore ? docs[docs.length - 1] : undefined,
  };
};

const getById = async <T>(
  companyId: string,
  collectionName: string,
  id: string
): Promise<T | undefined> => {
  const docRef = doc(db, 'companies', companyId, collectionName, id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? ({ id: docSnap.id, ...docSnap.data() } as unknown as T) : undefined;
};

const saveData = async <T extends { id?: string }>(
  companyId: string,
  collectionName: string,
  item: Omit<T, 'id'> | T,
  section: WriteableSection
): Promise<T> => {
  ensureWriteAllowed(section);
  if ('id' in item && item.id) {
    const { id, ...data } = item;
    const docRef = doc(db, 'companies', companyId, collectionName, id);
    await setDoc(docRef, data, { merge: true });
    return item as T;
  } else {
    const docRef = await addDoc(getCollectionRef(companyId, collectionName), item);
    return { id: docRef.id, ...item } as T;
  }
};

const deleteData = async (
  companyId: string,
  collectionName: string,
  id: string,
  section: WriteableSection
): Promise<boolean> => {
  ensureWriteAllowed(section);
  // Prefer server-side callable for safe (soft) deletes with audit and business logic.
  try {
    const fn = httpsCallable(functions, 'safeDeleteDocument');
    const res = await fn({ companyId, collectionName, id, reason: 'deleted_via_ui' });
    // Callable returns { success: true }
    const callPayload =
      res && (res as unknown as Record<string, unknown>)['data']
        ? (res as unknown as Record<string, unknown>)['data']
        : null;
    if (callPayload && (callPayload as Record<string, unknown>)['success']) return true;
  } catch (err) {
    console.warn(
      '[FIRESTORE] safeDeleteDocument callable failed, falling back to client delete',
      err?.message || err
    );
  }

  // Fallback to client-side hard delete (should be rare). Note: this path will be blocked by rules if enforced.
  await deleteDoc(doc(db, 'companies', companyId, collectionName, id));
  return true;
};

// --- AUTH & MEMBERSHIP RESOLUTION ---

export const checkIfPlatformAdmin = async (uid: string): Promise<boolean> => {
  // Prefer server callable if available (avoids client-side reads that may be denied by rules)
  try {
    try {
      const fn = httpsCallable(functions, 'isPlatformAdmin');
      const res = await fn({ uid });
      const payload =
        res && (res as unknown as Record<string, unknown>)['data']
          ? (res as unknown as Record<string, unknown>)['data']
          : null;
      if (payload && typeof (payload as Record<string, unknown>)['isAdmin'] === 'boolean') {
        if (DEBUG_MODE)
          console.log(
            '[DEBUG][AUTHZ] isPlatformAdmin (callable) result for',
            uid,
            (payload as Record<string, unknown>)['isAdmin']
          );
        return Boolean((payload as Record<string, unknown>)['isAdmin']);
      }
    } catch (callErr) {
      if (DEBUG_MODE)
        console.warn(
          '[DEBUG][AUTHZ] isPlatformAdmin callable not available or failed; falling back to client read',
          callErr?.message || callErr
        );
    }

    const adminRef = doc(db, 'platformAdmins', uid);
    const adminSnap = await withRetry(() => getDoc(adminRef));
    const isAdmin = adminSnap.exists();
    console.log('[DEBUG][AUTHZ] uid', uid, 'isPlatformAdmin?', isAdmin);
    return isAdmin;
  } catch (err) {
    console.error('[DEBUG][AUTHZ] checkIfPlatformAdmin failed for uid', uid, err);
    return false;
  }
};

export const getCompanyMemberships = async (uid: string): Promise<CompanyMembership[]> => {
  const memberships: CompanyMembership[] = [];
  if (DEBUG_MODE)
    console.log(
      `🔍 [FIRESTORE] Reading membership documents for uid: ${uid} (collectionGroup users)`
    );
  const usersQuery = query(collectionGroup(db, 'users'), where('uid', '==', uid));
  const querySnapshot = await withRetry(() => getDocs(usersQuery));

  // Collect companyIds and fetch company docs in parallel to avoid sequential N+1 reads
  const companyIds: string[] = [];
  const userDocs: Array<{ companyId: string; userData: CompanyUser }> = [];
  for (const userDoc of querySnapshot.docs) {
    const userData = userDoc.data() as CompanyUser;
    const companyId = userDoc.ref.parent.parent?.id; // companies/{companyId}/users/{userId}
    if (companyId) {
      companyIds.push(companyId);
      userDocs.push({ companyId, userData });
    }
  }

  const uniqueCompanyIds = Array.from(new Set(companyIds));
  const companySnaps = await Promise.all(
    uniqueCompanyIds.map((id) =>
      withRetry(() => getDoc(doc(db, 'companies', id))).catch(() => null)
    )
  );
  const companyMap = new Map<string, unknown>();
  for (let i = 0; i < uniqueCompanyIds.length; i++) {
    const id = uniqueCompanyIds[i];
    const snap = companySnaps[i] as unknown;
    const snapLike = snap as { exists?: () => boolean; data?: () => unknown };
    if (snap && typeof snapLike.exists === 'function' && snapLike.exists()) {
      companyMap.set(id, (snapLike.data && snapLike.data()) || undefined);
      if (DEBUG_MODE)
        console.log(`🟢 [FIRESTORE] Found company doc for companyId=${id}`, {
          id,
          data: snap.data(),
        });
    } else {
      if (DEBUG_MODE)
        console.warn(
          `🟡 [FIRESTORE] Company doc not found for companyId=${id} while resolving memberships`
        );
    }
  }

  for (const ud of userDocs) {
    const compData = companyMap.get(ud.companyId);
    if (compData) {
      memberships.push({
        companyId: ud.companyId,
        companyName: compData.companyName || compData.name || 'Unnamed Company',
        role: ud.userData.role,
        status: ud.userData.status,
      });
    }
  }

  return memberships;
};

/**
 * Create a company document and link the creating user as the owner.
 * This will write three documents in a single batch: companies/{companyId},
 * companies/{companyId}/users/{uid}, and users/{uid} (profile).
 * The company will be created with status 'pending' and cannot be approved
 * except by a platform admin.
 */
export const createCompanyWithOwner = async (
  uid: string,
  email: string,
  data: {
    companyName: string;
    companyAddress: string;
    ownerName: string;
    phone: string;
    country: string;
    city: string;
    businessType?: string;
  }
): Promise<{ companyId: string }> => {
  try {
    if (DEBUG_MODE)
      console.log(`🔍 [FIRESTORE] createCompanyWithOwner called for uid=${uid}, email=${email}`, {
        payload: data,
      });
    const companyRef = doc(collection(db, 'companies'));
    const companyId = companyRef.id;

    const companyData = {
      companyName: String((data as Record<string, unknown>)['companyName'] || '').trim(),
      companyAddress: String((data as Record<string, unknown>)['companyAddress'] || '').trim(),
      ownerName: String((data as Record<string, unknown>)['ownerName'] || '').trim(),
      phone: String((data as Record<string, unknown>)['phone'] || '').trim(),
      email: email.trim(),
      emailLower: email.trim().toLowerCase(),
      country: String((data as Record<string, unknown>)['country'] || '').trim(),
      city: String((data as Record<string, unknown>)['city'] || '').trim(),
      businessType: String((data as Record<string, unknown>)['businessType'] || '').trim(),
      status: 'pending',
      ownerUid: uid,
      createdAt: serverTimestamp(),
    };

    const userProfileRef = doc(db, 'users', uid);
    const membershipRef = doc(db, 'companies', companyId, 'users', uid);

    const batch = writeBatch(db);
    batch.set(companyRef, companyData);
    batch.set(membershipRef, {
      uid,
      email,
      role: 'company_owner',
      joinedAt: serverTimestamp(),
    });
    batch.set(userProfileRef, {
      uid,
      name: data.ownerName.trim(),
      email,
      role: 'company_owner',
      companyId: companyId,
      createdAt: serverTimestamp(),
    });

    await withRetry(() => batch.commit());
    console.log('🟢 [FIRESTORE] Company created with id', companyId, 'ownerUid=', uid);
    return { companyId };
  } catch (err) {
    console.error('🔴 [FIRESTORE] createCompanyWithOwner failed:', {
      uid,
      email,
      error: err?.message || err,
    });
    throw err;
  }
};

export const getUserProfile = async (uid: string): Promise<any | null> => {
  const ref = doc(db, 'users', uid);
  if (DEBUG_MODE) console.log(`🔍 [FIRESTORE] Reading users/${uid}`);
  const snap = await withRetry(() => getDoc(ref));
  if (snap.exists()) {
    if (DEBUG_MODE) console.log('🟢 [FIRESTORE] User profile found:', { uid, data: snap.data() });
    return snap.data();
  }
  if (DEBUG_MODE) console.warn('🟡 [FIRESTORE] User profile not found:', uid);
  return null;
};

export const getCompany = async (companyId: string): Promise<Company | null> => {
  const ref = doc(db, 'companies', companyId);
  if (DEBUG_MODE) console.log(`🔍 [FIRESTORE] Reading companies/${companyId}`);
  const snap = await withRetry(() => getDoc(ref));
  if (snap.exists()) {
    if (DEBUG_MODE)
      console.log('🟢 [FIRESTORE] Company document found:', { companyId, data: snap.data() });
    return { id: snap.id, ...(snap.data() as unknown as Record<string, unknown>) } as Company;
  }
  if (DEBUG_MODE) console.warn('🟡 [FIRESTORE] Company document not found:', companyId);
  return null;
};

export const updateCompanyStatusDirect = async (
  companyId: string,
  status: 'pending' | 'approved' | 'rejected'
) => {
  const ref = doc(db, 'companies', companyId);
  if (DEBUG_MODE)
    console.log(`🔍 [FIRESTORE] updateCompanyStatusDirect: ${companyId} -> ${status}`);
  await updateDoc(ref, { status: status, updatedAt: serverTimestamp() });
};

export const updateCompanyDetails = async (companyId: string, fields: Partial<Company>) => {
  const ref = doc(db, 'companies', companyId);
  await updateDoc(ref, { ...fields, updatedAt: serverTimestamp() });
};

export const logAdminAction = async (payload: {
  adminUid: string;
  companyId: string;
  action: string;
  note?: string;
}) => {
  const ref = collection(db, 'adminActions');
  await addDoc(ref, {
    adminUid: payload.adminUid,
    companyId: payload.companyId,
    action: payload.action,
    note: payload.note || null,
    createdAt: serverTimestamp(),
  });
};

export const getAdminActions = async (limit: number = 50): Promise<any[]> => {
  const q = query(
    collection(db, 'adminActions'),
    orderBy('createdAt', 'desc'),
    firestoreLimit(limit)
  );
  const snaps = await getDocs(q);
  return snaps.docs.map((d) => ({ id: d.id, ...(d.data() as unknown as Record<string, unknown>) }));
};

export const resolveFirstLogin = async (
  _user: User
): Promise<{ success: boolean; message?: string }> => {
  try {
    const fn = httpsCallable(functions, 'resolveFirstLogin');
    console.log('[DEBUG][OwnerLink] Calling server callable resolveFirstLogin');
    const res = await fn({});
    const payload =
      res && (res as unknown as Record<string, unknown>)['data']
        ? (res as unknown as Record<string, unknown>)['data']
        : {};
    if (payload.success) return { success: true };
    return { success: false, message: payload.message || 'no-invitations' };
  } catch (err) {
    console.error('[DEBUG][OwnerLink] resolveFirstLogin callable failed', err);
    return {
      success: false,
      message: String((err as unknown as { message?: unknown })?.message ?? 'callable-failed'),
    };
  }
};

// --- USER MANAGEMENT (MULTI-TENANT) ---
export const getCompanyUsers = async (companyId: string): Promise<CompanyUser[]> => {
  if (DEBUG_MODE)
    console.log(`🔍 [FIRESTORE] getCompanyUsers: reading companies/${companyId}/users`);
  const result = await getData<CompanyUser>(companyId, 'users');
  if (DEBUG_MODE)
    console.log(
      `🟢 [FIRESTORE] getCompanyUsers: found ${result.data.length} users for companyId=${companyId}`
    );
  return result.data;
};

export const getCompanyMembershipByUid = async (
  companyId: string,
  uid: string
): Promise<CompanyUser | null> => {
  try {
    if (DEBUG_MODE)
      console.log(
        `🔍 [FIRESTORE] getCompanyMembershipByUid: reading companies/${companyId}/users/${uid}`
      );
    const ref = doc(db, 'companies', companyId, 'users', uid);
    const snap = await withRetry(() => getDoc(ref));
    if (snap.exists()) {
      if (DEBUG_MODE)
        console.log('🟢 [FIRESTORE] Membership document found:', {
          companyId,
          uid,
          data: snap.data(),
        });
      return snap.data() as CompanyUser;
    }
    if (DEBUG_MODE)
      console.warn('🟡 [FIRESTORE] Membership document not found:', { companyId, uid });
    return null;
  } catch (err) {
    console.error('[DEBUG][AUTHZ] getCompanyMembershipByUid failed', { companyId, uid, err });
    throw err;
  }
};

export const getPendingInvitations = async (companyId: string): Promise<CompanyInvitation[]> => {
  // Invitations are server-managed; use callable to fetch pending invitations for a company
  const fn = httpsCallable(functions, 'getCompanyInvitations');
  try {
    // Use retry wrapper for transient network issues
    const res = await withRetry(() => fn({ companyId }));
    const payload =
      res && (res as unknown as Record<string, unknown>)['data']
        ? (res as unknown as Record<string, unknown>)['data']
        : {};
    return (payload.invites || []) as CompanyInvitation[];
  } catch (err) {
    console.error('[DEBUG][Invite] getCompanyInvitations failed', err);
    // Provide a clearer error code when the callable is not deployed or functions not reachable
    const msg = String((err as unknown as { message?: unknown })?.message ?? '').toLowerCase();
    if (
      msg.includes('not found') ||
      msg.includes('unimplemented') ||
      (err as unknown as { code?: unknown })?.code === 'not-found'
    ) {
      const e = new Error('Invitations callable not available') as Error & { code?: string };
      e.code = 'callable-unavailable';
      throw e;
    }
    throw err;
  }
};

export const inviteUser = async (
  companyId: string,
  email: string,
  role: UserRole,
  invitedBy: { uid: string; email: string }
): Promise<CompanyInvitation> => {
  // Use server-side callable to create invitations — client-side writes to invitations are blocked by rules.
  const fn = httpsCallable(functions, 'createCompanyInvitation');
  try {
    console.log('[DEBUG][Invite] Calling createCompanyInvitation', { companyId, email, role });
    const res = await fn({ companyId, email, role, notes: null });
    const payload =
      res && (res as unknown as Record<string, unknown>)['data']
        ? (res as unknown as Record<string, unknown>)['data']
        : {};
    const inviteId =
      payload && (payload as Record<string, unknown>)['inviteId']
        ? String((payload as Record<string, unknown>)['inviteId'])
        : '';
    return {
      id: inviteId,
      email,
      emailLower: email.trim().toLowerCase(),
      role,
      invitedByUid: invitedBy.uid,
      invitedByEmail: invitedBy.email,
      createdAt: Timestamp.now(),
      used: false,
    } as CompanyInvitation;
  } catch (err) {
    console.error('[DEBUG][Invite] createCompanyInvitation failed', err);
    throw err;
  }
};

export const deleteInvitation = async (
  companyId: string,
  invitationId: string
): Promise<boolean> => {
  // Use server-side callable to delete invitation securely
  const fn = httpsCallable(functions, 'deleteCompanyInvitation');
  try {
    console.log('[DEBUG][Invite] Calling deleteCompanyInvitation', { companyId, invitationId });
    const res = await fn({ inviteId: invitationId });
    const payload =
      res && (res as unknown as Record<string, unknown>)['data']
        ? (res as unknown as Record<string, unknown>)['data']
        : {};
    return (payload && (payload as Record<string, unknown>)['success'] === true) || false;
  } catch (err) {
    console.error('[DEBUG][Invite] deleteCompanyInvitation failed', err);
    throw err;
  }
};

export const updateUserRole = async (
  companyId: string,
  userId: string,
  role: UserRole
): Promise<{ enqueued?: boolean }> => {
  ensureWriteAllowed('users');
  // Prefer server-side callable to ensure this write is authorized and audited.
  try {
    const fn = httpsCallable(functions, 'assignCompanyRole');
    const res = await fn({ companyId, uid: userId, role });
    const payload =
      res && (res as unknown as Record<string, unknown>)['data']
        ? (res as unknown as Record<string, unknown>)['data']
        : res;
    if (payload && (payload as Record<string, unknown>)['success'] !== false) return;
  } catch (err) {
    // If the client is offline or callable cannot be reached, enqueue the operation for background sync.
    const msg = String((err as unknown as { message?: unknown })?.message ?? '');
    const isOffline =
      (typeof navigator !== 'undefined' && !navigator.onLine) ||
      msg.toLowerCase().includes('offline') ||
      (err as any)?.code === 'client-offline';
    if (isOffline) {
      try {
        enqueueOperation('assignRole', { companyId, uid: userId, role });
        // Resolve gracefully; UI will reflect change after sync or reload.
        return { enqueued: true };
      } catch (e) {
        console.warn('[FIRESTORE] Failed to enqueue assignRole operation', e);
        throw err;
      }
    }
    // As a robust fallback, attempt a direct client write (may be blocked by rules in prod).
    try {
      const userRef = doc(db, 'companies', companyId, 'users', userId);
      await setDoc(userRef, { role, updatedAt: Timestamp.now() }, { merge: true });
      return { enqueued: false };
    } catch (fwErr) {
      console.error('[FIRESTORE] updateUserRole fallback write failed', fwErr);
      throw err;
    }
  }
};

export const removeUserFromCompany = async (
  companyId: string,
  userId: string
): Promise<boolean> => {
  ensureWriteAllowed('users');
  return await deleteData(companyId, 'users', userId, 'users');
};

// Callable wrapper: create owner company server-side to avoid client-side rule issues
export const createOwnerCompanyCallable = async (data: {
  ownerFirstName: string;
  ownerLastName: string;
  companyName: string;
  companyAddress: string;
  ownerMobile?: string;
}) => {
  const fn = httpsCallable(functions, 'createOwnerCompany');
  try {
    const res = await fn(data);
    const payload =
      res && (res as unknown as Record<string, unknown>)['data']
        ? (res as unknown as Record<string, unknown>)['data']
        : {};
    return payload;
  } catch (err) {
    console.error('[DEBUG][createOwnerCompanyCallable] failed', err);
    throw err;
  }
};

// --- SETTINGS ---
export const getSettings = async (companyId: string): Promise<Settings | null> => {
  const docRef = doc(db, 'companies', companyId, 'settings', 'app');
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as Settings) : null;
};

export const saveSettings = async (
  companyId: string,
  settings: Omit<Settings, 'source'>
): Promise<Omit<Settings, 'source'>> => {
  ensureWriteAllowed('settings');
  const docRef = doc(db, 'companies', companyId, 'settings', 'app');
  await setDoc(docRef, settings, { merge: true });
  return settings;
};

// --- DATA SERVICES (Bulletproofed) ---
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
const updateStockAtomically = async (
  _companyId: string,
  _invoice: Invoice,
  _operation: 'increase' | 'decrease'
) => {
  // Disabled on client SDK: inventory and stockLedger writes must be performed by server-side callables
  throw new Error(
    'updateStockAtomically is disabled in the client SDK; use server-side atomic callables (createInvoiceAtomic / createPurchaseAtomic)'
  );
};

const getNextDocumentNumber = async (
  companyId: string,
  type: 'invoice' | 'quote'
): Promise<string> => {
  ensureWriteAllowed(type === 'invoice' ? 'invoices' : 'quotes');
  const counterRef = doc(db, 'companies', companyId, 'counters', 'main');
  const companySnap = await getDoc(counterRef);
  let nextNumber = 1;

  if (companySnap.exists()) {
    const data = companySnap.data();
    if (type === 'invoice') {
      nextNumber = (data.lastInvoiceNumber || 0) + 1;
    } else {
      nextNumber = (data.lastQuoteNumber || 0) + 1;
    }
  }

  const updateData =
    type === 'invoice' ? { lastInvoiceNumber: nextNumber } : { lastQuoteNumber: nextNumber };
  await setDoc(counterRef, updateData, { merge: true });

  const prefix = type === 'invoice' ? 'INV' : 'QT';
  return `${prefix}-${String(nextNumber).padStart(4, '0')}`;
};

// --- Public API ---
export const getCustomers = (companyId: string, options: QueryOptions = {}) =>
  getData<Customer>(companyId, 'customers', { orderBy: 'createdAt', ...options });
export const getCustomerById = (companyId: string, id: string) =>
  getById<Customer>(companyId, 'customers', id);
export const saveCustomer = (
  companyId: string,
  customer: Omit<Customer, 'id' | 'createdAt'> | Customer
) => {
  if ('id' in customer && customer.id) {
    return saveData<Customer>(companyId, 'customers', customer, 'customers');
  } else {
    const newCustomerWithTimestamp: Omit<Customer, 'id'> = {
      ...customer,
      createdAt: Timestamp.now(),
    };
    return saveData<Customer>(companyId, 'customers', newCustomerWithTimestamp, 'customers');
  }
};

export const getProducts = (
  companyId: string,
  options: QueryOptions = {}
): Promise<PaginatedData<Product>> => {
  // Delegate to the new tenant-aware products repository (includes simple caching)
  return productsRepo.getProducts(companyId, options as unknown as Record<string, unknown>);
};
export const getProductById = (companyId: string, id: string) =>
  getById<Product>(companyId, 'products', id);
export const saveProduct = (companyId: string, product: Omit<Product, 'id'> | Product) =>
  saveData<Product>(companyId, 'products', product, 'products');
export const deleteProduct = (companyId: string, id: string) =>
  deleteData(companyId, 'products', id, 'products');

export const getInvoices = (companyId: string, options: QueryOptions = {}) =>
  getData<Invoice>(companyId, 'invoices', { orderBy: 'date', ...options });
export const getInvoiceById = (companyId: string, id: string) =>
  getById<Invoice>(companyId, 'invoices', id);

export const saveInvoice = async (
  companyId: string,
  invoice: Omit<Invoice, 'id'> | Invoice
): Promise<Invoice> => {
  const invoiceToSave = { ...invoice };

  if (!('id' in invoiceToSave) || !invoiceToSave.id) {
    invoiceToSave.invoiceNumber = await getNextDocumentNumber(companyId, 'invoice');
  }
  // Compute subtotal and taxes
  invoiceToSave.subtotal = invoiceToSave.items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );
  const taxRate =
    typeof (invoiceToSave as Record<string, unknown>)['taxRate'] === 'number'
      ? Number((invoiceToSave as Record<string, unknown>)['taxRate'])
      : (invoiceToSave.taxRate ?? 0);
  const taxAmount = Math.round(invoiceToSave.subtotal * (taxRate / 100) * 100) / 100; // round to 2 decimals
  invoiceToSave.taxRate = taxRate;
  invoiceToSave.taxAmount = taxAmount;
  invoiceToSave.total = Math.round((invoiceToSave.subtotal + taxAmount) * 100) / 100;
  // Ensure invoice items carry unitCost snapshot and compute cost/profit
  let costTotal = 0;
  for (const it of invoiceToSave.items) {
    if (!it.productId) {
      (it as Record<string, unknown>)['unitCost'] = 0;
      continue;
    }
    try {
      const prod = await getById<Product>(companyId, 'products', it.productId);
      const unitCost =
        typeof (it as Record<string, unknown>)['unitCost'] === 'number'
          ? ((it as Record<string, unknown>)['unitCost'] as number)
          : prod && typeof prod.averageCost === 'number'
            ? (prod.averageCost as number)
            : prod && typeof prod.defaultCost === 'number'
              ? (prod.defaultCost as number)
              : 0;
      (it as Record<string, unknown>)['unitCost'] = unitCost;
      costTotal += unitCost * it.quantity;
    } catch (err) {
      (it as Record<string, unknown>)['unitCost'] = 0;
    }
  }
  invoiceToSave.costTotal = Math.round(costTotal * 100) / 100;
  invoiceToSave.profit = Math.round((invoiceToSave.total - invoiceToSave.costTotal) * 100) / 100;
  invoiceToSave.paymentsSummary = { paid: 0, due: invoiceToSave.total };
  console.log('[DEBUG][InvoiceSave]', {
    companyId,
    invoiceId: (invoiceToSave as Record<string, unknown>)['id'],
    subtotal: invoiceToSave.subtotal,
    taxRate: invoiceToSave.taxRate,
    taxAmount: invoiceToSave.taxAmount,
    total: invoiceToSave.total,
  });
  // Prefer server-side atomic invoice creation to avoid client-side race conditions.
  try {
    const payload = await createInvoiceAtomic(companyId, invoiceToSave as Partial<Invoice>);
    const invoiceId =
      payload && (payload.invoiceId || payload.id) ? payload.invoiceId || payload.id : undefined;
    if (invoiceId) {
      const saved = await getInvoiceById(companyId, String(invoiceId));
      if (saved) return saved;
    }
    // If callable did not return an id or failed, require server-side atomic operation
    throw new Error(
      'createInvoiceAtomic callable required: cannot perform invoice creation client-side'
    );
  } catch (err) {
    console.error(
      '[FIRESTORE] createInvoiceAtomic failed or is unavailable; server-side callable is required for invoice creation',
      err?.message || err
    );
    throw err;
  }
};

export const duplicateLastInvoice = async (companyId: string): Promise<Invoice> => {
  const res = (await getInvoices(companyId, {
    limit: 1,
    orderBy: 'createdAt',
    orderDirection: 'desc',
  })) as unknown;
  const last =
    (res as PaginatedData<Invoice> | undefined)?.data && (res as PaginatedData<Invoice>).data.length
      ? ((res as PaginatedData<Invoice>).data[0] as Invoice)
      : null;
  if (!last) throw new Error('No invoices available to duplicate');
  const cloneObj: Record<string, unknown> = { ...(last as unknown as Record<string, unknown>) };
  delete cloneObj.id;
  delete cloneObj.invoiceNumber;
  delete cloneObj.createdAt;
  delete cloneObj.updatedAt;
  (cloneObj as Record<string, unknown>)['date'] = Timestamp.now();
  // Use existing saveInvoice which will assign a new invoice number and perform stock adjustments
  return saveInvoice(companyId, clone as Omit<Invoice, 'id'>);
};

export const duplicateInvoice = async (companyId: string, invoiceId: string): Promise<Invoice> => {
  const inv = await getInvoiceById(companyId, invoiceId);
  if (!inv) throw new Error('Invoice not found');
  const cloneObj: Record<string, unknown> = { ...(inv as unknown as Record<string, unknown>) };
  delete cloneObj.id;
  delete cloneObj.invoiceNumber;
  delete cloneObj.createdAt;
  delete cloneObj.updatedAt;
  (cloneObj as Record<string, unknown>)['date'] = Timestamp.now();
  return saveInvoice(companyId, cloneObj as unknown as Omit<Invoice, 'id'>);
};

export const deleteInvoice = async (companyId: string, id: string): Promise<boolean> => {
  // Use server-side callable to perform a safe soft-delete with audit logging and stock adjustments.
  try {
    const fn = httpsCallable(functions, 'safeDeleteDocument');
    const res = await fn({ companyId, collectionName: 'invoices', id, reason: 'deleted_via_ui' });
    const payload =
      res && (res as unknown as Record<string, unknown>)['data']
        ? (res as unknown as Record<string, unknown>)['data']
        : {};
    return Boolean(payload && (payload as Record<string, unknown>)['success']) || false;
  } catch (err) {
    console.error(
      '[FIRESTORE] safeDeleteDocument failed; server-side callable required to perform safe invoice delete',
      err
    );
    throw new Error(
      'safeDeleteDocument callable required: cannot perform invoice delete client-side'
    );
  }
};

export const getPayments = (companyId: string, options: QueryOptions = {}) =>
  getData<Payment>(companyId, 'payments', { orderBy: 'date', ...options });
export const getPaymentsByCustomerId = (companyId: string, customerId: string) => {
  return getData<Payment>(companyId, 'payments', {
    filters: [['customerId', '==', customerId]],
    orderBy: 'date',
  });
};

export const savePayment = async (
  companyId: string,
  payment: Omit<Payment, 'id'> | Payment
): Promise<Payment> => {
  const savedPayment = await saveData<Payment>(companyId, 'payments', payment, 'payments');

  if (savedPayment.invoiceId) {
    const invoice = await getById<Invoice>(companyId, 'invoices', savedPayment.invoiceId);
    if (invoice && invoice.status !== InvoiceStatus.Paid) {
      const paymentsResult = await getPaymentsByCustomerId(companyId, invoice.customerId);
      const totalPaid = paymentsResult.data
        .filter((p) => p.invoiceId === savedPayment.invoiceId)
        .reduce((sum, p) => sum + p.amount, 0);

      // Update paymentsSummary and status on the invoice document
      const paid = totalPaid;
      const due = Math.max(0, (invoice.total || 0) - paid);
      const newStatus =
        paid >= (invoice.total || 0)
          ? InvoiceStatus.Paid
          : paid > 0
            ? InvoiceStatus.Due
            : invoice.status;
      await saveData<Invoice>(
        companyId,
        'invoices',
        { ...invoice, status: newStatus, paymentsSummary: { paid, due } },
        'invoices'
      );
    }
  }
  return savedPayment;
};

export const getExpenses = (companyId: string, options: QueryOptions = {}) =>
  getData<Expense>(companyId, 'expenses', { orderBy: 'date', ...options });
export const getExpenseById = (companyId: string, id: string) =>
  getById<Expense>(companyId, 'expenses', id);
export const saveExpense = (companyId: string, expense: Omit<Expense, 'id'> | Expense) =>
  saveData<Expense>(companyId, 'expenses', expense, 'expenses');
export const deleteExpense = (companyId: string, id: string) =>
  deleteData(companyId, 'expenses', id, 'expenses');

// Journal entries (accounting source of truth)
export const getJournalEntries = (companyId: string, options: QueryOptions = {}) =>
  getData<JournalEntry>(companyId, 'journalEntries', { orderBy: 'date', ...options });

export const getExpenseCategories = (companyId: string) =>
  getData<StoredExpenseCategory>(companyId, 'expenseCategories');
export const saveExpenseCategory = (
  companyId: string,
  category: Omit<StoredExpenseCategory, 'id'>
) => saveData<StoredExpenseCategory>(companyId, 'expenseCategories', category, 'expenses');
export const getVendors = (companyId: string) => getData<StoredVendor>(companyId, 'vendors');
export const saveVendor = (companyId: string, vendor: Omit<StoredVendor, 'id'>) =>
  saveData<StoredVendor>(companyId, 'vendors', vendor, 'expenses');

// --- Suppliers (Inventory) ---
export const getSuppliers = (companyId: string, options: QueryOptions = {}) =>
  getData<any>(companyId, 'suppliers', { orderBy: 'supplierName', ...options });
export const getSupplierById = (companyId: string, id: string) =>
  getById<any>(companyId, 'suppliers', id);

export const saveSupplier = async (companyId: string, supplier: Omit<any, 'id'> | any) => {
  ensureWriteAllowed('products');
  // Normalize name for uniqueness
  if (!supplier.supplierName || !String(supplier.supplierName).trim())
    throw new Error('Supplier name is required');
  const nameLower = String(supplier.supplierName).trim().toLowerCase();

  // Prevent duplicate supplier names within company (case-insensitive)
  const q = query(
    getCollectionRef(companyId, 'suppliers'),
    where('supplierNameLower', '==', nameLower),
    firestoreLimit(1)
  );
  const snaps = await getDocs(q);
  if ((!supplier.id || supplier.id === '') && snaps.docs.length > 0) {
    throw new Error('Supplier with the same name already exists');
  }

  const toSave = {
    ...supplier,
    supplierName: String(supplier.supplierName).trim(),
    supplierNameLower: nameLower,
    createdAt: supplier.createdAt || serverTimestamp(),
  } as unknown as Record<string, unknown>;

  return saveData<Record<string, unknown>>(companyId, 'suppliers', toSave, 'products');
};

export const deleteSupplier = (companyId: string, id: string) =>
  deleteData(companyId, 'suppliers', id, 'products');

// --- Reports ---
export const getSalesSummary = async (
  companyId: string
): Promise<{ totalSales: number; invoiceCount: number } | null> => {
  // Prefer server-side callable for performance and cost control.
  try {
    try {
      const fn = httpsCallable(functions, 'getSalesSummary');
      const res = await fn({ companyId });
      const payload =
        res && (res as unknown as Record<string, unknown>)['data']
          ? (res as unknown as Record<string, unknown>)['data']
          : res;
      if (payload && typeof payload.totalSales !== 'undefined') return payload;
    } catch (callErr) {
      // Callable may not be deployed in some environments; fall back to client-side aggregation
      if (typeof callErr?.message === 'string')
        console.warn(
          '[REPORTS] callable getSalesSummary not available, falling back:',
          callErr.message
        );
    }

    // Fallback: compute a basic summary by fetching recent invoices (limited to 500 for cost control).
    const res = (await getInvoices(companyId, {
      limit: 500,
      orderBy: 'date',
      orderDirection: 'desc',
    })) as unknown;
    const invoices =
      res && (res as PaginatedData<Invoice>).data ? (res as PaginatedData<Invoice>).data : [];
    const totalSales = invoices.reduce(
      (s: number, inv: Invoice) => s + (Number(inv.total) || 0),
      0
    );
    return { totalSales, invoiceCount: invoices.length };
  } catch (err) {
    console.warn('[REPORTS] getSalesSummary failed', err);
    return null;
  }
};

export const exportSalesCsv = async (
  companyId: string,
  from?: string,
  to?: string
): Promise<{ success: boolean; url?: string; path?: string } | null> => {
  try {
    // Prefer server callable
    try {
      const fn = httpsCallable(functions, 'exportSalesCsv');
      const res = await fn({ companyId, from, to });
      const payload = res && (res as any).data ? (res as any).data : res;
      return payload;
    } catch (callErr) {
      console.warn('[REPORTS] exportSalesCsv callable not available', callErr?.message || callErr);
      return null;
    }
  } catch (err) {
    console.warn('[REPORTS] exportSalesCsv failed', err);
    return null;
  }
};

// --- Incoming Receipts (Supplier receiving) ---
export const getIncomingReceipts = (
  companyId: string,
  options: QueryOptions = {}
): Promise<PaginatedData<IncomingReceipt>> =>
  getData<IncomingReceipt>(companyId, 'incomingReceipts', { orderBy: 'receivedAt', ...options });
export const getIncomingReceiptById = (
  companyId: string,
  id: string
): Promise<IncomingReceipt | undefined> =>
  getById<IncomingReceipt>(companyId, 'incomingReceipts', id);

// Inventory & Ledger reads
export const getInventory = (
  companyId: string,
  options: QueryOptions = {}
): Promise<PaginatedData<InventoryItem>> => {
  return getData<InventoryItem>(companyId, 'inventory', { orderBy: 'productId', ...options });
};

export const getStockLedger = (
  companyId: string,
  options: QueryOptions = {}
): Promise<PaginatedData<StockLedgerEntry>> => {
  return getData<StockLedgerEntry>(companyId, 'stockLedger', {
    orderBy: 'createdAt',
    orderDirection: 'desc',
    ...options,
  });
};

// Reports (daily summaries, etc.)
export const getReports = (
  companyId: string,
  options: QueryOptions = {}
): Promise<PaginatedData<Record<string, unknown>>> => {
  return getData<Record<string, unknown>>(companyId, 'reports', {
    orderBy: 'date',
    orderDirection: 'desc',
    ...options,
  });
};

export const saveIncomingReceipt = async (
  companyId: string,
  receipt: Omit<IncomingReceipt, 'id'> | IncomingReceipt
): Promise<IncomingReceipt> => {
  ensureWriteAllowed('products');

  // Basic validation
  if (!receipt || !receipt.supplierId) throw new Error('Cannot save receipt without supplier');
  if (!receipt.products || !Array.isArray(receipt.products) || receipt.products.length === 0)
    throw new Error('Receipt must include at least one product');
  for (const p of receipt.products) {
    if (!p.productId) throw new Error('Product id missing in receipt');
    if (typeof p.quantityReceived !== 'number' || p.quantityReceived <= 0)
      throw new Error('Quantity must be > 0');
  }

  // We do not support editing receipts in this function (to avoid complex delta logic).
  if ('id' in receipt && receipt.id)
    throw new Error('Editing receipts is not supported in this operation');

  // Run transaction to create receipt and update product stocks atomically
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  const _idempotencyKey = (receipt as unknown as Record<string, unknown>)['idempotencyKey'] as
    | string
    | undefined;
  // keyRef intentionally unused in client-side flow; server-side callable handles idempotency

  // Prefer server-side callable for atomic incoming receipt processing
  try {
    const payload = await createIncomingReceiptAtomic(
      companyId,
      receipt as unknown as Record<string, unknown>
    );
    const id =
      payload && (payload.receiptId || payload.id ? payload.receiptId || payload.id : undefined);
    if (id) {
      return {
        id,
        ...(receipt as IncomingReceipt),
        receivedAt: Timestamp.now(),
        createdAt: Timestamp.now(),
      } as IncomingReceipt;
    }
  } catch (callErr) {
    console.error(
      '[FIRESTORE] createIncomingReceiptAtomic unavailable or failed; server-side callable is required to perform incoming receipts due to security rules',
      callErr?.message || callErr
    );
    throw new Error(
      'createIncomingReceiptAtomic callable required: cannot perform incoming receipt client-side'
    );
  }
};

// --- Drafts (client-side editable drafts backed by Firestore) ---
export const saveDraft = async (
  companyId: string,
  key: string,
  payload: any
): Promise<{ id: string; key: string }> => {
  ensureWriteAllowed('invoices');
  const docRef = doc(db, 'companies', companyId, 'drafts', key);
  const toSave = {
    key,
    payload,
    updatedAt: serverTimestamp(),
  } as unknown as Record<string, unknown>;
  await setDoc(docRef, toSave, { merge: true });
  return { id: key, key };
};

export const getDraft = async (companyId: string, key: string): Promise<unknown | null> => {
  try {
    const docRef = doc(db, 'companies', companyId, 'drafts', key);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const data = snap.data() as unknown as Record<string, unknown>;
    return data.payload ?? null;
  } catch (err) {
    console.warn('[FIRESTORE] getDraft failed', err);
    return null;
  }
};

export const deleteDraft = async (companyId: string, key: string): Promise<boolean> => {
  try {
    const docRef = doc(db, 'companies', companyId, 'drafts', key);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.warn('[FIRESTORE] deleteDraft failed', err);
    return false;
  }
};

// Edit existing receipt: compute deltas and apply atomically
export const editIncomingReceipt = async (
  companyId: string,
  receiptId: string,
  updated: Omit<IncomingReceipt, 'id'> | IncomingReceipt
): Promise<IncomingReceipt> => {
  ensureWriteAllowed('products');
  if (!receiptId) throw new Error('receiptId is required');

  const receiptRef = doc(db, 'companies', companyId, 'incomingReceipts', receiptId);

  try {
    await runTransaction(db, async (tx) => {
      const oldSnap = await tx.get(receiptRef);
      if (!oldSnap.exists()) throw new Error('Receipt not found');
      const old = oldSnap.data() as Record<string, unknown>;

      // Validate updated payload
      if (!updated.supplierId) throw new Error('Cannot save receipt without supplier');
      if (!updated.products || !Array.isArray(updated.products) || updated.products.length === 0)
        throw new Error('Receipt must include at least one product');

      // Build maps of old and new quantities
      const oldMap: Record<string, number> = {};
      for (const p of old.products || [])
        oldMap[p.productId] = (oldMap[p.productId] || 0) + (p.quantityReceived || 0);
      const newMap: Record<string, number> = {};
      for (const p of updated.products || [])
        newMap[p.productId] = (newMap[p.productId] || 0) + (p.quantityReceived || 0);

      // Determine all productIds involved
      const productIds = Array.from(new Set([...Object.keys(oldMap), ...Object.keys(newMap)]));

      // Apply deltas per product
      for (const pid of productIds) {
        const oldQty = oldMap[pid] || 0;
        const newQty = newMap[pid] || 0;
        const delta = newQty - oldQty; // positive => increase stock, negative => decrease stock
        if (delta === 0) continue;

        const prodRef = doc(db, 'companies', companyId, 'products', pid);
        const prodSnap = await tx.get(prodRef);
        if (!prodSnap.exists()) throw new Error(`Product not found: ${pid}`);
        const currentStock = prodSnap.data().stock || 0;
        const newStock = currentStock + delta;
        if (newStock < 0)
          throw new Error(
            `Insufficient stock for product ${pid}. Current: ${currentStock}, delta: ${delta}`
          );
        tx.update(prodRef, { stock: newStock, updatedAt: Timestamp.now() } as unknown as Record<
          string,
          unknown
        >);
        console.log('🟢 Stock updated for product (edit):', pid, 'delta', delta);
      }

      // Update the receipt document
      const payload = { ...updated, updatedAt: serverTimestamp() } as unknown as Record<
        string,
        unknown
      >;
      tx.set(receiptRef, payload, { merge: true });
    });

    console.log('🟢 Transaction success: incoming receipt edited', receiptId);
    const snap = await getDoc(receiptRef);
    return { id: receiptId, ...(snap.exists() ? snap.data() : updated) } as IncomingReceipt;
  } catch (err) {
    console.error('🔴 Edit transaction failed:', err);
    throw err;
  }
};

export const getQuotes = (companyId: string, options: QueryOptions = {}) =>
  getData<Quote>(companyId, 'quotes', { orderBy: 'date', ...options });
export const getQuoteById = (companyId: string, id: string) =>
  getById<Quote>(companyId, 'quotes', id);
export const saveQuote = async (
  companyId: string,
  quote: Omit<Quote, 'id'> | Quote
): Promise<Quote> => {
  if (!('id' in quote)) {
    (quote as Quote).quoteNumber = await getNextDocumentNumber(companyId, 'quote');
  }
  return saveData<Quote>(companyId, 'quotes', quote, 'quotes');
};

// --- Goods Receipts (alias to a company-scoped goodsReceipts collection)
export const saveGoodsReceipt = async (
  companyId: string,
  receipt: {
    supplierId: string;
    items: { productId: string; productName?: string; quantity: number }[];
    idempotencyKey?: string;
  }
): Promise<{ id: string; ledgerEntries?: StockLedgerEntry[] }> => {
  ensureWriteAllowed('products');
  if (!receipt || !receipt.supplierId)
    throw new Error('Cannot save goods receipt without supplier');
  if (!receipt.items || !Array.isArray(receipt.items) || receipt.items.length === 0)
    throw new Error('Receipt must include at least one item');

  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  const _keyRef = receipt.idempotencyKey
    ? doc(db, 'companies', companyId, 'goodsReceiptKeys', receipt.idempotencyKey)
    : null;

  // Prefer server-side callable for atomic goods receipt processing
  try {
    const payload = await createGoodsReceiptAtomic(
      companyId,
      receipt as unknown as Record<string, unknown>
    );
    const id =
      payload && (payload.id || payload.receiptId ? payload.id || payload.receiptId : undefined);
    if (id)
      return {
        id,
        ledgerEntries: (payload && (payload.ledgerEntries || payload.createdLedgerEntries)) || [],
      } as { id: string; ledgerEntries?: StockLedgerEntry[] };
  } catch (callErr) {
    console.error(
      '[FIRESTORE] createGoodsReceiptAtomic unavailable or failed; server-side callable is required to perform goods receipts due to security rules',
      callErr?.message || callErr
    );
    throw new Error(
      'createGoodsReceiptAtomic callable required: cannot perform goods receipt client-side'
    );
  }
};

// --- Accounting: Journal Entries (double-entry enforced)
export const createJournalEntry = async (
  companyId: string,
  entry: {
    date?: any;
    lines: { accountId: string; debit: number; credit: number }[];
    referenceType?: string;
    referenceId?: string;
    description?: string;
  }
) => {
  ensureWriteAllowed('reports');
  if (!entry || !Array.isArray(entry.lines) || entry.lines.length === 0)
    throw new Error('Journal entry requires lines');
  // Validate double-entry
  const totalDebit = entry.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = entry.lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.0001) throw new Error('Journal entry is not balanced');

  const ref = doc(getCollectionRef(companyId, 'journalEntries'));
  const payload = {
    date: entry.date || serverTimestamp(),
    lines: entry.lines,
    referenceType: entry.referenceType || null,
    referenceId: entry.referenceId || null,
    description: entry.description || null,
    createdAt: serverTimestamp(),
  } as unknown as Record<string, unknown>;
  await setDoc(ref, payload);
  return { id: ref.id };
};

// --- Purchases: transactional creation + accounting + supplier balance update
export const createPurchase = async (
  companyId: string,
  purchase: {
    supplierId: string;
    supplierName?: string;
    invoiceNumber?: string;
    items: { productId: string; productName?: string; quantity: number; unitPrice: number }[];
    totalAmount: number;
  }
): Promise<{ id: string }> => {
  ensureWriteAllowed('expenses');
  if (!purchase || !purchase.supplierId) throw new Error('Purchase requires supplierId');
  // Prefer server-side callable for atomic purchase creation to ensure ledger/inventory writes
  try {
    const resp = await createPurchaseAtomic(
      companyId,
      purchase as unknown as Record<string, unknown>
    );
    if (resp && (resp as any).purchaseId) return { id: (resp as any).purchaseId };
  } catch (err) {
    console.error(
      '[FIRESTORE] createPurchaseAtomic unavailable or failed; server-side callable is required to perform purchases due to security rules',
      err?.message || err
    );
    throw new Error(
      'createPurchaseAtomic callable required: cannot perform purchase creation client-side'
    );
  }
};

// --- Returns (Purchase Returns and Sales Returns) - basic implementations
export const createPurchaseReturn = async (
  companyId: string,
  returnDoc: {
    purchaseId: string;
    items: { productId: string; quantity: number }[];
    totalRefund: number;
  }
) => {
  ensureWriteAllowed('expenses');
  if (!returnDoc || !returnDoc.purchaseId) throw new Error('purchaseId required');
  const ref = doc(getCollectionRef(companyId, 'purchaseReturns'));
  try {
    await runTransaction(db, async (tx) => {
      // Load purchase
      const purchaseRef = doc(db, 'companies', companyId, 'purchases', returnDoc.purchaseId);
      const pSnap = await tx.get(purchaseRef);
      if (!pSnap.exists()) throw new Error('Purchase not found');

      // Adjust supplier balance
      const supplierId = pSnap.data().supplierId;
      const supRef = doc(db, 'companies', companyId, 'suppliers', supplierId);
      const supSnap = await tx.get(supRef);
      if (!supSnap.exists()) throw new Error('Supplier not found');
      const curBal = supSnap.data().balance || 0;
      tx.update(supRef, {
        balance: curBal - (returnDoc.totalRefund || 0),
        updatedAt: serverTimestamp(),
      });

      // Adjust inventory back (decrease stock because goods returned to supplier)
      for (const it of returnDoc.items) {
        const prodRef = doc(db, 'companies', companyId, 'products', it.productId);
        const prodSnap = await tx.get(prodRef);
        if (!prodSnap.exists()) throw new Error(`Product not found: ${it.productId}`);
        const curStock = prodSnap.data().stock || 0;
        const newStock = curStock - Number(it.quantity || 0);
        if (newStock < 0) throw new Error('Insufficient stock for return');
        tx.update(prodRef, { stock: newStock, updatedAt: serverTimestamp() });
      }

      // Create return doc
      tx.set(ref, {
        purchaseId: returnDoc.purchaseId,
        items: returnDoc.items,
        totalRefund: returnDoc.totalRefund || 0,
        createdAt: serverTimestamp(),
      });

      // Create reversing journal entry
      const journalRef = doc(getCollectionRef(companyId, 'journalEntries'));
      const lines = [
        { accountId: 'Payables', debit: returnDoc.totalRefund || 0, credit: 0 },
        { accountId: 'Purchases', debit: 0, credit: returnDoc.totalRefund || 0 },
      ];
      tx.set(journalRef, {
        date: serverTimestamp(),
        lines,
        referenceType: 'purchaseReturn',
        referenceId: ref.id,
        createdAt: serverTimestamp(),
      });
    });
    return { id: ref.id };
  } catch (err) {
    console.error('🔴 createPurchaseReturn failed:', err);
    throw err;
  }
};

export const createSalesReturn = async (
  companyId: string,
  returnDoc: {
    invoiceId: string;
    items: { productId: string; quantity: number }[];
    totalRefund: number;
  }
) => {
  ensureWriteAllowed('invoices');
  if (!returnDoc || !returnDoc.invoiceId) throw new Error('invoiceId required');
  const ref = doc(getCollectionRef(companyId, 'salesReturns'));
  try {
    await runTransaction(db, async (tx) => {
      // Adjust inventory (increase stock because customer returned goods)
      for (const it of returnDoc.items) {
        const prodRef = doc(db, 'companies', companyId, 'products', it.productId);
        const prodSnap = await tx.get(prodRef);
        if (!prodSnap.exists()) throw new Error(`Product not found: ${it.productId}`);
        const curStock = prodSnap.data().stock || 0;
        const newStock = curStock + Number(it.quantity || 0);
        tx.update(prodRef, { stock: newStock, updatedAt: serverTimestamp() });
      }

      // Create return doc
      tx.set(ref, {
        invoiceId: returnDoc.invoiceId,
        items: returnDoc.items,
        totalRefund: returnDoc.totalRefund || 0,
        createdAt: serverTimestamp(),
      });

      // Create reversing journal entry
      const journalRef = doc(getCollectionRef(companyId, 'journalEntries'));
      const lines = [
        { accountId: 'Sales', debit: returnDoc.totalRefund || 0, credit: 0 },
        { accountId: 'Receivables', debit: 0, credit: returnDoc.totalRefund || 0 },
      ];
      tx.set(journalRef, {
        date: serverTimestamp(),
        lines,
        referenceType: 'salesReturn',
        referenceId: ref.id,
        createdAt: serverTimestamp(),
      });
    });
    return { id: ref.id };
  } catch (err) {
    console.error('🔴 createSalesReturn failed:', err);
    throw err;
  }
};

export const createInvoiceFromQuote = async (
  companyId: string,
  quoteId: string
): Promise<Invoice> => {
  ensureWriteAllowed('invoices'); // Creating an invoice from a quote requires invoice permissions
  const quote = await getQuoteById(companyId, quoteId);
  if (!quote) throw new Error('Quote not found');

  const newInvoiceData: Omit<Invoice, 'id'> = {
    invoiceNumber: '',
    customerId: quote.customerId,
    customerName: quote.customerName,
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: quote.items,
    subtotal: quote.subtotal,
    total: quote.total,
    paymentType: PaymentType.Credit,
    status: InvoiceStatus.Due,
  };

  await saveData<Quote>(companyId, 'quotes', { ...quote, status: QuoteStatus.Accepted }, 'quotes');

  return saveInvoice(companyId, newInvoiceData);
};

export const getRecurringInvoices = (companyId: string, options: QueryOptions = {}) =>
  getData<RecurringInvoice>(companyId, 'recurringInvoices', { orderBy: 'nextDueDate', ...options });
export const getRecurringInvoiceById = (companyId: string, id: string) =>
  getById<RecurringInvoice>(companyId, 'recurringInvoices', id);
export const saveRecurringInvoice = (
  companyId: string,
  rec: Omit<RecurringInvoice, 'id'> | RecurringInvoice
) => saveData<RecurringInvoice>(companyId, 'recurringInvoices', rec, 'recurring');
export const deleteRecurringInvoice = (companyId: string, id: string) =>
  deleteData(companyId, 'recurringInvoices', id, 'recurring');
export const generateInvoicesFromRecurring = async (companyId: string): Promise<Invoice[]> => {
  ensureWriteAllowed('invoices'); // Generating invoices requires invoice permissions
  const recurringResult = await getRecurringInvoices(companyId);
  const recurring = recurringResult.data;
  const today = new Date().toISOString().split('T')[0];
  const invoicesToCreate: Omit<Invoice, 'id'>[] = [];
  const recurringToUpdate: RecurringInvoice[] = [];

  for (const rec of recurring) {
    if (rec.nextDueDate <= today && (!rec.endDate || rec.endDate >= today)) {
      const subtotal = rec.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
      const taxAmount = subtotal * ((rec.taxRate || 0) / 100);
      const total = subtotal + taxAmount;

      invoicesToCreate.push({
        invoiceNumber: '',
        customerId: rec.customerId,
        customerName: rec.customerName,
        date: today,
        dueDate: today,
        items: rec.items,
        subtotal: subtotal,
        taxRate: rec.taxRate,
        taxAmount: taxAmount,
        total: total,
        paymentType: PaymentType.Credit,
        status: InvoiceStatus.Due,
      });

      const nextDueDate = new Date(rec.nextDueDate);
      if (rec.frequency === Frequency.Weekly) nextDueDate.setDate(nextDueDate.getDate() + 7);
      if (rec.frequency === Frequency.Monthly) nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      if (rec.frequency === Frequency.Yearly)
        nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);

      recurringToUpdate.push({ ...rec, nextDueDate: nextDueDate.toISOString().split('T')[0] });
    }
  }

  if (invoicesToCreate.length === 0) return [];

  const createdInvoices = await Promise.all(
    invoicesToCreate.map((inv) => saveInvoice(companyId, inv))
  );
  await Promise.all(recurringToUpdate.map((rec) => saveRecurringInvoice(companyId, rec)));

  return createdInvoices;
};

// --- DEVELOPMENT ---
export const deleteAllCompanyData = async (companyId: string): Promise<void> => {
  ensureWriteAllowed('settings'); // A manager-only action
  console.warn(`DELETING ALL DATA for company ${companyId}`);
  const collections = [
    'customers',
    'products',
    'invoices',
    'payments',
    'expenses',
    'quotes',
    'recurringInvoices',
    'expenseCategories',
    'vendors',
    'settings',
    'counters',
    'users',
    'invitations',
  ];
  const BATCH_LIMIT = 400; // keep under Firestore limit of 500
  let pendingDeletes: any[] = [];
  let totalDeleted = 0;

  for (const collectionName of collections) {
    const querySnapshot = await getDocs(getCollectionRef(companyId, collectionName));
    for (const docSnap of querySnapshot.docs) {
      pendingDeletes.push(docSnap.ref);
      if (pendingDeletes.length >= BATCH_LIMIT) {
        const batch = writeBatch(db);
        pendingDeletes.forEach((ref) => batch.delete(ref));
        await batch.commit();
        totalDeleted += pendingDeletes.length;
        console.log(`[deleteAllCompanyData] Committed batch of ${pendingDeletes.length} deletes.`);
        pendingDeletes = [];
      }
    }
  }

  if (pendingDeletes.length > 0) {
    const batch = writeBatch(db);
    pendingDeletes.forEach((ref) => batch.delete(ref));
    await batch.commit();
    totalDeleted += pendingDeletes.length;
    console.log(
      `[deleteAllCompanyData] Committed final batch of ${pendingDeletes.length} deletes.`
    );
  }

  console.log(`All data for company ${companyId} has been cleared. Total deleted: ${totalDeleted}`);
};

// FIX: Add function to call the 'createInvitation' cloud function.
export const createCustomerInvitation = async (
  email: string,
  companyName: string,
  notes: string
): Promise<any> => {
  const createInvitationFunction = httpsCallable(functions, 'createInvitation');
  const result = await createInvitationFunction({ email, companyName, notes });
  return result.data;
};

// Wrapper to accept a top-level invitation using the server-side callable.
export const acceptInvitation = async (inviteId: string, token: string): Promise<any> => {
  const acceptInvitationFunction = httpsCallable(functions, 'acceptInvitation');
  const result = await acceptInvitationFunction({ inviteId, token });
  return result.data;
};

export const undeleteDocument = async (
  companyId: string,
  collectionName: string,
  id: string
): Promise<boolean> => {
  try {
    const fn = httpsCallable(functions, 'safeUndeleteDocument');
    const res = await fn({ companyId, collectionName, id });
    return Boolean(
      res &&
      (res as unknown as Record<string, unknown>)['data'] &&
      ((res as unknown as Record<string, unknown>)['data'] as Record<string, unknown>)['success']
    );
  } catch (err) {
    console.warn('[FIRESTORE] safeUndeleteDocument failed', err?.message || err);
    return false;
  }
};

// This function is not applicable in Firestore mode, it's for mocks.
export const populateDummyData = (_companyId: string): Promise<boolean> => Promise.resolve(false);
