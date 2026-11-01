import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar.js';
import { DashboardScreen } from './screens/DashboardScreen.js';
import { LiveMapScreen } from './screens/LiveMapScreen.js';
import { DriversScreen } from './screens/DriversScreen.js';
import { RidesScreen } from './screens/RidesScreen.js';
import { AuditLogsScreen } from './screens/AuditLogsScreen.js';

export const App: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState('dashboard');

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Sidebar activeScreen={activeScreen} onSelect={setActiveScreen} />
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

