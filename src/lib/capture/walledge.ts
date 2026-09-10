import { horizonRow, type Intrinsics } from './intrinsics';

/**
 * A column of the frame, read from floor to ceiling.
 *
 * The floor line and the ceiling line bound the wall. Everything between them
 * belongs to that wall, so a window or a door shows up there as a run of rows
 * that does not match the wall around it.
 */

export interface ColumnRead {
  x: number;
  /** Row where the wall meets the floor. */
  floorY: number;
  floorStrength: number;
  /** Row where the wall meets the ceiling, when it is in frame. */
  ceilingY: number | null;
  ceilingStrength: number;
  /** Runs of rows on the wall that differ from it, brightest first. */
  openings: { topY: number; bottomY: number; contrast: number; brighter: boolean }[];
}

export interface ReadOptions {
  columns?: number;
  window?: number;
  floorThreshold?: number;
  ceilingThreshold?: number;
  openingThreshold?: number;
}

/** Grayscale of a downscaled frame, row-major. */
export function toLuma(image: ImageData): Float32Array {
  const { data, width, height } = image;
  const out = new Float32Array(width * height);
  for (let i = 0, p = 0; i < out.length; i++, p += 4) {
    out[i] = 0.299 * data[p]! + 0.587 * data[p + 1]! + 0.114 * data[p + 2]!;
  }
  return out;
}

function verticalStep(luma: Float32Array, w: number, x: number, y: number, win: number): number {
  let above = 0;
  let below = 0;
  for (let i = 1; i <= win; i++) {
    above += luma[(y - i) * w + x]!;
    below += luma[(y + i) * w + x]!;
  }
  return (below - above) / win;
}

/** Read one frame column by column: floor, ceiling and whatever sits on the wall. */
export function readColumns(
  luma: Float32Array,
  k: Intrinsics,
  pitchDepression: number,
  opts: ReadOptions = {},
): ColumnRead[] {
  const columns = opts.columns ?? 40;
  const win = opts.window ?? 4;
  const floorThreshold = opts.floorThreshold ?? 10;
  const ceilingThreshold = opts.ceilingThreshold ?? 9;
  const openingThreshold = opts.openingThreshold ?? 26;

  const w = k.width;
  const h = k.height;
  const horizon = horizonRow(k, pitchDepression);
  const floorTop = Math.max(win + 1, Math.ceil(horizon) + 6);
  const floorBottom = h - win - 2;
  const ceilingTop = win + 1;
  const ceilingBottom = Math.min(h - win - 2, Math.floor(horizon) - 6);

  const step = Math.max(1, Math.floor(w / columns));
  const out: ColumnRead[] = [];

  for (let x = Math.floor(step / 2); x < w; x += step) {
    // Floor: walk up from the bottom, take the first strong join.
    let floorY = -1;
    let floorStrength = 0;
    for (let y = floorBottom; y > floorTop; y--) {
      const s = Math.abs(verticalStep(luma, w, x, y, win));
      if (s > floorStrength) {
        floorStrength = s;
        floorY = y;
      }
      if (s > floorThreshold * 2.2) {
        floorStrength = s;
        floorY = y;
        break;
      }
    }
    if (floorY < 0 || floorStrength < floorThreshold) continue;

    // Ceiling: walk down from the top, same idea the other way round.
    let ceilingY: number | null = null;
    let ceilingStrength = 0;
    if (ceilingBottom - ceilingTop > 6) {
      for (let y = ceilingTop; y < ceilingBottom; y++) {
        const s = Math.abs(verticalStep(luma, w, x, y, win));
        if (s > ceilingStrength) {
          ceilingStrength = s;
          ceilingY = y;
        }
        if (s > ceilingThreshold * 2.2) {
          ceilingStrength = s;
          ceilingY = y;
          break;
        }
      }
      if (ceilingStrength < ceilingThreshold) ceilingY = null;
    }

    out.push({
      x,
      floorY,
      floorStrength,
      ceilingY,
      ceilingStrength,
      openings: findOpenings(luma, w, x, ceilingY ?? ceilingTop, floorY, openingThreshold),
    });
  }
  return out;
}

/**
 * Runs on the wall that stand out from it. A window is much brighter than the
 * plaster around it; a door is usually a clear step the other way.
 */
function findOpenings(
  luma: Float32Array,
  w: number,
  x: number,
  topY: number,
  bottomY: number,
  threshold: number,
): ColumnRead['openings'] {
  const from = Math.max(1, Math.floor(topY) + 2);
  const to = Math.max(from + 4, Math.floor(bottomY) - 2);
  if (to - from < 8) return [];

  const values: number[] = [];
  for (let y = from; y < to; y++) values.push(luma[y * w + x]!);
  const wallLevel = median(values);

  const runs: ColumnRead['openings'] = [];
  let start = -1;
  let brighter = false;
  let peak = 0;

  for (let i = 0; i < values.length; i++) {
    const diff = values[i]! - wallLevel;
    const hit = Math.abs(diff) > threshold;
    if (hit && start < 0) {
      start = i;
      brighter = diff > 0;
      peak = Math.abs(diff);
    } else if (hit && start >= 0) {
      peak = Math.max(peak, Math.abs(diff));
    } else if (!hit && start >= 0) {
      if (i - start >= 4) {
        runs.push({ topY: from + start, bottomY: from + i, contrast: peak, brighter });
      }
      start = -1;
    }
  }
  if (start >= 0 && values.length - start >= 4) {
    runs.push({ topY: from + start, bottomY: to, contrast: peak, brighter });
  }
  return runs.sort((a, b) => b.contrast - a.contrast).slice(0, 2);
}

export function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}
