import type { FirebaseOptions } from 'firebase/app';

export const STORAGE_KEYS = {
  firebaseConfig: 'app:firebaseWebConfig',
  companyId: 'app:companyId',
  companyName: 'app:companyName',
  setupVersion: 'app:setupVersion',
  autoCreateCompany: 'app:autoCreateCompany',
} as const;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export class FirebaseSetupMissingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FirebaseSetupMissingError';
  }
}

export class CompanyIdMissingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CompanyIdMissingError';
  }
}

export const isFirebaseConfigComplete = (value: unknown): value is FirebaseOptions => {
  if (!isObject(value)) return false;
  return (
    typeof value.apiKey === 'string' &&
    typeof value.authDomain === 'string' &&
    typeof value.projectId === 'string' &&
    typeof value.appId === 'string'
  );
};

export const getStoredFirebaseConfig = (): FirebaseOptions | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEYS.firebaseConfig) ||
      window.localStorage.getItem('app:firebaseConfig');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isFirebaseConfigComplete(parsed) ? (parsed as FirebaseOptions) : null;
  } catch {
    return null;
  }
};

export const saveFirebaseConfig = (rawJson: string): void => {
  if (typeof window === 'undefined') return;
  const parsed = JSON.parse(rawJson);
  if (!isFirebaseConfigComplete(parsed)) {
    throw new FirebaseSetupMissingError(
      'Invalid Firebase config JSON. Required: apiKey, authDomain, projectId, appId.'
    );
  }
  window.localStorage.setItem(STORAGE_KEYS.firebaseConfig, JSON.stringify(parsed));
  window.localStorage.setItem(STORAGE_KEYS.setupVersion, '1');
};

export const getCompanyIdOptional = (): string | null => {
  if (typeof import.meta !== 'undefined') {
    const env = (import.meta as unknown as { env?: Record<string, unknown> }).env;
    if (env && typeof env.VITE_COMPANY_ID === 'string' && env.VITE_COMPANY_ID.trim()) {
      return env.VITE_COMPANY_ID.trim();
    }
  }
  if (typeof process !== 'undefined' && process.env.VITE_COMPANY_ID) {
    return String(process.env.VITE_COMPANY_ID).trim();
  }
  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEYS.companyId);
      const trimmed = stored ? stored.trim() : '';
      return trimmed || null;
    } catch {
      return null;
    }
  }
  return null;
};

export const getCompanyId = (): string => {
  const value = getCompanyIdOptional();
  if (!value) {
    throw new CompanyIdMissingError(
      'Company ID is missing. Set VITE_COMPANY_ID or provide it during setup.'
    );
  }
  return value;
};

export const saveCompanyId = (companyId: string): void => {
  if (typeof window === 'undefined') return;
  const trimmed = companyId.trim();
  if (!trimmed) return;
  window.localStorage.setItem(STORAGE_KEYS.companyId, trimmed);
};

export const getCompanyName = (): string => {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(STORAGE_KEYS.companyName) || '';
  } catch {
    return '';
  }
};

export const saveCompanyName = (companyName: string): void => {
  if (typeof window === 'undefined') return;
  const trimmed = companyName.trim();
  if (!trimmed) return;
  window.localStorage.setItem(STORAGE_KEYS.companyName, trimmed);
};

export const getAutoCreateCompany = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEYS.autoCreateCompany) !== 'false';
  } catch {
    return false;
  }
};

export const saveAutoCreateCompany = (enabled: boolean): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEYS.autoCreateCompany, enabled ? 'true' : 'false');
};

export const clearSetup = (): void => {
  if (typeof window === 'undefined') return;
  Object.values(STORAGE_KEYS).forEach((key) => {
    window.localStorage.removeItem(key);
  });
};
