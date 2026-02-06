/**
 * Async Resilience Utilities
 * ================================================
 * 
 * Provides timeout and retry capabilities for Firestore operations.
 * Helps handle temporary network/Firebase issues gracefully.
 */

/**
 * Execute a promise with a timeout
 * @param promise - Promise to execute
 * @param ms - Timeout in milliseconds
 * @param errorKey - i18n error key for timeout message (optional)
 * @returns Promise result or throws TimeoutError
 * 
 * Example:
 *   await withTimeout(fetchData(), 5000, 'errorTimeout');
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  errorKey?: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      const err = new Error(errorKey || 'Operation timeout');
      (err as any).code = 'TIMEOUT';
      (err as any).i18nKey = errorKey || 'errorTimeout';
      reject(err);
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]);
}

export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  jitter?: boolean;
  maxDelayMs?: number;
}

/**
 * Execute a function with retry on failure
 * Uses exponential backoff with optional jitter
 * 
 * @param fn - Function to execute (should throw on failure)
 * @param options - Retry options
 * @returns Promise result
 * 
 * Example:
 *   const result = await withRetry(
 *     () => firestore.collection('users').get(),
 *     { retries: 3, baseDelayMs: 500, jitter: true }
 *   );
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    retries = 2,
    baseDelayMs = 500,
    jitter = true,
    maxDelayMs = 5000,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;

      // Don't retry on last attempt
      if (attempt === retries) break;

      // Calculate delay with exponential backoff
      let delayMs = baseDelayMs * Math.pow(2, attempt);

      // Add jitter
      if (jitter) {
        delayMs *= 0.5 + Math.random() * 0.5;
      }

      // Cap maximum delay
      delayMs = Math.min(delayMs, maxDelayMs);

      // Log retry attempt (dev-friendly, no i18n needed here)
      console.debug(
        `[RETRY] Attempt ${attempt + 1}/${retries + 1} failed, retrying in ${Math.round(delayMs)}ms`,
        {
          error: (err as any)?.message,
          code: (err as any)?.code,
        }
      );

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // All retries exhausted
  throw lastError || new Error('Operation failed after retries');
}

/**
 * Combine timeout + retry for maximum resilience
 * 
 * @param fn - Function to execute
 * @param timeoutMs - Timeout per attempt
 * @param retryOptions - Retry options
 * @returns Promise result
 * 
 * Example:
 *   const data = await withTimeoutAndRetry(
 *     () => firestore.collection('invoices').limit(10).get(),
 *     5000,
 *     { retries: 2, baseDelayMs: 300 }
 *   );
 */
export async function withTimeoutAndRetry<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  retryOptions: RetryOptions = {}
): Promise<T> {
  return withRetry(
    () => withTimeout(fn(), timeoutMs),
    retryOptions
  );
}
