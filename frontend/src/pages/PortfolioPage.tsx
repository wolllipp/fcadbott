import React, { useEffect, useRef, useState } from 'react';

const councilMembers = [
  ['Скворец Иван', 'Председатель', 'Студсовет', '/council/Скворец Иван.png'],
  ['Линкевич Алексей', 'Зам. председателя', 'Студсовет', '/council/Линкевич Алексей.png'],
  ['Самуйлик Елизавета', 'Зам. председателя', 'Студсовет', '/council/Самуйлик Елизавета-2.png'],
  ['Ларченко Мария', 'Секретарь', 'Студсовет', '/council/Ларченко Мария.png'],
  ['Галяк Иван', 'Координатор', 'Учебное', '/council/Галяк Иван.png'],
  ['Емельянович Дарья', 'Координатор', 'Культурно-массовое', '/council/Емельянович Дарья.png'],
  ['Карпова Анастасия', 'Координатор', 'Вокальное', '/council/Карпова Анастасия.png'],
  ['Бобровская Варвара', 'Координатор', 'Танцевальное', '/council/Бобровская Варвара.png'],
  ['Цуприк Илья', 'Координатор', 'Танцевальное', '/council/Цуприк Илья.png'],
  ['Ковалик Диана', 'Координатор', 'Спортивное', '/council/Ковалик Диана.png'],
  ['Шаблинский Александр', 'Координатор', 'Инструментальное', '/council/Шаблинский Александр.png'],
  ['Садовский Александр', 'Координатор', 'Научное', '/council/Садовский Александр.png'],
  ['Карпекина Ольга', 'Координатор', 'Декоративное', '/council/Карпекина Ольга.png'],
  ['Помахо Алеся', 'Координатор', 'Профориентационное', '/council/Помахо Алеся.png'],
  ['Шулеев Денис', 'Координатор', 'Декоративное', '/council/Шулеев Денис.png'],
  ['Гайдук Полина', 'Координатор', 'Театральное', '/council/Гайдук Полина.png'],
  ['Шахов Евгений', 'Координатор', 'Информационное', '/council/Шахов Евгений.png'],
  ['Гояев Кирилл', 'Координатор', 'Культурно-массовое', '/council/Гояев Кирилл.png'],
  ['Ноздрин Вадим', 'Координатор', 'Культурно-массовое', '/council/Ноздрин Вадим.png'],
];

const administrationGroups = [
  { title: 'Декан', people: [['Будник Артур Владимирович', 'Декан']] },
  { title: 'Заместители декана', people: [
    ['Кракасевич Сергей Викторович', 'Заместитель декана'],
    ['Камлач Павел Викторович', 'Заместитель декана'],
    ['Котухов Алексей Валерьевич', 'Заместитель декана'],
    ['Андриалович Инна Владимировна', 'Заместитель декана по идеологической и воспитательной работе'],
    ['Пискун Геннадий Адамович', 'Заместитель декана по научной работе'],
  ] },
  { title: 'Сотрудники деканата', people: [
    ['Сашникова Татьяна Михайловна', 'Ведущий специалист деканата'],
    ['Барановская Анна Анатольевна', 'Специалист деканата'],
    ['Ганакова Екатерина Викторовна', 'Специалист деканата'],
  ] },
];

const sections = [
  ['Культурно-массовый', 'Организует яркие мероприятия и объединяет танцевальное, декоративное, вокальное, театральное и инструментальное направления.'],
  ['Информационный', 'Ведёт социальные сети, снимает события факультета и помогает сохранять самые важные моменты студенческой жизни.'],
  ['Учебный', 'Помогает студентам с дисциплинами, организует занятия и создаёт среду для общения и взаимопомощи.'],
  ['Научный', 'Прокачивает тайм-менеджмент и коммуникацию, помогает со статьями, проектами и научными мероприятиями.'],
  ['Спортивный', 'Собирает команды и представляет факультет на соревнованиях, поддерживая активную спортивную жизнь.'],
  ['Профориентационный', 'Ездит в школы и рассказывает будущим студентам о БГУИР, факультете и возможностях обучения.'],
  ['Техническое обеспечение', 'Отвечает за звук, свет, экраны, мультимедиа и полное техническое сопровождение событий.'],
];

