'use client';

import { useState } from 'react';
import { Icons } from '@/lib/icons';
import { useLang } from '@/lib/language-context';
import { useMode } from '@/lib/mode-context';
import { validatePromoCode, redeemPromoCode, type PromoValidationResult } from '@/lib/promo-service';
import MoyasarCheckout from './MoyasarCheckout';
import { createTransaction } from '@/lib/transaction-log';
import { STAGING_MOYASAR_TEST_KEY, type MoyasarPayment } from '@/lib/moyasar-service';
import { isSupabaseConfigured } from '@/lib/supabase';

type Step = 1 | 2 | 3;
type OnboardingMode = 'signup' | 'login';

const PLANS = ['Basic', 'Pro', 'Enterprise'] as const;

const INPUT =
  'w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-slate-300 dark:placeholder-slate-500';

const REQ_DOT = (
  <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 mb-0.5 ms-0.5" title="Required" />
);

function DarkModeToggle({ lang }: { lang: string }) {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
  });
  const toggle = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('rems-dark-mode', '1');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.removeItem('rems-dark-mode');
    }
  };
  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/20"
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {dark
        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      }
      {dark ? (lang === 'ar' ? 'فاتح' : 'Light') : (lang === 'ar' ? 'داكن' : 'Dark')}
    </button>
  );
}

interface Props {
  onComplete: (plan?: string, promoCode?: string) => void;
  /** strictMode=true (production/staging): Skip hidden, Next blocked until required fields filled */
  strictMode?: boolean;
  /** showPayment=true: show Step 3 payment/checkout */
  showPayment?: boolean;
}

