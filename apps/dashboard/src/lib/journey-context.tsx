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
 * @param storageType
 *   'local'      — production: persists in localStorage under 'rems-journey'
 *   'session'    — staging:    persists in sessionStorage under 'rems-journey-demo'
 *   'local-demo' — demo:       persists in localStorage under 'rems-journey-demo' (survives tab close)
 */
export function JourneyProvider({
  children,
  storageType = 'local',
}: {
  children: React.ReactNode;
  storageType?: 'local' | 'session' | 'local-demo';
}) {
  const [completed, setCompleted] = useState<Set<JourneyStep>>(new Set());
  const [currentGuide, setGuide] = useState<JourneyStep | null>(null);
  const KEY = storageType === 'local' ? 'rems-journey' : 'rems-journey-demo';

  // Resolve storage backend at call site (inside effects/callbacks) to avoid SSR errors
  const getStore = useCallback(
    () => (storageType === 'session' ? sessionStorage : localStorage),
    [storageType],
  );

  useEffect(() => {
    try {
      const saved = JSON.parse(getStore().getItem(KEY) ?? '[]') as JourneyStep[];
      if (saved.length) setCompleted(new Set(saved));
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markDone = useCallback((step: JourneyStep) => {
    setCompleted(prev => {
      const next = new Set(prev);
      next.add(step);
      getStore().setItem(KEY, JSON.stringify([...next]));
      return next;
    });
  }, [KEY, getStore]);

  return (
    <Ctx.Provider value={{ completed, markDone, currentGuide, setGuide }}>
      {children}
    </Ctx.Provider>
  );
}

export const useJourney = () => useContext(Ctx);
