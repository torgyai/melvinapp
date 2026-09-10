/**
 * Wordmark drawn in code: the house with the energy-label bars running up the
 * left, in the teal and amber of the brand. No binary asset needed.
 */
export function Logo({ height = 38, mono = false }: { height?: number; mono?: boolean }) {
  const bars = ['#e13b2e', '#ef7f1a', '#f8ac01', '#a9c92c', '#4fa832', '#0a7d3b'];
  return (
    <svg viewBox="0 0 220 74" height={height} role="img" aria-label="Krik je energielabel op">
      <g transform="translate(2,6)">
        {bars.map((c, i) => (
          <rect key={i} x={0} y={52 - i * 8.5} width={10 + i * 5.5} height={6.4} rx={1.6} fill={mono ? '#024847' : c} />
        ))}
        <path d="M42 58V28L64 10l22 18v30z" fill="none" stroke="#024847" strokeWidth="4" strokeLinejoin="round" />
        <path d="M56 58V42h16v16" fill="none" stroke="#024847" strokeWidth="4" strokeLinejoin="round" />
      </g>
      <text x="100" y="34" fontFamily="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif" fontSize="17" fontWeight="800" fill="#024847">
        Krik je
      </text>
      <text x="100" y="54" fontFamily="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif" fontSize="17" fontWeight="800" fill="#f8ac01">
        energielabel op
      </text>
    </svg>
  );
}
