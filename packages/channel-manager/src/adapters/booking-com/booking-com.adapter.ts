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
// BOOKING.COM ADAPTER
//
// Integration strategy:
//   • Primary:  Webhooks (Push notifications from Booking.com)
//   • Fallback: REST polling every 60s via Demand API v3
//   • Protocol: XML/HTTPS for availability, JSON for messaging
// ============================================================

export class BookingComAdapter implements IChannelAdapter {
  readonly channel = ChannelType.BOOKING_COM;
  private readonly http: AxiosInstance;
  private readonly webhookSecret: string;
  private readonly hotelId: string;

  constructor(config: {
    apiKey: string;
    hotelId: string;
    webhookSecret: string;
    baseUrl?: string;
  }) {
    this.webhookSecret = config.webhookSecret;
    this.hotelId = config.hotelId;
    this.http = axios.create({
      baseURL: config.baseUrl ?? 'https://supply-xml.booking.com',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/xml',
        'Accept': 'application/xml',
      },
      timeout: 15_000,
    });
  }

  async fetchModifiedBookings(since: Date): Promise<Booking[]> {
    const response = await this.http.get('/hotels/reservations', {
      params: {
        hotel_ids: this.hotelId,
        modification_date_from: since.toISOString(),
        status: 'new,modified,cancelled',
      },
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    });

    return (response.data.reservations ?? []).map(this.normalizeBooking.bind(this));
  }

  async pushAvailability(updates: ChannelAvailabilityUpdate[]): Promise<ChannelBookingResponse> {
    const xmlPayload = this.buildAvailabilityXml(updates);
    try {
      await this.http.post('/hotels/availability', xmlPayload);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        errorCode: err.response?.status?.toString(),
        errorMessage: err.message,
      };
    }
  }

  async pushRates(ratePush: RatePush): Promise<ChannelBookingResponse> {
    const xmlPayload = this.buildRateXml(ratePush);
    try {
      await this.http.post('/hotels/rates', xmlPayload);
      return { success: true };
    } catch (err: any) {
      return { success: false, errorCode: err.response?.status?.toString(), errorMessage: err.message };
    }
  }

  async acknowledgeBooking(externalBookingId: string): Promise<void> {
    await this.http.post(
      `/hotels/reservations/${externalBookingId}/acknowledge`,
      null,
      { headers: { 'Content-Type': 'application/json' } },
    );
  }

  async cancelBooking(externalBookingId: string, reason: string): Promise<ChannelBookingResponse> {
    try {
      await this.http.post(`/hotels/reservations/${externalBookingId}/cancel`, { reason });
      return { success: true };
    } catch (err: any) {
      return { success: false, errorMessage: err.message };
    }
  }

  parseWebhookPayload(rawPayload: unknown, headers: Record<string, string>): SyncEvent {
    const payload = rawPayload as Record<string, any>;
    return {
      id: generateId(),
      channel: ChannelType.BOOKING_COM,
      eventType: this.mapEventType(payload.event?.type),
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
    return `sha256=${expected}` === signature;
  }

  // ---- Private Helpers ----

  private normalizeBooking(raw: any): Booking {
    return {
      id: generateId(),
      externalId: raw.reservation_id,
      channel: ChannelType.BOOKING_COM,
      propertyId: '',          // Resolved by mapping lookup in SyncEngine
      unitId: '',
      guestId: '',
      checkIn: raw.arrival_date,
      checkOut: raw.departure_date,
      nights: 0,
      adults: raw.number_of_adults ?? 1,
      children: raw.number_of_children ?? 0,
      status: this.mapStatus(raw.status),
      totalAmount: parseFloat(raw.total_amount ?? '0'),
      channelCommission: parseFloat(raw.commission_amount ?? '0'),
      netRevenue: 0,
      currency: raw.currency ?? 'SAR',
      syncStatus: SyncStatus.PENDING,
      idempotencyKey: '',
      createdAt: new Date(raw.booking_date),
      updatedAt: new Date(raw.modification_date ?? raw.booking_date),
    };
  }

  private mapStatus(bdcStatus: string): BookingStatus {
    const map: Record<string, BookingStatus> = {
      new: BookingStatus.CONFIRMED,
      modified: BookingStatus.CONFIRMED,
      cancelled: BookingStatus.CANCELLED,
      no_show: BookingStatus.NO_SHOW,
    };
    return map[bdcStatus] ?? BookingStatus.PENDING;
  }

  private mapEventType(eventType: string): SyncEvent['eventType'] {
    const map: Record<string, SyncEvent['eventType']> = {
      'reservation.new': 'BOOKING_NEW',
      'reservation.modified': 'BOOKING_MODIFIED',
      'reservation.cancelled': 'BOOKING_CANCELLED',
    };
    return map[eventType] ?? 'BOOKING_NEW';
  }

  private buildAvailabilityXml(updates: ChannelAvailabilityUpdate[]): string {
    const rows = updates
      .flatMap((u) =>
        u.dates.map(
          (d) => `
      <avail room_id="${u.externalRoomId}" date="${d.date}"
             available="${d.isAvailable ? 1 : 0}"
             stop_sell="${d.stopSell ? 1 : 0}"
             price="${d.price}"
             min_stay="${d.minimumStay}"/>`,
        ),
      )
      .join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<OTA_HotelAvailNotifRQ>
  <AvailStatusMessages HotelCode="${this.hotelId}">${rows}
  </AvailStatusMessages>
</OTA_HotelAvailNotifRQ>`;
  }

  private buildRateXml(ratePush: RatePush): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<OTA_HotelRatePlanNotifRQ>
  <RatePlans HotelCode="${this.hotelId}">
    <RatePlan DateRange Start="${ratePush.dateRange.from}" End="${ratePush.dateRange.to}">
      <Rates>
        <Rate UnitMultiplier="1" CurrencyCode="${ratePush.currency}">
          <BaseByGuestAmts>
            <BaseByGuestAmt NumberOfGuests="1" AmountBeforeTax="${ratePush.price}"/>
          </BaseByGuestAmts>
        </Rate>
      </Rates>
    </RatePlan>
  </RatePlans>
</OTA_HotelRatePlanNotifRQ>`;
  }
}
