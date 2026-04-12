/**
 * cleaning-service.ts — CRUD for cleaning requests
 *
 * Replaces CLEANING_REQUESTS mock data in production/staging.
 */

import { supabase } from '@/lib/supabase';
import type { CleaningRow } from '@/lib/database.types';

/* ── Types ──────────────────────────────────────────────────── */

export type CleaningStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'INSPECTION_DONE';

export interface CleaningRequest {
  id:           string;
  unitId:       string | null;
  bookingId:    string | null;
  guestName:    string;
  checkoutDate: string;
  status:       CleaningStatus;
  provider?:    string;
  notes?:       string;
}

/* ── Converters ─────────────────────────────────────────────── */

function rowToRequest(row: CleaningRow): CleaningRequest {
  return {
    id:           row.id,
    unitId:       row.unit_id ?? null,
    bookingId:    row.booking_id ?? null,
    guestName:    row.guest_name,
    checkoutDate: row.checkout_date,
    status:       row.status as CleaningStatus,
    provider:     row.provider ?? undefined,
    notes:        row.notes ?? undefined,
  };
}

/* ── CRUD ───────────────────────────────────────────────────── */

/** Fetch all cleaning requests, newest first. */
export async function getCleaningRequests(): Promise<CleaningRequest[]> {
  const { data, error } = await supabase
    .from('cleaning_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) { console.error('[cleaning-service] getCleaningRequests:', error.message); return []; }
  return (data ?? []).map(rowToRequest);
}

/** Create a cleaning request (called when a guest checks out). */
export async function addCleaningRequest(
  req: Omit<CleaningRequest, 'id'>,
  ownerId: string,
): Promise<CleaningRequest | null> {
  const { data, error } = await supabase
    .from('cleaning_requests')
    .insert({
      owner_id:      ownerId,
      unit_id:       req.unitId ?? null,
      booking_id:    req.bookingId ?? null,
      guest_name:    req.guestName,
      checkout_date: req.checkoutDate,
      status:        req.status,
      provider:      req.provider ?? null,
      notes:         req.notes ?? null,
    })
    .select()
    .single();

  if (error) { console.error('[cleaning-service] addCleaningRequest:', error.message); return null; }
  return data ? rowToRequest(data) : null;
}

/** Advance a request to the next status. */
export async function updateCleaningStatus(
  id:       string,
  status:   CleaningStatus,
  provider?: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('cleaning_requests')
    .update({ status, ...(provider !== undefined ? { provider } : {}) })
    .eq('id', id);

  if (error) { console.error('[cleaning-service] updateCleaningStatus:', error.message); return false; }
  return true;
}
