'use client';

import Link from 'next/link';
import { useApp } from './AppContext';

export function UrgentEmailWidget() {
  const { emails, isAdmin, currentProfile } = useApp();
  const list = emails
    .filter((e) => !e.answered && (isAdmin || e.assignedTo === currentProfile.id || e.assignedTo === null))
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="panel">
      <h3>
        <span>Urgente e-mails en follow-ups</span>
        <Link className="ghost-btn" style={{ padding: '6px 12px', fontSize: 12 }} href="/email">
          Naar postvak →
        </Link>
      </h3>
      {list.length === 0 ? (
        <div className="chart-empty">Geen openstaande e-mails.</div>
      ) : (
        <div className="task-list">
          {list.slice(0, 5).map((e) => (
            <Link key={e.id} className="task-row" style={{ cursor: 'pointer' }} href={`/email?id=${e.id}`}>
              <div className="notif-icon warning" style={{ width: 26, height: 26, fontSize: 12, flex: 'none' }}>
                ✉
              </div>
              <div className="task-row-text">
                <div className="task-row-title">{e.subject}</div>
                <div className="task-row-meta">
                  {e.from} · {e.date}
                  {!e.read && (
                    <>
                      {' · '}
                      <b style={{ color: '#8a5a00' }}>ongelezen</b>
                    </>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
