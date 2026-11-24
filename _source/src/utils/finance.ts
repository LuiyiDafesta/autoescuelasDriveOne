import { CourseRecord, CourseAssignment, TariffItem } from '../types';
import { money } from './formatters';

export interface CalculationResult {
  base: number;
  price: number;
  deposit: number;
  fee: number;
  teacher: number;
  school: number;
  surcharge: number;
  balance: number;
  invalid: boolean;
}

export function calcCourse(
  tariff: TariffItem | undefined,
  method: string,
  isPromo: boolean,
  salePrice: number,
  hasDeposit: boolean,
  depositAmount: number,
  mpFee: number
): CalculationResult {
  if (!tariff) {
    return {
      base: 0, price: 0, deposit: 0, fee: 0, teacher: 0, school: 0, surcharge: 0, balance: 0, invalid: true,
    };
  }

  const isCard = method !== 'Efectivo';
  const base = isCard ? (tariff[3] == null ? NaN : Number(tariff[3])) : Number(tariff[1]);
  const price = isPromo ? Number(salePrice || 0) : base;
  const deposit = hasDeposit ? Number(depositAmount || 0) : 0;
  const fee = Number(mpFee || 0);
  const teacher = tariff[2] == null ? NaN : Number(tariff[2]);
  const surcharge = isCard ? Math.max(0, price - Number(tariff[1])) : 0;
  const school = price - teacher - surcharge;

  return {
    base,
    price,
    deposit,
    fee,
    teacher,
    school,
    surcharge,
    balance: Math.max(0, price - deposit),
    invalid: !Number.isFinite(price) || !Number.isFinite(teacher) || price < 0 || deposit < 0 || deposit > price || fee < 0,
  };
}

export function totalHours(r: Pick<CourseRecord, 'course'>): number {
  const m = String(r.course || '').match(/(?:x|×)\s*(\d+)/i);
  return m ? Number(m[1]) : 0;
}

export function motoFiveSessionPlan(r: Pick<CourseRecord, 'course' | 'originalCourse'>) {
  const c = String(r.originalCourse || r.course || '');
  if (/^(?:promo\s+)?moto\s+a\.?1\.2\s*[x×]\s*5\b/i.test(c)) {
    return { sessions: 2, hoursPerSession: 2.5, totalHours: 5 };
  }
  if (/^(?:promo\s+)?moto\s+a\.?1\.3\s*[x×]\s*3\b/i.test(c)) {
    return { sessions: 2, hoursPerSession: 1.5, totalHours: 3 };
  }
  return null;
}

export function hourFee(r: CourseRecord): number | null {
  const hours = totalHours(r);
  return hours > 0 && Number.isFinite(Number(r.instructorShare)) ? Number(r.instructorShare) / hours : null;
}

export function courseSessionText(r: Pick<CourseRecord, 'course' | 'originalCourse'>, hours?: number): string {
  const h = hours !== undefined ? hours : totalHours(r);
  const motoPlan = motoFiveSessionPlan(r);
  if (motoPlan) {
    const sessions = Math.round(h / motoPlan.hoursPerSession);
    return `${sessions} ${sessions === 1 ? 'clase' : 'clases'} (${String(h).replace('.', ',')} hs)`;
  }
  return `${h} ${h === 1 ? 'clase' : 'clases'}`;
}

export function actualStudentDue(r: CourseRecord): number {
  if (r.cancellationAccounting || r.status === 'cancelado') return 0;
  if (r.transferPayment?.paidFull) return 0;
  if (r.transferPayment && Number.isFinite(Number(r.transferPayment.due))) {
    const due = Math.max(0, Number(r.transferPayment.due));
    if (r.transferRole) {
      const role = r.transferPayment.pendingCollector === 'original' ? 'original' : 'received';
      return r.transferRole === role ? due : 0;
    }
    return due;
  }
  if (r.method !== 'Efectivo' && !r.paymentPlan) return 0;
  return Math.max(0, Number(r.price || 0) - Number(r.deposit || 0));
}

