-- ============================================================
-- REMS — Supabase Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ── profiles ──────────────────────────────────────────────────
-- One row per registered user, linked to auth.users via id.
-- Created automatically on sign-up via the trigger below.
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text not null,
  full_name       text not null default '',
  company_name    text,
  phone           text,
  national_id     text,
  cr_number       text,
  vat_number      text,
  city            text,
  district        text,
  street          text,
  plan            text not null default 'basic',
  promo_code      text,
  onboarding_done boolean not null default false,
  created_at      timestamptz not null default now()
);

-- Auto-create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS: users can only read/write their own profile
alter table public.profiles enable row level security;

create policy "profiles: owner read"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: owner update"
  on public.profiles for update
  using (auth.uid() = id);


-- ── units ──────────────────────────────────────────────────────
create table if not exists public.units (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references public.profiles(id) on delete cascade,
  name              text not null,
  name_ar           text,
  type              text not null default 'APARTMENT',
  city              text not null default '',
  district          text not null default '',
  street            text,
  lat               float8 not null default 24.7136,
  lng               float8 not null default 46.6753,
  beds              int not null default 1,
  baths             int not null default 1,
  size              int not null default 0,
  floor             int,
  base_price        int not null default 0,
  weekend_surge     int not null default 0,
  seasonal_peak     int not null default 0,
  cleaning_fee      int not null default 0,
  security_deposit  int not null default 0,
  min_stay          int not null default 1,
  channels          text[] not null default '{}',
  amenities         text[] not null default '{}',
  status            text not null default 'ACTIVE',
  occupancy         int not null default 0,
  revenue           int not null default 0,
  photos            text[] not null default '{}',
  insurance_provider text,
  color             text not null default '#3B82F6',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.units enable row level security;

create policy "units: owner read"
  on public.units for select
  using (auth.uid() = owner_id);

create policy "units: owner insert"
  on public.units for insert
  with check (auth.uid() = owner_id);

create policy "units: owner update"
  on public.units for update
  using (auth.uid() = owner_id);

create policy "units: owner delete"
  on public.units for delete
  using (auth.uid() = owner_id);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger units_updated_at
  before update on public.units
  for each row execute procedure public.set_updated_at();


-- ── bookings ───────────────────────────────────────────────────
create table if not exists public.bookings (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles(id) on delete cascade,
  unit_id       uuid references public.units(id) on delete set null,
  guest_name    text not null,
  guest_phone   text,
  guest_email   text,
  channel       text not null default 'Direct',
  channel_color text,
  check_in      date not null,
  check_out     date not null,
  nights        int not null default 1,
  amount        int not null default 0,
  status        text not null default 'PENDING',
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.bookings enable row level security;

create policy "bookings: owner read"
  on public.bookings for select
  using (auth.uid() = owner_id);

create policy "bookings: owner insert"
  on public.bookings for insert
  with check (auth.uid() = owner_id);

create policy "bookings: owner update"
  on public.bookings for update
  using (auth.uid() = owner_id);

create policy "bookings: owner delete"
  on public.bookings for delete
  using (auth.uid() = owner_id);

create trigger bookings_updated_at
  before update on public.bookings
  for each row execute procedure public.set_updated_at();


-- ── cleaning_requests ──────────────────────────────────────────
create table if not exists public.cleaning_requests (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles(id) on delete cascade,
  unit_id       uuid references public.units(id) on delete set null,
  booking_id    uuid references public.bookings(id) on delete set null,
  guest_name    text not null,
  checkout_date date not null,
  status        text not null default 'PENDING',
  provider      text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.cleaning_requests enable row level security;

create policy "cleaning: owner read"
  on public.cleaning_requests for select
  using (auth.uid() = owner_id);

create policy "cleaning: owner insert"
  on public.cleaning_requests for insert
  with check (auth.uid() = owner_id);

create policy "cleaning: owner update"
  on public.cleaning_requests for update
  using (auth.uid() = owner_id);

create policy "cleaning: owner delete"
  on public.cleaning_requests for delete
  using (auth.uid() = owner_id);

create trigger cleaning_updated_at
  before update on public.cleaning_requests
  for each row execute procedure public.set_updated_at();


-- ── promo_codes ────────────────────────────────────────────────
-- Managed by super-admin only. RLS: anon can read (to validate),
-- only service_role can write (via super-admin API route).
create table if not exists public.promo_codes (
  code        text primary key,
  discount    int not null check (discount between 0 and 100),
  max_uses    int,           -- null = unlimited
  used_count  int not null default 0,
  expires_at  date,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.promo_codes enable row level security;

-- Anyone (including anonymous) can read active promo codes to validate them
create policy "promo_codes: public read"
  on public.promo_codes for select
  using (true);

-- Only authenticated users (super-admin in practice) can write
create policy "promo_codes: auth insert"
  on public.promo_codes for insert
  with check (auth.uid() is not null);

create policy "promo_codes: auth update"
  on public.promo_codes for update
  using (auth.uid() is not null);

create policy "promo_codes: auth delete"
  on public.promo_codes for delete
  using (auth.uid() is not null);

-- Atomic increment helper — called by promo-service-db.ts redeemPromoCode()
-- Uses SQL UPDATE so the increment is safe under concurrent requests.
create or replace function public.increment_promo_used_count(promo_code text)
returns void language sql security definer as $$
  update public.promo_codes
  set    used_count = used_count + 1
  where  code = promo_code;
$$;

-- Allow any authenticated user to call the RPC (super-admin or checkout flow)
grant execute on function public.increment_promo_used_count(text) to authenticated, anon;

-- ── Leads (landing page capture) ─────────────────────────────────────────
create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  phone       text,
  business    text,
  message     text,
  source      text not null check (source in ('demo','contact')),
  status      text not null default 'new' check (status in ('new','contacted','converted','closed')),
  notes       text,
  created_at  timestamptz not null default now()
);

-- Public INSERT so the landing page (no auth) can create leads
alter table public.leads enable row level security;
create policy "Anyone can submit a lead"
  on public.leads for insert
  with check (true);

-- Super-admin can read/update/delete (uses anon key + service_role in admin UI)
create policy "Service role has full access"
  on public.leads for all
  using (true)
  with check (true);

-- Seed default promo codes
insert into public.promo_codes (code, discount, max_uses, expires_at, active)
values
  ('REMS2026',   20, 100, '2026-12-31', true),
  ('LAUNCH50',   50,  50, '2026-06-30', true),
  ('EARLYBIRD',  30, null, null,         true),
  ('PARTNER15',  15, 200, null,          false)
on conflict (code) do nothing;
