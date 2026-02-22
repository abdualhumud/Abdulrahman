'use client';

import { Icons } from '@/lib/icons';
import { OWNER } from '@/lib/mock-data';
import { useLang } from '@/lib/language-context';

const PAGE_TITLES: Record<string, { en: string; ar: string; icon: keyof typeof import('@/lib/icons').Icons }> = {
  overview:    { en: 'Overview',            ar: 'نظرة عامة'         , icon: 'overview'    },
  calendar:    { en: 'Master Calendar',     ar: 'التقويم الرئيسي'   , icon: 'calendar'    },
  bookings:    { en: 'Bookings',            ar: 'الحجوزات'           , icon: 'bookings'    },
  channels:    { en: 'Channel Manager',     ar: 'مدير القنوات'       , icon: 'channels'    },
  cleaning:    { en: 'Cleaning & Housekeeping', ar: 'التنظيف والتدبير', icon: 'cleaning'   },
  inbox:       { en: 'Inbox',              ar: 'صندوق الوارد'       , icon: 'inbox'       },
  analytics:   { en: 'Analytics',          ar: 'التحليلات'          , icon: 'analytics'   },
  financials:  { en: 'Financials',         ar: 'المالية'            , icon: 'financials'  },
  properties:  { en: 'Properties & Units', ar: 'العقارات والوحدات'  , icon: 'properties'  },
};

interface Props {
  activePage: string;
  onNavigate: (p: string) => void;
}

export default function TopBar({ activePage, onNavigate }: Props) {
  const { t, lang, toggle } = useLang();
  const pageInfo = PAGE_TITLES[activePage] ?? PAGE_TITLES.overview;

  return (
    <header className="bg-white border-b border-slate-100 flex-shrink-0 h-14 flex items-center px-5 gap-4">

      {/* Page title */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <h2 className="font-extrabold text-slate-900 text-sm tracking-tight truncate">
          {lang === 'ar' ? pageInfo.ar : pageInfo.en}
        </h2>
        <span className="hidden sm:flex items-center text-xs text-slate-400 gap-1.5">
          <span className="text-slate-200">/</span>
          <span className="font-medium">{lang === 'ar' ? 'فبراير 2026' : 'February 2026'}</span>
        </span>
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-2 flex-shrink-0">

        {/* Notifications dot */}
        <button className="relative w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
          <Icons.inbox size={16} />
          <span className="absolute top-1 end-1 w-2 h-2 bg-red-500 rounded-full border border-white" />
        </button>

        {/* Quick-add */}
        <button onClick={() => onNavigate('properties')}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 text-slate-600 text-xs font-bold hover:bg-slate-100 transition-all border border-slate-100">
          <Icons.plus size={13} />
          {lang === 'ar' ? 'إضافة وحدة' : 'Add Unit'}
        </button>

        {/* ── Language Toggle (prominent, in header) ── */}
        <button
          onClick={toggle}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all border border-slate-200 hover:border-slate-400 bg-white text-slate-700 hover:bg-slate-50 shadow-sm"
          title={lang === 'en' ? 'Switch to Arabic' : 'Switch to English'}
        >
          <Icons.globe size={14} className="text-slate-500" />
          <span>{lang === 'en' ? 'عربي' : 'EN'}</span>
        </button>

        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs text-white flex-shrink-0 cursor-pointer"
          style={{ background: 'linear-gradient(135deg,#7C3AED,#6366F1)' }}
          title={OWNER.fullName}>
          {OWNER.fullName.charAt(0)}
        </div>
      </div>
    </header>
  );
}
