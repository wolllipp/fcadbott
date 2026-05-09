import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';

interface StudentInfo {
  id: number;
  fullName: string;
  groupNumber: string;
  studentCardNumber: string;
}

interface EventData {
  id: number;
  name: string;
  eventDate: string;
  description: string | null;
  attendanceFinalized?: boolean;
  participants: { id: number; fullName: string; groupNumber: string; attended: boolean }[];
}

interface ExemptionData {
  id: number;
  exemptionDate: string;
  reason: string;
  status: string;
  isExhibited: boolean;
  students: {
    student?: { fullName: string; groupNumber: string } | null;
    externalName?: string | null;
    externalGroup?: string | null;
  }[];
  coordinator: { fullName: string };
}

interface PetitionData {
  id: number;
  type: 'DISCOUNT' | 'DORMITORY' | 'SPECIALIZATION';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  events: { eventName: string; eventDate: string }[];
  createdAt: string;
}

type Tab = 'events' | 'exemptions';

const PETITION_TYPES = ['DISCOUNT', 'DORMITORY', 'SPECIALIZATION'] as const;

const PETITION_LABELS: Record<string, string> = {
  DISCOUNT: 'на скидку',
  DORMITORY: 'на общежитие',
  SPECIALIZATION: 'на профилизацию',
};

