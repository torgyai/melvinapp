'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Modal, ModalSub, ModalTitle } from '@/components/ui/Modal';
import { NenTable } from '@/components/property/NenTable';
import { floorArea } from '@/lib/domain';
import { renderFloorFromRooms } from '@/lib/floorplan';
import { fmtNum } from '@/lib/format';
import type { Floor, Property } from '@/lib/types';

export function FloorPlanSvg({ floor, className }: { floor: Floor; className: string }) {
  if (floor.planImage) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={className} src={floor.planImage} alt={`Plattegrond ${floor.name}`} />;
  }
  return <div className={className} dangerouslySetInnerHTML={{ __html: renderFloorFromRooms(floor.name, floor.rooms) }} />;
}

export function RoomTable({ floor }: { floor: Floor }) {
  const total = floorArea(floor.rooms);
  return (
    <table className="room-table">
      <thead>
        <tr>
          <th>Ruimte</th>
          <th style={{ textAlign: 'right' }}>Oppervlak</th>
        </tr>
      </thead>
      <tbody>
        {floor.rooms.map((r) => (
          <tr key={r.name}>
            <td>{r.name}</td>
            <td style={{ textAlign: 'right' }}>{fmtNum(r.area)} m²</td>
          </tr>
        ))}
        <tr className="total">
          <td>Totaal {floor.name.toLowerCase()}</td>
          <td style={{ textAlign: 'right' }}>{fmtNum(total)} m²</td>
        </tr>
      </tbody>
    </table>
  );
}

export function FloorPlanPanel({ p }: { p: Property }) {
  const [floorIndex, setFloorIndex] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);
  const floor = p.floors[floorIndex] ?? p.floors[0];
  if (!floor) return null;

  return (
    <div className="panel">
      <h3>Plattegrond &amp; NEN 2580</h3>
      <div className="floor-tabs">
        {p.floors.map((f, i) => (
          <button key={f.name} className={i === floorIndex ? 'active' : undefined} onClick={() => setFloorIndex(i)}>
            {f.name}
          </button>
        ))}
      </div>
      <FloorPlanSvg floor={floor} className="plan-svg" />
      <RoomTable floor={floor} />
      <button className="linkbtn" onClick={() => setReportOpen(true)}>
        Bekijk NEN 2580-rapport
      </button>
      <NenReportModal p={p} open={reportOpen} onClose={() => setReportOpen(false)} />
    </div>
  );
}

function NenReportModal({ p, open, onClose }: { p: Property; open: boolean; onClose: () => void }) {
  const router = useRouter();
  const mr = p.meetrapport;
  const afgemeld = p.lifecycle === 'done' && p.signoff ? p.signoff : null;
  return (
    <Modal open={open} onClose={onClose}>
      <ModalTitle>NEN 2580-rapport</ModalTitle>
      <ModalSub>
        {p.address}, {p.city}
        {mr ? ` · ingemeten ${mr.inmeetdatum} door ${mr.bedrijf}` : ''}
      </ModalSub>
      {p.floors.map((f) => (
        <table className="modal-table" key={f.name}>
          <thead>
            <tr>
              <th colSpan={2}>{f.name}</th>
            </tr>
          </thead>
          <tbody>
            {f.rooms.map((r) => (
              <tr key={r.name}>
                <td>{r.name}</td>
                <td style={{ textAlign: 'right' }}>{fmtNum(r.area)} m²</td>
              </tr>
            ))}
            <tr className="total">
              <td>Totaal {f.name.toLowerCase()}</td>
              <td style={{ textAlign: 'right' }}>{fmtNum(floorArea(f.rooms))} m²</td>
            </tr>
          </tbody>
        </table>
      ))}
      <div className="modal-divider" />
      <div className="section-label">Verdeling per NEN 2580-categorie</div>
      <NenTable p={p} />
      <div className="modal-foot">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={afgemeld ? '#1e6b2e' : '#036361'} strokeWidth="2">
          <path d="M20 6L9 17l-5-5" />
        </svg>
        {afgemeld
          ? `Afgemeld door ${afgemeld.adviseur} · ${afgemeld.datum} · EP-online ${afgemeld.epOnlineId}`
          : 'Voorbereid voor Vabi-import'}
      </div>
      <button className="linkbtn" style={{ marginTop: 14 }} onClick={() => router.push(`/panden/${p.id}/rapport`)}>
        Bekijk volledig eindrapport →
      </button>
    </Modal>
  );
}
