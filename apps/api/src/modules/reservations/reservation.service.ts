import {
  Booking,
  BookingStatus,
  ChannelType,
  SyncStatus,
} from '@rems/shared/types';
import { generateId, generateIdempotencyKey, calculateNights } from '@rems/shared/utils';
import { ConflictResolver } from '../../../worker/src/conflict-resolver/conflict-resolver';

// ============================================================
// RESERVATION SERVICE — PMIS Reservation Engine
//
// Handles manual bookings, walk-ins, and maintenance blocks.
// These originate from the PMIS dashboard (not OTAs).
// ============================================================

interface DatabaseClient {
  query<T>(sql: string, params: unknown[]): Promise<{ rows: T[] }>;
  transaction<T>(fn: (tx: DatabaseClient) => Promise<T>): Promise<T>;
}

export interface CreateManualBookingDto {
  propertyId: string;
  unitId: string;
  guestFirstName: string;
  guestLastName: string;
  guestEmail?: string;
  guestPhone?: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  totalAmount: number;
  currency: string;
  specialRequests?: string;
  type: 'DIRECT' | 'WALK_IN' | 'MAINTENANCE';
}

export class ReservationService {
  constructor(
    private readonly db: DatabaseClient,
    private readonly conflictResolver: ConflictResolver,
  ) {}

  // ============================================================
  // MASTER CALENDAR — Manual Booking
  // ============================================================

