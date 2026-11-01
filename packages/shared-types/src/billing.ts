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

export interface DriverEarningsSummary {
  todayCents: number;
  weekCents: number;
  availableBalanceCents: number;
  pendingBalanceCents: number;
  ridesCount: number;
  onlineHours: number;
  pixKey?: string;
}

