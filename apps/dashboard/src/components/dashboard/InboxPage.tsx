'use client';

import { useState, useCallback } from 'react';
import { Icons } from '@/lib/icons';
import { INBOX_MESSAGES, RECENT_BOOKINGS } from '@/lib/mock-data';
import { useLang } from '@/lib/language-context';
import { useMode } from '@/lib/mode-context';

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

interface InboxPageProps { onNavigate?: (page: string) => void; }

export default function InboxPage({ onNavigate }: InboxPageProps) {
  const { t, lang } = useLang();
  const { isDemo } = useMode();
  // Fresh-start: production/staging users begin with an empty inbox
  const [msgs,   setMsgs]   = useState(() => isDemo ? INBOX_MESSAGES : ([] as typeof INBOX_MESSAGES));
  const [selId,  setSelId]  = useState<string | null>(isDemo ? 'm1' : null);
  const [reply,  setReply]  = useState('');
  const [sending, setSending] = useState(false);
  const [chFilter, setChFilter] = useState('ALL');
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translating, setTranslating] = useState(false);
  // Mobile panel state: 'list' → message list, 'chat' → conversation view
  const [mobilePanel,      setMobilePanel]      = useState<'list' | 'chat'>('list');
  const [showMobileInfo,   setShowMobileInfo]   = useState(false);

  const selected = msgs.find(m => m.id === selId);
  const unread   = msgs.filter(m => !m.isRead).length;
  const shown    = chFilter === 'ALL' ? msgs : msgs.filter(m => m.channel === chFilter);

  const pick = (id: string) => {
    setSelId(id);
    setMsgs(ms => ms.map(m => m.id === id ? { ...m, isRead: true } : m));
    setMobilePanel('chat'); // switch to chat view on mobile
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
        // Translate INTO the current UI language so the manager can read it
        const targetLang = lang as 'en' | 'ar';
        const translated = await translateText(msgText, targetLang);
        setTranslations(prev => ({ ...prev, [msgId]: translated }));
        setTranslating(false);
      }
    }
  }, [autoTranslate, selected, translations, lang]);

  const CHANNELS = ['ALL', 'Booking.com', 'Airbnb', 'Gathern', 'WhatsApp'];

  // Match booking for the selected conversation
  const selectedBooking = selected
    ? RECENT_BOOKINGS.find(b => b.id === selected.bookingId) ?? null
    : null;

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] lg:h-screen overflow-hidden bg-slate-50">

      {/* ── Message list panel (full-width on mobile when active, fixed 320px on desktop) ── */}
      <div className={`bg-white border-e border-slate-100 flex-col
        w-full lg:w-80 lg:flex-shrink-0
        ${mobilePanel === 'chat' ? 'hidden lg:flex' : 'flex'}`}>

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
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                  chFilter === c ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}>
                {c === 'WhatsApp' && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="opacity-80">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                )}
                {c === 'ALL' ? t.inbox.allChannels : c === 'WhatsApp' ? t.inbox.whatsappChannel : c}
              </button>
            ))}
          </div>
        </div>

        {/* Message list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {shown.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 p-6 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
                <Icons.inbox size={22} className="text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-400">{t.inbox.emptyInbox}</p>
              <p className="text-xs text-slate-300 mt-1 leading-snug">{t.inbox.emptyInboxSub}</p>
            </div>
          )}
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
                  <p className="text-[11px] font-semibold mt-1 flex items-center gap-1" style={{ color: msg.channelColor }}>
                    {msg.channel === 'WhatsApp' ? (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    ) : '●'} {msg.channel === 'WhatsApp' ? t.inbox.whatsappChannel : msg.channel}
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

      {/* ── Chat + reservation panel (full-width on mobile when chat active) ── */}
      <div className={`flex-1 min-w-0 overflow-hidden
        ${mobilePanel === 'list' ? 'hidden lg:flex' : 'flex'}`}>
      {/* Message detail */}
      <div className="flex-1 flex flex-col min-w-0">
        {selected ? (
          <>
            {/* Convo header */}
            <div className="bg-white border-b border-slate-100 px-3 sm:px-6 py-3 sm:py-4 flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {/* ← Back button (mobile only) */}
              <button
                onClick={() => setMobilePanel('list')}
                aria-label={lang === 'ar' ? 'رجوع' : 'Back'}
                className="lg:hidden w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-all flex-shrink-0"
              >
                {lang === 'ar' ? <Icons.chevronRight size={18} /> : <Icons.chevronLeft size={18} />}
              </button>
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                style={{ background: selected.channelColor + '18', color: selected.channelColor }}>
                {selected.guest.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 leading-none">{selected.guest}</p>
                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                  <span className="font-semibold flex items-center gap-1" style={{ color: selected.channelColor }}>
                    {selected.channel === 'WhatsApp' ? (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    ) : '●'} {selected.channel === 'WhatsApp' ? t.inbox.whatsappChannel : selected.channel}
                  </span>
                  <span>·</span>
                  <span>{selected.property}</span>
                  <span>·</span>
                  <span className="font-mono" style={{ direction: 'ltr', unicodeBidi: 'embed' }}>{selected.bookingId}</span>
                </p>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Auto-translate toggle — icon-only on mobile */}
                <button
                  onClick={toggleAutoTranslate}
                  title={lang === 'ar' ? 'ترجمة تلقائية' : 'Auto-Translate'}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    autoTranslate
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-100 text-slate-500 border-slate-200 hover:border-slate-400'
                  }`}
                  style={{ minHeight: 36 }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 8l6 6" /><path d="M4 14l6-6 2-3" /><path d="M2 5h12" /><path d="M7 2h1" />
                    <path d="M22 22l-5-10-5 10" /><path d="M14 18h6" />
                  </svg>
                  <span className="hidden sm:inline">{lang === 'ar' ? 'ترجمة' : 'Translate'}</span>
                </button>
                {/* Booking info — mobile only (desktop uses the side panel) */}
                <button
                  onClick={() => setShowMobileInfo(true)}
                  title={lang === 'ar' ? 'تفاصيل الحجز' : 'Booking Details'}
                  className="lg:hidden w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-all flex-shrink-0"
                  style={{ minHeight: 36 }}
                >
                  <Icons.info size={16} />
                </button>
                <button onClick={() => onNavigate?.('bookings')} className="hidden sm:flex btn-ghost text-xs py-1.5 px-3">{t.inbox.viewBooking}</button>
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
      </div>{/* end message detail */}

      {/* ── Reservation details panel (desktop sidebar only) ── */}
      <div className="hidden lg:flex w-72 flex-shrink-0 bg-white border-s border-slate-100 flex-col overflow-y-auto">
        <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.inbox.reservationDetails}</p>
        </div>

        {selectedBooking ? (
          <div className="p-4 space-y-4">
            {/* Guest avatar + name */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base flex-shrink-0"
                style={{ background: selectedBooking.channelColor + '18', color: selectedBooking.channelColor }}>
                {selectedBooking.guest.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-900 text-sm truncate">{selectedBooking.guest}</p>
                <p className="text-[11px] font-semibold mt-0.5" style={{ color: selectedBooking.channelColor }}>
                  ● {selectedBooking.channel}
                </p>
              </div>
            </div>

            {/* Booking ID */}
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                {lang === 'ar' ? 'رقم الحجز' : 'Booking ID'}
              </p>
              <p className="font-mono text-xs font-bold text-slate-700" style={{ direction: 'ltr' }}>
                {selectedBooking.id}
              </p>
            </div>

            {/* Property + unit */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                {lang === 'ar' ? 'العقار' : 'Property'}
              </p>
              <div className="flex items-start gap-2">
                <Icons.building size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-800">{selectedBooking.property}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{selectedBooking.unit}</p>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-blue-50 rounded-xl p-2.5">
                <p className="text-[9px] font-bold text-blue-400 uppercase tracking-wider mb-1">
                  {lang === 'ar' ? 'الوصول' : 'Check-in'}
                </p>
                <p className="text-xs font-extrabold text-blue-700" style={{ direction: 'ltr' }}>
                  {selectedBooking.checkIn}
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-2.5">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  {lang === 'ar' ? 'المغادرة' : 'Check-out'}
                </p>
                <p className="text-xs font-extrabold text-slate-700" style={{ direction: 'ltr' }}>
                  {selectedBooking.checkOut}
                </p>
              </div>
            </div>

            {/* Nights */}
            <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50 rounded-xl">
              <p className="text-xs font-semibold text-slate-500">
                {lang === 'ar' ? 'عدد الليالي' : 'Nights'}
              </p>
              <p className="font-extrabold text-slate-800 text-sm">{selectedBooking.nights}</p>
            </div>

            {/* Payment */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                {lang === 'ar' ? 'المبلغ' : 'Payment'}
              </p>
              <div className="flex items-center justify-between">
                <p className="text-xl font-extrabold text-slate-900" style={{ direction: 'ltr' }}>
                  SAR {selectedBooking.amount.toLocaleString()}
                </p>
                <span className={`badge text-[10px] ${selectedBooking.statusColor}`}>
                  {t.status[selectedBooking.status as keyof typeof t.status] ?? selectedBooking.status}
                </span>
              </div>
            </div>

            {/* View booking button */}
            <button onClick={() => onNavigate?.('bookings')} className="w-full btn-primary py-2 text-xs justify-center">
              <Icons.bookings size={12} />
              {t.inbox.viewBooking}
            </button>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6 text-center">
            <div>
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Icons.bookings size={18} className="text-slate-300" />
              </div>
              <p className="text-xs text-slate-400 font-medium">
                {lang === 'ar' ? 'اختر رسالة لعرض الحجز' : 'Select a message to view booking'}
              </p>
            </div>
          </div>
        )}
      </div>
      </div>{/* end message detail + reservation panel wrapper */}

      {/* ── Mobile: reservation bottom sheet ── */}
      {showMobileInfo && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          onClick={() => setShowMobileInfo(false)}
        >
          <div
            className="absolute bottom-0 inset-x-0 bg-white rounded-t-3xl shadow-2xl max-h-[75vh] overflow-y-auto slide-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-1" />
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 sticky top-0 bg-white">
              <p className="text-sm font-extrabold text-slate-800">{t.inbox.reservationDetails}</p>
              <button
                onClick={() => setShowMobileInfo(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors"
              >
                <Icons.x size={15} />
              </button>
            </div>

            {/* Reservation content */}
            {selectedBooking ? (
              <div className="p-5 space-y-4">
                {/* Guest */}
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base flex-shrink-0"
                    style={{ background: selectedBooking.channelColor + '18', color: selectedBooking.channelColor }}>
                    {selectedBooking.guest.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">{selectedBooking.guest}</p>
                    <p className="text-[11px] font-semibold mt-0.5" style={{ color: selectedBooking.channelColor }}>
                      ● {selectedBooking.channel}
                    </p>
                  </div>
                </div>
                {/* Booking ID */}
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{lang === 'ar' ? 'رقم الحجز' : 'Booking ID'}</p>
                  <p className="font-mono text-xs font-bold text-slate-700" style={{ direction: 'ltr' }}>{selectedBooking.id}</p>
                </div>
                {/* Dates */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-blue-50 rounded-xl p-2.5">
                    <p className="text-[9px] font-bold text-blue-400 uppercase tracking-wider mb-1">{lang === 'ar' ? 'الوصول' : 'Check-in'}</p>
                    <p className="text-xs font-extrabold text-blue-700" style={{ direction: 'ltr' }}>{selectedBooking.checkIn}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-2.5">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">{lang === 'ar' ? 'المغادرة' : 'Check-out'}</p>
                    <p className="text-xs font-extrabold text-slate-700" style={{ direction: 'ltr' }}>{selectedBooking.checkOut}</p>
                  </div>
                </div>
                {/* Payment */}
                <div className="flex items-center justify-between px-3 py-3 bg-slate-50 rounded-xl">
                  <p className="text-xl font-extrabold text-slate-900" style={{ direction: 'ltr' }}>
                    SAR {selectedBooking.amount.toLocaleString()}
                  </p>
                  <span className={`badge text-[10px] ${selectedBooking.statusColor}`}>
                    {t.status[selectedBooking.status as keyof typeof t.status] ?? selectedBooking.status}
                  </span>
                </div>
                {/* View booking */}
                <button onClick={() => { onNavigate?.('bookings'); setShowMobileInfo(false); }}
                  className="w-full btn-primary py-2.5 text-xs justify-center">
                  <Icons.bookings size={12} />
                  {t.inbox.viewBooking}
                </button>
              </div>
            ) : (
              <div className="p-10 text-center">
                <p className="text-xs text-slate-400 font-medium">{lang === 'ar' ? 'لا يوجد حجز مرتبط' : 'No booking linked'}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
