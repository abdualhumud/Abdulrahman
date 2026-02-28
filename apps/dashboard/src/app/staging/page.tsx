'use client';

import { LanguageProvider } from '@/lib/language-context';
import { JourneyProvider }  from '@/lib/journey-context';
import { ModeProvider }     from '@/lib/mode-context';
import AppShell             from '@/components/AppShell';

/**
 * Staging / Trial entry point — served at /Abdulrahman/staging/
 *
 * - envMode='staging': login/register gate → per-user isolated localStorage.
 * - storageType="session": language & journey session keys use sessionStorage
 *   and reset when the browser tab is closed.
 * - Each user's property data is scoped by userId in localStorage
 *   (rems-staging-{userId}-units, etc.) to ensure multi-tenant isolation.
 * - Strict onboarding + Payment step 4 (promo code) required on first login.
 */
export default function StagingPage() {
  return (
    <ModeProvider envMode="staging">
      <LanguageProvider storageType="session">
        <JourneyProvider storageType="session">
          <AppShell />
        </JourneyProvider>
      </LanguageProvider>
    </ModeProvider>
  );
}
