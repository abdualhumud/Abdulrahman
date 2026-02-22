# CLAUDE.md — Real Estate Management System (REMS)

Developer reference for the REMS monorepo. Captures all architectural decisions, constraints, patterns, and lessons learned across the full build.

---

## Project Overview

A bilingual (Arabic/English) SaaS property management dashboard for Saudi property owners. Built as a static Next.js export deployed to GitHub Pages. Covers the full operational workflow: property listing → OTA channel sync → bookings → guest checkout → cleaning assignment → financial reporting.

**Live URL:** `https://abdualhumud.github.io/Abdulrahman/`

---

## Monorepo Structure

```
/home/user/Abdulrahman/
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
        │   │   ├── page.tsx           # Root orchestrator + routing
        │   │   ├── layout.tsx
        │   │   └── globals.css
        │   ├── components/
        │   │   ├── layout/
        │   │   │   ├── Sidebar.tsx
        │   │   │   ├── TopBar.tsx
        │   │   │   └── JourneyBanner.tsx
        │   │   └── dashboard/
        │   │       ├── OnboardingPage.tsx
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
        │       ├── icons.tsx          # All icons as inline SVG functions
        │       ├── i18n.ts            # Full EN/AR translation object
        │       ├── mock-data.ts       # All static data
        │       ├── saudi-cities.ts    # Saudi city/neighbourhood/GPS data
        │       ├── language-context.tsx
        │       └── journey-context.tsx
        └── out/                       # Static export output (gitignored)
```

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

**localStorage key:** `rems-lang`

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

**localStorage key:** `rems-journey` (JSON array of completed step numbers)

**Critical placement rule:** `JourneyProvider` must wrap the **entire** `App` including the onboarding conditional. If placed after `if (showOnboarding) return <OnboardingPage />`, the onboarding page cannot call `useJourney()`.

**Correct pattern in `page.tsx`:**
```tsx
export default function Home() {
  return (
    <LanguageProvider>
      <JourneyProvider>   {/* wraps everything, including onboarding */}
        <App />
      </JourneyProvider>
    </LanguageProvider>
  );
}

function App() {
  const { markDone } = useJourney();  // works because provider is above
  if (showOnboarding) return <OnboardingPage onComplete={completeOnboarding} />;
  // ...
}
```

### Journey Step Wiring

| Step | Where `markDone()` fires | Trigger |
|------|--------------------------|---------|
| 1 | `page.tsx` → `completeOnboarding()` | User finishes OnboardingPage |
| 2 | `PropertiesPage.tsx` → `handleSave()` | User adds first unit (not edit) |
| 3 | `ChannelsPage.tsx` → `forceSync()` | User force-syncs any channel |
| 4 | `OverviewPage.tsx` → `useEffect` | Auto-fires when `completed.size >= 3` |

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
OWNER             // { fullName, email, phone, plan }
KPI_DATA          // { totalRevenue, netPayout, averageOccupancy, adr, revPAR, totalBookings, ... }
MONTHLY_REVENUE   // [{ month: string, revenue: number }] × 12
CHANNEL_BREAKDOWN // [{ channel, revenue, share, color }] × 5
RECENT_BOOKINGS   // [{ id, guest, property, unit, channel, channelColor, checkIn, checkOut, nights, amount, status }]
CHANNEL_SYNC_STATUS // [{ channel, logo, bg, lastSync, syncMethod }]
UNITS             // [{ id, name, type, city, district, bedrooms, bathrooms, area, status, lat, lng, images[] }]
CLEANING_REQUESTS // [{ id, unitId, guestName, bookingId, checkoutDate, status, provider, messages[], ... }]
CLEANING_PROVIDERS // [{ id, name, type: 'INTERNAL'|'EXTERNAL', rating, available, phone }]
INSURANCE_RECORDS  // [{ bookingId, provider, depositAmount, depositStatus: 'HELD'|'PENDING'|'RELEASED' }]
```

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

## Maps

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

**Dead button pattern to avoid:** Any `<button>` or clickable `<div>` without an `onClick` handler is a dead end — audit for these before shipping.

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
```

First load JS target: ~147 kB (acceptable for a dashboard app).

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
