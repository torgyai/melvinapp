'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Logo } from '@/components/platform/Logo';
import { labelColor } from '@/lib/domain';
import { fmtNum } from '@/lib/format';
import {
  computeIndicatie,
  simulatePostcodeLookup,
  PUB_BOUWLAGEN,
  PUB_GLAS,
  PUB_JANEE,
  PUB_PHOTO_SLOTS,
  PUB_TYPES,
  PUB_VERWARMING,
  type IndicatieInput,
  type IndicatieResult,
  type PhotoKey,
  type TipIcon,
} from '@/lib/indicatie';

const EMPTY_INPUT: IndicatieInput = {
  postcode: '',
  huisnummer: '',
  straat: '',
  plaats: '',
  type: PUB_TYPES[0],
  year: '',
  area: '',
  bouwlagen: PUB_BOUWLAGEN[0],
  verwarming: PUB_VERWARMING[0],
  dakIsolatie: PUB_JANEE[0],
  gevelIsolatie: PUB_JANEE[0],
  glas: PUB_GLAS[0],
  zonnepanelen: false,
  zonAantal: '',
};

/** Foto's boven deze grens sturen we niet mee; de adviseur vraagt ze zo nodig opnieuw op. */
const PHOTO_UPLOAD_CAP = 1.5 * 1024 * 1024;

interface PhotoSlot {
  file: File;
  url: string;
  check: string | null;
}

type PhotoState = Partial<Record<PhotoKey, PhotoSlot>>;

const CheckIcon = ({ strokeWidth = 2 }: { strokeWidth?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const WarnIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M12 9v4M12 17h.01" />
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
  </svg>
);

const TIP_ICON: Record<TipIcon, JSX.Element> = {
  wall: (
    <>
      <path d="M3 9l9-6 9 6M4 10v10h16V10" strokeWidth="1.8" />
    </>
  ),
  pump: (
    <>
      <circle cx="12" cy="12" r="8" strokeWidth="1.8" />
      <path d="M12 8v4l3 2" strokeWidth="1.8" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" strokeWidth="1.8" />
      <path
        d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"
        strokeWidth="1.8"
      />
    </>
  ),
  glass: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="1.5" strokeWidth="1.8" />
      <path d="M4 12h16" strokeWidth="1.8" />
    </>
  ),
};

function readDimensions(url: string): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * De check kijkt naar het bestand zelf: is het leesbaar als foto, hoe scherp is het, en hoe
 * verhoudt het zich tot wat de bezoeker heeft ingevuld. Wat er op de foto te zien is, wordt
 * hier niet beoordeeld, dus dat beweert de chip ook niet.
 */
function checkText(
  key: PhotoKey,
  file: File,
  dims: { w: number; h: number } | null,
  input: IndicatieInput,
): string {
  if (!dims) return 'Dit bestand kon niet als foto worden gelezen. Probeer een andere foto.';
  const parts = [`Foto ontvangen, ${dims.w} × ${dims.h} pixels.`];
  if (dims.w < 600 || dims.h < 600) {
    parts.push('De foto is klein; een grotere foto helpt de adviseur.');
  }
  if (key === 'installatie') {
    parts.push(`U gaf op: ${input.verwarming}. De adviseur bevestigt het type installatie tijdens de opname.`);
  } else if (key === 'meterkast') {
    parts.push(
      `U gaf op: ${input.zonnepanelen ? 'zonnepanelen aanwezig' : 'geen zonnepanelen'}. De adviseur controleert dit tijdens de opname.`,
    );
  } else {
    parts.push('De adviseur beoordeelt de gevel tijdens de opname.');
  }
  if (file.size > PHOTO_UPLOAD_CAP) {
    parts.push('De foto is te groot om mee te sturen en wordt bij de aanvraag opgevraagd.');
  }
  return parts.join(' ');
}

