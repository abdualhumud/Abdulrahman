'use client';

import { useState, useEffect, useRef } from 'react';
import { Icons } from '@/lib/icons';
import { useLang } from '@/lib/language-context';
import { sleep, makeSimRow, type SimLogRow } from './channel-utils';

export default function AirbnbPanel() {
  const { t, lang } = useLang();
  const tc = t.channels;
  const [webhookLog, setWebhookLog] = useState<SimLogRow[]>([]);
  const [simulating, setSimulating] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  let _wid = 0;

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [webhookLog]);

  const addWLog = (text: string, color = 'text-slate-400') =>
    setWebhookLog(prev => [...prev.slice(-29), makeSimRow(++_wid, text, color)]);

  const simulateInstantBook = async () => {
    if (simulating) return;
    setSimulating(true);
    addWLog('← POST /webhooks/airbnb  [X-Airbnb-Signature: a3f9...]', 'text-amber-400');
    await sleep(300);
    addWLog('✓ HMAC-SHA256 signature verified', 'text-emerald-400');
    await sleep(200);
    addWLog('→ Event: reservations.created  (Instant Book)', 'text-blue-400');
    await sleep(200);
    addWLog('→ Parsed: unitId=u1  checkIn=2026-04-10  checkOut=2026-04-14', 'text-slate-300');
    await sleep(250);
    addWLog('🔒 Dispatching to ReservationEngine.processBooking()…', 'text-violet-400');
    await sleep(180);
    addWLog('✓ Lock acquired in 18ms', 'text-emerald-400');
    await sleep(100);
    addWLog('✓ Registry clear — no overlap', 'text-emerald-400');
    await sleep(80);
    addWLog('✓ Committed BK-AIRBNB-001 to master registry', 'text-emerald-400');
    await sleep(120);
    addWLog('→ Broadcast: Booking.com OTA_HotelAvailNotifRQ (BookingLimit=0)', 'text-blue-400');
    await sleep(80);
    addWLog('→ Broadcast: Gathern PUT /availability (quantity=0)', 'text-blue-400');
    await sleep(80);
    addWLog('→ Broadcast: Agoda PATCH /calendar (allotment=0, stopSell=true)', 'text-blue-400');
    await sleep(80);
    addWLog('→ Broadcast: Expedia EQC AR (status=Close, inventory=0)', 'text-blue-400');
    await sleep(70);
    addWLog('✓ Total transaction: 389ms  [< 500ms ✓]', 'text-emerald-400');
    setSimulating(false);
  };

  const OAUTH_STEPS = [
    { num: '1', color: 'bg-rose-500',    text: lang === 'ar' ? 'إعادة توجيه المالك → airbnb.com/oauth2/auth?scope=vr:write:calendar...' : 'Redirect owner → airbnb.com/oauth2/auth?scope=vr:write:calendar...' },
    { num: '2', color: 'bg-amber-500',   text: lang === 'ar' ? 'المستخدم يوافق → رد: ?code=AUTH_CODE&state=CSRF_TOKEN' : 'User grants access → callback: ?code=AUTH_CODE&state=CSRF_TOKEN' },
    { num: '3', color: 'bg-blue-500',    text: lang === 'ar' ? 'POST /oauth2/token  {grant_type: authorization_code, code}' : 'POST /oauth2/token  {grant_type: authorization_code, code}' },
    { num: '4', color: 'bg-emerald-500', text: lang === 'ar' ? 'الرد: access_token (~2h) + refresh_token (طويل الأمد)' : 'Response: access_token (~2h TTL) + refresh_token (long-lived)' },
  ];

  const WEBHOOK_EVENTS = [
    { event: 'reservations.created',   badge: 'bg-emerald-100 text-emerald-700', desc: lang === 'ar' ? 'حجز جديد ← فوري ← حجب جميع القنوات' : 'New booking → instant → block all channels' },
    { event: 'reservations.modified',  badge: 'bg-amber-100 text-amber-700',     desc: lang === 'ar' ? 'تعديل حجز ← تحديث التقويم' : 'Booking modified → update calendar' },
    { event: 'reservations.cancelled', badge: 'bg-red-100 text-red-700',         desc: lang === 'ar' ? 'إلغاء ← فتح التواريخ في جميع القنوات' : 'Cancellation → unblock dates on all channels' },
    { event: 'calendar.updated',       badge: 'bg-blue-100 text-blue-700',       desc: lang === 'ar' ? 'تحديث التوفر من طرف Airbnb' : 'Airbnb-side availability update' },
  ];

  return (
    <div className="card p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: '#FF385C' }}>
          <svg width="18" height="22" viewBox="0 0 22 26" fill="white">
            <path d="M11 0C7.7 0 5 2.7 5 6c0 2.2 1.3 4.5 3 6.8C9.7 14.6 11 16.3 11 17.5c0 1.4-1.1 2.5-2.5 2.5S6 18.9 6 17.5c0-.9.4-1.8 1-2.5l-1.5-1.5C4.5 14.7 4 16 4 17.5 4 20 6 22 8.5 22c1.4 0 2.7-.6 3.5-1.6.8 1 2.1 1.6 3.5 1.6 2.5 0 4.5-2 4.5-4.5 0-1.5-.5-2.8-1.5-3.9l-1.5 1.5c.6.7 1 1.6 1 2.4 0 1.4-1.1 2.5-2.5 2.5S13 18.9 13 17.5c0-1.2 1.3-2.9 3-4.7 1.7-2.3 3-4.6 3-6.8C19 2.7 16.3 0 13 0h-2zm1 4.5c1.4 0 2.5 1.1 2.5 2.5S13.4 9.5 12 9.5 9.5 8.4 9.5 7 10.6 4.5 12 4.5z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-lg leading-none">{tc.airbnbTitle}</p>
          <p className="text-xs text-slate-400 mt-0.5">{tc.airbnbOAuth}</p>
        </div>
        <span className="badge bg-rose-50 text-rose-600 border border-rose-100 flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse me-1.5" />Instant Book
        </span>
      </div>

      {/* OAuth Steps */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{tc.airbnbOAuth}</p>
        <div className="space-y-2">
          {OAUTH_STEPS.map(step => (
            <div key={step.num} className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <span className={`${step.color} text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5`}>{step.num}</span>
              <p className="text-xs font-mono text-slate-700 leading-relaxed break-all">{step.text}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 mt-2 ps-2 border-s-2 border-amber-200">{tc.airbnbOAuthDesc}</p>
      </div>

      {/* Webhook Events */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{tc.airbnbWebhook}</p>
        <p className="text-[10px] text-slate-400 mb-3 ps-2 border-s-2 border-rose-200">{tc.airbnbWebhookDesc}</p>
        <div className="space-y-2 mb-4">
          {WEBHOOK_EVENTS.map(ev => (
            <div key={ev.event} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl">
              <span className={`badge text-[10px] font-mono flex-shrink-0 ${ev.badge}`}>{ev.event}</span>
              <span className="text-xs text-slate-500">{ev.desc}</span>
            </div>
          ))}
        </div>
        <div className="rounded-2xl overflow-hidden border border-slate-200">
          <div className="flex items-center justify-between bg-slate-800 px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Webhook Log</span>
            </div>
            <button onClick={simulateInstantBook} disabled={simulating}
              className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:opacity-50">
              {simulating ? tc.running : (lang === 'ar' ? 'محاكاة حجز فوري' : 'Simulate Instant Book')}
            </button>
          </div>
          <div ref={logRef} className="bg-slate-900 p-3 h-36 overflow-y-auto font-mono text-[10px] space-y-0.5" style={{ direction: 'ltr' }}>
            {webhookLog.length === 0 && <p className="text-slate-600 italic">Press &quot;Simulate Instant Book&quot; to see the webhook flow.</p>}
            {webhookLog.map(e => (
              <div key={e.id} className="flex gap-2">
                <span className="text-slate-600 flex-shrink-0">[{e.time}]</span>
                <span className={e.color}>{e.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* iCal fallback */}
      <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
        <Icons.refresh size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-amber-700">{tc.airbnbIcal}</p>
          <p className="text-[10px] text-amber-600 mt-0.5">{tc.airbnbIcalDesc}</p>
          <p className="text-[10px] font-mono text-amber-500 mt-1">GET /api/ical/:unitId  →  RFC-5545 VCALENDAR feed</p>
        </div>
      </div>
    </div>
  );
}
