# CLAUDE.md — Real Estate Management System (REMS)

Developer reference for the REMS monorepo. Captures all architectural decisions, constraints, patterns, and lessons learned across the full build.

---

## Project Overview

A bilingual (Arabic/English) SaaS property management dashboard for Saudi property owners. Built as a static Next.js export deployed to GitHub Pages. Covers the full operational workflow: property listing → OTA channel sync → bookings → guest checkout → cleaning assignment → financial reporting.

**Live URLs:**
| Environment | URL | Purpose |
|---|---|---|
| Landing | `https://abdualhumud.github.io/REMS/landing/` | Public marketing page — bilingual, no auth |
| Terms | `https://abdualhumud.github.io/REMS/terms/` | Terms of Service — bilingual, linked from landing |
| Production | `https://abdualhumud.github.io/REMS/` | Live SaaS core — strict onboarding |
| Demo/Sandbox | `https://abdualhumud.github.io/REMS/demo/` | Sales demo — pre-loaded mock data |
| Staging/Trial | `https://abdualhumud.github.io/REMS/staging/` | 14-day free trial — multi-tenant, login-gated |
| Super-Admin | `https://abdualhumud.github.io/REMS/super-admin/` | Owner control panel — PIN-gated |

---

## Monorepo Structure

```
/home/user/REMS/
├── CLAUDE.md                          # This file
├── package-lock.json                  # ROOT-level lockfile (shared)
├── package.json                       # Root workspace config
└── apps/
    └── dashboard/
        ├── .github/
        │   └── workflows/
        │       └── deploy.yml         # Auto-deploy to GitHub Pages
        ├── next.config.js             # basePath + static export
        ├── package.json
        ├── tailwind.config.ts
        ├── src/
        │   ├── app/
        │   │   ├── page.tsx           # Production entry (envMode='production')
        │   │   ├── landing/
        │   │   │   └── page.tsx       # Public marketing page (self-contained, no contexts)
        │   │   ├── terms/
        │   │   │   └── page.tsx       # Terms of Service (bilingual, self-contained)
        │   │   ├── demo/
        │   │   │   └── page.tsx       # Demo entry (envMode='demo')
        │   │   ├── staging/
        │   │   │   └── page.tsx       # Staging/Trial entry (envMode='staging')
        │   │   ├── super-admin/
        │   │   │   └── page.tsx       # Super-Admin entry (envMode='superAdmin')
        │   │   ├── layout.tsx
        │   │   └── globals.css
        │   ├── components/
        │   │   ├── AppShell.tsx       # Shared app logic for production/demo/staging
        │   │   ├── layout/
        │   │   │   ├── Sidebar.tsx
        │   │   │   ├── TopBar.tsx
        │   │   │   ├── DemoBanner.tsx    # Amber banner shown only in demo mode
        │   │   │   ├── StagingBanner.tsx # Violet banner shown only in staging mode
        │   │   │   └── JourneyBanner.tsx
        │   │   └── dashboard/
        │   │       ├── OnboardingPage.tsx  # Steps 1-3 (+ Step 4 payment when showPayment=true)
        │   │       ├── SuperAdminPage.tsx  # PIN-gated owner control panel
        │   │       ├── OverviewPage.tsx
        │   │       ├── PropertiesPage.tsx
        │   │       ├── BookingsPage.tsx
        │   │       ├── CalendarPage.tsx
        │   │       ├── ChannelsPage.tsx
        │   │       ├── CleaningPage.tsx
        │   │       ├── InboxPage.tsx
        │   │       ├── AnalyticsPage.tsx
        │   │       └── FinancialsPage.tsx
        │   └── lib/
        │       ├── icons.tsx              # All icons as inline SVG functions
        │       ├── i18n.ts                # Full EN/AR translation object
        │       ├── mock-data.ts           # All static data
        │       ├── saudi-cities.ts        # Saudi city/neighbourhood/GPS data
        │       ├── mode-context.tsx       # envMode: 'production'|'demo'|'staging'|'superAdmin'
        │       ├── language-context.tsx   # storageType: 'local'|'session'
        │       ├── journey-context.tsx    # storageType: 'local'|'session'
        │       ├── promo-service.ts       # Promo code CRUD + validation (localStorage-backed)
        │       ├── staging-auth.ts        # Multi-tenant auth for staging (per-user localStorage)
        │       ├── spl-service.ts         # SPL National Address API client + localStorage key helper
        │       ├── booking-com-service.ts # Booking.com Connectivity API client
        │       ├── overlap-guard.ts       # Exclusive-lock overlap prevention engine
        │       ├── gathern-service.ts     # Gathern REST/JSON bridge + poller
        │       ├── airbnb-service.ts      # Airbnb Partner API (OAuth 2.0 + webhooks)
        │       └── reservation-engine.ts  # Centralised <500ms transaction engine
        └── tests/
        │   └── test-integration.mjs      # 69-test plain Node.js suite (no framework)
        └── out/                           # Static export output (gitignored)
```

---

## Landing Page (`src/app/landing/page.tsx`)

Self-contained marketing page served at `/REMS/landing/`. Does **not** use any React context (`ModeProvider`, `LanguageProvider`, etc.) — it manages its own `lang` and `dark` state internally.

### Architecture

