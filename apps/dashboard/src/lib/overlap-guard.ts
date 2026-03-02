/**
 * Overlap Guard — Cross-Channel Booking Lock & Availability Engine
 * =================================================================
 * Prevents double-bookings (overlaps) when simultaneous reservation
 * requests arrive from multiple OTA channels (Booking.com, Airbnb,
 * Gathern, Agoda, Expedia, Direct).
 *
 * Architecture
 * ────────────
 *   ┌─────────────────────────────────────────────────────┐
 *   │ Booking request (any channel)                        │
 *   │        │                                             │
 *   │   [1] acquireLock(unitId, dates)                     │
 *   │        │  ← exclusive, TTL = 10 s                    │
 *   │        │  ← spins up to 5 s waiting for lock         │
 *   │        │                                             │
 *   │   [2] checkAvailability(unitId, dates)               │
 *   │        │  ← scans master booking registry            │
 *   │        │  ← O(n) — replace with DB index in prod     │
 *   │        │                                             │
 *   │   [3] commit to master registry                      │
 *   │        │                                             │
 *   │   [4] releaseLock()                                  │
 *   │        │                                             │
 *   │   [5] broadcastBlock() to all other channels         │
 *   │        ├── Booking.com → OTA_HotelAvailNotifRQ       │
 *   │        ├── Gathern     → PUT /units/:id/availability  │
 *   │        ├── Airbnb      → iCal feed regeneration       │
 *   │        ├── Agoda       → PATCH /calendar (REST/JSON)  │
 *   │        └── Expedia     → POST /eqc/ar (EQC XML)       │
 *   └─────────────────────────────────────────────────────┘
 *
 * Production notes
 * ────────────────
 * • Replace the in-memory Map with Redis SET key value NX PX <ttl>
 *   for distributed lock safety across multiple app instances.
 * • Replace _bookings Map with a PostgreSQL/Supabase query for
 *   date-range overlap:
 *     WHERE unit_id = $1 AND check_in < $3 AND check_out > $2
 */

import type { BookingComCredentials } from './booking-com-service';
import { pushAvailabilityBlock }      from './booking-com-service';
import { pushGathernBlock }           from './gathern-service';
import { pushAgodaBlock }             from './agoda-service';
import { pushExpediaBlock }           from './expedia-service';
import type { ExpediaCredentials }    from './expedia-service';

// ── Types ──────────────────────────────────────────────────────────────────

export type ChannelId = 'Booking.com' | 'Airbnb' | 'Gathern' | 'Agoda' | 'Expedia' | 'Direct';

export interface DateRange {
  checkIn:  string;   // YYYY-MM-DD (inclusive)
  checkOut: string;   // YYYY-MM-DD (exclusive — guest departs this day)
}

export interface ConfirmedBooking extends DateRange {
  internalId:  string;
  unitId:      string;
  channel:     ChannelId;
  guestName:   string;
  amount:      number;
  confirmedAt: number;   // Unix timestamp (ms)
}

export interface LockHandle {
  /** Unique token; must match to release the lock */
  token:      string;
  unitId:     string;
  checkIn:    string;
  checkOut:   string;
  acquiredAt: number;
  expiresAt:  number;
}

export type AvailabilityResult =
  | { available: true }
  | { available: false; conflictingBooking: ConfirmedBooking };

export type BookingResult =
  | { success: true;  booking: ConfirmedBooking }
  | { success: false; reason: 'LOCK_TIMEOUT' | 'DATES_UNAVAILABLE' | 'LOCK_EXPIRED' };

export interface SyncCredentials {
  bookingCom?:   BookingComCredentials;
  gathernApiKey?: string;
  agodaApiKey?:  string;
  agodaPropertyId?: string;
  expedia?:      ExpediaCredentials;
}

// ── In-Memory Store ────────────────────────────────────────────────────────
// Production: replace with Redis (locks) + PostgreSQL (bookings)

/** Active locks: key = `${unitId}::${checkIn}::${checkOut}` */
const _locks    = new Map<string, LockHandle>();

/** Confirmed bookings master registry: key = internalBookingId */
const _bookings = new Map<string, ConfirmedBooking>();

// ── Constants ──────────────────────────────────────────────────────────────

const LOCK_TTL_MS          = 10_000;   // 10 s max per booking transaction
const LOCK_POLL_INTERVAL   = 50;       // ms between retry attempts
const LOCK_WAIT_TIMEOUT    = 5_000;    // 5 s max wait to acquire lock

// ── Availability Check ─────────────────────────────────────────────────────

