'use client';

import { LanguageProvider } from '@/lib/language-context';
import { JourneyProvider }  from '@/lib/journey-context';
import { ModeProvider }     from '@/lib/mode-context';
import AppShell             from '@/components/AppShell';

/**
 * Production entry point — served at /Abdulrahman/
 *
 * - isDemo={false}: strict onboarding gate, cannot be skipped.
 * - storageType="local": language & journey state persists in localStorage.
 */
export default function Home() {
  return (
    <ModeProvider isDemo={false}>
      <LanguageProvider storageType="local">
        <JourneyProvider storageType="local">
          <AppShell />
        </JourneyProvider>
      </LanguageProvider>
    </ModeProvider>
  );
}
