'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { getStatus } from '@/lib/domain';
import { fmtNum } from '@/lib/format';
import type { CaptureSession, Property } from '@/lib/types';
import { useApp, usePageHeader } from '@/components/platform/AppContext';

type LookupUnavailable = { source: string; reason: string };

export function ScanView() {
  const { properties, currentProfile } = useApp();
  const params = useSearchParams();
  const router = useRouter();
  const preselect = params.get('pand');

  const [propertyId, setPropertyId] = useState<string | null>(preselect);
  const [token, setToken] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [session, setSession] = useState<CaptureSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const property = useMemo(() => properties.find((p) => p.id === propertyId) ?? null, [properties, propertyId]);
  usePageHeader('Nieuwe scan', property ? `${property.address}, ${property.city}` : '');

  const start = useCallback(
    async (id: string) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch('/api/capture', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ propertyId: id, createdBy: currentProfile.id }),
        });
        const json = (await res.json()) as { token?: string; error?: string };
        if (!res.ok || !json.token) throw new Error(json.error ?? 'Opnamelink aanmaken is mislukt');
        setToken(json.token);
        const url = `${window.location.origin}/capture/${json.token}`;
        setQr(await QRCode.toDataURL(url, { width: 480, margin: 1, color: { dark: '#024847', light: '#ffffff' } }));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Opnamelink aanmaken is mislukt');
      } finally {
        setBusy(false);
      }
    },
    [currentProfile.id],
  );

  useEffect(() => {
    if (preselect && !token && !busy) void start(preselect);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselect]);

  useEffect(() => {
    if (!token) return;
    let stopped = false;
    let id: ReturnType<typeof setInterval> | undefined;
    const poll = async () => {
      if (stopped) return;
      try {
        const res = await fetch(`/api/capture/${token}`, { cache: 'no-store' });
        if (!res.ok) return;
        const json = (await res.json()) as { session: CaptureSession };
        if (stopped) return;
        setSession(json.session);
        if (json.session.status === 'processed') {
          stopped = true;
          if (id) clearInterval(id);
          router.refresh();
        }
      } catch {
        // netwerkfout: de volgende ronde probeert het opnieuw
      }
    };
    void poll();
    id = setInterval(poll, 4000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [token, router]);

  const captureUrl = token ? `${typeof window === 'undefined' ? '' : window.location.origin}/capture/${token}` : '';

  return (
    <div style={{ maxWidth: 900 }}>
      {!token && (
        <>
          <div className="section-label">Kies een pand</div>
          <PropertyPicker properties={properties} value={propertyId} onChange={setPropertyId} />
          <div className="start-row">
            <button className="start-btn" disabled={!propertyId || busy} onClick={() => propertyId && void start(propertyId)}>
              {busy ? 'Bezig…' : '📷 Opnamelink maken'}
            </button>
          </div>
          <NewPropertyForm onCreated={(p) => setPropertyId(p.id)} />
        </>
      )}

      {error && <div className="note-box">{error}</div>}

      {token && (
        <div className="panel">
          <h3>Open de opname op de telefoon</h3>
          <div className="scan-link-grid">
            <div>
              {qr && (
                <div className="scan-qr">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qr} alt="QR-code naar de opname" />
                </div>
              )}
            </div>
            <div>
              <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.55 }}>
                Scan de code met de telefoon van de opnemer, of stuur de link door. De opname werkt zonder inloggen en
                blijft doorlopen zonder bereik.
              </p>
              <div className="scan-link-row">
                <input readOnly value={captureUrl} onClick={(e) => e.currentTarget.select()} />
                <button className="ghost-btn" onClick={() => void navigator.clipboard.writeText(captureUrl)}>
                  Kopieer
                </button>
                <a className="ghost-btn" href={captureUrl} target="_blank" rel="noreferrer">
                  Openen
                </a>
              </div>

              <SessionStatus session={session} />

              {session?.status === 'processed' && property && (
                <div style={{ marginTop: 16 }}>
                  <Link className="primary-btn" href={`/panden/${property.id}`}>
                    Naar het pand →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SessionStatus({ session }: { session: CaptureSession | null }) {
  const steps: { key: CaptureSession['status'][]; label: string }[] = [
    { key: ['open'], label: 'Wacht op de telefoon' },
    { key: ['capturing'], label: 'Opname bezig' },
    { key: ['uploaded'], label: 'Opname ontvangen' },
    { key: ['processing'], label: 'Plattegrond en meetstaat opbouwen' },
    { key: ['processed'], label: 'Klaar in het platform' },
  ];
  const order: CaptureSession['status'][] = ['open', 'capturing', 'uploaded', 'processing', 'processed'];
  const current = session ? order.indexOf(session.status) : 0;

  return (
    <div className="scan-status-list">
      {steps.map((s, i) => (
        <div key={s.label} className={`scan-status-row${i < current ? ' done' : i === current ? ' active' : ''}`}>
          <span className="scan-status-dot" />
          {s.label}
          {i === 1 && session && session.rooms.length > 0 && (
            <span style={{ marginLeft: 'auto', fontSize: 12 }}>
              {session.rooms.length} ruimtes · {fmtNum(session.photos.length)} foto&apos;s
            </span>
          )}
        </div>
      ))}
      {session?.error && <div className="note-box">{session.error}</div>}
    </div>
  );
}

function PropertyPicker({
  properties,
  value,
  onChange,
}: {
  properties: Property[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  const waiting = properties.filter((p) => getStatus(p).key === 'wait');
  const rest = properties.filter((p) => getStatus(p).key !== 'wait');
  return (
    <div className="table-wrap" style={{ marginBottom: 18 }}>
      <table className="dtable">
        <tbody>
          {[...waiting, ...rest].map((p) => (
            <tr key={p.id} onClick={() => onChange(p.id)} style={value === p.id ? { background: 'var(--amber-soft)' } : undefined}>
              <td>
                <div className="dt-addr">{p.address}</div>
                <div className="dt-city">{p.city}</div>
              </td>
              <td className="dt-mode">{p.type}</td>
              <td>
                <span className={`pill st-${getStatus(p).key}`}>
                  <span className="dot2" />
                  {getStatus(p).label}
                </span>
              </td>
              <td>{value === p.id ? <span className="dt-open">Gekozen</span> : null}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NewPropertyForm({ onCreated }: { onCreated: (p: Property) => void }) {
  const router = useRouter();
  const [postcode, setPostcode] = useState('');
  const [huisnummer, setHuisnummer] = useState('');
  const [busy, setBusy] = useState(false);
  const [sources, setSources] = useState<LookupUnavailable[]>([]);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/property', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ postcode, huisnummer }),
      });
      const json = (await res.json()) as { property?: Property; sources?: LookupUnavailable[]; error?: string };
      if (!res.ok || !json.property) throw new Error(json.error ?? 'Pand aanmaken is mislukt');
      setSources(json.sources ?? []);
      onCreated(json.property);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pand aanmaken is mislukt');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel" style={{ maxWidth: 520 }}>
      <h3>Of voeg een nieuw pand toe</h3>
      <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 12 }}>
        Adres, plaats en coördinaten komen uit de BAG via PDOK. Bouwjaar en een bestaand label worden opgehaald zodra de
        sleutels voor de BAG- en EP-Online-API zijn ingesteld.
      </p>
      <div className="pub-row2">
        <div className="pub-field">
          <label>Postcode</label>
          <input value={postcode} placeholder="8911 AB" onChange={(e) => setPostcode(e.target.value)} />
        </div>
        <div className="pub-field">
          <label>Huisnummer</label>
          <input value={huisnummer} placeholder="12" onChange={(e) => setHuisnummer(e.target.value)} />
        </div>
      </div>
      <button className="ghost-btn" disabled={busy || !postcode || !huisnummer} onClick={() => void submit()}>
        {busy ? 'Opzoeken…' : 'Pand toevoegen'}
      </button>
      {error && <div className="note-box" style={{ marginTop: 12 }}>{error}</div>}
      {sources.length > 0 && (
        <ul style={{ marginTop: 12, paddingLeft: 18, fontSize: 12.5, color: 'var(--ink-faint)', lineHeight: 1.6 }}>
          {sources.map((s) => (
            <li key={s.source}>
              <b>{s.source}</b>: {s.reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
