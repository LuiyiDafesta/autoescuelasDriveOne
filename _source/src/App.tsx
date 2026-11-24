import { useState, useEffect, Suspense, lazy } from 'react';
import { useAppStore } from './store/useAppStore';
import { Header, TabType } from './components/Header';
import { PanelTab } from './components/tabs/PanelTab';

const EnrollTab = lazy(() => import('./components/tabs/EnrollTab').then((m) => ({ default: m.EnrollTab })));
const CoursesTab = lazy(() => import('./components/tabs/CoursesTab').then((m) => ({ default: m.CoursesTab })));
const CancelledTab = lazy(() => import('./components/tabs/CancelledTab').then((m) => ({ default: m.CancelledTab })));
const TeachersTab = lazy(() => import('./components/tabs/TeachersTab').then((m) => ({ default: m.TeachersTab })));
const AccountsTab = lazy(() => import('./components/tabs/AccountsTab').then((m) => ({ default: m.AccountsTab })));
const ZonesTab = lazy(() => import('./components/tabs/ZonesTab').then((m) => ({ default: m.ZonesTab })));
const ClaimsTab = lazy(() => import('./components/tabs/ClaimsTab').then((m) => ({ default: m.ClaimsTab })));
const ConfigTab = lazy(() => import('./components/tabs/ConfigTab').then((m) => ({ default: m.ConfigTab })));

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('panel');
  const [incomingSharedText, setIncomingSharedText] = useState<string>('');
  const { records, teachers, claims } = useAppStore();

  // Handle Web Share Target if opened from WhatsApp share
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedText = params.get('text') || params.get('shared_text');
    if (sharedText && sharedText.trim()) {
      setIncomingSharedText(sharedText);
      setActiveTab('alta');
      window.history.replaceState(null, '', window.location.pathname + window.location.hash);
    }
  }, []);

  const activeCoursesCount = records.filter((r) => r.status !== 'cancelado').length;
  const cancelledCoursesCount = records.filter((r) => r.status === 'cancelado').length;
  const pendingClaimsCount = claims.filter((c) => c.status === 'pendiente').length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={{
          activeCourses: activeCoursesCount,
          cancelledCourses: cancelledCoursesCount,
          teachers: teachers.length,
          claims: pendingClaimsCount,
        }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 pb-20 md:pb-8">
        <Suspense
          fallback={
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-sm text-slate-500">
              Cargando módulo...
            </div>
          }
        >
          {activeTab === 'panel' && <PanelTab onNavigate={setActiveTab} />}
          {activeTab === 'alta' && (
            <EnrollTab
              sharedText={incomingSharedText}
              onClearSharedText={() => setIncomingSharedText('')}
            />
          )}
          {activeTab === 'cursos' && <CoursesTab />}
          {activeTab === 'cancelados' && <CancelledTab />}
          {activeTab === 'instructores' && <TeachersTab />}
          {activeTab === 'cuentas' && <AccountsTab />}
          {activeTab === 'zonas' && <ZonesTab />}
          {activeTab === 'reclamos' && <ClaimsTab />}
          {activeTab === 'config' && <ConfigTab />}
        </Suspense>
      </main>

      <footer className="bg-white border-t border-slate-200 py-4 pb-20 md:pb-4 text-center text-xs text-slate-500">
        DriveOne © 2026 · Sistema Integrado de Gestión y Liquidación de Autoescuelas
      </footer>
    </div>
  );
}

export default App;
