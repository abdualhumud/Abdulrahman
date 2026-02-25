/**
 * Booking.com Connectivity API Service
 * ======================================
 * Protocol  : OTA 2003B + B.XML (Booking.com proprietary extension)
 * Auth      : Token-based OAuth 2.0 Client Credentials (sunset of
 *             credential-based auth: 31 Dec 2025)
 * Base URLs :
 *   Auth    — https://connectivity-authentication.booking.com
 *   XML     — https://supply-xml.booking.com         (non-PCI, all non-reservation calls)
 *   XML/PCI — https://secure-supply-xml.booking.com  (reservation retrieval & ACK)
 *
 * In production this module runs on a Node.js/serverless backend.
 * The static Next.js frontend calls these functions via internal API routes
 * (e.g. /api/booking-com/*) — never exposing credentials to the browser.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface BookingComCredentials {
  /** OAuth Client ID — from Connectivity Portal machine account */
  clientId: string;
  /** OAuth Client Secret — from Connectivity Portal machine account */
  clientSecret: string;
  /** Provider ID assigned by Booking.com to the channel manager */
  providerId: string;
  /** Machine account ID tied to the properties being managed */
  machineAccountId: string;
}

export interface BookingComToken {
  accessToken: string;
  /** Unix timestamp (ms) after which the token is invalid */
  expiresAt: number;
  providerId: string;
  machineAccountId: string;
}

export interface AvailabilityBlock {
  /** Booking.com HotelCode (maps to internal unitId) */
  hotelId: string;
  /** Room type code within the property */
  roomTypeId: string;
  /** Inclusive start date — YYYY-MM-DD */
  dateFrom: string;
  /** Exclusive end date — YYYY-MM-DD (checkout date) */
  dateTo: string;
  /** false = block all inventory (0 units available) */
  available: boolean;
  /** Number of units still available; 0 when available=false */
  count: number;
}

export interface RatePlan {
  hotelId: string;
  roomTypeId: string;
  /** Booking.com rate plan code (e.g. 'BAR', 'NRF') */
  ratePlanCode: string;
  dateFrom: string;
  dateTo: string;
  amountBeforeTax: number;
  currencyCode: 'SAR';
  minStay?: number;
}

export interface BookingComReservation {
  bookingId: string;
  status: 'new' | 'modified' | 'cancelled';
  hotelId: string;
  roomTypeId: string;
  guestName: string;
  guestEmail: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalAmount: number;
  currency: string;
  /** Original Booking.com reservation number */
  channelBookingId: string;
  createdAt: string;
}

// ── Errors ─────────────────────────────────────────────────────────────────

export class BookingComAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BookingComAuthError';
  }
}

export class BookingComApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody: string,
  ) {
    super(message);
    this.name = 'BookingComApiError';
  }
}

// ── Endpoints ──────────────────────────────────────────────────────────────

const AUTH_ENDPOINT      = 'https://connectivity-authentication.booking.com/token-based-authentication/exchange';
const SUPPLY_XML_BASE    = 'https://supply-xml.booking.com';
const SECURE_XML_BASE    = 'https://secure-supply-xml.booking.com';

// ── Token Cache (server-side singleton) ────────────────────────────────────

/** Cached access token. In production: store per machine-account in Redis. */
let _cachedToken: BookingComToken | null = null;
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;  // refresh 5 min before expiry

/**
 * Step 1 of the API handshake — exchange client credentials for a bearer token.
 *
 * • Token TTL  : 1 hour
 * • Rate limit : max 30 tokens/hour per client_id
 * • The token payload includes: machine_account_id, provider_id, client_id
 */
export async function exchangeToken(
  credentials: BookingComCredentials,
): Promise<BookingComToken> {
  const response = await fetch(AUTH_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     credentials.clientId,
      client_secret: credentials.clientSecret,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new BookingComAuthError(
      `Token exchange failed — HTTP ${response.status}: ${body}`,
    );
  }

  const data = await response.json();
  return {
    accessToken:      data.access_token,
    expiresAt:        Date.now() + (data.expires_in ?? 3600) * 1000,
    providerId:       credentials.providerId,
    machineAccountId: credentials.machineAccountId,
  };
}

