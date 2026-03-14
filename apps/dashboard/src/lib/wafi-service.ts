/**
 * Waffy (WAFI) Escrow Payment API Service
 * ==========================================
 * Waffy (وفّي) is a Saudi-licensed escrow payment platform for secure financial
 * transactions between buyers and sellers.
 *
 * Company registration: 4030433771 · Founded 2022 · Jeddah, KSA
 * Developer portal : https://developer.waffyapp.com/
 * Base URL         : https://api.waffyapp.com/v1
 * Auth             : API key in Authorization header (Bearer <api_key>)
 *
 * Integration model for REMS:
 *  - Escrow transactions for guest deposits and security holds
 *  - Payment links shared with guests via SMS / WhatsApp
 *  - Funds held in escrow until check-out inspection is complete
 *  - Release or refund funds based on inspection outcome
 *
 * API key stored in localStorage['rems-wafi-key'] so property owners can
 * configure it from Settings — never hard-coded or sent to third parties.
 *
 * IMPORTANT: Uses globalThis.crypto.subtle for HMAC verification (Web Crypto API).
 * NEVER import from 'node:crypto' — breaks Next.js static export builds.
 */

// ── Constants ───────────────────────────────────────────────────────────────

const WAFI_API_BASE   = 'https://api.waffyapp.com/v1';
const WAFI_KEY_STORAGE = 'rems-wafi-key';

/** Brand colors (authoritative) */
export const WAFI_BRAND = {
  primary:    '#1A6B3C',   // deep Saudi green
  secondary:  '#F0FDF4',   // light green background
  accent:     '#FFD700',   // gold accent
} as const;

// ── Types ────────────────────────────────────────────────────────────────────

export type WafiTransactionStatus =
  | 'pending'
  | 'funded'
  | 'held'
  | 'delivered'
  | 'released'
  | 'disputed'
  | 'refunded'
  | 'cancelled';

export type WafiPartyRole = 'buyer' | 'seller';

export interface WafiCredentials {
  /** API key from the Waffy Developer Portal */
  apiKey: string;
}

export interface WafiTransaction {
  id:               string;
  status:           WafiTransactionStatus;
  /** Transaction title / description visible to both parties */
  title:            string;
  amount:           number;     // SAR
  currency:         'SAR';
  buyerEmail:       string;
  buyerPhone:       string;
  sellerEmail:      string;
  /** Secure payment link sent to the buyer */
  paymentUrl:       string;
  /** Inspection deadline in ISO-8601 */
  inspectionDeadline: string;
  /** Free-form metadata (booking ID, unit ID, etc.) */
  metadata:         Record<string, string>;
  createdAt:        string;
  updatedAt:        string;
  releasedAt?:      string;
  refundedAt?:      string;
}

export interface CreateWafiTransactionParams {
  title:              string;
  /** SAR amount to hold in escrow */
  amount:             number;
  buyerEmail:         string;
  buyerPhone:         string;
  /** Days until inspection deadline (default: 3) */
  inspectionDays?:    number;
  successUrl?:        string;
  cancelUrl?:         string;
  metadata?:          Record<string, string>;
}

export interface WafiWebhookPayload {
  event:       WafiWebhookEvent;
  transaction: WafiTransaction;
  timestamp:   string;
  /** HMAC-SHA256 hex digest of the raw body */
  signature:   string;
}

export type WafiWebhookEvent =
  | 'transaction.funded'
  | 'transaction.delivered'
  | 'transaction.released'
  | 'transaction.refunded'
  | 'transaction.disputed'
  | 'transaction.cancelled';

export interface WafiReleaseResult {
  transactionId: string;
  status:        'released';
  releasedAt:    string;
  amountSAR:     number;
}

export interface WafiRefundResult {
  transactionId: string;
  status:        'refunded';
  refundedAt:    string;
  amountSAR:     number;
  reason:        string;
}

// ── Errors ───────────────────────────────────────────────────────────────────

export class WafiAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WafiAuthError';
  }
}

export class WafiApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly body: string,
  ) {
    super(message);
    this.name = 'WafiApiError';
  }
}

export class WafiWebhookVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WafiWebhookVerificationError';
  }
}

// ── API key localStorage helpers ────────────────────────────────────────────

