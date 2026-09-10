'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { depressionFromBeta, headingFromEvent } from '@/lib/capture/sighting';

export interface Aim {
  depression: number | null;
  heading: number | null;
  roll: number | null;
  absolute: boolean;
}

type PermissionState = 'unknown' | 'granted' | 'denied' | 'unsupported';

interface OrientationEventWithCompass extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
}

/**
 * Live aim from the phone's own sensors. iOS needs the permission asked for from
 * inside a tap, which is why granting is a callback rather than an effect.
 */
export function useDeviceOrientation() {
  const [aim, setAim] = useState<Aim>({ depression: null, heading: null, roll: null, absolute: false });
  const [permission, setPermission] = useState<PermissionState>('unknown');
  const listening = useRef(false);

  const handle = useCallback((event: DeviceOrientationEvent) => {
    const e = event as OrientationEventWithCompass;
    setAim({
      depression: depressionFromBeta(e.beta),
      heading: headingFromEvent(e.alpha, e.webkitCompassHeading, e.absolute),
      roll: e.gamma,
      absolute: e.absolute || typeof e.webkitCompassHeading === 'number',
    });
  }, []);

  const attach = useCallback(() => {
    if (listening.current) return;
    listening.current = true;
    window.addEventListener('deviceorientationabsolute', handle as EventListener, true);
    window.addEventListener('deviceorientation', handle as EventListener, true);
  }, [handle]);

  const request = useCallback(async () => {
    const ctor = window.DeviceOrientationEvent as
      | (typeof DeviceOrientationEvent & { requestPermission?: () => Promise<'granted' | 'denied'> })
      | undefined;
    if (!ctor) {
      setPermission('unsupported');
      return false;
    }
    if (typeof ctor.requestPermission === 'function') {
      try {
        const res = await ctor.requestPermission();
        if (res !== 'granted') {
          setPermission('denied');
          return false;
        }
      } catch {
        setPermission('denied');
        return false;
      }
    }
    setPermission('granted');
    attach();
    return true;
  }, [attach]);

  useEffect(
    () => () => {
      window.removeEventListener('deviceorientationabsolute', handle as EventListener, true);
      window.removeEventListener('deviceorientation', handle as EventListener, true);
      listening.current = false;
    },
    [handle],
  );

  return { aim, permission, request };
}
