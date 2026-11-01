import React, { useState } from 'react';
import { usePassengerStore } from '../store/passengerStore.js';
import { VoztriColors } from '@voztri/design-tokens';
import { AddressLocation } from '@voztri/shared-types';

interface Props {
  onBack: () => void;
}

export const ChooseDestinationScreen: React.FC<Props> = ({ onBack }) => {
  const { origin, setDestination } = usePassengerStore();
  const [query, setQuery] = useState('');

  const sampleDestinations: AddressLocation[] = [
    {
      address: 'Av. Brigadeiro Faria Lima, 3477 - Itaim Bibi, São Paulo - SP',
      shortAddress: 'Av. Faria Lima, 3477',
      latitude: -23.585721,
      longitude: -46.679199,
      city: 'São Paulo',
      state: 'SP',
    },
    {
      address: 'Aeroporto de Congonhas - Vila Congonhas, São Paulo - SP',
      shortAddress: 'Aeroporto de Congonhas',
      latitude: -23.626110,
      longitude: -46.656387,
      city: 'São Paulo',
      state: 'SP',
    },
    {
      address: 'Shopping Morumbi - Av. Roque Petroni Júnior, 1089',
      shortAddress: 'Morumbi Shopping',
      latitude: -23.622591,
      longitude: -46.698971,
      city: 'São Paulo',
      state: 'SP',
    },
    {
      address: 'Parque Ibirapuera - Av. Pedro Álvares Cabral - Moema',
      shortAddress: 'Parque Ibirapuera (Portão 3)',
      latitude: -23.587416,
      longitude: -46.657634,
      city: 'São Paulo',
      state: 'SP',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#FFFFFF' }}>
      {/* Top Header */}
      <div style={{
        height: 60,
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        borderBottom: '1px solid #ECECFF',
      }}>
        <button onClick={onBack} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', fontWeight: 700 }}>
          ←
        </button>
        <span style={{ fontSize: 16, fontWeight: 800, color: '#151A31' }}>Para onde você vai?</span>
      </div>

      {/* Input Route Fields */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #F4F6FA', backgroundColor: '#FBF8FF' }}>
        {/* Origin */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: '#00C853' }} />
          <div style={{ flex: 1, backgroundColor: '#ECECFF', padding: '10px 14px', borderRadius: 10, fontSize: 13, color: '#151A31', fontWeight: 600 }}>
            {origin.shortAddress} (Sua Localização)
          </div>
        </div>

        {/* Destination */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: VoztriColors.brand.primary }} />
          <input
            type="text"
            placeholder="Digite o destino ou selecione abaixo..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            style={{
              flex: 1,
              padding: '12px 14px',
              borderRadius: 10,
              border: `2px solid ${VoztriColors.brand.primary}`,
              fontSize: 14,
              fontWeight: 600,
              outline: 'none',
              backgroundColor: '#FFFFFF',
            }}
          />
        </div>
      </div>

      {/* Suggestions List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 20px' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#7B7489', textTransform: 'uppercase', display: 'block', margin: '10px 0' }}>
          Destinos Recomendados
        </span>

        {sampleDestinations.map((dest, i) => (
          <div
            key={i}
            onClick={() => setDestination(dest)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 0',
              borderBottom: '1px solid #F4F6FA',
              cursor: 'pointer',
            }}
          >
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              backgroundColor: '#F3F2FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: VoztriColors.brand.primary,
              fontSize: 18,
            }}>
              📍
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#151A31', display: 'block' }}>
                {dest.shortAddress}
              </span>
              <span style={{ fontSize: 12, color: '#7B7489' }}>
                {dest.address}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
