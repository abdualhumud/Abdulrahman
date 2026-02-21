'use client';

import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  KPI_DATA, MONTHLY_REVENUE, CHANNEL_BREAKDOWN,
  RECENT_BOOKINGS, CHANNEL_SYNC_STATUS, DAILY_OCCUPANCY, OWNER,
} from '@/lib/mock-data';

export default function OverviewPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Portfolio Overview</h1>
          <p className="text-slate-500 text-sm mt-0.5">Welcome back, {OWNER.fullName} · February 2026</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-sm text-slate-500">All channels synced</span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: 'Total Revenue', value: `SAR ${KPI_DATA.totalRevenue.toLocaleString()}`, trend: KPI_DATA.revenueTrend, icon: '💵', color: 'emerald' },
          { label: 'Net Payout', value: `SAR ${KPI_DATA.netPayout.toLocaleString()}`, trend: null, icon: '🏦', color: 'blue' },
          { label: 'Occupancy', value: `${KPI_DATA.averageOccupancy}%`, trend: KPI_DATA.occupancyTrend, icon: '🛏️', color: 'purple' },
          { label: 'ADR', value: `SAR ${KPI_DATA.adr.toLocaleString()}`, trend: null, icon: '📊', color: 'amber' },
          { label: 'RevPAR', value: `SAR ${KPI_DATA.revPAR.toLocaleString()}`, trend: null, icon: '⭐', color: 'rose' },
          { label: 'Bookings', value: KPI_DATA.totalBookings.toString(), trend: null, icon: '🏷️', color: 'blue' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <p className="text-xs text-slate-500 font-medium">{kpi.label}</p>
              <span className="text-lg">{kpi.icon}</span>
            </div>
            <p className="text-xl font-bold text-slate-900 mt-2">{kpi.value}</p>
            {kpi.trend !== null && kpi.trend !== undefined && (
              <p className={`text-xs mt-1 font-semibold ${kpi.trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {kpi.trend >= 0 ? '▲' : '▼'} {Math.abs(kpi.trend)}% vs last period
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4">Monthly Revenue (SAR)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={MONTHLY_REVENUE}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [`SAR ${v.toLocaleString()}`, 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Channel Pie */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4">Revenue by Channel</h2>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={CHANNEL_BREAKDOWN} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="revenue" paddingAngle={3}>
                {CHANNEL_BREAKDOWN.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => [`SAR ${v.toLocaleString()}`, '']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {CHANNEL_BREAKDOWN.map(ch => (
              <div key={ch.channel} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ch.color }} />
                  <span className="text-slate-600">{ch.channel}</span>
                </div>
                <span className="font-semibold text-slate-800">{ch.share}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Occupancy + Channel Sync */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Occupancy */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4">Daily Occupancy Rate (%)</h2>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={DAILY_OCCUPANCY} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={1} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip formatter={(v: number) => [`${v}%`, 'Occupancy']} />
              <Bar dataKey="rate" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Sync Status */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4">Channel Sync Status</h2>
          <div className="space-y-3">
            {CHANNEL_SYNC_STATUS.map(ch => (
              <div key={ch.channel} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                <div className={`w-9 h-9 rounded-lg ${ch.bg} flex items-center justify-center text-lg flex-shrink-0`}>
                  {ch.logo}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-semibold ${ch.color}`}>{ch.channel}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${ch.syncMethod.includes('Webhook') ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                      {ch.syncMethod}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Last sync: {ch.lastSync}</p>
                </div>
                <span className="w-2 h-2 bg-emerald-400 rounded-full flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Recent Bookings</h2>
          <span className="text-xs text-blue-600 cursor-pointer hover:underline">View all →</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                {['Booking ID', 'Guest', 'Property', 'Channel', 'Check-in', 'Check-out', 'Nights', 'Amount', 'Status'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-slate-400 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RECENT_BOOKINGS.slice(0, 5).map(b => (
                <tr key={b.id} className="border-b border-gray-50 hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{b.id}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{b.guest}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{b.property}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: b.channelColor }}>
                      ● {b.channel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{b.checkIn}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{b.checkOut}</td>
                  <td className="px-4 py-3 text-center text-slate-600">{b.nights}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">SAR {b.amount.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${b.statusColor}`}>{b.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
