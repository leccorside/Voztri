import React, { useState } from 'react';
import { VoztriColors } from '@voztri/design-tokens';

interface DriverItem {
  id: string;
  name: string;
  phone: string;
  cnh: string;
  cnhEar: boolean;
  vehicle: string;
  plate: string;
  category: string;
  status: 'pending_approval' | 'approved' | 'blocked';
}

export const DriversScreen: React.FC = () => {
  const [drivers, setDrivers] = useState<DriverItem[]>([
    {
      id: '1',
      name: 'Carlos Eduardo Silva',
      phone: '(11) 99999-2222',
      cnh: '12345678900',
      cnhEar: true,
      vehicle: 'Toyota Corolla 2022',
      plate: 'VOZ2026',
      category: 'Pop',
      status: 'approved',
    },
    {
      id: '2',
      name: 'Mariana Santos',
      phone: '(11) 98888-3333',
      cnh: '98765432100',
      cnhEar: true,
      vehicle: 'Hyundai HB20 2021',
      plate: 'BRA4F18',
      category: 'Mulher',
      status: 'pending_approval',
    },
    {
      id: '3',
      name: 'Rodrigo Albuquerque',
      phone: '(11) 97777-4444',
      cnh: '45678912300',
      cnhEar: true,
      vehicle: 'Jeep Compass 2023',
      plate: 'SPX9912',
      category: 'Black',
      status: 'approved',
    },
  ]);

  const handleApprove = (id: string) => {
    setDrivers((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'approved' } : d)));
  };

  const handleBlock = (id: string) => {
    setDrivers((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'blocked' } : d)));
  };

  return (
    <div style={{ padding: 32, overflowY: 'auto', height: '100vh', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#151A31', margin: '0 0 6px' }}>
          Gestão e Homologação de Motoristas
        </h1>
        <p style={{ fontSize: 14, color: '#7B7489', margin: 0 }}>
          Validação de CNH com observação EAR, conformidade Lei 13.640/2018 e inspeção veicular.
        </p>
      </div>

      {/* Tabela de Motoristas */}
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
              <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 800, color: '#7B7489', textTransform: 'uppercase' }}>Motorista</th>
              <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 800, color: '#7B7489', textTransform: 'uppercase' }}>CNH (EAR)</th>
              <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 800, color: '#7B7489', textTransform: 'uppercase' }}>Veículo & Placa</th>
              <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 800, color: '#7B7489', textTransform: 'uppercase' }}>Categoria</th>
              <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 800, color: '#7B7489', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 800, color: '#7B7489', textTransform: 'uppercase', textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((d) => (
              <tr key={d.id} style={{ borderBottom: '1px solid #ECECFF' }}>
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#151A31' }}>{d.name}</div>
                  <span style={{ fontSize: 12, color: '#7B7489' }}>{d.phone}</span>
                </td>
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{d.cnh}</div>
                  <span style={{ fontSize: 11, color: '#00C853', fontWeight: 700 }}>✓ EAR Válida</span>
                </td>
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{d.vehicle}</div>
                  <span style={{ fontSize: 11, fontWeight: 800, backgroundColor: '#F4F6FA', padding: '2px 6px', borderRadius: 4 }}>
                    {d.plate}
                  </span>
                </td>
                <td style={{ padding: '16px 20px' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: VoztriColors.brand.primary }}>
                    {d.category}
                  </span>
                </td>
                <td style={{ padding: '16px 20px' }}>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '4px 8px',
                    borderRadius: 6,
                    backgroundColor: d.status === 'approved' ? '#E8F5E9' : d.status === 'pending_approval' ? '#FFF3E0' : '#FFEBEE',
                    color: d.status === 'approved' ? '#1B5E20' : d.status === 'pending_approval' ? '#E65100' : '#B71C1C',
                    textTransform: 'uppercase',
                  }}>
                    {d.status === 'approved' ? 'Aprovado' : d.status === 'pending_approval' ? 'Pendente' : 'Bloqueado'}
                  </span>
                </td>
                <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                  {d.status === 'pending_approval' && (
                    <button
                      onClick={() => handleApprove(d.id)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 8,
                        border: 'none',
                        backgroundColor: '#00C853',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: 'pointer',
                        marginRight: 8,
                      }}
                    >
                      Aprovar
                    </button>
                  )}
                  {d.status !== 'blocked' && (
                    <button
                      onClick={() => handleBlock(d.id)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 8,
                        border: '1px solid #FFCDD2',
                        backgroundColor: '#FFFFFF',
                        color: '#BA1A1A',
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      Bloquear
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
