import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth';
import { studentsRouter } from './routes/students';
import { exemptionsRouter } from './routes/exemptions';
import { bonusesRouter } from './routes/bonuses';
import { sectorsRouter } from './routes/sectors';
import { eventsRouter } from './routes/events';
import { councilRouter } from './routes/council';
import { petitionsRouter } from './routes/petitions';
import { applicationsRouter } from './routes/applications';
import { pointsRouter } from './routes/points';
import { adminRouter } from './routes/admin';
import { attendanceRouter } from './routes/attendance';
import { initBot, getBot, sendEventReminders } from './services/bot';
import { requireApiAuth } from './middleware/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const rateBuckets = new Map<string, { start: number; count: number }>();
function rateLimit(limit: number, windowMs: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const bucket = rateBuckets.get(key);
    if (!bucket || now - bucket.start > windowMs) rateBuckets.set(key, { start: now, count: 1 });
    else if (++bucket.count > limit) return res.status(429).json({ error: 'Слишком много запросов. Повторите позже.' });
    next();
  };
}

app.use(cors({
  origin: (() => {
    const prodOrigins = ['https://fcadbot.site', 'http://localhost:5173'];
    const devOrigins = (process.env.DEV_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
    return process.env.NODE_ENV === 'production' ? prodOrigins : [...prodOrigins, ...devOrigins];
  })(),
  credentials: true,
}));
app.use(express.json());
app.use(express.static('../frontend/dist'));
app.use('/api', requireApiAuth);
app.use('/api/auth', rateLimit(30, 60_000));
app.use('/api/attendance/scan', rateLimit(60, 60_000));

app.use('/api/auth', authRouter);
app.use('/api/students', studentsRouter);
app.use('/api/exemptions', exemptionsRouter);
app.use('/api/bonuses', bonusesRouter);
app.use('/api/sectors', sectorsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/council', councilRouter);
app.use('/api/petitions', petitionsRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api/points', pointsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/attendance', attendanceRouter);

app.post('/api/bot-webhook', (req, res) => {
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (webhookSecret && req.get('X-Telegram-Bot-Api-Secret-Token') !== webhookSecret) return res.sendStatus(403);
  const b = getBot();
  if (b) { b.processUpdate(req.body); res.sendStatus(200); }
  else res.status(503).json({ error: 'Bot not initialized' });
});

app.get('/health', (_, res) => res.json({ ok: true }));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile('/root/fcadbott/fkp-ss-app/frontend/dist/index.html');
});

app.listen(Number(PORT), "127.0.0.1", async () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
  await initBot();
  sendEventReminders();
  setInterval(sendEventReminders, 60 * 60 * 1000);
});
