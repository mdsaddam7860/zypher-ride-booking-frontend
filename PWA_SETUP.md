# PWA Setup — Zypher (Rider Frontend)

This document explains what changed to turn the app into an installable,
production-ready PWA, plus the Home/Book tab split and state-architecture
work that shipped alongside it.

## 1. Install the new dependency

```bash
npm install
```

`@ducanh2912/next-pwa` was added to `package.json`'s dependencies. Zustand
and `@tanstack/react-query` were already present — see "State architecture"
below for why very little had to change there.

## 2. Files added

| File | Purpose |
| --- | --- |
| `src/app/manifest.ts` | Generates `/manifest.webmanifest` (App Router convention) — name, icons, theme colors, shortcuts. |
| `src/app/offline/page.tsx` | Static fallback page the service worker serves for any failed navigation while offline. |
| `public/icons/*` | Standard (72–512px) + maskable (192/512) + Apple touch icons, generated from the existing `src/app/icon.png`. |
| `src/hooks/useInstallPrompt.ts` | Captures `beforeinstallprompt`/`appinstalled`, exposes `canInstall` / `isInstalled` / `promptInstall()`. |
| `src/components/layout/InstallAppButton.tsx` | Self-hiding "Install app" button — renders nothing until a real prompt is available. Wired into `SideNav`. |
| `src/hooks/usePushNotifications.ts` | Inert scaffolding for future Web Push (see "Notifications" below) — does not send or receive anything today. |
| `src/store/useRideStore.ts` | Zustand store for the in-progress booking draft (pickup/drop-off/vehicle) shared by the Home and Book tabs. |
| `src/lib/savedAddresses.ts` | `localStorage`-backed helpers + `useSavedAddresses()` hook for Home/Work address shortcuts. |
| `src/components/rider/HomeTab.tsx`, `src/components/rider/BookRideTab.tsx` | The rider dashboard split out of `src/app/rider/page.tsx`. |

## 3. Files modified

- **`next.config.mjs`** — wrapped with `withPWA(...)`. Service worker is
  disabled in development (`disable: process.env.NODE_ENV === "development"`)
  so hot reload and API debugging aren't affected; it's a normal Next config
  in dev and a precaching PWA in production builds.
- **`src/app/layout.tsx`** — added `manifest`, `icons`, `appleWebApp`,
  `openGraph`/`twitter` metadata, and a separate `viewport` export
  (`themeColor`, `viewportFit: "cover"` for safe-area support). Deliberately
  did **not** set `maximumScale: 1` / disable pinch-zoom — that's an easy
  Lighthouse Accessibility point to lose for very little native-app feel
  gained.
- **`src/app/globals.css`** — added `-webkit-overflow-scrolling: touch`,
  disabled the mobile tap-highlight flash, `scroll-behavior: smooth`, and
  `.safe-top` / `.safe-bottom` / `.safe-x` utility classes for
  `env(safe-area-inset-*)`.
- **`src/components/layout/SideNav.tsx`** — mounted `<InstallAppButton />`
  in the sidebar footer, and added `.safe-top` to the fixed mobile header.
