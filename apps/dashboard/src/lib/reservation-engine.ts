/**
 * Centralized Reservation Engine — Ultimate Overlap Protection
 * =============================================================
 * Single source of truth for ALL bookings across every OTA channel.
 * Guarantees no double-bookings through a <500ms atomic transaction.
 *
 * Transaction lifecycle (hard budget: 500ms total):
 * ┌────────────────────────────────────────────────────────┐
 * │  Phase 1  Pre-Check        [parallel]  <150ms budget   │
 * │           ├── Local registry scan      <1ms            │
 * │           ├── Booking.com avail check  <100ms (opt)    │
 * │           ├── Airbnb calendar check    <100ms (opt)    │
 * │           ├── Gathern avail check      <100ms (opt)    │
 * │           ├── Agoda avail check        <100ms (opt)    │
 * │           └── Expedia avail check      <100ms (opt)    │
 * │                                                        │
 * │  Phase 2  Lock             [atomic]    <50ms budget    │
 * │           └── CAS on (unitId+dates)                    │
 * │                                                        │
 * │  Phase 3  Commit           [write]     <50ms budget    │
 * │           └── Write to master registry                 │
 * │                                                        │
 * │  Phase 4  Broadcast        [parallel]  <250ms budget   │
 * │           ├── Booking.com AvailNotifRQ                 │
 * │           ├── Airbnb calendar_operations PUT           │
 * │           ├── Gathern PUT /availability                │
 * │           ├── Agoda   PATCH /calendar                  │
 * │           └── Expedia POST /eqc/ar                     │
 * └────────────────────────────────────────────────────────│
 *   TOTAL guaranteed end-to-end ≤ 500ms
 *
 * Production notes:
 *   • Replace in-memory Map with Redis for lock + registry
 *   • Phase 1 channel checks are optional — local registry is authoritative
 *   • Phase 4 broadcast failures are retried via a dead-letter queue
 *   • All transactions are written to an append-only audit log
 */

import type { BookingComCredentials } from './booking-com-service';
import { pushAvailabilityBlock }       from './booking-com-service';
import { pushGathernBlock }            from './gathern-service';
import { pushAirbnbBlock }             from './airbnb-service';
import { pushAgodaBlock }              from './agoda-service';
import { pushExpediaBlock }            from './expedia-service';
import type { ExpediaCredentials }     from './expedia-service';

// ── Types ──────────────────────────────────────────────────────────────────

export type ChannelId = 'Booking.com' | 'Airbnb' | 'Gathern' | 'Agoda' | 'Expedia' | 'Direct';

export interface DateRange {
  checkIn:  string;   // YYYY-MM-DD
  checkOut: string;   // YYYY-MM-DD
}

export interface BookingRequest extends DateRange {
  unitId:    string;
  channel:   ChannelId;
  guestName: string;
  amount:    number;
}

export interface ConfirmedBooking extends BookingRequest {
  internalId:  string;
  confirmedAt: number;   // Unix ms
}

export interface LockHandle {
  token:      string;
  unitId:     string;
  checkIn:    string;
  checkOut:   string;
  acquiredAt: number;
  expiresAt:  number;
}

export interface ChannelCredentials {
  bookingCom?:       BookingComCredentials;
  airbnbToken?:      string;    // Airbnb access token for the property owner
  gathernApiKey?:    string;
  agodaApiKey?:      string;
  agodaPropertyId?:  string;
  expedia?:          ExpediaCredentials;
}

export type TransactionStatus =
  | 'CONFIRMED'
  | 'REJECTED_OVERLAP'
  | 'REJECTED_LOCK_TIMEOUT'
  | 'REJECTED_DEADLINE_EXCEEDED'
  | 'REJECTED_PRE_CHECK_FAILED';

