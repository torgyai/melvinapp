'use client';

import { useRouter } from 'next/navigation';
import { BarChart, StackedBarChart, type BarDatum, type StackedDatum } from '@/components/charts/BarChart';
import { useApp, usePageHeader } from '@/components/platform/AppContext';
import { avatarSrc } from '@/data/profiles';
import { AVG_TARIEF, LABELS } from '@/lib/domain';
import { daysBetween, fmtEuro, fmtNum, parseNlDate } from '@/lib/format';
import type { Profile, Property } from '@/lib/types';

const MONTH_NAMES = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep'];
const ADVISOR_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];
const FASE_COLORS = ['var(--chart-1)', 'var(--chart-2)'];

function average(values: number[]): number | null {
  if (!values.length) return null;
  return Math.round((values.reduce((s, x) => s + x, 0) / values.length) * 10) / 10;
}

function isSignedOff(p: Property): boolean {
  return p.lifecycle === 'done' && !!p.signoff && !!p.meetrapport;
}

function turnaround(p: Property): number {
  return daysBetween(p.meetrapport!.inmeetdatum, p.signoff!.datum);
}

export function DashboardView() {
  const { properties, profiles, isAdmin, setCurrentProfileId } = useApp();
  const router = useRouter();
  usePageHeader('Dashboard', 'Bedrijfscijfers voor Krik je energielabel op');

  if (!isAdmin) {
    return <div className="note-box">Alleen voor beheerders.</div>;
  }

  const all = properties;
  const doneList = all.filter(isSignedOff);
  const avgDays = average(doneList.map(turnaround));

  const monthCounts = MONTH_NAMES.map(() => 0);
  all.forEach((p) => {
    if (p.meetrapport?.inmeetdatum) {
      const d = parseNlDate(p.meetrapport.inmeetdatum);
      if (d.getFullYear() === 2026 && d.getMonth() < 9) monthCounts[d.getMonth()]! += 1;
    }
  });
  const monthData: BarDatum[] = MONTH_NAMES.map((m, i) => ({ label: m, value: monthCounts[i]! }));

  const advCounts: BarDatum[] = profiles.map((prof) => ({
    label: prof.name.split(' ')[0]!,
    value: all.filter((p) => p.assignedTo === prof.id).length,
  }));

  const labelCounts = LABELS.map((l) => ({
    label: l.k,
    value: all.filter((p) => p.label === l.k).length,
    c: l.c,
  }));
  const hasLabelData = labelCounts.some((l) => l.value > 0);

  const workload: StackedDatum[] = profiles.map((prof) => {
    const mine = all.filter((p) => p.assignedTo === prof.id);
    const doneCount = mine.filter((p) => p.lifecycle === 'done').length;
    return {
      label: prof.name.split(' ')[0]!,
      segments: [
        { key: 'Afgerond', value: doneCount, color: 'var(--good)' },
        { key: 'Open', value: mine.length - doneCount, color: 'var(--amber)' },
      ],
    };
  });

  const cityCounts: Record<string, number> = {};
  all.forEach((p) => {
    cityCounts[p.city] = (cityCounts[p.city] ?? 0) + 1;
  });
  const cityData: BarDatum[] = Object.keys(cityCounts)
    .sort((a, b) => cityCounts[b]! - cityCounts[a]!)
    .map((c) => ({ label: c, value: cityCounts[c]! }));

  const withConcept = doneList.filter((p) => p.signoff!.conceptdatum);
  const avgFase1 = average(withConcept.map((p) => daysBetween(p.meetrapport!.inmeetdatum, p.signoff!.conceptdatum!))) ?? 0;
  const avgFase2 = average(withConcept.map((p) => daysBetween(p.signoff!.conceptdatum!, p.signoff!.datum))) ?? 0;
  const faseData: BarDatum[] = [
    { label: 'Berekening', value: avgFase1 },
    { label: 'Controle & afmelding', value: avgFase2 },
  ];

  const today = new Date();
  const slaRows = all
    .filter((p) => p.lifecycle !== 'done' && p.meetrapport?.inmeetdatum)
    .map((p) => ({
      p,
      days: Math.round((today.getTime() - parseNlDate(p.meetrapport!.inmeetdatum).getTime()) / 86400000),
    }))
    .filter((r) => r.days >= 14)
    .sort((a, b) => b.days - a.days)
    .slice(0, 6);

  const omzetAfgerond = doneList.length * AVG_TARIEF;
  const omzetInBehandeling = (all.length - doneList.length) * AVG_TARIEF;

  const leaderboard = profiles
    .map((prof) => {
      const mine = all.filter((p) => p.assignedTo === prof.id);
      const doneMine = mine.filter(isSignedOff);
      return { prof, total: mine.length, done: doneMine.length, avgT: average(doneMine.map(turnaround)) };
    })
    .filter((r) => r.total > 0)
    .sort((a, b) => b.done - a.done || (a.avgT ?? 999) - (b.avgT ?? 999));

  const assigneeOf = (p: Property): Profile | undefined => profiles.find((prof) => prof.id === p.assignedTo);

  return (
    <>
      <div className="tiles">
        <Tile value={all.length} label="panden totaal" />
        <Tile value={avgDays !== null ? avgDays : '–'} label="gem. doorlooptijd (dagen)" />
        <Tile value={doneList.length} label="afgerond" />
        <Tile value={all.length - doneList.length} label="open" />
        <Tile value={fmtEuro(omzetAfgerond)} label={`omzet afgerond (schatting: €${AVG_TARIEF} per pand)`} />
        <Tile value={fmtEuro(omzetInBehandeling)} label="omzet in behandeling (schatting)" />
      </div>

      {slaRows.length > 0 && (
        <div className="panel sla-panel">
          <h3>Panden die aandacht nodig hebben</h3>
          <div className="sla-list">
            {slaRows.map((r) => {
              const level = r.days >= 30 ? 'critical' : 'warning';
              const a = assigneeOf(r.p);
              return (
                <div key={r.p.id} className="sla-row" onClick={() => router.push(`/panden/${r.p.id}`)}>
                  <span className="sla-dot" style={{ background: level === 'critical' ? '#d03b3b' : '#fab219' }} />
                  <span className="sla-addr">
                    {r.p.address}, {r.p.city}
                  </span>
                  <span className="sla-assignee">{a ? a.name : 'Niet toegewezen'}</span>
                  <span className={`sla-days ${level}`}>{r.days} dagen open</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="dash-grid">
        <div className="panel">
          <h3>Panden per maand</h3>
          <BarChart data={monthData} />
        </div>
        <div className="panel">
          <h3>Verdeling per adviseur</h3>
          <BarChart data={advCounts} color={(_d, i) => ADVISOR_COLORS[i % ADVISOR_COLORS.length]!} />
          <div className="dash-legend">
            {profiles.map((prof, i) => (
              <span key={prof.id} className="dash-legend-item">
                <span
                  className="dash-legend-dot"
                  style={{ background: ADVISOR_COLORS[i % ADVISOR_COLORS.length] }}
                />
                {prof.name}
              </span>
            ))}
          </div>
        </div>
        <div className="panel">
          <h3>Energielabel-verdeling</h3>
          {hasLabelData ? (
            <BarChart data={labelCounts} color={(_d, i) => labelCounts[i]!.c} />
          ) : (
            <div className="chart-empty">Nog geen afgeronde labels.</div>
          )}
        </div>
        <div className="panel">
          <h3>Werkdruk per adviseur</h3>
          <StackedBarChart data={workload} />
          <div className="dash-legend">
            <span className="dash-legend-item">
              <span className="dash-legend-dot" style={{ background: 'var(--good)' }} />
              Afgerond
            </span>
            <span className="dash-legend-item">
              <span className="dash-legend-dot" style={{ background: 'var(--amber)' }} />
              Open
            </span>
          </div>
        </div>
        <div className="panel">
          <h3>Panden per plaats</h3>
          <BarChart data={cityData} />
        </div>
        <div className="panel">
          <h3>Doorlooptijd per fase</h3>
          {withConcept.length > 0 ? (
            <BarChart data={faseData} color={(_d, i) => FASE_COLORS[i]!} />
          ) : (
            <div className="chart-empty">Nog geen afgeronde panden met fasedata.</div>
          )}
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h3>Ranglijst adviseurs</h3>
        <div className="leader-list">
          {leaderboard.map((r, i) => (
            <div
              key={r.prof.id}
              className={`leader-row click rank-${i + 1}`}
              onClick={() => setCurrentProfileId(r.prof.id)}
            >
              <span className="leader-rank">{i + 1}</span>
              <img className="leader-avatar" src={avatarSrc(r.prof)} alt="" />
              <span className="leader-name">{r.prof.name}</span>
              <span className="leader-metric">
                <span className="v">{r.done}</span> / {r.total} afgerond
              </span>
              <span className="leader-metric">
                gem. doorlooptijd: <span className="v">{r.avgT !== null ? fmtNum(r.avgT) + 'd' : '–'}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
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
