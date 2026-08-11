import React, { useState, useEffect } from 'react';
import { Coordinator } from '../App';
import { api } from '../utils/api';

interface Props { coordinator: Coordinator; }

interface Petition {
  id: number;
  type: string;
  status: string;
  createdAt: string;
  balanceAtSubmit: number;
  totalPoints: number;
  reviewComment: string | null;
  student: { id: number; fullName: string; groupNumber: string; studentCardNumber: string };
  events: { eventName: string; eventDate: string }[];
  snapshots: { points: number; type: string; reason: string; eventName: string | null; createdAt: string }[];
  reviewer: { fullName: string } | null;
}

const PETITION_LABELS: Record<string, string> = {
  DISCOUNT: 'на скидку',
  DORMITORY: 'на общежитие',
  SPECIALIZATION: 'на профилизацию',
};

const POINT_TYPE_LABELS: Record<string, string> = {
  ATTENDANCE: 'Посещение',
  ORGANIZATION: 'Организация',
  MANUAL_ADJUSTMENT: 'Корректировка',
};

function fmtDate(d: string) {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}.${dt.getFullYear()}`;
}

function fmtDateTime(d: string) {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
}

export default function PetitionsAdminPage({ coordinator }: Props) {
  const canAct = coordinator.role === 'CHAIRMAN' || coordinator.role === 'DEAN' || coordinator.role === 'DEPUTY';
  const canView = canAct || coordinator.role === 'SECRETARY';

  const [petitions, setPetitions] = useState<Petition[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [rejectModal, setRejectModal] = useState<number | null>(null);
  const [rejectComment, setRejectComment] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    if (!canView) return;
    setLoading(true);
    try {
      const data = await api.petitions.list({ role: coordinator.role });
      setPetitions(data);
    } catch (_) {}
    setLoading(false);
  }

  async function approve(id: number) {
    setSubmitting(id);
    try {
      await api.petitions.approve(id, coordinator.role, coordinator.id);
      await load();
    } catch (e: any) { alert(e.message); }
    setSubmitting(null);
  }

  async function reject(id: number) {
    setSubmitting(id);
    try {
      await api.petitions.reject(id, coordinator.role, rejectComment || undefined, coordinator.id);
      setRejectModal(null);
      setRejectComment('');
      await load();
    } catch (e: any) { alert(e.message); }
    setSubmitting(null);
  }

  if (!canView) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Нет доступа
      </div>
    );
  }

  const pending = petitions.filter((p) => p.status === 'PENDING');
  const history = petitions.filter((p) => p.status !== 'PENDING');

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px 16px 0', flexShrink: 0 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Ходатайства</h1>
      </div>
      <div className="page-scroll" style={{ padding: '0 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>Загрузка...</div>
        ) : (
          <>
            {pending.length > 0 ? (
              <>
                <div className="section-label" style={{ marginTop: 12, marginBottom: 8 }}>На рассмотрении ({pending.length})</div>
                {pending.map((p, i) => (
                  <div key={p.id} className="card" style={{ marginBottom: 10, borderColor: 'var(--warning-dim)', animation: `fadeIn 0.2s ease ${i * 0.04}s both` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>{p.student.fullName}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>гр. {p.student.groupNumber}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>{p.balanceAtSubmit}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>баллов</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginBottom: 6 }}>
                      Ходатайство {PETITION_LABELS[p.type]}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Подано: {fmtDate(p.createdAt)}
                    </div>

                    <button onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                      style={{ width: '100%', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', marginTop: 8 }}>
                      {expandedId === p.id ? 'Свернуть' : `Начисления (${p.snapshots.length})`}
                    </button>

                    {expandedId === p.id && (
                      <div style={{ marginTop: 8, maxHeight: 200, overflow: 'auto' }}>
                        {p.snapshots.map((s, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                            <div>
                              <span style={{ color: 'var(--text-secondary)' }}>{s.reason}</span>
                              {s.eventName && <span style={{ color: 'var(--accent)' }}> · {s.eventName}</span>}
                            </div>
                            <span style={{ color: 'var(--success)', fontWeight: 600 }}>+{s.points}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {canAct && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button className="btn btn-primary" disabled={submitting === p.id}
                          onClick={() => approve(p.id)} style={{ padding: '8px', fontSize: 13, flex: 1 }}>
                          {submitting === p.id ? '...' : 'Подтвердить'}
                        </button>
                        <button className="btn btn-ghost" disabled={submitting === p.id}
                          onClick={() => setRejectModal(p.id)} style={{ padding: '8px', fontSize: 13, flex: 1, color: 'var(--error)', borderColor: 'var(--error)' }}>
                          Отклонить
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                Нет ходатайств на рассмотрении
              </div>
            )}

            {history.length > 0 && (
              <>
                <div className="section-label" style={{ marginTop: 16, marginBottom: 8 }}>История</div>
                {history.map((p, i) => (
                  <div key={p.id} className="card" style={{ marginBottom: 8, opacity: 0.7, animation: `fadeIn 0.2s ease ${i * 0.03}s both` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 14 }}>{p.student.fullName}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {PETITION_LABELS[p.type]} · {p.balanceAtSubmit} б. · {p.status === 'APPROVED' ? 'Одобрено' : 'Отклонено'}
                        </div>
                        {p.reviewer && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Рассмотрел: {p.reviewer.fullName}</div>}
                        {p.reviewComment && <div style={{ fontSize: 11, color: 'var(--error)', marginTop: 2 }}>{p.reviewComment}</div>}
                      </div>
                      {p.status === 'APPROVED' && canAct && (
                        <button className="btn btn-ghost" onClick={() => {
                          const a = document.createElement('a');
                          a.href = api.petitions.downloadUrl(p.id);
                          a.download = 'Ходатайство.docx';
                          a.click();
                        }} style={{ padding: '6px 14px', fontSize: 12, width: 'auto' }}>
                          .docx
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
        <div style={{ height: 20 }} />
      </div>

      {rejectModal !== null && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => { setRejectModal(null); setRejectComment(''); }} />
          <div className="card" style={{
            position: 'relative', zIndex: 1, width: '85%', maxWidth: 360,
            display: 'flex', flexDirection: 'column', gap: 10, padding: 20,
          }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Отклонить ходатайство</div>
            <div className="section-label">Причина (необязательно)</div>
            <textarea className="input" rows={3} style={{ resize: 'none' }} placeholder="Укажите причину..."
              value={rejectComment} onChange={e => setRejectComment(e.target.value)} />
            <button className="btn btn-primary" style={{ background: 'var(--error)' }} onClick={() => reject(rejectModal)}>
              Отклонить
            </button>
            <button onClick={() => { setRejectModal(null); setRejectComment(''); }}
              style={{ width: '100%', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px', color: 'var(--text)', cursor: 'pointer', fontSize: 14 }}>
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
