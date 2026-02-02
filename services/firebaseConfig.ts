import type { FirebaseOptions } from 'firebase/app';

const STORAGE_KEY = 'app:firebaseConfig';
const COMPANY_ID_KEY = 'app:companyId';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const isFirebaseConfigComplete = (value: unknown): value is FirebaseOptions => {
  if (!isObject(value)) return false;
  return (
    typeof value.apiKey === 'string' &&
    typeof value.projectId === 'string' &&
    typeof value.authDomain === 'string'
  );
};

export const getStoredFirebaseConfig = (): FirebaseOptions | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isFirebaseConfigComplete(parsed) ? (parsed as FirebaseOptions) : null;
  } catch {
    return null;
  }
};

export const storeFirebaseConfig = (config: FirebaseOptions): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
};

export const clearFirebaseConfig = (): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
};

export const getStoredCompanyId = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(COMPANY_ID_KEY);
    const trimmed = raw ? raw.trim() : '';
    return trimmed ? trimmed : null;
  } catch {
    return null;
  }
};

export const storeCompanyId = (companyId: string): void => {
  if (typeof window === 'undefined') return;
  const trimmed = companyId.trim();
  if (!trimmed) return;
  window.localStorage.setItem(COMPANY_ID_KEY, trimmed);
};
