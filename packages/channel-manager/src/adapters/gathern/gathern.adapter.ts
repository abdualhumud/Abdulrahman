import { createHmac } from 'crypto';
import axios, { AxiosInstance } from 'axios';
import {
  Booking,
  BookingStatus,
  ChannelType,
  RatePush,
  SyncEvent,
  SyncStatus,
} from '@rems/shared/types';
import { generateId } from '@rems/shared/utils';
import {
  ChannelAvailabilityUpdate,
  ChannelBookingResponse,
  IChannelAdapter,
} from '../../interfaces/channel-adapter.interface';

// ============================================================
// GATHERN ADAPTER  (Saudi-local platform)
//
// Integration strategy:
//   • Primary:  REST polling every 120s (webhook support is limited)
//   • Fallback: Manual pull on booking notification
//   • Protocol: JSON REST API
//   • Auth:     API Key in header
//   • Note:     Gathern uses a custom date format (DD/MM/YYYY) — normalized here
// ============================================================

export class GathernAdapter implements IChannelAdapter {
  readonly channel = ChannelType.GATHERN;
  private readonly http: AxiosInstance;
  private readonly webhookSecret: string;
  private readonly listingId: string;

  constructor(config: {
    apiKey: string;
    listingId: string;
    webhookSecret: string;
    baseUrl?: string;
  }) {
    this.webhookSecret = config.webhookSecret;
    this.listingId = config.listingId;
    this.http = axios.create({
      baseURL: config.baseUrl ?? 'https://api.gathern.co/v1',
      headers: {
        'X-API-Key': config.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 20_000,   // Gathern API is slower — allow extra time
    });
  }

  async fetchModifiedBookings(since: Date): Promise<Booking[]> {
    const response = await this.http.get(`/listings/${this.listingId}/bookings`, {
      params: {
        modified_after: this.toGathernDate(since),
        status: 'confirmed,cancelled',
        per_page: 100,
      },
    });

    return (response.data.data ?? []).map(this.normalizeBooking.bind(this));
  }

  async pushAvailability(updates: ChannelAvailabilityUpdate[]): Promise<ChannelBookingResponse> {
    const payload = updates.flatMap((u) =>
      u.dates.map((d) => ({
        listing_id: this.listingId,
        room_id: u.externalRoomId,
        date: this.toGathernDate(new Date(d.date)),
        is_available: d.isAvailable && !d.stopSell,
        price: d.price,
        minimum_nights: d.minimumStay,
      })),
    );

    try {
      await this.http.post(`/listings/${this.listingId}/calendar`, { dates: payload });
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        errorCode: err.response?.data?.code,
        errorMessage: err.response?.data?.message ?? err.message,
      };
    }
  }

  async pushRates(ratePush: RatePush): Promise<ChannelBookingResponse> {
    try {
      await this.http.put(`/listings/${this.listingId}/pricing`, {
        from_date: this.toGathernDate(new Date(ratePush.dateRange.from)),
        to_date: this.toGathernDate(new Date(ratePush.dateRange.to)),
        price_per_night: ratePush.price,
        currency: ratePush.currency,
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, errorMessage: err.message };
    }
  }

  async acknowledgeBooking(externalBookingId: string): Promise<void> {
    await this.http.post(`/bookings/${externalBookingId}/confirm`);
  }

  async cancelBooking(externalBookingId: string, reason: string): Promise<ChannelBookingResponse> {
    try {
      await this.http.post(`/bookings/${externalBookingId}/cancel`, { cancellation_reason: reason });
      return { success: true };
    } catch (err: any) {
      return { success: false, errorMessage: err.message };
    }
  }

  parseWebhookPayload(rawPayload: unknown, _headers: Record<string, string>): SyncEvent {
    const payload = rawPayload as Record<string, any>;
    return {
      id: generateId(),
      channel: ChannelType.GATHERN,
      eventType: this.mapEventType(payload.event_type),
      payload: rawPayload,
      receivedAt: new Date(),
      status: SyncStatus.PENDING,
      retryCount: 0,
    };
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const expected = createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');
    return expected === signature;
  }

  // ---- Private Helpers ----

  private normalizeBooking(raw: any): Booking {
    return {
      id: generateId(),
      externalId: raw.id?.toString(),
      channel: ChannelType.GATHERN,
      propertyId: '',
      unitId: '',
      guestId: '',
      checkIn: this.fromGathernDate(raw.check_in),
      checkOut: this.fromGathernDate(raw.check_out),
      nights: 0,
      adults: raw.guests_count ?? 1,
      children: 0,
      status: raw.status === 'confirmed' ? BookingStatus.CONFIRMED : BookingStatus.CANCELLED,
      totalAmount: parseFloat(raw.total_price ?? '0'),
      channelCommission: parseFloat(raw.service_fee ?? '0'),
      netRevenue: 0,
      currency: 'SAR',
      syncStatus: SyncStatus.PENDING,
      idempotencyKey: '',
      createdAt: new Date(raw.created_at),
      updatedAt: new Date(raw.updated_at ?? raw.created_at),
    };
  }

  private mapEventType(eventType: string): SyncEvent['eventType'] {
    const map: Record<string, SyncEvent['eventType']> = {
      booking_created: 'BOOKING_NEW',
      booking_updated: 'BOOKING_MODIFIED',
      booking_cancelled: 'BOOKING_CANCELLED',
    };
    return map[eventType] ?? 'BOOKING_NEW';
  }

  /** Gathern uses DD/MM/YYYY format */
  private toGathernDate(d: Date): string {
    const day = d.getUTCDate().toString().padStart(2, '0');
    const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }

  /** Converts Gathern DD/MM/YYYY back to ISO YYYY-MM-DD */
  private fromGathernDate(dateStr: string): string {
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
  }
}
