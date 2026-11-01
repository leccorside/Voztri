import React from 'react';
import { useDriverStore } from '../store/driverStore.js';
import { VoztriColors } from '@voztri/design-tokens';

interface Props {
  onOpenPinModal: () => void;
  onFinishRide: () => void;
}

export const EnRouteNavigationScreen: React.FC<Props> = ({ onOpenPinModal, onFinishRide }) => {
  const { currentRide } = useDriverStore();

  if (!currentRide) return null;

  const isEnRoute = currentRide.status === 'DRIVER_EN_ROUTE';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', backgroundColor: '#0B1026' }}>
      {/* Top Turn-by-Turn Instruction Banner */}
      <div style={{
        backgroundColor: '#0B1026',
        color: '#FFFFFF',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
        zIndex: 20,
      }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          backgroundColor: VoztriColors.brand.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          fontWeight: 800,
        }}>
          ➔
        </div>
        <div>
          <span style={{ fontSize: 13, color: '#C9B2FF', fontWeight: 600 }}>Em 250 metros</span>
          <div style={{ fontSize: 17, fontWeight: 700 }}>
            {isEnRoute ? 'Chegando ao ponto de embarque' : 'Vire à direita na Av. Brigadeiro Faria Lima'}
          </div>
        </div>
      </div>

      {/* Map Simulation with HUD */}
      <div style={{ flex: 1, position: 'relative', backgroundColor: '#131A3B' }}>
        {/* Speedometer Widget */}
        <div style={{
          position: 'absolute',
          top: 20,
          left: 20,
          backgroundColor: '#0B1026',
          border: '2px solid #6A00FF',
          borderRadius: 14,
          padding: '8px 14px',
          textAlign: 'center',
          color: '#FFFFFF',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        }}>
          <span style={{ fontSize: 24, fontWeight: 800, display: 'block' }}>48</span>
          <span style={{ fontSize: 10, color: '#C9B2FF', fontWeight: 600 }}>km/h</span>
        </div>

        {/* Floating Route Overview Pill */}
        <div style={{
          position: 'absolute',
          top: 20,
          right: 20,
          backgroundColor: '#0B1026',
          borderRadius: 999,
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: '#FFFFFF',
          border: '1px solid #202A5B',
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#00C853' }}>6 min</span>
          <span style={{ fontSize: 12, color: '#7B7489' }}>•</span>
          <span style={{ fontSize: 13, fontWeight: 600 }}>2.1 km</span>
        </div>
      </div>

      {/* Bottom Controls Sheet */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        boxShadow: '0 -8px 30px rgba(0,0,0,0.2)',
      }}>
        {/* Passenger Profile Summary */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 999,
              backgroundColor: '#ECECFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              color: VoztriColors.brand.primary,
            }}>
              BL
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#151A31' }}>Beatriz Lima</div>
              <span style={{ fontSize: 12, color: '#7B7489' }}>★ 4.95 • Pagamento via Pix</span>
            </div>
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, color: VoztriColors.brand.primary }}>
            R$ 24,50
          </span>
        </div>

        {/* Action Button depending on state */}
        {isEnRoute ? (
          <button
            onClick={onOpenPinModal}
            style={{
              width: '100%',
              padding: 16,
              borderRadius: 14,
              backgroundColor: VoztriColors.brand.primary,
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 800,
              fontSize: 16,
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(106, 0, 255, 0.35)',
            }}
          >
            VALIDAR PIN DE EMBARQUE (1234)
          </button>
        ) : (
          <button
            onClick={onFinishRide}
            style={{
              width: '100%',
              padding: 16,
              borderRadius: 14,
              backgroundColor: '#00C853',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 800,
              fontSize: 16,
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(0, 200, 83, 0.35)',
            }}
          >
            FINALIZAR CORRIDA
          </button>
        )}
      </div>
    </div>
  );
};

