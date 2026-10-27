import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, WidthType, BorderStyle, AlignmentType,
  TableLayoutType, VerticalAlign,
} from 'docx'

interface LectureRow {
  date: string        // ISO YYYY-MM-DD
  start_time: string
  title: string
  location: string
  lecturer_name: string
}

interface GroupInfo {
  name: string
  start_date: string
  end_date: string
  specialty: string
}

const DOW_RU = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота']

function formatDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const dow = DOW_RU[d.getDay()]
  return { short: `${day}.${month}`, dow: dow.charAt(0).toUpperCase() + dow.slice(1) }
}

function cell(text: string, opts: {
  bold?: boolean
  center?: boolean
  width?: number
  shade?: string
  vAlign?: typeof VerticalAlign.CENTER
} = {}) {
  return new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    shading: opts.shade ? { fill: opts.shade } : undefined,
    verticalAlign: opts.vAlign ?? VerticalAlign.CENTER,
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 4, color: '888888' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: '888888' },
      left:   { style: BorderStyle.SINGLE, size: 4, color: '888888' },
      right:  { style: BorderStyle.SINGLE, size: 4, color: '888888' },
    },
    children: [new Paragraph({
      alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text, bold: opts.bold ?? false, size: 20, font: 'Times New Roman' })],
    })],
  })
}

function headerCell(text: string, width: number) {
  return cell(text, { bold: true, center: true, width, shade: 'D9D9D9' })
}

function para(text: string, opts: { bold?: boolean; center?: boolean; size?: number; spaceAfter?: number } = {}) {
  return new Paragraph({
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: { after: opts.spaceAfter ?? 0 },
    children: [new TextRun({ text, bold: opts.bold ?? false, size: opts.size ?? 22, font: 'Times New Roman' })],
  })
}

export async function exportTimetableDocx(group: GroupInfo, lectures: LectureRow[]) {
  const sorted = [...lectures].sort((a, b) =>
    a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time)
  )

  const dateRange = (() => {
    if (!group.start_date && !group.end_date) return ''
    const fmt = (d: string) => d ? d.split('-').reverse().join('.') : ''
    return `${fmt(group.start_date)} – ${fmt(group.end_date)}`
  })()

  const tableRows = [
    // Header row
    new TableRow({
      tableHeader: true,
      children: [
        headerCell('Дата',                        12),
        headerCell('Тема',                        38),
        headerCell('Место проведения занятий',    28),
        headerCell('ФИО преподавателя',           22),
      ],
    }),
    // Data rows
    ...sorted.map(lec => {
      const { short, dow } = formatDate(lec.date)
      return new TableRow({
        children: [
          new TableCell({
            width: { size: 12, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            borders: {
              top:    { style: BorderStyle.SINGLE, size: 4, color: '888888' },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: '888888' },
              left:   { style: BorderStyle.SINGLE, size: 4, color: '888888' },
              right:  { style: BorderStyle.SINGLE, size: 4, color: '888888' },
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: short, bold: true, size: 20, font: 'Times New Roman' })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: dow, size: 18, font: 'Times New Roman' })],
              }),
              ...(lec.start_time ? [new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: lec.start_time, size: 18, font: 'Times New Roman' })],
              })] : []),
            ],
          }),
          cell(lec.title,         { width: 38 }),
          cell(lec.location || '', { width: 28 }),
          cell(lec.lecturer_name || '', { width: 22 }),
        ],
      })
    }),
  ]

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 720, bottom: 720, left: 1080, right: 720 },
        },
      },
      children: [
        para('Кафедра анестезиологии и реаниматологии с курсом медицинской реабилитации', { bold: true, center: true, size: 22 }),
        para('медицинского института РУДН имени Патриса Лумумбы', { bold: true, center: true, size: 22, spaceAfter: 160 }),
        para('Расписание практических занятий на цикле «Анестезиология и реаниматология»', { center: true, size: 22 }),
        para('студентов медицинского института РУДН', { center: true, size: 22, spaceAfter: 160 }),
        para(`Группа ${group.name}`, { bold: true, center: true, size: 26, spaceAfter: 80 }),
        ...(dateRange ? [para(dateRange, { center: true, size: 22, spaceAfter: 240 })] : [para('', { spaceAfter: 240 })]),

        new Table({
          layout: TableLayoutType.FIXED,
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows,
        }),

        para('', { spaceAfter: 240 }),
        para('Зав. кафедрой, профессор                        Петрова М.В.', { size: 22 }),
      ],
    }],
  })

  const blob = await Packer.toBlob(doc)
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `Расписание_${group.name}${dateRange ? '_' + dateRange.replace(/\s/g, '') : ''}.docx`
  a.click()
  URL.revokeObjectURL(url)
}
