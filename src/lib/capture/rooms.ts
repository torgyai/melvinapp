import { polygonArea, scaleToMetres, regularize } from '@/lib/floorplan/geometry';
import type { Pt } from '@/lib/types';

/** A wall as the surveyor calls it out: a length and the turn taken after it. */
export interface WallInput {
  length: number;
  /** Degrees turned to the left after this wall. 90 is a normal corner. */
  turn: number;
}

/**
 * Wall-by-wall entry. This is how a room is measured with a laser meter today,
 * so the numbers going in are already the measured numbers, and the outline is
 * exact rather than traced.
 */
export function polygonFromWalls(walls: WallInput[]): Pt[] {
  const pts: Pt[] = [{ x: 0, y: 0 }];
  let heading = 0;
  walls.forEach((w, i) => {
    const last = pts[pts.length - 1]!;
    pts.push({
      x: last.x + Math.cos(heading) * w.length,
      y: last.y + Math.sin(heading) * w.length,
    });
    if (i < walls.length - 1) heading += (w.turn * Math.PI) / 180;
  });
  // The last point should meet the first; drop it when it nearly does.
  const first = pts[0]!;
  const last = pts[pts.length - 1]!;
  if (pts.length > 3 && Math.hypot(last.x - first.x, last.y - first.y) < 0.25) pts.pop();
  return pts;
}

/** How far the walk missed the starting corner. Anything over a few centimetres is a typo. */
export function closureError(walls: WallInput[]): number {
  const pts: Pt[] = [{ x: 0, y: 0 }];
  let heading = 0;
  walls.forEach((w) => {
    const last = pts[pts.length - 1]!;
    pts.push({ x: last.x + Math.cos(heading) * w.length, y: last.y + Math.sin(heading) * w.length });
    heading += (w.turn * Math.PI) / 180;
  });
  const last = pts[pts.length - 1]!;
  return Math.hypot(last.x, last.y);
}

/** AR hit points arrive as floor coordinates in metres; y on the plan is the AR z axis. */
export function polygonFromArPoints(points: { x: number; z: number }[]): Pt[] {
  return points.map((p) => ({ x: p.x, y: p.z }));
}

/** Corners tapped on a photo, scaled by one wall the surveyor measured. */
export function polygonFromTaps(taps: Pt[], refWallLength: number): Pt[] {
  return scaleToMetres(taps, 0, refWallLength);
}

export function areaOf(poly: Pt[]): number {
  return Math.round(polygonArea(poly) * 10) / 10;
}

export function tidy(poly: Pt[]): Pt[] {
  return regularize(poly);
}

/** Live preview path, fitted into a viewBox of the given size. */
export function previewPath(poly: Pt[], size = 260, pad = 18): { d: string; points: Pt[] } {
  if (poly.length === 0) return { d: '', points: [] };
  const xs = poly.map((p) => p.x);
  const ys = poly.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const w = Math.max(maxX - minX, 0.5);
  const h = Math.max(maxY - minY, 0.5);
  const s = Math.min((size - pad * 2) / w, (size - pad * 2) / h);
  const ox = pad + (size - pad * 2 - w * s) / 2;
  const oy = pad + (size - pad * 2 - h * s) / 2;
  const pts = poly.map((p) => ({ x: (p.x - minX) * s + ox, y: (p.y - minY) * s + oy }));
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  return { d: poly.length > 2 ? `${d} Z` : d, points: pts };
}
