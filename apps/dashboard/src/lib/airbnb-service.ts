/**
 * Airbnb Partner API Service
 * ===========================
 * Auth     : OAuth 2.0 Authorization Code flow (NOT client_credentials)
 *            Airbnb requires user-level consent; each property owner must
 *            grant access through the Airbnb OAuth screen.
 * Base URL : https://api.airbnb.com/v2
 * Webhooks : HMAC-SHA256 signature in X-Airbnb-Signature header
 *
 * Key differences from Booking.com:
 *   • OAuth uses authorization_code grant (user redirect required)
 *   • Calendar + pricing updates use the same endpoint (calendar_operations)
 *   • No XML — pure JSON REST API
 *   • Reservations arrive via webhooks (push model, near-instant)
 *
 * In production this module runs on a Node.js/serverless backend.
 * Never expose client_secret or access_token to the browser.
 */

// ── Constants ──────────────────────────────────────────────────────────────

const AIRBNB_BASE          = 'https://api.airbnb.com/v2';
const AIRBNB_AUTH_BASE     = 'https://www.airbnb.com/oauth2';
const AIRBNB_TOKEN_URL     = 'https://api.airbnb.com/v2/oauth2/token';

/** Scopes required for full channel manager integration */
const REQUIRED_SCOPES = [
  'vr:read:reservations',
  'vr:write:reservations',
  'vr:read:listings',
  'vr:write:listings',
  'vr:read:calendar',
  'vr:write:calendar',
].join(' ');

// ── Types ──────────────────────────────────────────────────────────────────

export interface AirbnbCredentials {
  clientId:     string;
  clientSecret: string;
  /** Your backend's public URL — Airbnb redirects here after user grants access */
  redirectUri:  string;
}

export interface AirbnbTokenSet {
  accessToken:  string;
  refreshToken: string;
  /** Unix timestamp (ms) */
  expiresAt:    number;
  /** Airbnb user ID of the property owner */
  userId:       string;
  /** Scope string granted by the user */
  scope:        string;
}

export interface AirbnbCalendarDay {
  date:        string;   // YYYY-MM-DD
  available:   boolean;
  /** Nightly price in the listing's currency */
  nightly_price?: number;
  min_nights?:    number;
  max_nights?:    number;
  /** 'available' | 'blocked' | 'booked' */
  status:      'available' | 'blocked' | 'booked';
  notes?:      string;
}

export interface AirbnbCalendarOperation {
  listingId:  string;
  dateFrom:   string;    // YYYY-MM-DD
  dateTo:     string;    // YYYY-MM-DD
  available:  boolean;
  /** Optional: update nightly price at the same time */
  nightlyPrice?: number;
  minNights?:    number;
  notes?:        string;
}

export interface AirbnbReservation {
  confirmationCode:  string;
  listingId:         string;
  guestId:           string;
  guestName:         string;
  guestEmail:        string;
  checkIn:           string;   // YYYY-MM-DD
  checkOut:          string;   // YYYY-MM-DD
  nights:            number;
  guestCount:        number;
  totalPayout:       number;
  currency:          string;
  status:            'pending' | 'accepted' | 'cancelled' | 'completed';
  bookingMethod:     'instant_book' | 'request_to_book';
  createdAt:         string;
  updatedAt:         string;
}

export interface AirbnbWebhookEvent {
  type:      'reservations.created' | 'reservations.modified' | 'reservations.cancelled'
             | 'calendar.updated' | 'pricing.updated';
  listingId: string;
  data:      Record<string, unknown>;
  timestamp: string;
}

// ── Errors ─────────────────────────────────────────────────────────────────

export class AirbnbAuthError extends Error {
  constructor(message: string) { super(message); this.name = 'AirbnbAuthError'; }
}

export class AirbnbApiError extends Error {
  constructor(message: string, public readonly statusCode: number, public readonly body: string) {
    super(message); this.name = 'AirbnbApiError';
  }
}

export class AirbnbWebhookVerificationError extends Error {
  constructor(message: string) { super(message); this.name = 'AirbnbWebhookVerificationError'; }
}

// ── OAuth 2.0 — Authorization Code Flow ───────────────────────────────────

/**
 * Step 1 — Build the Airbnb authorization URL.
 * Redirect the property owner's browser to this URL.
 * After granting access, Airbnb redirects to redirectUri?code=AUTH_CODE&state=STATE
 *
 * @param state  CSRF token — generate with crypto.randomUUID() and store in session
 */
