'use client';

import { useRef, useState } from 'react';
import { Icons } from '@/lib/icons';
import { OWNER } from '@/lib/mock-data';
import { useLang } from '@/lib/language-context';

const PAYOUT = { gross: 284750, commissions: 24813, platformFee: 25994, expenses: 2190, net: 231753 };

const INVOICES = [
  { id: 'INV-2026-087', booking: 'BK-1091', guest: 'Mohammed Al-Otaibi', amount: 5248,  vat: 787,  total: 6035,  status: 'ISSUED', date: '2026-02-22' },
  { id: 'INV-2026-086', booking: 'BK-1090', guest: 'Sarah Thompson',     amount: 8750,  vat: 1312, total: 10062, status: 'PAID',   date: '2026-02-20' },
  { id: 'INV-2026-085', booking: 'BK-1089', guest: 'Khalid Al-Dosari',   amount: 3600,  vat: 540,  total: 4140,  status: 'PAID',   date: '2026-02-18' },
  { id: 'INV-2026-084', booking: 'BK-1088', guest: 'Emma Wilson',        amount: 4200,  vat: 630,  total: 4830,  status: 'PAID',   date: '2026-02-16' },
];

type Expense = {
  id: string; property: string; category: string;
  desc: string; amount: number; date: string;
};

const INITIAL_EXPENSES: Expense[] = [
  { id: 'EXP-041', property: 'Riyadh Luxury Apartment', category: 'Maintenance', desc: 'AC unit servicing',          amount: 850, date: '2026-02-18' },
  { id: 'EXP-040', property: 'Jeddah Corniche Villa',   category: 'Cleaning',    desc: 'Deep cleaning service',      amount: 600, date: '2026-02-15' },
  { id: 'EXP-039', property: 'Diriyah Heritage Chalet', category: 'Utilities',   desc: 'Electricity bill',           amount: 420, date: '2026-02-10' },
  { id: 'EXP-038', property: 'AlUla Desert Studio',     category: 'Supplies',    desc: 'Linen & toiletries restock', amount: 320, date: '2026-02-08' },
];

const PROPERTIES = [
  'Riyadh Luxury Apartment', 'Jeddah Corniche Villa',
  'Diriyah Heritage Chalet', 'AlUla Desert Studio',
];

const CAT_COLOR: Record<string, string> = {
  Maintenance: 'bg-blue-50 text-blue-700 border border-blue-100',
  Cleaning:    'bg-emerald-50 text-emerald-700 border border-emerald-100',
  Utilities:   'bg-amber-50 text-amber-700 border border-amber-100',
  Supplies:    'bg-purple-50 text-purple-700 border border-purple-100',
  Staff:       'bg-pink-50 text-pink-700 border border-pink-100',
  Other:       'bg-slate-100 text-slate-600 border border-slate-200',
};

const INITIAL_FORM = {
  category: 'Maintenance', desc: '', amount: '',
  date: '2026-02-23', property: PROPERTIES[0],
};

