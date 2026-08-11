import React, { useState, useEffect } from 'react';
import { Coordinator } from '../App';
import { api } from '../utils/api';

interface SectorOverview {
  [sectorName: string]: {
    coordinator: { fullName: string; telegramUsername: string };
    students: StudentData[];
  };
}

interface StudentData {
  id: number;
  fullName: string;
  groupNumber: string;
  studentCardNumber: string;
  sectors: string[];
  budgetStatus: string;
}

interface Props { coordinator: Coordinator; }

const SECTOR_LABELS: Record<string, string> = {
  'Научное': 'Научное', 'Инструментальное': 'Инструментальное', 'Танцевальное': 'Танцевальное',
  'Театральное': 'Театральное', 'Учебное': 'Учебное', 'Вокальное': 'Вокальное',
  'Культурно-массовое': 'Культурно-массовое', 'Декоративное': 'Декоративное',
  'Спортивное': 'Спортивное', 'Профориентационное': 'Профориентационное', 'Информационное': 'Информационное',
};

const STATUS_OPTIONS = [
  { value: 'BUDGET', label: 'Бюджет' },
  { value: 'PAID', label: 'Платка' },
  { value: 'NO_STIPEND', label: 'Без стипендии' },
];

export default function SectorPage({ coordinator }: Props) {
  const isAdmin = coordinator.role === 'CHAIRMAN' || coordinator.role === 'DEPUTY' || coordinator.role === 'DEAN' || coordinator.role === 'SECRETARY';
  const [loading, setLoading] = useState(true);
  const [mySectorStudents, setMySectorStudents] = useState<StudentData[]>([]);
  const [sectorOverview, setSectorOverview] = useState<SectorOverview>({});
  const [expandedSector, setExpandedSector] = useState<string | null>(null);
  const [showAddToMySector, setShowAddToMySector] = useState(false);
  const [newStudentForm, setNewStudentForm] = useState({ fullName: '', groupNumber: '', studentCardNumber: '', budgetStatus: 'BUDGET' });
  const [showAddGlobal, setShowAddGlobal] = useState(false);
  const [globalForm, setGlobalForm] = useState({ fullName: '', groupNumber: '', studentCardNumber: '', sector: '', budgetStatus: 'BUDGET' });
  const [submitting, setSubmitting] = useState(false);
  const sectorNames = Object.keys(SECTOR_LABELS);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      if (isAdmin) {
        const overview = await api.council.sectorOverview();
        setSectorOverview(overview);
      } else if (coordinator.sector) {
        const res = await api.students.list({ sector: coordinator.sector, role: coordinator.role });
        setMySectorStudents(res);
      }
    } catch (_) {}
    setLoading(false);
  }

  async function addStudentToMySector() {
    if (!newStudentForm.fullName || !newStudentForm.groupNumber || !newStudentForm.studentCardNumber) return;
    setSubmitting(true);
    try {
      await api.council.students.create({ creatorId: coordinator.id, fullName: newStudentForm.fullName, groupNumber: newStudentForm.groupNumber, studentCardNumber: newStudentForm.studentCardNumber, budgetStatus: newStudentForm.budgetStatus, sectors: [coordinator.sector!] });
      setNewStudentForm({ fullName: '', groupNumber: '', studentCardNumber: '', budgetStatus: 'BUDGET' });
      setShowAddToMySector(false);
      await loadData();
    } catch (e: any) { alert(e.message); }
    setSubmitting(false);
  }

  async function removeStudentFromMySector(studentId: number) {
    if (!confirm('Удалить студента из сектора?')) return;
    try {
      await fetch('/api/council/students/' + studentId + '/sector', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId: coordinator.id, sector: coordinator.sector }),
      });
      await loadData();
    } catch (e: any) { alert(e.message); }
  }

  async function removeStudentFromSector(studentId: number, sectorName: string) {
    if (!confirm('Удалить студента из сектора?')) return;
    try {
      await fetch('/api/council/students/' + studentId + '/sector', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId: coordinator.id, sector: sectorName }),
      });
      await loadData();
    } catch (e: any) { alert(e.message); }
  }

  async function addStudentGlobal() {
    if (!globalForm.fullName || !globalForm.groupNumber || !globalForm.studentCardNumber || !globalForm.sector) return;
    setSubmitting(true);
    try {
      await api.council.students.create({ creatorId: coordinator.id, fullName: globalForm.fullName, groupNumber: globalForm.groupNumber, studentCardNumber: globalForm.studentCardNumber, budgetStatus: globalForm.budgetStatus, sectors: [globalForm.sector] });
      setGlobalForm({ fullName: '', groupNumber: '', studentCardNumber: '', sector: '', budgetStatus: 'BUDGET' });
      setShowAddGlobal(false);
      await loadData();
    } catch (e: any) { alert(e.message); }
    setSubmitting(false);
  }

  if (loading) {
    return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Загрузка...</div>;
  }

  // ========== COORDINATOR VIEW ==========
  if (!isAdmin) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px 16px 0', flexShrink: 0 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Мой сектор</h1>
          {coordinator.sector && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>{coordinator.sector}</div>}
        </div>
        <div className="page-scroll" style={{ padding: '0 16px' }}>
          {coordinator.sector ? (
            <>
              <div className="section-label" style={{ marginBottom: 10 }}>Студенты ({mySectorStudents.length})</div>
              {mySectorStudents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>Нет студентов в вашем секторе</div>
              ) : (
                mySectorStudents.map((s, i) => (
                  <div key={s.id} className="card" style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', animation: `fadeIn 0.2s ease ${i * 0.04}s both` }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{s.fullName}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>гр. {s.groupNumber}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        {s.budgetStatus === 'PAID' ? <span className="badge badge-yellow">Платка</span> : s.budgetStatus === 'NO_STIPEND' ? <span className="badge badge-gray">Без стипендии</span> : <span className="badge badge-green">Бюджет</span>}
                      </div>
                    </div>
                    <button onClick={() => removeStudentFromMySector(s.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: 18, padding: 4 }}>×</button>
                  </div>
                ))
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>У вас не привязан сектор</div>
          )}
          <div style={{ height: 20 }} />
        </div>
        {coordinator.sector && (
          <div style={{ padding: '12px 16px', flexShrink: 0, borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
            <button className="btn btn-primary" onClick={() => { setNewStudentForm({ fullName: '', groupNumber: '', studentCardNumber: '', budgetStatus: 'BUDGET' }); setShowAddToMySector(true); }} style={{ width: '100%' }}>
              + Добавить студента
            </button>
          </div>
        )}
        {showAddToMySector && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 16, animation: 'fadeIn 0.15s ease' }}
            onClick={() => setShowAddToMySector(false)}>
            <div className="card" style={{ width: '100%', maxWidth: 360, borderColor: 'var(--accent)', animation: 'scaleIn 0.2s ease' }}
              onClick={(e) => e.stopPropagation()}>
              <div className="section-label" style={{ marginBottom: 12 }}>Новый студент</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                <input className="input" placeholder="ФИО *" value={newStudentForm.fullName}
                  onChange={(e) => setNewStudentForm({ ...newStudentForm, fullName: e.target.value })} />
                <input className="input" placeholder="Номер группы *" value={newStudentForm.groupNumber}
                  onChange={(e) => setNewStudentForm({ ...newStudentForm, groupNumber: e.target.value })} />
                <input className="input" placeholder="Номер студенческого *" value={newStudentForm.studentCardNumber}
                  onChange={(e) => setNewStudentForm({ ...newStudentForm, studentCardNumber: e.target.value })} />
                <select className="input" value={newStudentForm.budgetStatus}
                  onChange={(e) => setNewStudentForm({ ...newStudentForm, budgetStatus: e.target.value })}>
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <button className="btn btn-primary" disabled={submitting} onClick={addStudentToMySector} style={{ width: '100%' }}>Добавить</button>
              <button className="btn btn-ghost" onClick={() => setShowAddToMySector(false)} style={{ width: '100%', marginTop: 8 }}>Отмена</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ========== ADMIN VIEW ==========
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px 16px 0', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => window.history.length > 1 ? window.history.back() : null}
          style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 12px', color: 'var(--text)', cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font)' }}>
          ← Назад
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Студсовет</h1>
      </div>
      <div className="page-scroll" style={{ padding: '0 16px' }}>
        {sectorNames.map((secName, si) => {
          const data = sectorOverview[secName];
          const isExpanded = expandedSector === secName;
          if (!data) return null;
          return (
            <div key={secName} className="card" style={{ marginBottom: 10, animation: `fadeIn 0.25s ease ${si * 0.05}s both` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' }}
                onClick={() => setExpandedSector(isExpanded ? null : secName)}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{secName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Координатор: {data.coordinator.fullName} (@{data.coordinator.telegramUsername})</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Студентов: {data.students.length}</div>
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: 16, marginTop: 4 }}>{isExpanded ? '▾' : '▸'}</span>
              </div>
              <div className={'expandable-grid' + (isExpanded ? ' open' : '')}>
                  <div>
                    <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                  {data.students.length === 0 ? (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>Нет студентов</div>
                  ) : (
                    data.students.map((s) => (
                      <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500 }}>{s.fullName}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>гр. {s.groupNumber}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            {s.budgetStatus === 'PAID' ? <span className="badge badge-yellow">Платка</span> : s.budgetStatus === 'NO_STIPEND' ? <span className="badge badge-gray">Без стипендии</span> : <span className="badge badge-green">Бюджет</span>}
                          </div>
                        </div>
                        <button onClick={() => removeStudentFromSector(s.id, secName)}
                          style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: 16, padding: 4 }}>×</button>
                      </div>
                    ))
                  )}
                    </div>
                  </div>
              </div>
            </div>
          );
        })}
        <div style={{ height: 20 }} />
      </div>
      <div style={{ padding: '12px 16px', flexShrink: 0, borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
        <button className="btn btn-primary" onClick={() => setShowAddGlobal(true)} style={{ width: '100%' }}>+ Добавить в студсовет</button>
      </div>
      {showAddGlobal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 16, animation: 'fadeIn 0.15s ease' }}
          onClick={() => setShowAddGlobal(false)}>
          <div className="card" style={{ width: '100%', maxWidth: 360, borderColor: 'var(--accent)', animation: 'scaleIn 0.2s ease' }}
            onClick={(e) => e.stopPropagation()}>
            <div className="section-label" style={{ marginBottom: 12 }}>Новый студент</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              <input className="input" placeholder="ФИО *" value={globalForm.fullName}
                onChange={(e) => setGlobalForm({ ...globalForm, fullName: e.target.value })} />
              <input className="input" placeholder="Номер группы *" value={globalForm.groupNumber}
                onChange={(e) => setGlobalForm({ ...globalForm, groupNumber: e.target.value })} />
              <input className="input" placeholder="Номер студенческого *" value={globalForm.studentCardNumber}
                onChange={(e) => setGlobalForm({ ...globalForm, studentCardNumber: e.target.value })} />
              <select className="input" value={globalForm.sector} onChange={(e) => setGlobalForm({ ...globalForm, sector: e.target.value })}>
                <option value="">Выберите сектор *</option>
                {sectorNames.map((s) => (<option key={s} value={s}>{s}</option>))}
              </select>
              <select className="input" value={globalForm.budgetStatus}
                onChange={(e) => setGlobalForm({ ...globalForm, budgetStatus: e.target.value })}>
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" disabled={submitting} onClick={addStudentGlobal} style={{ width: '100%' }}>Добавить</button>
            <button className="btn btn-ghost" onClick={() => setShowAddGlobal(false)} style={{ width: '100%', marginTop: 8 }}>Отмена</button>
          </div>
        </div>
      )}
    </div>
  );
}