/**
 * Checks the master booking registry for any confirmed booking that
 * overlaps with the requested date range.
 *
 * Overlap condition (half-open intervals):
 *   NOT (reqOut <= bookedIn  OR  reqIn >= bookedOut)
 *
 * i.e. the ranges overlap if the requested checkout is after the booked
 * check-in AND the requested check-in is before the booked checkout.
 */
export function checkAvailability(
  unitId: string,
  range:  DateRange,
): AvailabilityResult {
  const reqIn  = new Date(range.checkIn).getTime();
  const reqOut = new Date(range.checkOut).getTime();

  for (const booking of _bookings.values()) {
    if (booking.unitId !== unitId) continue;

    const bookedIn  = new Date(booking.checkIn).getTime();
    const bookedOut = new Date(booking.checkOut).getTime();

    const overlaps = !(reqOut <= bookedIn || reqIn >= bookedOut);
    if (overlaps) {
      return { available: false, conflictingBooking: booking };
    }
  }

  return { available: true };
}

// ── Lock Engine ────────────────────────────────────────────────────────────

/**
 * Acquires an exclusive lock on (unitId + date range).
 *
 * Spins in a polling loop until:
 *   a) The lock becomes available → returns LockHandle
 *   b) LOCK_WAIT_TIMEOUT elapses → returns null (caller must reject booking)
 *
 * Expired locks are cleaned up on each poll iteration.
 *
 * Production: replace spin-loop with Redis SET key token NX PX 10000
 * (atomic compare-and-set, no polling overhead).
 */