/** Returns a valid cached token, refreshing if needed. */
async function getValidToken(credentials: BookingComCredentials): Promise<string> {
  const needsRefresh =
    !_cachedToken ||
    Date.now() >= _cachedToken.expiresAt - TOKEN_REFRESH_BUFFER_MS;

  if (needsRefresh) {
    _cachedToken = await exchangeToken(credentials);
  }
  return _cachedToken!.accessToken;
}

// ── XML Builders (OTA 2003B) ───────────────────────────────────────────────

/**
 * OTA_HotelAvailNotifRQ — Push inventory availability to Booking.com.
 *
 * Set available=false (count=0) immediately after a booking is confirmed
 * on ANY channel to close the calendar and prevent double-bookings.
 */
export function buildAvailNotifXml(block: AvailabilityBlock): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<OTA_HotelAvailNotifRQ
  xmlns="http://www.opentravel.org/OTA/2003/05"
  EchoToken="${generateEchoToken()}"
  TimeStamp="${new Date().toISOString()}"
  Target="Production"
  Version="2.001">
  <AvailStatusMessages HotelCode="${block.hotelId}">
    <AvailStatusMessage BookingLimit="${block.count}">
      <StatusApplicationControl
        Start="${block.dateFrom}"
        End="${block.dateTo}"
        RoomTypeCode="${block.roomTypeId}"
        InvTypeCode="${block.roomTypeId}"
      />
      <RestrictionStatus
        Restriction="Master"
        Status="${block.available ? 'Open' : 'Close'}"
      />
    </AvailStatusMessage>
  </AvailStatusMessages>
</OTA_HotelAvailNotifRQ>`;
}

/**
 * OTA_HotelRatePlanNotifRQ — Push nightly rate updates to Booking.com.
 * Called from the Rate Parity Manager "Push" action.
 */
export function buildRatePlanNotifXml(rate: RatePlan): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<OTA_HotelRatePlanNotifRQ
  xmlns="http://www.opentravel.org/OTA/2003/05"
  EchoToken="${generateEchoToken()}"
  TimeStamp="${new Date().toISOString()}"
  Target="Production"
  Version="2.001">
  <RatePlans HotelCode="${rate.hotelId}">
    <RatePlan
      RatePlanCode="${rate.ratePlanCode}"
      Start="${rate.dateFrom}"
      End="${rate.dateTo}"
      CurrencyCode="${rate.currencyCode}"
      ${rate.minStay != null ? `MinStay="${rate.minStay}"` : ''}>
      <Rates>
        <Rate InvTypeCode="${rate.roomTypeId}">
          <BaseByGuestAmts>
            <BaseByGuestAmt
              AmountBeforeTax="${rate.amountBeforeTax}"
              CurrencyCode="${rate.currencyCode}"
            />
          </BaseByGuestAmts>
        </Rate>
      </Rates>
    </RatePlan>
  </RatePlans>
</OTA_HotelRatePlanNotifRQ>`;
}

/**
 * OTA_ReadRQ — Pull undelivered reservations from Booking.com.
 * MUST use the PCI-compliant secure endpoint (SECURE_XML_BASE).
 * Trigger: webhook push (preferred) OR polling fallback every 60–120 s.
 */
export function buildReadReservationsXml(
  hotelId: string,
  afterTimestamp: string,
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<OTA_ReadRQ
  xmlns="http://www.opentravel.org/OTA/2003/05"
  EchoToken="${generateEchoToken()}"
  TimeStamp="${new Date().toISOString()}"
  Target="Production"
  Version="2.001">
  <ReadRequests>
    <HotelReadRequest HotelCode="${hotelId}">
      <SelectionCriteria
        SelectionType="Undelivered"
        Start="${afterTimestamp}"
      />
    </HotelReadRequest>
  </ReadRequests>
</OTA_ReadRQ>`;
}

/**
 * OTA_HotelResNotifRQ — Acknowledge receipt of a reservation.
 * Booking.com requires this within 5 minutes of delivering a reservation,
 * otherwise it retries delivery and may cause duplicate processing.
 */
export function buildReservationAckXml(
  hotelId: string,
  channelBookingId: string,
  internalBookingId: string,
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<OTA_HotelResNotifRQ
  xmlns="http://www.opentravel.org/OTA/2003/05"
  EchoToken="${generateEchoToken()}"
  TimeStamp="${new Date().toISOString()}"
  Target="Production"
  Version="2.001"
  ResStatus="Commit">
  <HotelReservations>
    <HotelReservation>
      <UniqueID Type="14" ID="${channelBookingId}"   ID_Context="Booking.com" />
      <UniqueID Type="14" ID="${internalBookingId}"  ID_Context="REMS" />
      <ResGlobalInfo>
        <HotelReservationIDs>
          <HotelReservationID ResID_Source="${hotelId}" ResID_Type="3" />
        </HotelReservationIDs>
      </ResGlobalInfo>
    </HotelReservation>
  </HotelReservations>
</OTA_HotelResNotifRQ>`;
}

