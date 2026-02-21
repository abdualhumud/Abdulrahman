'use client';

import { KPI_DATA, RECENT_BOOKINGS, OWNER } from '@/lib/mock-data';

const INVOICES = [
  { id: 'INV-2026-087', booking: 'BK-1091', guest: 'Mohammed Al-Otaibi', amount: 5248, vat: 787, total: 6035, status: 'ISSUED', date: '2026-02-22' },
  { id: 'INV-2026-086', booking: 'BK-1090', guest: 'Sarah Thompson',     amount: 8750, vat: 1312, total: 10062, status: 'PAID',   date: '2026-02-20' },
  { id: 'INV-2026-085', booking: 'BK-1089', guest: 'Khalid Al-Dosari',   amount: 3600, vat: 540,  total: 4140, status: 'PAID',   date: '2026-02-18' },
  { id: 'INV-2026-084', booking: 'BK-1088', guest: 'Emma Wilson',        amount: 4200, vat: 630,  total: 4830, status: 'PAID',   date: '2026-02-16' },
];

const EXPENSES = [
  { id: 'EXP-041', property: 'Riyadh Luxury Apartment', category: 'Maintenance', desc: 'AC unit servicing', amount: 850, date: '2026-02-18' },
  { id: 'EXP-040', property: 'Jeddah Corniche Villa',   category: 'Cleaning',    desc: 'Deep cleaning service', amount: 600, date: '2026-02-15' },
  { id: 'EXP-039', property: 'Diriyah Heritage Chalet', category: 'Utilities',   desc: 'Electricity bill', amount: 420, date: '2026-02-10' },
  { id: 'EXP-038', property: 'AlUla Desert Studio',     category: 'Supplies',    desc: 'Linen & toiletries restock', amount: 320, date: '2026-02-08' },
];

const PAYOUT = {
  gross: 284750,
  commissions: 24813,
  platformFee: 25994,
  expenses: 2190,
  net: 231753,
};

export default function FinancialsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Financials</h1>
          <p className="text-slate-500 text-sm mt-0.5">Invoices, expenses, and owner payouts</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
          + Add Expense
        </button>
      </div>

      {/* Payout Summary */}
      <div className="bg-gradient-to-br from-slate-900 to-blue-900 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-slate-300 text-sm font-medium">February 2026 — Owner Payout Summary</p>
            <p className="text-3xl font-bold mt-1">SAR {PAYOUT.net.toLocaleString()}</p>
            <p className="text-slate-300 text-sm mt-1">Net payout to {OWNER.fullName}</p>
          </div>
          <span className="bg-emerald-500/20 text-emerald-300 text-xs px-3 py-1.5 rounded-full font-semibold border border-emerald-500/30">
            PENDING TRANSFER
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Gross Revenue', value: PAYOUT.gross, color: 'text-white' },
            { label: 'Channel Commissions', value: -PAYOUT.commissions, color: 'text-red-300' },
            { label: 'Platform Fee (10%)', value: -PAYOUT.platformFee, color: 'text-red-300' },
            { label: 'Expenses', value: -PAYOUT.expenses, color: 'text-red-300' },
          ].map(item => (
            <div key={item.label} className="bg-white/10 rounded-xl p-3">
              <p className="text-slate-300 text-xs">{item.label}</p>
              <p className={`font-bold text-lg mt-1 ${item.color}`}>
                {item.value < 0 ? '-' : ''}SAR {Math.abs(item.value).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoices */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Invoices</h2>
            <button className="text-xs text-blue-600 hover:underline">View all</button>
          </div>
          <div className="divide-y divide-gray-50">
            {INVOICES.map(inv => (
              <div key={inv.id} className="px-5 py-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-xs text-slate-500">{inv.id}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>{inv.status}</span>
                  </div>
                  <p className="font-medium text-slate-800 text-sm mt-0.5">{inv.guest}</p>
                  <p className="text-xs text-slate-400">{inv.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">SAR {inv.total.toLocaleString()}</p>
                  <p className="text-xs text-slate-400">incl. VAT SAR {inv.vat}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expenses */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Expenses</h2>
            <p className="text-sm font-semibold text-red-500">Total: SAR {EXPENSES.reduce((s, e) => s + e.amount, 0).toLocaleString()}</p>
          </div>
          <div className="divide-y divide-gray-50">
            {EXPENSES.map(exp => (
              <div key={exp.id} className="px-5 py-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium">{exp.category}</span>
                  </div>
                  <p className="font-medium text-slate-800 text-sm mt-0.5">{exp.desc}</p>
                  <p className="text-xs text-slate-400">{exp.property} · {exp.date}</p>
                </div>
                <p className="font-bold text-red-500">-SAR {exp.amount.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
