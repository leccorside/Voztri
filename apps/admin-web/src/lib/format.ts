const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const int = new Intl.NumberFormat('pt-BR');
const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });

export const formatCents = (cents: number | null | undefined): string =>
  cents == null ? '—' : brl.format(cents / 100);

export const formatInt = (n: number): string => int.format(n);

export const formatDateTime = (iso: string | null | undefined): string =>
  iso ? dateTime.format(new Date(iso)) : '—';

/** 11999992222 → (11) 99999-2222 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '—';
  const d = phone.replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone;
}

export const CATEGORY_LABELS: Record<string, string> = {
  pop: 'Pop',
  black: 'Black',
  mulher: 'Mulher',
  moto: 'Moto',
};

export const categoryLabel = (c: string): string => CATEGORY_LABELS[c] ?? c;

export const RIDE_STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  REQUESTED: { label: 'Solicitada', bg: '#F4F6FA', fg: '#494457' },
  SEARCHING: { label: 'Buscando', bg: '#FFF3E0', fg: '#E65100' },
  OFFERED: { label: 'Ofertada', bg: '#FFF3E0', fg: '#E65100' },
  ACCEPTED: { label: 'Aceita', bg: '#EDDCFF', fg: '#6200BC' },
  DRIVER_EN_ROUTE: { label: 'A caminho', bg: '#EDDCFF', fg: '#6200BC' },
  DRIVER_ARRIVED: { label: 'Motorista chegou', bg: '#EDDCFF', fg: '#6200BC' },
  IN_PROGRESS: { label: 'Em andamento', bg: '#EDDCFF', fg: '#6200BC' },
  COMPLETED: { label: 'Concluída', bg: '#E8F5E9', fg: '#1B5E20' },
  CANCELLED: { label: 'Cancelada', bg: '#FFEBEE', fg: '#B71C1C' },
};

export const PAYMENT_LABELS: Record<string, string> = {
  pix: 'Pix',
  credit_card: 'Cartão',
  cash: 'Dinheiro',
  wallet: 'Carteira',
};

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  driver_approval: 'Aprovação de Motorista',
  driver_block: 'Bloqueio de Motorista',
  fare_update: 'Atualização de Tarifa',
  user_ban: 'Banimento de Usuário',
  refund: 'Estorno',
};
