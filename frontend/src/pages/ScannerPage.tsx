import React, { useState, useEffect, useRef } from 'react';
import { Coordinator } from '../App';
import { api } from '../utils/api';
import { Html5Qrcode } from 'html5-qrcode';

interface Attendee {
  applicationId: number;
  student: { id: number; fullName: string; groupNumber: string };
  participationType: string;
  checkedIn: boolean;
  checkedOut: boolean;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string;
}

interface ScanResult {
  success: boolean;
  type: string;
  message: string;
  student?: { fullName: string; groupNumber: string };
  event?: { name: string };
  pointsAwarded?: number;
}

interface EventOption {
  id: number;
  name: string;
  eventDate: string;
  status: string;
}

export default function ScannerPage({ coordinator }: { coordinator: Coordinator }) {
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null);
  const [mode, setMode] = useState<'scan' | 'attendees' | 'manual'>('scan');
  const [checkType, setCheckType] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');
  const [manualQuery, setManualQuery] = useState('');
  const [manualResults, setManualResults] = useState<any[]>([]);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [attendeesStats, setAttendeesStats] = useState({ checkedIn: 0, checkedOut: 0, total: 0 });
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [nativeScan, setNativeScan] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    api.events.list().then((data: any[]) => {
      const active = data.filter((e: any) => {
        if (e.status === 'CANCELLED') return false;
        const isAdmin = ['CHAIRMAN', 'DEAN', 'DEPUTY', 'SECRETARY'].includes(coordinator.role);
        if (isAdmin) return true;
        return e.createdBy === coordinator.id || (e.scannerCoordinator && e.scannerCoordinator.id === coordinator.id);
      });
      setEvents(active);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedEvent) loadAttendees();
  }, [selectedEvent]);

  async function loadAttendees() {
    if (!selectedEvent) return;
    try {
      const data = await api.attendance.eventAttendees(selectedEvent);
      setAttendees(data.attendees);
      setAttendeesStats({ checkedIn: data.checkedIn, checkedOut: data.checkedOut, total: data.total });
    } catch (_) {}
  }

  async function handleScan() {
    if (!scanInput.trim()) return;
    setProcessing(true);
    setScanResult(null);
    try {
      const result = await api.attendance.scan({
        qrToken: scanInput.trim(),
        coordinatorId: coordinator.id,
        type: checkType,
      });
      setScanResult(result);
      setScanInput('');
      loadAttendees();
    } catch (e: any) {
      try {
        const err = JSON.parse(e.message);
        setScanResult({ success: false, type: checkType, message: err.error || e.message, student: err.student, event: err.event });
      } catch {
        setScanResult({ success: false, type: checkType, message: e.message });
      }
    }
    setProcessing(false);
    inputRef.current?.focus();
  }

  async function startCamera() {
    const tg = (window as any).Telegram?.WebApp;
    if (tg && typeof tg.showScanQrPopup === 'function') {
      setCameraActive(true);
      setNativeScan(true);
      tg.showScanQrPopup(
        { text: 'Поднесите QR-код к камере' },
        (text: string | null) => {
          setCameraActive(false);
          setNativeScan(false);
          if (text) {
            setScanInput(text);
          }
        }
      );
      return;
    }

    setCameraActive(true);
    setNativeScan(false);
    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          setScanInput(decodedText);
          setCameraActive(false);
          try { await scanner.stop(); } catch (_) {}
          scannerRef.current = null;
        },
        () => {}
      );
    } catch (e: any) {
      console.error('Camera error:', e);
      setCameraActive(false);
      alert('Не удалось открыть камеру. Проверьте разрешения.');
    }
  }

  async function stopCamera() {
    const tg = (window as any).Telegram?.WebApp;
    if (tg && typeof tg.closeScanQrPopup === 'function') {
      try { tg.closeScanQrPopup(); } catch (_) {}
    }
    setCameraActive(false);
    setNativeScan(false);
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch (_) {}
      scannerRef.current = null;
    }
  }

  useEffect(() => {
    return () => { if (scannerRef.current) { try { scannerRef.current.stop(); } catch (_) {} } };
  }, []);

  async function handleManualSearch() {
    if (!manualQuery.trim() || !selectedEvent) return;
    try {
      const apps = await api.applications.list({ eventId: selectedEvent, status: 'APPROVED' });
      const q = manualQuery.toLowerCase();
      const filtered = apps.filter((a: any) =>
        a.student.fullName.toLowerCase().includes(q) || a.student.groupNumber.includes(q)
      );
      setManualResults(filtered);
    } catch (_) {}
  }

  async function handleManualCheck(applicationId: number) {
    setProcessing(true);
    try {
      await api.attendance.manualCheck({ applicationId, coordinatorId: coordinator.id, type: checkType });
      setScanResult({ success: true, type: checkType, message: 'Отметка проставлена' });
      loadAttendees();
    } catch (e: any) {
      try {
        const err = JSON.parse(e.message);
        setScanResult({ success: false, type: checkType, message: err.error || e.message });
      } catch {
        setScanResult({ success: false, type: checkType, message: e.message });
      }
    }
    setProcessing(false);
  }

  function fmtTime(d: string | null) {
    if (!d) return '—';
    const dt = new Date(d);
    return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
  }

  const event = events.find(e => e.id === selectedEvent);

  if (!selectedEvent) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px 16px 0' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Сканер</h1>
          <div className="section-label">Выберите мероприятие</div>
        </div>
        <div className="page-scroll" style={{ padding: '12px 16px' }}>
          {events.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>Нет мероприятий</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {events.map(ev => (
                <div key={ev.id} className="card" style={{ cursor: 'pointer' }} onClick={() => setSelectedEvent(ev.id)}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{ev.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    {new Date(ev.eventDate).toLocaleDateString('ru-RU')} · {ev.status}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px 16px 0' }}>
        <button onClick={() => { setSelectedEvent(null); setScanResult(null); setMode('scan'); }}
          style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 12px', color: 'var(--text)', cursor: 'pointer', fontSize: 14, marginBottom: 12 }}>
          ← Назад
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{event?.name}</h1>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {([
            { id: 'scan' as const, label: 'Сканировать' },
            { id: 'attendees' as const, label: `Участники (${attendeesStats.total})` },
            { id: 'manual' as const, label: 'Поиск' },
          ]).map(m => (
            <button key={m.id} onClick={() => { setMode(m.id); setScanResult(null); }}
              style={{
                flex: 1, padding: '8px', borderRadius: 8, border: 'none',
                background: mode === m.id ? 'var(--accent)' : 'var(--bg-raised)',
                color: mode === m.id ? 'white' : 'var(--text)',
                fontWeight: 600, fontSize: 12, cursor: 'pointer',
              }}>
              {m.label}
            </button>
          ))}
        </div>
        {mode !== 'attendees' && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <button onClick={() => setCheckType('CHECK_IN')}
              style={{
                flex: 1, padding: '7px', borderRadius: 8, border: 'none',
                background: checkType === 'CHECK_IN' ? 'var(--success)' : 'var(--bg-raised)',
                color: checkType === 'CHECK_IN' ? 'white' : 'var(--text)',
                fontWeight: 600, fontSize: 12, cursor: 'pointer',
              }}>
              Вход
            </button>
            <button onClick={() => setCheckType('CHECK_OUT')}
              style={{
                flex: 1, padding: '7px', borderRadius: 8, border: 'none',
                background: checkType === 'CHECK_OUT' ? 'var(--warning)' : 'var(--bg-raised)',
                color: checkType === 'CHECK_OUT' ? 'white' : 'var(--text)',
                fontWeight: 600, fontSize: 12, cursor: 'pointer',
              }}>
              Выход
            </button>
          </div>
        )}
      </div>

      <div className="page-scroll" style={{ padding: '12px 16px' }}>
        {scanResult && (
          <div className="card" style={{
            marginBottom: 10, padding: '14px',
            borderColor: scanResult.success ? 'var(--success)' : 'var(--error)',
            background: scanResult.success ? 'var(--success-dim)' : 'var(--error-dim)',
            animation: 'fadeIn 0.2s ease',
          }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: scanResult.success ? 'var(--success)' : 'var(--error)', marginBottom: 4 }}>
              {scanResult.success ? '✓ Успешно' : '✗ Ошибка'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{scanResult.message}</div>
            {scanResult.student && (
              <div style={{ fontSize: 13, marginTop: 4 }}>{scanResult.student.fullName} · гр. {scanResult.student.groupNumber}</div>
            )}
            {scanResult.pointsAwarded != null && scanResult.pointsAwarded > 0 && (
              <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, marginTop: 4 }}>+{scanResult.pointsAwarded} баллов</div>
            )}
          </div>
        )}

        {mode === 'scan' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
              {cameraActive ? (
                <div>
                  {nativeScan ? (
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>
                      Сканирование через камеру Telegram… Наведите на QR-код.
                    </div>
                  ) : (
                    <div id="qr-reader" style={{ width: '100%', maxWidth: 300, margin: '0 auto' }} />
                  )}
                  <button className="btn btn-ghost" onClick={stopCamera} style={{ marginTop: 10 }}>
                    Остановить камеру
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>
                    Отсканируйте QR-код или вставьте токен вручную
                  </div>
                  <button className="btn btn-primary" onClick={startCamera} style={{ marginBottom: 10, background: 'var(--accent)' }}>
                    Открыть камеру
                  </button>
                  <input ref={inputRef} className="input" placeholder="Или вставьте токен..."
                    value={scanInput} onChange={e => setScanInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleScan(); }}
                    style={{ textAlign: 'center', marginBottom: 10 }} />
                </>
              )}
              <button className="btn btn-primary" disabled={processing || !scanInput.trim()}
                onClick={handleScan} style={{ background: checkType === 'CHECK_IN' ? 'var(--success)' : 'var(--warning)' }}>
                {processing ? '...' : checkType === 'CHECK_IN' ? '⬆ Отметить вход' : '⬇ Отметить выход'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div className="card" style={{ textAlign: 'center', padding: '12px 8px' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--success)' }}>{attendeesStats.checkedIn}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Вход</div>
              </div>
              <div className="card" style={{ textAlign: 'center', padding: '12px 8px' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--warning)' }}>{attendeesStats.checkedOut}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Выход</div>
              </div>
              <div className="card" style={{ textAlign: 'center', padding: '12px 8px' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>{attendeesStats.total}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Всего</div>
              </div>
            </div>
          </div>
        )}

        {mode === 'attendees' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {attendees.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>Нет участников</div>
            ) : (
              attendees.map((a, i) => (
                <div key={a.applicationId} className="card" style={{
                  padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  animation: `fadeIn 0.2s ease ${i * 0.02}s both`,
                  borderColor: a.checkedOut ? 'var(--success-dim)' : a.checkedIn ? 'var(--warning-dim)' : undefined,
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{a.student.fullName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      гр. {a.student.groupNumber} · {a.participationType === 'VISITOR' ? 'Посетитель' : a.participationType === 'PARTICIPANT' ? 'Участник' : 'Организатор'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span className={`badge ${a.checkedIn ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: 10 }}>
                      {a.checkedIn ? `↑ ${fmtTime(a.checkInTime)}` : '↑ —'}
                    </span>
                    <span className={`badge ${a.checkedOut ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: 10 }}>
                      {a.checkedOut ? `↓ ${fmtTime(a.checkOutTime)}` : '↓ —'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {mode === 'manual' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" placeholder="ФИО или группа..." value={manualQuery}
                onChange={e => setManualQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleManualSearch(); }} />
              <button className="btn btn-primary" onClick={handleManualSearch}
                style={{ width: 'auto', padding: '12px 20px', flexShrink: 0 }}>Найти</button>
            </div>
            {manualResults.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {manualResults.map((a: any) => (
                  <div key={a.id} className="card" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{a.student.fullName}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        гр. {a.student.groupNumber} · {a.checkedIn ? '✓ Вход' : '○ Нет входа'}
                      </div>
                    </div>
                    <button onClick={() => handleManualCheck(a.id)} disabled={processing}
                      style={{
                        padding: '8px 14px', borderRadius: 8, border: 'none',
                        background: checkType === 'CHECK_IN' ? 'var(--success)' : 'var(--warning)',
                        color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}>
                      {processing ? '...' : checkType === 'CHECK_IN' ? '↑ Вход' : '↓ Выход'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