export function row(r: CourseRecord) {
  const collector = r.balanceCollector || (r.method === 'Efectivo' ? 'instructor' : 'escuela');
  const balance = Math.max(0, Number(r.price || 0) - Number(r.deposit || 0));
  const instructorHeld = collector === 'instructor' ? balance : 0;
  const schoolHeld = Number(r.deposit || 0) + (collector === 'escuela' ? balance : 0);
  const schoolDue = Number(r.schoolShare || 0) - (Number(r.mpFee) || 0);
  const netToSchool = collector === 'instructor' ? instructorHeld - (Number(r.instructorShare) || 0) : -(Number(r.instructorShare) || 0);
  return {
    collected: Number(r.price || 0),
    schoolHeld,
    instructorHeld,
    schoolDue,
    netToSchool,
  };
}

export function segments(r: CourseRecord): CourseRecord[] {
  if (r.status === 'cancelado') return [];
  if (!Array.isArray(r.assignments) || !r.assignments.length) return [r];
  const originalHoldsFull =
    r.method === 'Efectivo' && r.transferPayment?.paidFull && r.transferPayment?.custody === 'instructor';
  return r.assignments.map((a) => {
    const original = String(a.teacherId) === String(r.teacherId);
    const allocatedPrice = originalHoldsFull ? (original ? Number(r.price || 0) : 0) : Number(a.price || 0);
    const allocatedDeposit = originalHoldsFull ? (original ? Number(r.deposit || 0) : 0) : Number(a.deposit || 0);
    const collector = originalHoldsFull ? (original ? 'instructor' : 'escuela') : a.balanceCollector;
    return {
      ...r,
      ...a,
      student: r.student,
      date: r.date,
      school: r.school,
      course: r.course.replace(/(?:x|×)\s*\d+/i, 'x' + a.hours),
      originalCourse: r.course,
      transferRole: original ? 'original' : 'received',
      transferFrom: r.teacherName,
      method: r.method,
      recordId: r.id,
      originalPrice: r.price,
      assignedHours: a.hours,
      price: allocatedPrice,
      deposit: allocatedDeposit,
      instructorShare: Number(a.instructorShare || 0),
      schoolShare: allocatedPrice - Number(a.instructorShare || 0) - (original ? Number(r.surcharge || 0) : 0),
      surcharge: original ? Number(r.surcharge || 0) : 0,
      balanceCollector: collector,
      mpFee: original ? Number(r.mpFee || 0) : 0,
    };
  });
}

export function errorVisitRecords(records: CourseRecord[]): CourseRecord[] {
  return records.flatMap((r) =>
    (r.errorVisitCompensations || []).map((v, i) => ({
      ...r,
      id: `${r.id}-visita-error-${i}`,
      recordId: r.id,
      date: (v.date || r.date).slice(0, 10),
      school: r.school,
      student: r.student,
      teacherId: v.teacherId,
      teacherName: v.teacherName,
      course: `Compensación por presentación errónea · Auto ${v.vehicleType}`,
      originalCourse: r.course,
      originalPrice: r.price,
      assignedHours: 0,
      price: 0,
      deposit: 0,
      instructorShare: Number(v.amount || 0),
      schoolShare: -Number(v.amount || 0),
      balanceCollector: 'escuela',
      method: 'Tarjeta',
      surcharge: 0,
      mpFee: 0,
      errorVisitAccounting: true,
      notes: 'No se dictaron clases. Compensación a cargo de la autoescuela.',
    }))
  );
}

export function accountingRecords(records: CourseRecord[]): CourseRecord[] {
  const active = records.filter((r) => r.status !== 'cancelado').flatMap(segments);
  const errorVisits = errorVisitRecords(records);
  const cancelledSettled = records
    .filter((r) => r.status === 'cancelado' && r.cancellation?.settled)
    .flatMap((r) => {
      const c = r.cancellation!;
      return (c.breakdown || []).map((a) => ({
        ...r,
        recordId: r.id,
        originalCourse: r.course,
        originalPrice: r.price,
        teacherId: a.teacherId,
        teacherName: a.teacherName,
        course: r.course,
        assignedHours: a.hours,
        cancelledHours: Math.max(
          0,
          Number((r.assignments || []).find((t) => String(t.teacherId) === String(a.teacherId))?.hours ?? totalHours(r)) -
            Number(a.hours)
        ),
        price: a.collected,
        deposit: Number(a.deposit || 0),
        instructorShare: a.commission,
        schoolShare: a.collected - a.commission,
        balanceCollector: a.collector,
        mpFee: 0,
        surcharge: 0,
        cancellationAccounting: true,
      }));
    });

  return [...active, ...errorVisits, ...cancelledSettled];
}

