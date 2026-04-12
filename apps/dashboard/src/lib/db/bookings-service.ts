/**
 * bookings-service.ts — CRUD for bookings
 *
 * Replaces RECENT_BOOKINGS mock data in production/staging.
 * Demo mode still uses mock data (no DB call needed).
 */

import { supabase } from '@/lib/supabase';
import type { BookingRow } from '@/lib/database.types';

/* ── Types ──────────────────────────────────────────────────── */

export interface Booking {
  id:           string;
  unitId:       string | null;
  guest:        string;
  guestPhone?:  string;
  guestEmail?:  string;
  property:     string;     // unit name (denormalised for display)
  channel:      string;
  channelColor?: string;
  checkIn:      string;
  checkOut:     string;
  nights:       number;
  amount:       number;
  status:       'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'PENDING';
  notes?:       string;
}

/* ── Converters ─────────────────────────────────────────────── */

function rowToBooking(row: BookingRow & { units?: { name: string } | null }): Booking {
  return {
    id:           row.id,
    unitId:       row.unit_id ?? null,
    guest:        row.guest_name,
    guestPhone:   row.guest_phone ?? undefined,
    guestEmail:   row.guest_email ?? undefined,
    property:     (row as any).units?.name ?? 'Unknown Unit',
    channel:      row.channel,
    channelColor: row.channel_color ?? undefined,
    checkIn:      row.check_in,
    checkOut:     row.check_out,
    nights:       row.nights,
    amount:       row.amount,
    status:       row.status as Booking['status'],
    notes:        row.notes ?? undefined,
  };
}

/* ── CRUD ───────────────────────────────────────────────────── */

/** Fetch all bookings, joining unit name, newest first. */
export async function getBookings(): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, units(name)')
    .order('created_at', { ascending: false });

  if (error) { console.error('[bookings-service] getBookings:', error.message); return []; }
  return (data ?? []).map(rowToBooking);
}

/** Add a new booking. */
export async function addBooking(
  booking: Omit<Booking, 'id'>,
  ownerId: string,
): Promise<Booking | null> {
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      owner_id:      ownerId,
      unit_id:       booking.unitId ?? null,
      guest_name:    booking.guest,
      guest_phone:   booking.guestPhone ?? null,
      guest_email:   booking.guestEmail ?? null,
      channel:       booking.channel,
      channel_color: booking.channelColor ?? null,
      check_in:      booking.checkIn,
      check_out:     booking.checkOut,
      nights:        booking.nights,
      amount:        booking.amount,
      status:        booking.status,
      notes:         booking.notes ?? null,
    })
    .select('*, units(name)')
    .single();

  if (error) { console.error('[bookings-service] addBooking:', error.message); return null; }
  return data ? rowToBooking(data) : null;
}

/** Update booking status (e.g. PENDING → CONFIRMED → CHECKED_IN → CHECKED_OUT). */
export async function updateBookingStatus(
  id:     string,
  status: Booking['status'],
): Promise<boolean> {
  const { error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', id);

  if (error) { console.error('[bookings-service] updateBookingStatus:', error.message); return false; }
  return true;
}

/** Delete a booking. */
export async function deleteBooking(id: string): Promise<boolean> {
  const { error } = await supabase.from('bookings').delete().eq('id', id);
  if (error) { console.error('[bookings-service] deleteBooking:', error.message); return false; }
  return true;
}
