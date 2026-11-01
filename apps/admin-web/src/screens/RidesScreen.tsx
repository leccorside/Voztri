import React, { useState } from 'react';
import { VoztriColors } from '@voztri/design-tokens';
import { adminApi } from '../lib/api.js';
import { useAsync } from '../lib/useAsync.js';
import { categoryLabel, formatCents, formatDateTime, PAYMENT_LABELS, RIDE_STATUS } from '../lib/format.js';
import { EmptyRow, ErrorBox, Loading, Pager } from '../components/States.js';

const th: React.CSSProperties = { padding: '16px 20px', fontSize: 12, fontWeight: 800, color: '#7B7489', textTransform: 'uppercase' };

export const RidesScreen: React.FC = () => {
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useAsync(() => adminApi.listRides(page), [page]);
  const rides = data?.data ?? [];

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

      {error && <div style={{ marginBottom: 20 }}><ErrorBox message={error} onRetry={reload} /></div>}
      {loading && !data && <Loading />}

      {data && (
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
                <th style={th}>Corrida</th>
                <th style={th}>Passageiro</th>
                <th style={th}>Motorista</th>
                <th style={th}>Trajeto</th>
                <th style={th}>Valor</th>
                <th style={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rides.length === 0 && <EmptyRow colSpan={6} message="Nenhuma corrida registrada ainda." />}
              {rides.map((r) => {
                const st = RIDE_STATUS[r.status] ?? { label: r.status, bg: '#F4F6FA', fg: '#494457' };
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #ECECFF' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: VoztriColors.brand.primary, fontFamily: 'monospace' }} title={r.id}>
                        #{r.id.slice(0, 8)}
                      </div>
                      <span style={{ fontSize: 12, color: '#7B7489' }}>{formatDateTime(r.created_at)}</span>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: 14, fontWeight: 600 }}>{r.passenger?.user?.name ?? '—'}</td>
                    <td style={{ padding: '16px 20px', fontSize: 14, fontWeight: 600 }}>{r.driver?.user?.name ?? '—'}</td>
                    <td style={{ padding: '16px 20px', fontSize: 13, color: '#494457' }}>
                      {r.pickup_address} → {r.dropoff_address}
                      <div style={{ fontSize: 12, color: '#7B7489' }}>{categoryLabel(r.category)}</div>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: 14, fontWeight: 800, color: '#151A31', whiteSpace: 'nowrap' }}>
                      {formatCents(r.final_price_cents ?? r.estimated_price_cents)}
                      <div style={{ fontSize: 12, fontWeight: 500, color: '#7B7489' }}>{PAYMENT_LABELS[r.payment_method] ?? r.payment_method}</div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '4px 8px',
                        borderRadius: 6,
                        backgroundColor: st.bg,
                        color: st.fg,
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                      }}>
                        {st.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Pager page={data.current_page} lastPage={data.last_page} total={data.total} onChange={setPage} />
        </div>
      )}
    </div>
  );
};
