'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { avatarSrc } from '@/data/profiles';
import { computeNotifications, notifIcon } from '@/lib/notifications';
import { useApp } from './AppContext';
import { HEADER_PILL_SLOT } from './HeaderPill';
import { Icons } from './Icons';

export function Header() {
  const { header, search, setSearch } = useApp();
  return (
    <header className="content-header">
      <div>
        <h1>{header.title}</h1>
        <div className="sub">{header.sub ?? ''}</div>
      </div>
      <div className="header-search">
        {Icons.search}
        <input
          type="text"
          value={search}
          placeholder="Zoek op adres of plaats"
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div id={HEADER_PILL_SLOT} />
      <NotificationBell />
      <ProfileSwitcher />
    </header>
  );
}

function NotificationBell() {
  const { properties, profiles } = useApp();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const items = useMemo(() => computeNotifications(properties, profiles), [properties, profiles]);

  useOutsideClose(wrap, open, () => setOpen(false));

  return (
    <div className="notif-wrap" ref={wrap}>
      <button
        className="notif-bell"
        title="Meldingen"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        {Icons.bell}
        {items.length > 0 && <span className="notif-badge">{items.length > 9 ? '9+' : items.length}</span>}
      </button>
      {open && (
        <div className="notif-menu">
          {items.length === 0 ? (
            <div className="notif-empty">Geen meldingen. Alles onder controle.</div>
          ) : (
            <>
              <div className="notif-menu-title">Meldingen</div>
              {items.map((it, i) => (
                <button
                  key={`${it.propertyId}-${i}`}
                  className="notif-item"
                  onClick={() => {
                    setOpen(false);
                    router.push(`/panden/${it.propertyId}`);
                  }}
                >
                  <span className={`notif-icon ${it.level}`}>{notifIcon(it.level)}</span>
                  <span className="notif-body">
                    <span className="notif-text">{it.text}</span>
                    <br />
                    <span className="notif-sub">{it.sub}</span>
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ProfileSwitcher() {
  const { profiles, currentProfile, setCurrentProfileId, lang } = useApp();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  useOutsideClose(wrap, open, () => setOpen(false));
  const roleOf = (p: (typeof profiles)[number]) => (lang === 'en' ? p.roleEn : p.roleNl);

  return (
    <div className="profile-switcher" ref={wrap}>
      <button
        className="header-profile"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img id="profileAvatar" src={avatarSrc(currentProfile)} alt={currentProfile.name} />
        <div className="header-profile-text">
          <div className="header-profile-name">{currentProfile.name}</div>
          <div className="header-profile-role">{roleOf(currentProfile)}</div>
        </div>
        {Icons.chevronDown}
      </button>
      {open && (
        <div className="profile-menu">
          {profiles.map((p) => (
            <button
              key={p.id}
              className="profile-menu-item"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentProfileId(p.id);
                setOpen(false);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatarSrc(p)} alt="" />
              <span className="profile-menu-item-text">
                <div className="profile-menu-item-name">{p.name}</div>
                <div className="profile-menu-item-role">{roleOf(p)}</div>
              </span>
              {p.id === currentProfile.id ? Icons.check : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function useOutsideClose(ref: React.RefObject<HTMLElement>, open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [ref, open, close]);
}
