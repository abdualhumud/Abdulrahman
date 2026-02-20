import { createHash, randomUUID } from 'crypto';

// ============================================================
// SHARED UTILITIES
// ============================================================

/**
 * Generates a deterministic idempotency key for a booking attempt.
 * Identical inputs always produce the same key, enabling safe retries.
 */
export function generateIdempotencyKey(params: {
  channel: string;
  externalBookingId: string;
  propertyId: string;
  checkIn: string;
  checkOut: string;
}): string {
  const raw = `${params.channel}:${params.externalBookingId}:${params.propertyId}:${params.checkIn}:${params.checkOut}`;
  return createHash('sha256').update(raw).digest('hex');
}

/**
 * Generates the Redis lock key for a unit's date range.
 * Used to prevent concurrent writes during double-booking resolution.
 */
export function buildAvailabilityLockKey(
  propertyId: string,
  unitId: string,
  checkIn: string,
  checkOut: string,
): string {
  return `lock:avail:${propertyId}:${unitId}:${checkIn}:${checkOut}`;
}

/**
 * Generates a sorted array of ISO date strings between checkIn and checkOut
 * (exclusive of checkout date, as per hotel industry convention).
 */
export function expandDateRange(checkIn: string, checkOut: string): string[] {
  const dates: string[] = [];
  const current = new Date(checkIn);
  const end = new Date(checkOut);
  while (current < end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

/**
 * Calculates the number of nights between two ISO date strings.
 */
export function calculateNights(checkIn: string, checkOut: string): number {
  const msPerDay = 86_400_000;
  return (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / msPerDay;
}

/**
 * Exponential backoff delay helper for sync retries.
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { randomUUID as generateId };