export function buildAuthorizationUrl(
  credentials: AirbnbCredentials,
  state:        string,
): string {
  const params = new URLSearchParams({
    client_id:     credentials.clientId,
    redirect_uri:  credentials.redirectUri,
    response_type: 'code',
    scope:         REQUIRED_SCOPES,
    state,
  });
  return `${AIRBNB_AUTH_BASE}/auth?${params.toString()}`;
}

/**
 * Step 2 — Exchange the authorization code for an access + refresh token pair.
 * Call this in your OAuth callback route handler (e.g. GET /auth/airbnb/callback).
 *
 * Tokens:
 *   access_token  — short-lived (~2 hours)
 *   refresh_token — long-lived, use to get new access tokens without re-prompting user
 */
export async function exchangeAuthorizationCode(
  credentials: AirbnbCredentials,
  code:         string,
): Promise<AirbnbTokenSet> {
  const response = await fetch(AIRBNB_TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      grant_type:    'authorization_code',
      client_id:     credentials.clientId,
      client_secret: credentials.clientSecret,
      redirect_uri:  credentials.redirectUri,
      code,
    }).toString(),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new AirbnbAuthError(`Authorization code exchange failed — HTTP ${response.status}: ${body}`);
  }

  const data = await response.json();
  return {
    accessToken:  data.access_token,
    refreshToken: data.refresh_token,
    expiresAt:    Date.now() + (data.expires_in ?? 7200) * 1000,
    userId:       String(data.user_id ?? ''),
    scope:        data.scope ?? REQUIRED_SCOPES,
  };
}

/**
 * Step 3 — Refresh an expired access token using the refresh token.
 * Call this automatically before any API request when accessToken is expired.
 * Persist the new tokenSet to your DB — the refresh token may also rotate.
 */
export async function refreshAccessToken(
  credentials:  AirbnbCredentials,
  refreshToken: string,
): Promise<AirbnbTokenSet> {
  const response = await fetch(AIRBNB_TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      grant_type:    'refresh_token',
      client_id:     credentials.clientId,
      client_secret: credentials.clientSecret,
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new AirbnbAuthError(`Token refresh failed — HTTP ${response.status}: ${body}`);
  }

  const data = await response.json();
  return {
    accessToken:  data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,   // use new one if rotated
    expiresAt:    Date.now() + (data.expires_in ?? 7200) * 1000,
    userId:       String(data.user_id ?? ''),
    scope:        data.scope ?? REQUIRED_SCOPES,
  };
}

// ── Token Cache (per userId) ───────────────────────────────────────────────

const _tokenCache = new Map<string, AirbnbTokenSet>();
const AIRBNB_REFRESH_BUFFER = 5 * 60 * 1000;   // refresh 5 min before expiry

/**
 * Returns a valid access token for the given userId, refreshing if needed.
 * In production: load tokenSet from DB, not memory — tokens must survive restarts.
 */
export async function getValidAirbnbToken(
  credentials: AirbnbCredentials,
  userId:      string,
): Promise<string> {
  const cached = _tokenCache.get(userId);
  const needsRefresh = !cached || Date.now() >= cached.expiresAt - AIRBNB_REFRESH_BUFFER;

  if (needsRefresh && cached?.refreshToken) {
    const fresh = await refreshAccessToken(credentials, cached.refreshToken);
    _tokenCache.set(userId, fresh);
    return fresh.accessToken;
  }

  if (!cached) throw new AirbnbAuthError(`No token found for userId ${userId} — user must re-authorize`);
  return cached.accessToken;
}

/** Store a tokenSet after initial authorization or manual seeding */
export function storeTokenSet(tokenSet: AirbnbTokenSet): void {
  _tokenCache.set(tokenSet.userId, tokenSet);
}

// ── Calendar Operations ────────────────────────────────────────────────────

/**
 * Pushes an availability block (or unblock) to Airbnb.
 *
 * This is the primary method called by the Overlap Guard broadcast:
 *   • Block  (available=false) → prevents new Instant Book on these dates
 *   • Unblock (available=true) → re-opens the calendar after cancellation
 *
 * Airbnb's calendar_operations endpoint handles both availability AND pricing
 * in a single call, making it more efficient than Booking.com's separate endpoints.
 */
export async function pushAirbnbBlock(
  op:          AirbnbCalendarOperation,
  accessToken: string,
): Promise<void> {
  const body: Record<string, unknown> = {
    listing_id:  op.listingId,
    start_date:  op.dateFrom,
    end_date:    op.dateTo,
    availability: op.available ? 'available' : 'unavailable',
  };

  if (op.nightlyPrice != null) body.daily_price = op.nightlyPrice * 100;  // Airbnb uses cents
  if (op.minNights    != null) body.min_nights  = op.minNights;
  if (op.notes        != null) body.notes       = op.notes;

  const response = await airbnbFetch(
    accessToken,
    `/calendar_operations`,
    { method: 'PUT', body: JSON.stringify(body) },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new AirbnbApiError(`Calendar block failed — HTTP ${response.status}`, response.status, text);
  }
}

