import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, AlignmentType, WidthType, BorderStyle,
  ITableBordersOptions
} from 'docx';

const FONT_SIZE = 14; // 14pt = 177800 twips (matches original)
const FONT_NAME = 'Times New Roman';

function pt(n: number) { return n * 20; } // pt to twips

function txt(text: string, opts?: { bold?: boolean }) {
  return new TextRun({ text, size: pt(FONT_SIZE), font: FONT_NAME, bold: opts?.bold });
}

function para(children: TextRun[], align?: typeof AlignmentType[keyof typeof AlignmentType], firstLineIndent?: number) {
  return new Paragraph({
    alignment: align,
    indent: firstLineIndent ? { firstLine: firstLineIndent } : undefined,
    children,
    spacing: { before: 0, after: 0, line: 276, lineRule: 'auto' as any },
  });
}

function noBorder() {
  return { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
}

export async function generateExemptionDoc(exemption: any): Promise<Buffer> {
  const date = new Date(exemption.exemptionDate);
  const dateStr = `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;

  const students = exemption.students.map((es: any, i: number) => ({
    num: String(i + 1),
    name: es.student?.fullName || es.externalName || '—',
    group: es.student?.groupNumber || es.externalGroup || '—',
  }));

  // No-border style for header table
  const noBorders: any = {
    top: noBorder(), bottom: noBorder(), left: noBorder(), right: noBorder(), insideH: noBorder(), insideV: noBorder(),
  };

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { size: pt(FONT_SIZE), font: FONT_NAME },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1134,    // 2cm
            bottom: 1134, // 2cm
            left: 1701,   // 3cm
            right: 851,   // 1.5cm
          },
        },
      },
      children: [

        // ── Header table (2 columns, no borders) ──────────────────────────
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: noBorders,
          rows: [
            // Row 0: "Студенческий совет ФКП" | "И.о. декана факультета / компьютерного проектирования / П.В.Камлачу"
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: noBorders,
                  children: [para([txt('Студенческий совет ФКП')])],
                }),
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: noBorders,
                  children: [
                    para([txt('И.о. декана факультета')]),
                    para([txt('компьютерного проектирования')], AlignmentType.JUSTIFIED),
                    para([txt('П.В.Камлачу')], AlignmentType.JUSTIFIED),
                    para([txt('')]),
                  ],
                }),
              ],
            }),

            // Row 1: "ДОКЛАДНАЯ ЗАПИСКА\n<date>\nг. Минск" | ""
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: noBorders,
                  children: [
                    para([txt('ДОКЛАДНАЯ ЗАПИСКА')], AlignmentType.JUSTIFIED),
                    para([txt(dateStr)], AlignmentType.JUSTIFIED),
                    para([txt('г. Минск')], AlignmentType.JUSTIFIED),
                    para([txt('')]),
                  ],
                }),
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: noBorders,
                  children: [para([txt('')])],
                }),
              ],
            }),

            // Row 2: "Освобождение от занятий" | ""
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: noBorders,
                  children: [para([txt('Освобождение от занятий')])],
                }),
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: noBorders,
                  children: [para([txt('')])],
                }),
              ],
            }),
          ],
        }),

        // ── Body paragraph ────────────────────────────────────────────────
        para(
          [txt(`Пропуски занятий ${dateStr} считать по уважительной причине, в связи с ${exemption.reason}:`)],
          AlignmentType.JUSTIFIED,
          720 // ~1.25cm first line indent
        ),

        para([txt('')]),

        // ── Student table ─────────────────────────────────────────────────
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 8, type: WidthType.PERCENTAGE },
                  children: [para([txt('№', { bold: true })], AlignmentType.CENTER)],
                }),
                new TableCell({
                  width: { size: 62, type: WidthType.PERCENTAGE },
                  children: [para([txt('ФИО', { bold: true })], AlignmentType.CENTER)],
                }),
                new TableCell({
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  children: [para([txt('Группа', { bold: true })], AlignmentType.CENTER)],
                }),
              ],
            }),
            ...students.map((s: any) =>
              new TableRow({
                children: [
                  new TableCell({ children: [para([txt(s.num)], AlignmentType.CENTER)] }),
                  new TableCell({ children: [para([txt(s.name)])] }),
                  new TableCell({ children: [para([txt(s.group)], AlignmentType.CENTER)] }),
                ],
              })
            ),
          ],
        }),

        para([txt('')]),
        para([txt('')]),

        // ── Signature ─────────────────────────────────────────────────────
        new Paragraph({
          spacing: { before: 0, after: 0 },
          children: [
            txt('Председатель студенческого совета ФКП'),
            new TextRun({ text: '\t\t\t', size: pt(FONT_SIZE), font: FONT_NAME }),
            txt('И.С. Скворец'),
          ],
          tabStops: [{ type: 'right' as any, position: 9360 }],
        }),
      ],
    }],
  });

  return await Packer.toBuffer(doc);
}