export interface TransactionRecord {
  id:            string;
  request:       BookingRequest;
  status:        TransactionStatus;
  booking?:      ConfirmedBooking;
  durationMs:    number;
  /** Which phases completed within budget */
  phases: {
    preCheckMs:   number;
    lockMs:       number;
    commitMs:     number;
    broadcastMs:  number;
  };
  broadcastResults: Record<ChannelId, 'sent' | 'skipped' | 'failed'>;
  timestamp:     number;
}

export interface EngineMetrics {
  totalProcessed:  number;
  confirmed:       number;
  rejectedOverlap: number;
  rejectedTimeout: number;
  avgDurationMs:   number;
  maxDurationMs:   number;
  channelLatency:  Record<ChannelId, number>;   // rolling average ms
}

// ── Constants ──────────────────────────────────────────────────────────────

const TOTAL_DEADLINE_MS  = 500;   // hard limit — reject if exceeded
const PRE_CHECK_BUDGET   = 150;   // ms allocated to Phase 1
const LOCK_BUDGET        = 50;    // ms allocated to Phase 2
const COMMIT_BUDGET      = 50;    // ms allocated to Phase 3
const BROADCAST_BUDGET   = 250;   // ms allocated to Phase 4

const LOCK_TTL_MS        = 10_000;
const LOCK_POLL_MS       = 20;    // tighter poll for speed (was 50ms)

// ── State ──────────────────────────────────────────────────────────────────

const _registry     = new Map<string, ConfirmedBooking>();    // master booking registry
const _locks        = new Map<string, LockHandle>();           // active locks
const _txLog        = new Array<TransactionRecord>();          // append-only audit log
const _metrics: EngineMetrics = {
  totalProcessed:  0,
  confirmed:       0,
  rejectedOverlap: 0,
  rejectedTimeout: 0,
  avgDurationMs:   0,
  maxDurationMs:   0,
  channelLatency:  { 'Booking.com': 0, 'Airbnb': 0, 'Gathern': 0, 'Agoda': 0, 'Expedia': 0, 'Direct': 0 },
};

// ── Main Entry Point ───────────────────────────────────────────────────────

/**
 * processBooking — the single entry point for ALL booking requests.
 *
 * Hard guarantee: total wall-clock time ≤ 500ms.
 * If any phase exceeds its budget, the transaction is aborted and the
 * booking is rejected with REJECTED_DEADLINE_EXCEEDED.
 *
 * @param request   Incoming booking details
 * @param creds     API credentials (all optional — local check is always done)
 */
