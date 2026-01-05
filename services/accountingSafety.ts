import { UserRole } from '../types';

// Simple accounting safety utilities used by the UI before attempting destructive actions.
// Real enforcement must exist server-side in Functions / Firestore security rules.

export function isPosted(doc: any): boolean {
  // Many documents use a 'posted' or 'isFinal' flag when finalized. Safe-check common variants.
  return !!(doc && (doc.posted === true || doc.isPosted === true || doc.isFinal === true || doc.status === 'final'));
}

export function isPeriodLocked(companySettings: any, isoDate: string | Date): boolean {
  try {
    const date = typeof isoDate === 'string' ? new Date(isoDate) : (isoDate as Date);
    if (!companySettings) return false;
    const lockedPeriods: string[] = companySettings.lockedPeriods || [];
    const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    return lockedPeriods.includes(monthKey);
  } catch (e) {
    return false;
  }
}

export function canEditEntry(userRole: UserRole | null, doc: any, companySettings: any): { allowed: boolean; reason?: string } {
  if (isPosted(doc)) return { allowed: false, reason: 'posted' };
  if (isPeriodLocked(companySettings, doc?.date || new Date())) return { allowed: false, reason: 'period_locked' };
  if (!userRole) return { allowed: false, reason: 'no_role' };
  if (userRole === UserRole.Owner || userRole === UserRole.Manager) return { allowed: true };
  // Employees can edit drafts only
  if (userRole === UserRole.Employee) return { allowed: !isPosted(doc), reason: 'limited' };
  return { allowed: false, reason: 'insufficient_role' };
}
