import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth';
import { studentsRouter } from './routes/students';
import { exemptionsRouter } from './routes/exemptions';
import { bonusesRouter } from './routes/bonuses';
import { initBot } from './services/bot';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/students', studentsRouter);
app.use('/api/exemptions', exemptionsRouter);
app.use('/api/bonuses', bonusesRouter);

app.get('/health', (_, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
  initBot();
});
