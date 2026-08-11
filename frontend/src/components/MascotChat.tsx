import React, { useState } from 'react';

interface FAQItem {
  q: string;
  a: string;
}

const FAQ: FAQItem[] = [
  { q: 'Что такое баллы?', a: 'Баллы начисляются за посещение и организацию мероприятий. За каждое посещение — от 5 до 20 баллов.' },
  { q: 'Сколько нужно баллов?', a: 'Для подачи ходатайства нужно набрать минимум 100 баллов.' },
  { q: 'Как подать ходатайство?', a: 'Откройте вкладку «Мероприятия» и нажмите кнопку «Подать ходатайство», когда наберёте 100+ баллов.' },
  { q: 'Как записаться на мероприятие?', a: 'На вкладке «Мероприятия» нажмите «+ Записаться» рядом с интересующим мероприятием.' },
  { q: 'Как отмечается посещение?', a: 'Покажите QR-код организатору на мероприятии. Он отсканирует его через вкладку «Сканер».' },
  { q: 'Что такое ходатайство?', a: 'Это официальное обращение студсовета о предоставлении скидки, общежития или профилизации.' },
  { q: 'Как скачать ходатайство?', a: 'После одобрения ходатайства нажмите «Скачать .docx» и распечатайте документ.' },
  { q: 'Кто одобряет ходатайства?', a: 'Председатель студсовета, зам. декана или декан.' },
];

export default function MascotChat() {
  const [open, setOpen] = useState(false);
  const [expandedQ, setExpandedQ] = useState<number | null>(null);

  return (
    <>
      {open && (
        <div style={{
          position: 'fixed',
          bottom: 'calc(var(--nav-height) + var(--safe-bottom) + 100px)',
          right: 16,
          width: 'calc(100% - 32px)',
          maxWidth: 340,
          maxHeight: '60vh',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          zIndex: 960,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          animation: 'chatSlideUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}>
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'var(--accent-dim)',
          }}>
            <img src="/fcad.svg" alt="" style={{ width: 32, height: 32 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>ФКад</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Помощник студсовета</div>
            </div>
            <button onClick={() => setOpen(false)} style={{
              marginLeft: 'auto', width: 28, height: 28, borderRadius: '50%',
              background: 'var(--bg-raised)', border: '1px solid var(--border)',
              color: 'var(--text-muted)', fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10, padding: '0 4px' }}>
              Чем могу помочь? Выберите вопрос:
            </div>
            {FAQ.map((item, i) => (
              <div key={i} style={{ marginBottom: 6 }}>
                <button
                  onClick={() => setExpandedQ(expandedQ === i ? null : i)}
                  style={{
                    width: '100%', textAlign: 'left',
                    padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                    background: expandedQ === i ? 'var(--accent-dim)' : 'var(--bg-raised)',
                    border: `1px solid ${expandedQ === i ? 'var(--accent)' : 'var(--border)'}`,
                    color: expandedQ === i ? 'var(--accent)' : 'var(--text)',
                    fontSize: 13, fontWeight: 500, cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {item.q}
                </button>
                {expandedQ === i && (
                  <div style={{
                    padding: '8px 12px',
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                    animation: 'fadeIn 0.15s ease',
                  }}>
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'fixed',
          bottom: 'calc(var(--nav-height) + var(--safe-bottom) + 12px)',
          right: 16,
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          zIndex: 960,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
        }}
      >
        <img src="/fcad.svg" alt="ФКад" style={{ width: 56, height: 56, filter: 'drop-shadow(0 2px 8px rgba(123,110,246,0.3))' }} />
      </button>
    </>
  );
}
