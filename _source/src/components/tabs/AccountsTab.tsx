import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { SCHOOLS } from '../../constants/initialData';
import { money } from '../../utils/formatters';
import { row, allocateUnifiedPayment, paymentLabel, accountingRecords } from '../../utils/finance';
import {
  exportGroupedXlsx,
  instructorExcelSheets,
  exportGeneralBalanceXlsx,
  exportSoldCoursesXlsx,
} from '../../utils/excel';
import { PaymentRecord } from '../../types';
import {
  Download,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  Trash2,
  FileSpreadsheet,
  BarChart3,
} from 'lucide-react';

export const AccountsTab: React.FC = () => {
  const { teachers, records, payments, addPayments, deletePayment } = useAppStore();

  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(teachers[0]?.id || '');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [selectedSchool, setSelectedSchool] = useState<string>('');
  const [balanceMode, setBalanceMode] = useState<'todos' | 'Efectivo' | 'Tarjeta'>('todos');

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentDirection, setPaymentDirection] = useState<'teacher_to_school' | 'school_to_teacher'>('teacher_to_school');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [paymentNotes, setPaymentNotes] = useState('');

  const currentTeacher = teachers.find((t) => String(t.id) === String(selectedTeacherId));

  // Virtual & segmented records (incl. transferred parts, error visit compensations, settled cancellations)
  const allAccounting = accountingRecords(records);

  const accountRecords = allAccounting.filter((r) => {
    if (String(r.teacherId) !== String(selectedTeacherId)) return false;
    if (selectedMonth && !String(r.date || '').startsWith(selectedMonth)) return false;
    if (selectedSchool && r.school !== selectedSchool) return false;
    return true;
  });

  const accountPayments = payments.filter((p) => {
    if (String(p.teacherId) !== String(selectedTeacherId)) return false;
    if (selectedMonth && !(String(p.month || p.date || '').startsWith(selectedMonth))) return false;
    if (selectedSchool && p.school !== selectedSchool) return false;
    return true;
  });

  const totalEarnedCommissions = accountRecords.reduce((acc, r) => acc + Number(r.instructorShare || 0), 0);
  const totalHeldByTeacher = accountRecords.reduce((acc, r) => acc + row(r).instructorHeld, 0);
  const totalDeliveredToSchool = accountPayments
    .filter((p) => p.direction === 'teacher_to_school')
    .reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const totalPaidToTeacher = accountPayments
    .filter((p) => p.direction === 'school_to_teacher')
    .reduce((acc, p) => acc + Number(p.amount || 0), 0);

  const grossNet = accountRecords.reduce((acc, r) => acc + row(r).netToSchool, 0);
  const finalNet = grossNet - totalDeliveredToSchool + totalPaidToTeacher;

  const handleRegisterPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherId) {
      alert('Seleccioná un instructor primero.');
      return;
    }
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      alert('Ingresá un importe válido mayor a 0.');
      return;
    }

    const balances = SCHOOLS.map((school) => ({
      school,
      net:
        accountRecords.filter((r) => r.school === school).reduce((v, r) => v + row(r).netToSchool, 0) +
        accountPayments
          .filter((x) => x.school === school)
          .reduce((v, x) => v + (x.direction === 'school_to_teacher' ? 1 : -1) * Number(x.amount || 0), 0),
    }));

    const allocations = selectedSchool
      ? [{ school: selectedSchool, amount }]
      : allocateUnifiedPayment(balances, amount, paymentDirection);

    if (!allocations) {
      alert(
        'El importe supera los saldos pendientes en esta dirección. Elegí la autoescuela correspondiente si querés registrar un adelanto o saldo a cuenta.'
      );
      return;
    }

    const newPaymentEntries: PaymentRecord[] = allocations.map((a, i) => ({
      id: 'p-' + Date.now() + '-' + i + '-' + Math.random().toString(36).slice(2, 6),
      month: selectedMonth,
      date: paymentDate,
      teacherId: selectedTeacherId,
      teacherName: currentTeacher?.name,
      school: a.school,
      amount: a.amount,
      direction: paymentDirection,
      method: paymentMethod,
      notes: paymentNotes.trim(),
    }));

    addPayments(newPaymentEntries);
    setPaymentAmount('');
    setPaymentNotes('');
    alert('Movimiento de pago registrado exitosamente.');
  };

  const handleExportSingleInstructor = () => {
    if (!currentTeacher) return;
    if (accountRecords.length === 0 && accountPayments.length === 0) {
      alert('No hay cursos ni movimientos para exportar en este período.');
      return;
    }
    const sheets = instructorExcelSheets(accountRecords, accountPayments, currentTeacher.name, selectedMonth, selectedSchool);
    exportGroupedXlsx(sheets, `Liquidacion_${currentTeacher.name.replace(/\s+/g, '_')}_${selectedMonth}.xlsx`);
  };

  const handleExportAllInstructors = () => {
    const monthRecords = allAccounting.filter((r) => !selectedMonth || String(r.date || '').startsWith(selectedMonth));
    const monthPayments = payments.filter((p) => !selectedMonth || String(p.month || p.date || '').startsWith(selectedMonth));

    const sheets: any[] = [];
    const usedNames = new Set<string>();

    teachers.forEach((teacher) => {
      const rs = monthRecords.filter((r) => String(r.teacherId) === String(teacher.id));
      const ps = monthPayments.filter((p) => String(p.teacherId) === String(teacher.id));
      if (rs.length === 0 && ps.length === 0) return;

      const instSheets = instructorExcelSheets(rs, ps, teacher.name, selectedMonth, '');
      instSheets.forEach((sh) => {
        let unique = (teacher.name.slice(0, 15) + ' ' + sh.name.slice(0, 12)).slice(0, 31);
        let count = 2;
        while (usedNames.has(unique)) {
          unique = (teacher.name.slice(0, 12) + ' ' + count++).slice(0, 31);
        }
        usedNames.add(unique);
        sheets.push({ name: unique, rows: sh.rows });
      });
    });

    if (sheets.length === 0) {
      alert('No hay movimientos ni cursos para ningún instructor en el mes seleccionado.');
      return;
    }

    exportGroupedXlsx(sheets, `Liquidaciones_Todos_Los_Instructores_${selectedMonth || 'historico'}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Instructor</label>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="text-xs sm:text-sm p-2 rounded-xl border border-slate-300 font-semibold text-slate-800 bg-white outline-none focus:ring-2 focus:ring-teal-500 min-w-52"
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    #{t.teacherNumber || '•'} {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Mes</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-xs sm:text-sm p-2 rounded-xl border border-slate-300 font-semibold text-slate-800 bg-white outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Autoescuela</label>
              <select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="text-xs sm:text-sm p-2 rounded-xl border border-slate-300 font-semibold text-slate-800 bg-white outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Todas las autoescuelas</option>
                {SCHOOLS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportSingleInstructor}
              className="bg-teal-600 hover:bg-teal-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" /> Excel Instructor
            </button>
            <button
              onClick={handleExportAllInstructors}
              className="bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" /> Excel Todos
            </button>
          </div>
        </div>

        {/* Global Balance & Sold Courses Exports */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <BarChart3 className="w-4 h-4 text-teal-600" />
            <span className="font-bold">Reportes Generales del Período:</span>
            <select
              value={balanceMode}
              onChange={(e) => setBalanceMode(e.target.value as any)}
              className="p-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white"
            >
              <option value="todos">Efectivo + Tarjeta</option>
              <option value="Efectivo">Solo Efectivo</option>
              <option value="Tarjeta">Solo Tarjeta</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => exportGeneralBalanceXlsx(records, payments, selectedMonth, selectedSchool, balanceMode)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Balance General (.xlsx)
            </button>
            <button
              onClick={() => exportSoldCoursesXlsx(records, selectedMonth)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Matriz Cursos Vendidos (.xlsx)
            </button>
          </div>
        </div>
      </div>

      {/* Financial Settlement Banner */}
      <div
        className={`p-6 rounded-2xl border shadow-xs text-white flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          finalNet > 0
            ? 'bg-gradient-to-r from-amber-700 to-amber-900 border-amber-600'
            : finalNet < 0
            ? 'bg-gradient-to-r from-emerald-700 to-teal-900 border-emerald-600'
            : 'bg-gradient-to-r from-slate-800 to-slate-900 border-slate-700'
        }`}
      >
        <div>
          <span className="text-xs uppercase font-bold tracking-wider opacity-90">Resultado Neto de la Liquidación</span>
          <h2 className="text-2xl font-black mt-1">
            {finalNet > 0
              ? `INSTRUCTOR DEBE ENTREGAR ${money(finalNet)}`
              : finalNet < 0
              ? `AUTOESCUELA DEBE PAGAR ${money(Math.abs(finalNet))}`
              : 'CUENTA SALDADA (Sin saldos pendientes)'}
          </h2>
          <p className="text-xs opacity-80 mt-1">
            Instructor: <strong>{currentTeacher?.name}</strong> · Período: {selectedMonth || 'Histórico'}
          </p>
        </div>

        <div className="text-right">
          <div className="text-xs opacity-75">Importe neto final</div>
          <div className="text-3xl font-black">{money(Math.abs(finalNet))}</div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-xs font-semibold text-slate-500">Comisiones Ganadas</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{money(totalEarnedCommissions)}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-xs font-semibold text-slate-500">Cobrado de Alumnos</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{money(totalHeldByTeacher)}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-xs font-semibold text-slate-500">Entregado a Escuela</div>
          <div className="text-xl font-bold text-emerald-600 mt-1">{money(totalDeliveredToSchool)}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-xs font-semibold text-slate-500">Pagado por Escuela</div>
          <div className="text-xl font-bold text-blue-600 mt-1">{money(totalPaidToTeacher)}</div>
        </div>
      </div>

      {/* Two Column Layout: Register Movement & Movement History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-teal-600" /> Registrar Entrega de Dinero
          </h3>

          <form onSubmit={handleRegisterPayment} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Monto ($) *</label>
              <input
                type="number"
                required
                min="1"
                step="1"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Ej. 150000"
                className="w-full text-sm p-2 rounded-lg border border-slate-300 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Dirección del Pago</label>
              <select
                value={paymentDirection}
                onChange={(e) => setPaymentDirection(e.target.value as any)}
                className="w-full text-sm p-2 rounded-lg border border-slate-300 outline-none bg-white"
              >
                <option value="teacher_to_school">Instructor entregó dinero a la escuela</option>
                <option value="school_to_teacher">Autoescuela pagó al instructor</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Fecha</label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full text-sm p-2 rounded-lg border border-slate-300 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Medio</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full text-sm p-2 rounded-lg border border-slate-300 outline-none bg-white"
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nota u observación</label>
              <input
                type="text"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Ej. Liquidación parcial semana 1"
                className="w-full text-sm p-2 rounded-lg border border-slate-300 outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-xs transition-all cursor-pointer"
            >
              Registrar Movimiento
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <h3 className="font-bold text-slate-900 text-sm mb-3">Movimientos de Dinero Registrados</h3>

            {accountPayments.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                No hay movimientos registrados para este instructor en el mes seleccionado.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {accountPayments.map((p) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          p.direction === 'teacher_to_school' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {p.direction === 'teacher_to_school' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900">
                          {p.direction === 'teacher_to_school' ? 'Instructor entregó a la escuela' : 'Escuela pagó al instructor'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {p.date} · {p.school} {p.notes ? `· ${p.notes}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-bold text-sm text-slate-900">{money(p.amount)}</span>
                      <button
                        onClick={() => {
                          if (confirm('¿Eliminar este movimiento?')) deletePayment(p.id);
                        }}
                        className="text-red-400 hover:text-red-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <h3 className="font-bold text-slate-900 text-sm mb-3">
              Detalle de Cursos / Tramos ({accountRecords.length})
            </h3>

            {accountRecords.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Sin cursos registrados en este período.</p>
            ) : (
              <div className="space-y-3">
                {accountRecords.map((r, idx) => {
                  const rRow = row(r);
                  const net = rRow.netToSchool;

                  return (
                    <div key={`${r.id}-${idx}`} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-sm text-slate-900">{r.student}</div>
                          <div className="text-xs text-slate-500">
                            {r.school} · {r.course} · {r.date}
                            {r.errorVisitAccounting && (
                              <span className="ml-2 bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-bold text-[10px]">
                                Visita errónea
                              </span>
                            )}
                            {r.cancellationAccounting && (
                              <span className="ml-2 bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-bold text-[10px]">
                                Liquidación cancelación
                              </span>
                            )}
                            {r.originalCourse && !r.errorVisitAccounting && !r.cancellationAccounting && (
                              <span className="ml-2 bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded font-bold text-[10px]">
                                Transferido ({r.assignedHours} hs)
                              </span>
                            )}
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            r.method === 'Efectivo' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {paymentLabel(r)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1 border-t border-slate-200/60 text-slate-600">
                        <div>
                          <span>Precio tramo:</span> <strong>{money(r.price)}</strong>
                        </div>
                        <div>
                          <span>Seña escuela:</span> <strong>{money(r.deposit)}</strong>
                        </div>
                        <div>
                          <span>Comisión inst.:</span> <strong className="text-emerald-700">{money(r.instructorShare)}</strong>
                        </div>
                        <div>
                          <span>Cobrado inst.:</span> <strong>{money(rRow.instructorHeld)}</strong>
                        </div>
                      </div>

                      <div className="text-xs font-bold pt-1 border-t border-slate-200/60 flex justify-between items-center">
                        <span className="text-slate-500">Liquidación de este movimiento:</span>
                        <span className={net > 0 ? 'text-amber-800' : net < 0 ? 'text-blue-800' : 'text-slate-600'}>
                          {net > 0 ? `Instructor entrega ${money(net)}` : net < 0 ? `Escuela paga ${money(-net)}` : 'Saldado'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
