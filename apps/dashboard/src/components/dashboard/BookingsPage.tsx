'use client';

import { useState } from 'react';
import { Icons } from '@/lib/icons';
import { useLang } from '@/lib/language-context';
import { useMode } from '@/lib/mode-context';
import { RECENT_BOOKINGS, INSURANCE_RECORDS } from '@/lib/mock-data';
import PaymentLinkModal from './PaymentLinkModal';

const STATUS_STYLE: Record<string, string> = {
  CONFIRMED:   'bg-emerald-50 text-emerald-700 border border-emerald-200',
  CHECKED_IN:  'bg-blue-50 text-blue-700 border border-blue-200',
  CHECKED_OUT: 'bg-slate-100 text-slate-500 border border-slate-200',
  PENDING:     'bg-amber-50 text-amber-700 border border-amber-200',
};

/* ── Booking Detail Slide-over ─────────────────────────────────────── */
function BookingDetailModal({
  booking,
  onClose,
}: {
  booking: typeof RECENT_BOOKINGS[number];
  onClose: () => void;
}) {
  const { t, lang } = useLang();
  const ins = INSURANCE_RECORDS.find(r => r.bookingId === booking.id);

  const INS_STYLE: Record<string, string> = {
    HELD:               'bg-blue-50 text-blue-700 border border-blue-200',
    PENDING_INSPECTION: 'bg-amber-50 text-amber-700 border border-amber-200',
    RELEASED:           'bg-emerald-50 text-emerald-700 border border-emerald-200',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white h-full w-full max-w-sm shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'slideIn 0.25s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <Icons.bookings size={16} className="text-blue-600" />
            </div>
            <div>
              <p className="font-extrabold text-slate-900 leading-none text-sm">
                {lang === 'ar' ? 'تفاصيل الحجز' : 'Booking Details'}
              </p>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">{booking.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors"
          >
            <Icons.x size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Guest profile */}
          <div className="flex items-center gap-3 bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-xl flex-shrink-0"
              style={{ background: booking.channelColor + '20', color: booking.channelColor }}
            >
              {booking.guest.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-slate-900 leading-none">{booking.guest}</p>
              <p className="text-xs text-slate-400 mt-1">{booking.property}</p>
              <p className="text-xs text-slate-400">{booking.unit}</p>
            </div>
          </div>

          {/* Booking info */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              {lang === 'ar' ? 'معلومات الحجز' : 'Booking Info'}
            </p>
            <div className="bg-slate-50 rounded-2xl divide-y divide-slate-100 border border-slate-100" style={{ direction: 'ltr' }}>
              {[
                { label: lang === 'ar' ? 'القناة' : 'Channel',    value: booking.channel,    color: booking.channelColor },
                { label: lang === 'ar' ? 'الوصول' : 'Check-in',   value: booking.checkIn },
                { label: lang === 'ar' ? 'المغادرة' : 'Check-out', value: booking.checkOut },
                { label: lang === 'ar' ? 'الليالي' : 'Nights',     value: String(booking.nights) },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center px-4 py-2.5 text-xs">
                  <span className="text-slate-500">{row.label}</span>
                  <span className="font-bold text-slate-900" style={row.color ? { color: row.color } : {}}>
                    {row.color ? `● ${row.value}` : row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Payment status */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              {lang === 'ar' ? 'حالة الدفع' : 'Payment'}
            </p>
            <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-700 font-semibold mb-0.5">
                  {lang === 'ar' ? 'المبلغ الإجمالي' : 'Total Amount'}
                </p>
                <p className="text-xl font-extrabold text-emerald-900" style={{ direction: 'ltr' }}>
                  SAR {booking.amount.toLocaleString()}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Icons.financials size={18} className="text-emerald-600" />
              </div>
            </div>
          </div>

          {/* Booking status */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              {lang === 'ar' ? 'حالة الحجز' : 'Status'}
            </p>
            <span className={`badge text-xs ${STATUS_STYLE[booking.status] ?? 'bg-slate-100 text-slate-500'}`}>
              {t.status[booking.status as keyof typeof t.status] ?? booking.status}
            </span>
          </div>

          {/* Insurance */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              {t.insurance.title}
            </p>
            {ins ? (
              <div className="bg-slate-50 rounded-2xl border border-slate-100 divide-y divide-slate-100" style={{ direction: 'ltr' }}>
                <div className="flex justify-between items-center px-4 py-2.5 text-xs">
                  <span className="text-slate-500">{lang === 'ar' ? 'المزود' : 'Provider'}</span>
                  <span className="font-bold text-violet-700">{ins.provider}</span>
                </div>
                <div className="flex justify-between items-center px-4 py-2.5 text-xs">
                  <span className="text-slate-500">{lang === 'ar' ? 'مبلغ التأمين' : 'Deposit'}</span>
                  <span className="font-bold text-slate-900">SAR {ins.depositAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center px-4 py-2.5 text-xs">
                  <span className="text-slate-500">{lang === 'ar' ? 'الحالة' : 'Status'}</span>
                  <span className={`badge text-[10px] ${INS_STYLE[ins.status] ?? INS_STYLE.HELD}`}>
                    <Icons.shield size={10} className="inline me-0.5" />
                    {ins.status === 'HELD' ? t.insurance.depositHeld :
                     ins.status === 'RELEASED' ? t.insurance.depositReleased : t.insurance.depositPending}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic px-1">
                {lang === 'ar' ? 'لا يوجد سجل تأمين' : 'No insurance record'}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 p-4 flex-shrink-0 bg-white">
          <button onClick={onClose} className="btn-ghost w-full justify-center py-2.5 text-sm">
            {lang === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}

interface Props {
  onCheckoutCleaning?: (unitName: string, bookingId: string) => void;
}

export default function BookingsPage({ onCheckoutCleaning }: Props) {
  const { t } = useLang();
  const { isDemo } = useMode();
  // Fresh-start: production/staging users begin with zero bookings
  const allBookings = isDemo ? RECENT_BOOKINGS : ([] as typeof RECENT_BOOKINGS);
  const STATUSES = ['ALL', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'PENDING'];
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});
  const [justCheckedOut, setJustCheckedOut] = useState<string | null>(null);
  const [viewBooking, setViewBooking] = useState<typeof RECENT_BOOKINGS[number] | null>(null);
  const [payLinkBooking, setPayLinkBooking] = useState<typeof RECENT_BOOKINGS[number] | null>(null);

  const getStatus = (b: typeof RECENT_BOOKINGS[number]) =>
    localStatuses[b.id] ?? b.status;

  const rows = allBookings.filter(b => {
    const st = getStatus(b);
    const s = filter === 'ALL' || st === filter;
    const q = !search ||
      b.guest.toLowerCase().includes(search.toLowerCase()) ||
      b.id.toLowerCase().includes(search.toLowerCase()) ||
      b.property.toLowerCase().includes(search.toLowerCase());
    return s && q;
  });

  const stats = {
    confirmed: allBookings.filter(b => getStatus(b) === 'CONFIRMED').length,
    checkedIn: allBookings.filter(b => getStatus(b) === 'CHECKED_IN').length,
    pending:   allBookings.filter(b => getStatus(b) === 'PENDING').length,
    revenue:   allBookings.reduce((s, b) => s + b.amount, 0),
  };

  const filterLabel = (s: string) => {
    if (s === 'ALL') return t.common.all;
    return t.status[s as keyof typeof t.status] ?? s.replace('_', ' ');
  };

  function handleCheckOut(b: typeof RECENT_BOOKINGS[number]) {
    setLocalStatuses(prev => ({ ...prev, [b.id]: 'CHECKED_OUT' }));
    setJustCheckedOut(b.id);
    // Auto-trigger cleaning request notification
    if (onCheckoutCleaning) {
      onCheckoutCleaning(b.unit, b.id);
    }
    setTimeout(() => setJustCheckedOut(null), 3000);
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{t.bookings.title}</h1>
          <p className="text-sm text-slate-400 mt-1">{allBookings.length} {t.bookings.subtitle}</p>
        </div>
        <button className="btn-primary"><Icons.plus size={16} /> {t.bookings.newBooking}</button>
      </div>

      {/* Checkout notification banner */}
      {justCheckedOut && (
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-2xl">
          <Icons.cleaning size={16} className="text-blue-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-blue-800">{t.cleaning.autoTrigger}</p>
            <p className="text-xs text-blue-600">{t.cleaning.status_PENDING} — {t.cleaning.unitHidden}</p>
          </div>
          <button
            onClick={() => {
              const b = allBookings.find(bk => bk.id === justCheckedOut);
              onCheckoutCleaning?.(b?.unit ?? '', justCheckedOut ?? '');
            }}
            className="text-xs font-bold text-blue-700 underline underline-offset-2 hover:text-blue-900"
          >
            {t.cleaning.title} →
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t.bookings.confirmed,   value: stats.confirmed,                                        color: 'text-emerald-700', bg: 'bg-emerald-50 border border-emerald-100' },
          { label: t.bookings.checkedIn,   value: stats.checkedIn,                                        color: 'text-blue-700',    bg: 'bg-blue-50 border border-blue-100' },
          { label: t.bookings.pending,     value: stats.pending,                                          color: 'text-amber-700',   bg: 'bg-amber-50 border border-amber-100' },
          { label: t.bookings.totalRevenue,value: `${t.common.sar} ${stats.revenue.toLocaleString()}`,   color: 'text-slate-900',   bg: 'bg-white border border-slate-100 shadow-sm' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl p-4 ${s.bg}`}>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{s.label}</p>
            <p className={`text-xl font-extrabold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Icons.search size={15} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t.bookings.searchPlaceholder} className="input ps-9" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Icons.filter size={14} className="text-slate-400 flex-shrink-0" />
          {STATUSES.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filter === s ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}>
              {filterLabel(s)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Mobile: card list (hidden on sm+) ── */}
      <div className="sm:hidden space-y-3">
        {rows.map(b => {
          const st = getStatus(b);
          return (
            <div
              key={b.id}
              className="card p-4 cursor-pointer active:scale-[0.99] transition-transform"
              onClick={() => setViewBooking(b)}
            >
              {/* Guest row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 bg-indigo-50 text-indigo-600">
                    {b.guest.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm leading-none">{b.guest}</p>
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">{b.id}</p>
                  </div>
                </div>
                <span className={`badge text-[10px] ${STATUS_STYLE[st] ?? 'bg-slate-100 text-slate-500'}`}>
                  {t.status[st as keyof typeof t.status] ?? st}
                </span>
              </div>
              {/* Details grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mb-3">
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold mb-0.5">{t.table.channel}</p>
                  <p className="font-bold" style={{ color: b.channelColor }}>● {b.channel}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold mb-0.5">{t.table.amountSAR}</p>
                  <p className="font-extrabold text-slate-900" style={{ direction: 'ltr' }}>SAR {b.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold mb-0.5">{t.table.checkIn}</p>
                  <p className="font-mono font-semibold text-slate-700">{b.checkIn}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold mb-0.5">{t.table.checkOut}</p>
                  <p className="font-mono font-semibold text-slate-700">{b.checkOut}</p>
                </div>
              </div>
              {/* Action buttons */}
              <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                {st === 'CHECKED_IN' && (
                  <button
                    onClick={() => handleCheckOut(b)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-all"
                    style={{ minHeight: 44 }}
                  >
                    <Icons.arrowRight size={13} /> {t.table.checkOut}
                  </button>
                )}
                {st === 'PENDING' && (
                  <button
                    onClick={() => setPayLinkBooking(b)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-all"
                    style={{ minHeight: 44 }}
                  >
                    <Icons.link size={13} /> {t.transactions?.generateLink ?? 'Pay Link'}
                  </button>
                )}
                <button
                  onClick={() => setViewBooking(b)}
                  className="flex items-center justify-center gap-1.5 px-3 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition-all"
                  style={{ minHeight: 44 }}
                >
                  <Icons.eye size={13} /> {t.bookings.view}
                </button>
              </div>
            </div>
          );
        })}
        {rows.length === 0 && (
          <div className="card py-14 text-center">
            <p className="text-slate-300 text-3xl mb-2">📭</p>
            <p className="text-slate-400 text-sm font-medium">{t.bookings.noResults}</p>
          </div>
        )}
      </div>

      {/* ── Desktop/tablet: data table (hidden on mobile) ── */}
      <div className="hidden sm:block card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full data-table">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              {[t.table.booking, t.table.guest, t.table.property, t.table.channel,
                t.table.checkIn, t.table.checkOut, t.table.nights, t.table.amountSAR, t.table.status,
                t.insurance.title, ''].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map(b => {
              const st = getStatus(b);
              return (
                <tr key={b.id} className={`hover:bg-slate-50/60 transition-colors group ${justCheckedOut === b.id ? 'bg-blue-50/40' : ''}`}>
                  <td className="font-mono text-xs text-slate-500 font-semibold">{b.id}</td>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 bg-indigo-50 text-indigo-600">
                        {b.guest.charAt(0)}
                      </div>
                      <span className="font-semibold text-slate-800">{b.guest}</span>
                    </div>
                  </td>
                  <td>
                    <p className="text-slate-700 font-medium text-xs">{b.property}</p>
                    <p className="text-slate-400 text-xs">{b.unit}</p>
                  </td>
                  <td><span className="text-xs font-bold" style={{ color: b.channelColor }}>● {b.channel}</span></td>
                  <td className="text-xs text-slate-600 font-mono">{b.checkIn}</td>
                  <td className="text-xs text-slate-600 font-mono">{b.checkOut}</td>
                  <td className="text-center font-semibold text-slate-700">{b.nights}</td>
                  <td className="font-bold text-slate-900">{b.amount.toLocaleString()}</td>
                  <td>
                    <span className={`badge ${STATUS_STYLE[st] ?? 'bg-slate-100 text-slate-500'}`}>
                      {t.status[st as keyof typeof t.status] ?? st}
                    </span>
                  </td>
                  <td>
                    {(() => {
                      const ins = INSURANCE_RECORDS.find(r => r.bookingId === b.id);
                      if (!ins) return <span className="text-slate-300 text-xs">—</span>;
                      const styleMap: Record<string, string> = {
                        HELD:               'bg-blue-50 text-blue-700 border border-blue-200',
                        PENDING_INSPECTION: 'bg-amber-50 text-amber-700 border border-amber-200',
                        RELEASED:           'bg-emerald-50 text-emerald-700 border border-emerald-200',
                      };
                      return (
                        <div className="flex flex-col gap-0.5">
                          <span className={`badge text-[10px] flex items-center gap-1 ${styleMap[ins.status]}`}>
                            <Icons.shield size={10} />
                            {ins.status === 'HELD' ? t.insurance.depositHeld :
                             ins.status === 'RELEASED' ? t.insurance.depositReleased : t.insurance.depositPending}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold" style={{ direction: 'ltr' }}>
                            SAR {ins.depositAmount.toLocaleString()} · {ins.provider}
                          </span>
                        </div>
                      );
                    })()}
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setViewBooking(b)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity btn-ghost py-1.5 px-2.5 text-xs"
                      >
                        <Icons.eye size={13} /> {t.bookings.view}
                      </button>
                      {/* Generate Payment Link — for PENDING bookings */}
                      {st === 'PENDING' && (
                        <button
                          onClick={() => setPayLinkBooking(b)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
                          title={t.transactions?.generateLink ?? 'Generate Payment Link'}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                          </svg>
                          {t.transactions?.generateLink ?? 'Pay Link'}
                        </button>
                      )}
                      {/* Check Out button — only for CHECKED_IN */}
                      {st === 'CHECKED_IN' && (
                        <button
                          onClick={() => handleCheckOut(b)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600"
                        >
                          <Icons.arrowRight size={12} />
                          {t.table.checkOut}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={11} className="py-16 text-center">
                  <p className="text-slate-300 text-3xl mb-2">📭</p>
                  <p className="text-slate-400 text-sm font-medium">{t.bookings.noResults}</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>{/* overflow-x-auto */}
      </div>{/* hidden sm:block */}

      {/* Booking detail slide-over */}
      {viewBooking && (
        <BookingDetailModal booking={viewBooking} onClose={() => setViewBooking(null)} />
      )}

      {/* Payment Link modal */}
      {payLinkBooking && (
        <PaymentLinkModal
          bookingId={payLinkBooking.id}
          defaultAmount={payLinkBooking.amount}
          defaultDescription={`Booking ${payLinkBooking.id} — ${payLinkBooking.unit} (${payLinkBooking.nights} nights)`}
          guestName={payLinkBooking.guest}
          onClose={() => setPayLinkBooking(null)}
        />
      )}
    </div>
  );
}
