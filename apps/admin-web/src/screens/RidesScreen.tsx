import React from 'react';
import { VoztriColors } from '@voztri/design-tokens';

export const RidesScreen: React.FC = () => {
  const rides = [
    {
      id: 'ride-901',
      passenger: 'Beatriz Lima',
      driver: 'Carlos Eduardo Silva',
      route: 'Av. Paulista, 1578 → Av. Faria Lima, 3477',
      category: 'Pop',
      price: 'R$ 24,50',
      status: 'Concluída',
      payment: 'Pix',
      date: 'Hoje, 11:24',
    },
    {
      id: 'ride-900',
      passenger: 'Marcos Vinicius',
      driver: 'Mariana Santos',
      route: 'Shopping Morumbi → Aeroporto Congonhas',
      category: 'Mulher',
      price: 'R$ 32,00',
      status: 'Concluída',
      payment: 'Cartão',
      date: 'Hoje, 10:45',
    },
    {
      id: 'ride-899',
      passenger: 'Fernanda Rocha',
      driver: 'Rodrigo Albuquerque',
      route: 'Vila Olímpia → Jardins',
      category: 'Black',
      price: 'R$ 48,00',
      status: 'Concluída',
      payment: 'Pix',
      date: 'Hoje, 09:18',
    },
  ];

  return (
    <div style={{ padding: 32, overflowY: 'auto', height: '100vh', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#151A31', margin: '0 0 6px' }}>
          Histórico e Monitoramento de Corridas
        </h1>
        <p style={{ fontSize: 14, color: '#7B7489', margin: 0 }}>
          Rastreabilidade completa, recibos fiscais, métodos de pagamento e tempo de trajeto.
        </p>
      </div>

      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        boxShadow: '0 4px 16px rgba(11, 16, 38, 0.05)',
        border: '1px solid #ECECFF',
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#F8F9FE', borderBottom: '1px solid #ECECFF' }}>
              <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 800, color: '#7B7489', textTransform: 'uppercase' }}>Corrida ID</th>
              <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 800, color: '#7B7489', textTransform: 'uppercase' }}>Passageiro</th>
              <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 800, color: '#7B7489', textTransform: 'uppercase' }}>Motorista</th>
              <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 800, color: '#7B7489', textTransform: 'uppercase' }}>Trajeto</th>
              <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 800, color: '#7B7489', textTransform: 'uppercase' }}>Valor</th>
              <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 800, color: '#7B7489', textTransform: 'uppercase' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rides.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #ECECFF' }}>
                <td style={{ padding: '16px 20px', fontSize: 13, fontWeight: 700, color: VoztriColors.brand.primary }}>
                  {r.id}
                </td>
                <td style={{ padding: '16px 20px', fontSize: 14, fontWeight: 600 }}>{r.passenger}</td>
                <td style={{ padding: '16px 20px', fontSize: 14, fontWeight: 600 }}>{r.driver}</td>
                <td style={{ padding: '16px 20px', fontSize: 13, color: '#494457' }}>{r.route}</td>
                <td style={{ padding: '16px 20px', fontSize: 14, fontWeight: 800, color: '#151A31' }}>
                  {r.price}
                </td>
                <td style={{ padding: '16px 20px' }}>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '4px 8px',
                    borderRadius: 6,
                    backgroundColor: '#E8F5E9',
                    color: '#1B5E20',
                    textTransform: 'uppercase',
                  }}>
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

