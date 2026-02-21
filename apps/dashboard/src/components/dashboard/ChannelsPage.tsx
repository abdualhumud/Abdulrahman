'use client';

import { useState } from 'react';
import { Icons } from '@/lib/icons';
import { useLang } from '@/lib/language-context';
import { CHANNEL_SYNC_STATUS, CHANNEL_BREAKDOWN } from '@/lib/mock-data';

export default function ChannelsPage() {
  const { t } = useLang();
  const [pushing, setPushing] = useState(false);
  const [pushed,  setPushed]  = useState(false);
  const [form, setForm] = useState({
    dateFrom: '2026-03-01', dateTo: '2026-03-31',
    price: '1350', minStay: '2',
    channels: { booking: true, airbnb: true, gathern: true },
  });

  const activeCount = Object.values(form.channels).filter(Boolean).length;

  const handlePush = async () => {
    setPushing(true);
    await new Promise(r => setTimeout(r, 1800));
    setPushing(false); setPushed(true);
    setTimeout(() => setPushed(false), 4000);
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{t.channels.title}</h1>
        <p className="text-sm text-slate-400 mt-1">{t.channels.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {CHANNEL_SYNC_STATUS.map(ch => (
          <div key={ch.channel} className="card p-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: ch.bg }}>
                {ch.logo}
              </div>
              <div className="flex-1">
                <p className={`font-bold text-base leading-none ${ch.color}`}>{ch.channel}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                  <span className="text-xs text-slate-400 font-medium">{t.channels.connected}</span>
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
                {t.channels.lastSync}: <span className="font-semibold text-slate-600">{ch.lastSync}</span>
              </p>
              <button className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">
                <Icons.refresh size={12} /> {t.channels.forceSync}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Rate Parity */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
            <Icons.financials size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="font-bold text-slate-900 text-lg leading-none">{t.channels.rateManager}</p>
            <p className="text-xs text-slate-400 mt-0.5">{t.channels.rateDesc}</p>
          </div>
          <span className="ms-auto badge bg-amber-50 text-amber-600 border border-amber-100">{t.channels.multiPush}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          {[
            { label: t.channels.fromDate,    key: 'dateFrom', type: 'date',   value: form.dateFrom },
            { label: t.channels.toDate,      key: 'dateTo',   type: 'date',   value: form.dateTo   },
            { label: t.channels.nightlyRate, key: 'price',    type: 'number', value: form.price    },
            { label: t.channels.minStay,     key: 'minStay',  type: 'number', value: form.minStay  },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{f.label}</label>
              <input type={f.type} value={f.value}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                className="input" style={{ direction: 'ltr' }} />
            </div>
          ))}
        </div>

        <div className="mb-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{t.channels.targetChannels}</p>
          <div className="flex flex-wrap gap-3">
            {([
              { key: 'booking', label: 'Booking.com', color: '#003580', bg: '#EEF2FF' },
              { key: 'airbnb',  label: 'Airbnb',      color: '#FF5A5F', bg: '#FFF1F2' },
              { key: 'gathern', label: 'Gathern',      color: '#00a651', bg: '#F0FDF4' },
            ] as const).map(ch => {
              const checked = form.channels[ch.key as keyof typeof form.channels];
              return (
                <label key={ch.key}
                  className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all select-none"
                  style={{ borderColor: checked ? ch.color : '#E2E8F0', background: checked ? ch.bg : '#F8FAFC' }}>
                  <input type="checkbox" checked={checked}
                    onChange={e => setForm(p => ({ ...p, channels: { ...p.channels, [ch.key]: e.target.checked } }))}
                    className="sr-only" />
                  <span className="w-4 h-4 rounded flex items-center justify-center border-2 flex-shrink-0 transition-all"
                    style={{ borderColor: ch.color, background: checked ? ch.color : 'transparent' }}>
                    {checked && <Icons.check size={11} className="text-white" />}
                  </span>
                  <span className="text-sm font-bold" style={{ color: ch.color }}>● {ch.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {pushed && (
          <div className="mb-4 flex items-center gap-3 bg-emerald-50 border border-emerald-100 text-emerald-700 px-4 py-3 rounded-xl text-sm font-semibold">
            <Icons.check size={16} />
            {t.channels.pushSuccess} {activeCount} {t.channels.channels}
          </div>
        )}

        <button onClick={handlePush} disabled={pushing || activeCount === 0}
          className="w-full btn-primary justify-center py-3.5 text-base disabled:opacity-50">
          {pushing ? (
            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {activeCount} {t.channels.channels2}…</>
          ) : (
            <><Icons.send size={16} /> {t.channels.pushBtn} {t.common.sar} {parseInt(form.price || '0').toLocaleString()} {t.channels.nightTo} {activeCount} {t.channels.channels2}</>
          )}
        </button>
      </div>

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
