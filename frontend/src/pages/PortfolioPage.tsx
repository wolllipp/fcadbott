import React from 'react';

const projects = [
  {
    name: 'ФКП Студенческий совет',
    desc: 'Telegram Mini App для управления студенческим советом факультета компьютерных технологий. Ходатайства, мероприятия, освобождения, бонусы.',
    tags: ['React', 'TypeScript', 'Prisma', 'PostgreSQL', 'Telegram Bot'],
    link: 'https://github.com/wolllipp/fcadbott',
  },
  {
    name: 'Другой проект',
    desc: 'Описание проекта',
    tags: ['Tag1', 'Tag2'],
    link: '#',
  },
];

export default function PortfolioPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f0f13',
      color: '#e4e4e7',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '0 16px',
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '60px 0 80px' }}>
        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8, color: '#fff' }}>
            Иван Скворец
          </h1>
          <p style={{ fontSize: 16, color: '#71717a', marginBottom: 16 }}>
            Fullstack Developer · Chairman of ФКП Student Council
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <a href="https://github.com/wolllipp" target="_blank" rel="noopener" style={linkStyle}>GitHub</a>
            <a href="https://t.me/wolllip" target="_blank" rel="noopener" style={linkStyle}>Telegram</a>
          </div>
        </div>

        {/* About */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={sectionTitle}>О себе</h2>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: '#a1a1aa' }}>
            Разрабатываю Telegram Mini App и backend-системы для студенческого совета ФКП БГУИР.
            Стек: React, TypeScript, Node.js, Prisma, PostgreSQL. Интересуюсь автоматизацией процессов
            и созданием удобных инструментов для организации учебной жизни.
          </p>
        </section>

        {/* Skills */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={sectionTitle}>Технологии</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['TypeScript', 'React', 'Node.js', 'Prisma', 'PostgreSQL', 'Telegram Bot API', 'Docker', 'Git'].map(t => (
              <span key={t} style={{
                padding: '6px 14px',
                borderRadius: 20,
                background: '#1c1c22',
                border: '1px solid #27272a',
                fontSize: 13,
                color: '#a1a1aa',
              }}>{t}</span>
            ))}
          </div>
        </section>

        {/* Projects */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={sectionTitle}>Проекты</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {projects.map(p => (
              <a key={p.name} href={p.link} target="_blank" rel="noopener"
                style={{
                  display: 'block',
                  padding: '20px 24px',
                  borderRadius: 16,
                  background: '#18181b',
                  border: '1px solid #27272a',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'border-color 0.2s, transform 0.2s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#7b6ef6';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#27272a';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6, color: '#fff' }}>{p.name}</div>
                <div style={{ fontSize: 14, color: '#71717a', marginBottom: 12 }}>{p.desc}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {p.tags.map(tag => (
                    <span key={tag} style={{
                      padding: '3px 10px',
                      borderRadius: 12,
                      background: '#27272a',
                      fontSize: 12,
                      color: '#a1a1aa',
                    }}>{tag}</span>
                  ))}
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: 13, color: '#3f3f46' }}>
          © 2026 Иван Скворец
        </div>
      </div>
    </div>
  );
}

const sectionTitle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 600,
  marginBottom: 16,
  color: '#e4e4e7',
};

const linkStyle: React.CSSProperties = {
  padding: '8px 18px',
  borderRadius: 10,
  background: '#1c1c22',
  border: '1px solid #27272a',
  color: '#a1a1aa',
  fontSize: 14,
  textDecoration: 'none',
  transition: 'border-color 0.2s',
};
