'use client';

import { useState } from 'react';
import { Icons } from '@/lib/icons';
import { useLang } from '@/lib/language-context';
import {
  processBooking, getMetrics, getTransactionLog,
  _clearState as clearEngineState, type TransactionRecord,
} from '@/lib/reservation-engine';

export default function UltimateOverlapPanel() {
  const { t, lang } = useLang();
  const tc = t.channels;

  const [txRecords, setTxRecords] = useState<TransactionRecord[]>([]);
  const [metrics,   setMetrics]   = useState(getMetrics());
  const [running,   setRunning]   = useState(false);

  const PHASES: Array<{ key: string; label: string; budget: number; color: string }> = [
    { key: 'preCheckMs',  label: tc.phasePreCheck, budget: 150, color: 'bg-blue-500' },
    { key: 'lockMs',      label: tc.phaseLock,     budget: 50,  color: 'bg-violet-500' },
    { key: 'commitMs',    label: tc.phaseCommit,   budget: 50,  color: 'bg-amber-500' },
    { key: 'broadcastMs', label: tc.phaseBroadcast,budget: 250, color: 'bg-emerald-500' },
  ];

  const runDemoTransaction = async () => {
    if (running) return;
    setRunning(true);
    clearEngineState();
    const reqs = [
      processBooking({ unitId: 'u1', channel: 'Booking.com', checkIn: '2026-05-01', checkOut: '2026-05-05', guestName: 'Guest A (Booking.com)', amount: 5200 }),
      processBooking({ unitId: 'u1', channel: 'Airbnb',      checkIn: '2026-05-03', checkOut: '2026-05-07', guestName: 'Guest B (Airbnb)',      amount: 4800 }),
      processBooking({ unitId: 'u1', channel: 'Gathern',     checkIn: '2026-05-01', checkOut: '2026-05-05', guestName: 'Guest C (Gathern)',     amount: 5000 }),
      processBooking({ unitId: 'u1', channel: 'Agoda',       checkIn: '2026-05-02', checkOut: '2026-05-06', guestName: 'Guest D (Agoda)',       amount: 4950 }),
      processBooking({ unitId: 'u1', channel: 'Expedia',     checkIn: '2026-05-01', checkOut: '2026-05-05', guestName: 'Guest E (Expedia)',     amount: 5100 }),
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
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center flex-shrink-0">
          <Icons.shield size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-lg leading-none">{tc.ultimateTitle}</p>
          <p className="text-xs text-slate-400 mt-0.5">{tc.ultimateDesc}</p>
        </div>
        <span className="badge bg-violet-50 text-violet-600 border border-violet-100 flex-shrink-0 font-mono">&lt;500ms</span>
      </div>

      {/* Phase timeline */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          {lang === 'ar' ? 'مراحل المعالجة — ميزانية 500 مللي ثانية' : 'Transaction Phases — 500ms hard budget'}
        </p>
        <div className="space-y-2.5">
          {PHASES.map(ph => {
            const lastTx    = txRecords[0];
            const actual    = lastTx ? (lastTx.phases as Record<string, number>)[ph.key] ?? 0 : 0;
            const pct       = Math.min(100, Math.round((ph.budget / 500) * 100));
            const actualPct = actual > 0 ? Math.min(100, Math.round((actual / ph.budget) * 100)) : 0;
            return (
              <div key={ph.key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-700">{ph.label}</span>
                  <div className="flex items-center gap-2">
                    {actual > 0 && (
                      <span className={`text-[10px] font-bold ${actual < ph.budget * 0.8 ? 'text-emerald-600' : 'text-amber-600'}`}>{actual}ms</span>
                    )}
                    <span className="text-[10px] text-slate-400">{ph.budget}ms {tc.budget}</span>
                  </div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden" style={{ direction: 'ltr' }}>
                  <div className="h-full rounded-full relative" style={{ width: `${pct}%`, background: '#e2e8f0' }}>
                    {actualPct > 0 && (
                      <div className={`absolute inset-y-0 start-0 rounded-full ${ph.color} transition-all duration-500`} style={{ width: `${actualPct}%` }} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button onClick={runDemoTransaction} disabled={running}
        className="w-full btn-primary justify-center py-3 disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}>
        {running
          ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{tc.running}</>
          : <><Icons.refresh size={15} />{tc.runDemo}</>}
      </button>

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
                <span className={`text-xs font-bold flex-shrink-0 font-mono ${tx.durationMs < 500 ? 'text-emerald-600' : 'text-red-500'}`}>{tx.durationMs}ms</span>
              </div>
            ))}
          </div>
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
