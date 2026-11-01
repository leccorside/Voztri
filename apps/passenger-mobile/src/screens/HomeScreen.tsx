import React from 'react';
import { VoztriColors } from '@voztri/design-tokens';

interface Props {
  onOpenSearch: () => void;
}

export const HomeScreen: React.FC<Props> = ({ onOpenSearch }) => {
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
        boxShadow: '0 2px 8px rgba(11, 16, 38, 0.04)',
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
            <span style={{ fontSize: 11, fontWeight: 800, color: VoztriColors.brand.primary, letterSpacing: '0.05em' }}>VOZTRI</span>
            <h1 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: '#151A31' }}>Início</h1>
          </div>
        </div>

        <div style={{
          width: 38,
          height: 38,
          borderRadius: 999,
          backgroundColor: '#F3F2FF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: VoztriColors.brand.primary,
          fontWeight: 700,
        }}>
          BL
        </div>
      </header>

      {/* Map Simulation Canvas */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#EAEFF8',
          backgroundImage: 'radial-gradient(#D3DCEE 1.5px, transparent 1.5px)',
          backgroundSize: '24px 24px',
          position: 'relative',
        }}>
          {/* Passenger Node */}
          <div style={{
            position: 'absolute',
            top: '42%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 999,
              backgroundColor: 'rgba(106, 0, 255, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{
                width: 20,
                height: 20,
                borderRadius: 999,
                backgroundColor: VoztriColors.brand.primary,
                border: '3px solid #FFFFFF',
                boxShadow: '0 4px 10px rgba(106, 0, 255, 0.4)',
              }} />
            </div>
            <span style={{
              marginTop: 4,
              backgroundColor: '#0B1026',
              color: '#FFFFFF',
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 6,
            }}>
              Você está aqui
            </span>
          </div>

          {/* Nearby Vehicle 1 (Car - 2 min) */}
          <div style={{ position: 'absolute', top: '30%', left: '28%', textAlign: 'center' }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              backgroundColor: '#FFFFFF',
              boxShadow: '0 4px 10px rgba(11, 16, 38, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
            }}>
              🚗
            </div>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#22005D', backgroundColor: '#E9DDFF', padding: '1px 5px', borderRadius: 4 }}>
              2 min
            </span>
          </div>

          {/* Nearby Vehicle 2 (Moto - 1 min) */}
          <div style={{ position: 'absolute', top: '34%', right: '24%', textAlign: 'center' }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              backgroundColor: '#FFFFFF',
              boxShadow: '0 4px 10px rgba(11, 16, 38, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
            }}>
              🛵
            </div>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#22005D', backgroundColor: '#E9DDFF', padding: '1px 5px', borderRadius: 4 }}>
              1 min
            </span>
          </div>
        </div>

        {/* Floating Search Prompt Card */}
        <div style={{
          position: 'absolute',
          bottom: 20,
          left: 16,
          right: 16,
          backgroundColor: '#FFFFFF',
          borderRadius: 24,
          padding: 20,
          boxShadow: '0 16px 40px rgba(11, 16, 38, 0.12)',
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#151A31', margin: '0 0 14px' }}>
            Para onde vamos hoje?
          </h2>

          <div
            onClick={onOpenSearch}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              backgroundColor: '#F4F6FA',
              borderRadius: 14,
              padding: '14px 16px',
              cursor: 'pointer',
              border: '1px solid #ECECFF',
            }}
          >
            <span style={{ fontSize: 18 }}>🔍</span>
            <span style={{ fontSize: 15, color: '#7B7489', fontWeight: 500 }}>
              Buscar endereço de destino...
            </span>
          </div>

          {/* Fast Shortcuts */}
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <div
              onClick={onOpenSearch}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 12,
                backgroundColor: '#F8F9FE',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 16 }}>🏠</span>
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#151A31', display: 'block' }}>Casa</span>
                <span style={{ fontSize: 10, color: '#7B7489' }}>Pinheiros</span>
              </div>
            </div>
            <div
              onClick={onOpenSearch}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 12,
                backgroundColor: '#F8F9FE',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 16 }}>💼</span>
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#151A31', display: 'block' }}>Trabalho</span>
                <span style={{ fontSize: 10, color: '#7B7489' }}>Itaim Bibi</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

