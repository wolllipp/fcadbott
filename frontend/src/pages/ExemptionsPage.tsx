import React, { useState, useEffect, useMemo } from 'react';
import { Coordinator } from '../App';
import { api } from '../utils/api';
import StudentPicker, { Student, ExternalStudent } from '../components/StudentPicker';
import SuccessScreen from '../components/SuccessScreen';

type Step = 'calendar' | 'pick' | 'confirm' | 'success' | 'pending-list' | 'pending-detail' | 'edit';
type ActiveTab = 'calendar' | 'pending';

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MONTH_NAMES_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

function getWeekDays(offset: number) {
  const now = new Date();
  now.setDate(now.getDate() + offset * 7);
  const day = now.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon);
  mon.setHours(0, 0, 0, 0);
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });
}

function getWeekLabel(offset: number): string {
  if (offset === 0) return 'Текущая неделя';
  if (offset === -1) return 'Прошлая неделя';
  if (offset === 1) return 'Следующая неделя';
  const days = getWeekDays(offset);
  const start = days[0];
  const end = days[5];
  return `${start.getDate()} ${MONTH_NAMES_SHORT[start.getMonth()]} — ${end.getDate()} ${MONTH_NAMES_SHORT[end.getMonth()]} ${end.getFullYear()}`;
}

function fmtDate(d: Date | string) {
  const dt = typeof d === 'string' ? new Date(d) : d;
  return `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}.${dt.getFullYear()}`;
}

const slideAnim = `
@keyframes slideFromRight {
  from { opacity: 0; transform: translateX(40px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes slideFromLeft {
  from { opacity: 0; transform: translateX(-40px); }
  to { opacity: 1; transform: translateX(0); }
}
`;
const detailAnim = `
@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
`;
function getSectorName(coordinator: any): string {
  if (!coordinator || !coordinator.sector) return 'Без сектора';
  return coordinator.sector;
}

interface Props { coordinator: Coordinator; }

