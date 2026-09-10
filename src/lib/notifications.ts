import { SLA_TARGET_DAYS } from './domain';
import { fmtNum, parseNlDate } from './format';
import type { Profile, Property } from './types';

export type NotifLevel = 'lead' | 'critical' | 'warning' | 'info';

export interface Notification {
  level: NotifLevel;
  text: string;
  sub: string;
  propertyId: string;
}

export function computeNotifications(properties: Property[], profiles: Profile[], today = new Date()): Notification[] {
  const items: Notification[] = [];
  const nameOf = (id: string | null) => profiles.find((x) => x.id === id)?.name ?? null;

  properties.forEach((p) => {
    if (p.lifecycle === 'done') return;

    if (p.leadSource === 'publiek') {
      items.push({
        level: 'lead',
        text: `Nieuwe lead via de website: ${p.address}, ${p.city}`,
        sub: `${p.leadContact ? p.leadContact.naam + ' · ' : ''}indicatie ${p.leadIndicatie?.label ?? '?'} · nog niet toegewezen`,
        propertyId: p.id,
      });
      return;
    }

    if (p.meetrapport?.inmeetdatum) {
      const daysOpen = Math.round((today.getTime() - parseNlDate(p.meetrapport.inmeetdatum).getTime()) / 86400000);
      const daysLeft = SLA_TARGET_DAYS - daysOpen;
      const who = nameOf(p.assignedTo);
      if (daysLeft <= 0) {
        items.push({
          level: 'critical',
          text: `SLA overschreden: ${p.address}, ${p.city}`,
          sub: `${fmtNum(Math.abs(daysLeft))} dagen te laat · ${who ?? 'niet toegewezen'}`,
          propertyId: p.id,
        });
      } else if (daysLeft <= 5) {
        items.push({
          level: 'warning',
          text: `SLA verloopt over ${daysLeft} dag${daysLeft === 1 ? '' : 'en'}: ${p.address}, ${p.city}`,
          sub: who ?? 'Niet toegewezen',
          propertyId: p.id,
        });
      }
    }

    if (!p.assignedTo) {
      items.push({
        level: 'info',
        text: `Nog niet toegewezen aan een adviseur: ${p.address}, ${p.city}`,
        sub: 'Wijs een adviseur toe via het pand',
        propertyId: p.id,
      });
    }
  });

  const order: Record<NotifLevel, number> = { lead: 0, critical: 1, warning: 2, info: 3 };
  return items.sort((a, b) => order[a.level] - order[b.level]);
}

export function notifIcon(level: NotifLevel): string {
  if (level === 'critical') return '⚠';
  if (level === 'warning') return '⏱';
  if (level === 'lead') return '🌐';
  return '👤';
}
