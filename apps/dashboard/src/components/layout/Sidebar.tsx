'use client';

import { useState } from 'react';
import { Icons } from '@/lib/icons';
import { OWNER } from '@/lib/mock-data';

const NAV = [
  { id: 'overview',   label: 'Overview',        Icon: Icons.overview,   badge: 0 },
  { id: 'calendar',   label: 'Master Calendar', Icon: Icons.calendar,   badge: 0 },
  { id: 'bookings',   label: 'Bookings',        Icon: Icons.bookings,   badge: 1 },
  { id: 'channels',   label: 'Channels',        Icon: Icons.channels,   badge: 0 },
  { id: 'inbox',      label: 'Inbox',           Icon: Icons.inbox,      badge: 2 },
  { id: 'analytics',  label: 'Analytics',       Icon: Icons.analytics,  badge: 0 },
  { id: 'financials', label: 'Financials',      Icon: Icons.financials, badge: 0 },
];

const PROPS_QUICK = [
  { name: 'Riyadh Apt.',    occ: 82, color: '#10B981' },
  { name: 'Jeddah Villa',   occ: 67, color: '#F59E0B' },
  { name: 'Diriyah Chalet', occ: 71, color: '#F59E0B' },
  { name: 'AlUla Studio',   occ: 71, color: '#F59E0B' },
];

interface Props { activePage: string; onNavigate: (p: string) => void; }

export default function Sidebar({ activePage, onNavigate }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className="flex flex-col bg-slate-950 text-white flex-shrink-0 h-screen sticky top-0"
      style={{ width: collapsed ? 68 : 240, transition: 'width 0.25s ease' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-3.5 h-16 border-b border-white/5 flex-shrink-0">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-sm flex-shrink-0 text-white"
          style={{ background: 'linear-gradient(135deg,#3B82F6,#6366F1)' }}
        >R</div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-sm text-white leading-none tracking-tight">REMS</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Property Manager</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(v => !v)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all flex-shrink-0 ml-auto"
        >
          {collapsed ? <Icons.chevronRight size={14} /> : <Icons.chevronLeft size={14} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-hidden">
        {!collapsed && (
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.12em] px-2 pb-1.5 pt-1">
            Menu
          </p>
        )}
        {NAV.map(({ id, label, Icon, badge }) => {
          const active = activePage === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              title={collapsed ? label : undefined}
              className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-medium transition-all relative
                ${active
                  ? 'text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/6'
                }`}
              style={active ? { background: 'linear-gradient(135deg,#2563EB,#4F46E5)' } : {}}
            >
              <Icon size={17} className="flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{label}</span>
                  {(badge ?? 0) > 0 && (
                    <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {badge}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Portfolio quick view */}
      {!collapsed && (
        <div className="px-2 pb-2">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.12em] px-2 pb-2">
            Portfolio
          </p>
          <div className="bg-white/4 rounded-xl px-3 py-2.5 space-y-2">
            {PROPS_QUICK.map(p => (
              <div key={p.name} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
                <span className="flex-1 text-xs text-slate-400 truncate">{p.name}</span>
                <span className="text-xs font-bold" style={{ color: p.color }}>{p.occ}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User */}
      <div className="p-3 border-t border-white/5 flex-shrink-0">
        <div className={`flex items-center gap-2.5 ${collapsed ? 'justify-center' : 'px-1'}`}>
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 text-white"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#6366F1)' }}
          >
            {OWNER.fullName.charAt(0)}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate leading-none">{OWNER.fullName}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Property Owner</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
