import Link from 'next/link';
import { Logo } from '@/components/platform/Logo';
import { LabelBars } from '@/components/ui/StatusPill';
import { getStatus, modeOf } from '@/lib/domain';
import { fmtNum } from '@/lib/format';
import type { Profile, Property } from '@/lib/types';

type StepState = 'done' | 'active' | 'pending';

function timelineSteps(p: Property): { label: string; state: StepState }[] {
  const st = getStatus(p);
  const hasMeet = Boolean(p.meetrapport?.inmeetdatum);
  const idx = ['wait', 'progress', 'ready', 'done'].indexOf(st.key);
  const lastLabel = modeOf(p) === 'plattegrond' ? 'Opgeleverd' : 'Afgemeld & geregistreerd';
  return [
    { label: 'Ingemeten', state: hasMeet ? 'done' : idx >= 0 ? 'active' : 'pending' },
    { label: 'In verwerking', state: idx > 1 ? 'done' : idx === 1 ? 'active' : 'pending' },
    { label: 'Klaar voor controle', state: idx > 2 ? 'done' : idx === 2 ? 'active' : 'pending' },
    { label: lastLabel, state: idx === 3 ? 'done' : 'pending' },
  ];
}

export function KlantView({ property, assignee }: { property: Property; assignee: Profile | null }) {
  const st = getStatus(property);
  const mode = modeOf(property);
  const steps = timelineSteps(property);
  const showLabel = st.key === 'done' && mode !== 'plattegrond' && Boolean(property.label);
  const showPlanDone = st.key === 'done' && mode === 'plattegrond';
  const title =
    mode === 'plattegrond'
      ? 'Voortgang van uw plattegrond'
      : mode === 'label'
        ? 'Voortgang van uw energielabel'
        : 'Voortgang van uw plattegrond & energielabel';

  let note: string;
  if (showLabel) {
    const s = property.signoff;
    note = `Uw energielabel is afgemeld en geregistreerd in EP-online${s ? ' door ' + s.adviseur : ''}${s ? ' op ' + s.datum : ''}.`;
  } else if (showPlanDone) {
    note = 'Uw plattegrond is gereed en gecontroleerd. Neem contact op voor de definitieve bestanden.';
  } else if (mode === 'plattegrond') {
    note = 'Zodra uw plattegrond is opgemeten en uitgewerkt in onze huisstijl, ziet u hier de status.';
  } else {
    note = 'Zodra uw energielabel is gecontroleerd en afgemeld door een erkend adviseur, ziet u hier het resultaat.';
  }

  return (
    <div className="client-view">
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <Link
          className="ghost-btn"
          href="/overzicht"
          style={{ marginBottom: 14, padding: '8px 14px', fontSize: 12.5, textDecoration: 'none' }}
        >
          ← Terug
        </Link>
        <div className="client-card">
          <div className="client-head">
            <span className="client-logo">
              <Logo height={34} />
            </span>
            <div>
              <div className="client-title">{title}</div>
              <div className="client-sub">
                {property.address}, {property.city}
              </div>
            </div>
          </div>
          <div className="client-timeline">
            {steps.map((s) => (
              <div key={s.label} className={`client-step ${s.state}`}>
                <span className="client-step-dot">{s.state === 'done' ? '✓' : ''}</span>
                <span className="client-step-label">{s.label}</span>
              </div>
            ))}
          </div>
          {showLabel && (
            <div className="client-label-block">
              <LabelBars label={property.label} />
              <div className="label-fact">
                <div className="f">
                  <div className="v">{property.label}</div>
                  <div className="l">energielabel</div>
                </div>
                <div className="f">
                  <div className="v">{fmtNum(property.energyIndex)}</div>
                  <div className="l">energie-index</div>
                </div>
              </div>
            </div>
          )}
          <p className="client-note">{note}</p>
          <div className="client-foot">
            Vragen over uw aanvraag? Neem contact op met {assignee ? assignee.name + ' bij ' : ''}Krik je energielabel op.
          </div>
        </div>
      </div>
    </div>
  );
}
