/**
 * Expedia EQC (Expedia QuickConnect) — Availability, Rates & Reservation Service
 * ================================================================================
 * Integrates with the Expedia Partner Solutions EQC API.
 *
 * Protocol: XML over HTTPS (EQC standard).
 * Auth:     HTTP Basic Authentication (username + password from Expedia Partner Central).
 * Base URL: https://services.expediapartnercentral.com/eqc
 *
 * Key endpoints:
 *   /eqc/ar     — Availability update (AR = Avail-Rate request)
 *   /eqc/parr   — Product, Availability, Rate update (PARR)
 *   /eqc/br     — Booking retrieval (BR)
 *   /eqc/ping   — Connection check
 *
 * Rate limits: 100 requests/minute per hotel. Retry on 429 with Retry-After header.
 *
 * Docs: https://developers.expediagroup.com/docs/products/expedia-partner-solutions/eqc
 *
 * IMPORTANT: No `node:` built-ins — bundled for the browser via Next.js static export.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface ExpediaCredentials {
  username:  string;   // EQC API username from Expedia Partner Central
  password:  string;   // EQC API password
  hotelId:   string;   // Expedia Hotel ID (numeric string)
}

export interface ExpediaBlockRequest {
  credentials: ExpediaCredentials;
  roomTypeId:  string;  // Expedia Room Type ID
  ratePlanId:  string;  // Expedia Rate Plan ID (e.g. '155775061')
  dateFrom:    string;  // YYYY-MM-DD (inclusive)
  dateTo:      string;  // YYYY-MM-DD (exclusive — last blocked night + 1)
  available:   boolean;
  count?:      number;  // number of rooms; 0 = fully closed (default when available=false)
}

export interface ExpediaRateRequest {
  credentials: ExpediaCredentials;
  roomTypeId:  string;
  ratePlanId:  string;
  dateFrom:    string;
  dateTo:      string;
  nightlyRate: number;  // SAR — EQC uses SAR natively for Saudi properties
  minStay?:    number;
  maxStay?:    number;
}

export interface ExpediaReservation {
  bookingId:       string;    // Expedia booking ref (e.g. 'EXP-2026-XXXXXXX')
  hotelId:         string;
  roomTypeId:      string;
  ratePlanId:      string;
  guestFirstName:  string;
  guestLastName:   string;
  guestCountry:    string;
  checkIn:         string;    // YYYY-MM-DD
  checkOut:        string;    // YYYY-MM-DD
  nights:          number;
  adults:          number;
  children:        number;
  totalAmountSAR:  number;
  status:          'pending' | 'confirmed' | 'cancelled' | 'modified';
  bookedAt:        string;    // ISO 8601
  specialRequests?: string;
}

export interface ExpediaPollerConfig {
  credentials:    ExpediaCredentials;
  onReservations: (reservations: ExpediaReservation[]) => void;
  onError?:       (err: Error) => void;
  intervalMs?:    number;     // default: 120_000 (2 minutes)
  fetchFn?:       typeof fetch;
}

// ── Constants ──────────────────────────────────────────────────────────────

const EQC_BASE_URL     = 'https://services.expediapartnercentral.com/eqc';
const DEFAULT_POLL_MS  = 120_000;
const EQC_NAMESPACE    = 'http://www.expedia.com/EQC/AR/2011/06';

// localStorage key for persisting credentials
const EXPEDIA_CREDS_KEY = 'rems-expedia-creds';

// ── Credential localStorage helpers ───────────────────────────────────────

export function getExpediaCredentials(): Partial<ExpediaCredentials> {
  try {
    const raw = localStorage.getItem(EXPEDIA_CREDS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
export function setExpediaCredentials(creds: ExpediaCredentials): void {
  try { localStorage.setItem(EXPEDIA_CREDS_KEY, JSON.stringify(creds)); } catch { /* noop */ }
}
export function clearExpediaCredentials(): void {
  try { localStorage.removeItem(EXPEDIA_CREDS_KEY); } catch { /* noop */ }
}

// ── Error classes ──────────────────────────────────────────────────────────

