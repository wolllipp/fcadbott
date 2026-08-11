import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [
      totalStudents,
      totalCoordinators,
      totalEvents,
      activeEvents,
      totalApplications,
      pendingApplications,
      approvedApplications,
      totalPointsAwarded,
      studentsWithPoints,
      petitionsPending,
      exemptionsPending,
    ] = await Promise.all([
      prisma.student.count(),
      prisma.coordinator.count(),
      prisma.event.count(),
      prisma.event.count({ where: { status: { not: 'CANCELLED' } } }),
      prisma.eventApplication.count(),
      prisma.eventApplication.count({ where: { status: 'PENDING' } }),
      prisma.eventApplication.count({ where: { status: 'APPROVED' } }),
      prisma.pointTransaction.aggregate({ _sum: { points: true }, where: { status: 'ACTIVE' } }),
      prisma.pointTransaction.findMany({
        where: { status: 'ACTIVE' },
        select: { studentId: true },
        distinct: ['studentId'],
      }),
      prisma.petition.count({ where: { status: 'PENDING' } }),
      prisma.exemption.count({ where: { status: 'PENDING' } }),
    ]);

    res.json({
      students: totalStudents,
      coordinators: totalCoordinators,
      events: totalEvents,
      activeEvents,
      applications: {
        total: totalApplications,
        pending: pendingApplications,
        approved: approvedApplications,
      },
      points: {
        totalAwarded: totalPointsAwarded._sum.points || 0,
        activeStudents: studentsWithPoints.length,
      },
      pendingPetitions: petitionsPending,
      pendingExemptions: exemptionsPending,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/top-students', async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 20;

    const aggregated = await prisma.pointTransaction.groupBy({
      by: ['studentId'],
      where: { status: 'ACTIVE' },
      _sum: { points: true },
      _count: { id: true },
      orderBy: { _sum: { points: 'desc' } },
      take: limit,
    });

    const studentIds = aggregated.map(a => a.studentId);
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, fullName: true, groupNumber: true },
    });
    const studentMap = new Map(students.map(s => [s.id, s]));

    const result = aggregated.map((a, index) => ({
      rank: index + 1,
      student: studentMap.get(a.studentId),
      totalPoints: a._sum.points || 0,
      transactionsCount: a._count.id,
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/event-stats', async (req: Request, res: Response) => {
  try {
    const events = await prisma.event.findMany({
      include: {
        _count: { select: { participants: true, applications: true } },
        applications: {
          where: { status: 'APPROVED' },
          select: { id: true },
        },
        pointTransactions: {
          where: { status: 'ACTIVE' },
          select: { points: true },
        },
      },
      orderBy: { eventDate: 'desc' },
      take: 20,
    });

    const result = events.map(e => ({
      id: e.id,
      name: e.name,
      eventDate: e.eventDate,
      status: e.status,
      participantsCount: e._count.participants,
      applicationsCount: e._count.applications,
      totalPoints: e.pointTransactions.reduce((sum, t) => sum + t.points, 0),
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/recent-activity', async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 30;

    const [applications, points, exemptions] = await Promise.all([
      prisma.eventApplication.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: { select: { fullName: true, groupNumber: true } },
          event: { select: { name: true, eventDate: true } },
        },
      }),
      prisma.pointTransaction.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: { select: { fullName: true, groupNumber: true } },
          event: { select: { name: true } },
          author: { select: { fullName: true } },
        },
      }),
      prisma.exemption.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          coordinator: { select: { fullName: true } },
          students: true,
        },
      }),
    ]);

    const timeline: any[] = [];

    for (const a of applications) {
      timeline.push({
        type: 'application',
        action: a.status === 'APPROVED' ? 'одобрена' : a.status === 'REJECTED' ? 'отклонена' : a.status === 'PENDING' ? 'подана' : a.status.toLowerCase(),
        student: a.student.fullName,
        group: a.student.groupNumber,
        event: a.event.name,
        date: a.createdAt,
      });
    }

    for (const p of points) {
      timeline.push({
        type: 'points',
        action: p.type === 'ATTENDANCE' ? 'начислены за посещение' : p.type === 'ORGANIZATION' ? 'начислены за организацию' : 'начислены',
        student: p.student.fullName,
        group: p.student.groupNumber,
        points: p.points,
        event: p.event?.name,
        date: p.createdAt,
      });
    }

    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json(timeline.slice(0, limit));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export { router as adminRouter };
