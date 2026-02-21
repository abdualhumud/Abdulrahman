'use client';

import { useState } from 'react';
import { RECENT_BOOKINGS } from '@/lib/mock-data';

const STATUS_FILTERS = ['ALL', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'PENDING'];

export default function BookingsPage() {
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const filtered = RECENT_BOOKINGS.filter(b => {
    const matchStatus = filter === 'ALL' || b.status === filter;
    const matchSearch = b.guest.toLowerCase().includes(search.toLowerCase()) ||
      b.id.toLowerCase().includes(search.toLowerCase()) ||
      b.property.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bookings</h1>
          <p className="text-slate-500 text-sm mt-0.5">{RECENT_BOOKINGS.length} total reservations</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          + New Booking
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search guest, booking ID, property..."
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === s ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-gray-100">
              <tr>
                {['Booking ID', 'Guest', 'Property / Unit', 'Channel', 'Check-in', 'Check-out', 'Nights', 'Amount (SAR)', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(b => (
                <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3.5 font-mono text-xs text-slate-600 font-medium">{b.id}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0">
                        {b.guest.charAt(0)}
                      </div>
                      <span className="font-medium text-slate-800 text-sm">{b.guest}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-slate-800 font-medium text-xs">{b.property}</p>
                    <p className="text-slate-400 text-xs">{b.unit}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs font-semibold" style={{ color: b.channelColor }}>● {b.channel}</span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-600">{b.checkIn}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-600">{b.checkOut}</td>
                  <td className="px-4 py-3.5 text-center text-slate-700 font-medium">{b.nights}</td>
                  <td className="px-4 py-3.5 font-bold text-slate-900">{b.amount.toLocaleString()}</td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${b.statusColor}`}>{b.status}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">View</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400 text-sm">No bookings found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
