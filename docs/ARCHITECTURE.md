# REMS — Real Estate Management System
## Technical Architecture & Implementation Guide

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        REMS — Unified Platform                       │
│                                                                       │
│  ┌───────────────────────┐     ┌──────────────────────────────────┐  │
│  │   Channel Manager     │     │   PMIS (Backend Operations)      │  │
│  │  (Sync Engine Hub)    │     │                                  │  │
│  │                       │     │  ┌────────────┐ ┌─────────────┐ │  │
│  │ ┌───────────────────┐ │     │  │ Reservation│ │  Financial  │ │  │
│  │ │ Booking.com       │ │────▶│  │   Engine   │ │   Module    │ │  │
│  │ │ Airbnb            │◀│────▶│  └────────────┘ └─────────────┘ │  │
│  │ │ Gathern           │ │     │  ┌────────────┐ ┌─────────────┐ │  │
│  │ └───────────────────┘ │     │  │  Unified   │ │ Analytics & │ │  │
│  │                       │     │  │   Inbox    │ │  Reporting  │ │  │
│  │ ┌───────────────────┐ │     │  └────────────┘ └─────────────┘ │  │
│  │ │ Conflict Resolver │ │     └──────────────────────────────────┘  │
│  │ │ Rate Parity Mgr   │ │                                           │
│  │ └───────────────────┘ │     ┌──────────────────────────────────┐  │
│  └───────────────────────┘     │   Owner Dashboard (Single View)  │  │
│                                └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Recommended Tech Stack

| Layer              | Technology         | Justification                                                  |
|--------------------|--------------------|----------------------------------------------------------------|
| **API Server**     | Node.js + Fastify  | High throughput, async I/O ideal for webhook fanout            |
| **Worker**         | Node.js + BullMQ   | Redis-backed queues with retry logic; ideal for sync jobs      |
| **Database**       | PostgreSQL 16      | ACID transactions essential for double-booking prevention       |
| **Time-series**    | TimescaleDB ext.   | Efficient hypertable queries for sync event logs               |
| **Cache + Locks**  | Redis 7            | Distributed locking, rate-limit counters, idempotency TTLs     |
| **Dashboard**      | Next.js 14 (React) | SSR for initial load, client-side for real-time updates         |
| **Queue UI**       | BullBoard          | Visual queue monitoring for ops team                           |
| **Infrastructure** | Docker + Nginx     | Container isolation, SSL termination, rate limiting            |
| **Future Scale**   | Kubernetes + AWS   | Horizontal scaling for worker pods                             |

---

## 3. Channel Manager — Data Flow Diagram

### 3A. Inbound Booking Flow (Webhook Path)

```
OTA (e.g., Gathern)
      │
      │  POST /webhooks/gathern
      │  Header: X-Signature: <hmac-sha256>
      ▼
┌──────────────┐
│ Nginx        │  Rate limit: 200 req/min
│ (Port 443)   │  Preserves raw body for HMAC
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ API Server   │  1. Respond 200 immediately
│ (Fastify)    │  2. Dispatch to background queue
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│ Worker — Sync Engine                          │
│                                               │
│  1. Verify HMAC signature                     │
│  2. Parse & normalize payload                 │
│  3. Enrich with internal IDs (channel mapping)│
│  4. Generate idempotency key (SHA-256)        │
│  5. Route to ConflictResolver                 │
└──────┬───────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│ Conflict Resolver                             │
│                                               │
│  1. Acquire Redis distributed lock (5s TTL)   │
│  2. BEGIN TRANSACTION                         │
│  3. CHECK idempotency key → dedup             │
│  4. SELECT FOR UPDATE on availability rows    │
│  5. Check overlapping bookings                │
│  6. If no conflict → INSERT booking           │
│                    → UPDATE availability      │
│  7. If conflict    → Apply priority strategy  │
│  8. COMMIT                                    │
│  9. Release Redis lock                        │
└──────┬───────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│ Outbound Sync (BullMQ Queue)                  │
│                                               │
│  Push availability CLOSE to all channels      │
│  excluding the origin channel:                │
│    • Booking.com  → OTA_HotelAvailNotifRQ     │
│    • Airbnb       → calendar_operations API   │
│    • Gathern      → /calendar endpoint        │
└──────────────────────────────────────────────┘
```

