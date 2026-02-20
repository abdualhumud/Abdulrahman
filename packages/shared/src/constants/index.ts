import { ChannelType } from '../types';

// ============================================================
// GLOBAL CONSTANTS
// ============================================================

export const CHANNEL_PRIORITY: Record<ChannelType, number> = {
  [ChannelType.DIRECT]: 1,          // Highest priority (no commission)
  [ChannelType.WALK_IN]: 2,
  [ChannelType.GATHERN]: 3,
  [ChannelType.BOOKING_COM]: 4,
  [ChannelType.AIRBNB]: 5,
};

export const CHANNEL_COMMISSION_RATES: Record<ChannelType, number> = {
  [ChannelType.BOOKING_COM]: 0.15,  // 15%
  [ChannelType.AIRBNB]: 0.03,       // 3% host fee
  [ChannelType.GATHERN]: 0.10,      // 10%
  [ChannelType.DIRECT]: 0.00,
  [ChannelType.WALK_IN]: 0.00,
};

export const SYNC_CONFIG = {
  MAX_RETRY_ATTEMPTS: 5,
  RETRY_BACKOFF_MS: [1000, 2000, 4000, 8000, 16000],
  POLLING_INTERVALS_MS: {
    [ChannelType.BOOKING_COM]: 60_000,   // 1 minute (webhook + polling fallback)
    [ChannelType.AIRBNB]: 60_000,
    [ChannelType.GATHERN]: 120_000,      // 2 minutes (polling primary)
  },
  LOCK_TTL_MS: 5_000,                   // Redis lock TTL for booking transactions
  IDEMPOTENCY_TTL_SECONDS: 86_400,      // 24 hours
};

export const AVAILABILITY_TABLE = {
  PARTITION_BY: 'property_id',
  INDEX_COLUMNS: ['property_id', 'unit_id', 'date'],
  DATE_RANGE_LIMIT_DAYS: 730,           // Max 2 years ahead
};

export const RATE_LIMITS = {
  BOOKING_COM_REQUESTS_PER_SECOND: 10,
  AIRBNB_REQUESTS_PER_MINUTE: 60,
  GATHERN_REQUESTS_PER_MINUTE: 30,
};

export const WEBHOOK_ENDPOINTS = {
  BOOKING_COM: '/webhooks/booking-com',
  AIRBNB: '/webhooks/airbnb',
  GATHERN: '/webhooks/gathern',
};

export const QUEUE_NAMES = {
  SYNC_INBOUND: 'sync:inbound',
  SYNC_OUTBOUND: 'sync:outbound',
  RATE_PUSH: 'rates:push',
  NOTIFICATIONS: 'notifications',
  PAYOUTS: 'payouts:process',
  ANALYTICS: 'analytics:compute',
};
