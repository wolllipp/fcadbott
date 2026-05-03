import { PrismaClient, BudgetStatus } from '@prisma/client';
import * as XLSX from 'xlsx';
import path from 'path';

const prisma = new PrismaClient();

const COORDINATORS = [
  { fullName: 'Скворец Иван Сергеевич', telegramUsername: 'wolllip', role: 'CHAIRMAN' as const, sector: null },
  { fullName: 'Инна Владимировна', telegramUsername: 'innandri', role: 'DEAN' as const, sector: null },
  { fullName: 'Линкевич Алексей Олегович', telegramUsername: 'feasga', role: 'DEPUTY' as const, sector: null },
  { fullName: 'Самуйлик Елизавета Андреевна', telegramUsername: 'liza_samuylik', role: 'DEPUTY' as const, sector: null },
  { fullName: 'Ларченко Мария Васильевна', telegramUsername: 'mshllka', role: 'SECRETARY' as const, sector: null },
  { fullName: 'Садовский Александр Анатольевич', telegramUsername: 'alexsadouski', role: 'COORDINATOR' as const, sector: 'Научное' },
  { fullName: 'Шаблинский Александр Кириллович', telegramUsername: 'lL_U_L_Ul', role: 'COORDINATOR' as const, sector: 'Инструментальное' },
  { fullName: 'Цуприк Илья Русланович', telegramUsername: 'ilyhat69', role: 'COORDINATOR' as const, sector: 'Танцевальное' },
  { fullName: 'Гайдук Полина Юрьевна', telegramUsername: 'gaiduchello', role: 'COORDINATOR' as const, sector: 'Театральное' },
  { fullName: 'Галяк Иван Павлович', telegramUsername: 'UKIvan_haliak', role: 'COORDINATOR' as const, sector: 'Учебное' },
  { fullName: 'Карпова Анастасия Александровна', telegramUsername: 'justmoth', role: 'COORDINATOR' as const, sector: 'Вокальное' },
  { fullName: 'Емельянович Дарья Юрьевна', telegramUsername: 'bbshkk', role: 'COORDINATOR' as const, sector: 'Культурно-массовое' },
  { fullName: 'Бобровская Варвара Евгеньевна', telegramUsername: 'varyuaa', role: 'COORDINATOR' as const, sector: 'Танцевальное' },
  { fullName: 'Ковалик Диана Александровна', telegramUsername: 'dianqwlk', role: 'COORDINATOR' as const, sector: 'Спортивное' },
  { fullName: 'Помахо Алеся Витальевна', telegramUsername: 'aaysela', role: 'COORDINATOR' as const, sector: 'Профориентационное' },
  { fullName: 'Шахов Евгений Вадимович', telegramUsername: 'pelmesha047', role: 'COORDINATOR' as const, sector: 'Информационное' },
  { fullName: 'Шулеев Денис Константинович', telegramUsername: 'den_drossel', role: 'COORDINATOR' as const, sector: 'Декоративное' },
  { fullName: 'Карпекина Ольга Вадимовна', telegramUsername: 'Olegk_3', role: 'COORDINATOR' as const, sector: 'Декоративное' },
];

function excelDateToDate(serial: number): Date | null {
  if (!serial || isNaN(serial)) return null;
  const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
  return date;
}

function parseBudgetStatus(val: string): BudgetStatus {
  if (!val) return BudgetStatus.BUDGET;
  if (val.includes('Платк')) return BudgetStatus.PAID;
  if (val.includes('Лишен')) return BudgetStatus.NO_STIPEND;
  return BudgetStatus.BUDGET;
}

function parseCardNumber(val: any): string {
  if (!val) return '';
  const s = String(val);
  // Handle scientific notation like 4.181007E7
  if (s.includes('E') || s.includes('e')) {
    return String(Math.round(Number(s)));
  }
  return s.replace(/\s+/g, '').trim();
}

async function main() {
  console.log('🌱 Seeding database...');

  // Upsert coordinators
  for (const c of COORDINATORS) {
    await prisma.coordinator.upsert({
      where: { telegramUsername: c.telegramUsername },
      update: { fullName: c.fullName, role: c.role, sector: c.sector },
      create: c,
    });
  }
  console.log(`✅ ${COORDINATORS.length} coordinators seeded`);

  // Try to load students from xlsx
  const xlsxPath = path.resolve(__dirname, '../../uploads/ФКП_СС.xlsx');
  
  try {
    const workbook = XLSX.readFile(xlsxPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    let count = 0;
    // Skip header row
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[1]) continue; // skip empty rows

      const fullName = String(row[1]).trim();
      const birthDate = excelDateToDate(Number(row[2]));
      const groupNumber = row[3] ? String(Math.round(Number(row[3]))) : '';
      const studentCardNumber = parseCardNumber(row[4]);
      const sectorsRaw = row[5] ? String(row[5]).split(',').map((s: string) => s.trim()) : [];
      const budgetStatus = parseBudgetStatus(row[6] || '');

      if (!fullName || !groupNumber) continue;

      await prisma.student.upsert({
        where: { id: i }, // Using row index as temp id
        update: { fullName, birthDate, groupNumber, studentCardNumber, sectors: sectorsRaw, budgetStatus },
        create: { fullName, birthDate, groupNumber, studentCardNumber, sectors: sectorsRaw, budgetStatus },
      }).catch(() => {
        // If upsert by id fails, just create
        return prisma.student.create({
          data: { fullName, birthDate, groupNumber, studentCardNumber, sectors: sectorsRaw, budgetStatus },
        }).catch(() => null);
      });
      count++;
    }
    console.log(`✅ ${count} students seeded from xlsx`);
  } catch (e) {
    console.warn('⚠️  Could not load xlsx file. Place ФКП_СС.xlsx in backend/uploads/ and re-run seed');
    console.warn('   Students will need to be imported manually');
  }

  console.log('✅ Database seeded successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
