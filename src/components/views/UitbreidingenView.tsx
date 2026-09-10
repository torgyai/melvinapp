'use client';

import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { usePageHeader } from '@/components/platform/AppContext';
import { Modal, ModalSub, ModalTitle } from '@/components/ui/Modal';

type ModuleKey =
  | 'bag'
  | 'offerte'
  | 'planning'
  | 'klantportaal'
  | 'spraak'
  | 'kwaliteit'
  | 'rekensoftware'
  | 'communicatie'
  | 'energieadvies'
  | 'subsidie'
  | 'kpi';

interface UitbrModule {
  key: ModuleKey;
  cat: string;
  title: string;
  tag: string;
  built?: boolean;
}

const UITBR_ICONS: Record<ModuleKey, ReactNode> = {
  bag: (
    <>
      <path d="M4 21V9l8-6 8 6v12" />
      <path d="M9 21v-6h6v6" />
    </>
  ),
  offerte: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="1.5" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </>
  ),
  planning: (
    <>
      <circle cx="6" cy="7" r="2" />
      <circle cx="18" cy="7" r="2" />
      <circle cx="12" cy="17" r="2" />
      <path d="M8 8l3 8M16 8l-3 8" />
    </>
  ),
  klantportaal: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h5" />
      <path d="M15 16l2 2 3-3" />
    </>
  ),
  spraak: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </>
  ),
  kwaliteit: (
    <>
      <path d="M12 3l8 4v5c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V7z" />
      <path d="M9.5 12l2 2 3.5-4" />
    </>
  ),
  rekensoftware: (
    <>
      <rect x="3" y="4" width="8" height="8" rx="1.5" />
      <rect x="13" y="4" width="8" height="8" rx="1.5" />
      <path d="M7 12v3a2 2 0 0 0 2 2h3M17 12v3a2 2 0 0 1-2 2h-3M12 17v3" />
    </>
  ),
  communicatie: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3.5 6.5l8.5 6 8.5-6" />
    </>
  ),
  energieadvies: <path d="M13 2 4 14h6l-1 8 9-12h-6z" />,
  subsidie: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5c0-1.4 1.1-2.5 2.5-2.5s2.5 1.1 2.5 2.3c0 1.6-2.5 1.8-2.5 3.7M12 16.5h.01" />
    </>
  ),
  kpi: <path d="M4 19V10M11 19V5M18 19v-7" />,
};

const UITBR_MODULES: UitbrModule[] = [
  {
    key: 'bag',
    cat: 'Vóór het bezoek',
    title: 'Automatische lead-verrijking',
    tag: 'BAG-koppeling, objecttype en urgentie automatisch herkend zodra een aanvraag binnenkomt.',
  },
  {
    key: 'offerte',
    cat: 'Vóór het bezoek',
    title: 'Automatische offerte',
    tag: 'Prijsvoorstel op basis van objecttype, m² en reisafstand, direct te versturen en digitaal te accorderen.',
  },
  {
    key: 'planning',
    cat: 'Vóór het bezoek',
    title: 'Slimme planning & routes',
    tag: 'Beschikbare tijdsloten en automatische route-clustering per regio, in plaats van kris-kras door Friesland rijden.',
  },
  {
    key: 'klantportaal',
    cat: 'Vóór het bezoek',
    title: 'Klantportaal & documentcheck',
    tag: 'Klant uploadt vooraf bouwtekeningen en facturen; AI leest ze uit en signaleert wat nog ontbreekt.',
  },
  {
    key: 'spraak',
    cat: 'Tijdens het bezoek',
    title: 'Spraakgestuurde opname',
    tag: 'Adviseur spreekt de opname in per ruimte, AI zet dit direct gestructureerd in het dossier.',
  },
  {
    key: 'kwaliteit',
    cat: 'Tijdens het bezoek',
    title: 'Realtime kwaliteitscontrole',
    tag: 'Het dashboard waarschuwt meteen als een verplicht onderdeel ontbreekt, nog vóór de adviseur weer in de auto zit.',
  },
  {
    key: 'rekensoftware',
    cat: 'Na het bezoek',
    title: 'Overdracht naar rekensoftware',
    tag: 'Gestructureerde data rechtstreeks door naar Vabi, geen dubbel werk.',
    built: true,
  },
  {
    key: 'communicatie',
    cat: 'Na het bezoek',
    title: 'Automatische klantcommunicatie',
    tag: 'Zodra het label geregistreerd is: automatisch een e-mail, PDF en factuur naar de klant.',
  },
  {
    key: 'energieadvies',
    cat: 'Extra omzet & inzicht',
    title: "Energieadvies-scenario's",
    tag: 'Laat direct zien: huidig label D, met HR++ glas waarschijnlijk C, met dakisolatie erbij mogelijk B.',
  },
  {
    key: 'subsidie',
    cat: 'Extra omzet & inzicht',
    title: 'Subsidiecheck',
    tag: 'Automatisch relevante subsidieregelingen tonen op basis van het dossier, inclusief benodigde bewijsstukken.',
  },
  {
    key: 'kpi',
    cat: 'Extra omzet & inzicht',
    title: 'Uitgebreid backoffice-overzicht',
    tag: 'Conversie, doorlooptijd, omzet, openstaande facturen en herlabel-kansen in één stuuroverzicht.',
  },
];

