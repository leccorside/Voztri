import React, { useState } from 'react';
import { usePassengerStore } from '../store/passengerStore.js';
import { VoztriColors } from '@voztri/design-tokens';

interface Props {
  onFinish: () => void;
}

export const TripCompletedModal: React.FC<Props> = ({ onFinish }) => {
  const { activeRide } = usePassengerStore();
  const [rating, setRating] = useState(5);
  const [selectedTip, setSelectedTip] = useState<number | null>(null);

  const tips = [2, 5, 10];
  const tags = ['Direção Segura', 'Carro Limpo', 'Ótima Conversa', 'Música Boa'];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(11, 16, 38, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: '24px 20px',
        maxHeight: '90%',
        overflowY: 'auto',
        boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.3)',
      }}>
        {/* Top Success Badge */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 999,
            backgroundColor: '#E8F5E9',
            color: '#00C853',
            fontSize: 28,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 8,
          }}>
            ✓
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#151A31', margin: '0 0 4px' }}>
            Você chegou ao seu destino!
          </h2>
          <span style={{ fontSize: 13, color: '#7B7489' }}>
            Esperamos que tenha tido uma excelente viagem.
          </span>
        </div>

        {/* Receipt Box */}
        <div style={{
          backgroundColor: '#F8F9FE',
          borderRadius: 16,
          padding: 16,
          marginBottom: 20,
          border: '1px solid #ECECFF',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 14, color: '#7B7489' }}>Valor da Corrida</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#151A31' }}>R$ 24,50</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#7B7489' }}>Forma de Pagamento</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#00C853' }}>Pix Confirmado ✓</span>
          </div>
        </div>

        {/* Driver Star Rating */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#151A31', display: 'block', marginBottom: 8 }}>
            Como foi a viagem com {activeRide?.driver?.user?.name || 'Carlos'}?
          </span>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                onClick={() => setRating(star)}
                style={{
                  fontSize: 34,
                  cursor: 'pointer',
                  color: star <= rating ? '#FFAB00' : '#DDE1FF',
                  transition: 'transform 0.1s',
                }}
              >
                ★
              </span>
            ))}
          </div>
        </div>

        {/* Tip Selector */}
        <div style={{ marginBottom: 20 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#151A31', display: 'block', marginBottom: 8 }}>
            Adicionar gorjeta para o motorista (opcional):
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            {tips.map((amount) => {
              const isSelected = selectedTip === amount;
              return (
                <button
                  key={amount}
                  onClick={() => setSelectedTip(isSelected ? null : amount)}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    borderRadius: 12,
                    border: isSelected ? `2px solid ${VoztriColors.brand.primary}` : '1px solid #ECECFF',
                    backgroundColor: isSelected ? '#F3F2FF' : '#FFFFFF',
                    color: isSelected ? VoztriColors.brand.primary : '#151A31',
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  + R$ {amount},00
                </button>
              );
            })}
          </div>
        </div>

        {/* Compliment Tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
          {tags.map((tag, i) => (
            <span
              key={i}
              style={{
                padding: '6px 12px',
                borderRadius: 999,
                backgroundColor: '#F4F6FA',
                fontSize: 12,
                fontWeight: 600,
                color: '#494457',
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Submit Button */}
        <button
          onClick={onFinish}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: 14,
            backgroundColor: VoztriColors.brand.primary,
            color: '#FFFFFF',
            border: 'none',
            fontWeight: 800,
            fontSize: 16,
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(106, 0, 255, 0.4)',
          }}
        >
          CONCLUIR AVALIAÇÃO
        </button>
      </div>
    </div>
  );
};
