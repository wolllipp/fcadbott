import React, { useState, useEffect } from 'react';

const councilMembers = [
  { name: 'Скворец Иван', role: 'Председатель', sector: 'Студсовет', photo: '/council/Скворец Иван.png' },
  { name: 'Линкевич Алексей', role: 'Зам. председателя', sector: 'Студсовет', photo: '/council/Линкевич Алексей.png' },
  { name: 'Самуйлик Елизавета', role: 'Зам. председателя', sector: 'Студсовет', photo: '/council/Самуйлик Елизавета.png' },
  { name: 'Ларченко Мария', role: 'Секретарь', sector: 'Студсовет', photo: '/council/Ларченко Мария.png' },
  { name: 'Галяк Иван', role: 'Координатор', sector: 'Учебное', photo: '/council/Галяк Иван.png' },
  { name: 'Емельянович Дарья', role: 'Координатор', sector: 'Культурно-массовое', photo: '/council/Емельянович Дарья.png' },
  { name: 'Карпова Анастасия', role: 'Координатор', sector: 'Вокальное', photo: '/council/Карпова Анастасия.png' },
  { name: 'Бобровская Варвара', role: 'Координатор', sector: 'Танцевальное', photo: '/council/Бобровская Варвара.png' },
  { name: 'Цуприк Илья', role: 'Координатор', sector: 'Танцевальное', photo: '/council/Цуприк Илья.png' },
  { name: 'Ковалик Диана', role: 'Координатор', sector: 'Спортивное', photo: '/council/Ковалик Диана.png' },
  { name: 'Шаблинский Александр', role: 'Координатор', sector: 'Инструментальное', photo: '/council/Шаблинский Александр.png' },
  { name: 'Садовский Александр', role: 'Координатор', sector: 'Научное', photo: '/council/Садовский Александр.png' },
  { name: 'Карпекина Ольга', role: 'Координатор', sector: 'Декоративное', photo: '/council/Карпекина Ольга.png' },
  { name: 'Помахо Алеся', role: 'Координатор', sector: 'Профориентационное', photo: '/council/Помахо Алеся.png' },
  { name: 'Шулеев Денис', role: 'Координатор', sector: 'Декоративное', photo: '/council/Шулеев Денис.png' },
];

const administration = [
  { name: 'Будник Артур Владимирович', position: 'Декан', degree: 'к.т.н., доцент', photo: '' },
  { name: 'Котухов Алексей', position: 'Зам. декана', degree: '', photo: '' },
  { name: 'Инна Владимировна', position: 'Декан (ФКТ)', degree: '', photo: '' },
  { name: 'Ларченко Никита', position: 'Зам. декана по воспитательной работе', degree: '', photo: '/council/Ларченко Никита.png' },
];

const recentEvents = [
  { name: 'День первокурсника', date: '2025-09-01', description: 'Торжественная встреча первокурсников ФКП' },
  { name: 'Студенческая весна', date: '2026-03-15', description: 'Фестиваль талантов факультета' },
  { name: 'Научная конференция', date: '2026-04-20', description: 'Ежегодная студенческая научная конференция' },
];

const curators = [
  { name: 'Кафедра компьютерных технологий', description: 'Научное руководство студенческим советом' },
  { name: 'Кафедра программной инженерии', description: 'Совместные проекты и мероприятия' },
];

