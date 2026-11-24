import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { intlPhone } from '../../utils/formatters';
import { Teacher } from '../../types';
import { 
  UserPlus, 
  Phone, 
  Car, 
  MapPin, 
  Edit, 
  Trash2, 
  Search,
  MessageCircle
} from 'lucide-react';

export const TeachersTab: React.FC = () => {
  const { teachers, records, addTeacher, updateTeacher, deleteTeacher } = useAppStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState('Manual');
  const [zone, setZone] = useState('CABA');
  const [model, setModel] = useState('');
  const [plate, setPlate] = useState('');

  const filteredTeachers = teachers.filter(t => {
    const q = searchTerm.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.phone.includes(q) ||
      t.zone.toLowerCase().includes(q) ||
      t.model.toLowerCase().includes(q) ||
      t.plate.toLowerCase().includes(q)
    );
  });

  const handleOpenAdd = () => {
    setName('');
    setPhone('');
    setType('Manual');
    setZone('CABA');
    setModel('');
    setPlate('');
    setEditingTeacher(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setName(teacher.name);
    setPhone(teacher.phone);
    setType(teacher.type);
    setZone(teacher.zone);
    setModel(teacher.model);
    setPlate(teacher.plate);
    setShowAddModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Completá el nombre del instructor.');
      return;
    }

    if (editingTeacher) {
      updateTeacher(editingTeacher.id, {
        name: name.trim(),
        phone: phone.trim(),
        type,
        zone: zone.trim(),
        model: model.trim(),
        plate: plate.trim().toUpperCase(),
      });
    } else {
      addTeacher({
        name: name.trim(),
        phone: phone.trim(),
        type,
        zone: zone.trim(),
        model: model.trim(),
        plate: plate.trim().toUpperCase(),
      });
    }

    setShowAddModal(false);
    setEditingTeacher(null);
  };

  const handleDelete = (id: string, teacherName: string) => {
    const assignedCount = records.filter(r => String(r.teacherId) === String(id)).length;
    if (confirm(`¿Eliminar al instructor ${teacherName}? (${assignedCount} cursos asociados)`)) {
      deleteTeacher(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-lg">Plantel de Instructores</h3>
          <p className="text-xs text-slate-500">
            {teachers.length} profesores registrados con numeración pública permanente
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar instructor, patente..."
              className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <button
            onClick={handleOpenAdd}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4" /> + Nuevo Instructor
          </button>
        </div>
      </div>

      {/* Instructors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTeachers.map(teacher => {
          const courseCount = records.filter(r => String(r.teacherId) === String(teacher.id) && r.status !== 'cancelado').length;
          const phoneClean = intlPhone(teacher.phone);

          return (
            <div key={teacher.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 hover:border-slate-300 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 font-extrabold flex items-center justify-center text-sm border border-teal-200">
                    #{teacher.teacherNumber || '•'}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-base">{teacher.name}</h4>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {courseCount} {courseCount === 1 ? 'curso activo' : 'cursos activos'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(teacher)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                    title="Editar datos"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(teacher.id, teacher.name)}
                    className="p-1.5 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-lg"
                    title="Eliminar instructor"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="text-xs space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100 text-slate-600">
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-slate-400" />
                  <span className="font-semibold text-slate-800">{teacher.type}</span>
                  {teacher.model && <span>· {teacher.model}</span>}
                  {teacher.plate && (
                    <span className="bg-slate-200 text-slate-800 font-mono text-[10px] px-1.5 py-0.5 rounded font-bold">
                      {teacher.plate}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>{teacher.zone || 'Sin zona asignada'}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{teacher.phone || 'Sin teléfono'}</span>
                </div>
              </div>

              {phoneClean ? (
                <a
                  href={`https://wa.me/${phoneClean}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <MessageCircle className="w-4 h-4" /> Abrir Chat de WhatsApp
                </a>
              ) : (
                <div className="text-center py-2 text-xs text-slate-400 bg-slate-50 rounded-xl">
                  Sin WhatsApp configurado
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal Add / Edit Teacher */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-lg text-slate-900">
              {editingTeacher ? 'Editar Instructor' : 'Registrar Nuevo Instructor'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre y Apellido *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Roberto Toledo"
                  className="w-full text-sm p-2.5 rounded-lg border border-slate-300 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Celular / WhatsApp *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej. 11 3389-8292"
                  className="w-full text-sm p-2.5 rounded-lg border border-slate-300 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Vehículo</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full text-sm p-2.5 rounded-lg border border-slate-300 outline-none bg-white"
                  >
                    <option value="Manual">Manual</option>
                    <option value="Automático">Automático</option>
                    <option value="Ambos">Manual y Automático</option>
                    <option value="Moto">Moto</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Zona de Cobertura</label>
                  <input
                    type="text"
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                    placeholder="Ej. CABA, Zona Norte"
                    className="w-full text-sm p-2.5 rounded-lg border border-slate-300 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Modelo de Auto/Moto</label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="Ej. VW Gol"
                    className="w-full text-sm p-2.5 rounded-lg border border-slate-300 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Patente</label>
                  <input
                    type="text"
                    value={plate}
                    onChange={(e) => setPlate(e.target.value)}
                    placeholder="Ej. AF123XY"
                    className="w-full text-sm p-2.5 rounded-lg border border-slate-300 outline-none uppercase font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Guardar Instructor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