const activities = [
  ['Спортивный клуб БГУИР', 'Спортивные мероприятия, соревнования и представление университета.'],
  ['ЦКМР', 'Творческие коллективы, программы и университетские мероприятия.'],
  ['УИВР', 'Мероприятия вне университета и взаимодействие со студенческими командами.'],
  ['Студенческий совет БГУИР', 'Организация мероприятий, помощь студентам и адаптация первокурсников.'],
  ['Студенческие советы общежитий', 'Комфортная и насыщенная жизнь в общежитиях: от бытовых вопросов до турниров.'],
  ['Студенческий совет ФКП', 'Координационный центр студенческой жизни факультета и представительства интересов студентов.'],
];

const slang = [
  ['ИИС', 'Интегрированная информационная система: журнал, профилизация, общежитие и электронная зачётка.'],
  ['СС', 'Студенческий совет — представители студентов, организующие события и помогающие решать вопросы.'],
  ['Деканат', 'Координирующий центр факультета, отвечающий за учебную, научную и воспитательную работу.'],
  ['Зачётка', 'Электронный документ, где фиксируются оценки.'], ['Пара', 'Занятие длительностью 80 минут.'],
  ['Куратор', 'Преподаватель, который помогает группе адаптироваться и решать учебные вопросы.'],
  ['Сессия', 'Период экзаменов, который проходит дважды в год.'], ['Поток', 'Несколько групп, которые вместе посещают общие лекции.'],
];

const sportSections = [
  ['ЛФК / СМГ', 'ЛФК и СМГ не могут выбрать другую секцию. СМГ обычно занимается в 3 корпусе.'],
  ['Плавание СМГ', 'Одно занятие в неделю в выбранный день на протяжении семестра.'],
  ['Атлетическая гимнастика', 'Тяжёлая атлетика для мальчиков, занятия проходят в спортивном корпусе.'],
  ['Футбол', 'Занятия на стадионе за 2 корпусом, берут и девушек с хорошей подготовкой.'],
  ['Аэробика', 'Секция для девушек во 2 корпусе, подходит и новичкам, и тем, кто уже занимается спортом.'],
  ['Плавание', 'Занятия в 3 корпусе, принимают даже тех, кто пока не умеет плавать.'],
  ['Мини-футбол', 'Занятия в 6 корпусе, секция для парней.'], ['Лёгкая атлетика', 'Много бега в любую погоду, сюда часто попадают те, кто не выбрал другую секцию.'],
  ['Тайский бокс', 'Свободный график посещений, техника без обязательных спаррингов.'], ['Борьба', 'Упражнения в 6 корпусе с короткими перерывами.'],
  ['Волейбол 3к / 5к', 'Два уровня подготовки в 3 и 5 корпусах.'], ['Баскетбол', 'Занятия во 2 корпусе, иногда с возможностью тренироваться в зале.'],
];

function Section({ id, eyebrow, title, children, dark = false }: { id: string; eyebrow?: string; title: string; children: React.ReactNode; dark?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) node.classList.add('landing-visible'); }, { threshold: 0.12 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <section ref={ref} id={id} className={`landing-section ${dark ? 'landing-dark' : ''}`}><div className="landing-container"><div className="landing-heading"><span>{eyebrow}</span><h2>{title}</h2></div>{children}</div></section>;
}

