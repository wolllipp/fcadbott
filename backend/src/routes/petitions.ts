import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { generatePetitionDoc } from '../services/petitionDocGenerator';

const router = Router();
const prisma = new PrismaClient();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { studentId, type, eventIds } = req.body;
    if (!studentId || !type || !eventIds?.length) {
      return res.status(400).json({ error: 'studentId, type и eventIds обязательны' });
    }

    const events = await prisma.eventParticipant.findMany({
      where: { id: { in: eventIds }, attended: true },
      include: { event: { select: { name: true, eventDate: true } } },
    });

    if (events.length === 0) {
      return res.status(400).json({ error: 'Ни одно из выбранных мероприятий не отмечено как посещённое' });
    }

    const petition = await prisma.petition.create({
      data: {
        studentId,
        type,
        events: {
          create: events.map((ep) => ({
            eventId: ep.eventId,
            eventName: ep.event.name,
            eventDate: ep.event.eventDate,
          })),
        },
      },
      include: { events: true, student: true },
    });

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
    const where = isAdmin ? {} : { studentId: Number(studentId) };

    const petitions = await prisma.petition.findMany({
      where,
      include: { events: true, student: true },
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
    const { role } = req.body;
    if (role !== 'CHAIRMAN' && role !== 'DEAN') {
      return res.status(403).json({ error: 'Только председатель и зам.председателя могут подтверждать ходатайства' });
    }

    const petition = await prisma.petition.update({
      where: { id },
      data: { status: 'APPROVED', approvedAt: new Date() },
      include: { events: true, student: true },
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
    const { role } = req.body;
    if (role !== 'CHAIRMAN' && role !== 'DEAN') {
      return res.status(403).json({ error: 'Только председатель и зам.председателя могут отклонять ходатайства' });
    }

    const petition = await prisma.petition.update({
      where: { id },
      data: { status: 'REJECTED' },
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
      include: { events: true, student: true },
    });
    if (!petition) return res.status(404).json({ error: 'Not found' });
    if (petition.status !== 'APPROVED') return res.status(400).json({ error: 'Ходатайство ещё не одобрено' });

    const docBuffer = await generatePetitionDoc(petition);
    const typeName = petition.type.toLowerCase();
    const filename = `Ходатайство_${typeName}_${petition.id}.docx`;
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
