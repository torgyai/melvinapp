import { rayAngles, type Intrinsics } from './intrinsics';
import { MAX_RANGE_M, MIN_DEPRESSION_DEG, distanceFromSighting, normaliseDeg } from './sighting';
import { median, type ColumnRead } from './walledge';
import type { Opening, Pt } from '@/lib/types';

/**
 * The room, built up direction by direction while the surveyor turns.
 *
 * Each direction holds how far the wall is, how high it is, and any opening
 * seen on it. That is enough for the plan, the volume, the sloped-ceiling
 * check and the glass area the energy calculation needs.
 */

const BIN_DEG = 2;
const BIN_COUNT = 360 / BIN_DEG;
const MIN_SAMPLES = 3;

interface OpeningSample {
  sill: number;
  head: number;
  brighter: boolean;
}

interface Bin {
  radii: number[];
  heights: number[];
  openings: OpeningSample[];
}

export interface WallOpening extends Opening {
  /** Height of the sill above the floor, in metres. */
  sill: number;
  /** Height of the top of the opening above the floor. */
  head: number;
  /** Compass heading of the wall the opening sits on. */
  heading: number;
  area: number;
}

export interface ScanResult {
  outline: Pt[];
  /** Median ceiling height over the room, in metres. */
  height: number | null;
  /** Lowest and highest wall height seen, which is how a sloped ceiling shows up. */
  heightRange: [number, number] | null;
  openings: WallOpening[];
  coverage: number;
}

export class RoomScan {
  private bins: Bin[] = fresh();

  reset(): void {
    this.bins = fresh();
  }

  coverage(): number {
    return this.bins.filter((b) => b.radii.length >= MIN_SAMPLES).length / BIN_COUNT;
  }

  complete(): boolean {
    return this.coverage() >= 0.9;
  }

  /** Directions that have a ceiling reading, as a fraction of those that have a wall. */
  ceilingCoverage(): number {
    const withWall = this.bins.filter((b) => b.radii.length >= MIN_SAMPLES);
    if (!withWall.length) return 0;
    return withWall.filter((b) => b.heights.length >= MIN_SAMPLES).length / withWall.length;
  }

  openingCount(): number {
    return this.result().openings.length;
  }

  /** Feed one frame. Every column of it contributes to the direction it points in. */
  addFrame(
    reads: ColumnRead[],
    k: Intrinsics,
    pitchDepression: number,
    heading: number,
    cameraHeight: number,
  ): number {
    let added = 0;
    for (const c of reads) {
      const floor = rayAngles(k, c.x, c.floorY, pitchDepression);
      if (floor.depression <= MIN_DEPRESSION_DEG) continue;
      const d = distanceFromSighting(floor.depression, cameraHeight);
      if (d === null || d > MAX_RANGE_M) continue;

      const dir = normaliseDeg(heading + floor.bearingOffset);
      const bin = this.bins[Math.floor(dir / BIN_DEG) % BIN_COUNT]!;
      bin.radii.push(d);
      if (bin.radii.length > 40) bin.radii.shift();
      added++;

      // The ceiling sits above the horizon at the same distance, so its height
      // follows from the angle above the horizon.
      if (c.ceilingY !== null) {
        const ceil = rayAngles(k, c.x, c.ceilingY, pitchDepression);
        const elevation = -ceil.depression;
        if (elevation > 1) {
          const h = cameraHeight + d * Math.tan((elevation * Math.PI) / 180);
          if (h > 1.6 && h < 6) {
            bin.heights.push(h);
            if (bin.heights.length > 40) bin.heights.shift();
          }
        }
      }

      // Anything on the wall between the two lines, converted to heights.
      for (const o of c.openings) {
        const top = rayAngles(k, c.x, o.topY, pitchDepression);
        const bottom = rayAngles(k, c.x, o.bottomY, pitchDepression);
        const head = cameraHeight + d * Math.tan((-top.depression * Math.PI) / 180);
        const sill = cameraHeight + d * Math.tan((-bottom.depression * Math.PI) / 180);
        if (head - sill < 0.25 || head > 4 || sill < -0.1) continue;
        bin.openings.push({ sill: Math.max(0, sill), head, brighter: o.brighter });
        if (bin.openings.length > 20) bin.openings.shift();
      }
    }
    return added;
  }

  /** The outline so far, as a polar ring. Gaps are directions not yet seen. */
  outline(): Pt[] {
    const pts: Pt[] = [];
    for (let i = 0; i < BIN_COUNT; i++) {
      const bin = this.bins[i]!;
      if (bin.radii.length < MIN_SAMPLES) continue;
      const r = median(bin.radii);
      const rad = ((i * BIN_DEG + BIN_DEG / 2) * Math.PI) / 180;
      pts.push({ x: r * Math.sin(rad), y: r * Math.cos(rad) });
    }
    return pts;
  }

