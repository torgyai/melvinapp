'use client';

import { getStatus } from '@/lib/domain';
import { useApp, usePageHeader } from '@/components/platform/AppContext';
import { MyProjectsToggle, PropertyTable } from '@/components/platform/Shared';

export function ProjectenView({ done }: { done: boolean }) {
  const { visibleProperties, myProjectsOnly } = useApp();
  usePageHeader(done ? 'Afgeronde projecten' : 'Openstaande projecten', '', <MyProjectsToggle />);

  const list = visibleProperties
    .filter((p) => (getStatus(p).key === 'done') === done)
    .sort((a, b) => a.city.localeCompare(b.city) || a.address.localeCompare(b.address));

  if (list.length === 0) {
    return (
      <div className="note-box">
        {myProjectsOnly
          ? 'Geen panden toegewezen aan jou in deze lijst.'
          : done
            ? 'Nog geen afgeronde panden.'
            : 'Geen openstaande panden.'}
      </div>
    );
  }
  return <PropertyTable list={list} />;
}