### 3B. Polling Flow (Fallback for Gathern)

```
Cron Scheduler (every 120s)
       │
       ▼
┌──────────────────────────┐
│ Worker: pollChannel()     │
│  • Fetch modified since   │
│    last_polled_at         │
│  • For each booking:      │
│    → normalize            │
│    → generateIdempotency  │
│    → ConflictResolver     │
└──────────────────────────┘
```

---

## 4. Conflict Resolution — Double-Booking Prevention

### Scenario: Two bookings arrive within milliseconds for the same unit

```
Time ──────────────────────────────────────────────────────▶

T+0ms   Booking A (Gathern)  arrives → Webhook received
T+1ms   Booking B (Booking.com) arrives → Webhook received
T+2ms   Worker A acquires Redis lock "lock:avail:unit123:2026-03-01:2026-03-05"
T+2ms   Worker B tries lock → BLOCKED (spins with backoff)
T+3ms   Worker A: SELECT FOR UPDATE availability rows → locked at DB level
T+4ms   Worker A: No overlap found → INSERT Booking A → UPDATE availability
T+4ms   Worker A: COMMIT → release Redis lock
T+5ms   Worker B acquires Redis lock
T+5ms   Worker B: SELECT FOR UPDATE availability rows
T+6ms   Worker B: Overlap detected! → Apply PRIORITY_CHANNEL strategy
         Booking.com priority = 4, Gathern priority = 3
         Gathern (lower number = higher priority) → Booking A wins
T+6ms   Worker B: Enqueue CANCEL to Booking.com adapter
T+7ms   Booking.com receives cancellation via REST API
T+8ms   ConflictRecord logged for audit trail
```

### Resolution Strategies

| Strategy         | Logic                                         | Use Case                          |
|------------------|-----------------------------------------------|-----------------------------------|
| `PRIORITY_CHANNEL` | Direct > Walk-In > Gathern > BDC > Airbnb   | Default — favors no-commission    |
| `FIRST_RECEIVED`   | Existing booking always wins                  | Simple FIFO fairness              |
| `MANUAL`           | Flag both, notify owner, hold                 | High-value/long stays             |

---

## 5. Database Schema — Availability Table Design

### Why Range Partitioning?

With 1,000 units × 730 days = **730,000 rows per property**,
and 10,000 properties = **7.3 billion rows** at scale.

Range partitioning by month ensures queries are always pruned to
2–3 partitions maximum, keeping response times under 5ms.

```sql
-- Query pattern: "Is unit X available from Mar 1 to Mar 5?"
-- Without partitioning: full table scan on 7.3B rows
-- With partitioning: only touches availability_2026_03 partition (~60K rows)

SELECT date, is_available, price
FROM availability                      -- Postgres routes to correct partition
WHERE unit_id = 'uuid-xxx'
  AND date BETWEEN '2026-03-01' AND '2026-03-04'
  AND is_available = TRUE
  AND stop_sell = FALSE;
-- Execution time: ~2ms (index-only scan on composite index)
```

### Optimistic Locking (version column)

```sql
-- Atomic CAS (Compare-and-Swap) update
UPDATE availability
   SET is_available = FALSE,
       version = version + 1       -- Increment to detect stale reads
 WHERE unit_id = $1
   AND date = $2
   AND version = $3                -- Fails if another worker already updated
RETURNING version;
-- Returns 0 rows → concurrent modification detected → retry
```

---

## 6. API Integration Strategy

### Booking.com
- **Protocol**: OTA-Switch / OpenAPI (XML for availability, JSON for messaging)
- **Auth**: Hotel API Key (Basic Auth or Bearer)
- **Sync**: Webhooks (primary) + pull polling fallback
- **Rate Limit**: 10 req/sec per hotel
- **Availability**: `OTA_HotelAvailNotifRQ` XML messages
- **Rates**: `OTA_HotelRatePlanNotifRQ` XML messages

### Airbnb
- **Protocol**: Airbnb Host API v2 (REST/JSON)
- **Auth**: OAuth 2.0 (access token per listing)
- **Sync**: Webhooks (primary)
- **Rate Limit**: 60 req/min per listing
- **Calendar**: `/calendar_operations` batch endpoint
- **Signature**: Base64-encoded HMAC-SHA256 in `X-Airbnb-Signature`

