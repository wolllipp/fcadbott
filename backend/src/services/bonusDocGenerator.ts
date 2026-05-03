import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, AlignmentType, WidthType, BorderStyle,
} from 'docx';

const FS = 28; // 14pt in half-points
const FONT = 'Times New Roman';

function txt(text: string, opts?: { bold?: boolean }) {
  return new TextRun({ text, size: FS, font: FONT, bold: opts?.bold });
}

function p(children: TextRun[], align?: any, firstLine?: number) {
  return new Paragraph({
    alignment: align,
    indent: firstLine ? { firstLine } : undefined,
    spacing: { before: 0, after: 0, line: 276, lineRule: 'auto' as any },
    children,
  });
}

function noBorder() { return { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }; }
const noBorders: any = {
  top: noBorder(), bottom: noBorder(), left: noBorder(),
  right: noBorder(), insideH: noBorder(), insideV: noBorder(),
};

const MONTH_NAMES_GENITIVE = [
  '', 'январе', 'феврале', 'марте', 'апреле', 'мае', 'июне',
  'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре',
];

export interface BonusDocEntry {
  studentId?: number;
  fullName: string;
  groupNumber: string;
  studentCardNumber: string;
  amount: number;
  reason: string;
  budgetStatus?: string;
  budgetStudentName?: string;
  budgetStudentGroup?: string;
  budgetStudentCard?: string;
}

function makeStudentTable(rows: BonusDocEntry[], labelCol5: string) {
  const total = rows.reduce((s, e) => s + Number(e.amount), 0);
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [
        new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, children: [p([txt('№', { bold: true })], AlignmentType.CENTER)] }),
        new TableCell({ width: { size: 28, type: WidthType.PERCENTAGE }, children: [p([txt('ФИО', { bold: true })], AlignmentType.CENTER)] }),
        new TableCell({ width: { size: 13, type: WidthType.PERCENTAGE }, children: [p([txt('Группа', { bold: true })], AlignmentType.CENTER)] }),
        new TableCell({ width: { size: 18, type: WidthType.PERCENTAGE }, children: [p([txt('Номер студенческого', { bold: true })], AlignmentType.CENTER)] }),
        new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, children: [p([txt('Сумма', { bold: true })], AlignmentType.CENTER)] }),
        new TableCell({ width: { size: 26, type: WidthType.PERCENTAGE }, children: [p([txt(labelCol5, { bold: true })], AlignmentType.CENTER)] }),
      ]}),
      ...rows.map((e, i) => new TableRow({ children: [
        new TableCell({ children: [p([txt(String(i + 1))], AlignmentType.CENTER)] }),
        new TableCell({ children: [p([txt(e.fullName)])] }),
        new TableCell({ children: [p([txt(e.groupNumber)], AlignmentType.CENTER)] }),
        new TableCell({ children: [p([txt(e.studentCardNumber)], AlignmentType.CENTER)] }),
        new TableCell({ children: [p([txt(String(e.amount))], AlignmentType.CENTER)] }),
        new TableCell({ children: [p([txt(e.reason)])] }),
      ]})),
      // Total row
      new TableRow({ children: [
        new TableCell({ children: [p([txt('')])] }),
        new TableCell({ children: [p([txt('')])] }),
        new TableCell({ children: [p([txt('')])] }),
        new TableCell({ children: [p([txt('')])] }),
        new TableCell({ children: [p([txt(String(total), { bold: true })], AlignmentType.CENTER)] }),
        new TableCell({ children: [p([txt('')])] }),
      ]}),
    ],
  });
}