export default function PortfolioPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [navVisible, setNavVisible] = useState(false);
  useEffect(() => {
    fetch('/api/events').then((r) => r.json()).then((data) => setEvents(data.filter((e: any) => e.status === 'PUBLISHED').slice(0, 3))).catch(() => {});
  }, []);
  useEffect(() => {
    const onScroll = () => setNavVisible(window.scrollY > 36);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="landing-page">
      <link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        html { scroll-behavior: smooth; }
        .landing-page { min-height: 100vh; background: #0b0c12; color: #eef0f8; font-family: Onest, system-ui, sans-serif; overflow-x: hidden; }
        .landing-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 20; background: rgba(11,12,18,.82); backdrop-filter: blur(18px); border-bottom: 1px solid rgba(255,255,255,.08); transform: translateY(-105%); transition: transform .45s cubic-bezier(.2,.75,.25,1); }
        .landing-nav.visible { transform: translateY(0); }
        .landing-nav-inner { max-width: 1180px; height: 68px; margin: auto; padding: 0 22px; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
        .landing-brand { display: flex; align-items: center; gap: 10px; color: white; font-weight: 800; white-space: nowrap; }
        .landing-brand img { width: 38px; height: 38px; }
        .landing-links { display: flex; gap: 18px; overflow-x: auto; scrollbar-width: none; }
        .landing-links::-webkit-scrollbar { display: none; }
        .landing-links a { color: #a6aabd; text-decoration: none; font-size: 12px; white-space: nowrap; transition: color .2s; }
        .landing-links a:hover { color: white; }
        .landing-hero { min-height: 82vh; display: grid; place-items: center; text-align: center; padding: 110px 22px 90px; background: radial-gradient(circle at 50% 20%, rgba(123,110,246,.3), transparent 42%), linear-gradient(140deg,#0b0c12,#17152a 55%,#0b0c12); }
        .landing-hero > div { animation: landingHeroIn .9s cubic-bezier(.2,.75,.25,1) both; }
        @keyframes landingHeroIn { from { opacity: 0; transform: translateY(24px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .landing-hero h1 { max-width: 1000px; margin: 0 auto 24px; font-family: Unbounded, sans-serif; font-size: clamp(38px,8vw,92px); line-height: 1.05; letter-spacing: -.07em; }
        .landing-hero p { max-width: 650px; margin: 0 auto 28px; color: #b8b9c9; font-size: clamp(16px,2vw,21px); line-height: 1.55; }
        .landing-actions { display: flex; justify-content: center; gap: 10px; flex-wrap: wrap; }
        .landing-button { display: inline-flex; padding: 13px 20px; border-radius: 12px; color: white; text-decoration: none; font-weight: 700; font-size: 14px; background: #786cf2; box-shadow: 0 10px 28px rgba(120,108,242,.22); }
        .landing-button.alt { background: rgba(255,255,255,.08); box-shadow: none; border: 1px solid rgba(255,255,255,.12); }
        .landing-section { padding: 92px 22px; opacity: 0; transform: translateY(28px); transition: opacity .7s ease, transform .7s ease; scroll-margin-top: 76px; }
        .landing-section.landing-visible { opacity: 1; transform: translateY(0); }
        .landing-dark { background: rgba(255,255,255,.035); }
        .landing-container { max-width: 1180px; margin: auto; }
        .landing-heading { margin-bottom: 34px; }
        .landing-heading span { color: #9288ff; font-size: 11px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
        .landing-heading h2 { margin: 7px 0 0; font-size: clamp(28px,4vw,44px); letter-spacing: -.045em; }
        .landing-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(235px,1fr)); gap: 14px; }
        .landing-card { padding: 21px; border: 1px solid rgba(255,255,255,.09); border-radius: 18px; background: rgba(255,255,255,.055); transition: transform .25s, border-color .25s, background .25s; }
        .landing-card:hover { transform: translateY(-5px); border-color: rgba(146,136,255,.7); background: rgba(123,110,246,.1); }
        .landing-card h3 { margin: 0 0 7px; font-size: 17px; }
        .landing-card p, .landing-card li { color: #b5b7c6; line-height: 1.62; font-size: 14px; }
        .landing-card ul { margin: 0; padding-left: 18px; }
        .landing-person { display: flex; flex-direction: column; }
        .landing-person img, .landing-person-placeholder { width: 100%; height: 170px; object-fit: cover; border-radius: 13px; background: linear-gradient(145deg,#7368e8,#24233b); display: grid; place-items: center; font-size: 44px; font-weight: 800; color: white; order: 1; }
        .landing-person h3 { margin-top: 0; margin-bottom: 4px; }
        .landing-person .landing-meta { margin-bottom: 10px; }
        .landing-meta { color: #9288ff; font-size: 12px; }
        .landing-notice { padding: 25px; border-radius: 18px; background: linear-gradient(135deg,rgba(123,110,246,.18),rgba(255,255,255,.04)); border: 1px solid rgba(146,136,255,.25); line-height: 1.65; color: #d6d8e5; }
        .landing-footer { padding: 42px 22px; border-top: 1px solid rgba(255,255,255,.08); text-align: center; color: #8d90a1; }
        @media (max-width: 700px) { .landing-nav-inner { height: 60px; padding: 0 14px; } .landing-brand span { display: none; } .landing-section { padding: 68px 16px; } .landing-hero { min-height: 78vh; padding: 80px 18px; } }
      `}</style>

      <nav className={`landing-nav${navVisible ? ' visible' : ''}`}><div className="landing-nav-inner"><a className="landing-brand" href="#top" onClick={(e) => { e.preventDefault(); scrollToSection('top'); }}><span style={{ fontFamily: 'Unbounded, sans-serif', fontSize: 16 }}>ФКП БГУИР</span></a><div className="landing-links">{[['О факультете','about'],['Поступление','admission'],['Администрация','administration'],['Активности','activities'],['Студсовет','council'],['Сектора','sectors'],['Расписание','schedule'],['Словарь','slang'],['Общежития','dormitory']].map(([label,id]) => <a key={id} href={`#${id}`} onClick={(e) => { e.preventDefault(); scrollToSection(id); }}>{label}</a>)}</div></div></nav>

      <main id="top">
        <section className="landing-hero"><div><h1>ФКП БГУИР</h1><p>Факультет компьютерного проектирования — место, где технологии, студенческая инициатива и люди собираются в одну живую систему.</p><div className="landing-actions"><a className="landing-button" href="#admission" onClick={(e) => { e.preventDefault(); scrollToSection('admission'); }}>Поступившим — важно</a><a className="landing-button alt" href="#council" onClick={(e) => { e.preventDefault(); scrollToSection('council'); }}>Познакомиться со студсоветом</a></div></div></section>

        <Section id="about" eyebrow="ФКП БГУИР" title="О факультете"><div className="landing-grid"><div className="landing-card"><h3>Компьютерное проектирование</h3><p>Факультет готовит специалистов в области компьютерного проектирования, программной инженерии и информационных технологий. Здесь учатся создавать решения, которые работают за пределами учебной аудитории.</p></div><div className="landing-card"><h3>Студенческая жизнь</h3><p>БГУИР — это лекции, проекты, спорт, творчество, новые знакомства и команды, в которых можно найти своё направление.</p></div><div className="landing-card"><h3>Студенческий совет ФКП</h3><p>Помогает первокурсникам адаптироваться, представляет интересы студентов, организует события и связывает студентов с факультетом.</p></div></div></Section>

        <Section id="admission" eyebrow="Для поступивших на первый курс" title="Важная информация"><div className="landing-grid"><div className="landing-card"><h3>Выдача договоров</h3><p>О подготовке специалистов с высшим образованием за счёт средств республиканского бюджета и на платной основе.</p><p><strong>17–31 августа 2026 года</strong></p><p>ФКП, 2-й учебный корпус, ул. Петруся Бровки, 4, аудитория 308.</p><p>Справки: +375 17 293 88 02, +375 17 293 86 25</p></div><div className="landing-card"><h3>Оплата обучения</h3><p>Первый этап оплаты — после приказа о зачислении, до 31 августа 2026 года.</p><p><strong>25% годовой стоимости: 1 182,50 руб.</strong></p><p>Приказ №317 от 22.06.2026 «Об установлении стоимости обучения на платной основе».</p></div><div className="landing-card"><h3>Оплата через ЕРИП</h3><p>Система «Расчёт» → Образование и развитие → Высшее образование → Минск → БГУИР → Обучение (1 курс).</p><p>Введите номер студенческого билета без дефиса, затем сумму.</p></div></div></Section>

        <Section id="administration" eyebrow="БГУИР" title="Администрация"><div className="landing-notice" style={{ marginBottom: 34 }}><strong>Ректорат</strong><br />Ректор — Богуш Вадим Анатольевич<br />Проректоры — Давыдов Максим Викторович, Стемпицкий Виктор Романович, Шнейдеров Евгений Николаевич, Кузнецов Дмитрий Федорович, Артюшенко Евгений Антонович, Хаткевич Владислав Казимирович.</div>{administrationGroups.map((group) => <div key={group.title} style={{ marginBottom: 38 }}><h3 style={{ fontSize: 21, marginBottom: 16, color: '#d9d7ff' }}>{group.title}</h3><div className="landing-grid">{group.people.map(([name, role]) => <article className="landing-card" key={name}><h3>{name}</h3><div className="landing-meta">{role}</div></article>)}</div></div>)}</Section>

        <Section id="activities" eyebrow="Возможности" title="Студенческие активы" dark><div className="landing-grid">{activities.map(([name, text]) => <article className="landing-card" key={name}><h3>{name}</h3><p>{text}</p></article>)}</div></Section>

        <Section id="council" eyebrow="Команда" title="Студенческий совет ФКП"><p style={{ color: '#b5b7c6', maxWidth: 650, lineHeight: 1.7, marginBottom: 30 }}>С уважением, Студенческий совет ФКП. В совете есть несколько секторов, где можно найти команду, попробовать себя и сделать факультет ярче.</p><div className="landing-grid">{councilMembers.map(([name, role, sector, photo]) => <article className="landing-card landing-person" key={name}><h3>{name}</h3><div className="landing-meta">{role} · {sector}</div>{photo ? <img src={photo} alt={name} referrerPolicy="no-referrer" /> : <div className="landing-person-placeholder">{name[0]}</div>}</article>)}</div></Section>

        <Section id="sectors" eyebrow="Направления" title="Сектора студсовета" dark><div className="landing-grid">{sections.map(([name, text]) => <article className="landing-card" key={name}><h3>💜 {name}</h3><p>{text}</p></article>)}</div><div className="landing-notice" style={{ marginTop: 20 }}>В начале сентября будет собрание, где координаторы расскажут о секторах подробнее, а позже пройдёт отбор.</div></Section>

        <Section id="schedule" eyebrow="Полезно первокурснику" title="Приложения для расписания"><div className="landing-grid"><article className="landing-card"><h3>Bsuir Schedule — iOS</h3><p>Лаконично показывает расписание группы и следующую пару без лишних экранов.</p></article><article className="landing-card"><h3>БГУИР – Удобное расписание — Android</h3><p>Выберите группу и смотрите пары на сегодня или неделю вперёд.</p></article></div></Section>

        <Section id="slang" eyebrow="#студслэнг" title="Слова, которые встретятся в университете" dark><div className="landing-grid">{slang.map(([term, text]) => <article className="landing-card" key={term}><h3>{term}</h3><p>{text}</p></article>)}</div></Section>

        <Section id="sport" eyebrow="Физическая культура" title="О секциях"><div className="landing-grid">{sportSections.map(([name, text]) => <article className="landing-card" key={name}><h3>{name}</h3><p>{text}</p></article>)}</div><div className="landing-notice" style={{ marginTop: 20 }}>Если остались вопросы по физкультуре, пишите в чат или в личные сообщения студсовету.</div></Section>

        <Section id="dormitory" eyebrow="После зачисления" title="Общежитие"><div className="landing-card"><h3>Какие документы подать 15–19 августа 2026 года</h3><ul><li>Заявление по образцу в месте подачи документов</li><li>Копия паспорта (стр. 25, 31–33)</li><li>Справка о месте жительства и составе семьи</li><li>Документы, подтверждающие льготы</li></ul><p style={{ marginTop: 14 }}>Заселение — 24–26 августа. Номер общежития и блока появится в ИИС.</p></div><div className="landing-grid" style={{ marginTop: 14 }}>{[1,2,3,4,5].map((n) => <article className="landing-card" key={n}><h3>Общежитие №{n}</h3><p>Видеообзоры, условия проживания, расположение и студенческие советы общежитий будут добавлены здесь.</p></article>)}</div></Section>

        <Section id="events" eyebrow="Календарь" title="Мероприятия"><div className="landing-grid"><article className="landing-card" key="vivat"><div className="landing-meta">31 августа 2026</div><h3>Виват, первокурсник!</h3><p>Мы тебя ждём</p></article></div></Section>
      </main>

      <footer className="landing-footer"><img src="/fcad.svg" alt="ФКП" style={{ width: 42, marginBottom: 12 }} /><div>Факультет компьютерного проектирования БГУИР</div><div style={{ marginTop: 8 }}>ул. Петруся Бровки, 4 · +375 17 293 88 02 · +375 17 293 86 25</div><div style={{ marginTop: 18, fontSize: 12 }}>© {new Date().getFullYear()} Студенческий совет ФКП</div></footer>
    </div>
  );
}
