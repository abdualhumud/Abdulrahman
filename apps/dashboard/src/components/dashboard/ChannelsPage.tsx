'use client';

import { useState, useEffect, useRef } from 'react';
import { Icons } from '@/lib/icons';
import { useLang } from '@/lib/language-context';
import { useJourney } from '@/lib/journey-context';
import { CHANNEL_SYNC_STATUS, CHANNEL_BREAKDOWN, UNITS } from '@/lib/mock-data';
import {
  buildAvailNotifXml,
  buildRatePlanNotifXml,
  buildReadReservationsXml,
  buildReservationAckXml,
} from '@/lib/booking-com-service';
import {
  checkAvailability,
  type ChannelId,
} from '@/lib/overlap-guard';
import {
  processBooking,
  getMetrics,
  getTransactionLog,
  _clearState as clearEngineState,
  type TransactionRecord,
} from '@/lib/reservation-engine';

/* ── Official branded channel logos ─────────────────────────────────── */
function ChannelLogo({ channel, isActive = true }: { channel: string; isActive?: boolean }) {
  const inactiveStyle = !isActive ? { filter: 'grayscale(100%)', opacity: 0.4 } : {};

  if (channel === 'Booking.com') return (
    <div
      className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 shadow-sm overflow-hidden select-none"
      style={{ background: '#003580', ...inactiveStyle }}
    >
      {/* Booking.com: wordmark "B." in white + "booking" subtext */}
      <svg width="34" height="30" viewBox="0 0 34 30" fill="none">
        <text x="3" y="20" fontFamily="Arial Black,Helvetica,sans-serif" fontWeight="900" fontSize="18" fill="white">B</text>
        <text x="17" y="20" fontFamily="Arial Black,Helvetica,sans-serif" fontWeight="900" fontSize="18" fill="#6699FF">.</text>
        <text x="3" y="28" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="7" fill="white" letterSpacing="1">BOOKING</text>
      </svg>
    </div>
  );

  if (channel === 'Airbnb') return (
    <div
      className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden"
      style={{ background: '#FF385C', ...inactiveStyle }}
    >
      {/* Airbnb bélo — stylized loop / location pin shape */}
      <svg width="22" height="26" viewBox="0 0 22 26" fill="white">
        <path d="M11 0C7.7 0 5 2.7 5 6c0 2.2 1.3 4.5 3 6.8C9.7 14.6 11 16.3 11 17.5c0 1.4-1.1 2.5-2.5 2.5S6 18.9 6 17.5c0-.9.4-1.8 1-2.5l-1.5-1.5C4.5 14.7 4 16 4 17.5 4 20 6 22 8.5 22c1.4 0 2.7-.6 3.5-1.6.8 1 2.1 1.6 3.5 1.6 2.5 0 4.5-2 4.5-4.5 0-1.5-.5-2.8-1.5-3.9l-1.5 1.5c.6.7 1 1.6 1 2.4 0 1.4-1.1 2.5-2.5 2.5S13 18.9 13 17.5c0-1.2 1.3-2.9 3-4.7 1.7-2.3 3-4.6 3-6.8C19 2.7 16.3 0 13 0h-2zm1 4.5c1.4 0 2.5 1.1 2.5 2.5S13.4 9.5 12 9.5 9.5 8.4 9.5 7 10.6 4.5 12 4.5z" />
      </svg>
    </div>
  );

  if (channel === 'Gathern') return (
    <div
      className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 shadow-sm overflow-hidden"
      style={{ background: '#00A651', ...inactiveStyle }}
    >
      {/* Gathern: stylized G with Arabic brand name */}
      <svg width="34" height="30" viewBox="0 0 34 30" fill="none">
        <text x="6" y="21" fontFamily="Arial Black,Helvetica,sans-serif" fontWeight="900" fontSize="20" fill="white">G</text>
        <text x="3" y="29" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="6.5" fill="white" letterSpacing="0.5">GATHERN</text>
      </svg>
    </div>
  );

  return (
    <div
      className="w-12 h-12 rounded-2xl bg-slate-200 flex items-center justify-center flex-shrink-0"
      style={inactiveStyle}
    >
      <span className="text-slate-600 font-extrabold text-sm">{channel.charAt(0)}</span>
    </div>
  );
}

// ── Types & helpers for Integration Monitor ────────────────────────────────
type LogLevel  = 'info' | 'success' | 'warn' | 'error' | 'lock';
interface LogEntry { id: number; time: string; level: LogLevel; text: string; }
let _logCounter = 0;
function makeLog(level: LogLevel, text: string): LogEntry {
  const now = new Date();
  return {
    id:   ++_logCounter,
    time: `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`,
    level,
    text,
  };
}

type GuardStep = 'idle' | 'locking' | 'checking' | 'broadcasting' | 'confirmed' | 'blocked';

