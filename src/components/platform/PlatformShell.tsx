'use client';

import type { ReactNode } from 'react';
import type { AppData } from '@/lib/server-data';
import { AppProvider } from './AppContext';
import { Header } from './Header';
import { I18nSwitch } from './I18nSwitch';
import { Sidebar } from './Sidebar';

export function PlatformShell({ data, children }: { data: AppData; children: ReactNode }) {
  return (
    <AppProvider data={data}>
      <I18nSwitch />
      <div className="app">
        <Sidebar />
        <main className="content">
          <Header />
          <div className="content-body">{children}</div>
        </main>
      </div>
    </AppProvider>
  );
}
