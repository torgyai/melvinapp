import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, authRequired, verifySession } from '@/lib/auth';

/**
 * Guards the office side. The capture link, the client pages and the public
 * indication site stay open by design: they are addressed by their own token or
 * id and are meant to be opened without an account.
 */
const PROTECTED = [
  '/overzicht', '/panden', '/projecten', '/kaart', '/dashboard', '/email',
  '/uitbreidingen', '/labels', '/scan', '/api/capture', '/api/property',
];

export async function middleware(req: NextRequest) {
  if (!authRequired()) return NextResponse.next();

  const { pathname } = req.nextUrl;
  // A capture link carries its own token and must keep working on a phone.
  if (pathname.startsWith('/api/capture/')) return NextResponse.next();
  if (!PROTECTED.some((p) => pathname === p || pathname.startsWith(p + '/'))) return NextResponse.next();

  if (await verifySession(req.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|sw.js).*)'],
};