- **Bilingual EN/AR**: all copy lives in a local `T` object at the top of the file (same pattern as the dashboard's `i18n.ts` but scoped to this page only)
- **Dark mode**: toggled via `document.documentElement.classList.add('dark')` — reverted on unmount
- **RTL**: set via `document.documentElement.dir` — reverted on unmount
- **No external icon library**: inline SVG paths via a local `FeatureIcon` helper
- **No routing**: single-page scroll; anchor links (`#about`, `#contact`) for in-page navigation

### Sections (in order)

| Section | Notes |
|---|---|
| Sticky nav | Logo, About/Contact/Terms links, dark mode toggle, lang toggle, Demo/Login/Get Started CTAs |
| Hero | Animated orbs, grid background, shimmer CTA button, 4-stat grid |
| Partners ticker | CSS `animation: ticker` infinite scroll, pauses on hover, masked edges |
| Features | 6-card grid with `feature-card` hover lift animation |
| About | 3-act brand story (The Problem / The Solution / The Vision) |
| Pricing | 3 plans; popular plan uses `price-popular` gradient + `md:scale-105` |
| FAQ | Accordion with `max-height` CSS transition (no JS animation library) |
| Contact | `ContactSection` component — form fields, tel/email links, social links |
| Footer CTA banner | Full-width `cta-bg` gradient + large CTA button |
| Footer | Logo, nav links, copyright, back-to-top button |

### Key Constants

```tsx
const PROD_URL    = 'https://abdualhumud.github.io/REMS/';
const STAGING_URL = 'https://abdualhumud.github.io/REMS/staging/';
const DEMO_URL    = 'https://abdualhumud.github.io/REMS/demo/';
```

### CSS Animation Classes (defined in inline `<style>`)

| Class | Effect |
|---|---|
| `.shimmer-btn` | Gradient background sweep — used on primary CTAs |
| `.grad-text` | Animated gradient text fill — hero headline accent |
| `.hero-orb` / `.hero-orb-2` | Pulsing blurred orb decorations |
| `.float-card` | Slow floating bob animation |
| `.fade-in-0` … `.fade-in-4` | Staggered `fadeInUp` entrance animations |
| `.ticker-inner` | Infinite horizontal scroll for partner chips |
| `.feature-card` | Cubic-bezier hover lift + shadow |
| `.story-card` | Hover lift for About section cards |
| `.price-popular` | Dark blue gradient + heavy drop shadow for highlighted plan |
| `.faq-body` | `max-height` + `opacity` transition for accordion |

### `PartnerChip` component

Renders a colored pill with abbreviation + full name for the partners ticker. Defined inline in `landing/page.tsx` — does not use the global icon system.

---

## Terms of Service Page (`src/app/terms/page.tsx`)

Self-contained legal page at `/REMS/terms/`. Linked from the landing page nav and footer.

- **14 sections** covering: acceptance, service description, accounts, payment, promo codes, data/privacy, OTA integrations, SPL, acceptable use, availability, liability, modifications, governing law, contact
- **Bilingual**: local `T` object with `en`/`ar` variants — same self-contained pattern as the landing page
- **RTL**: set/reverted via `useEffect` on lang change
- **Sticky nav**: back-to-home link, REMS logo, language toggle
- **No contexts, no external dependencies**

---

## Deployment Pipeline

### Constraint: Local Git Proxy

The local git environment runs through a proxy at `127.0.0.1` that **only allows pushes to branches matching `claude/**`**. Direct pushes to `gh-pages` or `main` return HTTP 403.

### Solution: GitHub Actions

GitHub Actions uses `GITHUB_TOKEN` which bypasses the local proxy entirely.

**`.github/workflows/deploy.yml`:**
```yaml
on:
  push:
    branches: ['claude/**']
    paths: ['apps/dashboard/**']

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: package-lock.json   # ROOT lockfile, not apps/dashboard/
      - run: npm install --prefix apps/dashboard
      - run: npm run build
        working-directory: apps/dashboard
        env: { NODE_ENV: production }
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: apps/dashboard/out
          force_orphan: true
```

**Critical:** `cache-dependency-path: package-lock.json` must point to the **root** lockfile. `apps/dashboard/package-lock.json` does not exist — install is always done via `npm install --prefix apps/dashboard` from the root.

### Branch Naming

Always develop on `claude/<feature-name>-<SESSION_ID>`. Push with:
```bash
git push -u origin claude/<branch-name>
```

---

## Next.js Configuration

**`next.config.js`:**
```js
const isProd = process.env.NODE_ENV === 'production';
const nextConfig = {
  output: 'export',          // Static HTML export — no server required
  trailingSlash: true,       // GitHub Pages needs trailing slashes
  images: { unoptimized: true },  // next/image doesn't work with static export
  basePath:    isProd ? '/Abdulrahman' : '',
  assetPrefix: isProd ? '/Abdulrahman/' : '',
};
module.exports = nextConfig;
```

**Why basePath?** GitHub Pages serves the app at `username.github.io/Abdulrahman/` (subdirectory), not at the root. Without `basePath`, all asset URLs will 404.

---

## React Context Architecture

### Mode Context (`mode-context.tsx`)

Provides the environment mode to all components. Four environments are supported via a union type.

```tsx
export type EnvMode = 'production' | 'demo' | 'staging' | 'superAdmin';

interface ModeCtx {
  envMode:     EnvMode;
  isDemo:      boolean;   // envMode === 'demo'
  isStaging:   boolean;   // envMode === 'staging'
  isSuperAdmin: boolean;  // envMode === 'superAdmin'
}

export function ModeProvider({
  envMode,
  isDemo: isdemoProp,   // backward-compat: treated as envMode='demo'
  children,
}: {
  envMode?: EnvMode;
  isDemo?: boolean;
  children: React.ReactNode;
}) {
  const resolved: EnvMode = envMode ?? (isdemoProp ? 'demo' : 'production');
  const value = {
    envMode: resolved,
    isDemo:       resolved === 'demo',
    isStaging:    resolved === 'staging',
    isSuperAdmin: resolved === 'superAdmin',
  };
  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}
export const useMode = () => useContext(ModeContext);
```

**Usage example:**
```tsx
const { isDemo, isStaging, envMode } = useMode();
const units = isDemo ? UNITS : loadFromLocalStorage();  // data-layer bifurcation
```

### Language Context (`language-context.tsx`)

Manages EN/AR bilingual switching with RTL/LTR document direction.

```tsx
type AnyTranslation = typeof translations.en | typeof translations.ar;
// IMPORTANT: Use union type, NOT just typeof translations.en
// Otherwise TypeScript infers dir: "ltr" literal and rejects dir: "rtl"

interface LangCtx {
  lang: 'en' | 'ar';
  t: AnyTranslation;
  toggle: () => void;
}
```

**`storageType` prop** — controls which storage backend is used:
```tsx
export function LanguageProvider({ children, storageType = 'local' }: {
  children: React.ReactNode;
  storageType?: 'local' | 'session';  // 'local' → localStorage, 'session' → sessionStorage
}) {
  const KEY = storageType === 'session' ? 'rems-lang-demo' : 'rems-lang';
  // reads/writes to sessionStorage (demo) or localStorage (production)
}
```

| Mode | storageType | Storage key | Resets on… |
|---|---|---|---|
| Production | `'local'` | `rems-lang` | Never (persists) |
| Demo | `'session'` | `rems-lang-demo` | Tab close |

**RTL switching:**
```tsx
useEffect(() => {
  document.documentElement.dir  = t.dir;   // 'ltr' | 'rtl'
  document.documentElement.lang = lang;
}, [lang]);
```

### Journey Context (`journey-context.tsx`)

Tracks 4-step onboarding completion. Steps are a union type for type safety.

```tsx
export type JourneyStep = 1 | 2 | 3 | 4;
// Step 1: Register (complete onboarding)
// Step 2: Add Unit (save first property)
// Step 3: Connect Channels (force sync any channel)
// Step 4: Go Live (arrive at overview with steps 1-3 done)
```

**`storageType` prop** — mirrors LanguageProvider pattern:
```tsx
export function JourneyProvider({ children, storageType = 'local' }: {
  children: React.ReactNode;
  storageType?: 'local' | 'session';
}) {
  const KEY = storageType === 'session' ? 'rems-journey-demo' : 'rems-journey';
}
```

| Mode | storageType | Storage key |
|---|---|---|
| Production | `'local'` | `rems-journey` |
| Demo | `'session'` | `rems-journey-demo` |

**Critical placement rule:** `JourneyProvider` must wrap the **entire** `App` including the onboarding conditional. If placed after `if (showOnboarding) return <OnboardingPage />`, the onboarding page cannot call `useJourney()`.

**Correct pattern in `page.tsx`:**
```tsx
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
```

### Journey Step Wiring

| Step | Where `markDone()` fires | Trigger |
|------|--------------------------|---------|
| 1 | `AppShell.tsx` → `completeOnboarding()` | User finishes OnboardingPage (any mode) |
| 2 | `PropertiesPage.tsx` → `handleSave()` | User adds first unit (not edit) |
| 3 | `ChannelsPage.tsx` → `forceSync()` | User force-syncs any channel |
| 4 | `OverviewPage.tsx` → `useEffect` | Auto-fires when `completed.size >= 3` |

---

## Four-Environment Architecture

The app ships as **four independent entry points** served from the same static Next.js export, all sharing the same `AppShell` and component tree.

### Environment Routing Summary

| Path | `envMode` | storageType | Auth Gate | Onboarding |
|---|---|---|---|---|
| `/Abdulrahman/` | `'production'` | `'local'` | None | Strict, 4-step + payment |
| `/Abdulrahman/demo/` | `'demo'` | `'session'` | None | Pre-skipped |
| `/Abdulrahman/staging/` | `'staging'` | `'session'` | Login/Register | Strict, 4-step + payment |
| `/Abdulrahman/super-admin/` | `'superAdmin'` | `'local'` | PIN (default: 1234) | N/A |

### `ModeContext` — `envMode` Union

```tsx
export type EnvMode = 'production' | 'demo' | 'staging' | 'superAdmin';

interface ModeCtx {
  envMode: EnvMode;
  isDemo:      boolean;   // envMode === 'demo'
  isStaging:   boolean;   // envMode === 'staging'
  isSuperAdmin: boolean;  // envMode === 'superAdmin'
}
```

Backward-compat: `ModeProvider` still accepts `isDemo?: boolean` (treated as `envMode='demo'`).

---

## Four-Environment Comparison

The app ships as **four independent entry points** from the same static Next.js export, sharing all components through `AppShell`.

### Full Environment Matrix

| Concern | Production (`/`) | Demo (`/demo/`) | Staging (`/staging/`) | Super-Admin (`/super-admin/`) |
|---|---|---|---|---|
| Entry file | `src/app/page.tsx` | `src/app/demo/page.tsx` | `src/app/staging/page.tsx` | `src/app/super-admin/page.tsx` |
| `envMode` | `'production'` | `'demo'` | `'staging'` | `'superAdmin'` |
| storageType | `'local'` | `'session'` | `'session'` | `'local'` |
| Auth gate | None | None | Login / Register | PIN (default: 1234) |
| Onboarding | Strict, 4 steps + payment | Pre-skipped | Strict, 4 steps + payment | N/A |
| Unit data source | `localStorage` (`rems-prod-units`) | `UNITS` mock array | `localStorage` (per-user key) | N/A |
| Data lifetime | Permanent | Resets on tab close | Per-user, persistent | Permanent |
| Banner | None | Amber `DemoBanner` | Violet `StagingBanner` + user name | None |

### AppShell (`src/components/AppShell.tsx`)

Shared component handling all routing, auth gates, banners, and onboarding for production / demo / staging. Super-Admin renders `SuperAdminPage` directly and does not use `AppShell`.

```tsx
export default function AppShell() {
  const { isDemo, isStaging, envMode } = useMode();
  const [stagingUser, setStagingUser] = useState<StagingUser | null>(null);

  useEffect(() => {
    if (isDemo) {
      // Pre-mark all journey steps, skip onboarding entirely
      markDone(1); markDone(2); markDone(3); markDone(4);
      setShowOnboarding(false);
    } else if (isStaging) {
      // Check existing session — show auth gate if not logged in
      const session = getStagingSession();
      setStagingUser(session);
      if (session) {
        const done = localStorage.getItem(stagingOnboardingKey(session.id));
        if (!done) setShowOnboarding(true);
      }
    } else {
      // Production: gate on localStorage 'rems-onboarding-done' flag
      const done = localStorage.getItem('rems-onboarding-done');
      if (!done) setShowOnboarding(true);
    }
  }, [isDemo, isStaging]);

  // Staging: show auth gate before anything else
  if (isStaging && !stagingUser) {
    return <StagingAuthGate onAuth={setStagingUser} />;
  }

  return (
    <>
      {isDemo    && <DemoBanner />}
      {isStaging && <StagingBanner user={stagingUser} onLogout={handleLogout} />}
      {showOnboarding
        ? <OnboardingPage onComplete={completeOnboarding} strictMode={true} showPayment={true} />
        : <MainLayout ... />}
    </>
  );
}
```

### Strict Onboarding (`OnboardingPage`)

Called with `strictMode={true} showPayment={true}` in both Production and Staging. Steps:

| Step | Required fields |
|---|---|
| Step 1 — Business Info | CR Number (≥7 chars), VAT Number (≥10 chars), City, District, Street |
| Step 2 — Personal Info | Full Name, Email (contains `@`), Phone (≥9 chars), National ID (≥9 chars) |
| Step 3 — First Property | "Add Property Now" CTA (navigates to Properties) |
| Step 4 — Payment | Plan selection + optional promo code; confirms registration |

**`showPayment` prop:** Controls whether Step 4 (payment/plan) is rendered.
```tsx
interface OnboardingPageProps {
  onComplete: (plan?: string, promoCode?: string) => void;
  strictMode?: boolean;
  showPayment?: boolean;   // true → 4 steps; false → 3 steps
}
```

**Behaviour differences when `strictMode={true}`:**
- "Skip" button is hidden
- "Next" button is disabled (`opacity-40 cursor-not-allowed`) until all required fields pass
- Progress bar shown at top of card with live percentage

### Production Data Layer (`PropertiesPage`)

In production/staging mode, units are stored in and loaded from `localStorage`:

```tsx
const PROD_UNITS_KEY = 'rems-prod-units';

function loadProdUnits(): Unit[] {
  try {
    const raw = localStorage.getItem(PROD_UNITS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

const { isDemo } = useMode();
const [units, setUnits] = useState<Unit[]>(() =>
  isDemo ? (UNITS as Unit[]) : loadProdUnits(),
);

// On save (new unit):
if (!isDemo) localStorage.setItem(PROD_UNITS_KEY, JSON.stringify(nextUnits));
```

**Empty state:** When `units.length === 0 && !isDemo`, a placeholder card is shown with a CTA to add the first property.

### DemoBanner (`src/components/layout/DemoBanner.tsx`)

Amber strip shown at the very top of every page in demo mode. Contains:
- Flask SVG icon, DEMO badge
- Banner text explaining ephemeral nature
- "Switch to Production →" link pointing to the production URL

### StagingBanner (`src/components/layout/StagingBanner.tsx`)

Violet gradient strip shown in staging mode. Contains:
- Beaker icon, TRIAL badge
- Active user's name (e.g. "Logged in as Ahmed Al-Rashidi")
- "Switch to Production →" link
- "Sign Out" button → calls `logoutStagingUser()` + reloads page

---

## Staging Multi-Tenancy

Each staging user gets completely isolated data in `localStorage`, keyed by their generated user ID.

### User Registration & Session

```ts
// staging-auth.ts

export interface StagingUser {
  id: string;           // 'user_<timestamp36>_<random5>'
  email: string;
  passwordB64: string;  // btoa(password) — demo-only, NOT production-safe
  name: string;
  companyName: string;
  createdAt: string;
  plan: string;
  promoCode: string;
}

// All registered users: localStorage['rems-staging-users']
// Active session:       sessionStorage['rems-staging-session']  ← resets on tab close
```

### Per-User Storage Keys

```ts
stagingUnitsKey(userId)      // 'rems-staging-{id}-units'
stagingJourneyKey(userId)    // 'rems-staging-{id}-journey'
stagingLangKey(userId)       // 'rems-staging-{id}-lang'
stagingOnboardingKey(userId) // 'rems-staging-{id}-onboarding'
```

### Auth Gate (`StagingAuthGate` in `AppShell`)

Inline component rendered when `isStaging && !stagingUser`. Presents a two-mode panel (Login tab / Register tab). On success, calls `setStagingUser(user)` to proceed into the main app.

```tsx
// Register flow
const result = registerStagingUser(email, password, name, company, plan, promo);
if (result.ok) { onAuth(result.user); }

// Login flow
const user = loginStagingUser(email, password);
if (user) { onAuth(user); }
```

### Cross-Contamination Prevention

- **Session storage for active session**: `sessionStorage['rems-staging-session']` resets when the tab closes, requiring re-login — preventing one user's identity leaking to another browser session.
- **User-scoped data keys**: Each user's units, journey state, language, and onboarding completion are stored under `rems-staging-{id}-*` keys. Two registered users on the same browser never share data.
- **No sessionStorage for data**: Only the session token is in sessionStorage. User data persists in localStorage so users can return and resume.

---

## Promo Code Service (`promo-service.ts`)

Promo codes are managed entirely client-side in `localStorage['rems-promo-codes']`.

### Default Seed Codes

| Code | Discount | Max Uses | Expires | Active |
|---|---|---|---|---|
| `REMS2026` | 20% | 100 | 2026-12-31 | Yes |
| `LAUNCH50` | 50% | 50 | 2026-06-30 | Yes |
| `EARLYBIRD` | 30% | Unlimited | Never | Yes |
| `PARTNER15` | 15% | 200 | Never | No |

### Key Functions

```ts
validatePromoCode(rawCode: string): PromoValidationResult
// Returns: { valid, discount (0 if invalid), message, code? }
// Checks: exists → active → maxUses → expiresAt (in that order)

redeemPromoCode(rawCode: string): void
// Increments usedCount — call AFTER checkout confirms

createPromoCode(partial: Omit<PromoCode, 'usedCount'|'createdAt'>): void
updatePromoCode(code: string, patch: Partial<PromoCode>): void
deletePromoCode(code: string): void
getPromoCodes(): PromoCode[]
```

### Payment Step Integration (OnboardingPage Step 4)

```tsx
// Real-time validation as user types
const result = validatePromoCode(promoInput);
setPromoResult(result);
if (result.valid) setPromoApplied(result.code ?? '');

// Price calculation
const BASE_PRICES = { basic: 149, pro: 349, enterprise: 799 };
const discountPct = promoApplied ? (promoResult?.discount ?? 0) : 0;
const discounted = Math.round(basePrice * (1 - discountPct / 100));

// On final confirm
await redeemPromoCode(promoApplied);   // increments usedCount
onComplete(selectedPlan, promoApplied);
```

---

## Super-Admin Portal (`SuperAdminPage.tsx`)

Served at `/super-admin/`. PIN-gated — not linked from any navigation menu (access by direct URL only).

### PIN Gate

Default PIN: `1234`. Stored in `localStorage['rems-superadmin-pin']`.

```tsx
function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const storedPin = localStorage.getItem('rems-superadmin-pin') ?? '1234';
  if (entered === storedPin) onUnlock();
  // Shows: dark centered screen, password input, "Access Super-Admin" button
}
```

### Sections / Tabs

| Tab | Content |
|---|---|
| Promo Manager | Create / edit / delete / monitor promo codes (table + form) |
| Business Intelligence | KPI cards (total accounts, active users, plans) + staging accounts table |
| Activity Log | Session-level audit trail (`sessionStorage['rems-superadmin-logs']`) |
| Global Settings | PIN change form + maintenance mode toggle |

### Activity Log Pattern

```ts
function appendLog(event: string) {
  const logs = JSON.parse(sessionStorage.getItem('rems-superadmin-logs') ?? '[]');
  logs.unshift({ time: new Date().toLocaleTimeString(), event, user: 'Super Admin' });
  sessionStorage.setItem('rems-superadmin-logs', JSON.stringify(logs.slice(0, 200)));
}
// Called on: code create, edit, delete, PIN change, maintenance toggle
```

### BI Panel — Account Summaries

Reads `getStagingAccountSummaries()` from `staging-auth.ts`:
```ts
// Returns array of:
{
  id, name, email, companyName,
  plan,       // chosen subscription plan
  promoCode,  // promo code used at registration
  createdAt,
  unitCount,  // live count from localStorage key
}
```

---

## Internationalisation (i18n)

All copy lives in `src/lib/i18n.ts` as a single typed object with `en` and `ar` keys.

**Structure:**
```ts
export const translations = {
  en: {
    dir: 'ltr' as const,
    nav: { overview, properties, bookings, calendar, channels, cleaning, inbox, analytics, financials },
    common: { sar, viewAll, save, cancel, ... },
    overview: { greeting, subtitle, monthlyRevenue, ... },
    kpi: { totalRevenue, netPayout, occupancy, adr, revpar, bookings, ... },
    table: { guest, property, channel, dates, amount, status },
    status: { CONFIRMED, CHECKED_IN, CHECKED_OUT, PENDING },
    cleaning: {  // 32 keys
      title, status_PENDING, status_ASSIGNED, status_IN_PROGRESS,
      status_COMPLETED, status_INSPECTION_DONE,
      unitHidden, unitVisible, autoTrigger, ...
    },
    journey: {   // 9 keys
      title, step1, step2, step3, step4, done, current, pending, goTo, nextStep
    },
    demo: {      // 6 keys — Demo banner + mode indicators
      badge,           // 'DEMO'
      banner,          // 'Sandbox Demo Environment'
      bannerSub,       // 'Pre-loaded with sample data. All changes reset when you close this tab.'
      tryProd,         // 'Switch to Production →'
      resetNote,       // 'Demo data resets on tab close'
    },
    onboarding: { // strict-mode additions
      strictNotice,    // 'All fields are mandatory — this setup cannot be bypassed.'
      step3TitleProd,  // 'Add Your First Property'
      firstUnitBtn,    // 'Add Property Now'
      firstUnitHint,   // 'You will be taken to the Properties page...'
      progressPct,     // '% complete'
      fieldRequired,   // 'Required'
    },
    payment: {   // Step 4 — Plan + Promo Code
      title,           // 'Choose Your Plan'
      subtitle,        // 'Start your 14-day free trial'
      planBasic,       // 'SAR 149/mo'  (display string)
      planPro,         // 'SAR 349/mo'
      planEnt,         // 'SAR 799/mo'
      planBasicRaw: 149,  // numeric — used for discount arithmetic
      planProRaw:   349,
      planEntRaw:   799,
      promoPlaceholder, promoApply, promoApplied, promoInvalid,
      summaryTitle, summaryPlan, summaryDiscount, summaryTotal,
      confirm,         // 'Confirm & Launch'
    },
    staging: {   // Staging auth gate + banner
      loginTitle, loginEmail, loginPassword, loginBtn, loginError,
      registerTitle, registerName, registerCompany, registerEmail,
      registerPassword, registerBtn, registerError, registerExists,
      banner,          // 'Trial / Staging Environment'
      bannerSub,       // 'Your data is saved between sessions.'
      loggedInAs,      // 'Logged in as'
      signOut,         // 'Sign Out'
      switchProd,      // 'Switch to Production →'
    },
    superAdmin: { // Super-Admin portal
      pinTitle,        // 'Super-Admin Access'
      pinPlaceholder,  // 'Enter PIN'
      pinBtn,          // 'Access Super-Admin'
      pinError,        // 'Incorrect PIN'
      tabs: { promo, bi, logs, settings },
      // Promo Manager
      promoTitle, promoCode, promoDiscount, promoMaxUses, promoUsed,
      promoExpires, promoActive, promoActions, promoCreate, promoEdit, promoDelete,
      // BI Panel
      biTitle, biAccounts, biUnits, biPlans,
      // Logs Panel
      logsTitle, logsTime, logsEvent, logsUser, logsClear,
      // Settings
      settingsTitle, pinCurrent, pinNew, pinConfirm, pinChange,
      maintenanceMode, maintenanceOn, maintenanceOff,
    },
    channels: {  // 60+ keys — IntegrationMonitor + Airbnb + Ultimate Overlap
      // IntegrationMonitor
      integMonitor, authFlow, authStep1, authStep2, authStep3,
      overlapGuard, guardUnit, guardChannel, guardCheckIn, guardCheckOut, guardSimulate,
      syncLog, ...guardStep labels, ...log labels,
      // Airbnb panel
      airbnbTitle, airbnbOAuth, airbnbWebhook, airbnbIcal,
      // Ultimate Overlap panel
      ultimateTitle, ultimateDesc,
      phasePreCheck, phaseLock, phaseCommit, phaseBroadcast,
      txLog, txConfirmed, txOverlap, avgLatency, maxLatency, totalTx,
      runDemo, running, channelBlock,
    },
  },
  ar: { /* mirror of en with Arabic strings, dir: 'rtl' as const */ }
};
```

**Usage in components:**
```tsx
const { t, lang } = useLang();
// String lookup: t.cleaning.title
// Manual lang check for names: lang === 'ar' ? 'عبدالرحمن' : firstName
```

---

## Icon System

All icons are inline SVG functions in `src/lib/icons.tsx`. No external icon library.

**Pattern:**
```tsx
interface IconProps { size?: number; className?: string; }

const Icon = ({ size = 18, className = '', d }: IconProps & { d: string[] }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round"
    strokeLinejoin="round" className={className}>
    {d.map((path, i) => <path key={i} d={path} />)}
  </svg>
);

export const Icons = {
  overview:    (p: IconProps) => <Icon {...p} d={['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z']} />,
  // ... all icons
};
```

**Adding a new icon:** Find SVG path data from heroicons.com or similar, add entry to `Icons` object, add key to `keyof typeof Icons` usage sites.

---

## Data Models (`mock-data.ts`)

### Key Exports

```ts
OWNER                // { fullName, email, phone, plan }
KPI_DATA             // { totalRevenue, netPayout, averageOccupancy, adr, revPAR, totalBookings, ... }
MONTHLY_REVENUE      // [{ month: string, revenue: number }] × 12
CHANNEL_BREAKDOWN    // [{ channel, revenue, share, color }] × 5
RECENT_BOOKINGS      // [{ id, guest, property, unit, channel, channelColor, checkIn, checkOut, nights, amount, status }]
CHANNEL_SYNC_STATUS  // [{ channel, logo, bg, lastSync, syncMethod, isConnected, bookingsToday, pending, failed }]
UNITS                // [{ id, name, nameAr, type, city, district, street, lat, lng, beds, baths, size, floor,
                     //    basePrice, weekendSurge, seasonalPeak, cleaningFee, securityDeposit, minStay,
                     //    channels[], amenities[], status, occupancy, revenue, photos, insuranceProvider, color }]
CLEANING_REQUESTS    // [{ id, unitId, guestName, bookingId, checkoutDate, status, provider, messages[], ... }]
CLEANING_PROVIDERS   // [{ id, name, type: 'INTERNAL'|'EXTERNAL', rating, available, phone }]
INSURANCE_RECORDS    // [{ bookingId, provider, depositAmount, status: 'HELD'|'PENDING_INSPECTION'|'RELEASED' }]
SHIPMENTS            // [{ shipmentNumber, consigneeName, consigneePhoneNumber, consigneeIdentityNumber,
                     //    senderName, senderPhoneNumber, expectedDeliveryDate, timeWindowFrom, timeWindowTo,
                     //    preferredDeliveryTime, status: ShipmentStatus, address: ShipmentAddress|null, createdAt }]
SHIPMENT_NOTIFICATIONS // [{ id, shipmentNumber, message, time, responseStatus, isRead }]
DAILY_OCCUPANCY      // [{ day: string, rate: number }] — used in AnalyticsPage
```

**Shipment types:**
```ts
export type ShipmentStatus =
  | 'Created' | 'Confirmed' | 'AwaitingPickup' | 'PickedUp'
  | 'ArrivedAtSortingFacility' | 'DepartedSortingFacility' | 'InTransit'
  | 'ArrivedAtDestinationCity' | 'OutForDelivery' | 'Delivered' | 'DeliveryFailed';

export type PreferredDeliveryTime = 'Morning' | 'Afternoon' | 'Evening';

export interface ShipmentAddress {
  code: string; street: string; buildingNo: string; secondaryNo: string;
  district: string; postalCode: string; city: string;
  location: { latitude: number; longitude: number };
  details: string; isDefaultAddress: boolean; isNationalAddress: boolean;
  shortAddress: string; addressName: string;
}
```

**UNITS — key fields for Rate Parity Manager:**
Each unit carries its own `basePrice`, `minStay`, `channels[]`, and `weekendSurge`. Always load these from the selected unit when building per-channel pricing forms — do not use a generic category-level default.

### CleaningStatus Type

```ts
export type CleaningStatus = 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'INSPECTION_DONE';
```

Status progression: `PENDING → ASSIGNED → IN_PROGRESS → COMPLETED → INSPECTION_DONE`

---

## Saudi Geographic Data (`saudi-cities.ts`)

Static reference data for Saudi National Address.

```ts
export const SAUDI_CITIES: Record<string, string[]> = {
  Riyadh: ['Al-Olaya', 'Al-Malaz', 'Al-Nakheel', ...],  // 13 cities
  Jeddah: [...], Mecca: [...], Medina: [...], ...
};

export const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Riyadh: { lat: 24.7136, lng: 46.6753 },
  // ...
};

export const PROPERTY_IMAGES: Record<string, string[]> = {
  APARTMENT: ['https://images.unsplash.com/photo-...?auto=format&fit=crop&w=600&q=75'],
  VILLA: [...], CHALET: [...], STUDIO: [...],
};
```

**Cascading dropdown logic in PropertiesPage:**
```tsx
const handleCityChange = (city: string) => {
  setForm(f => ({
    ...f,
    city,
    district: SAUDI_CITIES[city]?.[0] ?? '',
    lat: CITY_COORDS[city]?.lat ?? f.lat,
    lng: CITY_COORDS[city]?.lng ?? f.lng,
  }));
};
```

---

## SPL National Address API (`spl-service.ts`)

Saudi Post (SPL) official address registry. Provides GPS-accurate building location data for Saudi National Addresses.

**Developer portal:** `https://api.address.gov.sa`
**Base URL:** `https://apina.address.gov.sa/NationalAddress/v3.1`
**Auth:** `api_key` query parameter (from SPL subscription dashboard)
**localStorage key:** `rems-spl-key` — API key stored locally in browser, never sent to third parties.

### Key exports

```ts
// Interfaces
export interface SplAddress {
  buildingNumber: string; additionalNumber: string;
  streetEn: string; districtEn: string; cityEn: string;
  postCode: string; shortAddress: string; regionName: string;
  lat: number; lng: number;
}

// Error classes
export class SplAuthError extends Error {}      // 401/403 or INVALID_API in response
export class SplNotFoundError extends Error {}  // success=false or empty Addresses[]

// Request types
interface SplFreetextRequest { mode: 'freetext'; query: string; apiKey: string; }
interface SplBuildingRequest {
  mode: 'building'; buildingNumber: string;
  additionalNumber?: string; zipCode?: string; apiKey: string;
}
export type SplRequest = SplFreetextRequest | SplBuildingRequest;

// Main lookup
export async function splLookup(req: SplRequest): Promise<SplAddress[]>

// API key localStorage helpers
export function getSplApiKey(): string     // localStorage.getItem('rems-spl-key') ?? ''
export function setSplApiKey(key: string): void
export function clearSplApiKey(): void
```

### ObjLatLng coordinate parsing

SPL returns coordinates in a non-standard format: `"objectId longitude latitude"`.

```ts
// e.g. "30829 46.71670870 24.65017630" → { lat: 24.65, lng: 46.71 }
function parseCoords(raw: string): { lat: number; lng: number }
```

Split on whitespace: `parts[1]` = longitude, `parts[2]` = latitude.

### CORS limitation & fallback strategy

SPL does not publish CORS headers for browser requests. The `NationalAddressField` component handles this silently:

1. **SPL available** (key set, no CORS error): official GPS-accurate result; `verified: true`
2. **CORS/network error**: silently falls through to Nominatim (OpenStreetMap geocoding)
3. **SplAuthError**: shows "Invalid API key" error — no fallback (key problem must be fixed)
4. **SplNotFoundError**: shows "Address not found" error — no fallback

### UnitModal integration

`handleNatAddressAutoFill` accepts a `NatFillResult` (unified type covering both SPL and fallback):

```ts
type NatFillResult = {
  city: string; district: string; street: string;
  lat: number; lng: number;
  verified: boolean;            // true = came from SPL official API
  buildingNumber?: string;
  postCode?: string;
  shortAddress?: string;
};
```

When `verified: true`, the Location section header shows a persistent emerald badge:
`✓ Verified · SPL  RYYY1234` (with short address). Clears when user manually changes city dropdown.

---

## Maps

### Read-only OSM embed (view-only, e.g. unit cards in detail panel)

**No API key needed.** Use OpenStreetMap embed iframe:

```tsx
function OSMMap({ lat, lng, name }: { lat: number; lng: number; name: string }) {
  const src = `https://www.openstreetmap.org/export/embed.html` +
    `?bbox=${lng-0.03},${lat-0.02},${lng+0.03},${lat+0.02}` +
    `&layer=mapnik&marker=${lat},${lng}`;
  return (
    <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
      <iframe src={src} width="100%" height="100%" style={{ border: 0 }}
        loading="lazy" referrerPolicy="no-referrer" title={name} />
    </div>
  );
}
```

bbox formula: `lng ± 0.03` for width, `lat ± 0.02` for height (roughly 3×2 km view).

### Interactive Leaflet map (click-to-pin, drag, flyTo) — no npm install

Load Leaflet from CDN via `useEffect`. Zero new packages, works with static export.

**Key pattern (`LeafletPinMap` in `PropertiesPage.tsx`):**

```tsx
function LeafletPinMap({ lat, lng, name, onCoordsChange, lang }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);
  const markerRef    = useRef<any>(null);
  const initLatRef   = useRef(lat);   // stable initial values for initLeafletMap closure
  const initLngRef   = useRef(lng);

  const initLeafletMap = useCallback(() => {
    if (!containerRef.current || mapRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    // Fix broken default marker icon (common Leaflet + bundler issue)
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: false })
      .setView([initLatRef.current, initLngRef.current], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

    const marker = L.marker([initLatRef.current, initLngRef.current], { draggable: true }).addTo(map);
    marker.on('dragend', () => { const p = marker.getLatLng(); onCoordsChange(p.lat, p.lng); });
    map.on('click', (e: any) => { marker.setLatLng(e.latlng); onCoordsChange(e.latlng.lat, e.latlng.lng); });

    mapRef.current = map; markerRef.current = marker;
  }, [onCoordsChange]);

  // Load CSS + JS once per page session
  useEffect(() => {
    if ((window as any).L) { initLeafletMap(); return; }

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css'; link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    const existing = document.getElementById('leaflet-js') as HTMLScriptElement | null;
    if (!existing) {
      const script = document.createElement('script');
      script.id = 'leaflet-js'; script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = initLeafletMap;
      document.head.appendChild(script);
    } else if ((window as any).L) {
      initLeafletMap();
    } else {
      existing.addEventListener('load', initLeafletMap);
      return () => existing.removeEventListener('load', initLeafletMap);
    }
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [initLeafletMap]);

  // Smooth auto-pan when city/neighbourhood dropdown changes
  useEffect(() => {
    if (mapRef.current && markerRef.current) {
      mapRef.current.flyTo([lat, lng], 15, { duration: 0.8 });
      markerRef.current.setLatLng([lat, lng]);
    }
  }, [lat, lng]);

  return <div ref={containerRef} className="w-full h-52 rounded-2xl" style={{ zIndex: 0 }} />;
}
```

**Critical rules:**
- Use `useRef` for initial lat/lng (`initLatRef`, `initLngRef`) so `initLeafletMap` closure doesn't capture stale values
- Always check `if (mapRef.current) return` to prevent double-init on re-render
- Always remove the map in the `useEffect` cleanup: `mapRef.current.remove()`
- Check `document.getElementById('leaflet-js')` before adding the script tag — multiple component mounts will otherwise add duplicate scripts
- The second `useEffect` (auto-pan) depends on `[lat, lng]` from props, which changes when the city dropdown fires `handleCityChange`
- Leaflet's z-index system uses integer z-index. Set the container `style={{ zIndex: 0 }}` and overlay toasts to `z-[500]` to sit above Leaflet's internal layers

---

## Property Images

Use Unsplash free URLs — no authentication, no API key:

```
https://images.unsplash.com/photo-<ID>?auto=format&fit=crop&w=600&q=75
```

Display pattern (image with gradient overlay and text):
```tsx
<div className="relative h-32 rounded-2xl overflow-hidden">
  <img src={unit.images[0]} alt={unit.name} className="w-full h-full object-cover" />
  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
  <div className="absolute bottom-2 left-3 text-white text-xs font-semibold">
    {unit.city} · {unit.district}
  </div>
