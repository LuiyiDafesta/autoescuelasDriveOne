import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { SCHOOLS } from '../../constants/initialData';
import { money, intlPhone } from '../../utils/formatters';
import { ClaimRecord } from '../../types';
import { 
  AlertCircle, 
  PlusCircle, 
  Trash2, 
  MessageCircle
} from 'lucide-react';

export const ClaimsTab: React.FC = () => {
  const { claims, addClaim, updateClaim, deleteClaim } = useAppStore();

  const [student, setStudent] = useState('');
  const [phone, setPhone] = useState('');
  const [school, setSchool] = useState(SCHOOLS[0]);
  const [hoursDone, setHoursDone] = useState<number | ''>(0);
  const [amountPaid, setAmountPaid] = useState<number | ''>(0);
  const [claimText, setClaimText] = useState('');

  const handleAddClaim = (e: React.FormEvent) => {
    e.preventDefault();
    if (!student.trim() || !claimText.trim()) {
      alert('Completá el nombre del alumno y el detalle del reclamo.');
      return;
    }

    const newClaim: ClaimRecord = {
      id: 'claim-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      student: student.trim(),
      phone: phone.trim(),
      school,
      hoursDone: Number(hoursDone || 0),
      amountPaid: Number(amountPaid || 0),
      claim: claimText.trim(),
      date: new Date().toISOString().slice(0, 10),
      status: 'pendiente',
    };

    addClaim(newClaim);
    setStudent('');
    setPhone('');
    setClaimText('');
    setHoursDone(0);
    setAmountPaid(0);
    alert('Reclamo registrado con éxito.');
  };

  const handleSendResponseWhatsApp = (c: ClaimRecord) => {
    const phoneClean = intlPhone(c.phone);
    if (!phoneClean) {
      alert('El alumno no tiene un teléfono válido registrado.');
      return;
    }

    const msg = [
      `Hola ${c.student}, nos comunicamos desde la administración de ${c.school} en relación a tu consulta/reclamo.`,
      '',
      `📋 *Detalle registrado:*`,
      `"${c.claim}"`,
      '',
      `Horas realizadas: ${c.hoursDone} hs · Importe abonado: ${money(c.amountPaid)}`,
      '',
      `Estamos revisando tu situación con la coordinación para darte una solución inmediata. ¿Podrías confirmarnos tus horarios disponibles?`
    ].join('\n');

    window.open(`https://wa.me/${phoneClean}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
        <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-600" /> Atención y Reclamos
        </h3>
        <p className="text-xs text-slate-500">
          Registro, seguimiento y resolución de incidencias de alumnos e instructores
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form New Claim */}
        <form onSubmit={handleAddClaim} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
            <PlusCircle className="w-4 h-4 text-teal-600" /> Nuevo Reclamo / Incidencia
          </h4>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del Alumno *</label>
            <input
              type="text"
              required
              value={student}
              onChange={(e) => setStudent(e.target.value)}
              placeholder="Ej. Camila Morales"
              className="w-full text-sm p-2 rounded-lg border border-slate-300 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Celular / WhatsApp</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ej. 11 9876-5432"
              className="w-full text-sm p-2 rounded-lg border border-slate-300 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Autoescuela</label>
            <select
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              className="w-full text-sm p-2 rounded-lg border border-slate-300 outline-none bg-white"
            >
              {SCHOOLS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Horas realizadas</label>
              <input
                type="number"
                min="0"
                value={hoursDone}
                onChange={(e) => setHoursDone(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full text-sm p-2 rounded-lg border border-slate-300 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Importe pagado ($)</label>
              <input
                type="number"
                min="0"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full text-sm p-2 rounded-lg border border-slate-300 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Detalle del Reclamo *</label>
            <textarea
              required
              rows={3}
              value={claimText}
              onChange={(e) => setClaimText(e.target.value)}
              placeholder="Describí el motivo del reclamo o la situación del alumno..."
              className="w-full text-sm p-2 rounded-lg border border-slate-300 outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 rounded-xl text-xs shadow-xs transition-all cursor-pointer"
          >
            Registrar Reclamo
          </button>
        </form>

        {/* Claims List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <h4 className="font-bold text-slate-900 text-sm mb-3">Reclamos Registrados ({claims.length})</h4>

            {claims.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">
                No hay reclamos registrados actualmente.
              </p>
            ) : (
              <div className="space-y-3">
                {claims.map(c => (
                  <div key={c.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{c.student}</div>
                        <div className="text-xs text-slate-500">{c.school} · {c.date}</div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <select
                          value={c.status}
                          onChange={(e) => updateClaim(c.id, { status: e.target.value as any })}
                          className={`text-xs font-bold px-2.5 py-1 rounded-full outline-none border ${
                            c.status === 'resuelto'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : c.status === 'en_revision'
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}
                        >
                          <option value="pendiente">Pendiente</option>
                          <option value="en_revision">En Revisión</option>
                          <option value="resuelto">Resuelto</option>
                        </select>

                        <button
                          onClick={() => {
                            if (confirm('¿Eliminar este reclamo?')) deleteClaim(c.id);
                          }}
                          className="text-red-400 hover:text-red-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200">
                      "{c.claim}"
                    </p>

                    <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-1">
                      <div>
                        <span>Horas: <strong>{c.hoursDone} hs</strong></span>
                        <span className="mx-2">·</span>
                        <span>Abonado: <strong>{money(c.amountPaid)}</strong></span>
                      </div>

                      {c.phone && (
                        <button
                          onClick={() => handleSendResponseWhatsApp(c)}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all text-xs"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> Responder por WhatsApp
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