- **`src/components/map/LocationSearchField.tsx`** — added an optional
  `inputRef` prop so a parent can imperatively focus the field (used by the
  Home tab's "Where to?" trigger).
- **`.gitignore`** — ignores the service worker + Workbox runtime files
  next-pwa generates into `public/` on every production build; they're
  build output, not source.
- **`src/app/rider/page.tsx`** — now the tab orchestrator (see below)
  instead of owning the booking form itself.

## 4. UI split: Home + Book tabs

Per the product notes:

- **Tabs renamed/added**: bottom nav is now `Home`, `Book`, `Past rides`,
  `Profile` (previously `My ride`, `Past rides`, `Profile`).
- **"Where to?" trigger**: a lightweight button on `HomeTab` — it doesn't
  own any location state. Tapping it calls `useRideStore.requestFocusPickup()`
  (bumps a counter) and switches the parent `<Tabs>` to `"book"`.
  `BookRideTab` watches that counter and calls `.focus()` on the pickup
  input's ref the moment it changes.
- **Active-ride banner on Home**: `HomeTab` reads `activeRideId` from
  `useSessionStore` and, if set, shows a small banner with the ride's live
  status (via the existing `<RideStateLadder>`); tapping it switches to
  `"book"`.
- **Default routing**: `RiderDashboardPage` starts on `"home"`, then — once
  `useSessionStore`'s `hasHydrated` flips true — jumps straight to `"book"`
  if an `activeRideId` is already present, so an in-progress ride is never
  hidden behind the Home tab on load. An explicit `?tab=` query param (used
  by the PWA's app shortcuts) always wins over that default.
- **Placeholder education content**: `HomeTab` ships three simple cards
  ("On-demand rides", "Fare transparency", "Safety features") with
  structure/layout only — swap in real copy/assets whenever they're ready.

## 5. State & data architecture

The codebase already had more of this in place than the brief assumed:

- **Zustand** (`zustand` + `persist`) was already installed and used in
  `useSessionStore` for the session, locale, and `activeRideId` (persisted
  to `localStorage`). That store is the source of truth for "is there an
  active ride" — both `HomeTab` and `BookRideTab` read it directly, so
  switching tabs never flickers or loses it.
- **New**: `useRideStore` (not persisted) holds the booking *draft* —
  pickup/drop-off pins + labels, active field, selected vehicle — which
  previously lived in `BookRideTab`'s local `useState` and was lost the
  moment Radix's `<Tabs.Content>` unmounted it. Living in Zustand means it
  now survives Home ⇄ Book switches with no extra plumbing.
- **`localStorage` for preferences**: `src/lib/savedAddresses.ts` adds
  `getSavedAddresses()` / `saveSavedAddress()` / `removeSavedAddress()` plus
  a `useSavedAddresses()` hook that reads once on mount, so Home/Work
  shortcuts survive a full app close. `HomeTab` renders them as quick chips
  once any exist. (There's no "save an address" UI yet — that's a natural
  follow-up once you decide where in the booking flow riders should be
  offered "Save as Home/Work"; the storage layer is ready for it.)
- **Client-side data fetching**: `@tanstack/react-query` was already wired
  up (`QueryProvider`, `useMyProfile`, `useRideHistory`, `useRide`, etc.) —
  there were no raw `useEffect` + `fetch` calls left to replace. `HomeTab`
  reuses the same `useMyProfile()`/`useRide()` hooks rather than fetching
  again, so it benefits from React Query's existing caching/revalidation
  for free.

## 6. Service worker & caching strategy

Configured entirely through `workboxOptions.runtimeCaching` in
`next.config.mjs`:

| What | Strategy | Why |
| --- | --- | --- |
| Google Fonts stylesheet | `StaleWhileRevalidate` | Rarely changes; fine to serve stale while refreshing. |
| Google Fonts font files | `CacheFirst`, 1 year | Font URLs are content-hashed/immutable. |
| Images (`png/jpg/svg/gif/webp/ico`) | `StaleWhileRevalidate`, 30 days | Fast repeat loads without ever going fully stale. |
| OpenStreetMap tiles | `CacheFirst`, 7 days | Keeps `<RideMap>` responsive/partially offline-tolerant. |
| `GET /api/rides/history`, `GET /api/riders|drivers/me` | `NetworkFirst`, 5 min, 4s timeout | Non-sensitive, read-only — React Query still revalidates on top. |
| Everything else (`/api/fares`, `/api/rides` mutations, ride status polling, auth, payments) | **not cached** | Explicitly excluded — these must always hit the network. |

`navigateFallback: "/offline"` serves the static offline page for any failed
page navigation; `navigateFallbackDenylist: [/^\/api\//]` keeps that from
ever intercepting API calls.

Precaching of the built JS/CSS/static assets, automatic-update-on-reload,
and `clients.claim()`/`skipWaiting` behavior all come from next-pwa's
defaults — nothing custom needed there.

## 7. Install experience

- `useInstallPrompt` listens for `beforeinstallprompt` (Chrome/Edge/Android)
  and `appinstalled`, and checks `display-mode: standalone` /
  `navigator.standalone` to know if the app is already installed.
- `InstallAppButton` renders nothing unless a real prompt is available, so
  it's safe to leave mounted permanently (currently in the sidebar footer).
- iOS Safari never fires `beforeinstallprompt` — there is no programmatic
  install prompt there, only manual "Add to Home Screen" from the share
  sheet. `canInstall` will just stay `false` on iOS; if you want to nudge
  iOS users specifically, detect iOS and show your own instructions instead
  of relying on this hook for that platform.

## 8. Notifications (optional, scaffolded only)

`usePushNotifications` only checks browser support and can request
`Notification` permission — it does **not** subscribe to push or talk to a
backend, since there's no VAPID key pair or subscription-storage endpoint
yet. The hook's file comment lists the concrete steps for wiring up real Web
Push later without having to revisit the service worker config again.

## 9. How to test the PWA locally

Service workers are disabled in `next dev`, so you need a production build:

```bash
npm run build
npm run start
```

Then, in Chrome/Edge:

1. Open DevTools → **Application** → **Manifest** — confirm name, icons,
   and `start_url` all resolve.
2. **Application → Service Workers** — confirm `sw.js` registered and is
   "activated and running".
3. Load the app once online, then use the **Network** tab's "Offline"
   throttling preset and navigate — you should land on `/offline` instead of
   a browser error page.
4. Look for the install icon in the omnibox, or use the **Install app**
   button in the sidebar (only appears once Chrome has actually offered a
   prompt).
5. Run **Lighthouse** (Application tab or the Lighthouse panel) in
   "Mobile" + "PWA" mode to check the Performance/PWA/Accessibility/Best
   Practices/SEO scores end to end.

On a phone: visit the deployed `https://` URL (PWA install requires HTTPS,
`localhost` is the only HTTP exception) in Chrome (Android) or Safari
(iOS) and use "Add to Home Screen".

## Known limitations / follow-ups

- Build/typecheck could not be run in the environment this change was
  authored in (no network access to install `node_modules`). Run
  `npm install && npm run typecheck && npm run build` before shipping.
- No screenshots are set in the manifest (`screenshots` field) — add real
  ones later if you want the richer install UI Chrome shows for listed PWAs.
- There's no UI yet for a rider to actually *save* a Home/Work address; only
  the storage layer (`lib/savedAddresses.ts`) and the chips that display
  whatever's already saved.
