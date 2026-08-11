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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: ['https://fcadbot.site', 'https://delete-unsnap-banker.ngrok-free.dev', 'http://localhost:5173'], credentials: true }));
app.use(express.json());
app.use(express.static('../frontend/dist'));

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
