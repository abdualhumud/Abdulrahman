'use client';

/**
 * ChannelsPage — OTA channel management orchestrator.
 *
 * Each integration panel lives in its own file under src/components/channels/.
 * This file owns only:
 *  - Channel cards (kill switch, sync state, force sync)
 *  - Revenue breakdown chart
 *  - Page header
 */

import { useState } from 'react';
import { Icons } from '@/lib/icons';
import { useLang } from '@/lib/language-context';
import { useJourney } from '@/lib/journey-context';
import { CHANNEL_SYNC_STATUS, CHANNEL_BREAKDOWN } from '@/lib/mock-data';

import ChannelLogo        from '@/components/channels/ChannelLogo';
import IntegrationMonitor from '@/components/channels/IntegrationMonitor';
import AirbnbPanel        from '@/components/channels/AirbnbPanel';
import GathernPanel       from '@/components/channels/GathernPanel';
import AgodaPanel         from '@/components/channels/AgodaPanel';
import ExpediaPanel       from '@/components/channels/ExpediaPanel';
import UltimateOverlapPanel from '@/components/channels/UltimateOverlapPanel';
import RateParityManager  from '@/components/channels/RateParityManager';
import WafiPanel          from '@/components/channels/WafiPanel';

/** Per-channel sync lifecycle — 'failed' surfaces broadcast errors to the user. */
type SyncStatus = 'idle' | 'syncing' | 'done' | 'failed';

/** Per-channel broadcast result after a force-sync. */
interface BroadcastResult {
  channel: string;
  success: boolean;
  error?:  string;
}

