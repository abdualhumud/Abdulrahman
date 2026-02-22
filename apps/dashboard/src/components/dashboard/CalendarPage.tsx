'use client';

import { useState } from 'react';
import { Icons } from '@/lib/icons';
import { useLang } from '@/lib/language-context';
import { CALENDAR_EVENTS, RECENT_BOOKINGS, INSURANCE_RECORDS, CLEANING_REQUESTS } from '@/lib/mock-data';

const DAYS  = Array.from({ length: 28 }, (_, i) => i + 1);
const TODAY = 22;

const UNITS = [
  'Riyadh — Unit A', 'Riyadh — Unit B', 'Riyadh — Unit C',
  'Jeddah Villa', 'Diriyah — C1', 'Diriyah — C2', 'AlUla Studio',
];

const CHANNELS: Record<string, { bg: string; text: string; dot: string }> = {
  'Booking.com': { bg: '#EEF2FF', text: '#1D4ED8', dot: '#003580' },
  'Airbnb':      { bg: '#FFF1F2', text: '#BE123C', dot: '#FF5A5F' },
  'Gathern':     { bg: '#F0FDF4', text: '#15803D', dot: '#00a651' },
  'Direct':      { bg: '#FFFBEB', text: '#B45309', dot: '#F59E0B' },
};

type CalEvent = typeof CALENDAR_EVENTS[number];

