import { MAX_RANGE_M, MIN_DEPRESSION_DEG, distanceFromSighting, normaliseDeg } from './sighting';
import { rayAngles, type Intrinsics } from './intrinsics';
import type { EdgeSample } from './flooredge';
import type { Pt } from '@/lib/types';

/**
 * The sweep builds a polar profile of the room: for every direction, how far
 * away the wall is. Turning on the spot fills it in. Each frame contributes a
 * whole slice of directions at once, so nothing has to be tapped.
 */

const BIN_DEG = 2;
const BIN_COUNT = 360 / BIN_DEG;
const MIN_SAMPLES_PER_BIN = 3;

export interface SweepBin {
  /** Every radius measured for this direction, kept so the median can be taken. */
  radii: number[];
  weight: number;
}

export class SweepAccumulator {
  private bins: SweepBin[] = Array.from({ length: BIN_COUNT }, () => ({ radii: [], weight: 0 }));

  add(headingDeg: number, radius: number, weight: number): void {
    const i = Math.floor(normaliseDeg(headingDeg) / BIN_DEG) % BIN_COUNT;
    const bin = this.bins[i]!;
    bin.radii.push(radius);
    bin.weight += weight;
    if (bin.radii.length > 40) bin.radii.shift();
  }

  /** Fraction of directions that have enough samples to be trusted. */
  coverage(): number {
    const filled = this.bins.filter((b) => b.radii.length >= MIN_SAMPLES_PER_BIN).length;
    return filled / BIN_COUNT;
  }

  filledBins(): number {
    return this.bins.filter((b) => b.radii.length >= MIN_SAMPLES_PER_BIN).length;
  }

  reset(): void {
    this.bins = Array.from({ length: BIN_COUNT }, () => ({ radii: [], weight: 0 }));
  }

  /**
   * The outline so far. Directions with too few samples are skipped, which is
   * what leaves a gap in the drawing where the surveyor has not turned yet.
   */
  outline(): Pt[] {
    const pts: Pt[] = [];
    for (let i = 0; i < BIN_COUNT; i++) {
      const bin = this.bins[i]!;
      if (bin.radii.length < MIN_SAMPLES_PER_BIN) continue;
      const r = median(bin.radii);
      const rad = ((i * BIN_DEG + BIN_DEG / 2) * Math.PI) / 180;
      pts.push({ x: r * Math.sin(rad), y: r * Math.cos(rad) });
    }
    return pts;
  }

  /** True once the surveyor has turned far enough for a closed room. */
  complete(): boolean {
    return this.coverage() >= 0.9;
  }
}

export function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

export interface FrameContribution {
  added: number;
  rejected: number;
}

/** Feed one frame's floor edges into the profile. */
export function addFrame(
  acc: SweepAccumulator,
  samples: EdgeSample[],
  k: Intrinsics,
  pitchDepression: number,
  heading: number,
  cameraHeight: number,
): FrameContribution {
  let added = 0;
  let rejected = 0;
  for (const s of samples) {
    const { depression, bearingOffset } = rayAngles(k, s.x, s.y, pitchDepression);
    if (depression <= MIN_DEPRESSION_DEG) {
      rejected++;
      continue;
    }
    const d = distanceFromSighting(depression, cameraHeight);
    if (d === null || d > MAX_RANGE_M) {
      rejected++;
      continue;
    }
    acc.add(heading + bearingOffset, d, s.strength);
    added++;
  }
  return { added, rejected };
}