function fmtDate(d: string) {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}.${dt.getFullYear()}`;
}

export default function StudentDashboard({ student, onLogout }: { student: StudentInfo; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>('events');
  const [events, setEvents] = useState<EventData[]>([]);
  const [exemptions, setExemptions] = useState<ExemptionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [myEventIds, setMyEventIds] = useState<Set<number>>(new Set());
  const [registering, setRegistering] = useState<number | null>(null);
  const [showPetitionModal, setShowPetitionModal] = useState(false);
  const [selectedPetitionTypes, setSelectedPetitionTypes] = useState<Set<string>>(new Set());
  const [submittingPetition, setSubmittingPetition] = useState(false);
  const [petitions, setPetitions] = useState<PetitionData[]>([]);
  const [myAttendedIds, setMyAttendedIds] = useState<number[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [evts, exmps, pets] = await Promise.all([
          api.events.list(),
          api.exemptions.byStudent({ fullName: student.fullName }),
          api.petitions.list({ studentId: student.id }).catch(() => []),
        ]);
        setEvents(evts);
        setPetitions(pets);
        setExemptions(exmps.filter((e: ExemptionData) => e.status === 'APPROVED' && e.isExhibited));
        const registered = evts.filter((e: EventData) =>
          e.participants.some((p: any) => p.fullName === student.fullName && p.groupNumber === student.groupNumber)
        );
        setMyEventIds(new Set(registered.map((e: EventData) => e.id)));
        const attended = evts.filter((e: EventData) =>
          e.participants.some((p: any) => p.fullName === student.fullName && p.groupNumber === student.groupNumber && p.attended && (e as any).attendanceFinalized)
        );
        setMyAttendedIds(attended.map((e: EventData) => e.id));
      } catch (_) {}
      setLoading(false);
    }
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  async function registerForEvent(eventId: number) {
    setRegistering(eventId);
    try {
      await fetch(`/api/events/${eventId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: student.fullName, groupNumber: student.groupNumber }),
      });
      setMyEventIds((prev) => new Set(prev).add(eventId));
    } catch (_) {}
    setRegistering(null);
  }

  async function submitPetition() {
    if (selectedPetitionTypes.size === 0) return;
    setSubmittingPetition(true);
    try {
      const attendedParticipantIds = events
        .filter((e) => myAttendedIds.includes(e.id))
        .flatMap((e) =>
          e.participants
            .filter((p) => p.fullName === student.fullName && p.groupNumber === student.groupNumber && p.attended)
            .map((p) => p.id)
        );
      for (const type of selectedPetitionTypes) {
        await api.petitions.create({ studentId: student.id, type, eventIds: attendedParticipantIds });
      }
      setShowPetitionModal(false);
      setSelectedPetitionTypes(new Set());
      const pets = await api.petitions.list({ studentId: student.id }).catch(() => []);
      setPetitions(pets);
    } catch (e: any) { alert(e.message); }
    setSubmittingPetition(false);
  }

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Загрузка...
      </div>
    );
  }

  const upcomingEvents = events.filter((e) => {
    if (new Date(e.eventDate) < new Date(new Date().setHours(0, 0, 0, 0))) return false;
    if (!myEventIds.has(e.id)) return false;
    if ((e as any).attendanceFinalized) return false;
    return true;
  });
  const attendedEvents = events.filter((e) => myAttendedIds.includes(e.id));
  const missedEvents = events.filter((e) => {
    if (!myEventIds.has(e.id)) return false;
    if (!(e as any).attendanceFinalized) return false;
    const myP = e.participants.find((p: any) => p.fullName === student.fullName && p.groupNumber === student.groupNumber);
    return myP && !myP.attended;
  });

  const hasActivePetition = petitions.some((p) => p.status === 'PENDING');
  const lastApprovedPetition = petitions.find((p) => p.status === 'APPROVED');
  const anyAttended = myAttendedIds.length > 0;

  const maxSlots = Math.floor(myAttendedIds.length / 5);
  const usedSlots = petitions.length;
  const availableSlots = maxSlots - usedSlots;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Студент</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>{student.fullName}</h1>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>гр. {student.groupNumber}</div>
        </div>
        <button onClick={onLogout}
          style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}>
          Выйти
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '16px 16px 0' }}>
        <button onClick={() => setTab('events')}
          style={{
            flex: 1, padding: '10px', borderRadius: 8, border: 'none',
            background: tab === 'events' ? 'var(--accent)' : 'var(--bg-raised)',
            color: tab === 'events' ? 'white' : 'var(--text)',
            fontWeight: 600, fontSize: 13, cursor: 'pointer',
          }}>
          Мероприятия
        </button>
        <button onClick={() => setTab('exemptions')}
          style={{
            flex: 1, padding: '10px', borderRadius: 8, border: 'none',
            background: tab === 'exemptions' ? 'var(--accent)' : 'var(--bg-raised)',
            color: tab === 'exemptions' ? 'white' : 'var(--text)',
            fontWeight: 600, fontSize: 13, cursor: 'pointer',
          }}>
          Освобождения
        </button>
      </div>

      <div className="page-scroll" style={{ padding: '0 16px', marginTop: 12 }}>
        {tab === 'events' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {upcomingEvents.length > 0 && (
              <>
                <div className="section-label">Предстоящие</div>
                {upcomingEvents.map((ev) => {
                  const isRegistered = myEventIds.has(ev.id);
                  return (
                    <div key={ev.id} className="card" style={{ animation: 'fadeIn 0.2s ease both' } as React.CSSProperties}>
                      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{ev.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{fmtDate(ev.eventDate)}</div>
                      {ev.description && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>{ev.description}</div>}
                      {isRegistered ? (
                        <div style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>
                          ✓ Вы записаны
                        </div>
                      ) : (
                        <button className="btn btn-primary" disabled={registering === ev.id}
                          onClick={() => registerForEvent(ev.id)}
                          style={{ padding: '10px', fontSize: 13 }}>
                          {registering === ev.id ? '...' : '+ Записаться'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {attendedEvents.length > 0 && (
              <>
                <div className="section-label" style={{ marginTop: upcomingEvents.length > 0 ? 16 : 0 }}>Посещённые</div>
                {attendedEvents.map((ev) => (
                  <div key={ev.id} className="card" style={{ borderColor: 'var(--success-dim)' }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{ev.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(ev.eventDate)}</div>
                    <div style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600, marginTop: 4 }}>✓ Был(а)</div>
                  </div>
                ))}
              </>
            )}

            {missedEvents.length > 0 && (
              <>
                <div className="section-label" style={{ marginTop: 16 }}>Пропущенные</div>
                {missedEvents.map((ev) => (
                  <div key={ev.id} className="card" style={{ borderColor: 'var(--error)' }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{ev.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(ev.eventDate)}</div>
                    <div style={{ fontSize: 11, color: 'var(--error)', fontWeight: 600, marginTop: 4 }}>✗ Не явился</div>
                  </div>
                ))}
              </>
            )}

            {upcomingEvents.length === 0 && attendedEvents.length === 0 && missedEvents.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>○</div>
                Нет мероприятий
              </div>
            )}

            {lastApprovedPetition && (
              <div className="card" style={{ marginTop: 8, borderColor: 'var(--accent)', background: 'var(--accent-dim)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent)' }}>
                      Ходатайство {PETITION_LABELS[lastApprovedPetition.type]} одобрено
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                      Распечатай и подпиши в 306-2
                    </div>
                  </div>
                  <button className="btn btn-ghost" onClick={() => {
                    const a = document.createElement('a');
                    a.href = api.petitions.downloadUrl(lastApprovedPetition.id);
                    a.download = 'Ходатайство.docx';
                    a.click();
                  }} style={{ padding: '8px 14px', fontSize: 13, color: 'var(--accent)', borderColor: 'var(--accent)', width: 'auto', flexShrink: 0 }}>
                    Скачать .docx
                  </button>
                </div>
              </div>
            )}

            <div style={{ height: 8 }} />
            {availableSlots > 0 && !hasActivePetition ? (
              <button className="btn btn-primary" onClick={() => setShowPetitionModal(true)} style={{ marginTop: 4 }}>
                Податься на ходатайство ({availableSlots})
              </button>
            ) : hasActivePetition ? (
              <div style={{ textAlign: 'center', padding: 12, color: 'var(--warning)', fontSize: 13, fontWeight: 600 }}>
                Ходатайство на рассмотрении
              </div>
            ) : availableSlots <= 0 && anyAttended ? (
              <div style={{ textAlign: 'center', padding: 12, color: 'var(--text-muted)', fontSize: 13 }}>
                Все ходатайства использованы (макс. {maxSlots})
              </div>
            ) : null}
          </div>
        )}

        {tab === 'exemptions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {exemptions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>◎</div>
                Нет выставленных освобождений
              </div>
            ) : (
              exemptions.map((ex) => {
                const otherStudents = ex.students.filter((es: any) =>
                  (es.student?.fullName || es.externalName) !== student.fullName
                );
                return (
                  <div key={ex.id} className="card" style={{ borderColor: 'var(--success-dim)' }}>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{ex.reason}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                      {fmtDate(ex.exemptionDate)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                      Выставил(а): {ex.coordinator.fullName}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>
                      Вместе с вами ({otherStudents.length}):
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                      {otherStudents.map((es: any, i: number) => (
                        <div key={i} style={{ fontSize: 13, color: 'var(--text)' }}>
                          {es.student?.fullName || es.externalName} — {es.student?.groupNumber || es.externalGroup}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {showPetitionModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.15s ease',
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowPetitionModal(false)} />
          <div className="card" style={{
            position: 'relative', zIndex: 1, width: '85%', maxWidth: 360,
            animation: 'scaleIn 0.2s ease',
            display: 'flex', flexDirection: 'column', gap: 10, padding: 20,
          }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Подать ходатайство</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
              {myAttendedIds.length} мероприятий = макс. {maxSlots} ходатайств, осталось {availableSlots}. Выберите типы:
            </div>
            {PETITION_TYPES.map((t) => {
              const checked = selectedPetitionTypes.has(t);
              return (
                <div key={t} className="card" style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '12px',
                  cursor: 'pointer',
                  borderColor: checked ? 'var(--accent)' : 'var(--border)',
                  background: checked ? 'var(--accent-dim)' : 'var(--bg-card)',
                }} onClick={() => {
                  const next = new Set(selectedPetitionTypes);
                  if (next.has(t)) {
                    next.delete(t);
                  } else if (next.size < availableSlots) {
                    next.add(t);
                  }
                  setSelectedPetitionTypes(next);
                }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                    border: `2px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
                    background: checked ? 'var(--accent)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: '0.15s',
                  }}>
                    {checked && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span style={{ fontWeight: 500, fontSize: 14 }}>Ходатайство {PETITION_LABELS[t]}</span>
                </div>
              );
            })}
            <button className="btn btn-primary" disabled={selectedPetitionTypes.size === 0 || submittingPetition}
              onClick={submitPetition} style={{ marginTop: 4 }}>
              {submittingPetition ? '...' : `Отправить (${selectedPetitionTypes.size})`}
            </button>
            <button onClick={() => { setShowPetitionModal(false); setSelectedPetitionTypes(new Set()); }}
              style={{ width: '100%', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px', color: 'var(--text)', cursor: 'pointer', fontSize: 14, marginTop: 4 }}>
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
