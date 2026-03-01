'use client';

import { LanguageProvider } from '@/lib/language-context';
import { JourneyProvider }  from '@/lib/journey-context';
import { ModeProvider }     from '@/lib/mode-context';
import AppShell             from '@/components/AppShell';

/**
 * Demo / Sandbox entry point — served at /Abdulrahman/demo/
 *
 * - isDemo={true}: onboarding is pre-completed, full mock data pre-loaded.
 * - storageType="local-demo": language & journey state lives in localStorage
 *   under demo-specific keys ('rems-lang-demo', 'rems-journey-demo'), isolated
 *   from production keys and persisting across browser sessions.
 */
export default function DemoPage() {
  return (
    <ModeProvider isDemo={true}>
      <LanguageProvider storageType="local-demo">
        <JourneyProvider storageType="local-demo">
          <AppShell />
        </JourneyProvider>
      </LanguageProvider>
    </ModeProvider>
  );
}
