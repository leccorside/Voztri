import React from 'react';
import { adminApi } from '../lib/api.js';
import { useAsync } from '../lib/useAsync.js';
import { formatCents, formatInt } from '../lib/format.js';
import { ErrorBox, Loading } from '../components/States.js';

const card: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  borderRadius: 20,
  padding: 24,
  boxShadow: '0 4px 16px rgba(11, 16, 38, 0.05)',
  border: '1px solid #ECECFF',
};

export const DashboardScreen: React.FC = () => {
  // Atualiza a cada 30 s para acompanhar a operação
  const { data: s, error, loading, reload } = useAsync(() => adminApi.getStats(), [], 30_000);

  const stats = s
    ? [
        { label: 'Passageiros Cadastrados', value: formatInt(s.passengers_count), color: '#6A00FF' },
        {
          label: 'Motoristas Cadastrados',
          value: formatInt(s.drivers_count),
          sub: `${formatInt(s.online_drivers_count)} online agora`,
          color: '#00C853',
        },
        { label: 'Corridas Ativas', value: formatInt(s.active_rides_count), color: '#9546F9' },
        {
          label: 'Receita Bruta Total',
          value: formatCents(s.gross_revenue_cents),
          sub: `${formatInt(s.completed_rides_count)} concluídas • ${formatInt(s.cancelled_rides_count)} canceladas`,
          color: '#151A31',
        },
        { label: 'Comissão VOZTRI', value: formatCents(s.platform_revenue_cents), sub: 'Lançamentos de receita no ledger', color: '#4F00C3' },
        {
          label: 'Avaliação Média Geral',
          value: `★ ${s.average_rating.toFixed(2).replace('.', ',')}`,
          sub: 'Valor provisório: ainda fixo na API',
          color: '#FFAB00',
        },
      ]
    : [];

  return (
    <div style={{ padding: 32, overflowY: 'auto', height: '100vh', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#151A31', margin: '0 0 6px' }}>
          Dashboard Operacional
        </h1>
        <p style={{ fontSize: 14, color: '#7B7489', margin: 0 }}>
          Visão consolidada da operação de mobilidade urbana da VOZTRI em São Paulo (SP).
        </p>
      </div>

      {loading && !s && <Loading />}
      {error && <div style={{ marginBottom: 20 }}><ErrorBox message={error} onRetry={reload} /></div>}

      {/* Grid de Métricas Principais */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 20,
        marginBottom: 32,
      }}>
        {stats.map((stat) => (
          <div key={stat.label} style={card}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#7B7489', display: 'block', marginBottom: 8 }}>
              {stat.label}
            </span>
            <div style={{ fontSize: 30, fontWeight: 800, color: stat.color, marginBottom: 8, fontVariantNumeric: 'tabular-nums' }}>
              {stat.value}
            </div>
            {stat.sub && (
              <span style={{ fontSize: 12, color: '#7B7489' }}>
                {stat.sub}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Seções ainda sem endpoint na API */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        <div style={card}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#151A31', marginBottom: 12 }}>
            Distribuição de Volume por Categoria
          </h2>
          <p style={{ fontSize: 13, color: '#7B7489', lineHeight: 1.6 }}>
            A API ainda não expõe o volume de corridas por categoria. Esta seção será preenchida quando o endpoint existir.
          </p>
        </div>

        <div style={card}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#151A31', marginBottom: 12 }}>
            Central de Emergência SOS & Alertas
          </h2>
          <p style={{ fontSize: 13, color: '#7B7489', lineHeight: 1.6 }}>
            A API ainda não expõe os incidentes de segurança (<code>safety_incidents</code>) para o painel. Esta seção será preenchida quando o endpoint existir.
          </p>
        </div>
      </div>
    </div>
  );
};
