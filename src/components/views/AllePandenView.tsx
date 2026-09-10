'use client';

import Link from 'next/link';
import { useApp, usePageHeader } from '@/components/platform/AppContext';
import { MyProjectsToggle, PropertyTable } from '@/components/platform/Shared';

export function AllePandenView() {
  const { visibleProperties } = useApp();
  usePageHeader('Alle panden', '', <MyProjectsToggle />);
  const sorted = [...visibleProperties].sort((a, b) => a.city.localeCompare(b.city));

  return (
    <>
      <Link className="overview-back" href="/overzicht">
        ← Terug naar overzicht
      </Link>
      {sorted.length === 0 ? <div className="note-box">Geen panden toegewezen aan jou.</div> : <PropertyTable list={sorted} />}
    </>
  );
}
