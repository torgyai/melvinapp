import type { Pt } from '@/lib/types';

/**
 * Camera scanning without AR.
 *
 * The phone knows which way it is pointing. Aim the crosshair at the spot where
 * a wall meets the floor and the depression angle plus the height the phone is
 * held at give the distance to that spot: d = h / tan(theta). The compass gives
 * the direction. Together that is a floor position in metres, from a plain
 * browser, on a phone with no ARCore and no LiDAR.
 */

export interface Sighting {
  /** Depression below the horizon, in degrees. */
  depression: number;
  /** Compass heading of the aim, in degrees clockwise from north. */
  heading: number;
  /** Height of the camera above the floor, in metres. */
  cameraHeight: number;
}

/** Below this the aim is too close to the horizon for the distance to mean anything. */
export const MIN_DEPRESSION_DEG = 3.5;
export const MAX_RANGE_M = 25;

export function distanceFromSighting(depressionDeg: number, cameraHeight: number): number | null {
  if (!(cameraHeight > 0.2)) return null;
  if (!(depressionDeg > MIN_DEPRESSION_DEG)) return null;
  const d = cameraHeight / Math.tan((depressionDeg * Math.PI) / 180);
  if (!isFinite(d) || d <= 0 || d > MAX_RANGE_M) return null;
  return d;
}

/** Floor position relative to where the surveyor is standing. North is +y. */
export function floorPointFromSighting(s: Sighting): (Pt & { distance: number }) | null {
  const d = distanceFromSighting(s.depression, s.cameraHeight);
  if (d === null) return null;
  const rad = (s.heading * Math.PI) / 180;
  return { x: d * Math.sin(rad), y: d * Math.cos(rad), distance: d };
}

/**
 * How much a 1 degree error in the aim moves the measured point. Grows with the
 * square of distance, which is why the readout warns past a few metres.
 */
export function sightingUncertainty(depressionDeg: number, cameraHeight: number): number | null {
  const d = distanceFromSighting(depressionDeg, cameraHeight);
  if (d === null) return null;
  const rad = (depressionDeg * Math.PI) / 180;
  return Math.abs((cameraHeight / Math.sin(rad) ** 2) * (Math.PI / 180));
}

/** Compass heading from a device orientation event, clockwise from north. */
export function headingFromEvent(
  alpha: number | null,
  webkitCompassHeading: number | undefined,
  absolute: boolean,
): number | null {
  if (typeof webkitCompassHeading === 'number' && isFinite(webkitCompassHeading)) {
    return normaliseDeg(webkitCompassHeading);
  }
  if (alpha === null || !isFinite(alpha)) return null;
  // Android reports alpha counter-clockwise from north on the absolute event;
  // on the relative event it is still a consistent frame within one room.
  return normaliseDeg(360 - alpha) + (absolute ? 0 : 0);
}

/** Depression below the horizon for a phone held upright in portrait. */
export function depressionFromBeta(beta: number | null): number | null {
  if (beta === null || !isFinite(beta)) return null;
  return 90 - beta;
}

export function normaliseDeg(d: number): number {
  return ((d % 360) + 360) % 360;
}

/**
 * Rescale a scanned outline so one wall matches a measured length. One tape or
 * laser reading removes the systematic error in the phone height and leaves the
 * angles, which are the part the sensors get right.
 */
export function rescaleToWall(poly: Pt[], wallIndex: number, trueLength: number): Pt[] {
  const a = poly[wallIndex];
  const b = poly[(wallIndex + 1) % poly.length];
  if (!a || !b || !(trueLength > 0)) return poly;
  const current = Math.hypot(b.x - a.x, b.y - a.y);
  if (!(current > 0)) return poly;
  const f = trueLength / current;
  return poly.map((p) => ({ x: p.x * f, y: p.y * f }));
}
