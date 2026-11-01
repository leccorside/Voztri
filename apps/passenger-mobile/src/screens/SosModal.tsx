import React, { useState } from 'react';
import { usePassengerStore } from '../store/passengerStore.js';

interface Props {
  onClose: () => void;
}

export const SosModal: React.FC<Props> = ({ onClose }) => {
  const { isSosActive, triggerSos, cancelSos } = usePassengerStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleCancelSos = () => {
    if (cancelSos(pin)) {
      onClose();
    } else {
      setError(true);
    }
  };

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
        boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.3)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: '#FFDAD6',
              color: '#BA1A1A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 18,
            }}>
              🚨
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#BA1A1A', margin: 0 }}>
              Central de Emergência SOS 24h
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ border: 'none', background: 'none', color: '#7B7489', fontSize: 18, cursor: 'pointer', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>

        {!isSosActive ? (
          <div>
            <p style={{ fontSize: 13, color: '#494457', lineHeight: 1.5, marginBottom: 20 }}>
              Ao acionar o SOS, nossa central operacional 24h receberá imediatamente seus dados, o áudio ambiente da corrida e a localização GPS em tempo real, alertando também seus contatos de confiança cadastrados.
            </p>

            <button
              onClick={triggerSos}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: 14,
                backgroundColor: '#BA1A1A',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 800,
                fontSize: 16,
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(186, 26, 26, 0.4)',
                marginBottom: 10,
              }}
            >
              ACIONAR SOS IMEDIATAMENTE
            </button>
          </div>
        ) : (
          <div>
            <div style={{
              backgroundColor: '#FFDAD6',
              borderRadius: 14,
              padding: '12px 16px',
              color: '#93000A',
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 16,
              textAlign: 'center',
            }}>
              ⚠️ O ALERTA SOS ESTÁ ATIVO! Nossa equipe está monitorando esta corrida.
            </div>

            <p style={{ fontSize: 13, color: '#494457', marginBottom: 12 }}>
              Para desativar o alerta, digite seu PIN de emergência (Padrão: 1234):
            </p>

            <input
              type="password"
              maxLength={4}
              placeholder="Digite o PIN (1234)"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError(false);
              }}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '14px',
                borderRadius: 12,
                border: error ? '2px solid #BA1A1A' : '1px solid #ECECFF',
                fontSize: 18,
                textAlign: 'center',
                letterSpacing: '0.2em',
                marginBottom: 14,
                outline: 'none',
              }}
            />

            {error && (
              <span style={{ display: 'block', color: '#BA1A1A', fontSize: 12, fontWeight: 700, textAlign: 'center', marginBottom: 10 }}>
                PIN incorreto! Verifique e tente novamente.
              </span>
            )}

            <button
              onClick={handleCancelSos}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 14,
                backgroundColor: '#151A31',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 800,
                fontSize: 15,
                cursor: 'pointer',
              }}
            >
              Desativar Alerta com PIN
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