  result(): ScanResult {
    const heights: number[] = [];
    for (const bin of this.bins) {
      if (bin.heights.length >= MIN_SAMPLES) heights.push(median(bin.heights));
    }
    const height = heights.length ? round2(median(heights)) : null;
    const heightRange = heights.length
      ? ([round2(Math.min(...heights)), round2(Math.max(...heights))] as [number, number])
      : null;

    return {
      outline: this.outline(),
      height,
      heightRange,
      openings: this.groupOpenings(),
      coverage: this.coverage(),
    };
  }

  /**
   * Neighbouring directions that see the same thing on the wall are one opening.
   * A run of at least three bins, roughly six degrees, keeps stray readings out.
   */
  private groupOpenings(): WallOpening[] {
    const perBin: (OpeningSample | null)[] = this.bins.map((b) => {
      if (b.openings.length < MIN_SAMPLES) return null;
      return {
        sill: median(b.openings.map((o) => o.sill)),
        head: median(b.openings.map((o) => o.head)),
        brighter: b.openings.filter((o) => o.brighter).length > b.openings.length / 2,
      };
    });

    // An opening on a wall behind the surveyor straddles 0 degrees, so the run
    // is found on a rotated copy that starts at a direction with nothing on it.
    const gap = perBin.findIndex((v) => v === null);
    if (gap < 0) return [];
    const order = Array.from({ length: BIN_COUNT }, (_, i) => (gap + i) % BIN_COUNT);

    const out: WallOpening[] = [];
    let run: number[] = [];

    const flush = () => {
      if (run.length >= 3) {
        const group = run.map((i) => perBin[i]!).filter(Boolean);
        const sill = round2(median(group.map((g) => g.sill)));
        const head = round2(median(group.map((g) => g.head)));
        const brighter = group.filter((g) => g.brighter).length > group.length / 2;

        const first = this.floorPointOf(run[0]!);
        const last = this.floorPointOf(run[run.length - 1]!);
        const heading = normaliseDeg(binHeading(run[Math.floor(run.length / 2)]!));
        const width =
          first && last
            ? round2(Math.hypot(last.x - first.x, last.y - first.y) * ((run.length + 1) / run.length))
            : 0;

        if (width >= 0.3 && head - sill >= 0.3) {
          out.push({
            wall: 0,
            offset: 0,
            width,
            kind: sill < 0.25 ? 'deur' : brighter ? 'raam' : 'doorgang',
            sill,
            head,
            heading,
            area: round2(width * (head - sill)),
          });
        }
      }
      run = [];
    };

    for (const i of order) {
      if (perBin[i]) run.push(i);
      else flush();
    }
    flush();
    return out;
  }

  private floorPointOf(bin: number): Pt | null {
    const b = this.bins[bin];
    if (!b || b.radii.length < MIN_SAMPLES) return null;
    const r = median(b.radii);
    const rad = (binHeading(bin) * Math.PI) / 180;
    return { x: r * Math.sin(rad), y: r * Math.cos(rad) };
  }
}

function binHeading(bin: number): number {
  return bin * BIN_DEG + BIN_DEG / 2;
}

function fresh(): Bin[] {
  return Array.from({ length: BIN_COUNT }, () => ({ radii: [], heights: [], openings: [] }));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Put each opening on the wall it belongs to, once the outline has been squared
 * off, so the plan can draw it in the right place.
 */
export function attachOpeningsToWalls(poly: Pt[], openings: WallOpening[]): WallOpening[] {
  if (poly.length < 3) return [];
  return openings
    .map((o) => {
      const rad = (o.heading * Math.PI) / 180;
      const ray = { x: Math.sin(rad), y: Math.cos(rad) };
      let bestWall = -1;
      let bestOffset = 0;
      let bestT = Infinity;
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i]!;
        const b = poly[(i + 1) % poly.length]!;
        const hit = raySegment(ray, a, b);
        if (hit && hit.t > 0.05 && hit.t < bestT) {
          bestT = hit.t;
          bestWall = i;
          bestOffset = hit.u * Math.hypot(b.x - a.x, b.y - a.y);
        }
      }
      if (bestWall < 0) return null;
      const a = poly[bestWall]!;
      const b = poly[(bestWall + 1) % poly.length]!;
      const wallLength = Math.hypot(b.x - a.x, b.y - a.y);
      const offset = Math.max(0, Math.min(wallLength - o.width, bestOffset - o.width / 2));
      return { ...o, wall: bestWall, offset: round2(offset) };
    })
    .filter((o): o is WallOpening => o !== null);
}

/** Where a ray from the origin crosses a wall segment. */
function raySegment(dir: Pt, a: Pt, b: Pt): { t: number; u: number } | null {
  const ex = b.x - a.x;
  const ey = b.y - a.y;
  const denom = dir.x * ey - dir.y * ex;
  if (Math.abs(denom) < 1e-9) return null;
  const t = (a.x * ey - a.y * ex) / denom;
  const u = (a.x * dir.y - a.y * dir.x) / denom;
  if (u < 0 || u > 1 || t <= 0) return null;
  return { t, u };
}
