import { useState, useEffect } from 'react';

type QueuedOp = {
  id: string;
  type: string;
  payload: any;
  attempts?: number;
  createdAt: string;
};

const STORAGE_KEY = 'app:syncQueue';

function loadQueue(): QueuedOp[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueuedOp[];
  } catch (e) {
    return [];
  }
}

function saveQueue(q: QueuedOp[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(q));
  } catch (e) {
    /* ignore */
  }
}

export function enqueueOperation(type: string, payload: any) {
  const q = loadQueue();
  const op: QueuedOp = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    payload,
    attempts: 0,
    createdAt: new Date().toISOString(),
  };
  q.push(op);
  saveQueue(q);
  // trigger background processing
  processQueue();
  return op.id;
}

export async function processQueue(): Promise<void> {
  if (!navigator.onLine) return;
  const q = loadQueue();
  if (!q.length) return;

  // Basic processing: try to execute each op via a simple strategy map
  const remaining: QueuedOp[] = [];
  for (const op of q) {
    try {
      // Cloud Functions are disabled; drop queued ops safely.
      console.warn('[syncService] dropping op (functions disabled)', op.type, op.id);
    } catch (err) {
      const attempts = (op.attempts || 0) + 1;
      if (attempts < 5) {
        op.attempts = attempts;
        remaining.push(op);
      } else {
        // drop after several attempts
        console.warn('[syncService] dropping op after max attempts', op.id, err);
      }
    }
  }

  saveQueue(remaining);
}

export function useBackgroundSync() {
  const [queueLength, setQueueLength] = useState<number>(() => loadQueue().length);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const onChange = () => setQueueLength(loadQueue().length);
    const onOnline = () => {
      setIsProcessing(true);
      processQueue().finally(() => {
        setIsProcessing(false);
        onChange();
      });
    };

    window.addEventListener('storage', onChange);
    window.addEventListener('online', onOnline);

    // try processing once on mount if online
    if (navigator.onLine) {
      setIsProcessing(true);
      processQueue().finally(() => {
        setIsProcessing(false);
        onChange();
      });
    }

    return () => {
      window.removeEventListener('storage', onChange);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  return { queueLength, isProcessing };
}
