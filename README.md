# zypher-booking-frontend

Next.js (App Router) + TypeScript frontend for the ride-booking-backend API, with three
role-scoped dashboards: rider, driver, and owner.

---

## Stack

- Next.js App Router, React, TypeScript (strict)
- Tailwind CSS + shadcn-style UI primitives (`src/components/ui`)
- TanStack Query for server state, Axios for HTTP
- Zustand (persisted) for the active session
- Leaflet / react-leaflet for the live map, OSM Nominatim for geocoding, public OSRM for routing

---

## Setup

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Set `NEXT_PUBLIC_API_BASE_URL` in `.env.local` to point at your backend.

If you ever see a `Loading CSS chunk ... failed` error in dev, it's just a stale `.next` cache
after a dependency/route change — stop the server, delete the `.next` folder, and restart.

---

## Folder structure

**App routes** (`src/app`)

- `login/page.tsx` — role-tabbed login, links to `/register`
- `register/page.tsx` — rider/driver sign-up
- `rider/page.tsx` — My ride / Past rides / Profile
- `driver/page.tsx` — Live / Past rides / Profile
- `owner/page.tsx` — Rides / Past rides / Profile

**Components** (`src/components`)

- `layout/SideNav.tsx`, `layout/BrandHeader.tsx`, `layout/DashboardShell.tsx`
- `map/RideMap.tsx`, `map/LocationSearchField.tsx`
- `ride/RideStateLadder.tsx` — the ride-pipeline stepper
- `ride/FareBillingSummary.tsx` — fare + payment/billing (guards itself per role)
- `ride/RideHistoryList.tsx` — past-ride cards with a "View details" dropdown
- `ride/RideContactButtons.tsx` — tap-to-dial rider/driver links, gated on `ride.contact`
- `ride/AuditTrail.tsx` — owner-only ride change history
- `user/ProfilePanel.tsx` — view/edit the logged-in user's own profile
- `user/ContactDetails.tsx` — full contact card for the *other* party on a ride
- `ui/` — button, card, input, label, badge, tabs

**Hooks** (`src/hooks`)

- `rider/useRiderRide.ts`
- `driver/useDriverActions.ts` — status, GPS, the 5s ride-list poll, accept/deny/arrive/start/complete
- `owner/useOwnerDispatch.ts`
- `useUserProfile.ts` — `useMyProfile`, `useUpdateMyProfile`, `useRiderProfileForOwner`

**Other**

- `lib/api.ts` — axios instance + JWT interceptor
- `lib/geocode.ts` — Nominatim geocoding + OSRM route fetch
- `lib/utils.ts` — `cn()`, `formatInr()`, `formatVehicleType()`, `estimateRefundPercent()`
- `store/useSessionStore.ts` — persisted session
- `types/index.ts` — types mirroring the backend's serialized responses
- `public/logo.png` — Zypher logomark used by `BrandHeader` (add your own file here)

---

## Dashboards at a glance

