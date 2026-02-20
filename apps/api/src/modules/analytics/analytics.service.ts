import { ChannelMetric, ChannelType, PerformanceMetrics } from '@rems/shared/types';

// ============================================================
// ANALYTICS SERVICE — RevPAR, ADR, Occupancy Reporting
//
// Key Industry Metrics:
//   ADR  (Average Daily Rate)  = Total Room Revenue / Rooms Sold
//   OCC  (Occupancy Rate)      = Rooms Occupied / Rooms Available × 100
//   RevPAR                     = ADR × Occupancy Rate
//                              = Total Revenue / Total Available Room Nights
// ============================================================

interface DatabaseClient {
  query<T>(sql: string, params: unknown[]): Promise<{ rows: T[] }>;
}

interface PropertyPerformanceRow {
  property_id: string;
  month: string;
  total_bookings: string;
  total_net_revenue: string;
  total_gross_revenue: string;
  total_commissions: string;
  avg_length_of_stay: string;
  adr: string;
  channel: string;
  confirmed_bookings: string;
}

interface RawDayRow {
  date: string;
  total_units: string;
  occupied_units: string;
  revenue_for_day: string;
}

export class AnalyticsService {
  constructor(private readonly db: DatabaseClient) {}

  // ============================================================
  // PERFORMANCE METRICS (RevPAR / ADR / Occupancy)
  // ============================================================

