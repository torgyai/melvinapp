'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { getStatus } from '@/lib/domain';
import type { Property } from '@/lib/types';
import { useApp } from './AppContext';
import { Icons } from './Icons';
import { Logo } from './Logo';

export function Sidebar() {
  const { properties, emails, isAdmin, lang, setLang, search } = useApp();
  const pathname = usePathname();
  const router = useRouter();

  const unread = emails.filter((e) => !e.read).length;
  const q = search.trim().toLowerCase();

  const { openIds, doneIds } = useMemo(() => {
    const open: Property[] = [];
    const done: Property[] = [];
    properties.forEach((p) => (getStatus(p).key === 'done' ? done : open).push(p));
    return { openIds: open, doneIds: done };
  }, [properties]);

  const matches = (p: Property) => !q || `${p.address} ${p.city}`.toLowerCase().includes(q);

  return (
    <aside className="sidebar">
      <div className="app-brand">
        <Link href="/overzicht" aria-label="Naar het overzicht">
          <Logo />
        </Link>
      </div>

      <div className="lang-toggle">
        <button className={lang === 'nl' ? 'active' : ''} onClick={() => setLang('nl')}>NL</button>
        <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
      </div>

      <nav>
        <NavItem href="/overzicht" icon={Icons.grid} label="Overzicht" active={pathname === '/overzicht'} />
        <NavItem href="/scan" icon={Icons.scan} label="Nieuwe scan" active={pathname.startsWith('/scan')} />
        <NavItem href="/kaart" icon={Icons.map} label="Kaart" active={pathname === '/kaart'} />
        {isAdmin && <NavItem href="/dashboard" icon={Icons.bars} label="Dashboard" active={pathname === '/dashboard'} />}
        <NavItem
          href="/email"
          icon={Icons.mail}
          label="E-mail"
          active={pathname.startsWith('/email')}
          badge={unread || undefined}
        />
        <NavItem href="/uitbreidingen" icon={Icons.bulb} label="Uitbreidingen" active={pathname === '/uitbreidingen'} />

        <div className="nav-menu-area">
          {q ? (
            <SearchResults open={openIds.filter(matches)} done={doneIds.filter(matches)} query={search.trim()} />
          ) : (
            <>
              <CategoryRow href="/projecten/open" label="Openstaande projecten" count={openIds.length} active={pathname === '/projecten/open'} />
              <CategoryRow href="/projecten/afgerond" label="Afgeronde projecten" count={doneIds.length} active={pathname === '/projecten/afgerond'} />
            </>
          )}
        </div>
      </nav>

      <div className="sidebar-footer">
        <button className="pub-site-btn" onClick={() => router.push('/indicatie')}>
          {Icons.globe}
          <span>
            <span>Bekijk publieke website</span>
            <span className="sub">Indicatietool voor bezoekers</span>
          </span>
        </button>
      </div>
    </aside>
  );
}

function NavItem({
  href, icon, label, active, badge,
}: { href: string; icon: React.ReactNode; label: string; active: boolean; badge?: number }) {
  return (
    <Link href={href} className={`nav-item${active ? ' active' : ''}`}>
      {icon}
      <span>{label}</span>
      {badge ? <span className="nav-item-badge">{badge}</span> : null}
    </Link>
  );
}

function CategoryRow({ href, label, count, active }: { href: string; label: string; count: number; active: boolean }) {
  return (
    <Link href={href} className={`nav-catrow${active ? ' active' : ''}`}>
      <span className="nav-catrow-text">
        {label} <span className="nav-count">{count}</span>
      </span>
      {Icons.chevronRight}
    </Link>
  );
}

function SearchResults({ open, done, query }: { open: Property[]; done: Property[]; query: string }) {
  if (!open.length && !done.length) {
    return <div className="nav-empty">Geen panden gevonden voor &quot;{query}&quot;</div>;
  }
  return (
    <>
      {open.length > 0 && (
        <>
          <div className="nav-drill-title">
            Openstaande projecten <span className="nav-count">{open.length}</span>
          </div>
          <GroupedList list={open} />
        </>
      )}
      {done.length > 0 && (
        <>
          <div className="nav-drill-title">
            Afgeronde projecten <span className="nav-count">{done.length}</span>
          </div>
          <GroupedList list={done} />
        </>
      )}
    </>
  );
}

function GroupedList({ list }: { list: Property[] }) {
  const pathname = usePathname();
  const sorted = [...list].sort((a, b) => a.city.localeCompare(b.city) || a.address.localeCompare(b.address));
  let lastCity: string | null = null;
  return (
    <div className="nav-plist">
      {sorted.map((p) => {
        const header = p.city !== lastCity ? p.city : null;
        lastCity = p.city;
        const st = getStatus(p);
        return (
          <div key={p.id}>
            {header && <div className="nav-citylabel">{header}</div>}
            <Link href={`/panden/${p.id}`} className={`nav-prow${pathname === `/panden/${p.id}` ? ' active' : ''}`}>
              <span className={`dot3 dot-${st.key}`} />
              <span>
                <div className="nt">{p.address}</div>
                <div className="nc">{p.city}</div>
              </span>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
