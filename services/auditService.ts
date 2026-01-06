import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

// Lightweight audit logging service: prefer server-side callable `logAudit` so audit entries
// are always written using Admin SDK (honest actor). Fall back to console when not available.
export async function logAudit(
  companyId: string,
  userId: string | null,
  action: string,
  before: any,
  after: any,
  meta: Record<string, any> = {}
) {
  if (!companyId) throw new Error('companyId required for audit log');

  try {
    const fn = httpsCallable(functions, 'logAudit');
    await fn({ companyId, action, before: before || null, after: after || null, meta: meta || {} });
    return;
  } catch (err) {
    // If callable isn't available (dev environment) or fails, degrade gracefully to console.
    console.warn('[auditService] logAudit callable failed; falling back to console', err);
    console.info('[auditService] audit:', {
      companyId,
      action,
      performedBy: userId || null,
      performedAt: new Date().toISOString(),
      meta,
      before,
      after,
    });
  }
}
