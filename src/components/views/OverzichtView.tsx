'use client';

import Link from 'next/link';
import { getStatus } from '@/lib/domain';
import { useApp, usePageHeader } from '@/components/platform/AppContext';
import { Icons } from '@/components/platform/Icons';
import { MyProjectsToggle } from '@/components/platform/Shared';
import { TasksWidget } from '@/components/platform/TasksWidget';
import { UrgentEmailWidget } from '@/components/platform/UrgentEmailWidget';
import { HeaderPill } from '@/components/platform/HeaderPill';

export function OverzichtView() {
  const { properties, visibleProperties } = useApp();
  usePageHeader('Overzicht');

  const counts = { ready: 0, progress: 0, done: 0, wait: 0 };
  visibleProperties.forEach((p) => {
    counts[getStatus(p).key] += 1;
  });
  const leads = properties.filter((p) => p.leadSource === 'publiek');
  const doneTotal = properties.filter((p) => getStatus(p).key === 'done').length;

  return (
    <>
      <HeaderPill>
        <MyProjectsToggle />
      </HeaderPill>
      <div className="tiles">
        <Tile value={visibleProperties.length} label="panden" />
        <Tile value={counts.ready} label="klaar voor controle" />
        <Tile value={counts.progress} label="in verwerking" />
        <Tile value={counts.done} label="afgemeld" />
      </div>

      <div className="overview-grid">
        <Link className="overview-card" href="/panden">
          <div className="overview-card-icon">{Icons.grid}</div>
          <div className="overview-card-body">
            <div className="overview-card-title">Alle panden</div>
            <div className="overview-card-sub">
              {properties.length} panden in het systeem, {doneTotal} afgemeld
            </div>
          </div>
          <div className="overview-card-chevron">→</div>
        </Link>

        <Link className="overview-card" href="/labels">
          <div className="overview-card-icon">{Icons.clock}</div>
          <div className="overview-card-body">
            <div className="overview-card-title">Indicatieve labels</div>
            <div className="overview-card-sub">{leads.length} afgegeven via de publieke website</div>
          </div>
          <div className="overview-card-chevron">→</div>
        </Link>

        <UrgentEmailWidget />
        <TasksWidget />
      </div>

      {visibleProperties.length === 0 && <div className="note-box">Geen panden toegewezen aan jou.</div>}
    </>
  );
}

function Tile({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="tile">
      <div className="v">{value}</div>
      <div className="l">{label}</div>
    </div>
  );
}
