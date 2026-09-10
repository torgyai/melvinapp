'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { flushQueue, listQueue, loadRooms, saveRooms } from '@/lib/capture/local-store';
import { tidy } from '@/lib/capture/rooms';
import { isArSupported } from '@/lib/capture/webxr';
import { fmtNum } from '@/lib/format';
import type { CaptureRoom, CaptureSession, Opening, Property, Pt } from '@/lib/types';
import { MeasureAr } from './MeasureAr';
import { MeasureCamera } from './MeasureCamera';
import { MeasureSweep } from './MeasureSweep';
import { MeasureTap } from './MeasureTap';
import { MeasureWalls } from './MeasureWalls';
import { RoomPhotos, type PendingPhoto } from './RoomPhotos';
import { RoomPreview } from './RoomPreview';

type Step = 'intro' | 'room' | 'sweep' | 'camera' | 'ar' | 'walls' | 'tap' | 'photos' | 'review' | 'sent';

const FLOORS = ['Begane grond', 'Eerste verdieping', 'Tweede verdieping', 'Zolder', 'Kelder', 'Berging'];
const ROOM_SUGGESTIONS = [
  'Woonkamer', 'Keuken', 'Hal', 'Toilet', 'Bijkeuken', 'Slaapkamer', 'Badkamer', 'Overloop',
  'Zolder', 'Garage', 'Berging', 'Inloopkast',
];

