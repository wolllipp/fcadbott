import React, { useState } from 'react';

export interface Student {
  id: number;
  fullName: string;
  groupNumber: string;
  studentCardNumber: string;
  sectors: string[];
}

export interface ExternalStudent {
  fullName: string;
  groupNumber: string;
  studentCardNumber: string;
}

interface Props {
  students: Student[];
  selectedIds: number[];
  externalStudents: ExternalStudent[];
  onToggle: (id: number) => void;
  onExternalChange: (students: ExternalStudent[]) => void;
  alreadyExemptedIds?: number[];
}

export default function StudentPicker({ students, selectedIds, externalStudents, onToggle, onExternalChange, alreadyExemptedIds = [] }: Props) {
  const [search, setSearch] = useState('');
  const [showExternal, setShowExternal] = useState(false);

  const filtered = students.filter((s) =>
    s.fullName.toLowerCase().includes(search.toLowerCase()) ||
    s.groupNumber.includes(search)
  );

  function addExternal() {
    onExternalChange([...externalStudents, { fullName: '', groupNumber: '', studentCardNumber: '' }]);
  }

  function updateExternal(i: number, field: keyof ExternalStudent, value: string) {
    const updated = [...externalStudents];
    updated[i] = { ...updated[i], [field]: value };
    onExternalChange(updated);
  }

  function removeExternal(i: number) {
    onExternalChange(externalStudents.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <input className="input" placeholder="Поиск по имени или группе..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {selectedIds.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '8px 12px', background: 'var(--accent-dim)', borderRadius: 'var(--radius-sm)' }}>
          <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>
            ✓ Выбрано: {selectedIds.length + externalStudents.filter(e => e.fullName).length}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
        {filtered.length === 0 && (
          <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>Студенты не найдены</div>
        )}
        {filtered.map((s) => {
          const selected = selectedIds.includes(s.id);
          const alreadyExempted = alreadyExemptedIds.includes(s.id);
          return (
            <div key={s.id} className={`chip ${selected ? 'selected' : ''}`} onClick={() => onToggle(s.id)}
              style={{ opacity: alreadyExempted && !selected ? 0.7 : 1 }}>
              <div className="chip-check">
                {selected && <svg width="11" height="9" viewBox="0 0 11 9" fill="none"><path d="M1 4L4 7.5L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 1 }}>{s.fullName}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>гр. {s.groupNumber}</div>
              </div>
              {alreadyExempted && (
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
                  background: 'var(--warning-dim)', color: 'var(--warning)',
                  flexShrink: 0, whiteSpace: 'nowrap',
                }}>
                  уже освобождён
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
        <button onClick={() => setShowExternal(!showExternal)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font)', fontWeight: 500, padding: '4px 0', marginBottom: 12 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 6, background: 'var(--surface)', fontSize: 14, transition: 'transform 0.18s', transform: showExternal ? 'rotate(90deg)' : 'none' }}>›</span>
          Добавить студента не из сектора
        </button>

        {showExternal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {externalStudents.map((ext, i) => (
              <div key={i} className="card" style={{ padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Студент #{i + 1}</span>
                  <button onClick={() => removeExternal(i)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: 16 }}>×</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input className="input" placeholder="ФИО *" value={ext.fullName} onChange={(e) => updateExternal(i, 'fullName', e.target.value)} />
                  <input className="input" placeholder="Номер группы *" value={ext.groupNumber} onChange={(e) => updateExternal(i, 'groupNumber', e.target.value)} />
                  <input className="input" placeholder="Номер студенческого" value={ext.studentCardNumber} onChange={(e) => updateExternal(i, 'studentCardNumber', e.target.value)} />
                </div>
              </div>
            ))}
            <button className="btn btn-ghost" onClick={addExternal} style={{ fontSize: 14 }}>+ Добавить студента</button>
          </div>
        )}
      </div>
    </div>
  );
}
