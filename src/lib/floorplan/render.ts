import { fmtNum } from '@/lib/format';
import type { Opening, Pt } from '@/lib/types';
import type { AssembledFloor, PlacedRoom } from './assemble';
import { bbox } from './geometry';

export interface RenderOptions {
  width?: number;
  height?: number;
  /** Draw the north arrow and scale bar. */
  chrome?: boolean;
  caption?: string;
  /** Compass heading in degrees for the plan's up direction. */
  north?: number;
}

const ROOM_FILL_STYLES: { re: RegExp; fill: string; ink: string }[] = [
  { re: /garage|berging|schuur|kast|zolder(?!kamer)|bergruimte/i, fill: '#d6d6d2', ink: '#3a3a37' },
  { re: /keuken|badkamer|douche|toilet|bijkeuken|wasruimte/i, fill: '#bfdcec', ink: '#0d3a52' },
  { re: /entree|hal|overloop|gang/i, fill: '#f3bd80', ink: '#5a3300' },
];

export function roomFillStyle(name: string): { fill: string; ink: string } {
  for (const s of ROOM_FILL_STYLES) if (s.re.test(name)) return { fill: s.fill, ink: s.ink };
  return { fill: '#f0dcae', ink: '#4a3510' };
}

/**
 * Draw an assembled floor in the house style: black walls, coloured rooms,
 * name and area centred in each room, north arrow and metric scale bar.
 */
export function renderFloorSvg(floor: AssembledFloor, opts: RenderOptions = {}): string {
  const W = opts.width ?? 900;
  const chrome = opts.chrome ?? true;
  const pad = 26;
  const captionH = chrome ? 44 : 12;

  const b = floor.box;
  const usableW = W - pad * 2;
  const pxPerM = usableW / b.w;
  const H = Math.round(b.h * pxPerM + pad * 2 + captionH);

  const toPx = (p: Pt): Pt => ({ x: (p.x - b.minX) * pxPerM + pad, y: (p.y - b.minY) * pxPerM + pad });

  const outline = `<rect x="6" y="6" width="${W - 12}" height="${H - 12 - captionH}" rx="4" fill="#fbfaf6" stroke="none"/>`;

  const rooms = floor.rooms.map((r) => renderRoom(r, toPx, pxPerM)).join('');
  const chromeSvg = chrome ? northArrow(W - pad - 22, pad + 22, opts.north ?? 0) + scaleBar(W - pad, H - captionH + 10, pxPerM) : '';
  const caption = chrome
    ? `<text x="${pad}" y="${H - 12}" font-size="11" fill="#5b6c6a">${escapeXml(
        opts.caption ?? `${floor.name} · ${fmtNum(floorTotal(floor))} m²`,
      )}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Plattegrond ${escapeXml(floor.name)}">${outline}${rooms}${chromeSvg}${caption}</svg>`;
}

function floorTotal(floor: AssembledFloor): number {
  return Math.round(floor.rooms.reduce((s, r) => s + r.area, 0) * 10) / 10;
}

function renderRoom(r: PlacedRoom, toPx: (p: Pt) => Pt, pxPerM: number): string {
  const style = roomFillStyle(r.name);
  const pts = r.poly.map(toPx);
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z';
  const c = toPx(labelAnchor(r));
  // Tekstgrootte in meters, zodat het label meeschaalt met de tekening en ook
  // leesbaar blijft als de plattegrond klein wordt afgebeeld.
  const rb = bbox(r.poly);
  const nameMetres = Math.min(0.34, rb.w / 6, rb.h / 3);
  const fontSize = Math.max(8, nameMetres * pxPerM);

  const openings = (r.openings ?? []).map((o) => renderOpening(r, o, toPx, pxPerM)).join('');

  return (
    `<path d="${d}" fill="${style.fill}" stroke="#161615" stroke-width="${Math.max(1.6, pxPerM * 0.055).toFixed(2)}" stroke-linejoin="miter"/>` +
    openings +
    `<text x="${c.x.toFixed(1)}" y="${(c.y - 3).toFixed(1)}" font-size="${fontSize.toFixed(1)}" font-weight="700" fill="${style.ink}" text-anchor="middle">${escapeXml(r.name)}</text>` +
    `<text x="${c.x.toFixed(1)}" y="${(c.y + fontSize).toFixed(1)}" font-size="${(fontSize * 0.85).toFixed(1)}" fill="${style.ink}" text-anchor="middle" opacity=".85">${fmtNum(r.area)} m²</text>`
  );
}

