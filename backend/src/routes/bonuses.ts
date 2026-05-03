import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendBonusNotification, sendBonusReport } from '../services/bot';

const router = Router();
const prisma = new PrismaClient();

function isSubmissionOpen(): boolean {
  return true;
}

// GET /api/bonuses
router.get('/', async (req: Request, res: Response) => {
  try {
    const { coordinatorId, role } = req.query;
    let where = {};

    if (role !== 'CHAIRMAN' && role !== 'DEPUTY' && coordinatorId) {
      where = { coordinatorId: Number(coordinatorId) };
    }

    const submissions = await prisma.bonusSubmission.findMany({
      where,
      include: {
        coordinator: true,
        entries: { include: { student: true } },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    res.json(submissions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/bonuses — coordinator submits bonuses
router.post('/', async (req: Request, res: Response) => {
  try {
    const { coordinatorId, month, year, entries } = req.body;

    if (!isSubmissionOpen()) {
      return res.status(400).json({ error: 'Подача премий открыта с 20 по последнее число месяца' });
    }

    const existing = await prisma.bonusSubmission.findUnique({
      where: { month_year_coordinatorId: { month, year, coordinatorId } },
    });

    if (existing) {
      return res.status(400).json({ error: 'Вы уже подали премии за этот месяц' });
    }

    const submission = await prisma.bonusSubmission.create({
      data: {
        month,
        year,
        coordinatorId,
        entries: {
          create: (entries || []).map((e: any) => ({
            studentId: e.studentId || null,
            externalName: e.externalName || null,
            externalGroup: e.externalGroup || null,
            externalCardNumber: e.externalCardNumber || null,
            amount: e.amount,
            reason: e.reason || 'Организация мероприятий на факультете и в университете и участие в них',
          })),
        },
      },
      include: { coordinator: true, entries: { include: { student: true } } },
    });

    await sendBonusNotification(submission);

    res.json(submission);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/bonuses/:id — edit entry amount (chairman only)
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    if (role !== 'CHAIRMAN') return res.status(403).json({ error: 'Forbidden' });

    const { entries } = req.body;
    const submissionId = Number(req.params.id);

    // Update each entry
    for (const entry of entries) {
      await prisma.bonusEntry.update({
        where: { id: entry.id },
        data: { amount: entry.amount, reason: entry.reason },
      });
    }

    const updated = await prisma.bonusSubmission.findUnique({
      where: { id: submissionId },
      include: { coordinator: true, entries: { include: { student: true } } },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/bonuses/:id/approve
router.post('/:id/approve', async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    if (role !== 'CHAIRMAN') return res.status(403).json({ error: 'Forbidden' });

    const submission = await prisma.bonusSubmission.update({
      where: { id: Number(req.params.id) },
      data: { status: 'APPROVED' },
      include: { coordinator: true, entries: { include: { student: true } } },
    });

    await sendBonusReport(submission);

    res.json(submission);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/bonuses/:entryId/defer
router.post('/entry/:entryId/defer', async (req: Request, res: Response) => {
  try {
    const { role, deferredToMonth, deferredToYear } = req.body;
    if (role !== 'CHAIRMAN') return res.status(403).json({ error: 'Forbidden' });

    const entry = await prisma.bonusEntry.update({
      where: { id: Number(req.params.entryId) },
      data: { deferredToMonth, deferredToYear },
    });

    res.json(entry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export { router as bonusesRouter };
