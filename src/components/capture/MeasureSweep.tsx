'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { areaOf } from '@/lib/capture/rooms';
import { intrinsicsFor } from '@/lib/capture/intrinsics';
import { rescaleToWall } from '@/lib/capture/sighting';
import { RoomScan, attachOpeningsToWalls, type WallOpening } from '@/lib/capture/roomscan';
import { readColumns, toLuma } from '@/lib/capture/walledge';
import { regularize } from '@/lib/floorplan/geometry';
import { fmtNum, round2 } from '@/lib/format';
import type { Opening, Pt } from '@/lib/types';
import { useCameraStream } from './useCameraStream';
import { useDeviceOrientation } from './useDeviceOrientation';

const DEFAULT_HEIGHT = 1.5;
const FRAME_INTERVAL_MS = 90;
const WORK_WIDTH = 240;

type Phase = 'setup' | 'sweeping' | 'done';

/**
 * Rondscannen. De opnemer draait langzaam om zijn as; elk beeld levert een hele
 * strook vloerpunten, dus de ruimte tekent zichzelf terwijl je draait.
 */
export function MeasureSweep({
  onDone,
  onCancel,
  onUnsupported,
}: {
  onDone: (result: {
    poly: Pt[];
    area: number;
    heading: number | null;
    height: number | null;
    openings: Opening[];
  }) => void;
  onCancel: () => void;
  onUnsupported: (reason: string) => void;
}) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [height, setHeight] = useState(String(DEFAULT_HEIGHT).replace('.', ','));
  const [coverage, setCoverage] = useState(0);
  const [outline, setOutline] = useState<Pt[]>([]);
  const [edgeCount, setEdgeCount] = useState(0);
  const [roomHeight, setRoomHeight] = useState<number | null>(null);
  const [heightRange, setHeightRange] = useState<[number, number] | null>(null);
  const [openings, setOpenings] = useState<WallOpening[]>([]);
  const [refLength, setRefLength] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const [noSensor, setNoSensor] = useState(false);

  const { aim, permission, request } = useDeviceOrientation();
  const { videoRef, error: cameraError } = useCameraStream(phase === 'sweeping');

  const accRef = useRef(new RoomScan());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrame = useRef(0);
  const sawReading = useRef(false);
  const startHeading = useRef<number | null>(null);

  const cameraHeight = Number(height.replace(',', '.')) || DEFAULT_HEIGHT;

  if (aim.depression !== null) sawReading.current = true;

  const tick = useCallback(
    (now: number) => {
      rafRef.current = requestAnimationFrame(tick);
      if (now - lastFrame.current < FRAME_INTERVAL_MS) return;
      lastFrame.current = now;

      const video = videoRef.current;
      if (!video || video.readyState < 2 || !video.videoWidth) return;
      if (aim.depression === null || aim.heading === null) return;
      if (aim.depression <= 5) {
        setHint('Houd de telefoon iets lager, zodat de vloer voor de muur in beeld staat.');
        return;
      }

      if (startHeading.current === null) startHeading.current = aim.heading;

      const canvas = (canvasRef.current ??= document.createElement('canvas'));
      const scale = WORK_WIDTH / video.videoWidth;
      const w = WORK_WIDTH;
      const h = Math.max(2, Math.round(video.videoHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, w, h);

      const k = intrinsicsFor(w, h);
      const luma = toLuma(ctx.getImageData(0, 0, w, h));
      const reads = readColumns(luma, k, aim.depression);
      const added = accRef.current.addFrame(reads, k, aim.depression, aim.heading, cameraHeight);

      setEdgeCount(reads.length);
      setHint(reads.length < 6 ? 'Weinig vloerlijn in beeld. Richt op de plek waar de muur de vloer raakt.' : null);

      if (added > 0) {
        const acc = accRef.current;
        const res = acc.result();
        setCoverage(res.coverage);
        setOutline(res.outline);
        setRoomHeight(res.height);
        setHeightRange(res.heightRange);
        setOpenings(res.openings);
        if (acc.complete()) {
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
          setPhase('done');
        }
      }
    },
    [aim.depression, aim.heading, cameraHeight, videoRef],
  );

  useEffect(() => {
    if (phase !== 'sweeping') return;
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [phase, tick]);

  useEffect(() => {
    if (phase !== 'sweeping') return;
    const id = setTimeout(() => setNoSensor(!sawReading.current), 2500);
    return () => clearTimeout(id);
  }, [phase]);

  const cleaned = useMemo(() => (outline.length >= 8 ? regularize(outline) : outline), [outline]);
  const scale = useMemo(() => {
    const len = Number(refLength.replace(',', '.'));
    if (cleaned.length < 3 || !(len > 0)) return 1;
    const a = cleaned[0]!;
    const b = cleaned[1]!;
    const current = Math.hypot(b.x - a.x, b.y - a.y);
    return current > 0 ? len / current : 1;
  }, [cleaned, refLength]);
  const scaled = useMemo(() => {
    const len = Number(refLength.replace(',', '.'));
    if (cleaned.length >= 3 && len > 0) return rescaleToWall(cleaned, 0, len);
    return cleaned;
  }, [cleaned, refLength]);
  const area = scaled.length >= 3 ? areaOf(scaled) : 0;
  const wallOpenings = useMemo(
    () =>
      attachOpeningsToWalls(
        scaled,
        openings.map((o) => ({ ...o, width: round2(o.width * scale), area: round2(o.area * scale) })),
      ),
    [scaled, openings, scale],
  );
  const scaledHeight = roomHeight !== null ? round2(roomHeight * scale) : null;

  const begin = async () => {
    const ok = await request();
    if (!ok) {
      onUnsupported(
        permission === 'denied'
          ? 'Bewegingssensoren zijn geweigerd, dus rondscannen kan niet. Sta ze toe in de browserinstellingen, of kies een andere manier.'
          : 'Dit apparaat geeft geen richtingsgegevens door. Open de opname op een telefoon, of kies een andere manier om te meten.',
      );
      return;
    }
    accRef.current.reset();
    startHeading.current = null;
    setCoverage(0);
    setOutline([]);
    setOpenings([]);
    setRoomHeight(null);
    setPhase('sweeping');
  };

  const restart = () => {
    accRef.current.reset();
    startHeading.current = null;
    setCoverage(0);
    setOutline([]);
    setOpenings([]);
    setRoomHeight(null);
    setRefLength('');
    setPhase('sweeping');
  };

  if (phase === 'setup') {
    return (
      <div className="cap-panel">
        <div className="cap-panel-title">Ruimte rondscannen</div>
        <p className="cap-help">
          Ga midden in de ruimte staan, houd de telefoon rechtop en iets omlaag gericht, en draai één keer langzaam om
          je as. De plattegrond tekent zichzelf terwijl je draait.
        </p>
        <label className="cap-field">
          <span>Hoogte waarop je de telefoon vasthoudt (m)</span>
          <input inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} />
        </label>
        <div className="cap-actions">
          <button className="cap-btn ghost" onClick={onCancel}>
            Terug
          </button>
          <button className="cap-btn" onClick={() => void begin()}>
            Scannen starten
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cap-panel">
      <div className="cap-panel-title">{phase === 'done' ? 'Ruimte gescand' : 'Rondscannen'}</div>

      {noSensor && (
        <div className="cap-note warn">
          Dit apparaat geeft geen richtingsgegevens door, dus rondscannen werkt hier niet. Open de opname op een
          telefoon, of kies een andere manier.
        </div>
      )}
      {cameraError && <div className="cap-note warn">{cameraError}</div>}

      {phase === 'sweeping' && (
        <div className="cap-stage cap-scan-stage">
          <video ref={videoRef} autoPlay playsInline muted />
          <SweepRadar outline={outline} coverage={coverage} heading={aim.heading} />
          <div className="cap-readout">
            <strong>{Math.round(coverage * 100)}%</strong>
            <span>{hint ?? 'Draai langzaam rond, de hele ruimte langs'}</span>
          </div>
        </div>
      )}

      {phase === 'done' && (
        <>
          <PlanPreview poly={scaled} area={area} />
          <div className="cap-scan-facts">
            <div>
              <span>{scaledHeight !== null ? `${fmtNum(scaledHeight, 2)} m` : '–'}</span>
              <small>vrije hoogte</small>
            </div>
            <div>
              <span>{scaledHeight !== null ? `${fmtNum(round2(area * scaledHeight), 1)} m³` : '–'}</span>
              <small>inhoud</small>
            </div>
            <div>
              <span>{wallOpenings.length}</span>
              <small>openingen</small>
            </div>
            <div>
              <span>{fmtNum(round2(wallOpenings.filter((o) => o.kind === 'raam').reduce((t, o) => t + o.area, 0)), 1)} m²</span>
              <small>glas</small>
            </div>
          </div>
          {heightRange && heightRange[1] - heightRange[0] > 0.25 && (
            <div className="cap-note">
              De hoogte loopt van {fmtNum(heightRange[0], 2)} tot {fmtNum(heightRange[1], 2)} m. Schuin dak, dus een
              deel telt als ontoegankelijke ruimte onder 1,50 m.
            </div>
          )}
          {wallOpenings.length > 0 && (
            <ul className="cap-opening-list">
              {wallOpenings.map((o, i) => (
                <li key={i}>
                  <span className={`cap-opening-kind ${o.kind}`}>{o.kind}</span>
                  {fmtNum(o.width, 2)} × {fmtNum(round2(o.head - o.sill), 2)} m, dorpel op {fmtNum(o.sill, 2)} m,{' '}
                  {compass(o.heading)}
                </li>
              ))}
            </ul>
          )}
          <label className="cap-field">
            <span>Eén muur nameten (m, optioneel)</span>
            <input inputMode="decimal" value={refLength} placeholder="4,82" onChange={(e) => setRefLength(e.target.value)} />
          </label>
          <p className="cap-help">
            De hoeken komen van de sensoren en kloppen goed. Eén nagemeten muur zet de schaal van de hele ruimte vast.
          </p>
        </>
      )}

      {phase === 'sweeping' ? (
        <div className="cap-actions">
          <button className="cap-btn ghost" onClick={onCancel}>
            Terug
          </button>
          <button className="cap-btn" disabled={coverage < 0.35} onClick={() => setPhase('done')}>
            Klaar met draaien
          </button>
        </div>
      ) : (
        <div className="cap-actions">
          <button className="cap-btn ghost" onClick={restart}>
            Opnieuw scannen
          </button>
          <button
            className="cap-btn"
            disabled={scaled.length < 3}
            onClick={() =>
              onDone({
                poly: scaled,
                area,
                heading: startHeading.current,
                height: scaledHeight,
                openings: wallOpenings.map((o) => ({
                  wall: o.wall,
                  offset: o.offset,
                  width: o.width,
                  kind: o.kind,
                })),
              })
            }
          >
            Ruimte opslaan
          </button>
        </div>
      )}

      {phase === 'sweeping' && edgeCount > 0 && (
        <div className="cap-scan-count">{edgeCount} vloerpunten in beeld</div>
      )}
    </div>
  );
}

/** Top-down view that fills in as the surveyor turns. */
function SweepRadar({ outline, coverage, heading }: { outline: Pt[]; coverage: number; heading: number | null }) {
  const size = 150;
  const max = Math.max(1, ...outline.map((p) => Math.hypot(p.x, p.y)));
  const s = (size / 2 - 10) / max;
  const d = outline.map((p, i) => `${i === 0 ? 'M' : 'L'} ${(size / 2 + p.x * s).toFixed(1)} ${(size / 2 - p.y * s).toFixed(1)}`).join(' ');
  const sweepAngle = heading ?? 0;
  return (
    <svg className="cap-radar" viewBox={`0 0 ${size} ${size}`} aria-label="Gescande ruimte">
      <circle cx={size / 2} cy={size / 2} r={size / 2 - 4} fill="rgba(11,22,21,.72)" stroke="#1c3634" />
      {outline.length > 2 && <path d={`${d} Z`} fill="rgba(248,172,1,.22)" stroke="#f8ac01" strokeWidth="1.8" />}
      <line
        x1={size / 2}
        y1={size / 2}
        x2={size / 2 + Math.sin((sweepAngle * Math.PI) / 180) * (size / 2 - 8)}
        y2={size / 2 - Math.cos((sweepAngle * Math.PI) / 180) * (size / 2 - 8)}
        stroke="#eef4f2"
        strokeWidth="1.4"
      />
      <circle cx={size / 2} cy={size / 2} r="3.5" fill="#eef4f2" />
      <text x={size / 2} y={size - 8} fontSize="10" fill="#9db3b0" textAnchor="middle">
        {Math.round(coverage * 100)}% rond
      </text>
    </svg>
  );
}

function compass(heading: number): string {
  const names = ['noord', 'noordoost', 'oost', 'zuidoost', 'zuid', 'zuidwest', 'west', 'noordwest'];
  return names[Math.round(heading / 45) % 8]!;
}

function PlanPreview({ poly, area }: { poly: Pt[]; area: number }) {
  const size = 240;
  if (poly.length < 3) return <div className="cap-note">Nog te weinig van de ruimte gezien.</div>;
  const xs = poly.map((p) => p.x);
  const ys = poly.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const w = Math.max(...xs) - minX || 1;
  const h = Math.max(...ys) - minY || 1;
  const s = (size - 40) / Math.max(w, h);
  const pts = poly.map((p) => `${(20 + (p.x - minX) * s).toFixed(1)},${(size - 20 - (p.y - minY) * s).toFixed(1)}`);
  return (
    <svg className="cap-preview" viewBox={`0 0 ${size} ${size}`} aria-label="Gescande plattegrond">
      <polygon points={pts.join(' ')} fill="rgba(248,172,1,.18)" stroke="#f8ac01" strokeWidth="2.5" strokeLinejoin="round" />
      <text x={size / 2} y={size - 6} fontSize="14" fontWeight="700" fill="#eef4f2" textAnchor="middle">
        {fmtNum(area)} m² · {poly.length} muren
      </text>
    </svg>
  );
}
