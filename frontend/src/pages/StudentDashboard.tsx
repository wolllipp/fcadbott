import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../utils/api';
import { useMascotToast } from '../components/MascotToast';
import { IconCheck, IconX, IconQrCode, IconAward, IconCamera } from '../components/Icons';
import ScannerPage from './ScannerPage';
import { Coordinator } from '../App';

interface StudentInfo {
  id: number;
  fullName: string;
  groupNumber: string;
  studentCardNumber: string;
  budgetStatus?: string;
}

interface EventData {
  id: number;
  name: string;
  eventDate: string;
  description: string | null;
  location?: string | null;
  attendanceFinalized?: boolean;
  pointsForAttendance?: number;
  status?: string;
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

interface ApplicationData {
  id: number;
  eventId: number;
  participationType: string;
  status: string;
  studentComment: string | null;
  createdAt: string;
  event: { id: number; name: string; eventDate: string; location: string | null; pointsForAttendance: number };
}

interface PointData {
  id: number;
  points: number;
  type: string;
  reason: string;
  createdAt: string;
  event: { id: number; name: string } | null;
  author: { fullName: string } | null;
}

interface BalanceData {
  balance: number;
  byType: Record<string, number>;
  totalTransactions: number;
}

type Tab = 'events' | 'exemptions' | 'activity' | 'petitions' | 'scanner';

const PETITION_TYPES = ['DISCOUNT', 'DORMITORY', 'SPECIALIZATION'] as const;

const PETITION_LABELS: Record<string, string> = {
  DISCOUNT: 'на скидку',
  DORMITORY: 'на общежитие',
  SPECIALIZATION: 'на профилизацию',
};

const TYPE_LABELS: Record<string, string> = {
  VISITOR: 'Посетитель',
  PARTICIPANT: 'Участник',
  ORGANIZER: 'Организатор',
};

const APP_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'На рассмотрении', color: 'var(--warning)', bg: 'var(--warning-dim)' },
  APPROVED: { label: 'Одобрена', color: 'var(--success)', bg: 'var(--success-dim)' },
  REJECTED: { label: 'Отклонена', color: 'var(--error)', bg: 'var(--error-dim)' },
  CANCELLED: { label: 'Отменена', color: 'var(--text-muted)', bg: 'var(--surface)' },
  AWAITING_MARK: { label: 'Ожидает отметки', color: 'var(--accent)', bg: 'var(--accent-dim)' },
  ATTENDANCE_CONFIRMED: { label: 'Посещено', color: 'var(--success)', bg: 'var(--success-dim)' },
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

