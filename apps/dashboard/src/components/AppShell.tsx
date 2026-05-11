'use client';

/**
 * AppShell — shared application core used by all three dashboard environments:
 *   /            → production  (envMode='production')
 *   /demo/       → demo/sandbox (envMode='demo')
 *   /staging/    → staging/trial (envMode='staging')
 *
 * Reads envMode from ModeContext to determine:
 *  - Demo:     onboarding pre-skipped, mock data, session storage
 *  - Staging:  login/register gate → per-user isolated localStorage
 *  - Production: strict mandatory onboarding (CR, VAT, profile, payment)
 */

import { useState, useEffect } from 'react';
import { useJourney }    from '@/lib/journey-context';
import { useMode }       from '@/lib/mode-context';
import { useLang }       from '@/lib/language-context';
import { Icons }         from '@/lib/icons';
import {
  getStagingSession, loginStagingUser, registerStagingUser, logoutStagingUser,
  stagingOnboardingKey, stagingUnitsKey, type StagingUser,
} from '@/lib/staging-auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  loginUser, registerUser, logoutUser, getCurrentAuthUser, onAuthStateChange,
  completeOnboarding as dbCompleteOnboarding, type AuthUser,
} from '@/lib/db/auth-service';
import { getUnitCount } from '@/lib/db/units-service';
import Sidebar        from '@/components/layout/Sidebar';
import TopBar         from '@/components/layout/TopBar';
import DemoBanner     from '@/components/layout/DemoBanner';
import StagingBanner  from '@/components/layout/StagingBanner';
import JourneyBanner  from '@/components/layout/JourneyBanner';
import OnboardingPage from '@/components/dashboard/OnboardingPage';
import OverviewPage   from '@/components/dashboard/OverviewPage';
import BookingsPage   from '@/components/dashboard/BookingsPage';
import CalendarPage   from '@/components/dashboard/CalendarPage';
import ChannelsPage   from '@/components/dashboard/ChannelsPage';
import CleaningPage   from '@/components/dashboard/CleaningPage';
import InboxPage      from '@/components/dashboard/InboxPage';
import AnalyticsPage  from '@/components/dashboard/AnalyticsPage';
import FinancialsPage from '@/components/dashboard/FinancialsPage';
import PropertiesPage from '@/components/dashboard/PropertiesPage';
import SettingsPage   from '@/components/dashboard/SettingsPage';
// import ShipmentsPage  from '@/components/dashboard/ShipmentsPage'; // DORMANT — scheduled for future release

type Page =
  | 'overview' | 'properties' | 'bookings' | 'calendar'
  | 'channels'  | 'cleaning'   | 'inbox'    | 'analytics'
  | 'financials' | 'settings'; // | 'shipments'; // DORMANT

const ONBOARDING_KEY_PROD = 'rems-onboarding-done';
const ONBOARDING_KEY_DEMO = 'rems-onboarding-done-demo';

const INPUT =
  'w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-slate-300 dark:placeholder-slate-500';

/* ──────────────────────────────────────────────────────────────
   StagingEmptyGate — shown on data pages when user has no units.
   Prevents mock "Chalet 1 / Riyadh Apt" demo data from appearing
   in a freshly registered staging/production account.
   ────────────────────────────────────────────────────────────── */
function StagingEmptyGate({ onNavigate, lang }: { onNavigate: (p: string) => void; lang: string }) {
  const isAr = lang === 'ar';
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] p-8 text-center">
      <div className="w-16 h-16 rounded-3xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-5">
        <Icons.properties size={28} className="text-violet-500" />
      </div>
      <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mb-2">
        {isAr ? 'لم تتم إضافة أي وحدة بعد' : 'No properties added yet'}
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
        {isAr
          ? 'أضف وحدتك الأولى لتبدأ في عرض الحجوزات والتقارير والقنوات.'
          : 'Add your first property to start seeing bookings, reports, and channel data.'}
      </p>
      <button onClick={() => onNavigate('properties')} className="btn-primary">
        <Icons.properties size={16} />
        {isAr ? 'إضافة وحدة' : 'Add a Property'}
      </button>
    </div>
  );
}

/** Pages that require at least one unit before showing real data. */
const DATA_PAGES: string[] = ['overview', 'bookings', 'calendar', 'analytics', 'financials', 'cleaning'];

/**
 * Maps a Supabase AuthUser to the StagingUser shape used by the local session system.
 * The `passwordHash` field is left empty — it exists only in the localStorage auth path.
 */