/** Openings are drawn as a white gap in the wall plus a door swing. */
function renderOpening(r: PlacedRoom, o: Opening, toPx: (p: Pt) => Pt, pxPerM: number): string {
  const a = r.poly[o.wall];
  const bpt = r.poly[(o.wall + 1) % r.poly.length];
  if (!a || !bpt) return '';
  const len = Math.hypot(bpt.x - a.x, bpt.y - a.y);
  if (len <= 0) return '';
  const ux = (bpt.x - a.x) / len;
  const uy = (bpt.y - a.y) / len;
  const start = { x: a.x + ux * o.offset, y: a.y + uy * o.offset };
  const end = { x: start.x + ux * o.width, y: start.y + uy * o.width };
  const p1 = toPx(start);
  const p2 = toPx(end);
  const gap = `<line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" stroke="#fbfaf6" stroke-width="${Math.max(2.2, pxPerM * 0.075).toFixed(2)}" stroke-linecap="butt"/>`;
  if (o.kind === 'raam') {
    return (
      gap +
      `<line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" stroke="#161615" stroke-width="1" />`
    );
  }
  if (o.kind === 'doorgang') return gap;
  const radius = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  const nx = -uy;
  const ny = ux;
  const swingEnd = { x: p1.x + nx * radius, y: p1.y + ny * radius };
  return (
    gap +
    `<path d="M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} L ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}" stroke="#161615" stroke-width="1"/>` +
    `<path d="M ${p2.x.toFixed(1)} ${p2.y.toFixed(1)} A ${radius.toFixed(1)} ${radius.toFixed(1)} 0 0 1 ${swingEnd.x.toFixed(1)} ${swingEnd.y.toFixed(1)}" fill="none" stroke="#161615" stroke-width="0.8" stroke-dasharray="3 3"/>`
  );
}

/** Put the label in the middle of the largest inscribed box, so L-shaped rooms still read. */
function labelAnchor(r: PlacedRoom): Pt {
  const b = bbox(r.poly);
  const centre = { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
  if (pointInPolygon(centre, r.poly)) return centre;
  // Fall back to the vertex-average, which stays inside for simple concave shapes.
  const n = r.poly.length;
  return { x: r.poly.reduce((s, p) => s + p.x, 0) / n, y: r.poly.reduce((s, p) => s + p.y, 0) / n };
}

export function pointInPolygon(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    const intersects = a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

function northArrow(x: number, y: number, heading: number): string {
  return (
    `<g transform="translate(${x},${y}) rotate(${(-heading).toFixed(1)})">` +
    '<circle r="16" fill="#f6f4ee" stroke="#e2ded2"/>' +
    '<path d="M0 -10 L5 4 L0 1 L-5 4 Z" fill="#f8ac01"/>' +
    '<text x="0" y="14" font-size="9" text-anchor="middle" fill="#5b6c6a">N</text>' +
    '</g>'
  );
}

/** Right-aligned, so it never collides with the caption on the left. */
function scaleBar(right: number, y: number, pxPerM: number): string {
  const metres = niceStep(60 / pxPerM);
  const w = metres * pxPerM;
  const labelWidth = 34;
  return (
    `<g transform="translate(${(right - w - labelWidth).toFixed(1)},${y})">` +
    `<line x1="0" y1="6" x2="${w.toFixed(1)}" y2="6" stroke="#5b6c6a" stroke-width="1.4"/>` +
    `<line x1="0" y1="2" x2="0" y2="10" stroke="#5b6c6a" stroke-width="1.4"/>` +
    `<line x1="${w.toFixed(1)}" y1="2" x2="${w.toFixed(1)}" y2="10" stroke="#5b6c6a" stroke-width="1.4"/>` +
    `<text x="${(w + 6).toFixed(1)}" y="9.5" font-size="9.5" fill="#8d9a98">${fmtNum(metres)} m</text>` +
    '</g>'
  );
}

function niceStep(raw: number): number {
  const steps = [1, 2, 2.5, 5, 10, 20, 25, 50];
  for (const s of steps) if (raw <= s) return s;
  return 100;
}

export function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!);
}
