'use client';

import { useState, useEffect, useRef } from 'react';
import { useLang } from '@/lib/language-context';
import { sleep, makeSimRow, type SimLogRow } from './channel-utils';

export default function AgodaPanel() {
  const { t, lang } = useLang();
  const tc = t.channels;
  const [pollingLog, setPollingLog] = useState<SimLogRow[]>([]);
  const [simulating, setSimulating] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  let _lid = 0;

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [pollingLog]);

  const addLog = (text: string, color = 'text-slate-400') =>
    setPollingLog(prev => [...prev.slice(-29), makeSimRow(++_lid, text, color)]);

  const simulateAgodaBooking = async () => {
    if (simulating) return;
    setSimulating(true);
    addLog(`→ GET /properties/AGD-12345/reservations?since=${new Date(Date.now() - 120000).toISOString()}&status=Confirmed,Modified`, 'text-amber-400');
    await sleep(400);
    addLog('✓ 200 OK — 1 new reservation', 'text-emerald-400');
    await sleep(200);
    const id = `AGD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    addLog(`→ Reservation: ${id} | checkIn=2026-06-10 checkOut=2026-06-14`, 'text-slate-300');
    await sleep(250);
    addLog('🔒 Dispatching to ReservationEngine.processBooking()…', 'text-violet-400');
    await sleep(180);
    addLog('✓ Lock acquired in 22ms', 'text-emerald-400');
    await sleep(80);
    addLog('✓ Registry clear — no overlap', 'text-emerald-400');
    await sleep(80);
    addLog('✓ Committed booking to master registry', 'text-emerald-400');
    await sleep(120);
    addLog('→ Broadcast: Booking.com OTA_HotelAvailNotifRQ (BookingLimit=0)', 'text-blue-400');
    await sleep(90);
    addLog('→ Broadcast: Airbnb iCal feed regenerated', 'text-blue-400');
    await sleep(80);
    addLog('→ Broadcast: Gathern PUT /availability (quantity=0)', 'text-blue-400');
    await sleep(80);
    addLog('→ Broadcast: Expedia EQC AR (status=Close)', 'text-blue-400');
    await sleep(70);
    addLog(`→ POST /properties/AGD-12345/reservations/${id}/acknowledge`, 'text-amber-400');
    await sleep(150);
    addLog('✓ Acknowledged — total: 371ms  [< 500ms ✓]', 'text-emerald-400');
    setSimulating(false);
  };

  const API_STEPS = [
    { num: '1', color: 'bg-red-500',    text: lang === 'ar' ? 'GET /properties/{id}/reservations?since=ISO8601&status=Confirmed,Modified' : 'GET /properties/{id}/reservations?since=ISO8601&status=Confirmed,Modified' },
    { num: '2', color: 'bg-amber-500',  text: lang === 'ar' ? 'استخراج الحجوزات الجديدة من الرد JSON' : 'Parse new reservations from JSON response array' },
    { num: '3', color: 'bg-blue-500',   text: lang === 'ar' ? 'إرسال إلى محرك الحجز → تحقق الأولوية المحلية' : 'Dispatch to ReservationEngine → local registry is authoritative' },
    { num: '4', color: 'bg-emerald-500',text: lang === 'ar' ? 'POST /reservations/{bookingId}/acknowledge خلال 5 دقائق' : 'POST /reservations/{bookingId}/acknowledge within 5 minutes' },
  ];

  return (
    <div className="card p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: '#E31837' }}>
          <svg width="20" height="20" viewBox="0 0 44 38" fill="none">
            <text x="22" y="24" textAnchor="middle" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="22" fill="white">A</text>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-lg leading-none">{tc.agodaTitle}</p>
          <p className="text-xs text-slate-400 mt-0.5">{tc.agodaAuth}</p>
        </div>
        <span className="badge bg-red-50 text-red-600 border border-red-100 flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse me-1.5" />REST/JSON
        </span>
      </div>

      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{lang === 'ar' ? 'تدفق الاستطلاع والتكامل' : 'Polling & Integration Flow'}</p>
        <div className="space-y-2">
          {API_STEPS.map(step => (
            <div key={step.num} className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <span className={`${step.color} text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5`}>{step.num}</span>
              <p className="text-xs font-mono text-slate-700 leading-relaxed break-all">{step.text}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 mt-2 ps-2 border-s-2 border-red-200">{tc.agodaAuthDesc}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { icon: '📅', title: tc.agodaAvailability, desc: tc.agodaAvailDesc },
          { icon: '💰', title: tc.agodaRates,         desc: tc.agodaRatesDesc },
          { icon: '🔄', title: tc.agodaPolling,        desc: tc.agodaPollingDesc },
          { icon: '📆', title: tc.agodaIcal,           desc: tc.agodaIcalDesc },
        ].map(f => (
          <div key={f.title} className="flex items-start gap-3 p-3 bg-red-50/50 border border-red-100 rounded-xl">
            <span className="text-lg flex-shrink-0">{f.icon}</span>
            <div>
              <p className="text-xs font-bold text-red-700">{f.title}</p>
              <p className="text-[10px] text-red-500 mt-0.5 leading-relaxed">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between bg-slate-800 px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">{tc.agodaWebhookLog}</span>
          </div>
          <button onClick={simulateAgodaBooking} disabled={simulating}
            className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50">
            {simulating ? tc.running : (lang === 'ar' ? 'محاكاة حجز أجودا' : 'Simulate Agoda Booking')}
          </button>
        </div>
        <div ref={logRef} className="bg-slate-900 p-3 h-36 overflow-y-auto font-mono text-[10px] space-y-0.5" style={{ direction: 'ltr' }}>
          {pollingLog.length === 0 && <p className="text-slate-600 italic">Press &quot;Simulate Agoda Booking&quot; to see the polling flow.</p>}
          {pollingLog.map(e => (
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
