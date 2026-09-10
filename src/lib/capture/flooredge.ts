import { horizonRow, type Intrinsics } from './intrinsics';

/**
 * Where the floor stops and the wall starts, found per column of the frame.
 *
 * Looking down into a room, the floor fills the bottom of the picture and the
 * wall the top. The join is the strongest horizontal change in brightness
 * between the two, and that join is what the sweep measures.
 */

export interface EdgeSample {
  x: number;
  y: number;
  /** Strength of the join at that pixel, used to weight and to reject. */
  strength: number;
}

export interface EdgeOptions {
  /** How many columns to test across the frame. */
  columns?: number;
  /** Half-height of the comparison window, in pixels. */
  window?: number;
  /** Minimum brightness difference between wall and floor, 0-255. */
  threshold?: number;
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

export function findFloorEdges(
  luma: Float32Array,
  k: Intrinsics,
  pitchDepression: number,
  opts: EdgeOptions = {},
): EdgeSample[] {
  const columns = opts.columns ?? 48;
  const win = opts.window ?? 4;
  const threshold = opts.threshold ?? 10;

  const w = k.width;
  const h = k.height;
  const horizon = horizonRow(k, pitchDepression);
  // Stay a little below the horizon: right at it the distance blows up.
  const top = Math.max(win + 1, Math.ceil(horizon) + 6);
  const bottom = h - win - 2;
  if (bottom - top < 8) return [];

  const step = Math.max(1, Math.floor(w / columns));
  const samples: EdgeSample[] = [];

  for (let x = Math.floor(step / 2); x < w; x += step) {
    let bestY = -1;
    let bestStrength = 0;
    // Walk up from the floor. The first strong join is the one that bounds it.
    for (let y = bottom; y > top; y--) {
      let above = 0;
      let below = 0;
      for (let i = 1; i <= win; i++) {
        above += luma[(y - i) * w + x]!;
        below += luma[(y + i) * w + x]!;
      }
      const strength = Math.abs(below / win - above / win);
      if (strength > bestStrength) {
        bestStrength = strength;
        bestY = y;
      }
      // A join clearly stronger than anything below it is the wall foot.
      if (strength > threshold * 2.2) {
        bestStrength = strength;
        bestY = y;
        break;
      }
    }
    if (bestY > 0 && bestStrength >= threshold) {
      samples.push({ x, y: bestY, strength: bestStrength });
    }
  }
  return samples;
}
