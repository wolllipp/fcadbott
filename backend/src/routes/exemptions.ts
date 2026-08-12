import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { sendExemptionReport, sendExemptionPending } from '../services/bot';

const router = Router();


function getWeekBounds(dateStr?: string) {
  let now: Date;
  if (dateStr) {
    now = new Date(dateStr);
  } else {
    now = new Date();
  }
  const day = now.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setHours(0, 0, 0, 0);
  mon.setDate(now.getDate() + diffToMon);
  const sat = new Date(mon);
  sat.setDate(mon.getDate() + 5);
  sat.setHours(23, 59, 59, 999);
  return { start: mon, end: sat };
}

function getWeekOffset(offset: number) {
  const now = new Date();
  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + offset * 7);
  return getWeekBounds(targetDate.toISOString());
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const { week, weekOffset } = req.query;
    let where: any = {};
    if (week === 'current' || week) {
      const offset = weekOffset ? Number(weekOffset) : 0;
      const { start, end } = getWeekOffset(offset);
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

router.get('/by-student', async (req: Request, res: Response) => {
  try {
    const { studentId, fullName } = req.query;
    const where: any = {};

    if (studentId) {
      where.students = { some: { studentId: Number(studentId) } };
    } else if (fullName) {
      // Find by studentId (if student exists in DB) or externalName
      const student = await prisma.student.findFirst({ where: { fullName: fullName as string } });
      where.students = {
        some: student
          ? { OR: [{ studentId: student.id }, { externalName: fullName as string }] }
          : { externalName: fullName as string },
      };
    } else {
      return res.status(400).json({ error: 'studentId or fullName required' });
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

router.get('/all', async (req: Request, res: Response) => {
  try {
    const { week, weekOffset } = req.query;
    let where: any = {};
    if (week === 'current' || week) {
      const offset = weekOffset ? Number(weekOffset) : 0;
      const { start, end } = getWeekOffset(offset);
      where = { exemptionDate: { gte: start, lte: end } };
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

router.post('/', async (req: Request, res: Response) => {
  try {
    const { coordinatorId, exemptionDate, reason, studentIds, externalStudents } = req.body;

    const date = new Date(exemptionDate);

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
            })),
          ],
        },
      },
      include: { coordinator: true, students: { include: { student: true } } },
    });

    if (isChairman) {
      await sendExemptionReport(exemption);
    } else {
      await sendExemptionPending(exemption);
    }

    res.json(exemption);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { reason, studentIds, externalStudents, exemptionDate, role } = req.body;
    const id = Number(req.params.id);
    const isAdmin = role && !['COORDINATOR'].includes(role as string);

    const existing = await prisma.exemption.findUnique({
      where: { id },
      include: { students: true },
    });
    if (!existing) return res.status(404).json({ error: 'Exemption not found' });

    if (existing.isExhibited && !isAdmin) {
      return res.status(403).json({ error: 'Освобождение уже выставлено, редактирование недоступно' });
    }

    await prisma.exemptionStudent.deleteMany({ where: { exemptionId: id } });

    const updated = await prisma.exemption.update({
      where: { id },
      data: {
        ...(reason !== undefined && { reason }),
        ...(exemptionDate !== undefined && { exemptionDate: new Date(exemptionDate) }),
        editedAt: new Date(),
        students: {
          create: [
            ...(studentIds || []).map((sid: number) => ({ studentId: sid })),
            ...(externalStudents || []).map((s: any) => ({
              externalName: s.fullName,
              externalGroup: s.groupNumber,
            })),
          ],
        },
      },
      include: { coordinator: true, students: { include: { student: true } } },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.exemption.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Exemption not found' });

    await prisma.exemptionStudent.deleteMany({ where: { exemptionId: id } });
    await prisma.exemption.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/toggle-exhibited', async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    if (role !== 'CHAIRMAN' && role !== 'DEPUTY' && role !== 'DEAN' && role !== 'SECRETARY') {
      return res.status(403).json({ error: 'Only chairman, deputy, dean, or secretary can toggle exhibited' });
    }

    const existing = await prisma.exemption.findUnique({ where: { id: Number(req.params.id) } });
    if (!existing) return res.status(404).json({ error: 'Exemption not found' });

    const exemption = await prisma.exemption.update({
      where: { id: Number(req.params.id) },
      data: { isExhibited: !existing.isExhibited },
      include: { coordinator: true, students: { include: { student: true } } },
    });

    if (!existing.isExhibited && exemption.isExhibited) {
      try {
        const { sendExemptionToStudent } = require('../services/bot');
        await Promise.all(exemption.students
          .filter((es) => es.student)
          .map((es) => sendExemptionToStudent(exemption, es.student)));
      } catch (e) { console.error('Exemption notification failed:', e); }
    }
    res.json(exemption);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

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

    await sendExemptionReport(exemption);

    res.json(exemption);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

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

    const { sendExemptionRejected } = require('../services/bot');
    await sendExemptionRejected(exemption, rejectReason);

    res.json(exemption);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/toggle-printed', async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    if (role !== 'CHAIRMAN' && role !== 'DEPUTY' && role !== 'DEAN' && role !== 'SECRETARY') {
      return res.status(403).json({ error: 'Only chairman, deputy, dean, or secretary can toggle printed' });
    }
    const existing = await prisma.exemption.findUnique({ where: { id: Number(req.params.id) } });
    if (!existing) return res.status(404).json({ error: 'Exemption not found' });
    const exemption = await prisma.exemption.update({
      where: { id: Number(req.params.id) },
      data: { isPrinted: !existing.isPrinted },
      include: { coordinator: true, students: { include: { student: true } } },
    });
    res.json(exemption);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/non-exhibited', async (req: Request, res: Response) => {
  try {
    const exemptions = await prisma.exemption.findMany({
      where: { OR: [{ isExhibited: false }, { isPrinted: false }] },
      include: { coordinator: true, students: { include: { student: true } } },
      orderBy: { exemptionDate: 'desc' },
    });
    res.json(exemptions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export { router as exemptionsRouter };
