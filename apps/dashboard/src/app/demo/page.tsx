'use client';

import { LanguageProvider } from '@/lib/language-context';
import { JourneyProvider }  from '@/lib/journey-context';
import { ModeProvider }     from '@/lib/mode-context';
import AppShell             from '@/components/AppShell';

/**
 * Demo / Sandbox entry point — served at /Abdulrahman/demo/
 *
 * - isDemo={true}: onboarding is pre-completed, full mock data pre-loaded.
 * - storageType="session": language & journey state lives in sessionStorage
 *   and resets when the browser tab is closed — preventing demo state from
 *   contaminating the user's production localStorage.
 */
export default function DemoPage() {
  return (
    <ModeProvider isDemo={true}>
      <LanguageProvider storageType="session">
        <JourneyProvider storageType="session">
          <AppShell />
        </JourneyProvider>
      </LanguageProvider>
    </ModeProvider>
  );
}