export default function PortfolioPage() {
  const [activeSection, setActiveSection] = useState('hero');
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/events')
      .then(r => r.json())
      .then(data => {
        const published = data.filter((e: any) => e.status === 'PUBLISHED').slice(0, 3);
        setEvents(published.length > 0 ? published : recentEvents);
      })
      .catch(() => setEvents(recentEvents));
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #12121a 50%, #0a0a0f 100%)',
      color: '#e4e4e7',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Navigation */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: 'rgba(10, 10, 15, 0.9)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 1000,
        padding: '0 20px',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/fcad.svg" alt="ФКП" style={{ height: 36 }} />
            <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>ФКП БГУИР</span>
          </div>
          <div style={{ display: 'flex', gap: 24, fontSize: 14 }}>
            {['О факультете', 'Администрация', 'Студсовет', 'Мероприятия', 'Кураторы'].map(section => (
              <a key={section} href={`#${section.toLowerCase().replace(/\s+/g, '-')}`}
                style={{ color: '#a1a1aa', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={e => (e.currentTarget.style.color = '#a1a1aa')}>
                {section}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="hero" style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '120px 20px 80px',
        background: 'radial-gradient(ellipse at center, rgba(123, 110, 246, 0.1) 0%, transparent 70%)',
      }}>
        <div style={{ maxWidth: 800 }}>
          <img src="/fcad.svg" alt="ФКП БГУИР" style={{ width: 120, marginBottom: 24 }} />
          <h1 style={{ fontSize: 48, fontWeight: 800, marginBottom: 16, color: '#fff', lineHeight: 1.2 }}>
            Факультет компьютерного проектирования
          </h1>
          <p style={{ fontSize: 20, color: '#a1a1aa', marginBottom: 32, lineHeight: 1.6 }}>
            Белорусский государственный университет информатики и радиоэлектроники
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="#студсовет" style={{
              padding: '14px 32px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #7b6ef6, #5a4fcf)',
              color: '#fff',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: 16,
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}>
              Студенческий совет
            </a>
            <a href="https://www.bsuir.by/ru/fkp" target="_blank" rel="noopener" style={{
              padding: '14px 32px',
              borderRadius: 12,
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: 16,
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}>
              Сайт факультета
            </a>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="о-факультете" style={{ padding: '80px 20px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 48 }}>
          <div>
            <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 24, color: '#fff' }}>О факультете</h2>
            <p style={{ fontSize: 16, lineHeight: 1.8, color: '#a1a1aa', marginBottom: 16 }}>
              Факультет компьютерного проектирования (бывший конструкторско-технологический факультет) с 1973 года является одним из инновационных и динамически развивающихся факультетов БГУИР.
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.8, color: '#a1a1aa' }}>
              Факультет готовит специалистов в области компьютерного проектирования, программной инженерии и информационных технологий. Выпускники факультета успешно работают в ведущих IT-компаниях Беларуси и за рубежом.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { number: '50+', label: 'Лет истории' },
              { number: '1000+', label: 'Студентов' },
              { number: '50+', label: 'Преподавателей' },
              { number: '95%', label: 'Трудоустройство' },
            ].map(stat => (
              <div key={stat.label} style={{
                padding: '20px 24px',
                borderRadius: 16,
                background: 'rgba(123, 110, 246, 0.1)',
                border: '1px solid rgba(123, 110, 246, 0.2)',
              }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#7b6ef6', marginBottom: 4 }}>{stat.number}</div>
                <div style={{ fontSize: 14, color: '#a1a1aa' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Administration Section */}
      <section id="администрация" style={{ padding: '80px 20px', background: 'rgba(255, 255, 255, 0.02)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 48, color: '#fff', textAlign: 'center' }}>Администрация</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24 }}>
            {administration.map(person => (
              <div key={person.name} style={{
                padding: '32px 24px',
                borderRadius: 20,
                background: '#18181b',
                border: '1px solid #27272a',
                textAlign: 'center',
                transition: 'transform 0.2s, border-color 0.2s',
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = '#7b6ef6';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = '#27272a';
                }}>
                <div style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #7b6ef6, #5a4fcf)',
                  margin: '0 auto 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 32,
                  color: '#fff',
                }}>
                  {person.name.charAt(0)}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4, color: '#fff' }}>{person.name}</h3>
                <div style={{ fontSize: 14, color: '#7b6ef6', fontWeight: 500, marginBottom: 4 }}>{person.position}</div>
                {person.degree && <div style={{ fontSize: 13, color: '#71717a' }}>{person.degree}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Student Council Section */}
      <section id="студсовет" style={{ padding: '80px 20px', maxWidth: 1200, margin: '0 auto' }}>
        <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 16, color: '#fff', textAlign: 'center' }}>Студенческий совет</h2>
        <p style={{ fontSize: 16, color: '#a1a1aa', textAlign: 'center', marginBottom: 48, maxWidth: 600, margin: '0 auto 48px' }}>
          Организация, объединяющая студентов факультета для реализации творческих, образовательных и социальных проектов
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 20 }}>
          {councilMembers.map(member => (
            <div key={member.name} style={{
              borderRadius: 20,
              background: '#18181b',
              border: '1px solid #27272a',
              overflow: 'hidden',
              transition: 'transform 0.2s, border-color 0.2s',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = '#7b6ef6';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = '#27272a';
              }}>
              <div style={{
                width: '100%',
                height: 200,
                background: '#27272a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}>
                <img src={member.photo} alt={member.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).parentElement!.innerHTML = `
                      <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#7b6ef6,#5a4fcf);color:#fff;font-size:32px;font-weight:700">
                        ${member.name.charAt(0)}
                      </div>
                    `;
                  }} />
              </div>
              <div style={{ padding: '16px' }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, color: '#fff' }}>{member.name}</h3>
                <div style={{ fontSize: 13, color: '#7b6ef6', fontWeight: 500, marginBottom: 2 }}>{member.role}</div>
                <div style={{ fontSize: 12, color: '#71717a' }}>{member.sector}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Events Section */}
      <section id="мероприятия" style={{ padding: '80px 20px', background: 'rgba(255, 255, 255, 0.02)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 48, color: '#fff', textAlign: 'center' }}>Последние мероприятия</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {(events.length > 0 ? events : recentEvents).map((event, i) => (
              <div key={i} style={{
                padding: '24px',
                borderRadius: 20,
                background: '#18181b',
                border: '1px solid #27272a',
                transition: 'transform 0.2s, border-color 0.2s',
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = '#7b6ef6';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = '#27272a';
                }}>
                <div style={{ fontSize: 13, color: '#7b6ef6', marginBottom: 8 }}>
                  {new Date(event.eventDate || event.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: '#fff' }}>{event.name}</h3>
                <p style={{ fontSize: 14, color: '#a1a1aa', lineHeight: 1.6 }}>{event.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Curators Section */}
      <section id="кураторы" style={{ padding: '80px 20px', maxWidth: 1200, margin: '0 auto' }}>
        <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 48, color: '#fff', textAlign: 'center' }}>Кураторы</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          {curators.map(curator => (
            <div key={curator.name} style={{
              padding: '32px 24px',
              borderRadius: 20,
              background: '#18181b',
              border: '1px solid #27272a',
              transition: 'transform 0.2s, border-color 0.2s',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = '#7b6ef6';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = '#27272a';
              }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'rgba(123, 110, 246, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7b6ef6" strokeWidth="2">
                  <path d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: '#fff' }}>{curator.name}</h3>
              <p style={{ fontSize: 14, color: '#a1a1aa', lineHeight: 1.6 }}>{curator.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '40px 20px', borderTop: '1px solid #27272a', textAlign: 'center' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
            <img src="/fcad.svg" alt="ФКП" style={{ height: 32 }} />
            <span style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>ФКП БГУИР</span>
          </div>
          <p style={{ fontSize: 14, color: '#71717a', marginBottom: 16 }}>
            г. Минск, ул. Бровки 4, ауд. 314, 2 корпус БГУИР
          </p>
          <p style={{ fontSize: 14, color: '#71717a', marginBottom: 16 }}>
            Телефон: +375 17 293-85-83, +375 17 293-22-10
          </p>
          <p style={{ fontSize: 14, color: '#71717a', marginBottom: 16 }}>
            E-mail: dekfkp@bsuir.by
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 24 }}>
            <a href="https://www.bsuir.by" target="_blank" rel="noopener"
              style={{ color: '#a1a1aa', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = '#a1a1aa')}>
              Сайт БГУИР
            </a>
            <a href="https://www.bsuir.by/ru/fkp" target="_blank" rel="noopener"
              style={{ color: '#a1a1aa', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = '#a1a1aa')}>
              Сайт ФКП
            </a>
          </div>
          <p style={{ fontSize: 13, color: '#3f3f46' }}>
            © {new Date().getFullYear()} Факультет компьютерного проектирования БГУИР
          </p>
        </div>
      </footer>
    </div>
  );
}