/**
 * Pushes a nightly rate update to Airbnb.
 * Called from the Rate Parity Manager "Push" action.
 * Airbnb price is in cents — multiply SAR amount × 100.
 */
export async function pushAirbnbRates(
  listingId:   string,
  dateFrom:    string,
  dateTo:      string,
  nightlySAR:  number,
  minNights:   number,
  accessToken: string,
): Promise<void> {
  const response = await airbnbFetch(
    accessToken,
    `/calendar_operations`,
    {
      method: 'PUT',
      body: JSON.stringify({
        listing_id:  listingId,
        start_date:  dateFrom,
        end_date:    dateTo,
        daily_price: nightlySAR * 100,   // SAR → cents
        min_nights:  minNights,
        availability: 'available',       // rate push keeps dates open
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new AirbnbApiError(`Rate push failed — HTTP ${response.status}`, response.status, text);
  }
}

/**
 * Fetches the calendar for a listing (date range).
 * Used during pre-check to verify Airbnb-side availability before locking.
 */
export async function getAirbnbCalendar(
  listingId:   string,
  dateFrom:    string,
  dateTo:      string,
  accessToken: string,
): Promise<AirbnbCalendarDay[]> {
  const params = new URLSearchParams({ start_date: dateFrom, end_date: dateTo });
  const response = await airbnbFetch(
    accessToken,
    `/listings/${listingId}/calendar?${params}`,
  );

  if (!response.ok) {
    const text = await response.text();
    throw new AirbnbApiError(`Calendar fetch failed — HTTP ${response.status}`, response.status, text);
  }

  const data = await response.json();
  return (data.calendar ?? []) as AirbnbCalendarDay[];
}

// ── Webhook Handling ───────────────────────────────────────────────────────

/**
 * Verifies an incoming Airbnb webhook request using the Web Crypto API.
 *
 * Airbnb signs the raw request body with HMAC-SHA256 using your webhook secret.
 * The signature is in the X-Airbnb-Signature header as a hex digest.
 *
 * Uses globalThis.crypto.subtle — available in browsers and Node.js ≥ 18.
 * IMPORTANT: Pass the RAW request body before JSON.parse; any whitespace
 * difference will cause a signature mismatch.
 *
 * @param rawBody        Raw HTTP body (string)
 * @param signature      Value of X-Airbnb-Signature header (hex string)
 * @param webhookSecret  Your Airbnb webhook signing secret
 * @throws AirbnbWebhookVerificationError if signature does not match
 */
export async function verifyWebhookSignature(
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

  const sigBytes  = await globalThis.crypto.subtle.sign('HMAC', key, enc.encode(rawBody));
  const expected  = Array.from(new Uint8Array(sigBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Constant-time comparison to prevent timing attacks
  if (!timingSafeEqual(expected, signature)) {
    throw new AirbnbWebhookVerificationError(
      `Webhook signature mismatch — possible replay or tampering attempt`,
    );
  }
}

/**
 * Parses a verified webhook payload into a typed AirbnbWebhookEvent.
 * Always call verifyWebhookSignature() first.
 */
export function parseWebhookPayload(rawBody: string): AirbnbWebhookEvent {
  const data = JSON.parse(rawBody);
  return {
    type:      data.type,
    listingId: String(data.listing_id ?? data.data?.listing_id ?? ''),
    data:      data.data ?? {},
    timestamp: data.timestamp ?? new Date().toISOString(),
  };
}

/**
 * Converts a raw Airbnb webhook reservation payload to our AirbnbReservation type.
 */
export function parseReservationFromWebhook(event: AirbnbWebhookEvent): AirbnbReservation {
  const d = event.data as Record<string, unknown>;
  return {
    confirmationCode: String(d.confirmation_code ?? ''),
    listingId:        String(d.listing_id ?? event.listingId),
    guestId:          String(d.guest_id ?? ''),
    guestName:        String(d.guest_first_name ?? '') + ' ' + String(d.guest_last_name ?? ''),
    guestEmail:       String(d.guest_email ?? ''),
    checkIn:          String(d.start_date ?? ''),
    checkOut:         String(d.end_date ?? ''),
    nights:           Number(d.nights ?? 0),
    guestCount:       Number(d.number_of_guests ?? 1),
    totalPayout:      Number(d.expected_payout_amount_accurate ?? 0) / 100,
    currency:         String(d.listing_currency ?? 'SAR'),
    status:           (d.status as AirbnbReservation['status']) ?? 'accepted',
    bookingMethod:    (d.instant_book as boolean) ? 'instant_book' : 'request_to_book',
    createdAt:        String(d.created_at ?? event.timestamp),
    updatedAt:        String(d.updated_at ?? event.timestamp),
  };
}

// ── Inbound Reservation Pull (REST) ────────────────────────────────────────

/**
 * Pulls reservations updated since `sinceTimestamp` (ISO 8601) for a single
 * listing. Use this as the inbound channel — webhooks are the primary path,
 * but a poller on top of pullAirbnbReservations() guarantees no booking is
 * lost during webhook outages or if the property owner has not yet enabled
 * webhook delivery in their Airbnb dashboard.
 *
 * Endpoint: GET /v2/reservations?listing_id=&updated_since=&_limit=
 */
export async function pullAirbnbReservations(
  listingId:      string,
  sinceTimestamp: string,
  accessToken:    string,
  fetchFn:        typeof fetch = fetch,
): Promise<AirbnbReservation[]> {
  const params = new URLSearchParams({
    listing_id:    listingId,
    updated_since: sinceTimestamp,
    _limit:        '100',
  });
  const response = await fetchFn(`${AIRBNB_BASE}/reservations?${params.toString()}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept':        'application/json',
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new AirbnbApiError(`Reservation pull failed — HTTP ${response.status}`, response.status, body);
  }
  const data = await response.json();
  const list = (data.reservations ?? []) as Record<string, unknown>[];
  return list.map(parseReservationRecord);
}

function parseReservationRecord(d: Record<string, unknown>): AirbnbReservation {
  return {
    confirmationCode: String(d.confirmation_code ?? d.id ?? ''),
    listingId:        String(d.listing_id ?? ''),
    guestId:          String(d.guest_id ?? ''),
    guestName:        `${String(d.guest_first_name ?? '')} ${String(d.guest_last_name ?? '')}`.trim(),
    guestEmail:       String(d.guest_email ?? ''),
    checkIn:          String(d.start_date ?? d.check_in ?? ''),
    checkOut:         String(d.end_date ?? d.check_out ?? ''),
    nights:           Number(d.nights ?? 0),
    guestCount:       Number(d.number_of_guests ?? 1),
    totalPayout:      Number(d.expected_payout_amount_accurate ?? 0) / 100,
    currency:         String(d.listing_currency ?? 'SAR'),
    status:           (d.status as AirbnbReservation['status']) ?? 'accepted',
    bookingMethod:    (d.instant_book as boolean) ? 'instant_book' : 'request_to_book',
    createdAt:        String(d.created_at ?? new Date().toISOString()),
    updatedAt:        String(d.updated_at ?? new Date().toISOString()),
  };
}

// ── Inbound Reservation Poller ─────────────────────────────────────────────

export interface AirbnbPollerConfig {
  credentials:    AirbnbCredentials;
  /** Airbnb userId of the property owner — used for the token cache lookup. */
  userId:         string;
  /** Listing IDs to poll. One request per listing per tick. */
  listingIds:     string[];
  /** Callback invoked when reservations arrive. */
  onReservations: (reservations: AirbnbReservation[]) => void;
  /** Optional error sink — defaults to console.error. */
  onError?:       (err: Error) => void;
  /** Polling interval. Default: 120_000 ms (2 min). */
  intervalMs?:    number;
  /** Override fetch (for tests). */
  fetchFn?:       typeof fetch;
}

/**
 * Starts a background poller that calls pullAirbnbReservations for every
 * configured listing on the supplied interval. Returns a `stop()` handle so
 * the caller can tear the poller down on unmount or reconfiguration.
 *
 * Use this when:
 *   • Airbnb webhooks are not yet enabled for the account.
 *   • Belt-and-braces redundancy alongside webhook delivery is desired.
 *   • Operating in environments without a public webhook endpoint
 *     (e.g. local dev, GitHub Pages — which has no inbound HTTP).
 */
export function startAirbnbPoller(cfg: AirbnbPollerConfig): { stop: () => void } {
  const interval = cfg.intervalMs ?? 120_000;
  const fetchFn  = cfg.fetchFn   ?? fetch;
  let lastRunISO = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  let stopped    = false;

  const tick = async () => {
    if (stopped) return;
    try {
      const token = await getValidAirbnbToken(cfg.credentials, cfg.userId);
      const all: AirbnbReservation[] = [];
      for (const listingId of cfg.listingIds) {
        const batch = await pullAirbnbReservations(listingId, lastRunISO, token, fetchFn);
        all.push(...batch);
      }
      lastRunISO = new Date().toISOString();
      if (all.length > 0) cfg.onReservations(all);
    } catch (err) {
      const cb = cfg.onError ?? ((e: Error) => console.error('[airbnb-poller]', e.message));
      cb(err as Error);
    }
  };

  // Fire once immediately, then on interval.
  void tick();
  const handle = setInterval(tick, interval);

  return {
    stop: () => { stopped = true; clearInterval(handle); },
  };
}

// ── iCal Fallback (inbound + outbound) ─────────────────────────────────────

/**
 * Fetches and parses an Airbnb iCal feed (the listing's "Export Calendar" URL).
 * Returns blocked dates as one AirbnbCalendarDay per night so the local
 * registry can pre-populate before the next REST poll.
 *
 * Use this when:
 *   • The owner has shared their Airbnb iCal export URL.
 *   • A cheap, public-safe fallback to the Partner API is needed.
 */
export async function pullAirbnbICal(
  icalUrl: string,
  fetchFn: typeof fetch = fetch,
): Promise<AirbnbCalendarDay[]> {
  const response = await fetchFn(icalUrl);
  if (!response.ok) {
    throw new AirbnbApiError(`iCal fetch failed — HTTP ${response.status}`, response.status, '');
  }
  return parseICalToDays(await response.text());
}

function parseICalToDays(text: string): AirbnbCalendarDay[] {
  const days: AirbnbCalendarDay[] = [];
  const lines = text.split(/\r?\n/);
  let inEvent = false;
  let dtStart = '';
  let dtEnd   = '';

  for (const raw of lines) {
    const line = raw.trim();
    if (line === 'BEGIN:VEVENT') { inEvent = true; dtStart = ''; dtEnd = ''; continue; }
    if (line === 'END:VEVENT') {
      if (dtStart && dtEnd) {
        const start = parseICalYmd(dtStart);
        const end   = parseICalYmd(dtEnd);
        if (start && end) {
          for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
            days.push({ date: d.toISOString().slice(0, 10), available: false, status: 'blocked' });
          }
        }
      }
      inEvent = false;
      continue;
    }
    if (!inEvent) continue;

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const keyPart = line.slice(0, colonIdx);
    const value   = line.slice(colonIdx + 1);

    if (keyPart.startsWith('DTSTART')) dtStart = value;
    else if (keyPart.startsWith('DTEND')) dtEnd = value;
  }

  return days;
}

function parseICalYmd(raw: string): Date | null {
  // Accepts "YYYYMMDD" (date-only) or "YYYYMMDDTHHMMSSZ" (datetime).
  const v = raw.trim();
  if (v.length < 8) return null;
  const yyyy = Number(v.slice(0, 4));
  const mm   = Number(v.slice(4, 6));
  const dd   = Number(v.slice(6, 8));
  if (!Number.isFinite(yyyy) || !Number.isFinite(mm) || !Number.isFinite(dd)) return null;
  return new Date(Date.UTC(yyyy, mm - 1, dd));
}

// ── iCal Outbound (export — unchanged) ─────────────────────────────────────

/**
 * Generates a valid iCal (RFC 5545) string for a list of blocked date ranges.
 * Airbnb polls this URL every ~15 minutes to sync availability.
 *
 * Host this at: GET /api/ical/:unitId
 * Register the URL in your Airbnb listing settings under "Import Calendar".
 *
 * Note: This is the fallback when direct API push is not yet available.
 * The Overlap Guard immediately pushes via pushAirbnbBlock() for near-instant
 * blocking; the iCal export is a safety net for the 15-min polling window.
 */
export function generateICalFeed(
  unitId:       string,
  blockedRanges: Array<{ checkIn: string; checkOut: string; summary?: string }>,
): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//REMS//Real Estate Management System//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:REMS Blocked Dates — ${unitId}`,
  ];

  for (const range of blockedRanges) {
    const uid  = `${unitId}-${range.checkIn}-${range.checkOut}@rems`;
    const dtStamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART;VALUE=DATE:${range.checkIn.replace(/-/g, '')}`,
      `DTEND;VALUE=DATE:${range.checkOut.replace(/-/g, '')}`,
      `SUMMARY:${range.summary ?? 'BLOCKED — booked via another channel'}`,
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function airbnbFetch(
  accessToken: string,
  path:        string,
  options:     RequestInit = {},
): Promise<Response> {
  return fetch(`${AIRBNB_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type':  'application/json',
      'Accept':        'application/json',
      ...(options.headers ?? {}),
    },
  });
}

/** Constant-time string comparison (prevents timing side-channel attacks) */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
