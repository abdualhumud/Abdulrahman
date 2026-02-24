'use client';

import { useState } from 'react';
import { Icons } from '@/lib/icons';
import { useLang } from '@/lib/language-context';
import { useJourney } from '@/lib/journey-context';
import { CHANNEL_SYNC_STATUS, CHANNEL_BREAKDOWN, UNITS } from '@/lib/mock-data';

/* ── Official branded channel logos ─────────────────────────────────── */
function ChannelLogo({ channel, isActive = true }: { channel: string; isActive?: boolean }) {
  const inactiveStyle = !isActive ? { filter: 'grayscale(100%)', opacity: 0.4 } : {};

  if (channel === 'Booking.com') return (
    <div
      className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 shadow-sm overflow-hidden select-none"
      style={{ background: '#003580', ...inactiveStyle }}
    >
      {/* Booking.com: wordmark "B." in white + "booking" subtext */}
      <svg width="34" height="30" viewBox="0 0 34 30" fill="none">
        <text x="3" y="20" fontFamily="Arial Black,Helvetica,sans-serif" fontWeight="900" fontSize="18" fill="white">B</text>
        <text x="17" y="20" fontFamily="Arial Black,Helvetica,sans-serif" fontWeight="900" fontSize="18" fill="#6699FF">.</text>
        <text x="3" y="28" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="7" fill="white" letterSpacing="1">BOOKING</text>
      </svg>
    </div>
  );

  if (channel === 'Airbnb') return (
    <div
      className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden"
      style={{ background: '#FF385C', ...inactiveStyle }}
    >
      {/* Airbnb bélo — stylized loop / location pin shape */}
      <svg width="22" height="26" viewBox="0 0 22 26" fill="white">
        <path d="M11 0C7.7 0 5 2.7 5 6c0 2.2 1.3 4.5 3 6.8C9.7 14.6 11 16.3 11 17.5c0 1.4-1.1 2.5-2.5 2.5S6 18.9 6 17.5c0-.9.4-1.8 1-2.5l-1.5-1.5C4.5 14.7 4 16 4 17.5 4 20 6 22 8.5 22c1.4 0 2.7-.6 3.5-1.6.8 1 2.1 1.6 3.5 1.6 2.5 0 4.5-2 4.5-4.5 0-1.5-.5-2.8-1.5-3.9l-1.5 1.5c.6.7 1 1.6 1 2.4 0 1.4-1.1 2.5-2.5 2.5S13 18.9 13 17.5c0-1.2 1.3-2.9 3-4.7 1.7-2.3 3-4.6 3-6.8C19 2.7 16.3 0 13 0h-2zm1 4.5c1.4 0 2.5 1.1 2.5 2.5S13.4 9.5 12 9.5 9.5 8.4 9.5 7 10.6 4.5 12 4.5z" />
      </svg>
    </div>
  );

  if (channel === 'Gathern') return (
    <div
      className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 shadow-sm overflow-hidden"
      style={{ background: '#00A651', ...inactiveStyle }}
    >
      {/* Gathern: stylized G with Arabic brand name */}
      <svg width="34" height="30" viewBox="0 0 34 30" fill="none">
        <text x="6" y="21" fontFamily="Arial Black,Helvetica,sans-serif" fontWeight="900" fontSize="20" fill="white">G</text>
        <text x="3" y="29" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="6.5" fill="white" letterSpacing="0.5">GATHERN</text>
      </svg>
    </div>
  );

  return (
    <div
      className="w-12 h-12 rounded-2xl bg-slate-200 flex items-center justify-center flex-shrink-0"
      style={inactiveStyle}
    >
      <span className="text-slate-600 font-extrabold text-sm">{channel.charAt(0)}</span>
    </div>
  );
}