### Gathern (Saudi Platform)
- **Protocol**: REST/JSON (custom)
- **Auth**: API Key in `X-API-Key` header
- **Sync**: REST polling (primary, every 120s) + limited webhook support
- **Date Format**: `DD/MM/YYYY` (must be normalized on ingest)
- **Rate Limit**: 30 req/min
- **Note**: Always add extra timeout margin (20s) due to slower response times

---

## 7. Implementation Roadmap (Step-by-Step)

### Phase 1 — Foundation (Weeks 1–3)
1. Set up monorepo (Turborepo + TypeScript)
2. Deploy PostgreSQL + TimescaleDB + Redis via Docker
3. Run initial migration `001_initial_schema.sql`
4. Build shared type package and utility library
5. Implement basic Auth (JWT + refresh tokens)

### Phase 2 — Channel Manager MVP (Weeks 4–7)
1. Implement `IChannelAdapter` interface
2. Build Booking.com adapter (XML availability push)
3. Build Airbnb adapter (OAuth + calendar operations)
4. Build Gathern adapter (polling + date normalization)
5. Implement `ConflictResolver` with Redis locking
6. Wire BullMQ queues for async processing
7. Expose webhook endpoints + HMAC verification

### Phase 3 — PMIS Core (Weeks 8–10)
1. Build `ReservationService` (manual bookings, maintenance blocks)
2. Build master calendar API
3. Build `FinancialService` (invoicing + expense tracking)
4. Implement owner payout calculation
5. Build `AnalyticsService` (RevPAR, ADR, occupancy)

### Phase 4 — Dashboard (Weeks 11–13)
1. Next.js project setup with Tailwind CSS
2. KPI overview page with chart library (Recharts/Chart.js)
3. Master calendar (react-big-calendar or custom grid)
4. Unified Inbox component
5. Rate Manager with channel multi-select
6. Financial reports page (PDF export)

### Phase 5 — Hardening (Weeks 14–16)
1. End-to-end integration tests for conflict resolver
2. Load testing (availability push under concurrency)
3. Monitoring setup (Prometheus + Grafana dashboards)
4. Alert rules (failed sync events, high conflict rate)
5. Runbooks for operational procedures

---

## 8. Security Checklist

- [ ] All OTA webhook endpoints verify HMAC signature before processing
- [ ] API keys stored in environment variables / secrets manager (never in code)
- [ ] Database connections use SSL (`?sslmode=require`)
- [ ] All financial amounts stored as integers or NUMERIC (not FLOAT)
- [ ] Idempotency keys expire after 24h to prevent memory bloat
- [ ] Redis lock TTL is bounded to prevent deadlocks
- [ ] Nginx rate limiting prevents webhook flood attacks
- [ ] PostgreSQL overlap trigger as last-resort safety net
- [ ] All API responses sanitized (no internal IDs leaked)
- [ ] JWT tokens expire in 1h with refresh token rotation

---

## 9. Monitoring & Observability

### Key Metrics to Track

| Metric                        | Alert Threshold    | Meaning                              |
|-------------------------------|--------------------|--------------------------------------|
| `sync_events_failed_count`    | > 10/min           | OTA adapter issues                   |
| `conflict_records_count`      | > 5/hour           | Possible availability sync lag       |
| `availability_lock_wait_ms`   | > 2000ms           | Redis performance degradation        |
| `booking_processing_lag_ms`   | > 5000ms           | Worker queue backlog                 |
| `rate_push_success_rate`      | < 95%              | OTA API issues                       |
| `db_query_p99_ms`             | > 100ms            | Missing index or partition issue     |

---

## 10. Environment Variables Reference

```bash
# Database
DATABASE_URL=postgresql://rems:password@localhost:5432/rems
REDIS_URL=redis://:password@localhost:6379

# JWT
JWT_SECRET=your-256-bit-secret
JWT_EXPIRY=3600

# Booking.com
BOOKING_COM_API_KEY=...
BOOKING_COM_HOTEL_ID=...
BOOKING_COM_WEBHOOK_SECRET=...

# Airbnb
AIRBNB_ACCESS_TOKEN=...
AIRBNB_LISTING_ID=...
AIRBNB_WEBHOOK_SECRET=...

# Gathern
GATHERN_API_KEY=...
GATHERN_LISTING_ID=...
GATHERN_WEBHOOK_SECRET=...
```
