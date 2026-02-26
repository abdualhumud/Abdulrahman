'use client';

import { createContext, useContext } from 'react';

interface ModeCtx {
  /** true = Demo / Sandbox environment, false = Production */
  isDemo: boolean;
}

const ModeContext = createContext<ModeCtx>({ isDemo: false });

export function ModeProvider({
  isDemo,
  children,
}: {
  isDemo: boolean;
  children: React.ReactNode;
}) {
  return <ModeContext.Provider value={{ isDemo }}>{children}</ModeContext.Provider>;
}

export const useMode = () => useContext(ModeContext);
