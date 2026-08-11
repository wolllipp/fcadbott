import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();


function canManageSector(role: string): boolean {
  return role === 'CHAIRMAN' || role === 'DEPUTY' || role === 'DEAN' || role === 'SECRETARY';
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const sectors = await prisma.sector.findMany({
      include: { coordinator: true, members: true },
      orderBy: { name: 'asc' },
    });
    res.json(sectors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/my', async (req: Request, res: Response) => {
  try {
    const { coordinatorId } = req.query;
    if (!coordinatorId) return res.status(400).json({ error: 'coordinatorId required' });

    const sector = await prisma.sector.findUnique({
      where: { coordinatorId: Number(coordinatorId) },
      include: { coordinator: true, members: true },
    });
    res.json(sector);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { coordinatorId, name } = req.body;
    if (!coordinatorId || !name) return res.status(400).json({ error: 'coordinatorId and name required' });

    const coordinator = await prisma.coordinator.findUnique({ where: { id: coordinatorId } });
    if (!coordinator) return res.status(404).json({ error: 'Coordinator not found' });

    if (!canManageSector(coordinator.role)) {
      return res.status(403).json({ error: 'Only chairman, deputy, dean, or secretary can manage sectors' });
    }

    const sector = await prisma.sector.create({
      data: { name, coordinatorId },
      include: { coordinator: true, members: true },
    });
    res.json(sector);
  } catch (err: any) {
    console.error(err);
    if (err.code === 'P2002') return res.status(400).json({ error: 'Сектор с таким именем уже существует' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const sectorId = Number(req.params.id);

    const existing = await prisma.sector.findUnique({
      where: { id: sectorId },
      include: { coordinator: true },
    });
    if (!existing) return res.status(404).json({ error: 'Sector not found' });

    const updated = await prisma.sector.update({
      where: { id: sectorId },
      data: { name },
      include: { coordinator: true, members: true },
    });
    res.json(updated);
  } catch (err: any) {
    console.error(err);
    if (err.code === 'P2002') return res.status(400).json({ error: 'Сектор с таким именем уже существует' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const sectorId = Number(req.params.id);
    const existing = await prisma.sector.findUnique({ where: { id: sectorId } });
    if (!existing) return res.status(404).json({ error: 'Sector not found' });

    await prisma.sectorMember.deleteMany({ where: { sectorId } });
    await prisma.sector.delete({ where: { id: sectorId } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/members', async (req: Request, res: Response) => {
  try {
    const sectorId = Number(req.params.id);
    const { fullName, groupNumber, studentCardNumber } = req.body;

    const sector = await prisma.sector.findUnique({ where: { id: sectorId } });
    if (!sector) return res.status(404).json({ error: 'Sector not found' });

    const member = await prisma.sectorMember.create({
      data: { sectorId, fullName, groupNumber, studentCardNumber },
    });
    res.json(member);
  } catch (err: any) {
    console.error(err);
    if (err.code === 'P2002') return res.status(400).json({ error: 'Участник уже существует в секторе' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:sectorId/members/:memberId', async (req: Request, res: Response) => {
  try {
    const member = await prisma.sectorMember.findUnique({
      where: { id: Number(req.params.memberId) },
    });
    if (!member) return res.status(404).json({ error: 'Member not found' });

    await prisma.sectorMember.delete({ where: { id: Number(req.params.memberId) } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export { router as sectorsRouter };
