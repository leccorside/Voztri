import React, { useState } from 'react';
import { VoztriColors } from '@voztri/design-tokens';
import type { AdminDriverStatus } from '@voztri/api-client';
import { adminApi, errorMessage } from '../lib/api.js';
import { useAsync } from '../lib/useAsync.js';
import { categoryLabel, formatPhone } from '../lib/format.js';
import { EmptyRow, ErrorBox, Loading, Pager } from '../components/States.js';

const STATUS: Record<AdminDriverStatus, { label: string; bg: string; fg: string }> = {
  registering: { label: 'Em cadastro', bg: '#F4F6FA', fg: '#494457' },
  approved: { label: 'Aprovado', bg: '#E8F5E9', fg: '#1B5E20' },
  pending_approval: { label: 'Pendente', bg: '#FFF3E0', fg: '#E65100' },
  rejected: { label: 'Reprovado', bg: '#FFEBEE', fg: '#B71C1C' },
  blocked: { label: 'Bloqueado', bg: '#FFEBEE', fg: '#B71C1C' },
};

const th: React.CSSProperties = { padding: '16px 20px', fontSize: 12, fontWeight: 800, color: '#7B7489', textTransform: 'uppercase' };

export const DriversScreen: React.FC = () => {
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useAsync(() => adminApi.listDrivers(page), [page]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const runAction = async (id: string, action: 'approve' | 'block') => {
    setPendingId(id);
    setActionError(null);
    try {
      if (action === 'approve') await adminApi.approveDriver(id);
      else await adminApi.blockDriver(id);
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setPendingId(null);
    }
  };

  const drivers = data?.data ?? [];

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

      {error && <div style={{ marginBottom: 20 }}><ErrorBox message={error} onRetry={reload} /></div>}
      {actionError && <div style={{ marginBottom: 20 }}><ErrorBox message={actionError} /></div>}
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
                <th style={th}>Motorista</th>
                <th style={th}>CNH (EAR)</th>
                <th style={th}>Veículo & Placa</th>
                <th style={th}>Categoria</th>
                <th style={th}>Status</th>
                <th style={{ ...th, textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {drivers.length === 0 && <EmptyRow colSpan={6} message="Nenhum motorista cadastrado." />}
              {drivers.map((d) => {
                const st = STATUS[d.status] ?? { label: d.status, bg: '#F4F6FA', fg: '#494457' };
                const v = d.active_vehicle;
                const busy = pendingId === d.id;
                return (
                  <tr key={d.id} style={{ borderBottom: '1px solid #ECECFF' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#151A31' }}>{d.user?.name ?? '—'}</div>
                      <span style={{ fontSize: 12, color: '#7B7489' }}>
                        {formatPhone(d.user?.phone)}
                        {d.is_online && <span style={{ color: '#00C853', fontWeight: 700 }}> • online</span>}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{d.cnh_number} ({d.cnh_category})</div>
                      {d.cnh_has_ear ? (
                        <span style={{ fontSize: 11, color: '#00C853', fontWeight: 700 }}>✓ EAR válida</span>
                      ) : (
                        <span style={{ fontSize: 11, color: '#BA1A1A', fontWeight: 700 }}>✗ Sem EAR</span>
                      )}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      {v ? (
                        <>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{v.brand} {v.model} {v.year}</div>
                          <span style={{ fontSize: 11, fontWeight: 800, backgroundColor: '#F4F6FA', padding: '2px 6px', borderRadius: 4 }}>
                            {v.plate}
                          </span>
                        </>
                      ) : (
                        <span style={{ fontSize: 13, color: '#7B7489' }}>Sem veículo ativo</span>
                      )}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: VoztriColors.brand.primary }}>
                        {v ? categoryLabel(v.category) : '—'}
                      </span>
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
                      }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {/* Cadastro incompleto (CNH, veículo ou documentos faltando) não se aprova */}
                      {d.status !== 'approved' && d.status !== 'registering' && (
                        <button
                          onClick={() => void runAction(d.id, 'approve')}
                          disabled={busy}
                          style={{
                            padding: '6px 14px',
                            borderRadius: 8,
                            border: 'none',
                            backgroundColor: '#00C853',
                            color: '#FFFFFF',
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: busy ? 'wait' : 'pointer',
                            opacity: busy ? 0.6 : 1,
                            marginRight: 8,
                          }}
                        >
                          {d.status === 'blocked' ? 'Reativar' : 'Aprovar'}
                        </button>
                      )}
                      {d.status !== 'blocked' && (
                        <button
                          onClick={() => void runAction(d.id, 'block')}
                          disabled={busy}
                          style={{
                            padding: '6px 14px',
                            borderRadius: 8,
                            border: '1px solid #FFCDD2',
                            backgroundColor: '#FFFFFF',
                            color: '#BA1A1A',
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: busy ? 'wait' : 'pointer',
                            opacity: busy ? 0.6 : 1,
                          }}
                        >
                          Bloquear
                        </button>
                      )}
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
