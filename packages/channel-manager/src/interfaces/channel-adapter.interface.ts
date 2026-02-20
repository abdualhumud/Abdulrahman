import {
  Availability,
  Booking,
  ChannelType,
  RatePush,
  SyncEvent,
} from '@rems/shared/types';

// ============================================================
// CHANNEL ADAPTER INTERFACE
// Every OTA adapter (Booking.com, Airbnb, Gathern) implements this.
// ============================================================

export interface ChannelAvailabilityUpdate {
  unitId: string;
  externalRoomId: string;
  dates: Array<{
    date: string;
    isAvailable: boolean;
    price: number;
    minimumStay: number;
    stopSell: boolean;
  }>;
}

export interface ChannelBookingResponse {
  success: boolean;
  externalId?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface IChannelAdapter {
  readonly channel: ChannelType;

  /**
   * Fetches bookings created or modified since the given timestamp.
   * Used as a polling fallback when webhooks are unavailable.
   */
  fetchModifiedBookings(since: Date): Promise<Booking[]>;

  /**
   * Pushes availability (open/close/price) to the OTA for given date ranges.
   */
  pushAvailability(updates: ChannelAvailabilityUpdate[]): Promise<ChannelBookingResponse>;

  /**
   * Pushes rate changes to the OTA across specified date ranges.
   */
  pushRates(ratePush: RatePush): Promise<ChannelBookingResponse>;

  /**
   * Confirms or acknowledges a booking received from this channel.
   */
  acknowledgeBooking(externalBookingId: string): Promise<void>;

  /**
   * Cancels a booking on the OTA side (for double-booking resolution).
   */
  cancelBooking(externalBookingId: string, reason: string): Promise<ChannelBookingResponse>;

  /**
   * Parses a raw incoming webhook payload into a normalized SyncEvent.
   */
  parseWebhookPayload(rawPayload: unknown, headers: Record<string, string>): SyncEvent;

  /**
   * Verifies the HMAC signature of an incoming webhook.
   */
  verifyWebhookSignature(payload: string, signature: string): boolean;
}
