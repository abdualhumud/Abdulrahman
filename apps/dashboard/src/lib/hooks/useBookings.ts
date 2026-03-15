'use client';

import { useState } from 'react';
import { RECENT_BOOKINGS } from '@/lib/mock-data';
import { useMode } from '@/lib/mode-context';

const MANUAL_BOOKINGS_KEY = 'rems-manual-bookings';

export type Booking = typeof RECENT_BOOKINGS[number];

function loadManualBookings(): Booking[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MANUAL_BOOKINGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveManualBookings(bookings: Booking[]): void {
  try { localStorage.setItem(MANUAL_BOOKINGS_KEY, JSON.stringify(bookings)); }
  catch { /* storage quota */ }
}

/**
 * Manages the full booking list — merges mock data (demo) or localStorage data
 * (production/staging) with manually-added bookings.
 */
export function useBookings() {
  const { isDemo } = useMode();

  const [manualBookings, setManualBookings] = useState<Booking[]>(() =>
    isDemo ? [] : loadManualBookings()
  );

  const allBookings: Booking[] = [
    ...(isDemo ? (RECENT_BOOKINGS as Booking[]) : []),
    ...manualBookings,
  ];

  const addBooking = (booking: Booking) => {
    const next = [booking, ...manualBookings];
    setManualBookings(next);
    if (!isDemo) saveManualBookings(next);
  };

  return { allBookings, addBooking };
}
