'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getStatus, labelColor } from '@/lib/domain';
import { fmtNum } from '@/lib/format';
import { useApp, usePageHeader } from '@/components/platform/AppContext';
import { AssigneeCell, SignoffModal } from '@/components/platform/Shared';
import { StatusPill } from '@/components/ui/StatusPill';
import type { Property } from '@/lib/types';

export function IndicatieveLabelsView() {
  const { properties } = useApp();
  const router = useRouter();
  const [signoffFor, setSignoffFor] = useState<Property | null>(null);
  usePageHeader('Indicatieve labels');

  const leads = properties.filter((p) => p.leadSource === 'publiek');
  const converted = leads.filter((p) => getStatus(p).key !== 'wait');
  const avgIndex = leads.length ? leads.reduce((s, p) => s + (p.leadIndicatie?.index ?? 0), 0) / leads.length : 0;
  const labelCounts: Record<string, number> = {};
  leads.forEach((p) => {
    const l = p.leadIndicatie?.label ?? '?';
    labelCounts[l] = (labelCounts[l] ?? 0) + 1;
  });
  const topLabel = Object.keys(labelCounts).sort((a, b) => labelCounts[b]! - labelCounts[a]!)[0] ?? '-';
  const sorted = [...leads].sort((a, b) => (b.leadAt ?? '').localeCompare(a.leadAt ?? ''));

  return (
    <>
      <Link className="overview-back" href="/overzicht">
        ← Terug naar overzicht
      </Link>
      <div className="tiles">
        <div className="tile"><div className="v">{leads.length}</div><div className="l">indicaties afgegeven</div></div>
        <div className="tile"><div className="v">{converted.length}</div><div className="l">opgevolgd met een scan</div></div>
        <div className="tile"><div className="v">{leads.length ? fmtNum(avgIndex, 2) : '-'}</div><div className="l">gemiddelde energie-index</div></div>
        <div className="tile"><div className="v">{topLabel}</div><div className="l">meest voorkomend label</div></div>
      </div>

      {sorted.length === 0 ? (
        <div className="note-box">Nog geen indicaties afgegeven via de website.</div>
      ) : (
        <div className="table-wrap">
          <table className="dtable">
            <thead>
              <tr>
                <th>Pand</th><th>Aangevraagd</th><th>Indicatief label</th><th>Status</th>
                <th className="th-assignee">Adviseur</th><th />
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => {
                const l = p.leadIndicatie?.label ?? '?';
                return (
                  <tr key={p.id} onClick={() => router.push(`/panden/${p.id}`)}>
                    <td>
                      <div className="dt-addr">{p.address}</div>
                      <div className="dt-city">{p.city}</div>
                    </td>
                    <td className="dt-mode">{p.leadAt ?? '-'}</td>
                    <td>
                      <span className="pub-result-badge" style={{ width: 30, height: 30, fontSize: 13, background: labelColor(l) }}>
                        {l}
                      </span>
                    </td>
                    <td><StatusPill p={p} onClick={() => setSignoffFor(p)} /></td>
                    <td><AssigneeCell p={p} /></td>
                    <td><span className="dt-open">Openen →</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <SignoffModal p={signoffFor} onClose={() => setSignoffFor(null)} />
    </>
  );
}
