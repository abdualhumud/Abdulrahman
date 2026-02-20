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
// AIRBNB ADAPTER
//
// Integration strategy:
//   • Primary:  Webhooks via Airbnb Host API
//   • Rate Limit: 60 requests/minute (per listing)
//   • Protocol: JSON REST (OAuth 2.0)
//   • Calendar: iCal export URL used as fallback sync
// ============================================================

export class AirbnbAdapter implements IChannelAdapter {
  readonly channel = ChannelType.AIRBNB;
  private readonly http: AxiosInstance;
  private readonly webhookSecret: string;
  private readonly listingId: string;

  constructor(config: {
    accessToken: string;
    listingId: string;
    webhookSecret: string;
    baseUrl?: string;
  }) {
    this.webhookSecret = config.webhookSecret;
    this.listingId = config.listingId;
    this.http = axios.create({
      baseURL: config.baseUrl ?? 'https://api.airbnb.com/v2',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
        'X-Airbnb-API-Version': '2',
      },
      timeout: 15_000,
    });
  }

  async fetchModifiedBookings(since: Date): Promise<Booking[]> {
    const response = await this.http.get('/reservations', {
      params: {
        listing_id: this.listingId,
        _updated_at_gte: since.toISOString(),
        _format: 'for_mobile_sync',
        _limit: 50,
      },
    });

    return (response.data.reservations ?? []).map(this.normalizeBooking.bind(this));
  }

  async pushAvailability(updates: ChannelAvailabilityUpdate[]): Promise<ChannelBookingResponse> {
    // Airbnb uses calendar_operations endpoint for batch updates
    const operations = updates.flatMap((u) =>
      u.dates.map((d) => ({
        listing_id: this.listingId,
        room_type_id: u.externalRoomId,
        dates: [d.date],
        daily_price: d.price * 100,  // Airbnb expects amounts in cents
        available: d.isAvailable && !d.stopSell,
        min_nights: d.minimumStay,
      })),
    );

    try {
      await this.http.post('/calendar_operations', { operations });
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        errorCode: err.response?.data?.error_code,
        errorMessage: err.response?.data?.error_message ?? err.message,
      };
    }
  }

  async pushRates(ratePush: RatePush): Promise<ChannelBookingResponse> {
    try {
      await this.http.post('/listing_base_prices', {
        listing_id: this.listingId,
        start_date: ratePush.dateRange.from,
        end_date: ratePush.dateRange.to,
        price: ratePush.price * 100,  // cents
        currency_code: ratePush.currency,
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, errorMessage: err.message };
    }
  }

  async acknowledgeBooking(_externalBookingId: string): Promise<void> {
    // Airbnb auto-confirms through their platform; no explicit ACK needed
  }

  async cancelBooking(externalBookingId: string, reason: string): Promise<ChannelBookingResponse> {
    try {
      await this.http.post(`/reservations/${externalBookingId}/cancel`, {
        cancel_reason: reason,
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, errorMessage: err.message };
    }
  }

  parseWebhookPayload(rawPayload: unknown, _headers: Record<string, string>): SyncEvent {
    const payload = rawPayload as Record<string, any>;
    return {
      id: generateId(),
      channel: ChannelType.AIRBNB,
      eventType: this.mapEventType(payload.type),
      payload: rawPayload,
      receivedAt: new Date(),
      status: SyncStatus.PENDING,
      retryCount: 0,
    };
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const expected = createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('base64');
    return expected === signature;
  }

  // ---- Private Helpers ----

  private normalizeBooking(raw: any): Booking {
    const totalCents: number = raw.expected_payout_amount_accurate ?? 0;
    return {
      id: generateId(),
      externalId: raw.confirmation_code,
      channel: ChannelType.AIRBNB,
      propertyId: '',
      unitId: '',
      guestId: '',
      checkIn: raw.start_date,
      checkOut: raw.end_date,
      nights: 0,
      adults: raw.number_of_guests ?? 1,
      children: 0,
      status: this.mapStatus(raw.status_type),
      totalAmount: totalCents / 100,
      channelCommission: (raw.host_service_fee_accurate ?? 0) / 100,
      netRevenue: 0,
      currency: raw.listing_currency ?? 'SAR',
      syncStatus: SyncStatus.PENDING,
      idempotencyKey: '',
      createdAt: new Date(raw.created_at),
      updatedAt: new Date(raw.updated_at ?? raw.created_at),
    };
  }

  private mapStatus(status: string): BookingStatus {
    const map: Record<string, BookingStatus> = {
      accepted: BookingStatus.CONFIRMED,
      cancelled_by_guest: BookingStatus.CANCELLED,
      cancelled_by_host: BookingStatus.CANCELLED,
      checked_in: BookingStatus.CHECKED_IN,
      checked_out: BookingStatus.CHECKED_OUT,
    };
    return map[status] ?? BookingStatus.PENDING;
  }

  private mapEventType(type: string): SyncEvent['eventType'] {
    const map: Record<string, SyncEvent['eventType']> = {
      'reservations.created': 'BOOKING_NEW',
      'reservations.updated': 'BOOKING_MODIFIED',
      'reservations.cancelled': 'BOOKING_CANCELLED',
    };
    return map[type] ?? 'BOOKING_NEW';
  }
}
