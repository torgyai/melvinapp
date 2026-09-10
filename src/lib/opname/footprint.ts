import type { CaptureRoom, Opening, Pt } from '@/lib/types';

/**
 * What the scan can tell the opnameformulier about the buitenschil.
 *
 * A wall is part of the thermische schil when no other room sits against it.
 * Rooms captured in one walk share an origin, so a wall that another room also
 * traces, in the opposite direction and within a wall thickness, is an inner
 * wall and does not count. What is left is gevel, and its outward normal gives
 * the oriëntatie the form asks for.
 *
 * Two things this refuses to guess. A room measured with the camera carries a
 * heading, and its outline is drawn straight into a north-up frame: +y is
 * north, +x is east. A room typed in wall by wall has no heading and no frame,
 * so its walls get no oriëntatie at all rather than an invented one. And rooms
 * traced one at a time all start at their own origin, which means overlap
 * between two of them says nothing about the building: on such a floor no wall
 * can be called inner, so none is called outer either.
 */

/** Wall thickness allowance when deciding whether two rooms share a wall. */
const SHARED_TOL_M = 0.4;
const STOREY_EXTRA_M = 0.3;
const DEFAULT_STOREY_M = 2.9;

export interface ExteriorWall {
  floor: string;
  room: string;
  roomClientId: string;
  /** Index of the wall in the room outline. */
  wallIndex: number;
  /** Exterior length in metres, with shared stretches already taken off. */
  length: number;
  /** Fraction of the wall that is exterior. */
  share: number;
  /** Compass bearing of the outward normal, or null when the frame is unknown. */
  bearing: number | null;
  /** Octant code, or null when the room was measured without a compass. */
  orientatie: string | null;
  glas: number;
  deuren: number;
}

export interface FloorGeometry {
  name: string;
  area: number;
  storeyHeight: number;
  /** True when the rooms share one frame, so inner walls can be recognised. */
  placed: boolean;
  walls: ExteriorWall[];
  perimeter: number;
}

export function octant(bearing: number): string {
  const b = ((bearing % 360) + 360) % 360;
  const codes = ['N', 'NO', 'O', 'ZO', 'Z', 'ZW', 'W', 'NW'];
  return codes[Math.round(b / 45) % 8]!;
}

export function orientatieLabel(code: string): string {
  const map: Record<string, string> = {
    N: 'noord', NO: 'noordoost', O: 'oost', ZO: 'zuidoost',
    Z: 'zuid', ZW: 'zuidwest', W: 'west', NW: 'noordwest', H: 'horizontaal',
  };
  return map[code] ?? code.toLowerCase();
}

function polyArea(poly: Pt[]): number {
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum / 2);
}

/** Bearing of a direction vector, with +y north and +x east. */
function bearingOf(dx: number, dy: number): number {
  const deg = (Math.atan2(dx, dy) * 180) / Math.PI;
  return ((deg % 360) + 360) % 360;
}

/**
 * True when the outline is drawn in the north-up frame. Only the camera routes
 * produce that, and they are exactly the ones that record a heading.
 */
function isNorthUp(room: CaptureRoom): boolean {
  return typeof room.heading === 'number' && Number.isFinite(room.heading);
}

/** Total length of the union of a set of intervals. */
function covered(intervals: [number, number][]): number {
  if (!intervals.length) return 0;
  const sorted = [...intervals].sort((p, q) => p[0] - q[0]);
  let total = 0;
  let [start, end] = sorted[0]!;
  for (const [s, e] of sorted.slice(1)) {
    if (s > end) {
      total += end - start;
      start = s;
      end = e;
    } else if (e > end) {
      end = e;
    }
  }
  return total + (end - start);
}

function openingHeight(o: Opening, storey: number): number {
  if (o.kind === 'deur') return Math.min(2.1, storey - 0.2);
  if (o.kind === 'doorgang') return Math.min(2.1, storey - 0.2);
  return Math.min(1.6, storey * 0.55);
}

/**
 * True when the rooms on a floor were captured against one shared frame. A
 * composed floor has every room starting at its own origin, so overlap between
 * two rooms says nothing about the building.
 */
function isPlaced(rooms: CaptureRoom[]): boolean {
  // The same test the plan pipeline uses: if every room starts at (0,0) it was
  // traced on its own and nothing ties the outlines together.
  if (rooms.length < 2) return true;
  return !rooms.every((r) => Math.abs(r.poly[0]!.x) < 0.01 && Math.abs(r.poly[0]!.y) < 0.01);
}

