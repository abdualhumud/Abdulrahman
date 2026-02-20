import {
  Booking,
  ChannelType,
  ConflictRecord,
  SyncStatus,
} from '@rems/shared/types';
import {
  CHANNEL_PRIORITY,
  QUEUE_NAMES,
  SYNC_CONFIG,
} from '@rems/shared/constants';
import {
  buildAvailabilityLockKey,
  expandDateRange,
  generateId,
  sleep,
} from '@rems/shared/utils';

// ============================================================
// CONFLICT RESOLVER — Double-Booking Prevention Engine
//
// Algorithm:
//   1. Acquire a distributed Redis lock covering all affected dates
//      for the unit. Lock TTL = 5 seconds.
//   2. Run a SELECT FOR UPDATE on the availability rows for the
//      requested date range (DB-level row locking).
//   3. Check for any overlapping CONFIRMED booking using the
//      idempotency key to deduplicate identical requests.
//   4. If no conflict → insert booking + mark dates unavailable.
//   5. If conflict detected → apply resolution strategy:
//        a. FIRST_RECEIVED: whichever arrived first wins
//        b. PRIORITY_CHANNEL: Direct > Walk-In > Gathern > BDC > Airbnb
//        c. MANUAL: flag for human review (rare, high-value)
//   6. Release lock.
//   7. Propagate availability close to all other channels.
// ============================================================

export type ResolutionStrategy = 'FIRST_RECEIVED' | 'PRIORITY_CHANNEL' | 'MANUAL';

interface RedisClient {
  set(key: string, value: string, options: { NX: boolean; PX: number }): Promise<string | null>;
  del(key: string): Promise<number>;
}

interface DatabaseClient {
  query<T>(sql: string, params: unknown[]): Promise<{ rows: T[] }>;
  transaction<T>(fn: (tx: DatabaseClient) => Promise<T>): Promise<T>;
}

interface QueueClient {
  add(queueName: string, data: unknown, options?: unknown): Promise<void>;
}

export class ConflictResolver {
  constructor(
    private readonly redis: RedisClient,
    private readonly db: DatabaseClient,
    private readonly queue: QueueClient,
    private readonly strategy: ResolutionStrategy = 'PRIORITY_CHANNEL',
  ) {}

  /**
   * Entry point: attempts to confirm an incoming booking.
   * Returns the accepted booking or throws if unresolvable.
   */
  async resolveAndConfirm(incomingBooking: Booking): Promise<Booking> {
    const lockKey = buildAvailabilityLockKey(
      incomingBooking.propertyId,
      incomingBooking.unitId,
      incomingBooking.checkIn,
      incomingBooking.checkOut,
    );

    const lock = await this.acquireLock(lockKey);
    if (!lock) {
      throw new Error(`LOCK_UNAVAILABLE: Could not acquire lock for ${lockKey}`);
    }

    try {
      return await this.db.transaction(async (tx) => {
        // 1. Idempotency check — prevent duplicate processing
        const existing = await this.findByIdempotencyKey(tx, incomingBooking.idempotencyKey);
        if (existing) {
          return existing;  // Already processed — safe to return
        }

        // 2. Find overlapping confirmed bookings (row-locked)
        const conflicts = await this.findOverlappingBookings(
          tx,
          incomingBooking.unitId,
          incomingBooking.checkIn,
          incomingBooking.checkOut,
        );

        if (conflicts.length === 0) {
          // No conflict — confirm and block dates
          return await this.confirmBooking(tx, incomingBooking);
        }

        // 3. Conflict detected — apply resolution strategy
        const resolution = await this.applyResolutionStrategy(
          tx,
          incomingBooking,
          conflicts[0],
        );

        return resolution.winner;
      });
    } finally {
      await this.redis.del(lockKey);
    }
  }

  // ---- Resolution Strategies ----

  private async applyResolutionStrategy(
    tx: DatabaseClient,
    incoming: Booking,
    existing: Booking,
  ): Promise<{ winner: Booking; loser: Booking }> {
    let winner: Booking;
    let loser: Booking;

    switch (this.strategy) {
      case 'PRIORITY_CHANNEL': {
        const incomingPriority = CHANNEL_PRIORITY[incoming.channel];
        const existingPriority = CHANNEL_PRIORITY[existing.channel];

        if (incomingPriority < existingPriority) {
          // Incoming has higher priority — cancel existing, confirm incoming
          winner = incoming;
          loser = existing;
        } else {
          // Existing wins — reject incoming
          winner = existing;
          loser = incoming;
        }
        break;
      }

      case 'FIRST_RECEIVED': {
        // Whichever was created first wins (existing always wins here)
        winner = existing;
        loser = incoming;
        break;
      }

      case 'MANUAL': {
        // Flag both for human review — neither confirmed yet
        await this.flagForManualReview(tx, incoming, existing);
        throw new Error(`MANUAL_REVIEW_REQUIRED: Conflict flagged for bookings ${incoming.id} vs ${existing.id}`);
      }
    }

    await this.recordConflict(tx, incoming, existing, winner, loser);

    if (winner.id === incoming.id) {
      // Must cancel the existing booking on its OTA channel
      await this.queue.add(QUEUE_NAMES.SYNC_OUTBOUND, {
        action: 'CANCEL_BOOKING',
        channel: loser.channel,
        externalBookingId: loser.externalId,
        reason: 'double_booking_resolution',
        bookingId: loser.id,
      });
      return { winner: await this.confirmBooking(tx, winner), loser };
    }

    // Existing wins — reject incoming by cancelling on its OTA
    await this.queue.add(QUEUE_NAMES.SYNC_OUTBOUND, {
      action: 'CANCEL_BOOKING',
      channel: loser.channel,
      externalBookingId: loser.externalId,
      reason: 'double_booking_resolution',
      bookingId: loser.id,
    });

    return { winner, loser };
  }

