'use client';

import { useState, useMemo } from 'react';
import { Icons } from '@/lib/icons';
import { OWNER, RECENT_BOOKINGS, CLEANING_REQUESTS, INBOX_MESSAGES } from '@/lib/mock-data';
import { useLang } from '@/lib/language-context';

const NAV_ICONS = {
  overview:   Icons.overview,
  properties: Icons.properties,
  calendar:   Icons.calendar,
  bookings:   Icons.bookings,
  channels:   Icons.channels,
  cleaning:   Icons.cleaning,
  inbox:      Icons.inbox,
  analytics:  Icons.analytics,
  financials: Icons.financials,
  shipments:  Icons.truck,
  settings:   Icons.settings,
};
// Badges are computed from live data at module level (static mock, so useMemo isn't needed)
function getNavBadges(): Record<string, number> {
  const pendingBookings = RECENT_BOOKINGS.filter(b => b.status === 'PENDING').length;
  const unreadMessages  = INBOX_MESSAGES.filter(m => !m.isRead).length;
  const pendingCleaning = CLEANING_REQUESTS.filter(c => c.status === 'PENDING').length;
  return {
    ...(pendingBookings > 0 ? { bookings: pendingBookings } : {}),
    ...(unreadMessages  > 0 ? { inbox:    unreadMessages  } : {}),
    ...(pendingCleaning > 0 ? { cleaning: pendingCleaning } : {}),
  };
}

const NAV_SECTIONS = [
  {
    labelEn: 'Main',
    labelAr: 'الرئيسية',
    items: ['overview', 'properties'] as const,
  },
  {
    labelEn: 'Operations',
    labelAr: 'العمليات',
    items: ['calendar', 'bookings', 'channels', 'cleaning', 'inbox'] as const,
  },
  {
    labelEn: 'Analytics & Finance',
    labelAr: 'التحليلات والمالية',
    items: ['analytics', 'financials'] as const,
  },
  {
    labelEn: 'Admin',
    labelAr: 'الإدارة',
    items: ['shipments', 'settings'] as const,
  },
] as const;

type NavId = 'overview'|'properties'|'calendar'|'bookings'|'channels'|'cleaning'|'inbox'|'analytics'|'financials'|'shipments'|'settings';

const PROPS_QUICK = [
  { name: { en: 'Riyadh Apt.',    ar: 'شقة الرياض'    }, occ: 82, color: '#10B981' },
  { name: { en: 'Jeddah Villa',   ar: 'فيلا جدة'      }, occ: 67, color: '#F59E0B' },
  { name: { en: 'Diriyah Chalet', ar: 'شاليه الدرعية' }, occ: 71, color: '#F59E0B' },
  { name: { en: 'AlUla Studio',   ar: 'استوديو العلا'  }, occ: 71, color: '#F59E0B' },
];

interface Props {
  activePage: string;
  onNavigate: (p: string) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ activePage, onNavigate, mobileOpen = false, onMobileClose }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const { t, lang } = useLang();
  const NAV_BADGES = useMemo(() => getNavBadges(), []);

  const handleNavigate = (id: string) => {
    onNavigate(id);
    onMobileClose?.(); // auto-close drawer on mobile after navigation
  };

  return (
    <>
      {/* ── Mobile backdrop overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        id="sidebar-nav"
        className={[
          'flex flex-col bg-slate-950 text-white h-full',
          // Mobile: fixed drawer sliding from start edge
          'fixed inset-y-0 start-0 z-50',
          'transition-transform duration-300 ease-in-out',
          mobileOpen
            ? 'translate-x-0'
            : 'ltr:-translate-x-full rtl:translate-x-full',
          // Desktop: back in normal flow, always visible
          'lg:relative lg:flex-shrink-0 lg:h-screen lg:translate-x-0',
        ].join(' ')}
        style={{ width: collapsed ? 68 : 240 }}
      >
        {/* Logo + collapse toggle */}
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
          {/* Desktop collapse button */}
          <button
            onClick={() => setCollapsed(v => !v)}
            className="sidebar-chevron hidden lg:flex w-7 h-7 rounded-lg items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
          >
            {collapsed ? <Icons.chevronRight size={14} /> : <Icons.chevronLeft size={14} />}
          </button>
          {/* Mobile close button */}
          <button
            onClick={onMobileClose}
            className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all flex-shrink-0 ms-auto"
            aria-label="Close menu"
          >
            <Icons.x size={15} />
          </button>
        </div>

        {/* Nav — grouped into sections */}
        <nav className="flex-1 py-3 px-2 overflow-y-auto overflow-x-hidden">
          {NAV_SECTIONS.map((section, si) => (
            <div key={section.labelEn} className={si > 0 ? 'mt-4' : ''}>
              {/* Section label — hidden when sidebar is collapsed */}
              {!collapsed && (
                <div className="flex items-center gap-2 px-2 pb-1.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em] leading-none">
                    {lang === 'ar' ? section.labelAr : section.labelEn}
                  </p>
                  {si > 0 && <div className="flex-1 h-px bg-white/10" />}
                </div>
              )}
              {collapsed && si > 0 && (
                <div className="mx-2 mb-2 h-px bg-white/5" />
              )}
              <div className="space-y-0.5">
                {section.items.map(id => {
                  const navId  = id as NavId;
                  const Icon   = NAV_ICONS[navId];
                  const label  = t.nav[navId];
                  const badge  = NAV_BADGES[navId] ?? 0;
                  const active = activePage === navId;
                  return (
                    <button
                      key={navId}
                      onClick={() => handleNavigate(navId)}
                      title={collapsed ? label : undefined}
                      className={`w-full flex items-center gap-3 px-2.5 rounded-xl text-sm font-semibold transition-all
                        ${active ? 'text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                      style={{
                        ...(active ? { background: 'linear-gradient(135deg,#2563EB,#4F46E5)' } : {}),
                        minHeight: '44px',
                      }}
                    >
                      <Icon size={17} className="flex-shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-start truncate">{label}</span>
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
              </div>
            </div>
          ))}
        </nav>

        {/* Portfolio quick view */}
        {!collapsed && (
          <div className="px-2 pb-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em] px-2 pb-2">
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
    </>
  );
}