</div>
```

---

## RTL/LTR Handling

### Global direction
Set via `document.documentElement.dir` in `LanguageProvider`. Tailwind's `rtl:` variants work automatically.

### Monetary values — always LTR
Currency amounts must read left-to-right even in RTL mode:
```tsx
<td style={{ direction: 'ltr' }}>SAR {amount.toLocaleString()}</td>
```

### Charts — always LTR
Recharts renders incorrectly in RTL. Wrap all chart containers:
```tsx
<div style={{ direction: 'ltr' }}>
  <ResponsiveContainer>...</ResponsiveContainer>
</div>
```

### Logical CSS properties
Prefer `start`/`end` over `left`/`right` for RTL-aware spacing:
- `ps-` / `pe-` instead of `pl-` / `pr-`
- `ms-` / `me-` instead of `ml-` / `mr-`
- `text-start` / `text-end` instead of `text-left` / `text-right`

---

## Page Routing

Single-page app with manual routing via `useState<Page>` in `page.tsx`.

```tsx
type Page = 'overview' | 'properties' | 'bookings' | 'calendar' |
            'channels' | 'cleaning' | 'inbox' | 'analytics' | 'financials';

const navigate = (p: string) => setActivePage(p as Page);
```

Navigation is threaded through:
- `Sidebar` → `onNavigate` prop
- `TopBar` → `onNavigate` prop
- `JourneyBanner` → `onNavigate` prop
- `OverviewPage` → `onNavigate` prop (then internal `nav()` alias)
- `BookingsPage` → `onCheckoutCleaning` callback navigates to `'cleaning'`

---

## Clickability Checklist (Audit Results)

Every interactive element must trigger a visible state change. Patterns used:

| Element Type | Implementation |
|---|---|
| KPI cards | `onClick={() => nav('target-page')}` + hover/lift animation |
| Table rows | `onClick` on `<tr>` + `cursor-pointer hover:bg-blue-50/40` |
| Chart segments | `onClick` on Recharts `<Pie>` component |
| Legend items | `<button>` wrapping each legend row |
| "Force Sync" | Async with `syncState`: idle → syncing (spinner) → done (✓) → reset after 3s |
| "Check Out" | Optimistic status update in `localStatuses` state, then navigate |
| Notification bell | `onClick={() => onNavigate('inbox')}` + animate-pulse dot |
| Unit cards | `onClick={() => setDetailUnit(unit)}` on the card wrapper; `e.stopPropagation()` on nested interactive zones (kill-switch row, action buttons) |
| Channel kill switch | Toggle button with CSS `transition-all duration-300` on the thumb position; disabled during animation via `killAnimating` state |

**Dead button pattern to avoid:** Any `<button>` or clickable `<div>` without an `onClick` handler is a dead end — audit for these before shipping.

**stopPropagation pattern:** When a card is fully clickable but contains nested buttons, wrap the nested interactive area in a `<div onClick={e => e.stopPropagation()}>` so inner clicks don't bubble to the card handler.

```tsx
// Card is fully clickable → opens detail panel
<div onClick={() => setDetailUnit(unit)} className="card cursor-pointer">
  {/* This area contains buttons — stop propagation */}
  <div onClick={e => e.stopPropagation()}>
    <button onClick={() => setShareUnit(unit)}>Share</button>
    <button onClick={() => openEdit(unit)}>Edit</button>
  </div>
