'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { saveTaskAction, toggleTaskAction } from '@/app/actions';
import { avatarSrc } from '@/data/profiles';
import type { Task } from '@/lib/types';
import { Modal, ModalSub, ModalTitle } from '@/components/ui/Modal';
import { useApp } from './AppContext';

export function TasksWidget() {
  const { tasks, profiles, isAdmin, currentProfile } = useApp();
  const [editing, setEditing] = useState<Task | null | undefined>(undefined);

  const list = isAdmin
    ? tasks.filter((t) => !t.done).sort((a, b) => (a.due || '').localeCompare(b.due || ''))
    : tasks.filter((t) => !t.done && t.assignedTo === currentProfile.id);

  return (
    <div className="panel">
      <h3>
        <span>Taken</span>
        {isAdmin && (
          <button className="ghost-btn" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setEditing(null)}>
            + Taak toewijzen
          </button>
        )}
      </h3>
      {list.length === 0 ? (
        <div className="chart-empty">Geen openstaande taken{isAdmin ? '' : ' voor jou'}.</div>
      ) : (
        <div className="task-list">
          {list.map((t) => {
            const a = profiles.find((x) => x.id === t.assignedTo);
            return (
              <div className="task-row" key={t.id}>
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={(e) => {
                    e.stopPropagation();
                    void toggleTaskAction(t.id);
                  }}
                />
                <div
                  className="task-row-text"
                  style={isAdmin ? { cursor: 'pointer' } : undefined}
                  onClick={isAdmin ? () => setEditing(t) : undefined}
                >
                  <div className="task-row-title">{t.title}</div>
                  <div className="task-row-meta">
                    {isAdmin && a ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img className="chip-avatar" src={avatarSrc(a)} alt="" /> {a.name} ·{' '}
                      </>
                    ) : null}
                    {t.due ? `deadline ${t.due}` : 'geen deadline'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {editing !== undefined && <TaskModal task={editing} onClose={() => setEditing(undefined)} />}
    </div>
  );
}

function TaskModal({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const { profiles, lang } = useApp();
  const router = useRouter();
  const advisors = profiles.filter((p) => p.role !== 'admin');
  const [title, setTitle] = useState(task?.title ?? '');
  const [assignedTo, setAssignedTo] = useState(task?.assignedTo ?? advisors[0]?.id ?? '');
  const [due, setDue] = useState(task?.due ?? '');

  return (
    <Modal open onClose={onClose}>
      <ModalTitle>{task ? 'Taak bewerken' : 'Taak toewijzen'}</ModalTitle>
      <ModalSub>{task ? 'Wijzig de taak of wijs opnieuw toe' : 'Nieuwe taak voor een collega'}</ModalSub>
      <div className="pub-field">
        <label>Titel</label>
        <input type="text" placeholder="Bijv. Opname inplannen bij ..." value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="pub-field">
        <label>Toewijzen aan</label>
        <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
          {advisors.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({lang === 'en' ? a.roleEn : a.roleNl})
            </option>
          ))}
        </select>
      </div>
      <div className="pub-field">
        <label>Deadline</label>
        <input type="text" placeholder="Bijv. 12-09-2026" value={due} onChange={(e) => setDue(e.target.value)} />
      </div>
      <button
        className="start-btn"
        style={{ width: '100%', justifyContent: 'center' }}
        onClick={async () => {
          if (!title.trim()) return;
          await saveTaskAction({
            id: task?.id ?? `t${Date.now()}`,
            title: title.trim(),
            assignedTo,
            due: due.trim(),
            done: task?.done ?? false,
          });
          onClose();
          router.refresh();
        }}
      >
        {task ? 'Wijzigingen opslaan' : 'Taak toewijzen'}
      </button>
    </Modal>
  );
}