export async function generateBonusDoc(
  month: number,
  year: number,
  entries: BonusDocEntry[],
  docDate: string
): Promise<Buffer> {
  const monthGen = MONTH_NAMES_GENITIVE[month];

  // Merge duplicates: same studentId or same name+group
  const mergedMap = new Map<string, BonusDocEntry>();
  for (const e of entries) {
    const key = e.studentId ? `id_${e.studentId}` : `name_${e.fullName}_${e.groupNumber}`;
    const existing = mergedMap.get(key);
    if (existing) {
      existing.amount = Number(existing.amount) + Number(e.amount);
    } else {
      mergedMap.set(key, { ...e, amount: Number(e.amount) });
    }
  }
  const uniqueEntries = Array.from(mergedMap.values());

  // TABLE 1 (budget): 
  //   - бюджетники без budgetStudentName
  //   - платники у которых есть budgetStudentName → идут под именем бюджетника
  const table1Entries: BonusDocEntry[] = [];

  for (const e of uniqueEntries) {
    if (e.budgetStatus === 'PAID' && e.budgetStudentName) {
      table1Entries.push({
        ...e,
        fullName: e.budgetStudentName,
        groupNumber: e.budgetStudentGroup || e.groupNumber,
        studentCardNumber: e.budgetStudentCard || e.studentCardNumber,
      });
    } else if (e.budgetStatus !== 'PAID') {
      table1Entries.push(e);
    }
  }

  // TABLE 2 (paid): платники без бюджетника
  const table2Entries: BonusDocEntry[] = uniqueEntries.filter(
    e => e.budgetStatus === 'PAID' && !e.budgetStudentName
  );

  const children: any[] = [
    // Header table
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: noBorders,
      rows: [
        new TableRow({ children: [
          new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: noBorders, children: [p([txt('Факультет компьютерного проектирования')])] }),
          new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: noBorders, children: [p([txt('В комиссию БГУИР')]), p([txt('по социальным вопросам')])] }),
        ]}),
        new TableRow({ children: [
          new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: noBorders, children: [
            p([txt('ДОКЛАДНАЯ ЗАПИСКА')]),
            p([txt(docDate)]),
            p([txt('г. Минск')]),
            p([txt('')]),
          ]}),
          new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: noBorders, children: [p([txt('')])] }),
        ]}),
        new TableRow({ children: [
          new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: noBorders, children: [p([txt('О назначении надбавок к стипендии и поощрений')])] }),
          new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: noBorders, children: [p([txt('')])] }),
        ]}),
      ],
    }),
    p([txt('')]),
  ];

  // Section 1 — budget + paid-with-budget-student
  if (table1Entries.length > 0) {
    children.push(
      p([txt(
        `1. Прошу назначить надбавки к стипендии в ${monthGen} ${year} года за счет стипендиального фонда за хорошую учебу и участие в общественной жизни университета следующим студентам:`
      )], AlignmentType.JUSTIFIED, 720),
      p([txt('')]),
      makeStudentTable(table1Entries, 'Основание назначения надбавки'),
      p([txt('')]),
    );
  }

  // Section 2 — paid without budget student (внебюджет)
  if (table2Entries.length > 0) {
    const num = table1Entries.length > 0 ? '2' : '1';
    children.push(
      p([txt(
        `${num}. Прошу поощрить в ${monthGen} ${year} года за хорошую учебу и участие в общественной жизни университета из средств превышения доходов над расходами, остающихся в распоряжении бюджетной организации следующих студентов:`
      )], AlignmentType.JUSTIFIED, 720),
      p([txt('')]),
      makeStudentTable(table2Entries, 'Основание поощрения'),
      p([txt('')]),
    );
  }

  children.push(
    p([txt('')]),
    new Paragraph({
      spacing: { before: 0, after: 0 },
      children: [
        txt('И.о. декана ФКП'),
        new TextRun({ text: '\t\t\t\t\t\t\t\t', size: FS, font: FONT }),
        txt('П.В.Камлач'),
      ],
    }),
  );

  const doc = new Document({
    styles: { default: { document: { run: { size: FS, font: FONT } } } },
    sections: [{
      properties: { page: { margin: { top: 1134, bottom: 1134, left: 1701, right: 851 } } },
      children,
    }],
  });

  return await Packer.toBuffer(doc);
}
