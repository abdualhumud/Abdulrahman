// ============================================================
// CORE DOMAIN TYPES — Real Estate Management System (REMS)
// ============================================================

// ------ Enumerations ------

export enum ChannelType {
  BOOKING_COM = 'BOOKING_COM',
  AIRBNB = 'AIRBNB',
  GATHERN = 'GATHERN',
  DIRECT = 'DIRECT',
  WALK_IN = 'WALK_IN',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
  MAINTENANCE = 'MAINTENANCE',
}

export enum PropertyType {
  APARTMENT = 'APARTMENT',
  VILLA = 'VILLA',
  STUDIO = 'STUDIO',
  CHALET = 'CHALET',
  HOTEL_ROOM = 'HOTEL_ROOM',
}

export enum SyncStatus {
  SYNCED = 'SYNCED',
  PENDING = 'PENDING',
  FAILED = 'FAILED',
  CONFLICT = 'CONFLICT',
}

export enum RatePlanType {
  STANDARD = 'STANDARD',
  WEEKEND = 'WEEKEND',
  SEASONAL = 'SEASONAL',
  PROMOTIONAL = 'PROMOTIONAL',
  LONG_STAY = 'LONG_STAY',
}

export enum PayoutStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PAID = 'PAID',
  FAILED = 'FAILED',
}

// ------ Core Entities ------

export interface Property {
  id: string;
  ownerId: string;
  name: string;
  type: PropertyType;
  address: Address;
  unitCount: number;
  amenities: string[];
  baseRate: number;
  currency: string;
  timezone: string;
  channelMappings: ChannelMapping[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  street: string;
  city: string;
  region: string;
  country: string;
  postalCode: string;
  latitude: number;
  longitude: number;
}

export interface ChannelMapping {
  channel: ChannelType;
  externalPropertyId: string;
  externalRoomId?: string;
  isActive: boolean;
  lastSyncedAt: Date;
}

export interface Availability {
  id: string;
  propertyId: string;
  unitId: string;
  date: string;            // ISO date YYYY-MM-DD
  isAvailable: boolean;
  price: number;
  currency: string;
  minimumStay: number;
  maximumStay: number;
  restrictions: AvailabilityRestriction;
  version: number;         // Optimistic locking counter
  updatedAt: Date;
}

export interface AvailabilityRestriction {
  closedToArrival: boolean;
  closedToDeparture: boolean;
  stopSell: boolean;
}

export interface Booking {
  id: string;
  externalId?: string;
  channel: ChannelType;
  propertyId: string;
  unitId: string;
  guestId: string;
  checkIn: string;         // YYYY-MM-DD
  checkOut: string;        // YYYY-MM-DD
  nights: number;
  adults: number;
  children: number;
  status: BookingStatus;
  totalAmount: number;
  channelCommission: number;
  netRevenue: number;
  currency: string;
  specialRequests?: string;
  syncStatus: SyncStatus;
  idempotencyKey: string;  // For double-booking prevention
  createdAt: Date;
  updatedAt: Date;
}

export interface Guest {
  id: string;
  externalIds: Record<ChannelType, string>;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  nationality?: string;
  communicationHistory: Message[];
}

export interface Message {
  id: string;
  bookingId: string;
  channel: ChannelType;
  guestId: string;
  direction: 'INBOUND' | 'OUTBOUND';
  content: string;
  isRead: boolean;
  sentAt: Date;
}

// ------ Financial Types ------

export interface Invoice {
  id: string;
  bookingId: string;
  propertyId: string;
  ownerId: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  issuedAt: Date;
  dueAt: Date;
  paidAt?: Date;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface OwnerPayout {
  id: string;
  ownerId: string;
  periodStart: string;
  periodEnd: string;
  grossRevenue: number;
  channelCommissions: number;
  platformFee: number;
  expenses: number;
  netPayout: number;
  currency: string;
  status: PayoutStatus;
  processedAt?: Date;
}

export interface Expense {
  id: string;
  propertyId: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  receiptUrl?: string;
  incurredAt: Date;
}

// ------ Analytics Types ------

export interface PerformanceMetrics {
  propertyId: string;
  period: { start: string; end: string };
  occupancyRate: number;       // percentage 0–100
  adr: number;                 // Average Daily Rate
  revPAR: number;              // Revenue Per Available Room
  totalRevenue: number;
  totalBookings: number;
  averageLengthOfStay: number;
  channelBreakdown: ChannelMetric[];
}

export interface ChannelMetric {
  channel: ChannelType;
  bookings: number;
  revenue: number;
  occupancyContribution: number;
  commissionPaid: number;
}

// ------ API / Sync Types ------

export interface SyncEvent {
  id: string;
  channel: ChannelType;
  eventType: 'BOOKING_NEW' | 'BOOKING_MODIFIED' | 'BOOKING_CANCELLED' | 'AVAILABILITY_UPDATE' | 'RATE_UPDATE';
  payload: unknown;
  receivedAt: Date;
  processedAt?: Date;
  status: SyncStatus;
  retryCount: number;
  errorMessage?: string;
}

export interface RatePush {
  propertyId: string;
  unitId: string;
  ratePlan: RatePlanType;
  dateRange: { from: string; to: string };
  price: number;
  currency: string;
  targetChannels: ChannelType[];
}

export interface ConflictRecord {
  id: string;
  propertyId: string;
  unitId: string;
  checkIn: string;
  checkOut: string;
  winnerId: string;    // Booking ID that was accepted
  loserId: string;     // Booking ID that was rejected
  resolvedAt: Date;
  resolutionStrategy: 'FIRST_RECEIVED' | 'PRIORITY_CHANNEL' | 'MANUAL';
}
