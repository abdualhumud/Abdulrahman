'use client';

import { useLang } from '@/lib/language-context';

/**
 * Shown at the top of every page in demo/sandbox mode.
 * Communicates clearly that this is an ephemeral environment.
 */
export default function DemoBanner() {
  const { t, lang } = useLang();
  const d = t.demo;

  // basePath-aware production URL
  const prodUrl = typeof window !== 'undefined'
    ? window.location.origin + '/Abdulrahman/'
    : '/Abdulrahman/';

  return (
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className="flex items-center justify-between gap-3 px-5 py-2 bg-amber-500 text-white text-xs font-semibold flex-shrink-0"
      style={{ minHeight: 36 }}
    >
      {/* Left: icon + label */}
      <div className="flex items-center gap-2">
        {/* Flask icon */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 3h6M9 3v8L4.5 19A2 2 0 0 0 6.33 22h11.34a2 2 0 0 0 1.83-3L15 11V3" />
        </svg>
        <span className="font-extrabold tracking-wide">{d.badge}</span>
        <span className="hidden sm:inline font-medium opacity-90">— {d.banner}</span>
        <span className="hidden md:inline opacity-75">· {d.bannerSub}</span>
      </div>

      {/* Right: link to production */}
      <a
        href={prodUrl}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 transition-colors whitespace-nowrap font-bold"
      >
        {d.tryProd}
      </a>
    </div>
  );
}
