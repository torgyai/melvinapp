/**
 * Camera geometry for the sweep.
 *
 * Every pixel in the frame is a ray. Combine the ray's own angle with the way
 * the phone is pointing and you get a direction in the room; where that
 * direction meets the floor is a point, at a distance the phone's height and
 * the angle below the horizon decide.
 */

/** Typical rear-camera horizontal field of view on a phone, in degrees. */
export const DEFAULT_HFOV_DEG = 66;

export interface Intrinsics {
  width: number;
  height: number;
  cx: number;
  cy: number;
  /** Focal length in pixels. */
  f: number;
}

export function intrinsicsFor(width: number, height: number, hfovDeg = DEFAULT_HFOV_DEG): Intrinsics {
  const f = width / 2 / Math.tan((hfovDeg * Math.PI) / 360);
  return { width, height, cx: width / 2, cy: height / 2, f };
}

export interface RayAngles {
  /** Degrees below the horizon. */
  depression: number;
  /** Degrees clockwise from the phone's own heading. */
  bearingOffset: number;
}

/**
 * Angles of the ray through one pixel, given how far the phone is tilted down
 * (`pitchDepression`, degrees below the horizon at the centre of the frame).
 */
export function rayAngles(k: Intrinsics, x: number, y: number, pitchDepression: number): RayAngles {
  const dx = x - k.cx;
  const dy = y - k.cy;
  const bearingOffset = (Math.atan2(dx, k.f) * 180) / Math.PI;
  const drop = (Math.atan2(dy, Math.hypot(k.f, dx)) * 180) / Math.PI;
  return { depression: pitchDepression + drop, bearingOffset };
}

/** The image row where the floor plane vanishes. Nothing below the floor exists above it. */
export function horizonRow(k: Intrinsics, pitchDepression: number): number {
  return k.cy - k.f * Math.tan((pitchDepression * Math.PI) / 180);
}
