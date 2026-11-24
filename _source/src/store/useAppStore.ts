import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { Teacher, CourseRecord, PaymentRecord, ClaimRecord, TariffsBySchool, TariffItem } from '../types';
import { SCHOOLS, DEFAULT_TARIFFS, PRELOADED_TEACHERS } from '../constants/initialData';

export interface AppState {
  teachers: Teacher[];
  records: CourseRecord[];
  payments: PaymentRecord[];
  claims: ClaimRecord[];
  tariffsBySchool: TariffsBySchool;
  nextTeacherNumber: number;

  // Actions
  addRecord: (record: CourseRecord) => void;
  updateRecord: (id: string, updates: Partial<CourseRecord>) => void;
  deleteRecord: (id: string) => void;
  bulkDeleteRecords: (ids: string[]) => void;

  addTeacher: (teacher: Omit<Teacher, 'id' | 'teacherNumber'>) => void;
  updateTeacher: (id: string, updates: Partial<Teacher>) => void;
  deleteTeacher: (id: string) => void;

  addPayment: (payment: PaymentRecord) => void;
  addPayments: (payments: PaymentRecord[]) => void;
  deletePayment: (id: string) => void;

  addClaim: (claim: ClaimRecord) => void;
  updateClaim: (id: string, updates: Partial<ClaimRecord>) => void;
  deleteClaim: (id: string) => void;

  updateTariffsForSchool: (school: string, tariffs: TariffItem[]) => void;
  resetTariffsForSchool: (school: string) => void;

  restoreBackup: (data: any) => void;
}

export function normalizeTariffsMap(raw?: TariffsBySchool): TariffsBySchool {
  const result: TariffsBySchool = raw && typeof raw === 'object' ? { ...raw } : {};
  for (const school of SCHOOLS) {
    if (!Array.isArray(result[school])) {
      result[school] = DEFAULT_TARIFFS.map(t => [...t] as TariffItem);
      continue;
    }
    const ts = result[school].map(t => [...t] as TariffItem);
    for (const d of DEFAULT_TARIFFS) {
      const found = ts.find(t => t[0] === d[0]);
      if (!found) {
        ts.push([...d] as TariffItem);
      } else if ((found[3] === null || found[3] === undefined) && d[3] != null && Number(found[1]) === d[1]) {
        found[3] = d[3];
      }
    }
    result[school] = ts;
  }
  return result;
}

const defaultTeachers = (): Teacher[] =>
  PRELOADED_TEACHERS.map((t, idx) => ({ ...t, teacherNumber: idx + 1 }));

/**
 * Adaptador de almacenamiento 100% compatible con el formato plano de `autoescuelas_demo_v2`
 * utilizado por la versión HTML original y con el middleware `persist` de Zustand.
 */
const legacyCompatibleStorage: StateStorage = {
  getItem: (name: string): string | null => {
    const raw = localStorage.getItem(name);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      const plain = parsed && typeof parsed === 'object' && 'state' in parsed ? parsed.state : parsed;
      if (!plain || typeof plain !== 'object') return null;

      const normalizedState = {
        teachers: Array.isArray(plain.teachers) && plain.teachers.length > 0 ? plain.teachers : defaultTeachers(),
        records: Array.isArray(plain.records) ? plain.records : [],
        payments: Array.isArray(plain.payments) ? plain.payments : [],
        claims: Array.isArray(plain.claims) ? plain.claims : [],
        tariffsBySchool: normalizeTariffsMap(plain.tariffsBySchool),
        nextTeacherNumber:
          typeof plain.nextTeacherNumber === 'number'
            ? plain.nextTeacherNumber
            : (Array.isArray(plain.teachers) ? plain.teachers.length : PRELOADED_TEACHERS.length) + 1,
      };
      return JSON.stringify({ state: normalizedState, version: 0 });
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      const parsed = JSON.parse(value);
      const stateToSave = parsed && typeof parsed === 'object' && 'state' in parsed ? parsed.state : parsed;
      localStorage.setItem(name, JSON.stringify(stateToSave));
    } catch {
      localStorage.setItem(name, value);
    }
  },
  removeItem: (name: string): void => {
    localStorage.removeItem(name);
  },
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      teachers: defaultTeachers(),
      records: [],
      payments: [],
      claims: [],
      tariffsBySchool: normalizeTariffsMap(),
      nextTeacherNumber: PRELOADED_TEACHERS.length + 1,

      addRecord: (record) =>
        set((state) => ({
          records: [record, ...state.records],
        })),

      updateRecord: (id, updates) =>
        set((state) => ({
          records: state.records.map((r) => (r.id === id ? { ...r, ...updates } : r)),
        })),

      deleteRecord: (id) =>
        set((state) => ({
          records: state.records.filter((r) => r.id !== id),
        })),

      bulkDeleteRecords: (ids) =>
        set((state) => ({
          records: state.records.filter((r) => !ids.includes(r.id)),
        })),

      addTeacher: (teacherData) =>
        set((state) => {
          const newTeacher: Teacher = {
            id: 'teacher-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
            teacherNumber: state.nextTeacherNumber,
            ...teacherData,
          };
          return {
            teachers: [...state.teachers, newTeacher],
            nextTeacherNumber: state.nextTeacherNumber + 1,
          };
        }),

      updateTeacher: (id, updates) =>
        set((state) => ({
          teachers: state.teachers.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),

      deleteTeacher: (id) =>
        set((state) => ({
          teachers: state.teachers.filter((t) => t.id !== id),
        })),

      addPayment: (payment) =>
        set((state) => ({
          payments: [payment, ...state.payments],
        })),

      addPayments: (newPayments) =>
        set((state) => ({
          payments: [...newPayments, ...state.payments],
        })),

      deletePayment: (id) =>
        set((state) => ({
          payments: state.payments.filter((p) => p.id !== id),
        })),

      addClaim: (claim) =>
        set((state) => ({
          claims: [claim, ...state.claims],
        })),

      updateClaim: (id, updates) =>
        set((state) => ({
          claims: state.claims.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),

      deleteClaim: (id) =>
        set((state) => ({
          claims: state.claims.filter((c) => c.id !== id),
        })),

      updateTariffsForSchool: (school, tariffs) =>
        set((state) => ({
          tariffsBySchool: {
            ...state.tariffsBySchool,
            [school]: tariffs,
          },
        })),

      resetTariffsForSchool: (school) =>
        set((state) => ({
          tariffsBySchool: {
            ...state.tariffsBySchool,
            [school]: DEFAULT_TARIFFS.map((t) => [...t] as TariffItem),
          },
        })),

      restoreBackup: (data) => {
        const plain = data && typeof data === 'object' && 'state' in data ? data.state : data;
        if (!plain || typeof plain !== 'object') throw new Error('Respaldo inválido');
        const teachers = Array.isArray(plain.teachers) ? plain.teachers : [];
        set({
          teachers,
          records: Array.isArray(plain.records) ? plain.records : [],
          payments: Array.isArray(plain.payments) ? plain.payments : [],
          claims: Array.isArray(plain.claims) ? plain.claims : [],
          tariffsBySchool: normalizeTariffsMap(plain.tariffsBySchool),
          nextTeacherNumber: typeof plain.nextTeacherNumber === 'number' ? plain.nextTeacherNumber : teachers.length + 1,
        });
      },
    }),
    {
      name: 'autoescuelas_demo_v2',
      storage: createJSONStorage(() => legacyCompatibleStorage),
    }
  )
);