function toStagingShape(user: AuthUser): StagingUser {
  return {
    id:           user.id,
    email:        user.email,
    passwordHash: '',          // N/A for Supabase — password lives in auth.users
    name:         user.fullName,
    companyName:  user.companyName,
    createdAt:    new Date().toISOString(),
    plan:         user.plan,
    promoCode:    user.promoCode,
  };
}

/* ──────────────────────────────────────────────────────────────
   StagingAuthGate — shown before the main app in staging mode
   ────────────────────────────────────────────────────────────── */
function StagingAuthGate({ onAuthenticated }: { onAuthenticated: (user: StagingUser) => void }) {
  const { t, lang, toggle } = useLang();
  const { envMode } = useMode();
  const s = t.staging;
  const a = t.auth;
  const isProd = envMode === 'production';

  // Production vs Staging copy. Staging keeps the existing "trial" wording.
  const titleLogin    = isProd ? a.prodLoginTitle    : s.loginTitle;
  const titleRegister = isProd ? a.prodRegisterTitle : s.registerTitle;
  const subtitleLogin    = isProd ? a.prodLoginSubtitle    : '';
  const subtitleRegister = isProd ? a.prodRegisterSubtitle : '';
  const loginCta    = isProd ? a.prodLoginCta    : s.loginBtn;
  const registerCta = isProd ? a.prodRegisterCta : s.registerBtn;
  // Switcher links: "Don't have an account? Register" / "Already have an account? Sign in"
  const switchToRegister = isProd
    ? `${a.prodNoAccount} ${a.prodRegisterCta}`
    : s.registerLink;
  const switchToLogin = isProd
    ? `${a.prodHaveAccount} ${a.prodLoginCta}`
    : s.loginLink;

  const [mode,          setMode]         = useState<'login' | 'register'>('login');
  const [email,         setEmail]        = useState('');
  const [password,      setPassword]     = useState('');
  const [showPassword,  setShowPassword] = useState(false);
  const [name,          setName]         = useState('');
  const [company,       setCompany]      = useState('');
  const [error,         setError]        = useState('');
  const [loading,       setLoading]      = useState(false);
  const [pendingEmail,  setPendingEmail] = useState('');   // set when email confirmation needed
  const [darkMode,      setDarkMode]     = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('rems-dark-mode') === '1';
  });

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('rems-dark-mode', '1');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.removeItem('rems-dark-mode');
    }
  };

  const handleLogin = async () => {
    setError(''); setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    if (isSupabaseConfigured()) {
      // Supabase path — credentials verified server-side via Postgres auth.users
      const result = await loginUser(email, password);
      setLoading(false);
      if (!result.ok) { setError(s.errorInvalid); return; }
      onAuthenticated(toStagingShape(result.user));
    } else {
      // localStorage fallback — SHA-256 hashed comparison against stored users
      const user = await loginStagingUser(email, password);
      setLoading(false);
      if (!user) { setError(s.errorInvalid); return; }
      onAuthenticated(user);
    }
  };

  const handleRegister = async () => {
    setError('');
    if (!email.includes('@'))    { setError(s.errorEmail);    return; }
    if (password.length < 6)     { setError(s.errorPassword); return; }
    if (!name.trim())            { setError(s.errorName);     return; }
    if (!company.trim())         { setError(s.errorCompany);  return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    if (isSupabaseConfigured()) {
      // Pass current URL as emailRedirectTo so confirmation links resolve correctly
      // on all hosts (localhost, GitHub Pages, Vercel) — no hardcoded URL needed.
      const redirectTo = typeof window !== 'undefined'
        ? window.location.href.split('#')[0]
        : undefined;
      const result = await registerUser(email, password, name, company, 'Pro', '', redirectTo);
      setLoading(false);
      if (!result.ok) {
        setError(result.error === 'RATE_LIMIT' ? s.errorRateLimit : result.error);
        return;
      }
      if (result.pendingVerification) {
        // Email confirmation required — show "check inbox" screen
        setPendingEmail(email);
        return;
      }
      onAuthenticated(toStagingShape(result.user));
    } else {
      // localStorage fallback — SHA-256 hashed password, per-user isolated keys
      const result = await registerStagingUser(email, password, name, company, 'Pro', '');
      setLoading(false);
      if (!result.ok) { setError(result.error); return; }
      onAuthenticated(result.user);
    }
  };

  /* ── Pending email confirmation screen ── */
  if (pendingEmail) {
    return (
      <div
        className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-6"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        <div className="relative w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#6366F1)' }}>
            ✉️
          </div>
          <h2 className="text-2xl font-extrabold text-white mb-2">{s.confirmTitle}</h2>
          <p className="text-slate-400 text-sm mb-1">{s.confirmText}</p>
          <p className="text-violet-300 font-bold text-sm mb-4 break-all">{pendingEmail}</p>
          <p className="text-slate-500 text-xs mb-8">{s.confirmSub}</p>
          <button
            onClick={() => { setPendingEmail(''); setMode('login'); setEmail(pendingEmail); }}
            className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all border border-white/20"
          >
            {s.confirmBack}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-6"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="absolute top-0 start-0 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 end-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Top controls: lang toggle + dark mode toggle */}
        <div className="flex justify-between mb-4">
          <button
            onClick={toggleDark}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/20"
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode
              ? <Icons.sun size={14} />
              : <Icons.moon size={14} />
            }
            {darkMode ? (lang === 'ar' ? 'فاتح' : 'Light') : (lang === 'ar' ? 'داكن' : 'Dark')}
          </button>
          <button onClick={toggle}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/20">
            {lang === 'ar' ? 'English' : 'عربي'}
          </button>
        </div>

        {/* Logo + environment badge */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-xl text-white mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#6366F1)' }}>R</div>
          {/* Staging shows TRIAL badge; production is unbranded. */}
          {!isProd && (
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="px-2 py-0.5 bg-violet-500/20 border border-violet-500/40 text-violet-300 text-xs font-bold rounded-full">
                {s.badge}
              </span>
            </div>
          )}
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            {mode === 'login' ? titleLogin : titleRegister}
          </h1>
          {isProd && (
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              {mode === 'login' ? subtitleLogin : subtitleRegister}
            </p>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-2xl space-y-4 border border-transparent dark:border-slate-700">
          {mode === 'register' && (
            <>
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">{s.registerName}</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder={lang === 'ar' ? 'عبدالرحمن الرشيدي' : 'Abdulrahman Al-Rashidi'}
                  className={INPUT} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">{s.registerCompany}</label>
                <input value={company} onChange={e => setCompany(e.target.value)} placeholder={lang === 'ar' ? 'شركة التطوير العقاري' : 'Al-Rashidi Properties LLC'}
                  className={INPUT} />
              </div>
            </>
          )}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">{s.loginEmail}</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="owner@example.com"
              className={INPUT} style={{ direction: 'ltr' }} />
          </div>
          {/* Password with eye toggle */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">{s.loginPassword}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className={INPUT + ' pe-10'}
                style={{ direction: 'ltr' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute inset-y-0 end-0 pe-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <Icons.eyeOff size={16} /> : <Icons.eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500 font-semibold bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">{error}</p>
          )}

          <button
            onClick={mode === 'login' ? handleLogin : handleRegister}
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 shadow-lg disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#6366F1)' }}
          >
            {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {mode === 'login' ? loginCta : registerCta}
          </button>

          <button onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); }}
            className="w-full text-center text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors py-1">
            {mode === 'login' ? switchToRegister : switchToLogin}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   AppShell — main application shell
   ────────────────────────────────────────────────────────────── */
export default function AppShell() {
  const { envMode, isDemo, isStaging } = useMode();
  const { markDone } = useJourney();

  const [activePage,      setActivePage]      = useState<Page>('overview');
  const [showOnboarding,  setShowOnboarding]  = useState(false);
  const [stagingUser,     setStagingUser]     = useState<StagingUser | null>(null);
  const [stagingChecked,  setStagingChecked]  = useState(false);
  const [mobileMenuOpen,  setMobileMenuOpen]  = useState(false);
  /**
   * hasUnits — tracks whether the current user has at least one property.
   *   null  = not yet checked (loading)
   *   true  = user has ≥1 unit → show real pages
   *   false = user has 0 units → show StagingEmptyGate on data pages
   * Re-checked when activePage changes to a data page (picks up newly added units).
   */
  const [hasUnits, setHasUnits] = useState<boolean | null>(null);
  const { lang } = useLang();

  /* ── Dark mode (persisted in localStorage) ── */
  const [darkMode, setDarkMode] = useState(false);

  /* ── Viewport simulator (Demo only — disabled in Staging/Production) ── */
  const [viewportMode, setViewportMode] = useState<'desktop' | 'mobile'>('desktop');
  // Always force desktop in non-demo environments
  const effectiveViewportMode = isDemo ? viewportMode : 'desktop';

  /* Sync darkMode pref with html class and localStorage */
  useEffect(() => {
    const stored = typeof window !== 'undefined'
      ? localStorage.getItem('rems-dark-mode') === '1'
      : false;
    setDarkMode(stored);
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('rems-dark-mode', '1');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.removeItem('rems-dark-mode');
    }
  }, [darkMode]);

  useEffect(() => {
    if (isDemo) {
      // Demo: pre-skip onboarding, use mock data — no DB needed
      if (!localStorage.getItem(ONBOARDING_KEY_DEMO)) {
        localStorage.setItem(ONBOARDING_KEY_DEMO, '1');
        markDone(1); markDone(2); markDone(3); markDone(4);
      }
      setShowOnboarding(false);
      // Demo must bypass the session-check spinner even when Supabase env is set
      setStagingChecked(true);
    } else if (isSupabaseConfigured()) {
      // Supabase auth — works across all devices / browsers
      getCurrentAuthUser().then(user => {
        if (user) {
          setStagingUser({ id: user.id, email: user.email, name: user.fullName, companyName: user.companyName } as unknown as StagingUser);
          if (!user.onboardingDone) setShowOnboarding(true);
          // Check unit count so StagingEmptyGate shows correctly
          getUnitCount().then(n => setHasUnits(n > 0));
        } else {
          // Not signed in — show auth gate (handled below via stagingUser === null)
          setHasUnits(null);
        }
        setStagingChecked(true);
      });
      // Listen for sign-in / sign-out events
      const unsub = onAuthStateChange(user => {
        if (!user) { setStagingUser(null); setHasUnits(null); setStagingChecked(true); return; }
        setStagingUser({ id: user.id, email: user.email, name: user.fullName, companyName: user.companyName } as unknown as StagingUser);
        if (!user.onboardingDone) setShowOnboarding(true);
        getUnitCount().then(n => setHasUnits(n > 0));
      });
      return unsub;
    } else if (isStaging) {
      // Fallback: localStorage-backed staging auth (no Supabase keys yet)
      const existing = getStagingSession();
      if (existing) {
        setStagingUser(existing);
        const done = localStorage.getItem(stagingOnboardingKey(existing.id));
        if (!done) setShowOnboarding(true);
      }
      setStagingChecked(true);
    } else {
      // Production without Supabase: localStorage gate
      const done = localStorage.getItem(ONBOARDING_KEY_PROD);
      if (!done) setShowOnboarding(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envMode]);

  // Re-check unit count when navigating to a data page after Supabase auth.
  // `hasUnits === true` short-circuits to avoid redundant Supabase calls once confirmed.
  useEffect(() => {
    if (!isSupabaseConfigured() || !stagingUser || isDemo || hasUnits === true) return;
    if (!DATA_PAGES.includes(activePage)) return;
    // Timeout guard: if Supabase doesn't respond in 10 s, treat as no units (shows empty gate)
    const timer = setTimeout(() => setHasUnits(prev => prev === null ? false : prev), 10_000);
    getUnitCount().then(n => { clearTimeout(timer); setHasUnits(n > 0); });
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage, stagingUser]);

  const handleStagingAuthenticated = (user: StagingUser) => {
    setStagingUser(user);
    if (isSupabaseConfigured()) {
      // Supabase path: onboarding_done lives in profiles table.
      // The onAuthStateChange listener fires shortly after login/register
      // and already calls setShowOnboarding(true) when needed — no localStorage
      // check here, because Supabase UUIDs have no corresponding local key.
    } else {
      const done = localStorage.getItem(stagingOnboardingKey(user.id));
      if (!done) setShowOnboarding(true);
    }
  };

  const completeOnboarding = (plan?: string, promoCode?: string) => {
    if (isSupabaseConfigured() && stagingUser) {
      // Mark onboarding done in Supabase
      dbCompleteOnboarding(stagingUser.id).catch(() => {/* non-fatal */});
    } else if (isStaging && stagingUser) {
      localStorage.setItem(stagingOnboardingKey(stagingUser.id), '1');
    } else {
      localStorage.setItem(ONBOARDING_KEY_PROD, '1');
    }
    markDone(1);
    setShowOnboarding(false);
    setActivePage('properties');
  };

  const handleStagingLogout = () => {
    if (isSupabaseConfigured()) {
      logoutUser().catch(() => {/* non-fatal */});
    } else {
      logoutStagingUser();
    }
    setStagingUser(null);
    setShowOnboarding(false);
    setActivePage('overview');
  };

  const navigate = (p: string) => {
    setActivePage(p as Page);
    setMobileMenuOpen(false); // always close drawer on navigation
  };

  const handleCheckoutCleaning = (_unit: string, _bookingId: string) => {
    setActivePage('cleaning');
  };

  const renderPage = () => {
    // Empty-state gate: block data pages when user has not yet added any unit.
    // Prevents mock demo data ("Chalet 1", "Riyadh Apt") from appearing in a
    // fresh production/staging account.
    if (!isDemo && stagingUser && DATA_PAGES.includes(activePage)) {
      if (isSupabaseConfigured()) {
        // Supabase path: use async-populated hasUnits state.
        if (hasUnits === null) {
          // Still checking — show a subtle spinner instead of stale mock data.
          return (
            <div className="flex items-center justify-center h-64">
              <span className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
            </div>
          );
        }
        if (!hasUnits) return <StagingEmptyGate onNavigate={navigate} lang={lang} />;
      } else {
        // localStorage staging path: check per-user key synchronously.
        try {
          const raw   = localStorage.getItem(stagingUnitsKey(stagingUser.id));
          const units = raw ? JSON.parse(raw) : [];
          if (!Array.isArray(units) || units.length === 0) {
            return <StagingEmptyGate onNavigate={navigate} lang={lang} />;
          }
        } catch { /* fall through on parse error */ }
      }
    }

    switch (activePage) {
      case 'overview':    return <OverviewPage onNavigate={navigate} />;
      case 'properties':  return <PropertiesPage onNavigate={navigate} />;
      case 'bookings':    return <BookingsPage onCheckoutCleaning={handleCheckoutCleaning} />;
      case 'calendar':    return <CalendarPage onNavigate={navigate} />;
      case 'channels':    return <ChannelsPage />;
      case 'cleaning':    return <CleaningPage />;
      case 'inbox':       return <InboxPage onNavigate={navigate} />;
      case 'analytics':   return <AnalyticsPage />;
      case 'financials':  return <FinancialsPage />;
      case 'settings':    return <SettingsPage />;
      // case 'shipments':   return <ShipmentsPage />; // DORMANT — scheduled for future release
      default:            return <OverviewPage onNavigate={navigate} />;
    }
  };

  // Show spinner while async session check is in flight.
  // Applies to: staging (localStorage or Supabase) and production with Supabase.
  // Demo always bypasses session check (pre-loaded mock data, no auth).
  // Pure production (no Supabase) uses a synchronous localStorage check — no spinner needed.
  const needsSessionCheck = !isDemo && (isStaging || isSupabaseConfigured());
  if (needsSessionCheck && !stagingChecked) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show auth gate when session check is done but no user is signed in.
  // Applies to staging and to any mode where Supabase is the auth layer.
  if (needsSessionCheck && stagingChecked && !stagingUser) {
    return <StagingAuthGate onAuthenticated={handleStagingAuthenticated} />;
  }

  // Onboarding gate (production or staging first-time)
  if (showOnboarding) {
    // Pre-fill Step 2 with name/email captured at signup so the user
    // doesn't need to re-type the same credentials they just used.
    return (
      <OnboardingPage
        onComplete={completeOnboarding}
        strictMode={true}
        showPayment={true}
        initialName={stagingUser?.name ?? ''}
        initialEmail={stagingUser?.email ?? ''}
      />
    );
  }

  /* ── Bottom navigation items (mobile only) ── */
  const BOTTOM_NAV: Array<{
    id: Page;
    Icon: (p: { size?: number; className?: string }) => React.JSX.Element;
    labelEn: string;
    labelAr: string;
    badge?: number;
  }> = [
    { id: 'overview',   Icon: Icons.overview,   labelEn: 'Home',       labelAr: 'الرئيسية' },
    { id: 'bookings',   Icon: Icons.bookings,   labelEn: 'Bookings',   labelAr: 'الحجوزات', badge: 1 },
    { id: 'inbox',      Icon: Icons.inbox,      labelEn: 'Inbox',      labelAr: 'الرسائل',  badge: 2 },
    { id: 'cleaning',   Icon: Icons.cleaning,   labelEn: 'Cleaning',   labelAr: 'التنظيف' },
    { id: 'properties', Icon: Icons.properties, labelEn: 'Properties', labelAr: 'الأملاك' },
  ];

  /* ── Shared bottom nav renderer ── */
  const renderBottomNav = (insideFrame = false) => (
    <nav
      className={`bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 transition-colors ${
        insideFrame ? 'flex-shrink-0' : 'lg:hidden fixed bottom-0 inset-x-0 z-30'
      }`}
      style={insideFrame ? {} : { paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-stretch justify-around h-14 px-1">
        {BOTTOM_NAV.map(({ id, Icon, labelEn, labelAr, badge }) => {
          const active = activePage === id;
          const label  = lang === 'ar' ? labelAr : labelEn;
          return (
            <button
              key={id}
              onClick={() => navigate(id)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all mx-0.5 my-1 relative
                ${active ? 'text-blue-600' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}
              style={{ minHeight: 44 }}
            >
              {active && (
                <span className="absolute top-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-blue-600 rounded-full" />
              )}
              <span className="relative">
                <Icon size={20} />
                {badge && !active && (
                  <span className="absolute -top-1 -end-1.5 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center leading-none">
                    {badge}
                  </span>
                )}
              </span>
              <span className="text-[9px] font-semibold leading-none">{label}</span>
            </button>
          );
        })}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all mx-0.5 my-1 text-slate-400 dark:text-slate-500 hover:text-slate-600"
          style={{ minHeight: 44 }}
        >
          <Icons.menu size={20} />
          <span className="text-[9px] font-semibold leading-none">{lang === 'ar' ? 'المزيد' : 'More'}</span>
        </button>
      </div>
    </nav>
  );

  /* ── Mobile phone-frame viewport (Demo only) ── */
  if (effectiveViewportMode === 'mobile') {
    return (
      <div className="flex h-screen overflow-hidden bg-slate-700 dark:bg-slate-950 transition-colors">
        {/* TopBar visible above the frame for viewport controls */}
        <div className="absolute top-0 inset-x-0 z-50 bg-slate-800 dark:bg-slate-950 border-b border-slate-700">
          <TopBar
            activePage={activePage}
            onNavigate={navigate}
            onMenuToggle={() => setMobileMenuOpen(v => !v)}
            mobileMenuOpen={mobileMenuOpen}
            darkMode={darkMode}
            onToggleDark={() => setDarkMode(v => !v)}
            viewportMode={effectiveViewportMode}
            onToggleViewport={isDemo ? () => setViewportMode(v => v === 'desktop' ? 'mobile' : 'desktop') : undefined}
          />
        </div>

        {/* Centred phone frame */}
        <div className="viewport-phone-outer" style={{ paddingTop: 64 }}>
          <div className="viewport-phone-frame">
            {/* Dynamic Island */}
            <div className="viewport-phone-island">
              <div style={{ width: 120, height: 30, background: '#111', borderRadius: 15, border: '1px solid #222' }} />
            </div>

            {/* Screen */}
            <div className="viewport-phone-screen">
              {isDemo    && <DemoBanner />}
              {isStaging && <StagingBanner onLogout={handleStagingLogout} user={stagingUser} />}
              {!isDemo && !isStaging && <JourneyBanner onNavigate={navigate} />}
              <main className="flex-1 overflow-auto" style={{ paddingBottom: 0 }}>{renderPage()}</main>
              {/* Bottom nav inside the frame */}
              {renderBottomNav(true)}
            </div>

            {/* Home indicator */}
            <div className="viewport-phone-home">
              <div style={{ width: 112, height: 4, background: 'rgba(255,255,255,0.25)', borderRadius: 2 }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Standard desktop layout ── */
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden transition-colors">
      <Sidebar
        activePage={activePage}
        onNavigate={navigate}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          activePage={activePage}
          onNavigate={navigate}
          onMenuToggle={() => setMobileMenuOpen(v => !v)}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode(v => !v)}
          viewportMode={effectiveViewportMode}
          onToggleViewport={isDemo ? () => setViewportMode(v => v === 'desktop' ? 'mobile' : 'desktop') : undefined}
        />
        {isDemo    && <DemoBanner />}
        {isStaging && <StagingBanner onLogout={handleStagingLogout} user={stagingUser} />}
        {!isDemo && !isStaging && <JourneyBanner onNavigate={navigate} />}

        <main className="flex-1 overflow-auto lg:pb-0 bottom-nav-spacing">{renderPage()}</main>
      </div>

      {/* Bottom nav — fixed, small screens only */}
      {renderBottomNav(false)}
    </div>
  );
}
