'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { sendEmailAction, updateEmailAction } from '@/app/actions';
import { useApp, usePageHeader } from '@/components/platform/AppContext';
import { Modal, ModalSub, ModalTitle } from '@/components/ui/Modal';
import { avatarSrc } from '@/data/profiles';
import { nowStamp } from '@/lib/format';
import type { Email, EmailCategory, Profile, SentEmail } from '@/lib/types';

type Tab = 'inbox' | 'sent' | 'colleagues';

const EXTERN = '_extern';

const CATEGORY_LABEL: Record<EmailCategory, string> = {
  aanvraag: 'Aanvraag',
  intern: 'Intern',
  systeem: 'Systeem',
};

function aiReplyTextFor(e: Email, profile: Profile): string {
  const naam = profile.name.split(' ')[0];
  const wie = e.from.split(' ')[0];
  if (e.category === 'aanvraag') {
    return `Beste ${wie},\n\nDank voor uw bericht. We hebben uw aanvraag in behandeling genomen en plannen zo snel mogelijk een adviseur in voor de opname. U ontvangt hierover binnen 1 werkdag een bericht van ons.\n\nMet vriendelijke groet,\n${naam}\nKrik je energielabel op`;
  }
  if (e.category === 'intern') {
    return `Hoi,\n\nDank voor het melden. Ik pak dit op en laat je weten zodra het is afgehandeld.\n\nGroet,\n${naam}`;
  }
  return `Beste ${wie},\n\nDank voor uw e-mail. We nemen dit zo snel mogelijk in behandeling.\n\nMet vriendelijke groet,\n${naam}\nKrik je energielabel op`;
}

function BodyText({ text }: { text: string }) {
  return (
    <div className="email-detail-body">
      {text.split('\n').map((line, i) => (
        <p key={i}>{line || ' '}</p>
      ))}
    </div>
  );
}

