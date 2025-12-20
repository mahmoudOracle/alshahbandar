// Minimal centralized error reporting service.
// Provides a small adapter to integrate with Sentry or fall back to console.
type ErrorPayload = {
    error: Error;
    info?: any;
    context?: Record<string, unknown>;
};

let _sentry: any = null;
let _sentryInitialized = false;

export async function initSentry(dsn?: string, options?: Record<string, any>) {
    if (!dsn) {
        return;
    }

    try {
        const Sentry = await import('@sentry/browser');
        Sentry.init({ dsn, ...options });
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
        const anyWin = (globalThis as any);
        if (anyWin && typeof anyWin.__ERROR_REPORTER__ === 'function') {
            anyWin.__ERROR_REPORTER__(payload);
            return;
        }

        if (_sentryInitialized && _sentry) {
            try {
                _sentry.captureException(payload.error, { extra: { info: payload.info, context: payload.context } });
                return;
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
