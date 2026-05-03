# СС ФКП БГУИР — Telegram Mini App

Приложение для Студенческого совета Факультета компьютерного проектирования БГУИР.  
Автоматизирует выставление **освобождений от занятий** и **премирование студентов**.

---

## 🚀 Быстрый старт (локально)

### Требования
- [Node.js 20+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (для PostgreSQL)
- Telegram Bot Token (получить у [@BotFather](https://t.me/BotFather))

---

### Шаг 1 — Запустить базу данных

```bash
docker-compose up -d
```

PostgreSQL запустится на `localhost:5432`.

---

### Шаг 2 — Настроить бекенд

```bash
cd backend
cp .env.example .env
```

Открой `.env` и вставь свой Bot Token:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/fkp_ss"
BOT_TOKEN="123456789:ABCdef..."
PORT=3001
NODE_ENV=development
```

Установи зависимости и настрой БД:
```bash
npm install
npx prisma migrate dev --name init
```

**Импорт студентов из Excel:**
```bash
mkdir -p uploads
# Скопируй файл ФКП_СС.xlsx в папку backend/uploads/
cp /path/to/ФКП_СС.xlsx uploads/
npm run db:seed
```

Запусти бекенд:
```bash
npm run dev
```

Бекенд доступен на `http://localhost:3001`

---

### Шаг 3 — Запустить фронтенд

```bash
cd ../frontend
npm install
npm run dev
```

Фронтенд доступен на `http://localhost:5173`

---

### Шаг 4 — Настроить Telegram Bot

1. Открой [@BotFather](https://t.me/BotFather)
2. Создай нового бота: `/newbot`
3. Скопируй токен в `backend/.env`
4. Настрой Menu Button:
   ```
   /setmenubutton
   ```
   Выбери бота → укажи URL Mini App (например `https://твой-домен.com`) и название кнопки

5. Напиши `/start` боту — он сохранит твой chatId для уведомлений

---

### Шаг 5 — Тестовый режим (без Telegram)

Открой фронтенд с параметром `?user=wolllip` для тестирования:
```
http://localhost:5173?user=wolllip
```

Доступные тестовые пользователи:
| Username | Роль |
|----------|------|
| `wolllip` | Председатель |
| `feasga` | Зам. председателя |
| `liza_samuylik` | Зам. председателя |
| `gaiduchello` | Координатор (Театральное) |
| `justmoth` | Координатор (Вокальное) |
| `bbshkk` | Координатор (Культ.-массовое) |
| `dianqwlk` | Координатор (Спортивное) |
| `pelmesha047` | Координатор (Информационное) |

---

## 🌐 Деплой на VPS (для публичного доступа)

Для работы как настоящее Telegram Mini App нужен HTTPS-домен.

### Вариант A — ngrok (быстро, для разработки)

```bash
npm install -g ngrok
ngrok http 5173
```

Скопируй URL вида `https://xxxx.ngrok.io` и укажи его в BotFather.

### Вариант B — VPS с Nginx

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    # SSL сертификат (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Frontend
    location / {
        root /var/www/fkp-ss/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
    }
}
```

Собери фронтенд:
```bash
cd frontend && npm run build
```

---

## 📁 Структура проекта

```
fkp-ss-app/
├── backend/
│   ├── src/
│   │   ├── index.ts          # Точка входа
│   │   ├── routes/
│   │   │   ├── auth.ts       # Верификация Telegram
│   │   │   ├── students.ts   # Список студентов
│   │   │   ├── exemptions.ts # Освобождения
│   │   │   └── bonuses.ts    # Премирование
│   │   ├── services/
│   │   │   └── bot.ts        # Telegram Bot + уведомления
│   │   └── utils/
│   │       └── seed.ts       # Импорт данных из xlsx
│   ├── prisma/
│   │   └── schema.prisma     # Схема БД
│   └── .env.example
├── frontend/
│   └── src/
│       ├── App.tsx           # Роутинг + авторизация
│       ├── pages/
│       │   ├── HomePage.tsx
│       │   ├── ExemptionsPage.tsx
│       │   └── BonusesPage.tsx
│       ├── components/
│       │   ├── NavBar.tsx
│       │   ├── StudentPicker.tsx
│       │   ├── SuccessScreen.tsx
│       │   ├── LoadingScreen.tsx
│       │   └── AccessDenied.tsx
│       └── utils/api.ts
└── docker-compose.yml
```

---

## 👥 Роли

| Роль | Возможности |
|------|------------|
| **CHAIRMAN** | Все функции + подтверждение премий + вся база студентов |
| **DEPUTY** | Те же права, что у Председателя |
| **COORDINATOR** | Освобождения и премии только для своего сектора |

---

## ✉️ Уведомления бота

После отправки команды `/start` боту, координатор начнёт получать уведомления.  
Председатель и секретарь получают:
- Докладную при выставлении освобождений
- Уведомление при подаче премий координатором
- Итоговую докладную при подтверждении премий

---

## 🔧 Частые проблемы

**"Cannot find module" при запуске бекенда**
```bash
npm install && npx prisma generate
```

**"Relation does not exist" — ошибка БД**
```bash
npx prisma migrate dev --name init
```

**Бот не отвечает**  
Убедись, что `BOT_TOKEN` указан верно в `.env` и бекенд запущен.

**Студенты не видны**  
Скопируй `ФКП_СС.xlsx` в `backend/uploads/` и запусти `npm run db:seed`.
# fcadbott
