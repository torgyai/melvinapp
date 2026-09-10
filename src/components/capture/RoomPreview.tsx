'use client';

import { previewPath } from '@/lib/capture/rooms';
import { fmtNum } from '@/lib/format';
import type { Pt } from '@/lib/types';

export function RoomPreview({ poly, area, size = 260 }: { poly: Pt[]; area: number; size?: number }) {
  const { d, points } = previewPath(poly, size);
  return (
    <svg className="cap-preview" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Vorm van de ruimte">
      {d && <path d={d} fill="rgba(248,172,1,.18)" stroke="#f8ac01" strokeWidth="2.5" strokeLinejoin="round" />}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="8" fill="#024847" stroke="#fff" strokeWidth="2" />
          <text x={p.x} y={p.y + 3.5} fontSize="10" fill="#fff" textAnchor="middle" fontWeight="700">
            {i + 1}
          </text>
        </g>
      ))}
      {poly.length > 2 && (
        <text x={size / 2} y={size - 6} fontSize="13" fontWeight="700" fill="#eef4f2" textAnchor="middle">
          {fmtNum(area)} m²
        </text>
      )}
    </svg>
  );
}
