import { getFirestore } from 'firebase-admin/firestore';
// Client fallback: uses firebase/app + firestore browser SDK when admin not available
import { getFirestore as getClientFirestore } from 'firebase/firestore';

// Lightweight audit logging service. In browser, this will write to `companies/{companyId}/auditLogs`.
export async function logAudit(
  companyId: string,
  userId: string | null,
  action: string,
  before: any,
  after: any,
  meta: Record<string, any> = {}
) {
  if (!companyId) throw new Error('companyId required for audit log');
  const entry = {
    action,
    before: before || null,
    after: after || null,
    performedBy: userId || null,
    performedAt: new Date(),
    meta: meta || {},
  };

  try {
    // Try admin SDK
    // @ts-expect-error - may be running in admin runtime
    if (typeof getFirestore === 'function') {
      const db = getFirestore();
      await db
        .collection('companies')
        .doc(companyId)
        .collection('auditLogs')
        .add(entry as any);
      return;
    }
  } catch (e) {
    // ignore and try client SDK
  }

  try {
    const db = getClientFirestore();
    // @ts-expect-error - client SDK compatibility
    await db.collection(`companies/${companyId}/auditLogs`).add(entry as any);
  } catch (e) {
    console.warn('[auditService] failed to write audit log', e);
  }
}
