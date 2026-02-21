'use client';

import { useState } from 'react';
import { OWNER } from '@/lib/mock-data';

const NAV = [
  { id: 'overview',    icon: '▦',  label: 'Overview' },
  { id: 'calendar',    icon: '📅', label: 'Master Calendar' },
  { id: 'bookings',    icon: '🏷️', label: 'Bookings', badge: 1 },
  { id: 'channels',    icon: '🔗', label: 'Channels' },
  { id: 'inbox',       icon: '💬', label: 'Inbox', badge: 2 },
  { id: 'analytics',   icon: '📈', label: 'Analytics' },
  { id: 'financials',  icon: '💰', label: 'Financials' },
];

interface Props {
  activePage: string;
  onNavigate: (page: string) => void;
}

export default function Sidebar({ activePage, onNavigate }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-60'} bg-slate-900 text-white flex flex-col flex-shrink-0 transition-all duration-200`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700/60">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0">R</div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-none">REMS</p>
            <p className="text-xs text-slate-400 mt-0.5">Property Manager</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(v => !v)}
          className="text-slate-400 hover:text-white transition-colors ml-auto flex-shrink-0"
        >
          <span className="text-xs">{collapsed ? '▶' : '◀'}</span>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {NAV.map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              activePage === item.id
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-700/60'
            }`}
          >
            <span className="text-base flex-shrink-0">{item.icon}</span>
            {!collapsed && (
              <>
                <span className="flex-1 text-left font-medium">{item.label}</span>
                {item.badge ? (
                  <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {item.badge}
                  </span>
                ) : null}
              </>
            )}
          </button>
        ))}
      </nav>

      {/* Owner */}
      <div className="p-3 border-t border-slate-700/60">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
            {OWNER.fullName.charAt(0)}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{OWNER.fullName}</p>
              <p className="text-xs text-slate-400">Property Owner</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
