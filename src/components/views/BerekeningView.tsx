'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { usePageHeader } from '@/components/platform/AppContext';
import { Logo } from '@/components/platform/Logo';
import { LabelBars, StatusPill } from '@/components/ui/StatusPill';
import { totalArea } from '@/lib/domain';
import { fmtEuro, fmtNum } from '@/lib/format';
import { glasPerOrientatie } from '@/lib/opname/derive';
import { orientatieLabel } from '@/lib/opname/footprint';
import {
  computeSim,
  energiebehoefteFor,
  envelopeFor,
  installatiesFor,
  SIM_MEASURES,
  type SimState,
} from '@/lib/nta8800';
import type { Property } from '@/lib/types';
import { HeaderPill } from '@/components/platform/HeaderPill';

export function printDoc(p: Property, kind: string) {
  const prevTitle = document.title;
  document.title = `${kind} - ${p.address} ${p.city} - Krik je energielabel op`;
  window.print();
  setTimeout(() => {
    document.title = prevTitle;
  }, 400);
}

export function LabelStatusBox({ p, style }: { p: Property; style?: React.CSSProperties }) {
  const so = p.lifecycle === 'done' ? p.signoff : null;
  if (so) {
    return (
      <div className="status-box done" style={style}>
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M20 6L9 17l-5-5" stroke="#1e6b2e" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div>
          Afgemeld en geregistreerd in EP-online door {so.adviseur} · {so.datum} · referentie {so.epOnlineId}.
        </div>
      </div>
    );
  }
  return (
    <div className="status-box" style={style}>
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="#8a5a00" strokeWidth="2" fill="none" />
        <path d="M12 8v5M12 16h.01" stroke="#8a5a00" strokeWidth="2" />
      </svg>
      <div>
        Voorbereid door het platform. Nog niet geregistreerd in EP-online: dat doet jullie gecertificeerde adviseur, na
        controle en ondertekening.
      </div>
    </div>
  );
}

