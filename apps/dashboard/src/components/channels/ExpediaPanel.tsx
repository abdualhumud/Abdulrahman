'use client';

import { useState, useEffect, useRef } from 'react';
import { useLang } from '@/lib/language-context';
import { sleep, makeSimRow, type SimLogRow } from './channel-utils';

export default function ExpediaPanel() {
  const { t, lang } = useLang();
  const tc = t.channels;
  const [xmlLog, setXmlLog] = useState<SimLogRow[]>([]);
  const [simulating, setSimulating] = useState(false);
  const [xmlTab, setXmlTab] = useState<'avail' | 'rate' | 'br' | 'bc'>('avail');
  const logRef = useRef<HTMLDivElement>(null);
  let _eid = 0;

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [xmlLog]);

  const addLog = (text: string, color = 'text-slate-400') =>
    setXmlLog(prev => [...prev.slice(-29), makeSimRow(++_eid, text, color)]);

  const simulateExpediaBooking = async () => {
    if (simulating) return;
    setSimulating(true);
    addLog('→ POST /eqc/ping  [HTTP Basic Auth]', 'text-amber-400');
    await sleep(200);
    addLog('✓ 200 OK — EQC connection healthy', 'text-emerald-400');
    await sleep(300);
    addLog('→ POST /eqc/br  [BookingRetrievalRQ XML]', 'text-amber-400');
    await sleep(400);
    addLog('✓ 200 OK — 1 unacknowledged reservation', 'text-emerald-400');
    await sleep(200);
    const id = `EXP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    addLog(`→ Parsed: ${id} | checkIn=2026-07-01 checkOut=2026-07-04`, 'text-slate-300');
    await sleep(250);
    addLog('🔒 Dispatching to ReservationEngine.processBooking()…', 'text-violet-400');
    await sleep(180);
    addLog('✓ Lock acquired in 19ms', 'text-emerald-400');
    await sleep(80);
    addLog('✓ Registry clear — no overlap', 'text-emerald-400');
    await sleep(80);
    addLog('✓ Committed booking to master registry', 'text-emerald-400');
    await sleep(120);
    addLog('→ Broadcast: POST /eqc/ar  AvailRateUpdateRQ (status=Close, inventory=0)', 'text-blue-400');
    await sleep(80);
    addLog('→ Broadcast: Booking.com OTA_HotelAvailNotifRQ', 'text-blue-400');
    await sleep(80);
    addLog('→ Broadcast: Agoda PATCH /calendar (allotment=0)', 'text-blue-400');
    await sleep(80);
    addLog('→ Broadcast: Airbnb iCal feed regenerated', 'text-blue-400');
    await sleep(80);
    addLog('→ POST /eqc/bc  [BookingConfirmRQ XML]', 'text-amber-400');
    await sleep(200);
    addLog('✓ Acknowledged — total: 414ms  [< 500ms ✓]', 'text-emerald-400');
    setSimulating(false);
  };

  const XML_SAMPLES: Record<string, string> = {
    avail: `<?xml version="1.0" encoding="UTF-8"?>
<AvailRateUpdateRQ xmlns="http://www.expedia.com/EQC/AR/2011/06">
  <Authentication username="rems_partner" password="***"/>
  <Hotel id="12345678"/>
  <AvailRateUpdate>
    <DateRange from="2026-05-01" to="2026-05-05"/>
    <RoomType id="u1" closed="true">
      <Inventory totalInventoryAvailable="0"/>
      <RatePlan id="BAR" status="Close">
        <Availability><Status><OpenStatus>Close</OpenStatus></Status></Availability>
      </RatePlan>
    </RoomType>
  </AvailRateUpdate>
</AvailRateUpdateRQ>`,
    rate: `<?xml version="1.0" encoding="UTF-8"?>
<AvailRateUpdateRQ xmlns="http://www.expedia.com/EQC/AR/2011/06">
  <Authentication username="rems_partner" password="***"/>
  <Hotel id="12345678"/>
  <AvailRateUpdate>
    <DateRange from="2026-03-01" to="2026-03-31"/>
    <RoomType id="u1">
      <RatePlan id="BAR" status="Open">
        <Rate currency="SAR">
          <BaseRate amount="1248.00"/>
          <MinLOS value="2"/>
        </Rate>
      </RatePlan>
    </RoomType>
  </AvailRateUpdate>
</AvailRateUpdateRQ>`,
    br: `<?xml version="1.0" encoding="UTF-8"?>
<BookingRetrievalRQ xmlns="http://www.expedia.com/EQC/BR/2014/01">
  <Authentication username="rems_partner" password="***"/>
  <Hotel id="12345678"/>
  <ReservationStatusFilter status="pending,confirmed,modified"/>
</BookingRetrievalRQ>`,
    bc: `<?xml version="1.0" encoding="UTF-8"?>
<BookingConfirmRQ xmlns="http://www.expedia.com/EQC/BC/2014/01">
  <Authentication username="rems_partner" password="***"/>
  <Hotel id="12345678"/>
  <BookingConfirmNumbers>
    <BookingConfirmNumber bookingId="EXP-2026-ABCXYZ"
      bookingType="Book"
      confirmNumber="BK-2026-REMS-001"
      confirmTime="2026-03-02T14:30:00Z"/>
  </BookingConfirmNumbers>
</BookingConfirmRQ>`,
  };

  const EQC_STEPS = [
    { num: '1', color: 'bg-indigo-500',  text: lang === 'ar' ? 'POST /eqc/ping — فحص الاتصال والتحقق من بيانات الاعتماد' : 'POST /eqc/ping — connection health check + credential validation' },
    { num: '2', color: 'bg-blue-500',    text: lang === 'ar' ? 'POST /eqc/br — BookingRetrievalRQ XML — استرداد الحجوزات غير المُؤكّدة' : 'POST /eqc/br — BookingRetrievalRQ XML — pull unacknowledged bookings' },
    { num: '3', color: 'bg-violet-500',  text: lang === 'ar' ? 'POST /eqc/ar — AvailRateUpdateRQ XML — إرسال حجب التوفر وتحديث الأسعار' : 'POST /eqc/ar — AvailRateUpdateRQ XML — availability block + rate updates' },
    { num: '4', color: 'bg-emerald-500', text: lang === 'ar' ? 'POST /eqc/bc — BookingConfirmRQ XML — تأكيد الاستلام خلال 5 دقائق' : 'POST /eqc/bc — BookingConfirmRQ XML — acknowledge within 5 minutes' },
  ];

  return (
    <div className="card p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: '#1C3D7D' }}>
          <svg width="20" height="20" viewBox="0 0 44 38" fill="none">
            <text x="22" y="24" textAnchor="middle" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="22" fill="#FFC72C">E</text>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-lg leading-none">{tc.expediaTitle}</p>
          <p className="text-xs text-slate-400 mt-0.5">{tc.expediaAuth}</p>
        </div>
        <span className="badge bg-indigo-50 text-indigo-600 border border-indigo-100 flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse me-1.5" />EQC XML
        </span>
      </div>

      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{lang === 'ar' ? 'تدفق EQC — المصادقة والعمليات' : 'EQC Flow — Auth & Operations'}</p>
        <div className="space-y-2">
          {EQC_STEPS.map(step => (
            <div key={step.num} className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <span className={`${step.color} text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5`}>{step.num}</span>
              <p className="text-xs font-mono text-slate-700 leading-relaxed break-all">{step.text}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 mt-2 ps-2 border-s-2 border-indigo-200">{tc.expediaAuthDesc}</p>
      </div>

      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{lang === 'ar' ? 'عينات EQC XML' : 'EQC XML Samples'}</p>
        <div className="flex gap-1 mb-2 flex-wrap">
          {([['avail', 'AR (Block)'], ['rate', 'AR (Rates)'], ['br', 'BR (Retrieve)'], ['bc', 'BC (Acknowledge)']] as const).map(([k, label]) => (
            <button key={k} onClick={() => setXmlTab(k)}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors ${xmlTab === k ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
              {label}
            </button>
          ))}
        </div>
        <pre className="bg-slate-900 text-emerald-400 text-[10px] font-mono p-4 rounded-xl overflow-x-auto leading-relaxed max-h-52 overflow-y-auto whitespace-pre-wrap break-words" style={{ direction: 'ltr' }}>
          {XML_SAMPLES[xmlTab]}
        </pre>
      </div>

      <div className="rounded-2xl overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between bg-slate-800 px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">{tc.expediaXmlLog}</span>
          </div>
          <button onClick={simulateExpediaBooking} disabled={simulating}
            className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50">
            {simulating ? tc.running : (lang === 'ar' ? 'محاكاة حجز Expedia' : 'Simulate Expedia Booking')}
          </button>
        </div>
        <div ref={logRef} className="bg-slate-900 p-3 h-36 overflow-y-auto font-mono text-[10px] space-y-0.5" style={{ direction: 'ltr' }}>
          {xmlLog.length === 0 && <p className="text-slate-600 italic">Press &quot;Simulate Expedia Booking&quot; to see the EQC flow.</p>}
          {xmlLog.map(e => (
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
