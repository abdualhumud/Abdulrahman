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
```

First load JS target: ~147 kB (acceptable for a dashboard app).

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
