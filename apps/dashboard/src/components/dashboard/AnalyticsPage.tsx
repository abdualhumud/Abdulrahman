'use client';

import { useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Icons } from '@/lib/icons';
import { MONTHLY_REVENUE, CHANNEL_BREAKDOWN, DAILY_OCCUPANCY } from '@/lib/mock-data';
import { useLang } from '@/lib/language-context';
import { useMode } from '@/lib/mode-context';
import { useBookings } from '@/lib/hooks/useBookings';

// Demo-only hardcoded property performance
const DEMO_PROPS = [
  { name: 'Riyadh Apt.',    city: 'Riyadh', revpar: 1024, adr: 1248, occ: 82,  revenue: 84200,  color: '#3B82F6' },
  { name: 'Jeddah Villa',   city: 'Jeddah', revpar: 1180, adr: 1750, occ: 67,  revenue: 91400,  color: '#8B5CF6' },
  { name: 'Diriyah Chalet', city: 'Riyadh', revpar: 780,  adr: 1100, occ: 71,  revenue: 62300,  color: '#F59E0B' },
  { name: 'AlUla Studio',   city: 'AlUla',  revpar: 640,  adr: 900,  occ: 71,  revenue: 46850,  color: '#10B981' },
];

const UNIT_COLORS = ['#3B82F6','#8B5CF6','#F59E0B','#10B981','#EC4899','#06B6D4'];
const COMMISSION_RATES: Record<string, number> = {
  'Booking.com': 0.15, 'Airbnb': 0.03, 'Gathern': 0.10,
  'Agoda': 0.12, 'Expedia': 0.12, 'Direct': 0,
};
const CHANNEL_COLORS: Record<string, string> = {
  'Booking.com': '#3B82F6', 'Airbnb': '#FF385C', 'Gathern': '#00A651',
  'Agoda': '#E31837', 'Expedia': '#1C3D7D', 'Direct': '#F59E0B',
};

const OCC_COLOR = (v: number) => v >= 80 ? '#10B981' : v >= 65 ? '#F59E0B' : '#EF4444';
const OCC_BADGE = (v: number) =>
  v >= 80 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
  v >= 65 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
            'bg-red-50 text-red-600 border border-red-200';

const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 shadow-xl rounded-xl px-4 py-3">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="text-sm font-bold" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' && p.name?.includes('Rev')
            ? `SAR ${p.value.toLocaleString()}` : p.value}
        </p>
      ))}
    </div>
  );
};

