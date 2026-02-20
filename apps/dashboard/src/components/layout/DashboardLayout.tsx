import React, { ReactNode, useState } from 'react';
import { ChannelType } from '@rems/shared/types';

// ============================================================
// DASHBOARD LAYOUT — Single-View Owner Dashboard
// Framework: React 18 + TypeScript
// Styling: Tailwind CSS
// ============================================================

interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: '▦' },
  { id: 'calendar', label: 'Master Calendar', icon: '📅' },
  { id: 'bookings', label: 'Bookings', icon: '🏷️' },
  { id: 'channels', label: 'Channels', icon: '🔗' },
  { id: 'rates', label: 'Rate Manager', icon: '💰' },
  { id: 'inbox', label: 'Inbox', icon: '💬' },
  { id: 'financials', label: 'Financials', icon: '📊' },
  { id: 'analytics', label: 'Analytics', icon: '📈' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

interface Props {
  children: ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
  unreadMessages?: number;
  conflicts?: number;
  ownerName?: string;
}

export const DashboardLayout: React.FC<Props> = ({
  children,
  activePage,
  onNavigate,
  unreadMessages = 0,
  conflicts = 0,
  ownerName = 'Owner',
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItemsWithBadges = NAV_ITEMS.map((item) => ({
    ...item,
    badge:
      item.id === 'inbox' ? unreadMessages :
      item.id === 'bookings' && conflicts > 0 ? conflicts : undefined,
  }));

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-slate-900 text-white flex flex-col transition-all duration-200`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700">
          <span className="text-2xl">🏢</span>
          {sidebarOpen && (
            <div>
              <p className="font-bold text-sm">REMS</p>
              <p className="text-xs text-slate-400">Property Manager</p>
            </div>
          )}
          <button
            className="ml-auto text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {navItemsWithBadges.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                activePage === item.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {sidebarOpen && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          ))}
        </nav>

        {/* Owner info */}
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold">
              {ownerName.charAt(0)}
            </div>
            {sidebarOpen && (
              <div>
                <p className="text-sm font-medium">{ownerName}</p>
                <p className="text-xs text-slate-400">Property Owner</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
