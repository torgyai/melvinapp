'use client';

import { useEffect, useRef, useState } from 'react';

/** Rear camera preview, stopped properly when the step is left. */
export function useCameraStream(active: boolean) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Deze browser geeft geen toegang tot de camera.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        setError(null);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
      } catch (err) {
        const name = err instanceof Error ? err.name : '';
        setError(
          name === 'NotAllowedError'
            ? 'Camera-toegang is geweigerd. Sta de camera toe en probeer opnieuw.'
            : name === 'NotFoundError'
              ? 'Geen camera gevonden op dit apparaat.'
              : 'De camera kon niet worden gestart.',
        );
      }
    };

    void start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [active]);

  return { videoRef, error };
}