function fileToDataUrl(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export function IndicatieSite() {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'result' | 'leadform' | 'done'>('form');
  const [input, setInput] = useState<IndicatieInput>(EMPTY_INPUT);
  const [photos, setPhotos] = useState<PhotoState>({});
  const [result, setResult] = useState<IndicatieResult | null>(null);
  const [contact, setContact] = useState({ naam: '', email: '', telefoon: '' });
  const [lead, setLead] = useState<{ naam: string; propertyId: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const postcodeRef = useRef<HTMLInputElement>(null);
  const straatRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const voorgevelRef = useRef<HTMLInputElement>(null);
  const naamRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const photosRef = useRef<PhotoState>(photos);
  photosRef.current = photos;
  useEffect(
    () => () => {
      Object.values(photosRef.current).forEach((slot) => {
        if (slot) URL.revokeObjectURL(slot.url);
      });
    },
    [],
  );

  const set = useCallback(<K extends keyof IndicatieInput>(key: K, value: IndicatieInput[K]) => {
    setInput((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'postcode' || key === 'huisnummer') {
        const found = simulatePostcodeLookup(next.postcode.trim(), next.huisnummer.trim());
        if (found) {
          next.straat = found.straat;
          next.plaats = found.plaats;
        }
      }
      return next;
    });
  }, []);

  async function onPhotoChange(key: PhotoKey, file: File | undefined) {
    setPhotos((prev) => {
      const old = prev[key];
      if (old) URL.revokeObjectURL(old.url);
      const next = { ...prev };
      delete next[key];
      return next;
    });
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPhotos((prev) => ({ ...prev, [key]: { file, url, check: null } }));
    const dims = await readDimensions(url);
    const text = checkText(key, file, dims, input);
    setPhotos((prev) => (prev[key]?.url === url ? { ...prev, [key]: { file, url, check: text } } : prev));
  }

  function submitIndicatie() {
    if (!input.postcode.trim() || !input.huisnummer.trim()) return postcodeRef.current?.focus();
    if (!input.straat.trim() || !input.plaats.trim()) return straatRef.current?.focus();
    if (!input.year.trim()) return yearRef.current?.focus();
    if (!photos.voorgevel) {
      voorgevelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return voorgevelRef.current?.focus();
    }
    setResult(computeIndicatie(input));
    setStep('result');
  }

  async function submitLead() {
    if (!contact.naam.trim()) return naamRef.current?.focus();
    if (!contact.email.trim()) return emailRef.current?.focus();
    if (!result) return;
    setSending(true);
    setSendError(null);
    const photoPayload: Record<string, string | null> = {};
    const photoAi: Record<string, string | null> = {};
    for (const slot of PUB_PHOTO_SLOTS) {
      const p = photos[slot.key];
      if (!p) continue;
      photoAi[slot.key] = p.check;
      photoPayload[slot.key] = p.file.size <= PHOTO_UPLOAD_CAP ? await fileToDataUrl(p.file) : null;
    }
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input,
          result: { label: result.label, index: result.index },
          contact: { naam: contact.naam.trim(), email: contact.email.trim(), telefoon: contact.telefoon.trim() },
          photos: photoPayload,
          photoAi,
        }),
      });
      if (!res.ok) throw new Error('mislukt');
      const data: { id: string } = await res.json();
      setLead({ naam: contact.naam.trim(), propertyId: data.id });
      setStep('done');
    } catch {
      setSendError('Het versturen is niet gelukt. Probeer het opnieuw.');
    } finally {
      setSending(false);
    }
  }

  function restart() {
    Object.values(photos).forEach((slot) => {
      if (slot) URL.revokeObjectURL(slot.url);
    });
    setPhotos({});
    setInput(EMPTY_INPUT);
    setResult(null);
    setContact({ naam: '', email: '', telefoon: '' });
    setLead(null);
    setStep('form');
  }

  const adres = `${input.straat} ${input.huisnummer}${input.plaats ? ', ' + input.plaats : ''}`;

  return (
    <div className="public-view">
      <div className="pub-topbar">
        <div className="pub-topbar-brand">
          <Logo height={30} />
          <span className="name">Krik je energielabel op</span>
        </div>
        <div className="pub-topbar-actions">
          <Link className="pub-back-link" href="/overzicht">
            ← Naar het platform
          </Link>
        </div>
      </div>
      <div className="pub-wrap">
        {step === 'form' && (
          <>
            <div className="pub-hero">
              <h1>Wat is de energielabel-indicatie van uw woning?</h1>
              <p>
                Vul uw postcode, huisnummer en een paar kenmerken in en ontvang direct een indicatie, binnen enkele
                seconden en volledig vrijblijvend.
              </p>
              <div className="pub-trust">
                <span className="pub-trust-item">
                  <CheckIcon />
                  Duizenden woningen geanalyseerd
                </span>
                <span className="pub-trust-item">
                  <CheckIcon />
                  Op basis van data van gecertificeerde adviseurs
                </span>
                <span className="pub-trust-item">
                  <CheckIcon />
                  100% vrijblijvend
                </span>
              </div>
            </div>

            <div className="pub-card" style={{ marginBottom: 16 }}>
              <div className="section-label" style={{ marginBottom: 10 }}>
                Wat hebben we nodig voor deze indicatie?
              </div>
              <ul className="pub-info-list">
                <li>Uw postcode en huisnummer, waarmee we straat en plaats automatisch invullen</li>
                <li>Bouwjaar, woningtype en (indien bekend) het woonoppervlak</li>
                <li>De installatie: type verwarming en of er zonnepanelen aanwezig zijn</li>
                <li>De isolatie: dak, gevel/spouwmuur en het type glas</li>
                <li>
                  Een foto van de voorgevel (verplicht), en optioneel foto&apos;s van de cv-ketel/warmtepomp en
                  meterkast; wij controleren of de foto&apos;s bruikbaar zijn
                </li>
              </ul>
            </div>

            <div className="pub-card">
              <div className="pub-row2">
                <div className="pub-field">
                  <label>Postcode</label>
                  <input
                    ref={postcodeRef}
                    type="text"
                    placeholder="Bv. 8911 AB"
                    value={input.postcode}
                    onChange={(e) => set('postcode', e.target.value)}
                  />
                </div>
                <div className="pub-field">
                  <label>Huisnummer</label>
                  <input
                    type="text"
                    placeholder="Bv. 12"
                    value={input.huisnummer}
                    onChange={(e) => set('huisnummer', e.target.value)}
                  />
                </div>
              </div>
              <div className="pub-row2">
                <div className="pub-field">
                  <label>Straat</label>
                  <input
                    ref={straatRef}
                    type="text"
                    placeholder="Wordt automatisch ingevuld"
                    value={input.straat}
                    onChange={(e) => set('straat', e.target.value)}
                  />
                </div>
                <div className="pub-field">
                  <label>Plaats</label>
                  <input
                    type="text"
                    placeholder="Wordt automatisch ingevuld"
                    value={input.plaats}
                    onChange={(e) => set('plaats', e.target.value)}
                  />
                </div>
              </div>

              <div className="pub-row2" style={{ marginTop: 14 }}>
                <div className="pub-field">
                  <label>Type woning</label>
                  <select value={input.type} onChange={(e) => set('type', e.target.value)}>
                    {PUB_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="pub-field">
                  <label>Bouwjaar</label>
                  <input
                    ref={yearRef}
                    type="number"
                    min="1800"
                    max="2026"
                    placeholder="Bv. 1998"
                    value={input.year}
                    onChange={(e) => set('year', e.target.value)}
                  />
                </div>
              </div>
              <div className="pub-row2">
                <div className="pub-field">
                  <label>Woonoppervlak in m² (optioneel)</label>
                  <input
                    type="number"
                    min="10"
                    placeholder="Bv. 120"
                    value={input.area}
                    onChange={(e) => set('area', e.target.value)}
                  />
                </div>
                <div className="pub-field">
                  <label>Aantal bouwlagen</label>
                  <select value={input.bouwlagen} onChange={(e) => set('bouwlagen', e.target.value)}>
                    {PUB_BOUWLAGEN.map((b) => (
                      <option key={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="section-label" style={{ marginTop: 18 }}>
                Installatie en isolatie
              </div>
              <div className="pub-field">
                <label>Type verwarming</label>
                <select value={input.verwarming} onChange={(e) => set('verwarming', e.target.value)}>
                  {PUB_VERWARMING.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </div>
              <div className="pub-row2">
                <div className="pub-field">
                  <label>Isolatie dak</label>
                  <select value={input.dakIsolatie} onChange={(e) => set('dakIsolatie', e.target.value)}>
                    {PUB_JANEE.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </div>
                <div className="pub-field">
                  <label>Isolatie gevel / spouwmuur</label>
                  <select value={input.gevelIsolatie} onChange={(e) => set('gevelIsolatie', e.target.value)}>
                    {PUB_JANEE.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="pub-field">
                <label>Type beglazing</label>
                <select value={input.glas} onChange={(e) => set('glas', e.target.value)}>
                  {PUB_GLAS.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </div>
              <div className="pub-checkbox-row">
                <label>
                  <input
                    type="checkbox"
                    checked={input.zonnepanelen}
                    onChange={(e) => set('zonnepanelen', e.target.checked)}
                  />{' '}
                  Ik heb zonnepanelen
                </label>
                <div hidden={!input.zonnepanelen}>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    placeholder="Aantal panelen"
                    value={input.zonAantal}
                    onChange={(e) => set('zonAantal', e.target.value)}
                  />
                </div>
              </div>

              <div className="section-label" style={{ marginTop: 18 }}>
                Foto&apos;s (voor de AI-check)
              </div>
              <div className="pub-photo-hint">
                1 verplichte foto, 2 optioneel. Wij controleren of de foto bruikbaar is en zetten uw opgave erbij; de
                adviseur beoordeelt wat er op de foto staat tijdens de opname.
              </div>
              {PUB_PHOTO_SLOTS.map((s) => {
                const slot = photos[s.key];
                return (
                  <div className="pub-field" key={s.key}>
                    <label>
                      {s.label}
                      {s.required ? (
                        <span className="pub-required">verplicht</span>
                      ) : (
                        <span className="pub-optional">optioneel</span>
                      )}
                    </label>
                    <input
                      ref={s.key === 'voorgevel' ? voorgevelRef : undefined}
                      type="file"
                      accept="image/*"
                      onChange={(e) => void onPhotoChange(s.key, e.target.files?.[0])}
                    />
                    <div className="pub-photo-preview">
                      {slot && (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={slot.url} alt={s.label} />
                          {slot.check ? (
                            <div className="pub-ai-check">✓ {slot.check}</div>
                          ) : (
                            <div className="pub-ai-check pub-ai-loading">🤖 Foto wordt gecontroleerd...</div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              <button className="pub-submit" style={{ marginTop: 6 }} onClick={submitIndicatie}>
                Bereken mijn indicatie →
              </button>
              <div className="pub-disclaimer">
                <WarnIcon />
                <span>
                  Dit is een indicatie op basis van de gegevens die u zelf invult. Het is geen officieel energielabel en
                  heeft geen wettelijke geldigheid. Alleen een gecertificeerd adviseur kan na een meting ter plaatse een
                  officieel energielabel afgeven.
                </span>
              </div>
            </div>
          </>
        )}

        {step === 'result' && result && (
          <>
            <div className="pub-hero" style={{ marginBottom: 18 }}>
              <h1 style={{ fontSize: 22 }}>Uw indicatie voor {adres}</h1>
            </div>
            <div className="pub-card">
              <div className="pub-result-label">
                <div className="pub-result-badge" style={{ background: labelColor(result.label) }}>
                  {result.label}
                </div>
                <div className="pub-result-sub">
                  Indicatieve energie-index {fmtNum(result.index, 2)} · geschat op basis van uw invoer
                </div>
              </div>
              <div className="pub-disclaimer">
                <WarnIcon />
                <span>
                  Dit is een indicatie, geen officieel energielabel. Het echte label wordt vastgesteld door een
                  gecertificeerd adviseur volgens de NTA 8800-methodiek.
                </span>
              </div>
              <div className="section-label" style={{ marginTop: 20 }}>
                Mogelijke verbeteringen
              </div>
              <ul className="pub-tips">
                {result.tips.map((t) => (
                  <li key={t.text}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      {TIP_ICON[t.icon]}
                    </svg>
                    <span>{t.text}</span>
                  </li>
                ))}
              </ul>
              <div className="pub-cta-box">
                <h3>Wilt u een officieel energielabel?</h3>
                <p>
                  Een gecertificeerd adviseur meet uw woning in en berekent het definitieve label volgens de NTA
                  8800-methodiek.
                </p>
                <button className="pub-submit" onClick={() => setStep('leadform')}>
                  Vraag een offerte aan →
                </button>
              </div>
            </div>
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <button className="pub-restart" onClick={() => setStep('form')}>
                ← Opnieuw invullen
              </button>
            </div>
          </>
        )}

        {step === 'leadform' && result && (
          <>
            <div className="pub-hero" style={{ marginBottom: 18 }}>
              <h1 style={{ fontSize: 22 }}>Offerte aanvragen</h1>
              <p>
                Voor {adres} · indicatie label {result.label}
              </p>
            </div>
            <div className="pub-card">
              <div className="pub-field">
                <label>Naam</label>
                <input
                  ref={naamRef}
                  type="text"
                  placeholder="Voor- en achternaam"
                  value={contact.naam}
                  onChange={(e) => setContact({ ...contact, naam: e.target.value })}
                />
              </div>
              <div className="pub-field">
                <label>E-mailadres</label>
                <input
                  ref={emailRef}
                  type="email"
                  placeholder="naam@voorbeeld.nl"
                  value={contact.email}
                  onChange={(e) => setContact({ ...contact, email: e.target.value })}
                />
              </div>
              <div className="pub-field">
                <label>Telefoonnummer (optioneel)</label>
                <input
                  type="tel"
                  placeholder="06 12345678"
                  value={contact.telefoon}
                  onChange={(e) => setContact({ ...contact, telefoon: e.target.value })}
                />
              </div>
              <button className="pub-submit" disabled={sending} onClick={() => void submitLead()}>
                {sending ? 'Bezig met versturen...' : 'Verstuur aanvraag'}
              </button>
              {sendError && (
                <div className="pub-disclaimer">
                  <WarnIcon />
                  <span>{sendError}</span>
                </div>
              )}
              <div className="pub-result-sub" style={{ marginTop: 10, textAlign: 'center' }}>
                We nemen binnen 1 werkdag contact met u op.
              </div>
            </div>
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <button className="pub-restart" onClick={() => setStep('result')}>
                ← Terug naar de indicatie
              </button>
            </div>
          </>
        )}

        {step === 'done' && lead && (
          <>
            <div className="pub-card pub-done">
              <div className="pub-check">
                <CheckIcon strokeWidth={2.4} />
              </div>
              <h2>Aanvraag ontvangen!</h2>
              <p>
                Bedankt, {lead.naam}. Een van onze adviseurs neemt binnen 1 werkdag contact met u op over {adres}.
              </p>
              <button className="pub-restart" onClick={restart}>
                Nieuwe indicatie aanvragen
              </button>
            </div>
            <div className="pub-card" style={{ marginTop: 16 }}>
              <div className="section-label" style={{ marginBottom: 8 }}>
                Zo komt deze aanvraag binnen bij het team
              </div>
              <div className="pub-result-sub" style={{ marginBottom: 12 }}>
                De aanvraag verschijnt direct als nieuwe lead in het interne platform van Krik je energielabel op,
                inclusief uw gegevens en de indicatie die u zag.
              </div>
              <button
                className="pub-submit"
                style={{ background: 'var(--teal-deep)' }}
                onClick={() => router.push(`/panden/${lead.propertyId}`)}
              >
                Open in het interne platform →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
