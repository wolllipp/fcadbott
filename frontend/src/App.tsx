import React, { useState, useEffect } from 'react';
import { api } from './utils/api';
import HomePage from './pages/HomePage';
import ExemptionsPage from './pages/ExemptionsPage';
import BonusesPage from './pages/BonusesPage';
import NavBar from './components/NavBar';
import LoadingScreen from './components/LoadingScreen';
import AccessDenied from './components/AccessDenied';

declare global {
  interface Window {
    Telegram?: { WebApp?: any };
  }
}

export type Tab = 'home' | 'exemptions' | 'bonuses';

export interface Coordinator {
  id: number;
  fullName: string;
  telegramUsername: string;
  role: 'CHAIRMAN' | 'DEAN' | 'DEPUTY' | 'SECRETARY' | 'COORDINATOR';
  sector: string | null;
}

export default function App() {
  const [coordinator, setCoordinator] = useState<Coordinator | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [tab, setTab] = useState<Tab>('home');

  useEffect(() => {
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
        // In dev, allow passing ?user=username in URL
        const urlParams = new URLSearchParams(window.location.search);
        const testUsername = urlParams.get('user') || '';

        const res = await api.auth.verify(initData, testUsername || undefined);
        setCoordinator(res.coordinator);
      } catch {
        setDenied(true);
      } finally {
        setLoading(false);
      }
    }

    auth();
  }, []);

  if (loading) return <LoadingScreen />;
  if (denied || !coordinator) return <AccessDenied />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {tab === 'home' && <HomePage coordinator={coordinator} onNavigate={setTab} />}
      {tab === 'exemptions' && <ExemptionsPage coordinator={coordinator} />}
      {tab === 'bonuses' && <BonusesPage coordinator={coordinator} />}
      <NavBar active={tab} onChange={setTab} />
    </div>
  );
}
