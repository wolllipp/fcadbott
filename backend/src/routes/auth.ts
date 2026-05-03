import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

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

export { router as authRouter };