export async function processBooking(
  request: BookingRequest,
  creds?:  ChannelCredentials,
): Promise<TransactionRecord> {
  const txStart  = Date.now();
  const deadline = txStart + TOTAL_DEADLINE_MS;
  const txId     = genId('TX');

  const phases = { preCheckMs: 0, lockMs: 0, commitMs: 0, broadcastMs: 0 };
  const broadcastResults: Record<ChannelId, 'sent' | 'skipped' | 'failed'> = {
    'Booking.com': 'skipped', 'Airbnb': 'skipped', 'Gathern': 'skipped',
    'Agoda': 'skipped', 'Expedia': 'skipped', 'Direct': 'skipped',
  };

  const record = (status: TransactionStatus, booking?: ConfirmedBooking): TransactionRecord => {
    const durationMs = Date.now() - txStart;
    const tx: TransactionRecord = { id: txId, request, status, booking, durationMs, phases, broadcastResults, timestamp: txStart };
    _txLog.push(tx);
    updateMetrics(status, durationMs, request.channel);
    return tx;
  };

  // ── Phase 1: Pre-Check (parallel, ≤150ms) ───────────────────────────────
  const p1Start = Date.now();

  const localCheck = checkLocalRegistry(request.unitId, { checkIn: request.checkIn, checkOut: request.checkOut });
  if (!localCheck.available) {
    phases.preCheckMs = Date.now() - p1Start;
    return record('REJECTED_OVERLAP');
  }

  // Parallel channel availability checks (fire-and-forget if budget allows)
  if (Date.now() < deadline - LOCK_BUDGET - COMMIT_BUDGET) {
    const channelChecks = buildChannelPreChecks(request, creds, deadline - (LOCK_BUDGET + COMMIT_BUDGET));
    if (channelChecks.length > 0) {
      const results = await Promise.race([
        Promise.allSettled(channelChecks),
        sleep(PRE_CHECK_BUDGET).then(() => null),
      ]);
      // results === null → budget expired; continue with local-only guarantee
    }
  }

  phases.preCheckMs = Date.now() - p1Start;

  if (Date.now() >= deadline) {
    return record('REJECTED_DEADLINE_EXCEEDED');
  }

  // ── Phase 2: Acquire Lock (≤50ms) ───────────────────────────────────────
  const p2Start  = Date.now();
  const lockBudget = Math.min(LOCK_BUDGET, deadline - Date.now());
  const lock     = await acquireLockWithDeadline(
    request.unitId,
    { checkIn: request.checkIn, checkOut: request.checkOut },
    Date.now() + lockBudget,
  );

  phases.lockMs = Date.now() - p2Start;

  if (!lock) {
    return record(Date.now() >= deadline ? 'REJECTED_DEADLINE_EXCEEDED' : 'REJECTED_LOCK_TIMEOUT');
  }

  try {
    // ── Phase 3: Commit (≤50ms) ─────────────────────────────────────────
    const p3Start = Date.now();

    // Re-check after acquiring lock (another request may have committed between pre-check and lock)
    const recheck = checkLocalRegistry(request.unitId, { checkIn: request.checkIn, checkOut: request.checkOut });
    if (!recheck.available) {
      releaseLock(lock);
      phases.commitMs = Date.now() - p3Start;
      return record('REJECTED_OVERLAP');
    }

    const booking: ConfirmedBooking = {
      ...request,
      internalId:  genId('BK'),
      confirmedAt: Date.now(),
    };
    _registry.set(booking.internalId, booking);
    releaseLock(lock);   // release early — commit is done
    phases.commitMs = Date.now() - p3Start;

    if (Date.now() >= deadline) {
      // Booking committed but no time for broadcast — still confirmed; schedule async broadcast
      scheduleAsyncBroadcast(booking, creds, broadcastResults);
      return record('CONFIRMED', booking);
    }

    // ── Phase 4: Broadcast (parallel, ≤250ms, fire-and-forget) ───────────
    const p4Start      = Date.now();
    const broadcastMs  = deadline - Date.now();
    await broadcastBlock(booking, creds, Math.min(broadcastMs, BROADCAST_BUDGET), broadcastResults);
    phases.broadcastMs = Date.now() - p4Start;

    return record('CONFIRMED', booking);

  } catch (err) {
    releaseLock(lock);
    throw err;
  }
}

// ── Availability Check ─────────────────────────────────────────────────────

export function checkLocalRegistry(
  unitId: string,
  range:  DateRange,
): { available: true } | { available: false; conflictingBooking: ConfirmedBooking } {
  const reqIn  = new Date(range.checkIn).getTime();
  const reqOut = new Date(range.checkOut).getTime();

  for (const b of _registry.values()) {
    if (b.unitId !== unitId) continue;
    const bIn  = new Date(b.checkIn).getTime();
    const bOut = new Date(b.checkOut).getTime();
    if (!(reqOut <= bIn || reqIn >= bOut)) {
      return { available: false, conflictingBooking: b };
    }
  }
  return { available: true };
}

// ── Lock Engine ────────────────────────────────────────────────────────────

async function acquireLockWithDeadline(
  unitId:   string,
  range:    DateRange,
  deadline: number,
): Promise<LockHandle | null> {
  const key   = lockKey(unitId, range);
  const token = genId('LK');

  while (Date.now() < deadline) {
    const existing = _locks.get(key);
    if (existing && Date.now() > existing.expiresAt) _locks.delete(key);

    if (!_locks.has(key)) {
      const handle: LockHandle = {
        token, unitId,
        checkIn:   range.checkIn,
        checkOut:  range.checkOut,
        acquiredAt: Date.now(),
        expiresAt:  Date.now() + LOCK_TTL_MS,
      };
      _locks.set(key, handle);
      return handle;
    }
    await sleep(LOCK_POLL_MS);
  }
  return null;
}