const FOOTNOTE: React.CSSProperties = { fontSize: 12, color: 'var(--ink-faint)', marginTop: 10 };

export function UitbreidingenView() {
  const [openKey, setOpenKey] = useState<ModuleKey | null>(null);
  usePageHeader('Uitbreidingen');

  const cats: string[] = [];
  UITBR_MODULES.forEach((m) => {
    if (!cats.includes(m.cat)) cats.push(m.cat);
  });

  return (
    <>
      <div className="uitbr-intro">
        Dit zijn <b>optionele uitbreidingen</b>, nog geen onderdeel van de huidige scope. Een indruk van hoe het
        platform het werkproces stap voor stap verder kan automatiseren, van binnenkomende aanvraag tot factuur. Klik op
        een kaart voor een voorbeeld.
      </div>
      <div className="uitbr-built">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 6L9 17l-5-5" />
        </svg>
        <div>
          <div className="uitbr-built-title">Dit zit al in het platform</div>
          <div className="uitbr-built-text">
            De belangrijkste koppeling, van opname rechtstreeks naar de geattesteerde rekensoftware zonder dubbel werk,
            is geen uitbreiding maar het uitgangspunt van het platform. Zie de stap &quot;Vabi-bestand klaarzetten&quot;
            in elke pand-pijplijn.
          </div>
        </div>
      </div>

      {cats.map((cat) => (
        <Fragment key={cat}>
          <div className="uitbr-cat">{cat}</div>
          <div className="uitbr-grid">
            {UITBR_MODULES.filter((m) => m.cat === cat).map((m) => (
              <button key={m.key} className="uitbr-card" onClick={() => setOpenKey(m.key)}>
                <div className="uitbr-card-icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {UITBR_ICONS[m.key]}
                  </svg>
                </div>
                <div className="uitbr-card-title">{m.title}</div>
                <div className="uitbr-card-tag">{m.tag}</div>
                <div className="uitbr-card-cta">{m.built ? 'Al gebouwd →' : 'Bekijk voorbeeld →'}</div>
              </button>
            ))}
          </div>
        </Fragment>
      ))}

      {openKey && <UitbreidingModal moduleKey={openKey} onClose={() => setOpenKey(null)} />}
    </>
  );
}

function UitbrShell({
  title,
  tag,
  onClose,
  children,
}: {
  title: string;
  tag: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal open onClose={onClose}>
      <ModalTitle>{title}</ModalTitle>
      <div className="uitbr-modal-tag">Voorbeeld · nog niet in scope</div>
      <ModalSub>{tag}</ModalSub>
      {children}
    </Modal>
  );
}

