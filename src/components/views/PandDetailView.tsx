'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { runPipelineAction, setPropertyModeAction } from '@/app/actions';
import { useApp, usePageHeader } from '@/components/platform/AppContext';
import { AssignModal } from '@/components/platform/Shared';
import { ActivityNotes, NotesOnly } from '@/components/property/ActivityNotes';
import { FloorPlanPanel } from '@/components/property/FloorPlanPanel';
import { MediaPanel, PhotosModal } from '@/components/property/MediaPanel';
import { ShareModal } from '@/components/property/ShareModal';
import { LabelBars, StatusPill } from '@/components/ui/StatusPill';
import { avatarSrc } from '@/data/profiles';
import { MODES, PIPELINE, modeOf, totalArea } from '@/lib/domain';
import { fmtNum } from '@/lib/format';
import type { Note, OutputMode, Property } from '@/lib/types';
import { LabelStatusBox } from './BerekeningView';
import { HeaderPill } from '@/components/platform/HeaderPill';

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function stepsFor(mode: OutputMode | null) {
  return mode ? PIPELINE.filter((s) => s.modes.includes(mode)) : [];
}

function MetaChips({ p }: { p: Property }) {
  const { profiles } = useApp();
  const [photosOpen, setPhotosOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const assignee = profiles.find((x) => x.id === p.assignedTo) ?? null;

  const areaText = p.floors.length
    ? `${fmtNum(totalArea(p))} m² gebruiksoppervlak`
    : p.leadArea
      ? `${fmtNum(p.leadArea)} m² (opgegeven, nog niet ingemeten)`
      : 'Oppervlak nog niet bekend';

  return (
    <>
      <div className="meta-row">
        <span className="chip">{p.type}</span>
        <span className="chip">Bouwjaar {p.year}</span>
        <span className="chip">{areaText}</span>
        <span
          className={`chip${p.photoCount > 0 ? ' click' : ''}`}
          onClick={p.photoCount > 0 ? () => setPhotosOpen(true) : undefined}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <circle cx="9" cy="11" r="2" />
            <path d="M21 16l-5-4-4 3-3-2-6 5" />
          </svg>
          {p.photoCount > 0 ? `${p.photoCount} foto's` : "Nog geen foto's"}
        </span>
        <span className="chip click" onClick={() => setAssignOpen(true)}>
          {assignee ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="chip-avatar" src={avatarSrc(assignee)} alt="" /> {assignee.name}
            </>
          ) : (
            'Niet toegewezen'
          )}
        </span>
        <span className="chip click" onClick={() => setShareOpen(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="M8.6 10.6l6.8-3.2M8.6 13.4l6.8 3.2" />
          </svg>
          Deel met klant
        </span>
      </div>
      <PhotosModal p={p} open={photosOpen} onClose={() => setPhotosOpen(false)} />
      <AssignModal p={p} open={assignOpen} onClose={() => setAssignOpen(false)} />
      <ShareModal p={p} open={shareOpen} onClose={() => setShareOpen(false)} />
    </>
  );
}

function Results({ p }: { p: Property }) {
  const router = useRouter();
  const mode = modeOf(p);
  const showPlan = mode === 'both' || mode === 'plattegrond';
  const showLabel = (mode === 'both' || mode === 'label') && Boolean(p.label);

  return (
    <>
      <div className={`result-grid${showPlan && showLabel ? '' : ' single'}`}>
        {showPlan && <FloorPlanPanel p={p} />}
        {showLabel && (
          <div className="panel">
            <h3>Energielabel</h3>
            <LabelBars label={p.label} />
            <div className="label-fact">
              <div className="f">
                <div className="v">{p.label}</div>
                <div className="l">voorbereid label</div>
              </div>
              <div className="f">
                <div className="v">{fmtNum(p.energyIndex)}</div>
                <div className="l">energie-index</div>
              </div>
              <div className="f">
                <div className="v">NTA 8800</div>
                <div className="l">bepalingsmethode</div>
              </div>
            </div>
            <LabelStatusBox p={p} />
            <button className="linkbtn" onClick={() => router.push(`/panden/${p.id}/berekening`)}>
              Bekijk berekening
            </button>
          </div>
        )}
      </div>
      <MediaPanel p={p} />
      {(showPlan || showLabel) && (
        <div style={{ marginTop: 18 }}>
          <button className="primary-btn" onClick={() => router.push(`/panden/${p.id}/rapport`)}>
            Bekijk &amp; download rapport
          </button>
        </div>
      )}
    </>
  );
}

function InteractiveBody({ p }: { p: Property }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [phase, setPhase] = useState<'idle' | 'running' | 'finished'>('idle');
  const [step, setStep] = useState(0);

  const mode = p.runtime?.mode ?? null;
  const steps = stepsFor(mode);
  const running = phase === 'running';
  const processed = phase === 'finished' || (phase === 'idle' && Boolean(p.runtime?.processed));
  const barWidth = running ? (step / Math.max(steps.length, 1)) * 100 : processed ? 100 : 0;

  const selectMode = (m: OutputMode) => {
    if (m === mode) return;
    setPhase('idle');
    setStep(0);
    startTransition(async () => {
      await setPropertyModeAction(p.id, m);
      router.refresh();
    });
  };

  const run = async () => {
    if (!mode || running) return;
    setPhase('running');
    setStep(0);
    const pending = runPipelineAction(p.id);
    for (let i = 0; i < steps.length; i++) {
      await wait(420 + Math.random() * 260);
      setStep(i + 1);
    }
    await pending;
    setPhase('finished');
    router.refresh();
  };

  const rowClass = (i: number) => {
    if (running) return i < step ? 'prow done' : i === step ? 'prow spin active' : 'prow';
    return processed ? 'prow done' : 'prow';
  };

  return (
    <>
      <div className="section-label">Output</div>
      <div className="modes">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={`mcard${mode === m.id ? ' selected' : ''}`}
            onClick={() => selectMode(m.id)}
          >
            {m.tag ? <div className="tag">{m.tag}</div> : <div className="radio" />}
            <div className="icon">
              <svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: m.icon }} />
            </div>
            <h3>{m.title}</h3>
            <p>{m.sub}</p>
          </button>
        ))}
      </div>
      <div className="start-row">
        <button className="start-btn" disabled={!mode || running} onClick={run}>
          ▶ {processed ? 'Opnieuw uitvoeren' : 'Start verwerking'}
        </button>
      </div>
      <div className="pipeline" style={mode ? undefined : { display: 'none' }}>
        <div className="pbar-outer">
          <div className="pbar-inner" style={{ width: `${barWidth}%` }} />
        </div>
        <div className="plist">
          {steps.map((s, i) => (
            <div className={rowClass(i)} key={s.id}>
              <div className="ic">✓</div>
              <div>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
      {processed && <Results p={p} />}
    </>
  );
}

function ProgressBody({ p }: { p: Property }) {
  const steps = stepsFor(p.fixedMode ?? 'both');
  const activeIdx = Math.min(2, steps.length - 1);
  return (
    <>
      <div className="section-label">Verwerking</div>
      <div className="pipeline">
        <div className="pbar-outer">
          <div className="pbar-inner" style={{ width: `${Math.round((activeIdx / steps.length) * 100)}%` }} />
        </div>
        <div className="plist">
          {steps.map((s, i) => (
            <div className={`prow${i < activeIdx ? ' done' : i === activeIdx ? ' spin active' : ''}`} key={s.id}>
              <div className="ic">{i < activeIdx ? '✓' : ''}</div>
              <div>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function WaitBody({ p }: { p: Property }) {
  return (
    <>
      {p.leadSource === 'publiek' && (
        <div className="lead-info-box">
          <div className="lit">🌐 Binnengekomen via de publieke indicatiewebsite</div>
          <div className="lirow">
            <b>{p.leadContact?.naam ?? ''}</b> · {p.leadContact?.email ?? ''}
            {p.leadContact?.telefoon ? ` · ${p.leadContact.telefoon}` : ''}
          </div>
          <div className="lirow">
            Indicatie op de website: <b>label {p.leadIndicatie?.label ?? '?'}</b> (energie-index{' '}
            {p.leadIndicatie ? fmtNum(p.leadIndicatie.index, 2) : '?'}) · aangevraagd {p.leadAt ?? ''}
          </div>
          {p.leadKenmerken && (
            <>
              <div className="lirow">
                Kenmerken opgegeven door bezoeker: postcode {p.leadKenmerken.postcode || '-'} ·{' '}
                {p.leadKenmerken.bouwlagen || '?'} bouwlaag/lagen · {p.leadKenmerken.verwarming || 'verwarming onbekend'}
              </div>
              <div className="lirow">
                Isolatie: dak {p.leadKenmerken.dakIsolatie || '?'} · gevel/spouwmuur {p.leadKenmerken.gevelIsolatie || '?'} ·
                glas {p.leadKenmerken.glas || '?'} · zonnepanelen{' '}
                {p.leadKenmerken.zonnepanelen ? `${p.leadKenmerken.zonAantal || '?'} stuks` : 'nee'}
              </div>
            </>
          )}
          <div className="lisub">
            Dit is de niet-officiële indicatie die de bezoeker zag. Na de scan berekent de NTA 8800-motor het definitieve
            label, dat een gecertificeerd adviseur controleert en afmeldt.
          </div>
        </div>
      )}
      <div className="note-box" style={{ maxWidth: 520 }}>
        <div style={{ marginBottom: 14 }}>Nog geen opname ontvangen voor dit pand.</div>
        <Link className="start-btn" href={`/scan?pand=${p.id}`}>
          📷 Scan starten
        </Link>
      </div>
    </>
  );
}

export function PandDetailView({ p, notes }: { p: Property; notes: Note[] }) {
  usePageHeader(p.address, p.city);

  return (
    <>
      <HeaderPill>
        <StatusPill p={p} />
      </HeaderPill>
      <MetaChips p={p} />
      {p.lifecycle === 'interactive' && <InteractiveBody p={p} />}
      {p.lifecycle === 'progress' && <ProgressBody p={p} />}
      {p.lifecycle === 'wait' && <WaitBody p={p} />}
      {(p.lifecycle === 'ready' || p.lifecycle === 'done') && <Results p={p} />}
      {p.lifecycle === 'wait' ? <NotesOnly p={p} notes={notes} /> : <ActivityNotes p={p} notes={notes} />}
    </>
  );
}