  async getPropertyPerformance(
    propertyId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<PerformanceMetrics> {
    // 1. Get total available room-nights for the period
    const capacityResult = await this.db.query<{ available_nights: string }>(
      `SELECT COUNT(*) AS available_nights
         FROM availability a
         JOIN units u ON a.unit_id = u.id
        WHERE u.property_id = $1
          AND a.date BETWEEN $2 AND $3`,
      [propertyId, periodStart, periodEnd],
    );
    const totalAvailableNights = parseInt(capacityResult.rows[0]?.available_nights ?? '0', 10);

    // 2. Get sold room-nights and revenue from confirmed bookings
    const bookingResult = await this.db.query<{
      total_bookings: string;
      nights_sold: string;
      net_revenue: string;
      avg_stay: string;
    }>(
      `SELECT
          COUNT(*)                  AS total_bookings,
          SUM(b.nights)             AS nights_sold,
          SUM(b.net_revenue)        AS net_revenue,
          AVG(b.nights)             AS avg_stay
        FROM bookings b
       WHERE b.property_id = $1
         AND b.check_in >= $2
         AND b.check_out <= $3
         AND b.status NOT IN ('CANCELLED', 'NO_SHOW')`,
      [propertyId, periodStart, periodEnd],
    );

    const nightsSold = parseInt(bookingResult.rows[0]?.nights_sold ?? '0', 10);
    const netRevenue = parseFloat(bookingResult.rows[0]?.net_revenue ?? '0');
    const totalBookings = parseInt(bookingResult.rows[0]?.total_bookings ?? '0', 10);
    const avgStay = parseFloat(bookingResult.rows[0]?.avg_stay ?? '0');

    const occupancyRate =
      totalAvailableNights > 0
        ? parseFloat(((nightsSold / totalAvailableNights) * 100).toFixed(2))
        : 0;

    const adr =
      nightsSold > 0
        ? parseFloat((netRevenue / nightsSold).toFixed(2))
        : 0;

    const revPAR =
      totalAvailableNights > 0
        ? parseFloat((netRevenue / totalAvailableNights).toFixed(2))
        : 0;

    // 3. Per-channel breakdown
    const channelBreakdown = await this.getChannelBreakdown(propertyId, periodStart, periodEnd);

    return {
      propertyId,
      period: { start: periodStart, end: periodEnd },
      occupancyRate,
      adr,
      revPAR,
      totalRevenue: netRevenue,
      totalBookings,
      averageLengthOfStay: parseFloat(avgStay.toFixed(1)),
      channelBreakdown,
    };
  }

  // ============================================================
  // CHANNEL BREAKDOWN
  // ============================================================

  async getChannelBreakdown(
    propertyId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<ChannelMetric[]> {
    const result = await this.db.query<{
      channel: string;
      bookings: string;
      revenue: string;
      commission_paid: string;
      nights_sold: string;
    }>(
      `SELECT
          channel::text,
          COUNT(*)               AS bookings,
          SUM(net_revenue)       AS revenue,
          SUM(channel_commission) AS commission_paid,
          SUM(nights)            AS nights_sold
        FROM bookings
       WHERE property_id = $1
         AND check_in >= $2
         AND check_out <= $3
         AND status NOT IN ('CANCELLED', 'NO_SHOW')
       GROUP BY channel`,
      [propertyId, periodStart, periodEnd],
    );

    const totalBookings = result.rows.reduce((s, r) => s + parseInt(r.bookings, 10), 0);

    return result.rows.map((row) => ({
      channel: row.channel as ChannelType,
      bookings: parseInt(row.bookings, 10),
      revenue: parseFloat(row.revenue ?? '0'),
      occupancyContribution:
        totalBookings > 0
          ? parseFloat(((parseInt(row.bookings, 10) / totalBookings) * 100).toFixed(1))
          : 0,
      commissionPaid: parseFloat(row.commission_paid ?? '0'),
    }));
  }

  // ============================================================
  // DAILY OCCUPANCY TIMELINE (for sparkline charts)
  // ============================================================

  async getDailyOccupancy(
    propertyId: string,
    fromDate: string,
    toDate: string,
  ): Promise<Array<{ date: string; occupancyRate: number; revenue: number }>> {
    const result = await this.db.query<RawDayRow>(
      `SELECT
          a.date::text,
          COUNT(DISTINCT a.unit_id)                                AS total_units,
          COUNT(DISTINCT b.unit_id) FILTER (WHERE b.id IS NOT NULL) AS occupied_units,
          COALESCE(SUM(b.net_revenue / b.nights), 0)               AS revenue_for_day
        FROM availability a
        JOIN units u ON a.unit_id = u.id
        LEFT JOIN bookings b ON (
          b.unit_id = a.unit_id
          AND a.date >= b.check_in
          AND a.date < b.check_out
          AND b.status NOT IN ('CANCELLED', 'NO_SHOW')
        )
        WHERE u.property_id = $1
          AND a.date BETWEEN $2 AND $3
        GROUP BY a.date
        ORDER BY a.date`,
      [propertyId, fromDate, toDate],
    );

    return result.rows.map((row) => {
      const total = parseInt(row.total_units, 10);
      const occupied = parseInt(row.occupied_units, 10);
      return {
        date: row.date,
        occupancyRate: total > 0 ? parseFloat(((occupied / total) * 100).toFixed(1)) : 0,
        revenue: parseFloat(row.revenue_for_day ?? '0'),
      };
    });
  }

  // ============================================================
  // PORTFOLIO SUMMARY (Multi-property owner dashboard)
  // ============================================================

  async getOwnerPortfolioSummary(ownerId: string, periodStart: string, periodEnd: string) {
    const result = await this.db.query<{
      property_id: string;
      property_name: string;
      total_revenue: string;
      occupancy_rate: string;
      adr: string;
      rev_par: string;
      total_bookings: string;
    }>(
      `WITH property_stats AS (
          SELECT
            b.property_id,
            SUM(b.net_revenue)   AS total_revenue,
            SUM(b.nights)        AS nights_sold,
            COUNT(*)             AS total_bookings
          FROM bookings b
          WHERE b.property_id IN (SELECT id FROM properties WHERE owner_id = $1)
            AND b.check_in >= $2
            AND b.check_out <= $3
            AND b.status NOT IN ('CANCELLED', 'NO_SHOW')
          GROUP BY b.property_id
        ),
        capacity AS (
          SELECT
            u.property_id,
            COUNT(*) AS available_nights
          FROM availability a
          JOIN units u ON a.unit_id = u.id
          WHERE u.property_id IN (SELECT id FROM properties WHERE owner_id = $1)
            AND a.date BETWEEN $2 AND $3
          GROUP BY u.property_id
        )
        SELECT
          p.id            AS property_id,
          p.name          AS property_name,
          COALESCE(ps.total_revenue, 0)   AS total_revenue,
          COALESCE(ps.total_bookings, 0)  AS total_bookings,
          CASE WHEN c.available_nights > 0
            THEN ROUND((ps.nights_sold::numeric / c.available_nights) * 100, 2)
            ELSE 0
          END             AS occupancy_rate,
          CASE WHEN ps.nights_sold > 0
            THEN ROUND(ps.total_revenue / ps.nights_sold, 2)
            ELSE 0
          END             AS adr,
          CASE WHEN c.available_nights > 0
            THEN ROUND(ps.total_revenue / c.available_nights, 2)
            ELSE 0
          END             AS rev_par
        FROM properties p
        LEFT JOIN property_stats ps ON p.id = ps.property_id
        LEFT JOIN capacity c ON p.id = c.property_id
        WHERE p.owner_id = $1
        ORDER BY total_revenue DESC`,
      [ownerId, periodStart, periodEnd],
    );

    const totalRevenue = result.rows.reduce((s, r) => s + parseFloat(r.total_revenue), 0);
    const avgOccupancy =
      result.rows.length > 0
        ? result.rows.reduce((s, r) => s + parseFloat(r.occupancy_rate), 0) / result.rows.length
        : 0;

    return {
      ownerId,
      period: { start: periodStart, end: periodEnd },
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      averageOccupancy: parseFloat(avgOccupancy.toFixed(2)),
      propertyCount: result.rows.length,
      properties: result.rows.map((r) => ({
        propertyId: r.property_id,
        propertyName: r.property_name,
        totalRevenue: parseFloat(r.total_revenue),
        totalBookings: parseInt(r.total_bookings, 10),
        occupancyRate: parseFloat(r.occupancy_rate),
        adr: parseFloat(r.adr),
        revPAR: parseFloat(r.rev_par),
      })),
    };
  }
}
