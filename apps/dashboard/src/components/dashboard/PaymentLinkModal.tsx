'use client';

/**
 * PaymentLinkModal.tsx
 *
 * Modal for generating a Moyasar Payment Link and sharing it
 * via SMS, Email, or WhatsApp.
 *
 * Usage:
 *   <PaymentLinkModal
 *     bookingId="BK-1091"
 *     defaultAmount={4992}
 *     defaultDescription="Booking BK-1091 — Unit A (4 nights)"
 *     onClose={() => setShowModal(false)}
 *     onCreated={(tx) => console.log(tx)}
 *   />
 */

import { useState } from 'react';
import { useLang } from '@/lib/language-context';
import { createPaymentLink } from '@/lib/moyasar-service';
import { createTransaction, type TransactionRecord } from '@/lib/transaction-log';

interface PaymentLinkModalProps {
  bookingId?: string;
  unitId?: string;
  defaultAmount?: number;
  defaultDescription?: string;
  guestName?: string;
  guestEmail?: string;
  onClose: () => void;
  onCreated?: (tx: TransactionRecord) => void;
}

const INPUT =
  'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-slate-300';

export default function PaymentLinkModal({
  bookingId,
  unitId,
  defaultAmount = 0,
  defaultDescription = '',
  guestName: defaultGuestName = '',
  guestEmail: defaultGuestEmail = '',
  onClose,
  onCreated,
}: PaymentLinkModalProps) {
  const { t, lang } = useLang();
  const tx = t.transactions;

  const [amount,      setAmount]      = useState(String(defaultAmount || ''));
  const [description, setDesc]        = useState(defaultDescription);
  const [guestName,   setGuestName]   = useState(defaultGuestName);
  const [guestEmail,  setGuestEmail]  = useState(defaultGuestEmail);
  const [expiry,      setExpiry]      = useState('');     // ISO date or empty
  const [creating,    setCreating]    = useState(false);
  const [created,     setCreated]     = useState<TransactionRecord | null>(null);
  const [copied,      setCopied]      = useState(false);
  const [error,       setError]       = useState('');

  const amountNum = parseFloat(amount) || 0;
  const canCreate = amountNum > 0 && description.trim().length > 0 && guestName.trim().length > 0;

  async function handleCreate() {
    if (!canCreate) return;
    setCreating(true);
    setError('');
    try {
      const link = await createPaymentLink({
        amount: amountNum,
        description: description.trim(),
        metadata: {
          ...(bookingId   && { booking_id:   bookingId }),
          ...(unitId      && { unit_id:       unitId }),
          ...(guestName   && { guest_name:    guestName }),
          ...(guestEmail  && { guest_email:   guestEmail }),
        },
        expiredAt: expiry ? new Date(expiry).toISOString() : null,
        successUrl: typeof window !== 'undefined' ? window.location.href : undefined,
      });

      const record = createTransaction({
        type:           'booking',
        status:         'pending_payment',
        amountSAR:      amountNum,
        method:         'payment_link',
        description:    description.trim(),
        bookingId,
        unitId,
        guestName:      guestName || undefined,
        guestEmail:     guestEmail || undefined,
        moyasarId:      link.id,
        paymentLinkUrl: link.url,
        paymentLinkId:  link.id,
      });

      setCreated(record);
      onCreated?.(record);
    } catch (e) {
      setError((e as Error).message ?? 'Failed to create payment link');
    } finally {
      setCreating(false);
    }
  }

  function handleCopy() {
    if (!created?.paymentLinkUrl) return;
    navigator.clipboard.writeText(created.paymentLinkUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      /* clipboard API not available in some browsers */
    });
  }

  function buildSMSHref() {
    const msg = `${description} — Amount: SAR ${amountNum.toLocaleString()}\nPay here: ${created?.paymentLinkUrl}`;
    const phone = guestEmail ? '' : '';
    return `sms:${phone}?body=${encodeURIComponent(msg)}`;
  }

  function buildWhatsAppHref() {
    const msg = `${description}\nالمبلغ: ${amountNum.toLocaleString()} ر.س\nرابط الدفع: ${created?.paymentLinkUrl}`;
    return `https://wa.me/?text=${encodeURIComponent(msg)}`;
  }

  function buildEmailHref() {
    const subject = encodeURIComponent(`Payment Request — ${description}`);
    const body = encodeURIComponent(
      `Dear ${guestName},\n\nPlease complete your payment of SAR ${amountNum.toLocaleString()} for:\n${description}\n\nPay here: ${created?.paymentLinkUrl}\n\nThank you,\nREMS`
    );
    return `mailto:${guestEmail}?subject=${subject}&body=${body}`;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
        style={{ animation: 'fadeUp 0.25s ease-out', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#2563EB,#4F46E5)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
            </div>
            <div>
              <p className="font-extrabold text-slate-900 leading-none text-sm">{tx.generateLink}</p>
              {bookingId && <p className="text-[11px] text-slate-400 font-mono mt-0.5">{bookingId}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {!created ? (
            /* ── Creation form ── */
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    {tx.guestName} *
                  </label>
                  <input
                    value={guestName}
                    onChange={e => setGuestName(e.target.value)}
                    placeholder={tx.enterGuestName}
                    className={INPUT}
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    {tx.guestEmail}
                  </label>
                  <input
                    value={guestEmail}
                    onChange={e => setGuestEmail(e.target.value)}
                    placeholder={tx.enterGuestEmail}
                    className={INPUT}
                    style={{ direction: 'ltr' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    {tx.amountSAR} *
                  </label>
                  <input
                    value={amount}
                    onChange={e => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                    placeholder="0.00"
                    className={INPUT}
                    style={{ direction: 'ltr', fontFamily: 'monospace' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    {tx.expiry}
                  </label>
                  <input
                    type="date"
                    value={expiry}
                    onChange={e => setExpiry(e.target.value)}
                    className={INPUT}
                    style={{ direction: 'ltr' }}
                    min={new Date().toISOString().slice(0, 10)}
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    {tx.description} *
                  </label>
                  <input
                    value={description}
                    onChange={e => setDesc(e.target.value)}
                    placeholder={`e.g. ${bookingId ? `Booking ${bookingId}` : 'Payment for services'}`}
                    className={INPUT}
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <p className="text-xs font-semibold text-red-700">{error}</p>
                </div>
              )}

              {/* Amount preview */}
              {amountNum > 0 && (
                <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-600 font-semibold">{tx.amountSAR}</p>
                    <p className="text-xl font-extrabold text-blue-900" style={{ direction: 'ltr' }}>
                      SAR {amountNum.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <div className="w-8 h-6 rounded-md bg-white border border-blue-200 flex items-center justify-center text-[10px] font-black text-green-700">mada</div>
                    <div className="w-8 h-6 rounded-md bg-white border border-blue-200 flex items-center justify-center text-[10px] font-black text-blue-900">VISA</div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* ── Link created — share options ── */
            <div className="space-y-4">
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <p className="text-sm font-bold text-emerald-700">{tx.linkCreated}</p>
              </div>

              {/* Link display */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{tx.viewLink}</p>
                <div className="flex items-center gap-2">
                  <p className="flex-1 text-xs font-mono text-blue-600 truncate bg-white rounded-lg border border-slate-200 px-3 py-2" style={{ direction: 'ltr' }}>
                    {created.paymentLinkUrl}
                  </p>
                  <button
                    onClick={handleCopy}
                    className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-slate-700'}`}
                  >
                    {copied ? '✓ Copied!' : tx.copyLink}
                  </button>
                </div>
              </div>

              {/* Share buttons */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{tx.shareVia}</p>
                <div className="grid grid-cols-3 gap-3">
                  <a href={buildWhatsAppHref()} target="_blank" rel="noopener noreferrer"
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-slate-100 hover:border-green-400 hover:bg-green-50 transition-all group">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
                      style={{ background: '#25D366' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-slate-600">{tx.shareWhatsApp}</span>
                  </a>

                  <a href={buildSMSHref()}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-slate-100 hover:border-blue-400 hover:bg-blue-50 transition-all group">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform bg-blue-500">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-slate-600">{tx.shareSMS}</span>
                  </a>

                  <a href={guestEmail ? buildEmailHref() : '#'}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all group ${guestEmail ? 'border-slate-100 hover:border-orange-400 hover:bg-orange-50' : 'border-slate-100 opacity-40 cursor-not-allowed'}`}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform bg-orange-500">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-slate-600">{tx.shareEmail}</span>
                  </a>
                </div>
                {!guestEmail && (
                  <p className="text-[11px] text-slate-400 mt-2 text-center">
                    Add guest email to enable email sharing
                  </p>
                )}
              </div>

              {/* TX details */}
              <div className="bg-slate-50 rounded-2xl border border-slate-100 divide-y divide-slate-100 text-xs" style={{ direction: 'ltr' }}>
                {[
                  { label: 'Transaction ID', value: created.id },
                  { label: 'Amount',         value: `SAR ${created.amountSAR.toLocaleString()}` },
                  { label: 'Status',         value: created.status.replace('_', ' ').toUpperCase() },
                  ...(created.bookingId ? [{ label: 'Booking', value: created.bookingId }] : []),
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-center px-4 py-2.5">
                    <span className="text-slate-500">{row.label}</span>
                    <span className="font-bold text-slate-900 font-mono">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 p-4 flex-shrink-0 bg-white">
          {!created ? (
            <button
              onClick={handleCreate}
              disabled={creating || !canCreate}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-extrabold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
              style={{ background: 'linear-gradient(135deg,#2563EB,#4F46E5)' }}
            >
              {creating ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{tx.creating}</>
              ) : (
                <>{tx.createLink}</>
              )}
            </button>
          ) : (
            <button onClick={onClose}
              className="w-full py-3 rounded-2xl font-semibold text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
              Close
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { transform: translateY(24px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
