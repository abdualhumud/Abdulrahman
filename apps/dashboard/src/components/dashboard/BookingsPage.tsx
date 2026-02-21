'use client';

import { useState } from 'react';
import { Icons } from '@/lib/icons';
import { RECENT_BOOKINGS } from '@/lib/mock-data';

const STATUSES = ['ALL', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'PENDING'];

const STATUS_STYLE: Record<string, string> = {
  CONFIRMED:   'bg-emerald-50 text-emerald-700 border border-emerald-200',
  CHECKED_IN:  'bg-blue-50 text-blue-700 border border-blue-200',
  CHECKED_OUT: 'bg-slate-100 text-slate-500 border border-slate-200',
  PENDING:     'bg-amber-50 text-amber-700 border border-amber-200',
};

export default function BookingsPage() {
  const [filter, setFilter]   = useState('ALL');
  const [search, setSearch]   = useState('');

  const rows = RECENT_BOOKINGS.filter(b => {
    const s = filter === 'ALL' || b.status === filter;
    const q = !search ||
      b.guest.toLowerCase().includes(search.toLowerCase()) ||
      b.id.toLowerCase().includes(search.toLowerCase()) ||
      b.property.toLowerCase().includes(search.toLowerCase());
    return s && q;
  });

  const stats = {
    confirmed:  RECENT_BOOKINGS.filter(b => b.status === 'CONFIRMED').length,
    checkedIn:  RECENT_BOOKINGS.filter(b => b.status === 'CHECKED_IN').length,
    pending:    RECENT_BOOKINGS.filter(b => b.status === 'PENDING').length,
    revenue:    RECENT_BOOKINGS.reduce((s, b) => s + b.amount, 0),
  };

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Bookings</h1>
          <p className="text-sm text-slate-400 mt-1">{RECENT_BOOKINGS.length} total reservations</p>
        </div>
        <button className="btn-primary">
          <Icons.plus size={16} /> New Booking
        </button>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Confirmed',  value: stats.confirmed, color: 'text-emerald-700', bg: 'bg-emerald-50 border border-emerald-100' },
          { label: 'Checked In', value: stats.checkedIn, color: 'text-blue-700',    bg: 'bg-blue-50 border border-blue-100' },
          { label: 'Pending',    value: stats.pending,   color: 'text-amber-700',   bg: 'bg-amber-50 border border-amber-100' },
          { label: 'Total Revenue', value: `SAR ${stats.revenue.toLocaleString()}`, color: 'text-slate-900', bg: 'bg-white border border-slate-100 shadow-sm' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl p-4 ${s.bg}`}>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{s.label}</p>
            <p className={`text-xl font-extrabold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Icons.search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search guest name, booking ID, or property…"
            className="input pl-9"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Icons.filter size={14} className="text-slate-400 flex-shrink-0" />
          {STATUSES.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filter === s
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}>
              {s === 'ALL' ? 'All' : s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full data-table">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              {['Booking', 'Guest', 'Property', 'Channel', 'Check-in', 'Check-out', 'Nights', 'Amount', 'Status', ''].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map(b => (
              <tr key={b.id} className="hover:bg-slate-50/60 transition-colors group">
                <td className="font-mono text-xs text-slate-500 font-semibold">{b.id}</td>
                <td>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 bg-indigo-50 text-indigo-600">
                      {b.guest.charAt(0)}
                    </div>
                    <span className="font-semibold text-slate-800">{b.guest}</span>
                  </div>
                </td>
                <td>
                  <p className="text-slate-700 font-medium text-xs">{b.property}</p>
                  <p className="text-slate-400 text-xs">{b.unit}</p>
                </td>
                <td>
                  <span className="text-xs font-bold" style={{ color: b.channelColor }}>● {b.channel}</span>
                </td>
                <td className="text-xs text-slate-600 font-medium">{b.checkIn}</td>
                <td className="text-xs text-slate-600 font-medium">{b.checkOut}</td>
                <td className="text-center font-semibold text-slate-700">{b.nights}</td>
                <td className="font-bold text-slate-900">SAR {b.amount.toLocaleString()}</td>
                <td>
                  <span className={`badge ${STATUS_STYLE[b.status] ?? 'bg-slate-100 text-slate-500'}`}>
                    {b.status.replace('_', ' ')}
                  </span>
                </td>
                <td>
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity btn-ghost py-1.5 px-2.5 text-xs">
                    <Icons.eye size={13} /> View
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="py-16 text-center">
                  <p className="text-slate-300 text-3xl mb-2">📭</p>
                  <p className="text-slate-400 text-sm font-medium">No bookings match your search</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
