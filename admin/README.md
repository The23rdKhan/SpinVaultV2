# SpinVault Admin (Next.js)

Internal admin dashboard for SpinVault store content. Bootstrapped with **Next.js 16.2.4** (App Router, TypeScript, Tailwind CSS v4).

## Prerequisites

- Node.js 20+ recommended
- npm (lockfile included)

## Run locally

From this folder:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Configuration

- Copy `.env.example` to `.env.local` when you connect Supabase or AI providers.
- **No SSO** in this scaffold—add auth when you implement Sprint 1 per `docs/admin-content-dashboard-sprint-plan.md`.

## Scripts

| Command       | Description        |
| ------------- | ------------------ |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint`  | ESLint             |

## Related docs

- [`docs/admin-content-dashboard-sprint-plan.md`](../docs/admin-content-dashboard-sprint-plan.md) — architecture and sprint plan
