'use client';

import { useEffect, useRef, useState } from 'react';
import { areaOf, polygonFromTaps } from '@/lib/capture/rooms';
import { fmtNum } from '@/lib/format';
import type { Pt } from '@/lib/types';

/**
 * Hoeken aantikken op het camerabeeld. Eén gemeten muur zet het getekende
 * omtrekje om naar echte meters, dus dit werkt op elke telefoon, ook zonder AR.
 */
export function MeasureTap({ onDone, onCancel }: { onDone: (poly: Pt[], area: number) => void; onCancel: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [taps, setTaps] = useState<Pt[]>([]);
  const [refLength, setRefLength] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Deze browser geeft geen toegang tot de camera. Tik de hoeken op het raster.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
      } catch (err) {
        const name = err instanceof Error ? err.name : '';
        setCameraError(
          name === 'NotAllowedError'
            ? 'Camera-toegang is geweigerd. Tik de hoeken op het raster.'
            : 'De camera kon niet starten. Tik de hoeken op het raster.',
        );
      }
    };
    void start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const onStageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = stageRef.current!.getBoundingClientRect();
    setTaps((t) => [
      ...t,
      { x: ((e.clientX - rect.left) / rect.width) * 1000, y: ((e.clientY - rect.top) / rect.height) * 750 },
    ]);
  };

  const ref = Number(refLength.replace(',', '.'));
  const poly = taps.length >= 3 && ref > 0 ? polygonFromTaps(taps, ref) : [];
  const area = poly.length >= 3 ? areaOf(poly) : 0;

  return (
    <div className="cap-panel">
      <div className="cap-panel-title">Hoeken aantikken</div>
      <p className="cap-help">
        Tik de hoeken van de ruimte aan in volgorde. Meet daarna de eerste muur, tussen hoek 1 en hoek 2, en vul die lengte in.
      </p>

      <div className="cap-stage" ref={stageRef} onClick={onStageClick}>
        <video ref={videoRef} autoPlay playsInline muted hidden={Boolean(cameraError)} />
        {cameraError && <div className="cap-stage-fallback">{cameraError}</div>}
        <svg viewBox="0 0 1000 750" preserveAspectRatio="none">
          {taps.length > 1 && (
            <path
              d={taps.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + (taps.length >= 3 ? ' Z' : '')}
              fill={taps.length >= 3 ? 'rgba(248,172,1,.16)' : 'none'}
              stroke="#f8ac01"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {taps.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="12" fill="#024847" stroke="#fff" strokeWidth="3" />
              <text x={p.x} y={p.y + 5} fontSize="15" fill="#fff" textAnchor="middle" fontWeight="700">
                {i + 1}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="cap-field-row">
        <label className="cap-field">
          <span>Lengte muur 1 → 2 (m)</span>
          <input inputMode="decimal" value={refLength} placeholder="4,00" onChange={(e) => setRefLength(e.target.value)} />
        </label>
        <div className="cap-field readout">
          <span>Oppervlak</span>
          <strong>{area > 0 ? `${fmtNum(area)} m²` : '–'}</strong>
        </div>
      </div>

      <div className="cap-actions">
        <button className="cap-btn ghost" onClick={onCancel}>
          Terug
        </button>
        <button className="cap-btn ghost" onClick={() => setTaps((t) => t.slice(0, -1))} disabled={!taps.length}>
          Wis laatste punt
        </button>
        <button className="cap-btn" disabled={poly.length < 3} onClick={() => onDone(poly, area)}>
          Ruimte opslaan
        </button>
      </div>
    </div>
  );
}
