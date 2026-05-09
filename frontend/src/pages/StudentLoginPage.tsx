import React, { useState } from 'react';

interface Props {
  onLogin: (student: any) => void;
}

export default function StudentLoginPage({ onLogin }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [studentCardNumber, setStudentCardNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    if (!fullName || !studentCardNumber || !telegramUsername) return;
    setLoading(true);
    setError('');
    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const res = await fetch('/api/auth/student-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, studentCardNumber, telegramUsername, initData }),
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
      <div style={{ fontSize: 48, marginBottom: 16 }}>◈</div>
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
          <input className="input" placeholder="ФИО полностью" value={fullName}
            onChange={(e) => setFullName(e.target.value)} />
          <input className="input" placeholder="Номер студенческого билета" value={studentCardNumber}
            onChange={(e) => setStudentCardNumber(e.target.value)} />
          <input className="input" placeholder="Telegram username (@...)" value={telegramUsername}
            onChange={(e) => setTelegramUsername(e.target.value)} />
          {error && <div style={{ color: 'var(--error)', fontSize: 13, textAlign: 'center' }}>{error}</div>}
          <button className="btn btn-primary" disabled={loading || !fullName || !studentCardNumber || !telegramUsername} type="submit">
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
