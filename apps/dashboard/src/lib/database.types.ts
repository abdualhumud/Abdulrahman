/**
 * database.types.ts — TypeScript types mirroring the Supabase database schema.
 *
 * These are generated from the SQL schema in:
 *   apps/dashboard/supabase/schema.sql
 *
 * After any schema change, regenerate with:
 *   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {

      /* ── profiles ──────────────────────────────────────────────── */
      profiles: {
        Row: {
          id:           string;    // UUID — matches auth.users.id
          email:        string;
          full_name:    string;
          company_name: string | null;
          phone:        string | null;
          national_id:  string | null;
          cr_number:    string | null;
          vat_number:   string | null;
          city:         string | null;
          district:     string | null;
          street:       string | null;
          plan:         string;    // 'basic' | 'pro' | 'enterprise'
          promo_code:   string | null;
          onboarding_done: boolean;
          created_at:   string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };

      /* ── units ─────────────────────────────────────────────────── */
      units: {
        Row: {
          id:               string;    // UUID
          owner_id:         string;    // FK → profiles.id
          name:             string;
          name_ar:          string | null;
          type:             string;    // 'APARTMENT' | 'VILLA' | 'CHALET' | 'STUDIO'
          city:             string;
          district:         string;
          street:           string | null;
          lat:              number;
          lng:              number;
          beds:             number;
          baths:            number;
          size:             number;
          floor:            number | null;
          base_price:       number;
          weekend_surge:    number;
          seasonal_peak:    number;
          cleaning_fee:     number;
          security_deposit: number;
          min_stay:         number;
          channels:         string[];  // ['Booking.com', 'Airbnb', ...]
          amenities:        string[];
          status:           string;    // 'ACTIVE' | 'INACTIVE'
          occupancy:        number;
          revenue:          number;
          photos:           string[];
          insurance_provider: string | null;
          color:            string;
          created_at:       string;
          updated_at:       string;
        };
        Insert: Omit<Database['public']['Tables']['units']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['units']['Insert']>;
      };

      /* ── bookings ──────────────────────────────────────────────── */
      bookings: {
        Row: {
          id:          string;    // UUID
          owner_id:    string;    // FK → profiles.id
          unit_id:     string;    // FK → units.id
          guest_name:  string;
          guest_phone: string | null;
          guest_email: string | null;
          channel:     string;
          channel_color: string | null;
          check_in:    string;   // ISO date
          check_out:   string;   // ISO date
          nights:      number;
          amount:      number;
          status:      string;   // 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'PENDING'
          notes:       string | null;
          created_at:  string;
          updated_at:  string;
        };
        Insert: Omit<Database['public']['Tables']['bookings']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['bookings']['Insert']>;
      };

      /* ── cleaning_requests ─────────────────────────────────────── */
      cleaning_requests: {
        Row: {
          id:            string;   // UUID
          owner_id:      string;   // FK → profiles.id
          unit_id:       string;   // FK → units.id
          booking_id:    string | null;
          guest_name:    string;
          checkout_date: string;
          status:        string;   // 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'INSPECTION_DONE'
          provider:      string | null;
          notes:         string | null;
          created_at:    string;
          updated_at:    string;
        };
        Insert: Omit<Database['public']['Tables']['cleaning_requests']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['cleaning_requests']['Insert']>;
      };

      /* ── promo_codes ───────────────────────────────────────────── */
      promo_codes: {
        Row: {
          code:        string;   // PK
          discount:    number;   // percentage (0–100)
          max_uses:    number | null;  // null = unlimited
          used_count:  number;
          expires_at:  string | null;  // ISO date or null
          active:      boolean;
          created_at:  string;
        };
        Insert: Omit<Database['public']['Tables']['promo_codes']['Row'], 'used_count' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['promo_codes']['Insert']>;
      };

    };
    Views:   Record<string, never>;
    Functions: Record<string, never>;
    Enums:   Record<string, never>;
  };
}

/* ── Convenience row types ──────────────────────────────────── */
export type ProfileRow        = Database['public']['Tables']['profiles']['Row'];
export type UnitRow           = Database['public']['Tables']['units']['Row'];
export type BookingRow        = Database['public']['Tables']['bookings']['Row'];
export type CleaningRow       = Database['public']['Tables']['cleaning_requests']['Row'];
export type PromoCodeRow      = Database['public']['Tables']['promo_codes']['Row'];
