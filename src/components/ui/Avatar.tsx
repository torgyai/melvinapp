'use client';

import { avatarSrc } from '@/data/profiles';
import type { Profile } from '@/lib/types';

export function Avatar({ profile, className = 'chip-avatar' }: { profile: Profile; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={className} src={avatarSrc(profile)} alt="" />;
}
