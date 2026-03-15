'use client';

import { useState } from 'react';
import { Icons } from '@/lib/icons';
import { useLang } from '@/lib/language-context';
import { useMode } from '@/lib/mode-context';
import { RECENT_BOOKINGS, INSURANCE_RECORDS } from '@/lib/mock-data';
import { STATUS_STYLES, INSURANCE_STYLES, ONE_DAY_MS } from '@/lib/ui-styles';
import PaymentLinkModal from './PaymentLinkModal';

/* ── Manual bookings localStorage helpers ─────────────────────────── */
const MANUAL_BOOKINGS_KEY = 'rems-manual-bookings';

function loadManualBookings(): typeof RECENT_BOOKINGS {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MANUAL_BOOKINGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveManualBookings(bookings: typeof RECENT_BOOKINGS): void {
  try { localStorage.setItem(MANUAL_BOOKINGS_KEY, JSON.stringify(bookings)); }
  catch { /* storage quota */ }
}

const CHANNEL_COLORS: Record<string, string> = {
  'Booking.com': '#003580',
  'Airbnb':      '#FF5A5F',
  'Gathern':     '#00a651',
  'Direct':      '#F59E0B',
};

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED:   'bg-emerald-100 text-emerald-700',
  PENDING:     'bg-amber-100 text-amber-700',
  CHECKED_IN:  'bg-blue-100 text-blue-700',
  CHECKED_OUT: 'bg-slate-100 text-slate-500',
};

