import { CourseRecord, PaymentRecord } from '../types';
import { SCHOOLS } from '../constants/initialData';
import { row, paymentLabel, fullBalanceCourseName, monthLabelForSheet, accountingRecords } from './finance';

export interface ExcelSheet {
  name: string;
  rows: (string | number | null | undefined)[][];
}

function xml(s: any): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function exportGroupedXlsx(sheets: ExcelSheet[], filename: string, sold = false) {
  const enc = new TextEncoder();
  const bytes = (t: string) => enc.encode(t);

  function sheetXml(rows: (string | number | null | undefined)[][], sheetName: string) {
    const instructorSheet =
      !sheetName.startsWith('Liquidación ') &&
      sheetName !== 'Cuenta del instructor' &&
      sheetName !== 'Resumen' &&
      sheetName !== 'Balance por cursos' &&
      sheetName !== 'Liquidaciones por escuela' &&
      rows.some(r => r[0] === 'CURSO COMPLETO');
    const instructorSummary =
      (sheetName === 'Resumen' || sheetName === 'Cuenta del instructor' || sheetName.startsWith('Liquidación ')) &&
      rows.some(r => /^(CUENTA |LIQUIDACIÓN ·)/.test(String(r[0] || '')));
    const balance = sheetName === 'Balance por cursos' || sheetName.startsWith('Liquidación Autoescuela') || instructorSheet || instructorSummary;
    const col = (n: number) => {
      let x = n + 1;
      let out = '';
      while (x) {
        x--;
        out = String.fromCharCode(65 + (x % 26)) + out;
        x = Math.floor(x / 26);
      }
      return out;
    };

    const data = rows
      .map((r, i) => {
        const label = String(r[0] || '');
        const title =
          i === 0 ||
          label === 'RESULTADO FINAL NETO' ||
          label === 'DETALLE POR AUTOESCUELA' ||
          label.startsWith('AUTOESCUELA:') ||
          label.startsWith('SALDOS PENDIENTES') ||
          label.startsWith('TOTAL ') ||
          label.startsWith('RESULTADO FINAL') ||
          label.startsWith('RESULTADO NETO GENERAL');
        const header = ['CURSO', 'AUTOESCUELA', 'CURSO COMPLETO'].includes(label);
        const outcome =
          (balance || instructorSummary) &&
          (label.startsWith('INSTRUCTOR ENTREGA A ESCUELAS') ||
            label.startsWith('ESCUELAS PAGAN AL INSTRUCTOR') ||
            label === 'CUENTAS SALDADAS' ||
            label === 'RESULTADO FINAL' ||
            label === 'RESULTADO NETO GENERAL' ||
            label === 'QUIÉN DEBE PAGAR' ||
            label === 'IMPORTE NETO A LIQUIDAR');

        const cells = r
          .map((v, j) => {
            if (v === null || v === undefined || v === '') return '';
            const ref = col(j) + (i + 1);
            let style = title ? 1 : header ? 3 : typeof v === 'number' ? 2 : 0;

            if (balance) {
              if (title) style = 1;
              else if (header) style = 3;
              else if (outcome) style = label === 'IMPORTE NETO A LIQUIDAR' || label === 'RESULTADO FINAL' ? 10 : 9;
              else if (i > 3 && i < rows.findIndex(x => String(x[0] || '') === 'TOTAL DE CURSOS')) {
                style =
                  j === 3
                    ? 5
                    : j === 4
                    ? 7
                    : j === 5
                    ? 6
                    : j === 6
                    ? String(v).startsWith('ESCUELA PAGA')
                      ? 11
                      : String(v).startsWith('INSTRUCTOR ENTREGA')
                      ? 10
                      : 8
                    : i % 2 === 0
                    ? 4
                    : 0;
              }
            }
            if (typeof v === 'number' && Number.isFinite(v)) return '<c r="' + ref + '" s="' + style + '"><v>' + v + '</v></c>';
            let str = String(v);
            if (/^[=+\-@]/.test(str)) str = "'" + str;
            return '<c r="' + ref + '" s="' + style + '" t="inlineStr"><is><t>' + xml(str) + '</t></is></c>';
          })
          .join('');

        return '<row r="' + (i + 1) + '" ht="' + (title ? 33 : header ? 43 : outcome ? 38 : 31) + '" customHeight="1">' + cells + '</row>';
      })
      .join('');

    const widths = balance ? [32, 14, 12, 19, 24, 23, 34] : [38, 20, 21, 22, 22, 22, 26, 26, 26];
    const cols = widths.map((w, i) => '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>').join('');
    const merges = balance
      ? (() => {
          const idx = rows.findIndex(r => r[0] === 'IMPORTE NETO A LIQUIDAR') + 1;
          return idx > 0 ? '<mergeCells count="1"><mergeCell ref="A' + idx + ':F' + idx + '"/></mergeCells>' : '';
        })()
      : '';

    return (
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="5" topLeftCell="A6" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="27"/><cols>' +
      cols +
      '</cols><sheetData>' +
      data +
      '</sheetData>' +
      merges +
      '</worksheet>'
    );
  }

  function soldSheetXml(rows: (string | number | null | undefined)[][]) {
    const data = rows
      .map(
        (r, i) =>
          '<row r="' +
          (i + 1) +
          '" ht="15" customHeight="1">' +
          r
            .map((v, j) => {
              if (v === undefined || j % 3 === 2) return '';
              const ref = String.fromCharCode(65 + j) + (i + 1);
              const subtotal = r[0] === '';
              const section = r[0] === 'efectivo' || r[0] === 'Tarjeta';
              if (subtotal && j % 3 === 0) return '';
              const st = i === 0 ? (j % 3 === 0 ? 3 + Math.floor(j / 3) : 2) : subtotal ? (i === rows.length - 1 ? 8 : 7) : section ? 2 : j % 3 === 1 ? 2 : 1;
              return typeof v === 'number'
                ? '<c r="' + ref + '" s="' + st + '"><v>' + v + '</v></c>'
                : '<c r="' + ref + '" s="' + st + '" t="inlineStr"><is><t>' + xml(v) + '</t></is></c>';
            })
            .join('') +
          '</row>'
      )
      .join('');
    const cols = Array.from({ length: 11 }, (_, i) => '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + [23, 8, 12][i % 3] + '" customWidth="1"/>').join('');
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>' + cols + '</cols><sheetData>' + data + '</sheetData></worksheet>';
  }

  const entries: Record<string, string> = {};
  entries['[Content_Types].xml'] =
    '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    sheets.map((_, i) => '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('') +
    '</Types>';
  entries['_rels/.rels'] =
    '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
  entries['xl/workbook.xml'] =
    '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
    sheets.map((sh, i) => '<sheet name="' + xml(sh.name) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join('') +
    '</sheets></workbook>';
  entries['xl/_rels/workbook.xml.rels'] =
    '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    sheets.map((_, i) => '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>').join('') +
    '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
  entries['xl/styles.xml'] =
    '<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="13"/><color rgb="FF18344D"/><name val="Aptos"/></font><font><b/><sz val="15"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font><font><b/><sz val="13"/><color rgb="FF18344D"/><name val="Aptos"/></font></fonts><fills count="10"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1E4F7D"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDDECF2"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEAF4FF"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE9F4FF"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF0DC"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE4F6E9"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF1EAFE"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFE5E5"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left style="thin"><color rgb="FFB8C8D7"/></left><right style="thin"><color rgb="FFB8C8D7"/></right><top style="thin"><color rgb="FFB8C8D7"/></top><bottom style="thin"><color rgb="FFB8C8D7"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="12"><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="3" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="3" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyNumberFormat="1"/><xf numFmtId="3" fontId="0" fillId="5" borderId="1" xfId="0" applyFill="1" applyNumberFormat="1"/><xf numFmtId="3" fontId="0" fillId="6" borderId="1" xfId="0" applyFill="1" applyNumberFormat="1"/><xf numFmtId="3" fontId="0" fillId="7" borderId="1" xfId="0" applyFill="1" applyNumberFormat="1"/><xf numFmtId="3" fontId="0" fillId="8" borderId="1" xfId="0" applyFill="1" applyNumberFormat="1"/><xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFill="1" applyFont="1"/><xf numFmtId="3" fontId="2" fillId="7" borderId="1" xfId="0" applyFill="1" applyNumberFormat="1"/><xf numFmtId="3" fontId="2" fillId="9" borderId="1" xfId="0" applyFill="1" applyNumberFormat="1"/></cellXfs></styleSheet>';

  if (sold) {
    entries['xl/styles.xml'] =
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><i/><sz val="11"/><name val="Calibri"/></font><font><b/><i/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="9"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD9D9D9"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF334155"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFC000"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFC5DBA0"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF00B5DF"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFD0A0"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFFF00"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border/><border><left style="thin"><color rgb="FF777777"/></left><right style="thin"><color rgb="FF777777"/></right><top style="thin"><color rgb="FF777777"/></top><bottom style="thin"><color rgb="FF777777"/></bottom></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="9"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center"/></xf><xf numFmtId="0" fontId="0" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center"/></xf><xf numFmtId="0" fontId="2" fillId="3" applyFont="1" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center"/></xf><xf numFmtId="0" fontId="1" fillId="4" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center"/></xf><xf numFmtId="0" fontId="1" fillId="5" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center"/></xf><xf numFmtId="0" fontId="1" fillId="6" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center"/></xf><xf numFmtId="0" fontId="1" fillId="7" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center"/></xf><xf numFmtId="0" fontId="1" fillId="8" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center"/></xf></cellXfs></styleSheet>';
  }

  sheets.forEach((sh, i) => {
    entries['xl/worksheets/sheet' + (i + 1) + '.xml'] = sold ? soldSheetXml(sh.rows) : sheetXml(sh.rows, sh.name);
  });

  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  const crc32 = (u: Uint8Array) => {
    let c = 0xffffffff;
    for (const v of u) c = table[(c ^ v) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const u16 = (n: number) => [n & 255, (n >>> 8) & 255];
  const u32 = (n: number) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];

  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const [name, content] of Object.entries(entries)) {
    const fn = bytes(name);
    const data = bytes(content);
    const crc = crc32(data);
    const local = new Uint8Array([80, 75, 3, 4, 20, 0, 0, 8, 0, 0, 0, 0, 0, 0, ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(fn.length), 0, 0, ...fn]);
    parts.push(local, data);
    central.push(
      new Uint8Array([80, 75, 1, 2, 20, 0, 20, 0, 0, 8, 0, 0, 0, 0, 0, 0, ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(fn.length), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...u32(offset), ...fn])
    );
    offset += local.length + data.length;
  }

  const centralSize = central.reduce((v, x) => v + x.length, 0);
  const end = new Uint8Array([80, 75, 5, 6, 0, 0, 0, 0, ...u16(central.length), ...u16(central.length), ...u32(centralSize), ...u32(offset), 0, 0]);
  const blob = new Blob([...parts, ...central, end] as any, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function instructorExcelSheets(
  records: CourseRecord[],
  payments: PaymentRecord[],
  teacher: string,
  month: string,
  _selectedSchool?: string
): ExcelSheet[] {
  const num = (v: any) => Number(v || 0);
  const round = (v: number) => Math.round(v * 100) / 100;
  const grouped = new Map<string, { course: string; method: string; qty: number; deposit: number; gain: number; commission: number; net: number }>();
  const seen = new Set<string>();
  let grossNet = 0;

  for (const r of records) {
    const course = fullBalanceCourseName(r.originalCourse || r.course);
    const method = paymentLabel(r);
    const net = num(row(r).netToSchool);
    grossNet += net;
    const key = JSON.stringify([course, method, Math.sign(net), num(r.instructorShare), num(r.schoolShare) - num(r.mpFee)]);
    if (!grouped.has(key)) grouped.set(key, { course, method, qty: 0, deposit: 0, gain: 0, commission: 0, net: 0 });
    const g = grouped.get(key)!;
    const id = String(r.recordId || r.id || '') + '|' + String(r.school || '');
    if (!seen.has(id)) {
      seen.add(id);
      g.qty++;
      g.deposit += num(r.deposit);
    }
    g.gain += num(r.schoolShare) - num(r.mpFee);
    g.commission += num(r.instructorShare);
    g.net += net;
  }

  const gs = [...grouped.values()].sort((a, b) => a.course.localeCompare(b.course, 'es') || a.method.localeCompare(b.method, 'es'));
  const sum = (k: 'qty' | 'deposit' | 'gain' | 'commission') => round(gs.reduce((v, g) => v + num(g[k]), 0));
  const delivered = payments.filter(p => p.direction === 'teacher_to_school').reduce((v, p) => v + num(p.amount), 0);
  const paid = payments.filter(p => p.direction === 'school_to_teacher').reduce((v, p) => v + num(p.amount), 0);
  const net = round(grossNet - delivered + paid);
  const moneyText = (v: number) => Math.abs(round(v)).toLocaleString('es-AR', { maximumFractionDigits: 2 });

  const rows: (string | number | null)[][] = [
    ['LIQUIDACIÓN · ' + teacher + ' · ' + monthLabelForSheet(month)],
    ['Mes', month],
    [],
    ['CURSO COMPLETO', 'FORMA DE PAGO', 'CANTIDAD', 'SEÑAS EN ESCUELA ($)', 'COMISIÓN AUTOESCUELA ($)', 'COMISIÓN INSTRUCTOR ($)', 'LIQUIDACIÓN DEL CURSO'],
    ...gs.map(g => [
      g.course,
      g.method,
      g.qty,
      round(g.deposit),
      round(g.gain),
      round(g.commission),
      g.net > 0 ? 'INSTRUCTOR ENTREGA $' + moneyText(g.net) : g.net < 0 ? 'ESCUELA PAGA $' + moneyText(g.net) : 'SALDADO',
    ]),
    ['TOTAL DE CURSOS', '', sum('qty'), sum('deposit'), sum('gain'), sum('commission'), ''],
    [],
    ['RESULTADO FINAL NETO DEL INSTRUCTOR'],
    ['QUIÉN DEBE PAGAR', net > 0 ? 'INSTRUCTOR DEBE ENTREGAR' : net < 0 ? 'DEBEN PAGAR AL INSTRUCTOR' : 'CUENTA SALDADA'],
    ['IMPORTE NETO A LIQUIDAR', '', '', '', '', '', Math.abs(net)],
  ];

  const tabName = ('Liquidación ' + teacher.replace(/^\s*(?:#?\d+\s*[-–—.]\s*)/, '').replace(/[\[\]\/:*?\\]/g, '').trim()).slice(0, 31);
  return [{ name: tabName, rows }];
}

export function exportGeneralBalanceXlsx(
  allRecords: CourseRecord[],
  allPayments: PaymentRecord[],
  month: string,
  schoolFilter: string,
  mode: 'todos' | 'Efectivo' | 'Tarjeta' = 'todos'
) {
  const all = accountingRecords(allRecords).filter(
    (r) =>
      (!month || String(r.date || '').startsWith(month)) &&
      (!schoolFilter || r.school === schoolFilter) &&
      (mode === 'todos' || paymentLabel(r) === mode)
  );
  const num = (x: any) => Number(x || 0);
  const rounded = (x: number) => Math.round(x * 100) / 100;

  const unique = new Map<string, any>();
  const balances = new Map<string, number>();

  for (const r of all) {
    const id =
      String(r.recordId || r.id || '') +
      '|' +
      String(r.school || '') +
      '|' +
      (r.errorVisitAccounting ? 'visita' : '') +
      '|' +
      (r.cancellationAccounting ? 'cancelacion' : '');
    if (!unique.has(id)) {
      unique.set(id, {
        course: r.originalCourse || r.course || 'Curso',
        method: paymentLabel(r),
        school: r.school,
        quantity: 1,
        price: 0,
        deposit: 0,
        commission: 0,
        gain: 0,
        settlement: 0,
      });
    }
    const x = unique.get(id)!;
    const a = row(r);
    x.price += num(r.price);
    x.deposit += num(r.deposit);
    x.commission += num(r.instructorShare);
    x.gain += num(r.schoolShare) - num(r.mpFee);
    x.settlement += num(a.netToSchool);
    const k = String(r.school || '') + '|' + String(r.teacherId || r.teacherName || '');
    balances.set(k, (balances.get(k) || 0) + num(a.netToSchool));
  }

  const grouped = new Map<string, any>();
  for (const x of unique.values()) {
    const course = fullBalanceCourseName(x.course);
    const key = JSON.stringify([course, x.method, x.price, x.commission, x.gain, Math.sign(x.settlement)]);
    if (!grouped.has(key)) {
      grouped.set(key, { course, method: x.method, quantity: 0, deposit: 0, commission: 0, gain: 0, settlement: 0 });
    }
    const g = grouped.get(key)!;
    g.quantity++;
    g.deposit += x.deposit;
    g.commission += x.commission;
    g.gain += x.gain;
    g.settlement += x.settlement;
  }

  const gs = [...grouped.values()].sort((a, b) => a.course.localeCompare(b.course, 'es') || a.method.localeCompare(b.method, 'es'));
  const sum = (k: string) => rounded(gs.reduce((n, g) => n + num(g[k]), 0));

  const payments = allPayments.filter((p) => (!month || String(p.date || '').startsWith(month)) && (!schoolFilter || p.school === schoolFilter));
  if (mode === 'todos') {
    for (const p of payments) {
      const k = String(p.school || '') + '|' + String(p.teacherId || p.teacherName || '');
      balances.set(k, (balances.get(k) || 0) + (p.direction === 'teacher_to_school' ? -num(p.amount) : num(p.amount)));
    }
  }

  const dueSchool = rounded([...balances.values()].reduce((n, v) => n + Math.max(0, v), 0));
  const dueTeachers = rounded([...balances.values()].reduce((n, v) => n + Math.max(0, -v), 0));
  const period = month || 'Todos los meses';
  const netGlobal = rounded(dueSchool - dueTeachers);
  const netPayer = netGlobal > 0 ? 'INSTRUCTORES → AUTOESCUELAS' : netGlobal < 0 ? 'AUTOESCUELAS → INSTRUCTORES' : 'SIN DEUDAS NETAS';

  const rows: (string | number | null)[][] = [
    ['BALANCE GENERAL · CURSOS VENDIDOS'],
    ['Período', period],
    ['Autoescuela', schoolFilter || 'Todas'],
    ['Forma de pago', mode === 'todos' ? 'Efectivo + Tarjeta' : mode],
    [],
    ['CURSO COMPLETO', 'PAGO', 'CANTIDAD', 'SEÑAS RECIBIDAS', 'COMISIÓN AUTOESCUELA', 'COMISIÓN INSTRUCTOR', 'QUIÉN PAGA Y CUÁNTO'],
    ...gs.map((g) => [
      g.course,
      g.method,
      g.quantity,
      rounded(g.deposit),
      rounded(g.gain),
      rounded(g.commission),
      g.settlement > 0
        ? 'INSTRUCTOR ENTREGA $' + Math.round(g.settlement).toLocaleString('es-AR')
        : g.settlement < 0
        ? 'ESCUELA PAGA $' + Math.round(-g.settlement).toLocaleString('es-AR')
        : 'SALDADO',
    ]),
    [],
    ['TOTAL DE CURSOS', '', sum('quantity'), sum('deposit'), sum('gain'), sum('commission'), ''],
    [],
    ['RESULTADO FINAL NETO DEL BALANCE'],
    ['QUIÉN DEBE PAGAR', netPayer],
    ['IMPORTE NETO A LIQUIDAR', '', '', '', '', '', Math.abs(netGlobal)],
  ];
  if (!gs.length) rows.splice(6, 0, ['Sin cursos para el período y forma de pago elegidos']);

  const schoolRows: (string | number | null)[][] = [
    ['LIQUIDACIONES POR AUTOESCUELA'],
    ['Período', period],
    ['Autoescuela', schoolFilter || 'Todas'],
    [],
    ['AUTOESCUELA', 'CURSOS', 'VENTAS $', 'SEÑAS EN ESCUELA $', 'COMISIÓN INSTRUCTOR $', 'COMISIÓN AUTOESCUELA $', 'INSTRUCTOR ENTREGA $', 'ESCUELA PAGA $'],
  ];
  for (const s of SCHOOLS.filter((s) => !schoolFilter || s === schoolFilter)) {
    const rs = [...unique.values()].filter((x) => x.school === s);
    const schoolBalances = [...balances.entries()].filter(([k]) => k.startsWith(s + '|')).map(([, v]) => v);
    schoolRows.push([
      s,
      rs.length,
      rounded(rs.reduce((n, x) => n + x.price, 0)),
      rounded(rs.reduce((n, x) => n + x.deposit, 0)),
      rounded(rs.reduce((n, x) => n + x.commission, 0)),
      rounded(rs.reduce((n, x) => n + x.gain, 0)),
      rounded(schoolBalances.reduce((n, v) => n + Math.max(0, v), 0)),
      rounded(schoolBalances.reduce((n, v) => n + Math.max(0, -v), 0)),
    ]);
  }

  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const sheetPeriod = month ? ' ' + monthNames[Number(month.slice(5, 7)) - 1] + month.slice(0, 4) : ' Todos';
  exportGroupedXlsx(
    [
      { name: 'Liquidación Autoescuela' + sheetPeriod, rows },
      { name: 'Liquidaciones por escuela', rows: schoolRows },
    ],
    `Balance_${mode === 'todos' ? 'Efectivo_y_Tarjeta' : mode}_${month || 'todos_los_meses'}.xlsx`
  );
}

function soldCourseCategory(course: string): string | null {
  const c = String(course || '').replace(/^PROMO\s+/i, '').trim();
  let m = c.match(/^Manual x(4|5|7|10)$/i);
  if (m) return 'a x ' + m[1];
  m = c.match(/^Automático x(4|5|7|10)$/i);
  if (m) return 'ATM x' + m[1];
  if (/^Clase individual manual x1$/i.test(c)) return 'clase manual x1';
  if (/^Clase individual automático x1$/i.test(c)) return 'clase automático x1';
  m = c.match(/^Extensión (manual|automático) x1$/i);
  if (m) return 'ext ' + m[1].toLowerCase() + ' x1';
  m = c.match(/^Extensión (?:manual|automático) x(2|3|5)$/i);
  if (m) return 'ext x ' + m[1];
  if (c === 'Moto A1.2 x5') return 'moto x 5';
  if (c === 'Moto A1.2 x2') return 'moto x 2';
  if (c === 'Moto A1.3 x3') return 'moto A1.3 x3';
  if (c === 'Moto A1.4 x3') return 'moto A1.4 x3';
  if (c === 'Estacionamiento manual x2') return 'estacionamiento x2';
  return c || null;
}

export function exportSoldCoursesXlsx(records: CourseRecord[], month: string) {
  const schools = ['Escuela Argentina de Manejo', 'El Club del Manejo', 'Autoescuela Modelo', 'Central Cars'];
  const labels = [
    'a x 4', 'a x 5', 'a x 7', 'a x 10', 'clase manual x1', 'clase automático x1',
    'ext manual x1', 'ext automático x1', 'ext x 2', 'ext x 3', 'ext x 5',
    'ATM x4', 'ATM x5', 'ATM x7', 'ATM x10', 'moto x 5', 'moto x 2',
    'moto A1.3 x3', 'moto 300', 'moto A1.4 x3', 'estacionamiento x2'
  ];
  const counts = new Map<string, number>();
  const seen = new Set<string>();

  for (const r of records) {
    if (r.status === 'cancelado' || (month && !String(r.date || '').startsWith(month))) continue;
    const label = soldCourseCategory(r.course);
    if (!label || !schools.includes(r.school)) continue;
    const method = r.method === 'Efectivo' ? 'Efectivo' : 'Tarjeta';
    if (r.id && seen.has(r.id)) continue;
    if (r.id) seen.add(r.id);
    const k = JSON.stringify([r.school, method, label]);
    counts.set(k, (counts.get(k) || 0) + 1);
  }

  const rows: (string | number | undefined)[][] = [];
  const block = (values: [string, string | number][]) => {
    const r: (string | number | undefined)[] = [];
    values.forEach((v, i) => {
      r[i * 3] = v[0];
      r[i * 3 + 1] = v[1];
    });
    rows.push(r);
  };

  block(['EAM', 'CLUB', 'MODELO', 'CENTRAL'].map((x) => [x, 'total']));
  for (const method of ['Efectivo', 'Tarjeta']) {
    block(schools.map(() => [method === 'Efectivo' ? 'efectivo' : 'Tarjeta', '']));
    for (const label of labels) {
      block(schools.map((s) => [label, counts.get(JSON.stringify([s, method, label])) || 0]));
    }
    block(schools.map((s) => ['', labels.reduce((n, l) => n + (counts.get(JSON.stringify([s, method, l])) || 0), 0)]));
  }

  exportGroupedXlsx([{ name: 'Cursos vendidos', rows }], `Cursos vendidos ${month || 'Todos'}.xlsx`, true);
}