</div>
```

**Hover animation pattern for clickable cards:**
```tsx
className="card hover:shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer"
// Image inside scales on hover:
<div className="group">
  <img className="group-hover:scale-105 transition-transform duration-500" />
  {/* Overlay hint appears on hover */}
  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
    View Details
  </div>
</div>
```

---

## Cleaning Workflow

Full operational flow:

1. Guest checks out → `BookingsPage` shows "Check Out" button on CHECKED_IN rows
2. Click "Check Out" → optimistic status → calls `onCheckoutCleaning(unitName, bookingId)`
3. `page.tsx` `handleCheckoutCleaning` → `setActivePage('cleaning')`
4. `CleaningPage` shows the new PENDING request at top of list
5. Manager assigns provider → status advances through PENDING → ASSIGNED → IN_PROGRESS → COMPLETED → INSPECTION_DONE
6. While cleaning: unit shows "Hidden from OTA channels" indicator
7. After INSPECTION_DONE: unit returns to visible/available

**OTA visibility logic:** Any request with status not `INSPECTION_DONE` hides the unit from channels.

---

## Booking → Calendar Integration

`CalendarPage` uses `RECENT_BOOKINGS` as the event source. Clicking a calendar event:

1. Sets `selected` state with the event object
2. Matches against `RECENT_BOOKINGS` by guest name for booking ID
3. Matches against `INSURANCE_RECORDS` by `bookingId`
4. Matches against `CLEANING_REQUESTS` by `bookingId`
5. Renders side panel with 6 sections: Guest, Unit, Dates, Booking, Insurance, Cleaning History

---

## Build & Local Dev

```bash
# Install
npm install --prefix apps/dashboard

