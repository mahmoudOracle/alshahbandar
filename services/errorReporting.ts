// Minimal centralized error reporting service.
// Provides a small adapter to integrate with Sentry or fall back to console.
type ErrorPayload = {
  error: Error;
  info?: unknown;
  context?: Record<string, unknown>;
};

let _sentry: unknown = null;
let _sentryInitialized = false;

export async function initSentry(dsn?: string, options?: Record<string, unknown>) {
  if (!dsn) {
    return;
  }

  try {
    const Sentry = await import('@sentry/browser');
    // Initialize Sentry if available; cast options defensively
    (Sentry as any).init({ dsn, ...(options as unknown as Record<string, unknown>) });
    _sentry = Sentry;
    _sentryInitialized = true;
  } catch (e) {
    // If the package isn't installed or import fails, gracefully continue.
    console.warn('[errorReporting] failed to initialize Sentry:', e);
    _sentryInitialized = false;
  }
}

export const reportError = (payload: ErrorPayload) => {
  try {
    const win = globalThis as unknown as { __ERROR_REPORTER__?: (p: ErrorPayload) => void };
    const reporter = win.__ERROR_REPORTER__;
    if (typeof reporter === 'function') {
      reporter(payload);
      return;
    }

    if (_sentryInitialized && _sentry) {
      try {
        const s = _sentry as { captureException?: (err: unknown, ctx?: unknown) => void } | null;
        if (s && typeof s.captureException === 'function') {
          s.captureException(payload.error, {
            extra: { info: payload.info, context: payload.context },
          });
          return;
        }
      } catch (e) {
        // Fall through to console fallback
        console.warn('[errorReporting] Sentry capture failed', e);
      }
    }

    console.error('[errorReporting] Captured error:', payload.error);
    if (payload.info) console.error('[errorReporting] info:', payload.info);
    if (payload.context) console.info('[errorReporting] context:', payload.context);
  } catch (e) {
    console.error('[errorReporting] failed to report error', e);
  }
};

export default { reportError, initSentry };