export function EmailView() {
  const { emails, sentEmails, profiles, currentProfile, lang } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramId = searchParams.get('id');
  usePageHeader('E-mail');

  const [tab, setTab] = useState<Tab>('inbox');
  const [selectedId, setSelectedId] = useState<string | null>(paramId);
  const [selectedSentId, setSelectedSentId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);

  useEffect(() => {
    if (!paramId) return;
    setTab('inbox');
    setSelectedId(paramId);
  }, [paramId]);

  const inboxSorted = emails.slice().sort((a, b) => b.date.localeCompare(a.date));
  const selected = emails.find((e) => e.id === selectedId) ?? inboxSorted[0] ?? null;

  const sentSorted = sentEmails.slice().reverse();
  const selectedSent = sentEmails.find((s) => s.id === selectedSentId) ?? sentSorted[0] ?? null;

  const selectedUnreadId = selected && !selected.read ? selected.id : null;
  useEffect(() => {
    if (!selectedUnreadId) return;
    void updateEmailAction(selectedUnreadId, { read: true }).then(() => router.refresh());
  }, [selectedUnreadId, router]);

  const roleOf = (p: Profile) => (lang === 'en' ? p.roleEn : p.roleNl);
  const colleagues = profiles.filter((p) => p.id !== currentProfile.id);

  const tabs = (
    <div className="pub-lang-toggle" style={{ marginBottom: 16 }}>
      <button className={tab === 'inbox' ? 'active' : ''} onClick={() => setTab('inbox')}>
        Postvak IN
      </button>
      <button className={tab === 'sent' ? 'active' : ''} onClick={() => setTab('sent')}>
        Verzonden
      </button>
      <button className={tab === 'colleagues' ? 'active' : ''} onClick={() => setTab('colleagues')}>
        Collega&apos;s
      </button>
    </div>
  );

  const compose = (
    <>
      <button className="ghost-btn" style={{ marginBottom: 14 }} onClick={() => setComposeOpen(true)}>
        ✎ Nieuw bericht
      </button>
      {composeOpen && (
        <ComposeModal
          colleagues={colleagues}
          roleOf={roleOf}
          onClose={() => setComposeOpen(false)}
          onSent={(sent) => {
            setComposeOpen(false);
            setTab('sent');
            setSelectedSentId(sent.id);
            router.refresh();
          }}
        />
      )}
    </>
  );

  if (tab === 'colleagues') {
    return (
      <>
        {tabs}
        <div className="colleague-grid">
          {profiles.map((p) => (
            <div className="colleague-card" key={p.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatarSrc(p)} alt="" />
              <div className="colleague-name">{p.name}</div>
              <div className="colleague-role">{roleOf(p)}</div>
              <div className="colleague-contact">{p.email}</div>
              <div className="colleague-contact">{p.phone ?? ''}</div>
            </div>
          ))}
        </div>
      </>
    );
  }

  if (tab === 'sent') {
    return (
      <>
        {tabs}
        {compose}
        <div className="email-layout">
          <div className="email-list">
            {sentSorted.length === 0 ? (
              <div className="chart-empty" style={{ padding: 16 }}>
                Nog geen verzonden berichten.
              </div>
            ) : (
              sentSorted.map((s) => (
                <div
                  key={s.id}
                  className={`email-item${s.id === selectedSent?.id ? ' active' : ''}`}
                  onClick={() => setSelectedSentId(s.id)}
                >
                  <div className="email-item-top">
                    <span className="email-item-from">Aan: {s.toName}</span>
                    <span className="email-item-date">{s.date.split(' ')[0]}</span>
                  </div>
                  <div className="email-item-subject">{s.subject}</div>
                  <div className="email-item-badges">
                    <span className={`email-badge ${s.type === 'forward' ? 'systeem' : 'aanvraag'}`}>
                      {s.type === 'forward' ? 'Doorgestuurd' : 'Nieuw'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="email-detail">
            {selectedSent ? (
              <>
                <div className="email-detail-head">
                  <div className="email-detail-subject">{selectedSent.subject}</div>
                  <div className="email-detail-meta">
                    Aan: <b>{selectedSent.toName}</b>
                    {selectedSent.toName !== selectedSent.to ? ` <${selectedSent.to}>` : ''} · {selectedSent.date}
                  </div>
                </div>
                <BodyText text={selectedSent.body} />
              </>
            ) : (
              <div className="chart-empty">Geen bericht geselecteerd.</div>
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {tabs}
      {compose}
      <div className="email-layout">
        <div className="email-list">
          {inboxSorted.map((e) => (
            <div
              key={e.id}
              className={`email-item${e.id === selected?.id ? ' active' : ''}${e.read ? '' : ' unread'}`}
              onClick={() => setSelectedId(e.id)}
            >
              <div className="email-item-top">
                <span className="email-item-from">{e.from}</span>
                <span className="email-item-date">{e.date.split(' ')[0]}</span>
              </div>
              <div className="email-item-subject">{e.subject}</div>
              <div className="email-item-badges">
                <span className={`email-badge ${e.category}`}>{CATEGORY_LABEL[e.category]}</span>
                {!e.answered && e.category === 'aanvraag' && <span className="email-badge urgent">onbeantwoord</span>}
              </div>
            </div>
          ))}
        </div>
        <div className="email-detail">
          {selected ? (
            <EmailDetail key={selected.id} email={selected} colleagues={colleagues} roleOf={roleOf} />
          ) : (
            <div className="chart-empty">Geen e-mail geselecteerd.</div>
          )}
        </div>
      </div>
    </>
  );
}

function EmailDetail({
  email,
  colleagues,
  roleOf,
}: {
  email: Email;
  colleagues: Profile[];
  roleOf: (p: Profile) => string;
}) {
  const { currentProfile } = useApp();
  const router = useRouter();
  const [forwarding, setForwarding] = useState(false);
  const [reply, setReply] = useState('');
  const [aiState, setAiState] = useState<'idle' | 'loading' | 'done'>('idle');

  useEffect(() => {
    if (aiState !== 'loading') return;
    const t = setTimeout(() => {
      setReply(aiReplyTextFor(email, currentProfile));
      setAiState('done');
    }, 900);
    return () => clearTimeout(t);
  }, [aiState, email, currentProfile]);

  const markAnswered = async () => {
    await updateEmailAction(email.id, { answered: true });
    router.refresh();
  };

  const sendReply = async () => {
    const val = reply.trim();
    if (!val) return;
    await sendEmailAction({
      type: 'reply',
      to: email.fromEmail,
      toName: email.from,
      subject: 'Re: ' + email.subject,
      body: val,
      relatedId: email.id,
    });
    await updateEmailAction(email.id, { answered: true });
    setReply('');
    setAiState('idle');
    router.refresh();
  };

  return (
    <>
      <div className="email-detail-head">
        <div className="email-detail-subject">{email.subject}</div>
        <div className="email-detail-meta">
          <b>{email.from}</b> &lt;{email.fromEmail}&gt; · {email.date}
        </div>
      </div>
      <BodyText text={email.body} />
      {email.forwardedTo && (
        <div className="email-fwd-chip">
          ↪ Doorgestuurd naar {email.forwardedTo} · {email.forwardedAt}
        </div>
      )}
      <div className="email-detail-actions">
        <button className="ghost-btn" onClick={markAnswered} disabled={email.answered}>
          {email.answered ? '✓ Beantwoord' : 'Markeer als beantwoord'}
        </button>
        <button className="ghost-btn" onClick={() => setForwarding((v) => !v)}>
          ↪ {forwarding ? 'Annuleer doorsturen' : 'Doorsturen'}
        </button>
      </div>

      {forwarding && (
        <ForwardPanel
          email={email}
          colleagues={colleagues}
          roleOf={roleOf}
          onSent={() => {
            setForwarding(false);
            router.refresh();
          }}
        />
      )}

      <div className="note-compose" style={{ marginTop: 14 }}>
        <div className="ai-reply-row">
          <button
            className="ghost-btn"
            style={{ padding: '8px 14px', fontSize: 12.5 }}
            onClick={() => setAiState('loading')}
            disabled={aiState === 'loading'}
          >
            🤖 Genereer AI-antwoord
          </button>
          <span className={`pub-ai-check${aiState === 'loading' ? ' pub-ai-loading' : ''}`}>
            {aiState === 'loading' && '🤖 AI schrijft een antwoord...'}
            {aiState === 'done' && '✓ Concept gegenereerd door AI, controleer dit voordat u verstuurt.'}
          </span>
        </div>
        <textarea
          placeholder="Schrijf een antwoord..."
          value={reply}
          onChange={(ev) => setReply(ev.target.value)}
        />
        <button className="ghost-btn" onClick={sendReply}>
          Verstuur antwoord
        </button>
      </div>
    </>
  );
}

function ForwardPanel({
  email,
  colleagues,
  roleOf,
  onSent,
}: {
  email: Email;
  colleagues: Profile[];
  roleOf: (p: Profile) => string;
  onSent: () => void;
}) {
  const [to, setTo] = useState(colleagues[0]?.id ?? EXTERN);
  const [external, setExternal] = useState('');
  const [note, setNote] = useState('');

  const send = async () => {
    let toName: string;
    let toEmail: string;
    if (to === EXTERN) {
      toEmail = external.trim();
      if (!toEmail) return;
      toName = toEmail;
    } else {
      const p = colleagues.find((x) => x.id === to);
      if (!p) return;
      toName = p.name;
      toEmail = p.email;
    }
    const body =
      (note.trim() ? note.trim() + '\n\n' : '') +
      '---------- Doorgestuurd bericht ----------\n' +
      `Van: ${email.from} <${email.fromEmail}>\n` +
      `Datum: ${email.date}\n` +
      `Onderwerp: ${email.subject}\n\n` +
      email.body;
    await sendEmailAction({
      type: 'forward',
      to: toEmail,
      toName,
      subject: 'Fwd: ' + email.subject,
      body,
      relatedId: email.id,
    });
    await updateEmailAction(email.id, { forwardedTo: toName, forwardedAt: nowStamp() });
    onSent();
  };

  return (
    <div className="note-compose" style={{ marginTop: 14 }}>
      <div className="field">
        <label>Doorsturen naar</label>
        <select value={to} onChange={(e) => setTo(e.target.value)}>
          {colleagues.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({roleOf(p)})
            </option>
          ))}
          <option value={EXTERN}>Anders (extern e-mailadres)</option>
        </select>
      </div>
      {to === EXTERN && (
        <div className="field">
          <label>E-mailadres</label>
          <input
            type="email"
            placeholder="naam@voorbeeld.nl"
            value={external}
            onChange={(e) => setExternal(e.target.value)}
          />
        </div>
      )}
      <textarea
        placeholder="Voeg eventueel een toelichting toe..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <button className="ghost-btn" onClick={send}>
        Verstuur doorgestuurde e-mail
      </button>
    </div>
  );
}

function ComposeModal({
  colleagues,
  roleOf,
  onClose,
  onSent,
}: {
  colleagues: Profile[];
  roleOf: (p: Profile) => string;
  onClose: () => void;
  onSent: (sent: SentEmail) => void;
}) {
  const [to, setTo] = useState(colleagues[0]?.id ?? EXTERN);
  const [external, setExternal] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const send = async () => {
    let toName: string;
    let toEmail: string;
    if (to === EXTERN) {
      toEmail = external.trim();
      if (!toEmail) return;
      toName = toEmail;
    } else {
      const p = colleagues.find((x) => x.id === to);
      if (!p) return;
      toName = p.name;
      toEmail = p.email;
    }
    if (!subject.trim() || !body.trim()) return;
    const sent = await sendEmailAction({
      type: 'new',
      to: toEmail,
      toName,
      subject: subject.trim(),
      body: body.trim(),
      relatedId: null,
    });
    onSent(sent);
  };

  return (
    <Modal open onClose={onClose}>
      <ModalTitle>Nieuw bericht</ModalTitle>
      <ModalSub>Verstuur een nieuw e-mailbericht vanuit Krik je energielabel op.</ModalSub>
      <div className="pub-field">
        <label>Aan</label>
        <select value={to} onChange={(e) => setTo(e.target.value)}>
          {colleagues.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({roleOf(p)})
            </option>
          ))}
          <option value={EXTERN}>Anders (extern e-mailadres)</option>
        </select>
      </div>
      {to === EXTERN && (
        <div className="pub-field">
          <label>E-mailadres</label>
          <input
            type="email"
            placeholder="naam@voorbeeld.nl"
            value={external}
            onChange={(e) => setExternal(e.target.value)}
          />
        </div>
      )}
      <div className="pub-field">
        <label>Onderwerp</label>
        <input type="text" placeholder="Onderwerp" value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>
      <div className="pub-field">
        <label>Bericht</label>
        <textarea
          placeholder="Schrijf uw bericht..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          style={{
            width: '100%',
            minHeight: 120,
            padding: '10px 12px',
            border: '1px solid var(--line)',
            borderRadius: 9,
            fontSize: 14,
            fontFamily: 'inherit',
            background: 'var(--surface)',
            color: 'var(--ink)',
            resize: 'vertical',
          }}
        />
      </div>
      <button className="primary-btn" style={{ width: '100%', justifyContent: 'center', marginTop: 6 }} onClick={send}>
        Versturen
      </button>
    </Modal>
  );
}