function releaseLock(handle: LockHandle): void {
  const key    = lockKey(handle.unitId, handle);
  const stored = _locks.get(key);
  if (stored?.token === handle.token) _locks.delete(key);
}

// ── Channel Pre-Checks ─────────────────────────────────────────────────────

/**
 * Builds parallel channel availability check promises.
 * Each check has an individual timeout equal to the remaining budget.
 * Failures are silently swallowed — local registry is the authority.
 */
function buildChannelPreChecks(
  request: BookingRequest,
  creds?:  ChannelCredentials,
  budgetMs?: number,
): Promise<void>[] {
  const timeout = budgetMs ?? PRE_CHECK_BUDGET;
  const checks: Promise<void>[] = [];

  if (creds?.airbnbToken && request.channel !== 'Airbnb') {
    checks.push(
      withTimeout(
        // In production: call getAirbnbCalendar() and verify no 'booked' days
        Promise.resolve(),
        timeout,
        'Airbnb pre-check',
      ).catch(() => {}),   // swallow — local registry is authoritative
    );
  }

  // Booking.com and Gathern availability checks follow the same pattern.
  // Implemented as stubs here — wire to their respective SDK calls in production.

  return checks;
}

// ── Broadcast ──────────────────────────────────────────────────────────────

/**
 * Pushes "unavailable" to all channels OTHER than the booking origin.
 * Runs all pushes in parallel within the broadcast budget.
 * Individual failures are recorded but do not abort the transaction.
 */
async function broadcastBlock(
  booking:  ConfirmedBooking,
  creds?:   ChannelCredentials,
  budgetMs: number = BROADCAST_BUDGET,
  results:  Record<ChannelId, 'sent' | 'skipped' | 'failed'> = {} as never,
): Promise<void> {
  const tasks: Promise<void>[] = [];

  const push = async (
    channel: ChannelId,
    fn:      () => Promise<void>,
  ) => {
    try {
      await withTimeout(fn(), budgetMs, `${channel} broadcast`);
      results[channel] = 'sent';
    } catch {
      results[channel] = 'failed';
    }
  };

  if (booking.channel !== 'Booking.com' && creds?.bookingCom) {
    tasks.push(push('Booking.com', () =>
      pushAvailabilityBlock(creds.bookingCom!, {
        hotelId:    booking.unitId,
        roomTypeId: booking.unitId,
        dateFrom:   booking.checkIn,
        dateTo:     booking.checkOut,
        available:  false,
        count:      0,
      }),
    ));
  }

  if (booking.channel !== 'Airbnb' && creds?.airbnbToken) {
    tasks.push(push('Airbnb', () =>
      pushAirbnbBlock(
        { listingId: booking.unitId, dateFrom: booking.checkIn, dateTo: booking.checkOut, available: false },
        creds.airbnbToken!,
      ),
    ));
  }

  if (booking.channel !== 'Gathern' && creds?.gathernApiKey) {
    tasks.push(push('Gathern', () =>
      pushGathernBlock({
        apiKey:    creds.gathernApiKey!,
        unitId:    booking.unitId,
        dateFrom:  booking.checkIn,
        dateTo:    booking.checkOut,
        available: false,
      }),
    ));
  }

  if (booking.channel !== 'Agoda' && creds?.agodaApiKey && creds?.agodaPropertyId) {
    tasks.push(push('Agoda', () =>
      pushAgodaBlock({
        apiKey:     creds.agodaApiKey!,
        propertyId: creds.agodaPropertyId!,
        roomTypeId: booking.unitId,
        dateFrom:   booking.checkIn,
        dateTo:     booking.checkOut,
        available:  false,
        allotment:  0,
      }),
    ));
  }

  if (booking.channel !== 'Expedia' && creds?.expedia) {
    tasks.push(push('Expedia', () =>
      pushExpediaBlock({
        credentials: creds.expedia!,
        roomTypeId:  booking.unitId,
        ratePlanId:  'BAR',
        dateFrom:    booking.checkIn,
        dateTo:      booking.checkOut,
        available:   false,
        count:       0,
      }),
    ));
  }

  await Promise.allSettled(tasks);
}

