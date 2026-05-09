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
import { initBot, sendEventReminders } from './services/bot';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/students', studentsRouter);
app.use('/api/exemptions', exemptionsRouter);
app.use('/api/bonuses', bonusesRouter);
app.use('/api/sectors', sectorsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/council', councilRouter);
app.use('/api/petitions', petitionsRouter);

app.get('/health', (_, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
  initBot();
  sendEventReminders();
  setInterval(sendEventReminders, 60 * 60 * 1000);
});
