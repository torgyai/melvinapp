'use client';

import { useMemo, useState } from 'react';
import { areaOf, closureError, polygonFromWalls, type WallInput } from '@/lib/capture/rooms';
import { fmtNum } from '@/lib/format';
import type { Pt } from '@/lib/types';
import { RoomPreview } from './RoomPreview';

/**
 * Muur voor muur. De adviseur loopt de ruimte rond met de lasermeter en typt per
 * muur de lengte en de bocht. Dit levert de exacte maten die ook in het
 * meetrapport komen, zonder schaalstap.
 */
export function MeasureWalls({ onDone, onCancel }: { onDone: (poly: Pt[], area: number) => void; onCancel: () => void }) {
  const [walls, setWalls] = useState<WallInput[]>([]);
  const [length, setLength] = useState('');
  const [turn, setTurn] = useState<number>(90);

  const poly = useMemo(() => (walls.length >= 3 ? polygonFromWalls(walls) : polygonFromWalls(walls)), [walls]);
  const area = useMemo(() => (poly.length >= 3 ? areaOf(poly) : 0), [poly]);
  const closure = useMemo(() => (walls.length >= 3 ? closureError(walls) : null), [walls]);

  const addWall = () => {
    const l = Number(length.replace(',', '.'));
    if (!l || l <= 0) return;
    setWalls((w) => [...w, { length: l, turn }]);
    setLength('');
    setTurn(90);
  };

  return (
    <div className="cap-panel">
      <div className="cap-panel-title">Muur voor muur</div>
      <p className="cap-help">
        Loop de ruimte met de klok mee rond. Typ per muur de gemeten lengte en welke bocht je daarna maakt.
      </p>

      <RoomPreview poly={poly} area={area} />

      {closure !== null && (
        <div className={`cap-note${closure > 0.15 ? ' warn' : ''}`}>
          {closure > 0.15
            ? `De rondgang sluit ${fmtNum(closure, 2)} m mis. Controleer een lengte of een bocht.`
            : `De rondgang sluit netjes (${fmtNum(closure, 2)} m afwijking).`}
        </div>
      )}

      <ul className="cap-wall-list">
        {walls.map((w, i) => (
          <li key={i}>
            <span className="cap-wall-index">{i + 1}</span>
            <span>{fmtNum(w.length, 2)} m</span>
            <span className="cap-wall-turn">{w.turn > 0 ? `${w.turn}° links` : `${Math.abs(w.turn)}° rechts`}</span>
            <button className="cap-linkbtn" onClick={() => setWalls((list) => list.filter((_, idx) => idx !== i))}>
              wis
            </button>
          </li>
        ))}
      </ul>

      <div className="cap-field-row">
        <label className="cap-field">
          <span>Lengte (m)</span>
          <input
            inputMode="decimal"
            value={length}
            placeholder="4,82"
            onChange={(e) => setLength(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addWall();
            }}
          />
        </label>
        <label className="cap-field">
          <span>Bocht daarna</span>
          <select value={turn} onChange={(e) => setTurn(Number(e.target.value))}>
            <option value={90}>90° links</option>
            <option value={-90}>90° rechts</option>
            <option value={45}>45° links</option>
            <option value={-45}>45° rechts</option>
            <option value={135}>135° links</option>
            <option value={-135}>135° rechts</option>
            <option value={0}>rechtdoor</option>
          </select>
        </label>
      </div>

      <div className="cap-actions">
        <button className="cap-btn ghost" onClick={onCancel}>
          Terug
        </button>
        <button className="cap-btn ghost" onClick={addWall}>
          Muur toevoegen
        </button>
        <button className="cap-btn" disabled={walls.length < 3} onClick={() => onDone(poly, area)}>
          Ruimte opslaan
        </button>
      </div>
    </div>
  );
}
