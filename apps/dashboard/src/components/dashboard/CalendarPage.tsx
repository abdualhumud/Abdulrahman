'use client';

import { Icons } from '@/lib/icons';
import { CALENDAR_EVENTS } from '@/lib/mock-data';

const DAYS  = Array.from({ length: 28 }, (_, i) => i + 1);
const TODAY = 21;

const UNITS = [
  'Riyadh — Unit A', 'Riyadh — Unit B', 'Riyadh — Unit C',
  'Jeddah Villa', 'Diriyah — C1', 'Diriyah — C2', 'AlUla Studio',
];

const CHANNELS: Record<string, { bg: string; text: string; dot: string }> = {
  'Booking.com': { bg: '#EEF2FF', text: '#1D4ED8', dot: '#003580' },
  'Airbnb':      { bg: '#FFF1F2', text: '#BE123C', dot: '#FF5A5F' },
  'Gathern':     { bg: '#F0FDF4', text: '#15803D', dot: '#00a651' },
  'Direct':      { bg: '#FFFBEB', text: '#B45309', dot: '#F59E0B' },
};

export default function CalendarPage() {
  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Master Calendar</h1>
          <p className="text-sm text-slate-400 mt-1">February 2026 — All units & channels</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost py-2 px-3 text-xs">
            <Icons.chevronLeft size={14} /> Jan
          </button>
          <div className="bg-blue-600 text-white text-sm font-bold px-4 py-2 rounded-xl">
            Feb 2026
          </div>
          <button className="btn-ghost py-2 px-3 text-xs">
            Mar <Icons.chevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(CHANNELS).map(([name, s]) => (
          <span key={name}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border"
            style={{ background: s.bg, color: s.text, borderColor: s.dot + '40' }}>
            <span className="w-2 h-2 rounded-full" style={{ background: s.dot }} />
            {name}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
          <span className="w-2 h-2 rounded-full bg-slate-400" />
          Today: Feb {TODAY}
        </span>
      </div>

      {/* Calendar Grid */}
      <div className="card overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: 920 }}>
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider w-36 bg-slate-50 sticky left-0 z-10">
                Unit
              </th>
              {DAYS.map(d => (
                <th key={d} className={`text-center py-3 text-xs font-semibold w-9
                  ${d === TODAY ? 'bg-blue-50 text-blue-600' : 'text-slate-400'}`}>
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {UNITS.map((unit, ui) => (
              <tr key={unit} className={`border-b border-slate-50 ${ui % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
                <td className="px-4 py-0 text-xs font-semibold text-slate-700 bg-inherit sticky left-0 z-10 border-r border-slate-100 h-11 whitespace-nowrap">
                  {unit}
                </td>
                {DAYS.map(day => {
                  const ev    = CALENDAR_EVENTS.find(e => e.unit === unit && day >= e.start && day < e.end);
                  const start = ev && day === ev.start;
                  const end   = ev && day === ev.end - 1;
                  const ch    = ev ? (CHANNELS[ev.channel] ?? { bg: '#E2E8F0', text: '#475569', dot: '#94A3B8' }) : null;
                  return (
                    <td key={day}
                      className={`relative h-11 border-r border-slate-50 ${day === TODAY ? 'bg-blue-50/30' : ''}`}>
                      {ev && ch && (
                        <div
                          title={`${ev.channel}: ${ev.guest}`}
                          className={`absolute inset-y-1.5 cursor-pointer z-10 flex items-center
                            ${start ? 'left-1 rounded-l-lg' : 'left-0'}
                            ${end   ? 'right-1 rounded-r-lg' : 'right-0'}`}
                          style={{ background: ch.dot, opacity: 0.92 }}
                        >
                          {start && (
                            <span className="px-2 text-white text-[10px] font-bold truncate leading-none whitespace-nowrap">
                              {ev.guest.split(' ')[0]}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: 'Block for Maintenance',
            desc: 'Close dates across all channels simultaneously',
            Icon: Icons.refresh,
            style: 'bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700',
            iconBg: 'bg-slate-200 text-slate-600',
          },
          {
            label: 'Add Manual Booking',
            desc: 'Walk-in or direct reservation entry',
            Icon: Icons.plus,
            style: 'bg-blue-50 border border-blue-100 hover:bg-blue-100 text-blue-700',
            iconBg: 'bg-blue-200 text-blue-700',
          },
          {
            label: 'Open Blocked Dates',
            desc: 'Re-open dates and sync availability',
            Icon: Icons.check,
            style: 'bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 text-emerald-700',
            iconBg: 'bg-emerald-200 text-emerald-700',
          },
        ].map(a => (
          <button key={a.label} className={`rounded-2xl p-5 text-left transition-all ${a.style}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${a.iconBg}`}>
              <a.Icon size={17} />
            </div>
            <p className="font-bold text-sm">{a.label}</p>
            <p className="text-xs opacity-60 mt-1 leading-relaxed">{a.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
