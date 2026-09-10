'use client';

import { useEffect, useRef, useState } from 'react';
import { areaOf, polygonFromArPoints } from '@/lib/capture/rooms';
import { startArTracking, type ArPoint, type ArTracker } from '@/lib/capture/webxr';
import { fmtNum } from '@/lib/format';
import type { Pt } from '@/lib/types';

/**
 * AR-opname: richt op de vloer, tik de hoeken aan. De telefoon levert de
 * posities al in meters, dus er is geen referentiemaat nodig.
 */
export function MeasureAr({ onDone, onCancel }: { onDone: (poly: Pt[], area: number) => void; onCancel: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const trackerRef = useRef<ArTracker | null>(null);
  const [points, setPoints] = useState<ArPoint[]>([]);
  const [reticle, setReticle] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    let stopped = false;
    const start = async () => {
      if (!overlayRef.current) return;
      try {
        const tracker = await startArTracking(overlayRef.current, {
          onPoints: (p) => setPoints([...p]),
          onReticle: setReticle,
          onEnd: () => setEnded(true),
          onError: (m) => setError(m),
        });
        if (stopped) {
          tracker.stop();
          return;
        }
        trackerRef.current = tracker;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'AR kon niet starten.');
      }
    };
    void start();
    return () => {
      stopped = true;
      trackerRef.current?.stop();
      trackerRef.current = null;
    };
  }, []);

  const poly = polygonFromArPoints(points);
  const area = poly.length >= 3 ? areaOf(poly) : 0;

  const finish = () => {
    trackerRef.current?.stop();
    onDone(poly, area);
  };

  return (
    <div className="cap-panel">
      <div className="cap-panel-title">AR-opname</div>
      {error ? (
        <>
          <div className="cap-note warn">{error}</div>
          <div className="cap-actions">
            <button className="cap-btn ghost" onClick={onCancel}>
              Kies een andere manier
            </button>
          </div>
        </>
      ) : (
        <p className="cap-help">
          {reticle
            ? 'Tik op het scherm om een hoek vast te leggen.'
            : 'Beweeg de telefoon langzaam zodat de vloer wordt herkend.'}
        </p>
      )}

      <div className="cap-ar-overlay" ref={overlayRef}>
        <div className="cap-ar-hud">
          <span className="cap-ar-count">{points.length} hoeken</span>
          {area > 0 && <span className="cap-ar-area">{fmtNum(area)} m²</span>}
          <div className="cap-ar-buttons">
            <button className="cap-btn ghost" onClick={() => trackerRef.current?.undo()} disabled={!points.length}>
              Wis punt
            </button>
            <button className="cap-btn" disabled={points.length < 3} onClick={finish}>
              Klaar
            </button>
          </div>
        </div>
      </div>

      {ended && points.length >= 3 && (
        <div className="cap-actions">
          <button className="cap-btn" onClick={finish}>
            Ruimte opslaan · {fmtNum(area)} m²
          </button>
        </div>
      )}
      {ended && points.length < 3 && (
        <div className="cap-actions">
          <button className="cap-btn ghost" onClick={onCancel}>
            Terug
          </button>
        </div>
      )}
    </div>
  );
}
