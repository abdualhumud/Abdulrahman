'use client';

import { useLang } from '@/lib/language-context';
import { type StagingUser } from '@/lib/staging-auth';

interface Props {
  user: StagingUser | null;
  onLogout: () => void;
}

/**
 * Violet banner shown at the top of every page in staging/trial mode.
 * Communicates the isolated nature of the environment and shows the active user.
 */
export default function StagingBanner({ user, onLogout }: Props) {
  const { t, lang } = useLang();
  const s = t.staging;

  const prodUrl = typeof window !== 'undefined'
    ? window.location.origin + '/REMS/'
    : '/REMS/';

  return (
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className="flex items-center justify-between gap-3 px-5 py-2 text-white text-xs font-semibold flex-shrink-0"
      style={{ background: 'linear-gradient(90deg,#7C3AED,#6366F1)', minHeight: 36 }}
    >
      {/* Left: icon + label */}
      <div className="flex items-center gap-2">
        {/* Beaker icon */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.5 3h15M6 3v10l-3.5 7A2 2 0 0 0 4.17 23h15.67a2 2 0 0 0 1.67-3L18 13V3" />
          <line x1="8" y1="13" x2="16" y2="13" />
        </svg>
        <span className="font-extrabold tracking-wide">{s.badge}</span>
        <span className="hidden sm:inline font-medium opacity-90">— {s.banner}</span>
        {user && (
          <span className="hidden md:inline opacity-75">· {s.welcome} {user.name}</span>
        )}
      </div>

      {/* Right: prod link + logout */}
      <div className="flex items-center gap-2">
        <a
          href={prodUrl}
          className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 transition-colors whitespace-nowrap font-bold text-[11px]"
        >
          {s.switchProd}
        </a>
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/30 transition-colors whitespace-nowrap font-bold text-[11px]"
        >
          {s.logoutBtn}
        </button>
      </div>
    </div>
  );
}
