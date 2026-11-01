import React, { useEffect, useState } from 'react';
import { VoztriColors } from '@voztri/design-tokens';

interface Props {
  offer: {
    rideId: string;
    pickupAddress: string;
    dropoffAddress: string;
    distanceKm: number;
    durationMinutes: number;
    earningsCents: number;
    timeoutSeconds: number;
    category: string;
  };
  onAccept: () => void;
  onReject: () => void;
}

export const RideOfferModal: React.FC<Props> = ({ offer, onAccept, onReject }) => {
  const [secondsLeft, setSecondsLeft] = useState(offer.timeoutSeconds);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onReject();
      return;
    }
    const timer = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft, onReject]);

  const progressPercent = (secondsLeft / offer.timeoutSeconds) * 100;
  const earningsFormatted = (offer.earningsCents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(11, 16, 38, 0.75)',
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
        boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.25)',
      }}>
        {/* Progress Bar Timer */}
        <div style={{
          width: '100%',
          height: 6,
          backgroundColor: '#ECECFF',
          borderRadius: 999,
          overflow: 'hidden',
          marginBottom: 16,
        }}>
          <div style={{
            width: `${progressPercent}%`,
            height: '100%',
            backgroundColor: VoztriColors.brand.primary,
            transition: 'width 1s linear',
          }} />
        </div>

        {/* Top Info: Category Badge & Timeout Counter */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{
            backgroundColor: '#E9DDFF',
            color: '#22005D',
            padding: '4px 10px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 800,
            textTransform: 'uppercase',
          }}>
            {offer.category.toUpperCase()} • VOZTRI
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#FF3B30' }}>
            Expira em {secondsLeft}s
          </span>
        </div>

        {/* Large Earnings Display */}
        <div style={{ textAlign: 'center', margin: '14px 0' }}>
          <span style={{ fontSize: 13, color: '#7B7489', fontWeight: 600 }}>Seu Ganho Líquido</span>
          <div style={{ fontSize: 38, fontWeight: 800, color: '#151A31', letterSpacing: '-0.02em' }}>
            {earningsFormatted}
          </div>
          <span style={{ fontSize: 12, color: '#00C853', fontWeight: 700 }}>
            {offer.distanceKm} km • ~{offer.durationMinutes} min de viagem
          </span>
        </div>

        {/* Route Details Box */}
        <div style={{
          backgroundColor: '#F8F9FE',
          borderRadius: 16,
          padding: 14,
          marginBottom: 20,
          border: '1px solid #E5E7FF',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: '#00C853', marginTop: 4 }} />
            <div>
              <span style={{ fontSize: 11, color: '#7B7489', fontWeight: 700, textTransform: 'uppercase' }}>Embarque</span>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#151A31' }}>{offer.pickupAddress}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: VoztriColors.brand.primary, marginTop: 4 }} />
            <div>
              <span style={{ fontSize: 11, color: '#7B7489', fontWeight: 700, textTransform: 'uppercase' }}>Desembarque</span>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#151A31' }}>{offer.dropoffAddress}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons: Reject & Accept */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
          <button
            onClick={onReject}
            style={{
              padding: '16px',
              borderRadius: 14,
              border: '2px solid #E5E7FF',
              backgroundColor: '#FFFFFF',
              color: '#7B7489',
              fontWeight: 700,
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            Recusar
          </button>
          <button
            onClick={onAccept}
            style={{
              padding: '16px',
              borderRadius: 14,
              border: 'none',
              backgroundColor: VoztriColors.brand.primary,
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: 16,
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(106, 0, 255, 0.4)',
            }}
          >
            ACEITAR CORRIDA
          </button>
        </div>
      </div>
    </div>
  );
};

