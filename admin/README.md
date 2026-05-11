# SpinVault Admin (Next.js)

Internal admin dashboard for SpinVault store content. Bootstrapped with **Next.js 16.2** (App Router, TypeScript, Tailwind CSS v4, Supabase Auth).

### Local: skip sign-in (development only)

If you do not want to deal with Supabase Auth while building UI locally, add to **`admin/.env.local`**:

```bash
ADMIN_SKIP_AUTH=1
```

You still need **`NEXT_PUBLIC_SUPABASE_URL`**, **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**, and **`SUPABASE_SERVICE_ROLE_KEY`** so the app can talk to the database. Then run `npm run dev` and open **`/admin/dashboard`** directly — no `/login`.

This only runs when **`NODE_ENV=development`** (`npm run dev`). It is ignored in production builds.

## How to see the admin dashboard

1. **Install and run the dev server** (from the `admin` folder, or use the paths below from the repo root).

   ```bash
   cd admin
   npm install
   npm run dev
   ```

2. **Open the app** at [http://localhost:3000](http://localhost:3000) (default Next.js port; use the URL shown in the terminal if yours differs).

3. **Sign in**  
   - Go to **Sign in** → [http://localhost:3000/login](http://localhost:3000/login).  
   - You need a **Supabase project** with the admin schema migrations applied and the env vars in `.env.local` (see below).  
   - Use **email + password** (create the user in Supabase Auth → Users, or enable sign-ups), or use **Email magic link** at the bottom of the form. After a successful session, open **[http://localhost:3000/admin/dashboard](http://localhost:3000/admin/dashboard)** (or **[/admin](http://localhost:3000/admin)**, which redirects to `/admin/dashboard`).

4. **Access control**  
   - Unauthenticated visits to `/admin/**` are redirected to `/login`.  
   - Your user must exist in `admin_users` with a role (see first-time setup).

### If you are already inside `admin/` in the terminal

Do **not** run `cd admin` again — that looks for `admin/admin` and fails. From repo root use `cd admin && npm run dev`; from inside `admin`, run `npm run dev` only.

## First-time environment setup

1. **Database** — Apply the Supabase migrations from this repo (under `supabase/migrations/`) to your project so the admin tables, RLS, and `admin.has_permission` exist.

2. **Environment file** — Create `admin/.env.local` (never commit it). Copy `admin/.env.example` as a starting point. Minimum for auth and gating:

   | Variable | Purpose |
   | -------- | ------- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-only; bootstrap & admin DB) — **not** in the mobile app; from Dashboard → Settings → API → `service_role` |
   | `ADMIN_SETUP_TOKEN` | Secret token for one-time `/setup` bootstrap |
   | `NEXT_PUBLIC_ADMIN_ENV` | Optional: `local` / `staging` / `production` (env badge) |

   Optional for AI features: `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`.

   **Sharing Supabase URL with mobile:** your mobile app uses `EXPO_PUBLIC_SUPABASE_URL` in `mobile/.env`. The `npm run create-admin` script loads `mobile/.env` and maps that to `NEXT_PUBLIC_SUPABASE_URL` if needed. You still must put **`SUPABASE_SERVICE_ROLE_KEY`** in `admin/.env.local` yourself (it must never live in the Expo client).

   In the Supabase dashboard, enable **Email** auth and turn on **Email / password** if you want password login (Authentication → Providers → Email).

3. **Create an admin user (CLI)** — From `admin/`, with `SUPABASE_SERVICE_ROLE_KEY` in `admin/.env.local` and either `NEXT_PUBLIC_SUPABASE_URL` there or `EXPO_PUBLIC_SUPABASE_URL` in `mobile/.env`:

   ```bash
   npm run create-admin -- you@example.com 'YourSecurePassword'
   ```

   Optional third argument: role (`super_admin` is the default). To avoid putting the password on the command line:

   ```bash
   CREATE_ADMIN_PASSWORD='YourSecurePassword' npm run create-admin -- you@example.com
   ```

   This creates the Supabase Auth user, upserts `admin_users` / `admin_roles`, and marks bootstrap complete when you create a `super_admin` and bootstrap was still pending.

4. **Bootstrap via UI (alternative)** — Visit [http://localhost:3000/setup](http://localhost:3000/setup), enter `ADMIN_SETUP_TOKEN`, then sign in at `/login` with that account (password or magic link). If setup already completed, use **Go to sign in** from that page.

5. **Sign in** at `/login` with the account you created or bootstrapped.

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run lint` | ESLint |
| `npm run create-admin -- <email> <password> [role]` | Create Auth user + admin role (needs service role in `.env.local`) |

## Related docs

- [`docs/admin-content-dashboard-sprint-plan.md`](../docs/admin-content-dashboard-sprint-plan.md) — architecture and sprint plan  
- [`docs/admin-smoke-checklist.md`](../docs/admin-smoke-checklist.md) — manual QA checklist  
