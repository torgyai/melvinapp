'use client';

import { fmtNum } from '@/lib/format';
import { NEN_BEGRIPPEN, nenBreakdown, type NenRow } from '@/lib/nen2580';
import type { Property } from '@/lib/types';

function NenRowCells({ label, r, total }: { label: string; r: NenRow; total?: boolean }) {
  return (
    <tr className={total ? 'total' : undefined}>
      <td>{label}</td>
      <td style={{ textAlign: 'right' }}>{fmtNum(r.or, 2)}</td>
      <td style={{ textAlign: 'right' }}>{fmtNum(r.vide, 2)}</td>
      <td style={{ textAlign: 'right' }}>{fmtNum(r.gow, 2)}</td>
      <td style={{ textAlign: 'right' }}>{fmtNum(r.gooir, 2)}</td>
      <td style={{ textAlign: 'right' }}>{fmtNum(r.gogbr, 2)}</td>
      <td style={{ textAlign: 'right' }}>{fmtNum(r.goeb, 2)}</td>
      <td style={{ textAlign: 'right' }}>{r.bi}</td>
      <td style={{ textAlign: 'right' }}>{r.biExt}</td>
    </tr>
  );
}

export function NenTable({ p }: { p: Property }) {
  const nb = nenBreakdown(p);
  return (
    <>
      <div className="nen-table-wrap">
        <table className="nen-table">
          <thead>
            <tr>
              <th />
              <th>OR</th>
              <th>VIDE</th>
              <th>GOW</th>
              <th>GOOIR</th>
              <th>GOGBR</th>
              <th>GOEB</th>
              <th>BI woning</th>
              <th>BI extern</th>
            </tr>
          </thead>
          <tbody>
            {nb.floors.map((f) => (
              <NenRowCells key={f.name} label={f.name} r={f} />
            ))}
            <NenRowCells label="Totalen" r={nb.totals} total />
          </tbody>
        </table>
      </div>
      <div className="nen-legend-hint">
        OR = ontoegankelijke ruimte · VIDE = trapgat &gt; 4 m² · GOW = gebruiksoppervlak wonen · GOOIR = overige inpandige
        ruimte · GOGBR = gebouwgebonden buitenruimte · GOEB = externe bergruimte · BI = bruto inhoud (m³)
        {nb.official ? '' : '. Indicatieve verdeling, gebaseerd op ruimtenamen (geen officieel meetrapport)'}
      </div>
    </>
  );
}

export function NenBegrippen() {
  return (
    <div className="report-section">
      <h3>Gehanteerde begrippen (NEN 2580)</h3>
      <div className="nen-begrippen">
        {NEN_BEGRIPPEN.map((b) => (
          <div key={b.code}>
            <b>{b.code}</b>: {b.text}
          </div>
        ))}
      </div>
    </div>
  );
}
