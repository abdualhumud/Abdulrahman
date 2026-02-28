/**
 * staging-auth.ts — Multi-tenant auth for the Staging / Trial environment.
 *
 * Architecture (client-side only, no backend):
 *  • All users are stored in localStorage under 'rems-staging-users'
 *  • Active session (logged-in user) lives in sessionStorage under 'rems-staging-session'
 *  • All property/booking data is scoped to the user's ID:
 *      'rems-staging-{userId}-units', 'rems-staging-{userId}-journey', etc.
 *
 * Security note: passwords are Base64-encoded (NOT cryptographically hashed).
 * This is intentional for a static demo app — never use this pattern in production.
 */

export interface StagingUser {
  id: string;           // generated UUID-like string
  email: string;
  passwordB64: string;  // base64(password) — demo-only, not production-safe
  name: string;
  companyName: string;
  createdAt: string;
  plan: string;         // chosen subscription plan
  promoCode: string;    // promo code applied at registration (empty if none)
}

const USERS_KEY   = 'rems-staging-users';
const SESSION_KEY = 'rems-staging-session'; // sessionStorage — resets on tab close

function genId(): string {
  return `user_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function b64(str: string): string {
  try { return btoa(unescape(encodeURIComponent(str))); } catch { return btoa(str); }
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

export function registerStagingUser(
  email: string,
  password: string,
  name: string,
  companyName: string,
  plan: string,
  promoCode: string,
): RegisterResult {
  const users = getStagingUsers();
  const exists = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (exists) return { ok: false, error: 'An account with this email already exists' };

  const user: StagingUser = {
    id: genId(),
    email: email.trim().toLowerCase(),
    passwordB64: b64(password),
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

export function loginStagingUser(email: string, password: string): StagingUser | null {
  const users = getStagingUsers();
  const user = users.find(
    u => u.email === email.trim().toLowerCase() && u.passwordB64 === b64(password),
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
