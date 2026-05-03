# SpinVaultV2

Social casino–style slots experience with a **Next.js** web app, **Expo (React Native)** mobile client, and **Supabase** for auth, wallets, spins, IAP fulfillment, and edge functions.

## Repository layout

| Path | Description |
|------|-------------|
| `mobile/` | Expo Router app (primary native client). Dev client + EAS builds. |
| `app/`, `components/` | Next.js web UI (Root project scripts). |
| `shared/` | Cross-platform types, analytics event names, economy helpers. |
| `supabase/` | Postgres migrations, Edge Functions (`spin`, `economy`, `iap-verify`, `iap-restore`, `ads-reward`). |
| `doc/` | Deeper notes: [mobile / Expo runbook](doc/mobile-expo.md), [roadmap](doc/roadmap/README.md), [doc index](doc/README.md). |

## Prerequisites

- **Node.js** 20+ (LTS recommended)
- **iOS:** Xcode + CocoaPods (for local `expo run:ios` / dev client)
- **Android:** Android Studio / SDK (for `expo run:android`)
- **Supabase** project for hosted backend (or local Supabase CLI)

## Mobile (Expo)

```bash
cd mobile
cp .env.example .env   # fill Supabase and optional keys — never commit .env
npm install
npm run dev              # Expo dev server (dev client)
```

Useful scripts (see `mobile/package.json`):

- `npm run typecheck` — TypeScript
- `npm run ios` / `npm run android` — native run after prebuild
- `npm run eas:build:dev:ios-sim` — EAS simulator build (example profile)

Environment variables are documented in [`mobile/.env.example`](mobile/.env.example) (Supabase, optional server spin/economy flags, Google/Apple auth, RevenueCat, push).

## Web (Next.js)

From the repository root:

```bash
npm install
npm run dev
```

Other root scripts proxy to the mobile app: `npm run expo:dev`, `expo:ios`, etc.

## Backend (Supabase)

1. Apply migrations under `supabase/migrations/` to your project (order matters).
2. Deploy Edge Functions from `supabase/functions/` and configure [secrets](mobile/.env.example) for RevenueCat and AdMob where used.
3. For local CLI workflows, see [Supabase CLI docs](https://supabase.com/docs/guides/cli).

Hosted vs local feature flags for the mobile app (e.g. server spin, server economy) are described in `mobile/.env.example`.

## Documentation

- **[doc/README.md](doc/README.md)** — index of implementation notes and roadmaps.
- **[doc/mobile-expo.md](doc/mobile-expo.md)** — running and testing the Expo app.

## Contributing

Use focused commits; run `npm run typecheck` in `mobile/` before opening a PR. Keep secrets out of git (`.env`, API keys, webhook signing secrets).
