export function getErrorMessage(err: unknown, fallbackAr?: string): string {
  const fallback =
    fallbackAr || 'حدث خطأ أثناء تحميل بيانات الحساب. يرجى المحاولة مرة أخرى.';
  if (!err) return fallback;

  const anyErr = err as {
    message?: unknown;
    details?: unknown;
    error?: { message?: unknown };
  };

  const raw =
    (typeof err === 'string' && err) ||
    (typeof anyErr?.message === 'string' && anyErr.message) ||
    (typeof anyErr?.details === 'string' && anyErr.details) ||
    (typeof anyErr?.error?.message === 'string' && anyErr.error.message) ||
    '';

  const candidate = raw || fallback;
  return decodeUnicodeEscapes(candidate);
}

function decodeUnicodeEscapes(input: string): string {
  let s = input.trim();

  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    try {
      const jsonCandidate = s.startsWith("'")
        ? `"${s.slice(1, -1).replace(/"/g, '\\"')}"`
        : s;
      s = JSON.parse(jsonCandidate);
    } catch {
      // ignore parse errors
    }
  }

  if (/\\u[0-9a-fA-F]{4}/.test(s) || /\\\\u[0-9a-fA-F]{4}/.test(s)) {
    try {
      const normalized = s.replace(/\\\\u/g, '\\u');
      return JSON.parse(`"${normalized.replace(/"/g, '\\"')}"`);
    } catch {
      // ignore decode errors
    }
  }

  return s;
}
