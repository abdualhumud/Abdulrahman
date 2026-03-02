/**
 * Agoda Partner API — Availability, Rates & Reservation Service
 * =============================================================
 * Integrates with Agoda's Channel Manager connectivity API.
 *
 * Auth: API Key passed in the `Authorization: apikey {key}` header.
 * Base URL: https://api.agoda.com/v2
 *
 * Key operations:
 *   pushAgodaBlock   → POST /properties/{id}/calendar     — block/unblock dates
 *   pushAgodaRates   → POST /properties/{id}/rates        — update nightly rates
 *   pullAgodaReservations → GET /properties/{id}/reservations — polling retrieval
 *   startAgodaPoller → starts background polling (120 s interval)
 *
 * Rate limits: 60 requests/minute per property. Back-off on 429.
 *
 * IMPORTANT: No `node:` built-ins — this file is bundled for the browser
 * via Next.js static export. Use globalThis.crypto.subtle for crypto ops.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface AgodaCredentials {
  apiKey: string;
  propertyId: string;   // Agoda Hotel ID (numeric string)
}

export interface AgodaBlockRequest {
  apiKey: string;
  propertyId: string;
  roomTypeId: string;
  dateFrom: string;    // YYYY-MM-DD (inclusive)
  dateTo: string;      // YYYY-MM-DD (exclusive — last blocked night + 1)
  available: boolean;
  allotment?: number;  // rooms available (0 = full block)
}

export interface AgodaRateRequest {
  apiKey: string;
  propertyId: string;
  roomTypeId: string;
  ratePlanId: string;   // Agoda rate plan ID (e.g. 'BAR', 'MEMBER')
  dateFrom: string;
  dateTo: string;
  nightlyRate: number;  // in SAR (full value, NOT cents)
  cleaningFee?: number; // included in Agoda rate pushes when provided
  minStay?: number;
}

export interface AgodaReservation {
  bookingId: string;       // Agoda booking reference  (e.g. 'AGD-2026-XXXXXXX')
  propertyId: string;
  roomTypeId: string;
  guestFirstName: string;
  guestLastName: string;
  guestNationality: string;
  checkIn: string;         // YYYY-MM-DD
  checkOut: string;        // YYYY-MM-DD
  nights: number;
  adults: number;
  totalAmountSAR: number;
  currency: 'SAR';
  status: 'Confirmed' | 'Cancelled' | 'Modified';
  bookedAt: string;        // ISO 8601
  specialRequests?: string;
}

export interface AgodaPullResponse {
  propertyId: string;
  reservations: AgodaReservation[];
  pageToken?: string;      // pagination cursor
}

export interface AgodaPollerConfig {
  credentials: AgodaCredentials;
  onReservations: (reservations: AgodaReservation[]) => void;
  onError?: (err: Error) => void;
  intervalMs?: number;     // default: 120_000 (2 minutes)
  fetchFn?: typeof fetch;
}

// ── Constants ──────────────────────────────────────────────────────────────

const AGODA_BASE_URL   = 'https://api.agoda.com/v2';
const DEFAULT_POLL_MS  = 120_000;

// localStorage key for persisting the API key
const AGODA_KEY_STORAGE = 'rems-agoda-key';

// ── API Key localStorage helpers ──────────────────────────────────────────

export function getAgodaApiKey(): string {
  try { return localStorage.getItem(AGODA_KEY_STORAGE) ?? ''; } catch { return ''; }
}
export function setAgodaApiKey(key: string): void {
  try { localStorage.setItem(AGODA_KEY_STORAGE, key); } catch { /* noop */ }
}
export function clearAgodaApiKey(): void {
  try { localStorage.removeItem(AGODA_KEY_STORAGE); } catch { /* noop */ }
}

// ── Error classes ──────────────────────────────────────────────────────────

