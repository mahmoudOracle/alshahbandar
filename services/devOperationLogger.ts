interface FirestoreOperationLog {
  method: string;
  argsPreview: string;
  timestamp: number;
  durationMs: number;
}

const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV === true;
const MAX_ENTRIES = 50;
const operations: FirestoreOperationLog[] = [];
const listeners = new Set<(ops: FirestoreOperationLog[]) => void>();

const formatArgs = (args: unknown[]): string => {
  return args
    .map((arg) => {
      if (arg === undefined) return 'undefined';
      if (arg === null) return 'null';
      if (typeof arg === 'string') return `"${arg}"`;
      if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg);
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(', ');
};

const emit = () => {
  const snapshot = [...operations];
  listeners.forEach((listener) => listener(snapshot));
};

export const logFirestoreOperation = (
  method: string,
  args: unknown[],
  durationMs: number
): void => {
  if (!isDev) return;
  const entry: FirestoreOperationLog = {
    method,
    argsPreview: formatArgs(args),
    timestamp: Date.now(),
    durationMs,
  };
  operations.unshift(entry);
  if (operations.length > MAX_ENTRIES) {
    operations.pop();
  }
  emit();
};

export const subscribeFirestoreOperations = (
  listener: (ops: FirestoreOperationLog[]) => void
): (() => void) => {
  if (!isDev) {
    return () => undefined;
  }
  listeners.add(listener);
  listener([...operations]);
  return () => {
    listeners.delete(listener);
  };
};

export const getRecentFirestoreOperations = (): FirestoreOperationLog[] => {
  if (!isDev) return [];
  return [...operations];
};

export type { FirestoreOperationLog };
