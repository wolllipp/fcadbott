import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendExemptionReport, sendExemptionPending } from '../services/bot';

const router = Router();
const prisma = new PrismaClient();

function getWeekBounds() {
  const now = new Date();
  const day = now.getDay();
  const diffToMon = (day === 0 ? -6 : 1 - day);
  const mon = new Date(now);
  mon.setHours(0, 0, 0, 0);
  mon.setDate(now.getDate() + diffToMon);
  const sat = new Date(mon);
  sat.setDate(mon.getDate() + 5);
  sat.setHours(23, 59, 59, 999);
  return { start: mon, end: sat };
}

// GET /api/exemptions?week=current
router.get('/', async (req: Request, res: Response) => {
  try {
    const { week } = req.query;
    let where: any = {};
    if (week === 'current') {
      const { start, end } = getWeekBounds();
      where = { exemptionDate: { gte: start, lte: end } };
    }
    const exemptions = await prisma.exemption.findMany({
      where,
      include: { coordinator: true, students: { include: { student: true } } },
      orderBy: { exemptionDate: 'asc' },
    });
    res.json(exemptions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/exemptions/already-exempted?date=...
router.get('/already-exempted', async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    if (!date) return res.json({ studentIds: [] });
    const d = new Date(date as string);
    const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(d); dayEnd.setHours(23, 59, 59, 999);
    const exemptions = await prisma.exemption.findMany({
      where: { exemptionDate: { gte: dayStart, lte: dayEnd } },
      include: { students: true },
    });
    const studentIds = exemptions.flatMap((e) =>
      e.students.filter((s) => s.studentId !== null).map((s) => s.studentId!)
    );
    res.json({ studentIds: [...new Set(studentIds)] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/exemptions/pending — for chairman
router.get('/pending', async (req: Request, res: Response) => {
  try {
    const exemptions = await prisma.exemption.findMany({
      where: { status: 'PENDING' },
      include: { coordinator: true, students: { include: { student: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(exemptions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/exemptions/all — for secretary, view all exemptions
router.get('/all', async (req: Request, res: Response) => {
  try {
    const { week } = req.query;
    let where: any = {};
    if (week === 'current') {
      const now = new Date();
      const day = now.getDay();
      const diffToMon = day === 0 ? -6 : 1 - day;
      const mon = new Date(now);
      mon.setHours(0, 0, 0, 0);
      mon.setDate(now.getDate() + diffToMon);
      const sat = new Date(mon);
      sat.setDate(mon.getDate() + 5);
      sat.setHours(23, 59, 59, 999);
      where = { exemptionDate: { gte: mon, lte: sat } };
    }
    const exemptions = await prisma.exemption.findMany({
      where,
      include: { coordinator: true, students: { include: { student: true } } },
      orderBy: { exemptionDate: 'desc' },
    });
    res.json(exemptions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/exemptions
router.post('/', async (req: Request, res: Response) => {
  try {
    const { coordinatorId, exemptionDate, reason, studentIds, externalStudents } = req.body;

    const { start, end } = getWeekBounds();
    const date = new Date(exemptionDate);
    if (date < start || date > end) {
      return res.status(400).json({ error: 'Можно выставлять освобождения только на текущей неделе' });
    }

    // Check if coordinator is chairman/deputy/secretary — auto-approve
    const coordinator = await prisma.coordinator.findUnique({ where: { id: coordinatorId } });
    const isChairman = coordinator?.role === 'CHAIRMAN' || coordinator?.role === 'DEPUTY' || coordinator?.role === 'SECRETARY';
    const status = isChairman ? 'APPROVED' : 'PENDING';

    const exemption = await prisma.exemption.create({
      data: {
        exemptionDate: date,
        reason,
        createdBy: coordinatorId,
        status,
        students: {
          create: [
            ...(studentIds || []).map((id: number) => ({ studentId: id })),
            ...(externalStudents || []).map((s: any) => ({
              externalName: s.fullName,
              externalGroup: s.groupNumber,
              externalCardNumber: s.studentCardNumber,
            })),
          ],
        },
      },
      include: { coordinator: true, students: { include: { student: true } } },
    });

    if (isChairman) {
      // Chairman's own — send full report with docx immediately
      await sendExemptionReport(exemption);
    } else {
      // Coordinator — send pending notification to chairman
      await sendExemptionPending(exemption);
    }

    res.json(exemption);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/exemptions/:id/approve
router.post('/:id/approve', async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    if (role !== 'CHAIRMAN' && role !== 'DEPUTY' && role !== 'DEAN' && role !== 'SECRETARY') {
      return res.status(403).json({ error: 'Только председатель или секретарь могут подтверждать докладные' });
    }

    const exemption = await prisma.exemption.update({
      where: { id: Number(req.params.id) },
      data: { status: 'APPROVED' },
      include: { coordinator: true, students: { include: { student: true } } },
    });

    // Send full report with docx to both chairman and secretary
    await sendExemptionReport(exemption);

    res.json(exemption);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/exemptions/:id/reject
router.post('/:id/reject', async (req: Request, res: Response) => {
  try {
    const { role, rejectReason } = req.body;
    if (role !== 'CHAIRMAN' && role !== 'DEPUTY' && role !== 'DEAN' && role !== 'SECRETARY') {
      return res.status(403).json({ error: 'Только председатель или секретарь могут отклонять докладные' });
    }

    const exemption = await prisma.exemption.update({
      where: { id: Number(req.params.id) },
      data: { status: 'REJECTED' },
      include: { coordinator: true, students: { include: { student: true } } },
    });

    // Notify the coordinator who submitted
    const { sendExemptionRejected } = require('../services/bot');
    await sendExemptionRejected(exemption, rejectReason);

    res.json(exemption);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export { router as exemptionsRouter };
