'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { addNoteAction } from '@/app/actions';
import { useApp } from '@/components/platform/AppContext';
import { avatarSrc } from '@/data/profiles';
import { addDays, fmtNlDate, hashStr, parseNlDate } from '@/lib/format';
import type { Note, Profile, Property } from '@/lib/types';

interface ActivityEvent {
  date: Date;
  text: string;
  icon: string;
}

function activityFor(p: Property, profiles: Profile[]): ActivityEvent[] {
  const base = p.meetrapport?.inmeetdatum ? parseNlDate(p.meetrapport.inmeetdatum) : new Date(2026, 0, 1);
  const off = hashStr(p.id) % 5;
  const events: ActivityEvent[] = [
    { date: base, text: `Meetrapport ontvangen van ${p.meetrapport ? p.meetrapport.naam : 'opnameteam'}`, icon: '📋' },
  ];
  if (p.photoCount > 0) {
    events.push({ date: addDays(base, 1), text: `${p.photoCount} foto's toegevoegd aan de opname`, icon: '📷' });
  }
  if (p.assignedTo) {
    const a = profiles.find((x) => x.id === p.assignedTo);
    events.push({ date: addDays(base, 1 + (off % 2)), text: `Toegewezen aan ${a ? a.name : 'adviseur'}`, icon: '👤' });
  }
  if (p.label) {
    events.push({ date: addDays(base, 3 + off), text: `Energielabel berekend: ${p.label}`, icon: '⚡' });
  }
  if (p.lifecycle === 'ready') {
    events.push({ date: addDays(base, 4 + off), text: 'Klaar voor controle door klant', icon: '✅' });
  }
  if (p.lifecycle === 'done') {
    events.push({ date: addDays(base, 4 + off), text: 'Eindrapport gecontroleerd en verzonden naar klant', icon: '✅' });
  }
  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
}

function NotesPanel({ p, notes, style }: { p: Property; notes: Note[]; style?: React.CSSProperties }) {
  const { profiles, currentProfile } = useApp();
  const router = useRouter();
  const [text, setText] = useState('');
  const [pending, startTransition] = useTransition();

  const place = () => {
    const value = text.trim();
    if (!value) return;
    setText('');
    startTransition(async () => {
      await addNoteAction(p.id, currentProfile.id, currentProfile.name, value);
      router.refresh();
    });
  };

  return (
    <div className="panel notes-panel" style={style}>
      <h3 style={{ marginBottom: 2 }}>Interne notities</h3>
      <div className="notes-list">
        {notes.length === 0 ? (
          <div className="note-empty">Nog geen notities.</div>
        ) : (
          notes.map((n) => {
            const author = profiles.find((x) => x.id === n.authorId);
            return (
              <div className="note-row" key={n.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="note-avatar"
                  src={avatarSrc(author ?? { name: n.author, avatarColor: '#036361', avatarUrl: null })}
                  alt=""
                />
                <div className="note-body">
                  <div className="note-head">
                    <span className="note-author">{n.author}</span>
                    <span className="note-ts">{n.ts}</span>
                  </div>
                  <div className="note-text">{n.text}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="note-compose">
        <textarea
          placeholder="Notitie voor collega's..."
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="ghost-btn" onClick={place} disabled={pending}>
          Plaatsen
        </button>
      </div>
    </div>
  );
}

export function ActivityNotes({ p, notes }: { p: Property; notes: Note[] }) {
  const { profiles } = useApp();
  const events = activityFor(p, profiles);
  return (
    <>
      <div className="section-label" style={{ marginTop: 30 }}>
        Activiteit &amp; notities
      </div>
      <div className="activity-notes-grid">
        <div className="panel activity-panel">
          <h3 style={{ marginBottom: 2 }}>Tijdlijn</h3>
          <div className="activity-list">
            {events.map((e, i) => (
              <div className="activity-row" key={`${e.text}-${i}`}>
                <div className="activity-icon">{e.icon}</div>
                <div className="activity-body">
                  <div className="activity-text">{e.text}</div>
                  <div className="activity-date">{fmtNlDate(e.date)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <NotesPanel p={p} notes={notes} />
      </div>
    </>
  );
}

export function NotesOnly({ p, notes }: { p: Property; notes: Note[] }) {
  return (
    <>
      <div className="section-label" style={{ marginTop: 30 }}>
        Notities
      </div>
      <NotesPanel p={p} notes={notes} style={{ maxWidth: 520 }} />
    </>
  );
}
