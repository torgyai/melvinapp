import { indexToLabel } from '@/lib/domain';
import { round1, round2, unitHash } from '@/lib/format';
import type { CaptureSession, Floor, LabelKey, Property, Room } from '@/lib/types';
import { assembleFloor, type AssembledFloor } from './assemble';
import { polygonArea, regularize } from './geometry';
import { renderFloorSvg } from './render';

export interface ProcessedFloor {
  floor: Floor;
  assembled: AssembledFloor;
  svg: string;
}

export interface ProcessedCapture {
  floors: Floor[];
  plans: ProcessedFloor[];
  totalArea: number;
  /** First estimate of the label, before the adviseur checks the calculation. */
  estimate: { label: LabelKey; index: number };
  warnings: string[];
}

/**
 * Turn an uploaded capture into floors, plans and a first label estimate.
 * Every measured room keeps its own outline; the areas come from the geometry,
 * not from anything typed in afterwards.
 */
export function processCapture(session: CaptureSession, property?: Property | null): ProcessedCapture {
  const warnings: string[] = [];
  const byFloor = new Map<string, Room[]>();

  for (const cr of session.rooms) {
    if (!cr.poly || cr.poly.length < 3) {
      warnings.push(`Ruimte "${cr.name}" heeft te weinig hoekpunten en is overgeslagen.`);
      continue;
    }
    const poly = regularize(cr.poly);
    const area = round1(polygonArea(poly));
    if (area < 0.4) {
      warnings.push(`Ruimte "${cr.name}" komt uit op ${area} m². Controleer de referentiemaat.`);
    }
    const floorName = cr.floorName?.trim() || 'Begane grond';
    const list = byFloor.get(floorName) ?? [];
    list.push({ name: cr.name, area, poly, height: cr.height, openings: cr.openings });
    byFloor.set(floorName, list);
  }

  const plans: ProcessedFloor[] = [];
  const floors: Floor[] = [];

  for (const [name, rooms] of byFloor) {
    const assembled = assembleFloor(name, rooms);
    if (!assembled.surveyed && rooms.length > 1) {
      warnings.push(
        `${name}: de ruimtes zijn los van elkaar opgenomen, dus de plattegrond is samengesteld op oppervlakte in plaats van op echte posities.`,
      );
    }
    const svg = renderFloorSvg(assembled, { caption: `${name} · ${round1(rooms.reduce((s, r) => s + r.area, 0))} m²` });
    plans.push({ floor: { name, rooms }, assembled, svg });
    floors.push({ name, rooms });
  }

  const totalArea = round1(floors.reduce((s, f) => s + f.rooms.reduce((s2, r) => s2 + r.area, 0), 0));
  return { floors, plans, totalArea, estimate: estimateEnergy(totalArea, property), warnings };
}

/**
 * A first index from area, build year and the heated volume, so a job has a
 * number to work with before the NTA 8800 run. Never a label on its own.
 */
export function estimateEnergy(area: number, property?: Property | null): { label: LabelKey; index: number } {
  const year = property?.year ?? 1995;
  const yearFactor = Math.min(Math.max(2026 - year, 0), 120) / 120;
  const areaFactor = Math.max(-0.08, Math.min(0.12, (area - 120) / 500));
  const noise = unitHash(`${property?.id ?? 'scan'}|${area}`);
  const idx = round2(Math.max(0.42, Math.min(2.4, 0.62 + yearFactor * 0.85 + areaFactor + (noise - 0.5) * 0.1)));
  return { label: indexToLabel(idx), index: idx };
}

/** Draw a floor that is already stored on a property. */
export function renderFloorFromRooms(name: string, rooms: Room[]): string {
  const clean = rooms.map((r) =>
    r.poly && r.poly.length >= 3 ? { ...r, poly: regularize(r.poly) } : r,
  );
  return renderFloorSvg(assembleFloor(name, clean));
}
