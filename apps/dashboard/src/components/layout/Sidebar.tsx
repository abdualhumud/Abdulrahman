'use client';

import { useState } from 'react';
import { Icons } from '@/lib/icons';
import { OWNER } from '@/lib/mock-data';
import { useLang } from '@/lib/language-context';

const NAV_IDS = ['overview','properties','calendar','bookings','channels','inbox','analytics','financials'] as const;
const NAV_ICONS = {
  overview:   Icons.overview,
  properties: Icons.properties,
  calendar:   Icons.calendar,
  bookings:   Icons.bookings,
  channels:   Icons.channels,
  inbox:      Icons.inbox,
  analytics:  Icons.analytics,
  financials: Icons.financials,
};
const NAV_BADGES: Record<string, number> = { bookings: 1, inbox: 2 };

const PROPS_QUICK = [
  { name: { en: 'Riyadh Apt.',    ar: 'شقة الرياض'    }, occ: 82, color: '#10B981' },
  { name: { en: 'Jeddah Villa',   ar: 'فيلا جدة'      }, occ: 67, color: '#F59E0B' },
  { name: { en: 'Diriyah Chalet', ar: 'شاليه الدرعية' }, occ: 71, color: '#F59E0B' },
  { name: { en: 'AlUla Studio',   ar: 'استوديو العلا'  }, occ: 71, color: '#F59E0B' },
];

interface Props { activePage: string; onNavigate: (p: string) => void; }

export default function Sidebar({ activePage, onNavigate }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const { t, lang, toggle } = useLang();

  return (
    <aside
      className="flex flex-col bg-slate-950 text-white flex-shrink-0 h-screen"
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
          className="sidebar-chevron w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
        >
          {collapsed ? <Icons.chevronRight size={14} /> : <Icons.chevronLeft size={14} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-hidden">
        {!collapsed && (
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.12em] px-2 pb-1.5 pt-1">
            {t.nav.menu}
          </p>
        )}
        {NAV_IDS.map(id => {
          const Icon   = NAV_ICONS[id];
          const label  = t.nav[id];
          const badge  = NAV_BADGES[id] ?? 0;
          const active = activePage === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              title={collapsed ? label : undefined}
              className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-semibold transition-all
                ${active ? 'text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-white/6'}`}
              style={active ? { background: 'linear-gradient(135deg,#2563EB,#4F46E5)' } : {}}
            >
              <Icon size={17} className="flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-start">{label}</span>
                  {badge > 0 && (
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
            {t.nav.portfolio}
          </p>
          <div className="bg-white/4 rounded-xl px-3 py-2.5 space-y-2">
            {PROPS_QUICK.map(p => (
              <div key={p.name.en} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
                <span className="flex-1 text-xs text-slate-400 truncate">{p.name[lang as 'en' | 'ar']}</span>
                <span className="text-xs font-bold" style={{ color: p.color }}>{p.occ}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Language toggle */}
      <div className="px-3 pb-2 flex-shrink-0">
        <button
          onClick={toggle}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-white/10 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/8 transition-all"
        >
          <span className="text-base leading-none">{lang === 'en' ? '🇸🇦' : '🇬🇧'}</span>
          {!collapsed && <span>{t.nav.switchLang}</span>}
        </button>
      </div>

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
              <p className="text-[11px] text-slate-500 mt-0.5">
                {lang === 'ar' ? 'مالك العقار' : 'Property Owner'}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
