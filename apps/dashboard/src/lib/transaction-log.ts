/**
 * transaction-log.ts
 *
 * Client-side transaction ledger for REMS payment flows.
 * Persists to localStorage['rems-transactions'].
 *
 * Tracks:
 *  - SaaS subscription payments (onboarding)
 *  - Manual booking payment links
 *  - Guest direct-checkout payments
 *  - Refunds
 */

export type TxType   = 'subscription' | 'booking' | 'guest_checkout' | 'refund';
export type TxStatus = 'initiated' | 'paid' | 'failed' | 'refunded' | 'pending_payment' | 'expired';
export type TxMethod = 'creditcard' | 'mada' | 'applepay' | 'stcpay' | 'payment_link' | 'unknown';

export interface TransactionRecord {
  id: string;              // local ID: TX-<timestamp36>-<random5>
  moyasarId?: string;      // Moyasar payment/link ID once created
  type: TxType;
  status: TxStatus;
  amountSAR: number;       // SAR face value
  amountHalalas: number;   // amountSAR * 100
  currency: 'SAR';
  method: TxMethod;
  description: string;
  // card details (populated after payment)
  cardLast4?: string;
  cardCompany?: string;    // visa | mastercard | mada
  cardName?: string;
  // references
  bookingId?: string;
  unitId?: string;
  guestName?: string;
  guestEmail?: string;
  ownerPlan?: string;      // subscription plan
  promoCode?: string;
  discountPct?: number;
  originalAmountSAR?: number;
  // payment link
  paymentLinkUrl?: string;
  paymentLinkId?: string;
  // audit
  createdAt: string;       // ISO
  paidAt?: string;         // ISO
  failureReason?: string;
  refundedAt?: string;     // ISO
  refundAmountSAR?: number;
}

const LS_KEY = 'rems-transactions';
const MAX_RECORDS = 500;

function load(): TransactionRecord[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as TransactionRecord[]) : [];
  } catch { return []; }
}

function save(records: TransactionRecord[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)));
  } catch { /* ignore */ }
}

function generateId(): string {
  return `TX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

/* ── CRUD ────────────────────────────────────────────────────── */

export function getTransactions(): TransactionRecord[] {
  return load();
}

export function getTransaction(id: string): TransactionRecord | undefined {
  return load().find(t => t.id === id || t.moyasarId === id);
}

export function createTransaction(
  partial: Omit<TransactionRecord, 'id' | 'createdAt' | 'currency' | 'amountHalalas'>,
): TransactionRecord {
  const record: TransactionRecord = {
    ...partial,
    id:            generateId(),
    currency:      'SAR',
    amountHalalas: Math.round(partial.amountSAR * 100),
    createdAt:     new Date().toISOString(),
  };
  const all = load();
  save([record, ...all]);
  return record;
}

export function updateTransaction(
  id: string,
  patch: Partial<TransactionRecord>,
): TransactionRecord | null {
  const all = load();
  const idx = all.findIndex(t => t.id === id || t.moyasarId === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...patch };
  save(all);
  return all[idx];
}

export function clearTransactions(): void {
  try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
}

/* ── Helpers ────────────────────────────────────────────────── */

export function getTxStatusStyle(status: TxStatus): string {
  const map: Record<TxStatus, string> = {
    paid:            'bg-emerald-100 text-emerald-700',
    initiated:       'bg-blue-100 text-blue-700',
    pending_payment: 'bg-amber-100 text-amber-700',
    failed:          'bg-red-100 text-red-700',
    refunded:        'bg-purple-100 text-purple-700',
    expired:         'bg-slate-100 text-slate-500',
  };
  return map[status] ?? 'bg-slate-100 text-slate-500';
}

export function getTxMethodIcon(method: TxMethod): string {
  const map: Record<TxMethod, string> = {
    creditcard:   '💳',
    mada:         '🟢',
    applepay:     '🍎',
    stcpay:       '📱',
    payment_link: '🔗',
    unknown:      '💰',
  };
  return map[method] ?? '💰';
}

/** Seed demo transactions for staging/demo mode. */
export function seedDemoTransactions(): void {
  if (load().length > 0) return;
  const demos: Omit<TransactionRecord, 'id' | 'createdAt' | 'currency' | 'amountHalalas'>[] = [
    {
      type: 'subscription', status: 'paid', amountSAR: 279, method: 'creditcard',
      description: 'REMS Pro — Monthly Subscription',
      cardLast4: '4242', cardCompany: 'visa', cardName: 'Mohammed Al-Otaibi',
      ownerPlan: 'Pro', promoCode: 'REMS2026', discountPct: 20, originalAmountSAR: 349,
      moyasarId: 'pay_demo_sub_001', paidAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
      type: 'booking', status: 'paid', amountSAR: 4992, method: 'mada',
      description: 'Booking BK-1091 — Unit A (4 nights)',
      cardLast4: '8881', cardCompany: 'mada', cardName: 'Mohammed Al-Otaibi',
      bookingId: 'BK-1091', guestName: 'Mohammed Al-Otaibi',
      moyasarId: 'pay_demo_bk_001', paidAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    {
      type: 'guest_checkout', status: 'pending_payment', amountSAR: 7500, method: 'payment_link',
      description: 'Jeddah Villa — 3 nights (Sarah Thompson)',
      bookingId: 'BK-1090', guestName: 'Sarah Thompson', guestEmail: 'sarah@example.com',
      paymentLinkUrl: 'https://moyasar.com/pay/pl_demo_001',
      paymentLinkId: 'pl_demo_001',
    },
    {
      type: 'booking', status: 'failed', amountSAR: 3300, method: 'creditcard',
      description: 'Booking BK-1089 — Chalet 1 (3 nights)',
      cardLast4: '0000', cardCompany: 'visa',
      bookingId: 'BK-1089', guestName: 'Khalid Al-Dosari',
      failureReason: 'Insufficient funds',
      moyasarId: 'pay_demo_bk_002',
    },
    {
      type: 'refund', status: 'refunded', amountSAR: 950, method: 'creditcard',
      description: 'Refund — BK-1087 (early checkout)',
      bookingId: 'BK-1087', guestName: 'Fatima Al-Zahrani',
      refundedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      refundAmountSAR: 950, originalAmountSAR: 1900,
      moyasarId: 'pay_demo_ref_001',
    },
  ];
  demos.forEach(d => createTransaction(d));
}
