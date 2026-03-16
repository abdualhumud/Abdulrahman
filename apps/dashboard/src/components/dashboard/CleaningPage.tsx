'use client';

import { useState, useCallback } from 'react';
import { Icons } from '@/lib/icons';
import { useLang } from '@/lib/language-context';
import {
  CLEANING_REQUESTS, CLEANING_PROVIDERS,
  type CleaningStatus,
} from '@/lib/mock-data';

async function translateText(text: string, targetLang: 'en' | 'ar'): Promise<string> {
  const srcLang  = targetLang === 'en' ? 'ar' : 'en';
  try {
    const res  = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${srcLang}|${targetLang}`
    );
    const data = await res.json();
    return data?.responseData?.translatedText ?? text;
  } catch {
    return text;
  }
}

type ProviderFilter = 'ALL' | 'INTERNAL' | 'EXTERNAL';

const STATUS_ORDER: CleaningStatus[] = [
  'PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'INSPECTION_DONE',
];

const STATUS_COLOR: Record<CleaningStatus, string> = {
  PENDING:         'bg-amber-100 text-amber-700',
  ASSIGNED:        'bg-blue-100 text-blue-700',
  IN_PROGRESS:     'bg-purple-100 text-purple-700',
  COMPLETED:       'bg-orange-100 text-orange-700',
  INSPECTION_DONE: 'bg-emerald-100 text-emerald-700',
};

const STATUS_DOT: Record<CleaningStatus, string> = {
  PENDING:         'bg-amber-400',
  ASSIGNED:        'bg-blue-500',
  IN_PROGRESS:     'bg-purple-500',
  COMPLETED:       'bg-orange-400',
  INSPECTION_DONE: 'bg-emerald-500',
};

export default function CleaningPage({ onTriggerBooking }: { onTriggerBooking?: (unitName: string) => void }) {
  const { t, lang } = useLang();
  const tc = t.cleaning;

  // Local mutable state built from mock (so actions work without a backend)
  const [requests, setRequests] = useState(
    CLEANING_REQUESTS.map(r => ({ ...r, messages: [...r.messages] }))
  );
  const [selectedId, setSelectedId]     = useState<string>(CLEANING_REQUESTS[0].id);
  const [providerFilter, setFilter]     = useState<ProviderFilter>('ALL');
  const [chatInput, setChatInput]       = useState('');
  const [showAssign,  setShowAssign]    = useState(false);
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translating, setTranslating] = useState(false);

  // ── New Request modal ────────────────────────────────────────────────
  const [showNewReq,   setShowNewReq]  = useState(false);
  const [newReqSaving, setNewReqSaving]= useState(false);
  const [newReqDone,   setNewReqDone]  = useState(false);
  const [newReqForm,   setNewReqForm]  = useState({
    unit: 'Riyadh — Unit A',
    priority: 'NORMAL' as 'NORMAL' | 'HIGH',
    notes: '',
    autoDispatch: true,
    providerId: '',
  });

  const selected = requests.find(r => r.id === selectedId) ?? requests[0];

  // ── KPIs ────────────────────────────────────────────────────────────────
  const activeCount    = requests.filter(r => r.status !== 'INSPECTION_DONE').length;
  const completedCount = CLEANING_PROVIDERS.reduce((s, p) => s + p.completedToday, 0);
  const onlineCount    = CLEANING_PROVIDERS.filter(p => p.available).length;

  // ── Actions ─────────────────────────────────────────────────────────────
  function advanceStatus(id: string) {
    setRequests(prev => prev.map(r => {
      if (r.id !== id) return r;
      const idx = STATUS_ORDER.indexOf(r.status);
      const next = STATUS_ORDER[Math.min(idx + 1, STATUS_ORDER.length - 1)];
      const sysMsg = {
        ASSIGNED:        `✅ Provider assigned. Status → Assigned.`,
        IN_PROGRESS:     `🧹 Cleaning started. Unit hidden from OTA channels.`,
        COMPLETED:       `✅ Cleaning marked complete. Awaiting inspection.`,
        INSPECTION_DONE: `✅ Inspection passed. Deposit SAR ${r.depositAmount.toLocaleString()} queued for release.`,
      }[next as string];
      return {
        ...r,
        status: next,
        messages: sysMsg
          ? [...r.messages, { from: 'SYSTEM', text: sysMsg, time: new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) }]
          : r.messages,
      };
    }));
  }

  function assignProvider(requestId: string, providerId: string) {
    const provider = CLEANING_PROVIDERS.find(p => p.id === providerId)!;
    setRequests(prev => prev.map(r => {
      if (r.id !== requestId) return r;
      return {
        ...r,
        providerId,
        providerType: provider.type,
        status: 'ASSIGNED' as CleaningStatus,
        messages: [
          ...r.messages,
          { from: 'SYSTEM', text: `📋 ${provider.name} assigned to ${r.unitName}.`, time: new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) },
        ],
      };
    }));
    setShowAssign(false);
  }

  function sendMessage() {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput('');
    setRequests(prev => prev.map(r => {
      if (r.id !== selectedId) return r;
      return {
        ...r,
        messages: [...r.messages, { from: 'MANAGER', text: msg, time: new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) }],
      };
    }));
  }

  // ── Auto-translate chat messages ────────────────────────────────────────
  const toggleAutoTranslate = useCallback(async () => {
    const next = !autoTranslate;
    setAutoTranslate(next);
    if (next && selected) {
      // Translate INTO the current UI language so the manager can read messages
      const targetLang = lang as 'en' | 'ar';
      const nonSystemMsgs = selected.messages.filter(m => m.from !== 'SYSTEM');
      setTranslating(true);
      const newTrans: Record<string, string> = { ...translations };
      await Promise.all(nonSystemMsgs.map(async (msg, i) => {
        const key = `${selectedId}-${i}`;
        if (!newTrans[key]) {
          newTrans[key] = await translateText(msg.text, targetLang);
        }
      }));
      setTranslations(newTrans);
      setTranslating(false);
    }
  }, [autoTranslate, selected, selectedId, translations, lang]);

  // ── Submit new request ──────────────────────────────────────────────────
  async function submitNewRequest() {
    setNewReqSaving(true);
    await new Promise(r => setTimeout(r, 1400));
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });

    let assignedProv = null;
    let initialStatus: CleaningStatus = 'PENDING';
    if (newReqForm.autoDispatch) {
      assignedProv = CLEANING_PROVIDERS.find(p => p.available) ?? null;
      if (assignedProv) initialStatus = 'ASSIGNED';
    } else if (newReqForm.providerId) {
      assignedProv = CLEANING_PROVIDERS.find(p => p.id === newReqForm.providerId) ?? null;
      if (assignedProv) initialStatus = 'ASSIGNED';
    }

    const systemMsgs: { from: string; text: string; time: string }[] = [
      { from: 'SYSTEM', text: `📋 New cleaning request created for ${newReqForm.unit}.`, time: timeStr },
    ];
    if (assignedProv) {
      systemMsgs.push({ from: 'SYSTEM', text: `✅ ${assignedProv.name} auto-dispatched.`, time: timeStr });
    }
    if (newReqForm.notes) {
      systemMsgs.push({ from: 'MANAGER', text: newReqForm.notes, time: timeStr });
    }

    const newReq = {
      id:           `CLN-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      bookingId:    `BK-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      unitName:     newReqForm.unit,
      property:     newReqForm.unit.split('—')[0]?.trim() ?? newReqForm.unit,
      guestName:    'New Request',
      status:       initialStatus,
      priority:     newReqForm.priority,
      providerType: (assignedProv?.type ?? 'INTERNAL') as 'INTERNAL' | 'EXTERNAL',
      providerId:   assignedProv?.id ?? '',
      checkoutDate: `2026-02-${Math.min(now.getDate() + 1, 28)}`,
      checkoutTime: '12:00',
      depositAmount: 1500,
      messages:     systemMsgs,
    };

    setRequests(prev => [newReq as any, ...prev]);
    setSelectedId(newReq.id);
    setNewReqSaving(false);
    setNewReqDone(true);
    setTimeout(() => setShowNewReq(false), 1800);
  }

  // ── Mobile panel state (list ↔ detail) ─────────────────────────────────
  const [showDetail, setShowDetail] = useState(false);

  // ── Filtered providers for assign modal ─────────────────────────────────
  const filteredProviders = CLEANING_PROVIDERS.filter(p =>
    providerFilter === 'ALL' || p.type === providerFilter
  );

  const assignedProvider = selected?.providerId
    ? CLEANING_PROVIDERS.find(p => p.id === selected.providerId)
    : null;

  // ── Next action label ───────────────────────────────────────────────────
  function nextActionLabel(status: CleaningStatus): string {
    return {
      PENDING:         tc.startCleaning,
      ASSIGNED:        tc.startCleaning,
      IN_PROGRESS:     tc.markDone,
      COMPLETED:       tc.runInspection,
      INSPECTION_DONE: tc.releaseDeposit,
    }[status];
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50" dir={lang === 'ar' ? 'rtl' : 'ltr'}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-white border-b border-slate-100 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">{tc.title}</h1>
            <p className="text-xs text-slate-500 mt-0.5">{tc.subtitle}</p>
          </div>
          <button
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20"
            onClick={() => {
              setNewReqForm({ unit: 'Riyadh — Unit A', priority: 'NORMAL', notes: '', autoDispatch: true, providerId: '' });
              setNewReqSaving(false);
              setNewReqDone(false);
              setShowNewReq(true);
            }}
          >
            <Icons.plus size={14} />
            <span className="hidden sm:inline">{tc.newRequest}</span>
            <span className="sm:hidden">{lang === 'ar' ? 'جديد' : 'New'}</span>
          </button>
        </div>

        {/* KPI strip — 2 cols on mobile, 4 on sm+ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-4">
          {[
            { icon: Icons.cleaning,   label: tc.activeReq,       value: activeCount,    color: 'text-blue-600',    bg: 'bg-blue-50'    },
            { icon: Icons.sparkles,   label: tc.completedToday,  value: completedCount, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { icon: Icons.clock,      label: tc.avgDuration,     value: '48 min',       color: 'text-purple-600',  bg: 'bg-purple-50'  },
            { icon: Icons.userCheck,  label: tc.providersOnline, value: `${onlineCount}/${CLEANING_PROVIDERS.length}`, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className="flex items-center gap-2 sm:gap-3 bg-white rounded-xl px-3 sm:px-4 py-3 border border-slate-100">
              <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
                <Icon size={16} className={color} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-slate-500 leading-none mb-1 truncate">{label}</p>
                <p className="text-base sm:text-lg font-extrabold text-slate-900 leading-none">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main split layout ─────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 gap-0">

        {/* ── Left: Request list — full width on mobile, fixed sidebar on md+ ── */}
        <div className={`${showDetail ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 md:flex-shrink-0 border-e border-slate-200 bg-white overflow-hidden`}>
          <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {tc.activeReq} ({requests.length})
            </p>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {requests.map(req => (
              <button
                key={req.id}
                onClick={() => { setSelectedId(req.id); setShowDetail(true); }}
                className={`w-full text-start px-4 py-3.5 hover:bg-slate-50 transition-all ${selectedId === req.id ? 'bg-blue-50 border-e-2 border-blue-500' : ''}`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-xs font-bold text-slate-800 truncate leading-tight">
                    {lang === 'ar' && (req as any).unitNameAr ? (req as any).unitNameAr : req.unitName}
                  </span>
                  {req.priority === 'HIGH' && (
                    <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full flex-shrink-0">
                      {tc.priority_HIGH}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mb-2">{req.property}</p>
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${STATUS_COLOR[req.status]}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[req.status]}`} />
                    {tc[`status_${req.status}` as keyof typeof tc]}
                  </span>
                  <span className="text-[10px] text-slate-400">{req.checkoutTime}</span>
                </div>
                {/* OTA visibility indicator */}
                {req.status === 'IN_PROGRESS' && (
                  <p className="text-[10px] text-orange-500 font-semibold mt-1.5 flex items-center gap-1">
                    <Icons.alertCircle size={10} />
                    {tc.unitHidden}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Right: Detail + chat ────────────────────────────────────────── */}
        {selected && (
          <div className={`${!showDetail ? 'hidden md:flex' : 'flex'} flex-1 flex-col min-w-0 overflow-hidden`}>

            {/* Detail header */}
            <div className="flex-shrink-0 bg-white border-b border-slate-100 px-4 sm:px-5 py-4">
              {/* Mobile back button */}
              <button
                className="md:hidden flex items-center gap-1.5 text-xs font-bold text-blue-600 mb-3 hover:text-blue-800 transition-colors"
                onClick={() => setShowDetail(false)}
              >
                <Icons.arrowRight size={13} className={lang === 'ar' ? '' : 'rotate-180'} />
                {lang === 'ar' ? 'القائمة' : 'Back to list'}
              </button>

              <div className="flex items-start justify-between gap-2 sm:gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${STATUS_COLOR[selected.status]}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[selected.status]}`} />
                      {tc[`status_${selected.status}` as keyof typeof tc]}
                    </span>
                    {selected.priority === 'HIGH' && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full flex items-center gap-1">
                        <Icons.zap size={10} />
                        {tc.priority_HIGH}
                      </span>
                    )}
                  </div>
                  <h2 className="font-extrabold text-slate-900 text-base truncate">
                    {lang === 'ar' && (selected as any).unitNameAr ? (selected as any).unitNameAr : selected.unitName}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">{selected.property} · {t.table.checkOut}: {selected.checkoutDate} — {selected.checkoutTime}</p>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                  {selected.status === 'PENDING' && (
                    <button
                      onClick={() => setShowAssign(true)}
                      className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-blue-200 text-blue-700 text-xs font-bold hover:bg-blue-50 transition-all"
                    >
                      <Icons.userCheck size={12} />
                      <span className="hidden sm:inline">{tc.assign}</span>
                    </button>
                  )}
                  {selected.status !== 'INSPECTION_DONE' && (
                    <button
                      onClick={() => advanceStatus(selected.id)}
                      className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-all shadow-sm"
                    >
                      <Icons.arrowRight size={12} />
                      <span className="hidden xs:inline">{nextActionLabel(selected.status)}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Provider + deposit row — wraps on mobile */}
              <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-slate-100">
                {/* Provider info */}
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                    {selected.providerType === 'INTERNAL'
                      ? <Icons.user size={13} className="text-slate-500" />
                      : <Icons.truck size={13} className="text-slate-500" />
                    }
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 leading-none">{tc.providerType}</p>
                    <p className="text-xs font-bold text-slate-700">
                      {assignedProvider ? assignedProvider.name : (
                        selected.providerType === 'INTERNAL' ? tc.internal : tc.external
                      )}
                    </p>
                  </div>
                </div>

                {/* Deposit info */}
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                    <Icons.shield size={13} className="text-amber-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 leading-none">{t.insurance.title}</p>
                    <p className="text-xs font-bold text-slate-700" style={{ direction: 'ltr' }}>
                      SAR {selected.depositAmount.toLocaleString()}
                      {selected.status !== 'INSPECTION_DONE' && (
                        <span className="text-amber-600 font-normal ms-1">· HELD</span>
                      )}
                      {selected.status === 'INSPECTION_DONE' && (
                        <span className="text-emerald-600 font-normal ms-1">· RELEASED</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* OTA status */}
                <div className="ms-auto flex items-center gap-1.5">
                  {(selected.status === 'IN_PROGRESS' || selected.status === 'ASSIGNED') ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                      <span className="text-xs text-orange-600 font-semibold">{tc.unitHidden}</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-xs text-emerald-600 font-semibold">{tc.unitVisible}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ── Chat ──────────────────────────────────────────────────── */}
            {/* Chat toolbar */}
            <div className="flex-shrink-0 bg-slate-50 border-b border-slate-100 px-5 py-2 flex items-center justify-between">
              <p className="text-[11px] text-slate-400 font-semibold">
                {lang === 'ar' ? 'محادثة المزود' : 'Provider Chat'}
              </p>
              <button
                onClick={toggleAutoTranslate}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                  autoTranslate
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                }`}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 8l6 6"/><path d="M4 14l6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/>
                  <path d="M22 22l-5-10-5 10"/><path d="M14 18h6"/>
                </svg>
                {lang === 'ar' ? 'ترجمة تلقائية' : 'Auto-Translate'}
                {translating && <span className="w-2.5 h-2.5 border border-white border-t-transparent rounded-full animate-spin ms-0.5" />}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {selected.messages.map((msg, i) => {
                const isSystem  = msg.from === 'SYSTEM';
                const isManager = msg.from === 'MANAGER';
                const translationKey = `${selectedId}-${i}`;
                const translated = autoTranslate && !isSystem ? translations[translationKey] : null;
                return (
                  <div key={i} className={`flex ${isSystem ? 'justify-center' : isManager ? 'justify-end' : 'justify-start'}`}>
                    {isSystem ? (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full max-w-md">
                        <Icons.zap size={11} className="text-slate-400 flex-shrink-0" />
                        <p className="text-[11px] text-slate-500 font-medium">{msg.text}</p>
                        <span className="text-[10px] text-slate-400 flex-shrink-0">{msg.time}</span>
                      </div>
                    ) : (
                      <div className={`max-w-xs ${isManager ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                        <span className="text-[10px] text-slate-400 px-1">
                          {msg.from} · {msg.time}
                        </span>
                        <div className={`px-3 py-2 rounded-2xl text-sm leading-snug ${
                          isManager
                            ? 'bg-blue-600 text-white rounded-tr-sm'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
                        }`}>
                          {msg.text}
                          {/* Translation */}
                          {autoTranslate && (
                            <div className={`mt-1.5 pt-1.5 border-t ${isManager ? 'border-blue-500/40' : 'border-slate-100'}`}>
                              {translating && !translated ? (
                                <span className="text-[10px] opacity-60 flex items-center gap-1">
                                  <span className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" />
                                  {lang === 'ar' ? 'ترجمة…' : 'Translating…'}
                                </span>
                              ) : translated ? (
                                <p className={`text-[11px] italic leading-snug ${isManager ? 'text-blue-100' : 'text-slate-500'}`}>
                                  {translated}
                                </p>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Chat input */}
            <div className="flex-shrink-0 bg-white border-t border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder={tc.chatPlaceholder}
                  className="flex-1 text-sm px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-slate-50"
                />
                <button
                  onClick={sendMessage}
                  disabled={!chatInput.trim()}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {tc.sendMessage}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── New Request Modal ─────────────────────────────────────────────── */}
      {showNewReq && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => !newReqSaving && setShowNewReq(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <p className="font-extrabold text-slate-900">{tc.newReqTitle}</p>
              <button onClick={() => setShowNewReq(false)} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
                <Icons.x size={14} />
              </button>
            </div>
            <div className="px-6 pb-6 pt-4 space-y-4">
              {newReqDone ? (
                <div className="flex flex-col items-center gap-3 py-6">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Icons.check size={28} className="text-emerald-600" />
                  </div>
                  <p className="font-bold text-emerald-700 text-center">{tc.newReqCreated}</p>
                </div>
              ) : (
                <>
                  {/* Unit */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{tc.newReqUnit}</label>
                    <select className="input" value={newReqForm.unit}
                      onChange={e => setNewReqForm(p => ({ ...p, unit: e.target.value }))}>
                      {['Riyadh — Unit A','Riyadh — Unit B','Riyadh — Unit C','Jeddah Villa','Diriyah — C1','Diriyah — C2','AlUla Studio'].map(u => (
                        <option key={u}>{u}</option>
                      ))}
                    </select>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{tc.newReqPriority}</label>
                    <div className="flex gap-3">
                      {(['NORMAL','HIGH'] as const).map(p => (
                        <button key={p} type="button"
                          onClick={() => setNewReqForm(f => ({ ...f, priority: p }))}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                            newReqForm.priority === p
                              ? p === 'HIGH'
                                ? 'border-red-500 bg-red-50 text-red-700'
                                : 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-slate-200 bg-slate-50 text-slate-500'
                          }`}>
                          {p === 'HIGH' ? `⚡ ${tc.priority_HIGH}` : `● ${tc.priority_NORMAL}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{tc.newReqNotes}</label>
                    <textarea className="input resize-none" rows={2} value={newReqForm.notes}
                      onChange={e => setNewReqForm(p => ({ ...p, notes: e.target.value }))} />
                  </div>

                  {/* Auto-dispatch */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{tc.newReqProvider}</label>
                    <label className="flex items-center gap-3 bg-emerald-50 rounded-xl p-3 cursor-pointer border border-emerald-100"
                      onClick={() => setNewReqForm(p => ({ ...p, autoDispatch: !p.autoDispatch }))}>
                      <span className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${newReqForm.autoDispatch ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                        {newReqForm.autoDispatch && <Icons.check size={12} className="text-white" />}
                      </span>
                      <span className="text-xs font-semibold text-emerald-700">{tc.newReqAutoDispatch}</span>
                    </label>
                    {!newReqForm.autoDispatch && (
                      <select className="input mt-2" value={newReqForm.providerId}
                        onChange={e => setNewReqForm(p => ({ ...p, providerId: e.target.value }))}>
                        <option value="">{lang === 'ar' ? '— اختر مزوداً —' : '— Select Provider —'}</option>
                        {CLEANING_PROVIDERS.filter(p => p.available).map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setShowNewReq(false)}
                      className="flex-1 btn-ghost justify-center py-2.5">{t.common.cancel}</button>
                    <button onClick={submitNewRequest} disabled={newReqSaving}
                      className="flex-1 btn-primary justify-center py-2.5 disabled:opacity-50">
                      {newReqSaving
                        ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {t.common.loading}</>
                        : <><Icons.plus size={15} /> {tc.newReqSubmit}</>
                      }
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Assign Modal ──────────────────────────────────────────────────── */}
      {showAssign && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAssign(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900">{tc.assign} Provider</h3>
              <button onClick={() => setShowAssign(false)} className="text-slate-400 hover:text-slate-700">
                <Icons.x size={18} />
              </button>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 p-3 bg-slate-50 border-b border-slate-100">
              {(['ALL', 'INTERNAL', 'EXTERNAL'] as ProviderFilter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    providerFilter === f ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {f === 'ALL' ? t.common.all : f === 'INTERNAL' ? tc.internal : tc.external}
                </button>
              ))}
            </div>

            <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
              {filteredProviders.map(p => (
                <button
                  key={p.id}
                  onClick={() => assignProvider(selectedId, p.id)}
                  disabled={!p.available}
                  className={`w-full flex items-center gap-3 px-5 py-3 text-start hover:bg-slate-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${p.type === 'INTERNAL' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                    {p.type === 'INTERNAL'
                      ? <Icons.user size={15} className="text-blue-600" />
                      : <Icons.truck size={15} className="text-purple-600" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.role} · {p.completedToday} {tc.todayDone}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1">
                      <Icons.star size={11} className="text-amber-400" />
                      <span className="text-xs font-bold text-slate-700">{p.rating}</span>
                    </div>
                    <span className={`text-[10px] font-bold ${p.available ? 'text-emerald-600' : 'text-red-500'}`}>
                      {p.available ? tc.available : tc.busy}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
