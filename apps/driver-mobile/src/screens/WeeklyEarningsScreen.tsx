import React from 'react';
import { VoztriColors } from '@voztri/design-tokens';

interface Props {
  onBack: () => void;
  onOpenPayout: () => void;
}

export const WeeklyEarningsScreen: React.FC<Props> = ({ onBack, onOpenPayout }) => {
  const days = [
    { day: 'Seg', amount: 180, height: 60 },
    { day: 'Ter', amount: 220, height: 75 },
    { day: 'Qua', amount: 195, height: 65 },
    { day: 'Qui', amount: 310, height: 100 },
    { day: 'Sex', amount: 280, height: 90 },
    { day: 'Sáb', amount: 340, height: 110 },
    { day: 'Dom', amount: 248, height: 80, isToday: true },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#FBF8FF' }}>
      {/* Header */}
      <div style={{
        height: 60,
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #ECECFF',
      }}>
        <button onClick={onBack} style={{ border: 'none', background: 'none', fontSize: 18, cursor: 'pointer', fontWeight: 700 }}>
          ← Voltar
        </button>
        <span style={{ fontSize: 16, fontWeight: 800, color: '#151A31' }}>Ganhos da Semana</span>
        <div style={{ width: 40 }} />
      </div>

      <div style={{ padding: 20, flex: 1, overflowY: 'auto' }}>
        {/* Total Weekly Card */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          padding: 20,
          marginBottom: 16,
          boxShadow: '0 8px 24px rgba(106, 0, 255, 0.06)',
          textAlign: 'center',
        }}>
          <span style={{ fontSize: 12, color: '#7B7489', fontWeight: 700, textTransform: 'uppercase' }}>
            Semana Atual (27 Out - 02 Nov)
          </span>
          <div style={{ fontSize: 36, fontWeight: 800, color: VoztriColors.brand.primary, margin: '6px 0' }}>
            R$ 1.773,00
          </div>
          <span style={{ fontSize: 13, color: '#00C853', fontWeight: 700 }}>
            ▲ 14% a mais que a semana anterior
          </span>

          <div style={{ marginTop: 16 }}>
            <button
              onClick={onOpenPayout}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 14,
                backgroundColor: VoztriColors.brand.primary,
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 800,
                fontSize: 15,
                cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(106, 0, 255, 0.3)',
              }}
            >
              Transferir Saldo via Pix
            </button>
          </div>
        </div>

        {/* Weekly Bar Chart */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          padding: 20,
          marginBottom: 16,
          boxShadow: '0 8px 24px rgba(106, 0, 255, 0.06)',
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 20px', color: '#151A31' }}>Ganhos Diários</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 140, paddingBottom: 10 }}>
            {days.map((d, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: d.isToday ? VoztriColors.brand.primary : '#7B7489' }}>
                  {d.amount}
                </span>
                <div style={{
                  width: 28,
                  height: d.height,
                  borderRadius: 6,
                  backgroundColor: d.isToday ? VoztriColors.brand.primary : '#E5E7FF',
                }} />
                <span style={{ fontSize: 11, fontWeight: d.isToday ? 800 : 600, color: d.isToday ? '#151A31' : '#7B7489' }}>
                  {d.day}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