export function cardDifference(r: CourseRecord, tariff?: TariffItem): number {
  if (r.method !== 'Tarjeta' || r.status === 'cancelado') return 0;
  const stored = Number(r.surcharge || 0);
  if (stored > 0) return stored;
  if (!tariff) return 0;
  const cash = Number(tariff[1]);
  return Number.isFinite(cash) ? Math.max(0, Number(r.price || 0) - cash) : 0;
}

export function paymentLabel(r: CourseRecord): string {
  return r.method === 'Efectivo' ? 'Efectivo' : 'Tarjeta';
}

export function transferDistributionText(r: CourseRecord): string {
  if (!Array.isArray(r.assignments) || !r.assignments.length) return courseSessionText(r);
  return r.assignments.map((a) => `${a.teacherName}: ${courseSessionText(r, Number(a.hours || 0))}`).join(' · ');
}

export function transferPaidText(r: CourseRecord): string {
  const p = r.transferPayment;
  if (!p) return 'Pago de transferencia: sin confirmar';
  const deposit = Number(r.deposit || 0);
  const due = Math.max(0, Number(p.due || 0));
  const schoolPart = deposit > 0 ? `Seña en autoescuela: ${money(deposit)}` : `Seña: ${money(deposit)}`;
  if (!p.paidFull) {
    return `${schoolPart} · Saldo pendiente: ${money(due)}`;
  }
  return `${schoolPart} · Pagado completo (${p.custody === 'instructor' ? `retiene ${r.teacherName}` : 'en autoescuela'})`;
}

export function transferCollectText(r: CourseRecord, assignment: Partial<CourseAssignment>): string {
  const p = r.transferPayment;
  if (!p || p.paidFull || Number(p.due || 0) <= 0) return 'No cobrar (ya pagado)';
  const isOriginal = String(assignment.teacherId || '') === String(r.teacherId);
  const collector = p.pendingCollector || 'received';
  if ((collector === 'original' && isOriginal) || (collector !== 'original' && !isOriginal && collector !== 'escuela')) {
    return `COBRAR SALDO: ${money(p.due)}`;
  }
  return collector === 'escuela' ? 'Cobra la autoescuela' : 'Cobra el otro instructor';
}

export function allocateUnifiedPayment(
  balances: { school: string; net: number }[],
  amount: number,
  direction: 'teacher_to_school' | 'school_to_teacher'
) {
  const sign = direction === 'teacher_to_school' ? 1 : -1;
  const eligible = balances.filter((x) => sign * x.net > 0).sort((a, b) => sign * (b.net - a.net));
  let left = amount;
  const entries: { school: string; amount: number }[] = [];
  for (const x of eligible) {
    const take = Math.min(left, sign * x.net);
    if (take > 0) entries.push({ school: x.school, amount: take });
    left -= take;
    if (!left) break;
  }
  return left === 0 ? entries : null;
}

export function groupLiquidations(records: CourseRecord[]) {
  const groups = new Map<
    string,
    {
      course: string;
      method: string;
      price: number;
      commission: number;
      schoolGain: number;
      count: number;
      net: number;
    }
  >();

  for (const r of records) {
    const course = r.originalCourse || r.course || 'Curso sin nombre';
    const method = paymentLabel(r);
    const price = Number(r.price || 0);
    const commission = Number(r.instructorShare || 0);
    const schoolGain = Number(r.schoolShare || 0) - Number(r.mpFee || 0);
    const key = JSON.stringify([course, method, price, commission, Number(r.surcharge || 0), r.balanceCollector || '']);
    if (!groups.has(key)) {
      groups.set(key, { course, method, price, commission, schoolGain, count: 0, net: 0 });
    }
    const g = groups.get(key)!;
    g.count++;
    g.net += row(r).netToSchool;
  }
  return [...groups.values()].sort((a, b) => a.course.localeCompare(b.course, 'es') || a.method.localeCompare(b.method, 'es'));
}

export function monthLabelForSheet(month: string): string {
  const [year, number] = String(month || '').split('-');
  const names = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return names[Number(number) - 1] && /^\d{4}$/.test(year) ? `${names[Number(number) - 1]} ${year}` : String(month || 'Histórico');
}

export function fullBalanceCourseName(course: string): string {
  return String(course || '').trim();
}
