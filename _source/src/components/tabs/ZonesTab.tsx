import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { SCHOOLS, ZN, Zcoords } from '../../constants/initialData';
import { zloc, zcoverage, zoneSales, znorm } from '../../utils/zones';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Users, BookOpen } from 'lucide-react';

const ZONE_COLORS = ['#7c3aed', '#2563eb', '#0f766e', '#c2410c', '#64748b'];
const ZONE_COORDS: Record<string, [number, number]> = {
  CABA: [-34.61, -58.43],
  'Zona Norte': [-34.43, -58.57],
  'Zona Oeste': [-34.66, -58.7],
  'Zona Sur': [-34.82, -58.39],
};

export const ZonesTab: React.FC = () => {
  const { records, teachers } = useAppStore();

  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [school, setSchool] = useState('');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  const sold = useMemo(() => zoneSales(records, month, school), [records, month, school]);

  const zoneGroups = useMemo(() => {
    return ZN.map((z, idx) => {
      const coursesInZone = sold.filter((r) => zloc(r)[0] === z);
      const teachersInZone = teachers.filter((t) => zcoverage(t).includes(z));
      return {
        zone: z,
        courses: coursesInZone,
        teachers: teachersInZone,
        color: ZONE_COLORS[idx] || '#64748b',
      };
    });
  }, [sold, teachers]);

  // 1. Initialize Leaflet map once and destroy cleanly on unmount
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current).setView([-34.66, -58.52], 10);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    layerGroupRef.current = layerGroup;

    const coords = Object.values(ZONE_COORDS);
    map.fitBounds(L.latLngBounds(coords), { padding: [35, 45], maxZoom: 11 });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  // 2. Update markers/circles when data or filters change
  useEffect(() => {
    const layer = layerGroupRef.current;
    if (!layer) return;

    layer.clearLayers();

    // Macro Zone circles
    zoneGroups.forEach((g) => {
      const center = ZONE_COORDS[g.zone];
      if (!center) return;

      const marker = L.circleMarker(center, {
        radius: 14 + Math.min(22, Math.sqrt(g.courses.length) * 4),
        color: g.color,
        fillColor: g.color,
        fillOpacity: g.courses.length ? 0.45 : 0.15,
        weight: 3,
      }).addTo(layer);

      marker.bindTooltip(`${g.zone} · ${g.courses.length} vendidos`, {
        permanent: true,
        direction: 'top',
      });

      marker.bindPopup(`
        <div style="font-family:system-ui;font-size:12px;">
          <strong style="color:${g.color};font-size:14px;">${g.zone}</strong><br/>
          <strong>${g.courses.length}</strong> cursos vendidos<br/>
          <strong>${g.teachers.length}</strong> instructores con cobertura
        </div>
      `);
    });

    // Plot individual locality pins using Zcoords when courses match barrios/localidades
    const localityCounts = new Map<string, { count: number; zone: string; coords: [number, number]; label: string }>();
    sold.forEach((r) => {
      const [z, loc] = zloc(r);
      const normLoc = znorm(loc);
      const coords = Zcoords[normLoc];
      if (coords) {
        const entry = localityCounts.get(normLoc) || { count: 0, zone: z, coords, label: loc };
        entry.count++;
        localityCounts.set(normLoc, entry);
      }
    });

    localityCounts.forEach((info) => {
      const idx = ZN.indexOf(info.zone);
      const color = ZONE_COLORS[idx >= 0 ? idx : 4];
      const dot = L.circleMarker(info.coords, {
        radius: 6 + Math.min(8, info.count * 1.5),
        color: '#ffffff',
        weight: 2,
        fillColor: color,
        fillOpacity: 0.9,
      }).addTo(layer);
      dot.bindPopup(`<strong>${info.label}</strong> (${info.zone})<br/>${info.count} curso${info.count === 1 ? '' : 's'}`);
    });
  }, [zoneGroups, sold]);

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5 text-teal-600" /> Cobertura y Ventas por Zona
          </h3>
          <p className="text-xs text-slate-500">Distribución geográfica de cursos vendidos e instructores disponibles</p>
        </div>

        <div className="flex items-center gap-3">
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Mes</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="text-xs sm:text-sm p-2 rounded-xl border border-slate-300 font-semibold text-slate-800 bg-white outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Autoescuela</label>
            <select
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              className="text-xs sm:text-sm p-2 rounded-xl border border-slate-300 font-semibold text-slate-800 bg-white outline-none"
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
      </div>

      {/* Map & Summary Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-4">
          <div ref={mapContainerRef} className="w-full h-[460px] rounded-xl overflow-hidden shadow-inner z-10" />
        </div>

        <div className="space-y-4">
          {zoneGroups.map((g) => (
            <div key={g.zone} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                  {g.zone}
                </span>
                <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                  {g.courses.length} ventas
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span>{g.courses.length} cursos</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>{g.teachers.length} profesores</span>
                </div>
              </div>

              {g.teachers.length > 0 && (
                <div className="text-[11px] text-slate-400 truncate">
                  {g.teachers.slice(0, 3).map((t) => t.name).join(', ')}
                  {g.teachers.length > 3 && ` +${g.teachers.length - 3} más`}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
