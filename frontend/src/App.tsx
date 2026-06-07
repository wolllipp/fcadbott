import React, { useState, useEffect } from 'react';
import { api } from './utils/api';
import PortfolioPage from './pages/PortfolioPage';
import HomePage from './pages/HomePage';
import ExemptionsPage from './pages/ExemptionsPage';
import BonusesPage from './pages/BonusesPage';
import SectorPage from './pages/SectorPage';
import EventsPage from './pages/EventsPage';
import CouncilPage from './pages/CouncilPage';
import StudentLoginPage from './pages/StudentLoginPage';
import StudentDashboard from './pages/StudentDashboard';
import PetitionsAdminPage from './pages/PetitionsAdminPage';
import NavBar from './components/NavBar';
import LoadingScreen from './components/LoadingScreen';
import AccessDenied from './components/AccessDenied';

declare global {
  interface Window {
    Telegram?: { WebApp?: any };
  }
}

export type Tab = 'home' | 'exemptions' | 'bonuses' | 'sector' | 'events' | 'council' | 'petitions';

export interface Coordinator {
  id: number;
  fullName: string;
  telegramUsername: string;
  role: 'CHAIRMAN' | 'DEAN' | 'DEPUTY' | 'SECRETARY' | 'COORDINATOR';
  sector: string | null;
}

function isInTelegram(): boolean {
  return !!(window.Telegram?.WebApp?.initData);
}

export default function App() {
  const [coordinator, setCoordinator] = useState<Coordinator | null>(null);
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [tab, setTab] = useState<Tab>('home');
  const [pendingPetitions, setPendingPetitions] = useState(0);

  const isAdmin = coordinator?.role === 'CHAIRMAN' || coordinator?.role === 'DEPUTY' || coordinator?.role === 'DEAN' || coordinator?.role === 'SECRETARY';

  useEffect(() => {
    if (!isInTelegram()) {
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
        const urlParams = new URLSearchParams(window.location.search);
        const testUsername = urlParams.get('user') || '';

        const res = await api.auth.verify(initData, testUsername || undefined);
        setCoordinator(res.coordinator);
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

    async function fetchPending() {
      try {
        const res = await fetch('/api/petitions?role=CHAIRMAN');
        const data = await res.json();
        setPendingPetitions(data.filter((p: any) => p.status === 'PENDING').length);
      } catch (_) {}
    }
    fetchPending();
    const iv = setInterval(fetchPending, 10000);
    return () => clearInterval(iv);
  }, []);

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

  // Not in Telegram — show portfolio
  if (!isInTelegram()) return <PortfolioPage />;

  // Student mode
  if (!coordinator && student) {
    return (
      <StudentDashboard student={student} onLogout={handleStudentLogout} />
    );
  }

  if (!coordinator && denied && !student) {
    return <StudentLoginPage onLogin={handleStudentLogin} />;
  }

  if (!coordinator) return <AccessDenied />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {tab === 'home' && <HomePage coordinator={coordinator} onNavigate={setTab} />}
      {tab === 'exemptions' && <ExemptionsPage coordinator={coordinator} />}
      {tab === 'bonuses' && <BonusesPage coordinator={coordinator} />}
      {tab === 'sector' && (isAdmin ? <CouncilPage coordinator={coordinator} /> : <SectorPage coordinator={coordinator} />)}
      {tab === 'events' && <EventsPage coordinator={coordinator} />}
      {tab === 'council' && <CouncilPage coordinator={coordinator} />}
      {tab === 'petitions' && <PetitionsAdminPage coordinator={coordinator} />}
      <NavBar active={tab} onChange={setTab} coordinator={coordinator} pendingPetitions={pendingPetitions} />
    </div>
  );
}
