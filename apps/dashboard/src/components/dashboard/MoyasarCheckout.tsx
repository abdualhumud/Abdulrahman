'use client';

/**
 * MoyasarCheckout.tsx
 *
 * Embedded Moyasar payment form component.
 * - In demo/no-key mode: shows a simulated payment UI with Mada/Visa/Apple Pay logos.
 * - When a publishable key is configured: loads Moyasar.js and renders the real hosted form.
 *
 * Usage:
 *   <MoyasarCheckout
 *     amountSAR={349}
 *     description="REMS Pro — Monthly Subscription"
 *     onSuccess={(payment) => handleSuccess(payment)}
 *     onFail={(payment) => handleFail(payment)}
 *     onBack={() => setSubStep('summary')}
 *   />
 */

import React, { useState, useEffect, useRef } from 'react';
import { useLang } from '@/lib/language-context';
import { isMoyasarConfigured, getMoyasarKey, loadMoyasarForm, type MoyasarPayment } from '@/lib/moyasar-service';

interface MoyasarCheckoutProps {
  amountSAR: number;
  description: string;
  metadata?: Record<string, string>;
  onSuccess: (payment: MoyasarPayment | null) => void;
  onFail?: (payment: MoyasarPayment | null) => void;
  onBack?: () => void;
  callbackUrl?: string;
  /** Bypass localStorage key — used to inject the staging test key without polluting production storage. */
  overrideKey?: string;
}

/* ── Payment method logos (inline SVG / styled elements) ─────── */

/**
 * Payment logos — HTML elements with inline styles.
 * Inline style={{ background }} is intentional — Tailwind `bg-white` gets
 * overridden by `html.dark .bg-white { background-color: #1e293b }` in
 * globals.css, making logos invisible in dark mode.
 * SVG <text> nodes replaced with HTML <span>; font loading in SVG context
 * is unreliable and silently fails in some browsers/WebViews.
 */
