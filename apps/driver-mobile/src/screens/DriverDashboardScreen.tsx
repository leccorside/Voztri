import React from 'react';
import { useDriverStore } from '../store/driverStore.js';
import { VoztriColors } from '@voztri/design-tokens';

interface Props {
  onSimulateRide: () => void;
  onOpenEarnings: () => void;
}

export const DriverDashboardScreen: React.FC<Props> = ({ onSimulateRide, onOpenEarnings }) => {
  const { isOnline, toggleOnline, todayEarningsCents, todayRidesCount, onlineTime, rating } = useDriverStore();

  const formattedEarnings = (todayEarningsCents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: VoztriColors.light.surface }}>
      {/* Top Header */}
      <header style={{
        height: 64,
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        boxShadow: '0 2px 8px rgba(11, 16, 38, 0.05)',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #6A00FF 0%, #9B4DFF 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontWeight: 800,
            fontSize: 20,
          }}>
            V
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 800, fontSize: 16, color: VoztriColors.brand.primary }}>VOZTRI</span>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                backgroundColor: '#E9DDFF',
                color: '#22005D',
                padding: '2px 6px',
                borderRadius: 999,
                textTransform: 'uppercase',
              }}>
                Driver
              </span>
            </div>
            <span style={{ fontSize: 12, color: VoztriColors.light.onSurfaceVariant }}>Painel Operacional</span>
          </div>
        </div>

        {/* Toggle Online Button */}
        <button
          onClick={toggleOnline}
          style={{
            padding: '8px 16px',
            borderRadius: 999,
            border: 'none',
            backgroundColor: isOnline ? '#00C853' : '#7B7489',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: isOnline ? '0 4px 12px rgba(0, 200, 83, 0.3)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          <span style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            backgroundColor: '#FFFFFF',
            display: 'inline-block',
          }} />
          {isOnline ? 'ONLINE' : 'OFFLINE'}
        </button>
      </header>

      {/* Main Content Area: Map Simulation & Floating HUD */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Map Background Canvas (Styled CartoDB Positron / OSM) */}
        <div style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#E8ECF5',
          backgroundImage: 'radial-gradient(#D5DCED 1.5px, transparent 1.5px)',
          backgroundSize: '24px 24px',
          position: 'relative',
        }}>
          {/* Driver Position Marker with kinetic wave */}
          <div style={{
            position: 'absolute',
            top: '45%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            <div style={{
              width: 54,
              height: 54,
              borderRadius: 999,
              backgroundColor: 'rgba(106, 0, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: 999,
                backgroundColor: VoztriColors.brand.primary,
                boxShadow: '0 4px 14px rgba(106, 0, 255, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: 18,
              }}>
                ▲
              </div>
            </div>
            <div style={{
              marginTop: 4,
              backgroundColor: '#0B1026',
              color: '#FFFFFF',
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 6,
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            }}>
              Sua Posição
            </div>
          </div>
        </div>

        {/* Floating Earnings & Metrics Card (from Prototype: voztri_motorista_dashboard_operacional) */}
        <div style={{
          position: 'absolute',
          top: 16,
          left: 16,
          right: 16,
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          padding: 16,
          boxShadow: '0 12px 32px rgba(106, 0, 255, 0.08), 0 2px 8px rgba(11, 16, 38, 0.04)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#7B7489', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Ganhos de Hoje
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                <span style={{ fontSize: 26, fontWeight: 800, color: '#151A31' }}>{formattedEarnings}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#9546F9' }}>+18%</span>
              </div>
            </div>
            <button
              onClick={onOpenEarnings}
              style={{
                backgroundColor: '#F3F2FF',
                color: VoztriColors.brand.primary,
                border: 'none',
                padding: '6px 12px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Ver Extrato ›
            </button>
          </div>

          {/* 3 Metrics Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
            backgroundColor: '#F8F9FE',
            borderRadius: 12,
            padding: '10px 8px',
            textAlign: 'center',
          }}>
            <div>
              <span style={{ fontSize: 11, color: '#7B7489', display: 'block' }}>Viagens</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#151A31' }}>{todayRidesCount}</span>
            </div>
            <div style={{ borderLeft: '1px solid #E5E7FF', borderRight: '1px solid #E5E7FF' }}>
              <span style={{ fontSize: 11, color: '#7B7489', display: 'block' }}>Online</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#151A31' }}>{onlineTime}</span>
            </div>
            <div>
              <span style={{ fontSize: 11, color: '#7B7489', display: 'block' }}>Avaliação</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#FFAB00' }}>★ {rating}</span>
            </div>
          </div>
        </div>

        {/* Bottom Floating Simulator Button */}
        <div style={{
          position: 'absolute',
          bottom: 20,
          left: 16,
          right: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          {isOnline && (
            <button
              onClick={onSimulateRide}
              style={{
                backgroundColor: VoztriColors.brand.primary,
                color: '#FFFFFF',
                border: 'none',
                padding: '14px',
                borderRadius: 14,
                fontWeight: 700,
                fontSize: 15,
                boxShadow: '0 8px 24px rgba(106, 0, 255, 0.35)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              Simular Solicitação de Corrida (Demo)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
