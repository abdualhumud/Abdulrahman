'use client';

/**
 * SuperAdminPage — Owner control panel
 *
 * Accessible at /Abdulrahman/super-admin/
 * PIN-gated (default PIN: 1234, changeable in Global Settings).
 *
 * Sections:
 *  1. Promo Codes   — create, edit, delete, monitor promo codes
 *  2. BI Dashboard  — staging accounts, unit counts, plan distribution
 *  3. Activity Log  — in-session event list
 *  4. Global Settings — PIN management, maintenance mode
 */

import { useState, useEffect, useCallback } from 'react';
import { useLang } from '@/lib/language-context';
import {
  getPromoCodes, createPromoCode, updatePromoCode, deletePromoCode,
  type PromoCode,
} from '@/lib/promo-service';
import { getStagingAccountSummaries } from '@/lib/staging-auth';

/* ── Storage ── */
const PIN_KEY         = 'rems-superadmin-pin';
const MAINT_KEY       = 'rems-superadmin-maint';
const LOGS_KEY        = 'rems-superadmin-logs';
const DEFAULT_PIN     = '1234';

function getPin(): string {
  try { return localStorage.getItem(PIN_KEY) ?? DEFAULT_PIN; } catch { return DEFAULT_PIN; }
}
function savePin(pin: string): void {
  try { localStorage.setItem(PIN_KEY, pin); } catch { /* ignore */ }
}
function getMaint(): boolean {
  try { return localStorage.getItem(MAINT_KEY) === '1'; } catch { return false; }
}
function saveMaint(v: boolean): void {
  try { localStorage.setItem(MAINT_KEY, v ? '1' : '0'); } catch { /* ignore */ }
}

interface LogEntry { time: string; event: string; user: string; }
function getLogs(): LogEntry[] {
  try {
    const raw = typeof window !== 'undefined' ? sessionStorage.getItem(LOGS_KEY) : null;
    return raw ? (JSON.parse(raw) as LogEntry[]) : [];
  } catch { return []; }
}
function appendLog(event: string, user = 'Super-Admin'): void {
  try {
    const logs = getLogs();
    logs.unshift({ time: new Date().toLocaleTimeString(), event, user });
    sessionStorage.setItem(LOGS_KEY, JSON.stringify(logs.slice(0, 50)));
  } catch { /* ignore */ }
}

/* ── Shared input style ── */
const INPUT =
  'w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all';

/* ═══════════════════════════════════════════════════════════
   PIN GATE
   ═══════════════════════════════════════════════════════════ */
