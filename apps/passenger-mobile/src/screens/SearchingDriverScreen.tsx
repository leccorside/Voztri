import React from 'react';
import { usePassengerStore } from '../store/passengerStore.js';
import { VoztriColors } from '@voztri/design-tokens';

interface Props {
  onCancel: () => void;
}

export const SearchingDriverScreen: React.FC<Props> = ({ onCancel }) => {
  const { activeRide } = usePassengerStore();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#0B1026',
      color: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '40px 20px 30px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Top Header */}
      <div style={{ textAlign: 'center', zIndex: 10 }}>
        <span style={{
          fontSize: 12,
          fontWeight: 800,
          color: '#C9B2FF',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          RADAR VOZTRI ATIVO
        </span>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: '8px 0 4px', color: '#FFFFFF' }}>
          Buscando o melhor motorista...
        </h2>
        <span style={{ fontSize: 13, color: '#A0A5BD' }}>
          Conectando com parceiros num raio de 2 a 5 km
        </span>
      </div>

      {/* Kinetic Pulsing Radar Simulation */}
      <div style={{ position: 'relative', width: 260, height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Outer Ring */}
        <div style={{
          position: 'absolute',
          width: 250,
          height: 250,
          borderRadius: 999,
          border: '1px solid rgba(106, 0, 255, 0.25)',
        }} />
        {/* Middle Ring */}
        <div style={{
          position: 'absolute',
          width: 170,
          height: 170,
          borderRadius: 999,
          border: '1px solid rgba(106, 0, 255, 0.45)',
        }} />
        {/* Inner Ring */}
        <div style={{
          position: 'absolute',
          width: 90,
          height: 90,
          borderRadius: 999,
          backgroundColor: 'rgba(106, 0, 255, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            width: 50,
            height: 50,
            borderRadius: 999,
            backgroundColor: VoztriColors.brand.primary,
            boxShadow: '0 0 30px rgba(106, 0, 255, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            fontWeight: 800,
          }}>
            V
          </div>
        </div>
      </div>

      {/* Ride Summary Card & Cancel Button */}
      <div style={{ width: '100%', zIndex: 10 }}>
        <div style={{
          backgroundColor: '#131A3B',
          borderRadius: 18,
          padding: 16,
          marginBottom: 16,
          border: '1px solid #202A5B',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF' }}>
                {activeRide?.origin.shortAddress} → {activeRide?.destination.shortAddress}
              </span>
              <span style={{ fontSize: 12, color: '#A0A5BD', display: 'block', marginTop: 2 }}>
                VozTri Pop • Pagamento via Pix
              </span>
            </div>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#C9B2FF' }}>
              R$ 24,50
            </span>
          </div>
        </div>

        <button
          onClick={onCancel}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: 14,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: '#FFFFFF',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            fontWeight: 700,
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          Cancelar Busca
        </button>
      </div>
    </div>
  );
};

