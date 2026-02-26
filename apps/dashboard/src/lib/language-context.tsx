'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations, type Lang } from './i18n';

type AnyTranslation = typeof translations.en | typeof translations.ar;

interface LangCtx {
  lang: Lang;
  t: AnyTranslation;
  toggle: () => void;
}

const Ctx = createContext<LangCtx>({
  lang: 'en',
  t: translations.en,
  toggle: () => {},
});

/**
 * @param storageType - 'local' (default, production) persists across sessions;
 *   'session' (demo sandbox) resets when the browser tab is closed.
 */
export function LanguageProvider({
  children,
  storageType = 'local',
}: {
  children: React.ReactNode;
  storageType?: 'local' | 'session';
}) {
  const [lang, setLang] = useState<Lang>('en');
  const KEY = storageType === 'session' ? 'rems-lang-demo' : 'rems-lang';

  useEffect(() => {
    const store = storageType === 'session' ? sessionStorage : localStorage;
    const stored = store.getItem(KEY) as Lang | null;
    if (stored === 'ar' || stored === 'en') setLang(stored);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.dir  = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const toggle = useCallback(() => {
    setLang(prev => {
      const next = prev === 'en' ? 'ar' : 'en';
      const store = storageType === 'session' ? sessionStorage : localStorage;
      store.setItem(KEY, next);
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageType, KEY]);

  return (
    <Ctx.Provider value={{ lang, t: translations[lang], toggle }}>
      {children}
    </Ctx.Provider>
  );
}

export const useLang = () => useContext(Ctx);
