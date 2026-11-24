import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { SCHOOLS } from '../../constants/initialData';
import { parseIncomingWhatsApp, generateInstructorWhatsAppMessage } from '../../utils/whatsapp';
import { calcCourse } from '../../utils/finance';
import { money, intlPhone } from '../../utils/formatters';
import { CourseRecord } from '../../types';
import { 
  Sparkles, 
  Send, 
  Clipboard, 
  Trash2, 
  AlertTriangle, 
  HelpCircle,
  Car
} from 'lucide-react';

interface EnrollTabProps {
  sharedText?: string;
  onClearSharedText?: () => void;
}

export const EnrollTab: React.FC<EnrollTabProps> = ({ sharedText, onClearSharedText }) => {
  const { teachers, tariffsBySchool, addRecord } = useAppStore();

  // WhatsApp import state
  const [rawWhatsApp, setRawWhatsApp] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [importStatus, setImportStatus] = useState<string>('Pegá un mensaje para completar la ficha.');

  // Form state
  const [student, setStudent] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [school, setSchool] = useState<string>(SCHOOLS[0]);
  const [course, setCourse] = useState<string>('');
  const [motoVehicle, setMotoVehicle] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [method, setMethod] = useState('Efectivo');
  const [paymentPlan, setPaymentPlan] = useState<'normal' | 'half_1_3'>('normal');
  const [installmentPayer, setInstallmentPayer] = useState<'instructor' | 'escuela'>('instructor');
  const [isPromo, setIsPromo] = useState(false);
  const [salePrice, setSalePrice] = useState<number | ''>('');
  const [hasDeposit, setHasDeposit] = useState(false);
  const [deposit, setDeposit] = useState<number | ''>('');
  const [mpFee, setMpFee] = useState<number | ''>(0);
  const [availabilityCombined, setAvailabilityCombined] = useState('');
  const [classDates, setClassDates] = useState('');
  const [notes, setNotes] = useState('');

  // WhatsApp link fallback
  const [generatedWaUrl, setGeneratedWaUrl] = useState<string | null>(null);

  // Set default course when school changes
  const schoolTariffs = tariffsBySchool[school] || [];
  useEffect(() => {
    if (schoolTariffs.length > 0 && (!course || !schoolTariffs.some(t => t[0] === course))) {
      setCourse(schoolTariffs[0][0]);
    }
  }, [school, schoolTariffs]);

  // Selected tariff
  const currentTariff = schoolTariffs.find(t => t[0] === course);
  const isMoto = /^moto/i.test(course);

  // Filter teachers compatible with the course type
  const isAutomatic = /autom[aá]tico/i.test(course);
  const isManual = /manual/i.test(course);
  const compatibleTeachers = teachers.filter(t => {
    const type = (t.type || '').toLowerCase();
    if (isMoto) return /moto/.test(type);
    if (isAutomatic) return /automatic/.test(type) || /ambos/.test(type);
    if (isManual) return /manual/.test(type) || /ambos/.test(type);
    return true;
  });

  // Financial calculations
  const calc = calcCourse(
    currentTariff,
    method,
    isPromo,
    Number(salePrice || 0),
    hasDeposit,
    Number(deposit || 0),
    Number(mpFee || 0)
  );

  const applyParsedText = (text: string, successMessage: string) => {
    const result = parseIncomingWhatsApp(text, teachers, SCHOOLS, tariffsBySchool);

    setStudent(result.student);
    setPhone(result.phone);
    setAddress(result.address);
    if (result.school) setSchool(result.school);
    if (result.course) setCourse(result.course);
    setMotoVehicle(result.motoVehicle);
    if (result.teacherId) setTeacherId(result.teacherId);
    setMethod(result.method);
    setPaymentPlan(result.paymentPlan);
    setInstallmentPayer(result.installmentPayer);
    setAvailabilityCombined(result.availabilityCombined);
    setClassDates(result.classDates);
    setIsPromo(result.isPromo);
    setWarnings(result.warnings);

    setImportStatus(
      result.warnings.length
        ? `⚠️ Revisar antes de guardar: ${result.warnings.join('; ')}`
        : successMessage
    );
  };

  useEffect(() => {
    if (sharedText && sharedText.trim()) {
      setRawWhatsApp(sharedText);
      applyParsedText(sharedText, '¡Mensaje recibido desde compartir y procesado con éxito!');
      onClearSharedText?.();
    }
  }, [sharedText]);

  const handleParseWhatsApp = () => {
    if (!rawWhatsApp.trim()) {
      alert('Copiá el mensaje de WhatsApp primero.');
      return;
    }
    applyParsedText(rawWhatsApp, '¡Mensaje procesado con éxito! Revisá los datos antes de guardar.');
  };

  const handlePasteFromClipboard = async () => {
    try {
      if (!navigator.clipboard?.readText) throw new Error('No soportado');
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        alert('El portapapeles está vacío.');
        return;
      }
      setRawWhatsApp(text);
      applyParsedText(text, '¡Texto pegado y procesado con éxito!');
    } catch (e) {
      alert('Android o el navegador no permitieron leer el portapapeles automáticamente. Mantené presionado el cuadro de texto y elegí Pegar.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!student.trim()) {
      alert('Por favor completá el nombre del alumno.');
      return;
    }
    if (!teacherId) {
      alert('Por favor seleccioná un instructor.');
      return;
    }
    if (calc.invalid) {
      alert('Revisá los importes calculados antes de continuar.');
      return;
    }

    const assignedTeacher = teachers.find(t => String(t.id) === String(teacherId));

    const newRecord: CourseRecord = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
      student: student.trim(),
      phone: phone.trim(),
      address: address.trim(),
      availableDays: availabilityCombined.trim(),
      availabilityCombined: availabilityCombined.trim(),
      classDates: classDates.trim(),
      balanceCollector: paymentPlan === 'half_1_3' ? installmentPayer : method === 'Efectivo' ? 'instructor' : 'escuela',
      paymentPlan: paymentPlan === 'half_1_3' ? {
        type: 'half_1_3',
        payer: installmentPayer,
        installments: [
          { classNumber: 1, amount: Math.floor(calc.price / 2), paid: false },
          { classNumber: 3, amount: calc.price - Math.floor(calc.price / 2), paid: false }
        ]
      } : null,
      date: new Date().toISOString().slice(0, 10),
      school,
      teacherId,
      teacherName: assignedTeacher?.name || '',
      course,
      motoVehicle: isMoto ? motoVehicle.trim() : '',
      method,
      status: 'registrado',
      promo: isPromo,
      price: calc.price,
      basePrice: calc.base,
      instructorShare: calc.teacher,
      schoolShare: calc.school,
      surcharge: calc.surcharge,
      deposit: calc.deposit,
      mpFee: calc.fee,
      notes: notes.trim(),
    };

    addRecord(newRecord);

    // Generate WhatsApp dispatch message
    const msg = generateInstructorWhatsAppMessage(newRecord, assignedTeacher);
    const teacherPhone = assignedTeacher?.phone ? intlPhone(assignedTeacher.phone) : '';

    if (teacherPhone && teacherPhone.length >= 10) {
      const waUrl = `https://wa.me/${teacherPhone}?text=${encodeURIComponent(msg)}`;
      setGeneratedWaUrl(waUrl);
      const opened = window.open(waUrl, '_blank');
      if (!opened) {
        alert('Inscripción guardada. El navegador bloqueó la ventana emergente; tocá el botón verde que apareció abajo para abrir WhatsApp.');
      }
    } else {
      alert('Inscripción guardada con éxito. Nota: este instructor no tiene un teléfono configurado para WhatsApp.');
    }

    // Reset Form
    setStudent('');
    setPhone('');
    setAddress('');
    setMotoVehicle('');
    setAvailabilityCombined('');
    setClassDates('');
    setNotes('');
    setRawWhatsApp('');
    setWarnings([]);
    setImportStatus('Inscripción registrada con éxito.');
  };

  return (
    <div className="space-y-6">
      {/* WhatsApp Parser Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Importador Inteligente de WhatsApp</h3>
              <p className="text-xs text-slate-500">Pegá la ficha del alumno recibida en WhatsApp para completar el formulario al instante</p>
            </div>
          </div>
        </div>

        <div className="mt-3 space-y-3">
          <textarea
            value={rawWhatsApp}
            onChange={(e) => setRawWhatsApp(e.target.value)}
            rows={3}
            placeholder="Pegá aquí el mensaje completo de WhatsApp..."
            className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none font-mono bg-slate-50"
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePasteFromClipboard}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Clipboard className="w-3.5 h-3.5" /> Pegar del portapapeles
            </button>
            <button
              type="button"
              onClick={handleParseWhatsApp}
              className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" /> Completar con WhatsApp
            </button>
            <button
              type="button"
              onClick={() => {
                setRawWhatsApp('');
                setWarnings([]);
                setImportStatus('Pegá un mensaje para completar la ficha.');
              }}
              className="text-slate-400 hover:text-slate-600 px-2 py-1.5 rounded-lg text-xs flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Limpiar
            </button>
          </div>

          <div className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
            warnings.length ? 'bg-amber-50 text-amber-900 border border-amber-200' : 'bg-slate-100 text-slate-600'
          }`}>
            {warnings.length ? <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" /> : <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />}
            <div>{importStatus}</div>
          </div>
        </div>
      </div>

      {/* Main Enrollment Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Ficha de Inscripción y Asignación</h3>
          <p className="text-xs text-slate-500">Completá los datos del alumno, autoescuela e instructor</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nombre y Apellido *</label>
            <input
              type="text"
              required
              value={student}
              onChange={(e) => setStudent(e.target.value)}
              placeholder="Ej. Juan Pérez"
              className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp / Teléfono *</label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ej. 11 1234-5678"
              className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Dirección y Localidad *</label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ej. Av. Rivadavia 6500, Flores, CABA"
              className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Autoescuela *</label>
            <select
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 outline-none bg-white font-medium text-slate-800"
            >
              {SCHOOLS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Curso *</label>
            <select
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 outline-none bg-white font-medium text-slate-800"
            >
              {schoolTariffs.map(t => <option key={t[0]} value={t[0]}>{t[0]}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Instructor Asignado *</label>
            <select
              value={teacherId}
              required
              onChange={(e) => setTeacherId(e.target.value)}
              className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 outline-none bg-white font-medium text-slate-800"
            >
              <option value="">-- Seleccionar Instructor --</option>
              {compatibleTeachers.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.type} · {t.zone})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Moto Specific Vehicle */}
        {isMoto && (
          <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200">
            <label className="block text-xs font-bold text-amber-900 mb-1 flex items-center gap-1.5">
              <Car className="w-4 h-4" /> Especificación de la moto para las clases:
            </label>
            <input
              type="text"
              value={motoVehicle}
              onChange={(e) => setMotoVehicle(e.target.value)}
              placeholder="Ej. Scooter 125cc automática / Royal Enfield Hunter 350cc"
              className="w-full text-sm p-2.5 rounded-lg border border-amber-300 focus:ring-2 focus:ring-amber-500 outline-none bg-white"
            />
          </div>
        )}

        {/* Payment and Financial Options */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Medio de Pago</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 outline-none bg-white"
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Tarjeta">Tarjeta / Mercado Pago</option>
                <option value="Transferencia">Transferencia Bancaria</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Plan de Cuotas</label>
              <select
                value={paymentPlan}
                onChange={(e) => setPaymentPlan(e.target.value as any)}
                className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 outline-none bg-white"
              >
                <option value="normal">Pago Completo Estándar</option>
                <option value="half_1_3">Dos Mitades (Clase 1 y 3)</option>
              </select>
            </div>

            {paymentPlan === 'half_1_3' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">¿Quién cobra las cuotas?</label>
                <select
                  value={installmentPayer}
                  onChange={(e) => setInstallmentPayer(e.target.value as any)}
                  className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                >
                  <option value="instructor">Instructor en mano</option>
                  <option value="escuela">Autoescuela</option>
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPromo"
                checked={isPromo}
                onChange={(e) => setIsPromo(e.target.checked)}
                className="w-4 h-4 text-teal-600 rounded-sm"
              />
              <label htmlFor="isPromo" className="text-xs font-semibold text-slate-700">Precio especial / PROMO</label>
              {isPromo && (
                <input
                  type="number"
                  placeholder="Importe $"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-28 text-xs p-1.5 border border-slate-300 rounded-lg ml-auto"
                />
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hasDeposit"
                checked={hasDeposit}
                onChange={(e) => setHasDeposit(e.target.checked)}
                className="w-4 h-4 text-teal-600 rounded-sm"
              />
              <label htmlFor="hasDeposit" className="text-xs font-semibold text-slate-700">Seña recibida por escuela</label>
              {hasDeposit && (
                <input
                  type="number"
                  placeholder="Seña $"
                  value={deposit}
                  onChange={(e) => setDeposit(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-28 text-xs p-1.5 border border-slate-300 rounded-lg ml-auto"
                />
              )}
            </div>

            {method !== 'Efectivo' && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-700">Comisión MP ($)</label>
                <input
                  type="number"
                  value={mpFee}
                  onChange={(e) => setMpFee(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-28 text-xs p-1.5 border border-slate-300 rounded-lg ml-auto"
                />
              </div>
            )}
          </div>
        </div>

        {/* Financial Preview Box */}
        <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-400">Precio Total Curso</div>
            <div className="text-xl font-bold text-teal-400">{money(calc.price)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Seña en Escuela</div>
            <div className="text-sm font-semibold">{money(calc.deposit)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Comisión Instructor</div>
            <div className="text-sm font-semibold text-emerald-400">{money(calc.teacher)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Ganancia Escuela</div>
            <div className="text-sm font-semibold text-blue-300">{money(calc.school)}</div>
          </div>
          <div className="border-l border-slate-700 pl-4">
            <div className="text-xs text-amber-300 font-bold">Saldo a Cobrar al Alumno</div>
            <div className="text-xl font-extrabold text-amber-400">
              {method === 'Tarjeta' ? '$0 (Pagado Tarjeta)' : money(calc.balance)}
            </div>
          </div>
        </div>

        {/* Availability and Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Disponibilidad Días y Horarios</label>
            <input
              type="text"
              value={availabilityCombined}
              onChange={(e) => setAvailabilityCombined(e.target.value)}
              placeholder="Ej. Lunes a Viernes por la mañana"
              className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Fechas Concretas de Clases (opcional)</label>
            <input
              type="text"
              value={classDates}
              onChange={(e) => setClassDates(e.target.value)}
              placeholder="Ej. 12/11, 14/11, 17/11"
              className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Observaciones para el Instructor (opcional)</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Aclaraciones particulares sobre el alumno o el lugar de encuentro..."
            className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 outline-none"
          />
        </div>

        {/* Submit Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-200">
          <div className="text-xs text-slate-500">
            Al guardar, se registrará el curso y se abrirá WhatsApp automáticamente para notificar al instructor.
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" /> Guardar y Enviar WhatsApp
          </button>
        </div>

        {generatedWaUrl && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-900">
              Inscripción guardada correctamente.
            </span>
            <a
              href={generatedWaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5"
            >
              📲 Abrir WhatsApp del Instructor
            </a>
          </div>
        )}
      </form>
    </div>
  );
};
