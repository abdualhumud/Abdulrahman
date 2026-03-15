/**
 * staging-auth.ts — Multi-tenant auth for the Staging / Trial environment.
 *
 * Architecture (client-side only, no backend):
 *  • All users are stored in localStorage under 'rems-staging-users'
 *  • Active session (logged-in user) lives in sessionStorage under 'rems-staging-session'
 *  • All property/booking data is scoped to the user's ID:
 *      'rems-staging-{userId}-units', 'rems-staging-{userId}-journey', etc.
 *
 * Security: passwords are hashed with SHA-256 (Web Crypto API) + a static app salt.
 * This is still client-side only — not production-grade — but meaningfully stronger
 * than Base64 encoding: credentials are not trivially readable from localStorage.
 */

export interface StagingUser {
  id: string;           // generated with crypto.getRandomValues()
  email: string;
  passwordHash: string; // SHA-256(password + APP_SALT) — hex string
  name: string;
  companyName: string;
  createdAt: string;
  plan: string;         // chosen subscription plan
  promoCode: string;    // promo code applied at registration (empty if none)
}

const USERS_KEY   = 'rems-staging-users';
const SESSION_KEY = 'rems-staging-session'; // sessionStorage — resets on tab close

/** Static app-level salt mixed into every password hash. */
const APP_SALT = 'rems-staging-2026';

/** Generates a cryptographically random user ID. */
function genId(): string {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `user_${Date.now().toString(36)}_${hex}`;
}

/** Returns SHA-256(password + APP_SALT) as a lowercase hex string. */
async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password + APP_SALT);
  const buf  = await globalThis.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function getStagingUsers(): StagingUser[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(USERS_KEY) : null;
    return raw ? (JSON.parse(raw) as StagingUser[]) : [];
  } catch { return []; }
}

function saveStagingUsers(users: StagingUser[]): void {
  try { localStorage.setItem(USERS_KEY, JSON.stringify(users)); } catch { /* ignore */ }
}

export function getStagingSession(): StagingUser | null {
  try {
    const raw = typeof window !== 'undefined' ? sessionStorage.getItem(SESSION_KEY) : null;
    return raw ? (JSON.parse(raw) as StagingUser) : null;
  } catch { return null; }
}

function setSession(user: StagingUser): void {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(user)); } catch { /* ignore */ }
}

export function logoutStagingUser(): void {
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}

export type RegisterResult =
  | { ok: true;  user: StagingUser }
  | { ok: false; error: string };

export async function registerStagingUser(
  email: string,
  password: string,
  name: string,
  companyName: string,
  plan: string,
  promoCode: string,
): Promise<RegisterResult> {
  const users = getStagingUsers();
  const exists = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (exists) return { ok: false, error: 'An account with this email already exists' };

  const user: StagingUser = {
    id: genId(),
    email: email.trim().toLowerCase(),
    passwordHash: await hashPassword(password),
    name: name.trim(),
    companyName: companyName.trim(),
    createdAt: new Date().toISOString(),
    plan,
    promoCode,
  };
  users.push(user);
  saveStagingUsers(users);
  setSession(user);
  return { ok: true, user };
}

export async function loginStagingUser(email: string, password: string): Promise<StagingUser | null> {
  const users = getStagingUsers();
  const hash  = await hashPassword(password);
  const user  = users.find(
    u => u.email === email.trim().toLowerCase() && u.passwordHash === hash,
  );
  if (!user) return null;
  setSession(user);
  return user;
}

/** Storage key for a given user's units list */
export function stagingUnitsKey(userId: string): string {
  return `rems-staging-${userId}-units`;
}

/** Storage key for a given user's journey state */
export function stagingJourneyKey(userId: string): string {
  return `rems-staging-${userId}-journey`;
}

/** Storage key for a given user's language preference */
export function stagingLangKey(userId: string): string {
  return `rems-staging-${userId}-lang`;
}

/** Storage key for a given user's onboarding-done flag */
export function stagingOnboardingKey(userId: string): string {
  return `rems-staging-${userId}-onboarding`;
}

/** Summary of all staging accounts — used by Super-Admin BI dashboard */
export function getStagingAccountSummaries() {
  return getStagingUsers().map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    companyName: u.companyName,
    plan: u.plan,
    promoCode: u.promoCode,
    createdAt: u.createdAt,
    unitCount: (() => {
      try {
        const raw = localStorage.getItem(stagingUnitsKey(u.id));
        return raw ? (JSON.parse(raw) as unknown[]).length : 0;
      } catch { return 0; }
    })(),
  }));
}
