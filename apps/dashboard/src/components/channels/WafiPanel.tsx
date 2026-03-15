'use client';

import { useState, useEffect, useRef } from 'react';
import { useLang } from '@/lib/language-context';
import { sleep, makeSimRow, type SimLogRow } from './channel-utils';

export default function WafiPanel() {
  const { t, lang } = useLang();
  const tc = t.channels;
  const [escrowLog, setEscrowLog] = useState<SimLogRow[]>([]);
  const [simulating, setSimulating] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  let _wid = 0;

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [escrowLog]);

  const addLog = (text: string, color = 'text-slate-400') =>
    setEscrowLog(prev => [...prev.slice(-29), makeSimRow(++_wid, text, color)]);

  const simulateEscrow = async () => {
    if (simulating) return;
    setSimulating(true);
    const txId = `WFI-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    addLog('→ POST /transactions  [Bearer API Key]', 'text-amber-400');
    await sleep(200);
    addLog(`✓ 201 Created — ${txId}`, 'text-emerald-400');
    await sleep(250);
    addLog(`→ Payment link: https://pay.waffyapp.com/t/${txId}`, 'text-slate-300');
    await sleep(300);
    addLog('→ Sent to guest via WhatsApp (+966 5x xxx xxxx)', 'text-blue-400');
    await sleep(500);
    addLog('✓ Webhook: transaction.funded — SAR 2,500 held in escrow', 'text-emerald-400');
    await sleep(200);
    addLog('  HMAC-SHA256 signature verified ✓', 'text-emerald-400');
    await sleep(400);
    addLog('→ Guest checked out — CleaningPage: INSPECTION_DONE', 'text-slate-300');
    await sleep(300);
    addLog(`→ POST /transactions/${txId}/deliver`, 'text-amber-400');
    await sleep(200);
    addLog('✓ 200 OK — status: delivered', 'text-emerald-400');
    await sleep(350);
    addLog(`→ POST /transactions/${txId}/release`, 'text-amber-400');
    await sleep(200);
    addLog('✓ Webhook: transaction.released — SAR 2,500 → owner account', 'text-emerald-400');
    await sleep(100);
    addLog('✓ Total flow: ~2.8s  No damage — full deposit released ✓', 'text-emerald-400');
    setSimulating(false);
  };

  const ESCROW_STEPS = [
    { num: '1', color: 'bg-emerald-700', text: lang === 'ar' ? 'POST /transactions — إنشاء معاملة ضمان جديدة للضيف' : 'POST /transactions — create escrow hold for guest deposit' },
    { num: '2', color: 'bg-blue-600',    text: lang === 'ar' ? 'مشاركة رابط الدفع الآمن مع الضيف عبر WhatsApp / SMS' : 'Share secure payment link with guest via WhatsApp / SMS' },
    { num: '3', color: 'bg-violet-600',  text: lang === 'ar' ? 'Webhook: transaction.funded — المبلغ محتجز في الضمان حتى فحص المغادرة' : 'Webhook: transaction.funded — funds held until check-out inspection' },
    { num: '4', color: 'bg-teal-600',    text: lang === 'ar' ? 'POST /release أو /refund — بعد اكتمال INSPECTION_DONE في صفحة التنظيف' : 'POST /release or /refund — triggered after INSPECTION_DONE in Cleaning page' },
  ];

  const WEBHOOK_EVENTS = [
    { event: 'transaction.funded',   desc: lang === 'ar' ? 'تم تمويل المعاملة — الأموال محتجزة'        : 'Guest funded — funds held in escrow',       color: 'text-blue-600' },
    { event: 'transaction.released', desc: lang === 'ar' ? 'الأموال مُحوَّلة للمالك'                   : 'Funds transferred to property owner',       color: 'text-emerald-600' },
    { event: 'transaction.refunded', desc: lang === 'ar' ? 'تم استرداد المبلغ للضيف'                   : 'Funds returned to guest',                   color: 'text-amber-600' },
    { event: 'transaction.disputed', desc: lang === 'ar' ? 'نزاع مفتوح — تدخّل يدوي مطلوب'            : 'Dispute opened — manual review required',   color: 'text-red-600' },
  ];

  return (
    <div className="card p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ background: '#1A6B3C' }}>
          <svg width="22" height="20" viewBox="0 0 44 38" fill="none">
            <text x="22" y="22" textAnchor="middle" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="20" fill="#FFD700">W</text>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-lg leading-none">{tc.wafiTitle}</p>
          <p className="text-xs text-slate-400 mt-0.5">{tc.wafiAuth}</p>
        </div>
        <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse me-1.5" />
          {lang === 'ar' ? 'ضمان مالي' : 'Escrow'}
        </span>
      </div>

      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{tc.wafiEscrow}</p>
        <div className="space-y-2">
          {ESCROW_STEPS.map(step => (
            <div key={step.num} className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <span className={`${step.color} text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5`}>{step.num}</span>
              <p className="text-xs font-mono text-slate-700 leading-relaxed break-all">{step.text}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 mt-2 ps-2 border-s-2 border-emerald-200">{tc.wafiEscrowDesc}</p>
      </div>

      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{tc.wafiWebhook}</p>
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-xs" style={{ direction: 'ltr' }}>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-3 py-2.5 text-start font-bold text-slate-400 uppercase tracking-wider text-[10px]">Event</th>
                <th className="px-3 py-2.5 text-start font-bold text-slate-400 uppercase tracking-wider text-[10px]">Description</th>
              </tr>
            </thead>
            <tbody>
              {WEBHOOK_EVENTS.map(ev => (
                <tr key={ev.event} className="border-b border-slate-50 last:border-0">
                  <td className="px-3 py-2 font-mono font-bold text-[11px]"><span className={ev.color}>{ev.event}</span></td>
                  <td className="px-3 py-2 text-slate-600 text-[11px]">{ev.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-slate-400 mt-2 ps-2 border-s-2 border-violet-200">{tc.wafiWebhookDesc}</p>
      </div>

      <div className="rounded-2xl overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between bg-slate-800 px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: '#1A6B3C' }} />
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">{tc.wafiLog}</span>
          </div>
          <button onClick={simulateEscrow} disabled={simulating}
            className="text-[10px] font-bold px-2.5 py-1 rounded-lg text-white transition-colors disabled:opacity-50"
            style={{ background: simulating ? '#555' : '#1A6B3C' }}>
            {simulating ? tc.running : (lang === 'ar' ? 'محاكاة ضمان' : 'Simulate Escrow')}
          </button>
        </div>
        <div ref={logRef} className="bg-slate-900 p-3 h-36 overflow-y-auto font-mono text-[10px] space-y-0.5" style={{ direction: 'ltr' }}>
          {escrowLog.length === 0 && <p className="text-slate-600 italic">Press &quot;Simulate Escrow&quot; to see the full escrow lifecycle.</p>}
          {escrowLog.map(e => (
            <div key={e.id} className="flex gap-2">
              <span className="text-slate-600 flex-shrink-0">[{e.time}]</span>
              <span className={e.color}>{e.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
