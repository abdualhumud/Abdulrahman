'use client';

import { useState, useEffect } from 'react';
import { LanguageProvider } from '@/lib/language-context';
import Sidebar        from '@/components/layout/Sidebar';
import TopBar         from '@/components/layout/TopBar';
import OnboardingPage from '@/components/dashboard/OnboardingPage';
import OverviewPage   from '@/components/dashboard/OverviewPage';
import BookingsPage   from '@/components/dashboard/BookingsPage';
import CalendarPage   from '@/components/dashboard/CalendarPage';
import ChannelsPage   from '@/components/dashboard/ChannelsPage';
import InboxPage      from '@/components/dashboard/InboxPage';
import AnalyticsPage  from '@/components/dashboard/AnalyticsPage';
import FinancialsPage from '@/components/dashboard/FinancialsPage';
import PropertiesPage from '@/components/dashboard/PropertiesPage';

type Page = 'overview' | 'properties' | 'bookings' | 'calendar' | 'channels' | 'inbox' | 'analytics' | 'financials';

function App() {
  const [activePage, setActivePage] = useState<Page>('overview');
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Show onboarding once per session (localStorage key)
  useEffect(() => {
    const done = localStorage.getItem('rems-onboarding-done');
    if (!done) setShowOnboarding(true);
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem('rems-onboarding-done', '1');
    setShowOnboarding(false);
    setActivePage('properties');
  };

  const navigate = (p: string) => setActivePage(p as Page);

  const renderPage = () => {
    switch (activePage) {
      case 'overview':    return <OverviewPage />;
      case 'properties':  return <PropertiesPage onNavigate={navigate} />;
      case 'bookings':    return <BookingsPage />;
      case 'calendar':    return <CalendarPage />;
      case 'channels':    return <ChannelsPage />;
      case 'inbox':       return <InboxPage />;
      case 'analytics':   return <AnalyticsPage />;
      case 'financials':  return <FinancialsPage />;
      default:            return <OverviewPage />;
    }
  };

  if (showOnboarding) return <OnboardingPage onComplete={completeOnboarding} />;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar activePage={activePage} onNavigate={navigate} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar activePage={activePage} onNavigate={navigate} />
        <main className="flex-1 overflow-auto">{renderPage()}</main>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <LanguageProvider>
      <App />
    </LanguageProvider>
  );
}