function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv, ], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function AnalyticsPage() {
  const { t, lang } = useLang();
  const { isDemo } = useMode();
  const { allBookings } = useBookings();

  // --- Derive production metrics from real bookings ---
  const props = useMemo(() => {
    if (isDemo) return DEMO_PROPS;
    const byUnit = new Map<string, { revenue: number; nights: number; city: string }>();
    for (const b of allBookings) {
      const key = b.property || b.unit || 'Unknown';
      const cur = byUnit.get(key) ?? { revenue: 0, nights: 0, city: '' };
      byUnit.set(key, { revenue: cur.revenue + b.amount, nights: cur.nights + b.nights, city: '' });
    }
    return Array.from(byUnit.entries()).map(([name, data], i) => {
      const adr    = data.nights > 0 ? Math.round(data.revenue / data.nights) : 0;
      const occ    = Math.min(99, Math.round((data.nights / 30) * 100));
      return { name, city: '', revpar: Math.round(adr * occ / 100), adr, occ, revenue: data.revenue, color: UNIT_COLORS[i % UNIT_COLORS.length] };
    });
  }, [isDemo, allBookings]);

  const monthlyRevenue = useMemo(() => {
    if (isDemo) return MONTHLY_REVENUE;
    const map = new Map<string, { revenue: number; bookings: number }>();
    for (const b of allBookings) {
      const month = new Date(b.checkIn).toLocaleString('en', { month: 'short' });
      const cur = map.get(month) ?? { revenue: 0, bookings: 0 };
      map.set(month, { revenue: cur.revenue + b.amount, bookings: cur.bookings + 1 });
    }
    return Array.from(map.entries()).map(([month, d]) => ({ month, revenue: d.revenue, bookings: d.bookings }));
  }, [isDemo, allBookings]);

  const channelBreakdown = useMemo(() => {
    if (isDemo) return CHANNEL_BREAKDOWN;
    const map = new Map<string, { revenue: number; commission: number }>();
    for (const b of allBookings) {
      const ch   = b.channel || 'Direct';
      const rate = COMMISSION_RATES[ch] ?? 0.12;
      const cur  = map.get(ch) ?? { revenue: 0, commission: 0 };
      map.set(ch, { revenue: cur.revenue + b.amount, commission: cur.commission + Math.round(b.amount * rate) });
    }
    const entries = Array.from(map.entries());
    const total   = entries.reduce((s, [, d]) => s + d.revenue, 0) || 1;
    return entries.map(([channel, data]) => ({
      channel, revenue: data.revenue, commission: data.commission,
      share: Math.round((data.revenue / total) * 100),
      color: CHANNEL_COLORS[channel] ?? '#94A3B8',
    }));
  }, [isDemo, allBookings]);

  const totalRev = props.reduce((s, p) => s + p.revenue, 0);
  const hasData  = props.length > 0;
  const dailyOcc = isDemo ? DAILY_OCCUPANCY : [];

  const handleExport = () => {
    if (!hasData) return;
    const rows: (string | number)[][] = [
      ['REMS Analytics Report'],
      [],
      ['Property Performance'],
      ['Property', 'City', 'Revenue (SAR)', 'RevPAR (SAR)', 'ADR (SAR)', 'Occupancy'],
      ...props.map(p => [p.name, p.city, p.revenue, p.revpar, p.adr, `${p.occ}%`]),
      [],
      ['Monthly Revenue'],
      ['Month', 'Revenue (SAR)', 'Bookings'],
      ...monthlyRevenue.map(m => [m.month, m.revenue, m.bookings]),
      [],
      ['Channel Commission Breakdown'],
      ['Channel', 'Gross Revenue (SAR)', 'Commission (SAR)', 'Net Revenue (SAR)'],
      ...channelBreakdown.map(ch => [ch.channel, ch.revenue, ch.commission, ch.revenue - ch.commission]),
    ];
    downloadCSV('REMS-Analytics.csv', rows);
  };

  const occLabel = (v: number) =>
    v >= 80 ? t.analytics.excellent : v >= 65 ? t.analytics.good : t.analytics.needsAttn;

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{t.analytics.title}</h1>
          <p className="text-sm text-slate-400 mt-1">{t.analytics.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {!isDemo && (
            <span className="badge bg-blue-50 text-blue-600 border border-blue-100 text-[10px]">
              {lang === 'ar' ? 'بيانات حقيقية' : 'Live data'}
            </span>
          )}
          <button
            onClick={handleExport}
            disabled={!hasData}
            title={!hasData ? (lang === 'ar' ? 'لا توجد بيانات للتصدير' : 'No data to export') : undefined}
            className="btn-ghost text-xs py-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Icons.download size={14} /> {t.common.export}
          </button>
        </div>
      </div>

      {/* Empty state for fresh production accounts */}
      {!isDemo && !hasData && (
        <div className="card p-10 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center">
            <Icons.analytics size={24} className="text-blue-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 mb-1">
              {lang === 'ar' ? 'لا توجد بيانات تحليلية بعد' : 'No analytics data yet'}
            </h3>
            <p className="text-sm text-slate-400 max-w-sm">
              {lang === 'ar'
                ? 'ستظهر التقارير هنا بمجرد إضافة حجوزاتك الأولى.'
                : 'Reports will appear here once you add your first bookings.'}
            </p>
          </div>
        </div>
      )}

      {/* Property Performance */}
      {hasData && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
            <p className="font-bold text-slate-900">{t.analytics.propPerf}</p>
            <span className="text-xs text-slate-400">
              {t.analytics.total}: <strong className="text-slate-700">SAR {totalRev.toLocaleString()}</strong>
            </span>
          </div>
          <div style={{ direction: 'ltr' }}>
            <table className="w-full data-table">
              <thead className="bg-slate-50/70 border-b border-slate-100">
                <tr>
                  {[t.analytics.property, t.analytics.revenueSAR, t.analytics.revpar, t.analytics.adr, t.analytics.occupancy, t.analytics.rating].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {props.map(p => (
                  <tr key={p.name} className="hover:bg-slate-50/50 transition-colors">
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: p.color + '18', color: p.color }}>
                          <Icons.building size={14} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 leading-none">{p.name}</p>
                          {p.city && <p className="text-xs text-slate-400 mt-0.5">{p.city}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="font-extrabold text-slate-900">SAR {p.revenue.toLocaleString()}</td>
                    <td className="font-semibold text-slate-700">SAR {p.revpar.toLocaleString()}</td>
                    <td className="font-semibold text-slate-700">SAR {p.adr.toLocaleString()}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden" style={{ minWidth: 60 }}>
                          <div className="h-2 rounded-full transition-all" style={{ width: `${p.occ}%`, background: OCC_COLOR(p.occ) }} />
                        </div>
                        <span className="text-xs font-bold text-slate-700 w-9 flex-shrink-0">{p.occ}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${OCC_BADGE(p.occ)}`}>{occLabel(p.occ)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Charts */}
      {(monthlyRevenue.length > 0 || dailyOcc.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {monthlyRevenue.length > 0 && (
            <div className="card p-5">
              <p className="font-bold text-slate-900 mb-1">{t.analytics.revBookings}</p>
              <p className="text-xs text-slate-400 mb-4">{t.analytics.trendMonths}</p>
              <div style={{ direction: 'ltr' }}>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={monthlyRevenue} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="l" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false}
                      tickFormatter={v => `${v/1000}k`} width={30} />
                    <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={24} />
                    <Tooltip content={<Tip />} />
                    <Bar yAxisId="l" dataKey="revenue" name="Revenue (SAR)" fill="#3B82F6" radius={[5,5,0,0]} maxBarSize={24} />
                    <Bar yAxisId="r" dataKey="bookings" name="Bookings" fill="#8B5CF6" radius={[5,5,0,0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {dailyOcc.length > 0 && (
            <div className="card p-5">
              <p className="font-bold text-slate-900 mb-1">{t.analytics.dailyOcc}</p>
              <p className="text-xs text-slate-400 mb-4">{t.analytics.february}</p>
              <div style={{ direction: 'ltr' }}>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={dailyOcc} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} interval={2} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false}
                      tickFormatter={v => `${v}%`} width={30} />
                    <Tooltip formatter={(v: number) => [`${v}%`, 'Occupancy']} />
                    <Line type="monotone" dataKey="rate" stroke="#8B5CF6" strokeWidth={2.5}
                      dot={{ r: 3, fill: '#8B5CF6', strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: '#8B5CF6', stroke: '#fff', strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Commission breakdown */}
      {channelBreakdown.length > 0 && (
        <div className="card p-5">
          <p className="font-bold text-slate-900 mb-1">{t.analytics.commission}</p>
          <p className="text-xs text-slate-400 mb-5">{t.analytics.commissionDesc}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {channelBreakdown.map(ch => {
              const net = ch.revenue - ch.commission;
              const pct = ch.revenue > 0 ? ((ch.commission / ch.revenue) * 100).toFixed(1) : '0';
              return (
                <div key={ch.channel} className="border border-slate-100 rounded-2xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: ch.color }} />
                    <p className="font-bold text-sm text-slate-800">{ch.channel}</p>
                  </div>
                  <p className="text-xl font-extrabold text-slate-900 leading-none" style={{ direction: 'ltr' }}>
                    SAR {ch.revenue.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{t.analytics.gross}</p>
                  <div className="my-3 border-t border-slate-50" />
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-red-400 font-semibold">{t.channels.commission} ({pct}%)</span>
                      <span className="text-red-500 font-bold" style={{ direction: 'ltr' }}>−SAR {ch.commission.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-emerald-600 font-semibold">{t.analytics.netRev}</span>
                      <span className="text-emerald-700 font-bold" style={{ direction: 'ltr' }}>SAR {net.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
