'use client';

import { useState } from 'react';
import { Icons } from '@/lib/icons';
import { useLang } from '@/lib/language-context';
import { UNITS } from '@/lib/mock-data';
import ChannelLogo from './ChannelLogo';

const CHANNEL_COLORS: Record<string, { color: string; bg: string }> = {
  'Booking.com': { color: '#003580', bg: '#EEF2FF' },
  'Airbnb':      { color: '#FF385C', bg: '#FFF1F2' },
  'Gathern':     { color: '#00A651', bg: '#F0FDF4' },
  'Agoda':       { color: '#E31837', bg: '#FFF5F5' },
  'Expedia':     { color: '#1C3D7D', bg: '#EEF2FF' },
};

export default function RateParityManager() {
  const { t, lang } = useLang();
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [unitSearch,     setUnitSearch]     = useState('');
  const [showDropdown,   setShowDropdown]   = useState(false);
  const [dateFrom,       setDateFrom]       = useState('2026-03-01');
  const [dateTo,         setDateTo]         = useState('2026-03-31');
  const [minStay,        setMinStay]        = useState('2');
  const [channelPrices,  setChannelPrices]  = useState<Record<string, string>>({
    'Booking.com': '', 'Airbnb': '', 'Gathern': '', 'Agoda': '', 'Expedia': '',
  });
  const [channelEnabled, setChannelEnabled] = useState<Record<string, boolean>>({
    'Booking.com': true, 'Airbnb': true, 'Gathern': true, 'Agoda': true, 'Expedia': true,
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
    const price = String(unit.basePrice);
    setChannelPrices({ 'Booking.com': price, 'Airbnb': price, 'Gathern': price, 'Agoda': price, 'Expedia': price });
    setChannelEnabled({
      'Booking.com': unit.channels.includes('Booking.com'),
      'Airbnb':      unit.channels.includes('Airbnb'),
      'Gathern':     unit.channels.includes('Gathern'),
      'Agoda':       unit.channels.includes('Agoda'),
      'Expedia':     unit.channels.includes('Expedia'),
    });
  };

  const activeCount = Object.values(channelEnabled).filter(Boolean).length;

  const handlePush = async () => {
    if (!selectedUnit) return;
    setPushing(true);
    await new Promise(r => setTimeout(r, 1800));
    setPushing(false);
    setPushed(true);
    setTimeout(() => setPushed(false), 4000);
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

      {/* Unit selector */}
      <div className="mb-5">
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          {lang === 'ar' ? '① اختر وحدة محددة' : '① Select Specific Unit'}
        </label>
        <div className="relative">
          <div className="relative">
            <Icons.building size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={unitSearch}
              onChange={e => { setUnitSearch(e.target.value); setShowDropdown(true); setSelectedUnitId(''); }}
              onFocus={() => setShowDropdown(true)}
              placeholder={lang === 'ar' ? 'ابحث عن وحدة…' : 'Search for a unit…'}
              className="input w-full ps-9 pe-9" />
            <Icons.chevronDown size={14} className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          {showDropdown && filteredUnits.length > 0 && (
            <div className="absolute z-30 top-full mt-1 w-full bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
              {filteredUnits.map(unit => (
                <button key={unit.id} onClick={() => handleUnitSelect(unit)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-start border-b border-slate-50 last:border-0">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: unit.color + '20', color: unit.color }}>
                    <Icons.building size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{lang === 'ar' ? (unit.nameAr ?? unit.name) : unit.name}</p>
                    <p className="text-xs text-slate-400">{unit.city} · SAR {unit.basePrice.toLocaleString()}/night</p>
                  </div>
                  <span className={`badge text-[10px] flex-shrink-0 ${unit.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{unit.status}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {showDropdown && <div className="fixed inset-0 z-20" onClick={() => setShowDropdown(false)} />}
      </div>

      {selectedUnit ? (
        <>
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: selectedUnit.color + '25', color: selectedUnit.color }}>
                <Icons.building size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 truncate">{lang === 'ar' ? (selectedUnit.nameAr ?? selectedUnit.name) : selectedUnit.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{selectedUnit.beds}BR / {selectedUnit.baths}BA · {selectedUnit.city} · {selectedUnit.district}</p>
              </div>
              <div className="text-end flex-shrink-0">
                <p className="text-xs text-slate-400">Base Rate</p>
                <p className="font-extrabold text-slate-900 text-sm" style={{ direction: 'ltr' }}>SAR {selectedUnit.basePrice.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            {[
              { label: t.channels.fromDate, value: dateFrom, set: setDateFrom },
              { label: t.channels.toDate,   value: dateTo,   set: setDateTo },
              { label: t.channels.minStay,  value: minStay,  set: setMinStay, type: 'number' },
            ].map(f => (
              <div key={f.label}>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{f.label}</label>
                <input type={f.type ?? 'date'} value={f.value} onChange={e => f.set(e.target.value)}
                  min={f.type === 'number' ? '1' : undefined}
                  className="input" style={{ direction: 'ltr' }} />
              </div>
            ))}
          </div>

          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              {lang === 'ar' ? '② سعر مخصص لكل قناة' : '② Per-Channel Nightly Rate (SAR)'}
            </label>
            <div className="space-y-3">
              {(['Booking.com', 'Airbnb', 'Gathern', 'Agoda', 'Expedia'] as const).map(ch => {
                const enabled     = channelEnabled[ch];
                const isOnChannel = selectedUnit.channels.includes(ch);
                const cc          = CHANNEL_COLORS[ch];
                return (
                  <div key={ch}
                    className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${enabled ? 'border-current' : 'border-slate-100 bg-slate-50 opacity-60'}`}
                    style={{ borderColor: enabled ? cc.color + '40' : undefined, background: enabled ? cc.bg : undefined }}>
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
                        <input type="number" value={channelPrices[ch]}
                          onChange={e => setChannelPrices(p => ({ ...p, [ch]: e.target.value }))}
                          disabled={!enabled} className="input ps-10 w-28 text-sm font-bold disabled:opacity-50" style={{ direction: 'ltr' }} />
                      </div>
                      <button onClick={() => setChannelEnabled(p => ({ ...p, [ch]: !p[ch] }))}
                        className={`relative w-10 h-5 rounded-full transition-all duration-300 flex-shrink-0 ${enabled ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${enabled ? 'start-5' : 'start-0.5'}`} />
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

          <button onClick={handlePush} disabled={pushing || activeCount === 0}
            className="w-full btn-primary justify-center py-3.5 text-base disabled:opacity-50">
            {pushing
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{lang === 'ar' ? 'جارٍ الإرسال…' : 'Pushing rates…'}</>
              : <><Icons.send size={16} />{lang === 'ar' ? `إرسال السعر إلى ${activeCount} قنوات` : `Push rates to ${activeCount} channel${activeCount !== 1 ? 's' : ''}`}</>}
          </button>
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 py-10 text-center border-2 border-dashed border-slate-100 rounded-2xl">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
            <Icons.building size={20} className="text-slate-300" />
          </div>
          <p className="text-sm font-semibold text-slate-400">{lang === 'ar' ? 'اختر وحدة لبدء التسعير' : 'Select a unit to start pricing'}</p>
          <p className="text-xs text-slate-300 max-w-48 leading-relaxed">
            {lang === 'ar' ? 'سيتم تحميل أسعار الوحدة تلقائياً لكل قناة' : 'Current rates per channel will auto-load when you pick a unit'}
          </p>
        </div>
      )}
    </div>
  );
}