export default function ChannelsPage() {
  const { t, lang } = useLang();
  const { markDone } = useJourney();

  const [syncState,     setSyncState]     = useState<Record<string, SyncStatus>>({});
  const [syncResults,   setSyncResults]   = useState<Record<string, BroadcastResult[]>>({});
  const [killSwitch,    setKillSwitch]    = useState<Record<string, boolean>>({
    'Booking.com': true, 'Airbnb': true, 'Gathern': true, 'Agoda': true, 'Expedia': true, 'Waffy': true,
  });
  const [killAnimating, setKillAnimating] = useState<Record<string, boolean>>({});

  const toggleKill = (channel: string) => {
    setKillAnimating(s => ({ ...s, [channel]: true }));
    setTimeout(() => {
      setKillSwitch(s => ({ ...s, [channel]: !s[channel] }));
      setKillAnimating(s => ({ ...s, [channel]: false }));
    }, 300);
  };

  /**
   * Simulates a force-sync for a given channel, broadcasting availability
   * blocks to all other active channels. Surfaces per-channel broadcast
   * failures so the user knows exactly which downstream pushes failed
   * (previously silent failures).
   */
  const forceSync = async (channelName: string) => {
    setSyncState(s => ({ ...s, [channelName]: 'syncing' }));
    setSyncResults(r => ({ ...r, [channelName]: [] }));

    await new Promise(r => setTimeout(r, 1600));

    // Simulate per-channel broadcast results with a small random failure rate
    const otherChannels = Object.keys(killSwitch).filter(
      ch => ch !== channelName && killSwitch[ch],
    );
    const results: BroadcastResult[] = otherChannels.map(ch => {
      // ~12% failure rate per channel — keeps demo realistic without always failing
      const success = Math.random() > 0.12;
      return {
        channel: ch,
        success,
        error: success ? undefined : `${ch}: connection timeout after 30s`,
      };
    });

    setSyncResults(r => ({ ...r, [channelName]: results }));

    const anyFailed = results.some(r => !r.success);
    if (anyFailed) {
      setSyncState(s => ({ ...s, [channelName]: 'failed' }));
      // Auto-reset failed state after 8s so the user can retry
      setTimeout(() => setSyncState(s => ({ ...s, [channelName]: 'idle' })), 8000);
    } else {
      setSyncState(s => ({ ...s, [channelName]: 'done' }));
      markDone(3);
      setTimeout(() => setSyncState(s => ({ ...s, [channelName]: 'idle' })), 3000);
    }
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
          const isActive   = killSwitch[ch.channel] !== false;
          const status     = syncState[ch.channel] as SyncStatus ?? 'idle';
          const results    = syncResults[ch.channel] ?? [];
          const failedBroadcasts = results.filter(r => !r.success);
          return (
            <div key={ch.channel}
              className={`card p-5 transition-all ${isPriority ? 'ring-2 ring-blue-500/20' : ''} ${!isActive ? 'opacity-70' : ''}`}>
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
                  <p className={`font-bold text-base leading-none ${isActive ? ch.color : 'text-slate-400'}`}>{ch.channel}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      !isActive         ? 'bg-slate-300' :
                      status === 'failed' ? 'bg-red-400 animate-pulse' :
                      ch.failed > 0     ? 'bg-red-400 animate-pulse' :
                      ch.pending > 0    ? 'bg-amber-400' :
                      'bg-emerald-400'
                    }`} />
                    <span className="text-xs text-slate-400 font-medium">
                      {!isActive ? (lang === 'ar' ? 'متوقف' : 'Paused')
                        : status === 'failed' ? (lang === 'ar' ? 'فشل الإرسال' : 'Broadcast failed')
                        : ch.failed > 0 ? (lang === 'ar' ? 'خطأ في المزامنة' : 'Sync error')
                        : t.channels.connected}
                    </span>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                  ch.syncMethod.includes('Webhook')
                    ? 'bg-blue-50 text-blue-600 border border-blue-100'
                    : 'bg-amber-50 text-amber-600 border border-amber-100'
                }`}>{ch.syncMethod}</span>
              </div>

              {/* Data-level failures from mock data */}
              {ch.failed > 0 && (
                <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200">
                  <Icons.x size={13} className="text-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-600 font-semibold">
                    {ch.failed} {lang === 'ar' ? 'عملية مزامنة فشلت — تحقق من الاتصال' : 'sync failure(s) — check connection'}
                  </p>
                </div>
              )}

              {/* Broadcast failures from the last force-sync */}
              {status === 'failed' && failedBroadcasts.length > 0 && (
                <div className="mb-3 rounded-xl bg-red-50 border border-red-200 overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-100 border-b border-red-200">
                    <Icons.x size={13} className="text-red-600 flex-shrink-0" />
                    <p className="text-xs text-red-700 font-bold">
                      {lang === 'ar'
                        ? `فشل الإرسال إلى ${failedBroadcasts.length} قناة`
                        : `Broadcast failed to ${failedBroadcasts.length} channel${failedBroadcasts.length !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                  <ul className="px-3 py-2 space-y-1">
                    {failedBroadcasts.map(f => (
                      <li key={f.channel} className="flex items-start gap-1.5 text-[10px] font-mono text-red-600">
                        <span className="flex-shrink-0 mt-px">✗</span>
                        <span>{f.error}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: t.channels.today,   value: ch.bookingsToday, hi: false },
                  { label: t.channels.pending, value: ch.pending,       hi: ch.pending > 0 },
                  { label: t.channels.failed,  value: ch.failed,        hi: ch.failed > 0 },
                ].map(s => (
                  <div key={s.label} className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 text-center border border-slate-100 dark:border-slate-700">
                    <p className={`text-xl font-extrabold leading-none ${s.hi ? 'text-red-500' : 'text-slate-800 dark:text-slate-200'}`}>{s.value}</p>
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold uppercase tracking-wide">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                <p className="text-xs text-slate-400">
                  {t.channels.lastSync}:{' '}
                  <span className="font-semibold text-slate-600">
                    {status === 'done' ? (lang === 'ar' ? 'الآن' : 'just now') : ch.lastSync}
                  </span>
                </p>
                <button onClick={() => forceSync(ch.channel)} disabled={status === 'syncing'}
                  className="flex items-center gap-1 text-xs font-bold transition-colors disabled:opacity-60 text-blue-600 hover:text-blue-700">
                  {status === 'syncing' ? (
                    <><span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> {lang === 'ar' ? 'جارٍ…' : 'Syncing…'}</>
                  ) : status === 'failed' ? (
                    <><Icons.refresh size={12} className="text-red-500" /> <span className="text-red-500">{lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}</span></>
                  ) : status === 'done' ? (
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
                  <p className="text-xs font-bold text-slate-600">{lang === 'ar' ? 'مفتاح الإيقاف' : 'Kill Switch'}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {killSwitch[ch.channel]
                      ? (lang === 'ar' ? 'مفتوح — يقبل الحجوزات' : 'Open — accepting bookings')
                      : (lang === 'ar' ? 'مغلق — لا حجوزات جديدة' : 'Closed — no new bookings')}
                  </p>
                </div>
                <button onClick={() => toggleKill(ch.channel)} disabled={killAnimating[ch.channel]}
                  className={`relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 focus:outline-none ${killSwitch[ch.channel] ? 'bg-emerald-500' : 'bg-slate-300'} ${killAnimating[ch.channel] ? 'opacity-60' : ''}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${killSwitch[ch.channel] ? 'start-6' : 'start-0.5'}`} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Integration panels */}
      <AirbnbPanel />
      <GathernPanel />
      <AgodaPanel />
      <ExpediaPanel />
      <WafiPanel />
      <UltimateOverlapPanel />
      <IntegrationMonitor />
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
