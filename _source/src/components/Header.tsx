import React, { useState } from 'react';
import {
  LayoutDashboard,
  UserPlus,
  BookOpen,
  Users,
  Receipt,
  MapPin,
  AlertCircle,
  Settings,
  XCircle,
  Menu,
  X,
  LayoutGrid,
} from 'lucide-react';

export type TabType = 'panel' | 'alta' | 'cursos' | 'cancelados' | 'instructores' | 'cuentas' | 'zonas' | 'reclamos' | 'config';

interface HeaderProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  counts: {
    activeCourses: number;
    cancelledCourses: number;
    teachers: number;
    claims: number;
  };
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange, counts }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabs: { id: TabType; label: string; shortLabel: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'panel', label: 'Panel', shortLabel: 'Panel', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'alta', label: 'Alta', shortLabel: 'Alta', icon: <UserPlus className="w-4 h-4" /> },
    { id: 'cursos', label: 'Cursos', shortLabel: 'Cursos', icon: <BookOpen className="w-4 h-4" />, badge: counts.activeCourses },
    {
      id: 'cancelados',
      label: 'Cancelados',
      shortLabel: 'Cancel.',
      icon: <XCircle className="w-4 h-4" />,
      badge: counts.cancelledCourses > 0 ? counts.cancelledCourses : undefined,
    },
    { id: 'instructores', label: 'Instructores', shortLabel: 'Profs.', icon: <Users className="w-4 h-4" />, badge: counts.teachers },
    { id: 'cuentas', label: 'Cuentas', shortLabel: 'Cuentas', icon: <Receipt className="w-4 h-4" /> },
    { id: 'zonas', label: 'Zonas', shortLabel: 'Zonas', icon: <MapPin className="w-4 h-4" /> },
    {
      id: 'reclamos',
      label: 'Reclamos',
      shortLabel: 'Reclamos',
      icon: <AlertCircle className="w-4 h-4" />,
      badge: counts.claims > 0 ? counts.claims : undefined,
    },
    { id: 'config', label: 'Configuración', shortLabel: 'Config.', icon: <Settings className="w-4 h-4" /> },
  ];

  const handleSelectTab = (tab: TabType) => {
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  const activeTabInfo = tabs.find((t) => t.id === activeTab);
  const mobileQuickTabs: TabType[] = ['panel', 'alta', 'cursos', 'cuentas'];

  return (
    <>
      <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Brand Row */}
          <div className="flex items-center justify-between py-2.5 md:py-3 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src="./driveone-192.png"
                alt="DriveOne"
                className="w-9 h-9 rounded-lg object-cover bg-teal-700 shrink-0 shadow-inner"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold tracking-tight text-white truncate">DriveOne</h1>
                  <span className="hidden sm:inline-flex text-[11px] bg-teal-900/90 text-teal-300 px-2 py-0.5 rounded-full border border-teal-700/80 font-medium">
                    Gestión de Autoescuelas
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate md:hidden">
                  {activeTabInfo?.label}
                </p>
              </div>
            </div>

            {/* PC Quick Action */}
            <div className="hidden md:flex items-center gap-2">
              {activeTab !== 'alta' && (
                <button
                  type="button"
                  onClick={() => handleSelectTab('alta')}
                  className="bg-teal-600 hover:bg-teal-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Nuevo Alumno
                </button>
              )}
            </div>

            {/* Mobile Menu Toggle Button (No horizontal scroll) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-label="Abrir menú de secciones"
              className="md:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white transition-colors cursor-pointer shrink-0"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              <span>{mobileMenuOpen ? 'Cerrar' : 'Menú'}</span>
            </button>
          </div>

          {/* Desktop Navigation Bar (Clean dedicated strip, zero collision with logo) */}
          <nav
            aria-label="Navegación principal"
            className="hidden md:flex items-center flex-wrap gap-1.5 py-2 border-t border-slate-800"
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSelectTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/90'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold leading-tight ${
                        isActive
                          ? 'bg-white text-teal-900'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Mobile 3x3 Grid Menu (Zero horizontal scroll!) */}
          {mobileMenuOpen && (
            <nav
              aria-label="Menú móvil"
              className="md:hidden border-t border-slate-800 py-3 grid grid-cols-3 gap-2"
            >
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleSelectTab(tab.id)}
                    className={`relative flex flex-col items-center justify-center gap-1 py-2.5 px-1.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-slate-800/80 text-slate-200 hover:bg-slate-800 border border-slate-700/70'
                    }`}
                  >
                    {tab.icon}
                    <span className="truncate max-w-full">{tab.shortLabel}</span>
                    {tab.badge !== undefined && (
                      <span
                        className={`absolute top-1.5 right-1.5 text-[9px] px-1.5 rounded-full font-bold leading-4 ${
                          isActive ? 'bg-white text-teal-900' : 'bg-teal-700 text-white'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          )}
        </div>
      </header>

      {/* Mobile Fixed Bottom Navigation Bar (Quick access without horizontal scroll) */}
      <nav
        aria-label="Acceso rápido móvil"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg grid grid-cols-5"
      >
        {mobileQuickTabs.map((tabId) => {
          const tab = tabs.find((t) => t.id === tabId)!;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleSelectTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-2 px-1 text-[10px] font-semibold transition-colors cursor-pointer ${
                isActive ? 'text-teal-700' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {isActive && <span className="absolute top-0 inset-x-3 h-0.5 bg-teal-600 rounded-b-full" />}
              {tab.icon}
              <span className="mt-0.5 truncate max-w-full">{tab.shortLabel}</span>
              {tab.badge !== undefined && (
                <span className="absolute top-1 right-2.5 text-[9px] px-1 rounded-full bg-teal-600 text-white font-bold leading-3.5">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className={`relative flex flex-col items-center justify-center py-2 px-1 text-[10px] font-semibold transition-colors cursor-pointer ${
            mobileMenuOpen || !mobileQuickTabs.includes(activeTab)
              ? 'text-teal-700'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          <span className="mt-0.5">Más</span>
        </button>
      </nav>
    </>
  );
};
