import React from 'react';
import { VoztriColors } from '@voztri/design-tokens';

interface Props {
  activeScreen: string;
  onSelect: (screen: string) => void;
}

export const Sidebar: React.FC<Props> = ({ activeScreen, onSelect }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard Geral', icon: '📊' },
    { id: 'live-map', label: 'Operações ao Vivo', icon: '🗺️' },
    { id: 'drivers', label: 'Gestão de Motoristas', icon: '🚗' },
    { id: 'rides', label: 'Corridas & Viagens', icon: '🛣️' },
    { id: 'audit', label: 'Trilha de Auditoria', icon: '🛡️' },
  ];

  return (
    <aside style={{
      width: 260,
      backgroundColor: '#0B1026',
      color: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      boxShadow: '4px 0 20px rgba(0,0,0,0.1)',
    }}>
      {/* Brand Header */}
      <div style={{
        height: 70,
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        borderBottom: '1px solid #19224A',
      }}>
        <div style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #6A00FF 0%, #9B4DFF 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFFFF',
          fontWeight: 800,
          fontSize: 22,
        }}>
          V
        </div>
        <div>
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '0.05em', color: '#FFFFFF' }}>VOZTRI</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#9B4DFF', display: 'block', textTransform: 'uppercase' }}>
            Admin Master
          </span>
        </div>
      </div>

      {/* Nav Menu */}
      <nav style={{ flex: 1, padding: '20px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {menuItems.map((item) => {
          const isActive = activeScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                borderRadius: 12,
                border: 'none',
                backgroundColor: isActive ? '#6A00FF' : 'transparent',
                color: isActive ? '#FFFFFF' : '#A0A5BD',
                fontSize: 14,
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Admin User Card Footer */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid #19224A',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 999,
          backgroundColor: '#6A00FF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
        }}>
          A
        </div>
        <div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', display: 'block' }}>Admin VOZTRI</span>
          <span style={{ fontSize: 11, color: '#00C853', fontWeight: 600 }}>● Sistema Operacional</span>
        </div>
      </div>
    </aside>
  );
};