export default function FinancialsPage() {
  const { t } = useLang();
  const fileRef = useRef<HTMLInputElement>(null);

  const [expenses, setExpenses]         = useState<Expense[]>(INITIAL_EXPENSES);
  const [modalOpen, setModalOpen]       = useState(false);
  const [saving,    setSaving]          = useState(false);
  const [saved,     setSaved]           = useState(false);
  const [form,      setForm]            = useState(INITIAL_FORM);
  const [receipt,   setReceipt]         = useState<{ name: string; preview: string | null } | null>(null);

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const netPct = ((PAYOUT.net / PAYOUT.gross) * 100).toFixed(1);

  const categories = [
    { key: 'Maintenance', label: t.financials.expCat_maintenance },
    { key: 'Utilities',   label: t.financials.expCat_utilities   },
    { key: 'Staff',       label: t.financials.expCat_staff       },
    { key: 'Cleaning',    label: t.financials.expCat_cleaning    },
    { key: 'Supplies',    label: t.financials.expCat_supplies    },
    { key: 'Other',       label: t.financials.expCat_other       },
  ];

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    if (isImage) {
      const reader = new FileReader();
      reader.onload = e => setReceipt({ name: file.name, preview: e.target?.result as string });
      reader.readAsDataURL(file);
    } else {
      setReceipt({ name: file.name, preview: null });
    }
  };

  const openModal = () => {
    setForm(INITIAL_FORM);
    setReceipt(null);
    setSaved(false);
    setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setSaving(false); setSaved(false); };

  const saveExpense = async () => {
    if (!form.desc || !form.amount) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 1400));
    const newExp: Expense = {
      id:       `EXP-${String(Math.floor(Math.random() * 900) + 100)}`,
      property: form.property,
      category: form.category,
      desc:     form.desc,
      amount:   parseFloat(form.amount),
      date:     form.date,
    };
    setExpenses(prev => [newExp, ...prev]);
    setSaving(false);
    setSaved(true);
    setTimeout(closeModal, 2000);
  };

  const breakdowns = [
    { label: t.financials.grossRev,    value: PAYOUT.gross,       sign: '+', color: 'text-white'   },
    { label: t.financials.commissions, value: PAYOUT.commissions, sign: '−', color: 'text-red-300' },
    { label: t.financials.platformFee, value: PAYOUT.platformFee, sign: '−', color: 'text-red-300' },
    { label: t.financials.expenses,    value: PAYOUT.expenses,    sign: '−', color: 'text-red-300' },
  ];

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{t.financials.title}</h1>
          <p className="text-sm text-slate-400 mt-1">{t.financials.subtitle}</p>
        </div>
        <button onClick={openModal} className="btn-primary">
          <Icons.plus size={15} /> {t.financials.addExpense}
        </button>
      </div>

      {/* Payout Hero Card */}
      <div className="rounded-2xl p-7 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%)' }}>
        <div className="absolute -top-10 -end-10 w-40 h-40 rounded-full opacity-10"
          style={{ background: 'radial-gradient(#60A5FA, transparent)' }} />
        <div className="absolute -bottom-12 -start-8 w-48 h-48 rounded-full opacity-10"
          style={{ background: 'radial-gradient(#818CF8, transparent)' }} />

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-slate-400 text-sm font-semibold">{t.financials.payoutTitle}</p>
              <p className="text-4xl font-extrabold mt-2 tracking-tight" style={{ direction: 'ltr' }}>
                SAR {PAYOUT.net.toLocaleString()}
              </p>
              <p className="text-slate-400 text-sm mt-1">
                {t.financials.netTo} {OWNER.fullName} · {netPct}% {t.financials.ofGross}
              </p>
            </div>
            <span className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 text-xs px-3 py-1.5 rounded-full font-bold border border-emerald-500/30">
              <Icons.check size={12} /> {t.financials.pending}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {breakdowns.map(b => (
              <div key={b.label} className="bg-white/8 rounded-xl p-4 backdrop-blur-sm border border-white/10">
                <p className="text-slate-400 text-xs font-medium leading-none">{b.label}</p>
                <p className={`font-extrabold text-lg mt-2 leading-none ${b.color}`} style={{ direction: 'ltr' }}>
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
            <p className="font-bold text-slate-900">{t.financials.invoices}</p>
            <button className="text-xs font-semibold text-blue-600 hover:text-blue-700">{t.financials.viewAll}</button>
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
                      <p className="font-mono text-xs text-slate-400" style={{ direction: 'ltr', unicodeBidi: 'embed' }}>{inv.id}</p>
                      <span className={`badge text-[10px] ${inv.status === 'PAID'
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                        {t.status[inv.status as keyof typeof t.status] ?? inv.status}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-800 text-sm leading-none">{inv.guest}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{inv.date}</p>
                  </div>
                </div>
                <div className="text-end">
                  <p className="font-extrabold text-slate-900" style={{ direction: 'ltr' }}>SAR {inv.total.toLocaleString()}</p>
                  <p className="text-xs text-slate-400">{t.financials.inclVAT} {inv.vat.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expenses */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
            <p className="font-bold text-slate-900">{t.financials.expenses}</p>
            <p className="text-sm font-extrabold text-red-500" style={{ direction: 'ltr' }}>−SAR {totalExpenses.toLocaleString()}</p>
          </div>
          <div className="divide-y divide-slate-50">
            {expenses.map(exp => (
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
                <p className="font-extrabold text-red-500" style={{ direction: 'ltr' }}>−SAR {exp.amount.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: t.financials.issued,   value: INVOICES.length,                                                  sub: `${INVOICES.filter(i => i.status === 'PAID').length} ${t.financials.paid}`, icon: <Icons.bookings size={16} />,   accent: '#3B82F6' },
          { label: t.financials.invoiced, value: `SAR ${INVOICES.reduce((s,i) => s+i.total,0).toLocaleString()}`, sub: t.financials.inclVAT,                                                       icon: <Icons.financials size={16} />, accent: '#10B981' },
          { label: t.financials.expenses, value: `SAR ${totalExpenses.toLocaleString()}`,                         sub: `${expenses.length} ${t.common.filter}`,                                    icon: <Icons.trendDown size={16} />,  accent: '#EF4444' },
          { label: t.financials.vatColl,  value: `SAR ${INVOICES.reduce((s,i) => s+i.vat,0).toLocaleString()}`,  sub: t.financials.vatRate,                                                       icon: <Icons.analytics size={16} />,  accent: '#F59E0B' },
        ].map(s => (
          <div key={s.label} className="card p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: s.accent + '15', color: s.accent }}>
                {s.icon}
              </div>
            </div>
            <p className="text-xl font-extrabold text-slate-900 tracking-tight" style={{ direction: 'ltr' }}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Add Expense Modal ───────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <p className="font-extrabold text-slate-900">{t.financials.expenseModal}</p>
              <button onClick={closeModal}
                className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
                <Icons.x size={14} />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 pb-6 pt-4 space-y-4 max-h-[80vh] overflow-y-auto">

              {saved ? (
                <div className="flex flex-col items-center gap-3 py-6">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Icons.check size={28} className="text-emerald-600" />
                  </div>
                  <p className="font-bold text-emerald-700 text-center">{t.financials.expSaved}</p>
                </div>
              ) : (
                <>
                  {/* Category */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      {t.financials.expCategory}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {categories.map(cat => (
                        <button key={cat.key} type="button"
                          onClick={() => setForm(p => ({ ...p, category: cat.key }))}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${
                            form.category === cat.key
                              ? (CAT_COLOR[cat.key] ?? 'bg-slate-100 text-slate-600 border-slate-300')
                              : 'bg-slate-50 text-slate-500 border-transparent hover:border-slate-200'
                          }`}>
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      {t.financials.expDescription}
                    </label>
                    <input className="input" value={form.desc}
                      onChange={e => setForm(p => ({ ...p, desc: e.target.value }))}
                      placeholder={t.financials.expDescription} />
                  </div>

                  {/* Amount + Date */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        {t.financials.expAmount}
                      </label>
                      <input className="input" type="number" min="0" value={form.amount}
                        onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                        style={{ direction: 'ltr' }} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        {t.financials.expDate}
                      </label>
                      <input className="input" type="date" value={form.date}
                        onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                        style={{ direction: 'ltr' }} />
                    </div>
                  </div>

                  {/* Property */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      {t.financials.expProperty}
                    </label>
                    <select className="input" value={form.property}
                      onChange={e => setForm(p => ({ ...p, property: e.target.value }))}>
                      {PROPERTIES.map(pr => <option key={pr}>{pr}</option>)}
                    </select>
                  </div>

                  {/* Receipt upload */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      {t.financials.expReceipt}
                    </label>
                    <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden"
                      onChange={e => handleFile(e.target.files?.[0])} />
                    {receipt ? (
                      <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-200">
                        {receipt.preview ? (
                          <img src={receipt.preview} alt="receipt"
                            className="w-12 h-12 object-cover rounded-lg border border-slate-200 flex-shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
                            <Icons.financials size={18} className="text-slate-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-700 truncate">{receipt.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{t.financials.expReceiptHint}</p>
                        </div>
                        <button onClick={() => setReceipt(null)}
                          className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center text-slate-500 hover:bg-red-100 hover:text-red-500 transition-colors flex-shrink-0">
                          <Icons.x size={12} />
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => fileRef.current?.click()}
                        className="w-full border-2 border-dashed border-slate-200 rounded-xl py-4 flex flex-col items-center gap-1.5 text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-colors">
                        <Icons.plus size={20} />
                        <span className="text-xs font-semibold">{t.financials.expReceiptHint}</span>
                      </button>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <button onClick={closeModal}
                      className="flex-1 btn-ghost justify-center py-2.5">{t.common.cancel}</button>
                    <button onClick={saveExpense}
                      disabled={saving || !form.desc || !form.amount}
                      className="flex-1 btn-primary justify-center py-2.5 disabled:opacity-50">
                      {saving
                        ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
                        : <><Icons.check size={15} /> {t.financials.expSave}</>
                      }
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
