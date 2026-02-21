'use client';

import { CALENDAR_EVENTS, PROPERTIES } from '@/lib/mock-data';

const DAYS = Array.from({ length: 28 }, (_, i) => i + 1);
const UNITS = [
  'Riyadh — Unit A', 'Riyadh — Unit B', 'Riyadh — Unit C',
  'Jeddah Villa', 'Diriyah — C1', 'Diriyah — C2', 'AlUla Studio',
];

const CHANNEL_COLORS: Record<string, string> = {
  'Booking.com': 'bg-blue-700 text-white',
  'Airbnb':      'bg-rose-500 text-white',
  'Gathern':     'bg-emerald-600 text-white',
  'Direct':      'bg-amber-500 text-white',
  'Maintenance': 'bg-slate-400 text-white',
};

export default function CalendarPage() {
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Master Calendar</h1>
          <p className="text-slate-500 text-sm mt-0.5">February 2026 — All units across all channels</p>
        </div>
        <div className="flex gap-2">
          <button className="text-sm border border-gray-200 bg-white hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-lg transition-colors">◀ Jan</button>
          <button className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg font-medium">Feb 2026</button>
          <button className="text-sm border border-gray-200 bg-white hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-lg transition-colors">Mar ▶</button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(CHANNEL_COLORS).map(([ch, cls]) => (
          <span key={ch} className={`text-xs px-3 py-1 rounded-full font-medium ${cls}`}>● {ch}</span>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full min-w-[900px] text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 font-semibold text-slate-600 w-40 border-r border-gray-100">Unit</th>
              {DAYS.map(d => (
                <th key={d} className={`text-center py-3 font-medium w-9 ${d === 21 ? 'bg-blue-50 text-blue-600' : 'text-slate-500'}`}>
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {UNITS.map((unit, ui) => (
              <tr key={unit} className={`border-b border-gray-50 ${ui % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                <td className="px-4 py-2.5 font-medium text-slate-700 border-r border-gray-100 whitespace-nowrap">{unit}</td>
                {DAYS.map(day => {
                  const event = CALENDAR_EVENTS.find(
                    e => e.unit === unit && day >= e.start && day < e.end
                  );
                  const isStart = event && day === event.start;
                  const isEnd = event && day === event.end - 1;

                  return (
                    <td key={day} className={`h-10 relative border-r border-gray-50 ${day === 21 ? 'bg-blue-50/40' : ''}`}>
                      {event && (
                        <div
                          title={`${event.channel}: ${event.guest}`}
                          className={`absolute inset-y-1 left-0 right-0 flex items-center ${event.color} cursor-pointer z-10
                            ${isStart ? 'rounded-l-md ml-1' : ''}
                            ${isEnd ? 'rounded-r-md mr-1' : ''}
                          `}
                        >
                          {isStart && (
                            <span className="px-1.5 truncate text-xs font-medium whitespace-nowrap">{event.guest}</span>
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Block for Maintenance', icon: '🔧', desc: 'Close dates across all channels', color: 'bg-slate-100 text-slate-700 hover:bg-slate-200' },
          { label: 'Add Manual Booking', icon: '✚', desc: 'Walk-in or direct reservation', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
          { label: 'Open Closed Dates', icon: '🔓', desc: 'Re-open blocked availability', color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
        ].map(a => (
          <button key={a.label} className={`${a.color} p-4 rounded-xl text-left transition-colors`}>
            <span className="text-2xl">{a.icon}</span>
            <p className="font-semibold text-sm mt-2">{a.label}</p>
            <p className="text-xs opacity-70 mt-0.5">{a.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