// ── HTTP Transport ─────────────────────────────────────────────────────────

async function postXml(
  endpoint: string,
  xmlBody: string,
  token: string,
): Promise<string> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type':  'text/xml; charset=utf-8',
      'Authorization': `Bearer ${token}`,
      'Accept':        'text/xml',
    },
    body: xmlBody,
  });

  const body = await response.text();

  if (!response.ok) {
    throw new BookingComApiError(
      `Booking.com API error — HTTP ${response.status}`,
      response.status,
      body,
    );
  }

  return body;
}

// ── High-Level Actions ─────────────────────────────────────────────────────

/**
 * Pushes an availability block to Booking.com.
 * Call this immediately after a booking is confirmed on ANY channel
 * to prevent double-booking of the same unit.
 *
 * Example — booking confirmed on Gathern for unit U1, 2026-03-01 → 2026-03-05:
 *   await pushAvailabilityBlock(creds, {
 *     hotelId: 'U1', roomTypeId: 'U1',
 *     dateFrom: '2026-03-01', dateTo: '2026-03-05',
 *     available: false, count: 0,
 *   });
 */
export async function pushAvailabilityBlock(
  credentials: BookingComCredentials,
  block: AvailabilityBlock,
): Promise<void> {
  const token    = await getValidToken(credentials);
  const xml      = buildAvailNotifXml(block);
  const endpoint = `${SUPPLY_XML_BASE}/ota/OTA_HotelAvailNotifRQ`;
  await postXml(endpoint, xml, token);
}

/**
 * Pushes nightly rate updates to Booking.com.
 * Triggered by the Rate Parity Manager "Push" button.
 */
export async function pushRatePlan(
  credentials: BookingComCredentials,
  rate: RatePlan,
): Promise<void> {
  const token    = await getValidToken(credentials);
  const xml      = buildRatePlanNotifXml(rate);
  const endpoint = `${SUPPLY_XML_BASE}/ota/OTA_HotelRatePlanNotifRQ`;
  await postXml(endpoint, xml, token);
}

/**
 * Retrieves undelivered reservations from Booking.com (PCI endpoint).
 * Returns raw OTA XML — parse with DOMParser or xml2js on the server.
 *
 * Call this:
 *   1. On webhook trigger (push model, near-instant)
 *   2. As a polling fallback every 60–120 seconds
 */
export async function pullReservations(
  credentials: BookingComCredentials,
  hotelId: string,
  afterTimestamp: string,
): Promise<string> {
  const token    = await getValidToken(credentials);
  const xml      = buildReadReservationsXml(hotelId, afterTimestamp);
  const endpoint = `${SECURE_XML_BASE}/ota/OTA_ReadRQ`;
  return await postXml(endpoint, xml, token);
}

/**
 * Acknowledges a reservation to Booking.com.
 * Must be called within 5 minutes of receiving a new/modified booking.
 */
export async function acknowledgeReservation(
  credentials: BookingComCredentials,
  hotelId: string,
  channelBookingId: string,
  internalBookingId: string,
): Promise<void> {
  const token    = await getValidToken(credentials);
  const xml      = buildReservationAckXml(hotelId, channelBookingId, internalBookingId);
  const endpoint = `${SECURE_XML_BASE}/ota/OTA_HotelResNotifRQ`;
  await postXml(endpoint, xml, token);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function generateEchoToken(): string {
  return `REMS-${Date.now()}-${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
}
