import type { Pt } from '@/lib/types';

export interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  w: number;
  h: number;
}

export function bbox(poly: Pt[]): Box {
  const xs = poly.map((p) => p.x);
  const ys = poly.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { minX, minY, maxX, maxY, w: Math.max(maxX - minX, 0.01), h: Math.max(maxY - minY, 0.01) };
}

/** Signed area, positive when the ring is counter-clockwise. */
export function signedArea(poly: Pt[]): number {
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

export function polygonArea(poly: Pt[]): number {
  return Math.abs(signedArea(poly));
}

export function perimeter(poly: Pt[]): number {
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    sum += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return sum;
}

export function ensureCCW(poly: Pt[]): Pt[] {
  return signedArea(poly) < 0 ? [...poly].reverse() : poly;
}

export function translate(poly: Pt[], dx: number, dy: number): Pt[] {
  return poly.map((p) => ({ x: p.x + dx, y: p.y + dy }));
}

export function rotate(poly: Pt[], radians: number, about: Pt = { x: 0, y: 0 }): Pt[] {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return poly.map((p) => {
    const dx = p.x - about.x;
    const dy = p.y - about.y;
    return { x: about.x + dx * c - dy * s, y: about.y + dx * s + dy * c };
  });
}

export function scale(poly: Pt[], factor: number, about: Pt = { x: 0, y: 0 }): Pt[] {
  return poly.map((p) => ({ x: about.x + (p.x - about.x) * factor, y: about.y + (p.y - about.y) * factor }));
}

/** Drop points that sit within `tol` metres of their neighbour. */
export function dedupe(poly: Pt[], tol = 0.05): Pt[] {
  const out: Pt[] = [];
  for (const p of poly) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) > tol) out.push(p);
  }
  while (out.length > 2) {
    const first = out[0]!;
    const last = out[out.length - 1]!;
    if (Math.hypot(first.x - last.x, first.y - last.y) <= tol) out.pop();
    else break;
  }
  return out;
}

/**
 * Ramer-Douglas-Peucker. A hand-tapped or AR-traced outline carries jitter that
 * would otherwise turn into fake corners on the plan.
 */
export function simplify(poly: Pt[], tol = 0.12): Pt[] {
  if (poly.length < 4) return poly;
  const keep = new Array(poly.length).fill(false);
  keep[0] = true;
  keep[poly.length - 1] = true;

  const stack: [number, number][] = [[0, poly.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop()!;
    let maxDist = 0;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const d = pointSegmentDistance(poly[i]!, poly[first]!, poly[last]!);
      if (d > maxDist) {
        maxDist = d;
        index = i;
      }
    }
    if (maxDist > tol && index !== -1) {
      keep[index] = true;
      stack.push([first, index], [index, last]);
    }
  }
  return poly.filter((_, i) => keep[i]);
}

export function pointSegmentDistance(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/**
 * Find the angle the building is built on. Walls in a house are overwhelmingly
 * parallel or perpendicular, so the dominant direction modulo 90 degrees is the
 * angle the whole outline should be rotated back by before snapping.
 */
export function dominantAngle(poly: Pt[]): number {
  let best = 0;
  let bestScore = -1;
  // 0.5 degree buckets over a quarter turn, weighted by wall length.
  const buckets = 180;
  const score = new Array(buckets).fill(0);
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len < 0.15) continue;
    let ang = Math.atan2(b.y - a.y, b.x - a.x);
    ang = ((ang % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2);
    const idx = Math.min(buckets - 1, Math.floor((ang / (Math.PI / 2)) * buckets));
    score[idx] += len;
  }
  score.forEach((s, i) => {
    if (s > bestScore) {
      bestScore = s;
      best = i;
    }
  });
  return (best / buckets) * (Math.PI / 2);
}

/**
 * Regularise a captured outline: rotate onto the building axis, force every wall
 * to the nearer axis, then close the ring. This is what turns a wobbly traced
 * room into a drawing that reads as a floor plan.
 */
export function regularize(input: Pt[], opts: { snapTolerance?: number } = {}): Pt[] {
  const tol = opts.snapTolerance ?? 0.35; // radians away from an axis still counts as that axis
  let poly = dedupe(input);
  if (poly.length < 3) return poly;
  poly = simplify(poly, 0.1);
  poly = ensureCCW(poly);

  const angle = dominantAngle(poly);
  const centre = centroid(poly);
  const aligned = rotate(poly, -angle, centre);

  // Snap each wall to horizontal or vertical by moving both endpoints halfway.
  const pts = aligned.map((p) => ({ ...p }));
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (Math.hypot(dx, dy) < 0.05) continue;
    const wallAngle = Math.atan2(dy, dx);
    const nearest = Math.round(wallAngle / (Math.PI / 2)) * (Math.PI / 2);
    if (Math.abs(normaliseAngle(wallAngle - nearest)) > tol) continue;
    if (Math.abs(Math.cos(nearest)) > 0.5) {
      const mid = (a.y + b.y) / 2;
      a.y = mid;
      b.y = mid;
    } else {
      const mid = (a.x + b.x) / 2;
      a.x = mid;
      b.x = mid;
    }
  }

  const snapped = dedupe(pts, 0.06);
  const scaled = preserveArea(snapped, polygonArea(poly));
  return rotate(scaled, angle, centre);
}

function normaliseAngle(a: number): number {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

/** Snapping shifts the area slightly; scale back so the m2 on the plan matches the measurement. */
export function preserveArea(poly: Pt[], targetArea: number): Pt[] {
  const current = polygonArea(poly);
  if (current <= 0 || targetArea <= 0) return poly;
  const factor = Math.sqrt(targetArea / current);
  if (!isFinite(factor) || Math.abs(factor - 1) < 0.001) return poly;
  return scale(poly, factor, centroid(poly));
}

export function centroid(poly: Pt[]): Pt {
  const a = signedArea(poly);
  if (Math.abs(a) < 1e-9) {
    const n = poly.length || 1;
    return { x: poly.reduce((s, p) => s + p.x, 0) / n, y: poly.reduce((s, p) => s + p.y, 0) / n };
  }
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]!;
    const q = poly[(i + 1) % poly.length]!;
    const cross = p.x * q.y - q.x * p.y;
    cx += (p.x + q.x) * cross;
    cy += (p.y + q.y) * cross;
  }
  return { x: cx / (6 * a), y: cy / (6 * a) };
}

/**
 * Scale a traced outline to real metres using one wall the surveyor measured.
 * `refWall` is the index of the wall in the polygon, `refLength` its true length.
 */
export function scaleToMetres(poly: Pt[], refWall: number, refLength: number): Pt[] {
  const a = poly[refWall];
  const b = poly[(refWall + 1) % poly.length];
  if (!a || !b || refLength <= 0) return poly;
  const px = Math.hypot(b.x - a.x, b.y - a.y);
  if (px <= 0) return poly;
  const factor = refLength / px;
  const origin = poly[0]!;
  return poly.map((p) => ({ x: (p.x - origin.x) * factor, y: (p.y - origin.y) * factor }));
}

export function rectangle(w: number, h: number): Pt[] {
  return [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
  ];
}

export function boxesOverlap(a: Box, b: Box, gap = 0): boolean {
  return !(a.maxX + gap <= b.minX || b.maxX + gap <= a.minX || a.maxY + gap <= b.minY || b.maxY + gap <= a.minY);
}
