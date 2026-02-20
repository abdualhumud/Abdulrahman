import {
  Expense,
  Invoice,
  OwnerPayout,
  PayoutStatus,
} from '@rems/shared/types';
import { CHANNEL_COMMISSION_RATES } from '@rems/shared/constants';
import { generateId } from '@rems/shared/utils';

// ============================================================
// FINANCIAL SERVICE — PMIS Financial Module
//
// Responsibilities:
//   • Automated invoice generation on booking confirmation
//   • Expense tracking per property
//   • Monthly owner payout calculation with full reconciliation
//   • VAT computation (Saudi 15% VAT)
// ============================================================

interface DatabaseClient {
  query<T>(sql: string, params: unknown[]): Promise<{ rows: T[] }>;
  transaction<T>(fn: (tx: DatabaseClient) => Promise<T>): Promise<T>;
}

interface BookingRow {
  id: string;
  property_id: string;
  owner_id: string;
  total_amount: number;
  channel_commission: number;
  net_revenue: number;
  channel: string;
  check_in: string;
  check_out: string;
  nights: number;
  currency: string;
}

const SAR_VAT_RATE = 0.15;  // 15% Saudi VAT

export class FinancialService {
  constructor(private readonly db: DatabaseClient) {}

  // ============================================================
  // INVOICE GENERATION
  // ============================================================

  async generateInvoiceForBooking(bookingId: string): Promise<Invoice> {
    const booking = await this.getBooking(bookingId);
    const owner = await this.getOwnerForProperty(booking.property_id);

    const accommodationAmount = booking.net_revenue;
    const vatAmount = parseFloat((accommodationAmount * SAR_VAT_RATE).toFixed(2));
    const total = parseFloat((accommodationAmount + vatAmount).toFixed(2));

    const lineItems = [
      {
        description: `Accommodation: ${booking.nights} nights × SAR ${(accommodationAmount / booking.nights).toFixed(2)}`,
        quantity: booking.nights,
        unitPrice: parseFloat((accommodationAmount / booking.nights).toFixed(2)),
        total: accommodationAmount,
      },
      {
        description: `Channel Commission (${booking.channel})`,
        quantity: 1,
        unitPrice: -booking.channel_commission,
        total: -booking.channel_commission,
      },
    ];

    const invoice: Invoice = {
      id: generateId(),
      bookingId,
      propertyId: booking.property_id,
      ownerId: owner.id,
      lineItems,
      subtotal: accommodationAmount,
      tax: vatAmount,
      total,
      currency: booking.currency,
      issuedAt: new Date(),
      dueAt: new Date(Date.now() + 30 * 86_400_000),  // Net 30
    };

    await this.db.query(
      `INSERT INTO invoices (id, booking_id, property_id, owner_id, line_items, subtotal, tax, total, currency, issued_at, due_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        invoice.id,
        invoice.bookingId,
        invoice.propertyId,
        invoice.ownerId,
        JSON.stringify(invoice.lineItems),
        invoice.subtotal,
        invoice.tax,
        invoice.total,
        invoice.currency,
        invoice.issuedAt,
        invoice.dueAt,
      ],
    );

    return invoice;
  }

  // ============================================================
  // EXPENSE TRACKING
  // ============================================================

  async addExpense(expense: Omit<Expense, 'id'>): Promise<Expense> {
    const id = generateId();
    await this.db.query(
      `INSERT INTO expenses (id, property_id, category, description, amount, currency, receipt_url, incurred_at, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        id,
        expense.propertyId,
        expense.category,
        expense.description,
        expense.amount,
        expense.currency,
        expense.receiptUrl ?? null,
        expense.incurredAt,
      ],
    );
    return { ...expense, id };
  }

  async getExpensesForPeriod(propertyId: string, from: string, to: string): Promise<Expense[]> {
    const result = await this.db.query<Expense>(
      `SELECT * FROM expenses
        WHERE property_id = $1 AND incurred_at BETWEEN $2 AND $3
        ORDER BY incurred_at DESC`,
      [propertyId, from, to],
    );
    return result.rows;
  }

  // ============================================================
  // OWNER PAYOUT CALCULATION
  // ============================================================

