import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { sendBonusNotification, sendBonusReport, sendBonusDoc } from '../services/bot';
import { generateBonusDoc } from '../services/bonusDocGenerator';

const router = Router();


function isChairmanOrDean(role: string) {
  return role === 'CHAIRMAN' || role === 'DEAN' || role === 'SECRETARY';
}

function isSubmissionOpen(): boolean {
  const day = new Date().getDate();
  return day >= 20;
 
}

// GET /api/bonuses
router.get('/', async (req: Request, res: Response) => {
  try {
    const { coordinatorId, role } = req.query;
    let where: any = {};
    if (!isChairmanOrDean(role as string) && coordinatorId) {
      where = { coordinatorId: Number(coordinatorId) };
    }
    const submissions = await prisma.bonusSubmission.findMany({
      where,
      include: { coordinator: true, entries: { include: { student: true } } },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
    res.json(submissions);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/bonuses
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
        month, year, coordinatorId,
        entries: {
          create: (entries || []).map((e: any) => ({
            studentId: e.studentId || null,
            externalName: e.externalName || null,
            externalGroup: e.externalGroup || null,
            externalCardNumber: e.externalCardNumber || null,
            amount: e.amount,
            reason: e.reason || 'Организация мероприятий на факультете и в университете и участие в них',
            budgetStudentName: e.budgetStudentName || null,
            budgetStudentGroup: e.budgetStudentGroup || null,
            budgetStudentCard: e.budgetStudentCard || null,
          })),
        },
      },
      include: { coordinator: true, entries: { include: { student: true } } },
    });
    await sendBonusNotification(submission);
    res.json(submission);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PUT /api/bonuses/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { role, entries } = req.body;
    if (!isChairmanOrDean(role)) return res.status(403).json({ error: 'Forbidden' });
    for (const entry of entries) {
      await prisma.bonusEntry.update({
        where: { id: entry.id },
        data: { amount: entry.amount, reason: entry.reason },
      });
    }
    const updated = await prisma.bonusSubmission.findUnique({
      where: { id: Number(req.params.id) },
      include: { coordinator: true, entries: { include: { student: true } } },
    });
    res.json(updated);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/bonuses/:id/approve
router.post('/:id/approve', async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    if (!isChairmanOrDean(role)) return res.status(403).json({ error: 'Forbidden' });
    const submission = await prisma.bonusSubmission.update({
      where: { id: Number(req.params.id) },
      data: { status: 'APPROVED' },
      include: { coordinator: true, entries: { include: { student: true } } },
    });
    await sendBonusReport(submission);
    res.json(submission);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/bonuses/entry/:entryId/defer
router.post('/entry/:entryId/defer', async (req: Request, res: Response) => {
  try {
    const { role, deferredToMonth, deferredToYear } = req.body;
    if (!isChairmanOrDean(role)) return res.status(403).json({ error: 'Forbidden' });
    const entry = await prisma.bonusEntry.update({
      where: { id: Number(req.params.entryId) },
      data: { deferredToMonth, deferredToYear },
    });
    res.json(entry);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PUT /api/bonuses/:id — coordinator edits own PENDING submission
router.put('/coordinator/:id', async (req: Request, res: Response) => {
  try {
    const { coordinatorId, entries } = req.body;
    if (!coordinatorId) return res.status(400).json({ error: 'coordinatorId required' });

    const submission = await prisma.bonusSubmission.findUnique({
      where: { id: Number(req.params.id) },
      include: { entries: true },
    });
    if (!submission) return res.status(404).json({ error: 'Not found' });
    if (submission.coordinatorId !== coordinatorId) return res.status(403).json({ error: 'Not your submission' });
    if (submission.status !== 'PENDING') return res.status(400).json({ error: 'Can only edit pending submissions' });

    // Delete old entries, create new ones
    await prisma.bonusEntry.deleteMany({ where: { submissionId: submission.id } });
    await prisma.bonusEntry.createMany({
      data: (entries || []).map((e: any) => ({
        submissionId: submission.id,
        studentId: e.studentId || null,
        externalName: e.externalName || null,
        externalGroup: e.externalGroup || null,
        externalCardNumber: e.externalCardNumber || null,
        amount: e.amount,
        reason: e.reason || 'Организация мероприятий на факультете и в университете и участие в них',
        budgetStudentName: e.budgetStudentName || null,
        budgetStudentGroup: e.budgetStudentGroup || null,
        budgetStudentCard: e.budgetStudentCard || null,
      })),
    });

    const updated = await prisma.bonusSubmission.findUnique({
      where: { id: submission.id },
      include: { coordinator: true, entries: { include: { student: true } } },
    });
    res.json(updated);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/bonuses/:id/add-entry — chairman/dean/secretary adds entry
router.post('/:id/add-entry', async (req: Request, res: Response) => {
  try {
    const { role, entry } = req.body;
    if (role !== 'CHAIRMAN' && role !== 'DEAN' && role !== 'SECRETARY') return res.status(403).json({ error: 'Forbidden' });

    const newEntry = await prisma.bonusEntry.create({
      data: {
        submissionId: Number(req.params.id),
        studentId: entry.studentId || null,
        externalName: entry.externalName || null,
        externalGroup: entry.externalGroup || null,
        externalCardNumber: entry.externalCardNumber || null,
        amount: entry.amount,
        reason: entry.reason || 'Организация мероприятий на факультете и в университете и участие в них',
        budgetStudentName: entry.budgetStudentName || null,
        budgetStudentGroup: entry.budgetStudentGroup || null,
        budgetStudentCard: entry.budgetStudentCard || null,
      },
      include: { student: true },
    });
    res.json(newEntry);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/bonuses/generate-doc
router.post('/generate-doc', async (req: Request, res: Response) => {
  try {
    const { role, month, year } = req.body;
    if (!isChairmanOrDean(role)) return res.status(403).json({ error: 'Forbidden' });

    const submissions = await prisma.bonusSubmission.findMany({
      where: { month, year, status: 'APPROVED' },
      include: { entries: { include: { student: true } } },
    });

    if (submissions.length === 0) {
      return res.status(400).json({ error: 'Нет подтверждённых премий за этот месяц' });
    }

    const allEntries = submissions.flatMap((s) =>
      s.entries.map((e) => ({
        studentId: e.studentId || undefined,
        fullName: e.student?.fullName || e.externalName || '—',
        groupNumber: e.student?.groupNumber || e.externalGroup || '—',
        studentCardNumber: e.student?.studentCardNumber || e.externalCardNumber || '—',
        amount: Number(e.amount),
        reason: e.reason || 'Организация мероприятий на факультете и в университете и участие в них',
        budgetStatus: e.student?.budgetStatus || 'BUDGET',
        budgetStudentName: (e as any).budgetStudentName || null,
        budgetStudentGroup: (e as any).budgetStudentGroup || null,
        budgetStudentCard: (e as any).budgetStudentCard || null,
      }))
    );

    const now = new Date();
    const docDate = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
    const buffer = await generateBonusDoc(month, year, allEntries, docDate);

    const MONTH_LOWER = ['', 'январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
    const filename = `Надбавки_${MONTH_LOWER[month]}_${year}.docx`;

    // Send via Telegram to chairman/dean
    await sendBonusDoc(buffer, filename, month, year);

    // Also send as HTTP download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(buffer);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

export { router as bonusesRouter };
