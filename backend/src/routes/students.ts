import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

const SECTOR_MAP: Record<string, string> = {
  'Научка': 'Научное',
  'Инструментал': 'Инструментальное',
  'Танцевальный': 'Танцевальное',
  'Театрал': 'Театральное',
  'Учебный': 'Учебное',
  'Вокал': 'Вокальное',
  'Культмассовый': 'Культурно-массовое',
  'Декор': 'Декоративное',
  'Спорт': 'Спортивное',
  'Проф': 'Профориентационное',
  'Информ': 'Информационное',
  'Председ/Зам/Секретарь': 'Руководство СС',
};

router.get('/', async (req: Request, res: Response) => {
  try {
    const { sector, role } = req.query;

    let students;

    if (role === 'CHAIRMAN' || role === 'DEPUTY') {
      // See all students
      students = await prisma.student.findMany({
        orderBy: { fullName: 'asc' },
      });
    } else if (sector) {
      // Map sector name to raw value and filter
      const rawSector = Object.entries(SECTOR_MAP).find(
        ([, v]) => v === sector
      )?.[0] || sector as string;

      students = await prisma.student.findMany({
        where: {
          sectors: { has: rawSector },
        },
        orderBy: { fullName: 'asc' },
      });
    } else {
      students = await prisma.student.findMany({ orderBy: { fullName: 'asc' } });
    }

    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export { router as studentsRouter };
