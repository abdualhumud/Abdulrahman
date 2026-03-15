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
  { name: { en: 'Riyadh Apt.',    ar: 'شقة الرياض'    }, occ: 82, color: '#10B981', colorBg: 'rgba(16,185,129,0.15)' },
  { name: { en: 'Jeddah Villa',   ar: 'فيلا جدة'      }, occ: 67, color: '#F59E0B', colorBg: 'rgba(245,158,11,0.15)'  },
  { name: { en: 'Diriyah Chalet', ar: 'شاليه الدرعية' }, occ: 71, color: '#F59E0B', colorBg: 'rgba(245,158,11,0.15)'  },
  { name: { en: 'AlUla Studio',   ar: 'استوديو العلا'  }, occ: 55, color: '#EF4444', colorBg: 'rgba(239,68,68,0.15)'   },
];

// Icon glow color per nav item
const NAV_GLOW: Partial<Record<NavId, string>> = {
  overview:   '#3B82F6',
  properties: '#10B981',
  calendar:   '#8B5CF6',
  bookings:   '#F59E0B',
  channels:   '#6366F1',
  cleaning:   '#EC4899',
  inbox:      '#F97316',
  analytics:  '#6366F1',
  financials: '#14B8A6',
  shipments:  '#F59E0B',
  settings:   '#8B5CF6',
};

