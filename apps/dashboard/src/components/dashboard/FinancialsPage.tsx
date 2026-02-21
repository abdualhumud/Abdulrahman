'use client';

import { Icons } from '@/lib/icons';
import { OWNER } from '@/lib/mock-data';

const PAYOUT = { gross: 284750, commissions: 24813, platformFee: 25994, expenses: 2190, net: 231753 };

const INVOICES = [
  { id: 'INV-2026-087', booking: 'BK-1091', guest: 'Mohammed Al-Otaibi', amount: 5248,  vat: 787,  total: 6035,  status: 'ISSUED', date: '2026-02-22' },
  { id: 'INV-2026-086', booking: 'BK-1090', guest: 'Sarah Thompson',     amount: 8750,  vat: 1312, total: 10062, status: 'PAID',   date: '2026-02-20' },
  { id: 'INV-2026-085', booking: 'BK-1089', guest: 'Khalid Al-Dosari',   amount: 3600,  vat: 540,  total: 4140,  status: 'PAID',   date: '2026-02-18' },
  { id: 'INV-2026-084', booking: 'BK-1088', guest: 'Emma Wilson',        amount: 4200,  vat: 630,  total: 4830,  status: 'PAID',   date: '2026-02-16' },
];

const EXPENSES = [
  { id: 'EXP-041', property: 'Riyadh Luxury Apartment', category: 'Maintenance', desc: 'AC unit servicing',        amount: 850, date: '2026-02-18' },
  { id: 'EXP-040', property: 'Jeddah Corniche Villa',   category: 'Cleaning',    desc: 'Deep cleaning service',    amount: 600, date: '2026-02-15' },
  { id: 'EXP-039', property: 'Diriyah Heritage Chalet', category: 'Utilities',   desc: 'Electricity bill',         amount: 420, date: '2026-02-10' },
  { id: 'EXP-038', property: 'AlUla Desert Studio',     category: 'Supplies',    desc: 'Linen & toiletries restock', amount: 320, date: '2026-02-08' },
];

const CAT_COLOR: Record<string, string> = {
  Maintenance: 'bg-blue-50 text-blue-700 border border-blue-100',
  Cleaning:    'bg-emerald-50 text-emerald-700 border border-emerald-100',
  Utilities:   'bg-amber-50 text-amber-700 border border-amber-100',
  Supplies:    'bg-purple-50 text-purple-700 border border-purple-100',
};

const breakdowns = [
  { label: 'Gross Revenue',       value: PAYOUT.gross,        sign: '+', color: 'text-white'    },
  { label: 'Channel Commissions', value: PAYOUT.commissions,  sign: '−', color: 'text-red-300'  },
  { label: 'Platform Fee (10%)',  value: PAYOUT.platformFee,  sign: '−', color: 'text-red-300'  },
  { label: 'Expenses',            value: PAYOUT.expenses,     sign: '−', color: 'text-red-300'  },
];

export default function FinancialsPage() {
  const totalExpenses = EXPENSES.reduce((s, e) => s + e.amount, 0);
  const netPct = ((PAYOUT.net / PAYOUT.gross) * 100).toFixed(1);

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Financials</h1>
          <p className="text-sm text-slate-400 mt-1">Invoices, expenses & owner payouts</p>
        </div>
        <button className="btn-primary">
          <Icons.plus size={15} /> Add Expense
        </button>
      </div>

      {/* Payout Hero Card */}
      <div className="rounded-2xl p-7 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%)' }}>
        {/* decorative circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10"
          style={{ background: 'radial-gradient(#60A5FA, transparent)' }} />
        <div className="absolute -bottom-12 -left-8 w-48 h-48 rounded-full opacity-10"
          style={{ background: 'radial-gradient(#818CF8, transparent)' }} />

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-slate-400 text-sm font-semibold">February 2026 · Owner Payout</p>
              <p className="text-4xl font-extrabold mt-2 tracking-tight">
                SAR {PAYOUT.net.toLocaleString()}
              </p>
              <p className="text-slate-400 text-sm mt-1">
                Net to {OWNER.fullName} · {netPct}% of gross
              </p>
            </div>
            <span className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 text-xs px-3 py-1.5 rounded-full font-bold border border-emerald-500/30">
              <Icons.check size={12} /> PENDING TRANSFER
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {breakdowns.map(b => (
              <div key={b.label} className="bg-white/8 rounded-xl p-4 backdrop-blur-sm border border-white/10">
                <p className="text-slate-400 text-xs font-medium leading-none">{b.label}</p>
                <p className={`font-extrabold text-lg mt-2 leading-none ${b.color}`}>
                  {b.sign === '−' ? '−' : ''}SAR {b.value.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Invoices + Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Invoices */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
            <p className="font-bold text-slate-900">Invoices</p>
            <button className="text-xs font-semibold text-blue-600 hover:text-blue-700">View all →</button>
          </div>
          <div className="divide-y divide-slate-50">
            {INVOICES.map(inv => (
              <div key={inv.id} className="px-5 py-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                    <Icons.financials size={15} className="text-slate-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-mono text-xs text-slate-400">{inv.id}</p>
                      <span className={`badge text-[10px] ${inv.status === 'PAID'
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                        {inv.status}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-800 text-sm leading-none">{inv.guest}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{inv.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-extrabold text-slate-900">SAR {inv.total.toLocaleString()}</p>
                  <p className="text-xs text-slate-400">incl. VAT {inv.vat.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expenses */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
            <p className="font-bold text-slate-900">Expenses</p>
            <p className="text-sm font-extrabold text-red-500">−SAR {totalExpenses.toLocaleString()}</p>
          </div>
          <div className="divide-y divide-slate-50">
            {EXPENSES.map(exp => (
              <div key={exp.id} className="px-5 py-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                    <Icons.building size={14} className="text-slate-400" />
                  </div>
                  <div>
                    <div className="mb-0.5">
                      <span className={`badge text-[10px] ${CAT_COLOR[exp.category] ?? 'bg-slate-100 text-slate-500'}`}>
                        {exp.category}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-800 text-sm leading-none">{exp.desc}</p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">{exp.property} · {exp.date}</p>
                  </div>
                </div>
                <p className="font-extrabold text-red-500">−SAR {exp.amount.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Invoices Issued',  value: INVOICES.length,                    sub: `${INVOICES.filter(i => i.status === 'PAID').length} paid`, icon: <Icons.bookings size={16} />, accent: '#3B82F6' },
          { label: 'Total Invoiced',   value: `SAR ${INVOICES.reduce((s,i) => s+i.total,0).toLocaleString()}`, sub: 'incl. VAT', icon: <Icons.financials size={16} />, accent: '#10B981' },
          { label: 'Total Expenses',   value: `SAR ${totalExpenses.toLocaleString()}`, sub: `${EXPENSES.length} items`, icon: <Icons.trendDown size={16} />, accent: '#EF4444' },
          { label: 'VAT Collected',    value: `SAR ${INVOICES.reduce((s,i) => s+i.vat,0).toLocaleString()}`,  sub: '15% rate', icon: <Icons.analytics size={16} />, accent: '#F59E0B' },
        ].map(s => (
          <div key={s.label} className="card p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: s.accent + '15', color: s.accent }}>
                {s.icon}
              </div>
            </div>
            <p className="text-xl font-extrabold text-slate-900 tracking-tight">{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