export class AgodaAuthError extends Error {
  constructor(msg = 'Agoda API key is invalid or missing') { super(msg); this.name = 'AgodaAuthError'; }
}
export class AgodaRateLimitError extends Error {
  constructor(retryAfter?: number) {
    super(`Agoda rate limit exceeded${retryAfter ? ` — retry after ${retryAfter}s` : ''}`);
    this.name = 'AgodaRateLimitError';
  }
}
export class AgodaNotFoundError extends Error {
  constructor(msg = 'Agoda property or room type not found') { super(msg); this.name = 'AgodaNotFoundError'; }
}

// ── Core fetch helper ──────────────────────────────────────────────────────

async function agodaFetch(
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH',
  apiKey: string,
  body?: unknown,
  fetchFn: typeof fetch = globalThis.fetch,
): Promise<unknown> {
  const url = `${AGODA_BASE_URL}${path}`;
  const res = await fetchFn(url, {
    method,
    headers: {
      'Content-Type':  'application/json',
      'Accept':        'application/json',
      'Authorization': `apikey ${apiKey}`,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (res.status === 401 || res.status === 403) throw new AgodaAuthError();
  if (res.status === 404) throw new AgodaNotFoundError();
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('Retry-After') ?? 60);
    throw new AgodaRateLimitError(retryAfter);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Agoda API error ${res.status}: ${text.slice(0, 200)}`);
  }

  const ct = res.headers.get('content-type') ?? '';
  return ct.includes('application/json') ? res.json() : { ok: true };
}

// ── Availability Block ─────────────────────────────────────────────────────

/**
 * pushAgodaBlock — push an availability block/unblock to Agoda's calendar.
 *
 * Agoda PATCH /properties/{propertyId}/rooms/{roomTypeId}/calendar
 * Body: array of date-range segments with allotment counts.
 *
 * allotment=0 → fully blocked (not available)
 * allotment=1 → 1 room available
 */
export async function pushAgodaBlock(
  req: AgodaBlockRequest,
  fetchFn: typeof fetch = globalThis.fetch,
): Promise<void> {
  const body = {
    updates: [
      {
        dateRange: {
          startDate: req.dateFrom,
          endDate:   req.dateTo,
        },
        allotment:   req.available ? (req.allotment ?? 1) : 0,
        stopSell:    !req.available,
      },
    ],
  };

  await agodaFetch(
    `/properties/${req.propertyId}/rooms/${req.roomTypeId}/calendar`,
    'PATCH',
    req.apiKey,
    body,
    fetchFn,
  );
}

// ── Rate Push ──────────────────────────────────────────────────────────────

/**
 * pushAgodaRates — push nightly rates to Agoda for a date range.
 *
 * Agoda PATCH /properties/{propertyId}/rooms/{roomTypeId}/rates/{ratePlanId}
 * Body: array of rate segments.
 *
 * NOTE: Agoda rates are in the local currency (SAR), NOT in cents.
 */
export async function pushAgodaRates(
  req: AgodaRateRequest,
  fetchFn: typeof fetch = globalThis.fetch,
): Promise<void> {
  const rateEntry: Record<string, unknown> = {
    dateRange: {
      startDate: req.dateFrom,
      endDate:   req.dateTo,
    },
    rate: {
      baseRate:  req.nightlyRate,
      currency:  'SAR',
    },
  };

  if (req.minStay !== undefined) rateEntry.minimumStay = req.minStay;

  // Include cleaning fee as a mandatory surcharge when provided
  if (req.cleaningFee !== undefined) {
    rateEntry.surcharges = [
      {
        type:     'CLEANING_FEE',
        amount:   req.cleaningFee,
        currency: 'SAR',
      },
    ];
  }

  await agodaFetch(
    `/properties/${req.propertyId}/rooms/${req.roomTypeId}/rates/${req.ratePlanId}`,
    'PATCH',
    req.apiKey,
    { updates: [rateEntry] },
    fetchFn,
  );
}

// ── Reservation Pull ───────────────────────────────────────────────────────

/**
 * pullAgodaReservations — retrieve new/modified reservations via polling.
 *
 * Agoda GET /properties/{propertyId}/reservations
 * Query params:
 *   since        ISO 8601 — only return reservations modified after this time
 *   status       Confirmed|Cancelled|Modified (comma-separated)
 *   pageToken    pagination cursor from previous response
 */
export async function pullAgodaReservations(
  credentials: AgodaCredentials,
  since: string,
  status = 'Confirmed,Modified',
  pageToken?: string,
  fetchFn: typeof fetch = globalThis.fetch,
): Promise<AgodaPullResponse> {
  const params = new URLSearchParams({
    since,
    status,
    ...(pageToken ? { pageToken } : {}),
  });

  const data = await agodaFetch(
    `/properties/${credentials.propertyId}/reservations?${params.toString()}`,
    'GET',
    credentials.apiKey,
    undefined,
    fetchFn,
  ) as AgodaPullResponse;

  return data;
}

// ── Acknowledgement ────────────────────────────────────────────────────────

/**
 * acknowledgeAgodaReservation — confirm receipt of a reservation.
 *
 * Must be called within 5 minutes of receiving the reservation.
 * Prevents Agoda from marking the booking as undelivered.
 *
 * POST /properties/{propertyId}/reservations/{bookingId}/acknowledge
 */
export async function acknowledgeAgodaReservation(
  credentials: AgodaCredentials,
  bookingId: string,
  internalId: string,
  fetchFn: typeof fetch = globalThis.fetch,
): Promise<void> {
  await agodaFetch(
    `/properties/${credentials.propertyId}/reservations/${bookingId}/acknowledge`,
    'POST',
    credentials.apiKey,
    { partnerReservationId: internalId, receivedAt: new Date().toISOString() },
    fetchFn,
  );
}

// ── Background Poller ──────────────────────────────────────────────────────

/**
 * startAgodaPoller — start a background polling loop.
 *
 * Polls Agoda for new/modified reservations every `intervalMs` milliseconds
 * (default: 120s). Returns a handle with a `stop()` method.
 *
 * Call `stop()` on component unmount to prevent memory leaks.
 */
export function startAgodaPoller(config: AgodaPollerConfig): { stop: () => void } {
  const interval = config.intervalMs ?? DEFAULT_POLL_MS;
  const fetchFn  = config.fetchFn ?? globalThis.fetch;
  let lastPoll   = new Date(Date.now() - interval).toISOString();
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let stopped    = false;

  const poll = async () => {
    if (stopped) return;
    try {
      const since  = lastPoll;
      lastPoll     = new Date().toISOString();
      const result = await pullAgodaReservations(config.credentials, since, 'Confirmed,Modified', undefined, fetchFn);
      if (result.reservations.length > 0) {
        config.onReservations(result.reservations);
      }
    } catch (err) {
      config.onError?.(err as Error);
    } finally {
      if (!stopped) timerId = setTimeout(poll, interval);
    }
  };

  // First poll after a short delay so the caller can set up handlers
  timerId = setTimeout(poll, 2_000);

  return {
    stop: () => {
      stopped = true;
      if (timerId !== null) clearTimeout(timerId);
    },
  };
}

// ── iCal Feed (fallback) ───────────────────────────────────────────────────

/**
 * generateAgodaICalFeed — produce a minimal RFC 5545 iCal export.
 *
 * Used when the polling API is temporarily unavailable.
 * Agoda can import this feed via their calendar sync feature.
 *
 * Date format: YYYYMMDD (no dashes) in DTSTART;VALUE=DATE: / DTEND;VALUE=DATE:
 */
export function generateAgodaICalFeed(
  propertyId: string,
  blockedDates: Array<{ dateFrom: string; dateTo: string; label?: string }>,
): string {
  const uidDomain = 'rems.agoda.api';
  const now = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';

  const events = blockedDates.map((b, idx) => {
    const dtStart = b.dateFrom.replace(/-/g, '');
    const dtEnd   = b.dateTo.replace(/-/g, '');
    const uid     = `agoda-block-${propertyId}-${idx}-${Date.now()}@${uidDomain}`;
    const summary = b.label ?? 'Not available';
    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${dtStart}`,
      `DTEND;VALUE=DATE:${dtEnd}`,
      `SUMMARY:${summary}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
    ].join('\r\n');
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//REMS//Agoda iCal Export//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}
