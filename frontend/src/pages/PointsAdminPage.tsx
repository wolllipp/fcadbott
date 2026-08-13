import React, { useEffect, useState } from 'react';
import { Coordinator } from '../App';
import { api } from '../utils/api';

interface Props { coordinator: Coordinator; }

export default function PointsAdminPage({ coordinator }: Props) {
  const [students, setStudents] = useState<any[]>([]);
  const [studentId, setStudentId] = useState('');
  const [points, setPoints] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.council.students.list().then(setStudents).catch(() => {}).finally(() => setLoading(false));
  }, []);

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
        <select className="input" value={studentId} onChange={(e) => setStudentId(e.target.value)} disabled={loading}>
          <option value="">Выберите студента</option>
          {students.map((student) => <option key={student.id} value={student.id}>{student.fullName} · гр. {student.groupNumber || '—'}</option>)}
        </select>
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
