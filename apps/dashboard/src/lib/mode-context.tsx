'use client';

import { createContext, useContext } from 'react';

/** The four deployment environments */
export type EnvMode = 'production' | 'demo' | 'staging' | 'superAdmin';

interface ModeCtx {
  envMode: EnvMode;
  /** Convenience: true when envMode === 'demo' */
  isDemo: boolean;
  /** Convenience: true when envMode === 'staging' */
  isStaging: boolean;
  /** Convenience: true when envMode === 'superAdmin' */
  isSuperAdmin: boolean;
}

const ModeContext = createContext<ModeCtx>({
  envMode: 'production',
  isDemo: false,
  isStaging: false,
  isSuperAdmin: false,
});

export function ModeProvider({
  envMode,
  /** @deprecated Use envMode='demo' instead */
  isDemo: isdemoProp,
  children,
}: {
  envMode?: EnvMode;
  isDemo?: boolean;
  children: React.ReactNode;
}) {
  // Backward-compat: accept old isDemo boolean prop
  const resolved: EnvMode = envMode ?? (isdemoProp ? 'demo' : 'production');
  const value: ModeCtx = {
    envMode:    resolved,
    isDemo:     resolved === 'demo',
    isStaging:  resolved === 'staging',
    isSuperAdmin: resolved === 'superAdmin',
  };
  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export const useMode = () => useContext(ModeContext);
