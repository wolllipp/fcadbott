import React, { useState, useEffect } from 'react';
import { Coordinator } from '../App';
import { api } from '../utils/api';

interface Props { coordinator: Coordinator; }

interface Petition {
  id: number;
  type: string;
  status: string;
  createdAt: string;
  student: { id: number; fullName: string; groupNumber: string; studentCardNumber: string };
  events: { eventName: string; eventDate: string }[];
}

const PETITION_LABELS: Record<string, string> = {
  DISCOUNT: 'на скидку',
  DORMITORY: 'на общежитие',
  SPECIALIZATION: 'на профилизацию',
};

function fmtDate(d: string) {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}.${dt.getFullYear()}`;
}

export default function PetitionsAdminPage({ coordinator }: Props) {
  const canAct = coordinator.role === 'CHAIRMAN' || coordinator.role === 'DEAN';
  const canView = canAct || coordinator.role === 'DEPUTY' || coordinator.role === 'SECRETARY';

  const [petitions, setPetitions] = useState<Petition[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<number | null>(null);

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
      await api.petitions.approve(id, coordinator.role);
      await load();
    } catch (e: any) { alert(e.message); }
    setSubmitting(null);
  }

  async function reject(id: number) {
    setSubmitting(id);
    try {
      await api.petitions.reject(id, coordinator.role);
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
      <div style={{ padding: '16px 16px 0', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => window.history.length > 1 ? window.history.back() : null}
          style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 12px', color: 'var(--text)', cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font)' }}>
          ← Назад
        </button>
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
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{p.student.fullName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>гр. {p.student.groupNumber}</div>
                    <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginBottom: 6 }}>
                      Ходатайство {PETITION_LABELS[p.type]}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                      Мероприятия ({p.events.length}):
                    </div>
                    {p.events.map((e, i) => (
                      <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', paddingLeft: 12 }}>
                        {e.eventName} — {fmtDate(e.eventDate)}
                      </div>
                    ))}
                    {canAct && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button className="btn btn-primary" disabled={submitting === p.id}
                          onClick={() => approve(p.id)} style={{ padding: '8px', fontSize: 13, flex: 1 }}>
                          {submitting === p.id ? '...' : 'Подтвердить'}
                        </button>
                        <button className="btn btn-ghost" disabled={submitting === p.id}
                          onClick={() => reject(p.id)} style={{ padding: '8px', fontSize: 13, flex: 1, color: 'var(--error)', borderColor: 'var(--error)' }}>
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
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{p.student.fullName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {PETITION_LABELS[p.type]} — {p.status === 'APPROVED' ? 'Одобрено' : 'Отклонено'}
                    </div>
                    {p.status === 'APPROVED' && canAct && (
                      <button className="btn btn-ghost" onClick={() => {
                        const a = document.createElement('a');
                        a.href = api.petitions.downloadUrl(p.id);
                        a.download = 'Ходатайство.docx';
                        a.click();
                      }} style={{ padding: '6px 14px', fontSize: 12, marginTop: 6, width: 'auto' }}>
                        Скачать
                      </button>
                    )}
                  </div>
                ))}
              </>
            )}
          </>
        )}
        <div style={{ height: 20 }} />
      </div>
    </div>
  );
}