# Dev server
cd apps/dashboard && npm run dev

# Production build (with basePath)
NODE_ENV=production npm run build --prefix apps/dashboard

# Check output size
ls -la apps/dashboard/out/

# Run integration tests (no transpiler needed)
node apps/dashboard/tests/test-integration.mjs
```

First load JS target: ~147 kB (acceptable for a dashboard app).

**Test file location:** `apps/dashboard/tests/test-integration.mjs` — plain ES modules, uses `node:assert/strict`, no external dependencies. Currently 69 tests, all passing.

---

## Unit Drill-Down Pattern (Detail Panel)

`UnitDetailPanel` in `PropertiesPage.tsx` — a slide-in sidebar that shows full unit info without leaving the page.

**Trigger:** click anywhere on a unit card → `setDetailUnit(unit)`.
**Dismiss:** click the backdrop, the ✕ button, or the Close footer button.
**Edit transition:** "Edit Unit" button calls `openEdit(unit)` which does `setDetailUnit(null)` then opens `UnitModal`.

**Slide-in animation (pure CSS, no library):**
```tsx
<div style={{ animation: 'slideIn 0.25s ease-out' }}>...</div>

<style>{`
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to   { transform: translateX(0);    opacity: 1; }
  }
`}</style>
```

**Structure:**
```
fixed inset-0 backdrop           ← click to close
  └── max-w-sm panel (RTL: start side, LTR: end side)
        ├── Header image h-44 (with gradient + status badge)
        ├── flex-1 overflow-y-auto
        │     ├── Quick stats (3-col grid)
        │     ├── Unit specs (2-col key-value grid)
        │     ├── Amenities (emoji chips)
        │     ├── Pricing breakdown (LTR table)
        │     ├── Channels (colored badges)
        │     ├── Location (text + OSM embed iframe)
        │     └── Insurance (violet badge)
        └── Footer: Close | Edit Unit
