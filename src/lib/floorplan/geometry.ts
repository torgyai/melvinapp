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
 * Ramer-Douglas-Peucker on an open polyline. Both endpoints are kept.
 */
export function simplify(poly: Pt[], tol = 0.12): Pt[] {
  if (poly.length < 3) return poly;
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

/**
 * Simplify a closed ring. A trace rarely starts on a corner, and running the
 * open-polyline version straight on the ring pins the first and last sample as
 * corners, which puts a false bend in the middle of a wall. Splitting the ring
 * at its two most distant points gives two chains whose endpoints really are
 * corners.
 */
export function simplifyRing(poly: Pt[], tol = 0.12): Pt[] {
  if (poly.length < 5) return poly;
  const a = 0;
  let b = 0;
  let best = -1;
  for (let i = 1; i < poly.length; i++) {
    const d = Math.hypot(poly[i]!.x - poly[a]!.x, poly[i]!.y - poly[a]!.y);
    if (d > best) {
      best = d;
      b = i;
    }
  }
  const first = simplify(poly.slice(a, b + 1), tol);
  const second = simplify([...poly.slice(b), poly[a]!], tol);
  // Drop the duplicated join points: `first` ends at b, `second` starts at b and
  // ends back at a.
  return [...first.slice(0, -1), ...second.slice(0, -1)];
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
  // The area to hold on to is the one that was measured, before any smoothing.
  const measuredArea = polygonArea(poly);
  poly = simplifyRing(poly, 0.1);
  if (poly.length < 3) return dedupe(input);
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

  let cleaned = dropCollinear(dedupe(pts, 0.06));
  if (cleaned.length < 3) return rotate(dedupe(pts, 0.01), angle, centre);
  // Settling and cleanup feed each other: squaring the ring exposes corners that
  // were never real, and removing those lets the rest square up further.
  for (let pass = 0; pass < 2; pass++) {
    cleaned = dropCollinear(dedupe(settleAxes(cleaned), 0.06));
    if (cleaned.length < 3) return rotate(dedupe(pts, 0.01), angle, centre);
  }
  const scaled = preserveArea(settleAxes(cleaned), measuredArea);
  return rotate(scaled, angle, centre);
}

/**
 * Remove the corners that snapping leaves behind: a vertex whose two walls run
 * the same way is not a corner, and a wall a few centimetres long is a seam in
 * the trace rather than a feature of the room.
 */
export function dropCollinear(poly: Pt[], angleTol = 0.22, minWall = 0.35): Pt[] {
  let pts = poly.map((p) => ({ ...p }));
  let changed = true;
  while (changed && pts.length > 3) {
    changed = false;
    for (let i = 0; i < pts.length; i++) {
      const prev = pts[(i - 1 + pts.length) % pts.length]!;
      const cur = pts[i]!;
      const next = pts[(i + 1) % pts.length]!;
      const inAngle = Math.atan2(cur.y - prev.y, cur.x - prev.x);
      const outAngle = Math.atan2(next.y - cur.y, next.x - cur.x);
      const turn = Math.abs(normaliseAngle(outAngle - inAngle));
      const wall = Math.hypot(next.x - cur.x, next.y - cur.y);
      if (turn < angleTol || wall < minWall) {
        pts = pts.filter((_, idx) => idx !== i);
        changed = true;
        break;
      }
    }
  }
  return pts;
}

/** Pull every wall onto the axis it is already closest to. */
function settleAxes(poly: Pt[]): Pt[] {
  const pts = poly.map((p) => ({ ...p }));
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    if (Math.abs(b.x - a.x) < Math.abs(b.y - a.y)) {
      const mid = (a.x + b.x) / 2;
      a.x = mid;
      b.x = mid;
    } else {
      const mid = (a.y + b.y) / 2;
      a.y = mid;
      b.y = mid;
    }
  }
  return pts;
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
