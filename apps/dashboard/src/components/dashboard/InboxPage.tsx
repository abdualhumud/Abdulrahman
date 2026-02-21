'use client';

import { useState } from 'react';
import { INBOX_MESSAGES } from '@/lib/mock-data';

export default function InboxPage() {
  const [messages, setMessages] = useState(INBOX_MESSAGES);
  const [selectedId, setSelectedId] = useState<string | null>('m1');
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState('ALL');

  const selected = messages.find(m => m.id === selectedId);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setMessages(ms => ms.map(m => m.id === id ? { ...m, isRead: true } : m));
  };

  const handleSend = async () => {
    if (!reply.trim()) return;
    setSending(true);
    await new Promise(r => setTimeout(r, 1000));
    setSending(false);
    setReply('');
  };

  const filtered = filter === 'ALL' ? messages : messages.filter(m => m.channel === filter);
  const unread = messages.filter(m => !m.isRead).length;

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden">
      {/* List */}
      <div className="w-80 flex-shrink-0 border-r border-gray-100 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-bold text-slate-900 text-lg">Unified Inbox</h1>
            {unread > 0 && (
              <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5 font-bold">{unread}</span>
            )}
          </div>
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 text-slate-600 focus:outline-none">
            <option value="ALL">All Channels</option>
            <option value="Booking.com">Booking.com</option>
            <option value="Airbnb">Airbnb</option>
            <option value="Gathern">Gathern</option>
          </select>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {filtered.map(msg => (
            <button key={msg.id} onClick={() => handleSelect(msg.id)}
              className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${
                selectedId === msg.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
              }`}>
              <div className="flex items-start gap-2.5">
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                  style={{ background: msg.channelColor + '22', color: msg.channelColor }}>
                  {msg.guest.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm truncate ${!msg.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-600'}`}>
                      {msg.guest}
                    </p>
                    <span className="text-xs text-slate-400 flex-shrink-0 ml-1">{msg.time}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5" style={{ color: msg.channelColor }}>● {msg.channel}</p>
                  <p className={`text-xs mt-1 truncate ${!msg.isRead ? 'text-slate-700' : 'text-slate-400'}`}>
                    {msg.message}
                  </p>
                </div>
                {!msg.isRead && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detail */}
      <div className="flex-1 flex flex-col bg-slate-50">
        {selected ? (
          <>
            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                style={{ background: selected.channelColor + '22', color: selected.channelColor }}>
                {selected.guest.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-slate-900">{selected.guest}</p>
                <p className="text-xs text-slate-500">
                  <span style={{ color: selected.channelColor }}>● {selected.channel}</span>
                  {' · '}{selected.property} · Booking {selected.bookingId}
                </p>
              </div>
              <div className="ml-auto flex gap-2">
                <button className="text-xs border border-gray-200 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg text-slate-600 transition-colors">View Booking</button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-xl">
                <div className="flex items-end gap-2 mb-4">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0"
                    style={{ background: selected.channelColor + '22', color: selected.channelColor }}>
                    {selected.guest.charAt(0)}
                  </div>
                  <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm max-w-sm">
                    <p className="text-sm text-slate-800">{selected.message}</p>
                    <p className="text-xs text-slate-400 mt-1.5">{selected.time}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Reply */}
            <div className="bg-white border-t border-gray-100 p-4">
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <p className="text-xs text-slate-400 mb-1.5">
                    Reply via <span style={{ color: selected.channelColor }} className="font-semibold">● {selected.channel}</span>
                  </p>
                  <textarea value={reply} onChange={e => setReply(e.target.value)}
                    placeholder={`Message ${selected.guest}...`}
                    rows={2}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
                <button onClick={handleSend} disabled={sending || !reply.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 mb-0.5">
                  {sending ? '...' : 'Send'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            Select a message to view
          </div>
        )}
      </div>
    </div>
  );
}
