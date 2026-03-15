/**
 * ui-styles.ts — Centralised UI style constants shared across all dashboard pages.
 *
 * Single source of truth for status badge classes, insurance badge classes, and
 * any other repeated Tailwind class strings. Import from here instead of
 * re-declaring the same objects in every component.
 */

/** Tailwind classes for booking status badges (includes dark-mode variants). */
export const STATUS_STYLES: Record<string, string> = {
  CONFIRMED:   'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
  CHECKED_IN:  'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
  CHECKED_OUT: 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600',
  PENDING:     'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
};

/** Tailwind classes for insurance / security-deposit status badges. */
export const INSURANCE_STYLES: Record<string, string> = {
  HELD:               'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
  PENDING_INSPECTION: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
  RELEASED:           'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
};

/** One day expressed in milliseconds — avoids the magic number 86_400_000. */
export const ONE_DAY_MS = 86_400_000;

/** Maximum number of recent bookings shown on the Overview dashboard. */
export const OVERVIEW_RECENT_BOOKINGS_LIMIT = 5;