```

**Why OSM iframe (not Leaflet) in the detail panel?**
The detail panel is read-only — the user cannot move the pin here. OSM iframe is sufficient and avoids loading a second Leaflet instance. Reserve `LeafletPinMap` for the Add/Edit modal where coordinates can change.

---

## Channel Logo Pattern

Branded SVG logos rendered inline — no image files, no external CDN for logos.

```tsx
function ChannelLogo({ channel, isActive = true }: { channel: string; isActive?: boolean }) {
  const inactiveStyle = !isActive ? { filter: 'grayscale(100%)', opacity: 0.4 } : {};

  if (channel === 'Booking.com') return (
    <div style={{ background: '#003580', ...inactiveStyle }}
      className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center">
      <svg width="34" height="30" viewBox="0 0 34 30" fill="none">
        <text x="3" y="20" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="18" fill="white">B</text>
        <text x="17" y="20" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="18" fill="#6699FF">.</text>
        <text x="3" y="28" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="7" fill="white" letterSpacing="1">BOOKING</text>
      </svg>
    </div>
  );
  // Airbnb: bélo SVG path in #FF385C
  // Gathern: "G" + "GATHERN" text in #00A651
}
```

**Active/Inactive state:**
- Active (connected, kill-switch ON): full brand color
- Inactive (disconnected or kill-switch OFF): `filter: grayscale(100%)` + `opacity: 0.4`
- Apply via inline style object, not Tailwind class, to keep the logic one place

**Brand colors (authoritative):**
| Channel | Primary | Background |
|---|---|---|
| Booking.com | `#003580` | `#EEF2FF` |
| Airbnb | `#FF385C` | `#FFF1F2` |
| Gathern | `#00A651` | `#F0FDF4` |
| Direct | `#F59E0B` | `#FFFBEB` |

---

## Rate Parity Manager Pattern (Unit-Specific)

The Rate Parity Manager in `ChannelsPage.tsx` must operate at the **individual unit** level, not the unit-type level.

**Workflow:**
1. User types or picks from a searchable dropdown → unit auto-selected
2. `handleUnitSelect(unit)` fires: pre-fills `minStay`, sets per-channel prices to `unit.basePrice`, enables only channels the unit is already listed on
3. User adjusts per-channel prices and toggles channels on/off
4. "Push" button → async 1.8s simulate → success toast scoped to unit name

**Searchable dropdown pattern (no external library):**
```tsx
const [showDropdown, setShowDropdown] = useState(false);
const [unitSearch, setUnitSearch]     = useState('');

const filteredUnits = UNITS.filter(u =>
  unitSearch === '' ||
  u.name.toLowerCase().includes(unitSearch.toLowerCase()) ||
  u.city.toLowerCase().includes(unitSearch.toLowerCase())
);

// Input opens dropdown on focus; backdrop div closes it on click-away
{showDropdown && <div className="fixed inset-0 z-20" onClick={() => setShowDropdown(false)} />}
```

**Pre-fill on unit select:**
```tsx
const handleUnitSelect = (unit: Unit) => {
  setSelectedUnitId(unit.id);
  setUnitSearch(unit.name);           // shows unit name in the input
  setShowDropdown(false);
  setMinStay(String(unit.minStay));
  const price = String(unit.basePrice);
  setChannelPrices({ 'Booking.com': price, 'Airbnb': price, 'Gathern': price });
  setChannelEnabled({
    'Booking.com': unit.channels.includes('Booking.com'),
    'Airbnb':      unit.channels.includes('Airbnb'),
    'Gathern':     unit.channels.includes('Gathern'),
  });
};
```

---

## OTA Channel Integration Services

Five service modules live in `src/lib/`. All are browser-safe (no `node:` built-ins at import level) because Next.js static export bundles them for the browser.

### `booking-com-service.ts` — Booking.com Connectivity API

- **Protocol:** OTA 2003B XML + B.XML
- **Auth endpoint:** `POST https://connectivity-authentication.booking.com/token-based-authentication/exchange`
- **XML endpoint (non-PCI):** `https://supply-xml.booking.com`
- **XML endpoint (PCI):** `https://secure-supply-xml.booking.com`
- **Token TTL:** 1 hr; cached with 5-min pre-expiry refresh; max 30 tokens/hr
- **OTA message builders:** `buildAvailNotifXml` (OTA_HotelAvailNotifRQ), `buildRatePlanNotifXml` (OTA_HotelRatePlanNotifRQ), `buildReadReservationsXml` (OTA_ReadRQ), `buildReservationAckXml` (OTA_HotelResNotifRQ with `ResStatus="Commit"`)

Key availability block fields:
```ts
// Block dates: Status="Close", BookingLimit="0"
// Open dates:  Status="Open",  BookingLimit="1"
// InvTypeCode and RoomTypeCode both = unitId
```

### `overlap-guard.ts` — Exclusive-Lock Overlap Engine

In-memory Map (`_locks`, `_bookings`). Swap for Redis `SET NX PX` in production.

- **Lock constants:** TTL = 10 s, poll = 50 ms, wait timeout = 5 s
- **Overlap formula:** `!(reqOut <= bookedIn || reqIn >= bookedOut)` (half-open intervals — adjacent bookings are NOT overlaps)
- **Flow:** `processBookingRequest` → `acquireLock` → `checkAvailability` → commit → `releaseLock` → `broadcastAvailabilityBlock`
- **Token protection:** `releaseLock` checks `stored.token === handle.token`; wrong-token release is silently ignored

```ts
// Adjacent booking edge case — MUST pass:
// existing: 2026-07-01 → 2026-07-05
// new:      2026-07-05 → 2026-07-10   ← reqOut(05) <= bookedIn(05) → NOT overlap ✓
```

### `gathern-service.ts` — Gathern REST/JSON Bridge

Saudi OTA. Polling-based (no webhooks). Polling interval: 120 s.

```ts
pushGathernBlock(req, fetchFn)    // PUT /units/{id}/availability  { available, quantity: 0|1 }
pushGathernRates(req, fetchFn)    // PUT /units/{id}/rates         { nightly_rate, cleaning_fee? }
pullGathernReservations(...)      // GET /reservations?unit_ids=&since=&status=confirmed,...
startGathernPoller(config)        // Returns { stop() } — clears interval on teardown
```

**Key:** `cleaning_fee` is included in rate pushes when provided (Gathern-specific field). Omit it entirely when not provided — do not send `cleaning_fee: undefined`.

### `airbnb-service.ts` — Airbnb Partner API

**Auth flow:** OAuth 2.0 Authorization Code (user-level consent — NOT `client_credentials`).

```ts
// Step 1: redirect user
buildAuthorizationUrl(credentials, state)
// → https://www.airbnb.com/oauth2/auth?client_id=&response_type=code&scope=...&state=

// Step 2: exchange code on callback
exchangeAuthorizationCode(credentials, code, fetchFn)
// POST https://api.airbnb.com/v2/oauth2/token  Content-Type: application/x-www-form-urlencoded
// body: grant_type=authorization_code&client_id=&client_secret=&redirect_uri=&code=

// Step 3: refresh when near-expiry
refreshAccessToken(credentials, refreshToken, fetchFn)
// grant_type=refresh_token; keep old refreshToken if new one not returned
```

