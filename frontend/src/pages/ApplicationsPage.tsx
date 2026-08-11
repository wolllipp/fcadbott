import React, { useState, useEffect } from 'react';
import { Coordinator } from '../App';
import { api } from '../utils/api';

interface Application {
  id: number;
  eventId: number;
  studentId: number;
  participationType: 'VISITOR' | 'PARTICIPANT' | 'ORGANIZER';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'AWAITING_MARK' | 'ATTENDANCE_CONFIRMED';
  studentComment: string | null;
  coordinatorComment: string | null;
  approvedAt: string | null;
  createdAt: string;
  event: { id: number; name: string; eventDate: string; status: string; location: string | null; pointsForAttendance: number };
  student: { id: number; fullName: string; groupNumber: string; studentCardNumber: string };
  approver: { id: number; fullName: string } | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'На рассмотрении', color: 'var(--warning)', bg: 'var(--warning-dim)' },
  APPROVED: { label: 'Одобрена', color: 'var(--success)', bg: 'var(--success-dim)' },
  REJECTED: { label: 'Отклонена', color: 'var(--error)', bg: 'var(--error-dim)' },
  CANCELLED: { label: 'Отменена', color: 'var(--text-muted)', bg: 'var(--surface)' },
  AWAITING_MARK: { label: 'Ожидает отметки', color: 'var(--accent)', bg: 'var(--accent-dim)' },
  ATTENDANCE_CONFIRMED: { label: 'Посещено', color: 'var(--success)', bg: 'var(--success-dim)' },
};

const TYPE_LABELS: Record<string, string> = {
  VISITOR: 'Посетитель',
  PARTICIPANT: 'Участник',
  ORGANIZER: 'Организатор',
};

