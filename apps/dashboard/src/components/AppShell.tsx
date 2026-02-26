'use client';

/**
 * AppShell — shared application core used by both:
 *   /        → production mode (ModeProvider isDemo={false})
 *   /demo/   → sandbox mode   (ModeProvider isDemo={true})
 *
 * Reads `isDemo` from ModeContext to determine storage behaviour and
 * whether onboarding is strict (production) or skippable (demo).
 */

import { useState, useEffect } from 'react';
import { useJourney } from '@/lib/journey-context';
import { useMode }    from '@/lib/mode-context';
import Sidebar        from '@/components/layout/Sidebar';
import TopBar         from '@/components/layout/TopBar';
import DemoBanner     from '@/components/layout/DemoBanner';
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

export default function AppShell() {
  const { isDemo } = useMode();
  const { markDone } = useJourney();

  const [activePage,     setActivePage]     = useState<Page>('overview');
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (isDemo) {
      // Demo: always show the dashboard immediately (no onboarding gate)
      const store = sessionStorage;
      const key   = ONBOARDING_KEY_DEMO;
      if (!store.getItem(key)) {
        store.setItem(key, '1');
        // Pre-mark all journey steps so the banner is silent in demo mode
        markDone(1); markDone(2); markDone(3); markDone(4);
      }
      setShowOnboarding(false);
    } else {
      // Production: require onboarding until explicitly completed
      const done = localStorage.getItem(ONBOARDING_KEY_PROD);
      if (!done) setShowOnboarding(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo]);

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY_PROD, '1');
    markDone(1);
    setShowOnboarding(false);
    setActivePage('properties');
  };

  const navigate = (p: string) => setActivePage(p as Page);

  const handleCheckoutCleaning = (_unit: string, _bookingId: string) => {
    setActivePage('cleaning');
  };

  const renderPage = () => {
    switch (activePage) {
      case 'overview':    return <OverviewPage onNavigate={navigate} />;
      case 'properties':  return <PropertiesPage onNavigate={navigate} />;
      case 'bookings':    return <BookingsPage onCheckoutCleaning={handleCheckoutCleaning} />;
      case 'calendar':    return <CalendarPage />;
      case 'channels':    return <ChannelsPage />;
      case 'cleaning':    return <CleaningPage />;
      case 'inbox':       return <InboxPage />;
      case 'analytics':   return <AnalyticsPage />;
      case 'financials':  return <FinancialsPage />;
      case 'settings':    return <SettingsPage />;
      case 'shipments':   return <ShipmentsPage />;
      default:            return <OverviewPage onNavigate={navigate} />;
    }
  };

  // Strict production onboarding gate — not shown in demo
  if (showOnboarding) {
    return (
      <OnboardingPage
        onComplete={completeOnboarding}
        strictMode={!isDemo}
      />
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar activePage={activePage} onNavigate={navigate} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar activePage={activePage} onNavigate={navigate} />
        {isDemo && <DemoBanner />}
        {!isDemo && <JourneyBanner onNavigate={navigate} />}
        <main className="flex-1 overflow-auto">{renderPage()}</main>
      </div>
    </div>
  );
}
