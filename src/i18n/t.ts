import { ar, ArKey } from './ar';

type Vars = Record<string, string | number>;

export function t(key: ArKey, vars?: Vars): string {
  let value = ar[key] ?? String(key);
  if (!vars) return value;
  Object.entries(vars).forEach(([k, v]) => {
    value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  });
  return value;
}
