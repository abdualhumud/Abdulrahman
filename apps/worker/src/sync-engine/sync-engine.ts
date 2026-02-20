import {
  Booking,
  ChannelType,
  RatePush,
  SyncEvent,
  SyncStatus,
} from '@rems/shared/types';
import {
  CHANNEL_PRIORITY,
  QUEUE_NAMES,
  RATE_LIMITS,
  SYNC_CONFIG,
} from '@rems/shared/constants';
import {
  generateId,
  generateIdempotencyKey,
  sleep,
} from '@rems/shared/utils';
import { IChannelAdapter } from '@rems/channel-manager/interfaces/channel-adapter.interface';
import { ConflictResolver } from '../conflict-resolver/conflict-resolver';

// ============================================================
// SYNC ENGINE — Bidirectional Synchronization Hub
//
// Responsibilities:
//   • Receives inbound events (webhooks) from all OTAs
//   • Polls OTAs on schedule for channels without reliable webhooks
//   • Normalizes all booking data into the internal format
//   • Pushes outbound availability/rate updates to all connected channels
//   • Routes all booking confirmations through the ConflictResolver
//   • Implements per-channel rate limiting
// ============================================================

interface DatabaseClient {
  query<T>(sql: string, params: unknown[]): Promise<{ rows: T[] }>;
  transaction<T>(fn: (tx: DatabaseClient) => Promise<T>): Promise<T>;
}

interface ChannelMappingRow {
  unit_id: string;
  property_id: string;
  external_room_id: string;
  channel: ChannelType;
}

export class SyncEngine {
  private readonly adapters: Map<ChannelType, IChannelAdapter> = new Map();
  private readonly rateLimiters: Map<ChannelType, RateLimiter> = new Map();

  constructor(
    private readonly db: DatabaseClient,
    private readonly conflictResolver: ConflictResolver,
    private readonly logger: { info: (msg: string, meta?: unknown) => void; error: (msg: string, meta?: unknown) => void },
  ) {}

  registerAdapter(adapter: IChannelAdapter): void {
    this.adapters.set(adapter.channel, adapter);
    this.rateLimiters.set(
      adapter.channel,
      new RateLimiter(this.getRateLimit(adapter.channel)),
    );
    this.logger.info(`Adapter registered: ${adapter.channel}`);
  }

  // ============================================================
  // INBOUND — Webhook Handler
  // ============================================================

  async handleWebhook(
    channel: ChannelType,
    rawPayload: unknown,
    headers: Record<string, string>,
  ): Promise<void> {
    const adapter = this.getAdapter(channel);
    const rawBody = JSON.stringify(rawPayload);

    // Verify signature first
    const signature = headers['x-hub-signature-256'] ?? headers['x-signature'] ?? '';
    if (!adapter.verifyWebhookSignature(rawBody, signature)) {
      throw new Error(`INVALID_SIGNATURE: Webhook from ${channel} failed signature check`);
    }

    const event = adapter.parseWebhookPayload(rawPayload, headers);
    await this.logSyncEvent(event);
    await this.processEvent(event, adapter);
  }

  // ============================================================
  // INBOUND — Polling (for channels without reliable webhooks)
  // ============================================================

  async pollChannel(channel: ChannelType): Promise<void> {
    const adapter = this.getAdapter(channel);
    const lastPollTime = await this.getLastPollTime(channel);

    this.logger.info(`Polling ${channel} since ${lastPollTime.toISOString()}`);

    let bookings: Booking[];
    try {
      await this.rateLimiters.get(channel)!.throttle();
      bookings = await adapter.fetchModifiedBookings(lastPollTime);
    } catch (err: any) {
      this.logger.error(`Poll failed for ${channel}`, { error: err.message });
      return;
    }

    this.logger.info(`Fetched ${bookings.length} bookings from ${channel}`);

    for (const booking of bookings) {
      const enriched = await this.enrichBooking(booking);
      if (!enriched) {
        this.logger.error(`Could not enrich booking ${booking.externalId} — channel mapping not found`);
        continue;
      }

      const event: SyncEvent = {
        id: generateId(),
        channel,
        eventType: booking.status === 'CANCELLED' ? 'BOOKING_CANCELLED' : 'BOOKING_NEW',
        payload: booking,
        receivedAt: new Date(),
        status: SyncStatus.PENDING,
        retryCount: 0,
      };

      await this.processEvent(event, adapter);
    }

    await this.updateLastPollTime(channel);
  }

  // ============================================================
  // OUTBOUND — Availability Push
  // ============================================================

