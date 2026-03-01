/**
 * moyasar-service.ts
 *
 * Moyasar Payment Gateway client for REMS.
 * https://moyasar.com/docs
 *
 * Architecture notes for static Next.js export:
 *  - Publishable key: safe for browser → used in Moyasar.js widget & payment-link preview
 *  - Secret key:      server-only → used only via Webhook handler (see webhook-design section)
 *  - API key stored in localStorage['rems-moyasar-key'] so owners can inject it from Settings
 *  - Real API calls fire when key is present; mock/demo mode when not configured
 *
 * Payment flows:
 *  1. SaaS Subscription  → Moyasar.js hosted form embedded in OnboardingPage Step 4
 *  2. Manual Booking Link → createPaymentLink() → share via SMS/Email/WhatsApp
 *  3. Guest Checkout      → Redirect to Moyasar hosted page via payment link URL
 */

/* ── Types ─────────────────────────────────────────────────── */

export type MoyasarPaymentStatus =
  | 'initiated' | 'paid' | 'failed' | 'authorized'
  | 'captured' | 'refunded' | 'voided';

export type MoyasarSourceType = 'creditcard' | 'mada' | 'applepay' | 'stcpay';

export interface MoyasarSource {
  type: MoyasarSourceType;
  company?: string;      // visa | mastercard | mada
  name?: string;         // cardholder name
  number?: string;       // last-4 digits (masked)
  message?: string;      // error message if failed
  transaction_url?: string; // 3DS redirect URL
}

export interface MoyasarPayment {
  id: string;
  status: MoyasarPaymentStatus;
  amount: number;              // in halalas (SAR * 100)
  amount_format: string;       // "149.00 SAR"
  currency: 'SAR';
  description: string;
  metadata: Record<string, string>;
  source: MoyasarSource;
  created_at: string;
  updated_at: string;
  invoice_id?: string;
  ip?: string;
  callback_url?: string;
}

export interface MoyasarPaymentLink {
  id: string;
  url: string;
  status: 'active' | 'inactive';
  amount: number;
  currency: 'SAR';
  description: string;
  metadata: Record<string, string>;
  success_url?: string;
  back_url?: string;
  expired_at?: string | null;
  created_at: string;
  payments_count: number;
  payments_amount: number;
}

export interface CreatePaymentLinkParams {
  amount: number;              // SAR (will be converted to halalas)
  description: string;
  metadata?: Record<string, string>;
  successUrl?: string;
  backUrl?: string;
  expiredAt?: string | null;   // ISO-8601 or null = never
}

export interface MoyasarWebhookPayload {
  id: string;
  type: 'payment_paid' | 'payment_failed' | 'payment_refunded' | 'payment_authorized' | 'payment_captured';
  data: MoyasarPayment;
}

/* ── Config ────────────────────────────────────────────────── */

const API_BASE = 'https://api.moyasar.com/v1';
const LS_KEY   = 'rems-moyasar-key';

/** Returns the configured publishable/secret key from localStorage. */
export function getMoyasarKey(): string {
  try { return localStorage.getItem(LS_KEY) ?? ''; } catch { return ''; }
}
export function setMoyasarKey(key: string): void {
  try { localStorage.setItem(LS_KEY, key); } catch { /* ignore */ }
}
export function clearMoyasarKey(): void {
  try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
}

/** Returns true when a key has been configured. */
export function isMoyasarConfigured(): boolean {
  return getMoyasarKey().startsWith('pk_') || getMoyasarKey().startsWith('sk_');
}

function authHeader(key?: string): string {
  const k = key ?? getMoyasarKey();
  return `Basic ${btoa(k + ':')}`;
}

/* ── Payment Link API ──────────────────────────────────────── */

/**
 * Create a Moyasar Payment Link.
 * Returns a mock link when no API key is configured (demo/staging mode).
 *
 * NOTE: Moyasar requires a SECRET key (sk_*) for this endpoint.
 *       Store sk_ key in localStorage only in trusted environments.
 *       In production, proxy through a serverless function.
 */
export async function createPaymentLink(
  params: CreatePaymentLinkParams,
  fetchFn: typeof fetch = fetch,
): Promise<MoyasarPaymentLink> {
  const key = getMoyasarKey();

  /* Demo / no-key mode — return a plausible mock link */
  if (!key) {
    const mockId = `pl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const mockUrl = `https://moyasar.com/pay/${mockId}`;
    return {
      id:               mockId,
      url:              mockUrl,
      status:           'active',
      amount:           params.amount * 100,
      currency:         'SAR',
      description:      params.description,
      metadata:         params.metadata ?? {},
      back_url:         params.backUrl,
      success_url:      params.successUrl,
      expired_at:       params.expiredAt ?? null,
      created_at:       new Date().toISOString(),
      payments_count:   0,
      payments_amount:  0,
    };
  }

  const body = {
    amount:       params.amount * 100,          // → halalas
    currency:     'SAR',
    description:  params.description,
    metadata:     params.metadata ?? {},
    ...(params.successUrl  && { success_url: params.successUrl }),
    ...(params.backUrl     && { back_url:    params.backUrl    }),
    ...(params.expiredAt !== undefined && { expired_at: params.expiredAt }),
  };

  const res = await fetchFn(`${API_BASE}/payment_links`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeader(key) },
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `Moyasar API error ${res.status}`);
  }
  return res.json() as Promise<MoyasarPaymentLink>;
}

/* ── Payment Status Fetch ──────────────────────────────────── */