export class ExpediaAuthError extends Error {
  constructor(msg = 'Expedia EQC credentials are invalid') { super(msg); this.name = 'ExpediaAuthError'; }
}
export class ExpediaRateLimitError extends Error {
  constructor(retryAfter?: number) {
    super(`Expedia EQC rate limit exceeded${retryAfter ? ` — retry after ${retryAfter}s` : ''}`);
    this.name = 'ExpediaRateLimitError';
  }
}
export class ExpediaPropertyNotFoundError extends Error {
  constructor(msg = 'Expedia hotel or room type not found') { super(msg); this.name = 'ExpediaPropertyNotFoundError'; }
}

// ── Basic Auth header helper ───────────────────────────────────────────────

function makeBasicAuth(username: string, password: string): string {
  // btoa is safe here — credentials are ASCII strings from Partner Central
  return `Basic ${btoa(`${username}:${password}`)}`;
}

// ── XML Builders ───────────────────────────────────────────────────────────

/**
 * buildAvailabilityUpdateXml — produces an EQC AR (Availability-Rate) request.
 *
 * Closes or opens dates for a specific room type.
 *   status="Open"   → available=true  (count rooms available)
 *   status="Close"  → available=false (stop sell — 0 rooms)
 */
export function buildAvailabilityUpdateXml(req: ExpediaBlockRequest): string {
  const status     = req.available ? 'Open'  : 'Close';
  const count      = req.available ? (req.count ?? 1) : 0;

  return `<?xml version="1.0" encoding="UTF-8"?>
<AvailRateUpdateRQ xmlns="${EQC_NAMESPACE}">
  <Authentication username="${req.credentials.username}" password="${req.credentials.password}"/>
  <Hotel id="${req.credentials.hotelId}"/>
  <AvailRateUpdate>
    <DateRange from="${req.dateFrom}" to="${req.dateTo}"/>
    <RoomType id="${req.roomTypeId}" closed="${req.available ? 'false' : 'true'}">
      <Inventory totalInventoryAvailable="${count}"/>
      <RatePlan id="${req.ratePlanId}" status="${status}">
        <Availability>
          <Status>
            <StatusApplicationControl Mon="true" Tue="true" Wed="true"
              Thu="true" Fri="true" Sat="true" Sun="true"/>
            <OpenStatus>${status}</OpenStatus>
          </Status>
        </Availability>
      </RatePlan>
    </RoomType>
  </AvailRateUpdate>
</AvailRateUpdateRQ>`;
}

/**
 * buildRateUpdateXml — produces an EQC PARR (Product, Availability, Rate) request.
 *
 * Updates nightly base rates for a room type over a date range.
 * Optionally sets minimum and maximum stay restrictions.
 */
export function buildRateUpdateXml(req: ExpediaRateRequest): string {
  const minStayNode = req.minStay !== undefined
    ? `\n        <MinLOS value="${req.minStay}"/>`
    : '';
  const maxStayNode = req.maxStay !== undefined
    ? `\n        <MaxLOS value="${req.maxStay}"/>`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<AvailRateUpdateRQ xmlns="${EQC_NAMESPACE}">
  <Authentication username="${req.credentials.username}" password="${req.credentials.password}"/>
  <Hotel id="${req.credentials.hotelId}"/>
  <AvailRateUpdate>
    <DateRange from="${req.dateFrom}" to="${req.dateTo}"/>
    <RoomType id="${req.roomTypeId}">
      <RatePlan id="${req.ratePlanId}" status="Open">
        <Rate currency="SAR">
          <BaseRate amount="${req.nightlyRate.toFixed(2)}"/>${minStayNode}${maxStayNode}
        </Rate>
      </RatePlan>
    </RoomType>
  </AvailRateUpdate>
</AvailRateUpdateRQ>`;
}

/**
 * buildBookingRetrievalXml — produces an EQC BR request.
 *
 * Retrieves all unacknowledged bookings for a hotel.
 * Expedia holds unacknowledged bookings for 14 days max.
 */
export function buildBookingRetrievalXml(
  credentials: ExpediaCredentials,
  since?: string,
): string {
  const sinceNode = since
    ? `\n  <BookingDateFilter start="${since}" end="${new Date().toISOString()}"/>`
    : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<BookingRetrievalRQ xmlns="http://www.expedia.com/EQC/BR/2014/01">
  <Authentication username="${credentials.username}" password="${credentials.password}"/>
  <Hotel id="${credentials.hotelId}"/>${sinceNode}
  <ReservationStatusFilter status="pending,confirmed,modified"/>
</BookingRetrievalRQ>`;
}

