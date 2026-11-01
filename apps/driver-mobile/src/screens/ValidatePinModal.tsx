import React, { useState } from 'react';
import { VoztriColors } from '@voztri/design-tokens';

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

export const ValidatePinModal: React.FC<Props> = ({ onSuccess, onCancel }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handlePress = (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(false);

      if (nextPin.length === 4) {
        if (nextPin === '1234') {
          setTimeout(onSuccess, 300);
        } else {
          setError(true);
        }
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(11, 16, 38, 0.8)',
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
        boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.3)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#151A31', margin: 0 }}>
            Validar PIN de Embarque
          </h2>
          <button
            onClick={onCancel}
            style={{ border: 'none', background: 'none', color: '#7B7489', fontSize: 18, cursor: 'pointer', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: 13, color: '#7B7489', marginBottom: 20 }}>
          Solicite ao passageiro o código de 4 dígitos informado no aplicativo dele.
        </p>

        {/* PIN Boxes Display */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
          {[0, 1, 2, 3].map((index) => {
            const digit = pin[index] || '';
            return (
              <div
                key={index}
                style={{
                  width: 56,
                  height: 64,
                  borderRadius: 14,
                  border: error ? '2px solid #BA1A1A' : digit ? `2px solid ${VoztriColors.brand.primary}` : '2px solid #E5E7FF',
                  backgroundColor: '#F8F9FE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 28,
                  fontWeight: 800,
                  color: error ? '#BA1A1A' : '#151A31',
                }}
              >
                {digit}
              </div>
            );
          })}
        </div>

        {error && (
          <p style={{ textAlign: 'center', color: '#BA1A1A', fontSize: 13, fontWeight: 700, margin: '-10px 0 16px' }}>
            PIN inválido! Tente novamente (Dica de teste: 1234)
          </p>
        )}

        {/* Numeric Keypad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((key, i) => {
            if (key === '') return <div key={i} />;
            return (
              <button
                key={i}
                onClick={() => (key === '⌫' ? handleDelete() : handlePress(key))}
                style={{
                  height: 56,
                  borderRadius: 14,
                  border: '1px solid #ECECFF',
                  backgroundColor: '#FFFFFF',
                  fontSize: 22,
                  fontWeight: 700,
                  color: '#151A31',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(11, 16, 38, 0.04)',
                }}
              >
                {key}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
