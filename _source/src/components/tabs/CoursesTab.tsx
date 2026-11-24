import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { SCHOOLS } from '../../constants/initialData';
import { money, intlPhone } from '../../utils/formatters';
import {
  actualStudentDue,
  totalHours,
  hourFee,
  motoFiveSessionPlan,
  courseSessionText,
  transferDistributionText,
  transferPaidText,
  transferCollectText,
} from '../../utils/finance';
import { generateInstructorWhatsAppMessage } from '../../utils/whatsapp';
import { CourseRecord, Teacher } from '../../types';
import {
  Search,
  Trash2,
  CreditCard,
  Send,
  XCircle,
  ChevronDown,
  ChevronUp,
  ArrowLeftRight,
} from 'lucide-react';

export const CoursesTab: React.FC = () => {
  const { records, teachers, deleteRecord, bulkDeleteRecords, updateRecord } = useAppStore();

  const [viewMode, setViewMode] = useState<'teacher' | 'all'>('teacher');
  const [selectedSchool, setSelectedSchool] = useState<string>('');
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedTeacherId, setExpandedTeacherId] = useState<string | null>(null);

  // Payment change modal
  const [editingPaymentRecord, setEditingPaymentRecord] = useState<CourseRecord | null>(null);

  // Cancellation modal
  const [cancelModalRecord, setCancelModalRecord] = useState<CourseRecord | null>(null);
  const [cancelReason, setCancelReason] = useState('Desistimiento del alumno');
  const [cancelDoneClasses, setCancelDoneClasses] = useState<number>(0);
  const [cancelFee, setCancelFee] = useState<number>(0);

  // Transfer modal
  const [transferRecord, setTransferRecord] = useState<CourseRecord | null>(null);
  const [trCompleted, setTrCompleted] = useState<number>(0);
  const [trTeacherId, setTrTeacherId] = useState<string>('');
  const [trErrorVisit, setTrErrorVisit] = useState<boolean>(false);
  const [trErrorVehicle, setTrErrorVehicle] = useState<'Manual' | 'Automático'>('Manual');
  const [trPaidStatus, setTrPaidStatus] = useState<'full' | 'partial' | 'none'>('none');
  const [trDue, setTrDue] = useState<number>(0);
  const [trCustody, setTrCustody] = useState<'escuela' | 'instructor'>('escuela');
  const [trCollector, setTrCollector] = useState<'instructor' | 'original' | 'escuela'>('instructor');

  const activeRecords = records.filter((r) => r.status !== 'cancelado');

  const filtered = activeRecords.filter((r) => {
    if (selectedSchool && r.school !== selectedSchool) return false;
    if (filterMonth && !String(r.date || '').startsWith(filterMonth)) return false;
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      const matchStudent = (r.student || '').toLowerCase().includes(q);
      const matchTeacher = (r.teacherName || '').toLowerCase().includes(q);
      const matchPhone = (r.phone || '').includes(q);
      const matchAddress = (r.address || '').toLowerCase().includes(q);
      if (!matchStudent && !matchTeacher && !matchPhone && !matchAddress) return false;
    }
    return true;
  });

  const teacherMatches = (r: CourseRecord, t: Teacher) =>
    String(r.teacherId || '') === String(t.id) ||
    (Array.isArray(r.assignments) && r.assignments.some((a) => String(a.teacherId || '') === String(t.id)));

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedIds(e.target.checked ? filtered.map((r) => r.id) : []);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`¿Eliminar definitivamente los ${selectedIds.length} cursos seleccionados?`)) {
      bulkDeleteRecords(selectedIds);
      setSelectedIds([]);
    }
  };

  const handleDeleteCourse = (id: string, studentName: string) => {
    const confirmation = prompt(`Escribí ELIMINAR para borrar definitivamente el curso de ${studentName}:`);
    if (confirmation && confirmation.trim().toUpperCase() === 'ELIMINAR') {
      deleteRecord(id);
    }
  };

  const handleSendWhatsApp = (record: CourseRecord, targetTeacher?: Teacher) => {
    const teacher = targetTeacher || teachers.find((t) => String(t.id) === String(record.teacherId));
    const msg = generateInstructorWhatsAppMessage(record, teacher);
    const phoneNum = teacher?.phone ? intlPhone(teacher.phone) : '';
    if (phoneNum) {
      window.open(`https://wa.me/${phoneNum}?text=${encodeURIComponent(msg)}`, '_blank');
    } else {
      alert('El instructor no tiene un teléfono configurado.');
    }
  };

  const handleSavePaymentChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPaymentRecord) return;
    const price = Number(editingPaymentRecord.price || 0);
    const deposit = Number(editingPaymentRecord.deposit || 0);
    const collector = editingPaymentRecord.method === 'Tarjeta' ? 'escuela' : 'instructor';
    updateRecord(editingPaymentRecord.id, {
      method: editingPaymentRecord.method,
      price,
      deposit,
      balanceCollector: collector,
      schoolShare: price - Number(editingPaymentRecord.instructorShare || 0) - Number(editingPaymentRecord.surcharge || 0),
    });
    setEditingPaymentRecord(null);
    alert('Medio de pago actualizado correctamente.');
  };

  const handleOpenCancel = (r: CourseRecord) => {
    setCancelModalRecord(r);
    setCancelReason('Desistimiento del alumno');
    setCancelDoneClasses(0);
    setCancelFee(Number(r.deposit || 0));
  };

  const handleConfirmCancel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalRecord) return;
    const feePerHour = hourFee(cancelModalRecord) || 0;
    const motoPlan = motoFiveSessionPlan(cancelModalRecord);
    const doneHours = motoPlan ? cancelDoneClasses * motoPlan.hoursPerSession : cancelDoneClasses;
    const commission = Math.round(doneHours * feePerHour);
    const collected = Number(cancelFee || 0);
    const settled = doneHours > 0 || collected > 0;

    updateRecord(cancelModalRecord.id, {
      status: 'cancelado',
      cancellationReason: cancelReason,
      cancellationFee: collected,
      cancellation: {
        settled,
        reason: cancelReason,
        fee: collected,
        cancelledAt: new Date().toISOString(),
        breakdown: settled
          ? [
              {
                teacherId: cancelModalRecord.teacherId,
                teacherName: cancelModalRecord.teacherName,
                hours: doneHours,
                collected,
                deposit: Number(cancelModalRecord.deposit || 0),
                commission,
                collector: cancelModalRecord.balanceCollector || 'escuela',
              },
            ]
          : [],
      },
    });
    setCancelModalRecord(null);
    alert('Curso marcado como cancelado.');
  };

  const compatibleTransferTeachers = (r: CourseRecord) => {
    const isMoto = /^moto/i.test(String(r.course || ''));
    const isAuto = /autom[aá]tico/i.test(r.course);
    return teachers.filter((t) => {
      if (String(t.id) === String(r.teacherId)) return false;
      const type = String(t.type || '').toLowerCase();
      if (isMoto) return /moto/.test(type);
      if (isAuto) return /autom[aá]tic/.test(type) || /ambos/.test(type);
      return /manual/.test(type) || /ambos/.test(type);
    });
  };

  const handleOpenTransfer = (r: CourseRecord) => {
    if (r.assignments?.length) {
      alert('Este curso ya fue transferido. Si necesitás otro cambio, revisá la liquidación.');
      return;
    }
    const hrs = totalHours(r);
    const fee = hourFee(r);
    if (!hrs || !fee) {
      alert('No se pudo determinar la cantidad de clases o comisión de este curso.');
      return;
    }
    const candidates = compatibleTransferTeachers(r);
    if (!candidates.length) {
      alert('No hay otro instructor compatible disponible para transferir este curso.');
      return;
    }
    const isCard = r.method === 'Tarjeta';
    const deposit = Number(r.deposit || 0);
    const price = Number(r.price || 0);
    setTransferRecord(r);
    setTrCompleted(0);
    setTrTeacherId(candidates[0].id);
    setTrErrorVisit(false);
    setTrErrorVehicle(/autom[aá]tic/i.test(r.course) ? 'Automático' : 'Manual');
    setTrPaidStatus(isCard ? 'full' : deposit > 0 ? 'partial' : 'none');
    setTrDue(isCard ? 0 : Math.max(0, price - deposit));
    setTrCustody('escuela');
    setTrCollector('instructor');
  };

  const handleConfirmTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferRecord) return;
    const chosen = teachers.find((t) => String(t.id) === String(trTeacherId));
    if (!chosen) return;

    const motoPlan = motoFiveSessionPlan(transferRecord);
    const units = motoPlan ? motoPlan.sessions : totalHours(transferRecord);
    const completed = trErrorVisit ? 0 : Math.min(Math.max(0, trCompleted), Math.max(0, units - 1));
    const remaining = units - completed;

    const paidFull = transferRecord.method === 'Tarjeta' || trPaidStatus === 'full';
    const due = paidFull ? 0 : Math.max(0, Number(trDue || 0));
    const collected = Math.max(0, Number(transferRecord.price || 0) - due);
    const originalCommission = Math.round((Number(transferRecord.instructorShare || 0) * completed) / units);
    const newCommission = Number(transferRecord.instructorShare || 0) - originalCommission;

    const firstPrice = collected + (trCollector === 'original' ? due : 0);
    const secondPrice = trCollector === 'original' ? 0 : due;
    const firstDeposit = Number(transferRecord.deposit || 0);

    const errorAmount = trErrorVehicle === 'Automático' ? 34000 : 30000;
    const newCompensations = trErrorVisit
      ? [
          ...(transferRecord.errorVisitCompensations || []),
          {
            teacherId: transferRecord.teacherId,
            teacherName: transferRecord.teacherName,
            vehicleType: trErrorVehicle,
            amount: errorAmount,
            date: new Date().toISOString().slice(0, 10),
            reason: 'Presentación por error de asignación; no se dictaron clases',
          },
        ]
      : transferRecord.errorVisitCompensations;

    const newAssignments = [
      {
        teacherId: transferRecord.teacherId,
        teacherName: transferRecord.teacherName,
        hours: motoPlan ? completed * motoPlan.hoursPerSession : completed,
        sessions: motoPlan ? completed : undefined,
        price: firstPrice,
        deposit: firstDeposit,
        instructorShare: originalCommission,
        balanceCollector: trCollector === 'original' && due > 0 ? 'instructor' : trCustody,
      },
      {
        teacherId: chosen.id,
        teacherName: chosen.name,
        hours: motoPlan ? remaining * motoPlan.hoursPerSession : remaining,
        sessions: motoPlan ? remaining : undefined,
        price: secondPrice,
        deposit: 0,
        instructorShare: newCommission,
        balanceCollector: paidFull ? 'escuela' : trCollector === 'original' ? 'escuela' : trCollector,
      },
    ];

    const updatedPayload: Partial<CourseRecord> = {
      status: 'transferido',
      errorVisitCompensations: newCompensations,
      transferPayment: {
        paidFull,
        due,
        collected,
        custody: trCustody,
        pendingCollector: due ? trCollector : null,
        recordedAt: new Date().toISOString(),
      },
      assignments: newAssignments,
      transferHistory: [
        ...(transferRecord.transferHistory || []),
        {
          at: new Date().toISOString(),
          from: transferRecord.teacherName,
          to: chosen.name,
          completed,
          remaining,
          sessionHours: motoPlan?.hoursPerSession || null,
          due,
          collector: trCollector,
          custody: trCustody,
        },
      ],
    };

    updateRecord(transferRecord.id, updatedPayload);
    const updatedRecord: CourseRecord = { ...transferRecord, ...updatedPayload };
    setTransferRecord(null);

    if (confirm(`Curso transferido a ${chosen.name}. ¿Enviar ahora los datos al nuevo instructor por WhatsApp?`)) {
      handleSendWhatsApp(updatedRecord, chosen);
    }
  };

  return (
    <div className="space-y-6">
      {/* School Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedSchool('')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
            selectedSchool === ''
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Todas ({activeRecords.length})
        </button>
        {SCHOOLS.map((s) => {
          const count = activeRecords.filter((r) => r.school === s).length;
          return (
            <button
              key={s}
              onClick={() => setSelectedSchool(s)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                selectedSchool === s
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {s} ({count})
            </button>
          );
        })}
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Buscar por alumno, teléfono, calle..."
            className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('teacher')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'teacher' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Por Instructor
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Lista Completa
            </button>
          </div>

          <input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="text-xs p-2 rounded-xl border border-slate-300 outline-none bg-white font-medium text-slate-700"
          />

          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" /> Eliminar ({selectedIds.length})
            </button>
          )}
        </div>
      </div>

      {/* VIEW MODE 1: BY TEACHER ACCORDION */}
      {viewMode === 'teacher' && (
        <div className="space-y-4">
          {teachers.map((teacher) => {
            const teacherCourses = filtered.filter((r) => teacherMatches(r, teacher));
            if (teacherCourses.length === 0 && searchText) return null;
            const isExpanded = expandedTeacherId === teacher.id;

            return (
              <div key={teacher.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedTeacherId(isExpanded ? null : teacher.id)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm">
                      #{teacher.teacherNumber || '•'}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">{teacher.name}</h4>
                      <p className="text-xs text-slate-500">
                        {teacherCourses.length} {teacherCourses.length === 1 ? 'curso asignado' : 'cursos asignados'} · {teacher.type} ({teacher.zone})
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="text-xs font-semibold text-slate-500">{teacherCourses.length}</span>
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/50 space-y-3">
                    {teacherCourses.length === 0 ? (
                      <p className="text-xs text-slate-400 py-3 text-center">Este instructor no tiene cursos activos en los filtros elegidos.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {teacherCourses.map((courseItem) => {
                          const currentAssignment = courseItem.assignments?.find(
                            (a) => String(a.teacherId) === String(teacher.id)
                          );
                          const isTransferred = !!courseItem.assignments?.length;

                          return (
                            <div key={courseItem.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h5 className="font-bold text-slate-900">{courseItem.student}</h5>
                                  <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                                    <span className="font-semibold text-teal-700">{courseItem.school}</span>
                                    <span>·</span>
                                    <span>{courseItem.course}</span>
                                  </div>
                                </div>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    courseItem.method === 'Efectivo' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                                  }`}
                                >
                                  {courseItem.method}
                                </span>
                              </div>

                              {isTransferred && currentAssignment && (
                                <div className="bg-teal-50 border border-teal-200 rounded-lg p-2.5 text-xs space-y-1">
                                  <div className="font-bold text-teal-900">
                                    ↔ Curso compartido · {courseSessionText(courseItem, Number(currentAssignment.hours || 0))} a cargo
                                  </div>
                                  <div className="text-teal-800">{transferDistributionText(courseItem)}</div>
                                  <div className="text-slate-600">{transferPaidText(courseItem)}</div>
                                  <div className="font-bold text-amber-800">{transferCollectText(courseItem, currentAssignment)}</div>
                                </div>
                              )}

                              <div className="text-xs space-y-1 text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                <div>
                                  <span className="font-semibold text-slate-700">Dirección:</span> {courseItem.address}
                                </div>
                                <div>
                                  <span className="font-semibold text-slate-700">Disponibilidad:</span> {courseItem.availabilityCombined || 'A coordinar'}
                                </div>
                                {courseItem.classDates && (
                                  <div>
                                    <span className="font-semibold text-slate-700">Fechas:</span> {courseItem.classDates}
                                  </div>
                                )}
                                {courseItem.phone && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-slate-700">WhatsApp:</span>
                                    <a
                                      href={`https://wa.me/${intlPhone(courseItem.phone)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-teal-600 hover:underline font-semibold"
                                    >
                                      {courseItem.phone}
                                    </a>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                                <div>
                                  <span className="text-slate-400">Total:</span>{' '}
                                  <span className="font-bold text-slate-800">{money(courseItem.price)}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400">Comisión:</span>{' '}
                                  <span className="font-bold text-emerald-600">
                                    {money(currentAssignment ? currentAssignment.instructorShare : courseItem.instructorShare)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400">A cobrar alumno:</span>{' '}
                                  <span className="font-extrabold text-amber-600">
                                    {courseItem.method === 'Tarjeta' ? '$0' : money(actualStudentDue(courseItem))}
                                  </span>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                                <button
                                  type="button"
                                  onClick={() => handleSendWhatsApp(courseItem, teacher)}
                                  className="bg-teal-600 hover:bg-teal-700 text-white px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs cursor-pointer"
                                >
                                  <Send className="w-3 h-3" /> Enviar WhatsApp
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingPaymentRecord(courseItem)}
                                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                >
                                  <CreditCard className="w-3 h-3" /> Cambiar Pago
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenTransfer(courseItem)}
                                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                >
                                  <ArrowLeftRight className="w-3 h-3" /> Transferir
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenCancel(courseItem)}
                                  className="text-amber-700 hover:bg-amber-50 px-2 py-1 rounded-lg text-xs font-medium cursor-pointer"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCourse(courseItem.id, courseItem.student)}
                                  className="text-red-600 hover:bg-red-50 p-1 rounded-lg text-xs ml-auto cursor-pointer"
                                  title="Eliminar definitivamente"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW MODE 2: ALL COURSES TABLE */}
      {viewMode === 'all' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-900 text-white uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="p-3 w-8">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={selectedIds.length > 0 && selectedIds.length === filtered.length}
                      className="rounded text-teal-600"
                    />
                  </th>
                  <th className="p-3">Alumno / Contacto</th>
                  <th className="p-3">Autoescuela y Curso</th>
                  <th className="p-3">Instructor</th>
                  <th className="p-3">Pago / Precio</th>
                  <th className="p-3">Saldo Alumno</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No se encontraron cursos con los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(r.id)}
                          onChange={() => handleToggleSelect(r.id)}
                          className="rounded text-teal-600"
                        />
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{r.student}</div>
                        <div className="text-xs text-slate-500">{r.phone || 'Sin teléfono'}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{r.address}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800">{r.school}</div>
                        <div className="text-xs text-teal-700 font-medium">{r.course}</div>
                        <div className="text-[11px] text-slate-400">{r.date}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800">{r.teacherName || 'Sin asignar'}</div>
                        {r.assignments?.length ? (
                          <div className="text-[11px] text-blue-700 font-medium">{transferDistributionText(r)}</div>
                        ) : null}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{money(r.price)}</div>
                        <span
                          className={`inline-block text-[10px] px-2 py-0.2 rounded-full font-bold ${
                            r.method === 'Efectivo' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {r.method}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-amber-700">
                          {r.method === 'Tarjeta' ? '$0 (Tarjeta)' : money(actualStudentDue(r))}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSendWhatsApp(r)}
                            className="p-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg cursor-pointer"
                            title="Reenviar WhatsApp"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPaymentRecord(r)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                            title="Cambiar Medio de Pago"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenTransfer(r)}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg cursor-pointer"
                            title="Transferir clases"
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenCancel(r)}
                            className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg cursor-pointer"
                            title="Cancelar curso"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCourse(r.id, r.student)}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg cursor-pointer"
                            title="Eliminar curso"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: CAMBIAR MEDIO DE PAGO */}
      {editingPaymentRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-teal-600" /> Cambiar Medio de Pago
            </h3>
            <p className="text-xs text-slate-500">
              Alumno: <strong className="text-slate-800">{editingPaymentRecord.student}</strong> ({editingPaymentRecord.course})
            </p>

            <form onSubmit={handleSavePaymentChange} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nuevo Medio de Pago</label>
                <select
                  value={editingPaymentRecord.method}
                  onChange={(e) => setEditingPaymentRecord({ ...editingPaymentRecord, method: e.target.value })}
                  className="w-full text-sm p-2.5 rounded-lg border border-slate-300 outline-none"
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Tarjeta">Tarjeta / Mercado Pago</option>
                  <option value="Transferencia">Transferencia Bancaria</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Precio Total Actualizado ($)</label>
                <input
                  type="number"
                  required
                  value={editingPaymentRecord.price}
                  onChange={(e) => setEditingPaymentRecord({ ...editingPaymentRecord, price: Number(e.target.value) })}
                  className="w-full text-sm p-2.5 rounded-lg border border-slate-300 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Seña Registrada en Escuela ($)</label>
                <input
                  type="number"
                  value={editingPaymentRecord.deposit}
                  onChange={(e) => setEditingPaymentRecord({ ...editingPaymentRecord, deposit: Number(e.target.value) })}
                  className="w-full text-sm p-2.5 rounded-lg border border-slate-300 outline-none"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                <div>
                  Saldo alumno resultante: <strong>{money(Math.max(0, editingPaymentRecord.price - editingPaymentRecord.deposit))}</strong>
                </div>
                <div className="text-slate-400 text-[11px]">Los balances contables y liquidaciones se recalcularán automáticamente.</div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPaymentRecord(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TRANSFERIR CLASES */}
      {transferRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 my-8">
            <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-blue-600" /> Transferir Clases
            </h3>
            <p className="text-xs text-slate-500">
              Alumno: <strong className="text-slate-800">{transferRecord.student}</strong> · {transferRecord.course} · {transferRecord.school}
            </p>

            <form onSubmit={handleConfirmTransfer} className="space-y-4">
              {(() => {
                const motoPlan = motoFiveSessionPlan(transferRecord);
                const maxUnits = motoPlan ? motoPlan.sessions : totalHours(transferRecord);
                const candidates = compatibleTransferTeachers(transferRecord);
                const isCard = transferRecord.method === 'Tarjeta';
                const remainingUnits = trErrorVisit ? maxUnits : Math.max(1, maxUnits - trCompleted);

                return (
                  <>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <label className="block text-xs font-bold text-slate-700">
                        Clases ya dictadas por {transferRecord.teacherName} (máx. {Math.max(0, maxUnits - 1)})
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={Math.max(0, maxUnits - 1)}
                        disabled={trErrorVisit}
                        value={trErrorVisit ? 0 : trCompleted}
                        onChange={(e) => setTrCompleted(Number(e.target.value))}
                        className="w-full text-sm p-2 rounded-lg border border-slate-300 bg-white outline-none"
                      />
                      <div className="text-xs text-teal-700 font-semibold">
                        Clases restantes para el nuevo instructor: {remainingUnits} {remainingUnits === 1 ? 'clase' : 'clases'}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nuevo Instructor *</label>
                      <select
                        value={trTeacherId}
                        onChange={(e) => setTrTeacherId(e.target.value)}
                        className="w-full text-sm p-2.5 rounded-lg border border-slate-300 bg-white outline-none"
                      >
                        {candidates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.type} · {t.zone})
                          </option>
                        ))}
                      </select>
                    </div>

                    {!/^moto/i.test(transferRecord.course) && (
                      <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 space-y-2">
                        <label className="flex items-center gap-2 text-xs font-bold text-amber-900 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={trErrorVisit}
                            onChange={(e) => setTrErrorVisit(e.target.checked)}
                          />
                          ¿Se presentó por error de asignación sin dar clases?
                        </label>
                        {trErrorVisit && (
                          <div>
                            <label className="block text-[11px] font-semibold text-amber-800 mb-1">Vehículo del instructor que fue</label>
                            <select
                              value={trErrorVehicle}
                              onChange={(e) => setTrErrorVehicle(e.target.value as any)}
                              className="w-full text-xs p-2 rounded-lg border border-amber-300 bg-white"
                            >
                              <option value="Manual">Auto manual · Compensación $30.000</option>
                              <option value="Automático">Auto automático · Compensación $34.000</option>
                            </select>
                          </div>
                        )}
                      </div>
                    )}

                    {isCard ? (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs font-semibold text-blue-900">
                        ✓ Pagado completamente con tarjeta a la autoescuela.
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Estado del pago del alumno</label>
                          <select
                            value={trPaidStatus}
                            onChange={(e) => {
                              const val = e.target.value as 'full' | 'partial' | 'none';
                              setTrPaidStatus(val);
                              if (val === 'full') setTrDue(0);
                              else if (val === 'none') setTrDue(Number(transferRecord.price || 0));
                            }}
                            className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                          >
                            <option value="full">Pagó todo</option>
                            <option value="partial">Pagó una parte (ej. seña)</option>
                            <option value="none">Todavía no pagó</option>
                          </select>
                        </div>

                        {trPaidStatus !== 'full' && (
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Saldo pendiente a cobrar ($)</label>
                            <input
                              type="number"
                              min={0}
                              max={transferRecord.price}
                              value={trDue}
                              onChange={(e) => setTrDue(Number(e.target.value))}
                              className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                            />
                          </div>
                        )}

                        {trPaidStatus !== 'none' && (
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              ¿Quién retiene lo ya pagado (luego de la seña)?
                            </label>
                            <select
                              value={trCustody}
                              onChange={(e) => setTrCustody(e.target.value as any)}
                              className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                            >
                              <option value="escuela">Autoescuela</option>
                              <option value="instructor">Instructor original ({transferRecord.teacherName})</option>
                            </select>
                          </div>
                        )}

                        {trPaidStatus !== 'full' && trDue > 0 && (
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              ¿Quién cobrará el saldo pendiente al alumno?
                            </label>
                            <select
                              value={trCollector}
                              onChange={(e) => setTrCollector(e.target.value as any)}
                              className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                            >
                              <option value="instructor">Nuevo instructor</option>
                              <option value="original">Instructor original</option>
                              <option value="escuela">Autoescuela</option>
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTransferRecord(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Volver
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Confirmar Transferencia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CANCELACIÓN */}
      {cancelModalRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" /> Cancelar Curso
            </h3>
            <p className="text-xs text-slate-500">
              Alumno: <strong className="text-slate-800">{cancelModalRecord.student}</strong> · {cancelModalRecord.course}
            </p>

            <form onSubmit={handleConfirmCancel} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Motivo de Cancelación</label>
                <input
                  type="text"
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full text-sm p-2.5 rounded-lg border border-slate-300 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Clases efectivamente realizadas</label>
                <input
                  type="number"
                  min={0}
                  max={totalHours(cancelModalRecord)}
                  value={cancelDoneClasses}
                  onChange={(e) => setCancelDoneClasses(Number(e.target.value))}
                  className="w-full text-sm p-2.5 rounded-lg border border-slate-300 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Importe retenido / cobrado ($)</label>
                <input
                  type="number"
                  min={0}
                  value={cancelFee}
                  onChange={(e) => setCancelFee(Number(e.target.value))}
                  className="w-full text-sm p-2.5 rounded-lg border border-slate-300 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalRecord(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Volver
                </button>
                <button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Confirmar Cancelación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
