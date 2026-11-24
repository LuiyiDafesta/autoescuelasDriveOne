export interface Teacher {
  id: string;
  teacherNumber?: number;
  name: string;
  phone: string;
  type: string; // 'Manual' | 'Automático' | 'Ambos' | 'Moto'
  zone: string;
  model: string;
  plate: string;
  availability?: string;
}

export interface PaymentPlanInstallment {
  classNumber: number;
  amount: number;
  paid: boolean;
}

export interface PaymentPlan {
  type: 'half_1_3';
  payer: string; // 'escuela' | 'instructor'
  installments: PaymentPlanInstallment[];
}

export interface CourseAssignment {
  teacherId: string;
  teacherName: string;
  hours: number;
  sessions?: number;
  price: number;
  deposit: number;
  instructorShare: number;
  schoolShare?: number;
  balanceCollector: string;
}

export interface TransferPaymentInfo {
  paidFull: boolean;
  due: number;
  collected: number;
  custody: string;
  pendingCollector: string | null;
  recordedAt?: string;
}

export interface TransferHistoryEntry {
  at: string;
  from: string;
  to: string;
  completed: number;
  remaining: number;
  sessionHours?: number | null;
  due: number;
  collector: string;
  custody: string;
}

export interface ErrorVisitCompensation {
  teacherId: string;
  teacherName: string;
  vehicleType: string;
  amount: number;
  date: string;
  reason: string;
}

export interface CancellationBreakdown {
  teacherId: string;
  teacherName: string;
  hours: number;
  collected: number;
  deposit?: number;
  commission: number;
  collector: string;
}

export interface CancellationInfo {
  settled?: boolean;
  reason?: string;
  fee?: number;
  breakdown?: CancellationBreakdown[];
  cancelledAt?: string;
}

export interface CourseRecord {
  id: string;
  student: string;
  phone: string;
  address: string;
  availableDays: string;
  availableHours?: string;
  availabilityCombined: string;
  classDates: string;
  balanceCollector: string; // 'escuela' | 'instructor'
  paymentPlan?: PaymentPlan | null;
  date: string;
  school: string;
  teacherId: string;
  teacherName: string;
  course: string;
  originalCourse?: string;
  motoVehicle?: string;
  method: string; // 'Efectivo' | 'Tarjeta' | 'Transferencia'
  status: string; // 'registrado' | 'cobrado' | 'transferido' | 'cancelado'
  promo: boolean;
  price: number;
  basePrice: number;
  instructorShare: number;
  schoolShare: number;
  surcharge: number;
  deposit: number;
  mpFee: number;
  notes: string;
  assignments?: CourseAssignment[];
  transferPayment?: TransferPaymentInfo;
  transferHistory?: TransferHistoryEntry[];
  errorVisitCompensations?: ErrorVisitCompensation[];
  cancellation?: CancellationInfo;
  cancellationReason?: string;
  cancellationFee?: number;
  // Derived accounting fields for segmented / virtual rows
  recordId?: string;
  originalPrice?: number;
  assignedHours?: number;
  transferRole?: 'original' | 'received';
  transferFrom?: string;
  errorVisitAccounting?: boolean;
  cancellationAccounting?: boolean;
  cancelledHours?: number;
  zoneOverride?: string;
  zoneLocality?: string;
}

export interface PaymentRecord {
  id: string;
  month?: string;
  date: string;
  teacherId: string;
  teacherName?: string;
  school: string;
  amount: number;
  direction: 'teacher_to_school' | 'school_to_teacher';
  type?: string;
  method?: string;
  notes?: string;
}

export interface ClaimRecord {
  id: string;
  student: string;
  phone: string;
  school: string;
  teacherId?: string;
  teacherName?: string;
  hoursDone: number;
  amountPaid: number;
  claim: string;
  date: string;
  status: 'pendiente' | 'resuelto' | 'en_revision';
  notes?: string;
}

// [name, cashPrice, instructorShare, cardPrice]
export type TariffItem = [string, number, number | null, number | null];

export type TariffsBySchool = Record<string, TariffItem[]>;

export interface AppDatabase {
  teachers: Teacher[];
  records: CourseRecord[];
  payments: PaymentRecord[];
  claims: ClaimRecord[];
  tariffsBySchool: TariffsBySchool;
  nextTeacherNumber: number;
}
