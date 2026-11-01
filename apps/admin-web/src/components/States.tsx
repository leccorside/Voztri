import React from 'react';

const box: React.CSSProperties = {
  padding: 24,
  borderRadius: 16,
  fontSize: 14,
  lineHeight: 1.5,
};

export const Loading: React.FC<{ label?: string }> = ({ label = 'Carregando dados da API…' }) => (
  <div style={{ ...box, color: '#7B7489', backgroundColor: '#FFFFFF', border: '1px solid #ECECFF' }} role="status">
    {label}
  </div>
);

export const ErrorBox: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div
    role="alert"
    style={{
      ...box,
      color: '#B71C1C',
      backgroundColor: '#FFEBEE',
      border: '1px solid #FFCDD2',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 16,
    }}
  >
    <span>{message}</span>
    {onRetry && (
      <button
        onClick={onRetry}
        style={{
          padding: '6px 14px',
          borderRadius: 8,
          border: '1px solid #FFCDD2',
          backgroundColor: '#FFFFFF',
          color: '#BA1A1A',
          fontWeight: 700,
          fontSize: 12,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        Tentar de novo
      </button>
    )}
  </div>
);

export const EmptyRow: React.FC<{ colSpan: number; message: string }> = ({ colSpan, message }) => (
  <tr>
    <td colSpan={colSpan} style={{ padding: '32px 20px', textAlign: 'center', fontSize: 14, color: '#7B7489' }}>
      {message}
    </td>
  </tr>
);

export const Pager: React.FC<{ page: number; lastPage: number; total: number; onChange: (p: number) => void }> = ({
  page,
  lastPage,
  total,
  onChange,
}) => {
  if (lastPage <= 1) return null;
  const btn = (disabled: boolean): React.CSSProperties => ({
    padding: '6px 12px',
    borderRadius: 8,
    border: '1px solid #ECECFF',
    backgroundColor: '#FFFFFF',
    fontWeight: 700,
    fontSize: 12,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  });
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, padding: '14px 20px', fontSize: 13, color: '#7B7489' }}>
      <span>
        Página {page} de {lastPage} • {total} registros
      </span>
      <button style={btn(page <= 1)} disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Anterior
      </button>
      <button style={btn(page >= lastPage)} disabled={page >= lastPage} onClick={() => onChange(page + 1)}>
        Próxima
      </button>
    </div>
  );
};