/* ── Rate Parity Manager — unit-specific ─────────────────────────────── */
function RateParityManager() {
  const { t, lang } = useLang();
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [unitSearch, setUnitSearch]         = useState('');
  const [showDropdown, setShowDropdown]     = useState(false);

  const [dateFrom,  setDateFrom]  = useState('2026-03-01');
  const [dateTo,    setDateTo]    = useState('2026-03-31');
  const [minStay,   setMinStay]   = useState('2');

  const [channelPrices, setChannelPrices] = useState<Record<string, string>>({
    'Booking.com': '', 'Airbnb': '', 'Gathern': '',
  });
  const [channelEnabled, setChannelEnabled] = useState<Record<string, boolean>>({
    'Booking.com': true, 'Airbnb': true, 'Gathern': true,
  });

  const [pushing, setPushing] = useState(false);
  const [pushed,  setPushed]  = useState(false);

  const selectedUnit = UNITS.find(u => u.id === selectedUnitId);

  const filteredUnits = UNITS.filter(u =>
    unitSearch === '' ||
    u.name.toLowerCase().includes(unitSearch.toLowerCase()) ||
    (u.nameAr && u.nameAr.includes(unitSearch)) ||
    u.city.toLowerCase().includes(unitSearch.toLowerCase())
  );

  const handleUnitSelect = (unit: typeof UNITS[number]) => {
    setSelectedUnitId(unit.id);
    setUnitSearch(lang === 'ar' ? (unit.nameAr ?? unit.name) : unit.name);
    setShowDropdown(false);
    setMinStay(String(unit.minStay));
    // Pre-fill per-channel prices from unit's basePrice
    const price = String(unit.basePrice);
    setChannelPrices({ 'Booking.com': price, 'Airbnb': price, 'Gathern': price });
    // Enable only channels the unit is listed on
    setChannelEnabled({
      'Booking.com': unit.channels.includes('Booking.com'),
      'Airbnb':      unit.channels.includes('Airbnb'),
      'Gathern':     unit.channels.includes('Gathern'),
    });
  };

  const activeCount = Object.entries(channelEnabled).filter(([, v]) => v).length;

  const handlePush = async () => {
    if (!selectedUnit) return;
    setPushing(true);
    await new Promise(r => setTimeout(r, 1800));
    setPushing(false);
    setPushed(true);
    setTimeout(() => setPushed(false), 4000);
  };

  const CHANNEL_COLORS: Record<string, { color: string; bg: string }> = {
    'Booking.com': { color: '#003580', bg: '#EEF2FF' },
    'Airbnb':      { color: '#FF385C', bg: '#FFF1F2' },
    'Gathern':     { color: '#00A651', bg: '#F0FDF4' },
  };

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
          <Icons.sliders size={18} className="text-blue-600" />
        </div>
        <div>
          <p className="font-bold text-slate-900 text-lg leading-none">{t.channels.rateManager}</p>
          <p className="text-xs text-slate-400 mt-0.5">{t.channels.rateDesc}</p>
        </div>
        <span className="ms-auto badge bg-amber-50 text-amber-600 border border-amber-100">
          {lang === 'ar' ? 'تسعير بالوحدة' : 'Unit-Specific Pricing'}
        </span>
      </div>

      {/* Step 1 — Select specific unit */}
      <div className="mb-5">
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          {lang === 'ar' ? '① اختر وحدة محددة' : '① Select Specific Unit'}
        </label>
        <div className="relative">
          <div className="relative">
            <Icons.building size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={unitSearch}
              onChange={e => { setUnitSearch(e.target.value); setShowDropdown(true); setSelectedUnitId(''); }}
              onFocus={() => setShowDropdown(true)}
              placeholder={lang === 'ar' ? 'ابحث عن وحدة…' : 'Search for a unit…'}
              className="input w-full ps-9 pe-9"
            />
            <Icons.chevronDown size={14} className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {showDropdown && filteredUnits.length > 0 && (
            <div className="absolute z-30 top-full mt-1 w-full bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
              {filteredUnits.map(unit => (
                <button
                  key={unit.id}
                  onClick={() => handleUnitSelect(unit)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-start border-b border-slate-50 last:border-0"
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: unit.color + '20', color: unit.color }}>
                    <Icons.building size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {lang === 'ar' ? (unit.nameAr ?? unit.name) : unit.name}
                    </p>
                    <p className="text-xs text-slate-400">{unit.city} · SAR {unit.basePrice.toLocaleString()}/night</p>
                  </div>
                  <span className={`badge text-[10px] flex-shrink-0 ${unit.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    {unit.status}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Click-away to close dropdown */}
        {showDropdown && (
          <div className="fixed inset-0 z-20" onClick={() => setShowDropdown(false)} />
        )}
      </div>

      {/* Step 2 — Unit details + current prices (only shown when unit selected) */}
      {selectedUnit && (
        <>
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: selectedUnit.color + '25', color: selectedUnit.color }}>
                <Icons.building size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 truncate">
                  {lang === 'ar' ? (selectedUnit.nameAr ?? selectedUnit.name) : selectedUnit.name}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedUnit.beds}BR / {selectedUnit.baths}BA · {selectedUnit.city} · {selectedUnit.district}
                </p>
              </div>
              <div className="text-end flex-shrink-0">
                <p className="text-xs text-slate-400">Base Rate</p>
                <p className="font-extrabold text-slate-900 text-sm" style={{ direction: 'ltr' }}>
                  SAR {selectedUnit.basePrice.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Date range + min stay */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                {t.channels.fromDate}
              </label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="input" style={{ direction: 'ltr' }} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                {t.channels.toDate}
              </label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="input" style={{ direction: 'ltr' }} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                {t.channels.minStay}
              </label>
              <input type="number" min="1" value={minStay} onChange={e => setMinStay(e.target.value)}
                className="input" style={{ direction: 'ltr' }} />
            </div>
          </div>

          {/* Step 3 — Per-channel pricing */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              {lang === 'ar' ? '② سعر مخصص لكل قناة' : '② Per-Channel Nightly Rate (SAR)'}
            </label>
            <div className="space-y-3">
              {(['Booking.com', 'Airbnb', 'Gathern'] as const).map(ch => {
                const enabled = channelEnabled[ch];
                const isOnChannel = selectedUnit.channels.includes(ch);
                const cc = CHANNEL_COLORS[ch];
                return (
                  <div key={ch}
                    className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all
                      ${enabled ? 'border-current' : 'border-slate-100 bg-slate-50 opacity-60'}`}
                    style={{ borderColor: enabled ? cc.color + '40' : undefined, background: enabled ? cc.bg : undefined }}
                  >
                    <ChannelLogo channel={ch} isActive={enabled && isOnChannel} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm" style={{ color: cc.color }}>{ch}</p>
                      {!isOnChannel && (
                        <p className="text-[10px] text-amber-600 font-semibold">
                          {lang === 'ar' ? 'الوحدة غير مدرجة في هذه القناة' : 'Unit not listed on this channel'}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <span className="absolute start-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">SAR</span>
                        <input
                          type="number"
                          value={channelPrices[ch]}
                          onChange={e => setChannelPrices(p => ({ ...p, [ch]: e.target.value }))}
                          disabled={!enabled}
                          className="input ps-10 w-28 text-sm font-bold disabled:opacity-50"
                          style={{ direction: 'ltr' }}
                        />
                      </div>
                      <button
                        onClick={() => setChannelEnabled(p => ({ ...p, [ch]: !p[ch] }))}
                        className={`relative w-10 h-5 rounded-full transition-all duration-300 flex-shrink-0
                          ${enabled ? 'bg-emerald-500' : 'bg-slate-200'}`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-300
                          ${enabled ? 'start-5' : 'start-0.5'}`} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {pushed && (
            <div className="mb-4 flex items-center gap-3 bg-emerald-50 border border-emerald-100 text-emerald-700 px-4 py-3 rounded-xl text-sm font-semibold">
              <Icons.check size={16} />
              {lang === 'ar'
                ? `تم إرسال الأسعار إلى ${activeCount} قنوات`
                : `Rates pushed to ${activeCount} channel${activeCount !== 1 ? 's' : ''} for ${selectedUnit.name}`}
            </div>
          )}

          <button
            onClick={handlePush}
            disabled={pushing || activeCount === 0}
            className="w-full btn-primary justify-center py-3.5 text-base disabled:opacity-50"
          >
            {pushing ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {lang === 'ar' ? 'جارٍ الإرسال…' : 'Pushing rates…'}</>
            ) : (
              <><Icons.send size={16} />
              {lang === 'ar'
                ? `إرسال السعر إلى ${activeCount} قنوات`
                : `Push rates to ${activeCount} channel${activeCount !== 1 ? 's' : ''}`
              }</>
            )}
          </button>
        </>
      )}

      {/* Placeholder when no unit selected */}
      {!selectedUnit && (
        <div className="flex flex-col items-center gap-3 py-10 text-center border-2 border-dashed border-slate-100 rounded-2xl">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
            <Icons.building size={20} className="text-slate-300" />
          </div>
          <p className="text-sm font-semibold text-slate-400">
            {lang === 'ar' ? 'اختر وحدة لبدء التسعير' : 'Select a unit to start pricing'}
          </p>
          <p className="text-xs text-slate-300 max-w-48 leading-relaxed">
            {lang === 'ar'
              ? 'سيتم تحميل أسعار الوحدة تلقائياً لكل قناة'
              : 'Current rates per channel will auto-load when you pick a unit'}
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────────────── */
export default function ChannelsPage() {
  const { t, lang } = useLang();
  const { markDone } = useJourney();

  const [syncState, setSyncState] = useState<Record<string, 'idle' | 'syncing' | 'done'>>({});
  const [killSwitch, setKillSwitch] = useState<Record<string, boolean>>({
    'Booking.com': true, 'Airbnb': true, 'Gathern': true,
  });
  const [killAnimating, setKillAnimating] = useState<Record<string, boolean>>({});

  const toggleKill = (channel: string) => {
    setKillAnimating(s => ({ ...s, [channel]: true }));
    setTimeout(() => {
      setKillSwitch(s => ({ ...s, [channel]: !s[channel] }));
      setKillAnimating(s => ({ ...s, [channel]: false }));
    }, 300);
  };

  const forceSync = async (channelName: string) => {
    setSyncState(s => ({ ...s, [channelName]: 'syncing' }));
    await new Promise(r => setTimeout(r, 1600));
    setSyncState(s => ({ ...s, [channelName]: 'done' }));
    markDone(3);
    setTimeout(() => setSyncState(s => ({ ...s, [channelName]: 'idle' })), 3000);
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{t.channels.title}</h1>
        <p className="text-sm text-slate-400 mt-1">{t.channels.subtitle}</p>
      </div>

      {/* Priority badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          {lang === 'ar' ? 'الأولوية' : 'Priority'}:
        </span>
        {['Booking.com', 'Gathern'].map(ch => (
          <span key={ch} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border-2 border-blue-200 bg-blue-50 text-blue-700">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" /> {ch}
          </span>
        ))}
        <span className="text-xs text-slate-400">
          {lang === 'ar'
            ? '— اتصال API مباشر · مزامنة ثنائية الاتجاه'
            : '— Direct API bridge · 2-way sync (availability, pricing, insurance fee)'}
        </span>
      </div>

      {/* Channel cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {CHANNEL_SYNC_STATUS.map(ch => {
          const isPriority = ch.channel === 'Booking.com' || ch.channel === 'Gathern';
          const isActive = killSwitch[ch.channel] !== false;
          return (
            <div
              key={ch.channel}
              className={`card p-5 transition-all ${isPriority ? 'ring-2 ring-blue-500/20' : ''} ${!isActive ? 'opacity-70' : ''}`}
            >
              {isPriority && (
                <div className="flex items-center gap-1 mb-2 -mt-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                    {lang === 'ar' ? 'أولوية' : 'Priority'}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 mb-5">
                <ChannelLogo channel={ch.channel} isActive={isActive} />
                <div className="flex-1">
                  <p className={`font-bold text-base leading-none ${isActive ? ch.color : 'text-slate-400'}`}>
                    {ch.channel}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                    <span className="text-xs text-slate-400 font-medium">
                      {isActive ? t.channels.connected : (lang === 'ar' ? 'متوقف' : 'Paused')}
                    </span>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${ch.syncMethod.includes('Webhook') ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                  {ch.syncMethod}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: t.channels.today,   value: ch.bookingsToday, hi: false },
                  { label: t.channels.pending, value: ch.pending,       hi: ch.pending > 0 },
                  { label: t.channels.failed,  value: ch.failed,        hi: ch.failed > 0 },
                ].map(s => (
                  <div key={s.label} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                    <p className={`text-xl font-extrabold leading-none ${s.hi ? 'text-red-500' : 'text-slate-800'}`}>{s.value}</p>
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold uppercase tracking-wide">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                <p className="text-xs text-slate-400">
                  {t.channels.lastSync}:{' '}
                  <span className="font-semibold text-slate-600">
                    {syncState[ch.channel] === 'done' ? (lang === 'ar' ? 'الآن' : 'just now') : ch.lastSync}
                  </span>
                </p>
                <button
                  onClick={() => forceSync(ch.channel)}
                  disabled={syncState[ch.channel] === 'syncing'}
                  className="flex items-center gap-1 text-xs font-bold transition-colors disabled:opacity-60 text-blue-600 hover:text-blue-700"
                >
                  {syncState[ch.channel] === 'syncing' ? (
                    <><span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> {lang === 'ar' ? 'جارٍ…' : 'Syncing…'}</>
                  ) : syncState[ch.channel] === 'done' ? (
                    <><Icons.check size={12} className="text-emerald-500" /> {lang === 'ar' ? 'تم' : 'Synced'}</>
                  ) : (
                    <><Icons.refresh size={12} /> {t.channels.forceSync}</>
                  )}
                </button>
              </div>

              {isPriority && (
                <div className="mt-3 pt-3 border-t border-slate-50 flex items-center gap-2">
                  <Icons.shield size={12} className="text-violet-500" />
                  <span className="text-[10px] text-violet-600 font-semibold">
                    {lang === 'ar' ? 'مزامنة رسوم التأمين مفعّلة' : 'Insurance fee sync active'}
                  </span>
                </div>
              )}

              {/* Kill Switch */}
              <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-600">
                    {lang === 'ar' ? 'مفتاح الإيقاف' : 'Kill Switch'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {killSwitch[ch.channel]
                      ? (lang === 'ar' ? 'مفتوح — يقبل الحجوزات' : 'Open — accepting bookings')
                      : (lang === 'ar' ? 'مغلق — لا حجوزات جديدة' : 'Closed — no new bookings')}
                  </p>
                </div>
                <button
                  onClick={() => toggleKill(ch.channel)}
                  disabled={killAnimating[ch.channel]}
                  className={`relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 focus:outline-none
                    ${killSwitch[ch.channel] ? 'bg-emerald-500' : 'bg-slate-300'}
                    ${killAnimating[ch.channel] ? 'opacity-60' : ''}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300
                    ${killSwitch[ch.channel] ? 'start-6' : 'start-0.5'}`} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rate Parity Manager — unit-specific */}
      <RateParityManager />

      {/* Revenue breakdown */}
      <div className="card p-5">
        <p className="font-bold text-slate-900 mb-4">{t.channels.revenueTitle}</p>
        <div className="space-y-4">
          {CHANNEL_BREAKDOWN.map(ch => (
            <div key={ch.channel} className="flex items-center gap-4">
              <div className="w-28 flex items-center gap-2 flex-shrink-0">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ch.color }} />
                <span className="text-sm font-semibold text-slate-700">{ch.channel}</span>
              </div>
              <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden" style={{ direction: 'ltr' }}>
                <div className="h-2.5 rounded-full" style={{ width: `${ch.share}%`, background: ch.color }} />
              </div>
              <div className="text-end w-48 flex-shrink-0">
                <p className="text-sm font-bold text-slate-900">{t.common.sar} {ch.revenue.toLocaleString()}</p>
                <p className="text-xs text-red-400 font-medium">−{t.common.sar} {ch.commission.toLocaleString()} {t.channels.commission}</p>
              </div>
              <span className="w-10 text-end text-sm font-bold text-slate-500 flex-shrink-0">{ch.share}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
