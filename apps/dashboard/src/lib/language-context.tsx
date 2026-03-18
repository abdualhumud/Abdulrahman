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
 * @param storageType
 *   'local'      — production: persists in localStorage under 'rems-lang'
 *   'session'    — staging:    persists in sessionStorage under 'rems-lang-demo'
 *   'local-demo' — demo:       persists in localStorage under 'rems-lang-demo' (survives tab close)
 */
export function LanguageProvider({
  children,
  storageType = 'local',
}: {
  children: React.ReactNode;
  storageType?: 'local' | 'session' | 'local-demo';
}) {
  const [lang, setLang] = useState<Lang>('ar');
  const KEY = storageType === 'local' ? 'rems-lang' : 'rems-lang-demo';

  // Resolve storage backend at call site (inside effects/callbacks) to avoid SSR errors
  const getStore = useCallback(
    () => (storageType === 'session' ? sessionStorage : localStorage),
    [storageType],
  );

  useEffect(() => {
    const stored = getStore().getItem(KEY) as Lang | null;
    // Respect an explicit user choice; otherwise keep the Arabic default
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
      getStore().setItem(KEY, next);
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getStore, KEY]);

  return (
    <Ctx.Provider value={{ lang, t: translations[lang], toggle }}>
      {children}
    </Ctx.Provider>
  );
}

export const useLang = () => useContext(Ctx);
