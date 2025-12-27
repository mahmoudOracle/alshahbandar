import * as dataService from '../../services/dataService';

export const saveDraft = (key: string, data: unknown) => {
  try {
    const payload = { ts: Date.now(), data };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    // ignore storage errors
  }
};

export const loadDraft = (key: string): unknown | null => {
  try {
    // Try remote draft first if dataService is available and online
    const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (online) {
      try {
        const ds = dataService as unknown as Record<string, unknown>;
        if ('getDraft' in ds && typeof ds.getDraft === 'function') {
          // key format: draft:invoice:{companyId}:{idOrNew}
          const parts = String(key).split(':');
          if (parts.length >= 4) {
            const companyId = parts[2];
            const docKey = parts.slice(3).join(':');
            // call but don't await here to preserve sync API expected by callers
            try {
              const fn = ds.getDraft as (...args: unknown[]) => unknown;
              const remote = fn(companyId, docKey);
              if (remote && typeof remote !== 'object') {
                // if remote returned primitive, return it directly
                return remote;
              }
            } catch {
              // ignore remote failure
            }
          }
        }
      } catch {
        // ignore remote failure
      }
    }
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.data ?? null;
  } catch {
    return null;
  }
};

export const clearDraft = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch (e) { void e; }
};

const timers = new Map<string, ReturnType<typeof setTimeout>>();
export const debounceSaveDraft = (key: string, data: unknown, wait = 1200) => {
  try {
    const existing = timers.get(key);
    if (existing) clearTimeout(existing);
    const id = window.setTimeout(() => {
      saveDraft(key, data);
      // also try remote save when online
      try {
        const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
        const ds = dataService as unknown as Record<string, unknown>;
        if (online && 'saveDraft' in ds && typeof ds.saveDraft === 'function') {
          const parts = String(key).split(':');
          if (parts.length >= 4) {
            const companyId = parts[2];
            const docKey = parts.slice(3).join(':');
            // attempt remote save but ignore failures
            try {
              const fn = ds.saveDraft as (...args: unknown[]) => unknown;
              fn(companyId, docKey, data);
            } catch { /* ignore */ }
          }
        }
      } catch (e) { /* ignore */ }
      timers.delete(key);
    }, wait) as unknown as number;
    timers.set(key, id);
  } catch (e) {
    // ignore
  }
};