/* ── Manual Booking Modal ──────────────────────────────────────────── */
function ManualBookingModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (b: typeof RECENT_BOOKINGS[number]) => void;
}) {
  const { t, lang } = useLang();
  const isAr = lang === 'ar';

  const [guestName,  setGuestName]  = useState('');
  const [property,   setProperty]   = useState('');
  const [unit,       setUnit]       = useState('');
  const [channel,    setChannel]    = useState<keyof typeof CHANNEL_COLORS>('Direct');
  const [checkIn,    setCheckIn]    = useState('');
  const [checkOut,   setCheckOut]   = useState('');
  const [amountStr,  setAmountStr]  = useState('');
  const [status,     setStatus]     = useState<'CONFIRMED' | 'PENDING'>('CONFIRMED');
  const [submitting, setSubmitting] = useState(false);

  const nights = checkIn && checkOut
    ? Math.max(0, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / ONE_DAY_MS))
    : 0;

  const amount = parseFloat(amountStr) || 0;
  const canSubmit = guestName.trim() && checkIn && checkOut && nights > 0 && amount > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 400));
    const booking: typeof RECENT_BOOKINGS[number] = {
      id: `BK-${String(Date.now()).slice(-4)}`,
      guest: guestName.trim(),
      property: property.trim() || unit.trim() || (isAr ? 'وحدة' : 'Unit'),
      unit: unit.trim() || property.trim() || (isAr ? 'وحدة' : 'Unit'),
      channel,
      channelColor: CHANNEL_COLORS[channel] ?? '#64748B',
      checkIn,
      checkOut,
      nights,
      amount,
      status,
      statusColor: STATUS_COLORS[status] ?? STATUS_COLORS.CONFIRMED,
    };
    onCreated(booking);
    setSubmitting(false);
    onClose();
  };

  const INPUT = 'w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-slate-300 dark:placeholder-slate-500';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'slideUp 0.3s cubic-bezier(0.32,0.72,0,1)', maxHeight: '92vh' }}
      >
        {/* Handle + header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
          <div className="sm:hidden absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-slate-200 dark:bg-slate-600 rounded-full" />
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <Icons.plus size={16} className="text-blue-600" />
            </div>
            <div>
              <p className="font-extrabold text-slate-900 dark:text-slate-100 text-sm leading-none">
                {isAr ? 'حجز يدوي جديد' : 'New Manual Booking'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isAr ? 'أضف حجزاً مباشراً' : 'Add a direct / walk-in reservation'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            <Icons.x size={14} />
          </button>
        </div>

        {/* Form body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Guest Name */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
              {isAr ? 'اسم الضيف' : 'Guest Name'} *
            </label>
            <input
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
              placeholder={isAr ? 'محمد العتيبي' : 'Mohammed Al-Otaibi'}
              className={INPUT}
            />
          </div>

          {/* Property / Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
                {isAr ? 'المبنى / العقار' : 'Property'}
              </label>
              <input
                value={property}
                onChange={e => setProperty(e.target.value)}
                placeholder={isAr ? 'شقة الرياض' : 'Riyadh Apt.'}
                className={INPUT}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
                {isAr ? 'الوحدة' : 'Unit'}
              </label>
              <input
                value={unit}
                onChange={e => setUnit(e.target.value)}
                placeholder={isAr ? 'الوحدة أ' : 'Unit A'}
                className={INPUT}
              />
            </div>
          </div>

          {/* Channel */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
              {isAr ? 'قناة الحجز' : 'Booking Channel'}
            </label>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(CHANNEL_COLORS) as Array<keyof typeof CHANNEL_COLORS>).map(ch => (
                <button
                  key={ch}
                  onClick={() => setChannel(ch)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-2 ${
                    channel === ch
                      ? 'text-white border-transparent shadow-sm'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-500 hover:border-slate-300'
                  }`}
                  style={channel === ch ? { background: CHANNEL_COLORS[ch], borderColor: CHANNEL_COLORS[ch] } : {}}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
                {t.table.checkIn} *
              </label>
              <input
                type="date"
                value={checkIn}
                onChange={e => setCheckIn(e.target.value)}
                className={INPUT}
                style={{ direction: 'ltr' }}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
                {t.table.checkOut} *
              </label>
              <input
                type="date"
                value={checkOut}
                onChange={e => setCheckOut(e.target.value)}
                min={checkIn || undefined}
                className={INPUT}
                style={{ direction: 'ltr' }}
              />
            </div>
          </div>

          {/* Nights preview */}
          {nights > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs text-blue-700 dark:text-blue-300 font-semibold">
                {isAr ? 'عدد الليالي' : 'Total Nights'}
              </span>
              <span className="text-sm font-extrabold text-blue-900 dark:text-blue-200">{nights}</span>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
              {t.table.amountSAR} *
            </label>
            <input
              value={amountStr}
              onChange={e => setAmountStr(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder="0.00"
              className={INPUT}
              style={{ direction: 'ltr', fontFamily: 'monospace' }}
            />
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
              {t.table.status}
            </label>
            <div className="flex gap-2">
              {(['CONFIRMED', 'PENDING'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                    status === s
                      ? s === 'CONFIRMED'
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {t.status[s as keyof typeof t.status] ?? s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 dark:border-slate-700 p-4 flex-shrink-0 bg-white dark:bg-slate-800">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-extrabold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
            style={{ background: 'linear-gradient(135deg,#2563EB,#4F46E5)' }}
          >
            {submitting
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{isAr ? 'جارٍ الحفظ…' : 'Saving…'}</>
              : <><Icons.plus size={16} />{isAr ? 'إضافة الحجز' : 'Add Booking'}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

const STATUS_STYLE = STATUS_STYLES;

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

  const INS_STYLE = INSURANCE_STYLES;

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

  /* Manual bookings — persisted in localStorage for production/staging */
  const [manualBookings, setManualBookings] = useState<typeof RECENT_BOOKINGS>(() =>
    isDemo ? [] : loadManualBookings()
  );
  const allBookings = [
    ...(isDemo ? RECENT_BOOKINGS : []),
    ...manualBookings,
  ];

  const handleManualBookingCreated = (booking: typeof RECENT_BOOKINGS[number]) => {
    const next = [booking, ...manualBookings];
    setManualBookings(next);
    if (!isDemo) saveManualBookings(next);
  };

  const STATUSES = ['ALL', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'PENDING'];
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});
  const [justCheckedOut, setJustCheckedOut] = useState<string | null>(null);
  const [viewBooking, setViewBooking] = useState<typeof RECENT_BOOKINGS[number] | null>(null);
  const [payLinkBooking, setPayLinkBooking] = useState<typeof RECENT_BOOKINGS[number] | null>(null);
  const [manualBookingOpen, setManualBookingOpen] = useState(false);

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
        <button className="btn-primary" onClick={() => setManualBookingOpen(true)}>
          <Icons.plus size={16} /> {t.bookings.newBooking}
        </button>
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
                  <td className="font-bold text-slate-900" style={{ direction: 'ltr' }}>SAR {b.amount.toLocaleString()}</td>
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

      {/* Payment Link modal — passes full reservation details for WhatsApp */}
      {payLinkBooking && (
        <PaymentLinkModal
          bookingId={payLinkBooking.id}
          defaultAmount={payLinkBooking.amount}
          defaultDescription={`${payLinkBooking.unit} · ${payLinkBooking.checkIn} → ${payLinkBooking.checkOut} (${payLinkBooking.nights} nights)`}
          guestName={payLinkBooking.guest}
          checkIn={payLinkBooking.checkIn}
          checkOut={payLinkBooking.checkOut}
          property={`${payLinkBooking.property} — ${payLinkBooking.unit}`}
          channel={payLinkBooking.channel}
          nights={payLinkBooking.nights}
          onClose={() => setPayLinkBooking(null)}
        />
      )}

      {/* Manual Booking modal */}
      {manualBookingOpen && (
        <ManualBookingModal
          onClose={() => setManualBookingOpen(false)}
          onCreated={handleManualBookingCreated}
        />
      )}
    </div>
  );
}