function MadaLogo() {
  return (
    <div style={{ width: 48, height: 30, borderRadius: 6, background: '#fff', border: '1px solid rgba(0,0,0,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
      <span style={{ fontFamily: '"Arial Black","Helvetica Neue",Arial,sans-serif', fontWeight: 900, fontSize: 13, color: '#00703C', letterSpacing: '-0.3px', lineHeight: 1 }}>mada</span>
    </div>
  );
}

function VisaLogo() {
  return (
    <div style={{ width: 48, height: 30, borderRadius: 6, background: '#fff', border: '1px solid rgba(0,0,0,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
      <span style={{ fontFamily: '"Arial Black","Helvetica Neue",Arial,sans-serif', fontWeight: 900, fontSize: 14, color: '#1A1F71', letterSpacing: '-0.5px', lineHeight: 1 }}>VISA</span>
    </div>
  );
}

function MastercardLogo() {
  /* Mastercard: pure SVG circles — no text, always renders correctly */
  return (
    <div style={{ width: 48, height: 30, borderRadius: 6, background: '#fff', border: '1px solid rgba(0,0,0,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
      <svg viewBox="0 0 48 28" width="44" height="26" xmlns="http://www.w3.org/2000/svg">
        <circle cx="18" cy="14" r="9" fill="#EB001B" opacity="0.9"/>
        <circle cx="30" cy="14" r="9" fill="#F79E1B" opacity="0.9"/>
        <path d="M24 6.4a9 9 0 0 1 0 15.2A9 9 0 0 1 24 6.4z" fill="#FF5F00"/>
      </svg>
    </div>
  );
}

function ApplePayLogo() {
  return (
    <div style={{ width: 48, height: 30, borderRadius: 6, background: '#000', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
      <span style={{ fontFamily: '"SF Pro Text","Helvetica Neue",Arial,sans-serif', fontWeight: 500, fontSize: 8.5, color: '#fff', letterSpacing: '0.2px', lineHeight: 1, whiteSpace: 'nowrap' as const }}>Apple Pay</span>
    </div>
  );
}

function STCPayLogo() {
  return (
    <div style={{ width: 48, height: 30, borderRadius: 6, background: '#6D1ED4', border: '1px solid #5b19b0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
      <span style={{ fontFamily: '"Arial Black","Helvetica Neue",Arial,sans-serif', fontWeight: 900, fontSize: 8.5, color: '#fff', letterSpacing: '0.3px', lineHeight: 1, whiteSpace: 'nowrap' as const }}>STC Pay</span>
    </div>
  );
}

/* ── Demo / mock card form ────────────────────────────────────── */

function DemoCardForm({
  amountSAR,
  description,
  onSuccess,
  onFail,
}: Pick<MoyasarCheckoutProps, 'amountSAR' | 'description' | 'onSuccess' | 'onFail'>) {
  const { t, lang } = useLang();
  const p = t.payment;
  const [cardNum,  setCardNum]  = useState('');
  const [expiry,   setExpiry]   = useState('');
  const [cvv,      setCvv]      = useState('');
  const [name,     setName]     = useState('');
  const [paying,   setPaying]   = useState(false);
  const [method,   setMethod]   = useState<'card' | 'mada' | 'applepay' | 'stcpay'>('card');

  /* Apple Pay: only available on Safari/iOS with ApplePaySession */
  const applePayAvailable = typeof window !== 'undefined' &&
    'ApplePaySession' in window &&
    (window as unknown as { ApplePaySession: { canMakePayments(): boolean } }).ApplePaySession.canMakePayments();

  const INPUT = 'w-full border border-slate-200 dark:border-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 dark:focus:border-blue-400 transition-all placeholder-slate-300 dark:placeholder-slate-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100';

  const handlePay = async () => {
    setPaying(true);
    await new Promise(r => setTimeout(r, 1800));
    // Demo: fail if card number ends in 0000
    const fail = cardNum.replace(/\s/g, '').endsWith('0000');
    if (fail) {
      onFail?.(null);
    } else {
      onSuccess(null);
    }
    setPaying(false);
  };

  // mada: same card fields as creditcard — require them too
  const canPay = (method === 'applepay' || method === 'stcpay') || (
    cardNum.replace(/\s/g, '').length >= 16 &&
    expiry.length >= 5 &&
    cvv.length === 3 &&
    name.trim().length > 0
  );

  const formatCard = (v: string) =>
    v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  const formatExpiry = (v: string) =>
    v.replace(/\D/g, '').slice(0, 4).replace(/^(\d{2})(\d)/, '$1/$2');

  return (
    <div className="space-y-5">
      {/* Demo notice */}
      <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-2xl px-4 py-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <div>
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">{p.checkoutDemoNote}</p>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
            {lang === 'ar'
              ? 'استخدم البطاقة التجريبية: 4111 1111 1111 1111 · أي تاريخ/CVV · ينتهي بـ 0000 = فشل'
              : 'Test card: 4111 1111 1111 1111 · any expiry/CVV · ending 0000 = fail'}
          </p>
        </div>
      </div>

      {/* Method tabs */}
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{p.payMethods}</p>
        {/* Apple Pay: only show on capable devices */}
        {method === 'applepay' && !applePayAvailable && (
          <div className="mb-3 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-500">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {lang === 'ar'
              ? 'Apple Pay متاح فقط على أجهزة Apple (iPhone/Mac) مع Safari'
              : 'Apple Pay is only available on Apple devices (iPhone/Mac) with Safari'}
          </div>
        )}
        <div className={`grid gap-2 ${applePayAvailable ? 'grid-cols-4' : 'grid-cols-3'}`}>
          {([
            { key: 'card',     label: 'Credit Card', logo: <VisaLogo /> },
            { key: 'mada',     label: 'Mada',        logo: <MadaLogo /> },
            ...(applePayAvailable ? [{ key: 'applepay' as const, label: 'Apple Pay', logo: <ApplePayLogo /> }] : []),
            { key: 'stcpay',   label: 'STC Pay',     logo: <STCPayLogo /> },
          ] as { key: 'card' | 'mada' | 'applepay' | 'stcpay'; label: string; logo: React.ReactNode }[]).map(m => (
            <button key={m.key} onClick={() => setMethod(m.key)}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all
                ${method === m.key
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/25 shadow-sm'
                  : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 dark:bg-slate-800/50'}`}>
              {m.logo}
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Card fields (shown only for creditcard / mada) */}
      {(method === 'card' || method === 'mada') && (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
              {method === 'mada' ? 'Mada' : 'Credit'} Card Number
            </label>
            <input
              value={cardNum}
              onChange={e => setCardNum(formatCard(e.target.value))}
              placeholder="1234 5678 9012 3456"
              autoComplete="cc-number"
              inputMode="numeric"
              className={INPUT}
              style={{ direction: 'ltr', fontFamily: 'monospace', letterSpacing: '0.08em' }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Expiry</label>
              <input
                value={expiry}
                onChange={e => setExpiry(formatExpiry(e.target.value))}
                placeholder="MM/YY"
                autoComplete="cc-exp"
                inputMode="numeric"
                className={INPUT}
                style={{ direction: 'ltr', fontFamily: 'monospace' }}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">CVV</label>
              <input
                value={cvv}
                onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                placeholder="•••"
                type="password"
                autoComplete="cc-csc"
                inputMode="numeric"
                maxLength={3}
                className={INPUT}
                style={{ direction: 'ltr', fontFamily: 'monospace' }}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Cardholder Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Mohammed Al-Otaibi"
              autoComplete="cc-name"
              className={INPUT}
              style={{ direction: 'ltr' }}
            />
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            {lang === 'ar'
              ? 'رقم البطاقة التجريبية'
              : 'Quick-fill test card'}{': '}
            <button type="button"
              onClick={() => { setCardNum('4111 1111 1111 1111'); setExpiry('12/27'); setCvv('123'); setName('Test User'); }}
              className="font-mono text-blue-600 dark:text-blue-400 hover:underline">
              4111 1111 1111 1111
            </button>
          </p>
        </div>
      )}

      {/* Apple Pay / STC Pay alternative flow */}
      {method === 'applepay' && (
        <div className="bg-black rounded-2xl p-5 flex items-center justify-center">
          <div className="text-center text-white space-y-2">
            <div className="text-2xl">🍎</div>
            <p className="text-sm font-semibold">Apple Pay</p>
            <p className="text-xs text-gray-400">Touch ID / Face ID to authorize</p>
          </div>
        </div>
      )}
      {method === 'stcpay' && (
        <div className="rounded-2xl p-5 flex items-center justify-center" style={{ background: '#6D1ED4' }}>
          <div className="text-center text-white space-y-2">
            <div className="text-2xl">📱</div>
            <p className="text-sm font-semibold">STC Pay</p>
            <p className="text-xs text-purple-200">Authenticate in STC Pay app</p>
          </div>
        </div>
      )}

      {/* Amount summary */}
      <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">{description}</p>
        <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100" style={{ direction: 'ltr' }}>
          SAR {amountSAR.toLocaleString()}
        </p>
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold me-0.5">
            {lang === 'ar' ? 'وسائل الدفع:' : 'Accepted:'}
          </span>
          <VisaLogo />
          <MadaLogo />
          <MastercardLogo />
          <ApplePayLogo />
          <STCPayLogo />
        </div>
      </div>

      <button
        onClick={handlePay}
        disabled={paying || !canPay}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-extrabold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
        style={{ background: 'linear-gradient(135deg,#2563EB,#4F46E5)' }}
      >
        {paying ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing…
          </>
        ) : (
          <>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
            Pay SAR {amountSAR.toLocaleString()}
          </>
        )}
      </button>

      {/* Security badges */}
      <div className="flex items-center justify-center gap-4 text-xs text-slate-400 dark:text-slate-500">
        <div className="flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          SSL Secured
        </div>
        <div className="flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          PCI DSS Compliant
        </div>
        <span>Powered by Moyasar</span>
      </div>
    </div>
  );
}

/* ── Real Moyasar.js form wrapper ─────────────────────────────── */

function RealMoyasarForm({
  amountSAR,
  description,
  metadata,
  onSuccess,
  onFail,
  callbackUrl,
  overrideKey,
}: MoyasarCheckoutProps) {
  const { t } = useLang();
  const p = t.payment;
  const formRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!formRef.current) return;
    loadMoyasarForm({
      element: '#moyasar-form-container',
      amount: amountSAR * 100, // halalas
      currency: 'SAR',
      description,
      publishable_api_key: overrideKey ?? getMoyasarKey(),
      callback_url: callbackUrl ?? (typeof window !== 'undefined' ? window.location.href : ''),
      methods: ['creditcard', 'mada', 'applepay', 'stcpay'],
      metadata: metadata ?? {},
      on_completed: (payment) => { setLoading(false); onSuccess(payment); },
      on_failed:    (payment) => { setLoading(false); onFail?.(payment); },
    })
      .then(() => setLoading(false))
      .catch(e => { setError((e as Error).message); setLoading(false); });
  }, [amountSAR, description, metadata, onSuccess, onFail, callbackUrl]);

  if (error) return (
    <div className="rounded-2xl bg-red-50 border border-red-200 p-5 text-center">
      <p className="text-sm font-bold text-red-700">{error}</p>
      <p className="text-xs text-red-500 mt-1">Check that your Moyasar publishable key is correct.</p>
    </div>
  );

  return (
    <div className="relative min-h-[200px]">
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <span className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">{p.checkoutLoading}</p>
        </div>
      )}
      <div ref={formRef} id="moyasar-form-container" className={loading ? 'opacity-0' : 'opacity-100 transition-opacity'} />
    </div>
  );
}

/* ── Main export ─────────────────────────────────────────────── */

export default function MoyasarCheckout(props: MoyasarCheckoutProps) {
  const { t } = useLang();
  const p = t.payment;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#2563EB,#4F46E5)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
            <line x1="1" y1="10" x2="23" y2="10"/>
          </svg>
        </div>
        <div>
          <p className="font-extrabold text-slate-900 dark:text-slate-100 leading-none">{p.checkoutTitle}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{p.checkoutSubtitle}</p>
        </div>
        {props.onBack && (
          <button
            onClick={props.onBack}
            className="ms-auto text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
          >
            ← {p.backToPlan}
          </button>
        )}
      </div>

      {/* Form */}
      {(isMoyasarConfigured() || props.overrideKey)
        ? <RealMoyasarForm {...props} />
        : <DemoCardForm
            amountSAR={props.amountSAR}
            description={props.description}
            onSuccess={props.onSuccess}
            onFail={props.onFail}
          />
      }
    </div>
  );
}