export async function getPayment(
  id: string,
  fetchFn: typeof fetch = fetch,
): Promise<MoyasarPayment> {
  const key = getMoyasarKey();
  if (!key) throw new Error('Moyasar key not configured');

  const res = await fetchFn(`${API_BASE}/payments/${id}`, {
    headers: { Authorization: authHeader(key) },
  });
  if (!res.ok) throw new Error(`Failed to fetch payment ${id}`);
  return res.json() as Promise<MoyasarPayment>;
}

/* ── Webhook Verification ──────────────────────────────────── */

/**
 * Verify a Moyasar webhook signature.
 * Uses Web Crypto API (browser-safe, no node:crypto import).
 *
 * Signature header: X-Moyasar-Signature: sha256=<hex>
 */
export async function verifyMoyasarWebhook(
  rawBody: string,
  signature: string,
  webhookSecret: string,
): Promise<void> {
  const enc     = new TextEncoder();
  const keyBuf  = await globalThis.crypto.subtle.importKey(
    'raw', enc.encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign'],
  );
  const sigBytes = await globalThis.crypto.subtle.sign('HMAC', keyBuf, enc.encode(rawBody));
  const expected = Array.from(new Uint8Array(sigBytes))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  const incoming = signature.startsWith('sha256=') ? signature.slice(7) : signature;
  if (expected.length !== incoming.length) throw new Error('Webhook signature mismatch');
  let diff = 0;
  for (let i = 0; i < expected.length; i++)
    diff |= expected.charCodeAt(i) ^ incoming.charCodeAt(i);
  if (diff !== 0) throw new Error('Webhook signature mismatch');
}

/* ── Moyasar.js Loader ─────────────────────────────────────── */

const MOYASAR_JS_VERSION  = '1.14.0';
const MOYASAR_JS_URL      = `https://cdn.moyasar.com/mpf/${MOYASAR_JS_VERSION}/moyasar.js`;
const MOYASAR_CSS_URL     = `https://cdn.moyasar.com/mpf/${MOYASAR_JS_VERSION}/moyasar.css`;

type MoyasarInitOptions = {
  element: string;           // CSS selector, e.g. '#moyasar-form'
  amount: number;            // halalas
  currency?: 'SAR';
  description: string;
  publishable_api_key: string;
  callback_url: string;
  methods?: MoyasarSourceType[];
  metadata?: Record<string, string>;
  on_initiating?: () => void;
  on_completed?: (payment: MoyasarPayment) => void;
  on_failed?: (payment: MoyasarPayment) => void;
  fixed_width?: boolean;
  base_url?: string;
};

/**
 * Dynamically loads Moyasar.js + CSS from CDN and initialises the payment form.
 * Idempotent: calling twice only inits once.
 */
export function loadMoyasarForm(options: MoyasarInitOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const init = () => {
      const M = (window as unknown as { Moyasar?: { init: (o: MoyasarInitOptions) => void } }).Moyasar;
      if (!M) { reject(new Error('Moyasar.js failed to load')); return; }
      M.init(options);
      resolve();
    };

    /* Inject CSS once */
    if (!document.getElementById('moyasar-css')) {
      const link = Object.assign(document.createElement('link'), {
        id: 'moyasar-css', rel: 'stylesheet', href: MOYASAR_CSS_URL,
      });
      document.head.appendChild(link);
    }

    /* Inject JS once */
    const existing = document.getElementById('moyasar-js') as HTMLScriptElement | null;
    if ((window as unknown as { Moyasar?: unknown }).Moyasar) { init(); return; }
    if (!existing) {
      const script = Object.assign(document.createElement('script'), {
        id: 'moyasar-js', src: MOYASAR_JS_URL,
      });
      script.onload  = init;
      script.onerror = () => reject(new Error('Failed to load Moyasar.js'));
      document.head.appendChild(script);
    } else {
      existing.addEventListener('load', init);
    }
  });
}

/* ── Webhook Handler Design ────────────────────────────────── */
/*
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  WEBHOOK INTEGRATION ROADMAP (activate when live key is ready)  │
 * ├─────────────────────────────────────────────────────────────────┤
 * │                                                                   │
 * │  ENDPOINT:  POST /api/moyasar-webhook                            │
 * │  (Deploy as: Vercel Edge Function / Netlify Function / Supabase) │
 * │                                                                   │
 * │  1. Parse raw body (do NOT use JSON.parse before verifying)      │
 * │  2. Read header:  X-Moyasar-Signature: sha256=<hex>              │
 * │  3. verifyMoyasarWebhook(rawBody, sig, MOYASAR_WEBHOOK_SECRET)   │
 * │  4. Parse JSON payload → MoyasarWebhookPayload                   │
 * │  5. Switch on payload.type:                                       │
 * │     ├── payment_paid       → activate subscription / confirm     │
 * │     ├── payment_failed     → send failure notification email     │
 * │     ├── payment_refunded   → update booking status to REFUNDED   │
 * │     └── payment_authorized → hold for manual capture if needed   │
 * │  6. Update REMS database (localStorage proxy for static demo)    │
 * │  7. Return HTTP 200                                              │
 * │                                                                   │
 * │  ENV VARS REQUIRED:                                              │
 * │    NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY=pk_live_...               │
 * │    MOYASAR_SECRET_KEY=sk_live_...                                │
 * │    MOYASAR_WEBHOOK_SECRET=whs_live_...                           │
 * │                                                                   │
 * └─────────────────────────────────────────────────────────────────┘
 */
