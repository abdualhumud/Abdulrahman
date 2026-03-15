'use client';

import { useState, useEffect, useRef, useReducer } from 'react';
import { Icons } from '@/lib/icons';
import { useLang } from '@/lib/language-context';
import { UNITS } from '@/lib/mock-data';
import {
  buildAvailNotifXml,
  buildRatePlanNotifXml,
  buildReadReservationsXml,
  buildReservationAckXml,
} from '@/lib/booking-com-service';
import { checkAvailability, type ChannelId } from '@/lib/overlap-guard';
import { makeLog, sleep, type LogLevel, type LogEntry, type GuardStep } from './channel-utils';

/* ── Reducer ──────────────────────────────────────────────────────────── */

interface MonitorState {
  authOpen:      boolean;
  xmlTab:        'avail' | 'rate' | 'read' | 'ack';
  guardUnit:     string;
  guardIn:       string;
  guardOut:      string;
  guardChannel:  ChannelId;
  guardStep:     GuardStep;
  guardConflict: string | null;
}

type MonitorAction =
  | { type: 'SET_AUTH_OPEN';      payload: boolean }
  | { type: 'SET_XML_TAB';        payload: 'avail' | 'rate' | 'read' | 'ack' }
  | { type: 'SET_GUARD_UNIT';     payload: string }
  | { type: 'SET_GUARD_IN';       payload: string }
  | { type: 'SET_GUARD_OUT';      payload: string }
  | { type: 'SET_GUARD_CHANNEL';  payload: ChannelId }
  | { type: 'SET_GUARD_STEP';     payload: GuardStep }
  | { type: 'SET_GUARD_CONFLICT'; payload: string | null }
  | { type: 'RESET_GUARD' };

const initialState: MonitorState = {
  authOpen:      false,
  xmlTab:        'avail',
  guardUnit:     UNITS[0].id,
  guardIn:       '2026-03-10',
  guardOut:      '2026-03-14',
  guardChannel:  'Booking.com',
  guardStep:     'idle',
  guardConflict: null,
};

function monitorReducer(state: MonitorState, action: MonitorAction): MonitorState {
  switch (action.type) {
    case 'SET_AUTH_OPEN':
      return { ...state, authOpen: action.payload };
    case 'SET_XML_TAB':
      return { ...state, xmlTab: action.payload };
    case 'SET_GUARD_UNIT':
      return { ...state, guardUnit: action.payload };
    case 'SET_GUARD_IN':
      return { ...state, guardIn: action.payload };
    case 'SET_GUARD_OUT':
      return { ...state, guardOut: action.payload };
    case 'SET_GUARD_CHANNEL':
      return { ...state, guardChannel: action.payload };
    case 'SET_GUARD_STEP':
      return { ...state, guardStep: action.payload };
    case 'SET_GUARD_CONFLICT':
      return { ...state, guardConflict: action.payload };
    case 'RESET_GUARD':
      return { ...state, guardStep: 'idle', guardConflict: null };
    default:
      return state;
  }
}

/* ── Component ────────────────────────────────────────────────────────── */

