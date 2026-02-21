'use client';

import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Icons } from '@/lib/icons';
import { MONTHLY_REVENUE, CHANNEL_BREAKDOWN, DAILY_OCCUPANCY } from '@/lib/mock-data';

const PROPS = [
  { name: 'Riyadh Apt.',    city: 'Riyadh', revpar: 1024, adr: 1248, occ: 82,  revenue: 84200,  color: '#3B82F6' },
  { name: 'Jeddah Villa',   city: 'Jeddah', revpar: 1180, adr: 1750, occ: 67,  revenue: 91400,  color: '#8B5CF6' },
  { name: 'Diriyah Chalet', city: 'Riyadh', revpar: 780,  adr: 1100, occ: 71,  revenue: 62300,  color: '#F59E0B' },
  { name: 'AlUla Studio',   city: 'AlUla',  revpar: 640,  adr: 900,  occ: 71,  revenue: 46850,  color: '#10B981' },
];

const OCC_COLOR = (v: number) => v >= 80 ? '#10B981' : v >= 65 ? '#F59E0B' : '#EF4444';
const OCC_BADGE = (v: number) =>
  v >= 80 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
  v >= 65 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
            'bg-red-50 text-red-600 border border-red-200';
const OCC_LABEL = (v: number) => v >= 80 ? 'Excellent' : v >= 65 ? 'Good' : 'Needs attention';

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

export default function AnalyticsPage() {
  const totalRev = PROPS.reduce((s, p) => s + p.revenue, 0);

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Analytics</h1>
          <p className="text-sm text-slate-400 mt-1">Performance metrics — February 2026</p>
        </div>
        <button className="btn-ghost text-xs py-2">
          <Icons.download size={14} /> Export Report
        </button>
      </div>

      {/* Property Performance */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
          <p className="font-bold text-slate-900">Property Performance</p>
          <span className="text-xs text-slate-400">Total: <strong className="text-slate-700">SAR {totalRev.toLocaleString()}</strong></span>
        </div>
        <table className="w-full data-table">
          <thead className="bg-slate-50/70 border-b border-slate-100">
            <tr>
              {['Property', 'Revenue (SAR)', 'RevPAR', 'ADR', 'Occupancy', 'Rating'].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {PROPS.map(p => (
              <tr key={p.name} className="hover:bg-slate-50/50 transition-colors">
                <td>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: p.color + '18', color: p.color }}>
                      <Icons.building size={14} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 leading-none">{p.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{p.city}</p>
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
                  <span className={`badge ${OCC_BADGE(p.occ)}`}>{OCC_LABEL(p.occ)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <p className="font-bold text-slate-900 mb-1">Revenue & Bookings</p>
          <p className="text-xs text-slate-400 mb-4">8-month trend</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={MONTHLY_REVENUE} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
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

        <div className="card p-5">
          <p className="font-bold text-slate-900 mb-1">Daily Occupancy</p>
          <p className="text-xs text-slate-400 mb-4">February 2026</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={DAILY_OCCUPANCY} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
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

      {/* Commission breakdown */}
      <div className="card p-5">
        <p className="font-bold text-slate-900 mb-1">Commission Analysis</p>
        <p className="text-xs text-slate-400 mb-5">Gross vs. net revenue after OTA fees</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {CHANNEL_BREAKDOWN.map(ch => {
            const net = ch.revenue - ch.commission;
            const pct = ((ch.commission / ch.revenue) * 100).toFixed(1);
            return (
              <div key={ch.channel} className="border border-slate-100 rounded-2xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: ch.color }} />
                  <p className="font-bold text-sm text-slate-800">{ch.channel}</p>
                </div>
                <p className="text-xl font-extrabold text-slate-900 leading-none">
                  SAR {ch.revenue.toLocaleString()}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Gross revenue</p>
                <div className="my-3 border-t border-slate-50" />
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-red-400 font-semibold">Commission ({pct}%)</span>
                    <span className="text-red-500 font-bold">−SAR {ch.commission.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-emerald-600 font-semibold">Net</span>
                    <span className="text-emerald-700 font-bold">SAR {net.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
