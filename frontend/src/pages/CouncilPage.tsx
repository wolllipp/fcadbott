import React, { useState, useEffect } from 'react';
import { Coordinator } from '../App';
import { api } from '../utils/api';

type Tab = 'coordinators' | 'students';

interface CouncilProps {
  coordinator: Coordinator;
}

export default function CouncilPage({ coordinator }: CouncilProps) {
  const canManage = coordinator.role === 'CHAIRMAN' || coordinator.role === 'DEPUTY' || coordinator.role === 'DEAN' || coordinator.role === 'SECRETARY';

  const [tab, setTab] = useState<Tab>('coordinators');
  const [coordinators, setCoordinators] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCoord, setShowAddCoord] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newCoord, setNewCoord] = useState({ fullName: '', telegramUsername: '', role: 'COORDINATOR', sector: '' });
  const [newStudent, setNewStudent] = useState({ fullName: '', groupNumber: '', studentCardNumber: '', budgetStatus: 'BUDGET' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      if (canManage) {
        const [coords, studs] = await Promise.all([
          api.council.coordinators.list(),
          api.council.students.list(),
        ]);
        setCoordinators(coords);
        setStudents(studs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function addCoordinator() {
    if (!newCoord.fullName || !newCoord.telegramUsername) return;
    setSubmitting(true);
    try {
      await api.council.coordinators.create({ ...newCoord, creatorId: coordinator.id });
      setNewCoord({ fullName: '', telegramUsername: '', role: 'COORDINATOR', sector: '' });
      setShowAddCoord(false);
      await loadData();
    } catch (e: any) { alert(e.message); }
    finally { setSubmitting(false); }
  }

  async function removeCoordinator(id: number) {
    if (!confirm('Удалить координатора?')) return;
    try {
      await api.council.coordinators.remove(id, coordinator.id);
      await loadData();
    } catch (e: any) { alert(e.message); }
  }

  async function addStudent() {
    if (!newStudent.fullName || !newStudent.groupNumber || !newStudent.studentCardNumber) return;
    setSubmitting(true);
    try {
      await api.council.students.create({ creatorId: coordinator.id, ...newStudent });
      setNewStudent({ fullName: '', groupNumber: '', studentCardNumber: '', budgetStatus: 'BUDGET' });
      setShowAddStudent(false);
      await loadData();
    } catch (e: any) { alert(e.message); }
    finally { setSubmitting(false); }
  }

  async function removeStudent(id: number) {
    if (!confirm('Удалить студента?')) return;
    try {
      await api.council.students.remove(id, coordinator.id);
      await loadData();
    } catch (e: any) { alert(e.message); }
  }

  const ROLE_LABEL: Record<string, string> = {
    CHAIRMAN: 'Председатель',
    DEPUTY: 'Заместитель',
    SECRETARY: 'Секретарь',
    DEAN: 'Мама ФКП',
    COORDINATOR: 'Координатор',
  };

  if (!canManage) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Доступ запрещён
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Загрузка...
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px 16px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <button onClick={() => window.history.length > 1 ? window.history.back() : null}
            style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 12px', color: 'var(--text)', cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font)' }}>
            ← Назад
          </button>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Студсовет</h1>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button onClick={() => setTab('coordinators')}
            style={{ flex: 1, padding: '8px 0', borderRadius: 10, border: '1.5px solid',
              borderColor: tab === 'coordinators' ? 'var(--accent)' : 'var(--border)',
              background: tab === 'coordinators' ? 'var(--accent-dim)' : 'var(--bg-raised)',
              color: tab === 'coordinators' ? 'var(--accent)' : 'var(--text-secondary)',
              fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Координаторы
          </button>
          <button onClick={() => setTab('students')}
            style={{ flex: 1, padding: '8px 0', borderRadius: 10, border: '1.5px solid',
              borderColor: tab === 'students' ? 'var(--accent)' : 'var(--border)',
              background: tab === 'students' ? 'var(--accent-dim)' : 'var(--bg-raised)',
              color: tab === 'students' ? 'var(--accent)' : 'var(--text-secondary)',
              fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Студенты
          </button>
        </div>
      </div>

      <div className="page-scroll" style={{ padding: '0 16px' }}>
        {tab === 'coordinators' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div className="section-label" style={{ marginBottom: 0 }}>Координаторы ({coordinators.length})</div>
              <button onClick={() => setShowAddCoord(true)}
                style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                + Добавить
              </button>
            </div>

            {coordinators.map((c, i) => (
              <div key={c.id} className="card" style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', animation: `fadeIn 0.2s ease ${i * 0.04}s both` }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{c.fullName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {ROLE_LABEL[c.role]} {c.sector ? `· ${c.sector}` : ''}
                  </div>
                </div>
                <button onClick={() => removeCoordinator(c.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: 18, padding: 4 }}>×</button>
              </div>
            ))}

            {showAddCoord && (
              <div className="card" style={{ marginTop: 14, borderColor: 'var(--accent)' }}>
                <div className="section-label">Новый координатор</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                  <input className="input" placeholder="ФИО *" value={newCoord.fullName}
                    onChange={(e) => setNewCoord({ ...newCoord, fullName: e.target.value })} />
                  <input className="input" placeholder="Telegram username (без @) *" value={newCoord.telegramUsername}
                    onChange={(e) => setNewCoord({ ...newCoord, telegramUsername: e.target.value })} />
                  <select className="input" value={newCoord.role} onChange={(e) => setNewCoord({ ...newCoord, role: e.target.value })}>
                    <option value="COORDINATOR">Координатор</option>
                    <option value="DEPUTY">Заместитель</option>
                    <option value="SECRETARY">Секретарь</option>
                    <option value="DEAN">Мама ФКП</option>
                    <option value="CHAIRMAN">Председатель</option>
                  </select>
                  <input className="input" placeholder="Сектор (необязательно)" value={newCoord.sector}
                    onChange={(e) => setNewCoord({ ...newCoord, sector: e.target.value })} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} disabled={submitting} onClick={addCoordinator}>Добавить</button>
                  <button className="btn btn-ghost" onClick={() => setShowAddCoord(false)}>Отмена</button>
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'students' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div className="section-label" style={{ marginBottom: 0 }}>Студенты ({students.length})</div>
              <button onClick={() => setShowAddStudent(true)}
                style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                + Добавить
              </button>
            </div>

            {students.map((s, i) => (
              <div key={s.id} className="card" style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', animation: `fadeIn 0.2s ease ${i * 0.04}s both` }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{s.fullName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>гр. {s.groupNumber} · ст. {s.studentCardNumber}</div>
                </div>
                <button onClick={() => removeStudent(s.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: 18, padding: 4 }}>×</button>
              </div>
            ))}

            {showAddStudent && (
              <div className="card" style={{ marginTop: 14, borderColor: 'var(--accent)' }}>
                <div className="section-label">Новый студент</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                  <input className="input" placeholder="ФИО *" value={newStudent.fullName}
                    onChange={(e) => setNewStudent({ ...newStudent, fullName: e.target.value })} />
                  <input className="input" placeholder="Номер группы *" value={newStudent.groupNumber}
                    onChange={(e) => setNewStudent({ ...newStudent, groupNumber: e.target.value })} />
                  <input className="input" placeholder="Номер студенческого *" value={newStudent.studentCardNumber}
                    onChange={(e) => setNewStudent({ ...newStudent, studentCardNumber: e.target.value })} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} disabled={submitting} onClick={addStudent}>Добавить</button>
                  <button className="btn btn-ghost" onClick={() => setShowAddStudent(false)}>Отмена</button>
                </div>
              </div>
            )}
          </>
        )}
        <div style={{ height: 20 }} />
      </div>
    </div>
  );
}
