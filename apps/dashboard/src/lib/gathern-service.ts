/**
 * Gathern Sync Bridge
 * ====================
 * Gathern (غاذرن) is the leading Saudi OTA for chalets and vacation rentals.
 * Integration model: REST/JSON API, polling every 120 s (as shown in the
 * dashboard CHANNEL_SYNC_STATUS syncMethod: 'Polling/120s').
 *
 * Auth     : Bearer token (API key issued via Gathern Partner Portal)
 * Base URL : https://api.gathern.com/v1  (hypothetical — replace with the
 *            actual endpoint once issued by Gathern Partner team)
 *
 * Key differences from Booking.com integration:
 *   • REST/JSON (not XML)
 *   • Polling-based (not webhook-first)
 *   • Insurance-fee sync is built into the rate push payload
 *
 * This module is consumed by:
 *   • overlap-guard.ts  → broadcastAvailabilityBlock()
 *   • ChannelsPage       → Rate Parity Manager "Push" action
 *   • Polling scheduler  → pullGathernReservations() every 120 s
 */

const GATHERN_API_BASE = 'https://api.gathern.com/v1';

// ── Types ──────────────────────────────────────────────────────────────────

export interface GathernBlockRequest {
  apiKey:    string;
  unitId:    string;
  /** Inclusive start — YYYY-MM-DD */
  dateFrom:  string;
  /** Exclusive end (checkout date) — YYYY-MM-DD */
  dateTo:    string;
  available: boolean;
}

export interface GathernRateRequest {
  apiKey:      string;
  unitId:      string;
  dateFrom:    string;
  dateTo:      string;
  nightlyRate: number;
  currency:    'SAR';
  minStay:     number;
  /** Cleaning / insurance fee synced alongside the nightly rate */
  cleaningFee?: number;
}

export interface GathernReservation {
  id:          string;
  unitId:      string;
  guestName:   string;
  guestPhone:  string;
  checkIn:     string;   // YYYY-MM-DD
  checkOut:    string;   // YYYY-MM-DD
  nights:      number;
  totalAmount: number;
  currency:    string;
  status:      'confirmed' | 'cancelled' | 'modified';
  createdAt:   string;
}

export class GathernApiError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = 'GathernApiError';
  }
}

// ── Shared Transport ───────────────────────────────────────────────────────

async function gathernFetch(
  apiKey:  string,
  path:    string,
  options: RequestInit = {},
): Promise<Response> {
  const response = await fetch(`${GATHERN_API_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type':  'application/json',
      'Accept':        'application/json',
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new GathernApiError(
      `Gathern API error — ${path} → HTTP ${response.status}`,
      response.status,
    );
  }

  return response;
}

// ── Availability ───────────────────────────────────────────────────────────

/**
 * Pushes an availability block (or unblock) to Gathern.
 *
 * Called by overlap-guard.broadcastAvailabilityBlock() immediately after
 * a booking is confirmed on Booking.com, Airbnb, or Direct channel,
 * to close the calendar on Gathern and prevent double-bookings.
 *
 * Sets quantity: 0 for blocking, quantity: 1 for unblocking.
 */
export async function pushGathernBlock(req: GathernBlockRequest): Promise<void> {
  await gathernFetch(req.apiKey, `/units/${req.unitId}/availability`, {
    method: 'PUT',
    body: JSON.stringify({
      date_from:  req.dateFrom,
      date_to:    req.dateTo,
      available:  req.available,
      quantity:   req.available ? 1 : 0,
    }),
  });
}

// ── Rates ──────────────────────────────────────────────────────────────────

/**
 * Pushes nightly rate and min-stay rules to Gathern.
 *
 * Gathern-specific: the cleaning/insurance fee is included in the
 * same payload (unlike Booking.com where fees are a separate line item).
 * This enables the "Insurance fee sync active" indicator on the channel card.
 */
export async function pushGathernRates(req: GathernRateRequest): Promise<void> {
  await gathernFetch(req.apiKey, `/units/${req.unitId}/rates`, {
    method: 'PUT',
    body: JSON.stringify({
      date_from:    req.dateFrom,
      date_to:      req.dateTo,
      nightly_rate: req.nightlyRate,
      currency:     req.currency,
      min_stay:     req.minStay,
      ...(req.cleaningFee != null ? { cleaning_fee: req.cleaningFee } : {}),
    }),
  });
}

// ── Reservations ───────────────────────────────────────────────────────────

/**
 * Pulls new / modified / cancelled reservations from Gathern.
 *
 * Scheduling: call every 120 seconds (matching syncMethod: 'Polling/120s').
 * In production, trigger this from a cron job or background worker.
 *
 * @param apiKey         Gathern API key
 * @param unitIds        List of internal unit IDs to query
 * @param afterTimestamp ISO 8601 datetime — only return bookings created/
 *                       modified after this point
 */
export async function pullGathernReservations(
  apiKey:          string,
  unitIds:         string[],
  afterTimestamp:  string,
): Promise<GathernReservation[]> {
  const params = new URLSearchParams({
    unit_ids: unitIds.join(','),
    since:    afterTimestamp,
    status:   'confirmed,modified,cancelled',
  });

  const response = await gathernFetch(apiKey, `/reservations?${params.toString()}`);
  return response.json();
}

/**
 * Acknowledges a Gathern reservation to prevent duplicate processing.
 * Call this after processBookingRequest() completes successfully.
 */
export async function acknowledgeGathernReservation(
  apiKey:            string,
  gathernBookingId:  string,
  internalBookingId: string,
): Promise<void> {
  await gathernFetch(apiKey, `/reservations/${gathernBookingId}/acknowledge`, {
    method: 'POST',
    body: JSON.stringify({ internal_booking_id: internalBookingId }),
  });
}

// ── Polling Scheduler (run on server) ─────────────────────────────────────

export interface GathernPollerOptions {
  apiKey:            string;
  unitIds:           string[];
  intervalMs?:       number;   // default: 120_000 (2 min)
  onNewReservation:  (r: GathernReservation) => Promise<void>;
  onError?:          (err: Error) => void;
}

/**
 * Starts the Gathern polling loop.
 * Returns a stop function — call it to cancel polling (e.g. on process shutdown).
 *
 * Usage (in a Next.js API route or server action):
 *   const stop = startGathernPoller({
 *     apiKey: process.env.GATHERN_API_KEY!,
 *     unitIds: UNITS.map(u => u.id),
 *     onNewReservation: async (r) => {
 *       await processBookingRequest({ ...r, channel: 'Gathern' }, creds);
 *     },
 *   });
 */
export function startGathernPoller(opts: GathernPollerOptions): () => void {
  const interval = opts.intervalMs ?? 120_000;
  let lastPoll   = new Date(Date.now() - interval).toISOString();
  let stopped    = false;

  const poll = async () => {
    if (stopped) return;

    try {
      const since  = lastPoll;
      lastPoll     = new Date().toISOString();

      const reservations = await pullGathernReservations(
        opts.apiKey,
        opts.unitIds,
        since,
      );

      for (const r of reservations) {
        await opts.onNewReservation(r);
      }
    } catch (err) {
      opts.onError?.(err as Error);
    }

    if (!stopped) {
      setTimeout(poll, interval);
    }
  };

  // First poll after a short delay so the caller can finish setup
  setTimeout(poll, 2_000);

  return () => { stopped = true; };
}
