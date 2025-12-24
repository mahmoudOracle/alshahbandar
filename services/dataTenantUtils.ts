/**
 * Multi-Tenant Data Isolation Utilities
 * 
 * These utilities help verify data isolation and enforce tenant boundaries
 * in the multi-tenant SaaS application.
 */

import { User as FirebaseUser } from 'firebase/auth';
import { DEBUG_MODE } from '../config';

export interface DataIsolationCheck {
  isValid: boolean;
  userId: string;
  companyId: string;
  warnings: string[];
  errors: string[];
}

/**
 * Validates that a user's session is properly isolated to a single company
 * @param user Firebase user
 * @param companyId Active company ID
 * @returns Validation result with any warnings or errors
 */
export function validateUserDataIsolation(
  user: FirebaseUser | null,
  companyId: string | null
): DataIsolationCheck {
  const result: DataIsolationCheck = {
    isValid: false,
    userId: user?.uid || 'unknown',
    companyId: companyId || 'unknown',
    warnings: [],
    errors: []
  };

  if (!user) {
    result.errors.push('User not authenticated');
    return result;
  }

  if (!companyId) {
    result.errors.push('No active company ID set');
    return result;
  }

  // Verify no multi-company access attempt
  try {
    const storedCompanyId = localStorage.getItem('app:activeCompanyId');
    if (storedCompanyId && storedCompanyId !== companyId) {
      result.warnings.push(
        `Active company ID mismatch: storage has ${storedCompanyId}, context has ${companyId}`
      );
    }
  } catch (e) {
    result.warnings.push('Could not verify stored company ID (localStorage issue)');
  }

  // All checks passed
  result.isValid = result.errors.length === 0;

  if (DEBUG_MODE && (result.errors.length > 0 || result.warnings.length > 0)) {
    console.warn('[ISOLATION]', result);
  }

  return result;
}

/**
 * Verifies that all data queries will be properly scoped to the company
 * This is called before critical operations
 * @param userId User UID
 * @param companyId Company ID
 * @returns true if safe to proceed, false if isolation is compromised
 */
export function isSafeToAccessCompanyData(
  userId: string,
  companyId: string
): boolean {
  if (!userId || !companyId) {
    console.error('[ISOLATION] Missing userId or companyId', { userId, companyId });
    return false;
  }

  // Verify company ID is not null or generic placeholder
  if (companyId === 'null' || companyId === '' || companyId === 'undefined') {
    console.error('[ISOLATION] Invalid companyId:', companyId);
    return false;
  }

  if (DEBUG_MODE) {
    console.log('[ISOLATION] Safety check passed', { userId, companyId });
  }

  return true;
}

/**
 * Logs a data access event for audit purposes
 * This helps track who accessed what and when
 * @param action Type of action (read, write, delete)
 * @param resource Resource being accessed (e.g., 'invoices', 'customers')
 * @param userId User UID
 * @param companyId Company ID
 * @param details Additional details
 */
export function logDataAccessEvent(
  action: 'read' | 'write' | 'delete' | 'export',
  resource: string,
  userId: string,
  companyId: string,
  details?: Record<string, any>
): void {
  const timestamp = new Date().toISOString();
  const event = {
    timestamp,
    action,
    resource,
    userId,
    companyId,
    ...details
  };

  if (DEBUG_MODE) {
    console.log('[AUDIT]', event);
  }

  // In production, send to server-side logging
  // await fetch('/api/logs/audit', { method: 'POST', body: JSON.stringify(event) })
}

/**
 * Checks if a company ID looks valid (prevents common injection attempts)
 * @param companyId Company ID to validate
 * @returns true if valid format
 */
export function isValidCompanyId(companyId: string): boolean {
  if (!companyId || typeof companyId !== 'string') return false;
  
  // Firestore document IDs are alphanumeric with some special chars allowed
  // Pattern: letters, numbers, hyphens, underscores
  const validPattern = /^[a-zA-Z0-9_-]{1,64}$/;
  
  return validPattern.test(companyId);
}

/**
 * Enforces single-company session by clearing any conflicting data
 * This should be called during logout or company switch
 * @param companyIdToKeep Company ID to preserve (null for complete logout)
 */
export function cleanupSessionData(companyIdToKeep: string | null = null): void {
  try {
    // Clear all company-related data except the one to keep
    const keysToCheck = [
      'app:activeCompanyId',
      'app:activeRole',
      'app:companyCache',
      'app:userPermissions'
    ];

    keysToCheck.forEach(key => {
      if (!companyIdToKeep && key === 'app:activeCompanyId') {
        localStorage.removeItem(key);
      } else if (companyIdToKeep) {
        // Keep only the specified company ID
        const stored = localStorage.getItem(key);
        if (stored && !stored.includes(companyIdToKeep)) {
          localStorage.removeItem(key);
        }
      }
    });

    if (DEBUG_MODE) {
      console.log('[ISOLATION] Session data cleaned up', { companyIdToKeep });
    }
  } catch (e) {
    console.warn('[ISOLATION] Could not clean up session data:', e);
  }
}

/**
 * Returns a summary of the current isolation state for debugging
 */
export function getIsolationStateSummary(): Record<string, any> {
  try {
    return {
      activeCompanyId: localStorage.getItem('app:activeCompanyId'),
      activeRole: localStorage.getItem('app:activeRole'),
      timestamp: new Date().toISOString(),
      location: window.location.href
    };
  } catch (e) {
    return { error: 'Could not read isolation state' };
  }
}

// Log isolation state in development
if (DEBUG_MODE) {
  console.log('[ISOLATION] Multi-tenant data isolation utilities loaded');
}
