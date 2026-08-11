import React, { useState, useRef, useEffect } from 'react';
import { Coordinator, Tab } from '../App';

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
  coordinator: Coordinator;
  pendingPetitions?: number;
}

const menuAnim = `
@keyframes menuFadeIn {
  from { opacity: 0; transform: translateY(12px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes overlayFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
`;

function getTabList(coordinator: Coordinator): { id: Tab; icon: string; label: string }[] {
  const isAdmin = coordinator.role === 'CHAIRMAN' || coordinator.role === 'DEPUTY' || coordinator.role === 'DEAN' || coordinator.role === 'SECRETARY';
  const canSeePetitions = isAdmin;

  const tabs: { id: Tab; icon: string; label: string }[] = [
    { id: 'home', icon: '⌂', label: 'Главная' },
    { id: 'sector', icon: '◈', label: isAdmin ? 'Студсовет' : 'Мой сектор' },
    { id: 'exemptions', icon: '◎', label: 'Освобождения' },
    { id: 'bonuses', icon: '◇', label: 'Премии' },
    { id: 'events', icon: '☰', label: 'Мероприятия' },
    { id: 'applications', icon: '▣', label: 'Заявки' },
    { id: 'scanner', icon: '⊙', label: 'Сканер' },
  ];

  if (canSeePetitions) {
    tabs.push({ id: 'petitions', icon: '✎', label: 'Ходатайства' });
    tabs.push({ id: 'stats', icon: '◎', label: 'Статистика' });
  }

  return tabs;
}

function findTab(tabs: { id: Tab; icon: string; label: string }[], id: Tab) {
  return tabs.find(t => t.id === id);
}

export default function NavBar({ active, onChange, coordinator, pendingPetitions = 0 }: Props) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const tabs = getTabList(coordinator);
  const current = findTab(tabs, active) || tabs[0];

  return (
    <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
      <style>{menuAnim}</style>

      {open && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          zIndex: 998,
          animation: 'overlayFadeIn 0.15s ease',
        }} onClick={() => setOpen(false)} />
      )}

      {open && (
        <div style={{
          position: 'fixed', bottom: 'calc(var(--nav-height) + var(--safe-bottom) + 8px)',
          left: 8, right: 8,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          zIndex: 999,
          padding: 6,
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
          animation: 'menuFadeIn 0.2s ease',
          transformOrigin: 'bottom center',
        }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => { onChange(t.id); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '10px 12px',
                background: active === t.id ? 'var(--accent-dim)' : 'transparent',
                border: 'none', borderRadius: 10,
                color: active === t.id ? 'var(--accent)' : 'var(--text)',
                fontFamily: 'var(--font)', fontSize: 14, fontWeight: active === t.id ? 600 : 400,
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{t.icon}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {t.label}
                {t.id === 'petitions' && pendingPetitions > 0 && (
                  <span style={{
                    background: 'var(--accent)',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 600,
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                  }}>
                    {pendingPetitions}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}

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
        <button
          onClick={() => setOpen(!open)}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text)',
            padding: '8px 16px',
            fontFamily: 'var(--font)',
            fontSize: 15,
            fontWeight: 500,
          }}
        >
          <span style={{ fontSize: 20 }}>{current.icon}</span>
          <span>{current.label}</span>
          <span style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
          }}>▼</span>
        </button>
      </nav>
    </div>
  );
}