function UitbreidingModal({ moduleKey, onClose }: { moduleKey: ModuleKey; onClose: () => void }) {
  const m = UITBR_MODULES.find((x) => x.key === moduleKey)!;
  const tag = moduleKey === 'rekensoftware' ? 'Al onderdeel van het platform, geen uitbreiding.' : m.tag;
  return (
    <UitbrShell title={m.title} tag={tag} onClose={onClose}>
      <ModuleBody moduleKey={moduleKey} />
    </UitbrShell>
  );
}

function ModuleBody({ moduleKey }: { moduleKey: ModuleKey }) {
  switch (moduleKey) {
    case 'rekensoftware':
      return (
        <p style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.6, marginTop: 4 }}>
          Zodra de opname binnen is, bouwt het platform automatisch een importklaar Vabi-bestand op basis van de
          meetscan en de ingevoerde installaties. De adviseur opent in Vabi een al ingevulde berekening in plaats van een
          leeg formulier, controleert die, tekent en registreert in EP-Online. Er wordt nergens dubbel getypt.
        </p>
      );
    case 'bag':
      return (
        <ul className="uitbr-warn-list">
          <li className="ok">Adres automatisch herkend via de Basisregistratie Adressen en Gebouwen (BAG)</li>
          <li className="ok">
            Bouwjaar, oppervlak en objecttype (woning, appartement, recreatie, utiliteit) automatisch ingevuld
          </li>
          <li className="ok">Bestaand energielabel gecontroleerd op geldigheid</li>
          <li className="warn">Reden aanvraag en gewenste opleverdatum nog handmatig, klaar om ook te automatiseren</li>
        </ul>
      );
    case 'communicatie':
      return (
        <ul className="uitbr-warn-list">
          <li className="ok">Klant ontvangt automatisch een e-mail zodra het label geregistreerd is, met PDF-afschrift</li>
          <li className="ok">Factuur wordt gelijktijdig automatisch verstuurd</li>
          <li className="ok">Betaalstatus wordt gevolgd, met automatische herinnering bij uitblijven van betaling</li>
          <li className="ok">Dossier sluit zichzelf zodra alles rond is</li>
        </ul>
      );
    case 'energieadvies':
      return (
        <>
          <div className="advies-list" style={{ marginTop: 14 }}>
            <div className="advies-item">
              <div className="advies-tekst">Huidig label: D</div>
            </div>
            <div className="advies-item">
              <div className="advies-tekst">+ HR++ glas → waarschijnlijk label C</div>
              <div className="advies-meta">
                <span className="advies-badge">Investering: € 2.500 – € 4.000</span>
              </div>
            </div>
            <div className="advies-item">
              <div className="advies-tekst">+ Dakisolatie → waarschijnlijk label B</div>
              <div className="advies-meta">
                <span className="advies-badge">Investering: € 5.000 – € 8.000</span>
              </div>
            </div>
            <div className="advies-item">
              <div className="advies-tekst">+ Warmtepomp → mogelijk label A</div>
              <div className="advies-meta">
                <span className="advies-badge">Investering: € 11.000 – € 17.000</span>
              </div>
            </div>
          </div>
          <p style={FOOTNOTE}>
            Indicatieve scenario&apos;s, los van de officiële NTA 8800-berekening. Bouwt voort op de bestaande wat-als
            simulator.
          </p>
        </>
      );
    case 'subsidie':
      return (
        <ul className="uitbr-warn-list">
          <li className="ok">ISDE (isolatie, warmtepomp): indicatief € 1.200 – € 2.400</li>
          <li className="ok">
            Subsidieregeling verduurzaming particuliere woningen (gemeente): indicatief € 500
          </li>
          <li className="warn">Benodigd bewijsstuk ontbreekt: factuur isolatiemateriaal</li>
          <li className="ok">Aanvraag automatisch voorbereid, klant hoeft alleen te controleren en te versturen</li>
        </ul>
      );
    case 'kpi':
      return (
        <>
          <div className="label-fact" style={{ marginTop: 4 }}>
            <div className="f">
              <div className="v">24%</div>
              <div className="l">conversie aanvraag → opdracht</div>
            </div>
            <div className="f">
              <div className="v">3,2 dg</div>
              <div className="l">gem. doorlooptijd</div>
            </div>
            <div className="f">
              <div className="v">€ 8.400</div>
              <div className="l">openstaande facturen</div>
            </div>
            <div className="f">
              <div className="v">11</div>
              <div className="l">herlabel-kansen dit kwartaal</div>
            </div>
          </div>
          <p style={FOOTNOTE}>
            Bovenop het bestaande dashboard: omzet, doorlooptijd per adviseur en geografische spreiding van afspraken.
          </p>
        </>
      );
    case 'spraak':
      return <VoicePreview />;
    case 'klantportaal':
      return <DocPortalPreview />;
    case 'kwaliteit':
      return <QualityPreview />;
    case 'offerte':
      return <OffertePreview />;
    case 'planning':
      return <RoutePreview />;
  }
}

