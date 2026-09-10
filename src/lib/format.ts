/** Dutch number formatting: comma decimal separator, period thousands separator. */
export function fmtNum(n: number | null | undefined, decimals?: number): string {
  const v = Number(n);
  if (!isFinite(v)) return String(n);
  const opts: Intl.NumberFormatOptions =
    decimals === undefined
      ? { maximumFractionDigits: 2 }
      : { minimumFractionDigits: decimals, maximumFractionDigits: decimals };
  return v.toLocaleString('nl-NL', opts);
}

export function fmtEuro(n: number): string {
  return '€ ' + Math.round(n).toLocaleString('nl-NL');
}

export function parseNlDate(s: string): Date {
  const [d, m, y] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function fmtNlDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${date.getFullYear()}`;
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseNlDate(b).getTime() - parseNlDate(a).getTime()) / 86400000);
}

export function nowStamp(): string {
  const now = new Date();
  return (
    now.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' +
    now.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
  );
}

export function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** FNV-1a, normalised to 0..1. Same input always gives the same number. */
export function unitHash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
