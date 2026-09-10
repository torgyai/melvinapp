'use client';

import { useMemo, useState } from 'react';
import {
  MAX_RANGE_M,
  MIN_DEPRESSION_DEG,
  distanceFromSighting,
  floorPointFromSighting,
  rescaleToWall,
  sightingUncertainty,
} from '@/lib/capture/sighting';
import { areaOf } from '@/lib/capture/rooms';
import { fmtNum } from '@/lib/format';
import type { Pt } from '@/lib/types';
import { RoomPreview } from './RoomPreview';
import { useCameraStream } from './useCameraStream';
import { useDeviceOrientation } from './useDeviceOrientation';

const DEFAULT_HEIGHT = 1.5;

/**
 * Scannen met de camera. Sta in de ruimte, richt het kruis op de hoek waar de
 * muur de vloer raakt en leg het punt vast. De telefoon rekent de afstand uit
 * de kijkhoek en de hoogte waarop je hem vasthoudt.
 */
export function MeasureCamera({
  onDone,
  onCancel,
  onUnsupported,
}: {
  onDone: (poly: Pt[], area: number, heading: number | null) => void;
  onCancel: () => void;
  onUnsupported: () => void;
}) {
  const [started, setStarted] = useState(false);
  const [height, setHeight] = useState(String(DEFAULT_HEIGHT).replace('.', ','));
  const [points, setPoints] = useState<(Pt & { distance: number; heading: number })[]>([]);
  const [refLength, setRefLength] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const { aim, permission, request } = useDeviceOrientation();
  const { videoRef, error: cameraError } = useCameraStream(started);

  const cameraHeight = Number(height.replace(',', '.')) || DEFAULT_HEIGHT;
  const liveDistance = aim.depression !== null ? distanceFromSighting(aim.depression, cameraHeight) : null;
  const liveError = aim.depression !== null ? sightingUncertainty(aim.depression, cameraHeight) : null;
  const tilted = aim.roll !== null && Math.abs(aim.roll) > 35;

  const rawPoly = useMemo<Pt[]>(() => points.map((p) => ({ x: p.x, y: p.y })), [points]);
  const scaled = useMemo(() => {
    const len = Number(refLength.replace(',', '.'));
    if (rawPoly.length >= 3 && len > 0) return rescaleToWall(rawPoly, 0, len);
    return rawPoly;
  }, [rawPoly, refLength]);
  const area = scaled.length >= 3 ? areaOf(scaled) : 0;

  const begin = async () => {
    const ok = await request();
    if (!ok) {
      setMessage(
        permission === 'denied'
          ? 'Bewegingssensoren zijn geweigerd. Kies een andere manier om te meten.'
          : 'Deze telefoon geeft geen richtingsgegevens. Kies een andere manier om te meten.',
      );
      onUnsupported();
      return;
    }
    setStarted(true);
  };

  const capture = () => {
    if (aim.depression === null || aim.heading === null) {
      setMessage('Nog geen richting van de telefoon. Beweeg hem even.');
      return;
    }
    const p = floorPointFromSighting({ depression: aim.depression, heading: aim.heading, cameraHeight });
    if (!p) {
      setMessage(
        aim.depression <= MIN_DEPRESSION_DEG
          ? 'Richt lager: het kruis moet op de vloer staan, waar de muur begint.'
          : `Verder dan ${MAX_RANGE_M} m kan niet worden gemeten.`,
      );
      return;
    }
    setMessage(null);
    setPoints((list) => [...list, { ...p, heading: aim.heading! }]);
  };

  if (!started) {
    return (
      <div className="cap-panel">
        <div className="cap-panel-title">Scannen met de camera</div>
        <p className="cap-help">
          Ga in de ruimte staan, richt het kruis op elke hoek waar de muur de vloer raakt en leg het punt vast. De
          telefoon rekent de afstand uit de kijkhoek en de hoogte waarop je hem vasthoudt.
        </p>
        <label className="cap-field">
          <span>Hoogte waarop je de telefoon vasthoudt (m)</span>
          <input inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} />
        </label>
        <p className="cap-help">Meestal ongeveer 1,50 m, ter hoogte van je borst. Hoe beter dit klopt, hoe beter de maten.</p>
        {message && <div className="cap-note warn">{message}</div>}
        <div className="cap-actions">
          <button className="cap-btn ghost" onClick={onCancel}>
            Terug
          </button>
          <button className="cap-btn" onClick={() => void begin()}>
            Camera starten
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cap-panel">
      <div className="cap-panel-title">Scannen met de camera</div>

      <div className="cap-stage cap-scan-stage">
        <video ref={videoRef} autoPlay playsInline muted hidden={Boolean(cameraError)} />
        {cameraError && <div className="cap-stage-fallback">{cameraError}</div>}
        <div className="cap-crosshair" aria-hidden>
          <span />
          <span />
        </div>
        <div className="cap-readout">
          {liveDistance !== null ? (
            <>
              <strong>{fmtNum(liveDistance, 2)} m</strong>
              <span>
                {aim.depression !== null ? `${fmtNum(aim.depression, 0)}° omlaag` : ''}
                {liveError !== null ? ` · ±${fmtNum(liveError, 2)} m per graad` : ''}
              </span>
            </>
          ) : (
            <span>Richt op de vloer, waar de muur begint</span>
          )}
        </div>
        {tilted && <div className="cap-tilt-warning">Houd de telefoon rechtop</div>}
      </div>

      <div className="cap-scan-row">
        <RoomPreview poly={scaled} area={area} size={190} />
        <div className="cap-scan-side">
          <div className="cap-scan-count">{points.length} hoeken</div>
          {points.length >= 3 && (
            <>
              <div className="cap-scan-area">{fmtNum(area)} m²</div>
              <label className="cap-field">
                <span>Muur 1 → 2 nameten (m, optioneel)</span>
                <input
                  inputMode="decimal"
                  value={refLength}
                  placeholder={fmtNum(Math.hypot(rawPoly[1]!.x - rawPoly[0]!.x, rawPoly[1]!.y - rawPoly[0]!.y), 2)}
                  onChange={(e) => setRefLength(e.target.value)}
                />
              </label>
              <p className="cap-help">Eén nagemeten muur zet de hele ruimte op maat.</p>
            </>
          )}
        </div>
      </div>

      {message && <div className="cap-note warn">{message}</div>}

      <div className="cap-actions">
        <button className="cap-btn ghost" onClick={() => setPoints((l) => l.slice(0, -1))} disabled={!points.length}>
          Wis punt
        </button>
        <button className="cap-btn" onClick={capture}>
          Hoek vastleggen
        </button>
      </div>
      <div className="cap-actions">
        <button className="cap-btn ghost" onClick={onCancel}>
          Terug
        </button>
        <button
          className="cap-btn"
          disabled={scaled.length < 3}
          onClick={() => onDone(scaled, area, points[0]?.heading ?? null)}
        >
          Ruimte opslaan
        </button>
      </div>
    </div>
  );
}
