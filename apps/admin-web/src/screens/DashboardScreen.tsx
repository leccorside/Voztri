import React from 'react';
import { VoztriColors } from '@voztri/design-tokens';

export const DashboardScreen: React.FC = () => {
  const stats = [
    { label: 'Passageiros Cadastrados', value: '1.240', change: '+12% este mês', color: '#6A00FF' },
    { label: 'Motoristas Cadastrados', value: '380', sub: '42 online agora', color: '#00C853' },
    { label: 'Corridas Ativas', value: '18', sub: 'Tempo médio: 4.2 min', color: '#9546F9' },
    { label: 'Receita Bruta Total', value: 'R$ 84.500,00', change: '+18% vs semana pass.', color: '#151A31' },
    { label: 'Comissão VOZTRI (15%)', value: 'R$ 12.675,00', sub: 'Margem líquida estável', color: '#4F00C3' },
    { label: 'Avaliação Média Geral', value: '★ 4.92', sub: 'Baseada em 3.120 avaliações', color: '#FFAB00' },
  ];

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

      {/* Grid de Métricas Principais */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 20,
        marginBottom: 32,
      }}>
        {stats.map((s, i) => (
          <div
            key={i}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 24,
              boxShadow: '0 4px 16px rgba(11, 16, 38, 0.05)',
              border: '1px solid #ECECFF',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: '#7B7489', display: 'block', marginBottom: 8 }}>
              {s.label}
            </span>
            <div style={{ fontSize: 30, fontWeight: 800, color: s.color, marginBottom: 8 }}>
              {s.value}
            </div>
            {s.change && (
              <span style={{ fontSize: 12, fontWeight: 700, color: '#00C853' }}>
                ▲ {s.change}
              </span>
            )}
            {s.sub && (
              <span style={{ fontSize: 12, color: '#7B7489' }}>
                {s.sub}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Seção Inferior: Categorias & Alertas de Segurança */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Distribuição por Categoria */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          padding: 24,
          boxShadow: '0 4px 16px rgba(11, 16, 38, 0.05)',
          border: '1px solid #ECECFF',
        }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#151A31', marginBottom: 20 }}>
            Distribuição de Volume por Categoria
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { name: 'VozTri Pop', percent: 62, count: '1.934 corridas', color: '#6A00FF' },
              { name: 'VozTri Black', percent: 18, count: '561 corridas', color: '#0B1026' },
              { name: 'VozTri Mulher', percent: 12, count: '374 corridas', color: '#9546F9' },
              { name: 'VozTri Moto', percent: 8, count: '251 corridas', color: '#FFAB00' },
            ].map((cat, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                  <span>{cat.name}</span>
                  <span style={{ color: '#7B7489' }}>{cat.count} ({cat.percent}%)</span>
                </div>
                <div style={{ width: '100%', height: 8, backgroundColor: '#ECECFF', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${cat.percent}%`, height: '100%', backgroundColor: cat.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Central de Incidentes SOS */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          padding: 24,
          boxShadow: '0 4px 16px rgba(11, 16, 38, 0.05)',
          border: '1px solid #ECECFF',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#151A31', margin: 0 }}>
              Central de Emergência SOS & Alertas
            </h2>
            <span style={{ fontSize: 11, fontWeight: 800, backgroundColor: '#E8F5E9', color: '#1B5E20', padding: '4px 8px', borderRadius: 6 }}>
              ● 0 Alertas Ativos
            </span>
          </div>

          <p style={{ fontSize: 13, color: '#7B7489', lineHeight: 1.6 }}>
            Nenhum incidente de segurança ativo no momento. Todos os alertas de SOS disparados nas últimas 24h foram atendidos e resolvidos pela equipe de monitoramento com desativação confirmada por PIN.
          </p>

          <div style={{ marginTop: 20, backgroundColor: '#F8F9FE', padding: 14, borderRadius: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#151A31', display: 'block' }}>
              Último Evento SOS Registrado:
            </span>
            <span style={{ fontSize: 12, color: '#7B7489', display: 'block', marginTop: 2 }}>
              Corrida #ride-78491 • Resolvido via PIN de segurança (Alarme falso informado pelo passageiro).
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
