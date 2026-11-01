import React from 'react';
import { VoztriColors } from '@voztri/design-tokens';

export const AuditLogsScreen: React.FC = () => {
  const logs = [
    {
      id: 'log-101',
      action: 'Aprovação de Motorista',
      user: 'admin@voztri.com.br',
      target: 'Carlos Eduardo Silva (CNH 12345678900)',
      ip: '192.168.1.100',
      time: 'Hoje, 11:30:15',
    },
    {
      id: 'log-100',
      action: 'Atualização de Tarifa',
      user: 'admin@voztri.com.br',
      target: 'VozTri Pop - Base ajustada para R$ 5,00',
      ip: '192.168.1.100',
      time: 'Ontem, 18:45:00',
    },
    {
      id: 'log-099',
      action: 'Encerramento de Alerta SOS',
      user: 'Sistema Automático / PIN de Segurança',
      target: 'Corrida #ride-78491',
      ip: '177.18.92.14',
      time: 'Ontem, 16:12:33',
    },
  ];

  return (
    <div style={{ padding: 32, overflowY: 'auto', height: '100vh', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#151A31', margin: '0 0 6px' }}>
          Trilha de Auditoria & Conformidade
        </h1>
        <p style={{ fontSize: 14, color: '#7B7489', margin: 0 }}>
          Registro imutável de todas as ações administrativas, alterações tarifárias e intervenções de suporte.
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
              <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 800, color: '#7B7489', textTransform: 'uppercase' }}>Ação Executada</th>
              <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 800, color: '#7B7489', textTransform: 'uppercase' }}>Operador</th>
              <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 800, color: '#7B7489', textTransform: 'uppercase' }}>Entidade / Detalhes</th>
              <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 800, color: '#7B7489', textTransform: 'uppercase' }}>Endereço IP</th>
              <th style={{ padding: '16px 20px', fontSize: 12, fontWeight: 800, color: '#7B7489', textTransform: 'uppercase' }}>Data / Hora</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} style={{ borderBottom: '1px solid #ECECFF' }}>
                <td style={{ padding: '16px 20px', fontSize: 14, fontWeight: 700, color: '#151A31' }}>
                  {l.action}
                </td>
                <td style={{ padding: '16px 20px', fontSize: 13, color: '#494457' }}>{l.user}</td>
                <td style={{ padding: '16px 20px', fontSize: 13, color: '#494457' }}>{l.target}</td>
                <td style={{ padding: '16px 20px', fontSize: 12, fontFamily: 'monospace', color: '#7B7489' }}>{l.ip}</td>
                <td style={{ padding: '16px 20px', fontSize: 12, color: '#7B7489' }}>{l.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
