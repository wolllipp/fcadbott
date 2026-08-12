import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import crypto from 'crypto';

const router = Router();

async function canScan(event: { createdBy: number; scannerAssignments: { coordinatorId: number }[] }, coordinatorId: number) {
  const coordinator = await prisma.coordinator.findUnique({ where: { id: coordinatorId }, select: { role: true } });
  if (!coordinator) return false;
  if (['CHAIRMAN', 'DEAN', 'DEPUTY', 'SECRETARY'].includes(coordinator.role)) return true;
  return event.createdBy === coordinatorId || event.scannerAssignments.some((a) => a.coordinatorId === coordinatorId);
}

function generateQrToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

router.get('/qr/:applicationId', async (req: Request, res: Response) => {
  try {
    const applicationId = Number(req.params.applicationId);

    const application = await prisma.eventApplication.findUnique({
      where: { id: applicationId },
      include: {
        event: { select: { id: true, name: true, eventDate: true, location: true, pointsForAttendance: true } },
        student: { select: { id: true, fullName: true, groupNumber: true } },
      },
    });

    if (!application) return res.status(404).json({ error: 'Application not found' });
    if (application.status !== 'APPROVED') {
      return res.status(400).json({ error: 'QR-код доступен только для одобренных заявок' });
    }

    let qrToken = application.qrToken;
    if (!qrToken) {
      qrToken = generateQrToken();
      await prisma.eventApplication.update({
        where: { id: applicationId },
        data: { qrToken },
      });
    }

    res.json({
      qrToken,
      applicationId: application.id,
      eventId: application.event.id,
      eventName: application.event.name,
      eventDate: application.event.eventDate,
      location: application.event.location,
      studentName: application.student.fullName,
      studentGroup: application.student.groupNumber,
      points: application.event.pointsForAttendance,
      checkedIn: application.checkedIn,
      checkedOut: application.checkedOut,
      checkInTime: application.checkInTime,
      checkOutTime: application.checkOutTime,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/scan', async (req: Request, res: Response) => {
  try {
    const { qrToken, coordinatorId, type } = req.body;
    if (!qrToken || !coordinatorId) {
      return res.status(400).json({ error: 'qrToken and coordinatorId required' });
    }

    const application = await prisma.eventApplication.findUnique({
      where: { qrToken },
      include: {
        event: {
          select: {
            id: true, name: true, eventDate: true, pointsForAttendance: true, status: true, createdBy: true,
            scannerAssignments: { select: { coordinatorId: true } },
          },
        },
        student: { select: { id: true, fullName: true, groupNumber: true, chatId: true } },
      },
    });

    if (!application) return res.status(404).json({ error: 'QR-код не распознан' });
    if (!(await canScan(application.event, Number(coordinatorId)))) return res.status(403).json({ error: 'Вы не назначены отмечающим на это мероприятие' });
    if (application.status !== 'APPROVED') return res.status(400).json({ error: 'Заявка не одобрена' });
    if (application.event.status === 'CANCELLED') return res.status(400).json({ error: 'Мероприятие отменено' });

    const checkType = type || 'CHECK_IN';

    if (checkType === 'CHECK_IN') {
      if (application.checkedIn) {
        return res.status(400).json({ error: 'Вход уже отмечен', student: application.student, event: application.event });
      }

      await prisma.attendance.create({
        data: { applicationId: application.id, type: 'CHECK_IN', scannedById: coordinatorId },
      });

      await prisma.eventApplication.update({
        where: { id: application.id },
        data: { checkedIn: true, checkInTime: new Date() },
      });

      return res.json({
        success: true,
        type: 'CHECK_IN',
        student: application.student,
        event: application.event,
        message: `Вход отмечен: ${application.student.fullName}`,
      });
    }

    if (checkType === 'CHECK_OUT') {
      if (!application.checkedIn) {
        return res.status(400).json({ error: 'Сначала отметьте вход', student: application.student, event: application.event });
      }
      if (application.checkedOut) {
        return res.status(400).json({ error: 'Выход уже отмечен', student: application.student, event: application.event });
      }

      await prisma.attendance.create({
        data: { applicationId: application.id, type: 'CHECK_OUT', scannedById: coordinatorId },
      });

      await prisma.eventApplication.update({
        where: { id: application.id },
        data: { checkedOut: true, checkOutTime: new Date(), status: 'ATTENDANCE_CONFIRMED' },
      });

      if (application.event.pointsForAttendance > 0) {
        const existingPoints = await prisma.pointTransaction.findFirst({
          where: { studentId: application.studentId, eventId: application.eventId, type: 'ATTENDANCE', status: 'ACTIVE' },
        });

        if (!existingPoints) {
          await prisma.pointTransaction.create({
            data: {
              studentId: application.studentId,
              points: application.event.pointsForAttendance,
              type: 'ATTENDANCE',
              eventId: application.eventId,
              reason: `Посещение: ${application.event.name}`,
              authorId: coordinatorId,
            },
          });
          const { sendPointsAwarded, checkMilestone } = await import('../services/bot');
          const balanceRows = await prisma.pointTransaction.findMany({ where: { studentId: application.studentId, status: 'ACTIVE' }, select: { points: true } });
          const balance = balanceRows.reduce((sum, row) => sum + row.points, 0);
          await sendPointsAwarded(application.student, application.event.pointsForAttendance, `Посещение: ${application.event.name}`, balance);
          await checkMilestone(application.studentId);
        }
      }

      const bot = (await import('../services/bot')).getBot();
      if (bot && application.student.chatId) {
        const dateStr = new Date(application.event.eventDate).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const msg = `✅ *Посещение подтверждено!*\n━━━━━━━━━━━━━━━━━━━━\n🎭 Мероприятие: *${application.event.name}*\n📅 Дата: *${dateStr}*\n💰 Баллы: *+${application.event.pointsForAttendance}*`;
        try { await bot.sendMessage(application.student.chatId, msg, { parse_mode: 'Markdown' }); } catch (_) {}
      }

      return res.json({
        success: true,
        type: 'CHECK_OUT',
        student: application.student,
        event: application.event,
        pointsAwarded: application.event.pointsForAttendance,
        message: `Выход отмечен: ${application.student.fullName}. Начислено ${application.event.pointsForAttendance} баллов.`,
      });
    }

    return res.status(400).json({ error: 'type must be CHECK_IN or CHECK_OUT' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/event/:eventId/attendees', async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.eventId);

    const applications = await prisma.eventApplication.findMany({
      where: { eventId, status: { in: ['APPROVED', 'ATTENDANCE_CONFIRMED', 'AWAITING_MARK'] } },
      include: {
        student: { select: { id: true, fullName: true, groupNumber: true } },
        attendances: { orderBy: { scannedAt: 'asc' } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const result = applications.map(a => ({
      applicationId: a.id,
      student: a.student,
      participationType: a.participationType,
      checkedIn: a.checkedIn,
      checkedOut: a.checkedOut,
      checkInTime: a.checkInTime,
      checkOutTime: a.checkOutTime,
      status: a.status,
      attendances: a.attendances.map(att => ({ type: att.type, time: att.scannedAt })),
    }));

    const checkedIn = result.filter(a => a.checkedIn).length;
    const checkedOut = result.filter(a => a.checkedOut).length;

    res.json({ attendees: result, checkedIn, checkedOut, total: result.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/manual-check', async (req: Request, res: Response) => {
  try {
    const { applicationId, coordinatorId, type } = req.body;
    if (!applicationId || !coordinatorId || !type) {
      return res.status(400).json({ error: 'applicationId, coordinatorId, and type required' });
    }

    const application = await prisma.eventApplication.findUnique({
      where: { id: applicationId },
      include: {
        event: {
          select: {
            id: true, name: true, eventDate: true, pointsForAttendance: true, status: true, createdBy: true,
            scannerAssignments: { select: { coordinatorId: true } },
          },
        },
        student: { select: { id: true, fullName: true, groupNumber: true, chatId: true } },
      },
    });

    if (!application) return res.status(404).json({ error: 'Application not found' });
    if (!(await canScan(application.event, Number(coordinatorId)))) return res.status(403).json({ error: 'Вы не назначены отмечающим на это мероприятие' });
    if (application.status !== 'APPROVED' && application.status !== 'ATTENDANCE_CONFIRMED') {
      return res.status(400).json({ error: 'Заявка в недопустимом статусе' });
    }

    if (type === 'CHECK_IN' && application.checkedIn) {
      return res.status(400).json({ error: 'Вход уже отмечен' });
    }
    if (type === 'CHECK_OUT' && !application.checkedIn) {
      return res.status(400).json({ error: 'Сначала отметьте вход' });
    }
    if (type === 'CHECK_OUT' && application.checkedOut) {
      return res.status(400).json({ error: 'Выход уже отмечен' });
    }

    await prisma.attendance.create({
      data: { applicationId: application.id, type, scannedById: coordinatorId },
    });

    if (type === 'CHECK_IN') {
      await prisma.eventApplication.update({
        where: { id: application.id },
        data: { checkedIn: true, checkInTime: new Date() },
      });
      return res.json({ success: true, message: `Вход отмечен: ${application.student.fullName}` });
    }

    if (type === 'CHECK_OUT') {
      await prisma.eventApplication.update({
        where: { id: application.id },
        data: { checkedOut: true, checkOutTime: new Date(), status: 'ATTENDANCE_CONFIRMED' },
      });

      if (application.event.pointsForAttendance > 0) {
        const existingPoints = await prisma.pointTransaction.findFirst({
          where: { studentId: application.studentId, eventId: application.eventId, type: 'ATTENDANCE', status: 'ACTIVE' },
        });

        if (!existingPoints) {
          await prisma.pointTransaction.create({
            data: {
              studentId: application.studentId,
              points: application.event.pointsForAttendance,
              type: 'ATTENDANCE',
              eventId: application.eventId,
              reason: `Посещение: ${application.event.name}`,
              authorId: coordinatorId,
            },
          });
          const { sendPointsAwarded, checkMilestone } = await import('../services/bot');
          const balanceRows = await prisma.pointTransaction.findMany({ where: { studentId: application.studentId, status: 'ACTIVE' }, select: { points: true } });
          const balance = balanceRows.reduce((sum, row) => sum + row.points, 0);
          await sendPointsAwarded(application.student, application.event.pointsForAttendance, `Посещение: ${application.event.name}`, balance);
          await checkMilestone(application.studentId);
        }
      }

      return res.json({ success: true, message: `Выход отмечен: ${application.student.fullName}. Баллы начислены.` });
    }

    return res.status(400).json({ error: 'type must be CHECK_IN or CHECK_OUT' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export { router as attendanceRouter };
