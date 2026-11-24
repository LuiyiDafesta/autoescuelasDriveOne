import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { SCHOOLS } from '../../constants/initialData';
import { money } from '../../utils/formatters';
import { TariffItem } from '../../types';
import {
  Settings,
  Download,
  Upload,
  RotateCcw,
  Edit3,
  Plus,
  Trash2,
  Share2,
  Copy,
  Mail,
} from 'lucide-react';

function shareTariffCategoryMatch(name: string, category: string): boolean {
  const n = String(name).toLocaleLowerCase('es');
  if (category === 'todos') return true;
  if (category === 'promo-manual') return n.startsWith('promo manual');
  if (category === 'promo-auto') return n.startsWith('promo automático');
  if (category === 'normal-manual') return n.startsWith('manual x') || n.startsWith('clase individual manual');
  if (category === 'normal-auto') return n.startsWith('automático x') || n.startsWith('clase individual automático');
  if (category === 'motos') return n.startsWith('moto');
  if (category === 'extensiones') return n.startsWith('extensión');
  return false;
}

export const ConfigTab: React.FC = () => {
  const {
    tariffsBySchool,
    updateTariffsForSchool,
    resetTariffsForSchool,
    teachers,
    records,
    payments,
    claims,
    nextTeacherNumber,
    restoreBackup,
  } = useAppStore();

  const [selectedSchool, setSelectedSchool] = useState<string>(SCHOOLS[0]);
  const [tariffModalOpen, setTariffModalOpen] = useState(false);
  const [editingTariffIndex, setEditingTariffIndex] = useState<number | null>(null);

  // Edit/Add tariff modal state
  const [editName, setEditName] = useState('');
  const [editCash, setEditCash] = useState<number | ''>('');
  const [editCommission, setEditCommission] = useState<number | ''>('');
  const [editCard, setEditCard] = useState<number | ''>('');

  // Share tariffs state
  const [shareCategory, setShareCategory] = useState('todos');
  const [sharePaymentMode, setSharePaymentMode] = useState<'both' | 'cash' | 'card'>('both');
  const [deselectedCourses, setDeselectedCourses] = useState<string[]>([]);

  const currentTariffs = tariffsBySchool[selectedSchool] || [];

  const handleOpenAdd = () => {
    setEditingTariffIndex(null);
    setEditName('');
    setEditCash('');
    setEditCommission('');
    setEditCard('');
    setTariffModalOpen(true);
  };

  const handleOpenEdit = (index: number) => {
    const item = currentTariffs[index];
    if (!item) return;
    setEditingTariffIndex(index);
    setEditName(item[0]);
    setEditCash(item[1]);
    setEditCommission(item[2] ?? '');
    setEditCard(item[3] ?? '');
    setTariffModalOpen(true);
  };

  const handleDeleteTariff = (index: number) => {
    const item = currentTariffs[index];
    if (!item) return;
    if (confirm(`¿Quitar el curso "${item[0]}" de la lista de precios de ${selectedSchool}?`)) {
      const updated = currentTariffs.filter((_, i) => i !== index);
      updateTariffsForSchool(selectedSchool, updated);
    }
  };

  const handleSaveTariff = (e: React.FormEvent) => {
    e.preventDefault();
    const name = editName.trim();
    const cash = Number(editCash);
    const comm = Number(editCommission);
    const card = editCard === '' ? null : Number(editCard);

    if (!name || !Number.isFinite(cash) || cash <= 0 || !Number.isFinite(comm) || comm < 0 || comm > cash) {
      alert('Revisá los precios y la comisión. La comisión no puede superar el precio en efectivo.');
      return;
    }
    if (card !== null && (!Number.isFinite(card) || card <= 0)) {
      alert('El precio con tarjeta debe ser un número válido mayor a 0.');
      return;
    }
    if (currentTariffs.some((t, i) => i !== editingTariffIndex && t[0].toLocaleLowerCase() === name.toLocaleLowerCase())) {
      alert('Ya existe un curso con ese nombre en esta autoescuela.');
      return;
    }

    const newItem: TariffItem = [name, cash, comm, card];
    const updated =
      editingTariffIndex === null
        ? [...currentTariffs, newItem]
        : currentTariffs.map((t, i) => (i === editingTariffIndex ? newItem : t));

    updateTariffsForSchool(selectedSchool, updated);
    setTariffModalOpen(false);
    setEditingTariffIndex(null);
  };

  const handleResetTariffs = () => {
    if (confirm(`¿Restaurar las tarifas iniciales por defecto para ${selectedSchool}?`)) {
      resetTariffsForSchool(selectedSchool);
      alert('Tarifas restauradas.');
    }
  };

  // Share Tariffs logic
  const shareFilteredTariffs = currentTariffs.filter((t) => shareTariffCategoryMatch(t[0], shareCategory));
  const selectedShareItems = shareFilteredTariffs.filter((t) => !deselectedCourses.includes(t[0]));

  const toggleShareCourse = (name: string) => {
    setDeselectedCourses((prev) => (prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]));
  };

  const buildShareText = () => {
    if (!selectedShareItems.length) {
      alert('Seleccioná al menos un curso para compartir.');
      return null;
    }
    const categoryNames: Record<string, string> = {
      todos: 'Lista completa de cursos',
      'promo-manual': 'Promo Auto Manual',
      'promo-auto': 'Promo Auto Automático',
      'normal-manual': 'Auto Manual',
      'normal-auto': 'Auto Automático',
      motos: 'Cursos de Moto',
      extensiones: 'Extensiones de clases',
    };

    const rows = selectedShareItems.map((t) => {
      const n = t[0].replace(/^PROMO /, '');
      const lines = ['🚘 ' + n];
      if (sharePaymentMode !== 'card') lines.push('💵 Efectivo: ' + money(t[1]));
      if (sharePaymentMode !== 'cash') lines.push('💳 Tarjeta: ' + (t[3] == null ? 'Consultar precio' : money(t[3])));
      return lines.join('\n');
    });
    return `📋 ${selectedSchool}\n${categoryNames[shareCategory] || 'Precios'}\n\n${rows.join('\n\n')}\n\nConsultanos por disponibilidad y horarios.`;
  };

  const handleCopyShareText = async () => {
    const msg = buildShareText();
    if (!msg) return;
    try {
      await navigator.clipboard.writeText(msg);
      alert('Lista de precios copiada al portapapeles.');
    } catch {
      alert('No se pudo copiar automáticamente.');
    }
  };

  const handleDownloadBackup = () => {
    const backupData = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      teachers,
      records,
      payments,
      claims,
      tariffsBySchool,
      nextTeacherNumber,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `respaldo_autoescuelas_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const handleUploadBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20_000_000) {
      alert('El archivo supera el límite de 20 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const plain = parsed && typeof parsed === 'object' && 'state' in parsed ? parsed.state : parsed;

        if (!Array.isArray(plain.teachers) || !Array.isArray(plain.records)) {
          throw new Error('El archivo no contiene la estructura esperada de respaldo.');
        }

        const confirmRestore = confirm(
          `Se restaurará el respaldo con:\n` +
            `- ${plain.teachers.length} instructores\n` +
            `- ${plain.records.length} cursos\n` +
            `- ${(plain.payments || []).length} pagos\n\n` +
            `¿Continuar? Los datos actuales se reemplazarán.`
        );

        if (confirmRestore) {
          restoreBackup(plain);
          alert('¡Respaldo restaurado con éxito!');
        }
      } catch (err: any) {
        alert('Error al leer el archivo de respaldo: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
            <Settings className="w-5 h-5 text-teal-600" /> Configuración del Sistema
          </h3>
          <p className="text-xs text-slate-500">Editor de tarifas por autoescuela, lista para compartir y respaldos</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadBackup}
            className="bg-teal-600 hover:bg-teal-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" /> Descargar Respaldo JSON
          </button>

          <label className="bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer">
            <Upload className="w-4 h-4" /> Restaurar Respaldo
            <input type="file" accept=".json" onChange={handleUploadBackup} className="hidden" />
          </label>
        </div>
      </div>

      {/* Share Tariffs Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Share2 className="w-4 h-4 text-teal-600" /> Compartir Lista de Precios ({selectedSchool})
          </h4>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={shareCategory}
              onChange={(e) => setShareCategory(e.target.value)}
              className="text-xs p-2 rounded-lg border border-slate-300 bg-white font-semibold"
            >
              <option value="todos">Todos los cursos</option>
              <option value="promo-manual">Promo Manual</option>
              <option value="promo-auto">Promo Automático</option>
              <option value="normal-manual">Manual estándar</option>
              <option value="normal-auto">Automático estándar</option>
              <option value="motos">Motos</option>
              <option value="extensiones">Extensiones</option>
            </select>
            <select
              value={sharePaymentMode}
              onChange={(e) => setSharePaymentMode(e.target.value as any)}
              className="text-xs p-2 rounded-lg border border-slate-300 bg-white font-semibold"
            >
              <option value="both">Efectivo + Tarjeta</option>
              <option value="cash">Solo Efectivo</option>
              <option value="card">Solo Tarjeta</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
          {shareFilteredTariffs.map((t) => {
            const checked = !deselectedCourses.includes(t[0]);
            return (
              <label
                key={t[0]}
                className={`text-xs px-2.5 py-1 rounded-lg border cursor-pointer flex items-center gap-1.5 ${
                  checked ? 'bg-teal-50 border-teal-300 text-teal-900 font-semibold' : 'bg-white border-slate-200 text-slate-400'
                }`}
              >
                <input type="checkbox" checked={checked} onChange={() => toggleShareCourse(t[0])} />
                {t[0]}
              </label>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              const msg = buildShareText();
              if (msg) window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank', 'noopener');
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
          >
            📲 Enviar por WhatsApp
          </button>
          <button
            onClick={handleCopyShareText}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" /> Copiar Texto
          </button>
          <button
            onClick={() => {
              const msg = buildShareText();
              if (msg) window.location.href = `mailto:?subject=${encodeURIComponent('Lista de precios - ' + selectedSchool)}&body=${encodeURIComponent(msg)}`;
            }}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <Mail className="w-3.5 h-3.5" /> Enviar por Email
          </button>
        </div>
      </div>

      {/* Tariffs Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 uppercase">Autoescuela:</span>
            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              className="text-sm font-bold text-slate-900 p-2 border border-slate-300 rounded-xl outline-none bg-white"
            >
              {SCHOOLS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleOpenAdd}
              className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Agregar Curso
            </button>
            <button
              onClick={handleResetTariffs}
              className="text-xs font-semibold text-slate-500 hover:text-red-600 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Restaurar valores por defecto
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {currentTariffs.map((tariff, index) => {
            const [name, cash, commission, card] = tariff;
            const schoolProfit = cash - (commission || 0);

            return (
              <div
                key={name + index}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 hover:border-slate-300 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-slate-900 text-sm">{name}</h4>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(index)}
                      className="p-1 text-slate-400 hover:text-teal-700 rounded-md cursor-pointer"
                      title="Editar precios"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTariff(index)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded-md cursor-pointer"
                      title="Quitar curso"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/60">
                  <div>
                    <span className="text-slate-400">Efectivo:</span> <strong className="text-slate-800">{money(cash)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Tarjeta:</span>{' '}
                    <strong className={card ? 'text-blue-700' : 'text-slate-400 italic'}>
                      {card ? money(card) : 'Sin definir'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Comisión Inst.:</span>{' '}
                    <strong className="text-emerald-700">{money(commission)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Ganancia Esc.:</span>{' '}
                    <strong className="text-slate-700">{money(schoolProfit)}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Add / Edit Tariff */}
      {tariffModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-lg text-slate-900">
              {editingTariffIndex === null ? 'Agregar Curso a Tarifa' : 'Editar Precios del Curso'}
            </h3>
            <p className="text-xs text-slate-500">
              Autoescuela: <strong>{selectedSchool}</strong>
            </p>

            <form onSubmit={handleSaveTariff} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del Curso *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Ej. Manual x8"
                  className="w-full text-sm p-2 rounded-lg border border-slate-300 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Precio en Efectivo ($) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={editCash}
                  onChange={(e) => setEditCash(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full text-sm p-2 rounded-lg border border-slate-300 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Precio con Tarjeta ($) - opcional</label>
                <input
                  type="number"
                  min="0"
                  value={editCard}
                  onChange={(e) => setEditCard(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Sin definir"
                  className="w-full text-sm p-2 rounded-lg border border-slate-300 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Comisión Total Instructor ($) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={editCommission}
                  onChange={(e) => setEditCommission(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full text-sm p-2 rounded-lg border border-slate-300 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTariffModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Guardar Tarifa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
