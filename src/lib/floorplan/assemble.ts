import type { Pt, Room } from '@/lib/types';
import { bbox, boxesOverlap, polygonArea, rectangle, regularize, translate, type Box } from './geometry';

export interface PlacedRoom {
  name: string;
  area: number;
  poly: Pt[];
  box: Box;
  /** True when the capture gave real coordinates rather than an estimate. */
  measured: boolean;
}

export interface AssembledFloor {
  name: string;
  rooms: PlacedRoom[];
  box: Box;
  /** True when every room came in with real geometry on a shared origin. */
  surveyed: boolean;
}

/**
 * Rooms captured in one continuous AR walk share an origin, so their outlines
 * already sit in the right place relative to each other. Rooms captured one at a
 * time do not, and get packed into a plausible plan instead.
 */
export function assembleFloor(name: string, rooms: Room[]): AssembledFloor {
  const withGeometry = rooms.filter((r) => r.poly && r.poly.length >= 3);
  const shareOrigin = withGeometry.length === rooms.length && rooms.length > 0 && hasDistinctOrigins(rooms);

  const placed: PlacedRoom[] = shareOrigin ? placeMeasured(rooms) : packRooms(rooms);
  const box = unionBox(placed.map((r) => r.box));
  return { name, rooms: placed, box, surveyed: shareOrigin };
}

function hasDistinctOrigins(rooms: Room[]): boolean {
  // If every room starts at (0,0) it was traced on its own; nothing ties them together.
  const origins = rooms.map((r) => r.poly![0]!);
  const allAtZero = origins.every((o) => Math.abs(o.x) < 0.01 && Math.abs(o.y) < 0.01);
  return !allAtZero;
}

function placeMeasured(rooms: Room[]): PlacedRoom[] {
  return rooms.map((r) => {
    const poly = regularize(r.poly!);
    return { name: r.name, area: r.area || round1(polygonArea(poly)), poly, box: bbox(poly), measured: true };
  });
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Shelf packing with a house-shaped aspect ratio. Rooms keep their own outline
 * when they have one; the rest become rectangles sized from their m2 with a
 * proportion that reads like a real room.
 */
export function packRooms(rooms: Room[]): PlacedRoom[] {
  const prepared = rooms.map((r) => {
    if (r.poly && r.poly.length >= 3) {
      const poly = regularize(r.poly);
      const b = bbox(poly);
      return { name: r.name, area: r.area || round1(polygonArea(poly)), poly: translate(poly, -b.minX, -b.minY), measured: true };
    }
    const ratio = aspectFor(r.name);
    const w = Math.sqrt(r.area * ratio);
    const h = r.area / w;
    return { name: r.name, area: r.area, poly: rectangle(round2(w), round2(h)), measured: false };
  });

  // Largest first, so the living space anchors the plan.
  const order = [...prepared].sort((a, b) => b.area - a.area);
  const totalArea = order.reduce((s, r) => s + r.area, 0);
  const targetWidth = Math.max(4, Math.sqrt(totalArea * 1.35));

  const gap = 0.12; // wall thickness between rooms
  const placed: PlacedRoom[] = [];
  let shelfY = 0;
  let cursorX = 0;
  let shelfHeight = 0;

  for (const r of order) {
    const b = bbox(r.poly);
    if (cursorX > 0 && cursorX + b.w > targetWidth) {
      shelfY += shelfHeight + gap;
      cursorX = 0;
      shelfHeight = 0;
    }
    const poly = translate(r.poly, cursorX, shelfY);
    placed.push({ name: r.name, area: r.area, poly, box: bbox(poly), measured: r.measured });
    cursorX += b.w + gap;
    shelfHeight = Math.max(shelfHeight, b.h);
  }

  // Restore the caller's room order so the table below the plan stays readable.
  const byName = new Map<string, PlacedRoom[]>();
  placed.forEach((p) => {
    const list = byName.get(p.name) ?? [];
    list.push(p);
    byName.set(p.name, list);
  });
  return rooms.map((r) => byName.get(r.name)!.shift()!);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Width-to-depth proportions that make a packed plan read like a house. */
function aspectFor(name: string): number {
  const n = name.toLowerCase();
  if (/hal|entree|overloop|gang/.test(n)) return 3.2;
  if (/toilet/.test(n)) return 1.4;
  if (/badkamer|douche/.test(n)) return 1.3;
  if (/keuken|bijkeuken/.test(n)) return 1.6;
  if (/woonkamer/.test(n)) return 1.5;
  if (/garage|berging|schuur/.test(n)) return 1.7;
  if (/zolder/.test(n)) return 1.8;
  return 1.25;
}

export function unionBox(boxes: Box[]): Box {
  if (!boxes.length) return { minX: 0, minY: 0, maxX: 1, maxY: 1, w: 1, h: 1 };
  const minX = Math.min(...boxes.map((b) => b.minX));
  const minY = Math.min(...boxes.map((b) => b.minY));
  const maxX = Math.max(...boxes.map((b) => b.maxX));
  const maxY = Math.max(...boxes.map((b) => b.maxY));
  return { minX, minY, maxX, maxY, w: Math.max(maxX - minX, 0.01), h: Math.max(maxY - minY, 0.01) };
}

export function anyOverlap(rooms: PlacedRoom[]): boolean {
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      if (boxesOverlap(rooms[i]!.box, rooms[j]!.box, -0.05)) return true;
    }
  }
  return false;
}
