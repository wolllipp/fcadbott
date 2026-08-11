import React, { useState, useEffect } from 'react';
import { Coordinator, Tab } from '../App';
import { api } from '../utils/api';

const ROLE_LABEL: Record<string, string> = {
  CHAIRMAN: 'Председатель студенческого совета',
  DEPUTY: 'Заместитель председателя',
  SECRETARY: 'Секретарь студенческого совета',
  DEAN: 'Мама ФКП',
  COORDINATOR: 'Координатор',
};

function sectorLabel(sector: string | null): string {
  if (!sector) return '';
  return `${sector} направление`;
}

interface Props {
  coordinator: Coordinator;
  onNavigate: (tab: Tab) => void;
}

export default function HomePage({ coordinator, onNavigate }: Props) {
  const now = new Date();
  const greeting =
    now.getHours() < 12 ? 'Доброе утро' :
    now.getHours() < 18 ? 'Добрый день' : 'Добрый вечер';

  const isChairman = coordinator.role === 'CHAIRMAN' || coordinator.role === 'DEPUTY' || coordinator.role === 'DEAN';
  const day = now.getDate();
  const bonusOpen = day >= 20;

  const [stats, setStats] = useState({ students: 0, coordinators: 0, events: 0, pendingPetitions: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [students, coordinators, events, petitions] = await Promise.all([
          api.council.students.list().catch(() => []),
          api.council.coordinators.list().catch(() => []),
          api.events.list().catch(() => []),
          api.petitions.list({ role: coordinator.role }).catch(() => []),
        ]);
        setStats({
          students: students.length,
          coordinators: coordinators.length,
          events: events.length,
          pendingPetitions: petitions.filter((p: any) => p.status === 'PENDING').length,
        });
      } catch (_) {}
      setLoadingStats(false);
    }
    loadStats();
  }, []);

  return (
    <div className="page-scroll">
      <div style={{ padding: '24px 16px 0' }}>
        <div style={{ marginBottom: 28 }} className="animate-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16,
              background: 'var(--accent-dim)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 26, border: '1px solid rgba(123,110,246,0.3)',
              }}>◈</div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                СС ФКП БГУИР
              </div>
              <div style={{ fontWeight: 700, fontSize: 18, lineHeight: 1.2 }}>{greeting}!</div>
            </div>
          </div>

          <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'var(--accent-dim)', filter: 'blur(30px)' }} />
            <div style={{ position: 'relative' }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
                {ROLE_LABEL[coordinator.role] || coordinator.role}
              </div>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 2 }}>
                {coordinator.fullName}
              </div>
              {coordinator.sector && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  marginTop: 8, background: 'var(--accent-dim)', color: 'var(--accent)',
                  padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                }}>
                  <span>◈</span> {sectorLabel(coordinator.sector)}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 24 }} className="animate-in">
          <div className="section-label">Статистика</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { label: 'Студентов', value: stats.students },
              { label: 'Координаторов', value: stats.coordinators },
              { label: 'Мероприятий', value: stats.events },
              { label: 'Ходатайств', value: stats.pendingPetitions, accent: stats.pendingPetitions > 0 },
            ].map((item) => (
              <div key={item.label} className="card" style={{ textAlign: 'center', padding: '14px 8px' }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: item.accent ? 'var(--error)' : 'var(--accent)', marginBottom: 4 }}>
                  {loadingStats ? '...' : item.value}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div className="section-label">Быстрые действия</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button
              onClick={() => onNavigate('exemptions')}
              className="card action-card"
              style={{ animation: 'fadeIn 0.3s ease 0.1s both', border: '1px solid var(--border)', textAlign: 'left' }}
            >
              <div className="icon" style={{ fontSize: 28, marginBottom: 10, display: 'inline-block' }}>◎</div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>Освобождения</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Выставить на текущей неделе</div>
            </button>

            <button
              onClick={() => onNavigate('bonuses')}
              className={`card action-card${bonusOpen ? ' animate-glow-pulse' : ''}`}
              style={{
                animation: 'fadeIn 0.3s ease 0.2s both',
                cursor: 'pointer',
                border: `1px solid ${bonusOpen ? 'var(--accent)' : 'var(--border)'}`,
                textAlign: 'left',
                background: bonusOpen ? 'rgba(123,110,246,0.06)' : 'var(--bg-card)',
              }}
            >
              <div className="icon" style={{ fontSize: 28, marginBottom: 10, display: 'inline-block' }}>◇</div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>Премирование</div>
              <div style={{ fontSize: 12, color: bonusOpen ? 'var(--accent)' : 'var(--text-muted)' }}>
                {bonusOpen ? '✓ Подача открыта' : `Откроется с 20-го`}
              </div>
            </button>
          </div>
        </div>

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
                  <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Уровень доступа</span>
                  <span className="badge badge-accent">Расширенный</span>
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
