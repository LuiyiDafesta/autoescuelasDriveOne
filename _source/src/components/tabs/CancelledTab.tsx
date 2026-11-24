import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { SCHOOLS } from '../../constants/initialData';
import { money } from '../../utils/formatters';
import { XCircle, Trash2, RotateCcw } from 'lucide-react';

export const CancelledTab: React.FC = () => {
  const { records, deleteRecord, bulkDeleteRecords, updateRecord } = useAppStore();
  const [schoolFilter, setSchoolFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const cancelled = records.filter(
    (r) => r.status === 'cancelado' && (!schoolFilter || r.school === schoolFilter)
  );

  const handleToggleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? cancelled.map((r) => r.id) : []);
  };

  const handleToggle = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleBulkDelete = () => {
    if (!selectedIds.length) return;
    if (confirm(`¿Eliminar definitivamente ${selectedIds.length} cursos cancelados del historial?`)) {
      bulkDeleteRecords(selectedIds);
      setSelectedIds([]);
    }
  };

  const handleRestore = (id: string, student: string) => {
    if (confirm(`¿Restaurar el curso de ${student} al listado activo?`)) {
      updateRecord(id, { status: 'registrado', cancellation: undefined, cancellationReason: undefined, cancellationFee: undefined });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600" /> Historial de Cursos Cancelados
          </h3>
          <p className="text-xs text-slate-500">
            {cancelled.length} {cancelled.length === 1 ? 'curso cancelado' : 'cursos cancelados'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={schoolFilter}
            onChange={(e) => {
              setSchoolFilter(e.target.value);
              setSelectedIds([]);
            }}
            className="text-xs sm:text-sm p-2 rounded-xl border border-slate-300 font-semibold text-slate-800 bg-white outline-none"
          >
            <option value="">Todas las autoescuelas</option>
            {SCHOOLS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Eliminar ({selectedIds.length})
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {cancelled.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            No hay cursos cancelados para los filtros seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-900 text-white uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="p-3 w-8">
                    <input
                      type="checkbox"
                      checked={selectedIds.length > 0 && selectedIds.length === cancelled.length}
                      onChange={(e) => handleToggleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th className="p-3">Alumno / Fecha</th>
                  <th className="p-3">Autoescuela / Curso</th>
                  <th className="p-3">Instructor</th>
                  <th className="p-3">Motivo / Retención</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cancelled.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(r.id)}
                        onChange={() => handleToggle(r.id)}
                      />
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{r.student}</div>
                      <div className="text-xs text-slate-400">{r.date}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-800">{r.school}</div>
                      <div className="text-xs text-slate-500">{r.course} · {money(r.price)}</div>
                    </td>
                    <td className="p-3 font-medium text-slate-700">{r.teacherName || 'Sin asignar'}</td>
                    <td className="p-3">
                      <div className="text-xs text-red-700 font-semibold">{r.cancellation?.reason || r.cancellationReason || 'Cancelado'}</div>
                      <div className="text-[11px] text-slate-500">
                        Retención: {money(r.cancellation?.fee ?? r.cancellationFee ?? 0)}
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleRestore(r.id, r.student)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                          title="Restaurar a activos"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`¿Eliminar definitivamente el curso cancelado de ${r.student}?`)) {
                              deleteRecord(r.id);
                            }
                          }}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg"
                          title="Eliminar definitivamente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
