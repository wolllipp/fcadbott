import React, { useState, useEffect } from 'react';
import { Coordinator } from '../App';
import { api } from '../utils/api';

interface Stats {
  students: number;
  coordinators: number;
  events: number;
  activeEvents: number;
  applications: { total: number; pending: number; approved: number };
  points: { totalAwarded: number; activeStudents: number };
  pendingPetitions: number;
  pendingExemptions: number;
}

interface TopStudent {
  rank: number;
  student: { id: number; fullName: string; groupNumber: string } | null;
  totalPoints: number;
  transactionsCount: number;
}

interface ActivityItem {
  type: string;
  action: string;
  student: string;
  group: string;
  event?: string;
  points?: number;
  date: string;
}

function fmtDate(d: string) {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
}

const ACTION_ICONS: Record<string, string> = {
  application: '▣',
  points: '★',
  exemption: '✎',
};

export default function AdminStatsPage({ coordinator }: { coordinator: Coordinator }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [topStudents, setTopStudents] = useState<TopStudent[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'rating' | 'activity'>('overview');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [s, top, act] = await Promise.all([
          api.admin.stats(),
          api.admin.topStudents(15),
          api.admin.recentActivity(20),
        ]);
        setStats(s);
        setTopStudents(top);
        setActivity(act);
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Загрузка...
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px 16px 0' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Статистика</h1>
        <div style={{ display: 'flex', gap: 6 }}>
          {([
            { id: 'overview' as const, label: 'Обзор' },
            { id: 'rating' as const, label: 'Рейтинг' },
            { id: 'activity' as const, label: 'Активность' },
          ]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: '8px', borderRadius: 8, border: 'none',
              background: tab === t.id ? 'var(--accent)' : 'var(--bg-raised)',
              color: tab === t.id ? 'white' : 'var(--text)',
              fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="page-scroll" style={{ padding: '12px 16px' }}>
        {tab === 'overview' && stats && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Студентов', value: stats.students, color: 'var(--text)' },
                { label: 'Координаторов', value: stats.coordinators, color: 'var(--text)' },
                { label: 'Мероприятий', value: stats.events, color: 'var(--text)' },
                { label: 'Активных', value: stats.activeEvents, color: 'var(--success)' },
              ].map(item => (
                <div key={item.label} className="card" style={{ textAlign: 'center', padding: '14px 8px' }}>
                  <div style={{ fontSize: 26, fontWeight: 700, color: item.color, marginBottom: 4 }}>{item.value}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{item.label}</div>
                </div>
              ))}
            </div>

            <div className="card">
              <div className="section-label">Заявки</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Всего</span>
                <span style={{ fontWeight: 600 }}>{stats.applications.total}</span>
              </div>
              <div style={{ height: 1, background: 'var(--border)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>На рассмотрении</span>
                <span className={`badge ${stats.applications.pending > 0 ? 'badge-yellow' : 'badge-gray'}`}>{stats.applications.pending}</span>
              </div>
              <div style={{ height: 1, background: 'var(--border)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Одобрено</span>
                <span className="badge badge-green">{stats.applications.approved}</span>
              </div>
            </div>

            <div className="card">
              <div className="section-label">Баллы</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Всего начислено</span>
                <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{stats.points.totalAwarded}</span>
              </div>
              <div style={{ height: 1, background: 'var(--border)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Студентов с баллами</span>
                <span style={{ fontWeight: 600 }}>{stats.points.activeStudents}</span>
              </div>
            </div>

            <div className="card">
              <div className="section-label">Ожидают</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Ходатайства</span>
                <span className={`badge ${stats.pendingPetitions > 0 ? 'badge-yellow' : 'badge-gray'}`}>{stats.pendingPetitions}</span>
              </div>
              <div style={{ height: 1, background: 'var(--border)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Освобождения</span>
                <span className={`badge ${stats.pendingExemptions > 0 ? 'badge-yellow' : 'badge-gray'}`}>{stats.pendingExemptions}</span>
              </div>
            </div>
          </div>
        )}

        {tab === 'rating' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topStudents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                Пока нет данных о баллах
              </div>
            ) : (
              topStudents.map((item, i) => (
                <div key={item.student?.id || i} className="card" style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  animation: `fadeIn 0.2s ease ${i * 0.03}s both`,
                  borderColor: i < 3 ? 'var(--accent-dim)' : undefined,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700,
                    background: i === 0 ? 'linear-gradient(135deg, #FFD700, #FFA500)' : i === 1 ? 'linear-gradient(135deg, #C0C0C0, #A0A0A0)' : i === 2 ? 'linear-gradient(135deg, #CD7F32, #A0522D)' : 'var(--bg-raised)',
                    color: i < 3 ? 'white' : 'var(--text-muted)',
                  }}>
                    {item.rank}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{item.student?.fullName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>гр. {item.student?.groupNumber}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--accent)' }}>{item.totalPoints}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.transactionsCount} нач.</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'activity' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {activity.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                Пока нет активности
              </div>
            ) : (
              activity.map((item, i) => (
                <div key={i} className="card" style={{
                  padding: '10px 14px',
                  animation: `fadeIn 0.2s ease ${i * 0.02}s both`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ fontSize: 18, marginTop: 1 }}>{ACTION_ICONS[item.type] || '•'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13 }}>
                        <span style={{ fontWeight: 600 }}>{item.student}</span>
                        <span style={{ color: 'var(--text-muted)' }}> {item.group} </span>
                        <span style={{ color: 'var(--text-secondary)' }}>{item.action}</span>
                        {item.event && <span style={{ color: 'var(--accent)' }}> — {item.event}</span>}
                        {item.points != null && <span style={{ color: 'var(--accent)', fontWeight: 600 }}> +{item.points} б.</span>}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{fmtDate(item.date)}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
