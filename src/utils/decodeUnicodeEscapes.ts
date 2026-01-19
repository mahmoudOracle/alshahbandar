export function decodeUnicodeEscapes(input: string): string {
  // If input contains \uXXXX, decode using JSON.parse trick
  if (/\\u[0-9a-fA-F]{4}/.test(input)) {
    try {
      return JSON.parse('"' + input.replace(/"/g, '\"') + '"');
    } catch {
      // fallback: return input as-is
      return input;
    }
  }
  return input;
}