interface Props {
  activePage: string;
  onNavigate: (p: string) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ activePage, onNavigate, mobileOpen = false, onMobileClose }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const { t, lang } = useLang();
  const NAV_BADGES = useMemo(() => getNavBadges(), []);

  const handleNavigate = (id: string) => {
    onNavigate(id);
    onMobileClose?.();
  };

  return (
    <>
      <style>{`
        @keyframes badgePulse {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.2); }
        }
        @keyframes onlinePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.85); }
        }
        .nav-item-hover { transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1); }
        .sidebar-badge { animation: badgePulse 2s ease-in-out infinite; }
        .online-dot    { animation: onlinePulse 2.5s ease-in-out infinite; }
        .progress-bar  { transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1); }
        .collapse-btn  { transition: all 0.2s ease; }
        .collapse-btn:hover { transform: scale(1.1); }
      `}</style>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        id="sidebar-nav"
        className={[
          'flex flex-col h-full',
          'fixed inset-y-0 start-0 z-50',
          'transition-all duration-300 ease-in-out',
          mobileOpen
            ? 'translate-x-0'
            : 'ltr:-translate-x-full rtl:translate-x-full',
          'lg:relative lg:flex-shrink-0 lg:h-screen lg:!translate-x-0',
        ].join(' ')}
        style={{
          width: collapsed ? 68 : 248,
          background: 'linear-gradient(180deg, #0B0F1A 0%, #0D1120 60%, #0B0F1A 100%)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '4px 0 24px rgba(0,0,0,0.4)',
        }}
      >
        {/* Subtle right-edge glow */}
        <div
          className="absolute inset-y-0 end-0 w-px pointer-events-none"
          style={{ background: 'linear-gradient(180deg, transparent, rgba(59,130,246,0.3) 50%, transparent)' }}
        />

        {/* ── Logo Header ── */}
        <div
          className="flex items-center gap-3 px-3 h-16 flex-shrink-0 relative"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          {/* Brand mark */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-sm flex-shrink-0 text-white relative"
            style={{
              background: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)',
              boxShadow: '0 0 16px rgba(99,102,241,0.5), 0 2px 8px rgba(0,0,0,0.4)',
            }}
          >
            <span style={{ letterSpacing: '-0.5px' }}>R</span>
            {/* Shine overlay */}
            <div
              className="absolute inset-0 rounded-xl"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 60%)' }}
            />
          </div>

          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-sm text-white leading-none tracking-tight">REMS</p>
              <p
                className="text-[11px] mt-0.5 truncate"
                style={{ color: 'rgba(255,255,255,0.5)' }}
              >
                {lang === 'ar' ? 'إدارة العقارات' : 'Property Manager'}
              </p>
            </div>
          )}

          {/* Desktop collapse button */}
          <button
            onClick={() => setCollapsed(v => !v)}
            className="collapse-btn hidden lg:flex w-7 h-7 rounded-lg items-center justify-center flex-shrink-0"
            style={{
              color: 'rgba(255,255,255,0.55)',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.color = '#fff';
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.55)';
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
            }}
          >
            {collapsed ? <Icons.chevronRight size={13} /> : <Icons.chevronLeft size={13} />}
          </button>

          {/* Mobile close */}
          <button
            onClick={onMobileClose}
            className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ms-auto"
            style={{ color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.05)' }}
          >
            <Icons.x size={15} />
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 py-3 px-2 overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: 'none' }}>
          {NAV_SECTIONS.map((section, si) => (
            <div key={section.labelEn} className={si > 0 ? 'mt-5' : ''}>

              {/* Section label */}
              {!collapsed ? (
                <div className="flex items-center gap-2 px-2 mb-1.5">
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.13em] leading-none whitespace-nowrap"
                    style={{ color: 'rgba(255,255,255,0.6)' }}
                  >
                    {lang === 'ar' ? section.labelAr : section.labelEn}
                  </span>
                  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                </div>
              ) : si > 0 ? (
                <div className="mx-3 mb-3 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
              ) : null}

              <div className="space-y-0.5">
                {section.items.map(id => {
                  const navId  = id as NavId;
                  const Icon   = NAV_ICONS[navId];
                  const label  = t.nav[navId];
                  const badge  = NAV_BADGES[navId] ?? 0;
                  const active = activePage === navId;
                  const hovered = hoveredItem === navId;
                  const glowColor = NAV_GLOW[navId] ?? '#3B82F6';

                  return (
                    <button
                      key={navId}
                      onClick={() => handleNavigate(navId)}
                      onMouseEnter={() => setHoveredItem(navId)}
                      onMouseLeave={() => setHoveredItem(null)}
                      title={collapsed ? label : undefined}
                      className="nav-item-hover w-full flex items-center rounded-xl text-sm font-semibold relative overflow-hidden"
                      style={{
                        gap: collapsed ? 0 : 10,
                        padding: collapsed ? '0' : '0 10px',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        minHeight: 40,
                        color: active ? '#fff' : hovered ? '#e2e8f0' : 'rgba(255,255,255,0.55)',
                        background: active
                          ? `linear-gradient(135deg, ${glowColor}22 0%, ${glowColor}15 100%)`
                          : hovered
                          ? 'rgba(255,255,255,0.05)'
                          : 'transparent',
                        border: active
                          ? `1px solid ${glowColor}30`
                          : '1px solid transparent',
                        boxShadow: active ? `0 0 12px ${glowColor}18` : 'none',
                      }}
                    >
                      {/* Active left accent bar */}
                      {active && (
                        <div
                          className="absolute inset-y-0 start-0 w-0.5 rounded-full"
                          style={{ background: `linear-gradient(180deg, transparent, ${glowColor}, transparent)` }}
                        />
                      )}

                      {/* Icon wrapper */}
                      <div
                        className="flex items-center justify-center rounded-lg flex-shrink-0"
                        style={{
                          width: 30,
                          height: 30,
                          background: active
                            ? `${glowColor}25`
                            : hovered
                            ? `${glowColor}15`
                            : 'transparent',
                          color: active ? glowColor : 'inherit',
                          transition: 'all 0.18s ease',
                        }}
                      >
                        <Icon size={16} />
                      </div>

                      {!collapsed && (
                        <>
                          <span className="flex-1 text-start truncate text-[13px]">{label}</span>
                          {badge > 0 && (
                            <span
                              className="sidebar-badge min-w-[18px] h-[18px] px-1 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
                              style={{ background: 'linear-gradient(135deg, #EF4444, #F97316)' }}
                            >
                              {badge}
                            </span>
                          )}
                        </>
                      )}

                      {/* Collapsed badge dot */}
                      {collapsed && badge > 0 && (
                        <div
                          className="absolute top-1.5 end-1.5 w-2 h-2 rounded-full"
                          style={{ background: '#EF4444', boxShadow: '0 0 6px rgba(239,68,68,0.8)' }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Portfolio Quick View ── */}
        {!collapsed && (
          <div className="px-2 pb-2">
            <div
              className="rounded-xl px-3 py-3"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div className="flex items-center justify-between mb-2.5">
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.12em]"
                  style={{ color: 'rgba(100,116,139,0.8)' }}
                >
                  {t.nav.portfolio}
                </p>
                <div
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                  style={{ color: '#10B981', background: 'rgba(16,185,129,0.12)' }}
                >
                  {lang === 'ar' ? 'مباشر' : 'Live'}
                </div>
              </div>

              <div className="space-y-2.5">
                {PROPS_QUICK.map(p => (
                  <div key={p.name.en}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: p.color, boxShadow: `0 0 4px ${p.color}` }}
                        />
                        <span className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.65)' }}>
                          {p.name[lang as 'en' | 'ar']}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold flex-shrink-0 ms-2" style={{ color: p.color }}>
                        {p.occ}%
                      </span>
                    </div>
                    {/* Mini progress bar */}
                    <div
                      className="w-full rounded-full overflow-hidden"
                      style={{ height: 3, background: 'rgba(255,255,255,0.06)' }}
                    >
                      <div
                        className="progress-bar h-full rounded-full"
                        style={{
                          width: `${p.occ}%`,
                          background: `linear-gradient(90deg, ${p.color}99, ${p.color})`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── User Footer ── */}
        <div
          className="p-3 flex-shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div
            className={`flex items-center gap-2.5 rounded-xl p-2 cursor-pointer transition-all duration-200 ${collapsed ? 'justify-center' : ''}`}
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.06)'}
            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'}
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm text-white"
                style={{
                  background: 'linear-gradient(135deg, #7C3AED, #6366F1)',
                  boxShadow: '0 0 10px rgba(124,58,237,0.4)',
                }}
              >
                {OWNER.fullName.charAt(0)}
              </div>
              {/* Online indicator */}
              <div
                className="online-dot absolute -bottom-0.5 -end-0.5 w-2.5 h-2.5 rounded-full border-2"
                style={{
                  background: '#10B981',
                  borderColor: '#0B0F1A',
                  boxShadow: '0 0 6px rgba(16,185,129,0.7)',
                }}
              />
            </div>

            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate leading-none">{OWNER.fullName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="text-[10px]"
                    style={{ color: 'rgba(255,255,255,0.55)' }}
                  >
                    {lang === 'ar' ? 'مالك العقار' : 'Property Owner'}
                  </span>
                  <span
                    className="text-[9px] font-bold px-1 py-px rounded uppercase tracking-wide"
                    style={{ background: 'rgba(99,102,241,0.2)', color: '#818CF8' }}
                  >
                    {'Pro'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
