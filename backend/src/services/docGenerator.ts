import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, AlignmentType, WidthType, BorderStyle,
} from 'docx';

// In docx library for Node.js, size is in half-points: 14pt = 28
const FS = 28;
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

function noBorder() {
  return { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
}

const noBorders: any = {
  top: noBorder(), bottom: noBorder(), left: noBorder(),
  right: noBorder(), insideH: noBorder(), insideV: noBorder(),
};

export async function generateExemptionDoc(exemption: any): Promise<Buffer> {
  const date = new Date(exemption.exemptionDate);
  const dateStr = `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;

  const students = exemption.students.map((es: any, i: number) => ({
    num: String(i + 1),
    name: es.student?.fullName || es.externalName || '—',
    group: es.student?.groupNumber || es.externalGroup || '—',
  }));

  const doc = new Document({
    styles: { default: { document: { run: { size: FS, font: FONT } } } },
    sections: [{
      properties: { page: { margin: { top: 1134, bottom: 1134, left: 1701, right: 851 } } },
      children: [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: noBorders,
          rows: [
            new TableRow({ children: [
              new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: noBorders, children: [p([txt('Студенческий совет ФКП')])] }),
              new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: noBorders, children: [p([txt('И.о. декана факультета')]), p([txt('компьютерного проектирования')]), p([txt('П.В.Камлачу')]), p([txt('')])] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: noBorders, children: [p([txt('ДОКЛАДНАЯ ЗАПИСКА')]), p([txt(dateStr)]), p([txt('г. Минск')]), p([txt('')])] }),
              new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: noBorders, children: [p([txt('')])] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: noBorders, children: [p([txt('Освобождение от занятий')])] }),
              new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: noBorders, children: [p([txt('')])] }),
            ]}),
          ],
        }),
        p([txt('')]),
        p([txt(`Пропуски занятий ${dateStr} считать по уважительной причине, в связи с ${exemption.reason}:`)], AlignmentType.JUSTIFIED, 720),
        p([txt('')]),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: [
              new TableCell({ width: { size: 8, type: WidthType.PERCENTAGE }, children: [p([txt('№', { bold: true })], AlignmentType.CENTER)] }),
              new TableCell({ width: { size: 63, type: WidthType.PERCENTAGE }, children: [p([txt('ФИО', { bold: true })], AlignmentType.CENTER)] }),
              new TableCell({ width: { size: 29, type: WidthType.PERCENTAGE }, children: [p([txt('Группа', { bold: true })], AlignmentType.CENTER)] }),
            ]}),
            ...students.map((s: any) => new TableRow({ children: [
              new TableCell({ children: [p([txt(s.num)], AlignmentType.CENTER)] }),
              new TableCell({ children: [p([txt(s.name)])] }),
              new TableCell({ children: [p([txt(s.group)], AlignmentType.CENTER)] }),
            ]})),
          ],
        }),
        p([txt('')]),
        p([txt('')]),
        new Paragraph({ spacing: { before: 0, after: 0 }, children: [txt('Председатель студенческого совета ФКП'), new TextRun({ text: '\t\t\t', size: FS, font: FONT }), txt('И.С. Скворец')] }),
      ],
    }],
  });

  return await Packer.toBuffer(doc);
}
