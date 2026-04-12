/**
 * supabase.ts — Supabase client singleton
 *
 * Reads credentials from env vars:
 *   NEXT_PUBLIC_SUPABASE_URL      → your project URL (https://xxxx.supabase.co)
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY → anon/public key from Settings → API
 *
 * Both are NEXT_PUBLIC_ so they are safe to expose in the browser bundle.
 * They only grant access permitted by your Row Level Security (RLS) policies.
 *
 * Usage:
 *   import { supabase } from '@/lib/supabase';
 *   const { data, error } = await supabase.from('units').select('*');
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '';
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnon) {
  if (typeof window !== 'undefined') {
    console.warn(
      '[REMS] Supabase env vars not set. ' +
      'Create .env.local with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }
}

// Using untyped client to avoid TS strict-generic conflicts with our custom
// Database type. Service files provide their own typed Row interfaces.
//
// Fallback placeholder values prevent createClient() from throwing during
// Next.js static export prerender when env vars are absent. The placeholder
// client is never actually used — all service functions guard with
// isSupabaseConfigured() before making any requests.
export const supabase = createClient(
  supabaseUrl  || 'https://placeholder.supabase.co',
  supabaseAnon || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'rems-auth-session',
    },
  },
);

/** Returns the currently authenticated user, or null. */
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/** Returns true if Supabase credentials are configured. */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnon);
}
