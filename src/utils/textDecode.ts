export function decodeUnicodeText(input: unknown): string {
  const s = typeof input === 'string' ? input : '';
  if (!s) return '';

  try {
    let t = s.trim();

    if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
      try {
        const jsonCandidate = t.startsWith("'")
          ? `"${t.slice(1, -1).replace(/"/g, '\\"')}"`
          : t;
        t = JSON.parse(jsonCandidate);
      } catch {
        // ignore parse errors
      }
    }

    if (/\\\\u[0-9a-fA-F]{4}/.test(t)) t = t.replace(/\\\\u/g, '\\u');
    if (/\\u[0-9a-fA-F]{4}/.test(t)) {
      return JSON.parse(`"${t.replace(/"/g, '\\"')}"`);
    }
    return t;
  } catch {
    return s;
  }
}
