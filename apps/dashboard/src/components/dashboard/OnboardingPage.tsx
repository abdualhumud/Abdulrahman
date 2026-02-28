'use client';

import { useState, useEffect } from 'react';
import { Icons } from '@/lib/icons';
import { useLang } from '@/lib/language-context';
import { validatePromoCode, redeemPromoCode, type PromoValidationResult } from '@/lib/promo-service';

type Step = 1 | 2 | 3 | 4;

const PLANS = ['Basic', 'Pro', 'Enterprise'] as const;

const INPUT =
  'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-slate-300';

const REQ_DOT = (
  <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 mb-0.5 ms-0.5" title="Required" />
);

interface Props {
  onComplete: (plan?: string, promoCode?: string) => void;
  /** strictMode=true (production/staging): Skip hidden, Next blocked until required fields filled */
  strictMode?: boolean;
  /** showPayment=true: show Step 4 payment/checkout step */
  showPayment?: boolean;
}

export default function OnboardingPage({ onComplete, strictMode = false, showPayment = false }: Props) {
  const { t, lang, toggle } = useLang();
  const o = t.onboarding;
  const p = t.payment;

  const totalSteps: Step = showPayment ? 4 : 3;

  const [step, setStep]         = useState<Step>(1);
  const [validating, setVal]    = useState(false);
  const [crOk, setCrOk]         = useState(false);
  const [selectedPlan, setPlan] = useState<typeof PLANS[number]>('Pro');
  const [touched, setTouched]   = useState(false);

  // Payment / promo state
  const [promoInput,  setPromoInput]  = useState('');
  const [promoResult, setPromoResult] = useState<PromoValidationResult | null>(null);
  const [promoApplied, setPromoApplied] = useState('');

  const [form, setForm] = useState({
    cr: '', vat: '', natCity: '', natDistr: '', natStreet: '', natPostal: '',
    ownerName: '', email: '', phone: '', nationalId: '',
    bankName: '', iban: '',
  });
  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  /* ── Promo code logic ── */
  const handleApplyPromo = () => {
    const result = validatePromoCode(promoInput);
    setPromoResult(result);
    if (result.valid && result.code) setPromoApplied(result.code);
  };
  const handleRemovePromo = () => {
    setPromoInput(''); setPromoResult(null); setPromoApplied('');
  };

  const planPrices: Record<typeof PLANS[number], number> = {
    Basic: p.planBasicRaw as unknown as number,
    Pro:   p.planProRaw   as unknown as number,
    Enterprise: p.planEntRaw as unknown as number,
  };
  const basePrice   = planPrices[selectedPlan] ?? 349;
  const discountPct = (promoResult?.valid ? promoResult.discount : 0);
  const discounted  = Math.round(basePrice * (1 - discountPct / 100));

  /* ── Validation ── */
  const step1Valid = !strictMode || (
    form.cr.trim().length >= 7 &&
    form.vat.trim().length >= 10 &&
    form.natCity.trim() !== '' &&
    form.natDistr.trim() !== '' &&
    form.natStreet.trim() !== ''
  );
  const step2Valid = !strictMode || (
    form.ownerName.trim() !== '' &&
    form.email.trim().includes('@') &&
    form.phone.trim().length >= 9 &&
    form.nationalId.trim().length >= 9
  );
  const canGoNext =
    (step === 1 && step1Valid) ||
    (step === 2 && step2Valid) ||
    step === 3 ||
    step === 4;

  /* Progress percentage (strict only) */
  const filledCount = [
    form.cr, form.vat, form.natCity, form.natDistr, form.natStreet,
    form.ownerName, form.email, form.phone, form.nationalId, form.bankName, form.iban,
  ].filter(v => v.trim() !== '').length;
  const progressPct = Math.min(100, Math.round(((step - 1) / totalSteps) * 100 + (filledCount / 11) * (100 / totalSteps)));

  const fakeValidate = async () => {
    setVal(true);
    await new Promise(r => setTimeout(r, 1200));
    setCrOk(true);
    setVal(false);
  };

  const handleNext = () => {
    if (strictMode) setTouched(true);
    if (!canGoNext) return;
    if (step < totalSteps) { setStep(s => (s + 1) as Step); setTouched(false); }
    else {
      if (promoApplied) redeemPromoCode(promoApplied);
      onComplete(selectedPlan, promoApplied);
    }
  };

  const fieldErr = (val: string, minLen = 1) =>
    strictMode && touched && val.trim().length < minLen ? 'border-red-300 ring-2 ring-red-100' : '';

  const STEPS = [
    { num: 1, title: o.step1Title, icon: <Icons.building size={16} /> },
    { num: 2, title: o.step2Title, icon: <Icons.user size={16} /> },
    {
      num: 3,
      title: strictMode ? o.step3TitleProd : o.step3Title,
      icon:  strictMode ? <Icons.properties size={16} /> : <Icons.star size={16} />,
    },
    ...(showPayment ? [{ num: 4, title: p.title, icon: <Icons.creditCard size={16} /> }] : []),
  ];

  const planData = [
    { key: 'Basic',      label: o.planBasic,     desc: o.planBasicDesc, price: o.planBasicPrice, accent: '#64748B', popular: false },
    { key: 'Pro',        label: o.planPro,        desc: o.planProDesc,   price: o.planProPrice,   accent: '#3B82F6', popular: true  },
    { key: 'Enterprise', label: o.planEnterprise, desc: o.planEntDesc,   price: o.planEntPrice,   accent: '#8B5CF6', popular: false },
  ];

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-6"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="absolute top-0 start-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 end-0 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-2xl">

        {/* Language toggle */}
        <div className="flex justify-end mb-4">
          <button
            onClick={toggle}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/20"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            {lang === 'ar' ? 'English' : 'عربي'}
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-xl text-white mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg,#3B82F6,#6366F1)' }}
          >R</div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">{o.title}</h1>
          <p className="text-slate-400 mt-1 text-sm">{o.subtitle}</p>
        </div>

        {/* Progress bar — production strict mode only */}
        {strictMode && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-1.5 px-0.5">
              <span className="text-xs text-slate-400 font-semibold">{o.strictNotice}</span>
              <span className="text-xs font-extrabold text-blue-400">{progressPct}{o.progressPct}</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg,#3B82F6,#6366F1)' }}
              />
            </div>
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
        <div className="bg-white rounded-3xl p-8 shadow-2xl">

          {/* ── Step 1: Commercial Validation ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">{o.step1Title}</h2>
                <p className="text-sm text-slate-400 mt-0.5">{o.step1Desc}</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  {o.crNumber}{strictMode && REQ_DOT}
                </label>
                <div className="relative">
                  <input value={form.cr} onChange={set('cr')} placeholder={o.crPlaceholder}
                    className={`${INPUT} ${fieldErr(form.cr, 7)}`} />
                  {crOk && <span className="absolute end-3 top-2.5 text-emerald-500"><Icons.check size={16} /></span>}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  {o.vatNumber}{strictMode && REQ_DOT}
                </label>
                <input value={form.vat} onChange={set('vat')} placeholder={o.vatPlaceholder}
                  className={`${INPUT} ${fieldErr(form.vat, 10)}`} />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  {o.natAddress}{strictMode && REQ_DOT}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input value={form.natCity}   onChange={set('natCity')}
                    placeholder={o.natAddrCity}   className={`${INPUT} ${fieldErr(form.natCity)}`} />
                  <input value={form.natDistr}  onChange={set('natDistr')}
                    placeholder={o.natAddrDistr}  className={`${INPUT} ${fieldErr(form.natDistr)}`} />
                  <input value={form.natStreet} onChange={set('natStreet')}
                    placeholder={o.natAddrStreet} className={`${INPUT} ${fieldErr(form.natStreet)}`} />
                  <input value={form.natPostal} onChange={set('natPostal')}
                    placeholder={o.natAddrPostal} className={INPUT} style={{ direction: 'ltr' }} />
                </div>
              </div>

              {!crOk && (
                <button onClick={fakeValidate} disabled={validating || !form.cr || !form.vat}
                  className="w-full py-2.5 rounded-xl text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                  {validating
                    ? <><span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />{o.validating}</>
                    : o.verifyButton}
                </button>
              )}
              {crOk && (
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold bg-emerald-50 rounded-xl px-4 py-3">
                  <Icons.check size={16} /> {o.verified}
                </div>
              )}
              {strictMode && touched && !step1Valid && (
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
                <h2 className="text-lg font-extrabold text-slate-900">{o.step2Title}</h2>
                <p className="text-sm text-slate-400 mt-0.5">{o.step2Desc}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {([
                  { label: o.ownerName,       key: 'ownerName',  ph: lang === 'ar' ? 'عبدالرحمن الرشيدي' : 'Abdulrahman Al-Rashidi', minLen: 1 },
                  { label: o.ownerEmail,      key: 'email',      ph: 'owner@example.com', minLen: 5 },
                  { label: o.ownerPhone,      key: 'phone',      ph: '+966 5X XXX XXXX',  minLen: 9 },
                  { label: o.ownerNationalId, key: 'nationalId', ph: '1XXXXXXXXX',         minLen: 9 },
                ] as { label: string; key: keyof typeof form; ph: string; minLen: number }[]).map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      {f.label}{strictMode && REQ_DOT}
                    </label>
                    <input
                      value={form[f.key]} onChange={set(f.key)} placeholder={f.ph}
                      className={`${INPUT} ${fieldErr(form[f.key], f.minLen)}`}
                      style={{ direction: 'ltr' }}
                    />
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Icons.creditCard size={14} className="text-blue-600" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">{o.bankVerification}</p>
                  <span className="text-xs text-slate-400">({lang === 'ar' ? 'اختياري' : 'Optional'})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">{o.bankName}</label>
                    <select className={INPUT + ' bg-white'} value={form.bankName} onChange={set('bankName')}>
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

              {strictMode && touched && !step2Valid && (
                <p className="text-xs text-red-500 font-semibold flex items-center gap-1.5">
                  <Icons.x size={12} /> {o.fieldRequired}
                </p>
              )}
            </div>
          )}

          {/* ── Step 3 (Demo mode): Subscription Plan ── */}
          {step === 3 && !strictMode && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">{o.step3Title}</h2>
                <p className="text-sm text-slate-400 mt-0.5">{o.step3Desc}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {planData.map(plan => (
                  <button key={plan.key} onClick={() => setPlan(plan.key as typeof PLANS[number])}
                    className={`relative text-start rounded-2xl border-2 p-5 transition-all
                      ${selectedPlan === plan.key ? 'shadow-lg scale-[1.02]' : 'border-slate-100 hover:border-slate-300'}`}
                    style={selectedPlan === plan.key ? { borderColor: plan.accent } : {}}>
                    {plan.popular && (
                      <span className="absolute -top-3 start-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-full whitespace-nowrap">
                        {o.mostPopular}
                      </span>
                    )}
                    <div className="w-8 h-8 rounded-xl mb-3 flex items-center justify-center"
                      style={{ background: plan.accent + '18', color: plan.accent }}>
                      <Icons.star size={15} />
                    </div>
                    <p className="font-extrabold text-slate-900 text-base">{plan.label}</p>
                    <p className="text-xs text-slate-400 mt-1 leading-snug">{plan.desc}</p>
                    <p className="font-extrabold mt-3 text-base" style={{ color: plan.accent, direction: 'ltr' }}>{plan.price}</p>
                    {selectedPlan === plan.key && (
                      <div className="absolute top-3 end-3 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: plan.accent }}>
                        <Icons.check size={12} className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{o.activationJourney}</p>
                <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600">
                  {[o.journeyStep1, o.journeyStep2, o.journeyStep3, o.journeyStep4, o.journeyStep5, o.journeyStep6].map((item, i, arr) => (
                    <span key={i} className="flex items-center gap-2">
                      <span className={`font-semibold px-2 py-1 rounded-lg ${i <= 2 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{item}</span>
                      {i < arr.length - 1 && <span className="text-slate-300">→</span>}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3 (Production strict): Add First Property ── */}
          {step === 3 && strictMode && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">{o.step3TitleProd}</h2>
                <p className="text-sm text-slate-400 mt-0.5">{o.step3DescProd}</p>
              </div>

              <div className="rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-8 flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center">
                  <Icons.properties size={28} className="text-blue-500" />
                </div>
                <div>
                  <p className="font-extrabold text-slate-900 text-base">{o.step3TitleProd}</p>
                  <p className="text-sm text-slate-500 mt-1 max-w-xs">{o.firstUnitHint}</p>
                </div>
                <div className="text-start space-y-2 w-full max-w-xs">
                  {[
                    lang === 'ar' ? 'البحث بالعنوان الوطني (SPL)' : 'Auto-fill via Saudi National Address (SPL)',
                    lang === 'ar' ? 'تحديد الموقع على الخريطة التفاعلية' : 'Pin exact location on interactive map',
                    lang === 'ar' ? 'ربط Airbnb و Booking.com و Gathern' : 'Connect Airbnb, Booking.com & Gathern',
                    lang === 'ar' ? 'رفع صور الوحدة (حتى 10 صور)' : 'Upload unit photos (up to 10)',
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                      <Icons.check size={13} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Registration summary */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  {lang === 'ar' ? 'ملخص التسجيل' : 'Registration Summary'}
                </p>
                <div className="space-y-1.5 text-xs text-slate-700">
                  {[
                    { label: o.crNumber,    val: form.cr || '—' },
                    { label: o.ownerName,   val: form.ownerName || '—' },
                    { label: o.natAddress,  val: form.natCity ? `${form.natCity}, ${form.natDistr}` : '—' },
                    { label: o.ownerEmail,  val: form.email || '—' },
                  ].map(r => (
                    <div key={r.label} className="flex items-center justify-between">
                      <span className="font-semibold text-slate-500">{r.label}</span>
                      <span className="font-mono text-slate-700 truncate max-w-[140px]">{r.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 4: Payment & Promo Code ── */}
          {step === 4 && showPayment && (() => {
            const plans = [
              { key: 'Basic' as const,      label: p.planBasic, desc: p.planBasicDesc, price: p.planBasicPrice, raw: p.planBasicRaw as unknown as number, accent: '#64748B', popular: false },
              { key: 'Pro' as const,         label: p.planPro,   desc: p.planProDesc,   price: p.planProPrice,   raw: p.planProRaw   as unknown as number, accent: '#3B82F6', popular: true  },
              { key: 'Enterprise' as const,  label: p.planEnt,   desc: p.planEntDesc,   price: p.planEntPrice,   raw: p.planEntRaw   as unknown as number, accent: '#8B5CF6', popular: false },
            ];
            return (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">{p.title}</h2>
                  <p className="text-sm text-slate-400 mt-0.5">{p.subtitle}</p>
                </div>
                {/* Plan selector */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {plans.map(plan => (
                    <button key={plan.key} onClick={() => { setPlan(plan.key); setPromoResult(null); setPromoApplied(''); setPromoInput(''); }}
                      className={`relative text-start rounded-2xl border-2 p-4 transition-all
                        ${selectedPlan === plan.key ? 'shadow-md scale-[1.02]' : 'border-slate-100 hover:border-slate-300'}`}
                      style={selectedPlan === plan.key ? { borderColor: plan.accent } : {}}>
                      {plan.popular && (
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
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    {p.promoLabel}
                  </label>
                  {!promoApplied ? (
                    <div className="flex gap-2">
                      <input
                        value={promoInput}
                        onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoResult(null); }}
                        placeholder={p.promoPlaceholder}
                        className={INPUT + ' flex-1'}
                        style={{ direction: 'ltr', fontFamily: 'monospace', letterSpacing: '0.05em' }}
                      />
                      <button
                        onClick={handleApplyPromo}
                        disabled={!promoInput.trim()}
                        className="px-4 py-2.5 rounded-xl text-sm font-bold bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-40 transition-all whitespace-nowrap"
                      >{p.promoApply}</button>
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

          {/* ── Navigation ── */}
          <div className="flex items-center justify-between mt-7 pt-5 border-t border-slate-100">
            <div className="flex items-center gap-3">
              {step > 1 && (
                <button onClick={() => setStep(s => (s - 1) as Step)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors">
                  <Icons.chevronLeft size={16} className="sidebar-chevron" /> {o.back}
                </button>
              )}
              {/* Skip — demo mode only */}
              {!strictMode && (
                <button onClick={() => onComplete()} className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
                  {o.skip}
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">{o.step} {step} {o.of} {totalSteps}</span>
              <button
                onClick={handleNext}
                disabled={strictMode && !canGoNext}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 shadow-lg shadow-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg,#2563EB,#4F46E5)' }}
              >
                {step === totalSteps
                  ? (showPayment ? p.confirm : (strictMode ? o.firstUnitBtn : o.finish))
                  : step === 3 && strictMode && !showPayment
                    ? o.firstUnitBtn
                    : o.next}
                {step < totalSteps && <Icons.chevronRight size={15} className="sidebar-chevron" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
