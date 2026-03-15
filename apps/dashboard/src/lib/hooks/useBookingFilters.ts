'use client';

import { useState, useCallback } from 'react';
import type { Booking } from './useBookings';

/**
 * Manages filter + search state for the Bookings page.
 * Keeps local status overrides (e.g. after a check-out optimistic update)
 * so UI state doesn't depend on the mock/localStorage data being mutated.
 */
export function useBookingFilters(allBookings: Booking[]) {
  const STATUSES = ['ALL', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'PENDING'] as const;

  const [filter,        setFilter]        = useState('ALL');
  const [search,        setSearch]        = useState('');
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});

  const getStatus = useCallback(
    (b: Booking) => localStatuses[b.id] ?? b.status,
    [localStatuses],
  );

  const setLocalStatus = useCallback((id: string, status: string) => {
    setLocalStatuses(prev => ({ ...prev, [id]: status }));
  }, []);

  const rows = allBookings.filter(b => {
    const st = getStatus(b);
    const matchesStatus = filter === 'ALL' || st === filter;
    const matchesSearch = !search ||
      b.guest.toLowerCase().includes(search.toLowerCase()) ||
      b.id.toLowerCase().includes(search.toLowerCase()) ||
      b.property.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = {
    confirmed: allBookings.filter(b => getStatus(b) === 'CONFIRMED').length,
    checkedIn: allBookings.filter(b => getStatus(b) === 'CHECKED_IN').length,
    pending:   allBookings.filter(b => getStatus(b) === 'PENDING').length,
    revenue:   allBookings.reduce((s, b) => s + b.amount, 0),
  };

  return {
    STATUSES,
    filter,   setFilter,
    search,   setSearch,
    rows,
    stats,
    getStatus,
    setLocalStatus,
  };
}
