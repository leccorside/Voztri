export interface PixPaymentData {
  qrCodeUrl: string;
  qrCodeBase64: string;
  pixCopyPaste: string;
  expiresAt: string;
}

export interface CreditCardData {
  id: string;
  brand: string;
  lastFourDigits: string;
  holderName: string;
  expiryMonth: string;
  expiryYear: string;
  isDefault: boolean;
}

export interface LedgerEntry {
  id: string;
  accountType: 'driver_balance' | 'platform_revenue' | 'passenger_wallet' | 'escrow';
  accountId: string;
  entryType: 'credit' | 'debit';
  amountCents: number;
  balanceAfterCents: number;
  description: string;
  createdAt: string;
}

export interface DailyEarnings {
  date: string;
  label: string;
  cents: number;
  isToday: boolean;
}

/** GET /driver/earnings — valores líquidos (após a comissão). */
export interface DriverEarningsSummary {
  isOnline: boolean;
  todayCents: number;
  weekCents: number;
  /** Segunda a domingo da semana atual. */
  daily: DailyEarnings[];
  availableBalanceCents: number;
  pendingBalanceCents: number;
  ridesCount: number;
  /** Ainda não registrado pela API (null). */
  onlineHours: number | null;
  rating: number | null;
  pixKey: string | null;
  pixKeyType: string | null;
}