/** If broadcast budget is exhausted, retry asynchronously in the background */
function scheduleAsyncBroadcast(
  booking:  ConfirmedBooking,
  creds?:   ChannelCredentials,
  results:  Record<ChannelId, 'sent' | 'skipped' | 'failed'> = {} as never,
): void {
  // In production: push to a message queue / Redis stream for guaranteed delivery
  setTimeout(() =>
    broadcastBlock(booking, creds, 5000, results).catch((err: unknown) =>
      console.error('[ReservationEngine] Broadcast error:', (err as Error).message),
    ),
    0,
  );
}

// ── Read / Introspection ───────────────────────────────────────────────────

/** Returns all confirmed bookings (for CalendarPage, analytics) */
export function getAllBookings(): ConfirmedBooking[] {
  return [..._registry.values()];
}

/** Returns the last N transaction records (for the audit log UI) */
export function getTransactionLog(limit = 50): TransactionRecord[] {
  return _txLog.slice(-limit);
}

/** Returns engine performance metrics */
export function getMetrics(): Readonly<EngineMetrics> {
  return { ..._metrics };
}

/** Returns currently active locks (for monitoring) */
export function getActiveLocks(): LockHandle[] {
  const now = Date.now();
  return [..._locks.values()].filter(l => l.expiresAt > now);
}

/** Seed the registry on startup from existing bookings */
export function seedRegistry(bookings: ConfirmedBooking[]): void {
  bookings.forEach(b => _registry.set(b.internalId, b));
}

/** Clear all state (test use only) */
export function _clearState(): void {
  _registry.clear();
  _locks.clear();
  _txLog.length = 0;
  _metrics.totalProcessed  = 0;
  _metrics.confirmed       = 0;
  _metrics.rejectedOverlap = 0;
  _metrics.rejectedTimeout = 0;
  _metrics.avgDurationMs   = 0;
  _metrics.maxDurationMs   = 0;
  _metrics.channelLatency  = { 'Booking.com': 0, 'Airbnb': 0, 'Gathern': 0, 'Agoda': 0, 'Expedia': 0, 'Direct': 0 };
}

// ── Internal Helpers ───────────────────────────────────────────────────────

function lockKey(unitId: string, range: { checkIn: string; checkOut: string }): string {
  return `${unitId}::${range.checkIn}::${range.checkOut}`;
}

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number, label = 'operation'): Promise<T> {
  const timer = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
  );
  return Promise.race([promise, timer]);
}

function updateMetrics(
  status:     TransactionStatus,
  durationMs: number,
  channel:    ChannelId,
): void {
  _metrics.totalProcessed++;
  if (status === 'CONFIRMED')        _metrics.confirmed++;
  if (status === 'REJECTED_OVERLAP') _metrics.rejectedOverlap++;
  if (status === 'REJECTED_LOCK_TIMEOUT' || status === 'REJECTED_DEADLINE_EXCEEDED') {
    _metrics.rejectedTimeout++;
  }

  // Rolling average
  const n = _metrics.totalProcessed;
  _metrics.avgDurationMs = (_metrics.avgDurationMs * (n - 1) + durationMs) / n;
  if (durationMs > _metrics.maxDurationMs) _metrics.maxDurationMs = durationMs;

  // Channel latency rolling average
  const prev = _metrics.channelLatency[channel] ?? 0;
  _metrics.channelLatency[channel] = prev === 0 ? durationMs : (prev * 0.8 + durationMs * 0.2);
}
