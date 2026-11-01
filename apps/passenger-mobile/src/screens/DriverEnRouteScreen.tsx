import React from 'react';
import { usePassengerStore } from '../store/passengerStore.js';
import { VoztriColors } from '@voztri/design-tokens';

interface Props {
  onOpenChat: () => void;
  onOpenSos: () => void;
  onSimulateBoarding: () => void;
}

export const DriverEnRouteScreen: React.FC<Props> = ({ onOpenChat, onOpenSos, onSimulateBoarding }) => {
  const { activeRide } = usePassengerStore();

  const driver = activeRide?.driver;
  const vehicle = driver?.activeVehicle;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#FBF8FF' }}>
      {/* Top Map Simulation */}
      <div style={{ flex: 1, position: 'relative', backgroundColor: '#EAEFF8' }}>
        {/* Arrival ETA Pill */}
        <div style={{
          position: 'absolute',
          top: 16,
          left: 16,
          right: 16,
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 8px 24px rgba(11, 16, 38, 0.08)',
        }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#00C853', textTransform: 'uppercase' }}>
              Motorista a caminho
            </span>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#151A31' }}>
              Chegando em ~3 minutos
            </div>
          </div>
          <button
            onClick={onOpenSos}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: '#BA1A1A',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: 12,
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(186, 26, 26, 0.3)',
            }}
          >
            SOS 24h
          </button>
        </div>

        {/* Center Vehicle Pin on Map */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
        }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 999,
            backgroundColor: VoztriColors.brand.primary,
            boxShadow: '0 4px 14px rgba(106, 0, 255, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
          }}>
            🚗
          </div>
          <span style={{
            backgroundColor: '#0B1026',
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: 4,
            marginTop: 4,
            display: 'inline-block',
          }}>
            VOZ2026
          </span>
        </div>
      </div>

      {/* Bottom Driver Details Sheet */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: '20px 20px 24px',
        boxShadow: '0 -8px 30px rgba(11, 16, 38, 0.08)',
      }}>
        {/* PIN de Embarque em Alta Visibilidade */}
        <div style={{
          backgroundColor: '#F3F2FF',
          border: '2px dashed #6A00FF',
          borderRadius: 14,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#4F00C3', textTransform: 'uppercase' }}>
              Código de Embarque (Informe ao motorista)
            </span>
            <div style={{ fontSize: 13, color: '#494457' }}>
              Diga o PIN ao entrar no carro
            </div>
          </div>
          <div style={{
            fontSize: 28,
            fontWeight: 800,
            color: VoztriColors.brand.primary,
            letterSpacing: '0.1em',
          }}>
            1234
          </div>
        </div>

        {/* Driver Profile & Vehicle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 50,
              height: 50,
              borderRadius: 999,
              backgroundColor: '#ECECFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              color: VoztriColors.brand.primary,
              fontSize: 18,
            }}>
              CS
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#151A31' }}>
                {driver?.user?.name || 'Carlos Eduardo Silva'}
              </div>
              <span style={{ fontSize: 12, color: '#7B7489' }}>
                ★ 4.98 • 1.420 viagens
              </span>
            </div>
          </div>

          {/* Vehicle Plate Badge */}
          <div style={{ textAlign: 'right' }}>
            <div style={{
              backgroundColor: '#F4F6FA',
              border: '1px solid #CBC3DA',
              borderRadius: 6,
              padding: '2px 8px',
              fontWeight: 800,
              fontSize: 13,
              color: '#151A31',
              display: 'inline-block',
            }}>
              {vehicle?.plate || 'VOZ2026'}
            </div>
            <div style={{ fontSize: 11, color: '#7B7489', marginTop: 2 }}>
              {vehicle?.brand} {vehicle?.model}
            </div>
          </div>
        </div>

        {/* Actions Grid: Chat, Call, Simulate */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <button
            onClick={onOpenChat}
            style={{
              padding: '12px',
              borderRadius: 12,
              border: '1px solid #ECECFF',
              backgroundColor: '#FBF8FF',
              color: VoztriColors.brand.primary,
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            💬 Mensagem (Chat)
          </button>
          <button
            onClick={onSimulateBoarding}
            style={{
              padding: '12px',
              borderRadius: 12,
              border: 'none',
              backgroundColor: VoztriColors.brand.primary,
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(106, 0, 255, 0.3)',
            }}
          >
            Concluir Viagem (Demo)
          </button>
        </div>
      </div>
    </div>
  );
};

