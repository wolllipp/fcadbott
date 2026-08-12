import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { studentId, eventId, type, status } = req.query;
    const where: any = {};
    if (studentId) where.studentId = Number(studentId);
    if (eventId) where.eventId = Number(eventId);
    if (type) where.type = type;
    if (status) where.status = status;

    const transactions = await prisma.pointTransaction.findMany({
      where,
      include: {
        student: { select: { id: true, fullName: true, groupNumber: true } },
        event: { select: { id: true, name: true, eventDate: true } },
        author: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(transactions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/balance/:studentId', async (req: Request, res: Response) => {
  try {
    const studentId = Number(req.params.studentId);

    const transactions = await prisma.pointTransaction.findMany({
      where: { studentId, status: 'ACTIVE' },
      select: { points: true, type: true },
    });

    const balance = transactions.reduce((sum, t) => sum + t.points, 0);

    const byType = transactions.reduce((acc, t) => {
      acc[t.type] = (acc[t.type] || 0) + t.points;
      return acc;
    }, {} as Record<string, number>);

    res.json({ balance, byType, totalTransactions: transactions.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { studentId, points, type, eventId, reason, authorId } = req.body;
    if (!studentId || points === undefined || !type || !reason) {
      return res.status(400).json({ error: 'studentId, points, type, and reason required' });
    }

    if (type === 'ATTENDANCE' && eventId) {
      const existing = await prisma.pointTransaction.findFirst({
        where: { studentId, eventId, type: 'ATTENDANCE', status: 'ACTIVE' },
      });
      if (existing) {
        return res.status(409).json({ error: 'Баллы за посещение этого мероприятия уже начислены' });
      }
    }

    const transaction = await prisma.pointTransaction.create({
      data: {
        studentId,
        points,
        type,
        eventId: eventId || null,
        reason,
        authorId: authorId || null,
      },
      include: {
        student: { select: { id: true, fullName: true, groupNumber: true } },
        event: { select: { id: true, name: true } },
      },
    });

    const allTransactions = await prisma.pointTransaction.findMany({
      where: { studentId, status: 'ACTIVE' },
      select: { points: true },
    });
    const totalBalance = allTransactions.reduce((sum, t) => sum + t.points, 0);

    try {
      const student = await prisma.student.findUnique({ where: { id: studentId } });
      const { sendPointsAwarded, checkMilestone } = require('../services/bot');
      await sendPointsAwarded(student, Number(points), reason, totalBalance);
      await checkMilestone(studentId);
    } catch (e) { console.error('Point notification failed:', e); }

    res.json(transaction);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { reason } = req.body;

    const transaction = await prisma.pointTransaction.findUnique({ where: { id } });
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    if (transaction.status === 'CANCELLED') return res.status(400).json({ error: 'Транзакция уже отменена' });

    const updated = await prisma.pointTransaction.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        student: { select: { id: true, fullName: true, groupNumber: true } },
        event: { select: { id: true, name: true } },
      },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/event/:eventId', async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.eventId);

    const applications = await prisma.eventApplication.findMany({
      where: { eventId, status: { in: ['APPROVED', 'ATTENDANCE_CONFIRMED', 'AWAITING_MARK'] } },
      include: {
        student: { select: { id: true, fullName: true, groupNumber: true } },
      },
    });

    const transactions = await prisma.pointTransaction.findMany({
      where: { eventId, status: 'ACTIVE' },
      include: {
        student: { select: { id: true, fullName: true, groupNumber: true } },
      },
    });

    const evaluated = new Set(transactions.map(t => t.studentId));

    res.json({
      participants: applications.map(a => ({
        studentId: a.studentId,
        fullName: a.student.fullName,
        groupNumber: a.student.groupNumber,
        participationType: a.participationType,
        evaluated: evaluated.has(a.studentId),
      })),
      totalPoints: transactions.reduce((sum, t) => sum + t.points, 0),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const { eventId, authorId, awards } = req.body;
    if (!eventId || !awards || !Array.isArray(awards)) {
      return res.status(400).json({ error: 'eventId and awards[] required' });
    }

    const results = [];
    for (const award of awards) {
      if (!award.studentId || !award.points || !award.reason) continue;

      const existing = await prisma.pointTransaction.findFirst({
        where: { studentId: award.studentId, eventId, type: award.type || 'MANUAL_ADJUSTMENT', status: 'ACTIVE' },
      });
      if (existing) continue;

      const tx = await prisma.pointTransaction.create({
        data: {
          studentId: award.studentId,
          points: award.points,
          type: award.type || 'MANUAL_ADJUSTMENT',
          eventId,
          reason: award.reason,
          authorId: authorId || null,
        },
      });
       results.push(tx);

       try {
         const student = await prisma.student.findUnique({ where: { id: award.studentId } });
         const balanceRows = await prisma.pointTransaction.findMany({ where: { studentId: award.studentId, status: 'ACTIVE' }, select: { points: true } });
         const balance = balanceRows.reduce((sum, row) => sum + row.points, 0);
         const { sendPointsAwarded, checkMilestone } = require('../services/bot');
         await sendPointsAwarded(student, Number(award.points), award.reason, balance);
         await checkMilestone(award.studentId);
       } catch (e) { console.error('Bulk point notification failed:', e); }
    }

    res.json({ created: results.length, ids: results.map(r => r.id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export { router as pointsRouter };
