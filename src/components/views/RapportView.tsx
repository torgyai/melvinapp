'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { usePageHeader, useApp } from '@/components/platform/AppContext';
import { Logo } from '@/components/platform/Logo';
import { FloorPlanSvg } from '@/components/property/FloorPlanPanel';
import { MediaFacts, MediaThumbs } from '@/components/property/MediaPanel';
import { NenBegrippen, NenTable } from '@/components/property/NenTable';
import { LabelBars, StatusPill } from '@/components/ui/StatusPill';
import { floorArea, getStatus, modeOf, totalArea } from '@/lib/domain';
import { fmtNum } from '@/lib/format';
import { adviesForLabel } from '@/lib/nta8800';
import type { Property } from '@/lib/types';
import { CalcSections, printDoc } from './BerekeningView';
import { HeaderPill } from '@/components/platform/HeaderPill';

export function RapportView({ p }: { p: Property }) {
  const router = useRouter();
  const { profiles } = useApp();
  usePageHeader(p.address, `Eindrapport · ${p.city}`);

  const st = getStatus(p);
  const mode = modeOf(p);
  const showPlan = mode === 'both' || mode === 'plattegrond';
  const showLabel = (mode === 'both' || mode === 'label') && Boolean(p.label);
  const assignee = profiles.find((x) => x.id === p.assignedTo) ?? null;

  const headerPill = (
    <HeaderPill>
      <StatusPill p={p} />
    </HeaderPill>
  );

  if (st.key === 'wait' || st.key === 'progress') {
    return (
      <>
        {headerPill}
        <div className="report-toolbar no-print">
          <button className="ghost-btn" onClick={() => router.push(`/panden/${p.id}`)}>
            ← Terug naar pand
          </button>
        </div>
        <div className="report-doc">
          <div className="report-notready">
            <div className="report-notready-ic">⏳</div>
            <h3>Eindrapport nog niet beschikbaar</h3>
            <p>
              {st.key === 'progress'
                ? 'De plattegrond en/of het energielabel voor dit pand worden nog verwerkt. Zodra de verwerking is afgerond, verschijnt het eindrapport hier automatisch.'
                : 'Voor dit pand is nog geen opname ontvangen. Zodra de scan binnen is en verwerkt, verschijnt het eindrapport hier automatisch.'}
            </p>
            <button className="primary-btn" onClick={() => router.push(`/panden/${p.id}`)}>
              Terug naar pand
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {headerPill}
      <div className="report-toolbar no-print">
        <button className="ghost-btn" onClick={() => router.push(`/panden/${p.id}`)}>
          ← Terug naar pand
        </button>
        <button className="primary-btn" onClick={() => printDoc(p, 'Eindrapport')}>
          Download als PDF
        </button>
      </div>
      <div className="report-doc">
        <div className="report-head">
          <div className="report-logo">
            <Logo height={36} />
          </div>
          <div className="report-head-text">
            <div className="report-doc-title">Eindrapport</div>
            <div className="report-doc-sub">
              {p.address}, {p.city}
            </div>
          </div>
        </div>

        <div className="report-meta">
          <div>
            <span className="l">Type woning</span>
            <span className="v">
              {p.type}
              {p.year ? `, Bouwjaar ${p.year}` : ''}
            </span>
          </div>
          <div>
            <span className="l">Gebruiksoppervlak</span>
            <span className="v">{fmtNum(totalArea(p))} m²</span>
          </div>
          {p.ownerName && (
            <div>
              <span className="l">Eigenaar</span>
              <span className="v">{p.ownerName}</span>
            </div>
          )}
          <div>
            <span className="l">Opgesteld door</span>
            <span className="v">{assignee ? assignee.name : 'Krik je energielabel op'}</span>
          </div>
          <div>
            <span className="l">Ingemeten op</span>
            <span className="v">{p.meetrapport?.inmeetdatum ?? '-'}</span>
          </div>
          <div>
            <span className="l">Datum rapport</span>
            <span className="v">{p.signoff?.datum ?? p.meetrapport?.inmeetdatum ?? '-'}</span>
          </div>
        </div>

        {showPlan && (
          <>
            <div className="report-section">
              <h3>NEN 2580 meetstaat</h3>
              <p className="report-intro">
                Het gebruiksoppervlak is bepaald volgens de NEN 2580-meetnorm en per bouwlaag onderverdeeld in de
                onderstaande categorieën.
              </p>
              <NenTable p={p} />
            </div>
            <div className="report-section">
              <h3>Plattegrond &amp; oppervlaktes per ruimte</h3>
              {p.floors.map((f) => {
                const ft = floorArea(f.rooms);
                return (
                  <div className="report-floor" key={f.name}>
                    <div className="report-floor-title">
                      {f.name} · {fmtNum(ft)} m²
                    </div>
                    <FloorPlanSvg floor={f} className={f.planImage ? 'report-plan-img' : 'report-plan-svg'} />
                    <table className="room-table">
                      <thead>
                        <tr>
                          <th>Ruimte</th>
                          <th style={{ textAlign: 'right' }}>Oppervlak</th>
                        </tr>
                      </thead>
                      <tbody>
                        {f.rooms.map((r, i) => (
                          <tr key={`${r.name}-${i}`}>
                            <td>{r.name}</td>
                            <td style={{ textAlign: 'right' }}>{fmtNum(r.area)} m²</td>
                          </tr>
                        ))}
                        <tr className="total">
                          <td>Totaal {f.name.toLowerCase()}</td>
                          <td style={{ textAlign: 'right' }}>{fmtNum(ft)} m²</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
            <NenBegrippen />
          </>
        )}

        {showLabel && (
          <>
            <div className="report-section">
              <h3>Energielabel</h3>
              <LabelBars label={p.label} />
              <div className="label-fact">
                <div className="f">
                  <div className="v">{p.label}</div>
                  <div className="l">energielabel</div>
                </div>
                <div className="f">
                  <div className="v">{fmtNum(p.energyIndex)}</div>
                  <div className="l">energie-index</div>
                </div>
                <div className="f">
                  <div className="v">NTA 8800</div>
                  <div className="l">bepalingsmethode</div>
                </div>
              </div>
            </div>
            <CalcSections p={p} />
            <div className="report-section">
              <h3>Verbeteradvies</h3>
              <div className="advies-list">
                {adviesForLabel(p.label).map((a) => (
                  <div className="advies-item" key={a.tekst}>
                    <div className="advies-tekst">{a.tekst}</div>
                    <div className="advies-meta">
                      <span className="advies-badge">Investering: {a.investering}</span>
                      <span className="advies-badge">Terugverdientijd: {a.terugverdientijd}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="report-section">
          <h3>Foto&apos;s &amp; video</h3>
          <MediaFacts p={p} />
          <MediaThumbs p={p} />
          <p className="report-intro" style={{ marginTop: 10 }}>
            Automatisch afgewerkt in de huisstijl van Krik je energielabel op: lichtcorrectie, kleurcorrectie en het
            verwijderen van storende objecten. De video is los van dit rapport te bekijken in het platform.
          </p>
        </div>

        <div className="report-foot">
          {p.lifecycle === 'done' && p.signoff
            ? `Afgemeld en geregistreerd in EP-online door ${p.signoff.adviseur} · ${p.signoff.datum} · referentie ${p.signoff.epOnlineId}.`
            : 'Concept: nog niet gecontroleerd en afgemeld door een erkend EP-adviseur.'}
        </div>
      </div>
    </>
  );
}