function fmtDate(d: string) {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}.${dt.getFullYear()}`;
}

type FilterStatus = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

export default function ApplicationsPage({ coordinator }: { coordinator: Coordinator }) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [rejectModal, setRejectModal] = useState<number | null>(null);
  const [rejectComment, setRejectComment] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const isAdmin = coordinator.role !== 'COORDINATOR';
      const data = await api.applications.list({
        coordinatorId: isAdmin ? undefined : coordinator.id,
        role: coordinator.role,
      });
      setApplications(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  const filtered = filter === 'ALL' ? applications : applications.filter(a => a.status === filter);
  const pendingCount = applications.filter(a => a.status === 'PENDING').length;

  function toggleSelect(id: number) {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  }

  function toggleSelectAll() {
    const pendingFiltered = filtered.filter(a => a.status === 'PENDING');
    if (selectedIds.size === pendingFiltered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingFiltered.map(a => a.id)));
    }
  }

  async function approveOne(id: number) {
    setProcessing(true);
    try {
      await api.applications.approve(id, coordinator.id);
      await load();
    } catch (e: any) { alert(e.message); }
    setProcessing(false);
  }

  async function approveSelected() {
    if (selectedIds.size === 0) return;
    setProcessing(true);
    try {
      await api.applications.bulkApprove([...selectedIds], coordinator.id);
      setSelectedIds(new Set());
      await load();
    } catch (e: any) { alert(e.message); }
    setProcessing(false);
  }

  async function rejectOne(id: number) {
    setProcessing(true);
    try {
      await api.applications.reject(id, rejectComment || undefined);
      setRejectModal(null);
      setRejectComment('');
      await load();
    } catch (e: any) { alert(e.message); }
    setProcessing(false);
  }

  async function rejectSelected() {
    if (selectedIds.size === 0) return;
    setProcessing(true);
    try {
      await api.applications.bulkReject([...selectedIds], rejectComment || undefined);
      setSelectedIds(new Set());
      setRejectModal(null);
      setRejectComment('');
      await load();
    } catch (e: any) { alert(e.message); }
    setProcessing(false);
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px 16px 0' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Заявки</h1>
        <div style={{ display: 'flex', gap: 6 }}>
          {([
            { id: 'PENDING' as FilterStatus, label: `Ожидают (${pendingCount})` },
            { id: 'ALL' as FilterStatus, label: 'Все' },
            { id: 'APPROVED' as FilterStatus, label: 'Одобрены' },
            { id: 'REJECTED' as FilterStatus, label: 'Отклонены' },
          ]).map(f => (
            <button key={f.id} onClick={() => { setFilter(f.id); setSelectedIds(new Set()); }} style={{
              padding: '8px', borderRadius: 8, border: 'none', flex: 1,
              background: filter === f.id ? 'var(--accent)' : 'var(--bg-raised)',
              color: filter === f.id ? 'white' : f.id === 'PENDING' && pendingCount > 0 ? 'var(--warning)' : 'var(--text)',
              fontWeight: 600, fontSize: 12, cursor: 'pointer',
            }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="page-scroll" style={{ padding: '12px 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>○</div>
            {filter === 'PENDING' ? 'Нет заявок на рассмотрении' : 'Нет заявок'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filter === 'PENDING' && filtered.length > 1 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                <button onClick={toggleSelectAll} style={{
                  flex: 1, padding: '8px', borderRadius: 8, border: '1px solid var(--border)',
                  background: selectedIds.size === filtered.filter(a => a.status === 'PENDING').length ? 'var(--accent-dim)' : 'var(--bg-raised)',
                  color: 'var(--text)', fontSize: 12, cursor: 'pointer', fontWeight: 500,
                }}>
                  {selectedIds.size === filtered.filter(a => a.status === 'PENDING').length ? 'Снять выделение' : 'Выбрать все'}
                </button>
                {selectedIds.size > 0 && (
                  <>
                    <button onClick={approveSelected} disabled={processing} style={{
                      flex: 1, padding: '8px', borderRadius: 8, border: 'none',
                      background: 'var(--success)', color: 'white', fontSize: 12, cursor: 'pointer', fontWeight: 600,
                    }}>
                      Одобрить ({selectedIds.size})
                    </button>
                    <button onClick={rejectSelected} disabled={processing} style={{
                      flex: 1, padding: '8px', borderRadius: 8, border: 'none',
                      background: 'var(--error)', color: 'white', fontSize: 12, cursor: 'pointer', fontWeight: 600,
                    }}>
                      Отклонить ({selectedIds.size})
                    </button>
                  </>
                )}
              </div>
            )}

            {filtered.map((app, i) => {
              const st = STATUS_LABELS[app.status] || STATUS_LABELS.PENDING;
              const isPending = app.status === 'PENDING';
              return (
                <div key={app.id} className="card" style={{
                  padding: '14px', animation: `fadeIn 0.2s ease ${i * 0.03}s both`,
                  borderColor: isPending ? 'var(--warning-dim)' : undefined,
                  opacity: processing && selectedIds.has(app.id) ? 0.5 : 1,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{app.event.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {fmtDate(app.event.eventDate)} {app.event.location ? `· ${app.event.location}` : ''}
                      </div>
                    </div>
                    <span className="badge" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{app.student.fullName}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        гр. {app.student.groupNumber} · {TYPE_LABELS[app.participationType]}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
                      +{app.event.pointsForAttendance} б.
                    </div>
                  </div>

                  {app.studentComment && (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, padding: '6px 8px', background: 'var(--bg-raised)', borderRadius: 6 }}>
                      {app.studentComment}
                    </div>
                  )}

                  {app.coordinatorComment && (
                    <div style={{ fontSize: 12, color: 'var(--error)', marginBottom: 8 }}>
                      Причина отклонения: {app.coordinatorComment}
                    </div>
                  )}

                  {isPending && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <button onClick={() => { const next = new Set(selectedIds); next.has(app.id) ? next.delete(app.id) : next.add(app.id); setSelectedIds(next); }}
                        style={{
                          width: 32, height: 32, borderRadius: 8, border: `2px solid ${selectedIds.has(app.id) ? 'var(--accent)' : 'var(--border)'}`,
                          background: selectedIds.has(app.id) ? 'var(--accent)' : 'transparent',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                        {selectedIds.has(app.id) && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </button>
                      <button onClick={() => approveOne(app.id)} disabled={processing}
                        style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: 'var(--success)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        Одобрить
                      </button>
                      <button onClick={() => setRejectModal(app.id)}
                        style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid var(--error)', background: 'transparent', color: 'var(--error)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        Отклонить
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {rejectModal !== null && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => { setRejectModal(null); setRejectComment(''); }} />
          <div className="card" style={{
            position: 'relative', zIndex: 1, width: '85%', maxWidth: 360,
            display: 'flex', flexDirection: 'column', gap: 10, padding: 20,
          }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Отклонить заявку</div>
            <div className="section-label">Причина (необязательно)</div>
            <textarea className="input" rows={3} style={{ resize: 'none' }} placeholder="Укажите причину отклонения..."
              value={rejectComment} onChange={e => setRejectComment(e.target.value)} />
            <button className="btn btn-primary" style={{ background: 'var(--error)' }} onClick={() => rejectOne(rejectModal)}>
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
