-- ============================================================
-- REMS — Initial Database Schema
-- Engine: PostgreSQL 16+ with TimescaleDB extension
-- Partitioning Strategy: RANGE on date for availability table,
--   HASH on property_id for large deployments
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- fuzzy text search
CREATE EXTENSION IF NOT EXISTS "timescaledb"; -- time-series analytics

-- ============================================================
-- ENUMERATIONS
-- ============================================================

CREATE TYPE channel_type AS ENUM (
  'BOOKING_COM', 'AIRBNB', 'GATHERN', 'DIRECT', 'WALK_IN'
);

CREATE TYPE booking_status AS ENUM (
  'PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT',
  'CANCELLED', 'NO_SHOW', 'MAINTENANCE'
);

CREATE TYPE sync_status AS ENUM (
  'SYNCED', 'PENDING', 'FAILED', 'CONFLICT'
);

CREATE TYPE payout_status AS ENUM (
  'PENDING', 'PROCESSING', 'PAID', 'FAILED'
);

CREATE TYPE property_type AS ENUM (
  'APARTMENT', 'VILLA', 'STUDIO', 'CHALET', 'HOTEL_ROOM'
);

-- ============================================================
-- OWNERS
-- ============================================================

CREATE TABLE owners (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           TEXT NOT NULL UNIQUE,
  full_name       TEXT NOT NULL,
  phone           TEXT,
  bank_iban       TEXT,
  commission_rate NUMERIC(5,4) DEFAULT 0.1000,  -- Platform fee %
  currency        CHAR(3) DEFAULT 'SAR',
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROPERTIES
-- ============================================================

CREATE TABLE properties (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id        UUID NOT NULL REFERENCES owners(id),
  name            TEXT NOT NULL,
  type            property_type NOT NULL,
  street          TEXT,
  city            TEXT NOT NULL,
  region          TEXT,
  country         CHAR(2) NOT NULL DEFAULT 'SA',
  postal_code     TEXT,
  latitude        NUMERIC(10,7),
  longitude       NUMERIC(10,7),
  timezone        TEXT NOT NULL DEFAULT 'Asia/Riyadh',
  base_rate       NUMERIC(10,2) NOT NULL,
  currency        CHAR(3) DEFAULT 'SAR',
  is_active       BOOLEAN DEFAULT TRUE,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_properties_owner ON properties(owner_id);
CREATE INDEX idx_properties_city ON properties(city);

-- ============================================================
-- UNITS (individual rooms / apartments within a property)
-- ============================================================

CREATE TABLE units (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id     UUID NOT NULL REFERENCES properties(id),
  name            TEXT NOT NULL,
  max_occupancy   SMALLINT NOT NULL DEFAULT 2,
  bedroom_count   SMALLINT NOT NULL DEFAULT 1,
  bathroom_count  SMALLINT NOT NULL DEFAULT 1,
  area_sqm        NUMERIC(6,2),
  base_rate       NUMERIC(10,2),  -- Overrides property base_rate if set
  is_active       BOOLEAN DEFAULT TRUE,
  metadata        JSONB DEFAULT '{}'
);

CREATE INDEX idx_units_property ON units(property_id);

-- ============================================================
-- CHANNEL MAPPINGS  (OTA external IDs per unit)
-- ============================================================

CREATE TABLE channel_mappings (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id               UUID NOT NULL REFERENCES units(id),
  channel               channel_type NOT NULL,
  external_property_id  TEXT NOT NULL,
  external_room_id      TEXT,
  is_active             BOOLEAN DEFAULT TRUE,
  last_synced_at        TIMESTAMPTZ,
  UNIQUE (unit_id, channel)
);

CREATE INDEX idx_channel_mappings_unit ON channel_mappings(unit_id);
CREATE INDEX idx_channel_mappings_external ON channel_mappings(channel, external_room_id);

-- ============================================================
-- AVAILABILITY TABLE  (Core of the Channel Manager)
--
-- Design notes:
--   • One row per unit per date (nightly granularity)
--   • RANGE-partitioned by date (monthly partitions auto-created)
--   • "version" column enables optimistic locking (CAS updates)
--   • stop_sell overrides all channel availability instantly
-- ============================================================

CREATE TABLE availability (
  id                  UUID NOT NULL DEFAULT uuid_generate_v4(),
  property_id         UUID NOT NULL,          -- Denormalized for fast partition pruning
  unit_id             UUID NOT NULL REFERENCES units(id),
  date                DATE NOT NULL,
  is_available        BOOLEAN NOT NULL DEFAULT TRUE,
  price               NUMERIC(10,2) NOT NULL,
  currency            CHAR(3) DEFAULT 'SAR',
  minimum_stay        SMALLINT DEFAULT 1,
  maximum_stay        SMALLINT DEFAULT 30,
  closed_to_arrival   BOOLEAN DEFAULT FALSE,
  closed_to_departure BOOLEAN DEFAULT FALSE,
  stop_sell           BOOLEAN DEFAULT FALSE,
  version             BIGINT NOT NULL DEFAULT 1, -- Optimistic lock version
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (unit_id, date)                   -- Composite PK prevents duplicate dates
) PARTITION BY RANGE (date);

-- Create monthly partitions for 2024–2026 (extend via cron job)
CREATE TABLE availability_2025_01 PARTITION OF availability
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE availability_2025_02 PARTITION OF availability
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE availability_2025_03 PARTITION OF availability
  FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE availability_2025_04 PARTITION OF availability
  FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE availability_2025_05 PARTITION OF availability
  FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
CREATE TABLE availability_2025_06 PARTITION OF availability
  FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
CREATE TABLE availability_2025_07 PARTITION OF availability
  FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');
CREATE TABLE availability_2025_08 PARTITION OF availability
  FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
CREATE TABLE availability_2025_09 PARTITION OF availability
  FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE availability_2025_10 PARTITION OF availability
  FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
CREATE TABLE availability_2025_11 PARTITION OF availability
  FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE availability_2025_12 PARTITION OF availability
  FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');
CREATE TABLE availability_2026_01 PARTITION OF availability
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE availability_2026_02 PARTITION OF availability
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE availability_2026_03 PARTITION OF availability
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE availability_2026_04 PARTITION OF availability
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE availability_2026_05 PARTITION OF availability
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE availability_2026_06 PARTITION OF availability
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE availability_2026_07 PARTITION OF availability
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE availability_2026_08 PARTITION OF availability
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE availability_2026_09 PARTITION OF availability
  FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE availability_2026_10 PARTITION OF availability
  FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE availability_2026_11 PARTITION OF availability
  FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE availability_2026_12 PARTITION OF availability
  FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

-- Composite index for the most frequent query pattern
CREATE INDEX idx_avail_unit_date_avail
  ON availability (unit_id, date, is_available)
  WHERE is_available = TRUE AND stop_sell = FALSE;

CREATE INDEX idx_avail_property_date
  ON availability (property_id, date);

-- ============================================================
-- GUESTS
-- ============================================================

CREATE TABLE guests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  nationality     CHAR(2),
  external_ids    JSONB DEFAULT '{}',  -- { "BOOKING_COM": "bdc_123", ... }
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_guests_email ON guests(email);
CREATE INDEX idx_guests_phone ON guests(phone);

-- ============================================================
-- BOOKINGS
-- ============================================================

CREATE TABLE bookings (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id         TEXT,
  channel             channel_type NOT NULL,
  property_id         UUID NOT NULL REFERENCES properties(id),
  unit_id             UUID NOT NULL REFERENCES units(id),
  guest_id            UUID REFERENCES guests(id),
  check_in            DATE NOT NULL,
  check_out           DATE NOT NULL,
  nights              SMALLINT GENERATED ALWAYS AS (check_out - check_in) STORED,
  adults              SMALLINT NOT NULL DEFAULT 1,
  children            SMALLINT NOT NULL DEFAULT 0,
  status              booking_status NOT NULL DEFAULT 'PENDING',
  total_amount        NUMERIC(12,2) NOT NULL,
  channel_commission  NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_revenue         NUMERIC(12,2) GENERATED ALWAYS AS (total_amount - channel_commission) STORED,
  currency            CHAR(3) NOT NULL DEFAULT 'SAR',
  special_requests    TEXT,
  sync_status         sync_status NOT NULL DEFAULT 'PENDING',
  idempotency_key     TEXT NOT NULL UNIQUE,   -- SHA-256 hash for deduplication
  raw_payload         JSONB,                  -- Original OTA payload for audit
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_dates CHECK (check_out > check_in),
  CONSTRAINT chk_amounts CHECK (total_amount >= 0)
);

CREATE INDEX idx_bookings_property_dates ON bookings(property_id, check_in, check_out);
CREATE INDEX idx_bookings_unit_dates ON bookings(unit_id, check_in, check_out);
CREATE INDEX idx_bookings_channel_external ON bookings(channel, external_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_created ON bookings(created_at DESC);

-- ============================================================
-- SYNC EVENTS LOG  (Immutable audit trail)
-- ============================================================

CREATE TABLE sync_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel         channel_type NOT NULL,
  event_type      TEXT NOT NULL,
  payload         JSONB NOT NULL,
  received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at    TIMESTAMPTZ,
  status          sync_status NOT NULL DEFAULT 'PENDING',
  retry_count     SMALLINT DEFAULT 0,
  error_message   TEXT,
  booking_id      UUID REFERENCES bookings(id)
);

CREATE INDEX idx_sync_events_status ON sync_events(status) WHERE status IN ('PENDING', 'FAILED');
CREATE INDEX idx_sync_events_channel ON sync_events(channel, received_at DESC);

-- Convert to hypertable for time-series performance (TimescaleDB)
SELECT create_hypertable('sync_events', 'received_at', chunk_time_interval => INTERVAL '1 week');

-- ============================================================
-- RATE PLANS
-- ============================================================

CREATE TABLE rate_plans (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id         UUID NOT NULL REFERENCES units(id),
  name            TEXT NOT NULL,
  type            TEXT NOT NULL,
  date_from       DATE NOT NULL,
  date_to         DATE NOT NULL,
  price           NUMERIC(10,2) NOT NULL,
  currency        CHAR(3) DEFAULT 'SAR',
  minimum_stay    SMALLINT DEFAULT 1,
  channels        channel_type[] DEFAULT ARRAY['BOOKING_COM','AIRBNB','GATHERN']::channel_type[],
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rate_plans_unit_date ON rate_plans(unit_id, date_from, date_to);

-- ============================================================
-- CONFLICT RECORDS
-- ============================================================

CREATE TABLE conflict_records (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id           UUID NOT NULL REFERENCES properties(id),
  unit_id               UUID NOT NULL REFERENCES units(id),
  check_in              DATE NOT NULL,
  check_out             DATE NOT NULL,
  winner_booking_id     UUID NOT NULL REFERENCES bookings(id),
  loser_booking_id      UUID NOT NULL REFERENCES bookings(id),
  resolution_strategy   TEXT NOT NULL,
  resolved_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MESSAGES (Unified Inbox)
-- ============================================================

CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id      UUID REFERENCES bookings(id),
  channel         channel_type NOT NULL,
  guest_id        UUID REFERENCES guests(id),
  direction       TEXT NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND')),
  content         TEXT NOT NULL,
  is_read         BOOLEAN DEFAULT FALSE,
  external_msg_id TEXT,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_booking ON messages(booking_id, sent_at DESC);
CREATE INDEX idx_messages_unread ON messages(is_read) WHERE is_read = FALSE;

-- ============================================================
-- FINANCIALS — Invoices & Expenses
-- ============================================================

CREATE TABLE invoices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id      UUID NOT NULL REFERENCES bookings(id),
  property_id     UUID NOT NULL REFERENCES properties(id),
  owner_id        UUID NOT NULL REFERENCES owners(id),
  line_items      JSONB NOT NULL,
  subtotal        NUMERIC(12,2) NOT NULL,
  tax             NUMERIC(12,2) DEFAULT 0,
  total           NUMERIC(12,2) NOT NULL,
  currency        CHAR(3) DEFAULT 'SAR',
  issued_at       TIMESTAMPTZ DEFAULT NOW(),
  due_at          TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ
);

CREATE TABLE expenses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id     UUID NOT NULL REFERENCES properties(id),
  category        TEXT NOT NULL,
  description     TEXT NOT NULL,
  amount          NUMERIC(10,2) NOT NULL,
  currency        CHAR(3) DEFAULT 'SAR',
  receipt_url     TEXT,
  incurred_at     DATE NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expenses_property_date ON expenses(property_id, incurred_at);

CREATE TABLE owner_payouts (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id            UUID NOT NULL REFERENCES owners(id),
  period_start        DATE NOT NULL,
  period_end          DATE NOT NULL,
  gross_revenue       NUMERIC(12,2) NOT NULL,
  channel_commissions NUMERIC(12,2) DEFAULT 0,
  platform_fee        NUMERIC(12,2) DEFAULT 0,
  expenses            NUMERIC(12,2) DEFAULT 0,
  net_payout          NUMERIC(12,2) GENERATED ALWAYS AS
                        (gross_revenue - channel_commissions - platform_fee - expenses) STORED,
  currency            CHAR(3) DEFAULT 'SAR',
  status              payout_status DEFAULT 'PENDING',
  processed_at        TIMESTAMPTZ
);

-- ============================================================
-- ANALYTICS MATERIALIZED VIEW  (Refreshed hourly)
-- ============================================================

CREATE MATERIALIZED VIEW mv_property_performance AS
SELECT
  b.property_id,
  DATE_TRUNC('month', b.check_in) AS month,
  COUNT(*)                         AS total_bookings,
  SUM(b.net_revenue)               AS total_net_revenue,
  SUM(b.total_amount)              AS total_gross_revenue,
  SUM(b.channel_commission)        AS total_commissions,
  AVG(b.nights)                    AS avg_length_of_stay,
  -- ADR = Total Revenue / Total Nights Sold
  CASE WHEN SUM(b.nights) > 0
    THEN SUM(b.net_revenue) / SUM(b.nights)
    ELSE 0
  END                              AS adr,
  b.channel,
  COUNT(*) FILTER (WHERE b.status = 'CONFIRMED' OR b.status = 'CHECKED_IN' OR b.status = 'CHECKED_OUT')
                                   AS confirmed_bookings
FROM bookings b
WHERE b.status NOT IN ('CANCELLED', 'NO_SHOW')
GROUP BY b.property_id, month, b.channel;

CREATE UNIQUE INDEX idx_mv_perf_property_month_channel
  ON mv_property_performance(property_id, month, channel);

-- ============================================================
-- AUTOMATED TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_properties_updated
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_bookings_updated
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_owners_updated
  BEFORE UPDATE ON owners
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Prevent overlapping bookings at DB level (safety net)
CREATE OR REPLACE FUNCTION check_booking_overlap()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE unit_id = NEW.unit_id
      AND status NOT IN ('CANCELLED', 'NO_SHOW')
      AND id != NEW.id
      AND check_in < NEW.check_out
      AND check_out > NEW.check_in
  ) THEN
    RAISE EXCEPTION 'BOOKING_OVERLAP: Unit % is already booked between % and %',
      NEW.unit_id, NEW.check_in, NEW.check_out;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_overlap
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.status NOT IN ('CANCELLED', 'NO_SHOW'))
  EXECUTE FUNCTION check_booking_overlap();
