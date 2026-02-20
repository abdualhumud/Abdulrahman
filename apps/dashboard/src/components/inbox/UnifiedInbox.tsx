import React, { useState } from 'react';
import { ChannelType } from '@rems/shared/types';
import { InboxMessage } from '../../types/dashboard.types';

// ============================================================
// UNIFIED INBOX — Consolidates guest messages from all OTAs
// ============================================================

const CHANNEL_STYLE: Record<string, { emoji: string; label: string; color: string }> = {
  [ChannelType.BOOKING_COM]: { emoji: '🔵', label: 'Booking.com', color: 'text-blue-600' },
  [ChannelType.AIRBNB]:      { emoji: '🔴', label: 'Airbnb',      color: 'text-rose-500' },
  [ChannelType.GATHERN]:     { emoji: '🟢', label: 'Gathern',     color: 'text-emerald-600' },
  [ChannelType.DIRECT]:      { emoji: '⚡', label: 'Direct',      color: 'text-amber-600' },
};

interface MessageThreadProps {
  message: InboxMessage;
  isSelected: boolean;
  onClick: () => void;
}

const MessageThread: React.FC<MessageThreadProps> = ({ message, isSelected, onClick }) => {
  const channelStyle = CHANNEL_STYLE[message.channel] ?? { emoji: '📩', label: message.channel, color: 'text-gray-600' };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
        isSelected ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
      } ${!message.isRead ? 'bg-white' : 'bg-gray-50/50'}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center text-sm font-bold text-gray-600 flex-shrink-0">
          {message.guestName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={`text-sm font-semibold truncate ${!message.isRead ? 'text-gray-900' : 'text-gray-600'}`}>
              {message.guestName}
            </p>
            <span className="text-xs text-gray-400 flex-shrink-0">{message.sentAt}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs">{channelStyle.emoji}</span>
            <span className={`text-xs font-medium ${channelStyle.color}`}>{channelStyle.label}</span>
            <span className="text-gray-300">·</span>
            <span className="text-xs text-gray-500 truncate">{message.propertyName}</span>
          </div>
          <p className={`text-xs mt-1 truncate ${!message.isRead ? 'text-gray-700' : 'text-gray-400'}`}>
            {message.preview}
          </p>
        </div>
        {!message.isRead && (
          <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
        )}
      </div>
    </button>
  );
};

interface UnifiedInboxProps {
  messages: InboxMessage[];
  onReply: (messageId: string, content: string) => Promise<void>;
  onMarkRead: (messageId: string) => void;
}

export const UnifiedInbox: React.FC<UnifiedInboxProps> = ({ messages, onReply, onMarkRead }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [filterChannel, setFilterChannel] = useState<string>('ALL');
  const [isReplying, setIsReplying] = useState(false);

  const filteredMessages = filterChannel === 'ALL'
    ? messages
    : messages.filter((m) => m.channel === filterChannel);

  const selectedMessage = messages.find((m) => m.id === selectedId);

  const handleSelect = (message: InboxMessage) => {
    setSelectedId(message.id);
    if (!message.isRead) onMarkRead(message.id);
  };

  const handleReply = async () => {
    if (!selectedId || !replyText.trim()) return;
    setIsReplying(true);
    await onReply(selectedId, replyText);
    setReplyText('');
    setIsReplying(false);
  };

  const unreadCount = messages.filter((m) => !m.isRead).length;

  return (
    <div className="flex h-full bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Message List */}
      <div className="w-80 flex-shrink-0 border-r border-gray-100 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">Inbox</h2>
            {unreadCount > 0 && (
              <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
                {unreadCount}
              </span>
            )}
          </div>
          <select
            value={filterChannel}
            onChange={(e) => setFilterChannel(e.target.value)}
            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600"
          >
            <option value="ALL">All Channels</option>
            {Object.values(ChannelType).filter((c) => c !== 'DIRECT' && c !== 'WALK_IN').map((ch) => (
              <option key={ch} value={ch}>{CHANNEL_STYLE[ch]?.label ?? ch}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredMessages.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No messages</div>
          ) : (
            filteredMessages.map((msg) => (
              <MessageThread
                key={msg.id}
                message={msg}
                isSelected={msg.id === selectedId}
                onClick={() => handleSelect(msg)}
              />
            ))
          )}
        </div>
      </div>

      {/* Message Detail / Reply */}
      <div className="flex-1 flex flex-col">
        {selectedMessage ? (
          <>
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                  {selectedMessage.guestName.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{selectedMessage.guestName}</p>
                  <p className="text-xs text-gray-500">
                    {CHANNEL_STYLE[selectedMessage.channel]?.emoji} {selectedMessage.propertyName}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              <div className="bg-gray-100 rounded-xl p-4 max-w-md">
                <p className="text-sm text-gray-800">{selectedMessage.preview}</p>
                <p className="text-xs text-gray-400 mt-2">{selectedMessage.sentAt}</p>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100">
              <div className="flex gap-2">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Reply via ${CHANNEL_STYLE[selectedMessage.channel]?.label ?? selectedMessage.channel}...`}
                  rows={2}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <button
                  onClick={handleReply}
                  disabled={isReplying || !replyText.trim()}
                  className="px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  {isReplying ? '...' : 'Send'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Select a message to view
          </div>
        )}
      </div>
    </div>
  );
};