export default function CalendarPage() {
  const { t, lang } = useLang();
  const [selected, setSelected] = useState<CalEvent | null>(null);

  const selectedBooking = selected
    ? RECENT_BOOKINGS.find(b => b.guest === selected.guest)
    : null;

  const selectedInsurance = selectedBooking
    ? INSURANCE_RECORDS.find(r => r.bookingId === selectedBooking.id)
    : null;

  const selectedCleaning = selectedBooking
    ? CLEANING_REQUESTS.find(r => r.bookingId === selectedBooking.id)
    : null;

  const INS_STYLE: Record<string, string> = {
    HELD:               'bg-blue-100 text-blue-700',
    PENDING_INSPECTION: 'bg-amber-100 text-amber-700',
    RELEASED:           'bg-emerald-100 text-emerald-700',
  };
  const CLEAN_STYLE: Record<string, string> = {
    PENDING:         'bg-amber-100 text-amber-700',
    ASSIGNED:        'bg-blue-100 text-blue-700',
    IN_PROGRESS:     'bg-purple-100 text-purple-700',
    COMPLETED:       'bg-orange-100 text-orange-700',
    INSPECTION_DONE: 'bg-emerald-100 text-emerald-700',
  };

  const chStyle = selected ? (CHANNELS[selected.channel] ?? { bg: '#F1F5F9', text: '#475569', dot: '#94A3B8' }) : null;

  return (
    <div className="flex h-full overflow-hidden" style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}>

      {/* ── Main calendar area ────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 overflow-auto p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{t.calendar.title}</h1>
            <p className="text-sm text-slate-400 mt-1">{t.calendar.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-ghost py-2 px-3 text-xs"><Icons.chevronLeft size={14} /></button>
            <div className="bg-blue-600 text-white text-sm font-bold px-4 py-2 rounded-xl">Feb 2026</div>
            <button className="btn-ghost py-2 px-3 text-xs"><Icons.chevronRight size={14} /></button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {Object.entries(CHANNELS).map(([name, s]) => (
            <span key={name}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border"
              style={{ background: s.bg, color: s.text, borderColor: s.dot + '40' }}>
              <span className="w-2 h-2 rounded-full" style={{ background: s.dot }} />
              {name}
            </span>
          ))}
          <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            {t.calendar.today} {TODAY}
          </span>
        </div>

        {/* Calendar grid always LTR */}
        <div className="card overflow-x-auto" style={{ direction: 'ltr' }}>
          <table className="w-full border-collapse" style={{ minWidth: 920 }}>
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider w-36 bg-slate-50 sticky left-0 z-10">
                  {t.calendar.unit}
                </th>
                {DAYS.map(d => (
                  <th key={d} className={`text-center py-3 text-xs font-semibold w-9
                    ${d === TODAY ? 'bg-blue-50 text-blue-600' : 'text-slate-400'}`}>
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {UNITS.map((unit, ui) => (
                <tr key={unit} className={`border-b border-slate-50 ${ui % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
                  <td className="px-4 py-0 text-xs font-semibold text-slate-700 bg-inherit sticky left-0 z-10 border-r border-slate-100 h-11 whitespace-nowrap">
                    {unit}
                  </td>
                  {DAYS.map(day => {
                    const ev    = CALENDAR_EVENTS.find(e => e.unit === unit && day >= e.start && day < e.end);
                    const start = ev && day === ev.start;
                    const end   = ev && day === ev.end - 1;
                    const ch    = ev ? (CHANNELS[ev.channel] ?? { bg: '#E2E8F0', text: '#475569', dot: '#94A3B8' }) : null;
                    const isSelected = selected?.id === ev?.id;
                    return (
                      <td key={day} className={`relative h-11 border-r border-slate-50 ${day === TODAY ? 'bg-blue-50/30' : ''}`}>
                        {ev && ch && (
                          <div
                            onClick={() => setSelected(isSelected ? null : ev)}
                            title={`${ev.channel}: ${ev.guest}`}
                            className={`absolute inset-y-1.5 cursor-pointer z-10 flex items-center transition-all
                              ${start ? 'left-1 rounded-l-lg' : 'left-0'}
                              ${end   ? 'right-1 rounded-r-lg' : 'right-0'}
                              ${isSelected ? 'ring-2 ring-white ring-offset-1' : 'hover:brightness-110'}`}
                            style={{ background: ch.dot, opacity: isSelected ? 1 : 0.88 }}
                          >
                            {start && (
                              <span className="px-2 text-white text-[10px] font-bold truncate leading-none whitespace-nowrap">
                                {ev.guest.split(' ')[0]}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: t.calendar.blockMaint,  desc: t.calendar.blockMaintDesc, Icon: Icons.refresh, style: 'bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700',   iconBg: 'bg-slate-200 text-slate-600' },
            { label: t.calendar.addBooking,  desc: t.calendar.addBookingDesc, Icon: Icons.plus,    style: 'bg-blue-50 border border-blue-100 hover:bg-blue-100 text-blue-700',       iconBg: 'bg-blue-200 text-blue-700' },
            { label: t.calendar.openDates,   desc: t.calendar.openDatesDesc,  Icon: Icons.check,   style: 'bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 text-emerald-700', iconBg: 'bg-emerald-200 text-emerald-700' },
          ].map(a => (
            <button key={a.label} className={`rounded-2xl p-5 text-start transition-all ${a.style}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${a.iconBg}`}>
                <a.Icon size={17} />
              </div>
              <p className="font-bold text-sm">{a.label}</p>
              <p className="text-xs opacity-60 mt-1 leading-relaxed">{a.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Booking Detail Side Panel ─────────────────────────────────── */}
      {selected && chStyle && (
        <div className="w-72 flex-shrink-0 bg-white border-s border-slate-200 flex flex-col overflow-hidden shadow-lg">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between"
            style={{ background: chStyle.bg }}>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: chStyle.dot }} />
              <span className="text-xs font-bold" style={{ color: chStyle.text }}>{selected.channel}</span>
            </div>
            <button onClick={() => setSelected(null)}
              className="w-7 h-7 rounded-lg bg-white/70 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors">
              <Icons.x size={14} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Guest */}
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">{t.table.guest}</p>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-extrabold flex-shrink-0 bg-indigo-50 text-indigo-600">
                  {selected.guest.charAt(0)}
                </div>
                <p className="font-bold text-slate-900">{selected.guest}</p>
              </div>
            </div>

            {/* Unit */}
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">{t.calendar.unit}</p>
              <div className="flex items-center gap-1.5">
                <Icons.building size={13} className="text-slate-400" />
                <p className="text-sm font-semibold text-slate-800">{selected.unit}</p>
              </div>
            </div>

            {/* Dates */}
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">{t.table.dates}</p>
              <div className="bg-slate-50 rounded-xl px-3 py-2 space-y-1" style={{ direction: 'ltr' }}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">{t.table.checkIn}</span>
                  <span className="font-bold text-slate-800">Feb {selected.start}, 2026</span>
                </div>
                <div className="h-px bg-slate-200" />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">{t.table.checkOut}</span>
                  <span className="font-bold text-slate-800">Feb {selected.end}, 2026</span>
                </div>
                <div className="h-px bg-slate-200" />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">{t.table.nights}</span>
                  <span className="font-bold text-slate-800">{selected.end - selected.start}n</span>
                </div>
              </div>
            </div>

            {/* Booking details */}
            {selectedBooking && (
              <>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">{t.table.amount}</p>
                  <p className="text-lg font-extrabold text-slate-900" style={{ direction: 'ltr' }}>
                    SAR {selectedBooking.amount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">{t.table.status}</p>
                  <span className={`badge text-xs ${
                    selectedBooking.status === 'CONFIRMED'   ? 'bg-emerald-100 text-emerald-700' :
                    selectedBooking.status === 'CHECKED_IN'  ? 'bg-blue-100 text-blue-700' :
                    selectedBooking.status === 'CHECKED_OUT' ? 'bg-slate-100 text-slate-500' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {t.status[selectedBooking.status as keyof typeof t.status] ?? selectedBooking.status}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">{t.table.booking}</p>
                  <p className="text-xs font-mono text-slate-500">{selectedBooking.id}</p>
                </div>
              </>
            )}

            {/* Insurance Status */}
            {selectedInsurance && (
              <div className="pt-3 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Icons.shield size={10} /> {t.insurance.title}
                </p>
                <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Provider</span>
                    <span className="text-xs font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full">
                      {selectedInsurance.provider}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Deposit</span>
                    <span className="text-xs font-bold text-slate-900" style={{ direction: 'ltr' }}>
                      SAR {selectedInsurance.depositAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Status</span>
                    <span className={`badge text-[10px] ${INS_STYLE[selectedInsurance.status] ?? ''}`}>
                      {selectedInsurance.status === 'HELD' ? t.insurance.depositHeld :
                       selectedInsurance.status === 'RELEASED' ? t.insurance.depositReleased :
                       t.insurance.depositPending}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Cleaning History */}
            {selectedCleaning && (
              <div className="pt-3 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Icons.cleaning size={10} /> {t.cleaning.title}
                </p>
                <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Status</span>
                    <span className={`badge text-[10px] ${CLEAN_STYLE[selectedCleaning.status] ?? ''}`}>
                      {t.cleaning[`status_${selectedCleaning.status}` as keyof typeof t.cleaning]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Provider</span>
                    <span className="text-xs font-semibold text-slate-700">
                      {selectedCleaning.providerType === 'INTERNAL' ? t.cleaning.internal : t.cleaning.external}
                    </span>
                  </div>
                  {/* Last chat message */}
                  {selectedCleaning.messages.length > 0 && (
                    <div className="mt-1 px-2 py-1.5 bg-white rounded-lg border border-slate-100">
                      <p className="text-[10px] text-slate-400 mb-0.5">
                        {selectedCleaning.messages[selectedCleaning.messages.length - 1].from}
                      </p>
                      <p className="text-[11px] text-slate-700 leading-snug line-clamp-2">
                        {selectedCleaning.messages[selectedCleaning.messages.length - 1].text}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer action */}
          <div className="px-5 py-4 border-t border-slate-100">
            <button className="w-full btn-primary text-sm justify-center">
              <Icons.eye size={14} /> {t.bookings.view}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
