export type SafeBootErrorSource = 'bootstrap' | 'react' | 'runtime';

export interface SafeBootError {
  message: string;
  source: SafeBootErrorSource;
  stack?: string;
  file?: string;
}

declare global {
  interface Window {
    __SAFE_BOOT_ERROR__?: SafeBootError;
  }
}

const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV === true;

const listeners: Array<(error: SafeBootError | null) => void> = [];
let currentError: SafeBootError | null = null;

const applyError = (error: SafeBootError | null) => {
  currentError = error;
  if (typeof window !== 'undefined') {
    if (error) {
      window.__SAFE_BOOT_ERROR__ = error;
    } else {
      delete window.__SAFE_BOOT_ERROR__;
    }
  }
  listeners.forEach((listener) => listener(error));
};

const noop = () => {};

export const isSafeBootEnabled = isDev;

export const setSafeBootError = isDev
  ? (error: Error | unknown, source: SafeBootErrorSource = 'runtime', file?: string) => {
      const sanitized: SafeBootError = {
        message: error instanceof Error ? error.message : String(error),
        source,
        stack: error instanceof Error ? error.stack : undefined,
        file,
      };
      applyError(sanitized);
    }
  : noop;

export const clearSafeBootError = isDev
  ? () => {
      applyError(null);
    }
  : noop;

export const subscribeSafeBootError = isDev
  ? (listener: (error: SafeBootError | null) => void) => {
      listeners.push(listener);
      listener(currentError);
      return () => {
        const idx = listeners.indexOf(listener);
        if (idx >= 0) listeners.splice(idx, 1);
      };
    }
  : () => noop;

export const initSafeBootPanel = isDev
  ? () => {
      if (typeof document === 'undefined') return;
      const existing = document.getElementById('safe-boot-panel');
      if (existing) return;

      const overlay = document.createElement('div');
      overlay.id = 'safe-boot-panel';
      overlay.style.position = 'fixed';
      overlay.style.bottom = '12px';
      overlay.style.right = '12px';
      overlay.style.left = '12px';
      overlay.style.maxHeight = '40vh';
      overlay.style.padding = '12px';
      overlay.style.background = 'rgba(17,17,17,0.9)';
      overlay.style.color = '#fff';
      overlay.style.borderRadius = '8px';
      overlay.style.fontSize = '12px';
      overlay.style.zIndex = '2147483647';
      overlay.style.boxShadow = '0 10px 24px rgba(0,0,0,0.5)';
      overlay.style.display = 'none';
      overlay.style.flexDirection = 'column';
      overlay.style.gap = '6px';
      overlay.style.fontFamily = 'system-ui, sans-serif';
      overlay.style.overflow = 'auto';

      const title = document.createElement('div');
      title.style.fontWeight = '600';
      title.textContent = 'SafeBoot Diagnostic Panel';

      const source = document.createElement('div');
      source.style.opacity = '0.7';

      const message = document.createElement('div');
      message.style.whiteSpace = 'pre-wrap';

      const stack = document.createElement('pre');
      stack.style.whiteSpace = 'pre-wrap';
      stack.style.maxHeight = '120px';
      stack.style.overflowY = 'auto';
      stack.style.margin = '0';
      stack.style.padding = '0';
      stack.style.opacity = '0.8';
      stack.style.fontSize = '11px';
      stack.style.background = 'rgba(255,255,255,0.05)';
      stack.style.borderRadius = '4px';
      stack.style.padding = '6px';

      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Copy Error';
      button.style.border = 'none';
      button.style.background = 'rgba(255,255,255,0.1)';
      button.style.color = '#fff';
      button.style.padding = '6px 10px';
      button.style.borderRadius = '4px';
      button.style.cursor = 'pointer';

      button.addEventListener('click', () => {
        const error = currentError;
        if (!error) return;
        const payload = [
          `Message: ${error.message}`,
          `Source: ${error.source}`,
          error.file ? `File: ${error.file}` : null,
          error.stack ? `Stack:\n${error.stack}` : 'Stack: not available',
        ]
          .filter(Boolean)
          .join('\n\n');
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(payload).catch(() => undefined);
        } else {
          const textarea = document.createElement('textarea');
          textarea.value = payload;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        }
      });

      overlay.appendChild(title);
      overlay.appendChild(source);
      overlay.appendChild(message);
      overlay.appendChild(stack);
      overlay.appendChild(button);
      document.body.appendChild(overlay);

      const update = (error: SafeBootError | null) => {
        if (!error) {
          overlay.style.display = 'none';
          return;
        }
        overlay.style.display = 'flex';
        source.textContent = `Source: ${error.source} ${error.file ? `(${error.file})` : ''}`;
        message.textContent = error.message;
        stack.textContent = error.stack || 'Stack trace is not available.';
      };

      subscribeSafeBootError(update);
    }
  : noop;