/**
 * buildBookingAckXml — produces an EQC BA (Booking Acknowledgement) request.
 *
 * Must be sent within 5 minutes of receipt for each booking.
 * Failure to acknowledge causes Expedia to retry delivery.
 */
export function buildBookingAckXml(
  credentials: ExpediaCredentials,
  expediaBookingId: string,
  internalId: string,
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<BookingConfirmRQ xmlns="http://www.expedia.com/EQC/BC/2014/01">
  <Authentication username="${credentials.username}" password="${credentials.password}"/>
  <Hotel id="${credentials.hotelId}"/>
  <BookingConfirmNumbers>
    <BookingConfirmNumber bookingId="${expediaBookingId}"
      bookingType="Book"
      confirmNumber="${internalId}"
      confirmTime="${new Date().toISOString()}"/>
  </BookingConfirmNumbers>
</BookingConfirmRQ>`;
}

// ── EQC HTTP Transport ─────────────────────────────────────────────────────

async function eqcPost(
  endpoint: 'ar' | 'br' | 'bc' | 'ping',
  credentials: ExpediaCredentials,
  xmlBody: string,
  fetchFn: typeof fetch = globalThis.fetch,
): Promise<string> {
  const url = `${EQC_BASE_URL}/${endpoint}`;

  const res = await fetchFn(url, {
    method:  'POST',
    headers: {
      'Content-Type':  'text/xml; charset=UTF-8',
      'Authorization': makeBasicAuth(credentials.username, credentials.password),
    },
    body: xmlBody,
  });

  if (res.status === 401 || res.status === 403) throw new ExpediaAuthError();
  if (res.status === 404) throw new ExpediaPropertyNotFoundError();
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('Retry-After') ?? 60);
    throw new ExpediaRateLimitError(retryAfter);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Expedia EQC error ${res.status}: ${text.slice(0, 300)}`);
  }

  return res.text();
}

// ── High-Level Operations ──────────────────────────────────────────────────

/**
 * pushExpediaBlock — push an availability open/close to Expedia EQC.
 *
 * POST /eqc/ar with an AR XML payload.
 * available=false → status="Close", inventory=0
 * available=true  → status="Open",  inventory=count (default: 1)
 */
export async function pushExpediaBlock(
  req: ExpediaBlockRequest,
  fetchFn: typeof fetch = globalThis.fetch,
): Promise<void> {
  const xml = buildAvailabilityUpdateXml(req);
  await eqcPost('ar', req.credentials, xml, fetchFn);
}

/**
 * pushExpediaRates — push nightly rates to Expedia EQC.
 *
 * POST /eqc/ar with a rate-update AR XML payload.
 */
export async function pushExpediaRates(
  req: ExpediaRateRequest,
  fetchFn: typeof fetch = globalThis.fetch,
): Promise<void> {
  const xml = buildRateUpdateXml(req);
  await eqcPost('ar', req.credentials, xml, fetchFn);
}

/**
 * pingExpediaEqc — verify the EQC connection is live.
 *
 * POST /eqc/ping — Expedia returns an empty success response.
 * Useful for health checks and credential validation.
 */
