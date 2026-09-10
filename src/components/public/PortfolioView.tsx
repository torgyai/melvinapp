import Link from 'next/link';
import { Logo } from '@/components/platform/Logo';
import { getStatus, labelColor } from '@/lib/domain';
import type { Property } from '@/lib/types';

function BackLink() {
  return (
    <Link
      className="ghost-btn"
      href="/overzicht"
      style={{ marginBottom: 14, padding: '8px 14px', fontSize: 12.5, textDecoration: 'none' }}
    >
      ← Terug
    </Link>
  );
}

export function PortfolioView({ properties }: { properties: Property[] }) {
  if (properties.length === 0) {
    return (
      <div className="client-view">
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <BackLink />
          <div className="client-card">
            <div className="client-head">
              <span className="client-logo">
                <Logo height={34} />
              </span>
            </div>
            <p style={{ color: 'var(--ink-soft)' }}>Deze link is niet (meer) geldig.</p>
          </div>
        </div>
      </div>
    );
  }

  const ownerName = properties[0]!.ownerName;
  const doneCount = properties.filter((p) => getStatus(p).key === 'done').length;

  return (
    <div className="client-view">
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        <BackLink />
        <div className="client-card client-card-wide">
          <div className="client-head">
            <span className="client-logo">
              <Logo height={34} />
            </span>
            <div>
              <div className="client-title">Voortgang van uw panden</div>
              <div className="client-sub">
                {ownerName} · {properties.length} panden, {doneCount} afgerond
              </div>
            </div>
          </div>
          <div className="client-portfolio-list">
            {properties.map((p) => {
              const st = getStatus(p);
              return (
                <Link
                  key={p.id}
                  className="client-portfolio-row"
                  href={`/klant/${p.id}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div className="client-portfolio-addr">
                    <div className="client-portfolio-street">{p.address}</div>
                    <div className="client-portfolio-city">{p.city}</div>
                  </div>
                  <span className={`pill st-${st.key}`}>
                    <span className="dot2" />
                    {st.label}
                  </span>
                  {st.key === 'done' && p.label ? (
                    <span className="client-portfolio-label" style={{ background: labelColor(p.label) }}>
                      {p.label}
                    </span>
                  ) : (
                    <span className="client-portfolio-chevron">→</span>
                  )}
                </Link>
              );
            })}
          </div>
          <div className="client-foot">Vragen over uw panden? Neem contact op met Krik je energielabel op.</div>
        </div>
      </div>
    </div>
  );
}
