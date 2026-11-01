import React from 'react';
import { usePassengerStore } from '../store/passengerStore.js';
import { VoztriColors } from '@voztri/design-tokens';

interface Props {
  onBack: () => void;
  onConfirm: () => void;
}

export const CategorySelectionSheet: React.FC<Props> = ({ onBack, onConfirm }) => {
  const { destination, estimates, selectedCategory, selectCategory, selectedPaymentMethod, selectPaymentMethod } = usePassengerStore();

  const currentEstimate = estimates.find((e) => e.category === selectedCategory) || estimates[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#FFFFFF', position: 'relative' }}>
      {/* Route Header */}
      <div style={{
        height: 60,
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #ECECFF',
      }}>
        <button onClick={onBack} style={{ border: 'none', background: 'none', fontSize: 18, cursor: 'pointer', fontWeight: 700 }}>
          ← Alterar Destino
        </button>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#151A31' }}>
          {destination?.shortAddress}
        </span>
        <div style={{ width: 40 }} />
      </div>

      {/* Mini Route Map Preview Bar */}
      <div style={{ backgroundColor: '#F8F9FE', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: '#7B7489', fontWeight: 600 }}>
          Distância: <strong style={{ color: '#151A31' }}>6.8 km</strong>
        </span>
        <span style={{ fontSize: 12, color: '#7B7489', fontWeight: 600 }}>
          Previsão: <strong style={{ color: '#00C853' }}>~14 minutos</strong>
        </span>
      </div>

      {/* Categories List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {estimates.map((item) => {
          const isSelected = item.category === selectedCategory;
          return (
            <div
              key={item.category}
              onClick={() => selectCategory(item.category as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: 16,
                marginBottom: 10,
                border: isSelected ? `2px solid ${VoztriColors.brand.primary}` : '1px solid #ECECFF',
                backgroundColor: isSelected ? '#F8F4FF' : '#FFFFFF',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: isSelected ? VoztriColors.brand.primary : '#F3F2FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                }}>
                  {item.category === 'pop' ? '🚗' : item.category === 'black' ? '🚘' : item.category === 'mulher' ? '🌸' : '🛵'}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#151A31' }}>{item.categoryName}</span>
                    <span style={{ fontSize: 11, color: '#7B7489' }}>• {item.estimatedMinutes} min</span>
                  </div>
                  <span style={{ fontSize: 12, color: '#7B7489' }}>{item.description}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 17, fontWeight: 800, color: isSelected ? VoztriColors.brand.primary : '#151A31' }}>
                  {item.formattedPrice}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Payment Method Selector & Confirm Button */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid #ECECFF', backgroundColor: '#FFFFFF' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#7B7489', textTransform: 'uppercase' }}>
            Forma de Pagamento
          </span>
          <select
            value={selectedPaymentMethod}
            onChange={(e) => selectPaymentMethod(e.target.value as any)}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #ECECFF',
              backgroundColor: '#F8F9FE',
              fontSize: 13,
              fontWeight: 700,
              color: '#151A31',
              outline: 'none',
            }}
          >
            <option value="pix">Pix Dinâmico (Instantâneo)</option>
            <option value="credit_card">Cartão Mastercard (•••• 8492)</option>
            <option value="cash">Dinheiro em espécie</option>
            <option value="wallet">Saldo Carteira (R$ 50,00)</option>
          </select>
        </div>

        <button
          onClick={onConfirm}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: 16,
            backgroundColor: VoztriColors.brand.primary,
            color: '#FFFFFF',
            border: 'none',
            fontWeight: 800,
            fontSize: 16,
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(106, 0, 255, 0.4)',
          }}
        >
          SOLICITAR {currentEstimate?.categoryName.toUpperCase()} • {currentEstimate?.formattedPrice}
        </button>
      </div>
    </div>
  );
};

