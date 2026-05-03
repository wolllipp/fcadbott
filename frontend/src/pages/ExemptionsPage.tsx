import React, { useState, useEffect } from 'react';
import { Coordinator } from '../App';
import { api } from '../utils/api';
import StudentPicker, { Student, ExternalStudent } from '../components/StudentPicker';
import SuccessScreen from '../components/SuccessScreen';

type Step = 'calendar' | 'pick' | 'confirm' | 'success' | 'pending-list' | 'pending-detail';

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MONTH_NAMES_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

function getWeekDays() {
  const now = new Date();
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

function fmtDate(d: Date | string) {
  const dt = typeof d === 'string' ? new Date(d) : d;
  return `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}.${dt.getFullYear()}`;
}

interface Props { coordinator: Coordinator; }

export default function ExemptionsPage({ coordinator }: Props) {
  const isChairman = coordinator.role === 'CHAIRMAN' || coordinator.role === 'DEPUTY';

  const [step, setStep] = useState<Step>('calendar');
  const [weekDays] = useState(getWeekDays());
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
  const [activeTab, setActiveTab] = useState<'calendar' | 'pending'>('calendar');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    api.exemptions.list('current').then(setExemptions).catch(console.error);
    if (isChairman) {
      api.exemptions.pending().then(setPendingExemptions).catch(console.error);
    }
  }

  useEffect(() => {
    if (step === 'pick') {
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
        externalStudents: externalStudents.filter((e) => e.fullName),
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

  function reset() {
    setStep('calendar');
    setSelectedDay(null);
    setSelectedIds([]);
    setExternalStudents([]);
    setAlreadyExemptedIds([]);
    setReason('');
    loadData();
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);

  function dayHasExemption(d: Date) {
    return exemptions.some((e) => new Date(e.exemptionDate).toDateString() === d.toDateString());
  }

  function getExemptionsForDay(d: Date) {
    return exemptions.filter((e) => new Date(e.exemptionDate).toDateString() === d.toDateString());
  }

  if (step === 'success') {
    const isOwn = isChairman;
    return (
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <SuccessScreen
          title="Освобождения выставлены"
          subtitle={isOwn ? 'Докладная и файл отправлены секретарю' : 'Докладная отправлена председателю на рассмотрение'}
          onDone={reset}
        />
      </div>
    );
  }

  // Detail view for pending exemption (chairman)
  if (step === 'pending-detail' && selectedPending) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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

  // Day detail view
  if (detailDay) {
    const dayExemptions = getExemptionsForDay(detailDay);
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px 16px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <button onClick={() => setDetailDay(null)} style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 12px', color: 'var(--text)', cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font)' }}>← Назад</button>
            <h2 style={{ fontSize: 17, fontWeight: 700 }}>{fmtDate(detailDay)}</h2>
          </div>
        </div>
        <div className="page-scroll" style={{ padding: '0 16px' }}>
          {dayExemptions.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', fontSize: 14 }}>Освобождений нет</div>
          ) : dayExemptions.map((ex) => {
            const statusLabel = ex.status === 'APPROVED' ? 'Подтверждено' : ex.status === 'REJECTED' ? 'Отклонено' : 'На рассмотрении';
            const statusClass = ex.status === 'APPROVED' ? 'badge-green' : ex.status === 'REJECTED' ? 'badge-gray' : 'badge-yellow';
            return (
              <div key={ex.id} className="card" style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{ex.coordinator.fullName}</div>
                  <span className={`badge ${statusClass}`}>{statusLabel}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>{ex.reason}</div>
                {ex.students.map((es: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: i === 0 ? '1px solid var(--border)' : 'none', fontSize: 13 }}>
                    <span>{es.student?.fullName || es.externalName}</span>
                    <span style={{ color: 'var(--text-muted)' }}>гр. {es.student?.groupNumber || es.externalGroup}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px 16px 0', flexShrink: 0 }}>
        {step !== 'calendar' && step !== 'pending-list' && (
          <button onClick={() => { if (step === 'pick') setStep('calendar'); else if (step === 'amounts' as any) setStep('pick'); else setStep('pick'); }}
            style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 12px', color: 'var(--text)', cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font)', marginBottom: 12 }}>
            ← Назад
          </button>
        )}
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Освобождения</h1>

        {/* Tabs for chairman */}
        {isChairman && (step === 'calendar' || step === 'pending-list') && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {(['calendar', 'pending-list'] as const).map((tab) => (
              <button key={tab} onClick={() => { setActiveTab(tab === 'calendar' ? 'calendar' : 'pending'); setStep(tab); }}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 10, border: '1.5px solid',
                  borderColor: step === tab ? 'var(--accent)' : 'var(--border)',
                  background: step === tab ? 'var(--accent-dim)' : 'var(--bg-raised)',
                  color: step === tab ? 'var(--accent)' : 'var(--text-secondary)',
                  fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  position: 'relative',
                }}>
                {tab === 'calendar' ? 'Календарь' : (
                  <span>
                    На рассмотрении
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

      {/* PENDING LIST (chairman) */}
      {step === 'pending-list' && (
        <div className="page-scroll" style={{ padding: '0 16px' }}>
          {pendingExemptions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: 14 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
              Нет докладных на рассмотрении
            </div>
          ) : pendingExemptions.map((ex) => (
            <div key={ex.id} className="card" style={{ marginBottom: 10, cursor: 'pointer' }}
              onClick={() => { setSelectedPending(ex); setStep('pending-detail'); }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{ex.coordinator.fullName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 3 }}>
                    📅 {fmtDate(ex.exemptionDate)} · {ex.students.length} студ.
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{ex.reason}</div>
                </div>
                <span style={{ color: 'var(--accent)', fontSize: 18 }}>›</span>
              </div>
            </div>
          ))}
          <div style={{ height: 20 }} />
        </div>
      )}

      {/* CALENDAR */}
      {step === 'calendar' && (
        <div className="page-scroll" style={{ padding: '0 16px' }}>
          <div className="section-label">Текущая неделя</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, marginBottom: 20 }}>
            {weekDays.map((d, i) => {
              const isToday = d.toDateString() === today.toDateString();
              const hasDot = dayHasExemption(d);
              return (
                <button key={i} onClick={() => { if (hasDot) setDetailDay(d); }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 4px', borderRadius: 12, background: isToday ? 'var(--accent-dim)' : 'var(--bg-card)', border: `1.5px solid ${isToday ? 'var(--accent)' : 'var(--border)'}`, cursor: hasDot ? 'pointer' : 'default', fontFamily: 'var(--font)' }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{DAY_NAMES[i]}</span>
                  <span style={{ fontSize: 15, fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--accent)' : 'var(--text)' }}>{d.getDate()}</span>
                  <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{MONTH_NAMES_SHORT[d.getMonth()]}</span>
                  {hasDot && <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)' }} />}
                </button>
              );
            })}
          </div>

          <div className="section-label">Новое освобождение</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {weekDays.map((d, i) => {
              const selected = selectedDay?.toDateString() === d.toDateString();
              return (
                <button key={i} onClick={() => setSelectedDay(d)} className={`chip ${selected ? 'selected' : ''}`} style={{ justifyContent: 'space-between' }}>
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
          <button className="btn btn-primary" disabled={!selectedDay} onClick={() => setStep('pick')}>Выбрать студентов →</button>
          <div style={{ height: 20 }} />
        </div>
      )}

      {/* PICK */}
      {step === 'pick' && (
        <div className="page-scroll" style={{ padding: '0 16px' }}>
          <div style={{ padding: '8px 12px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', marginBottom: 14, fontSize: 13, color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            📅 {selectedDay && fmtDate(selectedDay)}
          </div>
          {alreadyExemptedIds.length > 0 && (
            <div style={{ padding: '10px 12px', background: 'var(--warning-dim)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 'var(--radius-sm)', marginBottom: 14, fontSize: 13, color: 'var(--warning)' }}>
              ⚠️ Студенты помечённые <strong>«уже освобождён»</strong> уже имеют освобождение на этот день
            </div>
          )}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>Загрузка...</div>
          ) : (
            <StudentPicker students={students} selectedIds={selectedIds} externalStudents={externalStudents}
              onToggle={toggleStudent} onExternalChange={setExternalStudents} alreadyExemptedIds={alreadyExemptedIds} />
          )}
          <div style={{ marginTop: 16 }}>
            <button className="btn btn-primary"
              disabled={selectedIds.length === 0 && externalStudents.filter(e => e.fullName).length === 0}
              onClick={() => setStep('confirm')}>Далее →</button>
          </div>
          <div style={{ height: 20 }} />
        </div>
      )}

      {/* CONFIRM */}
      {step === 'confirm' && (
        <div className="page-scroll" style={{ padding: '0 16px' }}>
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Дата</div>
            <div style={{ fontWeight: 600 }}>{selectedDay && fmtDate(selectedDay)}</div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div className="section-label">Причина освобождения *</div>
            <textarea className="input" placeholder="Укажите причину..." value={reason} onChange={(e) => setReason(e.target.value)} rows={3} style={{ resize: 'none' }} />
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
