import React, { useState, useEffect } from 'react';
import { Coordinator } from '../App';
import { api } from '../utils/api';
import StudentPicker, { Student, ExternalStudent } from '../components/StudentPicker';
import SuccessScreen from '../components/SuccessScreen';

type Step = 'list' | 'pick' | 'amounts' | 'confirm' | 'success' | 'chairman-detail';

const MONTH_NAMES = ['', 'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTH_NAMES_GENITIVE = ['', 'январе', 'феврале', 'марте', 'апреле', 'мае', 'июне',
  'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];

interface BonusEntry {
  studentId?: number;
  externalName?: string;
  externalGroup?: string;
  externalCardNumber?: string;
  fullName: string;
  groupNumber: string;
  amount: string;
  reason: string;
  id?: number;
}

interface Props { coordinator: Coordinator; }

export default function BonusesPage({ coordinator }: Props) {
  const isChairman = coordinator.role === 'CHAIRMAN' || coordinator.role === 'DEPUTY';
  const now = new Date();
  const day = now.getDate();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const bonusOpen = true;

  const [step, setStep] = useState<Step>('list');
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [externalStudents, setExternalStudents] = useState<ExternalStudent[]>([]);
  const [entries, setEntries] = useState<BonusEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    loadSubmissions();
  }, []);

  function loadSubmissions() {
    setLoading(true);
    api.bonuses.list({ coordinatorId: coordinator.id, role: coordinator.role })
      .then(setSubmissions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (step === 'pick') {
      api.students.list({
        sector: isChairman ? undefined : (coordinator.sector || undefined),
        role: coordinator.role,
      }).then(setStudents).catch(console.error);
    }
  }, [step]);

  function toggleStudent(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function proceedToAmounts() {
    const studentEntries: BonusEntry[] = [
      ...students.filter((s) => selectedIds.includes(s.id)).map((s) => ({
        studentId: s.id,
        fullName: s.fullName,
        groupNumber: s.groupNumber,
        amount: '',
        reason: 'Организация мероприятий на факультете и в университете и участие в них',
      })),
      ...externalStudents.filter((e) => e.fullName).map((e) => ({
        externalName: e.fullName,
        externalGroup: e.groupNumber,
        externalCardNumber: e.studentCardNumber,
        fullName: e.fullName,
        groupNumber: e.groupNumber,
        amount: '',
        reason: 'Организация мероприятий на факультете и в университете и участие в них',
      })),
    ];
    setEntries(studentEntries);
    setStep('amounts');
  }

  function updateEntry(i: number, field: keyof BonusEntry, value: string) {
    const updated = [...entries];
    updated[i] = { ...updated[i], [field]: value };
    setEntries(updated);
  }

  function getTotal() {
    return entries.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  }

  async function submit() {
    setSubmitting(true);
    try {
      await api.bonuses.create({
        coordinatorId: coordinator.id,
        month: currentMonth,
        year: currentYear,
        entries: entries.map((e) => ({
          studentId: e.studentId,
          externalName: e.externalName,
          externalGroup: e.externalGroup,
          externalCardNumber: e.externalCardNumber,
          amount: parseFloat(e.amount),
          reason: e.reason,
        })),
      });
      setStep('success');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function approveSubmission(id: number) {
    setSubmitting(true);
    try {
      await api.bonuses.approve(id, coordinator.role);
      loadSubmissions();
      setStep('list');
      setSelectedSubmission(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function saveEdits() {
    if (!selectedSubmission) return;
    setSubmitting(true);
    try {
      await api.bonuses.update(selectedSubmission.id, {
        role: coordinator.role,
        entries: selectedSubmission.entries,
      });
      loadSubmissions();
      setEditMode(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setStep('list');
    setSelectedIds([]);
    setExternalStudents([]);
    setEntries([]);
    loadSubmissions();
  }

  const canSubmitThisMonth = !submissions.some(
    (s) => s.month === currentMonth && s.year === currentYear && s.coordinatorId === coordinator.id
  );

  // Group submissions by month/year for chairman view
  const groupedByMonth: Record<string, any[]> = {};
  submissions.forEach((s) => {
    const key = `${s.year}-${s.month}`;
    if (!groupedByMonth[key]) groupedByMonth[key] = [];
    groupedByMonth[key].push(s);
  });

  if (step === 'success') {
    return (
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <SuccessScreen
          title="Премии поданы"
          subtitle="Председатель получил уведомление и рассмотрит вашу заявку"
          onDone={reset}
        />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px 16px 0', flexShrink: 0 }}>
        {step !== 'list' && (
          <button
            onClick={() => {
              if (step === 'pick') setStep('list');
              else if (step === 'amounts') setStep('pick');
              else if (step === 'confirm') setStep('amounts');
              else if (step === 'chairman-detail') { setStep('list'); setSelectedSubmission(null); setEditMode(false); }
            }}
            style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 12px', color: 'var(--text)', cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font)', marginBottom: 12 }}
          >← Назад</button>
        )}
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>
          {step === 'list' && 'Премирование'}
          {step === 'pick' && 'Выбор студентов'}
          {step === 'amounts' && 'Суммы и обоснование'}
          {step === 'confirm' && 'Проверка'}
          {step === 'chairman-detail' && (selectedSubmission?.coordinator?.fullName || 'Заявка')}
        </h1>
      </div>

      {/* LIST */}
      {step === 'list' && (
        <div className="page-scroll" style={{ padding: '0 16px' }}>
          {/* New submission button (coordinator) */}
          {!isChairman && bonusOpen && canSubmitThisMonth && (
            <button className="btn btn-primary" style={{ marginBottom: 16 }} onClick={() => setStep('pick')}>
              + Подать премии за {MONTH_NAMES_GENITIVE[currentMonth]}
            </button>
          )}
          {!isChairman && !bonusOpen && (
            <div className="card" style={{ marginBottom: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>🔒</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Подача закрыта</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Откроется с 20-го числа</div>
            </div>
          )}
          {!isChairman && !canSubmitThisMonth && bonusOpen && (
            <div className="card" style={{ marginBottom: 16, background: 'var(--success-dim)', border: '1px solid rgba(74,222,128,0.2)' }}>
              <div style={{ fontSize: 13, color: 'var(--success)', fontWeight: 500 }}>
                ✓ Вы уже подали премии за {MONTH_NAMES_GENITIVE[currentMonth]}
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>Загрузка...</div>
          ) : submissions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>
              История пуста
            </div>
          ) : isChairman ? (
            // Chairman sees all grouped by month
            Object.entries(groupedByMonth).sort(([a], [b]) => b.localeCompare(a)).map(([key, subs]) => {
              const [yr, mo] = key.split('-').map(Number);
              const total = subs.reduce((sum, s) =>
                sum + s.entries.reduce((s2: number, e: any) => s2 + Number(e.amount), 0), 0
              );
              return (
                <div key={key} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div className="section-label" style={{ margin: 0 }}>
                      {MONTH_NAMES[mo]} {yr}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>{total} BYN</span>
                  </div>
                  {subs.map((s) => {
                    const subTotal = s.entries.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
                    const statusLabel = s.status === 'APPROVED' ? 'Подтверждено' : s.status === 'DEFERRED' ? 'Перенесено' : 'Ожидает';
                    const statusClass = s.status === 'APPROVED' ? 'badge-green' : s.status === 'DEFERRED' ? 'badge-yellow' : 'badge-accent';
                    return (
                      <div
                        key={s.id}
                        className="card"
                        style={{ marginBottom: 8, cursor: s.status === 'PENDING' ? 'pointer' : 'default' }}
                        onClick={() => {
                          if (s.status === 'PENDING') {
                            setSelectedSubmission(s);
                            setStep('chairman-detail');
                          }
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>
                              {s.coordinator.fullName}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              {s.entries.length} студ. · {subTotal} BYN
                            </div>
                          </div>
                          <span className={`badge ${statusClass}`}>{statusLabel}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
          ) : (
            // Coordinator sees own submissions
            submissions.map((s) => {
              const total = s.entries.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
              const statusLabel = s.status === 'APPROVED' ? 'Подтверждено' : s.status === 'DEFERRED' ? 'Перенесено' : 'Ожидает';
              const statusClass = s.status === 'APPROVED' ? 'badge-green' : s.status === 'DEFERRED' ? 'badge-yellow' : 'badge-accent';
              return (
                <div key={s.id} className="card" style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>
                      {MONTH_NAMES[s.month]} {s.year}
                    </div>
                    <span className={`badge ${statusClass}`}>{statusLabel}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>
                    {s.entries.length} студентов · {total} BYN
                  </div>
                  {s.entries.map((e: any, i: number) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between',
                      padding: '6px 0', borderTop: '1px solid var(--border)',
                      fontSize: 13,
                    }}>
                      <span>{e.student?.fullName || e.externalName}</span>
                      <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{e.amount} BYN</span>
                    </div>
                  ))}
                </div>
              );
            })
          )}
          <div style={{ height: 20 }} />
        </div>
      )}

      {/* PICK */}
      {step === 'pick' && (
        <div className="page-scroll" style={{ padding: '0 16px' }}>
          <div style={{ padding: '8px 12px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', marginBottom: 14, fontSize: 13, color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            📅 {MONTH_NAMES[currentMonth]} {currentYear}
          </div>
          <StudentPicker
            students={students}
            selectedIds={selectedIds}
            externalStudents={externalStudents}
            onToggle={toggleStudent}
            onExternalChange={setExternalStudents}
          />
          <div style={{ marginTop: 16 }}>
            <button
              className="btn btn-primary"
              disabled={selectedIds.length === 0 && externalStudents.filter(e => e.fullName).length === 0}
              onClick={proceedToAmounts}
            >
              Далее: суммы →
            </button>
          </div>
          <div style={{ height: 20 }} />
        </div>
      )}

      {/* AMOUNTS */}
      {step === 'amounts' && (
        <div className="page-scroll" style={{ padding: '0 16px' }}>
          <div className="section-label">Укажите суммы (BYN)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {entries.map((e, i) => (
              <div key={i} className="card">
                <div style={{ fontWeight: 600, marginBottom: 10 }}>{e.fullName}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>гр. {e.groupNumber}</div>
                <input
                  className="input"
                  type="number"
                  placeholder="Сумма, BYN *"
                  value={e.amount}
                  onChange={(ev) => updateEntry(i, 'amount', ev.target.value)}
                  style={{ marginBottom: 8 }}
                />
                <input
                  className="input"
                  placeholder="Обоснование"
                  value={e.reason}
                  onChange={(ev) => updateEntry(i, 'reason', ev.target.value)}
                />
              </div>
            ))}
          </div>
          <div className="card" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Итого:</span>
            <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 17 }}>{getTotal()} BYN</span>
          </div>
          <button
            className="btn btn-primary"
            disabled={entries.some((e) => !e.amount || parseFloat(e.amount) <= 0)}
            onClick={() => setStep('confirm')}
          >
            Проверить →
          </button>
          <div style={{ height: 20 }} />
        </div>
      )}

      {/* CONFIRM */}
      {step === 'confirm' && (
        <div className="page-scroll" style={{ padding: '0 16px' }}>
          <div className="section-label">Сводка премий</div>
          {entries.map((e, i) => (
            <div key={i} className="card" style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{e.fullName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{e.reason}</div>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 16, marginLeft: 12, flexShrink: 0 }}>
                  {e.amount} BYN
                </div>
              </div>
            </div>
          ))}
          <div className="card" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600 }}>Итого:</span>
            <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 18 }}>{getTotal()} BYN</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn btn-primary" disabled={submitting} onClick={submit}>
              {submitting ? 'Отправка...' : '★ Выписать премии'}
            </button>
          </div>
          <div style={{ height: 20 }} />
        </div>
      )}

      {/* CHAIRMAN DETAIL */}
      {step === 'chairman-detail' && selectedSubmission && (
        <div className="page-scroll" style={{ padding: '0 16px' }}>
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Сектор</div>
            <div style={{ fontWeight: 600 }}>{selectedSubmission.coordinator.sector || 'Руководство'}</div>
          </div>

          <div className="section-label">Студенты ({selectedSubmission.entries.length})</div>
          {selectedSubmission.entries.map((e: any, i: number) => (
            <div key={e.id || i} className="card" style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{e.student?.fullName || e.externalName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>гр. {e.student?.groupNumber || e.externalGroup}</div>
                  {editMode ? (
                    <input
                      className="input"
                      type="number"
                      value={e.amount}
                      style={{ marginTop: 8, fontSize: 14 }}
                      onChange={(ev) => {
                        const updated = { ...selectedSubmission };
                        updated.entries[i].amount = ev.target.value;
                        setSelectedSubmission({ ...updated });
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{e.reason}</div>
                  )}
                </div>
                {!editMode && (
                  <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 16, marginLeft: 12 }}>
                    {e.amount} BYN
                  </div>
                )}
              </div>
            </div>
          ))}

          <div className="card" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600 }}>Итого:</span>
            <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 18 }}>
              {selectedSubmission.entries.reduce((s: number, e: any) => s + Number(e.amount), 0)} BYN
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {editMode ? (
              <>
                <button className="btn btn-primary" disabled={submitting} onClick={saveEdits}>
                  {submitting ? 'Сохранение...' : '✓ Сохранить изменения'}
                </button>
                <button className="btn btn-secondary" onClick={() => setEditMode(false)}>Отмена</button>
              </>
            ) : (
              <>
                <button
                  className="btn btn-primary"
                  disabled={submitting}
                  onClick={() => approveSubmission(selectedSubmission.id)}
                >
                  {submitting ? '...' : '✓ Подтвердить премирование'}
                </button>
                <button className="btn btn-ghost" onClick={() => setEditMode(true)}>✎ Редактировать суммы</button>
              </>
            )}
          </div>
          <div style={{ height: 20 }} />
        </div>
      )}
    </div>
  );
}
