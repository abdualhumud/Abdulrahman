/**
 * auth-service.ts — Supabase Auth + profile management
 *
 * Replaces the browser-only staging-auth.ts mock.
 * Works across all devices and browsers — data lives in Supabase, not localStorage.
 *
 * Exports mirror the staging-auth.ts API surface so callers need minimal changes.
 */

import { supabase } from '@/lib/supabase';
import type { ProfileRow } from '@/lib/database.types';

/* ── Types ──────────────────────────────────────────────────── */

export interface AuthUser {
  id:           string;
  email:        string;
  fullName:     string;
  companyName:  string;
  plan:         string;
  promoCode:    string;
  onboardingDone: boolean;
}

export type AuthResult =
  | { ok: true;  user: AuthUser }
  | { ok: false; error: string };

/* ── Helpers ────────────────────────────────────────────────── */

function rowToUser(profile: ProfileRow): AuthUser {
  return {
    id:             profile.id,
    email:          profile.email,
    fullName:       profile.full_name,
    companyName:    profile.company_name ?? '',
    plan:           profile.plan,
    promoCode:      profile.promo_code ?? '',
    onboardingDone: profile.onboarding_done,
  };
}

/* ── Auth operations ────────────────────────────────────────── */

/**
 * Register a new user with email + password.
 * Creates auth.users row + profiles row (via DB trigger).
 */
export async function registerUser(
  email:       string,
  password:    string,
  fullName:    string,
  companyName: string,
  plan:        string,
  promoCode:   string,
): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });

  if (error) {
    if (error.message.includes('already registered')) {
      return { ok: false, error: 'An account with this email already exists.' };
    }
    return { ok: false, error: error.message };
  }

  if (!data.user) {
    return { ok: false, error: 'Registration failed — please try again.' };
  }

  // Update profile with extra fields (trigger only inserts email + full_name)
  const profilePatch: Record<string, unknown> = {
    company_name: companyName,
    plan,
    promo_code: promoCode || null,
  };
  await (supabase.from('profiles') as ReturnType<typeof supabase.from>)
    .update(profilePatch)
    .eq('id', data.user.id);

  const profile = await getProfile(data.user.id);
  if (!profile) return { ok: false, error: 'Profile creation failed.' };

  return { ok: true, user: profile };
}

/**
 * Sign in with email + password.
 */
export async function loginUser(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.message.includes('Invalid login')) {
      return { ok: false, error: 'Invalid email or password.' };
    }
    return { ok: false, error: error.message };
  }

  if (!data.user) return { ok: false, error: 'Login failed.' };

  const profile = await getProfile(data.user.id);
  if (!profile) return { ok: false, error: 'Profile not found.' };

  return { ok: true, user: profile };
}

/**
 * Sign out the current user.
 */
export async function logoutUser(): Promise<void> {
  await supabase.auth.signOut();
}

/**
 * Get the currently signed-in user from the active session.
 * Returns null if not signed in.
 */
export async function getCurrentAuthUser(): Promise<AuthUser | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return getProfile(user.id);
}

/**
 * Fetch a user's profile by ID.
 */
export async function getProfile(userId: string): Promise<AuthUser | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  return data ? rowToUser(data) : null;
}

/**
 * Update profile fields (used during/after onboarding).
 */
export async function updateProfile(
  userId: string,
  patch: Partial<Omit<ProfileRow, 'id' | 'created_at'>>,
): Promise<void> {
  await supabase.from('profiles').update(patch).eq('id', userId);
}

/**
 * Mark onboarding as complete for a user.
 */
export async function completeOnboarding(userId: string): Promise<void> {
  await supabase
    .from('profiles')
    .update({ onboarding_done: true })
    .eq('id', userId);
}

/**
 * Subscribe to auth state changes (sign in / sign out).
 * Returns an unsubscribe function.
 */
export function onAuthStateChange(
  callback: (user: AuthUser | null) => void,
): () => void {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (_event, session) => {
      if (!session?.user) { callback(null); return; }
      const profile = await getProfile(session.user.id);
      callback(profile);
    },
  );
  return () => subscription.unsubscribe();
}
