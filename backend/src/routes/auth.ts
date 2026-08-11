import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';

const router = Router();


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

    // In development, allow test mode
    if (process.env.NODE_ENV === 'development' && req.body.testUsername) {
      const username = req.body.testUsername.replace('@', '');
      const coordinator = await prisma.coordinator.findUnique({
        where: { telegramUsername: username },
      });
      if (!coordinator) {
        return res.status(403).json({ error: 'Access denied' });
      }
      return res.json({ coordinator });
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

    // Save chatId if we have it
    if (user.id) {
      await prisma.coordinator.update({
        where: { id: coordinator.id },
        data: { chatId: String(user.id) },
      });
    }

    res.json({ coordinator });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/student-register', async (req: Request, res: Response) => {
  try {
    const { fullName, studentCardNumber, telegramUsername, initData } = req.body;
    if (!fullName || !studentCardNumber || !telegramUsername) {
      return res.status(400).json({ error: 'fullName, studentCardNumber и telegramUsername обязательны' });
    }

    const student = await prisma.student.findFirst({
      where: { fullName, studentCardNumber },
    });

    if (!student) {
      return res.status(404).json({ error: 'Студент с такими данными не найден. Проверьте ФИО и номер студенческого билета.' });
    }

    if (student.telegramUsername) {
      return res.status(409).json({ error: 'Этот студент уже привязан к другому Telegram аккаунту' });
    }

    // Extract chatId from initData
    let chatId: string | undefined;
    if (initData) {
      const data = verifyTelegramWebAppData(initData);
      if (data) {
        const user = JSON.parse(data.user || '{}');
        if (user.id) chatId = String(user.id);
      }
    }

    const updated = await prisma.student.update({
      where: { id: student.id },
      data: {
        telegramUsername: telegramUsername.replace('@', ''),
        ...(chatId && { chatId }),
      },
    });

    res.json({ student: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/student-login', async (req: Request, res: Response) => {
  try {
    const { telegramUsername, initData } = req.body;
    if (!telegramUsername) {
      return res.status(400).json({ error: 'telegramUsername обязателен' });
    }

    const student = await prisma.student.findFirst({
      where: { telegramUsername: telegramUsername.replace('@', '') },
    });

    if (!student) {
      return res.status(404).json({ error: 'Студент не найден. Пройдите регистрацию.' });
    }

    // Extract chatId from initData
    let chatId: string | undefined;
    if (initData) {
      const data = verifyTelegramWebAppData(initData);
      if (data) {
        const user = JSON.parse(data.user || '{}');
        if (user.id) chatId = String(user.id);
      }
    }

    if (chatId && student.chatId !== chatId) {
      await prisma.student.update({
        where: { id: student.id },
        data: { chatId },
      });
    }

    res.json({ student: { ...student, chatId: chatId || student.chatId } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export { router as authRouter };
