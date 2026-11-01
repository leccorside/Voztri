import React, { useCallback, useEffect, useState } from 'react';
import type { User } from '@voztri/shared-types';
import { Sidebar } from './components/Sidebar.js';
import { DashboardScreen } from './screens/DashboardScreen.js';
import { LiveMapScreen } from './screens/LiveMapScreen.js';
import { DriversScreen } from './screens/DriversScreen.js';
import { RidesScreen } from './screens/RidesScreen.js';
import { AuditLogsScreen } from './screens/AuditLogsScreen.js';
import { LoginScreen } from './screens/LoginScreen.js';
import { authApi, tokenStorage, UNAUTHORIZED_EVENT } from './lib/api.js';

type Session = { status: 'checking' } | { status: 'anonymous' } | { status: 'authenticated'; user: User };

export const App: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState('dashboard');
  const [session, setSession] = useState<Session>(() =>
    tokenStorage.get() ? { status: 'checking' } : { status: 'anonymous' },
  );

  const logout = useCallback(() => {
    tokenStorage.clear();
    setSession({ status: 'anonymous' });
  }, []);

  // Valida um token salvo de uma sessão anterior
  useEffect(() => {
    if (session.status !== 'checking') return;
    authApi
      .getMe()
      .then((user) => (user.role === 'admin' ? setSession({ status: 'authenticated', user }) : logout()))
      .catch(logout);
  }, [session.status, logout]);

  // Qualquer 401 da API encerra a sessão
  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, logout);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, logout);
  }, [logout]);

  if (session.status === 'checking') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7B7489' }}>
        Validando sessão…
      </div>
    );
  }

  if (session.status === 'anonymous') {
    return <LoginScreen onLogin={(user) => setSession({ status: 'authenticated', user })} />;
  }

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Sidebar activeScreen={activeScreen} onSelect={setActiveScreen} user={session.user} onLogout={logout} />
      <main style={{ flex: 1, backgroundColor: '#F4F6FA', overflowY: 'auto' }}>
        {activeScreen === 'dashboard' && <DashboardScreen />}
        {activeScreen === 'live-map' && <LiveMapScreen />}
        {activeScreen === 'drivers' && <DriversScreen />}
        {activeScreen === 'rides' && <RidesScreen />}
        {activeScreen === 'audit' && <AuditLogsScreen />}
      </main>
    </div>
  );
};