  async pushAvailabilityClose(params: {
    propertyId: string;
    unitId: string;
    checkIn: string;
    checkOut: string;
    excludeChannel?: ChannelType;
  }): Promise<void> {
    const { unitId, checkIn, checkOut, excludeChannel } = params;

    const mappings = await this.getChannelMappings(unitId);
    const targetMappings = mappings.filter(
      (m) => m.channel !== excludeChannel,
    );

    await Promise.allSettled(
      targetMappings.map(async (mapping) => {
        const adapter = this.adapters.get(mapping.channel);
        if (!adapter) return;

        const dates = this.buildDateList(checkIn, checkOut);
        await this.rateLimiters.get(mapping.channel)!.throttle();

        const result = await adapter.pushAvailability([
          {
            unitId: mapping.unit_id,
            externalRoomId: mapping.external_room_id,
            dates: dates.map((date) => ({
              date,
              isAvailable: false,
              price: 0,
              minimumStay: 1,
              stopSell: true,
            })),
          },
        ]);

        if (!result.success) {
          this.logger.error(`Availability push failed for ${mapping.channel}`, result);
          // Re-queue for retry
          await this.enqueueRetry({
            action: 'CLOSE_AVAILABILITY',
            ...params,
            channel: mapping.channel,
          });
        } else {
          await this.updateLastSyncTime(mapping.unit_id, mapping.channel);
        }
      }),
    );
  }

  // ============================================================
  // OUTBOUND — Rate Push (Rate Parity Management)
  // ============================================================

  async pushRatesToAllChannels(ratePush: RatePush): Promise<void> {
    const targets = ratePush.targetChannels.filter((ch) =>
      this.adapters.has(ch),
    );

    const results = await Promise.allSettled(
      targets.map(async (channel) => {
        const adapter = this.adapters.get(channel)!;
        await this.rateLimiters.get(channel)!.throttle();
        return adapter.pushRates(ratePush);
      }),
    );

    const failures = results
      .map((r, i) => ({ channel: targets[i], result: r }))
      .filter((r) => r.result.status === 'rejected');

    if (failures.length > 0) {
      this.logger.error('Rate push partially failed', { failures });
    }
  }

  // ============================================================
  // PRIVATE — Event Processing
  // ============================================================

  private async processEvent(event: SyncEvent, adapter: IChannelAdapter): Promise<void> {
    try {
      switch (event.eventType) {
        case 'BOOKING_NEW':
        case 'BOOKING_MODIFIED': {
          const rawBooking = event.payload as Booking;
          const enriched = await this.enrichBooking(rawBooking);
          if (!enriched) break;

          enriched.idempotencyKey = generateIdempotencyKey({
            channel: event.channel,
            externalBookingId: enriched.externalId ?? '',
            propertyId: enriched.propertyId,
            checkIn: enriched.checkIn,
            checkOut: enriched.checkOut,
          });

          await this.conflictResolver.resolveAndConfirm(enriched);
          await adapter.acknowledgeBooking(enriched.externalId ?? '');
          break;
        }

        case 'BOOKING_CANCELLED': {
          const rawBooking = event.payload as Booking;
          await this.cancelBookingLocally(rawBooking.externalId!, event.channel);
          break;
        }

        case 'AVAILABILITY_UPDATE':
        case 'RATE_UPDATE':
          this.logger.info(`Received ${event.eventType} from ${event.channel} — no action needed`);
          break;
      }

      await this.markEventProcessed(event.id);
    } catch (err: any) {
      this.logger.error(`Event processing failed`, { eventId: event.id, error: err.message });
      await this.markEventFailed(event.id, err.message);
      await this.scheduleRetry(event);
    }
  }

  // ============================================================
  // PRIVATE — Helpers
  // ============================================================

  private async enrichBooking(booking: Booking): Promise<Booking | null> {
    const result = await this.db.query<ChannelMappingRow>(
      `SELECT cm.unit_id, p.id AS property_id, cm.external_room_id, cm.channel
         FROM channel_mappings cm
         JOIN units u ON cm.unit_id = u.id
         JOIN properties p ON u.property_id = p.id
        WHERE cm.channel = $1
          AND (cm.external_room_id = $2 OR cm.external_property_id = $3)
          AND cm.is_active = TRUE`,
      [booking.channel, booking.externalId, booking.externalId],
    );

    if (!result.rows.length) return null;

    const mapping = result.rows[0];
    return {
      ...booking,
      propertyId: mapping.property_id,
      unitId: mapping.unit_id,
    };
  }

  private async cancelBookingLocally(externalId: string, channel: ChannelType): Promise<void> {
    const result = await this.db.query<{ unit_id: string; check_in: string; check_out: string }>(
      `UPDATE bookings
          SET status = 'CANCELLED', sync_status = 'SYNCED', updated_at = NOW()
        WHERE external_id = $1 AND channel = $2
        RETURNING unit_id, check_in::text, check_out::text`,
      [externalId, channel],
    );

    if (result.rows.length > 0) {
      const { unit_id, check_in, check_out } = result.rows[0];
      // Reopen dates on all channels
      await this.db.query(
        `UPDATE availability
            SET is_available = TRUE, stop_sell = FALSE, version = version + 1
          WHERE unit_id = $1 AND date >= $2::date AND date < $3::date`,
        [unit_id, check_in, check_out],
      );
    }
  }