/** Returns the configured Waffy API key from localStorage, or empty string. */
export function getWafiApiKey(): string {
  try { return localStorage.getItem(WAFI_KEY_STORAGE) ?? ''; } catch { return ''; }
}

/** Persists the Waffy API key to localStorage. */
export function setWafiApiKey(key: string): void {
  try { localStorage.setItem(WAFI_KEY_STORAGE, key.trim()); } catch { /* ignore */ }
}

/** Removes the Waffy API key from localStorage. */
export function clearWafiApiKey(): void {
  try { localStorage.removeItem(WAFI_KEY_STORAGE); } catch { /* ignore */ }
}

/** Returns true when an API key has been configured. */
export function isWafiConfigured(): boolean {
  return getWafiApiKey().length > 10;
}

// ── Shared HTTP transport ────────────────────────────────────────────────────

async function wafiFetch(
  path:    string,
  options: RequestInit = {},
  fetchFn: typeof fetch = fetch,
): Promise<Response> {
  const key = getWafiApiKey();

  const response = await fetchFn(`${WAFI_API_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type':  'application/json',
      'Accept':        'application/json',
      ...(options.headers ?? {}),
    },
  });

  if (response.status === 401 || response.status === 403) {
    const body = await response.text();
    throw new WafiAuthError(`Waffy authentication failed — HTTP ${response.status}: ${body}`);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new WafiApiError(
      `Waffy API error — ${path} → HTTP ${response.status}`,
      response.status,
      body,
    );
  }

  return response;
}

// ── Transaction Operations ───────────────────────────────────────────────────

/**
 * Creates a new escrow transaction.
 *
 * REMS use cases:
 *  - Security deposit hold on check-in (held until inspection after checkout)
 *  - Booking deposit for long-stay reservations
 *  - Cleaning fee hold released after INSPECTION_DONE status
 *
 * Returns a plausible mock when no API key is configured (demo / staging mode).
 */
export async function createWafiTransaction(
  params: CreateWafiTransactionParams,
  fetchFn: typeof fetch = fetch,
): Promise<WafiTransaction> {
  const key = getWafiApiKey();

  /* Demo / no-key mode — return a plausible mock transaction */
  if (!key) {
    const mockId  = `WFI-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
    const days    = params.inspectionDays ?? 3;
    const dl      = new Date(Date.now() + days * 86_400_000).toISOString();
    return {
      id:                 mockId,
      status:             'pending',
      title:              params.title,
      amount:             params.amount,
      currency:           'SAR',
      buyerEmail:         params.buyerEmail,
      buyerPhone:         params.buyerPhone,
      sellerEmail:        'owner@rems.sa',
      paymentUrl:         `https://pay.waffyapp.com/t/${mockId}`,
      inspectionDeadline: dl,
      metadata:           params.metadata ?? {},
      createdAt:          new Date().toISOString(),
      updatedAt:          new Date().toISOString(),
    };
  }

  const body = {
    title:            params.title,
    amount:           params.amount,
    currency:         'SAR',
    buyer_email:      params.buyerEmail,
    buyer_phone:      params.buyerPhone,
    inspection_days:  params.inspectionDays ?? 3,
    ...(params.successUrl && { success_url: params.successUrl }),
    ...(params.cancelUrl  && { cancel_url:  params.cancelUrl  }),
    ...(params.metadata   && { metadata:    params.metadata   }),
  };

  const res = await wafiFetch('/transactions', { method: 'POST', body: JSON.stringify(body) }, fetchFn);
  return res.json() as Promise<WafiTransaction>;
}

/**
 * Retrieves a single transaction by its Waffy ID.
 * Poll this to check status after issuing a payment link to the guest.
 */
export async function getWafiTransaction(
  transactionId: string,
  fetchFn: typeof fetch = fetch,
): Promise<WafiTransaction> {
  const res = await wafiFetch(`/transactions/${transactionId}`, {}, fetchFn);
  return res.json() as Promise<WafiTransaction>;
}

/**
 * Lists transactions, optionally filtered by status or metadata.
 * Use to reconcile escrow holds with REMS booking records.
 *
 * @param since  ISO-8601 timestamp — only return transactions after this point
 * @param status  Filter by transaction status
 */