  // ---- Database Operations ----

  private async confirmBooking(tx: DatabaseClient, booking: Booking): Promise<Booking> {
    const dates = expandDateRange(booking.checkIn, booking.checkOut);

    // Mark all nights as unavailable with optimistic locking (version increment)
    const updateResult = await tx.query<{ unit_id: string; date: string }>(
      `UPDATE availability
          SET is_available = FALSE,
              version = version + 1,
              updated_at = NOW()
        WHERE unit_id = $1
          AND date = ANY($2::date[])
          AND is_available = TRUE
        RETURNING unit_id, date`,
      [booking.unitId, dates],
    );

    if (updateResult.rows.length !== dates.length) {
      throw new Error(
        `AVAILABILITY_MISMATCH: Expected ${dates.length} dates, updated ${updateResult.rows.length}. Possible race condition.`,
      );
    }

    // Insert confirmed booking
    const result = await tx.query<Booking>(
      `INSERT INTO bookings (
          id, external_id, channel, property_id, unit_id, guest_id,
          check_in, check_out, adults, children, status, total_amount,
          channel_commission, currency, special_requests, sync_status,
          idempotency_key, raw_payload, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, 'CONFIRMED', $11,
          $12, $13, $14, 'SYNCED',
          $15, $16, NOW(), NOW()
        ) RETURNING *`,
      [
        booking.id,
        booking.externalId,
        booking.channel,
        booking.propertyId,
        booking.unitId,
        booking.guestId || null,
        booking.checkIn,
        booking.checkOut,
        booking.adults,
        booking.children,
        booking.totalAmount,
        booking.channelCommission,
        booking.currency,
        booking.specialRequests || null,
        booking.idempotencyKey,
        JSON.stringify(booking),
      ],
    );

    // Propagate availability close to all other channels (async)
    await this.queue.add(QUEUE_NAMES.SYNC_OUTBOUND, {
      action: 'CLOSE_AVAILABILITY',
      propertyId: booking.propertyId,
      unitId: booking.unitId,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      excludeChannel: booking.channel,  // Don't push back to origin
    });

    return result.rows[0];
  }

  private async findOverlappingBookings(
    tx: DatabaseClient,
    unitId: string,
    checkIn: string,
    checkOut: string,
  ): Promise<Booking[]> {
    const result = await tx.query<Booking>(
      `SELECT * FROM bookings
        WHERE unit_id = $1
          AND status NOT IN ('CANCELLED', 'NO_SHOW')
          AND check_in < $3
          AND check_out > $2
        FOR UPDATE SKIP LOCKED`,  // Skip rows locked by other concurrent transactions
      [unitId, checkIn, checkOut],
    );
    return result.rows;
  }

  private async findByIdempotencyKey(
    tx: DatabaseClient,
    key: string,
  ): Promise<Booking | null> {
    const result = await tx.query<Booking>(
      'SELECT * FROM bookings WHERE idempotency_key = $1',
      [key],
    );
    return result.rows[0] ?? null;
  }

  private async recordConflict(
    tx: DatabaseClient,
    incoming: Booking,
    existing: Booking,
    winner: Booking,
    loser: Booking,
  ): Promise<void> {
    await tx.query(
      `INSERT INTO conflict_records (
          id, property_id, unit_id, check_in, check_out,
          winner_booking_id, loser_booking_id,
          resolution_strategy, resolved_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        generateId(),
        incoming.propertyId,
        incoming.unitId,
        incoming.checkIn,
        incoming.checkOut,
        winner.id,
        loser.id,
        this.strategy,
      ],
    );
  }

  private async flagForManualReview(
    tx: DatabaseClient,
    incoming: Booking,
    existing: Booking,
  ): Promise<void> {
    await tx.query(
      `UPDATE bookings SET sync_status = 'CONFLICT' WHERE id = $1`,
      [existing.id],
    );
    await tx.query(
      `INSERT INTO sync_events (id, channel, event_type, payload, status)
        VALUES ($1, $2, 'BOOKING_NEW', $3, 'CONFLICT')`,
      [generateId(), incoming.channel, JSON.stringify(incoming)],
    );
  }

  // ---- Redis Distributed Lock ----

  private async acquireLock(
    key: string,
    attempts = 0,
  ): Promise<boolean> {
    const result = await this.redis.set(key, '1', {
      NX: true,
      PX: SYNC_CONFIG.LOCK_TTL_MS,
    });

    if (result === 'OK') return true;

    if (attempts < 3) {
      await sleep(SYNC_CONFIG.RETRY_BACKOFF_MS[attempts] ?? 1000);
      return this.acquireLock(key, attempts + 1);
    }

    return false;
  }
}
