import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { money } from '../../utils/formatters';
import { 
  Users, 
  BookOpen, 
  DollarSign, 
  TrendingUp, 
  Wallet, 
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { TabType } from '../Header';

interface PanelTabProps {
  onNavigate: (tab: TabType) => void;
}

export const PanelTab: React.FC<PanelTabProps> = ({ onNavigate }) => {
  const { records, teachers, claims } = useAppStore();

  const activeRecords = records.filter(r => r.status !== 'cancelado');
  
  // Calculate summary totals
  const totalBilled = activeRecords.reduce((acc, r) => acc + Number(r.price || 0), 0);
  const totalSchoolGain = activeRecords.reduce((acc, r) => acc + (Number(r.schoolShare || 0) - Number(r.mpFee || 0)), 0);
  const totalPendingCollect = activeRecords.reduce((acc, r) => acc + (r.method === 'Efectivo' ? Math.max(0, Number(r.price || 0) - Number(r.deposit || 0)) : 0), 0);
  const pendingClaims = claims.filter(c => c.status === 'pendiente').length;

  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthRecords = activeRecords.filter(r => String(r.date || '').startsWith(currentMonth));

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-teal-950 rounded-2xl p-6 text-white shadow-sm border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Panel de Control General</h2>
            <p className="text-slate-300 text-sm mt-1">
              Central Cars · Escuela Argentina de Manejo · Autoescuela Modelo · El Club del Manejo
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('alta')}
              className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-md flex items-center gap-2"
            >
              <span>+ Nuevo Alumno / WhatsApp</span>
            </button>
            <button
              onClick={() => onNavigate('cuentas')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            >
              Ver Liquidaciones
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase text-slate-500">Cursos Activos</div>
            <div className="text-2xl font-bold text-slate-900">{activeRecords.length}</div>
            <div className="text-xs text-slate-500 mt-0.5">{monthRecords.length} en este mes</div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase text-slate-500">Facturación Bruta</div>
            <div className="text-2xl font-bold text-slate-900">{money(totalBilled)}</div>
            <div className="text-xs text-slate-500 mt-0.5">Ventas totales acumuladas</div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase text-slate-500">Ganancia Escuelas</div>
            <div className="text-2xl font-bold text-slate-900">{money(totalSchoolGain)}</div>
            <div className="text-xs text-slate-500 mt-0.5">Deducidas comisiones e impuestos</div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase text-slate-500">A Cobrar de Alumnos</div>
            <div className="text-2xl font-bold text-slate-900">{money(totalPendingCollect)}</div>
            <div className="text-xs text-slate-500 mt-0.5">En mano de instructores al inicio</div>
          </div>
        </div>
      </div>

      {/* Second Row: Secondary Indicators & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Registered Courses */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900">Últimos Cursos Asignados</h3>
              <p className="text-xs text-slate-500">Alumnos recientemente cargados al sistema</p>
            </div>
            <button
              onClick={() => onNavigate('cursos')}
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              Ver todos ({activeRecords.length}) <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {activeRecords.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              No hay cursos registrados todavía. Copiá un mensaje en la pestaña <span className="font-semibold text-teal-600 cursor-pointer" onClick={() => onNavigate('alta')}>Alta</span> para comenzar.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {activeRecords.slice(0, 6).map((r) => (
                <div key={r.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-slate-900 truncate">{r.student}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span className="font-medium text-slate-700">{r.school}</span>
                      <span>·</span>
                      <span>{r.course}</span>
                      <span>·</span>
                      <span className="text-teal-700 font-medium">Instructor: {r.teacherName || 'Sin asignar'}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-sm text-slate-900">{money(r.price)}</div>
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      r.method === 'Efectivo' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {r.method}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Col: Instructors & Claims Summary */}
        <div className="space-y-4">
          {/* Instructors Status */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-600" /> Plantel de Instructores
              </h3>
              <button 
                onClick={() => onNavigate('instructores')}
                className="text-xs font-semibold text-teal-600 hover:text-teal-700"
              >
                Gestionar
              </button>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 mb-1">{teachers.length}</div>
            <p className="text-xs text-slate-500 mb-4">Instructores activos registrados en el sistema</p>
            <div className="flex gap-2">
              <button
                onClick={() => onNavigate('instructores')}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs py-2 rounded-lg font-semibold transition-all text-center"
              >
                Ver Lista y Patentes
              </button>
            </div>
          </div>

          {/* Pending Claims Alert */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" /> Reclamos de Alumnos
              </h3>
              <button 
                onClick={() => onNavigate('reclamos')}
                className="text-xs font-semibold text-teal-600 hover:text-teal-700"
              >
                Abrir
              </button>
            </div>
            <div className="text-3xl font-extrabold text-amber-700 mb-1">{pendingClaims}</div>
            <p className="text-xs text-slate-500 mb-3">
              {pendingClaims === 1 ? '1 reclamo pendiente de resolución' : `${pendingClaims} reclamos pendientes`}
            </p>
            <button
              onClick={() => onNavigate('reclamos')}
              className="w-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs py-2 rounded-lg font-semibold transition-all"
            >
              Revisar Reclamos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