export async function listWafiTransactions(
  options: {
    since?:  string;
    status?: WafiTransactionStatus;
    limit?:  number;
  } = {},
  fetchFn: typeof fetch = fetch,
): Promise<WafiTransaction[]> {
  const params = new URLSearchParams();
  if (options.since)  params.set('since',  options.since);
  if (options.status) params.set('status', options.status);
  if (options.limit)  params.set('limit',  String(options.limit));

  const qs  = params.toString();
  const res = await wafiFetch(`/transactions${qs ? '?' + qs : ''}`, {}, fetchFn);
  const data = await res.json() as { transactions: WafiTransaction[] };
  return data.transactions ?? [];
}

/**
 * Marks the transaction as "delivered" — signals that the service/product
 * has been provided. The buyer has `inspection_days` to dispute before
 * funds auto-release.
 *
 * REMS trigger: called when CleaningPage status reaches INSPECTION_DONE
 * and the security deposit should move toward release.
 */
export async function markWafiDelivered(
  transactionId: string,
  fetchFn: typeof fetch = fetch,
): Promise<WafiTransaction> {
  const res = await wafiFetch(
    `/transactions/${transactionId}/deliver`,
    { method: 'POST' },
    fetchFn,
  );
  return res.json() as Promise<WafiTransaction>;
}

/**
 * Releases held funds to the seller (property owner).
 *
 * Call this after:
 *  1. CleaningPage inspection is INSPECTION_DONE
 *  2. No damages reported during the inspection window
 */
export async function releaseWafiEscrow(
  transactionId: string,
  fetchFn: typeof fetch = fetch,
): Promise<WafiReleaseResult> {
  const res = await wafiFetch(
    `/transactions/${transactionId}/release`,
    { method: 'POST' },
    fetchFn,
  );
  return res.json() as Promise<WafiReleaseResult>;
}

/**
 * Refunds the held amount back to the guest/buyer.
 *
 * Call this when:
 *  - Booking is cancelled before check-in (per cancellation policy)
 *  - Cleaning inspection reveals no damage (security deposit release)
 */
export async function refundWafiEscrow(
  transactionId: string,
  reason:         string,
  fetchFn: typeof fetch = fetch,
): Promise<WafiRefundResult> {
  const res = await wafiFetch(
    `/transactions/${transactionId}/refund`,
    { method: 'POST', body: JSON.stringify({ reason }) },
    fetchFn,
  );
  return res.json() as Promise<WafiRefundResult>;
}

// ── Webhook Verification ─────────────────────────────────────────────────────

/**
 * Verifies an incoming Waffy webhook signature using the Web Crypto API.
 *
 * Waffy signs the raw request body with HMAC-SHA256 using the webhook secret
 * from your developer portal settings. The hex digest is passed in the
 * X-Waffy-Signature header.
 *
 * Uses globalThis.crypto.subtle — works in browsers and Node.js >= 18.
 * NEVER use node:crypto here — it breaks Next.js static export builds.
 *
 * @param rawBody       Raw HTTP body string (before JSON.parse)
 * @param signature     Value of X-Waffy-Signature header (hex string)
 * @param webhookSecret Your Waffy webhook signing secret
 * @throws WafiWebhookVerificationError if signature does not match
 */
