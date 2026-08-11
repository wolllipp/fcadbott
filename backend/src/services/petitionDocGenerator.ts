import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, WidthType, BorderStyle,
} from 'docx';

const FS = 28;
const FONT = 'Times New Roman';

function txt(text: string) {
  return new TextRun({ text, size: FS, font: FONT });
}

function p(children: TextRun[], align?: any, firstLine?: number) {
  return new Paragraph({
    alignment: align,
    indent: firstLine ? { firstLine } : undefined,
    spacing: { before: 0, after: 0 },
    children,
  });
}

function noBdr() {
  return { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
}

const NO_BORDERS: any = {
  top: noBdr(), bottom: noBdr(), left: noBdr(),
  right: noBdr(), insideH: noBdr(), insideV: noBdr(),
};

function cellRight(children: TextRun[]) {
  return new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    borders: NO_BORDERS,
    children: [new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 0, after: 0 },
      children,
    })],
  });
}

function cellLeft(children: TextRun[]) {
  return new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    borders: NO_BORDERS,
    children: [new Paragraph({
      spacing: { before: 0, after: 0 },
      children,
    })],
  });
}

const PETITION_TYPE_TEXT: Record<string, string> = {
  DISCOUNT: 'скидке по оплате за обучение',
  DORMITORY: 'общежитии',
  SPECIALIZATION: 'профилизации',
};

const POINT_TYPE_TEXT: Record<string, string> = {
  ATTENDANCE: 'посещение',
  ORGANIZATION: 'организация',
  MANUAL_ADJUSTMENT: 'корректировка',
};

export async function generatePetitionDoc(petition: any): Promise<Buffer> {
  const student = petition.student;
  const typeText = PETITION_TYPE_TEXT[petition.type] || petition.type;

  const now = new Date();
  const dateStr = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;

  const budgetLabel = student.budgetStatus === 'PAID' ? 'платной' : 'бюджетной';

  const snapshotsByType = petition.snapshots.reduce((acc: any[], s: any) => {
    const existing = acc.find(a => a.eventName === s.eventName && a.type === s.type);
    if (existing) {
      existing.points += s.points;
    } else {
      acc.push({ ...s });
    }
    return acc;
  }, []);

  const snapshotParagraphs = snapshotsByType.map((s: any, i: number) => {
    const d = new Date(s.createdAt);
    const ds = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
    const typeLabel = s.type === 'ATTENDANCE' ? 'Посещение' : s.type === 'ORGANIZATION' ? 'Организация' : s.reason;
    const eventPart = s.eventName ? ` ${s.eventName}` : '';
    return p([txt(`${i + 1}. ${typeLabel}${eventPart} ${ds}`)], AlignmentType.BOTH, 709);
  });

  const totalPoints = petition.totalPoints || petition.balanceAtSubmit || 0;

  const doc = new Document({
    styles: { default: { document: { run: { size: FS, font: FONT } } } },
    sections: [{
      properties: {
        page: {
          margin: { top: 1134, bottom: 1134, left: 1701, right: 851 },
        },
      },
      children: [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: NO_BORDERS,
          rows: [
            new TableRow({ children: [
              cellLeft([txt('Студенческий совет ФКП')]),
              cellRight([txt('Проректору БГУИР')]),
            ]}),
            new TableRow({ children: [
              cellLeft([txt('')]),
              cellRight([txt('Кузнецову Д. Ф.')]),
            ]}),
          ],
        }),
        p([txt('')]),
        p([txt('Ходатайство')]),
        p([txt(dateStr)]),
        p([txt('')]),
        p([
          txt(`${student.fullName}, студент${student.groupNumber ? `а группы ${student.groupNumber}` : ''} ФКП ${budgetLabel} формы обучения, является членом Студенческого совета учреждения образования "Белорусский государственный университет информатики и радиоэлектроники".`),
        ], AlignmentType.BOTH, 709),
        p([txt('')], AlignmentType.BOTH, 709),
        p([
          txt(`${student.fullName} активно участвует в жизни факультета, принимал участие в мероприятиях, таких как:`),
        ], AlignmentType.BOTH, 709),
        ...snapshotParagraphs,
        p([txt('')], AlignmentType.BOTH, 709),
        p([
          txt(`Учитывая вышеизложенное, Студенческий совет ходатайствует о ${typeText} ${student.fullName} согласно поданному заявлению.`),
        ], AlignmentType.BOTH, 709),
        p([txt('')]),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: NO_BORDERS,
          rows: [
            new TableRow({ children: [
              cellLeft([txt('Председатель Студенческого совета')]),
              cellRight([txt('Скворец И.С.')]),
            ]}),
            new TableRow({ children: [
              cellLeft([txt('Заместитель декана по ИВР')]),
              cellRight([txt('Андриалович И.В.')]),
            ]}),
          ],
        }),
        p([txt('')]),
      ],
    }],
  });

  return await Packer.toBuffer(doc);
}