**Calendar operations** — single endpoint handles both availability and pricing:
```ts
pushAirbnbBlock(op, accessToken, fetchFn)
// PUT https://api.airbnb.com/v2/calendar_operations
// body: { listing_id, start_date, end_date, availability: 'available'|'unavailable',
//         daily_price: SAR * 100,   ← Airbnb prices are in CENTS
//         min_nights? }
```

**Webhook verification** — HMAC-SHA256 using Web Crypto API (browser-safe):
```ts
export async function verifyWebhookSignature(rawBody: string, signature: string, webhookSecret: string): Promise<void> {
  const enc = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    'raw', enc.encode(webhookSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sigBytes = await globalThis.crypto.subtle.sign('HMAC', key, enc.encode(rawBody));
  const expected = Array.from(new Uint8Array(sigBytes))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  // Constant-time compare (timing-safe)
  if (expected.length !== signature.length) throw new Error('Webhook signature mismatch');
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  if (diff !== 0) throw new Error('Webhook signature mismatch');
}
```

**CRITICAL:** Do NOT use `import { createHmac } from 'node:crypto'`. The `node:` scheme is not handled by webpack in a static Next.js export — it throws `UnhandledSchemeError` at build time. Always use `globalThis.crypto.subtle` instead.

**iCal fallback** (`generateICalFeed`): RFC 5545 VCALENDAR/VEVENT for the ~15-min polling fallback when webhooks are unavailable. Date format: `YYYYMMDD` (no dashes) in `DTSTART;VALUE=DATE:`.

### `reservation-engine.ts` — Centralised <500ms Transaction Engine

Single source of truth for all booking confirmations across all channels.

**Phase budget:**
| Phase | Budget | What happens |
|---|---|---|
| PreCheck | ≤150 ms | Local registry overlap check (in-memory, fast) |
| Lock | ≤50 ms | Acquire exclusive lock with deadline |
| Commit | ≤50 ms | Re-check (under lock) + write to registry |
| Broadcast | ≤250 ms | Parallel push to Booking.com + Airbnb + Gathern |
| **Total** | **≤500 ms** | Hard deadline — exceeded → `REJECTED_DEADLINE_EXCEEDED` |

**Key API:**
```ts
processBooking(request, creds?)  // main entry point → TransactionRecord
getTransactionLog()              // all TransactionRecord[]
getMetrics()                     // { totalProcessed, confirmed, rejectedOverlap, avgDurationMs, maxDurationMs }
getActiveLocks()                 // active lock map snapshot
seedRegistry(bookings)           // pre-populate for testing
_clearState()                    // reset all state (test use only)
```

**TransactionRecord shape:**
```ts
interface TransactionRecord {
  id: string;          // TX-{timestamp}
  request: BookingRequest;
  status: 'CONFIRMED' | 'REJECTED_OVERLAP' | 'REJECTED_DEADLINE_EXCEEDED' | 'REJECTED_LOCK_TIMEOUT';
  booking?: { internalId: string; confirmedAt: number; ... };
  durationMs: number;
  phases: { preCheckMs: number; lockMs: number; commitMs: number; broadcastMs: number };
  broadcastResults?: { channel: string; success: boolean; durationMs: number }[];
}
```

**Race condition guarantee:** Lock acquisition is exclusive per `unitId::checkIn::checkOut` key. Post-lock re-check ensures correctness even when multiple requests pass the initial PreCheck. Result: exactly **1 winner** in any N-way concurrent race for the same unit+dates.

**Transaction log + metrics** are accumulated in module-level state. Call `_clearState()` at the start of each isolated test. The metrics object must be reset alongside the registry — forgetting this causes cumulative count failures across test suites.

---

## ChannelsPage.tsx — Integration Panels

`ChannelsPage` renders four major sections in order:

1. **Channel cards** — kill-switch, sync status, force-sync button
2. **`AirbnbIntegrationPanel`** — OAuth step-by-step, webhook event reference table, Simulate Instant Book log
3. **`UltimateOverlapPanel`** — 4-phase timeline with budget bars, 3-way concurrent race demo, transaction log table, metrics grid
4. **`IntegrationMonitor`** — Booking.com auth accordion, OTA XML viewer, overlap guard simulator, live sync log
5. **`RateParityManager`** — unit-specific price push (existing)
6. Revenue breakdown chart (existing)

**`AirbnbIntegrationPanel` demo pattern:**
```tsx
const [webhookLog, setWebhookLog] = useState<string[]>([]);
const simulateInstantBook = () => {
  setWebhookLog(prev => [
    `[${new Date().toISOString()}] POST /webhooks/airbnb  X-Airbnb-Signature: sha256=...`,
    `[${new Date().toISOString()}] ✓ HMAC-SHA256 verified`,
    `[${new Date().toISOString()}] reservation_id: AIR-${Math.random().toString(36).slice(2,8).toUpperCase()}`,
    ...prev,
  ]);
};
```

**`UltimateOverlapPanel` demo pattern:**
```tsx
const runDemo = async () => {
  setIsRunning(true);
  _clearState();
  const channels = ['Booking.com', 'Airbnb', 'Gathern'] as const;
  const results = await Promise.all(channels.map(ch =>
    processBooking({ unitId: 'demo-1', channel: ch, checkIn: '2026-08-01',
      checkOut: '2026-08-05', guestName: `${ch} Guest`, amount: 5000 })
  ));
  setTxLog(getTransactionLog());
  setMetrics(getMetrics());
  setIsRunning(false);
};
```

---

## Test Suite (`tests/test-integration.mjs`)

Plain Node.js ES module — no external test framework, no TypeScript transpiler needed.

```bash
node apps/dashboard/tests/test-integration.mjs
```

**Current coverage: 69 tests across 7 suites**

| Suite | Tests | What's covered |
|---|---|---|
| 1. Overlap Detection | 9 | `checkAvailability` edge cases, adjacent bookings |
| 2. Lock Engine | 5 | acquire/release, wrong token, expired eviction |
| 3. processBookingRequest | 6 | full flow, race conditions (2-way, 3-way) |
| 4. Booking.com XML Builders | 8 | OTA 2003B XML structure + field injection |
| 5. Token Exchange | 7 | OAuth client-credentials, cache, pre-expiry refresh |
| 6. Gathern Bridge | 8 | REST/JSON put/pull, cleaning_fee, query params |
| 7. E2E Callback Flow | 4 | cross-channel blocking, duplicate rejection |
| 8. Airbnb Service | 13 | OAuth code flow, token refresh, calendar push, HMAC verify, iCal |
| 9. Reservation Engine | 9 | <500ms timing, 5-way race, unit independence, metrics |

**Harness pattern** — async-safe sequential execution:
```js
const _suites = [];
let _currentSuite = null;

function suite(name, fn) {
  _currentSuite = { name, tests: [] };
  _suites.push(_currentSuite);
  fn();  // collect test registrations synchronously
  _currentSuite = null;
}

function test(name, fn) { _currentSuite.tests.push({ name, fn }); }

async function runAll() {
  for (const s of _suites) {
    for (const t of s.tests) {
      try { await t.fn(); passed++; }
      catch (err) { failed++; /* print error */ }
    }
  }
}
await runAll();
```

**Why sequential?** Concurrent test execution shares module-level state (`_locks`, `_bookings`, `_engMetrics`). Sequential execution guarantees each test's `clearState()` call takes effect before the next test starts.

**Mocking pattern** — pass `fetchFn` as a parameter (dependency injection), never monkey-patch `global.fetch`:
```js
const mockFetch = async (url, opts) => {
  capturedUrl  = url;
  capturedBody = JSON.parse(opts.body);
  return { ok: true, json: async () => ({ access_token: 'tok-abc', expires_in: 3600 }) };
};
await exchangeToken(CREDS, mockFetch);
```

---

## Common Pitfalls

### 1. Write tool "File has not been read yet"
The `Write` tool requires a prior `Read` of the same file in the session. If you need to overwrite without reading the full content, read at least a few lines first.