export async function verifyWafiWebhook(
  rawBody:       string,
  signature:     string,
  webhookSecret: string,
): Promise<void> {
  const enc = new TextEncoder();

  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    enc.encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const sigBytes = await globalThis.crypto.subtle.sign('HMAC', key, enc.encode(rawBody));
  const expected = Array.from(new Uint8Array(sigBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const incoming = signature.startsWith('sha256=') ? signature.slice(7) : signature;

  if (!timingSafeEqual(expected, incoming)) {
    throw new WafiWebhookVerificationError(
      'Waffy webhook signature mismatch — possible replay or tampering attempt',
    );
  }
}

/**
 * Parses a verified Waffy webhook payload.
 * Always call verifyWafiWebhook() before parsing.
 */
export function parseWafiWebhook(rawBody: string): WafiWebhookPayload {
  const data = JSON.parse(rawBody) as WafiWebhookPayload;
  return data;
}

// ── Payment Link Helper ──────────────────────────────────────────────────────

/**
 * Generates the guest-facing payment URL for sharing.
 * Works with both real and mock transactions.
 */
export function getWafiPaymentUrl(transaction: WafiTransaction): string {
  return transaction.paymentUrl;
}

/**
 * Generates a WhatsApp-ready deep link with the payment URL.
 * Suitable for Saudi phone numbers (+966).
 */
export function buildWafiWhatsAppLink(
  transaction: WafiTransaction,
  guestPhone:   string,
  lang:         'en' | 'ar' = 'ar',
): string {
  const url     = getWafiPaymentUrl(transaction);
  const message = lang === 'ar'
    ? `مرحباً، يرجى إتمام الدفع الآمن لحجزك عبر رابط وفّي: ${url}`
    : `Hello, please complete your secure payment via Waffy escrow: ${url}`;
  const phone   = guestPhone.replace(/\D/g, '');
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

// ── Polling Scheduler ────────────────────────────────────────────────────────

export interface WafiPollerOptions {
  transactionIds:      string[];
  intervalMs?:         number;   // default: 60_000 (1 min)
  onStatusChange:      (tx: WafiTransaction, prevStatus: WafiTransactionStatus) => Promise<void>;
  onError?:            (err: Error) => void;
}

/**
 * Polls Waffy transaction statuses at regular intervals.
 * Returns a stop function — call it to cancel polling.
 *
 * Use this to detect when a guest funds their escrow
 * and automatically advance the booking status.
 */
export function startWafiPoller(opts: WafiPollerOptions): () => void {
  const interval = opts.intervalMs ?? 60_000;
  const knownStatuses = new Map<string, WafiTransactionStatus>();
  let stopped = false;

  const poll = async () => {
    if (stopped) return;

    for (const id of opts.transactionIds) {
      try {
        const tx   = await getWafiTransaction(id);
        const prev = knownStatuses.get(id);

        if (prev !== undefined && prev !== tx.status) {
          await opts.onStatusChange(tx, prev);
        }

        knownStatuses.set(id, tx.status);
      } catch (err) {
        opts.onError?.(err as Error);
      }
    }

    if (!stopped) setTimeout(poll, interval);
  };

  setTimeout(poll, 2_000);   // first poll after 2s to let caller finish setup
  return () => { stopped = true; };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Constant-time string comparison (prevents timing side-channel attacks). */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ── Status helpers ───────────────────────────────────────────────────────────

/** Returns true when funds are currently held and can be released or refunded. */
export function isWafiHeld(status: WafiTransactionStatus): boolean {
  return status === 'held' || status === 'funded' || status === 'delivered';
}

/** Returns true when the transaction is in a terminal state (no further actions). */
export function isWafiTerminal(status: WafiTransactionStatus): boolean {
  return status === 'released' || status === 'refunded' || status === 'cancelled';
}

/** Maps a Waffy status to a human-readable label (English). */
export function getWafiStatusLabel(status: WafiTransactionStatus): string {
  const labels: Record<WafiTransactionStatus, string> = {
    pending:   'Awaiting Payment',
    funded:    'Funded — Held',
    held:      'Held in Escrow',
    delivered: 'Service Delivered',
    released:  'Funds Released',
    disputed:  'Disputed',
    refunded:  'Refunded',
    cancelled: 'Cancelled',
  };
  return labels[status] ?? status;
}

/** Maps a Waffy status to Tailwind badge classes. */
export function getWafiStatusBadge(status: WafiTransactionStatus): string {
  const map: Record<WafiTransactionStatus, string> = {
    pending:   'bg-amber-50 text-amber-700 border border-amber-100',
    funded:    'bg-blue-50 text-blue-700 border border-blue-100',
    held:      'bg-violet-50 text-violet-700 border border-violet-100',
    delivered: 'bg-teal-50 text-teal-700 border border-teal-100',
    released:  'bg-emerald-50 text-emerald-700 border border-emerald-100',
    disputed:  'bg-red-50 text-red-700 border border-red-100',
    refunded:  'bg-slate-50 text-slate-600 border border-slate-100',
    cancelled: 'bg-slate-50 text-slate-400 border border-slate-100',
  };
  return map[status] ?? 'bg-slate-50 text-slate-500 border border-slate-100';
}