export function floorGeometry(name: string, rooms: CaptureRoom[]): FloorGeometry {
  const usable = rooms.filter((r) => r.poly && r.poly.length >= 3);
  const area = Math.round(usable.reduce((s, r) => s + polyArea(r.poly), 0) * 10) / 10;
  const heights = usable.map((r) => r.height).filter((h): h is number => typeof h === 'number' && h > 1.5);
  const storeyHeight = heights.length
    ? Math.round((heights.reduce((s, h) => s + h, 0) / heights.length + STOREY_EXTRA_M) * 100) / 100
    : DEFAULT_STOREY_M;
  const placed = isPlaced(usable);

  const walls: ExteriorWall[] = [];
  // Without a shared frame an inner wall cannot be told from an outer one, so
  // the schil is left to the surveyor rather than guessed at twice its size.
  if (!placed) {
    return { name, area, storeyHeight, placed, walls, perimeter: 0 };
  }
  for (const room of usable) {
    const northUp = isNorthUp(room);
    for (let i = 0; i < room.poly.length; i++) {
      const a = room.poly[i]!;
      const b = room.poly[(i + 1) % room.poly.length]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      if (len < 0.2) continue;
      const ux = dx / len;
      const uy = dy / len;

      const overlaps: [number, number][] = [];
      {
        for (const other of usable) {
          if (other === room) continue;
          for (let j = 0; j < other.poly.length; j++) {
            const c = other.poly[j]!;
            const d = other.poly[(j + 1) % other.poly.length]!;
            const vx = d.x - c.x;
            const vy = d.y - c.y;
            const vlen = Math.hypot(vx, vy);
            if (vlen < 0.2) continue;
            // Antiparallel or parallel within a few degrees, and close by.
            if (Math.abs((vx * ux + vy * uy) / vlen) < 0.94) continue;
            const perpC = Math.abs((c.x - a.x) * -uy + (c.y - a.y) * ux);
            const perpD = Math.abs((d.x - a.x) * -uy + (d.y - a.y) * ux);
            if (perpC > SHARED_TOL_M || perpD > SHARED_TOL_M) continue;
            const t1 = (c.x - a.x) * ux + (c.y - a.y) * uy;
            const t2 = (d.x - a.x) * ux + (d.y - a.y) * uy;
            const lo = Math.max(0, Math.min(t1, t2));
            const hi = Math.min(len, Math.max(t1, t2));
            if (hi - lo > 0.25) overlaps.push([lo, hi]);
          }
        }
      }
      const exterior = Math.max(0, len - covered(overlaps));
      if (exterior < 0.3) continue;

      const bearing = northUp ? ((bearingOf(dx, dy) + 90) % 360 + 360) % 360 : null;
      const share = exterior / len;
      let glas = 0;
      let deuren = 0;
      for (const o of room.openings ?? []) {
        if (o.wall !== i) continue;
        const h = openingHeight(o, storeyHeight);
        if (o.kind === 'raam') glas += o.width * h * share;
        else if (o.kind === 'deur') deuren += o.width * h * share;
      }
      walls.push({
        floor: name,
        room: room.name,
        roomClientId: room.clientId,
        wallIndex: i,
        length: Math.round(exterior * 100) / 100,
        share: Math.round(share * 1000) / 1000,
        bearing: bearing === null ? null : Math.round(bearing * 10) / 10,
        orientatie: bearing === null ? null : octant(bearing),
        glas: Math.round(glas * 100) / 100,
        deuren: Math.round(deuren * 100) / 100,
      });
    }
  }

  const perimeter = Math.round(walls.reduce((s, w) => s + w.length, 0) * 10) / 10;
  return { name, area, storeyHeight, placed, walls, perimeter };
}

export function floorsFromRooms(rooms: CaptureRoom[]): FloorGeometry[] {
  const byFloor = new Map<string, CaptureRoom[]>();
  for (const r of rooms) {
    if (!r.poly || r.poly.length < 3) continue;
    const list = byFloor.get(r.floorName) ?? [];
    list.push(r);
    byFloor.set(r.floorName, list);
  }
  return [...byFloor.entries()].map(([name, list]) => floorGeometry(name, list));
}

export interface GevelPerOrientatie {
  /** Null when the rooms on this floor were measured without a compass. */
  orientatie: string | null;
  lengte: number;
  bruto: number;
  glas: number;
  deuren: number;
  netto: number;
}

/** Gevel area per oriëntatie over the whole building, glass and doors taken off. */
export function gevelsPerOrientatie(floors: FloorGeometry[]): GevelPerOrientatie[] {
  const acc = new Map<string, GevelPerOrientatie>();
  for (const f of floors) {
    for (const w of f.walls) {
      const key = w.orientatie ?? 'onbekend';
      const row = acc.get(key) ?? {
        orientatie: w.orientatie, lengte: 0, bruto: 0, glas: 0, deuren: 0, netto: 0,
      };
      row.lengte += w.length;
      row.bruto += w.length * f.storeyHeight;
      row.glas += w.glas;
      row.deuren += w.deuren;
      acc.set(key, row);
    }
  }
  return [...acc.values()]
    .map((r) => ({
      orientatie: r.orientatie,
      lengte: Math.round(r.lengte * 10) / 10,
      bruto: Math.round(r.bruto * 10) / 10,
      glas: Math.round(r.glas * 10) / 10,
      deuren: Math.round(r.deuren * 10) / 10,
      netto: Math.round(Math.max(0, r.bruto - r.glas - r.deuren) * 10) / 10,
    }))
    .sort((a, b) => b.netto - a.netto);
}

export interface RaamSighting {
  room: string;
  floor: string;
  orientatie: string | null;
  opp: number;
  kind: Opening['kind'];
}

/**
 * Openings that sit on a wall the scan calls exterior, matched by the wall they
 * were measured on rather than by name. The area uses the same exterior share
 * as the gevel, so the raamlijst and the gevelregels agree about one window.
 */
export function openingsPerOrientatie(floors: FloorGeometry[], rooms: CaptureRoom[]): RaamSighting[] {
  const out: RaamSighting[] = [];
  for (const f of floors) {
    const byWall = new Map<string, ExteriorWall>();
    for (const w of f.walls) byWall.set(`${w.roomClientId}:${w.wallIndex}`, w);
    const floorRooms = rooms.filter((r) => r.floorName === f.name && (r.poly?.length ?? 0) >= 3);
    for (const room of floorRooms) {
      if (!room.openings?.length) continue;
      for (const o of room.openings) {
        if (o.kind === 'doorgang') continue;
        const wall = byWall.get(`${room.clientId}:${o.wall}`);
        if (!wall) continue;
        out.push({
          room: room.name,
          floor: f.name,
          orientatie: wall.orientatie,
          opp: Math.round(o.width * openingHeight(o, f.storeyHeight) * wall.share * 100) / 100,
          kind: o.kind,
        });
      }
    }
  }
  return out;
}
