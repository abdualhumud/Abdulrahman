'use client';

import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { MONTHLY_REVENUE, CHANNEL_BREAKDOWN, DAILY_OCCUPANCY, PROPERTIES } from '@/lib/mock-data';

const PROPERTY_METRICS = [
  { name: 'Riyadh Apt', revpar: 1024, adr: 1248, occ: 82, revenue: 84200 },
  { name: 'Jeddah Villa', revpar: 1180, adr: 1750, occ: 67, revenue: 91400 },
  { name: 'Diriyah Chalet', revpar: 780, adr: 1100, occ: 71, revenue: 62300 },
  { name: 'AlUla Studio', revpar: 640, adr: 900, occ: 71, revenue: 46850 },
];

export default function AnalyticsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics & Reports</h1>
        <p className="text-slate-500 text-sm mt-0.5">Performance metrics across your portfolio</p>
      </div>

      {/* Property Performance Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="font-semibold text-slate-800">Property Performance — February 2026</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-gray-100">
              <tr>
                {['Property', 'Revenue (SAR)', 'RevPAR', 'ADR', 'Occupancy', 'Performance'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {PROPERTY_METRICS.map(p => (
                <tr key={p.name} className="hover:bg-slate-50/50">
                  <td className="px-5 py-4 font-semibold text-slate-800">{p.name}</td>
                  <td className="px-5 py-4 font-bold text-slate-900">{p.revenue.toLocaleString()}</td>
                  <td className="px-5 py-4 text-slate-700">{p.revpar}</td>
                  <td className="px-5 py-4 text-slate-700">{p.adr}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-100 rounded-full h-2">
                        <div className="h-2 rounded-full bg-blue-500" style={{ width: `${p.occ}%` }} />
                      </div>
                      <span className="text-slate-700 font-semibold text-xs w-10">{p.occ}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      p.occ >= 80 ? 'bg-emerald-100 text-emerald-700' :
                      p.occ >= 65 ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {p.occ >= 80 ? 'Excellent' : p.occ >= 65 ? 'Good' : 'Needs Attention'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs Bookings */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Revenue vs Bookings (8 months)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={MONTHLY_REVENUE}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v/1000}k`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="revenue" name="Revenue (SAR)" fill="#3b82f6" radius={[4,4,0,0]} />
              <Bar yAxisId="right" dataKey="bookings" name="Bookings" fill="#8b5cf6" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Occupancy Line */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Daily Occupancy Rate — February</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={DAILY_OCCUPANCY}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={2} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip formatter={(v: number) => [`${v}%`, 'Occupancy']} />
              <Line type="monotone" dataKey="rate" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3, fill: '#8b5cf6' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Channel Commission Analysis */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-slate-800 mb-5">Commission Cost Analysis by Channel</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {CHANNEL_BREAKDOWN.map(ch => (
            <div key={ch.channel} className="border border-gray-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-3 h-3 rounded-full" style={{ background: ch.color }} />
                <p className="font-semibold text-sm text-slate-800">{ch.channel}</p>
              </div>
              <p className="text-xl font-bold text-slate-900">SAR {ch.revenue.toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-0.5">Gross revenue</p>
              <div className="mt-3 pt-3 border-t border-gray-50">
                <p className="text-sm font-semibold text-red-500">-SAR {ch.commission.toLocaleString()}</p>
                <p className="text-xs text-slate-400">Commission paid</p>
              </div>
              <div className="mt-2">
                <p className="text-sm font-bold text-emerald-600">SAR {(ch.revenue - ch.commission).toLocaleString()}</p>
                <p className="text-xs text-slate-400">Net revenue</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