export async function acquireLock(
  unitId: string,
  range:  DateRange,
): Promise<LockHandle | null> {
  const lockKey = makeLockKey(unitId, range);
  const token   = `lk-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const deadline = Date.now() + LOCK_WAIT_TIMEOUT;

  while (Date.now() < deadline) {
    const existing = _locks.get(lockKey);

    // Evict expired lock (safety net for crashed processes)
    if (existing && Date.now() > existing.expiresAt) {
      _locks.delete(lockKey);
    }

    if (!_locks.has(lockKey)) {
      const handle: LockHandle = {
        token,
        unitId,
        checkIn:    range.checkIn,
        checkOut:   range.checkOut,
        acquiredAt: Date.now(),
        expiresAt:  Date.now() + LOCK_TTL_MS,
      };
      _locks.set(lockKey, handle);
      return handle;
    }

    await sleep(LOCK_POLL_INTERVAL);
  }

  return null;  // timed out
}

/**
 * Releases a lock.
 * Token comparison prevents a slow request from releasing a lock
 * that was re-acquired by a faster concurrent request.
 */
export function releaseLock(handle: LockHandle): void {
  const lockKey = makeLockKey(handle.unitId, handle);
  const stored  = _locks.get(lockKey);
  if (stored && stored.token === handle.token) {
    _locks.delete(lockKey);
  }
}

// ── Full Booking Transaction ───────────────────────────────────────────────

/**
 * processBookingRequest — atomic booking with overlap protection.
 *
 * This is the single entry point for ALL incoming booking requests,
 * regardless of origin channel.
 *
 * Steps:
 *   1. acquireLock        — blocks all concurrent requests for same unit+dates
 *   2. checkAvailability  — rejects if master registry has a conflict
 *   3. commit to registry — writes the booking atomically
 *   4. releaseLock        — allows next request to proceed
 *   5. broadcastBlock     — pushes "unavailable" to all OTHER channels
 *
 * @param request  Booking details (without internalId and confirmedAt)
 * @param creds    API credentials for Booking.com and Gathern (optional in
 *                 demo mode — broadcast is skipped if not provided)
 */
export async function processBookingRequest(
  request: Omit<ConfirmedBooking, 'internalId' | 'confirmedAt'>,
  creds?: SyncCredentials,
): Promise<BookingResult> {
  const range: DateRange = {
    checkIn:  request.checkIn,
    checkOut: request.checkOut,
  };

  // ── Step 1: Acquire exclusive lock ────────────────────────────────────
  const lock = await acquireLock(request.unitId, range);
  if (!lock) {
    return { success: false, reason: 'LOCK_TIMEOUT' };
  }

  try {
    // ── Step 2: Safety — verify lock hasn't expired during wait ─────────
    if (Date.now() > lock.expiresAt) {
      return { success: false, reason: 'LOCK_EXPIRED' };
    }

    // ── Step 3: Check master registry for date conflicts ─────────────────
    const avail = checkAvailability(request.unitId, range);
    if (!avail.available) {
      return { success: false, reason: 'DATES_UNAVAILABLE' };
    }

    // ── Step 4: Commit booking to master registry ─────────────────────────
    const booking: ConfirmedBooking = {
      ...request,
      internalId:  generateBookingId(),
      confirmedAt: Date.now(),
    };
    _bookings.set(booking.internalId, booking);

    // ── Step 5: Release lock early (before async broadcast) ───────────────
    releaseLock(lock);

    // ── Step 6: Broadcast availability block to all OTHER channels ─────────
    // Fire-and-forget — don't fail the booking if a channel push fails.
    // In production: add retry queue with exponential backoff.
    broadcastAvailabilityBlock(booking, creds).catch(err =>
      console.error('[OverlapGuard] Broadcast error:', (err as Error).message),
    );

    return { success: true, booking };

  } catch (err) {
    releaseLock(lock);
    throw err;
  }
}

// ── Broadcast ──────────────────────────────────────────────────────────────

/**
 * Pushes an "unavailable" block to every channel OTHER than the one
 * that originated the booking. Runs all pushes in parallel.
 *
 * Channel strategies:
 *   Booking.com → OTA_HotelAvailNotifRQ  (BookingLimit=0, Status=Close)
 *   Gathern     → PUT /units/:id/availability  (available: false)
 *   Airbnb      → iCal feed regeneration (no direct block API; the updated
 *                 iCal export is picked up by Airbnb on next poll, ~15 min)
 *   Agoda       → PATCH /properties/:id/rooms/:id/calendar (REST/JSON, allotment=0)
 *   Expedia     → POST /eqc/ar (EQC XML, status=Close, inventory=0)
 */
async function broadcastAvailabilityBlock(
  booking: ConfirmedBooking,
  creds?:  SyncCredentials,
): Promise<void> {
  const tasks: Array<Promise<void>> = [];

  if (booking.channel !== 'Booking.com' && creds?.bookingCom) {
    tasks.push(
      pushAvailabilityBlock(creds.bookingCom, {
        hotelId:    booking.unitId,
        roomTypeId: booking.unitId,
        dateFrom:   booking.checkIn,
        dateTo:     booking.checkOut,
        available:  false,
        count:      0,
      }),
    );
  }

  if (booking.channel !== 'Gathern' && creds?.gathernApiKey) {
    tasks.push(
      pushGathernBlock({
        apiKey:    creds.gathernApiKey,
        unitId:    booking.unitId,
        dateFrom:  booking.checkIn,
        dateTo:    booking.checkOut,
        available: false,
      }),
    );
  }

  if (booking.channel !== 'Agoda' && creds?.agodaApiKey && creds?.agodaPropertyId) {
    tasks.push(
      pushAgodaBlock({
        apiKey:      creds.agodaApiKey,
        propertyId:  creds.agodaPropertyId,
        roomTypeId:  booking.unitId,
        dateFrom:    booking.checkIn,
        dateTo:      booking.checkOut,
        available:   false,
        allotment:   0,
      }),
    );
  }

  if (booking.channel !== 'Expedia' && creds?.expedia) {
    tasks.push(
      pushExpediaBlock({
        credentials: creds.expedia,
        roomTypeId:  booking.unitId,
        ratePlanId:  'BAR',
        dateFrom:    booking.checkIn,
        dateTo:      booking.checkOut,
        available:   false,
        count:       0,
      }),
    );
  }

  // Airbnb: no direct REST block API.
  // Our iCal export endpoint regenerates on every request,
  // so Airbnb's next poll will pick up the blocked dates automatically.
  // For near-instant block: trigger Airbnb's iCal re-import via their
  // Hosting API (requires Airbnb partner approval — out of scope here).

  // Settle all — log individual failures without aborting the others
  const results = await Promise.allSettled(tasks);
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(`[OverlapGuard] Channel push #${i} failed:`, (r.reason as Error).message);
    }
  });
}

// ── Read-Only Inspection Helpers ───────────────────────────────────────────

/** Returns a snapshot of all confirmed bookings (for CalendarPage, etc.) */
export function getAllBookings(): ConfirmedBooking[] {
  return [..._bookings.values()];
}

/** Returns all currently-active (non-expired) locks — for monitoring UI */
export function getActiveLocks(): LockHandle[] {
  const now = Date.now();
  return [..._locks.values()].filter(l => l.expiresAt > now);
}

/** Seed the registry with existing bookings (call on app startup) */
export function seedBookings(bookings: ConfirmedBooking[]): void {
  bookings.forEach(b => _bookings.set(b.internalId, b));
}

// ── Private Helpers ────────────────────────────────────────────────────────

function makeLockKey(unitId: string, range: { checkIn: string; checkOut: string }): string {
  return `${unitId}::${range.checkIn}::${range.checkOut}`;
}

function generateBookingId(): string {
  return `BK-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
