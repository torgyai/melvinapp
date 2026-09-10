import { fmtNum } from '@/lib/format';

export interface BarDatum {
  label: string;
  value: number;
}

export interface StackSegment {
  key: string;
  value: number;
  color: string;
}

export interface StackedDatum {
  label: string;
  segments: StackSegment[];
}

const PAD_L = 14;
const PAD_R = 14;
const PAD_T = 18;
const PAD_B = 22;
const GAP = 8;
const SEG_GAP = 2;

function geometry(width: number, height: number, n: number) {
  const innerW = width - PAD_L - PAD_R;
  const innerH = height - PAD_T - PAD_B;
  const barW = Math.max(4, (innerW - GAP * (Math.max(n, 1) - 1)) / Math.max(n, 1));
  return { innerW, innerH, barW, baseY: PAD_T + innerH };
}

function Axis({ innerW, baseY }: { innerW: number; baseY: number }) {
  return <line x1={PAD_L} y1={baseY} x2={PAD_L + innerW} y2={baseY} stroke="var(--line)" strokeWidth={1} />;
}

function AxisLabel({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <text x={x} y={y} fontSize={10} fill="var(--ink-faint)" textAnchor="middle">
      {text}
    </text>
  );
}

function ValueLabel({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <text x={x} y={y} fontSize={10.5} fontWeight={700} fill="var(--ink-soft)" textAnchor="middle">
      {text}
    </text>
  );
}

export function BarChart({
  data,
  width = 480,
  height = 170,
  color,
}: {
  data: BarDatum[];
  width?: number;
  height?: number;
  color?: string | ((d: BarDatum, i: number) => string);
}) {
  const { innerW, innerH, barW, baseY } = geometry(width, height, data.length);
  const max = Math.max(1, ...data.map((d) => d.value));
  const colorFor = typeof color === 'function' ? color : () => color || 'var(--teal-3)';

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
      <Axis innerW={innerW} baseY={baseY} />
      {data.map((d, i) => {
        const h = (d.value / max) * innerH;
        const x = PAD_L + i * (barW + GAP);
        const y = baseY - h;
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={barW} height={Math.max(h, 1)} rx={4} fill={colorFor(d, i)}>
              <title>{`${d.label}: ${d.value}`}</title>
            </rect>
            {d.value > 0 && <ValueLabel x={x + barW / 2} y={y - 6} text={fmtNum(d.value)} />}
            <AxisLabel x={x + barW / 2} y={baseY + 15} text={d.label} />
          </g>
        );
      })}
    </svg>
  );
}

export function StackedBarChart({
  data,
  width = 480,
  height = 170,
}: {
  data: StackedDatum[];
  width?: number;
  height?: number;
}) {
  const { innerW, innerH, barW, baseY } = geometry(width, height, data.length);
  const totals = data.map((d) => d.segments.reduce((s, x) => s + x.value, 0));
  const max = Math.max(1, ...totals);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
      <Axis innerW={innerW} baseY={baseY} />
      {data.map((d, i) => {
        const x = PAD_L + i * (barW + GAP);
        const visible = d.segments.filter((s) => s.value > 0);
        let cumH = 0;
        const rects = visible.map((seg, si) => {
          const h = (seg.value / max) * innerH;
          const drawH = Math.max(h - (si < visible.length - 1 ? SEG_GAP : 0), 1);
          const y = baseY - cumH - h;
          cumH += h;
          return (
            <rect key={seg.key} x={x} y={y} width={barW} height={drawH} rx={3} fill={seg.color}>
              <title>{`${d.label} (${seg.key}: ${seg.value})`}</title>
            </rect>
          );
        });
        return (
          <g key={d.label}>
            {rects}
            {totals[i]! > 0 && <ValueLabel x={x + barW / 2} y={baseY - cumH - 6} text={String(totals[i])} />}
            <AxisLabel x={x + barW / 2} y={baseY + 15} text={d.label} />
          </g>
        );
      })}
    </svg>
  );
}
