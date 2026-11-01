import React, { useState } from 'react';
import { VoztriColors } from '@voztri/design-tokens';

interface Props {
  onBack: () => void;
}

export const PixPayoutScreen: React.FC<Props> = ({ onBack }) => {
  const [transferred, setTransferred] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#FBF8FF' }}>
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
        <span style={{ fontSize: 16, fontWeight: 800, color: '#151A31' }}>Repasse Instantâneo Pix</span>
        <div style={{ width: 40 }} />
      </div>

      <div style={{ padding: 20, flex: 1, overflowY: 'auto' }}>
        {/* Available Balance Box */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          padding: 24,
          marginBottom: 16,
          boxShadow: '0 8px 24px rgba(106, 0, 255, 0.06)',
          textAlign: 'center',
        }}>
          <span style={{ fontSize: 13, color: '#7B7489', fontWeight: 600 }}>Saldo Disponível para Saque</span>
          <div style={{ fontSize: 36, fontWeight: 800, color: '#151A31', margin: '8px 0' }}>
            {transferred ? 'R$ 0,00' : 'R$ 642,50'}
          </div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            backgroundColor: '#F3F2FF',
            padding: '6px 14px',
            borderRadius: 999,
            color: VoztriColors.brand.primary,
            fontWeight: 700,
            fontSize: 12,
          }}>
            <span>Chave Pix:</span> carlos.motorista@voztri.com.br
          </div>
        </div>

        {transferred ? (
          <div style={{
            backgroundColor: '#E8F5E9',
            borderRadius: 16,
            padding: 20,
            textAlign: 'center',
            border: '1px solid #A5D6A7',
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
            <h4 style={{ margin: '0 0 6px', color: '#1B5E20', fontSize: 16, fontWeight: 800 }}>
              Transferência Pix Enviada!
            </h4>
            <p style={{ margin: 0, fontSize: 13, color: '#2E7D32' }}>
              O valor de R$ 642,50 foi transferido para sua conta bancária sem taxas.
            </p>
          </div>
        ) : (
          <button
            onClick={() => setTransferred(true)}
            style={{
              width: '100%',
              padding: '16px',
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
            TRANSFERIR AGORA VIA PIX
          </button>
        )}
      </div>
    </div>
  );
};
