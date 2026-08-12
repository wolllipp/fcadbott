import React, { useState } from 'react';

interface Props {
  onLogin: (student: any) => void;
}

const STICKERS: { emoji: string; top?: string; bottom?: string; left?: string; right?: string; size: number; rotate: number; delay: number }[] = [
  { emoji: '🎉', top: '6%', left: '7%', size: 30, rotate: -14, delay: 0 },
  { emoji: '⭐', top: '5%', right: '9%', size: 26, rotate: 12, delay: 0.6 },
  { emoji: '🎓', top: '22%', right: '5%', size: 32, rotate: 18, delay: 1.2 },
  { emoji: '📚', top: '24%', left: '4%', size: 28, rotate: -10, delay: 0.9 },
  { emoji: '🏆', top: '42%', left: '6%', size: 26, rotate: 8, delay: 0.3 },
  { emoji: '🎯', top: '46%', right: '6%', size: 28, rotate: -12, delay: 1.5 },
  { emoji: '💜', bottom: '34%', left: '12%', size: 24, rotate: -16, delay: 0.7 },
  { emoji: '🚀', bottom: '30%', right: '11%', size: 30, rotate: 14, delay: 1.1 },
  { emoji: '✨', bottom: '18%', left: '6%', size: 24, rotate: 10, delay: 1.3 },
  { emoji: '📖', bottom: '14%', right: '7%', size: 26, rotate: -8, delay: 0.4 },
];

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
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Стикеры вокруг */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        {STICKERS.map((s, i) => (
          <span key={i} style={{
            position: 'absolute', top: s.top, bottom: s.bottom, left: s.left, right: s.right,
            fontSize: s.size, opacity: 0.5,
            transform: `rotate(${s.rotate}deg)`,
            animation: `stickerFloat 3.5s ease-in-out ${s.delay}s infinite`,
            filter: 'blur(1.5px) drop-shadow(0 2px 8px rgba(123,110,246,0.25))',
          }}>{s.emoji}</span>
        ))}
      </div>

      {/* Контент */}
      <div style={{
        flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '24px 24px 220px', position: 'relative', zIndex: 2,
      }}>
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
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              <span onClick={(e) => { e.preventDefault(); setAgreed(!agreed); }} style={{
                width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
                background: agreed ? 'var(--accent)' : 'var(--bg-raised)',
                border: agreed ? '1px solid var(--accent)' : '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}>
                {agreed && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ animation: 'checkBounce 0.25s ease' }}>
                    <path d="M2 6.5L4.5 9L10 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span onClick={(e) => { e.preventDefault(); setAgreed(!agreed); }}>
                В случае некорректно введённых данных, разработчики ФКадБот не несут ответственности за дальнейшие проблемы
              </span>
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

      {/* Большой ФКадик, выглядывающий снизу */}
      <img src="/fcad.svg" alt="ФКад" style={{
        position: 'absolute', bottom: -40, left: '50%',
        width: 280, height: 'auto',
        zIndex: 1, pointerEvents: 'none',
        filter: 'drop-shadow(0 -4px 24px rgba(123,110,246,0.35))',
        animation: 'mascotPeek 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both',
      }} />
    </div>
  );
}