**Rider** (`/rider`)
Search-or-pin pickup/drop-off on a live map (pickup auto-fills from GPS on load), fare estimate,
book now or schedule later, live tracking (state ladder, "driver has arrived" banner, "Call
driver"), past rides, and a Profile tab.

**Driver** (`/driver`)
Auto-goes "available" on login and broadcasts GPS every 5s while online. A single 5s-polled ride
list drives everything: an "Assigned rides" queue with per-ride Accept/Deny (supports multiple
concurrent assignments), and "Active ride(s)" cards with the accept → **I've arrived** → start →
complete flow, a live map/route from the driver to pickup (then to drop-off), and "Call rider".

**Owner** (`/owner`)
Stat cards (needs assignment / available drivers / active rides now), a filterable rides table
with manual driver assignment, edit, and audit history, plus a "Contacts" panel (tap-to-dial + full
rider profile lookup) that also works on completed/cancelled rides for dispute/support lookups.

---

## API surface this frontend relies on

Confirmed and in active use:

- `POST /api/auth/{login,register}/{rider,driver,owner}`
- `GET/POST /api/fares`, `POST /api/rides`, `PATCH /api/rides/:id` (accept/deny/edit)
- `POST /api/rides/:id/start`, `/complete`, `/pay`
- `POST /api/rides/:id/arrive` — driver-only, valid only while `driver_accepted`; sets
  `arrivedAt` and triggers the rider's "driver has arrived" banner. 409s outside that window, so
  the button is hidden/disabled instead of relying on the error.
- `GET /api/rides/:id` and `GET /api/rides/history` — the latter returns **every** ride tied to
  the caller (active statuses included, not just completed/cancelled), which is why the driver
  console can build its whole UI off one 5s-polled query.
- `GET /api/drivers/available`, `GET /api/drivers/nearby`, `POST /api/drivers/status`,
  `POST /api/drivers/location`
- `GET /api/owner/rides`, `GET /api/owner/rides/pending`, `POST /api/rides/:id/assign-driver`
- `GET /api/riders/me`, `GET /api/drivers/me` — the logged-in user's own profile
- `GET /api/owner/riders/:riderId` — owner-only lookup of a rider's full profile

### `ride.contact` and `ride.arrivedAt`

Ride responses can include:

```json
{
  "arrivedAt": "2026-07-08T10:15:00Z",
  "contact": { "riderPhone": "+91...", "driverPhone": "+91..." }
}
```

Both fields are nullable/optional, and `contact` visibility differs by viewer — always guard with
`if (ride.contact)`, never assume it's present:

- **Rider/driver apps** — only while the ride is active (`driver_assigned` → `driver_accepted` →
  `in_progress`). Gone once it ends or is cancelled.
- **Owner dashboard** — present on any ride that ever had a driver assigned, including
  `completed`/`cancelled`, for dispute/support lookups.

---

## Known backend gaps

- **No owner "my profile" endpoint.** Only `GET /api/riders/me` and `GET /api/drivers/me` exist —
  the owner's Profile tab shows a placeholder until an equivalent exists for owners.
- **No profile *update* endpoint.** `useUpdateMyProfile` calls a **dummy**
  `PATCH /api/riders/me` / `/api/drivers/me`. The Edit form works end-to-end the moment a real
  one ships; until then it just surfaces the request error.
- **No full-profile lookup** for rider→driver, driver→rider, or owner→driver. Only owner→rider
  is real (`GET /api/owner/riders/:riderId`) — the others show a plain "not available yet" note
  in `<ContactDetails>` rather than guessing at a URL. (Tap-to-dial via `ride.contact` is
  unaffected by this — that's fully wired for all three roles already.)
- **No fare-listing endpoint for owners.** Replaced the old placeholder card with a real
  "active rides now" stat computed client-side instead.
- **Single active session.** This app assumes one logged-in role at a time (the
  production-correct model) — `src/store/useSessionStore.ts` reflects that.

---

## Live map

Used by both the rider screen and the driver's active-ride view (`src/components/map/RideMap.tsx`):

- Search-as-you-type pickup/drop-off (rider), via OSM Nominatim.
- Tap-to-pin / drag-to-adjust markers, reverse-geocoded automatically (rider only — `RideMap`
  also supports a `readOnly` mode for the driver's map).
- "Use current location" fires automatically on page load for the rider (falls back silently to
  manual search/pin-drop if permission is denied); the driver continuously broadcasts GPS every
  5s while online via the same browser API.
- A live route line: pickup ↔ drop-off for the rider; driver's live position → pickup (then →
  drop-off once started) for the driver, via an optional `driverLocation` marker.

New dependencies: `leaflet`, `react-leaflet`, `@types/leaflet`. Nominatim and the OSRM demo server
are free public services meant for light/demo use — swap in a commercial provider before
production traffic.

---

## Recent changes (this round)

- Registration (`/register`) for riders and drivers.
- "View details" dropdown on every past-ride card, on all three dashboards.
- Driver console rebuilt around a single 5s-polled ride list: no more pasting a ride ID,
  auto-online + continuous GPS, assigned-rides queue with accept/deny, and the new
  accept → arrive → start → complete flow.
- "Call rider" / "Call driver" tap-to-dial, and a "driver has arrived" banner on the rider side.
- Profile tab (view + edit) on all three dashboards.
- Owner "Contacts" panel (tap-to-dial + full rider lookup), including on historical rides.
- Fixed: pickup time no longer stuck at page-load time when booking another ride.
- Fixed: fare estimate now shown in ₹, consistent with the booked-ride view.
- Branding: logo + "Zypher" wordmark with a role-specific subtitle in the sidebar.
- Hover any truncated ID (user/ride/audit-actor) to see the full UUID.