# SpinVault Admin — manual smoke checklist (MVP)

Run from `admin/` with `npm run dev` after copying `.env.example` → `.env.local`.

## Bootstrap & auth

- [ ] `/setup` validates `ADMIN_SETUP_TOKEN` and sets intent cookie; magic link completes → first user receives `super_admin` (`admin.bootstrap_state.completed_at` set).
- [ ] Subsequent `/setup` visits cannot steal bootstrap (already completed).
- [ ] `/login` magic link works; `/admin/*` redirects to `/login` when logged out.
- [ ] User without roles lands on **Access pending** (`NoAccess`).

## Schema & Supabase

- [ ] Apply migration `supabase/migrations/20260506160000_admin_dashboard_mvp.sql` to your cloud project.
- [ ] Add schema **`admin`** to Supabase **API → Exposed schemas** so PostgREST can reach dashboard tables.
- [ ] Confirm buckets `generated-assets` (private) and `published-assets` exist.

## Content CRUD

- [ ] Create theme draft; slug appears in Themes list; detail tabs render ([NAV-AC-4]).
- [ ] Token save rejects invalid keys at DB when constraint applies; valid 9-key hex saves.
- [ ] Create collectible draft; appears under Collectibles list.
- [ ] Store copy scanner blocks obvious SCR phrases on save.

## Reviews & publish

- [ ] Submit → QA queue; QA approve moves to Legal; Legal approve → `approved`.
- [ ] Mark **published** from detail Publish tab after gates green.
- [ ] Archive uses Danger confirm typing slug.

## Catalog

- [ ] **Publishing → Rebuild catalog** inserts `store_catalog` row + bumps `catalog_meta.last_version`.
- [ ] `GET /api/catalog/v1/latest` returns JSON (uses service role — requires `SUPABASE_SERVICE_ROLE_KEY`).
- **Security note:** Catalog route handlers are **intentionally unauthenticated** so future mobile/CDN clients can read JSON without a browser session. Production should use **CDN + rate limiting** (and/or signed URLs / API keys later). Do not treat the URL as a secret.
- [ ] **Deferred:** mobile `useCatalog` integration ([p6-mobile-catalog]) — wire `EXPO_PUBLIC_CATALOG_BASE_URL` in a follow-up ticket.

## Database (optional compat)

- [ ] Apply migration `supabase/migrations/20260507180000_admin_has_permission_compat.sql` if you want SQL `admin.has_permission(uuid, admin.admin_role[])` alongside TS `requirePermission()` (MVP uses TypeScript + RLS helpers either way).

## Deferred UX polish (post-MVP)

Not blocking manual QA: shared `useTableQuery` adoption beyond ad hoc `?q=` links, generic non-danger confirm dialog pattern, dirty-form navigation guard — tracked in sprint plan Phase 9 follow-ups.

## AI Studio

- [ ] Missing `OPENAI_API_KEY` shows server banner on `/admin/ai/images`; no surprise spend.
- [ ] Confirm dialog shows estimate; successful job writes `asset_generation_jobs` + Storage objects (when key present).
- [ ] Sound path surfaces integration stub error until ElevenLabs API is completed.

## RBAC

- [ ] Non–`super_admin` cannot open Assign Role form successfully (server returns forbidden).
- [ ] Assign role grants visible roles on Admin Users table.

## UX polish

- [ ] Toaster shows action feedback (Sonner).
- [ ] Skip-to-content link focuses main landmark.
- [ ] Themes/Collectibles search updates URL `?q=` ([useTableQuery] pattern).

## Admin branding QA

- [ ] Browser tab shows SpinVault favicon.
- [ ] Page title is `SpinVault Admin`.
- [ ] Metadata includes `noindex,nofollow` (internal admin — not indexed).
- [ ] Manifest is available at `/manifest.webmanifest`.
- [ ] Desktop sidebar wordmark renders correctly.
- [ ] Mobile top bar mark renders correctly.
- [ ] Mobile nav sheet shows mark + “SpinVault Admin”.
- [ ] No images stretch or blur noticeably.
- [ ] Confirm `mobile/` icons/assets were not overwritten (admin branding lives under `admin/` only).

**Note:** Current admin wordmark/icon are reused temporary assets; replace with final high-resolution SpinVault Admin exports before production deployment.
