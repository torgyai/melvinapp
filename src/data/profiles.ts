import type { Profile } from '@/lib/types';

export const PROFILES: Profile[] = [
  { id: 'melvin', name: 'Melvin Krikke', role: 'admin', roleNl: 'Admin', roleEn: 'Admin', email: 'melvin@krikjeenergielabelop.nl', phone: '06 - 51 22 34 09', avatarColor: '#024847' },
  { id: 'sanne', name: 'Sanne Visser', role: 'adviseur', roleNl: 'Adviseur', roleEn: 'Advisor', email: 'sanne@krikjeenergielabelop.nl', phone: '06 - 24 87 15 63', avatarColor: '#057a77' },
  { id: 'bram', name: 'Bram de Vries', role: 'adviseur', roleNl: 'Adviseur', roleEn: 'Advisor', email: 'bram@krikjeenergielabelop.nl', phone: '06 - 33 90 47 21', avatarColor: '#1baf7a' },
  { id: 'femke', name: 'Femke Dijkstra', role: 'adviseur', roleNl: 'Adviseur', roleEn: 'Advisor', email: 'femke@krikjeenergielabelop.nl', phone: '06 - 18 65 29 74', avatarColor: '#c98500' },
  { id: 'ruben', name: 'Ruben Postma', role: 'adviseur', roleNl: 'Adviseur', roleEn: 'Advisor', email: 'ruben@krikjeenergielabelop.nl', phone: '06 - 47 12 88 36', avatarColor: '#d5568a' },
  { id: 'anja', name: 'Anja Bosma', role: 'administratie', roleNl: 'Administratie', roleEn: 'Administration', email: 'anja@krikjeenergielabelop.nl', phone: '06 - 29 55 61 08', avatarColor: '#6b5ca5' },
];

export function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter((w) => /^[A-Za-zÀ-ÿ]/.test(w))
    .map((w) => w[0]!.toUpperCase())
    .slice(0, 2)
    .join('');
}

/** Inline SVG avatar so the app has no external image dependency. */
export function avatarSrc(p: Pick<Profile, 'name' | 'avatarColor' | 'avatarUrl'>): string {
  if (p.avatarUrl) return p.avatarUrl;
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
    `<rect width="100" height="100" rx="50" fill="${p.avatarColor}"/>` +
    '<text x="50" y="52" font-family="Arial, Helvetica, sans-serif" font-size="38" font-weight="700" ' +
    `fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${initialsOf(p.name)}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

export function profileById(id: string | null | undefined): Profile | null {
  if (!id) return null;
  return PROFILES.find((p) => p.id === id) ?? null;
}
