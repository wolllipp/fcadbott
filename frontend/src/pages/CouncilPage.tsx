import React, { useState, useEffect } from 'react';
import { Coordinator } from '../App';
import { api } from '../utils/api';

type Tab = 'coordinators' | 'students';

interface CouncilProps {
  coordinator: Coordinator;
}

const SECTOR_LABELS: Record<string, string> = {
  'Научное': 'Научное', 'Инструментальное': 'Инструментальное', 'Танцевальное': 'Танцевальное',
  'Театральное': 'Театральное', 'Учебное': 'Учебное', 'Вокальное': 'Вокальное',
  'Культурно-массовое': 'Культурно-массовое', 'Декоративное': 'Декоративное',
  'Спортивное': 'Спортивное', 'Профориентационное': 'Профориентационное', 'Информационное': 'Информационное',
};

const SECTOR_OPTIONS = [
  'Научка', 'Инструментал', 'Танцевальный', 'Театрал', 'Учебный',
  'Вокал', 'Культмассовый', 'Декор', 'Спорт', 'Проф', 'Информ', 'Председ/Зам/Секретарь',
];

const STATUS_OPTIONS = [
  { value: 'BUDGET', label: 'Бюджет' },
  { value: 'PAID', label: 'Платка' },
  { value: 'NO_STIPEND', label: 'Без стипендии' },
];

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
  const [selectedSectors, setSelectedSectors] = useState<Set<string>>(new Set());
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedSectors, setExpandedSectors] = useState<Set<string>>(new Set());

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
      await api.council.students.create({ creatorId: coordinator.id, ...newStudent, sectors: Array.from(selectedSectors) });
      setNewStudent({ fullName: '', groupNumber: '', studentCardNumber: '', budgetStatus: 'BUDGET' });
      setSelectedSectors(new Set());
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

  function toggleSector(sector: string) {
    setExpandedSectors((prev) => {
      const next = new Set(prev);
      if (next.has(sector)) next.delete(sector);
      else next.add(sector);
      return next;
    });
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

  // Group students by sector
  const studentsBySector: Record<string, any[]> = {};
  students.forEach((s) => {
    const sectors = s.sectors && s.sectors.length > 0 ? s.sectors : ['Без сектора'];
    sectors.forEach((sec: string) => {
      if (!studentsBySector[sec]) studentsBySector[sec] = [];
      studentsBySector[sec].push(s);
    });
  });

  const sectorNames = Object.keys(studentsBySector).sort((a, b) => {
    if (a === 'Без сектора') return 1;
    if (b === 'Без сектора') return -1;
    return a.localeCompare(b);
  });

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px 16px 0', flexShrink: 0 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Студсовет</h1>

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
          <div style={{ paddingBottom: 60 }}>
            <div className="section-label" style={{ marginBottom: 10 }}>Координаторы ({coordinators.length})</div>

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
          </div>
        )}

        {tab === 'students' && (
          <div style={{ paddingBottom: 60 }}>
            <div className="section-label" style={{ marginBottom: 10 }}>Студенты ({students.length})</div>

            {sectorNames.map((sectorName, si) => {
              const sectorStudents = studentsBySector[sectorName];
              const isExpanded = expandedSectors.has(sectorName);
              return (
                <div key={sectorName} className="card" style={{ marginBottom: 8, animation: `fadeIn 0.2s ease ${si * 0.04}s both` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => toggleSector(sectorName)}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{sectorName}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sectorStudents.length} студ.</div>
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: 16, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>▾</span>
                  </div>
                  {isExpanded && (
                    <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
                      {sectorStudents.map((s, i) => (
                        <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < sectorStudents.length - 1 ? '1px solid var(--border)' : 'none' }}>
                          <div>
                            <div style={{ fontWeight: 500, fontSize: 13 }}>{s.fullName}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>гр. {s.groupNumber} · ст. {s.studentCardNumber}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                              {s.budgetStatus === 'PAID' ? '🟡 Платка' : s.budgetStatus === 'NO_STIPEND' ? '⚪ Без стипендии' : '🟢 Бюджет'}
                              {s.sectors?.length ? ' · ' + s.sectors.join(', ') : ''}
                            </div>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); removeStudent(s.id); }}
                            style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: 16, padding: 4 }}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {sectorNames.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>Нет студентов</div>
            )}
          </div>
        )}
      </div>

      {/* Sticky bottom bar */}
      <div style={{
        flexShrink: 0, padding: '12px 16px',
        paddingBottom: 'calc(12px + var(--safe-bottom, 0px))',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg)',
      }}>
        {tab === 'coordinators' && (
          <button className="btn btn-primary" onClick={() => setShowAddCoord(true)} style={{ width: '100%' }}>
            + Добавить координатора
          </button>
        )}
        {tab === 'students' && (
          <button className="btn btn-primary" onClick={() => setShowAddStudent(true)} style={{ width: '100%' }}>
            + Добавить студента
          </button>
        )}
      </div>

      {/* Add coordinator modal */}
      {showAddCoord && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 16, animation: 'fadeIn 0.15s ease' }}
          onClick={() => setShowAddCoord(false)}>
          <div className="card" style={{ width: '100%', maxWidth: 360, borderColor: 'var(--accent)', animation: 'scaleIn 0.2s ease' }}
            onClick={(e) => e.stopPropagation()}>
            <div className="section-label" style={{ marginBottom: 12 }}>Новый координатор</div>
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
              <select className="input" value={newCoord.sector}
                onChange={(e) => setNewCoord({ ...newCoord, sector: e.target.value })}>
                <option value="">Сектор (необязательно)</option>
                {SECTOR_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {showStudentPicker && (
                <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10, padding: 4 }}>
                  {students.map((s) => (
                    <div key={s.id} onClick={() => {
                      setNewCoord({ ...newCoord, fullName: s.fullName });
                      setShowStudentPicker(false);
                    }}
                    style={{ padding: '8px 10px', cursor: 'pointer', borderRadius: 6, fontSize: 13 }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-raised)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                      {s.fullName} — гр. {s.groupNumber}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowStudentPicker(!showStudentPicker)}>
                {showStudentPicker ? 'Скрыть' : 'Выбрать из ССА'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} disabled={submitting} onClick={addCoordinator}>Добавить</button>
              <button className="btn btn-ghost" onClick={() => setShowAddCoord(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* Add student modal */}
      {showAddStudent && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 16, animation: 'fadeIn 0.15s ease' }}
          onClick={() => setShowAddStudent(false)}>
          <div className="card" style={{ width: '100%', maxWidth: 360, borderColor: 'var(--accent)', animation: 'scaleIn 0.2s ease' }}
            onClick={(e) => e.stopPropagation()}>
            <div className="section-label" style={{ marginBottom: 12 }}>Новый студент</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              <input className="input" placeholder="ФИО *" value={newStudent.fullName}
                onChange={(e) => setNewStudent({ ...newStudent, fullName: e.target.value })} />
              <input className="input" placeholder="Номер группы *" value={newStudent.groupNumber}
                onChange={(e) => setNewStudent({ ...newStudent, groupNumber: e.target.value })} />
              <input className="input" placeholder="Номер студенческого *" value={newStudent.studentCardNumber}
                onChange={(e) => setNewStudent({ ...newStudent, studentCardNumber: e.target.value })} />
              <select className="input" value={newStudent.budgetStatus}
                onChange={(e) => setNewStudent({ ...newStudent, budgetStatus: e.target.value })}>
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {SECTOR_OPTIONS.map((sec) => {
                  const checked = selectedSectors.has(sec);
                  return (
                    <div key={sec} onClick={() => {
                      const next = new Set(selectedSectors);
                      next.has(sec) ? next.delete(sec) : next.add(sec);
                      setSelectedSectors(next);
                    }}
                    style={{
                      padding: '6px 10px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                      background: checked ? 'var(--accent-dim)' : 'var(--bg-raised)',
                      border: checked ? '1px solid var(--accent)' : '1px solid var(--border)',
                      color: checked ? 'var(--accent)' : 'var(--text-secondary)',
                      fontWeight: checked ? 600 : 400,
                    }}>
                      {sec}
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} disabled={submitting} onClick={addStudent}>Добавить</button>
              <button className="btn btn-ghost" onClick={() => setShowAddStudent(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