### 2. `cache-dependency-path` in GitHub Actions
Must point to the ROOT `package-lock.json`, not `apps/dashboard/package-lock.json` (which doesn't exist). The monorepo uses a single root lockfile.

### 3. TypeScript `dir` literal conflict
`typeof translations.en` makes `dir` type `"ltr"`, which conflicts with `"rtl"`. Always use:
```ts
type AnyTranslation = typeof translations.en | typeof translations.ar;
```

### 4. JourneyProvider scope
Provider must be in the outermost component (`Home`), not inside `App`. Otherwise `useJourney()` throws in `OnboardingPage`.

### 5. Static export limitations
- `next/image` doesn't work → use `<img>` with `unoptimized: true` in config
- No server-side APIs → all data is static mock data
- No dynamic routes without `generateStaticParams`

### 6. Recharts in RTL
Charts go backwards in RTL mode. Always wrap chart containers with `style={{ direction: 'ltr' }}`.

### 7. Leaflet double-init / memory leak
`LeafletPinMap` can mount more than once (modal open/close). Always guard:
```tsx
const initLeafletMap = useCallback(() => {
  if (!containerRef.current || mapRef.current) return; // ← guard
  ...
}, []);
// And clean up:
return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
```

### 8. Leaflet marker icon broken in bundled apps
Default Leaflet marker icon URLs break when Leaflet is loaded from CDN but the image paths are resolved by the bundler. Fix before creating any marker:
```tsx
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});
```

### 9. Leaflet z-index conflicts with modal overlays
Leaflet internally sets high z-indexes on its layers (~400–1000). When the map is inside a modal, set the modal's backdrop z-index higher than Leaflet's tile pane:
- Map container: `style={{ zIndex: 0 }}` (resets stacking context)
- Toasts / overlays on top of the map: `z-[500]` (Tailwind arbitrary)
- Modal backdrop (if any): `z-50` minimum

### 10. Slide-in animation direction in RTL
The `slideIn` keyframe uses `translateX(100%)` (slides from the right). In RTL layouts where the panel should appear from the left, use `translateX(-100%)`. Check `lang === 'ar'` to decide direction if needed.

### 11. SVG `<text>` elements in logos
SVG `<text>` elements render correctly in all modern browsers but may not show in some SVG export/screenshot tools. For critical branding, test cross-browser. As a fallback, use HTML `<span>` inside a flex div instead of SVG text nodes.

### 12. Searchable dropdown with click-away
The simplest click-away implementation is a fixed full-screen transparent `<div>` that sits behind the dropdown and fires `setShowDropdown(false)` on click. No `useEffect` + `document.addEventListener` needed.
```tsx
{showDropdown && (
  <div className="fixed inset-0 z-20" onClick={() => setShowDropdown(false)} />
)}
<div className="absolute z-30 top-full mt-1 ...dropdown content...">
```
The dropdown (`z-30`) must be above the backdrop (`z-20`).

### 13. `node:crypto` breaks the static Next.js build
Any service file that `import { createHmac } from 'node:crypto'` will fail at Next.js build time with:
```
UnhandledSchemeError: Reading from "node:crypto" is not handled by plugins
```
This is because the static export bundles everything for the browser where Node built-ins don't exist. **Always use the Web Crypto API instead:**
```ts
// ✗ WRONG — breaks webpack in static export
import { createHmac } from 'node:crypto';

// ✓ CORRECT — works in browser and Node.js ≥ 18
const key = await globalThis.crypto.subtle.importKey(
  'raw', new TextEncoder().encode(secret),
  { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
);
const sig = await globalThis.crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
```
The same rule applies to `node:buffer`, `node:stream`, etc.

### 14. Test harness async ordering — results print before tests run
If `suite()` calls `fn()` synchronously and individual test functions are async, the results summary line prints before any tests complete:
```js
// ✗ WRONG — results always show "0 passed / 0 failed"
function suite(name, fn) { fn(); }
function test(name, fn)  { fn(); /* Promise returned, not awaited */ }
console.log(`Results: ${passed} passed`);  // runs before tests finish
```
**Fix:** collect test functions into an array, then run all with `await` in sequence:
```js
// ✓ CORRECT
function suite(name, fn) {
  _currentSuite = { name, tests: [] };
  _suites.push(_currentSuite);
  fn();  // synchronously registers tests, does NOT execute them
}
function test(name, fn) { _currentSuite.tests.push({ name, fn }); }
async function runAll() {
  for (const s of _suites)
    for (const t of s.tests)
      try { await t.fn(); passed++; } catch { failed++; }
}
await runAll();
console.log(`Results: ${passed} passed`);  // runs AFTER all tests finish
```

### 15. Metrics state not reset between test suites
Module-level metrics objects (like `_engMetrics` in the reservation engine) must be explicitly reset in `clearState()`. If only the registry and locks are cleared, accumulated counts from previous suites contaminate later assertions:
```js
// ✗ WRONG — metrics carry over from previous tests
function engClearState() { _engRegistry.clear(); _engLocks.clear(); }

// ✓ CORRECT — reset everything
function engClearState() {
  _engRegistry.clear(); _engLocks.clear(); _engTxLog.length = 0;
  _engMetrics.totalProcessed = 0; _engMetrics.confirmed = 0;
  _engMetrics.rejectedOverlap = 0; _engMetrics.avgDurationMs = 0;
  _engMetrics.maxDurationMs = 0;
}
```

### 16. `avgDurationMs > 0` is flaky on fast machines
Transactions that complete within the same millisecond produce `durationMs = 0`. Asserting `avgDurationMs > 0` will fail on fast CI runners. Assert `>= 0` instead, or add a `sleep(1)` before computing duration if the test specifically needs a non-zero value.

### 17. Airbnb prices must be in cents (×100)
Airbnb's `calendar_operations` endpoint expects `daily_price` in the smallest currency unit (cents/halalas), not the face value:
```ts
body.daily_price = op.nightlyPrice * 100;  // 1248 SAR → 124800
```
Forgetting the `× 100` means the listing shows prices 100× lower than intended.

### 18. Demo state leaking into production localStorage
Demo mode must use `storageType="session"` on both `LanguageProvider` and `JourneyProvider`. If you accidentally pass `storageType="local"` to the demo entry point, demo interactions will overwrite the user's production `rems-lang` and `rems-journey` keys.

```tsx
// ✗ WRONG — demo contaminating production localStorage
<ModeProvider isDemo={true}>
  <LanguageProvider storageType="local">   ← uses 'rems-lang', same key as production
```

```tsx
// ✓ CORRECT — demo isolated in sessionStorage under different keys
<ModeProvider isDemo={true}>
  <LanguageProvider storageType="session">  ← uses 'rems-lang-demo', resets on tab close
```

### 19. Production PropertiesPage starting with mock data
When `isDemo` is `false`, units must be loaded from `localStorage` (`rems-prod-units`), not from the `UNITS` mock array. If you accidentally initialize state with `UNITS` in production, the user sees fake properties they never added.

```tsx
// ✗ WRONG — always uses mock data
const [units, setUnits] = useState<Unit[]>(UNITS);

// ✓ CORRECT — bifurcated by environment
const [units, setUnits] = useState<Unit[]>(() =>
  isDemo ? (UNITS as Unit[]) : loadProdUnits(),
);
```

### 20. `console.error` leaking internal error objects
Passing raw `Error` objects to `console.error` can expose stack traces and internal state in production. Always log only `.message`:

```ts
// ✗ WRONG — exposes stack trace
} catch (err) { console.error('Failed:', err); }

// ✓ CORRECT — logs message only
} catch (err) { console.error('Failed:', (err as Error).message); }
```

Also scope `console.warn` to development only when the message is a developer hint:
```ts
if (process.env.NODE_ENV !== 'production') console.warn('SPL unreachable, falling back...');
```

### 21. Staging cross-contamination via shared localStorage keys

If staging users store data under the same key as production (e.g. `rems-prod-units`), one user's data overwrites another's. Always use user-scoped keys in staging:

```ts
// ✗ WRONG — all staging users share the same key
localStorage.setItem('rems-prod-units', JSON.stringify(units));

// ✓ CORRECT — isolated per user ID
localStorage.setItem(stagingUnitsKey(user.id), JSON.stringify(units));
// 'rems-staging-{userId}-units'
```

### 22. Promo code `usedCount` incremented too early

`redeemPromoCode()` (which increments `usedCount`) must only fire **after** checkout confirms, not when the user clicks "Apply". Incrementing on Apply means the quota is consumed even if the user abandons checkout.

```tsx
// ✗ WRONG — increments when user clicks "Apply"
const handleApply = () => { redeemPromoCode(code); setPromoApplied(code); };

// ✓ CORRECT — increments only on final confirmation
const handleConfirm = async () => {
  redeemPromoCode(promoApplied);  // ← inside final step handler
  onComplete(selectedPlan, promoApplied);
};
```

### 23. TypeScript `interface` does not support union syntax

Discriminated unions must be declared as `type`, not `interface`:

```ts
// ✗ WRONG — TS1109 "Expression expected"
export interface RegisterResult {
  ok: true; user: StagingUser;
} | {
  ok: false; error: string;
}

// ✓ CORRECT
export type RegisterResult =
  | { ok: true;  user: StagingUser }
  | { ok: false; error: string };
```

### 24. Plan price arithmetic on i18n string values

i18n values are typed as `string`. Extracting numeric plan prices for discount calculation requires a raw number field alongside the display string:

```ts
// In i18n.ts — add raw numeric fields:
planBasicRaw:  149,   // used for arithmetic
planProRaw:    349,
planEntRaw:    799,
planBasic:    'SAR 149/mo',  // display string

// In component — cast to number:
const basePrice = t.payment.planBasicRaw as unknown as number;
const discounted = Math.round(basePrice * (1 - discountPct / 100));
```

---

## CSS Conventions

```css
/* Shared card style (globals.css) */
.card { @apply bg-white rounded-2xl border border-slate-100 shadow-sm; }

/* Badge */
.badge { @apply inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold; }

/* Data table */
.data-table th { @apply px-4 py-2.5 text-xs font-bold text-slate-400 uppercase tracking-wider text-start; }
.data-table td { @apply px-4 py-3 text-sm; }
```

Color accent system: Blue (`#3B82F6`) for primary, Emerald (`#10B981`) for success/live, Amber (`#F59E0B`) for pending, Red (`#EF4444`) for alerts, Purple (`#8B5CF6`) for occupancy metrics.

---

## Environment Info

- **Platform:** Linux 4.4.0
- **Node:** 20 (GitHub Actions), local version may differ
- **Next.js:** 14 (App Router)
- **React:** 18
- **Tailwind:** 3
- **TypeScript:** 5
- **Recharts:** 2
- **Working directory:** `/home/user/Abdulrahman`
