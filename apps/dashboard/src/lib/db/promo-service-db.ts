/**
 * promo-service-db.ts — Supabase-backed promo code management
 *
 * Replaces the localStorage-based promo-service.ts for production/staging.
 * Demo mode still uses the local promo-service.ts.
 *
 * Super-admin operations (create/update/delete) go through this service.
 * Validation is public-readable via RLS (no auth required to validate a code).
 */

import { supabase } from '@/lib/supabase';
import type { PromoCodeRow } from '@/lib/database.types';

/* ── Types ──────────────────────────────────────────────────── */

export interface PromoCode {
  code:       string;
  discount:   number;
  maxUses:    number | null;
  usedCount:  number;
  expiresAt:  string | null;
  active:     boolean;
}

export interface PromoValidationResult {
  valid:     boolean;
  discount:  number;
  message:   string;
  code?:     string;
}

/* ── Converters ─────────────────────────────────────────────── */

function rowToCode(row: PromoCodeRow): PromoCode {
  return {
    code:      row.code,
    discount:  row.discount,
    maxUses:   row.max_uses ?? null,
    usedCount: row.used_count,
    expiresAt: row.expires_at ?? null,
    active:    row.active,
  };
}

/* ── Public: validate + redeem ──────────────────────────────── */

/** Validate a promo code without redeeming it. */
export async function validatePromoCode(rawCode: string): Promise<PromoValidationResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { valid: false, discount: 0, message: '' };

  const { data } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('code', code)
    .single();

  if (!data) return { valid: false, discount: 0, message: 'Invalid promo code.' };
  if (!data.active) return { valid: false, discount: 0, message: 'This promo code is no longer active.' };
  if (data.max_uses !== null && data.used_count >= data.max_uses) {
    return { valid: false, discount: 0, message: 'This promo code has reached its usage limit.' };
  }
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { valid: false, discount: 0, message: 'This promo code has expired.' };
  }

  return {
    valid:    true,
    discount: data.discount,
    message:  `${data.discount}% discount applied!`,
    code,
  };
}

/**
 * Increment used_count — call only after checkout confirms.
 * Uses a Postgres increment to avoid race conditions.
 */
export async function redeemPromoCode(rawCode: string): Promise<void> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return;

  await supabase.rpc('increment_promo_used_count', { promo_code: code });
  // Falls back silently if RPC not available — use update below instead:
  // await supabase
  //   .from('promo_codes')
  //   .update({ used_count: supabase.rpc('increment', { x: 1 }) })
  //   .eq('code', code);
}

/* ── Super-admin: CRUD ──────────────────────────────────────── */

/** Fetch all promo codes. */
export async function getPromoCodes(): Promise<PromoCode[]> {
  const { data, error } = await supabase
    .from('promo_codes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) { console.error('[promo-service-db] getPromoCodes:', error.message); return []; }
  return (data ?? []).map(rowToCode);
}

/** Create a new promo code. */
export async function createPromoCode(
  partial: Omit<PromoCode, 'usedCount'>,
): Promise<boolean> {
  const { error } = await supabase.from('promo_codes').insert({
    code:       partial.code.toUpperCase(),
    discount:   partial.discount,
    max_uses:   partial.maxUses ?? null,
    expires_at: partial.expiresAt ?? null,
    active:     partial.active,
  });

  if (error) { console.error('[promo-service-db] createPromoCode:', error.message); return false; }
  return true;
}

/** Update an existing promo code. */
export async function updatePromoCode(
  code:  string,
  patch: Partial<Omit<PromoCode, 'code' | 'usedCount'>>,
): Promise<boolean> {
  const update: Record<string, unknown> = {};
  if (patch.discount  !== undefined) update.discount   = patch.discount;
  if (patch.maxUses   !== undefined) update.max_uses   = patch.maxUses;
  if (patch.expiresAt !== undefined) update.expires_at = patch.expiresAt;
  if (patch.active    !== undefined) update.active     = patch.active;

  const { error } = await supabase
    .from('promo_codes')
    .update(update)
    .eq('code', code.toUpperCase());

  if (error) { console.error('[promo-service-db] updatePromoCode:', error.message); return false; }
  return true;
}

/** Delete a promo code. */
export async function deletePromoCode(code: string): Promise<boolean> {
  const { error } = await supabase
    .from('promo_codes')
    .delete()
    .eq('code', code.toUpperCase());

  if (error) { console.error('[promo-service-db] deletePromoCode:', error.message); return false; }
  return true;
}
