/**
 * Minimal gate for the office side of the platform.
 *
 * Set PLATFORM_PASSWORD and the platform screens, the capture-link endpoint and
 * the property endpoint all require a signed cookie. Leave it unset and the app
 * runs open, which is what makes the seeded demo clickable straight after
 * `npm install`. Real per-user accounts belong in Supabase Auth; this is the
 * lock on the door until they are in place.
 *
 * Web Crypto rather than node:crypto, so the same code runs in middleware.
 */

export const SESSION_COOKIE = 'krik_platform';
const MAX_AGE_MS = 30 * 24 * 3600 * 1000;

export function authRequired(): boolean {
  return Boolean(process.env.PLATFORM_PASSWORD);
}

async function key(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(process.env.PLATFORM_PASSWORD ?? ''),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

function base64url(bytes: ArrayBuffer): string {
  let s = '';
  new Uint8Array(bytes).forEach((b) => {
    s += String.fromCharCode(b);
  });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function mac(payload: string): Promise<string> {
  const sig = await crypto.subtle.sign('HMAC', await key(), new TextEncoder().encode(payload));
  return base64url(sig);
}

export async function signSession(issuedAt = Date.now()): Promise<string> {
  const payload = String(issuedAt);
  return `${payload}.${await mac(payload)}`;
}

export async function verifySession(value: string | undefined): Promise<boolean> {
  if (!authRequired()) return true;
  if (!value) return false;
  const [payload, given] = value.split('.');
  if (!payload || !given) return false;
  if (!constantTimeEqual(given, await mac(payload))) return false;
  const issued = Number(payload);
  return Number.isFinite(issued) && Date.now() - issued < MAX_AGE_MS;
}

export function passwordMatches(input: string): boolean {
  const expected = process.env.PLATFORM_PASSWORD ?? '';
  return expected.length > 0 && constantTimeEqual(input, expected);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
