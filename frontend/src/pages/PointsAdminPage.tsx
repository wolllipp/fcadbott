import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Coordinator } from '../App';
import { api } from '../utils/api';

interface Props { coordinator: Coordinator; }

export default function PointsAdminPage({ coordinator }: Props) {
  const [students, setStudents] = useState<any[]>([]);
  const [studentId, setStudentId] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [points, setPoints] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.council.students.list().then(setStudents).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const suggestions = useMemo(() => {
    const q = inputValue.toLowerCase();
    if (!q || studentId) return [];
    return students
      .filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          (s.groupNumber && s.groupNumber.toLowerCase().includes(q)) ||
          (s.studentCardNumber && String(s.studentCardNumber).toLowerCase().includes(q))
      )
      .slice(0, 10);
  }, [inputValue, students, studentId]);

  function selectStudent(s: any) {
    setStudentId(String(s.id));
    setInputValue(s.fullName);
    setOpen(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setInputValue(val);
    if (studentId) setStudentId('');
    setOpen(val.trim().length > 0);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(points);
    if (!studentId || !value || !reason.trim()) return;
    setSaving(true);
    try {
      await api.points.create({
        studentId: Number(studentId),
        points: value,
        type: 'MANUAL_ADJUSTMENT',
        reason: reason.trim(),
        authorId: coordinator.id,
      });
      setStudentId('');
      setInputValue('');
      setPoints('');
      setReason('');
      alert(value > 0 ? 'Баллы начислены' : 'Баллы сняты');
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="page-scroll" style={{ padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Дополнительные баллы</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 18 }}>
        Положительное значение начисляет баллы, отрицательное — снимает. Студент получит уведомление в Telegram.
      </p>
      <form className="card" onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 520 }}>
        <div className="section-label">Студент</div>
        <div ref={wrapperRef} style={{ position: 'relative' }}>
          <input
            className="input"
            placeholder={loading ? 'Загрузка...' : 'Поиск по ФИО, группе или номеру студенческого...'}
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => { if (inputValue.trim().length > 0 && !studentId) setOpen(true); }}
            disabled={loading}
            autoComplete="off"
          />
          {open && suggestions.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
              marginTop: 4, background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              maxHeight: 260, overflowY: 'auto',
            }}>
              {suggestions.map((s) => (
                <div
                  key={s.id}
                  className="chip"
                  onClick={() => selectStudent(s)}
                  style={{ cursor: 'pointer', borderRadius: 0, border: 'none', borderLeft: '3px solid transparent' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 1 }}>{s.fullName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>гр. {s.groupNumber || '—'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="section-label">Количество баллов</div>
        <input className="input" type="number" placeholder="Например, 10 или -5" value={points} onChange={(e) => setPoints(e.target.value)} />
        <div className="section-label">Причина</div>
        <textarea className="input" rows={3} placeholder="За что начислить или снять баллы" value={reason} onChange={(e) => setReason(e.target.value)} style={{ resize: 'none' }} />
        <button className="btn btn-primary" type="submit" disabled={saving || !studentId || !points || !reason.trim()}>
          {saving ? 'Сохранение...' : 'Применить баллы'}
        </button>
      </form>
    </div>
  );
}
