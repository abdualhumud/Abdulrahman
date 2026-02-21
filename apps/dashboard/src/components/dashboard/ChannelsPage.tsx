'use client';

import { useState } from 'react';
import { CHANNEL_SYNC_STATUS, CHANNEL_BREAKDOWN } from '@/lib/mock-data';

export default function ChannelsPage() {
  const [pushing, setPushing] = useState(false);
  const [pushed, setPushed] = useState(false);
  const [form, setForm] = useState({
    dateFrom: '2026-03-01',
    dateTo: '2026-03-31',
    price: '1350',
    minStay: '2',
    channels: { booking: true, airbnb: true, gathern: true },
  });

  const handlePush = async () => {
    setPushing(true);
    await new Promise(r => setTimeout(r, 1800));
    setPushing(false);
    setPushed(true);
    setTimeout(() => setPushed(false), 4000);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Channel Manager</h1>
        <p className="text-slate-500 text-sm mt-0.5">Sync status, rate parity, and connectivity</p>
      </div>

      {/* Channel Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {CHANNEL_SYNC_STATUS.map(ch => (
          <div key={ch.channel} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${ch.bg} rounded-xl flex items-center justify-center text-xl`}>{ch.logo}</div>
                <div>
                  <p className={`font-semibold ${ch.color}`}>{ch.channel}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                    <span className="text-xs text-slate-400">Connected</span>
                  </div>
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${ch.syncMethod.includes('Webhook') ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                {ch.syncMethod}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center mb-4">
              {[
                { label: 'Today', value: ch.bookingsToday, color: '' },
                { label: 'Pending', value: ch.pending, color: ch.pending > 0 ? 'text-amber-600' : '' },
                { label: 'Failed', value: ch.failed, color: ch.failed > 0 ? 'text-red-600' : '' },
              ].map(stat => (
                <div key={stat.label} className="bg-slate-50 rounded-lg p-2">
                  <p className={`text-lg font-bold ${stat.color || 'text-slate-800'}`}>{stat.value}</p>
                  <p className="text-xs text-slate-400">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Last sync: <span className="font-medium text-slate-600">{ch.lastSync}</span></span>
              <button className="text-blue-600 hover:text-blue-700 font-semibold">Force Sync →</button>
            </div>
          </div>
        ))}
      </div>

      {/* Rate Parity Manager */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-xl">💰</span>
          <h2 className="font-semibold text-slate-800 text-lg">Rate Parity Manager</h2>
          <span className="ml-auto text-xs bg-amber-50 text-amber-600 px-3 py-1 rounded-full font-medium">Push to all channels at once</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1.5">From Date</label>
            <input type="date" value={form.dateFrom}
              onChange={e => setForm(f => ({ ...f, dateFrom: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1.5">To Date</label>
            <input type="date" value={form.dateTo}
              onChange={e => setForm(f => ({ ...f, dateTo: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1.5">Nightly Rate (SAR)</label>
            <input type="number" value={form.price}
              onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1.5">Minimum Stay (nights)</label>
            <input type="number" value={form.minStay} min={1}
              onChange={e => setForm(f => ({ ...f, minStay: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-500 mb-2.5">Target Channels</p>
          <div className="flex flex-wrap gap-3">
            {[
              { key: 'booking', label: 'Booking.com', color: '#003580' },
              { key: 'airbnb', label: 'Airbnb', color: '#FF5A5F' },
              { key: 'gathern', label: 'Gathern', color: '#00a651' },
            ].map(ch => (
              <label key={ch.key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox"
                  checked={form.channels[ch.key as keyof typeof form.channels]}
                  onChange={e => setForm(f => ({ ...f, channels: { ...f.channels, [ch.key]: e.target.checked } }))}
                  className="w-4 h-4 rounded" />
                <span className="text-sm font-medium" style={{ color: ch.color }}>● {ch.label}</span>
              </label>
            ))}
          </div>
        </div>

        {pushed && (
          <div className="mb-4 bg-emerald-50 text-emerald-700 px-4 py-3 rounded-lg text-sm font-medium">
            ✓ Rates pushed successfully to {Object.values(form.channels).filter(Boolean).length} channels!
          </div>
        )}

        <button
          onClick={handlePush}
          disabled={pushing}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg text-sm transition-colors disabled:opacity-60"
        >
          {pushing ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Pushing rates to all channels...
            </span>
          ) : `Push SAR ${parseInt(form.price).toLocaleString()}/night to ${Object.values(form.channels).filter(Boolean).length} channels`}
        </button>
      </div>

      {/* Channel Revenue Comparison */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-slate-800 mb-4">Revenue & Commission by Channel</h2>
        <div className="space-y-3">
          {CHANNEL_BREAKDOWN.map(ch => (
            <div key={ch.channel} className="flex items-center gap-4">
              <div className="w-28 text-sm font-medium text-slate-700 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: ch.color }} />
                {ch.channel}
              </div>
              <div className="flex-1 bg-slate-100 rounded-full h-2.5">
                <div className="h-2.5 rounded-full" style={{ width: `${ch.share}%`, background: ch.color }} />
              </div>
              <div className="text-right w-40">
                <p className="text-sm font-bold text-slate-800">SAR {ch.revenue.toLocaleString()}</p>
                <p className="text-xs text-red-400">Commission: SAR {ch.commission.toLocaleString()}</p>
              </div>
              <div className="text-right w-12">
                <p className="text-sm font-semibold text-slate-600">{ch.share}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
