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
  stagingOnboardingKey, type StagingUser,
} from '@/lib/staging-auth';
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
import ShipmentsPage  from '@/components/dashboard/ShipmentsPage';

type Page =
  | 'overview' | 'properties' | 'bookings' | 'calendar'
  | 'channels'  | 'cleaning'   | 'inbox'    | 'analytics'
  | 'financials' | 'settings'  | 'shipments';

const ONBOARDING_KEY_PROD = 'rems-onboarding-done';
const ONBOARDING_KEY_DEMO = 'rems-onboarding-done-demo';

const INPUT =
  'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-slate-300';

/* ──────────────────────────────────────────────────────────────
   StagingAuthGate — shown before the main app in staging mode
   ────────────────────────────────────────────────────────────── */
function StagingAuthGate({ onAuthenticated }: { onAuthenticated: (user: StagingUser) => void }) {
  const { t, lang, toggle } = useLang();
  const s = t.staging;

  const [mode,          setMode]         = useState<'login' | 'register'>('login');
  const [email,         setEmail]        = useState('');
  const [password,      setPassword]     = useState('');
  const [showPassword,  setShowPassword] = useState(false);
  const [name,          setName]         = useState('');
  const [company,       setCompany]      = useState('');
  const [error,         setError]        = useState('');
  const [loading,       setLoading]      = useState(false);

  const handleLogin = async () => {
    setError(''); setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const user = loginStagingUser(email, password);
    setLoading(false);
    if (!user) { setError(s.errorInvalid); return; }
    onAuthenticated(user);
  };

  const handleRegister = async () => {
    setError('');
    if (!email.includes('@'))    { setError(s.errorEmail);    return; }
    if (password.length < 6)     { setError(s.errorPassword); return; }
    if (!name.trim())            { setError(s.errorName);     return; }
    if (!company.trim())         { setError(s.errorCompany);  return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const result = registerStagingUser(email, password, name, company, 'Pro', '');
    setLoading(false);
    if (!result.ok) { setError(result.error); return; }
    // New staging user gets onboarding
    onAuthenticated(result.user);
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-6"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="absolute top-0 start-0 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 end-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Lang toggle */}
        <div className="flex justify-end mb-4">
          <button onClick={toggle}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/20">
            {lang === 'ar' ? 'English' : 'عربي'}
          </button>
        </div>

        {/* Logo + environment badge */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-xl text-white mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#6366F1)' }}>R</div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-violet-500/20 border border-violet-500/40 text-violet-300 text-xs font-bold rounded-full">
              {s.badge}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            {mode === 'login' ? s.loginTitle : s.registerTitle}
          </h1>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-2xl space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">{s.registerName}</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder={lang === 'ar' ? 'عبدالرحمن الرشيدي' : 'Abdulrahman Al-Rashidi'}
                  className={INPUT} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">{s.registerCompany}</label>
                <input value={company} onChange={e => setCompany(e.target.value)} placeholder={lang === 'ar' ? 'شركة التطوير العقاري' : 'Al-Rashidi Properties LLC'}
                  className={INPUT} />
              </div>
            </>
          )}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">{s.loginEmail}</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="owner@example.com"
              className={INPUT} style={{ direction: 'ltr' }} />
          </div>
          {/* Password with eye toggle */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">{s.loginPassword}</label>
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
                className="absolute inset-y-0 end-0 pe-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <Icons.eyeOff size={16} /> : <Icons.eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500 font-semibold bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}

          <button
            onClick={mode === 'login' ? handleLogin : handleRegister}
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 shadow-lg disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#6366F1)' }}
          >
            {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {mode === 'login' ? s.loginBtn : s.registerBtn}
          </button>

          <button onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); }}
            className="w-full text-center text-xs text-slate-500 hover:text-slate-700 transition-colors py-1">
            {mode === 'login' ? s.registerLink : s.loginLink}
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
  const { lang } = useLang();

  /* ── Dark mode (persisted in localStorage) ── */
  const [darkMode, setDarkMode] = useState(false);

  /* ── Viewport simulator (desktop only visual feature) ── */
  const [viewportMode, setViewportMode] = useState<'desktop' | 'mobile'>('desktop');

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
      // Demo onboarding persists in localStorage (demo-specific key, not production key)
      if (!localStorage.getItem(ONBOARDING_KEY_DEMO)) {
        localStorage.setItem(ONBOARDING_KEY_DEMO, '1');
        markDone(1); markDone(2); markDone(3); markDone(4);
      }
      setShowOnboarding(false);
    } else if (isStaging) {
      // Check for existing session
      const existing = getStagingSession();
      if (existing) {
        setStagingUser(existing);
        const done = localStorage.getItem(stagingOnboardingKey(existing.id));
        if (!done) setShowOnboarding(true);
      }
      setStagingChecked(true);
    } else {
      // Production: strict onboarding gate
      const done = localStorage.getItem(ONBOARDING_KEY_PROD);
      if (!done) setShowOnboarding(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envMode]);

  const handleStagingAuthenticated = (user: StagingUser) => {
    setStagingUser(user);
    const done = localStorage.getItem(stagingOnboardingKey(user.id));
    if (!done) setShowOnboarding(true);
  };

  const completeOnboarding = (plan?: string, promoCode?: string) => {
    if (isStaging && stagingUser) {
      localStorage.setItem(stagingOnboardingKey(stagingUser.id), '1');
    } else {
      localStorage.setItem(ONBOARDING_KEY_PROD, '1');
    }
    markDone(1);
    setShowOnboarding(false);
    setActivePage('properties');
  };

  const handleStagingLogout = () => {
    logoutStagingUser();
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
      case 'shipments':   return <ShipmentsPage />;
      default:            return <OverviewPage onNavigate={navigate} />;
    }
  };

  // Staging: show spinner while checking session
  if (isStaging && !stagingChecked) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Staging: show auth gate until user is authenticated
  if (isStaging && stagingChecked && !stagingUser) {
    return <StagingAuthGate onAuthenticated={handleStagingAuthenticated} />;
  }

  // Onboarding gate (production or staging first-time)
  if (showOnboarding) {
    return (
      <OnboardingPage
        onComplete={completeOnboarding}
        strictMode={true}
        showPayment={true}
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

  return (
    <div className={`flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden transition-colors ${
      viewportMode === 'mobile' ? 'bg-slate-800 dark:bg-black' : ''
    }`}>
      <Sidebar
        activePage={activePage}
        onNavigate={navigate}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main content wrapper — constrained when mobile viewport is active */}
      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300 ${
        viewportMode === 'mobile' ? 'viewport-mobile-panel' : ''
      }`}>
        <TopBar
          activePage={activePage}
          onNavigate={navigate}
          onMenuToggle={() => setMobileMenuOpen(v => !v)}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode(v => !v)}
          viewportMode={viewportMode}
          onToggleViewport={() => setViewportMode(v => v === 'desktop' ? 'mobile' : 'desktop')}
        />
        {isDemo    && <DemoBanner />}
        {isStaging && <StagingBanner onLogout={handleStagingLogout} user={stagingUser} />}
        {!isDemo && !isStaging && <JourneyBanner onNavigate={navigate} />}

        {/* Main content — extra bottom padding on mobile for the bottom nav bar */}
        <main className="flex-1 overflow-auto lg:pb-0 bottom-nav-spacing">{renderPage()}</main>
      </div>

      {/* ── Bottom navigation bar (mobile / tablet only) ── */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 transition-colors"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
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
                {/* Active indicator */}
                {active && (
                  <span className="absolute top-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-blue-600 rounded-full" />
                )}
                {/* Icon with optional badge */}
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
          {/* More — opens full sidebar */}
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
    </div>
  );
}
