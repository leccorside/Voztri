import React, { useState } from 'react';
import { VoztriColors } from '@voztri/design-tokens';

export const LiveMapScreen: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const mockDrivers = [
    { id: '1', name: 'Carlos Eduardo Silva', plate: 'VOZ2026', vehicle: 'Toyota Corolla', category: 'pop', status: 'online', lat: -23.550520, lng: -46.633308 },
    { id: '2', name: 'Mariana Santos', plate: 'BRA4F18', vehicle: 'Hyundai HB20', category: 'mulher', status: 'in_ride', lat: -23.561414, lng: -46.655881 },
    { id: '3', name: 'Rodrigo Albuquerque', plate: 'SPX9912', vehicle: 'Jeep Compass', category: 'black', status: 'online', lat: -23.585721, lng: -46.679199 },
    { id: '4', name: 'Lucas Ferreira', plate: 'MOT1102', vehicle: 'Honda CG 160', category: 'moto', status: 'online', lat: -23.543201, lng: -46.629100 },
  ];

  const filtered = selectedCategory === 'all' ? mockDrivers : mockDrivers.filter((d) => d.category === selectedCategory);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%' }}>
      {/* Map Canvas */}
      <div style={{ flex: 1, position: 'relative', backgroundColor: '#0B1026', overflow: 'hidden' }}>
        {/* Dark Map Simulation */}
        <div style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#0E142F',
          backgroundImage: 'radial-gradient(#19224A 1.5px, transparent 1.5px)',
          backgroundSize: '24px 24px',
          position: 'relative',
        }}>
          {filtered.map((driver) => (
            <div
              key={driver.id}
              style={{
                position: 'absolute',
                top: `${40 + (driver.lat + 23.55) * 800}%`,
                left: `${50 + (driver.lng + 46.65) * 800}%`,
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
              }}
            >
              <div style={{
                width: 38,
                height: 38,
                borderRadius: 999,
                backgroundColor: driver.status === 'in_ride' ? '#9546F9' : '#00C853',
                boxShadow: '0 0 16px rgba(0, 200, 83, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontSize: 18,
              }}>
                🚗
              </div>
              <div style={{
                backgroundColor: '#0B1026',
                color: '#FFFFFF',
                padding: '2px 8px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                marginTop: 4,
                whiteSpace: 'nowrap',
                border: '1px solid #19224A',
              }}>
                {driver.name.split(' ')[0]} • {driver.plate}
              </div>
            </div>
          ))}
        </div>

        {/* Floating Category Filter */}
        <div style={{
          position: 'absolute',
          top: 24,
          left: 24,
          display: 'flex',
          gap: 8,
          backgroundColor: 'rgba(11, 16, 38, 0.85)',
          backdropFilter: 'blur(10px)',
          padding: 8,
          borderRadius: 14,
          border: '1px solid #19224A',
        }}>
          {['all', 'pop', 'black', 'mulher', 'moto'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '8px 14px',
                borderRadius: 10,
                border: 'none',
                backgroundColor: selectedCategory === cat ? VoztriColors.brand.primary : 'transparent',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
            >
              {cat === 'all' ? 'Todos' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Right Details Panel */}
      <div style={{
        width: 360,
        backgroundColor: '#FFFFFF',
        borderLeft: '1px solid #ECECFF',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ padding: 24, borderBottom: '1px solid #ECECFF' }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#151A31', margin: '0 0 4px' }}>
            Operações ao Vivo
          </h2>
          <span style={{ fontSize: 13, color: '#7B7489' }}>
            {filtered.length} motoristas visíveis no radar
          </span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((driver) => (
            <div
              key={driver.id}
              style={{
                padding: 14,
                borderRadius: 14,
                border: '1px solid #ECECFF',
                backgroundColor: '#F8F9FE',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#151A31' }}>{driver.name}</span>
                <span style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: 4,
                  backgroundColor: driver.status === 'in_ride' ? '#EDDCFF' : '#E8F5E9',
                  color: driver.status === 'in_ride' ? '#6200BC' : '#1B5E20',
                  textTransform: 'uppercase',
                }}>
                  {driver.status === 'in_ride' ? 'Em Corrida' : 'Disponível'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#7B7489' }}>
                {driver.vehicle} • <strong style={{ color: '#151A31' }}>{driver.plate}</strong>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
