'use client';

import { useState } from 'react';
import { LanguageProvider } from '@/lib/language-context';
import Sidebar from '@/components/layout/Sidebar';
import OverviewPage   from '@/components/dashboard/OverviewPage';
import BookingsPage   from '@/components/dashboard/BookingsPage';
import CalendarPage   from '@/components/dashboard/CalendarPage';
import ChannelsPage   from '@/components/dashboard/ChannelsPage';
import InboxPage      from '@/components/dashboard/InboxPage';
import AnalyticsPage  from '@/components/dashboard/AnalyticsPage';
import FinancialsPage from '@/components/dashboard/FinancialsPage';

type Page = 'overview' | 'bookings' | 'calendar' | 'channels' | 'inbox' | 'analytics' | 'financials';

function App() {
  const [activePage, setActivePage] = useState<Page>('overview');

  const renderPage = () => {
    switch (activePage) {
      case 'overview':   return <OverviewPage />;
      case 'bookings':   return <BookingsPage />;
      case 'calendar':   return <CalendarPage />;
      case 'channels':   return <ChannelsPage />;
      case 'inbox':      return <InboxPage />;
      case 'analytics':  return <AnalyticsPage />;
      case 'financials': return <FinancialsPage />;
      default:           return <OverviewPage />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar activePage={activePage} onNavigate={p => setActivePage(p as Page)} />
      <main className="flex-1 overflow-auto">{renderPage()}</main>
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
