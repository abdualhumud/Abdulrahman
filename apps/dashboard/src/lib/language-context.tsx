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

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');

  // On mount, read from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('rems-lang') as Lang | null;
    if (stored === 'ar' || stored === 'en') setLang(stored);
  }, []);

  // Keep <html> dir + lang in sync
  useEffect(() => {
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir  = dir;
    document.documentElement.lang = lang;
  }, [lang]);

  const toggle = useCallback(() => {
    setLang(prev => {
      const next = prev === 'en' ? 'ar' : 'en';
      localStorage.setItem('rems-lang', next);
      return next;
    });
  }, []);

  return (
    <Ctx.Provider value={{ lang, t: translations[lang], toggle }}>
      {children}
    </Ctx.Provider>
  );
}

export const useLang = () => useContext(Ctx);
