import React, { useState, useEffect } from 'react';
import { Coordinator } from '../App';
import { api } from '../utils/api';
import StudentPicker, { Student, ExternalStudent } from '../components/StudentPicker';
import SuccessScreen from '../components/SuccessScreen';

type Step = 'list' | 'pick' | 'amounts' | 'confirm' | 'success' | 'chairman-detail' | 'edit-submission' | 'add-entry';

const MONTH_NAMES = ['', 'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTH_NAMES_GENITIVE = ['', 'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTH_NAMES_PREPOSITIONAL = ['', 'январе', 'феврале', 'марте', 'апреле', 'мае', 'июне',
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
  budgetStatus?: string;
  budgetStudentName?: string;
  budgetStudentGroup?: string;
  budgetStudentCard?: string;
}

interface Props { coordinator: Coordinator; }

export default function BonusesPage({ coordinator }: Props) {
  const isChairman = coordinator.role === 'CHAIRMAN' || coordinator.role === 'DEPUTY' || coordinator.role === 'DEAN';
  const isSecretary = coordinator.role === 'SECRETARY';
  const canManageBonuses = coordinator.role === 'CHAIRMAN' || coordinator.role === 'DEAN';
  const canViewAll = coordinator.role === 'CHAIRMAN' || coordinator.role === 'DEAN' || coordinator.role === 'DEPUTY' || coordinator.role === 'SECRETARY';
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const bonusOpen = now.getDate() >= 20;

  const [step, setStep] = useState<Step>('list');
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [externalStudents, setExternalStudents] = useState<ExternalStudent[]>([]);
  const [entries, setEntries] = useState<BonusEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generatingDoc, setGeneratingDoc] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [editEntries, setEditEntries] = useState<BonusEntry[]>([]);
  const [newEntry, setNewEntry] = useState<{
    fullName: string; groupNumber: string; studentCardNumber: string;
    amount: string; reason: string;
  }>({ fullName: '', groupNumber: '', studentCardNumber: '', amount: '', reason: '' });

  useEffect(() => { loadSubmissions(); }, []);

  function loadSubmissions() {
    setLoading(true);
    api.bonuses.list({ coordinatorId: coordinator.id, role: coordinator.role })
      .then(setSubmissions).catch(console.error).finally(() => setLoading(false));
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
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function proceedToAmounts() {
    const studentEntries: BonusEntry[] = [
      ...students.filter((s) => selectedIds.includes(s.id)).map((s) => ({
        studentId: s.id, fullName: s.fullName, groupNumber: s.groupNumber,
        amount: '', reason: 'Организация мероприятий на факультете и в университете и участие в них',
        budgetStatus: (s as any).budgetStatus,
        budgetStudentName: '', budgetStudentGroup: '', budgetStudentCard: '',
      })),
      ...externalStudents.filter((e) => e.fullName && e.studentCardNumber).map((e) => ({
        externalName: e.fullName, externalGroup: e.groupNumber, externalCardNumber: e.studentCardNumber,
        fullName: e.fullName, groupNumber: e.groupNumber,
        amount: '', reason: 'Организация мероприятий на факультете и в университете и участие в них',
        budgetStatus: 'BUDGET',
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
        coordinatorId: coordinator.id, month: currentMonth, year: currentYear,
        entries: entries.map((e) => ({
          studentId: e.studentId, externalName: e.externalName,
          externalGroup: e.externalGroup, externalCardNumber: e.externalCardNumber,
          amount: parseFloat(e.amount), reason: e.reason,
          budgetStudentName: e.budgetStudentName || undefined,
          budgetStudentGroup: e.budgetStudentGroup || undefined,
          budgetStudentCard: e.budgetStudentCard || undefined,
        })),
      });
      setStep('success');
    } catch (err: any) { alert(err.message); }
    finally { setSubmitting(false); }
  }

  async function approveSubmission(id: number) {
    setSubmitting(true);
    try {
      await api.bonuses.approve(id, coordinator.role);
      loadSubmissions();
      setStep('list');
      setSelectedSubmission(null);
    } catch (err: any) { alert(err.message); }
    finally { setSubmitting(false); }
  }

  async function saveEdits() {
    if (!selectedSubmission) return;
    setSubmitting(true);
    try {
      await api.bonuses.update(selectedSubmission.id, { role: coordinator.role, entries: selectedSubmission.entries });
      loadSubmissions();
      setEditMode(false);
    } catch (err: any) { alert(err.message); }
    finally { setSubmitting(false); }
  }

  function startEditSubmission() {
    if (!selectedSubmission) return;
    setEditEntries(selectedSubmission.entries.map((e: any) => ({
      studentId: e.studentId || undefined,
      externalName: e.externalName || undefined,
      externalGroup: e.externalGroup || undefined,
      externalCardNumber: e.externalCardNumber || undefined,
      fullName: e.student?.fullName || e.externalName || '',
      groupNumber: e.student?.groupNumber || e.externalGroup || '',
      amount: String(e.amount),
      reason: e.reason || '',
      id: e.id,
      budgetStatus: e.student?.budgetStatus || 'BUDGET',
      budgetStudentName: e.budgetStudentName || '',
      budgetStudentGroup: e.budgetStudentGroup || '',
      budgetStudentCard: e.budgetStudentCard || '',
    })));
    setStep('edit-submission');
  }

  function updateEditEntry(i: number, field: keyof BonusEntry, value: string) {
    const updated = [...editEntries];
    updated[i] = { ...updated[i], [field]: value };
    setEditEntries(updated);
  }

  async function saveCoordinatorEdits() {
    if (!selectedSubmission) return;
    setSubmitting(true);
    try {
      await api.bonuses.updateByCoordinator(selectedSubmission.id, {
        coordinatorId: coordinator.id,
        entries: editEntries.map((e) => ({
          studentId: e.studentId,
          externalName: e.externalName,
          externalGroup: e.externalGroup,
          externalCardNumber: e.externalCardNumber,
          amount: parseFloat(e.amount),
          reason: e.reason,
          budgetStudentName: e.budgetStudentName || undefined,
          budgetStudentGroup: e.budgetStudentGroup || undefined,
          budgetStudentCard: e.budgetStudentCard || undefined,
        })),
      });
      loadSubmissions();
      setStep('list');
      setSelectedSubmission(null);
    } catch (err: any) { alert(err.message); }
    finally { setSubmitting(false); }
  }

  function openAddEntry(submission: any) {
    setSelectedSubmission(submission);
    setNewEntry({ fullName: '', groupNumber: '', studentCardNumber: '', amount: '', reason: '' });
    setStep('add-entry');
  }

  async function submitAddEntry() {
    if (!selectedSubmission) return;
    if (!newEntry.fullName || !newEntry.groupNumber || !newEntry.studentCardNumber || !newEntry.amount) {
      alert('Заполните все обязательные поля');
      return;
    }
    setSubmitting(true);
    try {
      await api.bonuses.addEntry(selectedSubmission.id, {
        role: coordinator.role,
        entry: {
          externalName: newEntry.fullName,
          externalGroup: newEntry.groupNumber,
          externalCardNumber: newEntry.studentCardNumber,
          amount: parseFloat(newEntry.amount),
          reason: newEntry.reason,
        },
      });
      loadSubmissions();
      setStep('chairman-detail');
      setSelectedSubmission(null);
    } catch (err: any) { alert(err.message); }
    finally { setSubmitting(false); }
  }

  async function generateDoc(month: number, year: number) {
    setGeneratingDoc(true);
    try {
      const res = await fetch('/api/bonuses/generate-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: coordinator.role, month, year }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Ошибка генерации документа');
        return;
      }
      const blob = await res.blob();
      const MONTH_LOWER = ['', 'январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
      const filename = `Надбавки_${MONTH_LOWER[month]}_${year}.docx`;
      // Safe download that works in Telegram WebApp (no black screen)
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 500);
      alert(`✅ Докладная сформирована и отправлена в Telegram`);
    } catch (err: any) { alert(err.message); }
    finally { setGeneratingDoc(false); }
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
  ) && !isChairman;

  const groupedByMonth: Record<string, any[]> = {};
  submissions.forEach((s) => {
    const key = `${s.year}-${String(s.month).padStart(2, '0')}`;
    if (!groupedByMonth[key]) groupedByMonth[key] = [];
    groupedByMonth[key].push(s);
  });

  if (step === 'success') {
    return (
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <SuccessScreen
          title="Премии поданы"
          subtitle="Председатель получил уведомление и рассмотрит заявку"
          onDone={reset}
        />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px 16px 0', flexShrink: 0 }}>
        {step !== 'list' && (
          <button onClick={() => {
            if (step === 'pick') setStep('list');
            else if (step === 'amounts') setStep('pick');
            else if (step === 'confirm') setStep('amounts');
            else if (step === 'chairman-detail') { setStep('list'); setSelectedSubmission(null); setEditMode(false); }
            else if (step === 'edit-submission') { setStep('list'); setSelectedSubmission(null); }
            else if (step === 'add-entry') { setStep('chairman-detail'); setSelectedSubmission(null); }
          }} style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 12px', color: 'var(--text)', cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font)', marginBottom: 12 }}>
            ← Назад
          </button>
        )}
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>
          {step === 'list' && 'Премирование'}
          {step === 'pick' && 'Выбор студентов'}
          {step === 'amounts' && 'Суммы и обоснование'}
          {step === 'confirm' && 'Проверка'}
          {step === 'chairman-detail' && (selectedSubmission?.coordinator?.fullName || 'Заявка')}
          {step === 'edit-submission' && 'Редактирование премии'}
          {step === 'add-entry' && 'Добавить студента'}
        </h1>
      </div>

      {/* LIST */}
      {step === 'list' && (
        <div className="page-scroll" style={{ padding: '0 16px' }}>
          {!isChairman && !isSecretary && bonusOpen && canSubmitThisMonth && (
            <button className="btn btn-primary" style={{ marginBottom: 16 }} onClick={() => setStep('pick')}>
              + Подать премии за {MONTH_NAMES_GENITIVE[currentMonth]}
            </button>
          )}
          {!isChairman && !isSecretary && !bonusOpen && (
            <div className="card" style={{ marginBottom: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>🔒</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Подача закрыта</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Откроется с 20-го числа</div>
            </div>
          )}
          {!isChairman && !isSecretary && !canSubmitThisMonth && bonusOpen && (
            <div className="card" style={{ marginBottom: 16, background: 'var(--success-dim)', border: '1px solid rgba(74,222,128,0.2)' }}>
              <div style={{ fontSize: 13, color: 'var(--success)', fontWeight: 500 }}>
                ✓ Вы уже подали премии за {MONTH_NAMES_PREPOSITIONAL[currentMonth]}
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>Загрузка...</div>
          ) : submissions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>История пуста</div>
          ) : canViewAll ? (
            Object.entries(groupedByMonth).sort(([a], [b]) => b.localeCompare(a)).map(([key, subs]) => {
              const [yr, mo] = key.split('-').map(Number);
              const total = subs.reduce((sum, s) => sum + s.entries.reduce((s2: number, e: any) => s2 + Number(e.amount), 0), 0);
              const allApproved = subs.every(s => s.status === 'APPROVED');
              return (
                <div key={key} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div className="section-label" style={{ margin: 0 }}>{MONTH_NAMES[mo]} {yr}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>{total} BYN</span>
                      {allApproved && (canManageBonuses || isSecretary) && (
                        <button
                          onClick={() => generateDoc(mo, yr)}
                          disabled={generatingDoc}
                          style={{
                            background: 'var(--accent)', color: 'white', border: 'none',
                            borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 600,
                            cursor: generatingDoc ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)',
                            opacity: generatingDoc ? 0.6 : 1,
                          }}>
                          {generatingDoc ? '...' : '📄 Сформировать докладную'}
                        </button>
                      )}
                    </div>
                  </div>
                  {subs.map((s) => {
                    const subTotal = s.entries.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
                    const statusLabel = s.status === 'APPROVED' ? 'Подтверждено' : s.status === 'DEFERRED' ? 'Перенесено' : 'Ожидает';
                    const statusClass = s.status === 'APPROVED' ? 'badge-green' : s.status === 'DEFERRED' ? 'badge-yellow' : 'badge-accent';
                    const canClick = (isChairman || coordinator.role === 'DEAN' || isSecretary);
                    return (
                      <div key={s.id} className="card" style={{ marginBottom: 8, cursor: canClick ? 'pointer' : 'default' }}
                        onClick={() => { if (canClick) { setSelectedSubmission(s); setStep('chairman-detail'); } }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{s.coordinator.fullName}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.entries.length} студ. · {subTotal} BYN</div>
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
            submissions.map((s) => {
              const total = s.entries.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
              const statusLabel = s.status === 'APPROVED' ? 'Подтверждено' : s.status === 'DEFERRED' ? 'Перенесено' : 'На рассмотрении';
              const statusClass = s.status === 'APPROVED' ? 'badge-green' : s.status === 'DEFERRED' ? 'badge-yellow' : 'badge-accent';
              return (
                <div key={s.id} className="card" style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>{MONTH_NAMES[s.month]} {s.year}</div>
                    <span className={`badge ${statusClass}`}>{statusLabel}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>
                    {s.entries.length} студентов · {total} BYN
                  </div>
                  {s.entries.map((e: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid var(--border)', fontSize: 13 }}>
                      <span>{e.student?.fullName || e.externalName}</span>
                      <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{e.amount} BYN</span>
                    </div>
                  ))}
                  {s.status === 'PENDING' && (
                    <button className="btn btn-ghost" style={{ marginTop: 10, padding: '8px 12px', fontSize: 13 }}
                      onClick={() => { setSelectedSubmission(s); startEditSubmission(); }}>
                      ✎ Редактировать
                    </button>
                  )}
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
          <StudentPicker students={students} selectedIds={selectedIds} externalStudents={externalStudents}
            onToggle={toggleStudent} onExternalChange={setExternalStudents} />
          <div style={{ marginTop: 16 }}>
            <button className="btn btn-primary"
              disabled={selectedIds.length === 0 && externalStudents.filter(e => e.fullName && e.studentCardNumber).length === 0}
              onClick={proceedToAmounts}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{e.fullName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>гр. {e.groupNumber}</div>
                  </div>
                  {e.budgetStatus === 'PAID' && (
                    <span className="badge badge-yellow">Платник</span>
                  )}
                </div>
                <input className="input" type="number" placeholder="Сумма, BYN *" value={e.amount}
                  onChange={(ev) => updateEntry(i, 'amount', ev.target.value)} style={{ marginBottom: 8 }} />
                <input className="input" placeholder="Обоснование" value={e.reason}
                  onChange={(ev) => updateEntry(i, 'reason', ev.target.value)} />
                {e.budgetStatus === 'PAID' && (
                  <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--bg-raised)', borderRadius: 10, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 500 }}>
                      💡 Можно указать данные бюджетника, на которого пойдёт премия (необязательно):
                    </div>
                    <input className="input" placeholder="ФИО бюджетника"
                      value={e.budgetStudentName || ''}
                      onChange={(ev) => updateEntry(i, 'budgetStudentName', ev.target.value)}
                      style={{ marginBottom: 6 }} />
                    <input className="input" placeholder="Номер группы бюджетника"
                      value={e.budgetStudentGroup || ''}
                      onChange={(ev) => updateEntry(i, 'budgetStudentGroup', ev.target.value)}
                      style={{ marginBottom: 6 }} />
                    <input className="input" placeholder="Номер студенческого бюджетника"
                      value={e.budgetStudentCard || ''}
                      onChange={(ev) => updateEntry(i, 'budgetStudentCard', ev.target.value)} />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="card" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Итого:</span>
            <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 17 }}>{getTotal()} BYN</span>
          </div>
          <button className="btn btn-primary"
            disabled={entries.some((e) => !e.amount || parseFloat(e.amount) <= 0)}
            onClick={() => setStep('confirm')}>
            Проверить →
          </button>
          <div style={{ height: 20 }} />
        </div>
      )}

      {/* CONFIRM */}
      {step === 'confirm' && (
        <div className="page-scroll" style={{ padding: '0 16px' }}>
          <div className="section-label">Сводка премий за {MONTH_NAMES_GENITIVE[currentMonth]}</div>
          {entries.map((e, i) => (
            <div key={i} className="card" style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{e.fullName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{e.reason}</div>
                  {e.budgetStudentName && (
                    <div style={{ fontSize: 12, color: 'var(--warning)', marginTop: 4 }}>
                      → через бюджетника: {e.budgetStudentName} (гр. {e.budgetStudentGroup}, ст. {e.budgetStudentCard})
                    </div>
                  )}
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
          <button className="btn btn-primary" disabled={submitting} onClick={submit}>
            {submitting ? 'Отправка...' : '★ Выписать премии'}
          </button>
          <div style={{ height: 20 }} />
        </div>
      )}

      {/* CHAIRMAN DETAIL */}
      {step === 'chairman-detail' && selectedSubmission && (
        <div className="page-scroll" style={{ padding: '0 16px' }}>
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Направление</div>
            <div style={{ fontWeight: 600 }}>{selectedSubmission.coordinator.sector ? `${selectedSubmission.coordinator.sector} направление` : 'Руководство СС'}</div>
          </div>

          <div className="section-label">Студенты ({selectedSubmission.entries.length})</div>
          {selectedSubmission.entries.map((e: any, i: number) => (
            <div key={e.id || i} className="card" style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{e.student?.fullName || e.externalName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>гр. {e.student?.groupNumber || e.externalGroup}</div>
                  {editMode ? (
                    <input className="input" type="number" value={e.amount} style={{ marginTop: 8, fontSize: 14 }}
                      onChange={(ev) => {
                        const updated = { ...selectedSubmission };
                        updated.entries[i].amount = ev.target.value;
                        setSelectedSubmission({ ...updated });
                      }} />
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
                {selectedSubmission.status !== 'APPROVED' && (
                  <button className="btn btn-primary" disabled={submitting || !canManageBonuses} onClick={() => approveSubmission(selectedSubmission.id)}>
                    {submitting ? '...' : '✓ Подтвердить премирование'}
                  </button>
                )}
                {selectedSubmission.status === 'APPROVED' && (
                  <div style={{ padding: '8px 12px', background: 'var(--success-dim)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--success)', textAlign: 'center', marginBottom: 4 }}>
                    ✓ Премирование подтверждено
                  </div>
                )}
                <button className="btn btn-ghost" onClick={() => setEditMode(true)}>✎ Редактировать суммы</button>
                {(coordinator.role === 'CHAIRMAN' || coordinator.role === 'DEAN') && (
                  <button className="btn btn-ghost" onClick={() => openAddEntry(selectedSubmission)}>+ Добавить студента</button>
                )}
              </>
            )}
          </div>
          <div style={{ height: 20 }} />
        </div>
      )}

      {/* EDIT SUBMISSION (coordinator) */}
      {step === 'edit-submission' && selectedSubmission && (
        <div className="page-scroll" style={{ padding: '0 16px' }}>
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Заявка за {MONTH_NAMES[selectedSubmission.month]} {selectedSubmission.year}</div>
          </div>
          <div className="section-label">Студенты и суммы</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {editEntries.map((e, i) => (
              <div key={i} className="card">
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{e.fullName}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>гр. {e.groupNumber}</div>
                <input className="input" type="number" placeholder="Сумма, BYN *" value={e.amount}
                  onChange={(ev) => updateEditEntry(i, 'amount', ev.target.value)} style={{ marginBottom: 8 }} />
                <input className="input" placeholder="Обоснование" value={e.reason}
                  onChange={(ev) => updateEditEntry(i, 'reason', ev.target.value)} />
                {e.budgetStatus === 'PAID' && (
                  <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--bg-raised)', borderRadius: 10, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>💡 Бюджетник (необязательно):</div>
                    <input className="input" placeholder="ФИО бюджетника" value={e.budgetStudentName || ''}
                      onChange={(ev) => updateEditEntry(i, 'budgetStudentName', ev.target.value)} style={{ marginBottom: 6 }} />
                    <input className="input" placeholder="Группа" value={e.budgetStudentGroup || ''}
                      onChange={(ev) => updateEditEntry(i, 'budgetStudentGroup', ev.target.value)} style={{ marginBottom: 6 }} />
                    <input className="input" placeholder="Номер студенческого" value={e.budgetStudentCard || ''}
                      onChange={(ev) => updateEditEntry(i, 'budgetStudentCard', ev.target.value)} />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn btn-primary" disabled={submitting || editEntries.some((e) => !e.amount || parseFloat(e.amount) <= 0)}
              onClick={saveCoordinatorEdits}>
              {submitting ? 'Сохранение...' : '✓ Сохранить'}
            </button>
          </div>
          <div style={{ height: 20 }} />
        </div>
      )}

      {/* ADD ENTRY (chairman/dean/secretary) */}
      {step === 'add-entry' && (
        <div className="page-scroll" style={{ padding: '0 16px' }}>
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Добавление к заявке</div>
            <div style={{ fontWeight: 600 }}>{selectedSubmission?.coordinator?.fullName}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input className="input" placeholder="ФИО *" value={newEntry.fullName}
              onChange={(ev) => setNewEntry({ ...newEntry, fullName: ev.target.value })} />
            <input className="input" placeholder="Группа *" value={newEntry.groupNumber}
              onChange={(ev) => setNewEntry({ ...newEntry, groupNumber: ev.target.value })} />
            <input className="input" placeholder="Номер студенческого *" value={newEntry.studentCardNumber}
              onChange={(ev) => setNewEntry({ ...newEntry, studentCardNumber: ev.target.value })} />
            <input className="input" type="number" placeholder="Сумма, BYN *" value={newEntry.amount}
              onChange={(ev) => setNewEntry({ ...newEntry, amount: ev.target.value })} />
            <input className="input" placeholder="Основание" value={newEntry.reason}
              onChange={(ev) => setNewEntry({ ...newEntry, reason: ev.target.value })} />
          </div>
          <button className="btn btn-primary" style={{ marginTop: 16 }} disabled={submitting} onClick={submitAddEntry}>
            {submitting ? 'Добавление...' : '+ Добавить'}
          </button>
          <div style={{ height: 20 }} />
        </div>
      )}
    </div>
  );
}
