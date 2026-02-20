// ============================================================
// DASHBOARD TYPE DEFINITIONS
// ============================================================

export interface OwnerDashboardData {
  owner: {
    id: string;
    fullName: string;
    currency: string;
  };
  period: { start: string; end: string };
  kpis: KpiSummary;
  channelBreakdown: ChannelPerformance[];
  recentBookings: BookingSummary[];
  calendarEvents: CalendarEvent[];
  alerts: DashboardAlert[];
}

export interface KpiSummary {
  totalRevenue: number;
  netPayout: number;
  totalBookings: number;
  averageOccupancy: number;         // 0–100
  averageADR: number;
  averageRevPAR: number;
  totalProperties: number;
  revenueVsPreviousPeriod: number;  // percentage change
  occupancyVsPreviousPeriod: number;
}

export interface ChannelPerformance {
  channel: string;
  label: string;
  bookings: number;
  revenue: number;
  commissionPaid: number;
  occupancyShare: number;  // percentage of total bookings
  color: string;           // for chart rendering
}

export interface BookingSummary {
  id: string;
  channel: string;
  channelLabel: string;
  propertyName: string;
  unitName: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalAmount: number;
  netRevenue: number;
  status: string;
  statusColor: string;
}

export interface CalendarEvent {
  id: string;
  unitId: string;
  unitName: string;
  propertyName: string;
  start: string;       // ISO date
  end: string;         // ISO date (exclusive)
  type: 'BOOKING' | 'MAINTENANCE' | 'BLOCKED';
  channel?: string;
  guestName?: string;
  color: string;
}

export interface DashboardAlert {
  id: string;
  severity: 'INFO' | 'WARNING' | 'ERROR';
  title: string;
  message: string;
  actionUrl?: string;
  createdAt: string;
}

export interface RatePushFormData {
  propertyId: string;
  unitIds: string[];
  dateFrom: string;
  dateTo: string;
  price: number;
  minimumStay: number;
  targetChannels: string[];
}

export interface InboxMessage {
  id: string;
  bookingId: string;
  channel: string;
  channelLabel: string;
  guestName: string;
  propertyName: string;
  preview: string;
  isRead: boolean;
  sentAt: string;
}
