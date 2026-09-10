import type { LabelKey, OutputMode, Property, Profile, StatusKey } from './types';

export const LABELS: { k: LabelKey; c: string; w: number }[] = [
  { k: 'A', c: 'var(--lg-a)', w: 56 },
  { k: 'B', c: 'var(--lg-b)', w: 64 },
  { k: 'C', c: 'var(--lg-c)', w: 72 },
  { k: 'D', c: 'var(--lg-d)', w: 80 },
  { k: 'E', c: 'var(--lg-e)', w: 88 },
  { k: 'F', c: 'var(--lg-f)', w: 96 },
  { k: 'G', c: 'var(--lg-g)', w: 104 },
];

export function labelColor(k: string): string {
  return LABELS.find((l) => l.k === k)?.c ?? '#9aa6a4';
}

export const PIPELINE: { id: string; label: string; modes: OutputMode[] }[] = [
  { id: 'scan', label: "Scan en foto's inladen", modes: ['both', 'plattegrond', 'label'] },
  { id: 'foto', label: "Foto's afwerken in huisstijl (lichtcorrectie, opschonen)", modes: ['both', 'plattegrond', 'label'] },
  { id: 'video', label: 'Video samenstellen', modes: ['both', 'plattegrond', 'label'] },
  { id: 'cloud', label: 'Pointcloud verwerken (gebruiksoppervlaktes NEN 2580)', modes: ['both', 'plattegrond', 'label'] },
  { id: 'plan', label: 'Plattegrond opbouwen in huisstijl', modes: ['both', 'plattegrond'] },
  { id: 'nta', label: 'NTA 8800-energieberekening voorbereiden', modes: ['both', 'label'] },
  { id: 'vabi', label: 'Vabi-bestand klaarzetten', modes: ['both', 'label'] },
  { id: 'ready', label: 'Klaargezet voor controle door adviseur', modes: ['both', 'plattegrond', 'label'] },
];

export const MODES: { id: OutputMode; title: string; sub: string; tag: string; icon: string }[] = [
  {
    id: 'both',
    title: 'Energielabel + Plattegrond',
    sub: '2-in-1 uit dezelfde opname',
    tag: 'Aanbevolen',
    icon: '<path d="M4 21V9l8-6 8 6v12" stroke="white" stroke-width="1.8" fill="none" stroke-linejoin="round"/><path d="M9 21v-6h6v6" stroke="white" stroke-width="1.8" fill="none"/>',
  },
  {
    id: 'plattegrond',
    title: 'Alleen plattegrond',
    sub: 'Plattegrond en NEN 2580-rapport',
    tag: '',
    icon: '<rect x="4" y="5" width="16" height="14" rx="1.5" stroke="white" stroke-width="1.8" fill="none"/><path d="M4 12h9M13 5v14" stroke="white" stroke-width="1.8"/>',
  },
  {
    id: 'label',
    title: 'Alleen energielabel',
    sub: 'Energieberekening, geen plattegrond',
    tag: '',
    icon: '<path d="M3 12l8-8h7a2 2 0 0 1 2 2v7l-8 8a1.5 1.5 0 0 1-2 0l-7-7a1.5 1.5 0 0 1 0-2z" stroke="white" stroke-width="1.8" fill="none" stroke-linejoin="round"/><circle cx="15" cy="8" r="1.4" fill="white"/>',
  },
];

export const MODE_LABELS: Record<OutputMode, string> = {
  both: 'Plattegrond + Energielabel',
  plattegrond: 'Alleen plattegrond',
  label: 'Alleen energielabel',
};

export const STATUS_MAP: Record<StatusKey, { label: string }> = {
  wait: { label: 'Wacht op scan' },
  progress: { label: 'In verwerking' },
  ready: { label: 'Klaar voor controle' },
  done: { label: 'Afgemeld door adviseur' },
};

export const SLA_TARGET_DAYS = 21;
/** Days a property may stay open before the dashboard flags it. */
export const SLA_WARNING_DAYS = 14;
export const SLA_CRITICAL_DAYS = 30;
export const AVG_TARIEF = 450;

export function getStatus(p: Property): { key: StatusKey; label: string } {
  if (p.lifecycle === 'interactive') {
    const rt = p.runtime ?? { mode: null, processed: false, processing: false };
    if (rt.processing) return { key: 'progress', label: 'In verwerking' };
    if (rt.processed) return { key: 'ready', label: 'Klaar voor controle' };
    if (rt.mode) return { key: 'wait', label: 'Klaar om te starten' };
    return { key: 'wait', label: 'Nog niet gestart' };
  }
  const key = p.lifecycle as StatusKey;
  return { key, label: STATUS_MAP[key].label };
}

export function modeOf(p: Property): OutputMode | null {
  return p.lifecycle === 'interactive' ? p.runtime?.mode ?? null : p.fixedMode ?? 'both';
}

export function getModeLabel(p: Property): string {
  const m = modeOf(p);
  return m ? MODE_LABELS[m] : 'Nog te kiezen';
}

export function totalArea(p: Property): number {
  return (
    Math.round(
      p.floors.reduce((s, f) => s + f.rooms.reduce((s2, r) => s2 + r.area, 0), 0) * 10,
    ) / 10
  );
}

export function floorArea(rooms: { area: number }[]): number {
  return Math.round(rooms.reduce((s, r) => s + r.area, 0) * 10) / 10;
}

export function isAdmin(p: Profile | null | undefined): boolean {
  return p?.role === 'admin';
}

export function indexToLabel(idx: number): LabelKey {
  if (idx <= 1.0) return 'A';
  if (idx <= 1.3) return 'B';
  if (idx <= 1.6) return 'C';
  if (idx <= 1.9) return 'D';
  if (idx <= 2.1) return 'E';
  if (idx <= 2.4) return 'F';
  return 'G';
}