function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const { t, lang, toggle } = useLang();
  const sa = t.superAdmin;

  const [pin,   setPin]   = useState('');
  const [error, setError] = useState('');

  const handleUnlock = () => {
    if (pin === getPin()) { onUnlock(); }
    else { setError(sa.pinError); setPin(''); }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-6"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="absolute top-0 start-0 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 end-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-xs">
        {/* Lang toggle */}
        <div className="flex justify-end mb-4">
          <button onClick={toggle}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20">
            {lang === 'ar' ? 'English' : 'عربي'}
          </button>
        </div>

        <div className="text-center mb-6">
          {/* Shield icon */}
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#4F46E5)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-white">{sa.pinTitle}</h1>
          <p className="text-slate-400 text-sm mt-1">{sa.pinDesc}</p>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-2xl space-y-4">
          <input
            type="password" value={pin}
            onChange={e => { setPin(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleUnlock()}
            placeholder={sa.pinPlaceholder}
            className={INPUT + ' text-center text-2xl tracking-widest font-mono'}
            style={{ direction: 'ltr' }}
            autoFocus
          />
          {error && (
            <p className="text-xs text-red-500 font-semibold text-center">{error}</p>
          )}
          <button
            onClick={handleUnlock}
            className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 shadow-lg"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#4F46E5)' }}
          >
            {sa.pinBtn}
          </button>
          <p className="text-[11px] text-slate-400 text-center">{sa.pinDefault}</p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PROMO CODE MANAGER
   ═══════════════════════════════════════════════════════════ */
function PromoManager() {
  const { t, lang } = useLang();
  const sa = t.superAdmin;

  const [codes,    setCodes]    = useState<PromoCode[]>([]);
  const [editing,  setEditing]  = useState<string | null>(null); // code being edited
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ code: '', discount: 20, maxUses: 0, expiresAt: '', description: '', active: true });

  const reload = useCallback(() => setCodes(getPromoCodes()), []);
  useEffect(() => { reload(); }, [reload]);

  const resetForm = () => setForm({ code: '', discount: 20, maxUses: 0, expiresAt: '', description: '', active: true });

  const handleCreate = () => {
    try {
      createPromoCode({ code: form.code, discount: form.discount, maxUses: form.maxUses,
        expiresAt: form.expiresAt || null, description: form.description, active: form.active });
      appendLog(`Created promo code: ${form.code.toUpperCase()}`);
      reload(); setCreating(false); resetForm();
    } catch (e) { alert((e as Error).message); }
  };

  const handleEdit = (c: PromoCode) => {
    setEditing(c.code);
    setForm({ code: c.code, discount: c.discount, maxUses: c.maxUses,
      expiresAt: c.expiresAt ?? '', description: c.description, active: c.active });
  };

  const handleSaveEdit = () => {
    if (!editing) return;
    updatePromoCode(editing, { discount: form.discount, maxUses: form.maxUses,
      expiresAt: form.expiresAt || null, description: form.description, active: form.active });
    appendLog(`Updated promo code: ${editing}`);
    reload(); setEditing(null); resetForm();
  };

  const handleDelete = (code: string) => {
    if (!confirm(sa.promoConfirmDel)) return;
    deletePromoCode(code);
    appendLog(`Deleted promo code: ${code}`);
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
          onChange={e => setForm(f => ({ ...f, discount: +e.target.value }))}
          className={INPUT} style={{ direction: 'ltr' }} />
      </div>
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">{sa.promoMaxLabel}</label>
        <input type="number" min="0" value={form.maxUses}
          onChange={e => setForm(f => ({ ...f, maxUses: +e.target.value }))}
          className={INPUT} style={{ direction: 'ltr' }} />
      </div>
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">{sa.promoExpLabel}</label>
        <input type="date" value={form.expiresAt}
          onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
          className={INPUT} style={{ direction: 'ltr' }} />
      </div>
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">{sa.promoDescLabel}</label>
        <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          className={INPUT} />
      </div>
      <div className="col-span-2 flex items-center gap-2">
        <input type="checkbox" id="active-cb" checked={form.active}
          onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
          className="w-4 h-4 accent-violet-600" />
        <label htmlFor="active-cb" className="text-sm font-semibold text-slate-700">{sa.promoActiveLabel}</label>
      </div>
      <div className="col-span-2 flex gap-2 pt-1">
        <button onClick={editing ? handleSaveEdit : handleCreate}
          className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#7C3AED,#4F46E5)' }}>
          {sa.promoSave}
        </button>
        <button onClick={() => { setCreating(false); setEditing(null); resetForm(); }}
          className="px-4 py-2 rounded-xl text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all">
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
          className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
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
                  <td colSpan={8} className="px-4 py-3">
                    <FormFields />
                  </td>
                ) : (
                  <>
                    <td className="px-4 py-3 font-mono font-bold text-violet-700">{c.code}</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">{c.discount}%</td>
                    <td className="px-4 py-3 text-slate-600">{c.maxUses === 0 ? <span className="text-slate-400 italic">{sa.promoUnlimited}</span> : c.maxUses}</td>
                    <td className="px-4 py-3 text-slate-700">{c.usedCount}</td>
                    <td className="px-4 py-3 text-slate-600" style={{ direction: 'ltr' }}>{c.expiresAt ?? <span className="text-slate-400 italic">{sa.promoNever}</span>}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-[120px] truncate">{c.description}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${c.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {c.active ? sa.promoActive : sa.promoInactive}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEdit(c)}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">{sa.promoEdit}</button>
                        <button onClick={() => handleDelete(c.code)}
                          className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors">{sa.promoDelete}</button>
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

/* ═══════════════════════════════════════════════════════════
   BUSINESS INTELLIGENCE
   ═══════════════════════════════════════════════════════════ */
function BIPanel() {
  const { t, lang } = useLang();
  const sa = t.superAdmin;

  const accounts = getStagingAccountSummaries();
  const totalUnits = accounts.reduce((s, a) => s + a.unitCount, 0);

  const planColors: Record<string, string> = {
    Basic: '#64748B', Pro: '#3B82F6', Enterprise: '#8B5CF6', '': '#94A3B8',
  };

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <h2 className="text-lg font-extrabold text-slate-900 mb-4">{sa.biTitle}</h2>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: sa.biTotal,   value: accounts.length,  color: '#7C3AED' },
          { label: sa.biUnits,   value: totalUnits,        color: '#3B82F6' },
          { label: sa.biStaging, value: accounts.length,   color: '#6366F1' },
          { label: sa.biProd,    value: 0,                 color: '#10B981' },
        ].map(k => (
          <div key={k.label} className="card p-4">
            <p className="text-2xl font-extrabold" style={{ color: k.color }}>{k.value}</p>
            <p className="text-xs text-slate-500 font-semibold mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Accounts table */}
      {accounts.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-slate-400 font-semibold">{sa.biNoAccounts}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-sm" style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
            <thead>
              <tr className="bg-slate-50">
                {[sa.biCompany, sa.biEmail, sa.biPlan, sa.biUnitsCol, sa.biPromo, sa.biJoined].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-start whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {accounts.map(a => (
                <tr key={a.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-semibold text-slate-800">{a.companyName}</td>
                  <td className="px-4 py-3 text-slate-500" style={{ direction: 'ltr' }}>{a.email}</td>
                  <td className="px-4 py-3">
                    <span className="badge text-white text-[11px]"
                      style={{ background: planColors[a.plan] ?? '#94A3B8' }}>
                      {a.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-center" style={{ color: '#3B82F6' }}>{a.unitCount}</td>
                  <td className="px-4 py-3 font-mono text-xs text-violet-700">{a.promoCode || '—'}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs" style={{ direction: 'ltr' }}>{a.createdAt.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ACTIVITY LOGS
   ═══════════════════════════════════════════════════════════ */
function LogsPanel() {
  const { t, lang } = useLang();
  const sa = t.superAdmin;
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => { setLogs(getLogs()); }, []);

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <h2 className="text-lg font-extrabold text-slate-900 mb-4">{sa.logsTitle}</h2>
      {logs.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-slate-400 font-semibold">{sa.logsEmpty}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-sm" style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
            <thead>
              <tr className="bg-slate-50">
                {[sa.logsTime, sa.logsEvent, sa.logsUser].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-start">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {logs.map((l, i) => (
                <tr key={i} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap font-mono" style={{ direction: 'ltr' }}>{l.time}</td>
                  <td className="px-4 py-2.5 text-slate-700">{l.event}</td>
                  <td className="px-4 py-2.5 text-xs font-semibold text-violet-600">{l.user}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   GLOBAL SETTINGS
   ═══════════════════════════════════════════════════════════ */
function GlobalSettings() {
  const { t, lang } = useLang();
  const sa = t.superAdmin;

  const [newPin,  setNewPin]  = useState('');
  const [pinMsg,  setPinMsg]  = useState('');
  const [maint,   setMaint]   = useState(getMaint());
  const [saved,   setSaved]   = useState(false);

  const handlePinSave = () => {
    if (newPin.length < 4) return;
    savePin(newPin);
    appendLog('Changed Super-Admin PIN');
    setNewPin(''); setPinMsg(sa.globalPinSaved);
    setTimeout(() => setPinMsg(''), 3000);
  };

  const handleMaintSave = () => {
    saveMaint(maint);
    appendLog(`Maintenance mode: ${maint ? 'ON' : 'OFF'}`);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-40 transition-all"
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
            <button
              onClick={() => setMaint(m => !m)}
              className={`relative w-12 h-6 rounded-full transition-all duration-300 ${maint ? 'bg-amber-500' : 'bg-slate-200'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${maint ? 'start-6' : 'start-0.5'}`} />
            </button>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={handleMaintSave}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-all"
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

/* ═══════════════════════════════════════════════════════════
   SUPER-ADMIN SHELL
   ═══════════════════════════════════════════════════════════ */
type AdminTab = 'promo' | 'bi' | 'logs' | 'global';

export default function SuperAdminPage() {
  const { t, lang, toggle } = useLang();
  const sa = t.superAdmin;

  const [unlocked, setUnlocked] = useState(false);
  const [tab, setTab] = useState<AdminTab>('promo');

  if (!unlocked) return <PinGate onUnlock={() => { setUnlocked(true); appendLog('Admin portal unlocked'); }} />;

  const tabs: { key: AdminTab; label: string }[] = [
    { key: 'promo',  label: sa.tabPromo  },
    { key: 'bi',     label: sa.tabBI     },
    { key: 'logs',   label: sa.tabLogs   },
    { key: 'global', label: sa.tabGlobal },
  ];

  return (
    <div
      className="min-h-screen bg-slate-50"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#4F46E5)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round">
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
          <button
            onClick={() => { setUnlocked(false); appendLog('Admin portal locked'); }}
            className="px-4 py-1.5 rounded-xl text-xs font-bold text-white hover:opacity-90 transition-all"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#4F46E5)' }}
          >
            {sa.logoutBtn}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-6 border-b border-slate-200 overflow-x-auto">
        {tabs.map(tb => (
          <button key={tb.key} onClick={() => setTab(tb.key)}
            className={`px-5 py-2.5 rounded-t-xl text-sm font-bold transition-all whitespace-nowrap
              ${tab === tb.key ? 'bg-white border border-b-white border-slate-200 text-violet-700 -mb-px' : 'text-slate-400 hover:text-slate-600'}`}>
            {tb.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        {tab === 'promo'  && <PromoManager />}
        {tab === 'bi'     && <BIPanel />}
        {tab === 'logs'   && <LogsPanel />}
        {tab === 'global' && <GlobalSettings />}
      </div>
    </div>
  );
}
