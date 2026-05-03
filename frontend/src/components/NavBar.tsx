import React from 'react';
import { Tab } from '../App';

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const tabs: { id: Tab; icon: string; label: string }[] = [
  { id: 'home', icon: '⌂', label: 'Главная' },
  { id: 'exemptions', icon: '📋', label: 'Освобождения' },
  { id: 'bonuses', icon: '★', label: 'Премии' },
];

export default function NavBar({ active, onChange }: Props) {
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
      {tabs.map((t) => (
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
            fontSize: 10,
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