/** Bouwschil, installaties en energiebehoefte: ook gebruikt in het eindrapport. */
export function CalcSections({ p }: { p: Property }) {
  const env = envelopeFor(p);
  const glas = glasPerOrientatie(p.opname);
  const inst = installatiesFor(p);
  const eb = energiebehoefteFor(p, inst);
  const maxRow = Math.max(1, ...eb.rows.map((r) => r.waarde), Math.abs(eb.opwek));
  const pct = (v: number) => `${Math.min(100, (v / maxRow) * 100).toFixed(0)}%`;

  return (
    <>
      <div className="report-section">
        <h3>Bouwschil</h3>
        <table className="room-table">
          <thead>
            <tr>
              <th>Bouwdeel</th>
              <th style={{ textAlign: 'right' }}>Oppervlak</th>
              <th style={{ textAlign: 'right' }}>Rc- / U-waarde</th>
              <th>Typering</th>
            </tr>
          </thead>
          <tbody>
            {env.elements.map((e, i) => (
              <tr key={`${e.naam}-${i}`}>
                <td>{e.naam}</td>
                <td style={{ textAlign: 'right' }}>{fmtNum(e.opp)} m²</td>
                <td style={{ textAlign: 'right' }}>
                  {e.eenheid} {fmtNum(e.waarde)}
                </td>
                <td>{e.bron}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {glas.length > 0 && (
        <div className="report-section">
          <h3>Beglazing per oriëntatie</h3>
          <table className="room-table">
            <thead>
              <tr>
                <th>Oriëntatie</th>
                <th style={{ textAlign: 'right' }}>Raamoppervlak</th>
              </tr>
            </thead>
            <tbody>
              {glas.map((g) => (
                <tr key={g.orientatie}>
                  <td>{orientatieLabel(g.orientatie)}</td>
                  <td style={{ textAlign: 'right' }}>{fmtNum(g.opp)} m²</td>
                </tr>
              ))}
              <tr className="total">
                <td>Totaal</td>
                <td style={{ textAlign: 'right' }}>
                  {fmtNum(glas.reduce((s, g) => s + g.opp, 0))} m²
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="report-section">
        <h3>Installaties</h3>
        <table className="room-table">
          <tbody>
            <tr>
              <td>Verwarming</td>
              <td style={{ textAlign: 'right' }}>{inst.verwarming}</td>
            </tr>
            <tr>
              <td>Warm tapwater</td>
              <td style={{ textAlign: 'right' }}>{inst.tapwater}</td>
            </tr>
            <tr>
              <td>Ventilatie</td>
              <td style={{ textAlign: 'right' }}>{inst.ventilatie}</td>
            </tr>
            <tr className="total">
              <td>Zonnepanelen</td>
              <td style={{ textAlign: 'right' }}>
                {inst.zon ? `${inst.panelen} panelen (${fmtNum(inst.panelen * 0.44, 1)} kWp)` : 'Niet aanwezig'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="report-section">
        <h3>Energiebehoefte</h3>
        <div className="calc-bars">
          {eb.rows.map((r) => (
            <div className="calc-bar-row" key={r.naam}>
              <div className="calc-bar-label">{r.naam}</div>
              <div className="calc-bar-track">
                <div className="calc-bar-fill" style={{ width: pct(r.waarde) }} />
              </div>
              <div className="calc-bar-value">{fmtNum(r.waarde)} kWh/m²/jr</div>
            </div>
          ))}
          {inst.zon && (
            <div className="calc-bar-row">
              <div className="calc-bar-label">Opwekking (zon)</div>
              <div className="calc-bar-track">
                <div className="calc-bar-fill neg" style={{ width: pct(Math.abs(eb.opwek)) }} />
              </div>
              <div className="calc-bar-value">{fmtNum(eb.opwek)} kWh/m²/jr</div>
            </div>
          )}
          <div className="calc-bar-row total">
            <div className="calc-bar-label">Netto energiebehoefte</div>
            <div className="calc-bar-track" />
            <div className="calc-bar-value">{fmtNum(eb.netto)} kWh/m²/jr</div>
          </div>
        </div>
      </div>
    </>
  );
}

export function BerekeningView({ p }: { p: Property }) {
  const router = useRouter();
  usePageHeader(p.address, `NTA 8800-berekening · ${p.city}`);

  const [sim, setSim] = useState<SimState>({ isolatie: false, ketel: false, zon: false });
  const result = computeSim(p, sim);
  const baseLabel = p.label ?? result.label;
  const improved = result.active && result.label !== baseLabel;

  return (
    <>
      <HeaderPill>
        <StatusPill p={p} />
      </HeaderPill>
      <div className="report-toolbar no-print">
        <button className="ghost-btn" onClick={() => router.push(`/panden/${p.id}`)}>
          ← Terug naar pand
        </button>
        <button className="primary-btn" onClick={() => printDoc(p, 'NTA 8800-berekening')}>
          Download als PDF
        </button>
      </div>
      <div className="report-doc">
        <div className="report-head">
          <div className="report-logo">
            <Logo height={36} />
          </div>
          <div className="report-head-text">
            <div className="report-doc-title">NTA 8800-berekening</div>
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
              {p.year ? `, bouwjaar ${p.year}` : ''}
            </span>
          </div>
          <div>
            <span className="l">Gebruiksoppervlak</span>
            <span className="v">{fmtNum(totalArea(p))} m²</span>
          </div>
          <div>
            <span className="l">Bepalingsmethode</span>
            <span className="v">NTA 8800</span>
          </div>
          <div>
            <span className="l">Berekend op</span>
            <span className="v">{p.meetrapport?.inmeetdatum ?? '-'}</span>
          </div>
        </div>

        <CalcSections p={p} />

        <div className="report-section">
          <h3>Van energiebehoefte naar label</h3>
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
          <LabelStatusBox p={p} style={{ marginTop: 14 }} />
        </div>

        <div className="report-section no-print">
          <h3>Wat-als simulator</h3>
          <div className="sim-measures">
            {SIM_MEASURES.map((m) => (
              <label className="sim-measure" key={m.key}>
                <input
                  type="checkbox"
                  checked={sim[m.key]}
                  onChange={() => setSim((s) => ({ ...s, [m.key]: !s[m.key] }))}
                />
                <span className="sim-measure-text">{m.label}</span>
                <span className="sim-measure-cost">{fmtEuro(m.investering)}</span>
              </label>
            ))}
          </div>
          <div className="sim-result">
            <LabelBars label={result.label} />
            <div className="label-fact">
              <div className="f">
                <div className="v">
                  {result.label}
                  {improved ? ' ↑' : ''}
                </div>
                <div className="l">nieuw label</div>
              </div>
              <div className="f">
                <div className="v">{fmtNum(result.idx, 2)}</div>
                <div className="l">nieuwe energie-index</div>
              </div>
              <div className="f">
                <div className="v">{result.active ? fmtEuro(result.investering) : '-'}</div>
                <div className="l">Investering</div>
              </div>
              <div className="f">
                <div className="v">{result.terugverdientijd ? `${Math.round(result.terugverdientijd)} jaar` : '-'}</div>
                <div className="l">Terugverdientijd</div>
              </div>
            </div>
          </div>
        </div>

        <div className="report-foot">
          Berekening opgesteld conform NTA 8800 op basis van de ingemeten oppervlaktes, bouwschil en installaties.
          {p.lifecycle === 'done' && p.signoff
            ? ` Afgemeld en geregistreerd in EP-online door ${p.signoff.adviseur} · ${p.signoff.datum}.`
            : ' Concept: nog niet gecontroleerd en afgemeld door een erkend EP-adviseur.'}
        </div>
      </div>
    </>
  );
}
