import React from 'react';

// ============================================================
// KPI CARD — Displays a single metric with trend indicator
// ============================================================

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;              // Percentage change vs previous period
  trendLabel?: string;         // e.g. "vs last month"
  prefix?: string;             // e.g. "SAR"
  suffix?: string;             // e.g. "%"
  icon?: string;
  color?: 'blue' | 'green' | 'amber' | 'purple' | 'rose';
}

const COLOR_MAP = {
  blue: 'bg-blue-50 text-blue-600 border-blue-100',
  green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  amber: 'bg-amber-50 text-amber-600 border-amber-100',
  purple: 'bg-purple-50 text-purple-600 border-purple-100',
  rose: 'bg-rose-50 text-rose-600 border-rose-100',
};

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  trendLabel = 'vs previous period',
  prefix,
  suffix,
  icon,
  color = 'blue',
}) => {
  const colorClass = COLOR_MAP[color];
  const hasTrend = trend !== undefined && trend !== null;
  const isPositive = hasTrend && trend! >= 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <div className="mt-1 flex items-baseline gap-1">
            {prefix && <span className="text-sm text-gray-400">{prefix}</span>}
            <span className="text-2xl font-bold text-gray-900">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </span>
            {suffix && <span className="text-sm text-gray-400">{suffix}</span>}
          </div>
          {subtitle && <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>}
        </div>

        {icon && (
          <div className={`w-10 h-10 rounded-lg border flex items-center justify-center text-lg ${colorClass}`}>
            {icon}
          </div>
        )}
      </div>

      {hasTrend && (
        <div className="mt-3 flex items-center gap-1">
          <span className={`text-xs font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
            {isPositive ? '▲' : '▼'} {Math.abs(trend!).toFixed(1)}%
          </span>
          <span className="text-xs text-gray-400">{trendLabel}</span>
        </div>
      )}
    </div>
  );
};

// ============================================================
// KPI GRID — Renders the full set of KPIs
// ============================================================

interface KpiGridProps {
  totalRevenue: number;
  netPayout: number;
  occupancyRate: number;
  adr: number;
  revPAR: number;
  totalBookings: number;
  currency: string;
  revenueTrend?: number;
  occupancyTrend?: number;
}

export const KpiGrid: React.FC<KpiGridProps> = ({
  totalRevenue,
  netPayout,
  occupancyRate,
  adr,
  revPAR,
  totalBookings,
  currency,
  revenueTrend,
  occupancyTrend,
}) => (
  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
    <KpiCard
      title="Total Revenue"
      value={totalRevenue.toFixed(0)}
      prefix={currency}
      icon="💵"
      color="green"
      trend={revenueTrend}
    />
    <KpiCard
      title="Net Payout"
      value={netPayout.toFixed(0)}
      prefix={currency}
      icon="🏦"
      color="blue"
    />
    <KpiCard
      title="Occupancy Rate"
      value={occupancyRate.toFixed(1)}
      suffix="%"
      icon="🛏️"
      color="purple"
      trend={occupancyTrend}
    />
    <KpiCard
      title="ADR"
      value={adr.toFixed(0)}
      prefix={currency}
      subtitle="Avg. Daily Rate"
      icon="📈"
      color="amber"
    />
    <KpiCard
      title="RevPAR"
      value={revPAR.toFixed(0)}
      prefix={currency}
      subtitle="Rev. Per Avail. Room"
      icon="⭐"
      color="rose"
    />
    <KpiCard
      title="Bookings"
      value={totalBookings}
      subtitle="This period"
      icon="🏷️"
      color="blue"
    />
  </div>
);