/* ── Integration Monitor — API handshake + Overlap Guard demo ────────── */
function IntegrationMonitor() {
  const { t, lang } = useLang();
  const tc = t.channels;

  // Auth flow accordion
  const [authOpen,  setAuthOpen]  = useState(false);
  const [xmlTab,    setXmlTab]    = useState<'avail'|'rate'|'read'|'ack'>('avail');

  // Overlap Guard simulator
  const [guardUnit,    setGuardUnit]    = useState(UNITS[0].id);
  const [guardIn,      setGuardIn]      = useState('2026-03-10');
  const [guardOut,     setGuardOut]     = useState('2026-03-14');
  const [guardChannel, setGuardChannel] = useState<ChannelId>('Booking.com');
  const [guardStep,    setGuardStep]    = useState<GuardStep>('idle');
  const [guardConflict,setGuardConflict]= useState<string | null>(null);

  // Live sync log
  const [logs, setLogs]  = useState<LogEntry[]>(() => [
    makeLog('success', 'Connectivity API — Bearer token active (TTL: 58m 12s)'),
    makeLog('info',    'Booking.com OTA_ReadRQ → 0 undelivered reservations'),
    makeLog('info',    'Gathern polling tick — unit_ids: u1,u2,u4,u6 — 0 new'),
    makeLog('success', 'Overlap Guard — registry seeded with 6 confirmed bookings'),
  ]);
  const logRef = useRef<HTMLDivElement>(null);

  // Auto-scroll log to bottom
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (entry: LogEntry) =>
    setLogs(prev => [...prev.slice(-49), entry]);   // keep last 50 entries

  // Simulate the full booking guard flow
  const simulateBooking = async () => {
    if (guardStep !== 'idle' && guardStep !== 'confirmed' && guardStep !== 'blocked') return;
    setGuardConflict(null);
    setGuardStep('locking');

    addLog(makeLog('lock',    `Lock requested — unitId: ${guardUnit} | ${guardIn} → ${guardOut}`));
    await sleep(900);

    setGuardStep('checking');
    addLog(makeLog('info',    `Scanning master registry for overlaps (${guardUnit}, ${guardIn}–${guardOut})…`));
    await sleep(800);

    // Use the real checkAvailability engine (in-memory demo — no conflicts seeded)
    const result = checkAvailability(guardUnit, { checkIn: guardIn, checkOut: guardOut });

    if (!result.available) {
      const cb = result.conflictingBooking;
      setGuardConflict(`${cb.internalId} (${cb.channel}) — ${cb.checkIn}→${cb.checkOut}`);
      setGuardStep('blocked');
      addLog(makeLog('error', `OVERLAP DETECTED — conflicts with ${cb.internalId} on ${cb.channel}`));
      addLog(makeLog('warn',  'Booking REJECTED — lock released, no registry write'));
      return;
    }

    addLog(makeLog('success', `Availability confirmed — no conflicts`));

    setGuardStep('broadcasting');
    addLog(makeLog('lock',    `Committing booking to master registry…`));
    await sleep(500);

    const channels: ChannelId[] = (['Booking.com','Airbnb','Gathern','Direct'] as ChannelId[])
      .filter(c => c !== guardChannel);
    addLog(makeLog('info',    `Broadcasting availability block → [${channels.join(', ')}]`));

    for (const ch of channels) {
      await sleep(350);
      if (ch === 'Booking.com') {
        addLog(makeLog('success', `✓ Booking.com OTA_HotelAvailNotifRQ — BookingLimit=0, Status=Close`));
      } else if (ch === 'Gathern') {
        addLog(makeLog('success', `✓ Gathern PUT /availability — quantity=0, available=false`));
      } else {
        addLog(makeLog('info',    `✓ Airbnb — iCal feed regenerated (block picked up on next poll ~15min)`));
      }
    }

    addLog(makeLog('success', `Lock released — total transaction: ~2.6 s`));
    setGuardStep('confirmed');
  };

  // XML samples (built with real service functions)
  const selectedUnit = UNITS.find(u => u.id === guardUnit) ?? UNITS[0];
  const XML_SAMPLES = {
    avail: buildAvailNotifXml({
      hotelId: selectedUnit.id, roomTypeId: selectedUnit.id,
      dateFrom: guardIn, dateTo: guardOut, available: false, count: 0,
    }),
    rate: buildRatePlanNotifXml({
      hotelId: selectedUnit.id, roomTypeId: selectedUnit.id,
      ratePlanCode: 'BAR', dateFrom: guardIn, dateTo: guardOut,
      amountBeforeTax: selectedUnit.basePrice, currencyCode: 'SAR', minStay: selectedUnit.minStay,
    }),
    read: buildReadReservationsXml(selectedUnit.id, new Date().toISOString()),
    ack:  buildReservationAckXml(selectedUnit.id, 'BCM-789123', 'BK-2026-REMS'),
  };

  const LOG_COLORS: Record<LogLevel, string> = {
    info:    'text-slate-400',
    success: 'text-emerald-500',
    warn:    'text-amber-500',
    error:   'text-red-500',
    lock:    'text-violet-500',
  };
  const LOG_ICONS: Record<LogLevel, string> = {
    info: '→', success: '✓', warn: '⚠', error: '✗', lock: '🔒',
  };

  return (
    <div className="card p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-violet-50 flex items-center justify-center flex-shrink-0">
          <Icons.shield size={18} className="text-violet-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-lg leading-none">{tc.integMonitor}</p>
          <p className="text-xs text-slate-400 mt-0.5">{tc.integDesc}</p>
        </div>
        <span className="badge bg-emerald-50 text-emerald-600 border border-emerald-100 flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse me-1.5" />
          {tc.authConnected}
        </span>
      </div>

      {/* ── Section 1: Auth Flow ─────────────────────────────────────────── */}
      <div>
        <button
          onClick={() => setAuthOpen(o => !o)}
          className="w-full flex items-center gap-3 p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-colors text-start border border-slate-100"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <span className="text-blue-700 font-extrabold text-xs">①</span>
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-800 text-sm">{tc.authFlow}</p>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              POST /token-based-authentication/exchange → Bearer token
            </p>
          </div>
          <Icons.chevronDown size={16} className={`text-slate-400 transition-transform ${authOpen ? 'rotate-180' : ''}`} />
        </button>

        {authOpen && (
          <div className="mt-3 space-y-2 ps-4 border-s-2 border-blue-100">
            {([
              { num: '1', text: tc.authStep1, color: 'bg-blue-600' },
              { num: '2', text: tc.authStep2, color: 'bg-emerald-600' },
              { num: '3', text: tc.authStep3, color: 'bg-violet-600' },
            ] as const).map(step => (
              <div key={step.num} className="flex items-start gap-3 p-3 bg-white border border-slate-100 rounded-xl">
                <span className={`${step.color} text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  {step.num}
                </span>
                <p className="text-xs font-mono text-slate-700 leading-relaxed">{step.text}</p>
              </div>
            ))}
            {/* XML Viewer */}
            <div className="mt-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                {lang === 'ar' ? 'عينات OTA XML' : 'OTA XML Samples'}
              </p>
              <div className="flex gap-1 mb-2 flex-wrap">
                {([
                  ['avail', 'AvailNotif'],
                  ['rate',  'RatePlanNotif'],
                  ['read',  'ReadRQ'],
                  ['ack',   'ResNotif (ACK)'],
                ] as const).map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => setXmlTab(k)}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors
                      ${xmlTab === k ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <pre
                className="bg-slate-900 text-emerald-400 text-[10px] font-mono p-4 rounded-xl overflow-x-auto leading-relaxed max-h-64 overflow-y-auto whitespace-pre-wrap break-words"
                style={{ direction: 'ltr' }}
              >
                {XML_SAMPLES[xmlTab]}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* ── Section 2: Overlap Guard Simulator ──────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <span className="text-red-700 font-extrabold text-xs">②</span>
          </div>
          <div>
            <p className="font-bold text-slate-800 text-sm">{tc.overlapGuard}</p>
            <p className="text-xs text-slate-400 mt-0.5">{tc.guardDesc}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {/* Unit selector */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              {tc.guardUnit}
            </label>
            <select
              value={guardUnit}
              onChange={e => setGuardUnit(e.target.value)}
              className="input w-full text-sm"
            >
              {UNITS.map(u => (
                <option key={u.id} value={u.id}>
                  {lang === 'ar' ? (u.nameAr ?? u.name) : u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Originating channel */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              {tc.guardChannel}
            </label>
            <select
              value={guardChannel}
              onChange={e => setGuardChannel(e.target.value as ChannelId)}
              className="input w-full text-sm"
            >
              {(['Booking.com','Airbnb','Gathern','Direct'] as const).map(ch => (
                <option key={ch} value={ch}>{ch}</option>
              ))}
            </select>
          </div>

          {/* Check-in */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              {tc.guardCheckIn}
            </label>
            <input type="date" value={guardIn}
              onChange={e => setGuardIn(e.target.value)}
              className="input w-full" style={{ direction: 'ltr' }} />
          </div>

          {/* Check-out */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              {tc.guardCheckOut}
            </label>
            <input type="date" value={guardOut}
              onChange={e => setGuardOut(e.target.value)}
              className="input w-full" style={{ direction: 'ltr' }} />
          </div>
        </div>

        {/* Guard step indicator */}
        {guardStep !== 'idle' && (
          <div className={`mb-4 p-4 rounded-2xl border-2 transition-all ${
            guardStep === 'confirmed' ? 'bg-emerald-50 border-emerald-200' :
            guardStep === 'blocked'   ? 'bg-red-50 border-red-200' :
                                        'bg-violet-50 border-violet-200'
          }`}>
            {(guardStep === 'locking' || guardStep === 'checking' || guardStep === 'broadcasting') && (
              <div className="flex items-center gap-3">
                <span className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-violet-700">
                    {guardStep === 'locking'     ? tc.guardLocking :
                     guardStep === 'checking'    ? tc.guardChecking :
                                                   tc.guardBlocking}
                  </p>
                  {/* Step progress dots */}
                  <div className="flex items-center gap-2 mt-1">
                    {(['locking','checking','broadcasting'] as const).map((s, i) => (
                      <div key={s} className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${
                          guardStep === s ? 'bg-violet-500 animate-pulse' :
                          ['locking','checking','broadcasting'].indexOf(guardStep as typeof s) > i
                            ? 'bg-violet-300' : 'bg-slate-200'
                        }`} />
                        {i < 2 && <span className="text-slate-300 text-[10px]">—</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {guardStep === 'confirmed' && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Icons.check size={16} className="text-white" />
                </div>
                <div>
                  <p className="font-bold text-emerald-700 text-sm">{tc.guardConfirmed}</p>
                  <p className="text-xs text-emerald-600 mt-0.5">
                    {lang === 'ar'
                      ? `تم الحجب على قنوات ${(['Booking.com','Airbnb','Gathern','Direct'] as const).filter(c => c !== guardChannel).join('، ')}`
                      : `Blocked on: ${(['Booking.com','Airbnb','Gathern','Direct'] as const).filter(c => c !== guardChannel).join(' · ')}`}
                  </p>
                </div>
              </div>
            )}
            {guardStep === 'blocked' && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-extrabold text-sm">✗</span>
                </div>
                <div>
                  <p className="font-bold text-red-700 text-sm">{tc.guardBlocked}</p>
                  {guardConflict && (
                    <p className="text-xs text-red-600 mt-0.5 font-mono">
                      {tc.guardConflict}: {guardConflict}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <button
          onClick={simulateBooking}
          disabled={guardStep === 'locking' || guardStep === 'checking' || guardStep === 'broadcasting'}
          className="w-full btn-primary justify-center py-3 disabled:opacity-50"
        >
          <Icons.refresh size={15} />
          {tc.guardSimulate}
        </button>
      </div>

      {/* ── Section 3: Live Sync Log ─────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
              <span className="text-slate-600 font-extrabold text-xs">③</span>
            </div>
            <p className="font-bold text-slate-800 text-sm">{tc.syncLog}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
              {lang === 'ar' ? 'مباشر' : 'Live'}
            </span>
            <button
              onClick={() => setLogs([])}
              className="ms-2 text-[10px] text-slate-400 hover:text-red-500 transition-colors font-bold"
            >
              {lang === 'ar' ? 'مسح' : 'Clear'}
            </button>
          </div>
        </div>

        <div
          ref={logRef}
          className="bg-slate-900 rounded-2xl p-4 h-52 overflow-y-auto font-mono text-[11px] space-y-1"
          style={{ direction: 'ltr' }}
        >
          {logs.length === 0 && (
            <p className="text-slate-600 italic">No events yet — trigger a sync or simulate a booking.</p>
          )}
          {logs.map(log => (
            <div key={log.id} className="flex items-start gap-2">
              <span className="text-slate-600 flex-shrink-0">[{log.time}]</span>
              <span className="flex-shrink-0">{LOG_ICONS[log.level]}</span>
              <span className={LOG_COLORS[log.level]}>{log.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

/* ── Airbnb Integration Panel ────────────────────────────────────────── */
function AirbnbIntegrationPanel() {
  const { t, lang } = useLang();
  const tc = t.channels;
  const [webhookLog, setWebhookLog] = useState<Array<{ id: number; time: string; text: string; color: string }>>([]);
  const [simulating, setSimulating] = useState(false);
  const logRef2 = useRef<HTMLDivElement>(null);
  let _wid = 0;

  useEffect(() => {
    if (logRef2.current) logRef2.current.scrollTop = logRef2.current.scrollHeight;
  }, [webhookLog]);

  const addWLog = (text: string, color = 'text-slate-400') => {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
    setWebhookLog(prev => [...prev.slice(-29), { id: ++_wid, time, text, color }]);
  };

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
    await sleep(100);
    addWLog('→ Broadcast: Gathern PUT /availability (quantity=0)', 'text-blue-400');
    await sleep(90);
    addWLog('✓ Total transaction: 312ms  [< 500ms ✓]', 'text-emerald-400');
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
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse me-1.5" />
          Instant Book
        </span>
      </div>

      {/* OAuth Steps */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          {tc.airbnbOAuth}
        </p>
        <div className="space-y-2">
          {OAUTH_STEPS.map(step => (
            <div key={step.num} className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <span className={`${step.color} text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5`}>
                {step.num}
              </span>
              <p className="text-xs font-mono text-slate-700 leading-relaxed break-all">{step.text}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 mt-2 ps-2 border-s-2 border-amber-200">
          {tc.airbnbOAuthDesc}
        </p>
      </div>

      {/* Webhook Events */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          {tc.airbnbWebhook}
        </p>
        <p className="text-[10px] text-slate-400 mb-3 ps-2 border-s-2 border-rose-200">
          {tc.airbnbWebhookDesc}
        </p>
        <div className="space-y-2 mb-4">
          {WEBHOOK_EVENTS.map(ev => (
            <div key={ev.event} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl">
              <span className={`badge text-[10px] font-mono flex-shrink-0 ${ev.badge}`}>{ev.event}</span>
              <span className="text-xs text-slate-500">{ev.desc}</span>
            </div>
          ))}
        </div>

        {/* Webhook Simulator */}
        <div className="rounded-2xl overflow-hidden border border-slate-200">
          <div className="flex items-center justify-between bg-slate-800 px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Webhook Log</span>
            </div>
            <button
              onClick={simulateInstantBook}
              disabled={simulating}
              className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:opacity-50"
            >
              {simulating ? tc.running : (lang === 'ar' ? 'محاكاة حجز فوري' : 'Simulate Instant Book')}
            </button>
          </div>
          <div ref={logRef2}
            className="bg-slate-900 p-3 h-36 overflow-y-auto font-mono text-[10px] space-y-0.5"
            style={{ direction: 'ltr' }}>
            {webhookLog.length === 0 && (
              <p className="text-slate-600 italic">Press "Simulate Instant Book" to see the webhook flow.</p>
            )}
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

/* ── Ultimate Overlap Protection Panel ──────────────────────────────────── */
function UltimateOverlapPanel() {
  const { t, lang } = useLang();
  const tc = t.channels;

  const [txRecords, setTxRecords] = useState<TransactionRecord[]>([]);
  const [metrics,   setMetrics]   = useState(getMetrics());
  const [running,   setRunning]   = useState(false);

  const PHASES: Array<{ key: string; label: string; budget: number; color: string }> = [
    { key: 'preCheckMs',   label: tc.phasePreCheck,  budget: 150, color: 'bg-blue-500' },
    { key: 'lockMs',       label: tc.phaseLock,       budget: 50,  color: 'bg-violet-500' },
    { key: 'commitMs',     label: tc.phaseCommit,     budget: 50,  color: 'bg-amber-500' },
    { key: 'broadcastMs',  label: tc.phaseBroadcast,  budget: 250, color: 'bg-emerald-500' },
  ];

  const runDemoTransaction = async () => {
    if (running) return;
    setRunning(true);
    clearEngineState();

    // Fire 3 concurrent requests — only 1 should win
    const reqs = [
      processBooking({ unitId: 'u1', channel: 'Booking.com', checkIn: '2026-05-01', checkOut: '2026-05-05', guestName: 'Guest A (Booking.com)', amount: 5200 }),
      processBooking({ unitId: 'u1', channel: 'Airbnb',      checkIn: '2026-05-03', checkOut: '2026-05-07', guestName: 'Guest B (Airbnb)',      amount: 4800 }),
      processBooking({ unitId: 'u1', channel: 'Gathern',     checkIn: '2026-05-01', checkOut: '2026-05-05', guestName: 'Guest C (Gathern)',     amount: 5000 }),
    ];

    const results = await Promise.all(reqs);
    setTxRecords(results);
    setMetrics(getMetrics());
    setRunning(false);
  };

  const STATUS_COLORS: Record<string, string> = {
    CONFIRMED:                  'bg-emerald-100 text-emerald-700',
    REJECTED_OVERLAP:           'bg-red-100 text-red-700',
    REJECTED_LOCK_TIMEOUT:      'bg-amber-100 text-amber-700',
    REJECTED_DEADLINE_EXCEEDED: 'bg-slate-100 text-slate-600',
    REJECTED_PRE_CHECK_FAILED:  'bg-orange-100 text-orange-700',
  };

  const STATUS_SHORT: Record<string, string> = {
    CONFIRMED:                  tc.txConfirmed,
    REJECTED_OVERLAP:           tc.txOverlap,
    REJECTED_LOCK_TIMEOUT:      tc.txTimeout,
    REJECTED_DEADLINE_EXCEEDED: tc.txDeadline,
    REJECTED_PRE_CHECK_FAILED:  'PRE-CHECK',
  };

  return (
    <div className="card p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center flex-shrink-0">
          <Icons.shield size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-lg leading-none">{tc.ultimateTitle}</p>
          <p className="text-xs text-slate-400 mt-0.5">{tc.ultimateDesc}</p>
        </div>
        <span className="badge bg-violet-50 text-violet-600 border border-violet-100 flex-shrink-0 font-mono">
          &lt;500ms
        </span>
      </div>

      {/* Phase timeline */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          {lang === 'ar' ? 'مراحل المعالجة — ميزانية 500 مللي ثانية' : 'Transaction Phases — 500ms hard budget'}
        </p>
        <div className="space-y-2.5">
          {PHASES.map(ph => {
            const lastTx   = txRecords[0];  // show winner's timing
            const actual   = lastTx ? (lastTx.phases as Record<string, number>)[ph.key] ?? 0 : 0;
            const pct      = Math.min(100, Math.round((ph.budget / 500) * 100));
            const actualPct = actual > 0 ? Math.min(100, Math.round((actual / ph.budget) * 100)) : 0;
            return (
              <div key={ph.key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-700">{ph.label}</span>
                  <div className="flex items-center gap-2">
                    {actual > 0 && (
                      <span className={`text-[10px] font-bold ${actual < ph.budget * 0.8 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {actual}ms
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">{ph.budget}ms {tc.budget}</span>
                  </div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden" style={{ direction: 'ltr' }}>
                  {/* Budget bar */}
                  <div className="h-full rounded-full relative" style={{ width: `${pct}%`, background: '#e2e8f0' }}>
                    {/* Actual timing bar */}
                    {actualPct > 0 && (
                      <div className={`absolute inset-y-0 start-0 rounded-full ${ph.color} transition-all duration-500`}
                        style={{ width: `${actualPct}%` }} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Demo button */}
      <button
        onClick={runDemoTransaction}
        disabled={running}
        className="w-full btn-primary justify-center py-3 disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}
      >
        {running
          ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{tc.running}</>
          : <><Icons.refresh size={15} />{tc.runDemo}</>}
      </button>

      {/* Transaction log */}
      {txRecords.length > 0 && (
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{tc.txLog}</p>
          <div className="space-y-2" style={{ direction: 'ltr' }}>
            {txRecords.map(tx => (
              <div key={tx.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className={`badge text-[10px] font-bold flex-shrink-0 ${STATUS_COLORS[tx.status] ?? 'bg-slate-100 text-slate-600'}`}>
                  {STATUS_SHORT[tx.status] ?? tx.status}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{tx.request.guestName}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{tx.request.checkIn} → {tx.request.checkOut}</p>
                </div>
                <span className={`text-xs font-bold flex-shrink-0 font-mono ${tx.durationMs < 500 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {tx.durationMs}ms
                </span>
              </div>
            ))}
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: tc.totalTx,    value: metrics.totalProcessed },
              { label: tc.avgLatency, value: `${Math.round(metrics.avgDurationMs)}ms` },
              { label: tc.maxLatency, value: `${metrics.maxDurationMs}ms` },
            ].map(m => (
              <div key={m.label} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                <p className="text-lg font-extrabold text-slate-800 leading-none">{m.value}</p>
                <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wide font-semibold">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Rate Parity Manager — unit-specific ─────────────────────────────── */
function RateParityManager() {
  const { t, lang } = useLang();
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [unitSearch, setUnitSearch]         = useState('');
  const [showDropdown, setShowDropdown]     = useState(false);

  const [dateFrom,  setDateFrom]  = useState('2026-03-01');
  const [dateTo,    setDateTo]    = useState('2026-03-31');
  const [minStay,   setMinStay]   = useState('2');

  const [channelPrices, setChannelPrices] = useState<Record<string, string>>({
    'Booking.com': '', 'Airbnb': '', 'Gathern': '',
  });
  const [channelEnabled, setChannelEnabled] = useState<Record<string, boolean>>({
    'Booking.com': true, 'Airbnb': true, 'Gathern': true,
  });

  const [pushing, setPushing] = useState(false);
  const [pushed,  setPushed]  = useState(false);

  const selectedUnit = UNITS.find(u => u.id === selectedUnitId);

  const filteredUnits = UNITS.filter(u =>
    unitSearch === '' ||
    u.name.toLowerCase().includes(unitSearch.toLowerCase()) ||
    (u.nameAr && u.nameAr.includes(unitSearch)) ||
    u.city.toLowerCase().includes(unitSearch.toLowerCase())
  );

  const handleUnitSelect = (unit: typeof UNITS[number]) => {
    setSelectedUnitId(unit.id);
    setUnitSearch(lang === 'ar' ? (unit.nameAr ?? unit.name) : unit.name);
    setShowDropdown(false);
    setMinStay(String(unit.minStay));
    // Pre-fill per-channel prices from unit's basePrice
    const price = String(unit.basePrice);
    setChannelPrices({ 'Booking.com': price, 'Airbnb': price, 'Gathern': price });
    // Enable only channels the unit is listed on
    setChannelEnabled({
      'Booking.com': unit.channels.includes('Booking.com'),
      'Airbnb':      unit.channels.includes('Airbnb'),
      'Gathern':     unit.channels.includes('Gathern'),
    });
  };

  const activeCount = Object.entries(channelEnabled).filter(([, v]) => v).length;

  const handlePush = async () => {
    if (!selectedUnit) return;
    setPushing(true);
    await new Promise(r => setTimeout(r, 1800));
    setPushing(false);
    setPushed(true);
    setTimeout(() => setPushed(false), 4000);
  };

  const CHANNEL_COLORS: Record<string, { color: string; bg: string }> = {
    'Booking.com': { color: '#003580', bg: '#EEF2FF' },
    'Airbnb':      { color: '#FF385C', bg: '#FFF1F2' },
    'Gathern':     { color: '#00A651', bg: '#F0FDF4' },
  };

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
          <Icons.sliders size={18} className="text-blue-600" />
        </div>
        <div>
          <p className="font-bold text-slate-900 text-lg leading-none">{t.channels.rateManager}</p>
          <p className="text-xs text-slate-400 mt-0.5">{t.channels.rateDesc}</p>
        </div>
        <span className="ms-auto badge bg-amber-50 text-amber-600 border border-amber-100">
          {lang === 'ar' ? 'تسعير بالوحدة' : 'Unit-Specific Pricing'}
        </span>
      </div>

      {/* Step 1 — Select specific unit */}
      <div className="mb-5">
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          {lang === 'ar' ? '① اختر وحدة محددة' : '① Select Specific Unit'}
        </label>
        <div className="relative">
          <div className="relative">
            <Icons.building size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={unitSearch}
              onChange={e => { setUnitSearch(e.target.value); setShowDropdown(true); setSelectedUnitId(''); }}
              onFocus={() => setShowDropdown(true)}
              placeholder={lang === 'ar' ? 'ابحث عن وحدة…' : 'Search for a unit…'}
              className="input w-full ps-9 pe-9"
            />
            <Icons.chevronDown size={14} className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {showDropdown && filteredUnits.length > 0 && (
            <div className="absolute z-30 top-full mt-1 w-full bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
              {filteredUnits.map(unit => (
                <button
                  key={unit.id}
                  onClick={() => handleUnitSelect(unit)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-start border-b border-slate-50 last:border-0"
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: unit.color + '20', color: unit.color }}>
                    <Icons.building size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {lang === 'ar' ? (unit.nameAr ?? unit.name) : unit.name}
                    </p>
                    <p className="text-xs text-slate-400">{unit.city} · SAR {unit.basePrice.toLocaleString()}/night</p>
                  </div>
                  <span className={`badge text-[10px] flex-shrink-0 ${unit.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    {unit.status}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Click-away to close dropdown */}
        {showDropdown && (
          <div className="fixed inset-0 z-20" onClick={() => setShowDropdown(false)} />
        )}
      </div>

      {/* Step 2 — Unit details + current prices (only shown when unit selected) */}
      {selectedUnit && (
        <>
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: selectedUnit.color + '25', color: selectedUnit.color }}>
                <Icons.building size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 truncate">
                  {lang === 'ar' ? (selectedUnit.nameAr ?? selectedUnit.name) : selectedUnit.name}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedUnit.beds}BR / {selectedUnit.baths}BA · {selectedUnit.city} · {selectedUnit.district}
                </p>
              </div>
              <div className="text-end flex-shrink-0">
                <p className="text-xs text-slate-400">Base Rate</p>
                <p className="font-extrabold text-slate-900 text-sm" style={{ direction: 'ltr' }}>
                  SAR {selectedUnit.basePrice.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Date range + min stay */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                {t.channels.fromDate}
              </label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="input" style={{ direction: 'ltr' }} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                {t.channels.toDate}
              </label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="input" style={{ direction: 'ltr' }} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                {t.channels.minStay}
              </label>
              <input type="number" min="1" value={minStay} onChange={e => setMinStay(e.target.value)}
                className="input" style={{ direction: 'ltr' }} />
            </div>
          </div>

          {/* Step 3 — Per-channel pricing */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              {lang === 'ar' ? '② سعر مخصص لكل قناة' : '② Per-Channel Nightly Rate (SAR)'}
            </label>
            <div className="space-y-3">
              {(['Booking.com', 'Airbnb', 'Gathern'] as const).map(ch => {
                const enabled = channelEnabled[ch];
                const isOnChannel = selectedUnit.channels.includes(ch);
                const cc = CHANNEL_COLORS[ch];
                return (
                  <div key={ch}
                    className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all
                      ${enabled ? 'border-current' : 'border-slate-100 bg-slate-50 opacity-60'}`}
                    style={{ borderColor: enabled ? cc.color + '40' : undefined, background: enabled ? cc.bg : undefined }}
                  >
                    <ChannelLogo channel={ch} isActive={enabled && isOnChannel} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm" style={{ color: cc.color }}>{ch}</p>
                      {!isOnChannel && (
                        <p className="text-[10px] text-amber-600 font-semibold">
                          {lang === 'ar' ? 'الوحدة غير مدرجة في هذه القناة' : 'Unit not listed on this channel'}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <span className="absolute start-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">SAR</span>
                        <input
                          type="number"
                          value={channelPrices[ch]}
                          onChange={e => setChannelPrices(p => ({ ...p, [ch]: e.target.value }))}
                          disabled={!enabled}
                          className="input ps-10 w-28 text-sm font-bold disabled:opacity-50"
                          style={{ direction: 'ltr' }}
                        />
                      </div>
                      <button
                        onClick={() => setChannelEnabled(p => ({ ...p, [ch]: !p[ch] }))}
                        className={`relative w-10 h-5 rounded-full transition-all duration-300 flex-shrink-0
                          ${enabled ? 'bg-emerald-500' : 'bg-slate-200'}`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-300
                          ${enabled ? 'start-5' : 'start-0.5'}`} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {pushed && (
            <div className="mb-4 flex items-center gap-3 bg-emerald-50 border border-emerald-100 text-emerald-700 px-4 py-3 rounded-xl text-sm font-semibold">
              <Icons.check size={16} />
              {lang === 'ar'
                ? `تم إرسال الأسعار إلى ${activeCount} قنوات`
                : `Rates pushed to ${activeCount} channel${activeCount !== 1 ? 's' : ''} for ${selectedUnit.name}`}
            </div>
          )}

          <button
            onClick={handlePush}
            disabled={pushing || activeCount === 0}
            className="w-full btn-primary justify-center py-3.5 text-base disabled:opacity-50"
          >
            {pushing ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {lang === 'ar' ? 'جارٍ الإرسال…' : 'Pushing rates…'}</>
            ) : (
              <><Icons.send size={16} />
              {lang === 'ar'
                ? `إرسال السعر إلى ${activeCount} قنوات`
                : `Push rates to ${activeCount} channel${activeCount !== 1 ? 's' : ''}`
              }</>
            )}
          </button>
        </>
      )}

      {/* Placeholder when no unit selected */}
      {!selectedUnit && (
        <div className="flex flex-col items-center gap-3 py-10 text-center border-2 border-dashed border-slate-100 rounded-2xl">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
            <Icons.building size={20} className="text-slate-300" />
          </div>
          <p className="text-sm font-semibold text-slate-400">
            {lang === 'ar' ? 'اختر وحدة لبدء التسعير' : 'Select a unit to start pricing'}
          </p>
          <p className="text-xs text-slate-300 max-w-48 leading-relaxed">
            {lang === 'ar'
              ? 'سيتم تحميل أسعار الوحدة تلقائياً لكل قناة'
              : 'Current rates per channel will auto-load when you pick a unit'}
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────────────── */
export default function ChannelsPage() {
  const { t, lang } = useLang();
  const { markDone } = useJourney();

  const [syncState, setSyncState] = useState<Record<string, 'idle' | 'syncing' | 'done'>>({});
  const [killSwitch, setKillSwitch] = useState<Record<string, boolean>>({
    'Booking.com': true, 'Airbnb': true, 'Gathern': true,
  });
  const [killAnimating, setKillAnimating] = useState<Record<string, boolean>>({});

  const toggleKill = (channel: string) => {
    setKillAnimating(s => ({ ...s, [channel]: true }));
    setTimeout(() => {
      setKillSwitch(s => ({ ...s, [channel]: !s[channel] }));
      setKillAnimating(s => ({ ...s, [channel]: false }));
    }, 300);
  };

  const forceSync = async (channelName: string) => {
    setSyncState(s => ({ ...s, [channelName]: 'syncing' }));
    await new Promise(r => setTimeout(r, 1600));
    setSyncState(s => ({ ...s, [channelName]: 'done' }));
    markDone(3);
    setTimeout(() => setSyncState(s => ({ ...s, [channelName]: 'idle' })), 3000);
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{t.channels.title}</h1>
        <p className="text-sm text-slate-400 mt-1">{t.channels.subtitle}</p>
      </div>

      {/* Priority badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          {lang === 'ar' ? 'الأولوية' : 'Priority'}:
        </span>
        {['Booking.com', 'Gathern'].map(ch => (
          <span key={ch} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border-2 border-blue-200 bg-blue-50 text-blue-700">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" /> {ch}
          </span>
        ))}
        <span className="text-xs text-slate-400">
          {lang === 'ar'
            ? '— اتصال API مباشر · مزامنة ثنائية الاتجاه'
            : '— Direct API bridge · 2-way sync (availability, pricing, insurance fee)'}
        </span>
      </div>

      {/* Channel cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {CHANNEL_SYNC_STATUS.map(ch => {
          const isPriority = ch.channel === 'Booking.com' || ch.channel === 'Gathern';
          const isActive = killSwitch[ch.channel] !== false;
          return (
            <div
              key={ch.channel}
              className={`card p-5 transition-all ${isPriority ? 'ring-2 ring-blue-500/20' : ''} ${!isActive ? 'opacity-70' : ''}`}
            >
              {isPriority && (
                <div className="flex items-center gap-1 mb-2 -mt-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                    {lang === 'ar' ? 'أولوية' : 'Priority'}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 mb-5">
                <ChannelLogo channel={ch.channel} isActive={isActive} />
                <div className="flex-1">
                  <p className={`font-bold text-base leading-none ${isActive ? ch.color : 'text-slate-400'}`}>
                    {ch.channel}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                    <span className="text-xs text-slate-400 font-medium">
                      {isActive ? t.channels.connected : (lang === 'ar' ? 'متوقف' : 'Paused')}
                    </span>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${ch.syncMethod.includes('Webhook') ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                  {ch.syncMethod}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: t.channels.today,   value: ch.bookingsToday, hi: false },
                  { label: t.channels.pending, value: ch.pending,       hi: ch.pending > 0 },
                  { label: t.channels.failed,  value: ch.failed,        hi: ch.failed > 0 },
                ].map(s => (
                  <div key={s.label} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                    <p className={`text-xl font-extrabold leading-none ${s.hi ? 'text-red-500' : 'text-slate-800'}`}>{s.value}</p>
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold uppercase tracking-wide">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                <p className="text-xs text-slate-400">
                  {t.channels.lastSync}:{' '}
                  <span className="font-semibold text-slate-600">
                    {syncState[ch.channel] === 'done' ? (lang === 'ar' ? 'الآن' : 'just now') : ch.lastSync}
                  </span>
                </p>
                <button
                  onClick={() => forceSync(ch.channel)}
                  disabled={syncState[ch.channel] === 'syncing'}
                  className="flex items-center gap-1 text-xs font-bold transition-colors disabled:opacity-60 text-blue-600 hover:text-blue-700"
                >
                  {syncState[ch.channel] === 'syncing' ? (
                    <><span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> {lang === 'ar' ? 'جارٍ…' : 'Syncing…'}</>
                  ) : syncState[ch.channel] === 'done' ? (
                    <><Icons.check size={12} className="text-emerald-500" /> {lang === 'ar' ? 'تم' : 'Synced'}</>
                  ) : (
                    <><Icons.refresh size={12} /> {t.channels.forceSync}</>
                  )}
                </button>
              </div>

              {isPriority && (
                <div className="mt-3 pt-3 border-t border-slate-50 flex items-center gap-2">
                  <Icons.shield size={12} className="text-violet-500" />
                  <span className="text-[10px] text-violet-600 font-semibold">
                    {lang === 'ar' ? 'مزامنة رسوم التأمين مفعّلة' : 'Insurance fee sync active'}
                  </span>
                </div>
              )}

              {/* Kill Switch */}
              <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-600">
                    {lang === 'ar' ? 'مفتاح الإيقاف' : 'Kill Switch'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {killSwitch[ch.channel]
                      ? (lang === 'ar' ? 'مفتوح — يقبل الحجوزات' : 'Open — accepting bookings')
                      : (lang === 'ar' ? 'مغلق — لا حجوزات جديدة' : 'Closed — no new bookings')}
                  </p>
                </div>
                <button
                  onClick={() => toggleKill(ch.channel)}
                  disabled={killAnimating[ch.channel]}
                  className={`relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 focus:outline-none
                    ${killSwitch[ch.channel] ? 'bg-emerald-500' : 'bg-slate-300'}
                    ${killAnimating[ch.channel] ? 'opacity-60' : ''}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300
                    ${killSwitch[ch.channel] ? 'start-6' : 'start-0.5'}`} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Airbnb Integration — OAuth 2.0 + Webhooks */}
      <AirbnbIntegrationPanel />

      {/* Ultimate Overlap Protection — <500ms centralized engine */}
      <UltimateOverlapPanel />

      {/* API Integration Monitor — Booking.com handshake + Overlap Guard */}
      <IntegrationMonitor />

      {/* Rate Parity Manager — unit-specific */}
      <RateParityManager />

      {/* Revenue breakdown */}
      <div className="card p-5">
        <p className="font-bold text-slate-900 mb-4">{t.channels.revenueTitle}</p>
        <div className="space-y-4">
          {CHANNEL_BREAKDOWN.map(ch => (
            <div key={ch.channel} className="flex items-center gap-4">
              <div className="w-28 flex items-center gap-2 flex-shrink-0">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ch.color }} />
                <span className="text-sm font-semibold text-slate-700">{ch.channel}</span>
              </div>
              <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden" style={{ direction: 'ltr' }}>
                <div className="h-2.5 rounded-full" style={{ width: `${ch.share}%`, background: ch.color }} />
              </div>
              <div className="text-end w-48 flex-shrink-0">
                <p className="text-sm font-bold text-slate-900">{t.common.sar} {ch.revenue.toLocaleString()}</p>
                <p className="text-xs text-red-400 font-medium">−{t.common.sar} {ch.commission.toLocaleString()} {t.channels.commission}</p>
              </div>
              <span className="w-10 text-end text-sm font-bold text-slate-500 flex-shrink-0">{ch.share}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
