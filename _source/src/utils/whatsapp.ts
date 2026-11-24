import { CourseRecord, Teacher, TariffItem } from '../types';
import { money } from './formatters';
import { totalHours, courseSessionText, actualStudentDue, transferCollectText } from './finance';

export function cleanWhatsAppHeader(input: string): string {
  return String(input || '')
    .replace(/\r/g, '')
    .split('\n')
    .map(line => {
      let t = line.trim();
      if (/^\[\d{1,2}\/\d{1,2}/.test(t)) {
        const close = t.indexOf(']');
        if (close >= 0) {
          t = t.slice(close + 1).trim();
          t = t.replace(/^[^:]{1,100}:\s*/, '');
        }
      } else {
        const m = t.match(/^\d{1,2}\/\d{1,2}(?:\/\d{2,4})?,?\s+\d{1,2}:\d{2}[^:]*?\s+[^:]{1,80}:\s*/);
        if (m) t = t.slice(m[0].length);
      }
      return t;
    })
    .filter(x => x && !/^reenviado(?: muchas veces)?$/i.test(x))
    .join('\n')
    .trim();
}

export function normalizeImport(s: string): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanStudentName(v: string): string {
  return cleanWhatsAppHeader(v).replace(/^(?:nombre(?: y apellido)?|alumno)\s*:\s*/i, '').trim();
}

export interface WhatsAppParseResult {
  student: string;
  phone: string;
  address: string;
  school: string;
  teacherId: string;
  course: string;
  motoVehicle: string;
  method: string;
  balanceCollector: string;
  paymentPlan: 'normal' | 'half_1_3';
  installmentPayer: 'instructor' | 'escuela';
  availabilityCombined: string;
  classDates: string;
  isPromo: boolean;
  warnings: string[];
  notes: string;
}

export function parseIncomingWhatsApp(
  rawText: string,
  teachers: Teacher[],
  schools: string[],
  tariffsBySchool: Record<string, TariffItem[]>
): WhatsAppParseResult {
  const raw = cleanWhatsAppHeader(rawText);
  const warnings: string[] = [];

  const lines = raw.split(/\n/).map(x => x.trim()).filter(Boolean);
  const segments = raw.split(/\s*\/{1,2}\s*|\n/).map(x => x.trim()).filter(Boolean);
  const first = segments[0] || '';

  const escapeRx = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const hasWord = (hay: string, needle: string) =>
    new RegExp('(?:^|[^a-z0-9])' + escapeRx(normalizeImport(needle)).replace(/\\ /g, '\\s+') + '(?=$|[^a-z0-9])', 'i').test(hay);

  const schoolAliases: [string, string[]][] = [
    ['Escuela Argentina de Manejo', ['escuela argentina de manejo', 'escuela argentina', 'eam']],
    ['Central Cars', ['central cars', 'central', 'cc']],
    ['Autoescuela Modelo', ['autoescuela modelo', 'modelo']],
    ['El Club del Manejo', ['el club del manejo', 'club del manejo', 'el club', 'club']]
  ];

  const assignmentLines = lines.filter(line => {
    const n = normalizeImport(line).replace(/[.,;]+$/, '').trim();
    if (n.length > 100 || /\d{3,}|\b(?:curso|disp|direccion|precio|saldo|seña|seno|debe|abon|disponibilidad)\b/.test(n)) return false;
    return schoolAliases.some(([, als]) => als.some(alias => hasWord(n, alias))) ||
      teachers.some(t => (normalizeImport(t.name).match(/[a-z0-9]{3,}/g) || []).some(token => hasWord(n, token)) && n.split(/\s+/).length <= 5);
  });

  const hits = new Set<string>();
  for (const line of assignmentLines) {
    const n = normalizeImport(line);
    for (const [name, als] of schoolAliases) {
      if (als.some(alias => hasWord(n, alias))) hits.add(name);
    }
  }

  let school = hits.size === 1 ? [...hits][0] : '';
  if (!school) {
    warnings.push(hits.size > 1 ? 'Autoescuela ambigua' : 'Autoescuela no identificada');
    school = schools[0] || '';
  }

  const teacherHits: Teacher[] = [];
  const teacherMatchStrength = new Map<string, number>();
  for (const line of assignmentLines) {
    const n = normalizeImport(line);
    for (const t of teachers) {
      const full = normalizeImport(t.name).replace(/\s+/g, ' ');
      const nicknames = [...full.matchAll(/\(([^)]+)\)/g)].map(m => m[1].trim());
      const plain = full.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
      const tokens = plain.match(/[a-z0-9]{3,}/g) || [];
      const strength = hasWord(n, plain) ? 3 : nicknames.some(a => hasWord(n, a)) ? 2 : tokens.some(a => hasWord(n, a)) ? 1 : 0;
      if (strength) {
        if (!teacherHits.some(x => String(x.id) === String(t.id))) teacherHits.push(t);
        teacherMatchStrength.set(String(t.id), Math.max(strength, teacherMatchStrength.get(String(t.id)) || 0));
      }
    }
  }

  const labelled = (re: RegExp) => {
    const m = raw.match(re);
    return m ? m[1].trim() : '';
  };

  const compact = first.match(/^(.+?)\s+(\+?\d[\d .()-]{7,}\d)\s+(.+)$/u);
  const phoneMatch = first.match(/(?:^|\s)(\+?\d{10,13})(?=\s|$|[,;])/);
  const phonePos = phoneMatch ? first.indexOf(phoneMatch[1]) : -1;
  const compactName = phonePos >= 0 ? first.slice(0, phonePos).trim() : (compact ? compact[1].trim() : '');
  const compactPhone = (phonePos >= 0 && phoneMatch) ? phoneMatch[1] : (compact ? compact[2].trim() : '');
  const compactAddress = (phonePos >= 0 && phoneMatch) ? first.slice(phonePos + phoneMatch[1].length).trim() : (compact ? compact[3].trim() : '');

  let student = cleanStudentName(labelled(/(?:nombre(?: y apellido)?|nombre del alumno|alumno)\s*:\s*([^\n/]+)/i) || compactName || first).replace(/[\s/]+$/, '');
  student = student.replace(/\s*(?:\+?\d[\d\s().-]{8,}\d)\s*$/, '').trim();

  let phone = labelled(/(?:celular|tel[eé]fono(?:\s*\/\s*whatsapp)?|whatsapp)\s*:\s*([+\d\s().-]{9,})/i);
  if (!phone && compactPhone) phone = compactPhone;
  if (!phone) {
    const segment = segments.find(x => /^\+?[\d\s().-]{9,}$/.test(x) && x.replace(/\D/g, '').length >= 10);
    if (segment) phone = segment;
  }
  if (!phone) {
    const m = raw.match(/(?:\+?\d[\d\s().-]{8,}\d)/);
    if (m) phone = m[0];
  }

  let address = labelled(/direcci[oó]n(?: completa)?\s*:\s*([^\n/]+)/i) || (compactAddress && /\b\d{1,5}\b/.test(compactAddress) ? compactAddress : '') || segments.find(x => /\b(?:caba|flores|av\.?|calle|yerbal|san isidro|palermo|balvanera)\b/i.test(x) && !/(?:curso|disponibilidad)/i.test(x)) || '';
  if (!address) {
    const phoneIndex = segments.findIndex(x => x.replace(/\D/g, '').length >= 10 && /^\+?[\d\s().-]+$/.test(x));
    const candidate = phoneIndex >= 0 ? segments[phoneIndex + 1] : '';
    if (candidate && /\b\d{1,5}\b/.test(candidate) && /[a-záéíóúñ]/i.test(candidate) && !/(?:curso|disponibilidad|saldo|seña|efec|tarjeta|moto\s|autom[aá]tic)/i.test(candidate)) address = candidate;
  }
  if (!address) address = segments.find(x => /\b\d{1,5}\b/.test(x) && /^[\p{L}][\p{L}\s.,º°#-]{3,}\s+\d{1,5}\b/iu.test(x) && !/(?:manual|autom[aá]tic|moto|curso|disponibilidad|precio|seña|saldo)/i.test(x)) || '';
  address = address.replace(/\s*\/?\s*(?:manual|autom[aá]tic[oa]|moto|scooter)\s*(?:x|×)\s*\d+.*$/i, '').trim().replace(/[,\s]+$/, '');

  let courseChunk = labelled(/curso\s*:\s*([^\n]+)/i) || '';
  if (!courseChunk) {
    const moto = raw.match(/\b(?:moto|scooter|royal\s+enfield(?:\s+hunter)?)\b[^\n/]*(?:x|×)\s*\d{1,2}\b[^\n]*/i);
    const auto = raw.match(/\b(?:auto\s+)?(?:autom[aá]tic[oa]|manual)\s*(?:x|×)\s*\d{1,2}\b[^\n]*/i);
    courseChunk = (moto || auto || [])[0] || segments.find(x => /(?:autom[aá]tic[oa]|manual|moto|auto\s*x\s*\d)/i.test(x) && /(?:x|×)\s*\d+/.test(x)) || '';
  }

  const motoSpec = /\b(?:moto|scooter|royal\s+enfield)\b/i.test(courseChunk) ? (courseChunk.match(/\b(?:moto|scooter)\b\s*((?:(?:semi[ -]?autom[aá]tic[ao]|autom[aá]tic[ao]|con embrague|manual)\s*)?(?:\d{2,3}(?:\s*\/\s*\d{2,3})?\s*(?:cc|c\.?c\.?)?)(?:\s*(?:semi[ -]?autom[aá]tic[ao]|autom[aá]tic[ao]|con embrague|manual))?)/i) || [])[1] || '' : '';
  const motoVehicle = (/royal\s+enfield/i.test(courseChunk) ? ((courseChunk.match(/royal\s+enfield\s+hunter\s+350\s*(?:cc)?/i) || [])[0] || motoSpec) : motoSpec).replace(/\s+/g, ' ').trim();

  const availability = labelled(/disponibilidad(?:\s+de\s+d[ií]as)?\s*:?\s*([^\n/]+)/i) || '';

  const n = normalizeImport(courseChunk);
  const count = (n.match(/(?:x|×|por|de)\s*(\d{1,2})\b/) || [])[1];
  let course = '';
  const schoolTariffsList = tariffsBySchool[school] || [];

  if (count) {
    const category = /extension/.test(n) ? 'Extensión ' : /(?:individual|suelta)/.test(n) ? 'Clase individual ' : '';
    if (/\b(?:moto|scooter|royal\s+enfield)\b/.test(n)) {
      const isA12 = /125\s*\/\s*150|110\s*\/\s*125|\b110\b|\b125\b|\b150\b|a1[.]2/.test(n);
      if (isA12) {
        const exact = schoolTariffsList.find(t => normalizeImport(t[0]) === 'moto a1.2 x' + count);
        if (exact) course = exact[0];
      }
      if (!course && /\+\s*300|\b(?:3[1-9]\d|[4-9]\d\d)\s*(?:cc)?\b|royal\s+enfield/i.test(n)) {
        const exact = schoolTariffsList.find(t => normalizeImport(t[0]) === 'moto a1.4 x' + count);
        if (exact) course = exact[0];
      }
      const matching = schoolTariffsList.filter(t => normalizeImport(t[0]).includes('moto') && normalizeImport(t[0]).endsWith('x' + count));
      if (!course && matching.length === 1) course = matching[0][0];
      else if (!course && matching.length > 1) {
        const isSmall = /125\s*\/\s*150|110\s*\/\s*125|\b110\b|\b125\b|\b150\b|a1[.]2/.test(n);
        const isBig = /\+\s*300|\b(?:3[1-9]\d|[4-9]\d\d)\b|\b300\b|a1[.]4|royal\s+enfield/.test(n);
        const chosen = matching.find(t => (isSmall && /A1[.]2/.test(t[0])) || (isBig && /A1[.]4/.test(t[0])));
        if (chosen) course = chosen[0];
      }
    } else if (/automatic/.test(n)) {
      course = category + (category ? 'automático' : 'Automático') + ' x' + count;
    } else if (/auto|manual/.test(n)) {
      course = category + (category ? 'manual' : 'Manual') + ' x' + count;
    }

    course = course.replace(/\s+x/, ' x');
    if (/\bpromo(?:cion)?\b/.test(normalizeImport(raw)) && /^(?:Automático x(?:4|5|7|10)|Manual x(?:4|5|7|10))$/.test(course)) {
      course = 'PROMO ' + course;
    }
  }

  if (!course && schoolTariffsList.length > 0) {
    course = schoolTariffsList[0][0];
    warnings.push('Curso no reconocido');
  }

  const kind = /^moto/i.test(course) ? 'moto' : /autom[aá]tico/i.test(course) ? 'automatico' : /manual/i.test(course) ? 'manual' : '';
  const compatible = (t: Teacher) => {
    const type = normalizeImport(t.type || '');
    return kind === 'moto' ? /moto/.test(type) : kind === 'automatico' ? /automatic/.test(type) : kind === 'manual' ? /manual/.test(type) : false;
  };
  const eligible = teacherHits.filter(compatible);
  let teacher: Teacher | null = null;
  if (eligible.length) {
    const top = Math.max(...eligible.map(t => teacherMatchStrength.get(String(t.id)) || 0));
    const best = eligible.filter(t => (teacherMatchStrength.get(String(t.id)) || 0) === top);
    if (best.length === 1) teacher = best[0];
  }

  let teacherId = '';
  if (teacher) {
    teacherId = teacher.id;
  } else {
    warnings.push(eligible.length > 1 ? 'Instructor ambiguo' : 'Instructor no identificado');
  }

  const paymentInstructions = normalizeImport(raw);
  const halfPhrase = /(?:mitad|50\s*%|50\s*\/\s*50|dos\s+(?:mitades|partes))/.test(paymentInstructions) &&
    /(?:primer[ao]?\s+clase|1\s*(?:ra|era|a)?\s*clase)/.test(paymentInstructions) &&
    /(?:tercer[ao]?\s+clase|3\s*(?:ra|era|a)?\s*clase)/.test(paymentInstructions);

  let paymentPlan: 'normal' | 'half_1_3' = 'normal';
  let installmentPayer: 'instructor' | 'escuela' = 'instructor';
  if (halfPhrase) {
    paymentPlan = 'half_1_3';
    if (/(?:cobra|cobrar|paga|pagar)\s+(?:a\s+)?(?:la\s+)?(?:escuela|autoescuela)/.test(paymentInstructions)) {
      installmentPayer = 'escuela';
    }
  }

  const payment = normalizeImport(courseChunk + ' ' + (raw.match(/(?:^|\s)(?:efe|efec|efectivo|tarjeta|transferencia|mercado pago)(?=\s|$|[.,/])/i)?.[0] || '') + ' ' + labelled(/(?:forma de pago|pago)\s*:\s*([^\n]+)/i));
  let method = 'Efectivo';
  let balanceCollector = 'instructor';
  if (/transferencia|tarjeta|mercado pago|\bmp\b/.test(payment)) {
    method = 'Tarjeta';
    balanceCollector = 'escuela';
  }

  const days = labelled(/disponibilidad de d[ií]as\s*:\s*([^\n]+)/i);
  const hours = labelled(/disponibilidad de horarios\s*:\s*([^\n]+)/i);
  let availabilityCombined = '';
  if (days) availabilityCombined = days + (hours ? ' — ' + hours : '');
  else if (hours) availabilityCombined = hours;

  const schedule = raw.match(/\b(?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bados?|domingos?)\b[^\n]*(?:\n\s*(?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bados?|domingos?)\b[^\n]*)*/i);
  if (schedule && !days) {
    const entries = schedule[0].split('\n').map(x => x.trim()).filter(x => /^(?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bados?|domingos?)/i.test(x));
    availabilityCombined = entries.join(' / ');
  } else if (availability && !days) {
    availabilityCombined = availability.trim();
  }

  const dates = [...raw.matchAll(/(?:^|[^\d/])(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*\/\s*(\d{4}))?(?=$|[^\d/])/gm)].map(m => {
    const d = Number(m[1]), month = Number(m[2]);
    return d >= 1 && d <= 31 && month >= 1 && month <= 12 ? String(d).padStart(2, '0') + '/' + String(month).padStart(2, '0') + (m[3] ? '/' + m[3] : '') : null;
  }).filter(Boolean);
  const classDates = dates.length ? [...new Set(dates)].join(', ') : '';

  const isPromo = /^PROMO\s/i.test(course) || /\bpromo(?:cion)?\b/.test(normalizeImport(raw));

  return {
    student,
    phone,
    address,
    school,
    teacherId,
    course,
    motoVehicle,
    method,
    balanceCollector,
    paymentPlan,
    installmentPayer,
    availabilityCombined,
    classDates,
    isPromo,
    warnings,
    notes: '',
  };
}

export function generateInstructorWhatsAppMessage(r: CourseRecord, t?: Teacher): string {
  const assignment = t ? r.assignments?.find(a => String(a.teacherId) === String(t.id)) : undefined;
  const transferred = !!r.assignments?.length && !!t && String(t.id) !== String(r.teacherId);
  const hours = assignment ? Number(assignment.hours) : totalHours(r);
  const due = actualStudentDue(r);
  const paidFull = r.method === 'Tarjeta' || r.transferPayment?.paidFull;
  const isCard = r.method !== 'Efectivo';
  const observation = String(r.notes || '').trim();
  const showObservation = observation && !/^(ninguna|ninguno|sin observaciones|no|n\/?a|-)$/i.test(observation);

  if (transferred && t) {
    const vehicleLabel = /moto/i.test(r.course) ? 'MOTO' : /autom[aá]tico/i.test(r.course) ? 'AUTO AUTOMÁTICO' : 'AUTO MANUAL';
    const lines = [
      '🚘 *CURSO ASIGNADO*',
      '🏫 *' + r.school + '*',
      '',
      '👤 *DATOS DEL ALUMNO*',
      '*Nombre:* ' + r.student,
      '*WhatsApp:* ' + (r.phone || 'No informado'),
      '*Dirección:* ' + (r.address || 'No informada'),
      '*Disponibilidad:* ' + (r.availabilityCombined || 'A coordinar'),
      '',
      '🚗 *INFORMACIÓN DEL CURSO*',
      '*Este curso es a completar. Lo tenía otro instructor.*',
      '',
      `*CURSO A COMPLETAR: ${vehicleLabel} · ${courseSessionText(r, hours)}*`,
      ...(r.motoVehicle ? ['*MOTO PARA LAS CLASES:* ' + r.motoVehicle] : []),
      '',
      '💰 *ESTADO DEL PAGO*',
    ];

    if (paidFull) {
      lines.push('✅ *PAGADO COMPLETAMENTE*', 'El alumno abonó el curso a la autoescuela.', '', '⛔ *NO COBRAR NADA AL ALUMNO.*');
    } else {
      lines.push(`*${due === 0 ? 'PAGADO COMPLETAMENTE' : 'PAGO EN EFECTIVO'}*`, '*Indicación de cobro:* ' + transferCollectText(r, assignment || {}));
    }
    lines.push('', '📲 *IMPORTANTE*', 'Contactá al alumno dentro de las próximas 12 horas para coordinar sus clases.');
    return lines.join('\n');
  }

  const lines = [
    '🚘 *NUEVO ALUMNO ASIGNADO*',
    '━━━━━━━━━━━━━━━━',
    '🏫 *AUTOESCUELA*',
    r.school,
    '',
    '👤 *DATOS DEL ALUMNO*',
    '*Nombre:* ' + r.student,
    '*WhatsApp:* ' + (r.phone || 'No informado'),
    '*Dirección:* ' + r.address,
    '*Disponibilidad:* ' + (r.availabilityCombined || 'A coordinar'),
    ...(r.classDates ? ['*Fechas de clases:* ' + r.classDates] : []),
    '',
    '🚗 *CURSO CONTRATADO*',
    '*Curso:* ' + r.course,
    ...(r.motoVehicle ? ['*MOTO PARA LAS CLASES:* ' + r.motoVehicle] : []),
    '*Forma de pago:* ' + (isCard ? 'TARJETA' : 'EFECTIVO'),
    '',
    '💰 *COBRO DEL CURSO*',
  ];

  if (r.paymentPlan?.type === 'half_1_3') {
    lines.push(
      '*PLAN: DOS MITADES — SOLO SI FUE ACORDADO*',
      '*Primera clase: COBRAR ' + money(r.paymentPlan.installments[0]?.amount || 0) + '*',
      '*Tercera clase: COBRAR ' + money(r.paymentPlan.installments[1]?.amount || 0) + '*',
      '*Responsable del cobro:* ' + (r.paymentPlan.payer === 'instructor' ? 'INSTRUCTOR' : 'AUTOESCUELA'),
      ...(r.deposit ? ['*Seña ya abonada:* ' + money(r.deposit) + ' (descontar del importe pendiente)'] : []),
      '⚠️ *No cobrar cuotas ya abonadas. Confirmar pagos antes de cada clase.*'
    );
  } else if (!isCard) {
    if (r.deposit) {
      lines.push(
        '*Precio total:* ' + money(r.price),
        '*Seña recibida por la escuela:* ' + money(r.deposit),
        '*TOTAL A COBRAR AL ALUMNO: ' + money(Math.max(0, r.price - r.deposit)) + '*'
      );
    } else {
      lines.push('*TOTAL A COBRAR AL ALUMNO: ' + money(r.price) + '*');
    }
    lines.push('*Responsable del cobro:* INSTRUCTOR — EFECTIVO');
  } else {
    lines.push('*Pago con tarjeta a la autoescuela.*', '⚠️ *NO COBRAR AL ALUMNO.*');
  }

  lines.push('');
  if (showObservation) {
    lines.push('📝 *OBSERVACIONES*', observation, '');
  }
  lines.push('📲 *IMPORTANTE*', '⏰ *Contactá al alumno dentro de las próximas 12 hs* para coordinar el inicio de sus clases.');

  return lines.join('\n');
}
