import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

import { sendNewEvent } from "../services/bot";
const router = Router();

function scannerIds(value: unknown, fallback: number): number[] {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  const ids = values.map(Number).filter((id) => Number.isInteger(id) && id > 0);
  return [...new Set(ids.length ? ids : [fallback])];
}


router.get('/', async (req: Request, res: Response) => {
  try {
    const events = await prisma.event.findMany({
      include: {
        participants: true,
        creator: { select: { id: true, fullName: true } },
        scannerCoordinator: { select: { id: true, fullName: true, telegramUsername: true } },
      },
      orderBy: { eventDate: 'desc' },
    });
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, eventDate, description, coordinatorId, location, status, pointsForAttendance, maxParticipants, audience, facultyOnly, requireApproval, scannerCoordinatorId, scannerCoordinatorIds } = req.body;
    if (!name || !eventDate) return res.status(400).json({ error: 'name and eventDate required' });
    if (!coordinatorId) return res.status(400).json({ error: 'coordinatorId required' });

    const assignedScannerIds = scannerIds(scannerCoordinatorIds ?? scannerCoordinatorId, coordinatorId);
    const event = await prisma.event.create({
      data: {
        name,
        eventDate: new Date(eventDate),
        description,
        createdBy: coordinatorId,
        scannerCoordinatorId: scannerCoordinatorId || coordinatorId,
        scannerAssignments: { create: assignedScannerIds.map((coordinatorId) => ({ coordinatorId })) },
        location: location || null,
        status: status || 'DRAFT',
        pointsForAttendance: pointsForAttendance || 0,
        maxParticipants: maxParticipants || null,
        audience: audience || 'ALL',
        facultyOnly: facultyOnly || false,
        requireApproval: requireApproval || false,
      },
      include: {
        participants: true,
        creator: { select: { id: true, fullName: true } },
        scannerCoordinator: { select: { id: true, fullName: true, telegramUsername: true } },
        scannerAssignments: { include: { coordinator: { select: { id: true, fullName: true, telegramUsername: true } } } },
      },
    });

    if (event.status === 'PUBLISHED') {
      try { await sendNewEvent(event); } catch (_) {}
    }

    res.json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, eventDate, description, coordinatorId, role, location, status, pointsForAttendance, maxParticipants, audience, facultyOnly, requireApproval, scannerCoordinatorId, scannerCoordinatorIds } = req.body;
    const id = Number(req.params.id);
    const isAdmin = role && !['COORDINATOR'].includes(role as string);

    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Event not found' });
    if (!isAdmin && existing.createdBy !== coordinatorId) return res.status(403).json({ error: 'Вы можете редактировать только свои мероприятия' });
    if (!isAdmin && existing.attendanceFinalized) return res.status(403).json({ error: 'Отметка завершена — редактирование недоступно' });

    const assignedScannerIds = scannerCoordinatorIds !== undefined || scannerCoordinatorId !== undefined
      ? scannerIds(scannerCoordinatorIds ?? scannerCoordinatorId, existing.createdBy)
      : null;
    const event = await prisma.event.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(eventDate !== undefined && { eventDate: new Date(eventDate) }),
        ...(description !== undefined && { description }),
        ...(location !== undefined && { location }),
        ...(status !== undefined && { status }),
        ...(pointsForAttendance !== undefined && { pointsForAttendance }),
        ...(maxParticipants !== undefined && { maxParticipants: maxParticipants || null }),
        ...(audience !== undefined && { audience }),
        ...(facultyOnly !== undefined && { facultyOnly }),
        ...(requireApproval !== undefined && { requireApproval }),
        ...(scannerCoordinatorId !== undefined && { scannerCoordinatorId: scannerCoordinatorId || null }),
        ...(assignedScannerIds && {
          scannerAssignments: {
            deleteMany: {},
            create: assignedScannerIds.map((coordinatorId) => ({ coordinatorId })),
          },
        }),
      },
      include: {
        participants: true,
        creator: { select: { id: true, fullName: true } },
        scannerCoordinator: { select: { id: true, fullName: true, telegramUsername: true } },
        scannerAssignments: { include: { coordinator: { select: { id: true, fullName: true, telegramUsername: true } } } },
      },
    });

    // Notify students when a draft becomes published
    if (existing.status !== 'PUBLISHED' && event.status === 'PUBLISHED') {
      try { await sendNewEvent(event); } catch (_) {}
    }

    res.json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { coordinatorId, role } = req.body;
    const isAdmin = role && !['COORDINATOR'].includes(role as string);
    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Event not found' });
    if (!isAdmin && existing.createdBy !== coordinatorId) return res.status(403).json({ error: 'Вы можете удалять только свои мероприятия' });
    if (!isAdmin && existing.attendanceFinalized) return res.status(403).json({ error: 'Отметка завершена — удаление недоступно' });

    await prisma.eventParticipant.deleteMany({ where: { eventId: id } });
    await prisma.event.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/participants', async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.id);
    const { fullName, groupNumber, attended = false, role } = req.body;
    const isAdmin = role && !['COORDINATOR'].includes(role as string);

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.attendanceFinalized && !isAdmin) {
      return res.status(403).json({ error: 'Отметка завершена — добавление участников недоступно' });
    }

    const participant = await prisma.eventParticipant.create({
      data: { eventId, fullName, groupNumber, attended },
    });
    res.json(participant);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:eventId/participants/:participantId', async (req: Request, res: Response) => {
  try {
    const { fullName, groupNumber, attended, role } = req.body;
    const participantId = Number(req.params.participantId);
    const isAdmin = role && !['COORDINATOR'].includes(role as string);

    const participant = await prisma.eventParticipant.findUnique({
      where: { id: participantId },
    });
    if (!participant) return res.status(404).json({ error: 'Participant not found' });

    const event = await prisma.event.findUnique({ where: { id: participant.eventId } });
    if (event?.attendanceFinalized && !isAdmin) {
      return res.status(403).json({ error: 'Отметка посещаемости уже завершена' });
    }

    const updated = await prisma.eventParticipant.update({
      where: { id: participantId },
      data: {
        ...(fullName !== undefined && { fullName }),
        ...(groupNumber !== undefined && { groupNumber }),
        ...(attended !== undefined && { attended }),
      },
    });

    if (attended === true) {
      try {
        const { sendAttendanceMarked, checkMilestone } = require('../services/bot');
        const event = await prisma.event.findUnique({ where: { id: updated.eventId } });
        if (event) {
          const student = await prisma.student.findFirst({
            where: { fullName: updated.fullName, groupNumber: updated.groupNumber },
          });
          if (student) {
            sendAttendanceMarked(student, event.name, event.eventDate);
            checkMilestone(student.id);
          }
        }
      } catch (_) {}
    }

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:eventId/participants/:participantId', async (req: Request, res: Response) => {
  try {
    const participantId = Number(req.params.participantId);
    const participant = await prisma.eventParticipant.findUnique({
      where: { id: participantId },
    });
    if (!participant) return res.status(404).json({ error: 'Participant not found' });

    await prisma.eventParticipant.delete({ where: { id: participantId } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/by-student', async (req: Request, res: Response) => {
  try {
    const { fullName } = req.query;
    if (!fullName) return res.status(400).json({ error: 'fullName required' });

    const events = await prisma.event.findMany({
      where: {
        participants: {
          some: { fullName: fullName as string },
        },
      },
      include: {
        participants: {
          where: { fullName: fullName as string },
        },
        creator: { select: { id: true, fullName: true } },
        scannerCoordinator: { select: { id: true, fullName: true, telegramUsername: true } },
        scannerAssignments: { include: { coordinator: { select: { id: true, fullName: true, telegramUsername: true } } } },
      },
      orderBy: { eventDate: 'desc' },
    });
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/generate-exemption', async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.id);
    const { coordinatorId, exemptionDate, reason } = req.body;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { participants: { where: { attended: true } } },
    });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const attendedStudents = event.participants;

    const exemption = await prisma.exemption.create({
      data: {
        exemptionDate: new Date(exemptionDate),
        reason: reason || event.name,
        createdBy: coordinatorId,
        status: 'PENDING',
        students: {
          create: attendedStudents.map((p) => ({
            externalName: p.fullName,
            externalGroup: p.groupNumber,
          })),
        },
      },
      include: { coordinator: true, students: { include: { student: true } } },
    });

    const { sendExemptionPending } = require('../services/bot');
    await sendExemptionPending(exemption);

    res.json(exemption);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/coordinators', async (_req: Request, res: Response) => {
  try {
    const coordinators = await prisma.coordinator.findMany({
      select: { id: true, fullName: true, telegramUsername: true, role: true },
      orderBy: { fullName: 'asc' },
    });
    res.json(coordinators);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/finalize-attendance', async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.id);
    const { coordinatorId, role } = req.body;
    const isAdmin = role && !['COORDINATOR'].includes(role as string);

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (!isAdmin && event.createdBy !== coordinatorId) {
      return res.status(403).json({ error: 'Вы можете завершить отметку только на своих мероприятиях' });
    }

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: { attendanceFinalized: true },
      include: {
        participants: true,
        creator: { select: { id: true, fullName: true } },
        scannerCoordinator: { select: { id: true, fullName: true, telegramUsername: true } },
        scannerAssignments: { include: { coordinator: { select: { id: true, fullName: true, telegramUsername: true } } } },
      },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/register', async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.id);
    const { fullName, groupNumber } = req.body as { fullName?: string; groupNumber?: string };

    if (!fullName || !groupNumber) {
      return res.status(400).json({ error: 'fullName and groupNumber required' });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const existing = await prisma.eventParticipant.findFirst({
      where: { eventId, fullName, groupNumber },
    });
    if (existing) return res.status(409).json({ error: 'Вы уже записаны на это мероприятие' });

    const participant = await prisma.eventParticipant.create({
      data: { eventId, fullName, groupNumber, attended: false },
    });
    res.json(participant);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export { router as eventsRouter };