export default function OnboardingPage({ onComplete, strictMode = false, showPayment = false }: Props) {
  const { t, lang, toggle } = useLang();
  const { isStaging } = useMode();
  const o = t.onboarding;
  const p = t.payment;

  /* ── Mode: signup wizard or returning-user login ── */
  const [mode, setMode] = useState<OnboardingMode>('signup');
  const [loginEmail,        setLoginEmail]       = useState('');
  const [loginPassword,     setLoginPassword]    = useState('');
  const [loginError,        setLoginError]       = useState('');
  const [loginLoading,      setLoginLoading]     = useState(false);
  const [showLoginPwd,      setShowLoginPwd]     = useState(false);
  const [showSignupPwd,     setShowSignupPwd]    = useState(false);

  /* ── Wizard state ── */
  // Staging: all optional. Production: validation enforced.
  // Steps: 1=Business, 2=Profile, 3=Payment (if showPayment). No "Add Property" step.
  const totalSteps: Step = showPayment ? 3 : 2;

  const [step, setStep]                   = useState<Step>(1);
  const [validating, setVal]              = useState(false);
  const [crOk, setCrOk]                   = useState(false);
  const [selectedPlan, setPlan]           = useState<typeof PLANS[number]>('Pro');
  const [touched, setTouched]             = useState(false);
  const [businessType, setBusinessType]   = useState<'corporate' | 'individual'>('corporate');
  const [googleFilling, setGoogleFilling] = useState(false);

  /* ── Payment / promo ── */
  const [promoInput,   setPromoInput]   = useState('');
  const [promoResult,  setPromoResult]  = useState<PromoValidationResult | null>(null);
  const [promoApplied, setPromoApplied] = useState('');
  type PaySubStep = 'summary' | 'checkout' | 'success' | 'failed';
  const [paySubStep, setPaySubStep] = useState<PaySubStep>('summary');

  /* ── Form ── */
  const [form, setForm] = useState({
    cr: '', vat: '', natCity: '', natDistr: '', natStreet: '', natPostal: '',
    freelanceCert: '',
    ownerName: '', email: '', phone: '', nationalId: '',
    username: '', password: '',
    bankName: '', iban: '',
  });
  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  /* ── Google autofill simulation ── */
  const handleGoogleAutofill = async () => {
    setGoogleFilling(true);
    await new Promise(r => setTimeout(r, 900));
    setForm(f => ({
      ...f,
      ownerName: lang === 'ar' ? 'عبدالرحمن الرشيدي' : 'Abdulrahman Al-Rashidi',
      email:    'owner@gmail.com',
      username: 'abdulrahman.rems',
    }));
    setGoogleFilling(false);
  };

  /* ── Login ── */
  const handleLogin = async () => {
    setLoginError('');
    setLoginLoading(true);
    await new Promise(r => setTimeout(r, 700));
    try {
      const raw = localStorage.getItem('rems-prod-account');
      if (!raw) {
        setLoginError(o.loginNoRecord ?? 'No account found. Please create an account first.');
        setLoginLoading(false);
        return;
      }
      const saved = JSON.parse(raw) as { email: string; passwordB64: string };
      if (saved.email !== loginEmail || atob(saved.passwordB64) !== loginPassword) {
        setLoginError(o.loginInvalid ?? 'Invalid email or password');
        setLoginLoading(false);
        return;
      }
    } catch {
      setLoginError(o.loginInvalid ?? 'Invalid email or password');
      setLoginLoading(false);
      return;
    }
    setLoginLoading(false);
    onComplete();
  };

  /* ── Promo code ── */
  const handleApplyPromo = () => {
    const result = validatePromoCode(promoInput);
    setPromoResult(result);
    if (result.valid && result.code) setPromoApplied(result.code);
  };
  const handleRemovePromo = () => { setPromoInput(''); setPromoResult(null); setPromoApplied(''); };

  const planPrices: Record<typeof PLANS[number], number> = {
    Basic:      p.planBasicRaw as unknown as number,
    Pro:        p.planProRaw   as unknown as number,
    Enterprise: p.planEntRaw   as unknown as number,
  };
  const basePrice   = planPrices[selectedPlan] ?? 349;
  const discountPct = promoResult?.valid ? promoResult.discount : 0;
  const discounted  = Math.round(basePrice * (1 - discountPct / 100));

  /* ── Saudi-standard validation ── */
  // CR: exactly 10 digits, starts with 1-7
  const crTenDigits    = /^[1-7]\d{9}$/.test(form.cr);
  // National ID: 10 digits, starts with 1 (Saudi) or 2 (Iqama)
  const natIdTenDigits = /^[12]\d{9}$/.test(form.nationalId);
  // Email: must have local@domain.tld structure
  const emailValid     = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim());
  // Saudi mobile: 05xxxxxxxx (10 digits, starts with 05)
  const phoneValid     = /^05\d{8}$/.test(form.phone.replace(/[\s-]/g, ''));

  const step1Valid = isStaging || !strictMode || (
    businessType === 'corporate'
      ? crTenDigits
      : form.freelanceCert.trim().length >= 7
  );
  const step2Valid = isStaging || !strictMode || (
    form.ownerName.trim()  !== '' &&
    emailValid &&
    phoneValid &&
    natIdTenDigits &&
    form.username.trim().length >= 3 &&
    form.password.trim().length >= 8
  );
  const canGoNext =
    (step === 1 && step1Valid) ||
    (step === 2 && step2Valid) ||
    step === 3;

  /* Progress */
  const filledCount = [
    businessType === 'corporate' ? form.cr : form.freelanceCert,
    form.vat, form.natCity,
    form.ownerName, form.email, form.phone, form.nationalId,
    form.username, form.password,
  ].filter(v => v.trim() !== '').length;
  const progressPct = Math.min(100,
    Math.round(((step - 1) / totalSteps) * 100 + (filledCount / 9) * (100 / totalSteps)));

  const fakeValidate = async () => {
    setVal(true);
    await new Promise(r => setTimeout(r, 1200));
    setCrOk(true);
    setVal(false);
  };

  const handleNext = () => {
    setTouched(true);
    if (!canGoNext) return;
    /* Save account credentials to localStorage ONLY when Supabase is not configured */
    if (step === 2 && (step2Valid || isStaging) && form.email && form.password && !isSupabaseConfigured()) {
      try {
        localStorage.setItem('rems-prod-account', JSON.stringify({
          email:       form.email,
          username:    form.username,
          passwordB64: btoa(form.password),
          name:        form.ownerName,
        }));
      } catch { /* quota */ }
    }
    if (step < totalSteps) { setStep(s => (s + 1) as Step); setTouched(false); }
    else if (showPayment && paySubStep === 'summary') {
      setPaySubStep('checkout');
    } else {
      if (promoApplied) redeemPromoCode(promoApplied);
      onComplete(selectedPlan, promoApplied);
    }
  };

  function handleCheckoutSuccess(payment: MoyasarPayment | null) {
    createTransaction({
      type:        'subscription',
      status:      'paid',
      amountSAR:   discounted,
      method:      payment?.source?.type ?? 'creditcard',
      description: `REMS ${selectedPlan} — Monthly Subscription`,
      ownerPlan:   selectedPlan,
      promoCode:   promoApplied || undefined,
      discountPct: discountPct || undefined,
      originalAmountSAR: basePrice,
      moyasarId:   payment?.id,
      paidAt:      new Date().toISOString(),
      cardLast4:   payment?.source?.number?.slice(-4),
      cardCompany: payment?.source?.company,
      cardName:    payment?.source?.name,
    });
    setPaySubStep('success');
  }

  function handleCheckoutFail(_payment: MoyasarPayment | null) {
    setPaySubStep('failed');
  }

  const fieldErr = (val: string, minLen = 1) =>
    strictMode && !isStaging && touched && val.trim().length < minLen
      ? 'border-red-300 ring-2 ring-red-100'
      : '';

  /* Dynamic staging button: "Fill Later" when fields are blank, "Next" when user started typing */
  const stagingStepHasInput =
    !isStaging ? true :
    step === 1 ? [form.cr, form.freelanceCert, form.vat, form.natCity].some(v => v.trim() !== '') :
    step === 2 ? [form.ownerName, form.email, form.phone, form.username].some(v => v.trim() !== '') :
    true;

  const nextBtnLabel =
    step === totalSteps && showPayment ? p.proceedCheckout :
    step === totalSteps               ? o.finish :
    isStaging && !stagingStepHasInput ? (o.fillLater ?? 'Fill Later') :
    o.next;

  /* Step indicator config */
  const STEPS = [
    { num: 1, title: o.step1Title, icon: <Icons.building size={16} /> },
    { num: 2, title: o.step2Title, icon: <Icons.user size={16} /> },
    ...(showPayment ? [{ num: 3, title: p.title, icon: <Icons.creditCard size={16} /> }] : []),
  ];

  /* Payment plans — staging shows Pro only */
  const paymentPlans = [
    { key: 'Basic'      as const, label: p.planBasic, desc: p.planBasicDesc, price: p.planBasicPrice, raw: p.planBasicRaw as unknown as number, accent: '#64748B', popular: false },
    { key: 'Pro'        as const, label: p.planPro,   desc: p.planProDesc,   price: p.planProPrice,   raw: p.planProRaw   as unknown as number, accent: '#3B82F6', popular: true  },
    { key: 'Enterprise' as const, label: p.planEnt,   desc: p.planEntDesc,   price: p.planEntPrice,   raw: p.planEntRaw   as unknown as number, accent: '#8B5CF6', popular: false },
  ].filter(plan => !isStaging || plan.key === 'Pro');

  /* ── Shared shell ──────────────────────────────────────────────────────── */
  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-6"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="absolute top-0 start-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 end-0 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-2xl">

        {/* Language + dark mode toggles */}
        <div className="flex items-center justify-between mb-4">
          <DarkModeToggle lang={lang} />
          <button onClick={toggle}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/20">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            {lang === 'ar' ? 'English' : 'عربي'}
          </button>
        </div>

        {/* Logo + mode toggle */}
        <div className="text-center mb-6">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-xl text-white mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg,#3B82F6,#6366F1)' }}>R
          </div>

          {/* Login / Sign Up tab toggle — hidden in staging (auth handled by StagingAuthGate) */}
          {!isStaging && (
            <div className="inline-flex items-center gap-1 bg-white/10 rounded-2xl p-1 mb-4">
              {(['signup', 'login'] as OnboardingMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setLoginError(''); }}
                  className={`px-5 py-2 rounded-xl text-sm font-bold transition-all
                    ${mode === m ? 'bg-white text-slate-900 shadow' : 'text-white/70 hover:text-white'}`}
                >
                  {m === 'signup'
                    ? (o.signupTitle ?? (lang === 'ar' ? 'إنشاء حساب' : 'Create Account'))
                    : (o.loginTitle  ?? (lang === 'ar' ? 'تسجيل الدخول' : 'Sign In'))}
                </button>
              ))}
            </div>
          )}

          <p className="text-slate-400 text-sm">
            {mode === 'login'
              ? (o.loginSubtitle ?? (lang === 'ar' ? 'أدخل بيانات حسابك للمتابعة' : 'Enter your credentials to continue'))
              : isStaging
                ? (o.stagingOptionalNotice ?? 'Trial mode — all fields are optional for testing')
                : o.subtitle}
          </p>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            LOGIN MODE
        ════════════════════════════════════════════════════════════ */}
        {mode === 'login' && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-2xl space-y-5 border border-transparent dark:border-slate-700">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                {o.loginEmail ?? (lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address')}
              </label>
              <input
                type="email"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                placeholder="owner@example.com"
                autoComplete="email"
                className={INPUT}
                style={{ direction: 'ltr' }}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                {o.loginPassword ?? (lang === 'ar' ? 'كلمة المرور' : 'Password')}
              </label>
              <div className="relative">
                <input
                  type={showLoginPwd ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={INPUT + ' pe-10'}
                  style={{ direction: 'ltr' }}
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPwd(v => !v)}
                  className="absolute inset-y-0 end-0 pe-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showLoginPwd ? 'Hide password' : 'Show password'}
                >
                  {showLoginPwd ? <Icons.eyeOff size={16} /> : <Icons.eye size={16} />}
                </button>
              </div>
            </div>

            {loginError && (
              <p className="text-xs text-red-500 font-semibold bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">
                {loginError}
              </p>
            )}

            <button
              onClick={handleLogin}
              disabled={loginLoading || !loginEmail || !loginPassword}
              className="w-full py-3.5 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
              style={{ background: 'linear-gradient(135deg,#2563EB,#4F46E5)' }}
            >
              {loginLoading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {o.loginBtn ?? (lang === 'ar' ? 'تسجيل الدخول' : 'Sign In')}
            </button>

            <p className="text-center text-xs text-slate-400">
              <button onClick={() => setMode('signup')}
                className="hover:text-blue-600 transition-colors font-semibold">
                {o.loginNoAccount ?? (lang === 'ar' ? 'لا يوجد حساب؟ أنشئ حساباً ←' : 'New here? Create an account →')}
              </button>
            </p>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            SIGNUP MODE — multi-step wizard
        ════════════════════════════════════════════════════════════ */}
        {mode === 'signup' && (
          <>
            {/* Progress bar — production strict mode only */}
            {strictMode && !isStaging && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-1.5 px-0.5">
                  <span className="text-xs text-slate-400 font-semibold">{o.strictNoticeFlexible ?? o.strictNotice}</span>
                  <span className="text-xs font-extrabold text-blue-400">{progressPct}{o.progressPct}</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg,#3B82F6,#6366F1)' }} />
                </div>
              </div>
            )}

            {/* Staging optional notice */}
            {isStaging && (
              <div className="mb-5 flex items-center gap-2 bg-violet-500/20 border border-violet-500/30 rounded-2xl px-4 py-2.5 text-violet-200 text-xs font-semibold">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {o.stagingOptionalNotice ?? 'Trial mode — all fields are optional for testing'}
              </div>
            )}

            {/* Step indicator */}
            <div className="flex items-center gap-0 mb-8">
              {STEPS.map((s, i) => (
                <div key={s.num} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all
                      ${step > s.num ? 'bg-emerald-500 text-white' : step === s.num ? 'bg-blue-600 text-white ring-4 ring-blue-600/20' : 'bg-white/10 text-slate-500'}`}>
                      {step > s.num ? <Icons.check size={16} /> : s.icon}
                    </div>
                    <p className={`text-xs mt-2 font-semibold text-center max-w-[80px] ${step === s.num ? 'text-white' : 'text-slate-500'}`}>
                      {s.title}
                    </p>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-2 rounded-full transition-all ${step > s.num ? 'bg-emerald-500' : 'bg-white/10'}`} />
                  )}
                </div>
              ))}
            </div>

            {/* ────────────── Card ────────────── */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-2xl border border-transparent dark:border-slate-700">

              {/* ── Step 1: Business Registration ── */}
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{o.step1Title}</h2>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">{o.step1DescFlexible ?? o.step1Desc}</p>
                  </div>

                  {/* Business Type Toggle */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                      {o.businessType}{!isStaging && REQ_DOT}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {([
                        { key: 'corporate' as const, label: o.corporate, icon: (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                          </svg>
                        )},
                        { key: 'individual' as const, label: o.individual, icon: (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                          </svg>
                        )},
                      ] as { key: 'corporate' | 'individual'; label: string; icon: React.ReactNode }[]).map(bt => (
                        <button
                          key={bt.key}
                          onClick={() => { setBusinessType(bt.key); setCrOk(false); }}
                          className={`flex items-center gap-2.5 p-3.5 rounded-xl border-2 text-sm font-semibold transition-all text-start
                            ${businessType === bt.key
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
                        >
                          <span className={businessType === bt.key ? 'text-blue-600' : 'text-slate-400'}>{bt.icon}</span>
                          <span className="leading-tight">{bt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* CR Number (Corporate only — exactly 10 digits) */}
                  {businessType === 'corporate' && (
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        {o.crNumber}{strictMode && !isStaging && REQ_DOT}
                      </label>
                      <div className="relative">
                        <input value={form.cr} onChange={set('cr')} placeholder="1010XXXXXX"
                          maxLength={10}
                          className={`${INPUT} ${strictMode && !isStaging && touched && form.cr && !crTenDigits ? 'border-red-300 ring-2 ring-red-100' : ''}`}
                          style={{ direction: 'ltr', letterSpacing: '0.08em', fontFamily: 'monospace' }} />
                        {crOk && <span className="absolute end-3 top-2.5 text-emerald-500"><Icons.check size={16} /></span>}
                      </div>
                      {strictMode && !isStaging && touched && form.cr && !crTenDigits && (
                        <p className="mt-1 text-[11px] text-red-500 font-semibold flex items-center gap-1">
                          <Icons.x size={10} />{o.crExactHint ?? 'Must be exactly 10 digits'}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Freelance Certificate (Individual only) */}
                  {businessType === 'individual' && (
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        {o.freelanceCert ?? 'Freelance Certificate No.'}{strictMode && !isStaging && REQ_DOT}
                      </label>
                      <div className="relative">
                        <input value={form.freelanceCert} onChange={set('freelanceCert')}
                          placeholder={o.freelanceCertPh ?? 'FL-XXXXXXXXXX'}
                          className={`${INPUT} ${strictMode && !isStaging && touched && form.freelanceCert.trim().length < 7 ? 'border-red-300 ring-2 ring-red-100' : ''}`}
                          style={{ direction: 'ltr', letterSpacing: '0.04em' }} />
                        {crOk && <span className="absolute end-3 top-2.5 text-emerald-500"><Icons.check size={16} /></span>}
                      </div>
                      <p className="mt-1.5 text-[11px] text-slate-400">
                        {lang === 'ar' ? 'وثيقة العمل الحر الصادرة عن وزارة الموارد البشرية' : 'Freelance Work Certificate — issued by the Ministry of HR'}
                      </p>
                    </div>
                  )}

                  {/* VAT — Optional */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      {o.vatNumber}
                      <span className="text-[10px] font-semibold text-slate-400 normal-case tracking-normal bg-slate-100 px-1.5 py-0.5 rounded-full">
                        {o.vatOptionalBadge ?? 'Optional'}
                      </span>
                    </label>
                    <input value={form.vat} onChange={set('vat')} placeholder={o.vatPlaceholder}
                      className={INPUT} style={{ direction: 'ltr', letterSpacing: '0.04em' }} />
                  </div>

                  {/* National Address — Optional */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      {o.natAddress}
                      <span className="text-[10px] font-semibold text-slate-400 normal-case tracking-normal bg-slate-100 px-1.5 py-0.5 rounded-full">
                        {o.vatOptionalBadge ?? 'Optional'}
                      </span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <input value={form.natCity}   onChange={set('natCity')}   placeholder={o.natAddrCity}   className={INPUT} />
                      <input value={form.natDistr}  onChange={set('natDistr')}  placeholder={o.natAddrDistr}  className={INPUT} />
                      <input value={form.natStreet} onChange={set('natStreet')} placeholder={o.natAddrStreet} className={INPUT} />
                      <input value={form.natPostal} onChange={set('natPostal')} placeholder={o.natAddrPostal} className={INPUT} style={{ direction: 'ltr' }} />
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-400 flex items-center gap-1">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      {o.skipAddrHint ?? 'Skip for now — add later in unit settings'}
                    </p>
                  </div>

                  {/* Verify button */}
                  {!crOk && (
                    <button
                      onClick={fakeValidate}
                      disabled={validating || (businessType === 'corporate' ? !form.cr : !form.freelanceCert)}
                      className="w-full py-2.5 rounded-xl text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                      {validating
                        ? <><span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />{o.validating}</>
                        : businessType === 'individual'
                          ? (o.verifyFreelance ?? 'Verify Freelance Certificate')
                          : (o.verifyCorpBtn ?? o.verifyButton)}
                    </button>
                  )}
                  {crOk && (
                    <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold bg-emerald-50 rounded-xl px-4 py-3">
                      <Icons.check size={16} />
                      <span>{o.verified}</span>
                      <span className="ms-auto text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        {businessType === 'individual'
                          ? (o.successFreelancer ?? 'Freelancer')
                          : (o.successCorporate ?? 'Corporate')}
                      </span>
                    </div>
                  )}
                  {strictMode && !isStaging && touched && !step1Valid && (
                    <p className="text-xs text-red-500 font-semibold flex items-center gap-1.5">
                      <Icons.x size={12} /> {o.fieldRequired}
                    </p>
                  )}
                </div>
              )}

              {/* ── Step 2: Profile Setup ── */}
              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{o.step2Title}</h2>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">{o.step2Desc}</p>
                  </div>

                  {/* Google autofill CTA */}
                  <button
                    onClick={handleGoogleAutofill}
                    disabled={googleFilling}
                    className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all text-sm font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-60"
                  >
                    {googleFilling ? (
                      <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      /* Google G multi-colour logo */
                      <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                        <path d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" fill="#FFC107"/>
                        <path d="M6.3 14.7l7 5.1C15 16.1 19.1 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 16.3 2 9.6 7.4 6.3 14.7z" fill="#FF3D00"/>
                        <path d="M24 46c5.5 0 10.5-1.9 14.3-5.1l-6.6-5.6C29.6 37 26.9 38 24 38c-6.1 0-10.8-3.9-12.3-9.3l-7 5.3C8.1 41.3 15.5 46 24 46z" fill="#4CAF50"/>
                        <path d="M44.5 20H24v8.5h11.8c-.7 2.3-2.1 4.3-3.9 5.7l6.6 5.6C42.7 36.2 46 30.5 46 24c0-1.3-.2-2.7-.5-4z" fill="#1976D2"/>
                      </svg>
                    )}
                    {o.googleBtn ?? (lang === 'ar' ? 'المتابعة عبر Google' : 'Continue with Google')}
                  </button>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-slate-100 dark:bg-slate-700" />
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">
                      {lang === 'ar' ? 'أو أدخل البيانات يدوياً' : 'or fill in manually'}
                    </span>
                    <div className="flex-1 h-px bg-slate-100 dark:bg-slate-700" />
                  </div>

                  {/* Personal info fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {([
                      { label: o.ownerName,       key: 'ownerName',  ph: lang === 'ar' ? 'عبدالرحمن الرشيدي' : 'Abdulrahman Al-Rashidi', minLen: 1,  type: 'text',  autoC: 'name' },
                      { label: o.ownerEmail,      key: 'email',      ph: 'owner@example.com',  minLen: 5,  type: 'email', autoC: 'email' },
                      { label: o.ownerPhone,      key: 'phone',      ph: '+966 5X XXX XXXX',   minLen: 9,  type: 'tel',   autoC: 'tel' },
                      { label: o.ownerNationalId, key: 'nationalId', ph: '1XXXXXXXXX',          minLen: 10, type: 'text',  autoC: 'off' },
                    ] as { label: string; key: keyof typeof form; ph: string; minLen: number; type: string; autoC: string }[]).map(f => (
                      <div key={f.key}>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          {f.label}{strictMode && !isStaging && REQ_DOT}
                        </label>
                        <input
                          type={f.type}
                          value={form[f.key]} onChange={set(f.key)} placeholder={f.ph}
                          autoComplete={f.autoC}
                          className={`${INPUT} ${!isStaging ? fieldErr(form[f.key], f.minLen) : ''}`}
                          style={{ direction: 'ltr' }}
                        />
                        {/* Saudi National ID: exactly 10 digits */}
                        {f.key === 'nationalId' && strictMode && !isStaging && touched && form.nationalId && !natIdTenDigits && (
                          <p className="mt-1 text-[11px] text-red-500 font-semibold flex items-center gap-1">
                            <Icons.x size={10} />{o.natIdExactHint ?? 'Must be exactly 10 digits'}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Account Security: Username + Password */}
                  <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      </div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        {lang === 'ar' ? 'أمان الحساب' : 'Account Security'}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          {o.username ?? (lang === 'ar' ? 'اسم المستخدم' : 'Username')}{strictMode && !isStaging && REQ_DOT}
                        </label>
                        <input
                          value={form.username} onChange={set('username')}
                          placeholder={o.usernamePh ?? 'abdulrahman.rems'}
                          autoComplete="username"
                          className={`${INPUT} ${!isStaging ? fieldErr(form.username, 3) : ''}`}
                          style={{ direction: 'ltr' }}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          {o.accountPassword ?? (lang === 'ar' ? 'كلمة المرور' : 'Create Password')}{strictMode && !isStaging && REQ_DOT}
                        </label>
                        <div className="relative">
                          <input
                            type={showSignupPwd ? 'text' : 'password'}
                            value={form.password} onChange={set('password')}
                            placeholder={o.accountPasswordPh ?? (lang === 'ar' ? '8 أحرف على الأقل' : 'Min. 8 characters')}
                            autoComplete="new-password"
                            className={`${INPUT} pe-10 ${!isStaging ? fieldErr(form.password, 8) : ''}`}
                            style={{ direction: 'ltr' }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowSignupPwd(v => !v)}
                            className="absolute inset-y-0 end-0 pe-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                            aria-label={showSignupPwd ? 'Hide password' : 'Show password'}
                          >
                            {showSignupPwd ? <Icons.eyeOff size={16} /> : <Icons.eye size={16} />}
                          </button>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {lang === 'ar' ? 'يدعم اقتراح كلمة مرور قوية من المتصفح' : "Browser's strong password suggestion supported"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bank — Optional */}
                  <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <Icons.creditCard size={14} className="text-blue-500 dark:text-blue-400" />
                      </div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{o.bankVerification}</p>
                      <span className="text-xs text-slate-400 dark:text-slate-500">({lang === 'ar' ? 'اختياري' : 'Optional'})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">{o.bankName}</label>
                        <select className={INPUT + ' bg-white dark:bg-slate-900'} value={form.bankName} onChange={set('bankName')}>
                          <option value="">— {o.selectBank} —</option>
                          {['Al Rajhi Bank','SNB (NCB)','Riyad Bank','Arab National Bank','Banque Saudi Fransi','Saudi British Bank (SABB)'].map(b => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">{o.bankIban}</label>
                        <input value={form.iban} onChange={set('iban')} placeholder={o.ibanPlaceholder}
                          className={INPUT} style={{ direction: 'ltr', fontFamily: 'monospace' }} />
                      </div>
                    </div>
                  </div>

                  {strictMode && !isStaging && touched && !step2Valid && (
                    <p className="text-xs text-red-500 font-semibold flex items-center gap-1.5">
                      <Icons.x size={12} /> {o.fieldRequired}
                    </p>
                  )}
                </div>
              )}

              {/* ── Step 3: Payment ── */}
              {step === 3 && showPayment && (() => {
                /* Checkout form */
                if (paySubStep === 'checkout') {
                  return (
                    <MoyasarCheckout
                      amountSAR={discounted}
                      description={`REMS ${selectedPlan} — Monthly Subscription`}
                      metadata={{ plan: selectedPlan, promo_code: promoApplied }}
                      onSuccess={handleCheckoutSuccess}
                      onFail={handleCheckoutFail}
                      onBack={() => setPaySubStep('summary')}
                      overrideKey={isStaging ? STAGING_MOYASAR_TEST_KEY : undefined}
                    />
                  );
                }

                /* Success */
                if (paySubStep === 'success') {
                  return (
                    <div className="flex flex-col items-center text-center gap-5 py-4">
                      <div className="w-20 h-20 rounded-full flex items-center justify-center bg-emerald-100">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-xl font-extrabold text-slate-900">{p.checkoutSuccess}</h2>
                        <p className="text-sm text-slate-500 mt-1">{p.checkoutSuccessMsg}</p>
                      </div>
                      <div className="w-full bg-emerald-50 rounded-2xl border border-emerald-100 p-4 space-y-2" style={{ direction: 'ltr' }}>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">{lang === 'ar' ? 'نوع الحساب' : 'Account type'}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${businessType === 'individual' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
                            {businessType === 'individual' ? (o.successFreelancer ?? 'Freelancer') : (o.successCorporate ?? 'Corporate')}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">{lang === 'ar' ? 'الخطة' : 'Plan'}</span>
                          <span className="font-bold text-slate-900">{selectedPlan}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">{lang === 'ar' ? 'المبلغ المدفوع' : 'Amount charged'}</span>
                          <span className="font-extrabold text-emerald-700">SAR {discounted}/mo</span>
                        </div>
                        {promoApplied && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">{lang === 'ar' ? 'الكوبون' : 'Promo'}</span>
                            <span className="font-bold text-emerald-700">{promoApplied} (−{discountPct}%)</span>
                          </div>
                        )}
                      </div>
                      {/* Enter Dashboard — primary CTA after successful payment */}
                      <button
                        onClick={() => { if (promoApplied) redeemPromoCode(promoApplied); onComplete(selectedPlan, promoApplied); }}
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-extrabold text-sm text-white transition-all hover:opacity-90 shadow-lg shadow-emerald-500/20"
                        style={{ background: 'linear-gradient(135deg,#059669,#10B981)' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        {o.completeProd ?? (lang === 'ar' ? 'الدخول إلى لوحة التحكم' : 'Enter Dashboard')}
                      </button>
                    </div>
                  );
                }

                /* Failed */
                if (paySubStep === 'failed') {
                  return (
                    <div className="flex flex-col items-center text-center gap-5 py-4">
                      <div className="w-20 h-20 rounded-full flex items-center justify-center bg-red-100">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-xl font-extrabold text-slate-900">{p.checkoutFailed}</h2>
                        <p className="text-sm text-slate-500 mt-1">{lang === 'ar' ? 'يرجى المحاولة مجدداً أو استخدام وسيلة دفع أخرى.' : 'Please try again or use a different payment method.'}</p>
                      </div>
                      <button onClick={() => setPaySubStep('checkout')}
                        className="px-6 py-3 rounded-2xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                        {p.checkoutRetry}
                      </button>
                      <button onClick={() => setPaySubStep('summary')} className="text-xs text-slate-400 hover:text-slate-600">
                        {p.backToPlan}
                      </button>
                    </div>
                  );
                }

                /* Plan summary (default) */
                return (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-lg font-extrabold text-slate-900">{p.title}</h2>
                      <p className="text-sm text-slate-400 mt-0.5">
                        {isStaging
                          ? (o.trialPlanOnly ?? (lang === 'ar' ? 'يشمل حسابك التجريبي الخطة الاحترافية' : 'Your trial includes the Professional Plan'))
                          : p.subtitle}
                      </p>
                    </div>

                    {/* Registration summary */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          {lang === 'ar' ? 'ملخص التسجيل' : 'Registration Summary'}
                        </p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${businessType === 'individual' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
                          {businessType === 'individual' ? (o.successFreelancer ?? 'Freelancer') : (o.successCorporate ?? 'Corporate')}
                        </span>
                      </div>
                      <div className="space-y-1.5 text-xs text-slate-700">
                        {[
                          { label: businessType === 'corporate' ? o.crNumber : (o.freelanceCert ?? 'Cert.'),
                            val: businessType === 'corporate' ? form.cr || '—' : form.freelanceCert || '—' },
                          { label: o.ownerName,  val: form.ownerName || '—' },
                          { label: o.ownerEmail, val: form.email     || '—' },
                          { label: o.natAddress, val: form.natCity ? `${form.natCity}, ${form.natDistr}` : (lang === 'ar' ? '— (يُضاف لاحقاً)' : '— (add later)') },
                        ].map(r => (
                          <div key={r.label} className="flex items-center justify-between">
                            <span className="font-semibold text-slate-500">{r.label}</span>
                            <span className="font-mono text-slate-700 truncate max-w-[140px]">{r.val}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Plan selector */}
                    <div className={`grid gap-3 ${paymentPlans.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' : 'grid-cols-1 sm:grid-cols-3'}`}>
                      {paymentPlans.map(plan => (
                        <button key={plan.key}
                          onClick={() => { setPlan(plan.key); setPromoResult(null); setPromoApplied(''); setPromoInput(''); }}
                          className={`relative text-start rounded-2xl border-2 p-4 transition-all
                            ${selectedPlan === plan.key ? 'shadow-md scale-[1.02]' : 'border-slate-100 hover:border-slate-300'}`}
                          style={selectedPlan === plan.key ? { borderColor: plan.accent } : {}}>
                          {plan.popular && paymentPlans.length > 1 && (
                            <span className="absolute -top-3 start-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-full whitespace-nowrap">
                              {p.mostPopular}
                            </span>
                          )}
                          <p className="font-extrabold text-slate-900 text-sm">{plan.label}</p>
                          <p className="text-[11px] text-slate-400 mt-1 leading-snug">{plan.desc}</p>
                          <p className="font-extrabold mt-2 text-sm" style={{ color: plan.accent, direction: 'ltr' }}>{plan.price}</p>
                          {selectedPlan === plan.key && (
                            <div className="absolute top-2 end-2 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: plan.accent }}>
                              <Icons.check size={10} className="text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Promo code */}
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">{p.promoLabel}</label>
                      {!promoApplied ? (
                        <div className="flex gap-2">
                          <input
                            value={promoInput}
                            onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoResult(null); }}
                            placeholder={p.promoPlaceholder}
                            className={INPUT + ' flex-1'}
                            style={{ direction: 'ltr', fontFamily: 'monospace', letterSpacing: '0.05em' }}
                          />
                          <button onClick={handleApplyPromo} disabled={!promoInput.trim()}
                            className="px-4 py-2.5 rounded-xl text-sm font-bold bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-40 transition-all whitespace-nowrap">
                            {p.promoApply}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between bg-emerald-50 rounded-xl px-4 py-3 border border-emerald-200">
                          <div className="flex items-center gap-2">
                            <Icons.check size={14} className="text-emerald-600" />
                            <span className="text-sm font-bold text-emerald-700">{promoApplied}</span>
                            <span className="text-xs text-emerald-600">— {promoResult?.discount}% {p.discount}</span>
                          </div>
                          <button onClick={handleRemovePromo} className="text-xs text-slate-400 hover:text-red-500 transition-colors font-semibold">
                            {p.promoRemove}
                          </button>
                        </div>
                      )}
                      {promoResult && !promoResult.valid && (
                        <p className="mt-1.5 text-xs text-red-500 font-semibold flex items-center gap-1">
                          <Icons.x size={12} /> {promoResult.message}
                        </p>
                      )}
                    </div>

                    {/* Price summary */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">{p.originalPrice}</span>
                        <span className="font-semibold text-slate-700" style={{ direction: 'ltr' }}>SAR {basePrice}{p.perMonth}</span>
                      </div>
                      {discountPct > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-emerald-600 font-semibold">{p.discount} ({discountPct}%)</span>
                          <span className="font-semibold text-emerald-600" style={{ direction: 'ltr' }}>– SAR {basePrice - discounted}</span>
                        </div>
                      )}
                      <div className="border-t border-slate-200 pt-2 flex items-center justify-between">
                        <span className="font-extrabold text-slate-900">{p.totalDue}</span>
                        <span className="font-extrabold text-blue-600 text-lg" style={{ direction: 'ltr' }}>SAR {discounted}{p.perMonth}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">{p.vatNote}</p>
                    </div>
                    <p className="text-[11px] text-slate-400 text-center">{p.trialNote}</p>
                  </div>
                );
              })()}

              {/* ── Navigation footer ── */}
              {!(step === 3 && showPayment && (paySubStep === 'checkout' || paySubStep === 'success' || paySubStep === 'failed')) && (
                <div className="flex items-center justify-between mt-7 pt-5 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    {step > 1 && (
                      <button onClick={() => setStep(s => (s - 1) as Step)}
                        className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors">
                        <Icons.chevronLeft size={16} className="sidebar-chevron" /> {o.back}
                      </button>
                    )}
                    {!strictMode && (
                      <button onClick={() => onComplete()} className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
                        {o.skip}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">{o.step} {step} {o.of} {totalSteps}</span>
                    {/* Enter Dashboard button after payment success */}
                    {step === 3 && showPayment && paySubStep === 'success' ? (
                      <button
                        onClick={() => { redeemPromoCode(promoApplied); onComplete(selectedPlan, promoApplied); }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 shadow-lg shadow-emerald-500/20"
                        style={{ background: 'linear-gradient(135deg,#059669,#047857)' }}
                      >
                        {o.completeProd ?? 'Enter Dashboard'}
                        <Icons.chevronRight size={15} className="sidebar-chevron" />
                      </button>
                    ) : (
                      <button
                        onClick={handleNext}
                        disabled={strictMode && !isStaging && !canGoNext}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 shadow-lg shadow-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: 'linear-gradient(135deg,#2563EB,#4F46E5)' }}
                      >
                        {nextBtnLabel}
                        {step < totalSteps && <Icons.chevronRight size={15} className="sidebar-chevron" />}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
