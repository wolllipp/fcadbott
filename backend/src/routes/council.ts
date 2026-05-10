import { Router, Request, Response } from 'express';
import { PrismaClient, Role, BudgetStatus } from '@prisma/client';
import { SECTOR_MAP } from './students';

const router = Router();
const prisma = new PrismaClient();

function canManageCouncil(role: string): boolean {
  return role === 'CHAIRMAN' || role === 'DEPUTY' || role === 'DEAN' || role === 'SECRETARY';
}

function canManageStudents(role: string): boolean {
  return role === 'CHAIRMAN' || role === 'DEPUTY' || role === 'DEAN' || role === 'SECRETARY' || role === 'COORDINATOR';
}

// STUDENTS
router.get('/students', async (req: Request, res: Response) => {
  try {
    const students = await prisma.student.findMany({ orderBy: { fullName: 'asc' } });
    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/students', async (req: Request, res: Response) => {
  try {
    const { creatorId, fullName, groupNumber, studentCardNumber, budgetStatus, sectors } = req.body;
    const creator = await prisma.coordinator.findUnique({ where: { id: creatorId } });
    if (!creator || !canManageStudents(creator.role)) return res.status(403).json({ error: 'Access denied' });

    const student = await prisma.student.create({
      data: { fullName, groupNumber, studentCardNumber, budgetStatus: budgetStatus || 'BUDGET', sectors: sectors || [] },
    });
    res.json(student);
  } catch (err: any) {
    console.error(err);
    if (err.code === 'P2002') return res.status(400).json({ error: 'Студент уже существует' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/students/:id', async (req: Request, res: Response) => {
  try {
    const { creatorId, fullName, groupNumber, studentCardNumber, budgetStatus, sectors } = req.body;
    const creator = await prisma.coordinator.findUnique({ where: { id: creatorId } });
    if (!creator || !canManageCouncil(creator.role)) return res.status(403).json({ error: 'Access denied' });

    const student = await prisma.student.update({
      where: { id: Number(req.params.id) },
      data: { fullName, groupNumber, studentCardNumber, budgetStatus, sectors },
    });
    res.json(student);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/students/:id', async (req: Request, res: Response) => {
  try {
    const { creatorId } = req.body;
    const creator = await prisma.coordinator.findUnique({ where: { id: creatorId } });
    if (!creator || !canManageCouncil(creator.role)) return res.status(403).json({ error: 'Access denied' });

    await prisma.exemptionStudent.deleteMany({ where: { studentId: Number(req.params.id) } });
    await prisma.bonusEntry.deleteMany({ where: { studentId: Number(req.params.id) } });
    await prisma.student.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// COORDINATORS
router.get('/coordinators', async (req: Request, res: Response) => {
  try {
    const coordinators = await prisma.coordinator.findMany({ orderBy: { fullName: 'asc' } });
    res.json(coordinators);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/coordinators', async (req: Request, res: Response) => {
  try {
    const { creatorId, fullName, telegramUsername, role, sector } = req.body;
    const creator = await prisma.coordinator.findUnique({ where: { id: creatorId } });
    if (!creator || !canManageCouncil(creator.role)) return res.status(403).json({ error: 'Access denied' });

    const coordinator = await prisma.coordinator.create({
      data: { fullName, telegramUsername, role: role as Role, sector },
    });
    res.json(coordinator);
  } catch (err: any) {
    console.error(err);
    if (err.code === 'P2002') return res.status(400).json({ error: 'Такой Telegram username уже существует' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/coordinators/:id', async (req: Request, res: Response) => {
  try {
    const { creatorId, fullName, telegramUsername, role, sector } = req.body;
    const creator = await prisma.coordinator.findUnique({ where: { id: creatorId } });
    if (!creator || !canManageCouncil(creator.role)) return res.status(403).json({ error: 'Access denied' });

    const coordinator = await prisma.coordinator.update({
      where: { id: Number(req.params.id) },
      data: { fullName, telegramUsername, role: role as Role, sector },
    });
    res.json(coordinator);
  } catch (err: any) {
    console.error(err);
    if (err.code === 'P2002') return res.status(400).json({ error: 'Такой Telegram username уже существует' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/coordinators/:id', async (req: Request, res: Response) => {
  try {
    const { creatorId } = req.body;
    const creator = await prisma.coordinator.findUnique({ where: { id: creatorId } });
    if (!creator || !canManageCouncil(creator.role)) return res.status(403).json({ error: 'Access denied' });

    await prisma.exemption.deleteMany({ where: { createdBy: Number(req.params.id) } });
    await prisma.bonusSubmission.deleteMany({ where: { coordinatorId: Number(req.params.id) } });
    await prisma.coordinator.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// SECTOR OVERVIEW — students grouped by sector with coordinator info
router.get('/sector-overview', async (req: Request, res: Response) => {
  try {
    const coordinators = await prisma.coordinator.findMany({
      where: { sector: { not: null } },
      orderBy: { sector: 'asc' },
    });

    const sectors = coordinators.map((c) => {
      const fullName = SECTOR_MAP[c.sector!] || c.sector!;
      return {
        name: fullName,
        coordinator: { fullName: c.fullName, telegramUsername: c.telegramUsername },
      };
    });

    const students = await prisma.student.findMany({ orderBy: { fullName: 'asc' } });

    const grouped: Record<string, { coordinator: { fullName: string; telegramUsername: string }; students: any[] }> = {};
    for (const sector of sectors) {
      grouped[sector.name] = {
        coordinator: sector.coordinator,
        students: [],
      };
    }

    for (const student of students) {
      for (const sec of student.sectors) {
        const fullName = SECTOR_MAP[sec] || sec;
        if (grouped[fullName]) {
          grouped[fullName].students.push(student);
        }
      }
    }

    res.json(grouped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Assign student to sector
router.post('/students/:id/sector', async (req: Request, res: Response) => {
  try {
    const { creatorId, sector } = req.body;
    const creator = await prisma.coordinator.findUnique({ where: { id: creatorId } });
    if (!creator || !canManageCouncil(creator.role)) return res.status(403).json({ error: 'Access denied' });

    const student = await prisma.student.findUnique({ where: { id: Number(req.params.id) } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const sectors = student.sectors.includes(sector) ? student.sectors : [...student.sectors, sector];
    const updated = await prisma.student.update({
      where: { id: Number(req.params.id) },
      data: { sectors },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove student from sector
router.delete('/students/:id/sector', async (req: Request, res: Response) => {
  try {
    const { creatorId, sector } = req.body;
    const creator = await prisma.coordinator.findUnique({ where: { id: creatorId } });
    if (!creator || !canManageCouncil(creator.role)) return res.status(403).json({ error: 'Access denied' });

    const student = await prisma.student.findUnique({ where: { id: Number(req.params.id) } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const sectors = student.sectors.filter((s: string) => s !== sector);
    const updated = await prisma.student.update({
      where: { id: Number(req.params.id) },
      data: { sectors },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export { router as councilRouter };
