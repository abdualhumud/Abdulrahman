'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type JourneyStep = 1 | 2 | 3 | 4;

interface JourneyCtx {
  completed: Set<JourneyStep>;
  markDone: (step: JourneyStep) => void;
  currentGuide: JourneyStep | null; // which step to highlight
  setGuide: (s: JourneyStep | null) => void;
}

const Ctx = createContext<JourneyCtx>({
  completed: new Set(),
  markDone: () => {},
  currentGuide: null,
  setGuide: () => {},
});

export function JourneyProvider({ children }: { children: React.ReactNode }) {
  const [completed, setCompleted] = useState<Set<JourneyStep>>(new Set());
  const [currentGuide, setGuide] = useState<JourneyStep | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('rems-journey') ?? '[]') as JourneyStep[];
      if (saved.length) setCompleted(new Set(saved));
    } catch { /* ignore */ }
  }, []);

  const markDone = useCallback((step: JourneyStep) => {
    setCompleted(prev => {
      const next = new Set(prev);
      next.add(step);
      localStorage.setItem('rems-journey', JSON.stringify([...next]));
      return next;
    });
  }, []);

  return (
    <Ctx.Provider value={{ completed, markDone, currentGuide, setGuide }}>
      {children}
    </Ctx.Provider>
  );
}

export const useJourney = () => useContext(Ctx);