  async createManualBooking(dto: CreateManualBookingDto): Promise<Booking> {
    const guestId = await this.upsertGuest({
      firstName: dto.guestFirstName,
      lastName: dto.guestLastName,
      email: dto.guestEmail,
      phone: dto.guestPhone,
    });

    const channel = dto.type === 'WALK_IN' ? ChannelType.WALK_IN : ChannelType.DIRECT;
    const bookingId = generateId();

    const booking: Booking = {
      id: bookingId,
      channel,
      propertyId: dto.propertyId,
      unitId: dto.unitId,
      guestId,
      checkIn: dto.checkIn,
      checkOut: dto.checkOut,
      nights: calculateNights(dto.checkIn, dto.checkOut),
      adults: dto.adults,
      children: dto.children,
      status: BookingStatus.CONFIRMED,
      totalAmount: dto.totalAmount,
      channelCommission: 0,  // No commission for direct bookings
      netRevenue: dto.totalAmount,
      currency: dto.currency,
      specialRequests: dto.specialRequests,
      syncStatus: SyncStatus.PENDING,
      idempotencyKey: generateIdempotencyKey({
        channel,
        externalBookingId: bookingId,
        propertyId: dto.propertyId,
        checkIn: dto.checkIn,
        checkOut: dto.checkOut,
      }),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.conflictResolver.resolveAndConfirm(booking);
  }

  // ============================================================
  // MAINTENANCE BLOCK
  // ============================================================

  async blockForMaintenance(params: {
    propertyId: string;
    unitId: string;
    startDate: string;
    endDate: string;
    reason: string;
  }): Promise<Booking> {
    const bookingId = generateId();

    const maintenanceBooking: Booking = {
      id: bookingId,
      channel: ChannelType.DIRECT,
      propertyId: params.propertyId,
      unitId: params.unitId,
      guestId: '',
      checkIn: params.startDate,
      checkOut: params.endDate,
      nights: calculateNights(params.startDate, params.endDate),
      adults: 0,
      children: 0,
      status: BookingStatus.MAINTENANCE,
      totalAmount: 0,
      channelCommission: 0,
      netRevenue: 0,
      currency: 'SAR',
      specialRequests: params.reason,
      syncStatus: SyncStatus.PENDING,
      idempotencyKey: generateIdempotencyKey({
        channel: ChannelType.DIRECT,
        externalBookingId: `MAINT-${bookingId}`,
        propertyId: params.propertyId,
        checkIn: params.startDate,
        checkOut: params.endDate,
      }),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Maintenance blocks take highest priority — will override any channel
    return this.conflictResolver.resolveAndConfirm(maintenanceBooking);
  }

  // ============================================================
  // MASTER CALENDAR QUERY
  // ============================================================

  async getMasterCalendar(
    propertyId: string,
    fromDate: string,
    toDate: string,
  ): Promise<CalendarDay[]> {
    const result = await this.db.query<{
      date: string;
      unit_id: string;
      unit_name: string;
      is_available: boolean;
      price: number;
      booking_id: string | null;
      booking_status: string | null;
      channel: string | null;
      guest_name: string | null;
    }>(
      `SELECT
          a.date::text,
          u.id AS unit_id,
          u.name AS unit_name,
          a.is_available,
          a.price,
          b.id AS booking_id,
          b.status AS booking_status,
          b.channel::text,
          CONCAT(g.first_name, ' ', g.last_name) AS guest_name
        FROM availability a
        JOIN units u ON a.unit_id = u.id
        LEFT JOIN bookings b ON (
          b.unit_id = a.unit_id
          AND a.date >= b.check_in
          AND a.date < b.check_out
          AND b.status NOT IN ('CANCELLED', 'NO_SHOW')
        )
        LEFT JOIN guests g ON b.guest_id = g.id
        WHERE u.property_id = $1
          AND a.date BETWEEN $2 AND $3
        ORDER BY u.name, a.date`,
      [propertyId, fromDate, toDate],
    );

    // Group by date for the calendar view
    const calendarMap = new Map<string, CalendarDay>();
    for (const row of result.rows) {
      if (!calendarMap.has(row.date)) {
        calendarMap.set(row.date, { date: row.date, units: [] });
      }
      calendarMap.get(row.date)!.units.push({
        unitId: row.unit_id,
        unitName: row.unit_name,
        isAvailable: row.is_available,
        price: row.price,
        booking: row.booking_id
          ? {
              id: row.booking_id,
              status: row.booking_status!,
              channel: row.channel!,
              guestName: row.guest_name ?? 'Unknown',
            }
          : null,
      });
    }

    return Array.from(calendarMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }

  async cancelBooking(bookingId: string, reason: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      const result = await tx.query<{
        unit_id: string;
        check_in: string;
        check_out: string;
        status: string;
      }>(
        `UPDATE bookings
            SET status = 'CANCELLED', updated_at = NOW()
          WHERE id = $1 AND status NOT IN ('CANCELLED', 'CHECKED_OUT')
          RETURNING unit_id, check_in::text, check_out::text, status`,
        [bookingId],
      );

      if (!result.rows.length) throw new Error(`Booking ${bookingId} cannot be cancelled`);

      const { unit_id, check_in, check_out } = result.rows[0];

      // Reopen availability
      await tx.query(
        `UPDATE availability
            SET is_available = TRUE, stop_sell = FALSE, version = version + 1, updated_at = NOW()
          WHERE unit_id = $1 AND date >= $2::date AND date < $3::date`,
        [unit_id, check_in, check_out],
      );
    });
  }

  // ---- Private Helpers ----

  private async upsertGuest(guest: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  }): Promise<string> {
    if (guest.email) {
      const existing = await this.db.query<{ id: string }>(
        'SELECT id FROM guests WHERE email = $1',
        [guest.email],
      );
      if (existing.rows.length) return existing.rows[0].id;
    }

    const id = generateId();
    await this.db.query(
      `INSERT INTO guests (id, first_name, last_name, email, phone)
        VALUES ($1, $2, $3, $4, $5)`,
      [id, guest.firstName, guest.lastName, guest.email ?? null, guest.phone ?? null],
    );
    return id;
  }
}

// ---- Types ----

interface CalendarDay {
  date: string;
  units: CalendarUnit[];
}

interface CalendarUnit {
  unitId: string;
  unitName: string;
  isAvailable: boolean;
  price: number;
  booking: {
    id: string;
    status: string;
    channel: string;
    guestName: string;
  } | null;
}
