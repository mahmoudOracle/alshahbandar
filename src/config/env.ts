const importMetaEnvAvailable =
  typeof import.meta !== 'undefined' && typeof (import.meta as { env?: Record<string, unknown> }).env !== 'undefined';

const readRawCompanyId = (): string | undefined => {
  if (importMetaEnvAvailable) {
    const metaEnv = (import.meta as { env: Record<string, unknown> }).env;
    if (typeof metaEnv.VITE_COMPANY_ID === 'string') {
      return metaEnv.VITE_COMPANY_ID;
    }
  }
  if (typeof process !== 'undefined' && process.env.VITE_COMPANY_ID) {
    return process.env.VITE_COMPANY_ID;
  }
  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem('app:companyId');
      if (stored && stored.trim()) return stored.trim();
    } catch {
      // ignore localStorage access issues
    }
  }
  return undefined;
};

export class EnvConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvConfigError';
  }
}

export function getCompanyId(): string {
  const rawValue = readRawCompanyId();
  const trimmed = rawValue?.trim();
  if (!trimmed) {
    throw new EnvConfigError('Environment configuration error: VITE_COMPANY_ID is missing');
  }
  return trimmed;
}

export const ENV = {
  get companyId(): string {
    return getCompanyId();
  },
  get isDev(): boolean {
    if (importMetaEnvAvailable) {
      return Boolean((import.meta as { env: Record<string, unknown> }).env.DEV);
    }
    if (typeof process !== 'undefined') {
      return process.env['NODE_ENV'] === 'development';
    }
    return false;
  },
  get mode(): string {
    if (importMetaEnvAvailable) {
      return String((import.meta as { env: Record<string, unknown> }).env.MODE ?? 'development');
    }
    if (typeof process !== 'undefined' && process.env.NODE_ENV) {
      return process.env.NODE_ENV;
    }
    return 'development';
  },
};
