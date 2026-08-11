import React, { useState } from 'react';

interface Props {
  onLogin: (student: any) => void;
}

export default function StudentLoginPage({ onLogin }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [groupNumber, setGroupNumber] = useState('');
  const [studentCardNumber, setStudentCardNumber] = useState('');
  const [budgetStatus, setBudgetStatus] = useState<'BUDGET' | 'PAID'>('BUDGET');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!telegramUsername) return;
    setLoading(true);
    setError('');
    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const res = await fetch('/api/auth/student-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramUsername, initData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem('student', JSON.stringify(data.student));
      onLogin(data.student);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName || !studentCardNumber || !telegramUsername || !groupNumber) return;
    if (!agreed) { setError('Необходимо согласие с условиями'); return; }
    setLoading(true);
    setError('');
    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const res = await fetch('/api/auth/student-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, studentCardNumber, telegramUsername, groupNumber, budgetStatus, initData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem('student', JSON.stringify(data.student));
      onLogin(data.student);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <img src="/fcad.svg" alt="ФКад" style={{ width: 80, height: 80, marginBottom: 16, filter: 'drop-shadow(0 2px 12px rgba(123,110,246,0.3))' }} />
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Вход для студентов</h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, textAlign: 'center' }}>
        {mode === 'login'
          ? 'Введите ваш Telegram username для входа'
          : 'Заполните данные для регистрации'}
      </p>

      {mode === 'login' ? (
        <form onSubmit={handleLogin} style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input className="input" placeholder="Telegram username (@...)" value={telegramUsername}
            onChange={(e) => setTelegramUsername(e.target.value)} />
          {error && <div style={{ color: 'var(--error)', fontSize: 13, textAlign: 'center' }}>{error}</div>}
          <button className="btn btn-primary" disabled={loading || !telegramUsername} type="submit">
            {loading ? '...' : 'Войти'}
          </button>
          <button onClick={() => { setMode('register'); setError(''); }}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, marginTop: 4 }}>
            Нет аккаунта? Зарегистрироваться
          </button>
        </form>
      ) : (
        <form onSubmit={handleRegister} style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input className="input" placeholder="ФИО полностью (как в студенческом)" value={fullName}
            onChange={(e) => setFullName(e.target.value)} />
          <input className="input" placeholder="Номер группы (напр. 518101)" value={groupNumber}
            onChange={(e) => setGroupNumber(e.target.value)} />
          <input className="input" placeholder="Номер студенческого билета" value={studentCardNumber}
            onChange={(e) => setStudentCardNumber(e.target.value)} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setBudgetStatus('BUDGET')}
              style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                background: budgetStatus === 'BUDGET' ? 'var(--accent)' : 'var(--bg-raised)',
                color: budgetStatus === 'BUDGET' ? 'white' : 'var(--text)',
                fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              Бюджет
            </button>
            <button type="button" onClick={() => setBudgetStatus('PAID')}
              style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                background: budgetStatus === 'PAID' ? 'var(--accent)' : 'var(--bg-raised)',
                color: budgetStatus === 'PAID' ? 'white' : 'var(--text)',
                fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              Платное
            </button>
          </div>
          <input className="input" placeholder="Telegram username (@...)" value={telegramUsername}
            onChange={(e) => setTelegramUsername(e.target.value)} />
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
              style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0 }} />
            <span>В случае некорректно введённых данных, разработчики ФКадБот не несут ответственности за дальнейшие проблемы</span>
          </label>
          {error && <div style={{ color: 'var(--error)', fontSize: 13, textAlign: 'center' }}>{error}</div>}
          <button className="btn btn-primary" disabled={loading || !fullName || !studentCardNumber || !telegramUsername || !groupNumber || !agreed} type="submit">
            {loading ? '...' : 'Зарегистрироваться'}
          </button>
          <button onClick={() => { setMode('login'); setError(''); }}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, marginTop: 4 }}>
            Уже зарегистрированы? Войти
          </button>
        </form>
      )}
    </div>
  );
}