const VOICE_SCRIPT = [
  {
    said: 'Woonkamer, achtergevel 4 meter 82, kunststof kozijnen, HR++ glas, radiator onder het raam.',
    parsed: 'Ruimte: Woonkamer · Gevel: 4,82 m · Kozijn: kunststof · Beglazing: HR++ · Verwarming: radiator',
  },
  {
    said: 'Dak, hellend, geïsoleerd met 12 centimeter PIR.',
    parsed: 'Bouwdeel: dak (hellend) · Isolatie: PIR, 12 cm',
  },
  {
    said: 'Meterkast, hybride warmtepomp Daikin Altherma, bouwjaar 2021.',
    parsed: 'Installatie: hybride warmtepomp (Daikin Altherma, 2021)',
  },
  {
    said: 'Keuken, zuidgevel, twee ramen, dubbel glas.',
    parsed: 'Ruimte: Keuken · Oriëntatie: zuid · Kozijnen: 2 · Beglazing: dubbel glas',
  },
];

function VoicePreview() {
  const [shown, setShown] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const timers = VOICE_SCRIPT.map((_, i) =>
      setTimeout(() => {
        setShown(i + 1);
        if (i === VOICE_SCRIPT.length - 1) setRunning(false);
      }, i * 1100),
    );
    return () => timers.forEach(clearTimeout);
  }, [running]);

  return (
    <>
      <button
        className="primary-btn"
        style={{ marginTop: 6 }}
        disabled={running}
        onClick={() => {
          setShown(0);
          setRunning(true);
        }}
      >
        ▶ Simuleer spraakopname
      </button>
      <div className="voice-transcript">
        {VOICE_SCRIPT.slice(0, shown).map((line) => (
          <div className="voice-line" key={line.said}>
            <div className="voice-mic">🎙</div>
            <div>
              <div className="voice-said">&quot;{line.said}&quot;</div>
              <div className="voice-parsed">→ {line.parsed}</div>
            </div>
          </div>
        ))}
      </div>
      <p style={FOOTNOTE}>
        AI structureert het gesprokene automatisch in het dossier. Dit vervangt niet de eigen beoordeling van de
        EP-adviseur, die controleert en corrigeert waar nodig.
      </p>
    </>
  );
}

const PORTAL_DOCS: { name: string; status: 'ok' | 'warn'; text: string }[] = [
  { name: 'Bouwtekening_begane_grond.pdf', status: 'ok', text: 'Herkend: plattegrond komt overeen met de meetscan' },
  { name: 'Factuur_zonnepanelen.pdf', status: 'ok', text: 'Herkend: 8 panelen, 320 Wp per stuk, geïnstalleerd 2022' },
  { name: 'Warmtepomp_installatiebon.pdf', status: 'ok', text: 'Herkend: hybride warmtepomp, Daikin Altherma' },
  { name: 'Isolatiebewijs', status: 'warn', text: 'Ontbreekt nog, adviseur valt terug op bouwjaar-typering' },
];

