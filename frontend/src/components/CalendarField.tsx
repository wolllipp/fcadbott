import React, { useEffect, useRef, useState } from 'react';

interface Props {
  value: string; // YYYY-MM-DD or YYYY-MM-DDTHH:MM
  onChange: (value: string) => void;
  placeholder?: string;
  includeTime?: boolean;
}

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function toISO(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parseDateTime(v: string): { dateStr: string; hour: number; minute: number } {
  if (!v) return { dateStr: '', hour: 0, minute: 0 };
  const parts = v.split('T');
  if (parts.length === 2) {
    const [hh, mm] = parts[1].split(':').map(Number);
    return { dateStr: parts[0], hour: hh || 0, minute: mm || 0 };
  }
  return { dateStr: v, hour: 0, minute: 0 };
}

export default function CalendarField({ value, onChange, placeholder = 'Выберите дату', includeTime = false }: Props) {
  const [open, setOpen] = useState(false);
  const { dateStr, hour: initHour, minute: initMinute } = parseDateTime(value);
  const parsed = dateStr ? new Date(`${dateStr}T00:00:00`) : null;
  const today = new Date();
  const [viewYear, setViewYear] = useState((parsed || today).getFullYear());
  const [viewMonth, setViewMonth] = useState((parsed || today).getMonth());
  const [selectedHour, setSelectedHour] = useState(initHour);
  const [selectedMinute, setSelectedMinute] = useState(initMinute);
  const [dateSelected, setDateSelected] = useState(!!dateStr);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  useEffect(() => {
    if (open) {
      const { dateStr: ds, hour, minute } = parseDateTime(value);
      if (ds) {
        const d = new Date(`${ds}T00:00:00`);
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      } else {
        setViewYear(today.getFullYear());
        setViewMonth(today.getMonth());
      }
      setSelectedHour(hour);
      setSelectedMinute(minute);
      setDateSelected(!!ds);
    }
  }, [open, value]);

  function openCalendar() {
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

  function handleDayClick(d: number) {
    setDateSelected(true);
    if (!includeTime) {
      onChange(toISO(viewYear, viewMonth, d));
      setOpen(false);
    }
  }

  function handleTimeDone() {
    const hh = String(selectedHour).padStart(2, '0');
    const mm = String(selectedMinute).padStart(2, '0');
    onChange(`${toISO(viewYear, viewMonth, 1)}T${hh}:${mm}`);
    setOpen(false);
  }

  function handleToday() {
    if (includeTime) {
      setDateSelected(true);
    } else {
      onChange(toISO(today.getFullYear(), today.getMonth(), today.getDate()));
      setOpen(false);
    }
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
    ? includeTime
      ? `${parsed.getDate()} ${MONTHS_GEN[parsed.getMonth()]} ${parsed.getFullYear()}, ${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`
      : `${parsed.getDate()} ${MONTHS_GEN[parsed.getMonth()]} ${parsed.getFullYear()}`
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
                onClick={() => handleDayClick(d)}
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

          {includeTime && dateSelected && (
            <div style={{ borderTop: '1px solid var(--border)', marginTop: 10, paddingTop: 10 }}>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 4 }}>
                <div style={{ height: 120, overflowY: 'auto', flex: 1, borderRadius: 8, background: 'var(--bg-raised)', border: '1px solid var(--border)', scrollSnapType: 'y mandatory', scrollbarWidth: 'none' }}>
                  {Array.from({ length: 24 }, (_, i) => i).map(h => (
                    <div key={h} onClick={() => setSelectedHour(h)} style={{
                      height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, fontWeight: selectedHour === h ? 700 : 400,
                      color: selectedHour === h ? 'var(--accent)' : 'var(--text)',
                      background: selectedHour === h ? 'var(--accent-dim)' : 'transparent',
                      borderRadius: 6, cursor: 'pointer', scrollSnapAlign: 'center',
                    }}>{String(h).padStart(2, '0')}</div>
                  ))}
                </div>
                <span style={{ fontSize: 18, alignSelf: 'center', fontWeight: 700, color: 'var(--text)' }}>:</span>
                <div style={{ height: 120, overflowY: 'auto', flex: 1, borderRadius: 8, background: 'var(--bg-raised)', border: '1px solid var(--border)', scrollSnapType: 'y mandatory', scrollbarWidth: 'none' }}>
                  {Array.from({ length: 12 }, (_, i) => i * 5).map(m => (
                    <div key={m} onClick={() => setSelectedMinute(m)} style={{
                      height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, fontWeight: selectedMinute === m ? 700 : 400,
                      color: selectedMinute === m ? 'var(--accent)' : 'var(--text)',
                      background: selectedMinute === m ? 'var(--accent-dim)' : 'transparent',
                      borderRadius: 6, cursor: 'pointer', scrollSnapAlign: 'center',
                    }}>{String(m).padStart(2, '0')}</div>
                  ))}
                </div>
              </div>
              <button type="button" onClick={handleTimeDone}
                style={{ width: '100%', marginTop: 10, padding: '8px 0', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Готово
              </button>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
            <button type="button"
              onClick={handleToday}
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
