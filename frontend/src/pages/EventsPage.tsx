import React, { useState, useEffect } from 'react';
import { Coordinator } from '../App';
import { api } from '../utils/api';
import CalendarField from '../components/CalendarField';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div className="section-label" style={{ marginBottom: 0 }}>{label}</div>
      {children}
    </div>
  );
}

interface EventData {
  id: number;
  name: string;
  eventDate: string;
  description: string | null;
  createdBy: number;
  attendanceFinalized: boolean;
  participants: EventParticipant[];
  scannerAssignments?: { coordinator: { id: number; fullName: string; telegramUsername: string } }[];
}

interface EventParticipant {
  id: number;
  eventId: number;
  fullName: string;
  groupNumber: string;
  attended: boolean;
}

type Step = 'list' | 'create' | 'detail' | 'edit' | 'add-participant';

function fmtDate(d: string) {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}.${dt.getFullYear()}`;
}

interface Props {
  coordinator: Coordinator;
}

export default function EventsPage({ coordinator }: Props) {
  const [step, setStep] = useState<Step>('list');
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  const [newEvent, setNewEvent] = useState({ name: '', eventDate: '', description: '', location: '', status: 'DRAFT', pointsForAttendance: 0, pointsForOrganization: 0, maxParticipants: 0, audience: 'ALL', facultyOnly: false, scannerCoordinatorId: 0, scannerCoordinatorIds: [] as number[], studentScannerIds: [] as number[], organizerStudentIds: [] as number[] });
  const [newParticipant, setNewParticipant] = useState({ fullName: '', groupNumber: '' });
  const [editingEvent, setEditingEvent] = useState({ name: '', eventDate: '', description: '', location: '', status: 'DRAFT', pointsForAttendance: 0, pointsForOrganization: 0, maxParticipants: 0, audience: 'ALL', facultyOnly: false, scannerCoordinatorId: 0, scannerCoordinatorIds: [] as number[], studentScannerIds: [] as number[], organizerStudentIds: [] as number[] });
  const [exemptionDate, setExemptionDate] = useState('');
  const [exemptionReason, setExemptionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [councilStudents, setCouncilStudents] = useState<any[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(new Set());
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualStudent, setManualStudent] = useState({ fullName: '', groupNumber: '' });
  const [externalParticipants, setExternalParticipants] = useState<{ fullName: string; groupNumber: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem('extParticipants') || '[]'); } catch { return []; }
  });
  const [selectedExternalIndices, setSelectedExternalIndices] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [coordinatorsList, setCoordinatorsList] = useState<{ id: number; fullName: string; telegramUsername: string; role: string }[]>([]);
  const [showCoordinatorScanners, setShowCoordinatorScanners] = useState(false);
  const [showStudentScanners, setShowStudentScanners] = useState(false);

  useEffect(() => {
    loadEvents();
    api.events.coordinators().then(setCoordinatorsList).catch(() => {});
    api.council.students.list().then(setCouncilStudents).catch(() => {});
    const interval = setInterval(loadEvents, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem('extParticipants', JSON.stringify(externalParticipants));
  }, [externalParticipants]);

  useEffect(() => {
    if (step === 'add-participant') {
      api.council.students.list().then(setCouncilStudents).catch(() => {});
      setSelectedStudentIds(new Set());
      setSelectedExternalIndices(new Set());
      setSearchQuery('');
    }
  }, [step]);

  async function loadEvents() {
    setLoading(true);
    try {
      const data = await api.events.list();
      setEvents(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function createEvent(statusOverride?: string) {
    if (!newEvent.name || !newEvent.eventDate) return;
    setSubmitting(true);
    try {
      await api.events.create({ ...newEvent, status: statusOverride || newEvent.status, coordinatorId: coordinator.id, role: coordinator.role, scannerCoordinatorIds: newEvent.scannerCoordinatorIds.length ? newEvent.scannerCoordinatorIds : [coordinator.id], scannerCoordinatorId: newEvent.scannerCoordinatorIds[0] || coordinator.id, studentScannerIds: newEvent.studentScannerIds, organizerStudentIds: newEvent.organizerStudentIds });
      setNewEvent({ name: '', eventDate: '', description: '', location: '', status: 'DRAFT', pointsForAttendance: 0, pointsForOrganization: 0, maxParticipants: 0, audience: 'ALL', facultyOnly: false, scannerCoordinatorId: 0, scannerCoordinatorIds: [], studentScannerIds: [], organizerStudentIds: [] });
      setStep('list');
      await loadEvents();
    } catch (e: any) { alert(e.message); }
    finally { setSubmitting(false); }
  }

  async function updateEvent() {
    if (!selectedEvent || !editingEvent.name || !editingEvent.eventDate) return;
    setSubmitting(true);
    try {
      await api.events.update(selectedEvent.id, { ...editingEvent, coordinatorId: coordinator.id, role: coordinator.role, scannerCoordinatorIds: editingEvent.scannerCoordinatorIds, scannerCoordinatorId: editingEvent.scannerCoordinatorIds[0] || null, studentScannerIds: editingEvent.studentScannerIds, organizerStudentIds: editingEvent.organizerStudentIds });
      setStep('list');
      await loadEvents();
    } catch (e: any) { alert(e.message); }
    finally { setSubmitting(false); }
  }

  async function deleteEvent(id: number) {
    if (!confirm('Удалить мероприятие и всех участников?')) return;
    try {
      await api.events.remove(id, { coordinatorId: coordinator.id, role: coordinator.role });
      await loadEvents();
    } catch (e: any) { alert(e.message); }
  }

  async function addParticipant() {
    if (!selectedEvent || !newParticipant.fullName || !newParticipant.groupNumber) return;
    try {
      await api.events.addParticipant(selectedEvent.id, { ...newParticipant, attended: false, role: coordinator.role });
      setNewParticipant({ fullName: '', groupNumber: '' });
      setStep('detail');
      await loadEvents();
      const updated = await api.events.list();
      setSelectedEvent(updated.find((e: EventData) => e.id === selectedEvent.id) || null);
    } catch (e: any) { alert(e.message); }
  }

  async function toggleAttendance(participantId: number) {
    if (!selectedEvent) return;
    const participant = selectedEvent.participants.find((p) => p.id === participantId);
    if (!participant) return;
    try {
      await api.events.updateParticipant(selectedEvent.id, participantId, { attended: !participant.attended, role: coordinator.role });
      setSelectedEvent((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          participants: prev.participants.map((p) =>
            p.id === participantId ? { ...p, attended: !p.attended } : p
          ),
        };
      });
    } catch (e: any) { alert(e.message); }
  }

  async function addSelectedParticipants() {
    if (!selectedEvent) return;
    const selected = councilStudents.filter((s) => selectedStudentIds.has(s.id));
    for (const s of selected) {
      try {
        await api.events.addParticipant(selectedEvent.id, { fullName: s.fullName, groupNumber: s.groupNumber, attended: false, role: coordinator.role });
      } catch (_) {}
    }
    setStep('detail');
    await loadEvents();
    const updated = await api.events.list();
    setSelectedEvent(updated.find((e: EventData) => e.id === selectedEvent.id) || null);
  }

  async function addManualParticipant() {
    if (!selectedEvent || !manualStudent.fullName || !manualStudent.groupNumber) return;
    try {
      await api.events.addParticipant(selectedEvent.id, { ...manualStudent, attended: false, role: coordinator.role });
      const entry = { fullName: manualStudent.fullName, groupNumber: manualStudent.groupNumber };
      setExternalParticipants((prev) => {
        if (prev.some((p) => p.fullName === entry.fullName)) return prev;
        return [...prev, entry];
      });
      setManualStudent({ fullName: '', groupNumber: '' });
      setShowManualModal(false);
      setStep('detail');
      await loadEvents();
      const updated = await api.events.list();
      setSelectedEvent(updated.find((e: EventData) => e.id === selectedEvent.id) || null);
    } catch (e: any) { alert(e.message); }
  }

  async function addSelectedExternal() {
    if (!selectedEvent) return;
    const selected = externalParticipants.filter((_, i) => selectedExternalIndices.has(i));
    for (const s of selected) {
      try {
        await api.events.addParticipant(selectedEvent.id, { fullName: s.fullName, groupNumber: s.groupNumber, attended: false, role: coordinator.role });
      } catch (_) {}
    }
    setStep('detail');
    await loadEvents();
    const updated = await api.events.list();
    setSelectedEvent(updated.find((e: EventData) => e.id === selectedEvent.id) || null);
  }

  async function removeParticipant(participantId: number) {
    if (!selectedEvent) return;
    if (!confirm('Удалить участника?')) return;
    try {
      await api.events.removeParticipant(selectedEvent.id, participantId);
      setSelectedEvent((prev) => {
        if (!prev) return prev;
        return { ...prev, participants: prev.participants.filter((p) => p.id !== participantId) };
      });
    } catch (e: any) { alert(e.message); }
  }

  async function generateExemption() {
    if (!selectedEvent) return;
    setSubmitting(true);
    try {
      await api.events.generateExemption(selectedEvent.id, {
        coordinatorId: coordinator.id,
        exemptionDate: exemptionDate || selectedEvent.eventDate,
        reason: exemptionReason || selectedEvent.name,
      });
      alert('Докладная отправлена!');
      setExemptionDate('');
      setExemptionReason('');
      setStep('list');
    } catch (e: any) { alert(e.message); }
    finally { setSubmitting(false); }
  }

  const isAdmin = !['COORDINATOR'].includes(coordinator.role);
  const attendedCount = selectedEvent?.participants.filter((p) => p.attended).length || 0;
  const activeEvents = events.filter((event) => (event as any).status !== 'COMPLETED');
  const completedEvents = events.filter((event) => (event as any).status === 'COMPLETED');

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px 16px 0', flexShrink: 0 }}>
        {step !== 'list' && (
          <button onClick={() => { setStep(step === 'add-participant' ? 'detail' : 'list'); if (step !== 'add-participant') setSelectedEvent(null); }}
            style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 12px', color: 'var(--text)', cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font)', marginBottom: 12 }}>
            ← Назад
          </button>
        )}
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
          {step === 'create' ? 'Новое мероприятие' : step === 'edit' ? 'Редактировать' : step === 'add-participant' ? 'Добавить участника' : step === 'detail' ? selectedEvent?.name : 'Мероприятия'}
        </h1>
      </div>

      <div className="page-scroll" style={{ padding: '0 16px' }}>
        {step === 'list' && (
          <>
            <button className="btn btn-primary" onClick={() => setStep('create')} style={{ marginBottom: 16 }}>
              + Создать мероприятие
            </button>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>Загрузка...</div>
            ) : events.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>○</div>
                Мероприятий пока нет
              </div>
            ) : (
               [...activeEvents, ...completedEvents].map((ev, i) => (
                 <React.Fragment key={ev.id}>
                 {i === activeEvents.length && completedEvents.length > 0 && (
                   <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '22px 0 12px', color: 'var(--text-muted)', fontSize: 12 }}>
                     <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                     Завершённые
                     <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                   </div>
                 )}
                 <div className="card" style={{ marginBottom: 10, cursor: 'pointer', opacity: (ev as any).status === 'COMPLETED' ? 0.72 : 1, animation: `fadeIn 0.25s ease ${i * 0.04}s both` }}
                  onClick={() => { setSelectedEvent(ev); setStep('detail'); }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div style={{ fontWeight: 700, fontSize: 17 }}>{ev.name}</div>
                    {(ev as any).status === 'DRAFT' ? <span className="badge badge-gray" style={{ fontSize: 10 }}>Черновик</span> :
                     (ev as any).status === 'PUBLISHED' ? <span className="badge badge-green" style={{ fontSize: 10 }}>● Опубликовано</span> :
                     (ev as any).status === 'COMPLETED' ? <span className="badge badge-gray" style={{ fontSize: 10 }}>● Завершено</span> : null}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{fmtDate(ev.eventDate)} {(ev as any).location ? `· ${(ev as any).location}` : ''}</div>
                  {ev.description && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>{ev.description}</div>}
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    <span>Участников: {ev.participants.length}</span>
                    <span>Было: {ev.participants.filter((p) => p.attended).length}</span>
                    {(ev as any).pointsForAttendance ? <span style={{ color: 'var(--accent)', fontWeight: 600 }}>+{(ev as any).pointsForAttendance} б.</span> : null}
                    {(ev as any).audience === 'SS' ? <span style={{ color: 'var(--warning)' }}>Студсовет</span> : (ev as any).audience === 'FKP' ? <span style={{ color: 'var(--accent)' }}>ФКП</span> : null}
                    {(ev as any).creator && <span style={{ fontSize: 11 }}>создал: {(ev as any).creator.fullName}</span>}
                    {(ev as any).scannerCoordinator && (ev as any).scannerCoordinator.id !== (ev as any).creator?.id && <span style={{ fontSize: 11 }}>отмечающий: {(ev as any).scannerCoordinator.fullName}</span>}
                  </div>
                  {(isAdmin || (ev.createdBy === coordinator.id && !ev.attendanceFinalized)) && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      {(ev as any).status === 'DRAFT' && (
                        <button onClick={(e) => { e.stopPropagation(); api.events.update(ev.id, { status: 'PUBLISHED', coordinatorId: coordinator.id, role: coordinator.role }).then(() => loadEvents()); }}
                          style={{ background: 'var(--success)', border: 'none', borderRadius: 8, padding: '6px 14px', color: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                          Опубликовать
                        </button>
                      )}
                     <button                       onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); const assigned = ((ev as any).scannerAssignments || []).map((a: any) => a.coordinator.id); const studentAssigned = ((ev as any).studentScannerAssignments || []).map((a: any) => a.student.id); const organizerAssigned = ((ev as any).organizerAssignments || []).map((a: any) => a.student.id); setEditingEvent({ name: ev.name, eventDate: ev.eventDate.slice(0, 10), description: ev.description || '', location: (ev as any).location || '', status: (ev as any).status || 'DRAFT', pointsForAttendance: (ev as any).pointsForAttendance || 0, pointsForOrganization: (ev as any).pointsForOrganization || 0, maxParticipants: (ev as any).maxParticipants || 0, audience: (ev as any).audience || 'ALL', facultyOnly: (ev as any).facultyOnly || false, scannerCoordinatorId: (ev as any).scannerCoordinatorId || 0, scannerCoordinatorIds: assigned.length ? assigned : ((ev as any).scannerCoordinatorId ? [(ev as any).scannerCoordinatorId] : []), studentScannerIds: studentAssigned, organizerStudentIds: organizerAssigned }); setStep('edit'); }}
                        style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 14px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 15 }}>
                        ✎
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); deleteEvent(ev.id); }}
                        style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: 12, padding: '4px 10px' }}>
                        Удалить
                      </button>
                    </div>
                  )}
                 </div>
                 </React.Fragment>
               ))
            )}
          </>
        )}

        {(step === 'create' || step === 'edit') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 24 }}>
            <Field label="Название *">
            <input className="input" placeholder="Название мероприятия"
              value={step === 'create' ? newEvent.name : editingEvent.name}
              onChange={(e) => step === 'create' ? setNewEvent({ ...newEvent, name: e.target.value }) : setEditingEvent({ ...editingEvent, name: e.target.value })} />
            </Field>
            <Field label="Дата *">
            <CalendarField
              value={step === 'create' ? newEvent.eventDate : editingEvent.eventDate}
              onChange={(v) => step === 'create' ? setNewEvent({ ...newEvent, eventDate: v }) : setEditingEvent({ ...editingEvent, eventDate: v })} />
            </Field>
            <Field label="Описание">
            <textarea className="input" placeholder="Описание (необязательно)" rows={3} style={{ resize: 'none' }}
              value={step === 'create' ? newEvent.description : editingEvent.description}
              onChange={(e) => step === 'create' ? setNewEvent({ ...newEvent, description: e.target.value }) : setEditingEvent({ ...editingEvent, description: e.target.value })} />
            </Field>
            <Field label="Место проведения">
            <input className="input" placeholder="Аудитория, корпус..."
              value={step === 'create' ? newEvent.location : editingEvent.location}
              onChange={(e) => step === 'create' ? setNewEvent({ ...newEvent, location: e.target.value }) : setEditingEvent({ ...editingEvent, location: e.target.value })} />
            </Field>
            <Field label="Аудитория">
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { id: 'ALL', label: 'Все студенты' },
                { id: 'SS', label: 'Студсовет' },
              ].map(a => (
                <button key={a.id} onClick={() => step === 'create' ? setNewEvent({ ...newEvent, audience: a.id }) : setEditingEvent({ ...editingEvent, audience: a.id })}
                  style={{
                    flex: 1, padding: '8px', borderRadius: 8, border: 'none',
                    background: (step === 'create' ? newEvent.audience : editingEvent.audience) === a.id ? 'var(--accent)' : 'var(--bg-raised)',
                    color: (step === 'create' ? newEvent.audience : editingEvent.audience) === a.id ? 'white' : 'var(--text)',
                    fontWeight: 600, fontSize: 12, cursor: 'pointer',
                  }}>
                  {a.label}
                </button>
              ))}
            </div>
            </Field>
            {step === 'edit' && (
              <Field label="Организаторы мероприятия">
              <div className="scanner-picker">
                {councilStudents.map(s => {
                  const selected = editingEvent.organizerStudentIds.includes(s.id);
                  return (
                    <button key={`org-${s.id}`} type="button" className={`scanner-picker-option${selected ? ' selected' : ''}`}
                      onClick={() => {
                        const current = editingEvent.organizerStudentIds;
                        const next = selected ? current.filter(id => id !== s.id) : [...current, s.id];
                        setEditingEvent({ ...editingEvent, organizerStudentIds: next });
                      }}>
                      <span className="scanner-picker-check">{selected ? '✓' : ''}</span>
                      <span>{s.fullName}</span>
                    </button>
                  );
                })}
                <div className="scanner-picker-hint">Выберите студентов-организаторов</div>
              </div>
              </Field>
            )}
            <Field label="Баллы за посещение">
            <input className="input" type="number" min={0} placeholder="0"
              value={step === 'create' ? newEvent.pointsForAttendance || '' : editingEvent.pointsForAttendance || ''}
              onChange={(e) => {
                const v = parseInt(e.target.value) || 0;
                step === 'create' ? setNewEvent({ ...newEvent, pointsForAttendance: v }) : setEditingEvent({ ...editingEvent, pointsForAttendance: v });
              }} />
            </Field>
            {step === 'edit' && editingEvent.organizerStudentIds.length > 0 && (
              <Field label="Баллы за организацию">
              <input className="input" type="number" min={0} placeholder="0"
                value={editingEvent.pointsForOrganization || ''}
                onChange={(e) => {
                  const v = parseInt(e.target.value) || 0;
                  setEditingEvent({ ...editingEvent, pointsForOrganization: v });
                }} />
              </Field>
            )}
            <Field label="Макс. участников">
            <input className="input" type="number" min={0} placeholder="Без ограничений"
              value={step === 'create' ? newEvent.maxParticipants || '' : editingEvent.maxParticipants || ''}
              onChange={(e) => {
                const v = parseInt(e.target.value) || 0;
                step === 'create' ? setNewEvent({ ...newEvent, maxParticipants: v }) : setEditingEvent({ ...editingEvent, maxParticipants: v });
              }} />
            </Field>
            <Field label="Отмечающий на мероприятии">
            <div className="scanner-picker">
              <button type="button" className="scanner-picker-group" onClick={() => setShowCoordinatorScanners(!showCoordinatorScanners)}>Координаторы <span>{showCoordinatorScanners ? '▾' : '▸'}</span></button>
              {showCoordinatorScanners && coordinatorsList.map(c => {
                const selected = (step === 'create' ? newEvent.scannerCoordinatorIds : editingEvent.scannerCoordinatorIds).includes(c.id);
                return (
                  <button key={`coord-${c.id}`} type="button" className={`scanner-picker-option${selected ? ' selected' : ''}`}
                    onClick={() => {
                      const current = step === 'create' ? newEvent.scannerCoordinatorIds : editingEvent.scannerCoordinatorIds;
                      const next = selected ? current.filter(id => id !== c.id) : [...current, c.id];
                      step === 'create'
                        ? setNewEvent({ ...newEvent, scannerCoordinatorIds: next, scannerCoordinatorId: next[0] || 0 })
                        : setEditingEvent({ ...editingEvent, scannerCoordinatorIds: next, scannerCoordinatorId: next[0] || 0 });
                    }}>
                    <span className="scanner-picker-check">{selected ? '✓' : ''}</span>
                    <span>{c.fullName}</span>
                  </button>
                );
              })}
              <button type="button" className="scanner-picker-group" onClick={() => setShowStudentScanners(!showStudentScanners)}>Студенты <span>{showStudentScanners ? '▾' : '▸'}</span></button>
              {showStudentScanners && councilStudents.map(s => {
                const selected = (step === 'create' ? newEvent.studentScannerIds : editingEvent.studentScannerIds).includes(s.id);
                return (
                  <button key={`stud-${s.id}`} type="button" className={`scanner-picker-option${selected ? ' selected' : ''}`}
                    onClick={() => {
                      const current = step === 'create' ? newEvent.studentScannerIds : editingEvent.studentScannerIds;
                      const next = selected ? current.filter(id => id !== s.id) : [...current, s.id];
                      step === 'create'
                        ? setNewEvent({ ...newEvent, studentScannerIds: next })
                        : setEditingEvent({ ...editingEvent, studentScannerIds: next });
                    }}>
                    <span className="scanner-picker-check">{selected ? '✓' : ''}</span>
                    <span>{s.fullName}</span>
                  </button>
                );
              })}
              <div className="scanner-picker-hint">Выберите отмечающих — координаторов или студентов</div>
            </div>
            </Field>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {step === 'create' ? (
                <>
                   <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => createEvent('DRAFT')} disabled={submitting || !(newEvent.name && newEvent.eventDate)}>
                     {submitting ? '...' : 'Черновик'}
                   </button>
                   <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => createEvent('PUBLISHED')} disabled={submitting || !(newEvent.name && newEvent.eventDate)}>
                     {submitting ? '...' : 'Опубликовать'}
                   </button>
                </>
              ) : (
                <button className="btn btn-primary" disabled={submitting || !(editingEvent.name && editingEvent.eventDate)}
                  onClick={updateEvent}>
                  {submitting ? '...' : 'Сохранить'}
                </button>
              )}
            </div>
          </div>
        )}

        {step === 'detail' && selectedEvent && (
          <>
            <div className="card" style={{ marginBottom: 14, animation: 'fadeIn 0.25s ease both' }}>
              <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 4 }}>{selectedEvent.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>{fmtDate(selectedEvent.eventDate)} {(selectedEvent as any).location ? `· ${(selectedEvent as any).location}` : ''}</div>
              {selectedEvent.description && <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{selectedEvent.description}</div>}
              {(selectedEvent as any).pointsForAttendance ? <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 6, fontWeight: 600 }}>+{(selectedEvent as any).pointsForAttendance} баллов за посещение</div> : null}
              {(selectedEvent as any).maxParticipants ? <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Лимит: {selectedEvent.participants.length}/{(selectedEvent as any).maxParticipants}</div> : null}
              {(selectedEvent as any).scannerCoordinator && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  Отмечающий: <span style={{ fontWeight: 600 }}>{(selectedEvent as any).scannerCoordinator.fullName}</span>
                  {((selectedEvent as any).scannerCoordinator as any).telegramUsername && <span style={{ color: 'var(--accent)' }}> @{(selectedEvent as any).scannerCoordinator.telegramUsername}</span>}
                </div>
              )}
            </div>

            <div className="section-label" style={{ marginBottom: 10 }}>
              Участники ({attendedCount}/{selectedEvent.participants.length})
            </div>

            {selectedEvent.participants.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 14 }}>Нет участников</div>
            ) : (
              selectedEvent.participants.map((p, i) => (
                <div key={p.id} className="card" style={{ marginBottom: 8, padding: '10px 12px', animation: `fadeIn 0.2s ease ${i * 0.03}s both` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{p.fullName}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>гр. {p.groupNumber}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {selectedEvent.attendanceFinalized && !isAdmin ? (
                        <span style={{
                          background: p.attended ? 'var(--success-dim)' : 'var(--bg-raised)',
                          border: `1px solid ${p.attended ? 'var(--success)' : 'var(--border)'}`,
                          borderRadius: 20, padding: '4px 12px',
                          color: p.attended ? 'var(--success)' : 'var(--text-muted)',
                          fontSize: 11, fontWeight: 600, opacity: 0.8,
                        }}>
                          {p.attended ? '✓ Был' : '✗ Не явился'}
                        </span>
                      ) : (
                        <button onClick={() => toggleAttendance(p.id)}
                          style={{
                            background: p.attended ? 'var(--accent-dim)' : 'var(--bg-raised)',
                            border: `1px solid ${p.attended ? 'var(--accent)' : 'var(--border)'}`,
                            borderRadius: 20, padding: '4px 12px', cursor: 'pointer',
                            color: p.attended ? 'var(--accent)' : 'var(--text-muted)',
                            fontSize: 11, fontWeight: 600,
                          }}>
                          {p.attended ? '✓ Был' : '○ Не явился'}
                        </button>
                      )}
                      <button onClick={() => removeParticipant(p.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: 16, padding: 4 }}>×</button>
                    </div>
                  </div>
                </div>
              ))
            )}

            {(!selectedEvent.attendanceFinalized || isAdmin) && (isAdmin || selectedEvent.createdBy === coordinator.id) && (
              <button className="btn btn-ghost" onClick={async () => {
                if (!confirm('Завершить отметку? Неотмеченные участники будут считаться не явившимися.')) return;
                try {
                  await api.events.finalizeAttendance(selectedEvent.id, { coordinatorId: coordinator.id, role: coordinator.role });
                  const updated = await api.events.list();
                  setSelectedEvent(updated.find((e: any) => e.id === selectedEvent.id) || null);
                } catch (e: any) { alert(e.message); }
              }} style={{ marginTop: 6, color: 'var(--warning)', borderColor: 'var(--warning)', fontSize: 13, padding: '8px' }}>
                Завершить отметку
              </button>
            )}

            {attendedCount > 0 && (
              <div className="card" style={{ marginTop: 16, borderColor: 'var(--accent)', animation: 'fadeIn 0.25s ease both' }}>
                <div className="section-label">Сформировать докладную</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Будет включено {attendedCount} участн. (кто был на мероприятии)
                  </div>
                  <CalendarField placeholder="Дата освобождения" value={exemptionDate}
                    onChange={(v) => setExemptionDate(v)} />
                  <input className="input" placeholder="Причина (по умолчанию: название мероприятия)" value={exemptionReason}
                    onChange={(e) => setExemptionReason(e.target.value)} />
                </div>
                <button className="btn btn-primary" disabled={submitting} onClick={generateExemption}>
                  {submitting ? '...' : '✓ Сформировать докладную'}
                </button>
              </div>
            )}
          </>
        )}

        {step === 'add-participant' && selectedEvent && (
          <div style={{ paddingBottom: 16 }}>
            <input className="input" placeholder="Поиск по имени, группе или № студенческого…" value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ marginBottom: 10 }} />
            <div style={{ marginBottom: 6 }}>Студенческий совет:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {councilStudents
                .filter((s: any) => !selectedEvent.participants.some((p) => p.fullName === s.fullName))
                .filter((s: any) => s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || s.groupNumber?.includes(searchQuery) || s.studentCardNumber?.includes(searchQuery))
                .map((s: any, i: number) => {
                const checked = selectedStudentIds.has(s.id);
                return (
                  <label key={s.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer', marginBottom: 0, userSelect: 'none', animation: `fadeIn 0.2s ease ${i * 0.03}s both` }}
                    onClick={() => {
                      const next = new Set(selectedStudentIds);
                      next.has(s.id) ? next.delete(s.id) : next.add(s.id);
                      setSelectedStudentIds(next);
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
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{s.fullName}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>гр. {s.groupNumber}</div>
                    </div>
                  </label>
                );
              })}
              {councilStudents.filter((s: any) => !selectedEvent.participants.some((p) => p.fullName === s.fullName)).filter((s: any) => s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || s.groupNumber?.includes(searchQuery) || s.studentCardNumber?.includes(searchQuery)).length === 0 && (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>
                  {searchQuery ? 'Ничего не найдено' : 'Нет доступных участников из студсовета'}
                </div>
              )}
            </div>

            {externalParticipants.filter((p) => !selectedEvent.participants.some((ep) => ep.fullName === p.fullName)).length > 0 && (
              <>
                <div style={{ marginTop: 16, marginBottom: 6 }}>Ранее добавленные:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {externalParticipants.filter((p) => !selectedEvent.participants.some((ep) => ep.fullName === p.fullName)).map((p, rawIndex) => {
                    const idx = externalParticipants.indexOf(p);
                    const checked = selectedExternalIndices.has(idx);
                    return (
                      <label key={`ext-${idx}`} className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer', marginBottom: 0, userSelect: 'none', animation: `fadeIn 0.2s ease ${rawIndex * 0.03}s both` }}
                        onClick={() => {
                          const next = new Set(selectedExternalIndices);
                          next.has(idx) ? next.delete(idx) : next.add(idx);
                          setSelectedExternalIndices(next);
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
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 14 }}>{p.fullName}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>гр. {p.groupNumber}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {showManualModal && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'fadeIn 0.15s ease',
          }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowManualModal(false)} />
            <div className="card" style={{
              position: 'relative', zIndex: 1, width: '85%', maxWidth: 360,
              animation: 'scaleIn 0.2s ease',
              display: 'flex', flexDirection: 'column', gap: 10, padding: 20,
            }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Добавить участника</div>
              <div className="section-label">ФИО *</div>
              <input className="input" placeholder="ФИО участника" value={manualStudent.fullName}
                onChange={(e) => setManualStudent({ ...manualStudent, fullName: e.target.value })} />
              <div className="section-label">Номер группы *</div>
              <input className="input" placeholder="Номер группы" value={manualStudent.groupNumber}
                onChange={(e) => setManualStudent({ ...manualStudent, groupNumber: e.target.value })} />
              <button className="btn btn-primary" disabled={!manualStudent.fullName || !manualStudent.groupNumber} onClick={addManualParticipant} style={{ marginTop: 4 }}>
                Добавить
              </button>
              <button onClick={() => setShowManualModal(false)}
                style={{ width: '100%', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px', color: 'var(--text)', cursor: 'pointer', fontSize: 14, marginTop: 4 }}>
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>

      {step === 'detail' && (!selectedEvent?.attendanceFinalized || isAdmin) && (
        <div style={{ flexShrink: 0, padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg)', animation: 'fadeIn 0.2s ease both' }}>
          <button onClick={() => setStep('add-participant')} className="btn btn-primary" style={{ width: '100%', textAlign: 'center' }}>
            + Добавить участников
          </button>
        </div>
      )}

      {step === 'add-participant' && (
        <div style={{ flexShrink: 0, padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: 8, animation: 'fadeIn 0.2s ease both' }}>
          <button className="btn btn-primary" disabled={selectedStudentIds.size === 0 && selectedExternalIndices.size === 0}
            onClick={async () => {
              if (selectedStudentIds.size > 0) await addSelectedParticipants();
              if (selectedExternalIndices.size > 0) await addSelectedExternal();
            }} style={{ width: '100%', textAlign: 'center' }}>
            Добавить выбранных ({selectedStudentIds.size + selectedExternalIndices.size})
          </button>
          <button onClick={() => setShowManualModal(true)}
            style={{ width: '100%', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px', color: 'var(--text)', cursor: 'pointer', fontSize: 14 }}>
            + Добавить не из СС
          </button>
        </div>
      )}
    </div>
  );
}
