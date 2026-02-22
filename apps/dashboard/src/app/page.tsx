'use client';

import { useState, useEffect } from 'react';
import { LanguageProvider } from '@/lib/language-context';
import { JourneyProvider, useJourney } from '@/lib/journey-context';
import Sidebar        from '@/components/layout/Sidebar';
import TopBar         from '@/components/layout/TopBar';
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

type Page = 'overview' | 'properties' | 'bookings' | 'calendar' | 'channels' | 'cleaning' | 'inbox' | 'analytics' | 'financials' | 'settings';

function App() {
  const [activePage, setActivePage] = useState<Page>('overview');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { markDone } = useJourney();

  useEffect(() => {
    const done = localStorage.getItem('rems-onboarding-done');
    if (!done) setShowOnboarding(true);
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem('rems-onboarding-done', '1');
    markDone(1);                  // ✅ Journey Step 1: Register
    setShowOnboarding(false);
    setActivePage('properties');
  };

  const navigate = (p: string) => setActivePage(p as Page);

  // Called when a booking checkout triggers a cleaning request
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
      default:            return <OverviewPage onNavigate={navigate} />;
    }
  };

  if (showOnboarding) return <OnboardingPage onComplete={completeOnboarding} />;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar activePage={activePage} onNavigate={navigate} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar activePage={activePage} onNavigate={navigate} />
        <JourneyBanner onNavigate={navigate} />
        <main className="flex-1 overflow-auto">{renderPage()}</main>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <LanguageProvider>
      <JourneyProvider>
        <App />
      </JourneyProvider>
    </LanguageProvider>
  );
}