export default function StudentDashboard({ student, onLogout }: { student: StudentInfo; onLogout: () => void }) {
  const { showToast } = useMascotToast();
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

  const [applications, setApplications] = useState<ApplicationData[]>([]);
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [pointsHistory, setPointsHistory] = useState<PointData[]>([]);
  const [activityTab, setActivityTab] = useState<'applications' | 'points' | 'upcoming'>('applications');
  const [qrModalAppId, setQrModalAppId] = useState<number | null>(null);
  const [qrData, setQrData] = useState<any>(null);
  const [loadingQr, setLoadingQr] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const results = await Promise.allSettled([
          api.events.list(),
          api.exemptions.byStudent({ fullName: student.fullName }),
          api.petitions.list({ studentId: student.id }).catch(() => []),
          api.applications.list({ studentId: student.id }).catch(() => []),
          api.points.balance(student.id).catch(() => null),
          api.points.list({ studentId: student.id }).catch(() => []),
        ]);
        const get = (i: number, fallback: any) => {
          const r = results[i];
          return r.status === 'fulfilled' ? r.value : fallback;
        };
        setEvents(get(0, []));
        setExemptions(get(1, []));
        setPetitions(get(2, []));
        setApplications(get(3, []));
        setBalance(get(4, null));
        setPointsHistory(get(5, []));
        const evts = get(0, []) as EventData[];
        const registered = evts.filter((e: EventData) =>
          e.participants.some((p: any) => p.fullName === student.fullName && p.groupNumber === student.groupNumber)
        );
        setMyEventIds(new Set(registered.map((e: EventData) => e.id)));
      } catch (_) {}
      setLoading(false);
    }
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  async function registerForEvent(eventId: number) {
    setRegistering(eventId);
    try {
      await api.applications.create({
        eventId,
        studentId: student.id,
        participationType: 'VISITOR',
      });
      const apps = await api.applications.list({ studentId: student.id }).catch(() => []);
      setApplications(apps);
      showToast('Ты отправил заявку! Дождись подтверждения координатора.', 'info');
    } catch (e: any) { alert(e.message); }
    setRegistering(null);
  }

  async function cancelApplication(appId: number) {
    try {
      await api.applications.cancel(appId);
      const apps = await api.applications.list({ studentId: student.id }).catch(() => []);
      setApplications(apps);
      showToast('Заявка отменена', 'info');
    } catch (e: any) { alert(e.message); }
  }

  async function openQrModal(appId: number) {
    setQrModalAppId(appId);
    setLoadingQr(true);
    try {
      const data = await api.attendance.getQr(appId);
      setQrData(data);
    } catch (e: any) { alert(e.message); }
    setLoadingQr(false);
  }

  async function submitPetition() {
    if (selectedPetitionTypes.size === 0) return;
    setSubmittingPetition(true);
    try {
      for (const type of selectedPetitionTypes) {
        await api.petitions.create({ studentId: student.id, type });
      }
      setShowPetitionModal(false);
      setSelectedPetitionTypes(new Set());
      const pets = await api.petitions.list({ studentId: student.id }).catch(() => []);
      setPetitions(pets);
      const bal = await api.points.balance(student.id).catch(() => null);
      setBalance(bal);
      showToast('Ходатайство отправлено на рассмотрение!', 'success');
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

  const activeApplications = applications.filter((a) => ['PENDING', 'APPROVED', 'AWAITING_MARK'].includes(a.status));
  const checkedInApplications = applications.filter((a) => a.status === 'ATTENDANCE_CONFIRMED');
  const organizerEvents = events.filter((e) => ((e as any).organizerAssignments || []).some((a: any) => a.student?.id === student.id) && (e as any).status !== 'COMPLETED' && (e as any).status !== 'CANCELLED');
  const isScanner = events.some((e) => {
    if ((e as any).status === 'COMPLETED' || (e as any).status === 'CANCELLED') return false;
    return ((e as any).studentScannerAssignments || []).some((a: any) => a.student?.id === student.id);
  });
  const applicationEvents = events.filter((e) => {
    const app = activeApplications.find((a) => a.eventId === e.id);
    return app && (e as any).status !== 'DRAFT' && !organizerEvents.some((organizerEvent) => organizerEvent.id === e.id);
  });
  const upcomingEvents = events.filter((e) => {
    if ((e as any).status === 'DRAFT') return false;
    if (new Date(e.eventDate) < new Date(new Date().setHours(0, 0, 0, 0))) return false;
    if (!myEventIds.has(e.id)) return false;
    if ((e as any).attendanceFinalized) return false;
    if (activeApplications.some((a) => a.eventId === e.id) || organizerEvents.some((organizerEvent) => organizerEvent.id === e.id)) return false;
    return true;
  });
  const availableEvents = events.filter((e) => {
    if ((e as any).status === 'DRAFT') return false;
    if (new Date(e.eventDate) < new Date(new Date().setHours(0, 0, 0, 0))) return false;
    if (myEventIds.has(e.id)) return false;
    if ((e as any).attendanceFinalized) return false;
    if (activeApplications.some((a) => a.eventId === e.id)) return false;
    return true;
  });

  const hasActivePetition = petitions.some((p) => p.status === 'PENDING');
  const submittedPetitionTypes = new Set(petitions.map((p) => p.type));
  const availablePetitionTypes = PETITION_TYPES.filter((type) => type !== 'DISCOUNT' || student.budgetStatus !== 'BUDGET').filter((type) => !submittedPetitionTypes.has(type));

  const myApps = applications.filter(a => a.status !== 'CANCELLED');
  const pendingApps = myApps.filter(a => a.status === 'PENDING');
  const approvedApps = myApps.filter(a => a.status === 'APPROVED');

  const upcomingWithApps = events.filter(e => {
    const app = applications.find(a => a.eventId === e.id && a.status === 'APPROVED');
    return app && new Date(e.eventDate) >= new Date(new Date().setHours(0, 0, 0, 0));
  });

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'var(--accent-dim)', border: '2px solid var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700, color: 'var(--accent)', flexShrink: 0,
            overflow: 'hidden', position: 'relative',
          }}>
            <span>{student.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}</span>
            {((student as any).photoUrl || (student as any).chatId) && (
              <img
                src={(student as any).photoUrl || `/api/auth/avatar/${(student as any).chatId}`}
                alt=""
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Студент</div>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>{student.fullName}</h1>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>гр. {student.groupNumber}</div>
          </div>
        </div>
        <div title={`Баллы: ${balance?.balance || 0}`} style={{ width: 46, height: 46, borderRadius: '50%', background: `conic-gradient(var(--accent) ${Math.min(100, balance?.balance || 0)}%, var(--bg-raised) 0)`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-card)', display: 'grid', placeItems: 'center', color: 'var(--accent)', fontSize: 11, fontWeight: 700 }}>
            {balance?.balance || 0}
          </div>
        </div>
      </div>

      <div className="tab-row" style={{ padding: '16px 16px 0' }}>
        {([
          { id: 'events' as Tab, label: 'Мероприятия' },
          { id: 'exemptions' as Tab, label: 'Освобождения' },
          { id: 'activity' as Tab, label: 'Активность' },
          { id: 'petitions' as Tab, label: 'Ходатайства' },
          ...(isScanner ? [{ id: 'scanner' as Tab, label: 'Сканер' }] : []),
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding: '10px 14px', borderRadius: 8, border: 'none',
              background: tab === t.id ? 'var(--accent)' : 'var(--bg-raised)',
              color: tab === t.id ? 'white' : 'var(--text)',
              fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <div key={tab} className="page-scroll page-anim" style={{ padding: '0 16px', marginTop: 12 }}>
        {tab === 'events' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {availableEvents.length > 0 && (
              <>
                <div className="section-label">Доступные для записи</div>
                {availableEvents.map((ev) => (
                  <div key={ev.id} className="card" style={{ animation: 'fadeIn 0.2s ease both' } as React.CSSProperties}>
                    <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{ev.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{fmtDate(ev.eventDate)} {ev.location ? `· ${ev.location}` : ''}</div>
                    {ev.description && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>{ev.description}</div>}
                    {ev.pointsForAttendance ? <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 6 }}>+{ev.pointsForAttendance} баллов</div> : null}
                    {(ev as any).scannerCoordinator && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                        Отмечающий: {(ev as any).scannerCoordinator.telegramUsername
                          ? <a href={`https://t.me/${encodeURIComponent((ev as any).scannerCoordinator.telegramUsername)}`} target="_blank" rel="noopener" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>@{(ev as any).scannerCoordinator.telegramUsername}</a>
                          : <span style={{ fontWeight: 600 }}>{(ev as any).scannerCoordinator.fullName}</span>}
                      </div>
                    )}
                    <button className="btn btn-primary" disabled={registering === ev.id}
                      onClick={() => registerForEvent(ev.id)}
                      style={{ padding: '10px', fontSize: 13 }}>
                      {registering === ev.id ? '...' : '+ Записаться'}
                    </button>
                  </div>
                ))}
              </>
            )}

            {organizerEvents.length > 0 && (
              <>
                <div className="section-label" style={{ marginTop: availableEvents.length > 0 ? 16 : 0 }}>Организация</div>
                {organizerEvents.map((ev) => (
                  <div key={ev.id} className="card" style={{ animation: 'fadeIn 0.2s ease both', borderColor: 'var(--accent)' }}>
                    <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{ev.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{fmtDate(ev.eventDate)} {ev.location ? `· ${ev.location}` : ''}</div>
                    <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 700 }}>🎯 Вы организуете</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Баллы за организацию: +{(ev as any).pointsForOrganization || 0}</div>
                  </div>
                ))}
              </>
            )}

            {applicationEvents.length > 0 && (
              <>
                <div className="section-label" style={{ marginTop: availableEvents.length > 0 ? 16 : 0 }}>Мои заявки</div>
                {applicationEvents.map((ev) => {
                  const app = activeApplications.find((a) => a.eventId === ev.id)!;
                  const approved = ['APPROVED', 'AWAITING_MARK'].includes(app.status);
                  return (
                    <div key={ev.id} className="card" style={{ animation: 'fadeIn 0.2s ease both', borderColor: approved ? 'var(--success-dim)' : 'var(--warning-dim)' }}>
                      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{ev.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{fmtDate(ev.eventDate)} {ev.location ? `· ${ev.location}` : ''}</div>
                      <button className="btn btn-ghost" disabled style={{ padding: '10px', fontSize: 13, color: approved ? 'var(--success)' : 'var(--warning)', borderColor: approved ? 'var(--success)' : 'var(--warning)' }}>
                        {approved ? '✓ Вы записаны' : '⏳ Заявка подана — ждите подтверждения'}
                      </button>
                    </div>
                  );
                })}
              </>
            )}

            {upcomingEvents.length > 0 && (
              <>
                <div className="section-label" style={{ marginTop: availableEvents.length > 0 ? 16 : 0 }}>Предстоящие</div>
                {upcomingEvents.map((ev) => (
                  <div key={ev.id} className="card" style={{ animation: 'fadeIn 0.2s ease both' } as React.CSSProperties}>
                    <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{ev.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{fmtDate(ev.eventDate)} {ev.location ? `· ${ev.location}` : ''}</div>
                    {ev.description && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>{ev.description}</div>}
                    <div style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>
                      ✓ Вы записаны
                    </div>
                    {(ev as any).scannerCoordinator && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                        Отмечающий: {(ev as any).scannerCoordinator.telegramUsername
                          ? <a href={`https://t.me/${encodeURIComponent((ev as any).scannerCoordinator.telegramUsername)}`} target="_blank" rel="noopener" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>@{(ev as any).scannerCoordinator.telegramUsername}</a>
                          : <span style={{ fontWeight: 600 }}>{(ev as any).scannerCoordinator.fullName}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}

            {availableEvents.length === 0 && organizerEvents.length === 0 && applicationEvents.length === 0 && upcomingEvents.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                <div style={{ fontSize: 32, marginBottom: 12, color: 'var(--text-muted)' }}><IconAward size={32} /></div>
                Нет мероприятий
              </div>
            )}

          </div>
        )}

        {tab === 'exemptions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {exemptions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                <div style={{ fontSize: 32, marginBottom: 12, color: 'var(--text-muted)' }}><IconAward size={32} /></div>
                Нет освобождений
              </div>
            ) : (
              exemptions.map((ex) => {
                const otherStudents = ex.students.filter((es: any) =>
                  (es.student?.fullName || es.externalName) !== student.fullName
                );
                return (
                  <div key={ex.id} className="card" style={{ borderColor: ex.isExhibited ? 'var(--success-dim)' : (ex.status === 'APPROVED' ? 'var(--accent-dim)' : 'var(--warning-dim)') }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{ex.reason}</div>
                      <span className="badge" style={{
                        background: ex.isExhibited ? 'var(--success-dim)' : (ex.status === 'APPROVED' ? 'var(--accent-dim)' : 'var(--warning-dim)'),
                        color: ex.isExhibited ? 'var(--success)' : (ex.status === 'APPROVED' ? 'var(--accent)' : 'var(--warning)'),
                      }}>
                        {ex.isExhibited ? 'Выставлено' : ex.status === 'APPROVED' ? 'Подтверждено' : 'На рассмотрении'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                      {fmtDate(ex.exemptionDate)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                      Выставил(а): {ex.coordinator.fullName}
                    </div>
                    {otherStudents.length > 0 && (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>
                        Вместе с вами ({otherStudents.length}):
                      </div>
                    )}
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

        {tab === 'activity' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {balance && (
              <div className="card" style={{ textAlign: 'center', padding: '20px 16px', borderColor: balance.balance >= 100 ? 'var(--success)' : 'var(--accent-dim)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Мой баланс</div>
                <div style={{ fontSize: 42, fontWeight: 700, color: balance.balance >= 100 ? 'var(--success)' : 'var(--accent)', lineHeight: 1 }}>
                  {balance.balance}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>
                  из 100 баллов · {balance.totalTransactions} начислений
                </div>
                <div style={{ marginTop: 12, background: 'var(--bg-raised)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 6,
                    width: `${Math.min(100, (balance.balance / 100) * 100)}%`,
                    background: balance.balance >= 100 ? 'var(--success)' : 'var(--accent)',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
                {balance.balance >= 100 && (
                  <div style={{ marginTop: 10, fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>
                    Вы можете подать ходатайство!
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 6 }}>
              {([
                { id: 'applications' as const, label: `Заявки (${myApps.length})` },
                { id: 'points' as const, label: 'Баллы' },
                { id: 'upcoming' as const, label: `Ближайшие (${upcomingWithApps.length})` },
              ]).map(t => (
                <button key={t.id} onClick={() => setActivityTab(t.id)} style={{
                  flex: 1, padding: '7px', borderRadius: 8, border: 'none',
                  background: activityTab === t.id ? 'var(--accent)' : 'var(--bg-raised)',
                  color: activityTab === t.id ? 'white' : 'var(--text)',
                  fontWeight: 600, fontSize: 11, cursor: 'pointer',
                }}>
                  {t.label}
                </button>
              ))}
            </div>

            {activityTab === 'applications' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {myApps.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                    Нет заявок
                  </div>
                ) : (
                  myApps.map((app, i) => {
                    const st = APP_STATUS[app.status] || APP_STATUS.PENDING;
                    return (
                      <div key={app.id} className="card" style={{ padding: '12px', animation: `fadeIn 0.2s ease ${i * 0.03}s both` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{app.event.name}</div>
                          <span className="badge" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {fmtDate(app.event.eventDate)} · {TYPE_LABELS[app.participationType] || app.participationType}
                          {app.event.pointsForAttendance ? ` · +${app.event.pointsForAttendance} б.` : ''}
                        </div>
                        {app.status === 'PENDING' && (
                          <button onClick={() => cancelApplication(app.id)}
                            style={{ marginTop: 8, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--error)', background: 'transparent', color: 'var(--error)', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                            Отменить заявку
                          </button>
                        )}
                        {app.status === 'APPROVED' && (
                          <button onClick={() => openQrModal(app.id)}
                            style={{ marginTop: 8, padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'white', fontSize: 12, cursor: 'pointer', fontWeight: 600, width: '100%' }}>
                            <IconQrCode size={14} /> Показать QR-код
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activityTab === 'points' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pointsHistory.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                    Пока нет начислений
                  </div>
                ) : (
                  pointsHistory.map((pt, i) => (
                    <div key={pt.id} className="card" style={{ padding: '12px', animation: `fadeIn 0.2s ease ${i * 0.03}s both` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{pt.reason}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                            {POINT_TYPE_LABELS[pt.type] || pt.type}
                            {pt.event ? ` · ${pt.event.name}` : ''}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{fmtDateTime(pt.createdAt)}</div>
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: pt.type === 'ATTENDANCE' ? 'var(--success)' : 'var(--accent)' }}>
                          +{pt.points}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activityTab === 'upcoming' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {upcomingWithApps.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                    Нет предстоящих мероприятий
                  </div>
                ) : (
                  upcomingWithApps.map((ev, i) => (
                    <div key={ev.id} className="card" style={{ padding: '12px', animation: `fadeIn 0.2s ease ${i * 0.03}s both` }}>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{ev.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {fmtDate(ev.eventDate)} {ev.location ? `· ${ev.location}` : ''}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 4, fontWeight: 500 }}>
                        +{ev.pointsForAttendance || 0} баллов за посещение
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'petitions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {balance && (
              <div className="card" style={{ textAlign: 'center', padding: '16px', borderColor: balance.balance >= 100 ? 'var(--success)' : 'var(--accent-dim)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 4 }}>Баланс</div>
                <div style={{ fontSize: 36, fontWeight: 700, color: balance.balance >= 100 ? 'var(--success)' : 'var(--accent)' }}>
                  {balance.balance}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>из 100 баллов для ходатайства</div>
                <div style={{ marginTop: 10, background: 'var(--bg-raised)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 6,
                    width: `${Math.min(100, (balance.balance / 100) * 100)}%`,
                    background: balance.balance >= 100 ? 'var(--success)' : 'var(--accent)',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>
            )}

            {balance && balance.balance >= 100 && availablePetitionTypes.length > 0 && (
              <button className="btn btn-primary" onClick={() => setShowPetitionModal(true)} style={{ background: 'var(--success)' }}>
                Подать ходатайство
              </button>
            )}

            {hasActivePetition && availablePetitionTypes.length === 0 && (
              <div style={{ textAlign: 'center', padding: 16, color: 'var(--warning)', fontSize: 14, fontWeight: 600 }}>
                Ходатайство на рассмотрении
              </div>
            )}

            {petitions.length > 0 && (
              <>
                <div className="section-label" style={{ marginTop: 8 }}>Мои ходатайства</div>
                {petitions.map((p, i) => (
                  <div key={p.id} className="card" style={{
                    marginBottom: 8,
                    borderColor: p.status === 'APPROVED' ? 'var(--success-dim)' : p.status === 'REJECTED' ? 'var(--error-dim)' : 'var(--warning-dim)',
                    animation: `fadeIn 0.2s ease ${i * 0.03}s both`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>Ходатайство {PETITION_LABELS[p.type]}</div>
                      <span className="badge" style={{
                        background: p.status === 'APPROVED' ? 'var(--success-dim)' : p.status === 'REJECTED' ? 'var(--error-dim)' : 'var(--warning-dim)',
                        color: p.status === 'APPROVED' ? 'var(--success)' : p.status === 'REJECTED' ? 'var(--error)' : 'var(--warning)',
                        fontSize: 11,
                      }}>
                        {p.status === 'APPROVED' ? 'Одобрено' : p.status === 'REJECTED' ? 'Отклонено' : 'На рассмотрении'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(p.createdAt)}</div>
                    {p.status === 'APPROVED' && (
                      <button className="btn btn-ghost" onClick={() => {
                        const a = document.createElement('a');
                        a.href = api.petitions.downloadUrl(p.id);
                        a.download = 'Ходатайство.docx';
                        a.click();
                      }} style={{ marginTop: 8, padding: '8px', fontSize: 13, color: 'var(--accent)', borderColor: 'var(--accent)' }}>
                        Скачать .docx
                      </button>
                    )}
                  </div>
                ))}
              </>
            )}

            {petitions.length === 0 && (!balance || balance.balance < 100) && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                <div style={{ fontSize: 32, marginBottom: 12, color: 'var(--text-muted)' }}><IconAward size={32} /></div>
                Наберите 100 баллов для подачи ходатайства
              </div>
            )}
          </div>
        )}

        {tab === 'scanner' && isScanner && (
          <ScannerPage coordinator={{ id: student.id, fullName: student.fullName, telegramUsername: '', role: 'COORDINATOR', sector: null } as Coordinator} />
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
              Ваш баланс: {balance?.balance || 0} баллов. Выберите тип ходатайства:
            </div>
            {PETITION_TYPES.map((t) => {
              const checked = selectedPetitionTypes.has(t);
              const unavailableForBudget = t === 'DISCOUNT' && student.budgetStatus === 'BUDGET';
              const alreadySubmitted = submittedPetitionTypes.has(t);
              const disabled = unavailableForBudget || alreadySubmitted;
              return (
                <div key={t} className="card" style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '12px',
                  cursor: 'pointer',
                  borderColor: checked ? 'var(--accent)' : 'var(--border)',
                  background: disabled ? 'var(--bg-raised)' : checked ? 'var(--accent-dim)' : 'var(--bg-card)',
                  opacity: disabled ? 0.55 : 1,
                }} onClick={() => {
                  if (disabled) return;
                  const next = new Set<string>();
                  if (!checked) {
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
                  <span style={{ fontWeight: 500, fontSize: 14 }}>Ходатайство {PETITION_LABELS[t]}{unavailableForBudget ? ' · бюджет недоступен' : alreadySubmitted ? ' · уже подавали' : ''}</span>
                </div>
              );
            })}
            <button className="btn btn-primary" disabled={selectedPetitionTypes.size === 0 || availablePetitionTypes.length === 0 || submittingPetition}
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

      {qrModalAppId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => { setQrModalAppId(null); setQrData(null); }} />
          <div className="card" style={{
            position: 'relative', zIndex: 1, width: '85%', maxWidth: 340,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 24,
          }}>
            {loadingQr ? (
              <div style={{ padding: '40px 0', color: 'var(--text-muted)' }}>Загрузка...</div>
            ) : qrData ? (
              <>
                <div style={{ fontWeight: 700, fontSize: 16, textAlign: 'center' }}>{qrData.eventName}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {new Date(qrData.eventDate).toLocaleDateString('ru-RU')} {qrData.location ? `· ${qrData.location}` : ''}
                </div>
                <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>+{qrData.points} баллов</div>
                <div style={{ background: 'white', padding: 16, borderRadius: 12 }}>
                  <QRCodeSVG value={qrData.qrToken} size={200} level="M" />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                  {qrData.qrToken}
                </div>
                <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                  <span className={`badge ${qrData.checkedIn ? 'badge-green' : 'badge-gray'}`} style={{ flex: 1, justifyContent: 'center', padding: '6px' }}>
                    {qrData.checkedIn ? `✓ Вход ${qrData.checkInTime ? new Date(qrData.checkInTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : ''}` : '○ Вход не отмечен'}
                  </span>
                  <span className={`badge ${qrData.checkedOut ? 'badge-green' : 'badge-gray'}`} style={{ flex: 1, justifyContent: 'center', padding: '6px' }}>
                    {qrData.checkedOut ? `✓ Выход` : '○ Выход не отмечен'}
                  </span>
                </div>
                <button onClick={() => { setQrModalAppId(null); setQrData(null); }}
                  style={{ width: '100%', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px', color: 'var(--text)', cursor: 'pointer', fontSize: 14 }}>
                  Закрыть
                </button>
              </>
            ) : (
              <div style={{ padding: '20px 0', color: 'var(--error)' }}>Ошибка загрузки</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
