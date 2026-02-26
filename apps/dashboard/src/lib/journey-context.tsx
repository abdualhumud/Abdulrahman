'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type JourneyStep = 1 | 2 | 3 | 4;

interface JourneyCtx {
  completed: Set<JourneyStep>;
  markDone: (step: JourneyStep) => void;
  currentGuide: JourneyStep | null;
  setGuide: (s: JourneyStep | null) => void;
}

const Ctx = createContext<JourneyCtx>({
  completed: new Set(),
  markDone: () => {},
  currentGuide: null,
  setGuide: () => {},
});

/**
 * @param storageType - 'local' (default, production) persists across sessions;
 *   'session' (demo sandbox) resets when the browser tab is closed.
 */
export function JourneyProvider({
  children,
  storageType = 'local',
}: {
  children: React.ReactNode;
  storageType?: 'local' | 'session';
}) {
  const [completed, setCompleted] = useState<Set<JourneyStep>>(new Set());
  const [currentGuide, setGuide] = useState<JourneyStep | null>(null);
  const KEY = storageType === 'session' ? 'rems-journey-demo' : 'rems-journey';

  useEffect(() => {
    try {
      const store = storageType === 'session' ? sessionStorage : localStorage;
      const saved = JSON.parse(store.getItem(KEY) ?? '[]') as JourneyStep[];
      if (saved.length) setCompleted(new Set(saved));
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markDone = useCallback((step: JourneyStep) => {
    setCompleted(prev => {
      const next = new Set(prev);
      next.add(step);
      const store = storageType === 'session' ? sessionStorage : localStorage;
      store.setItem(KEY, JSON.stringify([...next]));
      return next;
    });
  }, [KEY, storageType]);

  return (
    <Ctx.Provider value={{ completed, markDone, currentGuide, setGuide }}>
      {children}
    </Ctx.Provider>
  );
}

export const useJourney = () => useContext(Ctx);
