const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
  const csv = fs.readFileSync(__dirname + '/students.csv', 'utf-8');
  const lines = csv.trim().split('\n');

  let imported = 0, skipped = 0;
  for (const line of lines) {
    const [fullName, faculty, groupNumber, studentCardNumber, budgetStatusRaw, birthDateStr, sectorsRaw] = line.split(';');
    if (!fullName || fullName === 'ФИО') continue;

    let budgetStatus: string;
    if (budgetStatusRaw?.includes('100')) budgetStatus = 'PAID';
    else if (budgetStatusRaw?.includes('Бюджет')) budgetStatus = 'BUDGET';
    else budgetStatus = 'BUDGET';

    let birthDate: Date | null = null;
    if (birthDateStr) {
      const [d, m, y] = birthDateStr.split('.');
      birthDate = new Date(+y, +m - 1, +d);
    }

    const sectors = sectorsRaw ? sectorsRaw.split(',').map((s: string) => s.trim()).filter(Boolean) : [];

    const existing = await prisma.student.findFirst({ where: { studentCardNumber } });
    if (existing) {
      skipped++;
      continue;
    }

    await prisma.student.create({
      data: { fullName, groupNumber, studentCardNumber, budgetStatus, birthDate, sectors },
    });
    imported++;
  }

  console.log(`Imported: ${imported}, Skipped (already exist): ${skipped}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
