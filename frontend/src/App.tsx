import React, { lazy, Suspense, useState, useEffect } from 'react';
import { api } from './utils/api';
const PortfolioPage = lazy(() => import('./pages/PortfolioPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const ExemptionsPage = lazy(() => import('./pages/ExemptionsPage'));
const BonusesPage = lazy(() => import('./pages/BonusesPage'));
const SectorPage = lazy(() => import('./pages/SectorPage'));
const EventsPage = lazy(() => import('./pages/EventsPage'));
const CouncilPage = lazy(() => import('./pages/CouncilPage'));
const StudentLoginPage = lazy(() => import('./pages/StudentLoginPage'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const PetitionsAdminPage = lazy(() => import('./pages/PetitionsAdminPage'));
const AdminStatsPage = lazy(() => import('./pages/AdminStatsPage'));
const ApplicationsPage = lazy(() => import('./pages/ApplicationsPage'));
const ScannerPage = lazy(() => import('./pages/ScannerPage'));
const PointsAdminPage = lazy(() => import('./pages/PointsAdminPage'));
import NavBar from './components/NavBar';
import LoadingScreen from './components/LoadingScreen';
import AccessDenied from './components/AccessDenied';
import { MascotToastProvider } from './components/MascotToast';

declare global {
  interface Window {
    Telegram?: { WebApp?: any };
  }
}

export type Tab = 'home' | 'exemptions' | 'bonuses' | 'sector' | 'events' | 'council' | 'petitions' | 'stats' | 'applications' | 'scanner' | 'points';

export interface Coordinator {
  id: number;
  fullName: string;
  telegramUsername: string;
  role: 'CHAIRMAN' | 'DEAN' | 'DEPUTY' | 'SECRETARY' | 'COORDINATOR';
  sector: string | null;
}

function isInTelegram(): boolean {
  const webApp = window.Telegram?.WebApp;
  return !!(webApp?.initData && webApp?.initDataUnsafe?.user);
}

export default function App() {
  const [coordinator, setCoordinator] = useState<Coordinator | null>(null);
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [tab, setTab] = useState<Tab>('home');
  const [pendingPetitions, setPendingPetitions] = useState(0);
  const [pendingApplications, setPendingApplications] = useState(0);

  const isAdmin = coordinator?.role === 'CHAIRMAN' || coordinator?.role === 'DEPUTY' || coordinator?.role === 'DEAN' || coordinator?.role === 'SECRETARY';

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isProd = window.location.hostname === 'fcadbot.site';
    const testUsername = isProd ? '' : (urlParams.get('user') || '');

    if (!isInTelegram() && !testUsername) {
      setLoading(false);
      return;
    }

    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      tg.setBackgroundColor('#0f0f13');
      tg.setHeaderColor('#0f0f13');
    }

    async function auth() {
      try {
        const initData = tg?.initData || '';
        const testUsernameSafe = isProd ? '' : (urlParams.get('user') || '');

        const res = await api.auth.verify(initData, testUsernameSafe || undefined);
        if (res.coordinator) {
          setCoordinator(res.coordinator);
        } else if (res.student) {
          setStudent(res.student);
          localStorage.setItem('student', JSON.stringify(res.student));
        }
      } catch {
        const saved = localStorage.getItem('student');
        if (saved) {
          try {
            const s = JSON.parse(saved);
            const initData = window.Telegram?.WebApp?.initData || '';
            const res = await fetch('/api/auth/student-login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ telegramUsername: s.telegramUsername, initData }),
            });
            if (res.ok) {
              const data = await res.json();
              setStudent(data.student);
              localStorage.setItem('student', JSON.stringify(data.student));
            } else {
              localStorage.removeItem('student');
              setDenied(true);
            }
          } catch { setDenied(true); }
        } else {
          setDenied(true);
        }
      } finally {
        setLoading(false);
      }
    }

    auth();

  }, []);

  useEffect(() => {
    if (!coordinator) return;
    async function fetchPendingPetitions() {
      try {
        const data = await fetch('/api/petitions').then((res) => res.json());
        setPendingPetitions(Array.isArray(data) ? data.filter((p: any) => p.status === 'PENDING').length : 0);
      } catch (_) {}
    }
    async function fetchPendingApplications() {
      try {
        const params = coordinator.role === 'COORDINATOR' ? `?role=COORDINATOR&coordinatorId=${coordinator.id}` : '';
        const data = await fetch(`/api/applications${params}`).then((res) => res.json());
        setPendingApplications(Array.isArray(data) ? data.filter((a: any) => a.status === 'PENDING').length : 0);
      } catch (_) {}
    }
    fetchPendingPetitions();
    fetchPendingApplications();
    const interval = setInterval(fetchPendingApplications, 30000);
    const petitionsInterval = setInterval(fetchPendingPetitions, 30000);
    return () => { clearInterval(interval); clearInterval(petitionsInterval); };
  }, [coordinator]);

  function handleStudentLogin(s: any) {
    setStudent(s);
    setDenied(false);
  }

  function handleStudentLogout() {
    localStorage.removeItem('student');
    setStudent(null);
    setDenied(true);
  }

  if (loading) return <LoadingScreen />;

  const testMode = new URLSearchParams(window.location.search).get('user');
  const isProduction = window.location.hostname === 'fcadbot.site';
  const safeTestMode = isProduction ? null : testMode;

  // Not in Telegram and no test mode — show portfolio
  if (!isInTelegram() && !safeTestMode) return <Suspense fallback={<LoadingScreen />}><PortfolioPage /></Suspense>;

  // Student mode
  if (!coordinator && student) {
    return (
      <Suspense fallback={<LoadingScreen />}>
      <MascotToastProvider>
        <StudentDashboard student={student} onLogout={handleStudentLogout} />
      </MascotToastProvider>
      </Suspense>
    );
  }

  if (!coordinator && denied && !student) {
    return <Suspense fallback={<LoadingScreen />}><StudentLoginPage onLogin={handleStudentLogin} /></Suspense>;
  }

  if (!coordinator) return <AccessDenied />;

  return (
    <Suspense fallback={<LoadingScreen />}>
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div key={tab} className="page-anim" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        {tab === 'home' && <HomePage coordinator={coordinator} onNavigate={setTab} />}
        {tab === 'exemptions' && <ExemptionsPage coordinator={coordinator} />}
        {tab === 'bonuses' && <BonusesPage coordinator={coordinator} />}
        {tab === 'sector' && (isAdmin ? <CouncilPage coordinator={coordinator} /> : <SectorPage coordinator={coordinator} />)}
        {tab === 'events' && <EventsPage coordinator={coordinator} />}
        {tab === 'petitions' && <PetitionsAdminPage coordinator={coordinator} />}
        {tab === 'stats' && <AdminStatsPage coordinator={coordinator} />}
        {tab === 'applications' && <ApplicationsPage coordinator={coordinator} />}
        {tab === 'scanner' && <ScannerPage coordinator={coordinator} />}
        {tab === 'points' && <PointsAdminPage coordinator={coordinator} />}
      </div>
      <NavBar active={tab} onChange={setTab} coordinator={coordinator} pendingPetitions={pendingPetitions} pendingApplications={pendingApplications} />
    </div>
    </Suspense>
  );
}
