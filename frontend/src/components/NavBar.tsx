import React from 'react';
import { Coordinator, Tab } from '../App';

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
  coordinator: Coordinator;
}

const baseTabs: { id: Tab; icon: string; label: string }[] = [
  { id: 'sector', icon: '◈', label: '' },
  { id: 'exemptions', icon: '◎', label: 'Освобождения' },
  { id: 'home', icon: '⌂', label: 'Главная' },
  { id: 'bonuses', icon: '◇', label: 'Премии' },
  { id: 'events', icon: '☰', label: 'Мероприятия' },
];

export default function NavBar({ active, onChange, coordinator }: Props) {
  const isAdmin = coordinator.role === 'CHAIRMAN' || coordinator.role === 'DEPUTY' || coordinator.role === 'DEAN' || coordinator.role === 'SECRETARY';

  const canSeePetitions = isAdmin;

  const finalTabs = [
    ...baseTabs.map((t) => {
      if (t.id === 'sector') {
        return { ...t, label: isAdmin ? 'Студсовет' : 'Сектор' };
      }
      return t;
    }),
    ...(canSeePetitions ? [{ id: 'petitions' as Tab, icon: '✎', label: 'Ходатайства' }] : []),
  ];

  return (
    <nav style={{
      height: 'calc(var(--nav-height) + var(--safe-bottom))',
      paddingBottom: 'var(--safe-bottom)',
      background: 'var(--bg-card)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'stretch',
      position: 'relative',
      zIndex: 100,
      flexShrink: 0,
    }}>
      {finalTabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: active === t.id ? 'var(--accent)' : 'var(--text-muted)',
            transition: 'color 0.18s',
            padding: '8px 0',
          }}
        >
          <span style={{
            fontSize: t.id === 'home' ? 20 : 18,
            lineHeight: 1,
            filter: active === t.id ? 'none' : 'grayscale(1) opacity(0.5)',
          }}>
            {t.icon}
          </span>
          <span style={{
            fontSize: 9,
            fontWeight: active === t.id ? 600 : 400,
            letterSpacing: '0.02em',
          }}>
            {t.label}
          </span>
          {active === t.id && (
            <span style={{
              position: 'absolute',
              top: 0,
              width: 32,
              height: 2,
              background: 'var(--accent)',
              borderRadius: '0 0 2px 2px',
            }} />
          )}
        </button>
      ))}
    </nav>
  );
}
