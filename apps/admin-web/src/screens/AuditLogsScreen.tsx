import React, { useState } from 'react';
import { adminApi } from '../lib/api.js';
import { useAsync } from '../lib/useAsync.js';
import { AUDIT_ACTION_LABELS, formatDateTime } from '../lib/format.js';
import { EmptyRow, ErrorBox, Loading, Pager } from '../components/States.js';

const th: React.CSSProperties = { padding: '16px 20px', fontSize: 12, fontWeight: 800, color: '#7B7489', textTransform: 'uppercase' };

export const AuditLogsScreen: React.FC = () => {
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useAsync(() => adminApi.getAuditLogs(page), [page]);
  const logs = data?.data ?? [];

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
                <th style={th}>Ação Executada</th>
                <th style={th}>Operador</th>
                <th style={th}>Entidade / Detalhes</th>
                <th style={th}>Endereço IP</th>
                <th style={th}>Data / Hora</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <EmptyRow colSpan={5} message="Nenhuma ação registrada. Aprovar ou bloquear um motorista gera o primeiro registro." />
              )}
              {logs.map((l) => (
                <tr key={l.id} style={{ borderBottom: '1px solid #ECECFF' }}>
                  <td style={{ padding: '16px 20px', fontSize: 14, fontWeight: 700, color: '#151A31' }}>
                    {AUDIT_ACTION_LABELS[l.action] ?? l.action}
                  </td>
                  <td style={{ padding: '16px 20px', fontSize: 13, color: '#494457' }}>
                    {l.user ? l.user.email ?? l.user.name : 'Sistema'}
                  </td>
                  <td style={{ padding: '16px 20px', fontSize: 13, color: '#494457' }}>
                    {l.target_entity}
                    {l.target_id && <span style={{ fontFamily: 'monospace', color: '#7B7489' }}> #{l.target_id.slice(0, 8)}</span>}
                    {l.new_values && (
                      <div style={{ fontSize: 12, color: '#7B7489' }}>
                        {Object.entries(l.new_values)
                          .map(([k, v]) => `${k}: ${String(v)}`)
                          .join(' • ')}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '16px 20px', fontSize: 12, fontFamily: 'monospace', color: '#7B7489' }}>{l.ip_address ?? '—'}</td>
                  <td style={{ padding: '16px 20px', fontSize: 12, color: '#7B7489', whiteSpace: 'nowrap' }}>{formatDateTime(l.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager page={data.current_page} lastPage={data.last_page} total={data.total} onChange={setPage} />
        </div>
      )}
    </div>
  );
};
