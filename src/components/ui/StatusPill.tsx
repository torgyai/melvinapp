'use client';

import { getStatus } from '@/lib/domain';
import type { Property } from '@/lib/types';

export function StatusPill({ p, onClick }: { p: Property; onClick?: () => void }) {
  const st = getStatus(p);
  const clickable = st.key === 'done' && Boolean(p.signoff) && Boolean(onClick);
  return (
    <span
      className={`pill st-${st.key}${clickable ? ' pill-click' : ''}`}
      title={clickable ? 'Bekijk afmelddetails' : undefined}
      onClick={
        clickable
          ? (e) => {
              e.stopPropagation();
              onClick?.();
            }
          : undefined
      }
    >
      <span className="dot2" />
      {st.label}
    </span>
  );
}

export function LabelBars({ label }: { label: string | null }) {
  const LABELS = [
    { k: 'A', c: 'var(--lg-a)', w: 56 }, { k: 'B', c: 'var(--lg-b)', w: 64 }, { k: 'C', c: 'var(--lg-c)', w: 72 },
    { k: 'D', c: 'var(--lg-d)', w: 80 }, { k: 'E', c: 'var(--lg-e)', w: 88 }, { k: 'F', c: 'var(--lg-f)', w: 96 },
    { k: 'G', c: 'var(--lg-g)', w: 104 },
  ];
  return (
    <div className="label-wrap">
      {LABELS.map((l) => (
        <div key={l.k} className={`label-row${l.k === label ? ' match' : ''}`}>
          <div className="bar" style={{ width: `${l.w}%`, background: l.c }}>
            {l.k}
          </div>
        </div>
      ))}
    </div>
  );
}
