import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { Logo } from '@/components/platform/Logo';
import { SESSION_COOKIE, authRequired, passwordMatches, signSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; fout?: string }>;
}) {
  if (!authRequired()) redirect('/overzicht');
  const { next = '/overzicht', fout } = await searchParams;

  async function signIn(formData: FormData) {
    'use server';
    const password = String(formData.get('password') ?? '');
    const target = String(formData.get('next') || '/overzicht');
    if (!passwordMatches(password)) {
      redirect(`/login?next=${encodeURIComponent(target)}&fout=1`);
    }
    (await cookies()).set(SESSION_COOKIE, await signSession(), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 30 * 24 * 3600,
    });
    redirect(target);
  }

  return (
    <div className="public-view" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <form action={signIn} className="pub-card" style={{ maxWidth: 380, width: '100%' }}>
        <div style={{ marginBottom: 18 }}>
          <Logo height={40} />
        </div>
        <div className="pub-field">
          <label>Wachtwoord</label>
          <input type="password" name="password" autoFocus autoComplete="current-password" />
        </div>
        <input type="hidden" name="next" value={next} />
        <button className="pub-submit" type="submit">
          Inloggen
        </button>
        {fout && (
          <div className="pub-result-sub" style={{ marginTop: 10, color: '#8a5a00' }}>
            Wachtwoord klopt niet.
          </div>
        )}
      </form>
    </div>
  );
}
