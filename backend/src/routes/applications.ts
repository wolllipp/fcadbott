import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

async function ensureEventParticipant(application: { eventId: number; student: { fullName: string; groupNumber: string } }) {
  const existing = await prisma.eventParticipant.findFirst({
    where: { eventId: application.eventId, fullName: application.student.fullName, groupNumber: application.student.groupNumber },
  });
  if (!existing) {
    await prisma.eventParticipant.create({
      data: { eventId: application.eventId, fullName: application.student.fullName, groupNumber: application.student.groupNumber },
    });
  }
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const { eventId, studentId, status, role } = req.query;
    const where: any = {};
    const parsedEventId = eventId ? Number(eventId) : NaN;
    if (Number.isFinite(parsedEventId)) where.eventId = parsedEventId;
    const parsedStudentId = studentId ? Number(studentId) : NaN;
    if (Number.isFinite(parsedStudentId)) where.studentId = parsedStudentId;
    if (status) where.status = status;

    if (role === 'COORDINATOR') {
      const coordinatorId = Number(req.query.coordinatorId);
      if (!coordinatorId) return res.status(400).json({ error: 'coordinatorId required' });
      const coordinator = await prisma.coordinator.findUnique({ where: { id: coordinatorId } });
      if (!coordinator) return res.status(404).json({ error: 'Coordinator not found' });

      where.event = { createdBy: coordinatorId };
    }

    const applications = await prisma.eventApplication.findMany({
      where,
      include: {
        event: { select: { id: true, name: true, eventDate: true, status: true, location: true, pointsForAttendance: true } },
        student: { select: { id: true, fullName: true, groupNumber: true, studentCardNumber: true, chatId: true } },
        approver: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(applications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { eventId, studentId, participationType, studentComment } = req.body;
    if (!eventId || !studentId) return res.status(400).json({ error: 'eventId and studentId required' });

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.status === 'DRAFT' || event.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Мероприятие недоступно для регистрации' });
    }
    if (event.status === 'REGISTRATION_CLOSED' || event.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Регистрация на мероприятие закрыта' });
    }

    if (event.registrationDeadline && new Date() > event.registrationDeadline) {
      return res.status(400).json({ error: 'Дедлайн регистрации истёк' });
    }

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    if (event.audience === 'SS') {
      const isCouncil = student.sectors && student.sectors.length > 0;
      if (!isCouncil) {
        return res.status(400).json({ error: 'Мероприятие доступно только для членов студенческого совета' });
      }
    }

    if (event.facultyOnly && !student.sectors.some(s => s.toLowerCase().includes('фкп'))) {
      return res.status(400).json({ error: 'Мероприятие доступно только для студентов ФКП' });
    }

    if (event.allowedGroups && event.allowedGroups.length > 0) {
      if (!event.allowedGroups.includes(student.groupNumber)) {
        return res.status(400).json({ error: `Мероприятие доступно только для групп: ${event.allowedGroups.join(', ')}` });
      }
    }

    if (event.maxParticipants) {
      const count = await prisma.eventApplication.count({
        where: { eventId, status: { notIn: ['CANCELLED', 'REJECTED'] } },
      });
      if (count >= event.maxParticipants) {
        return res.status(400).json({ error: 'Достигнут лимит участников' });
      }
    }

    const existing = await prisma.eventApplication.findUnique({
      where: { eventId_studentId: { eventId, studentId } },
    });
    if (existing && existing.status !== 'CANCELLED') {
      return res.status(409).json({ error: 'Вы уже подали заявку на это мероприятие' });
    }

    if (existing && existing.status === 'CANCELLED') {
      const updated = await prisma.eventApplication.update({
        where: { id: existing.id },
        data: {
          participationType: participationType || 'VISITOR',
          status: 'PENDING',
          studentComment,
          cancelledAt: null,
        },
        include: { event: true, student: { select: { id: true, fullName: true, groupNumber: true } } },
      });

      try {
        const { getBot } = require('../services/bot');
        const bot = getBot();
        if (bot) {
          const ev = await prisma.event.findUnique({
            where: { id: eventId },
            include: { scannerCoordinator: { select: { chatId: true } }, creator: { select: { chatId: true } } },
          });
          const notifyChatId = ev?.scannerCoordinator?.chatId || (ev?.creator as any)?.chatId;
          if (notifyChatId && updated.event) {
            const typeLabels: Record<string, string> = { VISITOR: 'посетитель', PARTICIPANT: 'участник', ORGANIZER: 'организатор' };
            const dateStr = new Date(updated.event.eventDate).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
            await bot.sendMessage(notifyChatId,
              `📋 *Новая заявка!*\n━━━━━━━━━━━━━━━━━━━━\n🎭 Мероприятие: *${updated.event.name}*\n📅 Дата: *${dateStr}*\n👤 ${updated.student.fullName} (гр. ${updated.student.groupNumber})\n🏷 Тип: ${typeLabels[updated.participationType] || updated.participationType}`,
              { parse_mode: 'Markdown' }
            );
          }
        }
      } catch (_) {}

      return res.json(updated);
    }

    const application = await prisma.eventApplication.create({
      data: {
        eventId,
        studentId,
        participationType: participationType || 'VISITOR',
        status: 'PENDING',
        studentComment,
      },
      include: { event: true, student: { select: { id: true, fullName: true, groupNumber: true } } },
    });

    res.json(application);

    try {
      const { getBot } = require('../services/bot');
      const bot = getBot();
      if (bot) {
        const event = await prisma.event.findUnique({
          where: { id: eventId },
          include: { scannerCoordinator: { select: { chatId: true, fullName: true } }, creator: { select: { chatId: true, fullName: true } } },
        });
        const notifyChatId = event?.scannerCoordinator?.chatId || (event?.creator as any)?.chatId;
        if (notifyChatId && application.event) {
          const typeLabels: Record<string, string> = { VISITOR: 'посетитель', PARTICIPANT: 'участник', ORGANIZER: 'организатор' };
          const dateStr = new Date(application.event.eventDate).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
          await bot.sendMessage(notifyChatId,
            `📋 *Новая заявка!*\n━━━━━━━━━━━━━━━━━━━━\n🎭 Мероприятие: *${application.event.name}*\n📅 Дата: *${dateStr}*\n👤 ${application.student.fullName} (гр. ${application.student.groupNumber})\n🏷 Тип: ${typeLabels[application.participationType] || application.participationType}` +
            (application.event.location ? `\n📍 ${application.event.location}` : ''),
            { parse_mode: 'Markdown' }
          );
        }
      }
    } catch (_) {}
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/approve', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { coordinatorId } = req.body;

    const application = await prisma.eventApplication.findUnique({
      where: { id },
      include: { event: true, student: true },
    });
    if (!application) return res.status(404).json({ error: 'Application not found' });
    if (application.status !== 'PENDING') return res.status(400).json({ error: 'Заявка уже обработана' });

    if (application.event.maxParticipants) {
      const approvedCount = await prisma.eventApplication.count({
        where: { eventId: application.eventId, status: 'APPROVED' },
      });
      if (approvedCount >= application.event.maxParticipants) {
        return res.status(400).json({ error: 'Достигнут лимит участников' });
      }
    }

    const updated = await prisma.eventApplication.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: coordinatorId || null,
        approvedAt: new Date(),
      },
      include: { event: true, student: { select: { id: true, fullName: true, groupNumber: true, chatId: true } } },
    });
    await ensureEventParticipant(updated);

    if (updated.student.chatId && application.event.name) {
      try {
        const { getBot } = require('../services/bot');
        const bot = getBot();
        if (bot) {
          const typeLabels: Record<string, string> = { VISITOR: 'посетитель', PARTICIPANT: 'участник', ORGANIZER: 'организатор' };
          const dateStr = new Date(application.event.eventDate).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
          await bot.sendMessage(updated.student.chatId,
            `✅ *Заявка одобрена!*\n━━━━━━━━━━━━━━━━━━━━\n🎭 Мероприятие: *${application.event.name}*\n📅 Дата: *${dateStr}*\n👤 Тип: ${typeLabels[updated.participationType] || updated.participationType}` +
            (application.event.location ? `\n📍 Место: ${application.event.location}` : '') +
            `\n\nОткройте приложение для подробностей.`,
            { parse_mode: 'Markdown' }
          );
        }
      } catch (_) {}
    }

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/reject', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { coordinatorComment } = req.body;

    const application = await prisma.eventApplication.findUnique({
      where: { id },
      include: { event: true, student: true },
    });
    if (!application) return res.status(404).json({ error: 'Application not found' });
    if (application.status !== 'PENDING') return res.status(400).json({ error: 'Заявка уже обработана' });

    const updated = await prisma.eventApplication.update({
      where: { id },
      data: {
        status: 'REJECTED',
        coordinatorComment,
      },
      include: { event: true, student: { select: { id: true, fullName: true, groupNumber: true, chatId: true } } },
    });

    if (updated.student.chatId) {
      try {
        const { getBot } = require('../services/bot');
        const bot = getBot();
        if (bot) {
          const dateStr = new Date(application.event.eventDate).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
          await bot.sendMessage(updated.student.chatId,
            `❌ *Заявка отклонена*\n━━━━━━━━━━━━━━━━━━━━\n🎭 Мероприятие: *${application.event.name}*\n📅 Дата: *${dateStr}*` +
            (coordinatorComment ? `\n💬 Причина: ${coordinatorComment}` : ''),
            { parse_mode: 'Markdown' }
          );
        }
      } catch (_) {}
    }

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    const application = await prisma.eventApplication.findUnique({ where: { id } });
    if (!application) return res.status(404).json({ error: 'Application not found' });
    if (application.status === 'CANCELLED') return res.status(400).json({ error: 'Заявка уже отменена' });

    const updated = await prisma.eventApplication.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/bulk-approve', async (req: Request, res: Response) => {
  try {
    const { ids, coordinatorId } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array required' });
    }

    const results = [];
    for (const id of ids) {
      try {
        const application = await prisma.eventApplication.findUnique({
          where: { id },
          include: { event: true },
        });
        if (!application || application.status !== 'PENDING') continue;

        if (application.event.maxParticipants) {
          const approvedCount = await prisma.eventApplication.count({
            where: { eventId: application.eventId, status: 'APPROVED' },
          });
          if (approvedCount >= application.event.maxParticipants) continue;
        }

        const updated = await prisma.eventApplication.update({
          where: { id },
          data: { status: 'APPROVED', approvedById: coordinatorId || null, approvedAt: new Date() },
        });
        const student = await prisma.student.findUnique({ where: { id: application.studentId }, select: { fullName: true, groupNumber: true } });
        if (student) await ensureEventParticipant({ eventId: application.eventId, student });
        results.push(updated);
      } catch (_) {}
    }

    res.json({ approved: results.length, ids: results.map(r => r.id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/bulk-reject', async (req: Request, res: Response) => {
  try {
    const { ids, coordinatorComment } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array required' });
    }

    const result = await prisma.eventApplication.updateMany({
      where: { id: { in: ids }, status: 'PENDING' },
      data: { status: 'REJECTED', coordinatorComment },
    });

    res.json({ rejected: result.count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export { router as applicationsRouter };