function DocPortalPreview() {
  return (
    <>
      <div className="doc-tile-row">
        {PORTAL_DOCS.map((d) => (
          <div className="doc-tile" key={d.name}>
            <div className="doc-tile-icon">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="5" y="3" width="14" height="18" rx="1.5" />
                <path d="M8 8h8M8 12h8M8 16h5" />
              </svg>
            </div>
            <div>
              <div className="doc-tile-name">{d.name}</div>
              <div className={`doc-tile-status ${d.status}`}>
                {d.status === 'ok' ? '✓' : '⚠'} {d.text}
              </div>
            </div>
          </div>
        ))}
      </div>
      <button className="ghost-btn" style={{ marginTop: 14 }} disabled>
        Samenvatting naar adviseur gestuurd ✓
      </button>
    </>
  );
}

function QualityPreview() {
  return (
    <>
      <ul className="uitbr-warn-list">
        <li className="ok">Gevelisolatie ingevoerd</li>
        <li className="ok">Dakisolatie ingevoerd</li>
        <li className="warn">Ventilatiesysteem nog niet ingevoerd</li>
        <li className="warn">Foto van de meterkast ontbreekt</li>
        <li className="ok">Glassoort met onderbouwing ingevoerd</li>
        <li className="warn">Opgegeven oppervlakte wijkt 9% af van de BAG-registratie, controleer de meting</li>
      </ul>
      <p style={{ ...FOOTNOTE, marginTop: 12 }}>
        Deze controles lopen live mee tijdens de opname, zodat er niets wordt vergeten voordat de adviseur weer in de
        auto zit.
      </p>
    </>
  );
}

function OffertePreview() {
  return (
    <>
      <div className="report-doc" style={{ marginTop: 14, boxShadow: 'none', border: '1px solid var(--line)', padding: 20 }}>
        <div className="report-meta" style={{ marginTop: 0 }}>
          <div>
            <span className="l">Objecttype</span>
            <span className="v">Vrijstaande woning, 145 m²</span>
          </div>
          <div>
            <span className="l">Reisafstand</span>
            <span className="v">18 km (Dokkum)</span>
          </div>
        </div>
        <table className="room-table" style={{ marginTop: 14 }}>
          <tbody>
            <tr>
              <th>Onderdeel</th>
              <th style={{ textAlign: 'right' }}>Prijs</th>
            </tr>
            <tr>
              <td>Energielabel (NTA 8800)</td>
              <td style={{ textAlign: 'right' }}>€ 285</td>
            </tr>
            <tr>
              <td>Plattegrond + NEN 2580-rapport</td>
              <td style={{ textAlign: 'right' }}>€ 195</td>
            </tr>
            <tr>
              <td>Reiskosten</td>
              <td style={{ textAlign: 'right' }}>€ 15</td>
            </tr>
            <tr className="total">
              <td>Totaal (excl. btw)</td>
              <td style={{ textAlign: 'right' }}>€ 495</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p style={{ ...FOOTNOTE, marginTop: 12 }}>
        Automatisch samengesteld op basis van objecttype, oppervlak en reisafstand. Direct te versturen per e-mail of
        WhatsApp, met digitaal akkoord en automatische herinnering.
      </p>
    </>
  );
}

function RoutePreview() {
  return (
    <>
      <div className="route-compare">
        <div className="route-box">
          <div className="rv">118 km</div>
          <div className="rl">zonder clustering</div>
          <div className="route-stops">Dokkum → Sneek → Groningen → Leeuwarden → Heerenveen</div>
        </div>
        <div className="route-box hi">
          <div className="rv">76 km</div>
          <div className="rl">met automatische clustering</div>
          <div className="route-stops">Dokkum → Leeuwarden → Heerenveen → Sneek → Groningen</div>
        </div>
      </div>
      <p style={{ ...FOOTNOTE, marginTop: 12 }}>
        Afspraken van deze week automatisch gegroepeerd per regio, op basis van postcode, reistijd en verwachte
        opnameduur.
      </p>
    </>
  );
}