export async function pingExpediaEqc(
  credentials: ExpediaCredentials,
  fetchFn: typeof fetch = globalThis.fetch,
): Promise<void> {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<PingRQ xmlns="http://www.expedia.com/EQC/Ping/2014/01">
  <Authentication username="${credentials.username}" password="${credentials.password}"/>
</PingRQ>`;
  await eqcPost('ping', credentials, xml, fetchFn);
}

/**
 * pullExpediaReservations — retrieve unacknowledged reservations via polling.
 *
 * POST /eqc/br with a BookingRetrievalRQ payload.
 * Returns parsed reservation objects from the XML response.
 *
 * In production: parse the EQC BR XML response properly with a DOM parser.
 * Here we extract key fields with a lightweight regex-based parser that avoids
 * importing any node: XML libraries (static export constraint).
 */
export async function pullExpediaReservations(
  credentials: ExpediaCredentials,
  since?: string,
  fetchFn: typeof fetch = globalThis.fetch,
): Promise<ExpediaReservation[]> {
  const xml     = buildBookingRetrievalXml(credentials, since);
  const resXml  = await eqcPost('br', credentials, xml, fetchFn);

  // Lightweight XML extraction — no node: xml parsers allowed in static export
  return extractReservationsFromXml(resXml, credentials.hotelId);
}

/**
 * acknowledgeExpediaReservation — confirm receipt of a booking.
 *
 * POST /eqc/bc with a BookingConfirmRQ payload.
 * Must be sent within 5 minutes of receiving the reservation.
 */
export async function acknowledgeExpediaReservation(
  credentials: ExpediaCredentials,
  expediaBookingId: string,
  internalId: string,
  fetchFn: typeof fetch = globalThis.fetch,
): Promise<void> {
  const xml = buildBookingAckXml(credentials, expediaBookingId, internalId);
  await eqcPost('bc', credentials, xml, fetchFn);
}

// ── Background Poller ──────────────────────────────────────────────────────

/**
 * startExpediaPoller — start a background polling loop for EQC bookings.
 *
 * Polls every `intervalMs` milliseconds (default: 120s).
 * Returns a handle with `stop()` for cleanup on component unmount.
 */
export function startExpediaPoller(config: ExpediaPollerConfig): { stop: () => void } {
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
      const result = await pullExpediaReservations(config.credentials, since, fetchFn);
      if (result.length > 0) config.onReservations(result);
    } catch (err) {
      config.onError?.(err as Error);
    } finally {
      if (!stopped) timerId = setTimeout(poll, interval);
    }
  };

  timerId = setTimeout(poll, 2_000);

  return {
    stop: () => {
      stopped = true;
      if (timerId !== null) clearTimeout(timerId);
    },
  };
}

// ── XML Response Parser ────────────────────────────────────────────────────

/**
 * Lightweight regex-based EQC BR response parser.
 *
 * Avoids any node: DOM parsers — compatible with static export.
 * For production: use a proper XML parser (e.g. fast-xml-parser).
 */
function extractReservationsFromXml(xml: string, hotelId: string): ExpediaReservation[] {
  const reservations: ExpediaReservation[] = [];

  // Each booking is wrapped in a <Booking> element
  const bookingMatches = [...xml.matchAll(/<Booking[^>]*>([\s\S]*?)<\/Booking>/g)];

  for (const match of bookingMatches) {
    const inner = match[1];

    const get = (tag: string): string =>
      (inner.match(new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`))?.[1] ?? '').trim();
    const attr = (element: string, attr: string): string =>
      (inner.match(new RegExp(`<${element}[^>]*\\s${attr}="([^"]*)"`)) ?? [])[1] ?? '';

    const bookingId   = attr('Booking', 'id') || attr('BookingConfirmNumber', 'bookingId') || get('BookingId');
    const roomTypeId  = attr('RoomType', 'id')  || get('RoomTypeId');
    const ratePlanId  = attr('RatePlan', 'id')  || get('RatePlanId');
    const checkIn     = attr('StayDate', 'arrival')   || get('CheckIn');
    const checkOut    = attr('StayDate', 'departure')  || get('CheckOut');
    const nights      = Number(attr('StayDate', 'lengthOfStay') || get('Nights') || '0');
    const adults      = Number(attr('Guest', 'adults')    || get('Adults')  || '1');
    const children    = Number(attr('Guest', 'children')  || get('Children') || '0');
    const total       = Number(get('TotalAmount') || get('Amount') || '0');
    const status      = (get('Status') || 'pending').toLowerCase() as ExpediaReservation['status'];
    const firstName   = attr('PrimaryGuest', 'firstName') || get('FirstName');
    const lastName    = attr('PrimaryGuest', 'lastName')  || get('LastName');
    const country     = attr('PrimaryGuest', 'country')   || get('CountryCode') || 'SA';
    const bookedAt    = get('BookedAt') || get('CreateDateTime') || new Date().toISOString();

    if (!bookingId) continue;

    reservations.push({
      bookingId:       `EXP-${bookingId}`,
      hotelId,
      roomTypeId,
      ratePlanId,
      guestFirstName:  firstName,
      guestLastName:   lastName,
      guestCountry:    country,
      checkIn,
      checkOut,
      nights,
      adults,
      children,
      totalAmountSAR:  total,
      status,
      bookedAt,
    });
  }

  return reservations;
}
