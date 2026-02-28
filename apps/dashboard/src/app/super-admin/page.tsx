'use client';

import { LanguageProvider } from '@/lib/language-context';
import { ModeProvider }     from '@/lib/mode-context';
import SuperAdminPage       from '@/components/dashboard/SuperAdminPage';

/**
 * Super-Admin Portal — served at /Abdulrahman/super-admin/
 *
 * PIN-gated owner control panel. Contains:
 *  • Promo Code Manager — create, edit, delete, monitor discount codes
 *  • Business Intelligence — staging account overview, unit counts
 *  • Activity Log — in-session audit trail
 *  • Global Settings — PIN management, maintenance mode
 *
 * This route is intentionally not linked from any navigation menu.
 * Access is by direct URL only.
 */
export default function SuperAdminEntry() {
  return (
    <ModeProvider envMode="superAdmin">
      <LanguageProvider storageType="local">
        <SuperAdminPage />
      </LanguageProvider>
    </ModeProvider>
  );
}
