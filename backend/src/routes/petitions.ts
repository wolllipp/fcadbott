import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { generatePetitionDoc } from '../services/petitionDocGenerator';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { studentId, type } = req.body;
    if (!studentId || !type) {
      return res.status(400).json({ error: 'studentId and type required' });
    }

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const activeTransactions = await prisma.pointTransaction.findMany({
      where: { studentId, status: 'ACTIVE' },
      include: { event: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const balance = activeTransactions.reduce((sum, t) => sum + t.points, 0);
    if (balance < 100) {
      return res.status(400).json({ error: `Недостаточно баллов: ${balance}/100` });
    }

    const existingPending = await prisma.petition.findFirst({
      where: { studentId, status: { in: ['PENDING', 'DRAFT'] } },
    });
    if (existingPending) {
      return res.status(409).json({ error: 'У вас уже есть активное ходатайство' });
    }

    const petition = await prisma.petition.create({
      data: {
        studentId,
        type,
        status: 'PENDING',
        balanceAtSubmit: balance,
        totalPoints: balance,
        snapshots: {
          create: activeTransactions.map(t => ({
            points: t.points,
            type: t.type,
            reason: t.reason,
            eventName: t.event?.name || null,
            createdAt: t.createdAt,
          })),
        },
      },
      include: {
        student: true,
        events: true,
        snapshots: true,
      },
    });

    await prisma.pointTransaction.create({
      data: {
        studentId,
        points: -100,
        type: 'MANUAL_ADJUSTMENT',
        reason: 'Списание за подачу ходатайства',
        status: 'ACTIVE',
      },
    });

    try {
      const { sendPetitionPending } = require('../services/bot');
      await sendPetitionPending(petition);
    } catch (_) {}

    res.json(petition);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const { studentId, role } = req.query;
    const isAdmin = role && !['COORDINATOR'].includes(role as string);
    const where: any = isAdmin ? {} : { studentId: Number(studentId) };

    const petitions = await prisma.petition.findMany({
      where,
      include: {
        events: true,
        student: { select: { id: true, fullName: true, groupNumber: true, studentCardNumber: true, chatId: true } },
        snapshots: { orderBy: { createdAt: 'asc' } },
        reviewer: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(petitions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/approve', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { role, coordinatorId } = req.body;
    if (role !== 'CHAIRMAN' && role !== 'DEAN' && role !== 'DEPUTY') {
      return res.status(403).json({ error: 'Нет прав на подтверждение ходатайств' });
    }

    const petition = await prisma.petition.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        reviewerId: coordinatorId || null,
      },
      include: {
        events: true,
        student: true,
        snapshots: true,
      },
    });

    try {
      const { sendPetitionApproved } = require('../services/bot');
      await sendPetitionApproved(petition);
    } catch (_) {}

    res.json(petition);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/reject', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { role, coordinatorId, reviewComment } = req.body;
    if (role !== 'CHAIRMAN' && role !== 'DEAN' && role !== 'DEPUTY') {
      return res.status(403).json({ error: 'Нет прав на отклонение ходатайств' });
    }

    const petition = await prisma.petition.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewerId: coordinatorId || null,
        reviewComment: reviewComment || null,
      },
      include: { events: true, student: true },
    });

    res.json(petition);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const petition = await prisma.petition.findUnique({
      where: { id },
      include: { events: true, student: true, snapshots: true },
    });
    if (!petition) return res.status(404).json({ error: 'Not found' });
    if (petition.status !== 'APPROVED') return res.status(400).json({ error: 'Ходатайство ещё не одобрено' });

    const docBuffer = await generatePetitionDoc(petition);
    const typeName = petition.type.toLowerCase();
    const filename = `Ходатайство_${typeName}_${petition.id}.docx`;
    try {
      const { getBot } = require('../services/bot');
      if (getBot() && petition.student.chatId) {
        await getBot().sendDocument(petition.student.chatId, docBuffer, {
          caption: `📄 Ваше ходатайство готово: ${filename}`,
        }, {
          filename,
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
      }
    } catch (e) { console.error('Petition Telegram delivery failed:', e); }
    const encoded = encodeURIComponent(filename).replace(/%20/g, '_');
    res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.set('Content-Disposition', `attachment; filename*=UTF-8''${encoded}`);
    res.send(docBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export { router as petitionsRouter };