export default function ExemptionsPage({ coordinator }: Props) {
  const isChairman = coordinator.role === 'CHAIRMAN' || coordinator.role === 'DEPUTY' || coordinator.role === 'DEAN';
  const isSecretary = coordinator.role === 'SECRETARY';
  const canManageExemptions = isChairman || isSecretary;
  const canToggleExhibited = isChairman || isSecretary;

  const [step, setStep] = useState<Step>('calendar');
  const [weekOffset, setWeekOffset] = useState(0);
  const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset]);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [exemptions, setExemptions] = useState<any[]>([]);
  const [pendingExemptions, setPendingExemptions] = useState<any[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [externalStudents, setExternalStudents] = useState<ExternalStudent[]>([]);
  const [alreadyExemptedIds, setAlreadyExemptedIds] = useState<number[]>([]);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [detailDay, setDetailDay] = useState<Date | null>(null);
  const [selectedPending, setSelectedPending] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('calendar');
  const [editingExemption, setEditingExemption] = useState<any>(null);
  const [showExternalModal, setShowExternalModal] = useState(false);
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null);
  const [showBellModal, setShowBellModal] = useState(false);
  const [nonExhibitedList, setNonExhibitedList] = useState<any[]>([]);
  const [nonExhibitedCount, setNonExhibitedCount] = useState(0);
  const [loadingBell, setLoadingBell] = useState(false);

  useEffect(() => { loadData(); }, [weekOffset]);

  useEffect(() => {
    if (canToggleExhibited) {
      api.exemptions.nonExhibited().then((data: any[]) => setNonExhibitedCount(data.length)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (canToggleExhibited) {
      api.exemptions.nonExhibited().then((data: any[]) => setNonExhibitedCount(data.length)).catch(() => {});
    }
  }, [exemptions]);

  async function loadData() {
    const key = weekOffset === 0 ? 'current' : 'other';
    api.exemptions.list(key, weekOffset).then(setExemptions).catch(console.error);
    if (isChairman) {
      api.exemptions.pending().then(setPendingExemptions).catch(console.error);
    }
    if (isSecretary) {
      api.exemptions.all(key, weekOffset).then(setPendingExemptions).catch(console.error);
    }
  }

  useEffect(() => {
    if (step === 'pick' || step === 'edit') {
      setLoading(true);
      api.students.list({ sector: isChairman ? undefined : (coordinator.sector || undefined), role: coordinator.role })
        .then(setStudents).finally(() => setLoading(false));
    }
  }, [step]);

  useEffect(() => {
    if (selectedDay) {
      api.exemptions.alreadyExempted(selectedDay.toISOString())
        .then((r: any) => setAlreadyExemptedIds(r.studentIds || []))
        .catch(console.error);
    }
  }, [selectedDay]);

  function toggleStudent(id: number) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function submit() {
    if (!selectedDay || !reason.trim()) return;
    setSubmitting(true);
    try {
      await api.exemptions.create({
        coordinatorId: coordinator.id,
        exemptionDate: selectedDay.toISOString(),
        reason,
        studentIds: selectedIds,
        externalStudents,
      });
      setStep('success');
    } catch (e: any) { alert(e.message); }
    finally { setSubmitting(false); }
  }

  async function approveExemption(id: number) {
    setSubmitting(true);
    try {
      await api.exemptions.approve(id, coordinator.role);
      await loadData();
      setSelectedPending(null);
      setStep('pending-list');
    } catch (e: any) { alert(e.message); }
    finally { setSubmitting(false); }
  }

  async function rejectExemption(id: number) {
    setSubmitting(true);
    try {
      await api.exemptions.reject(id, coordinator.role, rejectReason);
      await loadData();
      setSelectedPending(null);
      setRejectReason('');
      setShowRejectInput(false);
      setStep('pending-list');
    } catch (e: any) { alert(e.message); }
    finally { setSubmitting(false); }
  }

  async function toggleExhibited(id: number) {
    try {
      await api.exemptions.toggleExhibited(id, coordinator.role);
      await loadData();
      const data = await api.exemptions.nonExhibited();
      setNonExhibitedList(data);
      setNonExhibitedCount(data.length);
    } catch (e: any) { alert(e.message); }
  }

  async function togglePrinted(id: number) {
    try {
      await api.exemptions.togglePrinted(id, coordinator.role);
      await loadData();
      const data = await api.exemptions.nonExhibited();
      setNonExhibitedList(data);
      setNonExhibitedCount(data.length);
    } catch (e: any) { alert(e.message); }
  }

  async function deleteExemption(id: number) {
    if (!confirm('Отменить освобождение?')) return;
    try {
      await api.exemptions.remove(id);
      await loadData();
      setDetailDay(null);
    } catch (e: any) { alert(e.message); }
  }

  function startEdit(ex: any) {
    setEditingExemption({
      id: ex.id,
      reason: ex.reason,
      studentIds: ex.students.filter((s: any) => s.studentId !== null).map((s: any) => s.studentId!),
      externalStudents: ex.students.filter((s: any) => s.externalName !== null).map((s: any) => ({
        fullName: s.externalName,
        groupNumber: s.externalGroup,
      })),
    });
    setStep('edit');
  }

  async function saveEdit() {
    if (!editingExemption || !editingExemption.reason.trim()) return;
    setSubmitting(true);
    try {
      await api.exemptions.update(editingExemption.id, {
        reason: editingExemption.reason,
        studentIds: editingExemption.studentIds,
        externalStudents: editingExemption.externalStudents,
        role: coordinator.role,
      });
      setEditingExemption(null);
      setStep('calendar');
      await loadData();
    } catch (e: any) { alert(e.message); }
    finally { setSubmitting(false); }
  }

  function reset() {
    setStep('calendar');
    setSelectedDay(null);
    setSelectedIds([]);
    setExternalStudents([]);
    setAlreadyExemptedIds([]);
    setReason('');
    loadData();
  }

  function addExternalInModal() {
    setExternalStudents([...externalStudents, { fullName: '', groupNumber: '', studentCardNumber: '' }]);
  }

  function updateExternalInModal(i: number, field: keyof ExternalStudent, value: string) {
    const updated = [...externalStudents];
    updated[i] = { ...updated[i], [field]: value };
    setExternalStudents(updated);
  }

  function removeExternalInModal(i: number) {
    setExternalStudents(externalStudents.filter((_, idx) => idx !== i));
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);

  function dayHasExemption(d: Date) {
    return exemptions.some((e) => new Date(e.exemptionDate).toDateString() === d.toDateString());
  }

  function getExemptionsForDay(d: Date) {
    return exemptions.filter((e) => new Date(e.exemptionDate).toDateString() === d.toDateString());
  }

  function navigateWeek(direction: number) {
    setSlideDir(direction > 0 ? 'right' : 'left');
    setWeekOffset((prev) => prev + direction);
    setTimeout(() => setSlideDir(null), 300);
  }

  if (step === 'success') {
    return (
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <style>{slideAnim}{detailAnim}</style>
        <SuccessScreen
          title="Освобождения выставлены"
          subtitle={isChairman ? 'Докладная и файл отправлены секретарю' : 'Докладная отправлена председателю на рассмотрение'}
          onDone={reset}
        />
      </div>
    );
  }

  if (step === 'pending-detail' && selectedPending) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <style>{slideAnim}{detailAnim}</style>
        <div style={{ padding: '16px 16px 0', flexShrink: 0 }}>
          <button onClick={() => { setStep('pending-list'); setSelectedPending(null); setShowRejectInput(false); setRejectReason(''); }}
            style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 12px', color: 'var(--text)', cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font)', marginBottom: 12 }}>
            ← Назад
          </button>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Докладная на рассмотрении</h1>
        </div>
        <div className="page-scroll" style={{ padding: '0 16px' }}>
          <div className="card" style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Координатор</div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{selectedPending.coordinator.fullName}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Дата</div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{fmtDate(selectedPending.exemptionDate)}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Причина</div>
            <div style={{ fontSize: 14 }}>{selectedPending.reason}</div>
          </div>

          <div className="section-label">Студенты ({selectedPending.students.length})</div>
          {selectedPending.students.map((es: any, i: number) => (
            <div key={i} className="card" style={{ marginBottom: 6, padding: '10px 12px' }}>
              <div style={{ fontWeight: 500 }}>{es.student?.fullName || es.externalName}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>гр. {es.student?.groupNumber || es.externalGroup}</div>
            </div>
          ))}

          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {!showRejectInput ? (
              <>
                <button className="btn btn-primary" disabled={submitting} onClick={() => approveExemption(selectedPending.id)}>
                  ✓ Подтвердить докладную
                </button>
                <button className="btn btn-ghost" style={{ color: 'var(--error)', borderColor: 'var(--error)' }}
                  onClick={() => setShowRejectInput(true)}>
                  ✕ Отклонить
                </button>
              </>
            ) : (
              <>
                <div className="section-label">Причина отклонения (необязательно)</div>
                <input className="input" placeholder="Укажите причину..." value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)} />
                <button className="btn" style={{ background: 'var(--error)', color: 'white', fontWeight: 600, padding: '15px', borderRadius: 'var(--radius)', fontSize: 15, border: 'none', cursor: 'pointer' }}
                  disabled={submitting} onClick={() => rejectExemption(selectedPending.id)}>
                  {submitting ? '...' : 'Отклонить докладную'}
                </button>
                <button className="btn btn-ghost" onClick={() => setShowRejectInput(false)}>Отмена</button>
              </>
            )}
          </div>
          <div style={{ height: 20 }} />
        </div>
      </div>
    );
  }

  if (step === 'edit' && editingExemption) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <style>{slideAnim}{detailAnim}</style>
        <div style={{ padding: '16px 16px 0', flexShrink: 0 }}>
          <button onClick={() => { setStep('calendar'); setEditingExemption(null); }}
            style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 12px', color: 'var(--text)', cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font)', marginBottom: 12 }}>
            ← Назад
          </button>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Редактировать освобождение</h1>
          <div style={{ fontSize: 12, color: 'var(--warning)', marginTop: 4 }}>При сохранении появится пометка «Изменено»</div>
        </div>
        <div className="page-scroll" style={{ padding: '0 16px' }}>
          <div className="section-label">Причина</div>
          <textarea className="input" value={editingExemption.reason} onChange={(e) => setEditingExemption({ ...editingExemption, reason: e.target.value })} rows={3} style={{ resize: 'none', marginBottom: 14 }} />

          <div className="section-label">Студенты из списка ({editingExemption.studentIds.length})</div>
          {students.length === 0 ? (
            <div style={{ padding: '10px 0', color: 'var(--text-muted)', fontSize: 13 }}>Загрузка студентов...</div>
          ) : (
            students.map((s) => {
              const selected = editingExemption.studentIds.includes(s.id);
              return (
                <div key={s.id} className={`chip ${selected ? 'selected' : ''}`} onClick={() => {
                  const ids = selected
                    ? editingExemption.studentIds.filter((id: number) => id !== s.id)
                    : [...editingExemption.studentIds, s.id];
                  setEditingExemption({ ...editingExemption, studentIds: ids });
                }}>
                  <div className="chip-check">
                    {selected && <svg width="11" height="9" viewBox="0 0 11 9" fill="none"><path d="M1 4L4 7.5L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{s.fullName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>гр. {s.groupNumber}</div>
                  </div>
                </div>
              );
            })
          )}

          <div style={{ marginTop: 14 }}>
            <div className="section-label">Внешние студенты ({editingExemption.externalStudents.length})</div>
            {editingExemption.externalStudents.map((ext: any, i: number) => (
              <div key={i} className="card" style={{ marginBottom: 8, padding: '10px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>#{i + 1}</span>
                  <button onClick={() => {
                    const exts = editingExemption.externalStudents.filter((_: any, idx: number) => idx !== i);
                    setEditingExemption({ ...editingExemption, externalStudents: exts });
                  }} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: 18 }}>×</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <input className="input" placeholder="ФИО" value={ext.fullName}
                    onChange={(e) => {
                      const exts = [...editingExemption.externalStudents];
                      exts[i] = { ...exts[i], fullName: e.target.value };
                      setEditingExemption({ ...editingExemption, externalStudents: exts });
                    }} />
                  <input className="input" placeholder="Группа" value={ext.groupNumber}
                    onChange={(e) => {
                      const exts = [...editingExemption.externalStudents];
                      exts[i] = { ...exts[i], groupNumber: e.target.value };
                      setEditingExemption({ ...editingExemption, externalStudents: exts });
                    }} />
                </div>
              </div>
            ))}
            <button className="btn btn-ghost" onClick={() => {
              setEditingExemption({ ...editingExemption, externalStudents: [...editingExemption.externalStudents, { fullName: '', groupNumber: '' }] });
            }} style={{ fontSize: 14 }}>+ Добавить внешнего</button>
          </div>

          <div style={{ marginTop: 16 }}>
            <button className="btn btn-primary" disabled={submitting || !editingExemption.reason.trim()} onClick={saveEdit}>
              {submitting ? '...' : '✓ Сохранить изменения'}
            </button>
          </div>
          <div style={{ height: 20 }} />
        </div>
      </div>
    );
  }

  if (detailDay) {
    const dayExemptions = getExemptionsForDay(detailDay);
    const groupedBySector: Record<string, any[]> = {};
    dayExemptions.forEach((ex) => {
      const sector = getSectorName(ex.coordinator);
      if (!groupedBySector[sector]) groupedBySector[sector] = [];
      groupedBySector[sector].push(ex);
    });

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'slideUp 0.25s ease' }}>
      <style>{slideAnim}{detailAnim}</style>
        <div style={{ padding: '16px 16px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <button onClick={() => setDetailDay(null)} style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 12px', color: 'var(--text)', cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font)' }}>← Назад</button>
            <h2 style={{ fontSize: 17, fontWeight: 700 }}>{fmtDate(detailDay)}</h2>
          </div>
        </div>
        <div className="page-scroll" style={{ padding: '0 16px' }}>
          {dayExemptions.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', fontSize: 14 }}>Освобождений нет</div>
          ) : (
            Object.entries(groupedBySector).map(([sector, exs], si) => (
              <div key={sector} style={{ marginBottom: si < Object.keys(groupedBySector).length - 1 ? 20 : 0 }}>
                <div className="section-label" style={{ marginBottom: 8 }}>{sector}</div>
                {exs.map((ex) => {
                  const statusLabel = ex.status === 'APPROVED' ? 'Подтверждено' : ex.status === 'REJECTED' ? 'Отклонено' : 'На рассмотрении';
                  const statusClass = ex.status === 'APPROVED' ? 'badge-green' : ex.status === 'REJECTED' ? 'badge-gray' : 'badge-yellow';
                  return (
                    <div key={ex.id} className="card" style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{ex.coordinator.fullName}</div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span className={`badge ${statusClass}`}>{statusLabel}</span>
                          {ex.editedAt && <span className="badge" style={{ background: 'var(--warning-dim)', color: 'var(--warning)' }}>Изменено</span>}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>{ex.reason}</div>
                      {ex.students.map((es: any, i: number) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: i === 0 ? '1px solid var(--border)' : 'none', fontSize: 13 }}>
                          <span>{es.student?.fullName || es.externalName}</span>
                          <span style={{ color: 'var(--text-muted)' }}>гр. {es.student?.groupNumber || es.externalGroup}</span>
                        </div>
                      ))}
                      <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {canToggleExhibited && (
                          <button onClick={() => toggleExhibited(ex.id)}
                            style={{
                              background: ex.isExhibited ? 'var(--accent-dim)' : 'var(--bg-raised)',
                              border: `1px solid ${ex.isExhibited ? 'var(--accent)' : 'var(--border)'}`,
                              borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
                              color: ex.isExhibited ? 'var(--accent)' : 'var(--text-secondary)',
                              fontSize: 12, fontWeight: 600,
                              animation: ex.isExhibited ? "pulse 0.3s ease" : "none",
                            }}>
                            {ex.isExhibited ? '✓ Выставлено' : '○ Выставить'}
                          </button>
                        )}
                        {canToggleExhibited && (
                          <button onClick={() => togglePrinted(ex.id)}
                            style={{
                              background: ex.isPrinted ? 'var(--accent-dim)' : 'var(--bg-raised)',
                              border: `1px solid ${ex.isPrinted ? 'var(--accent)' : 'var(--border)'}`,
                              borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
                              color: ex.isPrinted ? 'var(--accent)' : 'var(--text-secondary)',
                              fontSize: 12, fontWeight: 600,
                              animation: ex.isPrinted ? "pulse 0.3s ease" : "none",
                            }}>
                            {ex.isPrinted ? '✓ Распечатано' : '○ Распечатать'}
                          </button>
                        )}
                        {(canManageExemptions || !ex.isExhibited) && (
                          <button onClick={() => startEdit(ex)}
                            style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12 }}>
                            ✎ Редактировать
                          </button>
                        )}
                        {(canManageExemptions || !ex.isExhibited) && (
                          <button onClick={() => deleteExemption(ex.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: 12 }}>
                            Отменить
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px 16px 0', flexShrink: 0 }}>
        {step !== 'calendar' && step !== 'pending-list' && (
          <button onClick={() => { if (step === 'pick') setStep('calendar'); else if (step === 'edit') setStep('calendar'); else setStep('pick'); }}
            style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 12px', color: 'var(--text)', cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font)', marginBottom: 12 }}>
            ← Назад
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Освобождения</h1>
          {canToggleExhibited && (
            <button onClick={async () => {
              setShowBellModal(true);
              setLoadingBell(true);
              try {
                const data = await api.exemptions.nonExhibited();
                setNonExhibitedList(data);
              } catch (e: any) { alert(e.message); }
              finally { setLoadingBell(false);
            }}} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 10, color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span style={{ fontWeight: 700, color: (nonExhibitedCount > 0) ? 'var(--error)' : 'var(--text-muted)', minWidth: 16, textAlign: 'center' }}>
                {nonExhibitedCount}
              </span>
            </button>
          )}
        </div>

        {(isChairman || isSecretary) && (step === 'calendar' || step === 'pending-list') && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {(['calendar', 'pending-list'] as const).map((tab) => (
              <button key={tab} onClick={() => { setActiveTab(tab === 'calendar' ? 'calendar' : 'pending'); setStep(tab); }}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 10, border: '1.5px solid',
                  borderColor: step === tab ? 'var(--accent)' : 'var(--border)',
                  background: step === tab ? 'var(--accent-dim)' : 'var(--bg-raised)',
                  color: step === tab ? 'var(--accent)' : 'var(--text-secondary)',
                  fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>
                {tab === 'calendar' ? 'Календарь' : (
                  <span>
                    {isSecretary ? 'Все освобождения' : 'На рассмотрении'}
                    {pendingExemptions.length > 0 && (
                      <span style={{ marginLeft: 6, background: 'var(--error)', color: 'white', borderRadius: 10, padding: '1px 6px', fontSize: 11 }}>
                        {pendingExemptions.length}
                      </span>
                    )}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {step === 'pending-list' && (
        <div className="page-scroll" style={{ padding: '0 16px' }}>
          {pendingExemptions.length === 0 ? (
            <div className="animate-in" style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: 14 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
              {isSecretary ? 'Нет освобождений' : 'Нет докладных на рассмотрении'}
            </div>
          ) : pendingExemptions.map((ex, idx) => {
            const statusLabel = isSecretary
              ? (ex.status === 'APPROVED' ? 'Подтверждено' : ex.status === 'REJECTED' ? 'Отклонено' : 'На рассмотрении')
              : 'Ожидает';
            const statusClass = isSecretary
              ? (ex.status === 'APPROVED' ? 'badge-green' : ex.status === 'REJECTED' ? 'badge-gray' : 'badge-yellow')
              : 'badge-accent';
            return isSecretary ? (
              <div key={ex.id} className="card hover-lift" style={{ marginBottom: 10, animation: `fadeIn 0.25s ease ${idx * 0.05}s both` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{ex.coordinator.fullName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 3 }}>
                      ◎ {fmtDate(ex.exemptionDate)} · {ex.students.length} студ.
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{ex.reason}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      {ex.editedAt && <span className="badge" style={{ background: 'var(--warning-dim)', color: 'var(--warning)' }}>Изменено</span>}
                      <span className={`badge ${statusClass}`}>{statusLabel}</span>
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {canToggleExhibited && (
                    <button onClick={() => toggleExhibited(ex.id)}
                      style={{
                        background: ex.isExhibited ? 'var(--accent-dim)' : 'var(--bg-raised)',
                        border: `1px solid ${ex.isExhibited ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
                        color: ex.isExhibited ? 'var(--accent)' : 'var(--text-secondary)',
                        fontSize: 12, fontWeight: 600,
                        animation: ex.isExhibited ? "pulse 0.3s ease" : "none",
                      }}>
                      {ex.isExhibited ? '✓ Выставлено' : '○ Выставить'}
                    </button>
                  )}
                  {canToggleExhibited && (
                    <button onClick={() => togglePrinted(ex.id)}
                      style={{
                        background: ex.isPrinted ? 'var(--accent-dim)' : 'var(--bg-raised)',
                        border: `1px solid ${ex.isPrinted ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
                        color: ex.isPrinted ? 'var(--accent)' : 'var(--text-secondary)',
                        fontSize: 12, fontWeight: 600,
                        animation: ex.isPrinted ? "pulse 0.3s ease" : "none",
                      }}>
                      {ex.isPrinted ? '✓ Распечатано' : '○ Распечатать'}
                    </button>
                  )}
                  <button onClick={() => startEdit(ex)}
                    style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12 }}>
                    ✎ Редактировать
                  </button>
                  <button onClick={() => deleteExemption(ex.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: 12 }}>
                    Отменить
                  </button>
                </div>
              </div>
            ) : (
              <div key={ex.id} className="card hover-lift" style={{ marginBottom: 10, cursor: (isChairman && ex.status === 'PENDING') ? 'pointer' : 'default', animation: `fadeIn 0.25s ease ${idx * 0.05}s both` }}
                onClick={() => { if (isChairman && ex.status === 'PENDING') { setSelectedPending(ex); setStep('pending-detail'); } }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{ex.coordinator.fullName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 3 }}>
                      ◎ {fmtDate(ex.exemptionDate)} · {ex.students.length} студ.
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{ex.reason}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className={`badge ${statusClass}`}>{statusLabel}</span>
                    {isChairman && ex.status === 'PENDING' && <span style={{ color: 'var(--accent)', fontSize: 18 }}>›</span>}
                  </div>
                </div>
              </div>
            );
          })}
          <div style={{ height: 20 }} />
        </div>
      )}

      {step === 'calendar' && (
        <div className="page-scroll" style={{ padding: '0 16px', animation: slideDir ? (slideDir === 'right' ? 'slideFromRight 0.25s ease' : 'slideFromLeft 0.25s ease') : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, animation: 'fadeIn 0.25s ease both' }}>
            <button onClick={() => navigateWeek(-1)} style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 10px', color: 'var(--text)', cursor: 'pointer', fontSize: 16 }}>‹</button>
            <div className="section-label" style={{ margin: 0 }}>{getWeekLabel(weekOffset)}</div>
            <button onClick={() => navigateWeek(1)} style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 10px', color: 'var(--text)', cursor: 'pointer', fontSize: 16 }}>›</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, marginBottom: 20 }}>
            {weekDays.map((d, i) => {
              const isToday = d.toDateString() === today.toDateString();
              const hasDot = dayHasExemption(d);
              return (
                <button key={i} onClick={() => { if (hasDot) setDetailDay(d); }}
                  className="day-cell"
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 4px', borderRadius: 12, background: isToday ? 'var(--accent-dim)' : 'var(--bg-card)', border: `1.5px solid ${isToday ? 'var(--accent)' : 'var(--border)'}`, cursor: hasDot ? 'pointer' : 'default', fontFamily: 'var(--font)', animation: `fadeIn 0.25s ease ${i * 0.06}s both` }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{DAY_NAMES[i]}</span>
                  <span style={{ fontSize: 15, fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--accent)' : 'var(--text)' }}>{d.getDate()}</span>
                  <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{MONTH_NAMES_SHORT[d.getMonth()]}</span>
                  {hasDot && <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)' }} />}
                </button>
              );
            })}
          </div>

          <div className="section-label" style={{ animation: 'fadeIn 0.25s ease 0.15s both' }}>Новое освобождение</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {weekDays.map((d, i) => {
              const selected = selectedDay?.toDateString() === d.toDateString();
              return (
                <button key={i} onClick={() => setSelectedDay(d)} className={`chip chip-btn ${selected ? 'selected' : ''}`} style={{ justifyContent: 'space-between', animation: `fadeIn 0.25s ease ${0.2 + i * 0.04}s both` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="chip-check">
                      {selected && <svg width="11" height="9" viewBox="0 0 11 9" fill="none"><path d="M1 4L4 7.5L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </div>
                    <span style={{ fontWeight: 500, fontSize: 15 }}>{DAY_NAMES[i]}, {d.getDate()} {MONTH_NAMES_SHORT[d.getMonth()]}</span>
                  </div>
                  {d.toDateString() === today.toDateString() && <span className="badge badge-accent">Сегодня</span>}
                </button>
              );
            })}
          </div>
          <button className="btn btn-primary" disabled={!selectedDay} onClick={() => setStep('pick')} style={{ animation: 'fadeIn 0.25s ease 0.5s both' }}>Выбрать студентов →</button>
          <div style={{ height: 20 }} />
        </div>
      )}

      {step === 'pick' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="page-scroll" style={{ padding: '0 16px' }}>
            <div style={{ padding: '8px 12px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', marginBottom: 14, fontSize: 13, color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              ◎ {selectedDay && fmtDate(selectedDay)}
            </div>
            {alreadyExemptedIds.length > 0 && (
              <div style={{ padding: '10px 12px', background: 'var(--warning-dim)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 'var(--radius-sm)', marginBottom: 14, fontSize: 13, color: 'var(--warning)' }}>
                Студенты помечённые <strong>«уже освобождён»</strong> уже имеют освобождение на этот день
              </div>
            )}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>Загрузка...</div>
            ) : (
              <StudentPicker students={students} selectedIds={selectedIds} externalStudents={externalStudents}
                onToggle={toggleStudent} onExternalChange={setExternalStudents} alreadyExemptedIds={alreadyExemptedIds}
                hideExternal={true} />
            )}
            <div style={{ height: 16 }} />
          </div>

          <div style={{
            flexShrink: 0, padding: '12px 16px',
            paddingBottom: 'calc(12px + var(--safe-bottom, 0px))',
            borderTop: '1px solid var(--border)', background: 'var(--bg)',
            display: 'flex', gap: 8,
          }}>
            <button
              onClick={() => setShowExternalModal(true)}
              style={{
                flex: 1, padding: '12px', borderRadius: 'var(--radius)',
                border: '1.5px dashed var(--text-muted)', background: 'var(--bg-raised)',
                color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13,
                fontFamily: 'var(--font)', fontWeight: 500,
              }}>
              + Внешний студент
            </button>
            <button className="btn btn-primary" style={{ flex: 1 }}
              disabled={selectedIds.length === 0 && externalStudents.filter(e => e.fullName).length === 0}
              onClick={() => setStep('confirm')}>
              Далее →
            </button>
          </div>

          {showExternalModal && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', animation: 'fadeIn 0.15s ease' }}
              onClick={() => setShowExternalModal(false)}>
              <div style={{ width: '100%', maxWidth: 420, maxHeight: '70vh', background: 'var(--bg-card)', borderRadius: '16px 16px 0 0', padding: 20, overflow: 'auto', animation: 'menuFadeIn 0.2s ease', transformOrigin: 'bottom' }}
                onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div className="section-label" style={{ margin: 0 }}>Внешние студенты ({externalStudents.length})</div>
                  <button onClick={() => setShowExternalModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20 }}>×</button>
                </div>
                {externalStudents.map((ext, i) => (
                  <div key={i} className="card" style={{ padding: 12, marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>#{i + 1}</span>
                      <button onClick={() => removeExternalInModal(i)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: 16 }}>×</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <input className="input" placeholder="ФИО *" value={ext.fullName} onChange={(e) => updateExternalInModal(i, 'fullName', e.target.value)} />
                      <input className="input" placeholder="Номер группы *" value={ext.groupNumber} onChange={(e) => updateExternalInModal(i, 'groupNumber', e.target.value)} />
                    </div>
                  </div>
                ))}
                <button className="btn btn-ghost" onClick={addExternalInModal} style={{ width: '100%', fontSize: 14 }}>+ Добавить</button>
                <button className="btn btn-primary" onClick={() => setShowExternalModal(false)} style={{ width: '100%', marginTop: 12 }}>Готово</button>
              </div>
            </div>
          )}
        </div>
      )}

      {showBellModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', animation: 'fadeIn 0.15s ease' }}
          onClick={() => setShowBellModal(false)}>
          <div style={{ width: '100%', maxWidth: 420, maxHeight: '70vh', background: 'var(--bg-card)', borderRadius: '16px 16px 0 0', padding: 20, overflow: 'auto', animation: 'menuFadeIn 0.2s ease' }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div className="section-label" style={{ margin: 0, fontSize: 16 }}>Не готово ({nonExhibitedList.length})</div>
              <button onClick={() => setShowBellModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20 }}>×</button>
            </div>
            {loadingBell ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>Загрузка...</div>
            ) : nonExhibitedList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 14 }}>Все готово ✓</div>
            ) : (
              nonExhibitedList.map((ex: any) => (
                <div key={ex.id} className="card" style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>{fmtDate(ex.exemptionDate)}</div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{ex.coordinator.fullName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>{ex.reason}</div>
                   <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => { setExemptions((current) => current.some((item) => item.id === ex.id) ? current : [...current, ex]); setDetailDay(new Date(ex.exemptionDate)); setShowBellModal(false); }}
                      style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>
                      Открыть
                    </button>
                    <button onClick={() => toggleExhibited(ex.id)}
                      style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', color: 'var(--accent)', fontSize: 12, fontWeight: 600 }}>
                      Выставить
                    </button>
                    <button onClick={() => togglePrinted(ex.id)}
                      style={{ background: ex.isPrinted ? 'var(--accent-dim)' : 'var(--bg-raised)', border: `1px solid ${ex.isPrinted ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 8, padding: '4px 10px', cursor: 'pointer', color: ex.isPrinted ? 'var(--accent)' : 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>
                      {ex.isPrinted ? '✓ Распечатано' : '○ Распечатать'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {step === 'confirm' && (
        <div className="page-scroll" style={{ padding: '0 16px' }}>
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Дата</div>
            <div style={{ fontWeight: 600 }}>{selectedDay && fmtDate(selectedDay)}</div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div className="section-label">Причина освобождения *</div>
            <textarea className="input" placeholder="Укажите причину... (пиши с маленькой буквы, в творительном падеже)" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} style={{ resize: 'none' }} />
          </div>
          <div className="section-label">Выбранные студенты ({selectedIds.length + externalStudents.filter(e => e.fullName).length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {students.filter((s) => selectedIds.includes(s.id)).map((s) => (
              <div key={s.id} className="card" style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{s.fullName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>гр. {s.groupNumber}</div>
                </div>
                <button onClick={() => toggleStudent(s.id)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: 18, padding: 4 }}>×</button>
              </div>
            ))}
            {externalStudents.filter(e => e.fullName).map((e, i) => (
              <div key={`ext-${i}`} className="card" style={{ padding: '10px 12px' }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{e.fullName}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>гр. {e.groupNumber} · Внешний</div>
              </div>
            ))}
          </div>
          <button className="btn btn-primary" disabled={!reason.trim() || submitting} onClick={submit}>
            {submitting ? 'Отправка...' : '✓ Выставить освобождения'}
          </button>
          <div style={{ height: 20 }} />
        </div>
      )}
    </div>
  );
}
