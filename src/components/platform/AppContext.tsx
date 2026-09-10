'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AppData } from '@/lib/server-data';
import type { Lang } from '@/lib/i18n';
import type { Profile, Property } from '@/lib/types';

interface HeaderState {
  title: string;
  sub?: string;
}

interface AppContextValue extends AppData {
  currentProfile: Profile;
  setCurrentProfileId: (id: string) => void;
  isAdmin: boolean;
  lang: Lang;
  setLang: (l: Lang) => void;
  myProjectsOnly: boolean;
  toggleMyProjects: () => void;
  search: string;
  setSearch: (s: string) => void;
  header: HeaderState;
  setHeader: (h: HeaderState) => void;
  propertyById: (id: string) => Property | undefined;
  visibleProperties: Property[];
}

const Ctx = createContext<AppContextValue | null>(null);

export function AppProvider({ data, children }: { data: AppData; children: ReactNode }) {
  const [currentProfileId, setCurrentProfileId] = useState(data.profiles[0]?.id ?? 'melvin');
  const [lang, setLangState] = useState<Lang>('nl');
  const [myProjectsOnly, setMyProjectsOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [header, setHeader] = useState<HeaderState>({ title: 'Overzicht' });

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const currentProfile = useMemo(
    () => data.profiles.find((p) => p.id === currentProfileId) ?? data.profiles[0]!,
    [data.profiles, currentProfileId],
  );

  const propertyById = useCallback((id: string) => data.properties.find((p) => p.id === id), [data.properties]);

  const visibleProperties = useMemo(
    () => (myProjectsOnly ? data.properties.filter((p) => p.assignedTo === currentProfileId) : data.properties),
    [data.properties, myProjectsOnly, currentProfileId],
  );

  const value: AppContextValue = {
    ...data,
    currentProfile,
    setCurrentProfileId,
    isAdmin: currentProfile?.role === 'admin',
    lang,
    setLang: setLangState,
    myProjectsOnly,
    toggleMyProjects: () => setMyProjectsOnly((v) => !v),
    search,
    setSearch,
    header,
    setHeader,
    propertyById,
    visibleProperties,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp moet binnen AppProvider gebruikt worden');
  return v;
}

/** Publish the page title and subtitle into the shared header. */
export function usePageHeader(title: string, sub?: string) {
  const { setHeader } = useApp();
  useEffect(() => {
    setHeader({ title, sub });
  }, [title, sub, setHeader]);
}
