'use client';

import { useState, useCallback } from 'react';
import { Icons } from '@/lib/icons';
import { INBOX_MESSAGES } from '@/lib/mock-data';
import { useLang } from '@/lib/language-context';

async function translateText(text: string, targetLang: 'en' | 'ar'): Promise<string> {
  const srcLang  = targetLang === 'en' ? 'ar' : 'en';
  const langpair = `${srcLang}|${targetLang}`;
  try {
    const res  = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langpair}`
    );
    const data = await res.json();
    return data?.responseData?.translatedText ?? text;
  } catch {
    return text;
  }
}

export default function InboxPage() {
  const { t, lang } = useLang();
  const [msgs,   setMsgs]   = useState(INBOX_MESSAGES);
  const [selId,  setSelId]  = useState<string | null>('m1');
  const [reply,  setReply]  = useState('');
  const [sending, setSending] = useState(false);
  const [chFilter, setChFilter] = useState('ALL');
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translating, setTranslating] = useState(false);

  const selected = msgs.find(m => m.id === selId);
  const unread   = msgs.filter(m => !m.isRead).length;
  const shown    = chFilter === 'ALL' ? msgs : msgs.filter(m => m.channel === chFilter);

  const pick = (id: string) => {
    setSelId(id);
    setMsgs(ms => ms.map(m => m.id === id ? { ...m, isRead: true } : m));
  };

  const send = async () => {
    if (!reply.trim()) return;
    setSending(true);
    await new Promise(r => setTimeout(r, 900));
    setSending(false);
    setReply('');
  };

  const toggleAutoTranslate = useCallback(async () => {
    const next = !autoTranslate;
    setAutoTranslate(next);
    if (next && selected) {
      const msgId   = selected.id;
      const msgText = selected.message;
      if (!translations[msgId]) {
        setTranslating(true);
        const targetLang = lang === 'ar' ? 'en' : 'ar';
        const translated = await translateText(msgText, targetLang);
        setTranslations(prev => ({ ...prev, [msgId]: translated }));
        setTranslating(false);
      }
    }
  }, [autoTranslate, selected, translations, lang]);

  const CHANNELS = ['ALL', 'Booking.com', 'Airbnb', 'Gathern'];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">

      {/* ── Sidebar list ── */}
      <div className="w-80 flex-shrink-0 bg-white border-e border-slate-100 flex flex-col">

        {/* Header */}
        <div className="px-4 pt-5 pb-3 border-b border-slate-50">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-extrabold text-slate-900 text-lg tracking-tight">{t.inbox.title}</h1>
            {unread > 0 && (
              <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5 font-bold">{unread}</span>
            )}
          </div>
          {/* Channel filter */}
          <div className="flex gap-1.5 flex-wrap">
            {CHANNELS.map(c => (
              <button key={c} onClick={() => setChFilter(c)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  chFilter === c ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}>
                {c === 'ALL' ? t.inbox.allChannels : c}
              </button>
            ))}
          </div>
        </div>

        {/* Message list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {shown.map(msg => (
            <button key={msg.id} onClick={() => pick(msg.id)}
              className={`w-full text-start p-4 transition-colors hover:bg-slate-50 relative
                ${selId === msg.id ? 'bg-blue-50/60' : ''}`}>
              {selId === msg.id && (
                <div className="inbox-active-border absolute start-0 top-3 bottom-3 w-0.5 bg-blue-500 rounded-full" />
              )}
              <div className="flex items-start gap-3 ps-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                  style={{ background: msg.channelColor + '18', color: msg.channelColor }}>
                  {msg.guest.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className={`text-sm truncate leading-none ${!msg.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-600'}`}>
                      {msg.guest}
                    </p>
                    <span className="text-[10px] text-slate-400 flex-shrink-0">{msg.time}</span>
                  </div>
                  <p className="text-[11px] font-semibold mt-1" style={{ color: msg.channelColor }}>
                    ● {msg.channel}
                  </p>
                  <p className={`text-xs mt-1 truncate leading-snug ${!msg.isRead ? 'text-slate-600' : 'text-slate-400'}`}>
                    {msg.message}
                  </p>
                </div>
                {!msg.isRead && (
                  <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Message detail ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {selected ? (
          <>
            {/* Convo header */}
            <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-3 flex-shrink-0">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                style={{ background: selected.channelColor + '18', color: selected.channelColor }}>
                {selected.guest.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 leading-none">{selected.guest}</p>
                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                  <span className="font-semibold" style={{ color: selected.channelColor }}>● {selected.channel}</span>
                  <span>·</span>
                  <span>{selected.property}</span>
                  <span>·</span>
                  <span className="font-mono" style={{ direction: 'ltr', unicodeBidi: 'embed' }}>{selected.bookingId}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* Auto-translate toggle */}
                <button
                  onClick={toggleAutoTranslate}
                  title={lang === 'ar' ? 'ترجمة تلقائية' : 'Auto-Translate'}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    autoTranslate
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-100 text-slate-500 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 8l6 6" /><path d="M4 14l6-6 2-3" /><path d="M2 5h12" /><path d="M7 2h1" />
                    <path d="M22 22l-5-10-5 10" /><path d="M14 18h6" />
                  </svg>
                  {lang === 'ar' ? 'ترجمة' : 'Translate'}
                </button>
                <button className="btn-ghost text-xs py-1.5 px-3">{t.inbox.viewBooking}</button>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
              {/* Property info chip */}
              <div className="flex justify-center">
                <span className="bg-white border border-slate-100 text-xs text-slate-400 px-3 py-1 rounded-full shadow-sm">
                  {selected.property} — {selected.time}
                </span>
              </div>

              {/* Guest message bubble */}
              <div className="flex items-end gap-3 max-w-lg">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0"
                  style={{ background: selected.channelColor + '18', color: selected.channelColor }}>
                  {selected.guest.charAt(0)}
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl rounded-es-sm px-4 py-3 shadow-sm">
                  <p className="text-sm text-slate-800 leading-relaxed">{selected.message}</p>
                  <p className="text-[10px] text-slate-400 mt-2">{selected.time}</p>
                  {/* Auto-translation */}
                  {autoTranslate && (
                    <div className="mt-2 pt-2 border-t border-slate-100">
                      {translating ? (
                        <p className="text-[11px] text-blue-500 flex items-center gap-1">
                          <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                          {lang === 'ar' ? 'جارٍ الترجمة…' : 'Translating…'}
                        </p>
                      ) : translations[selected.id] ? (
                        <div>
                          <p className="text-[10px] text-blue-500 font-semibold mb-0.5 flex items-center gap-1">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 8l6 6"/><path d="M4 14l6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="M22 22l-5-10-5 10"/><path d="M14 18h6"/>
                            </svg>
                            {lang === 'ar' ? 'الترجمة الآلية' : 'Auto-translated'}
                          </p>
                          <p className="text-sm text-slate-600 leading-relaxed italic">{translations[selected.id]}</p>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Reply box */}
            <div className="bg-white border-t border-slate-100 px-5 py-4 flex-shrink-0">
              <p className="text-xs text-slate-400 mb-2 font-medium">
                {t.inbox.replyVia} <span className="font-bold" style={{ color: selected.channelColor }}>● {selected.channel}</span>
              </p>
              <div className="flex gap-3 items-end">
                <textarea
                  value={reply} onChange={e => setReply(e.target.value)}
                  placeholder={`${t.inbox.placeholder} ${selected.guest.split(' ')[0]}…`}
                  rows={2}
                  onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) send(); }}
                  className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none text-slate-800 placeholder-slate-400 transition-all"
                  style={{ direction: 'ltr' }}
                />
                <button onClick={send} disabled={sending || !reply.trim()}
                  className="btn-primary py-2.5 px-4 disabled:opacity-40 flex-shrink-0">
                  {sending
                    ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Icons.send size={15} />}
                  {!sending && t.common.send}
                </button>
              </div>
              <p className="text-[10px] text-slate-300 mt-1.5">{t.inbox.cmdEnter}</p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
              <Icons.inbox size={28} className="text-slate-300" />
            </div>
            <p className="font-semibold text-slate-400">{t.inbox.noConvo}</p>
            <p className="text-sm text-slate-300 mt-1">{t.inbox.pickMsg}</p>
          </div>
        )}
      </div>
    </div>
  );
}
