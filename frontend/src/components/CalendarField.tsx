import React, { useEffect, useRef, useState } from 'react';

interface Props {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
}

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function toISO(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export default function CalendarField({ value, onChange, placeholder = 'Выберите дату' }: Props) {
  const [open, setOpen] = useState(false);
  const parsed = value ? new Date(`${value}T00:00:00`) : null;
  const today = new Date();
  const [viewYear, setViewYear] = useState((parsed || today).getFullYear());
  const [viewMonth, setViewMonth] = useState((parsed || today).getMonth());
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  function openCalendar() {
    const base = value ? new Date(`${value}T00:00:00`) : new Date();
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
    setOpen(!open);
  }

  function shiftMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setViewMonth(m);
    setViewYear(y);
  }

  const firstDay = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday-first
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const isToday = (d: number) =>
    today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === d;
  const isSelected = (d: number) =>
    !!parsed && parsed.getFullYear() === viewYear && parsed.getMonth() === viewMonth && parsed.getDate() === d;

  const display = parsed
    ? `${parsed.getDate()} ${MONTHS_GEN[parsed.getMonth()]} ${parsed.getFullYear()}`
    : '';

  const navBtnStyle: React.CSSProperties = {
    width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--bg-raised)', color: 'var(--text)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
  };

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button type="button" className="input" onClick={openCalendar}
        style={{
          width: '100%', minHeight: 48, textAlign: 'left', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          color: display ? 'var(--text)' : 'var(--text-muted)',
        }}>
        <span>{display || placeholder}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.6, flexShrink: 0 }}>
          <rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
          <path d="M3 9.5H21" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 3V6.5M16 3V6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 50,
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
          padding: 12, boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
          animation: 'scaleIn 0.15s ease both',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <button type="button" onClick={() => shiftMonth(-1)} style={navBtnStyle}>‹</button>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{MONTHS[viewMonth]} {viewYear}</div>
            <button type="button" onClick={() => shiftMonth(1)} style={navBtnStyle}>›</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {WEEKDAYS.map(w => (
              <div key={w} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', padding: '4px 0' }}>{w}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {cells.map((d, i) => d === null ? <div key={`e${i}`} /> : (
              <button key={d} type="button"
                onClick={() => { onChange(toISO(viewYear, viewMonth, d)); setOpen(false); }}
                style={{
                  aspectRatio: '1', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                  fontWeight: isSelected(d) ? 700 : 500,
                  border: isToday(d) && !isSelected(d) ? '1px solid var(--accent)' : '1px solid transparent',
                  background: isSelected(d) ? 'var(--accent)' : 'transparent',
                  color: isSelected(d) ? 'white' : isToday(d) ? 'var(--accent)' : 'var(--text)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.12s ease',
                }}>
                {d}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
            <button type="button"
              onClick={() => { onChange(toISO(today.getFullYear(), today.getMonth(), today.getDate())); setOpen(false); }}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 4 }}>
              Сегодня
            </button>
            {value && (
              <button type="button"
                onClick={() => { onChange(''); setOpen(false); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, padding: 4 }}>
                Очистить
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
