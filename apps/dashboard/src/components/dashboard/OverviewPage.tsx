'use client';

import { useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { Icons } from '@/lib/icons';
import { useLang } from '@/lib/language-context';
import { useJourney } from '@/lib/journey-context';
import {
  KPI_DATA, MONTHLY_REVENUE, CHANNEL_BREAKDOWN,
  RECENT_BOOKINGS, CHANNEL_SYNC_STATUS, OWNER,
} from '@/lib/mock-data';

const STATUS_STYLE: Record<string, string> = {
  CONFIRMED:   'bg-emerald-50 text-emerald-700 border border-emerald-200',
  CHECKED_IN:  'bg-blue-50 text-blue-700 border border-blue-200',
  CHECKED_OUT: 'bg-slate-100 text-slate-500 border border-slate-200',
  PENDING:     'bg-amber-50 text-amber-700 border border-amber-200',
};

function KpiCard({ label, value, sub, trendVal, trendLabel, icon, accent, onClick }: {
  label: string; value: string; sub?: string; trendVal?: number; trendLabel?: string;
  icon: React.ReactNode; accent: string; onClick?: () => void;
}) {
  const { t } = useLang();
  const up = (trendVal ?? 0) >= 0;
  return (
    <div
      onClick={onClick}
      className={`card p-5 transition-all ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:translate-y-0' : ''}`}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider leading-none">{label}</p>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: accent + '15', color: accent }}>{icon}</div>
      </div>
      <p className="text-[1.6rem] font-extrabold text-slate-900 tracking-tight leading-none">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      {trendVal !== undefined && (
        <div className={`flex items-center gap-1 mt-3 text-xs font-bold ${up ? 'text-emerald-600' : 'text-red-500'}`}>
          {up ? <Icons.trendUp size={12} /> : <Icons.trendDown size={12} />}
          {Math.abs(trendVal)}% {trendLabel}
        </div>
      )}
      {onClick && (
        <p className="flex items-center gap-0.5 mt-2 text-[10px] text-slate-300 font-semibold">
          <Icons.arrowRight size={9} /> {t.bookings.view}
        </p>
      )}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 shadow-xl rounded-xl px-4 py-3 text-left" style={{ direction: 'ltr' }}>
      <p className="text-xs text-slate-400 mb-1 font-medium">{label}</p>
      <p className="text-base font-bold text-slate-900">SAR {Number(payload[0].value).toLocaleString()}</p>
    </div>
  );
};

interface Props {
  onNavigate?: (page: string) => void;
}

export default function OverviewPage({ onNavigate }: Props) {
  const { t, lang } = useLang();
  const { completed, markDone } = useJourney();
  const firstName = OWNER.fullName.split(' ')[0];

  // ✅ Journey Step 4 — "Go Live": auto-mark when user reaches overview after steps 1-3
  useEffect(() => {
    if (completed.size >= 3 && !completed.has(4)) {
      markDone(4);
    }
  }, [completed, markDone]);

  const nav = (page: string) => onNavigate?.(page);

  return (
    <div className="p-6 space-y-5 min-h-full">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {t.overview.greeting}، {lang === 'ar' ? 'عبدالرحمن' : firstName} 👋
          </h1>
          <p className="text-sm text-slate-400 mt-1">{t.overview.subtitle}</p>
        </div>
        <button
          onClick={() => nav('channels')}
          className="flex items-center gap-2 bg-white border border-emerald-100 shadow-sm rounded-xl px-3.5 py-2 hover:bg-emerald-50 transition-colors"
        >
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-xs font-semibold text-emerald-700">{t.overview.allLive}</span>
        </button>
      </div>

      {/* KPIs — all clickable */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard label={t.kpi.totalRevenue}
          value={`${t.common.sar} ${KPI_DATA.totalRevenue.toLocaleString()}`}
          icon={<Icons.financials size={17} />} accent="#3B82F6"
          trendVal={KPI_DATA.revenueTrend} trendLabel={t.common.vsLastMonth}
          onClick={() => nav('financials')} />
        <KpiCard label={t.kpi.netPayout}
          value={`${t.common.sar} ${KPI_DATA.netPayout.toLocaleString()}`}
          sub={t.kpi.afterFees} icon={<Icons.download size={17} />} accent="#10B981"
          onClick={() => nav('financials')} />
        <KpiCard label={t.kpi.occupancy}
          value={`${KPI_DATA.averageOccupancy}%`}
          icon={<Icons.building size={17} />} accent="#8B5CF6"
          trendVal={KPI_DATA.occupancyTrend} trendLabel={t.common.vsLastMonth}
          onClick={() => nav('analytics')} />
        <KpiCard label={t.kpi.adr}
          value={`${t.common.sar} ${KPI_DATA.adr.toLocaleString()}`}
          sub={t.kpi.avgNightly} icon={<Icons.analytics size={17} />} accent="#F59E0B"
          onClick={() => nav('analytics')} />
        <KpiCard label={t.kpi.revpar}
          value={`${t.common.sar} ${KPI_DATA.revPAR.toLocaleString()}`}
          sub={t.kpi.perRoom} icon={<Icons.trendUp size={17} />} accent="#EC4899"
          onClick={() => nav('analytics')} />
        <KpiCard label={t.kpi.bookings}
          value={`${KPI_DATA.totalBookings}`}
          sub={t.kpi.thisPeriod} icon={<Icons.bookings size={17} />} accent="#06B6D4"
          onClick={() => nav('bookings')} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-5">
        <div className="lg:col-span-5 card">
          <div className="px-6 pt-5 pb-0 flex items-start justify-between">
            <div>
              <p className="font-bold text-slate-900">{t.overview.monthlyRevenue}</p>
              <p className="text-xs text-slate-400 mt-0.5">{t.overview.period}</p>
            </div>
            <button
              onClick={() => nav('financials')}
              className="text-xs font-semibold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full border border-blue-100 hover:bg-blue-100 transition-colors"
            >
              {t.common.sar}
            </button>
          </div>
          <div className="px-1 pb-3 pt-3" style={{ direction: 'ltr' }}>
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={MONTHLY_REVENUE} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#3B82F6" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v/1000).toFixed(0)}k`} width={34} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2.5}
                  fill="url(#rg)" dot={false}
                  activeDot={{ r: 5, fill: '#3B82F6', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 card p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-bold text-slate-900">{t.overview.revenueSplit}</p>
              <p className="text-xs text-slate-400 mt-0.5">{t.overview.byChannel}</p>
            </div>
            <button onClick={() => nav('channels')}
              className="text-[10px] text-blue-600 font-bold hover:underline">
              {t.common.viewAll}
            </button>
          </div>
          <div style={{ direction: 'ltr' }}>
            <ResponsiveContainer width="100%" height={130}>
              <PieChart>
                <Pie data={CHANNEL_BREAKDOWN} cx="50%" cy="50%" innerRadius={38} outerRadius={58}
                  dataKey="revenue" paddingAngle={4} startAngle={90} endAngle={-270}
                  onClick={() => nav('channels')} className="cursor-pointer">
                  {CHANNEL_BREAKDOWN.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [`SAR ${v.toLocaleString()}`, '']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2.5">
            {CHANNEL_BREAKDOWN.map(ch => (
              <button key={ch.channel} onClick={() => nav('channels')}
                className="flex items-center gap-2 w-full text-start hover:bg-slate-50 rounded-lg px-1 -mx-1 py-0.5 transition-colors">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ch.color }} />
                <span className="flex-1 text-xs text-slate-500 truncate">{ch.channel}</span>
                <div className="flex items-center gap-2">
                  <div className="w-14 bg-slate-100 rounded-full h-1.5" style={{ direction: 'ltr' }}>
                    <div className="h-1.5 rounded-full" style={{ width: `${ch.share}%`, background: ch.color }} />
                  </div>
                  <span className="text-xs font-bold text-slate-700 w-7 text-end">{ch.share}%</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-5">

        {/* Channel Sync — clickable → channels page */}
        <div className="lg:col-span-2 card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-bold text-slate-900">{t.overview.channelSync}</p>
            <span className="badge bg-emerald-50 text-emerald-600 border border-emerald-100">{t.overview.live}</span>
          </div>
          {CHANNEL_SYNC_STATUS.map(ch => (
            <button key={ch.channel} onClick={() => nav('channels')}
              className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 w-full text-start hover:bg-blue-50 hover:border-blue-100 transition-colors">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: ch.bg }}>
                {ch.logo}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 leading-none">{ch.channel}</p>
                <p className="text-xs text-slate-400 mt-0.5">{ch.lastSync}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${ch.syncMethod.includes('Webhook') ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                  {ch.syncMethod.includes('Webhook') ? 'WH' : 'Poll'}
                </span>
                <span className="w-2 h-2 bg-emerald-400 rounded-full" />
              </div>
            </button>
          ))}
        </div>

        {/* Recent Bookings — rows navigate to bookings page */}
        <div className="lg:col-span-5 card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
            <p className="font-bold text-slate-900">{t.overview.recentBookings}</p>
            <button onClick={() => nav('bookings')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors">
              {t.common.viewAll} <Icons.chevronRight size={12} />
            </button>
          </div>
          <table className="w-full data-table">
            <thead className="bg-slate-50/80 border-b border-slate-100">
              <tr>
                {[t.table.guest, t.table.property, t.table.channel, t.table.dates, t.table.amount, t.table.status].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {RECENT_BOOKINGS.slice(0, 5).map(b => (
                <tr key={b.id} onClick={() => nav('bookings')}
                  className="hover:bg-blue-50/40 transition-colors cursor-pointer">
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: '#EFF6FF', color: '#2563EB' }}>
                        {b.guest.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm leading-none">{b.guest}</p>
                        <p className="text-xs text-slate-400 mt-0.5 font-mono">{b.id}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <p className="text-slate-700 text-xs font-medium truncate max-w-[130px]">{b.property}</p>
                    <p className="text-slate-400 text-xs">{b.unit}</p>
                  </td>
                  <td><span className="text-xs font-bold" style={{ color: b.channelColor }}>● {b.channel}</span></td>
                  <td>
                    <p className="text-xs text-slate-600 font-medium font-mono">{b.checkIn}</p>
                    <p className="text-xs text-slate-400 font-mono">{b.checkOut}</p>
                  </td>
                  <td className="font-bold text-slate-900">{t.common.sar} {b.amount.toLocaleString()}</td>
                  <td>
                    <span className={`badge ${STATUS_STYLE[b.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {t.status[b.status as keyof typeof t.status] ?? b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