export function CaptureApp({ session, property }: { session: CaptureSession; property: Property | null }) {
  const token = session.token;
  const [step, setStep] = useState<Step>('intro');
  const [rooms, setRooms] = useState<CaptureRoom[]>(session.rooms);
  const [photos, setPhotos] = useState<Record<string, PendingPhoto[]>>({});
  const [arSupported, setArSupported] = useState(false);
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ totalArea: number; warnings: string[] } | null>(null);

  const [roomName, setRoomName] = useState('');
  const [floorName, setFloorName] = useState(FLOORS[0]!);
  const [height, setHeight] = useState('');
  const [currentRoom, setCurrentRoom] = useState<CaptureRoom | null>(null);
  const [methodNote, setMethodNote] = useState<string | null>(null);

  useEffect(() => {
    void isArSupported().then(setArSupported);
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => {
    void loadRooms(token).then((stored) => {
      if (stored?.length && stored.length > session.rooms.length) setRooms(stored);
    });
  }, [token, session.rooms.length]);

  const syncRooms = useCallback(
    async (next: CaptureRoom[]) => {
      const stored = await saveRooms(token, next);
      if (!stored) {
        setError('Deze browser mag niets lokaal bewaren. Werk door met bereik, anders gaan ruimtes verloren.');
      }
      try {
        const res = await fetch(`/api/capture/${token}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ rooms: next, status: 'capturing' }),
        });
        if (res.status === 409) {
          setError('Deze opname is al verwerkt. Start een nieuwe opname voor dit pand om verder te gaan.');
          return false;
        }
        if (!res.ok) {
          setError('De ruimtes konden niet worden opgeslagen op de server. Ze staan lokaal en gaan mee bij de volgende poging.');
          return false;
        }
        setError(null);
        return true;
      } catch {
        // Geen bereik: de ruimtes staan lokaal en gaan bij de volgende poging mee.
        return false;
      }
    },
    [token],
  );

  useEffect(() => {
    const tick = async () => {
      const q = await listQueue(token);
      setPending(q.length);
      if (navigator.onLine && q.length) {
        await flushQueue(token);
        setPending((await listQueue(token)).length);
      }
    };
    void tick();
    const id = setInterval(tick, 8000);
    return () => clearInterval(id);
  }, [token]);

  const totalArea = useMemo(() => rooms.reduce((s, r) => s + (r.poly ? areaOfRoom(r) : 0), 0), [rooms]);

  const startRoom = () => {
    setMethodNote(null);
    setRoomName('');
    setHeight('');
    setCurrentRoom(null);
    setStep('room');
  };

  const onMeasured = (
    poly: Pt[],
    _area: number,
    method: CaptureRoom['method'],
    heading?: number | null,
    measuredHeight?: number | null,
    openings?: Opening[],
  ) => {
    const clean = tidy(poly);
    const room: CaptureRoom = {
      clientId: crypto.randomUUID(),
      name: roomName.trim() || `Ruimte ${rooms.length + 1}`,
      floorName,
      method,
      poly: clean,
      height: measuredHeight ?? (Number(height.replace(',', '.')) || undefined),
      heading: heading ?? undefined,
      openings: openings?.length ? openings : undefined,
      photoIds: [],
    };
    setCurrentRoom(room);
    setStep('photos');
  };

  const saveRoom = async () => {
    if (!currentRoom) return;
    const next = [...rooms, currentRoom];
    setRooms(next);
    setCurrentRoom(null);
    await syncRooms(next);
    setStep('review');
  };

  const removeRoom = async (clientId: string) => {
    const next = rooms.filter((r) => r.clientId !== clientId);
    setRooms(next);
    await syncRooms(next);
  };

  /**
   * A finished capture is closed. Picking the work up again opens a new session
   * for the same property, so the server never re-processes an old room list.
   */
  const startFollowUp = async () => {
    if (!property) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/capture', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ propertyId: property.id, createdBy: session.createdBy }),
      });
      const json = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !json.token) throw new Error(json.error ?? 'Nieuwe opname starten is mislukt');
      window.location.href = `/capture/${json.token}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nieuwe opname starten is mislukt');
      setBusy(false);
    }
  };

  const finish = async () => {
    setBusy(true);
    setError(null);
    try {
      await flushQueue(token);
      const synced = await syncRooms(rooms);
      if (!synced) {
        setBusy(false);
        return;
      }
      await fetch(`/api/capture/${token}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'uploaded' }),
      });
      const res = await fetch(`/api/capture/${token}/finish`, { method: 'POST' });
      const json = (await res.json()) as { totalArea?: number; warnings?: string[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Verzenden is mislukt');
      setResult({ totalArea: json.totalArea ?? 0, warnings: json.warnings ?? [] });
      setStep('sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verzenden is mislukt');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cap-app">
      <header className="cap-header">
        <div>
          <div className="cap-address">{property ? property.address : 'Opname'}</div>
          <div className="cap-city">{property?.city}</div>
        </div>
        <div className="cap-status">
          <span className={`cap-dot${online ? ' on' : ''}`} />
          {online ? 'verbonden' : 'offline'}
          {pending > 0 && <span className="cap-pending">{pending} foto&apos;s in wachtrij</span>}
        </div>
      </header>

      <main className="cap-main">
        {step === 'intro' && (
          <div className="cap-panel">
            <div className="cap-panel-title">Opname starten</div>
            <p className="cap-help">
              Neem de ruimtes één voor één op. Per ruimte leg je de vorm vast en maak je foto&apos;s. Alles wordt
              lokaal bewaard, dus je kunt zonder bereik doorwerken.
            </p>
            <ul className="cap-steps">
              <li>Kies de verdieping en de naam van de ruimte</li>
              <li>Leg de vorm vast: met AR, muur voor muur, of door de hoeken aan te tikken</li>
              <li>Maak foto&apos;s van de ruimte, de installatie en de meterkast</li>
              <li>Verstuur de opname als je klaar bent</li>
            </ul>
            <div className="cap-actions">
              <button className="cap-btn" onClick={startRoom}>
                Beginnen
              </button>
              {rooms.length > 0 && (
                <button className="cap-btn ghost" onClick={() => setStep('review')}>
                  {rooms.length} ruimtes al opgenomen
                </button>
              )}
            </div>
          </div>
        )}

        {step === 'room' && (
          <div className="cap-panel">
            <div className="cap-panel-title">Nieuwe ruimte</div>
            <label className="cap-field">
              <span>Verdieping</span>
              <select value={floorName} onChange={(e) => setFloorName(e.target.value)}>
                {FLOORS.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </label>
            <label className="cap-field">
              <span>Naam ruimte</span>
              <input value={roomName} placeholder="Woonkamer" onChange={(e) => setRoomName(e.target.value)} />
            </label>
            <div className="cap-suggestions">
              {ROOM_SUGGESTIONS.map((s) => (
                <button key={s} className="cap-chip" onClick={() => setRoomName(s)}>
                  {s}
                </button>
              ))}
            </div>
            <label className="cap-field">
              <span>Vrije hoogte (m, optioneel)</span>
              <input inputMode="decimal" value={height} placeholder="2,60" onChange={(e) => setHeight(e.target.value)} />
            </label>

            {methodNote && <div className="cap-note warn">{methodNote}</div>}
            <div className="cap-panel-title small">Hoe meet je deze ruimte?</div>
            <div className="cap-methods">
              <button
                className="cap-method primary"
                onClick={() => {
                  setMethodNote(null);
                  setStep('sweep');
                }}
              >
                <strong>Ruimte rondscannen</strong>
                <span>Draai één keer rond, de plattegrond tekent zichzelf</span>
              </button>
              <button
                className="cap-method"
                onClick={() => {
                  setMethodNote(null);
                  setStep('camera');
                }}
              >
                <strong>Hoek voor hoek richten</strong>
                <span>Voor ruimtes met veel meubels of een L-vorm</span>
              </button>
              {arSupported && (
                <button className="cap-method" onClick={() => setStep('ar')}>
                  <strong>AR-opname</strong>
                  <span>Met dieptemeting van de telefoon, nog nauwkeuriger</span>
                </button>
              )}
              <button className="cap-method" onClick={() => setStep('walls')}>
                <strong>Muur voor muur</strong>
                <span>Lengtes van de lasermeter, exacte maten</span>
              </button>
              <button className="cap-method" onClick={() => setStep('tap')}>
                <strong>Hoeken aantikken</strong>
                <span>Op het camerabeeld, met één gemeten muur</span>
              </button>
            </div>
            <div className="cap-actions">
              <button className="cap-btn ghost" onClick={() => setStep(rooms.length ? 'review' : 'intro')}>
                Terug
              </button>
            </div>
          </div>
        )}

        {step === 'sweep' && (
          <MeasureSweep
            onDone={(r) => onMeasured(r.poly, r.area, 'camera', r.heading, r.height, r.openings)}
            onCancel={() => setStep('room')}
            onUnsupported={(reason) => {
              setMethodNote(reason);
              setStep('room');
            }}
          />
        )}
        {step === 'camera' && (
          <MeasureCamera
            onDone={(p, a, heading) => onMeasured(p, a, 'camera', heading)}
            onCancel={() => setStep('room')}
            onUnsupported={(reason) => {
              setMethodNote(reason);
              setStep('room');
            }}
          />
        )}
        {step === 'ar' && <MeasureAr onDone={(p, a) => onMeasured(p, a, 'ar')} onCancel={() => setStep('room')} />}
        {step === 'walls' && <MeasureWalls onDone={(p, a) => onMeasured(p, a, 'manual')} onCancel={() => setStep('room')} />}
        {step === 'tap' && <MeasureTap onDone={(p, a) => onMeasured(p, a, 'manual')} onCancel={() => setStep('room')} />}

        {step === 'photos' && currentRoom && (
          <div className="cap-panel">
            <div className="cap-panel-title">
              Foto&apos;s · {currentRoom.name}
            </div>
            <RoomPreview poly={currentRoom.poly} area={areaOfRoom(currentRoom)} size={200} />
            <RoomPhotos
              token={token}
              roomClientId={currentRoom.clientId}
              photos={photos[currentRoom.clientId] ?? []}
              onAdd={(p) => {
                setPhotos((all) => ({ ...all, [currentRoom.clientId]: [...(all[currentRoom.clientId] ?? []), p] }));
                setCurrentRoom((r) => (r ? { ...r, photoIds: [...r.photoIds, p.id] } : r));
              }}
            />
            <div className="cap-actions">
              <button className="cap-btn" onClick={() => void saveRoom()}>
                Ruimte opslaan
              </button>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="cap-panel">
            <div className="cap-panel-title">Opgenomen ruimtes</div>
            {rooms.length === 0 ? (
              <p className="cap-help">Nog geen ruimtes opgenomen.</p>
            ) : (
              <ul className="cap-room-list">
                {rooms.map((r) => (
                  <li key={r.clientId}>
                    <div>
                      <strong>{r.name}</strong>
                      <span className="cap-room-meta">
                        {r.floorName} · {fmtNum(areaOfRoom(r))} m²
                        {r.height ? ` · ${fmtNum(r.height, 2)} m hoog` : ''}
                      </span>
                    </div>
                    <button className="cap-linkbtn" onClick={() => void removeRoom(r.clientId)}>
                      verwijder
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {rooms.length > 0 && (
              <div className="cap-total">
                Totaal {fmtNum(Math.round(totalArea * 10) / 10)} m² over {new Set(rooms.map((r) => r.floorName)).size} verdieping(en)
              </div>
            )}
            {error && <div className="cap-note warn">{error}</div>}
            <div className="cap-actions">
              <button className="cap-btn ghost" onClick={startRoom}>
                Volgende ruimte
              </button>
              <button className="cap-btn" disabled={!rooms.length || busy} onClick={() => void finish()}>
                {busy ? 'Versturen…' : 'Opname versturen'}
              </button>
            </div>
          </div>
        )}

        {step === 'sent' && result && (
          <div className="cap-panel">
            <div className="cap-panel-title">Opname verstuurd</div>
            <p className="cap-help">
              {rooms.length} ruimtes, {fmtNum(result.totalArea)} m². De plattegrond en de meetstaat staan klaar in het
              platform.
            </p>
            {result.warnings.length > 0 && (
              <ul className="cap-warnings">
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}
            <div className="cap-actions">
              <button className="cap-btn ghost" disabled={busy} onClick={() => void startFollowUp()}>
                Nog een ruimte opnemen
              </button>
            </div>
            {error && <div className="cap-note warn">{error}</div>}
          </div>
        )}
      </main>
    </div>
  );
}

function areaOfRoom(r: CaptureRoom): number {
  let sum = 0;
  for (let i = 0; i < r.poly.length; i++) {
    const a = r.poly[i]!;
    const b = r.poly[(i + 1) % r.poly.length]!;
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.round(Math.abs(sum / 2) * 10) / 10;
}