  async calculateOwnerPayout(ownerId: string, periodStart: string, periodEnd: string): Promise<OwnerPayout> {
    return this.db.transaction(async (tx) => {
      // 1. Sum all confirmed bookings' net revenue for this owner's properties
      const revenueResult = await tx.query<{
        gross_revenue: string;
        channel_commissions: string;
        property_count: string;
      }>(
        `SELECT
            SUM(b.total_amount)         AS gross_revenue,
            SUM(b.channel_commission)   AS channel_commissions,
            COUNT(DISTINCT b.property_id) AS property_count
          FROM bookings b
          JOIN properties p ON b.property_id = p.id
          WHERE p.owner_id = $1
            AND b.check_in >= $2
            AND b.check_out <= $3
            AND b.status IN ('CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT')`,
        [ownerId, periodStart, periodEnd],
      );

      const grossRevenue = parseFloat(revenueResult.rows[0]?.gross_revenue ?? '0');
      const channelCommissions = parseFloat(revenueResult.rows[0]?.channel_commissions ?? '0');

      // 2. Sum all expenses for this period
      const expenseResult = await tx.query<{ total_expenses: string }>(
        `SELECT SUM(e.amount) AS total_expenses
          FROM expenses e
          JOIN properties p ON e.property_id = p.id
          WHERE p.owner_id = $1
            AND e.incurred_at BETWEEN $2 AND $3`,
        [ownerId, periodStart, periodEnd],
      );
      const totalExpenses = parseFloat(expenseResult.rows[0]?.total_expenses ?? '0');

      // 3. Get owner's platform fee rate
      const ownerResult = await tx.query<{ commission_rate: string; currency: string }>(
        `SELECT commission_rate, currency FROM owners WHERE id = $1`,
        [ownerId],
      );
      const platformFeeRate = parseFloat(ownerResult.rows[0]?.commission_rate ?? '0.1');
      const currency = ownerResult.rows[0]?.currency ?? 'SAR';

      const netRevenue = grossRevenue - channelCommissions;
      const platformFee = parseFloat((netRevenue * platformFeeRate).toFixed(2));

      const payout: OwnerPayout = {
        id: generateId(),
        ownerId,
        periodStart,
        periodEnd,
        grossRevenue,
        channelCommissions,
        platformFee,
        expenses: totalExpenses,
        netPayout: parseFloat((netRevenue - platformFee - totalExpenses).toFixed(2)),
        currency,
        status: PayoutStatus.PENDING,
      };

      // Upsert (idempotent for same period)
      await tx.query(
        `INSERT INTO owner_payouts (
            id, owner_id, period_start, period_end, gross_revenue,
            channel_commissions, platform_fee, expenses, currency, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (owner_id, period_start, period_end)
          DO UPDATE SET
            gross_revenue = EXCLUDED.gross_revenue,
            channel_commissions = EXCLUDED.channel_commissions,
            platform_fee = EXCLUDED.platform_fee,
            expenses = EXCLUDED.expenses,
            status = 'PENDING'`,
        [
          payout.id,
          payout.ownerId,
          payout.periodStart,
          payout.periodEnd,
          payout.grossRevenue,
          payout.channelCommissions,
          payout.platformFee,
          payout.expenses,
          payout.currency,
          payout.status,
        ],
      );

      return payout;
    });
  }

  // ---- Private ----

  private async getBooking(bookingId: string): Promise<BookingRow> {
    const result = await this.db.query<BookingRow>(
      `SELECT b.id, b.property_id, b.total_amount, b.channel_commission,
              b.net_revenue, b.channel, b.check_in::text, b.check_out::text,
              b.nights, b.currency,
              o.id AS owner_id
         FROM bookings b
         JOIN properties p ON b.property_id = p.id
         JOIN owners o ON p.owner_id = o.id
        WHERE b.id = $1`,
      [bookingId],
    );
    if (!result.rows.length) throw new Error(`Booking ${bookingId} not found`);
    return result.rows[0];
  }

  private async getOwnerForProperty(propertyId: string): Promise<{ id: string }> {
    const result = await this.db.query<{ id: string }>(
      `SELECT o.id FROM owners o JOIN properties p ON p.owner_id = o.id WHERE p.id = $1`,
      [propertyId],
    );
    if (!result.rows.length) throw new Error(`Owner not found for property ${propertyId}`);
    return result.rows[0];
  }
}
