'use client';

import { useState } from 'react';
import { Icons } from '@/lib/icons';
import { useLang } from '@/lib/language-context';

type Step = 1 | 2 | 3;

const PLANS = ['Basic', 'Pro', 'Enterprise'] as const;

const INPUT = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-slate-300';

export default function OnboardingPage({ onComplete }: { onComplete: () => void }) {
  const { t, lang } = useLang();
  const o = t.onboarding;

  const [step, setStep]         = useState<Step>(1);
  const [validating, setVal]    = useState(false);
  const [crOk, setCrOk]         = useState(false);
  const [vatOk, setVatOk]       = useState(false);
  const [selectedPlan, setPlan] = useState<typeof PLANS[number]>('Pro');

  const [form, setForm] = useState({
    cr: '', vat: '', natCity: '', natDistr: '', natStreet: '', natPostal: '',
    ownerName: '', email: '', phone: '', nationalId: '',
    bankName: '', iban: '',
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const fakeValidate = async () => {
    setVal(true);
    await new Promise(r => setTimeout(r, 1200));
    setCrOk(true); setVatOk(true);
    setVal(false);
  };

  const STEPS = [
    { num: 1, title: o.step1Title, desc: o.step1Desc, icon: <Icons.building size={16} /> },
    { num: 2, title: o.step2Title, desc: o.step2Desc, icon: <Icons.user size={16} /> },
    { num: 3, title: o.step3Title, desc: o.step3Desc, icon: <Icons.star size={16} /> },
  ];

  const planData = [
    { key: 'Basic',      label: o.planBasic,      desc: o.planBasicDesc, price: o.planBasicPrice,  accent: '#64748B', popular: false },
    { key: 'Pro',        label: o.planPro,         desc: o.planProDesc,   price: o.planProPrice,    accent: '#3B82F6', popular: true  },
    { key: 'Enterprise', label: o.planEnterprise,  desc: o.planEntDesc,   price: o.planEntPrice,    accent: '#8B5CF6', popular: false },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-6">

      {/* Decorative blobs */}
      <div className="absolute top-0 start-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 end-0 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-2xl">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-xl text-white mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg,#3B82F6,#6366F1)' }}>R</div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">{o.title}</h1>
          <p className="text-slate-400 mt-1 text-sm">{o.subtitle}</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.num} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all
                  ${step > s.num ? 'bg-emerald-500 text-white' : step === s.num ? 'bg-blue-600 text-white ring-4 ring-blue-600/20' : 'bg-white/10 text-slate-500'}`}>
                  {step > s.num ? <Icons.check size={16} /> : s.icon}
                </div>
                <p className={`text-xs mt-2 font-semibold text-center ${step === s.num ? 'text-white' : 'text-slate-500'}`}>{s.title}</p>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 mx-2 rounded-full transition-all ${step > s.num ? 'bg-emerald-500' : 'bg-white/10'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-8 shadow-2xl">

          {/* ── Step 1: Commercial Validation ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">{o.step1Title}</h2>
                <p className="text-sm text-slate-400 mt-0.5">{o.step1Desc}</p>
              </div>

              {/* CR */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">{o.crNumber}</label>
                <div className="relative">
                  <input value={form.cr} onChange={set('cr')} placeholder={o.crPlaceholder} className={INPUT} />
                  {crOk && <span className="absolute end-3 top-2.5 text-emerald-500"><Icons.check size={16} /></span>}
                </div>
              </div>

              {/* VAT */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">{o.vatNumber}</label>
                <div className="relative">
                  <input value={form.vat} onChange={set('vat')} placeholder={o.vatPlaceholder} className={INPUT} />
                  {vatOk && <span className="absolute end-3 top-2.5 text-emerald-500"><Icons.check size={16} /></span>}
                </div>
              </div>

              {/* National Address */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">{o.natAddress}</label>
                <div className="grid grid-cols-2 gap-3">
                  <input value={form.natCity}   onChange={set('natCity')}   placeholder={o.natAddrCity}   className={INPUT} />
                  <input value={form.natDistr}  onChange={set('natDistr')}  placeholder={o.natAddrDistr}  className={INPUT} />
                  <input value={form.natStreet} onChange={set('natStreet')} placeholder={o.natAddrStreet} className={INPUT} />
                  <input value={form.natPostal} onChange={set('natPostal')} placeholder={o.natAddrPostal} className={INPUT} style={{ direction: 'ltr' }} />
                </div>
              </div>

              {/* Validate button */}
              {!crOk && (
                <button onClick={fakeValidate} disabled={validating || !form.cr || !form.vat}
                  className="w-full py-2.5 rounded-xl text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                  {validating
                    ? <><span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />{o.validating}</>
                    : <>{o.crNumber} + {o.vatNumber} Verify</>}
                </button>
              )}
              {crOk && (
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold bg-emerald-50 rounded-xl px-4 py-3">
                  <Icons.check size={16} /> {o.verified}
                </div>
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
                {[
                  { label: o.ownerName,       key: 'ownerName',   ph: lang === 'ar' ? 'عبدالرحمن الرشيدي' : 'Abdulrahman Al-Rashidi' },
                  { label: o.ownerEmail,      key: 'email',       ph: 'owner@example.com' },
                  { label: o.ownerPhone,      key: 'phone',       ph: '+966 5X XXX XXXX' },
                  { label: o.ownerNationalId, key: 'nationalId',  ph: '1XXXXXXXXX' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">{f.label}</label>
                    <input value={form[f.key as keyof typeof form]} onChange={set(f.key as keyof typeof form)}
                      placeholder={f.ph} className={INPUT} style={{ direction: 'ltr' }} />
                  </div>
                ))}
              </div>

              {/* Bank section */}
              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Icons.creditCard size={14} className="text-blue-600" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">{lang === 'ar' ? 'التحقق البنكي' : 'Bank Verification'}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">{o.bankName}</label>
                    <select className={INPUT + ' bg-white'} value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))}>
                      <option value="">— {lang === 'ar' ? 'اختر البنك' : 'Select bank'} —</option>
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
            </div>
          )}

          {/* ── Step 3: Subscription ── */}
          {step === 3 && (
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
                        {lang === 'ar' ? 'الأكثر شيوعاً' : 'Most Popular'}
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

              {/* Flow diagram summary */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  {lang === 'ar' ? 'رحلة التفعيل' : 'Activation Journey'}
                </p>
                <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600">
                  {[
                    lang === 'ar' ? 'التحقق التجاري' : 'CR/VAT Verify',
                    lang === 'ar' ? 'إعداد الملف' : 'Profile Setup',
                    lang === 'ar' ? 'اختيار الباقة' : 'Plan Selected',
                    lang === 'ar' ? 'إضافة عقار' : 'Add Property',
                    lang === 'ar' ? 'ربط القنوات' : 'Connect Channels',
                    lang === 'ar' ? 'تشغيل مباشر' : 'Go Live!',
                  ].map((item, i, arr) => (
                    <>
                      <span key={i} className={`font-semibold px-2 py-1 rounded-lg ${i <= 2 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{item}</span>
                      {i < arr.length - 1 && <span className="text-slate-300" key={'a'+i}>{lang === 'ar' ? '←' : '→'}</span>}
                    </>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-7 pt-5 border-t border-slate-100">
            <div className="flex items-center gap-3">
              {step > 1 && (
                <button onClick={() => setStep(s => (s - 1) as Step)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors">
                  <Icons.chevronLeft size={16} className="sidebar-chevron" /> {o.back}
                </button>
              )}
              <button onClick={onComplete} className="text-sm text-slate-400 hover:text-slate-600 transition-colors">{o.skip}</button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">{o.step} {step} {o.of} 3</span>
              <button
                onClick={() => step < 3 ? setStep(s => (s + 1) as Step) : onComplete()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 shadow-lg shadow-blue-500/20"
                style={{ background: 'linear-gradient(135deg,#2563EB,#4F46E5)' }}>
                {step === 3 ? o.finish : o.next}
                {step < 3 && <Icons.chevronRight size={15} className="sidebar-chevron" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
