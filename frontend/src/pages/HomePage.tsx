import React from 'react';
import { Coordinator, Tab } from '../App';

const ROLE_LABEL: Record<string, string> = {
  CHAIRMAN: 'Председатель',
  DEPUTY: 'Заместитель председателя',
  SECRETARY: 'Секретарь',
  COORDINATOR: 'Координатор',
};

interface Props {
  coordinator: Coordinator;
  onNavigate: (tab: Tab) => void;
}

export default function HomePage({ coordinator, onNavigate }: Props) {
  const now = new Date();
  const greeting =
    now.getHours() < 12 ? 'Доброе утро' :
    now.getHours() < 18 ? 'Добрый день' : 'Добрый вечер';

  const isChairman = coordinator.role === 'CHAIRMAN' || coordinator.role === 'DEPUTY';
  const day = now.getDate();
  const bonusOpen = day >= 20;

  return (
    <div className="page-scroll">
      <div style={{ padding: '24px 16px 0' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }} className="animate-in">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginBottom: 20,
          }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: 'var(--accent-dim)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
              border: '1px solid rgba(123,110,246,0.3)',
            }}>
              🎓
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                СС ФКП БГУИР
              </div>
              <div style={{ fontWeight: 700, fontSize: 18, lineHeight: 1.2 }}>
                {greeting}!
              </div>
            </div>
          </div>

          {/* Profile card */}
          <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute',
              top: -20,
              right: -20,
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: 'var(--accent-dim)',
              filter: 'blur(30px)',
            }} />
            <div style={{ position: 'relative' }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
                {ROLE_LABEL[coordinator.role] || coordinator.role}
              </div>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 2 }}>
                {coordinator.fullName}
              </div>
              {coordinator.sector && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  marginTop: 8,
                  background: 'var(--accent-dim)',
                  color: 'var(--accent)',
                  padding: '4px 10px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                }}>
                  <span>◈</span> {coordinator.sector} направление
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ marginBottom: 24 }} className="animate-in" >
          <div className="section-label">Быстрые действия</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button
              onClick={() => onNavigate('exemptions')}
              className="card"
              style={{
                cursor: 'pointer',
                border: '1px solid var(--border)',
                textAlign: 'left',
                transition: 'all 0.18s',
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = '')}
            >
              <div style={{ fontSize: 28, marginBottom: 10 }}>📋</div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>Освобождение</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Выставить на текущей неделе</div>
            </button>

            <button
              onClick={() => onNavigate('bonuses')}
              className="card"
              style={{
                cursor: 'pointer',
                border: `1px solid ${bonusOpen ? 'rgba(123,110,246,0.3)' : 'var(--border)'}`,
                textAlign: 'left',
                transition: 'all 0.18s',
                background: bonusOpen ? 'rgba(123,110,246,0.06)' : 'var(--bg-card)',
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = '')}
            >
              <div style={{ fontSize: 28, marginBottom: 10 }}>★</div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>Премирование</div>
              <div style={{ fontSize: 12, color: bonusOpen ? 'var(--accent)' : 'var(--text-muted)' }}>
                {bonusOpen ? '✓ Подача открыта' : `Откроется с 20-го`}
              </div>
            </button>
          </div>
        </div>

        {/* Status */}
        <div className="animate-in">
          <div className="section-label">Статус</div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Подача премий</span>
              <span className={`badge ${bonusOpen ? 'badge-green' : 'badge-gray'}`}>
                {bonusOpen ? '● Открыта' : '○ Закрыта'}
              </span>
            </div>
            <div style={{ height: 1, background: 'var(--border)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Освобождения</span>
              <span className="badge badge-green">● Всегда открыто</span>
            </div>
            {isChairman && (
              <>
                <div style={{ height: 1, background: 'var(--border)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Роль</span>
                  <span className="badge badge-accent">Расширенный доступ</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ height: 20 }} />
      </div>
    </div>
  );
}
