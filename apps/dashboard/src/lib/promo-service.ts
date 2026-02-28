/**
 * promo-service.ts — Promo code management (client-side, localStorage-backed)
 *
 * Super-Admin creates/edits/deletes codes via SuperAdminPage.
 * OnboardingPage validates codes at checkout (Step 4).
 */

export interface PromoCode {
  code: string;            // Uppercase alphanumeric, e.g. 'REMS2026'
  discount: number;        // Percentage off, 1–100
  maxUses: number;         // 0 = unlimited
  usedCount: number;
  expiresAt: string | null; // ISO date string or null = never expires
  active: boolean;
  description: string;
  createdAt: string;
}

export interface PromoValidationResult {
  valid: boolean;
  discount: number;    // 0 if not valid
  message: string;
  code?: string;
}

const KEY = 'rems-promo-codes';

const SEED_CODES: PromoCode[] = [
  {
    code: 'REMS2026', discount: 20, maxUses: 100, usedCount: 3,
    expiresAt: '2026-12-31', active: true,
    description: 'Annual 2026 launch offer',
    createdAt: '2026-01-01',
  },
  {
    code: 'LAUNCH50', discount: 50, maxUses: 50, usedCount: 12,
    expiresAt: '2026-06-30', active: true,
    description: 'Launch week — 50% off first month',
    createdAt: '2026-01-01',
  },
  {
    code: 'EARLYBIRD', discount: 30, maxUses: 0, usedCount: 28,
    expiresAt: null, active: true,
    description: 'Early adopter evergreen discount',
    createdAt: '2026-01-01',
  },
  {
    code: 'PARTNER15', discount: 15, maxUses: 200, usedCount: 5,
    expiresAt: null, active: false,
    description: 'Partner referral — disabled',
    createdAt: '2026-02-01',
  },
];

export function getPromoCodes(): PromoCode[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(KEY) : null;
    if (raw) return JSON.parse(raw) as PromoCode[];
  } catch { /* ignore */ }
  // Seed defaults on first access
  savePromoCodes(SEED_CODES);
  return SEED_CODES;
}

export function savePromoCodes(codes: PromoCode[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(codes)); } catch { /* ignore */ }
}

export function validatePromoCode(rawCode: string): PromoValidationResult {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { valid: false, discount: 0, message: '' };

  const codes = getPromoCodes();
  const found = codes.find(c => c.code === code);

  if (!found) return { valid: false, discount: 0, message: 'Invalid promo code' };
  if (!found.active) return { valid: false, discount: 0, message: 'This promo code is no longer active' };
  if (found.maxUses > 0 && found.usedCount >= found.maxUses) {
    return { valid: false, discount: 0, message: 'Promo code usage limit reached' };
  }
  if (found.expiresAt) {
    const exp = new Date(found.expiresAt);
    exp.setHours(23, 59, 59, 999);
    if (exp < new Date()) {
      return { valid: false, discount: 0, message: 'Promo code has expired' };
    }
  }

  return {
    valid: true,
    discount: found.discount,
    message: `${found.discount}% discount applied!`,
    code: found.code,
  };
}

/** Increment the usedCount of a code (called after checkout confirms) */
export function redeemPromoCode(rawCode: string): void {
  const code = rawCode.trim().toUpperCase();
  const codes = getPromoCodes();
  const idx = codes.findIndex(c => c.code === code);
  if (idx !== -1) {
    codes[idx].usedCount += 1;
    savePromoCodes(codes);
  }
}

export function createPromoCode(partial: Omit<PromoCode, 'usedCount' | 'createdAt'>): void {
  const codes = getPromoCodes();
  const exists = codes.find(c => c.code === partial.code.toUpperCase());
  if (exists) throw new Error('Code already exists');
  codes.unshift({
    ...partial,
    code: partial.code.toUpperCase(),
    usedCount: 0,
    createdAt: new Date().toISOString().slice(0, 10),
  });
  savePromoCodes(codes);
}

export function updatePromoCode(code: string, patch: Partial<PromoCode>): void {
  const codes = getPromoCodes();
  const idx = codes.findIndex(c => c.code === code);
  if (idx === -1) throw new Error('Code not found');
  codes[idx] = { ...codes[idx], ...patch };
  savePromoCodes(codes);
}

export function deletePromoCode(code: string): void {
  const codes = getPromoCodes().filter(c => c.code !== code);
  savePromoCodes(codes);
}
