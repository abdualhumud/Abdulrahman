'use client';

import { Icons } from '@/lib/icons';
import { OWNER } from '@/lib/mock-data';
import { useLang } from '@/lib/language-context';
import { useMode } from '@/lib/mode-context';

const PAGE_TITLES: Record<string, { en: string; ar: string; icon: keyof typeof import('@/lib/icons').Icons }> = {
  overview:    { en: 'Overview',            ar: 'نظرة عامة'         , icon: 'overview'    },
  calendar:    { en: 'Master Calendar',     ar: 'التقويم الرئيسي'   , icon: 'calendar'    },
  bookings:    { en: 'Bookings',            ar: 'الحجوزات'           , icon: 'bookings'    },
  channels:    { en: 'Channel Manager',     ar: 'مدير القنوات'       , icon: 'channels'    },
  cleaning:    { en: 'Cleaning & Housekeeping', ar: 'التنظيف والتدبير', icon: 'cleaning'   },
  inbox:       { en: 'Inbox',              ar: 'صندوق الوارد'       , icon: 'inbox'       },
  analytics:   { en: 'Analytics',          ar: 'التحليلات'          , icon: 'analytics'   },
  financials:  { en: 'Financials',         ar: 'التقارير المالية'   , icon: 'financials'  },
  properties:  { en: 'Properties & Units', ar: 'إدارة الأملاك'      , icon: 'properties'  },
  settings:    { en: 'Settings',           ar: 'الإعدادات'           , icon: 'settings'    },
  shipments:   { en: 'Shipments',          ar: 'الشحنات'             , icon: 'truck'       },
};

interface Props {
  activePage: string;
  onNavigate: (p: string) => void;
  onMenuToggle?: () => void;
  mobileMenuOpen?: boolean;
  darkMode?: boolean;
  onToggleDark?: () => void;
  viewportMode?: 'desktop' | 'mobile';
  onToggleViewport?: () => void;
}

export default function TopBar({ activePage, onNavigate, onMenuToggle, mobileMenuOpen, darkMode, onToggleDark, viewportMode, onToggleViewport }: Props) {
  const { t, lang, toggle } = useLang();
  const { isDemo } = useMode();
  const pageInfo = PAGE_TITLES[activePage] ?? PAGE_TITLES.overview;

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex-shrink-0 h-14 flex items-center px-3 sm:px-5 gap-2 sm:gap-3 transition-colors">

      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuToggle}
        aria-label={lang === 'ar' ? 'فتح القائمة' : 'Open menu'}
        aria-expanded={mobileMenuOpen ?? false}
        aria-controls="sidebar-nav"
        className="lg:hidden w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 transition-all flex-shrink-0"
      >
        <Icons.menu size={18} />
      </button>

      {/* Page title */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <h2 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm tracking-tight truncate">
          {lang === 'ar' ? pageInfo.ar : pageInfo.en}
        </h2>
        <span className="hidden sm:flex items-center text-xs text-slate-400 gap-1.5">
          <span className="text-slate-200 dark:text-slate-600">/</span>
          <span className="font-medium">{lang === 'ar' ? 'مارس 2026' : 'March 2026'}</span>
        </span>
        {/* Demo mode badge */}
        {isDemo && (
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-extrabold tracking-widest border border-amber-200 ms-1">
            {t.demo.badge}
          </span>
        )}
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-1.5 flex-shrink-0">

        {/* Notifications → inbox */}
        <button
          onClick={() => onNavigate('inbox')}
          aria-label={lang === 'ar' ? 'صندوق الوارد' : 'Inbox'}
          className="relative w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all"
        >
          <Icons.inbox size={16} />
          {activePage !== 'inbox' && (
            <span className="absolute top-1 end-1 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-slate-800 animate-pulse" />
          )}
        </button>

        {/* ── Viewport Switcher (hidden on mobile — only useful on desktop) ── */}
        <div className="hidden lg:flex items-center gap-0.5 bg-slate-100 dark:bg-slate-700 rounded-xl p-0.5">
          <button
            onClick={() => onToggleViewport?.()}
            title={lang === 'ar' ? 'عرض سطح المكتب' : 'Desktop view'}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
              viewportMode !== 'mobile'
                ? 'bg-white dark:bg-slate-600 text-blue-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <Icons.monitor size={14} />
          </button>
          <button
            onClick={() => onToggleViewport?.()}
            title={lang === 'ar' ? 'عرض الجوال' : 'Mobile view'}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
              viewportMode === 'mobile'
                ? 'bg-white dark:bg-slate-600 text-blue-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <Icons.smartphone size={13} />
          </button>
        </div>

        {/* ── Night Mode Toggle ── */}
        <button
          onClick={onToggleDark}
          title={darkMode ? (lang === 'ar' ? 'الوضع الفاتح' : 'Light mode') : (lang === 'ar' ? 'الوضع الداكن' : 'Dark mode')}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-600 transition-all"
        >
          {darkMode ? <Icons.sun size={15} /> : <Icons.moon size={15} />}
        </button>

        {/* Quick-add */}
        <button onClick={() => onNavigate('properties')}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-600 transition-all border border-slate-100 dark:border-slate-600">
          <Icons.plus size={13} />
          {lang === 'ar' ? 'إضافة وحدة' : 'Add Unit'}
        </button>

        {/* ── Language Toggle (prominent, in header) ── */}
        <button
          onClick={toggle}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all border border-slate-200 dark:border-slate-600 hover:border-slate-400 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 shadow-sm"
          aria-label={lang === 'en' ? 'Switch to Arabic' : 'Switch to English'}
        >
          <Icons.globe size={14} className="text-slate-500 dark:text-slate-400" />
          <span>{lang === 'en' ? 'عربي' : 'EN'}</span>
        </button>

        {/* Avatar → settings */}
        <button
          onClick={() => onNavigate('settings')}
          className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs text-white flex-shrink-0 hover:opacity-80 transition-opacity"
          style={{ background: 'linear-gradient(135deg,#7C3AED,#6366F1)' }}
          title={lang === 'ar' ? 'الإعدادات' : 'Settings'}
          aria-label={lang === 'ar' ? 'إعدادات الحساب' : 'Account settings'}
        >
          {OWNER.fullName.charAt(0)}
        </button>
      </div>
    </header>
  );
}