  private buildDateList(checkIn: string, checkOut: string): string[] {
    const dates: string[] = [];
    const current = new Date(checkIn);
    const end = new Date(checkOut);
    while (current < end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setUTCDate(current.getUTCDate() + 1);
    }
    return dates;
  }

  private async getChannelMappings(unitId: string): Promise<ChannelMappingRow[]> {
    const result = await this.db.query<ChannelMappingRow>(
      `SELECT unit_id, property_id, external_room_id, channel
         FROM channel_mappings cm
         JOIN units u ON cm.unit_id = u.id
         JOIN properties p ON u.property_id = p.id
        WHERE cm.unit_id = $1 AND cm.is_active = TRUE`,
      [unitId],
    );
    return result.rows;
  }

  private async logSyncEvent(event: SyncEvent): Promise<void> {
    await this.db.query(
      `INSERT INTO sync_events (id, channel, event_type, payload, received_at, status)
        VALUES ($1, $2, $3, $4, $5, 'PENDING')`,
      [event.id, event.channel, event.eventType, JSON.stringify(event.payload), event.receivedAt],
    );
  }

  private async markEventProcessed(eventId: string): Promise<void> {
    await this.db.query(
      `UPDATE sync_events SET status = 'SYNCED', processed_at = NOW() WHERE id = $1`,
      [eventId],
    );
  }

  private async markEventFailed(eventId: string, errorMessage: string): Promise<void> {
    await this.db.query(
      `UPDATE sync_events
          SET status = 'FAILED', error_message = $2, retry_count = retry_count + 1
        WHERE id = $1`,
      [eventId, errorMessage],
    );
  }

  private async scheduleRetry(event: SyncEvent): Promise<void> {
    if (event.retryCount < SYNC_CONFIG.MAX_RETRY_ATTEMPTS) {
      const delayMs = SYNC_CONFIG.RETRY_BACKOFF_MS[event.retryCount] ?? 16_000;
      await sleep(delayMs);
      // Re-enqueue
    }
  }

  private async enqueueRetry(data: unknown): Promise<void> {
    // Queue implementation abstracted; plug in BullMQ/SQS
    this.logger.info('Retry enqueued', { data });
  }

  private async getLastPollTime(channel: ChannelType): Promise<Date> {
    const result = await this.db.query<{ last_polled_at: Date }>(
      `SELECT last_polled_at FROM channel_poll_state WHERE channel = $1`,
      [channel],
    );
    return result.rows[0]?.last_polled_at ?? new Date(Date.now() - 3_600_000);
  }

  private async updateLastPollTime(channel: ChannelType): Promise<void> {
    await this.db.query(
      `INSERT INTO channel_poll_state (channel, last_polled_at)
        VALUES ($1, NOW())
        ON CONFLICT (channel) DO UPDATE SET last_polled_at = NOW()`,
      [channel],
    );
  }

  private async updateLastSyncTime(unitId: string, channel: ChannelType): Promise<void> {
    await this.db.query(
      `UPDATE channel_mappings SET last_synced_at = NOW()
        WHERE unit_id = $1 AND channel = $2`,
      [unitId, channel],
    );
  }

  private getAdapter(channel: ChannelType): IChannelAdapter {
    const adapter = this.adapters.get(channel);
    if (!adapter) throw new Error(`No adapter registered for channel: ${channel}`);
    return adapter;
  }

  private getRateLimit(channel: ChannelType): number {
    const limits: Record<ChannelType, number> = {
      [ChannelType.BOOKING_COM]: RATE_LIMITS.BOOKING_COM_REQUESTS_PER_SECOND * 1000,
      [ChannelType.AIRBNB]: Math.floor((60_000) / RATE_LIMITS.AIRBNB_REQUESTS_PER_MINUTE),
      [ChannelType.GATHERN]: Math.floor((60_000) / RATE_LIMITS.GATHERN_REQUESTS_PER_MINUTE),
      [ChannelType.DIRECT]: 0,
      [ChannelType.WALK_IN]: 0,
    };
    return limits[channel] ?? 1000;
  }
}

// ============================================================
// TOKEN BUCKET RATE LIMITER
// ============================================================

class RateLimiter {
  private lastRequestTime = 0;

  constructor(private readonly minIntervalMs: number) {}

  async throttle(): Promise<void> {
    if (this.minIntervalMs === 0) return;
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minIntervalMs) {
      await sleep(this.minIntervalMs - elapsed);
    }
    this.lastRequestTime = Date.now();
  }
}
