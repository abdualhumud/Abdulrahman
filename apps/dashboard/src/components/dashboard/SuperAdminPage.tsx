'use client';

/**
 * SuperAdminPage — Owner control panel (enhanced)
 *
 * Tabs:
 *  1. Promo Codes       — create / edit / delete / monitor
 *  2. Business Intelligence — accounts, units, plan distribution + User Management
 *  3. Revenue Analytics — MRR chart, promo usage, plan breakdown
 *  4. System Health     — channel API uptime, latency, last sync
 *  5. Activity Logs     — detailed audit trail with category filters
 *  6. Global Settings   — PIN + maintenance mode
 */

import { useState, useEffect, useCallback } from 'react';
import { useLang } from '@/lib/language-context';
import {
  getPromoCodes, createPromoCode, updatePromoCode, deletePromoCode,
  type PromoCode,
} from '@/lib/promo-service';
import { getStagingAccountSummaries } from '@/lib/staging-auth';
import { MONTHLY_REVENUE } from '@/lib/mock-data';

/* ── Storage keys ── */
const PIN_KEY     = 'rems-superadmin-pin';
const MAINT_KEY   = 'rems-superadmin-maint';
const LOGS_KEY    = 'rems-superadmin-logs';
const SUSPEND_KEY = 'rems-superadmin-suspended';
const DEFAULT_PIN = '1234';