export default function IntegrationMonitor() {
  const { t, lang } = useLang();
  const tc = t.channels;

  const [state, dispatch] = useReducer(monitorReducer, initialState);

  // Live sync log — kept as useState since it's appended frequently
  const [logs, setLogs] = useState<LogEntry[]>(() => [
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
    if (state.guardStep !== 'idle' && state.guardStep !== 'confirmed' && state.guardStep !== 'blocked') return;
    dispatch({ type: 'SET_GUARD_CONFLICT', payload: null });
    dispatch({ type: 'SET_GUARD_STEP', payload: 'locking' });

    addLog(makeLog('lock',    `Lock requested — unitId: ${state.guardUnit} | ${state.guardIn} → ${state.guardOut}`));
    await sleep(900);

    dispatch({ type: 'SET_GUARD_STEP', payload: 'checking' });
    addLog(makeLog('info',    `Scanning master registry for overlaps (${state.guardUnit}, ${state.guardIn}–${state.guardOut})…`));
    await sleep(800);

    // Use the real checkAvailability engine (in-memory demo — no conflicts seeded)
    const result = checkAvailability(state.guardUnit, { checkIn: state.guardIn, checkOut: state.guardOut });

    if (!result.available) {
      const cb = result.conflictingBooking;
      dispatch({ type: 'SET_GUARD_CONFLICT', payload: `${cb.internalId} (${cb.channel}) — ${cb.checkIn}→${cb.checkOut}` });
      dispatch({ type: 'SET_GUARD_STEP', payload: 'blocked' });
      addLog(makeLog('error', `OVERLAP DETECTED — conflicts with ${cb.internalId} on ${cb.channel}`));
      addLog(makeLog('warn',  'Booking REJECTED — lock released, no registry write'));
      return;
    }

    addLog(makeLog('success', `Availability confirmed — no conflicts`));

    dispatch({ type: 'SET_GUARD_STEP', payload: 'broadcasting' });
    addLog(makeLog('lock',    `Committing booking to master registry…`));
    await sleep(500);

    const channels: ChannelId[] = (['Booking.com','Airbnb','Gathern','Agoda','Expedia','Direct'] as ChannelId[])
      .filter(c => c !== state.guardChannel);
    addLog(makeLog('info',    `Broadcasting availability block → [${channels.join(', ')}]`));

    for (const ch of channels) {
      await sleep(300);
      if (ch === 'Booking.com') {
        addLog(makeLog('success', `✓ Booking.com OTA_HotelAvailNotifRQ — BookingLimit=0, Status=Close`));
      } else if (ch === 'Gathern') {
        addLog(makeLog('success', `✓ Gathern PUT /availability — quantity=0, available=false`));
      } else if (ch === 'Agoda') {
        addLog(makeLog('success', `✓ Agoda PATCH /calendar — allotment=0, stopSell=true`));
      } else if (ch === 'Expedia') {
        addLog(makeLog('success', `✓ Expedia EQC AR — AvailRateUpdateRQ status=Close, inventory=0`));
      } else if (ch === 'Airbnb') {
        addLog(makeLog('info',    `✓ Airbnb — iCal feed regenerated (block picked up on next poll ~15min)`));
      }
    }

    addLog(makeLog('success', `Lock released — total transaction: ~2.6 s`));
    dispatch({ type: 'SET_GUARD_STEP', payload: 'confirmed' });
  };

  // XML samples (built with real service functions)
  const selectedUnit = UNITS.find(u => u.id === state.guardUnit) ?? UNITS[0];
  const XML_SAMPLES = {
    avail: buildAvailNotifXml({
      hotelId: selectedUnit.id, roomTypeId: selectedUnit.id,
      dateFrom: state.guardIn, dateTo: state.guardOut, available: false, count: 0,
    }),
    rate: buildRatePlanNotifXml({
      hotelId: selectedUnit.id, roomTypeId: selectedUnit.id,
      ratePlanCode: 'BAR', dateFrom: state.guardIn, dateTo: state.guardOut,
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
          onClick={() => dispatch({ type: 'SET_AUTH_OPEN', payload: !state.authOpen })}
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
          <Icons.chevronDown size={16} className={`text-slate-400 transition-transform ${state.authOpen ? 'rotate-180' : ''}`} />
        </button>

        {state.authOpen && (
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
                    onClick={() => dispatch({ type: 'SET_XML_TAB', payload: k })}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors
                      ${state.xmlTab === k ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <pre
                className="bg-slate-900 text-emerald-400 text-[10px] font-mono p-4 rounded-xl overflow-x-auto leading-relaxed max-h-64 overflow-y-auto whitespace-pre-wrap break-words"
                style={{ direction: 'ltr' }}
              >
                {XML_SAMPLES[state.xmlTab]}
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
              value={state.guardUnit}
              onChange={e => dispatch({ type: 'SET_GUARD_UNIT', payload: e.target.value })}
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
              value={state.guardChannel}
              onChange={e => dispatch({ type: 'SET_GUARD_CHANNEL', payload: e.target.value as ChannelId })}
              className="input w-full text-sm"
            >
              {(['Booking.com','Airbnb','Gathern','Agoda','Expedia','Direct'] as const).map(ch => (
                <option key={ch} value={ch}>{ch}</option>
              ))}
            </select>
          </div>

          {/* Check-in */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              {tc.guardCheckIn}
            </label>
            <input type="date" value={state.guardIn}
              onChange={e => dispatch({ type: 'SET_GUARD_IN', payload: e.target.value })}
              className="input w-full" style={{ direction: 'ltr' }} />
          </div>

          {/* Check-out */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              {tc.guardCheckOut}
            </label>
            <input type="date" value={state.guardOut}
              onChange={e => dispatch({ type: 'SET_GUARD_OUT', payload: e.target.value })}
              className="input w-full" style={{ direction: 'ltr' }} />
          </div>
        </div>

        {/* Guard step indicator */}
        {state.guardStep !== 'idle' && (
          <div className={`mb-4 p-4 rounded-2xl border-2 transition-all ${
            state.guardStep === 'confirmed' ? 'bg-emerald-50 border-emerald-200' :
            state.guardStep === 'blocked'   ? 'bg-red-50 border-red-200' :
                                              'bg-violet-50 border-violet-200'
          }`}>
            {(state.guardStep === 'locking' || state.guardStep === 'checking' || state.guardStep === 'broadcasting') && (
              <div className="flex items-center gap-3">
                <span className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-violet-700">
                    {state.guardStep === 'locking'     ? tc.guardLocking :
                     state.guardStep === 'checking'    ? tc.guardChecking :
                                                         tc.guardBlocking}
                  </p>
                  {/* Step progress dots */}
                  <div className="flex items-center gap-2 mt-1">
                    {(['locking','checking','broadcasting'] as const).map((s, i) => (
                      <div key={s} className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${
                          state.guardStep === s ? 'bg-violet-500 animate-pulse' :
                          ['locking','checking','broadcasting'].indexOf(state.guardStep as typeof s) > i
                            ? 'bg-violet-300' : 'bg-slate-200'
                        }`} />
                        {i < 2 && <span className="text-slate-300 text-[10px]">—</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {state.guardStep === 'confirmed' && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Icons.check size={16} className="text-white" />
                </div>
                <div>
                  <p className="font-bold text-emerald-700 text-sm">{tc.guardConfirmed}</p>
                  <p className="text-xs text-emerald-600 mt-0.5">
                    {lang === 'ar'
                      ? `تم الحجب على قنوات ${(['Booking.com','Airbnb','Gathern','Agoda','Expedia','Direct'] as const).filter(c => c !== state.guardChannel).join('، ')}`
                      : `Blocked on: ${(['Booking.com','Airbnb','Gathern','Agoda','Expedia','Direct'] as const).filter(c => c !== state.guardChannel).join(' · ')}`}
                  </p>
                </div>
              </div>
            )}
            {state.guardStep === 'blocked' && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-extrabold text-sm">✗</span>
                </div>
                <div>
                  <p className="font-bold text-red-700 text-sm">{tc.guardBlocked}</p>
                  {state.guardConflict && (
                    <p className="text-xs text-red-600 mt-0.5 font-mono">
                      {tc.guardConflict}: {state.guardConflict}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <button
          onClick={simulateBooking}
          disabled={state.guardStep === 'locking' || state.guardStep === 'checking' || state.guardStep === 'broadcasting'}
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
