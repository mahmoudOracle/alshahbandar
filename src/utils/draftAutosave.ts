export const saveDraft = (key: string, data: any) => {
  try {
    const payload = { ts: Date.now(), data };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    // ignore storage errors
  }
};

export const loadDraft = (key: string) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.data ?? null;
  } catch (e) {
    return null;
  }
};

export const clearDraft = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch (e) {}
};

const timers = new Map<string, number>();
export const debounceSaveDraft = (key: string, data: any, wait = 1200) => {
  try {
    const existing = timers.get(key);
    if (existing) clearTimeout(existing);
    const id = window.setTimeout(() => {
      saveDraft(key, data);
      timers.delete(key);
    }, wait) as unknown as number;
    timers.set(key, id);
  } catch (e) {
    // ignore
  }
};