/* ── Helpers ── */
function getPin(): string {
  try { return localStorage.getItem(PIN_KEY) ?? DEFAULT_PIN; } catch { return DEFAULT_PIN; }
}
function savePin(pin: string) {
  try { localStorage.setItem(PIN_KEY, pin); } catch { /* ignore */ }
}
function getMaint(): boolean {
  try { return localStorage.getItem(MAINT_KEY) === '1'; } catch { return false; }
}
function saveMaint(v: boolean) {
  try { localStorage.setItem(MAINT_KEY, v ? '1' : '0'); } catch { /* ignore */ }
}
function getSuspended(): string[] {
  try { return JSON.parse(localStorage.getItem(SUSPEND_KEY) ?? '[]'); } catch { return []; }
}
function setSuspended(ids: string[]) {
  try { localStorage.setItem(SUSPEND_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
}

type LogCategory = 'auth' | 'promo' | 'user' | 'system' | 'settings';
interface LogEntry { time: string; event: string; user: string; category: LogCategory; }

function getLogs(): LogEntry[] {
  try {
    const raw = typeof window !== 'undefined' ? sessionStorage.getItem(LOGS_KEY) : null;
    return raw ? (JSON.parse(raw) as LogEntry[]) : [];
  } catch { return []; }
}
function appendLog(event: string, category: LogCategory = 'system', user = 'Super-Admin') {
  try {
    const logs = getLogs();
    logs.unshift({ time: new Date().toLocaleTimeString(), event, user, category });
    sessionStorage.setItem(LOGS_KEY, JSON.stringify(logs.slice(0, 200)));
  } catch { /* ignore */ }
}

const INPUT =
  'w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all';

/* ─────────────────────────────────────────────────────────────
   PIN GATE
───────────────────────────────────────────────────────────── */
function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const { t, lang, toggle } = useLang();
  const sa = t.superAdmin;
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');

  const unlock = () => {
    if (pin === getPin()) onUnlock();
    else { setErr(sa.pinError); setPin(''); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-6"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="absolute top-0 start-0 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 end-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative w-full max-w-xs">
        <div className="flex justify-end mb-4">
          <button onClick={toggle} className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20">
            {lang === 'ar' ? 'English' : 'عربي'}
          </button>
        </div>
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#4F46E5)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-white">{sa.pinTitle}</h1>
          <p className="text-slate-400 text-sm mt-1">{sa.pinDesc}</p>
        </div>
        <div className="bg-white rounded-3xl p-8 shadow-2xl space-y-4">
          <input type="password" value={pin}
            onChange={e => { setPin(e.target.value); setErr(''); }}
            onKeyDown={e => e.key === 'Enter' && unlock()}
            placeholder={sa.pinPlaceholder}
            className={INPUT + ' text-center text-2xl tracking-widest font-mono'}
            style={{ direction: 'ltr' }} autoFocus />
          {err && <p className="text-xs text-red-500 font-semibold text-center">{err}</p>}
          <button onClick={unlock}
            className="w-full py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 shadow-lg"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#4F46E5)' }}>
            {sa.pinBtn}
          </button>
          <p className="text-[11px] text-slate-400 text-center">{sa.pinDefault}</p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PROMO CODE MANAGER
───────────────────────────────────────────────────────────── */
function PromoManager() {
  const { t, lang } = useLang();
  const sa = t.superAdmin;
  const [codes, setCodes]       = useState<PromoCode[]>([]);
  const [editing, setEditing]   = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm]         = useState({ code: '', discount: 20, maxUses: 0, expiresAt: '', description: '', active: true });

  const reload = useCallback(() => setCodes(getPromoCodes()), []);
  useEffect(() => { reload(); }, [reload]);

  const resetForm = () => setForm({ code: '', discount: 20, maxUses: 0, expiresAt: '', description: '', active: true });

  const handleCreate = () => {
    try {
      createPromoCode({ code: form.code, discount: form.discount, maxUses: form.maxUses,
        expiresAt: form.expiresAt || null, description: form.description, active: form.active });
      appendLog(`Created promo: ${form.code.toUpperCase()}`, 'promo');
      reload(); setCreating(false); resetForm();
    } catch (e) { alert((e as Error).message); }
  };

  const handleSaveEdit = () => {
    if (!editing) return;
    updatePromoCode(editing, { discount: form.discount, maxUses: form.maxUses,
      expiresAt: form.expiresAt || null, description: form.description, active: form.active });
    appendLog(`Updated promo: ${editing}`, 'promo');
    reload(); setEditing(null); resetForm();
  };

  const handleDelete = (code: string) => {
    if (!confirm(sa.promoConfirmDel)) return;
    deletePromoCode(code);
    appendLog(`Deleted promo: ${code}`, 'promo');
    reload();
  };

  const FormFields = () => (
    <div className="grid grid-cols-2 gap-3 mt-3">
      {editing === null && (
        <div className="col-span-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">{sa.promoCodeLabel}</label>
          <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
            placeholder="MYCODE2026" className={INPUT} style={{ fontFamily: 'monospace', direction: 'ltr' }} />
        </div>
      )}
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">{sa.promoDiscLabel}</label>
        <input type="number" min="1" max="100" value={form.discount}
          onChange={e => setForm(f => ({ ...f, discount: +e.target.value }))} className={INPUT} style={{ direction: 'ltr' }} />
      </div>
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">{sa.promoMaxLabel}</label>
        <input type="number" min="0" value={form.maxUses}
          onChange={e => setForm(f => ({ ...f, maxUses: +e.target.value }))} className={INPUT} style={{ direction: 'ltr' }} />
      </div>
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">{sa.promoExpLabel}</label>
        <input type="date" value={form.expiresAt}
          onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} className={INPUT} style={{ direction: 'ltr' }} />
      </div>
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">{sa.promoDescLabel}</label>
        <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={INPUT} />
      </div>
      <div className="col-span-2 flex items-center gap-2">
        <input type="checkbox" id="active-cb" checked={form.active}
          onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4 accent-violet-600" />
        <label htmlFor="active-cb" className="text-sm font-semibold text-slate-700">{sa.promoActiveLabel}</label>
      </div>
      <div className="col-span-2 flex gap-2 pt-1">
        <button onClick={editing ? handleSaveEdit : handleCreate}
          className="px-4 py-2 rounded-xl text-sm font-bold text-white hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#7C3AED,#4F46E5)' }}>
          {sa.promoSave}
        </button>
        <button onClick={() => { setCreating(false); setEditing(null); resetForm(); }}
          className="px-4 py-2 rounded-xl text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200">
          {sa.promoCancel}
        </button>
      </div>
    </div>
  );

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-extrabold text-slate-900">{sa.promoTitle}</h2>
        <button onClick={() => { setCreating(true); setEditing(null); resetForm(); }}
          className="px-4 py-2 rounded-xl text-sm font-bold text-white hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#7C3AED,#4F46E5)' }}>
          {sa.promoNew}
        </button>
      </div>
      {creating && (
        <div className="card p-5 mb-4 border-2 border-violet-200 bg-violet-50/50">
          <FormFields />
        </div>
      )}
      <div className="overflow-x-auto rounded-2xl border border-slate-100">
        <table className="w-full text-sm" style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
          <thead>
            <tr className="bg-slate-50">
              {[sa.promoCode, sa.promoDiscount, sa.promoMaxUses, sa.promoUsed, sa.promoExpires, sa.promoDescLabel, sa.promoStatus, sa.promoActions].map(h => (
                <th key={h} className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-start whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {codes.map(c => (
              <tr key={c.code}>
                {editing === c.code ? (
                  <td colSpan={8} className="px-4 py-3"><FormFields /></td>
                ) : (
                  <>
                    <td className="px-4 py-3 font-mono font-bold text-violet-700">{c.code}</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">{c.discount}%</td>
                    <td className="px-4 py-3 text-slate-600">{c.maxUses === 0 ? <span className="italic text-slate-400">{sa.promoUnlimited}</span> : c.maxUses}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-800">{c.usedCount}</span>
                      {c.maxUses > 0 && (
                        <span className="text-slate-400 text-xs ms-1">/ {c.maxUses}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600" style={{ direction: 'ltr' }}>{c.expiresAt ?? <span className="italic text-slate-400">{sa.promoNever}</span>}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-[120px] truncate">{c.description}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${c.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {c.active ? sa.promoActive : sa.promoInactive}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setEditing(c.code); setForm({ code: c.code, discount: c.discount, maxUses: c.maxUses, expiresAt: c.expiresAt ?? '', description: c.description, active: c.active }); }}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800">{sa.promoEdit}</button>
                        <button onClick={() => handleDelete(c.code)}
                          className="text-xs font-bold text-red-500 hover:text-red-700">{sa.promoDelete}</button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   BUSINESS INTELLIGENCE + USER MANAGEMENT
───────────────────────────────────────────────────────────── */
function BIPanel() {
  const { t, lang } = useLang();
  const sa = t.superAdmin;

  const [accounts, setAccounts] = useState(() => getStagingAccountSummaries());
  const [suspended, setSuspendedState] = useState<string[]>(() => getSuspended());
  const [actionMsg, setActionMsg] = useState('');

  const totalUnits = accounts.reduce((s, a) => s + a.unitCount, 0);
  const planColors: Record<string, string> = {
    Basic: '#64748B', Pro: '#3B82F6', Enterprise: '#8B5CF6', '': '#94A3B8',
  };

  const toggleSuspend = (id: string, name: string) => {
    const next = suspended.includes(id)
      ? suspended.filter(x => x !== id)
      : [...suspended, id];
    setSuspendedState(next);
    setSuspended(next);
    const action = suspended.includes(id) ? 'Unsuspended' : 'Suspended';
    appendLog(`${action} account: ${name}`, 'user');
    setActionMsg(`${action}: ${name}`);
    setTimeout(() => setActionMsg(''), 3000);
  };

  const handleVerify = (name: string) => {
    appendLog(`Verified account: ${name}`, 'user');
    setActionMsg(`Verified: ${name}`);
    setTimeout(() => setActionMsg(''), 3000);
  };

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <h2 className="text-lg font-extrabold text-slate-900 mb-4">{sa.biTitle}</h2>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: sa.biTotal,   value: accounts.length, color: '#7C3AED' },
          { label: sa.biUnits,   value: totalUnits,       color: '#3B82F6' },
          { label: sa.biStaging, value: accounts.length,  color: '#6366F1' },
          { label: sa.biProd,    value: 0,                color: '#10B981' },
        ].map(k => (
          <div key={k.label} className="card p-4">
            <p className="text-2xl font-extrabold" style={{ color: k.color }}>{k.value}</p>
            <p className="text-xs text-slate-500 font-semibold mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {actionMsg && (
        <div className="mb-4 px-4 py-2 bg-violet-50 border border-violet-200 rounded-xl text-sm text-violet-700 font-semibold">
          {actionMsg}
        </div>
      )}

      {/* Accounts table with User Management */}
      {accounts.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-slate-400 font-semibold">{sa.biNoAccounts}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-sm" style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
            <thead>
              <tr className="bg-slate-50">
                {[sa.biCompany, sa.biEmail, sa.biPlan, sa.biUnitsCol, sa.biPromo, sa.biJoined, sa.userStatus, sa.promoActions].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-start whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {accounts.map(a => {
                const isSuspended = suspended.includes(a.id);
                return (
                  <tr key={a.id} className={`hover:bg-slate-50/50 ${isSuspended ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3 font-semibold text-slate-800">{a.companyName}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs" style={{ direction: 'ltr' }}>{a.email}</td>
                    <td className="px-4 py-3">
                      <span className="badge text-white text-[11px]" style={{ background: planColors[a.plan] ?? '#94A3B8' }}>
                        {a.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-center" style={{ color: '#3B82F6' }}>{a.unitCount}</td>
                    <td className="px-4 py-3 font-mono text-xs text-violet-700">{a.promoCode || '—'}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs" style={{ direction: 'ltr' }}>{a.createdAt.slice(0, 10)}</td>
                    <td className="px-4 py-3">
                      <span className={`badge text-[11px] ${isSuspended ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {isSuspended ? sa.userSuspended : sa.userActive}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleSuspend(a.id, a.companyName)}
                          className={`text-xs font-bold transition-colors ${isSuspended ? 'text-emerald-600 hover:text-emerald-800' : 'text-red-500 hover:text-red-700'}`}>
                          {isSuspended ? '↑ Restore' : sa.userSuspend}
                        </button>
                        <button
                          onClick={() => handleVerify(a.companyName)}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800">
                          {sa.userVerify}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   REVENUE ANALYTICS
───────────────────────────────────────────────────────────── */
function RevenuePanel() {
  const { t, lang } = useLang();
  const sa = t.superAdmin;

  const codes = getPromoCodes();
  const accounts = getStagingAccountSummaries();

  // Plan-level revenue simulation: count accounts per plan × plan price
  const PLAN_PRICES: Record<string, number> = { Basic: 149, Pro: 349, Enterprise: 799 };
  const planBreakdown = ['Basic', 'Pro', 'Enterprise'].map(plan => {
    const count = accounts.filter(a => a.plan === plan).length;
    return { plan, count, revenue: count * (PLAN_PRICES[plan] ?? 0) };
  });
  const totalMRR = planBreakdown.reduce((s, p) => s + p.revenue, 0);
  const totalPromoUses = codes.reduce((s, c) => s + c.usedCount, 0);
  const avgDiscount = codes.length > 0
    ? Math.round(codes.reduce((s, c) => s + c.discount, 0) / codes.length)
    : 0;

  // Bar chart max value
  const maxRevenue = Math.max(...MONTHLY_REVENUE.map(m => m.revenue), 1);
  const PLAN_COLORS: Record<string, string> = { Basic: '#64748B', Pro: '#3B82F6', Enterprise: '#8B5CF6' };
  const maxPlan = Math.max(...planBreakdown.map(p => p.revenue), 1);

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <h2 className="text-lg font-extrabold text-slate-900 mb-4">{sa.revTitle}</h2>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{sa.revMRR}</p>
          <p className="text-2xl font-extrabold text-violet-700 mt-1" style={{ direction: 'ltr' }}>
            SAR {totalMRR.toLocaleString()}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{sa.revTotal}</p>
          <p className="text-2xl font-extrabold text-blue-700 mt-1" style={{ direction: 'ltr' }}>
            SAR {(totalMRR * 3).toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">3-month estimate</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{sa.revAvgDiscount}</p>
          <p className="text-2xl font-extrabold text-emerald-700 mt-1">{avgDiscount}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Monthly revenue bar chart (portfolio data) */}
        <div className="card p-5">
          <p className="text-sm font-extrabold text-slate-700 mb-4">
            {lang === 'ar' ? 'الإيرادات الشهرية للمحفظة' : 'Portfolio Monthly Revenue'}
          </p>
          <div className="space-y-2" style={{ direction: 'ltr' }}>
            {MONTHLY_REVENUE.map(m => (
              <div key={m.month} className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-500 w-8 flex-shrink-0">{m.month}</span>
                <div className="flex-1 h-5 bg-slate-100 rounded-lg overflow-hidden">
                  <div
                    className="h-full rounded-lg transition-all duration-500"
                    style={{
                      width: `${Math.round((m.revenue / maxRevenue) * 100)}%`,
                      background: 'linear-gradient(90deg,#7C3AED,#4F46E5)',
                    }}
                  />
                </div>
                <span className="text-xs font-bold text-slate-700 w-20 text-end">
                  SAR {(m.revenue / 1000).toFixed(0)}k
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue by plan */}
        <div className="card p-5">
          <p className="text-sm font-extrabold text-slate-700 mb-4">{sa.revByPlan}</p>
          {accounts.length === 0 ? (
            <div className="flex items-center justify-center h-36">
              <p className="text-slate-400 text-sm">{sa.revNoData}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {planBreakdown.map(p => (
                <div key={p.plan}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-slate-600">{p.plan}</span>
                    <div className="text-end">
                      <span className="text-xs font-bold text-slate-800" style={{ direction: 'ltr' }}>
                        SAR {p.revenue.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400 ms-1">({p.count} acct)</span>
                    </div>
                  </div>
                  <div className="h-4 bg-slate-100 rounded-lg overflow-hidden" style={{ direction: 'ltr' }}>
                    <div
                      className="h-full rounded-lg transition-all duration-500"
                      style={{
                        width: `${maxPlan > 0 ? Math.round((p.revenue / maxPlan) * 100) : 0}%`,
                        background: PLAN_COLORS[p.plan] ?? '#94A3B8',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Promo usage strip */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <p className="text-sm font-extrabold text-slate-700 mb-3">{sa.revPromoUsage}</p>
            <div className="space-y-2">
              {codes.slice(0, 5).map(c => (
                <div key={c.code} className="flex items-center gap-3" style={{ direction: 'ltr' }}>
                  <span className="text-xs font-mono font-bold text-violet-700 w-24 truncate">{c.code}</span>
                  <div className="flex-1 h-4 bg-slate-100 rounded-lg overflow-hidden">
                    <div
                      className="h-full rounded-lg bg-violet-500 transition-all duration-500"
                      style={{
                        width: c.maxUses > 0
                          ? `${Math.round((c.usedCount / c.maxUses) * 100)}%`
                          : c.usedCount > 0 ? '40%' : '0%',
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-600 w-10 text-end">
                    {c.usedCount}
                    {c.maxUses > 0 ? `/${c.maxUses}` : ''}
                  </span>
                </div>
              ))}
              {codes.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-2">{sa.revNoData}</p>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-3">
              {lang === 'ar' ? `إجمالي الاستخدامات: ${totalPromoUses}` : `Total redemptions: ${totalPromoUses}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SYSTEM HEALTH MONITOR
───────────────────────────────────────────────────────────── */
const CHANNELS_HEALTH = [
  {
    name: 'Booking.com',
    color: '#003580',
    bg: '#EEF2FF',
    uptime: 99.8,
    lastSync: '2 min ago',
    latency: 148,
    status: 'online' as const,
    endpoint: 'connectivity-authentication.booking.com',
    method: 'Token-based auth (OAuth)',
    dailyRequests: 1240,
  },
  {
    name: 'Airbnb',
    color: '#FF385C',
    bg: '#FFF1F2',
    uptime: 99.5,
    lastSync: '5 min ago',
    latency: 212,
    status: 'online' as const,
    endpoint: 'api.airbnb.com/v2',
    method: 'OAuth 2.0 + Webhooks',
    dailyRequests: 870,
  },
  {
    name: 'Gathern',
    color: '#00A651',
    bg: '#F0FDF4',
    uptime: 98.2,
    lastSync: '47 sec ago',
    latency: 334,
    status: 'online' as const,
    endpoint: 'api.gathern.co/v1',
    method: 'REST/JSON polling (120s)',
    dailyRequests: 620,
  },
  {
    name: 'SPL National Address',
    color: '#F59E0B',
    bg: '#FFFBEB',
    uptime: 97.1,
    lastSync: '18 min ago',
    latency: 480,
    status: 'degraded' as const,
    endpoint: 'apina.address.gov.sa',
    method: 'REST + API Key',
    dailyRequests: 44,
  },
];

function HealthPanel() {
  const { t, lang } = useLang();
  const sa = t.superAdmin;

  const [ping, setPing] = useState<Record<string, number>>({});
  const [simulating, setSimulating] = useState(false);

  const runPingTest = async () => {
    setSimulating(true);
    await new Promise(r => setTimeout(r, 1200));
    const results: Record<string, number> = {};
    CHANNELS_HEALTH.forEach(ch => {
      results[ch.name] = ch.latency + Math.round((Math.random() - 0.5) * 60);
    });
    setPing(results);
    appendLog('System health ping test completed', 'system');
    setSimulating(false);
  };

  const STATUS_COLOR: Record<string, string> = {
    online:   'bg-emerald-100 text-emerald-700',
    degraded: 'bg-amber-100 text-amber-700',
    offline:  'bg-red-100 text-red-700',
  };
  const STATUS_DOT: Record<string, string> = {
    online:   'bg-emerald-500',
    degraded: 'bg-amber-500',
    offline:  'bg-red-500',
  };
  const STATUS_LABEL: Record<string, string> = {
    online:   sa.healthOnline,
    degraded: sa.healthDegraded,
    offline:  sa.healthOffline,
  };

  const avgUptime = Math.round(CHANNELS_HEALTH.reduce((s, c) => s + c.uptime, 0) / CHANNELS_HEALTH.length * 10) / 10;
  const avgLatency = Math.round(CHANNELS_HEALTH.reduce((s, c) => s + c.latency, 0) / CHANNELS_HEALTH.length);

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-extrabold text-slate-900">{sa.healthTitle}</h2>
        <button
          onClick={runPingTest}
          disabled={simulating}
          className="px-4 py-2 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2"
          style={{ background: 'linear-gradient(135deg,#7C3AED,#4F46E5)' }}
        >
          {simulating ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {lang === 'ar' ? 'جارٍ الاختبار…' : 'Testing…'}
            </>
          ) : (
            <>
              <span>⚡</span>
              {lang === 'ar' ? 'اختبار فوري' : 'Run Ping Test'}
            </>
          )}
        </button>
      </div>

      {/* Overall health KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4 text-center">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center mx-auto mb-2">
            <span className="text-lg">✓</span>
          </div>
          <p className="text-xl font-extrabold text-emerald-700">{avgUptime}%</p>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">{lang === 'ar' ? 'وسط وقت التشغيل' : 'Avg Uptime'}</p>
        </div>
        <div className="card p-4 text-center">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-2">
            <span className="text-lg">⚡</span>
          </div>
          <p className="text-xl font-extrabold text-blue-700" style={{ direction: 'ltr' }}>{avgLatency} ms</p>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">{lang === 'ar' ? 'وسط زمن الاستجابة' : 'Avg Latency'}</p>
        </div>
        <div className="card p-4 text-center">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center mx-auto mb-2">
            <span className="text-lg">🔗</span>
          </div>
          <p className="text-xl font-extrabold text-violet-700">{CHANNELS_HEALTH.filter(c => c.status === 'online').length}/{CHANNELS_HEALTH.length}</p>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">{lang === 'ar' ? 'القنوات المتصلة' : 'Channels Online'}</p>
        </div>
      </div>

      {/* Per-channel health cards */}
      <div className="space-y-3">
        {CHANNELS_HEALTH.map(ch => {
          const liveLatency = ping[ch.name] ?? ch.latency;
          return (
            <div key={ch.name} className="card p-5">
              <div className="flex items-start gap-4">
                {/* Logo dot */}
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: ch.bg }}>
                  <div className="w-6 h-6 rounded-full" style={{ background: ch.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-extrabold text-slate-900">{ch.name}</span>
                    <span className={`badge text-[11px] flex items-center gap-1.5 ${STATUS_COLOR[ch.status]}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[ch.status]}`} />
                      {STATUS_LABEL[ch.status]}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono mb-3" style={{ direction: 'ltr' }}>{ch.endpoint}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{sa.healthUptime}</p>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">{ch.uptime}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{sa.healthLatency}</p>
                      <p className="text-sm font-bold mt-0.5" style={{ color: liveLatency < 200 ? '#10B981' : liveLatency < 400 ? '#F59E0B' : '#EF4444', direction: 'ltr' }}>
                        {liveLatency} ms
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{sa.healthLastSync}</p>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">{ch.lastSync}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{lang === 'ar' ? 'طلبات اليوم' : 'Daily Requests'}</p>
                      <p className="text-sm font-bold text-slate-800 mt-0.5" style={{ direction: 'ltr' }}>{ch.dailyRequests.toLocaleString()}</p>
                    </div>
                  </div>
                  {/* Uptime bar */}
                  <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden" style={{ direction: 'ltr' }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${ch.uptime}%`, background: ch.uptime > 99 ? '#10B981' : ch.uptime > 97 ? '#F59E0B' : '#EF4444' }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ACTIVITY LOGS (enhanced)
───────────────────────────────────────────────────────────── */
const CAT_STYLE: Record<LogCategory, { badge: string; icon: string }> = {
  auth:     { badge: 'bg-blue-100 text-blue-700',   icon: '🔐' },
  promo:    { badge: 'bg-violet-100 text-violet-700', icon: '🏷️' },
  user:     { badge: 'bg-amber-100 text-amber-700',  icon: '👤' },
  system:   { badge: 'bg-slate-100 text-slate-600',  icon: '⚙️' },
  settings: { badge: 'bg-emerald-100 text-emerald-700', icon: '🔧' },
};

function LogsPanel() {
  const { t, lang } = useLang();
  const sa = t.superAdmin;
  const [logs, setLogs]         = useState<LogEntry[]>([]);
  const [catFilter, setCatFilter] = useState<LogCategory | 'all'>('all');

  useEffect(() => { setLogs(getLogs()); }, []);

  const filtered = catFilter === 'all' ? logs : logs.filter(l => l.category === catFilter);
  const cats: Array<LogCategory | 'all'> = ['all', 'auth', 'promo', 'user', 'system', 'settings'];

  const clearLogs = () => {
    try { sessionStorage.removeItem(LOGS_KEY); } catch { /* ignore */ }
    setLogs([]);
  };

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-lg font-extrabold text-slate-900">{sa.logsTitle}</h2>
        <button onClick={clearLogs}
          className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 border border-red-200 hover:bg-red-50 transition-colors">
          {lang === 'ar' ? 'مسح السجل' : 'Clear Logs'}
        </button>
      </div>

      {/* Category filter chips */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {cats.map(c => (
          <button key={c} onClick={() => setCatFilter(c)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              catFilter === c
                ? 'bg-violet-600 text-white'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}>
            {c === 'all' ? (lang === 'ar' ? 'الكل' : 'All') : (
              `${CAT_STYLE[c as LogCategory]?.icon ?? ''} ${c.charAt(0).toUpperCase() + c.slice(1)}`
            )}
          </button>
        ))}
        <span className="text-xs text-slate-400 self-center ms-1">
          {filtered.length} {lang === 'ar' ? 'حدث' : 'events'}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-slate-400 font-semibold">{sa.logsEmpty}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-sm" style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
            <thead>
              <tr className="bg-slate-50">
                {[sa.logsTime, lang === 'ar' ? 'الفئة' : 'Category', sa.logsEvent, sa.logsUser].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-start whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((l, i) => {
                const cs = CAT_STYLE[l.category] ?? CAT_STYLE.system;
                return (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap font-mono" style={{ direction: 'ltr' }}>{l.time}</td>
                    <td className="px-4 py-2.5">
                      <span className={`badge text-[11px] ${cs.badge}`}>
                        {cs.icon} {l.category}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">{l.event}</td>
                    <td className="px-4 py-2.5 text-xs font-semibold text-violet-600">{l.user}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   GLOBAL SETTINGS
───────────────────────────────────────────────────────────── */
function GlobalSettings() {
  const { t, lang } = useLang();
  const sa = t.superAdmin;
  const [newPin, setNewPin] = useState('');
  const [pinMsg, setPinMsg] = useState('');
  const [maint,  setMaint]  = useState(getMaint());
  const [saved,  setSaved]  = useState(false);

  const handlePinSave = () => {
    if (newPin.length < 4) return;
    savePin(newPin);
    appendLog('Changed Super-Admin PIN', 'settings');
    setNewPin(''); setPinMsg(sa.globalPinSaved);
    setTimeout(() => setPinMsg(''), 3000);
  };

  const handleMaintSave = () => {
    saveMaint(maint);
    appendLog(`Maintenance mode: ${maint ? 'ON' : 'OFF'}`, 'settings');
    setSaved(true); setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <h2 className="text-lg font-extrabold text-slate-900 mb-6">{sa.globalTitle}</h2>
      <div className="space-y-6">
        {/* PIN change */}
        <div className="card p-6">
          <h3 className="text-sm font-extrabold text-slate-700 mb-4">{sa.globalPin}</h3>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">{sa.globalPinNew}</label>
              <input type="password" value={newPin} onChange={e => setNewPin(e.target.value)}
                placeholder="••••" minLength={4} maxLength={12}
                className={INPUT} style={{ direction: 'ltr', fontFamily: 'monospace', letterSpacing: '0.2em' }} />
            </div>
            <button onClick={handlePinSave} disabled={newPin.length < 4}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#7C3AED,#4F46E5)' }}>
              {sa.globalPinSave}
            </button>
          </div>
          {pinMsg && <p className="mt-2 text-xs text-emerald-600 font-semibold">{pinMsg}</p>}
        </div>

        {/* Maintenance mode */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-700">{sa.globalMaintenanceMode}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{sa.globalMaintenanceDesc}</p>
            </div>
            <button onClick={() => setMaint(m => !m)}
              className={`relative w-12 h-6 rounded-full transition-all duration-300 ${maint ? 'bg-amber-500' : 'bg-slate-200'}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${maint ? 'start-6' : 'start-0.5'}`} />
            </button>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={handleMaintSave}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90"
              style={{ background: 'linear-gradient(135deg,#7C3AED,#4F46E5)' }}>
              {sa.globalSave}
            </button>
            {saved && <p className="text-xs text-emerald-600 font-semibold self-center">{sa.globalSaved}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SUPER-ADMIN SHELL
───────────────────────────────────────────────────────────── */
type AdminTab = 'promo' | 'bi' | 'revenue' | 'health' | 'logs' | 'global';

export default function SuperAdminPage() {
  const { t, lang, toggle } = useLang();
  const sa = t.superAdmin;

  const [unlocked, setUnlocked] = useState(false);
  const [tab, setTab] = useState<AdminTab>('promo');

  if (!unlocked) {
    return <PinGate onUnlock={() => { setUnlocked(true); appendLog('Admin portal unlocked', 'auth'); }} />;
  }

  const tabs: { key: AdminTab; label: string; icon: string }[] = [
    { key: 'promo',   label: sa.tabPromo,   icon: '🏷️' },
    { key: 'bi',      label: sa.tabBI,      icon: '📊' },
    { key: 'revenue', label: sa.tabRevenue, icon: '💰' },
    { key: 'health',  label: sa.tabHealth,  icon: '🩺' },
    { key: 'logs',    label: sa.tabLogs,    icon: '📋' },
    { key: 'global',  label: sa.tabGlobal,  icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-slate-50" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#4F46E5)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-slate-900">{sa.title}</h1>
            <p className="text-[11px] text-slate-400">{sa.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggle}
            className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-500 hover:bg-slate-50">
            {lang === 'ar' ? 'English' : 'عربي'}
          </button>
          <button onClick={() => { setUnlocked(false); appendLog('Admin portal locked', 'auth'); }}
            className="px-4 py-1.5 rounded-xl text-xs font-bold text-white hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#4F46E5)' }}>
            {sa.logoutBtn}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 px-6 pt-4 border-b border-slate-200 overflow-x-auto bg-white">
        {tabs.map(tb => (
          <button key={tb.key} onClick={() => setTab(tb.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all whitespace-nowrap
              ${tab === tb.key
                ? 'bg-slate-50 border border-b-slate-50 border-slate-200 text-violet-700 -mb-px shadow-sm'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50/60'
              }`}>
            <span>{tb.icon}</span>
            {tb.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        {tab === 'promo'   && <PromoManager />}
        {tab === 'bi'      && <BIPanel />}
        {tab === 'revenue' && <RevenuePanel />}
        {tab === 'health'  && <HealthPanel />}
        {tab === 'logs'    && <LogsPanel />}
        {tab === 'global'  && <GlobalSettings />}
      </div>
    </div>
  );
}
