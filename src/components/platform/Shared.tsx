'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { assignPropertyAction } from '@/app/actions';
import { avatarSrc } from '@/data/profiles';
import { getModeLabel, getStatus } from '@/lib/domain';
import type { Property } from '@/lib/types';
import { Modal, ModalSub, ModalTitle } from '@/components/ui/Modal';
import { StatusPill } from '@/components/ui/StatusPill';
import { useApp } from './AppContext';
import { Icons } from './Icons';

export function MyProjectsToggle() {
  const { myProjectsOnly, toggleMyProjects, currentProfile } = useApp();
  const first = currentProfile.name.split(' ')[0];
  return (
    <button
      className={`mine-toggle${myProjectsOnly ? ' active' : ''}`}
      onClick={toggleMyProjects}
      title={`Toon alleen panden die zijn toegewezen aan het actieve profiel (${currentProfile.name}). Wissel van profiel rechtsboven om dit te testen.`}
    >
      {Icons.person}
      Mijn projecten{first ? <span style={{ opacity: 0.65, fontWeight: 600 }}> · {first}</span> : null}
    </button>
  );
}

export function AssigneeCell({ p }: { p: Property }) {
  const { profiles } = useApp();
  const [open, setOpen] = useState(false);
  const a = profiles.find((x) => x.id === p.assignedTo) ?? null;
  return (
    <>
      <span
        className={`assignee-cell${a ? '' : ' unset'}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        {a ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="chip-avatar" src={avatarSrc(a)} alt="" /> {a.name}
          </>
        ) : (
          'Niet toegewezen'
        )}
      </span>
      <AssignModal p={p} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function AssignModal({ p, open, onClose }: { p: Property; open: boolean; onClose: () => void }) {
  const { profiles, lang } = useApp();
  const router = useRouter();
  return (
    <Modal open={open} onClose={onClose}>
      <ModalTitle>Toewijzen</ModalTitle>
      <ModalSub>
        {p.address}, {p.city}
      </ModalSub>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {profiles.map((x) => (
          <button
            key={x.id}
            className="profile-menu-item"
            style={{ width: '100%' }}
            onClick={async () => {
              await assignPropertyAction(p.id, x.id);
              onClose();
              router.refresh();
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatarSrc(x)} alt="" />
            <span className="profile-menu-item-text">
              <div className="profile-menu-item-name">{x.name}</div>
              <div className="profile-menu-item-role">{lang === 'en' ? x.roleEn : x.roleNl}</div>
            </span>
            {p.assignedTo === x.id ? Icons.check : null}
          </button>
        ))}
      </div>
    </Modal>
  );
}

/** The property table used by the overview, the project lists and Alle panden. */
export function PropertyTable({ list }: { list: Property[] }) {
  const router = useRouter();
  const [signoffFor, setSignoffFor] = useState<Property | null>(null);
  return (
    <>
      <div className="table-wrap">
        <table className="dtable">
          <thead>
            <tr>
              <th>Pand</th>
              <th>Output</th>
              <th>Status</th>
              <th className="th-assignee">Adviseur</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} onClick={() => router.push(`/panden/${p.id}`)}>
                <td>
                  <div className="dt-addr">
                    {p.address}
                    {p.leadSource === 'publiek' && <span className="lead-chip">nieuwe lead · website</span>}
                  </div>
                  <div className="dt-city">{p.city}</div>
                </td>
                <td className="dt-mode">{getModeLabel(p)}</td>
                <td>
                  <StatusPill p={p} onClick={() => setSignoffFor(p)} />
                </td>
                <td>
                  <AssigneeCell p={p} />
                </td>
                <td>
                  <span className="dt-open">Openen →</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SignoffModal p={signoffFor} onClose={() => setSignoffFor(null)} />
    </>
  );
}

export function SignoffModal({ p, onClose }: { p: Property | null; onClose: () => void }) {
  const router = useRouter();
  if (!p?.signoff) return <Modal open={false} onClose={onClose}>{null}</Modal>;
  const so = p.signoff;
  const mr = p.meetrapport;
  return (
    <Modal open onClose={onClose}>
      <ModalTitle>Afmelding</ModalTitle>
      <ModalSub>
        {p.address}, {p.city}
      </ModalSub>
      <div className="modal-grid">
        <div className="modal-field">
          <div className="v">{p.label}</div>
          <div className="l">energielabel</div>
        </div>
        <div className="modal-field">
          <div className="v">{so.datum}</div>
          <div className="l">afgemeld op</div>
        </div>
        <div className="modal-field" style={{ gridColumn: '1/-1' }}>
          <div className="v" style={{ fontSize: 14 }}>{so.adviseur}</div>
          <div className="l">erkend EP-adviseur</div>
        </div>
        <div className="modal-field" style={{ gridColumn: '1/-1' }}>
          <div className="v" style={{ fontSize: 14 }}>{so.epOnlineId}</div>
          <div className="l">EP-online referentie</div>
        </div>
      </div>
      <div className="status-box done" style={{ marginTop: 0 }}>
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M20 6L9 17l-5-5" stroke="#1e6b2e" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div>
          Dit pand is gecontroleerd, ondertekend en geregistreerd in EP-online.
          {mr ? ` Oorspronkelijk ingemeten: ${mr.inmeetdatum}, door ${mr.bedrijf}.` : ''}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
        <button className="ghost-btn" onClick={() => router.push(`/panden/${p.id}/rapport`)}>
          Bekijk eindrapport
        </button>
        <button className="ghost-btn" onClick={() => router.push(`/panden/${p.id}/berekening`)}>
          Bekijk berekening
        </button>
      </div>
    </Modal>
  );
}

export function statusOf(p: Property) {
  return getStatus(p);
}
