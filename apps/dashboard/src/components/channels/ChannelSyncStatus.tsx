import React from 'react';
import { ChannelType } from '@rems/shared/types';

// ============================================================
// CHANNEL SYNC STATUS PANEL
// Shows live sync state for each connected OTA
// ============================================================

interface ChannelStatus {
  channel: ChannelType;
  label: string;
  isConnected: boolean;
  lastSyncedAt: string;
  syncMethod: 'WEBHOOK' | 'POLLING';
  pollingIntervalSeconds?: number;
  bookingsToday: number;
  pendingEvents: number;
  failedEvents: number;
}

const CHANNEL_LOGOS: Record<ChannelType, { emoji: string; color: string; bg: string }> = {
  [ChannelType.BOOKING_COM]: { emoji: '🔵', color: 'text-blue-700', bg: 'bg-blue-50' },
  [ChannelType.AIRBNB]: { emoji: '🔴', color: 'text-rose-600', bg: 'bg-rose-50' },
  [ChannelType.GATHERN]: { emoji: '🟢', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  [ChannelType.DIRECT]: { emoji: '⚡', color: 'text-amber-700', bg: 'bg-amber-50' },
  [ChannelType.WALK_IN]: { emoji: '🚶', color: 'text-gray-700', bg: 'bg-gray-50' },
};

interface ChannelCardProps {
  status: ChannelStatus;
  onReSync: (channel: ChannelType) => void;
}

const ChannelCard: React.FC<ChannelCardProps> = ({ status, onReSync }) => {
  const logo = CHANNEL_LOGOS[status.channel];
  const hasIssues = status.failedEvents > 0;

  return (
    <div className={`border rounded-xl p-4 ${hasIssues ? 'border-red-200 bg-red-50/30' : 'border-gray-100 bg-white'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-lg ${logo.bg} flex items-center justify-center text-lg`}>
            {logo.emoji}
          </div>
          <div>
            <p className={`font-semibold text-sm ${logo.color}`}>{status.label}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${status.isConnected ? 'bg-emerald-500' : 'bg-red-400'}`} />
              <span className="text-xs text-gray-400">
                {status.isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>

        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          status.syncMethod === 'WEBHOOK'
            ? 'bg-blue-100 text-blue-700'
            : 'bg-amber-100 text-amber-700'
        }`}>
          {status.syncMethod === 'WEBHOOK' ? '⚡ Webhook' : `🔄 Poll/${status.pollingIntervalSeconds}s`}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-lg font-bold text-gray-800">{status.bookingsToday}</p>
          <p className="text-xs text-gray-400">Today</p>
        </div>
        <div className={`rounded-lg p-2 ${status.pendingEvents > 0 ? 'bg-amber-50' : 'bg-gray-50'}`}>
          <p className={`text-lg font-bold ${status.pendingEvents > 0 ? 'text-amber-600' : 'text-gray-800'}`}>
            {status.pendingEvents}
          </p>
          <p className="text-xs text-gray-400">Pending</p>
        </div>
        <div className={`rounded-lg p-2 ${status.failedEvents > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
          <p className={`text-lg font-bold ${status.failedEvents > 0 ? 'text-red-600' : 'text-gray-800'}`}>
            {status.failedEvents}
          </p>
          <p className="text-xs text-gray-400">Failed</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-gray-400">
          Last sync: <span className="font-medium">{status.lastSyncedAt}</span>
        </p>
        <button
          onClick={() => onReSync(status.channel)}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          Force Sync →
        </button>
      </div>
    </div>
  );
};

interface ChannelSyncStatusProps {
  channels: ChannelStatus[];
  onReSync: (channel: ChannelType) => void;
}

export const ChannelSyncStatus: React.FC<ChannelSyncStatusProps> = ({ channels, onReSync }) => (
  <div>
    <div className="flex items-center justify-between mb-4">
      <h2 className="font-semibold text-gray-800">Channel Sync Status</h2>
      <span className="text-xs text-gray-400">{channels.filter((c) => c.isConnected).length}/{channels.length} connected</span>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {channels.map((ch) => (
        <ChannelCard key={ch.channel} status={ch} onReSync={onReSync} />
      ))}
    </div>
  </div>
);
