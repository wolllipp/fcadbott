import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import https from 'https';
import { prisma } from '../lib/prisma';
import { getBot } from '../services/bot';
import { setSession } from '../middleware/auth';

const router = Router();

// Telegram usernames: 3-32 chars, [a-zA-Z0-9_], must start with a letter, no consecutive underscores.
// Strips a leading "@" and validates the remainder; returns null for invalid input.
const TELEGRAM_USERNAME_RE = /^[A-Za-z][A-Za-z0-9_]{2,31}$/;
export function sanitizeTelegramUsername(raw: string): string {
  const stripped = String(raw || '').replace(/^@+/, '');
  return TELEGRAM_USERNAME_RE.test(stripped) ? stripped : '';
}


function verifyTelegramWebAppData(initData: string): Record<string, string> | null {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;

  params.delete('hash');
  const dataCheckArr: string[] = [];
  params.forEach((value, key) => dataCheckArr.push(`${key}=${value}`));
  dataCheckArr.sort();
  const dataCheckString = dataCheckArr.join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(process.env.BOT_TOKEN || '')
    .digest();

  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (calculatedHash !== hash) return null;

  const result: Record<string, string> = {};
  params.forEach((value, key) => (result[key] = value));
  return result;
}

router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { initData } = req.body;

    // Test mode: requires BOTH production NODE_ENV strict + explicit ALLOW_TEST_AUTH flag
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_TEST_AUTH === 'true' && req.body.testUsername) {
      const username = String(req.body.testUsername ?? '').trim().replace(/^@+/, '');
      
      // First try coordinator
      const coordinator = await prisma.coordinator.findUnique({
        where: { telegramUsername: username },
      });
      if (coordinator) {
        setSession(res, { kind: 'coordinator', id: coordinator.id, role: coordinator.role, telegramUsername: coordinator.telegramUsername });
        return res.json({ coordinator });
      }
      
      // Then try student
      const student = await prisma.student.findFirst({
        where: { telegramUsername: username },
      });
      if (student) {
        setSession(res, { kind: 'student', id: student.id, telegramUsername: student.telegramUsername || username });
        return res.json({ student });
      }
      
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!initData) {
      return res.status(400).json({ error: 'No initData provided' });
    }

    const data = verifyTelegramWebAppData(initData);
    if (!data) {
      return res.status(403).json({ error: 'Invalid initData' });
    }

    const user = JSON.parse(data.user || '{}');
    const username = user.username;

    if (!username) {
      return res.status(403).json({ error: 'No username in Telegram data' });
    }

    const coordinator = await prisma.coordinator.findUnique({
      where: { telegramUsername: username },
    });

    if (!coordinator) {
      return res.status(403).json({ error: 'Access denied. You are not a member of the Student Council.' });
    }

    // Save chatId and profile photo if we have them
    if (user.id) {
      await prisma.coordinator.update({
        where: { id: coordinator.id },
        data: {
          chatId: String(user.id),
          ...(user.photo_url && { photoUrl: user.photo_url }),
        },
      });
      if (user.photo_url) (coordinator as any).photoUrl = user.photo_url;
    }

    setSession(res, { kind: 'coordinator', id: coordinator.id, role: coordinator.role, telegramUsername: coordinator.telegramUsername });
    res.json({ coordinator });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/student-register', async (req: Request, res: Response) => {
  try {
    const fullName = String(req.body?.fullName ?? '').trim();
    const studentCardNumber = String(req.body?.studentCardNumber ?? '').trim();
    const telegramUsername = String(req.body?.telegramUsername ?? '').trim();
    const groupNumber = String(req.body?.groupNumber ?? '').trim();
    const budgetStatus = String(req.body?.budgetStatus ?? '').trim();
    const initData = req.body?.initData;
    if (!fullName || !studentCardNumber || !telegramUsername || !groupNumber) {
      return res.status(400).json({ error: 'fullName, studentCardNumber, groupNumber и telegramUsername обязательны' });
    }

    const student = await prisma.student.findFirst({
      where: { fullName, studentCardNumber },
    });

    if (!student) {
      return res.status(404).json({ error: 'ФИО и номер студенческого не совпадают. Проверьте данные или обратитесь к студсовету.' });
    }

    if (student.telegramUsername) {
      return res.status(409).json({ error: 'Этот студент уже привязан к другому Telegram аккаунту' });
    }

    let chatId: string | undefined;
    let photoUrl: string | undefined;
    if (initData) {
      const data = verifyTelegramWebAppData(initData);
      if (data) {
        const user = JSON.parse(data.user || '{}');
        if (user.id) chatId = String(user.id);
        if (user.photo_url) photoUrl = user.photo_url;
      }
    }

    const updated = await prisma.student.update({
      where: { id: student.id },
      data: {
        telegramUsername: sanitizeTelegramUsername(telegramUsername),
        groupNumber: groupNumber || student.groupNumber,
        budgetStatus: (budgetStatus as any) || student.budgetStatus,
        ...(chatId && { chatId }),
        ...(photoUrl && { photoUrl }),
      },
    });

    setSession(res, { kind: 'student', id: updated.id, telegramUsername: updated.telegramUsername || telegramUsername });
    res.json({ student: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/student-login', async (req: Request, res: Response) => {
  try {
    const telegramUsername = String(req.body?.telegramUsername ?? '').trim();
    const initData = req.body?.initData;
    if (!telegramUsername) {
      return res.status(400).json({ error: 'telegramUsername обязателен' });
    }

    const student = await prisma.student.findFirst({
      where: { telegramUsername: sanitizeTelegramUsername(telegramUsername) },
    });

    if (!student) {
      return res.status(404).json({ error: 'Студент не найден. Пройдите регистрацию.' });
    }

    // Extract chatId and profile photo from initData
    let chatId: string | undefined;
    let photoUrl: string | undefined;
    if (initData) {
      const data = verifyTelegramWebAppData(initData);
      if (data) {
        const user = JSON.parse(data.user || '{}');
        if (user.id) chatId = String(user.id);
        if (user.photo_url) photoUrl = user.photo_url;
      }
    }

    if ((chatId && student.chatId !== chatId) || (photoUrl && student.photoUrl !== photoUrl)) {
      await prisma.student.update({
        where: { id: student.id },
        data: {
          ...(chatId && { chatId }),
          ...(photoUrl && { photoUrl }),
        },
      });
    }

    setSession(res, { kind: 'student', id: student.id, telegramUsername: student.telegramUsername || telegramUsername });
    res.json({ student: { ...student, chatId: chatId || student.chatId, photoUrl: photoUrl || student.photoUrl } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/profile', async (req: Request, res: Response) => {
  try {
    const { userId, role, photoUrl } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    if (role === 'student') {
      const student = await prisma.student.update({
        where: { id: userId },
        data: { photoUrl: photoUrl || null },
      });
      return res.json({ student });
    }

    const coordinator = await prisma.coordinator.update({
      where: { id: userId },
      data: { photoUrl: photoUrl || null },
    });
    res.json({ coordinator });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Proxy the user's Telegram profile photo (fallback when initData has no photo_url)
router.get('/avatar/:chatId', async (req: Request, res: Response) => {
  try {
    const bot = getBot();
    if (!bot) return res.status(503).end();

    const photos = await bot.getUserProfilePhotos(Number(req.params.chatId), { limit: 1 } as any);
    if (!photos || !photos.total_count) return res.status(404).end();

    const sizes = photos.photos[0];
    const fileId = sizes[sizes.length - 1].file_id;
    const file = await bot.getFile(fileId);
    if (!file.file_path) return res.status(404).end();

    const url = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
    https.get(url, (tgRes) => {
      if (tgRes.statusCode !== 200) { res.status(404).end(); tgRes.resume(); return; }
      res.set('Content-Type', tgRes.headers['content-type'] || 'image/jpeg');
      res.set('Cache-Control', 'public, max-age=3600');
      tgRes.pipe(res);
    }).on('error', () => res.status(404).end());
  } catch (err) {
    res.status(404).end();
  }
});

export { router as authRouter };
