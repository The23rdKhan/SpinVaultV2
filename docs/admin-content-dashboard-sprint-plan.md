# SpinVault — Admin Content Dashboard Sprint Plan

> **Audience:** Product, Engineering, Design, Audio, Legal, QA, Economy.
> **Purpose:** Authoritative plan for designing and building the internal admin platform that creates, generates, reviews, prices, publishes, and retires all live content (themes, collectibles, store items, audio, animations) consumed by the SpinVault mobile app.
> **Related docs:** `docs/theme-branding-rules.md` · `docs/theme-creation-workflow.md` · `docs/legal-launch-checklist.md`
>
> **Critical product invariant:** The dashboard manages the **machine layer**, the **collectible/profile layer**, and the **store/monetization layer** only. It must never expose a control that mutates the **global SpinVault brand shell** (app name, icon, splash, onboarding, login, register, forgot/reset, profile chrome, support, legal, IAP trust copy, store metadata).
>
> **Canonical compliance contract:** Every dashboard control, validator, scanner, and publish gate referenced in this plan exists to enforce the **Store Compliance Rules** in [Section Z](#z-store-compliance-rules-canonical) (`SCR-1` … `SCR-9`). When a section below cites `[SCR-N]`, that is the rule the control enforces. SCR rules are rule-of-law for this product; they cannot be bypassed by role, override, or feature flag.

---

## A. Executive Summary

SpinVault has reached the point where adding content (themes, collectibles, frames, badges, mystery chest items, seasonal events) requires engineering work for every release. This blocks a healthy live-ops cadence and concentrates all content risk on a small team. The Admin Content Dashboard removes this bottleneck.

**What we are building.** A standalone internal Next.js + TypeScript web app, authenticated via Supabase, backed by the existing SpinVault Postgres schema, that:

1. Lets non-engineers create, generate, price, review, schedule, publish, and retire store content.
2. Generates art, sound effects, and lightweight animations through a **provider-adapter layer** (image: OpenAI / Gemini / Nano Banana / future; audio: ElevenLabs / OpenAI TTS / licensed uploads; animation: Reanimated specs / Rive / Lottie / video uploads).
3. Enforces the SpinVault brand boundary: themes are **slot-machine skins**, not full app rebrands. The dashboard physically cannot publish a payload that overrides shell tokens, app name, icon, splash, or any auth/legal/support/onboarding screen.
4. Publishes a **versioned content catalog** consumed by the mobile app—**MVP:** served from **cloud Supabase** (table/API); **post-MVP:** optional **CDN-cached** immutable JSON—with safe rollback and offline fallback to the bundled catalog.
5. Maintains a complete audit log of every create, edit, generate, approve, publish, schedule, archive, and rollback action.

**Why now.** The mobile app already has a stable two-layer theme architecture (`useCasinoTheme` merging Master Shell + 9 machine override tokens), an IAP catalog wired to App Store Connect / RevenueCat, and a cosmetic vanity system that is currently hardcoded in `mobile/lib/vanity-data.ts`. Migrating this hardcoded content into a server-managed, admin-curated catalog is the natural next step and unblocks live-ops, seasonal events, and AI-assisted content production.

**MVP success criteria** (one quarter from kickoff):
- Two roles live: Super Admin and Content Manager.
- CRUD for themes and collectibles with one image provider behind the adapter.
- One end-to-end published seasonal collectible visible in the production mobile app.
- Mobile catalog endpoint serving versioned payloads with bundled fallback.
- Audit log capturing every create / approve / publish / archive event.

**What this plan deliberately defers.** Drop-rate gambling-economy modeling at scale, deep economy simulation, full animation editor, in-dashboard A/B testing, push-notification scheduling, and multi-tenant white-label.

---

## B. Dashboard Goals

| # | Goal | Why it matters |
|---|---|---|
| G1 | Move content production off the engineering critical path | Live-ops cadence; reduce engineering load for cosmetic releases |
| G2 | Enforce the SpinVault brand boundary in code, not in policy | Protect the Master Shell from accidental theme bleed |
| G3 | Generate art/audio/animation through pluggable providers | Avoid vendor lock-in; experiment with image/audio quality over time |
| G4 | Make every content publish reversible and auditable | Production safety; legal/IP defensibility |
| G5 | Make pricing, drop rates, and unlock requirements first-class fields with validation | Economy hygiene; App Store / Play Store policy compliance |
| G6 | Make the mobile app resilient to catalog outage | The store must never crash if the network, API, or CDN is down |
| G7 | Keep all provider keys server-side, never in Expo | Security; key rotation; cost control |
| G8 | Treat compliance review as a publish-blocking gate | Avoid App Store rejection and IP exposure |

**Non-goals (explicit).** Editing the SpinVault wordmark, app icon, splash, onboarding, login, register, forgot/reset, profile shell, support, legal documents, IAP trust copy, push-notification copy templates, or App Store / Play Store listing metadata. None of these are surfaced as editable fields anywhere in the dashboard.

---

## B2. Admin Dashboard Site Navigation and Feature Sections

> **Purpose:** Information architecture, sidebar navigation, page headers, phased nav, and feature sections for the SpinVault Admin Content Dashboard. Aligns with [§P MVP Scope](#p-mvp-scope), [§Z Store Compliance Rules](#z-store-compliance-rules-canonical), and `docs/theme-branding-rules.md`.

### B2.1 Navigation principles

- The dashboard is an **internal content operations tool**, not a public marketing site; IA favors throughput and auditability over exploration.
- Navigation prioritizes **content creation**, **review**, **publishing**, and **safety** (validators, gates, `SCR` enforcement).
- **Global SpinVault brand shell controls must never appear** in navigation or settings routes—no paths for app icon, app name, splash, onboarding/login/register shells, legal/support copy, IAP trust strings, or store listing metadata ([§B Non-goals](#b-dashboard-goals), [§Z](#z-store-compliance-rules-canonical)).
- **AI generation**, **human review** (QA / Legal), and **catalog publishing** are **separate steps** and **separate routes**; no single control chain may imply “generate and publish” without intermediate gates.
- **Paid provider actions** (OpenAI, ElevenLabs, etc.) must always show a **cost estimate** before submit and require an **explicit confirmation** step; outcomes are **audit-logged** (see [Local admin development setup](#local-admin-development-setup-default) — **Cost note and budget controls**).

### B2.2 Desktop layout

| Zone | Responsibility |
|---|---|
| **Left sidebar** | Primary navigation; grouped labels (**Operate**, **Review & Release**, **Insights**, **Admin**); MVP vs phased entries per **§B2.4–B2.5**. |
| **Top bar** | Product identifier (“SpinVault Admin”), **environment badge**, **global search** trigger, **review/publish alerts**, **user menu**; optional breadcrumb slot when detail views need hierarchy. |
| **Global search** | **MVP:** ⌘K / button opens scope-limited search (themes/collectibles slugs and titles); **V1.1:** expanded entities and jobs. |
| **Environment badge** | **`Local`** · **`Staging`** · **`Production`** — from `NEXT_PUBLIC_ADMIN_ENV` or host rules; never displays secrets. |
| **Review/publish alerts** | Badge or bell: counts for **QA queue**, **Legal queue**, **ready to publish**, **blocked publish**; links into **Reviews** sub-routes. |
| **User menu** | Signed-in admin identity, **Sign out**, minimal profile; role displayed read-only where useful. |
| **Main content area** | List pages, detail layouts, forms; max-width readable columns on wide screens. |
| **Consistent page header** | Shared pattern below top bar: title, subtitle, primary/secondary actions, optional status chips (**§B2.6**). |

**Responsive:** Sidebar collapses to icon rail or drawer below **1024px** width; top bar remains; alerts and search persist.

### B2.3 Sidebar groups

| Group | Sidebar entries |
|---|---|
| **Operate** | Dashboard · Content · Store · AI Studio |
| **Review & Release** | Reviews · Publishing |
| **Insights** | Analytics |
| **Admin** | Users · Settings · Help / Docs |

Section labels are **non-clickable** group headers in the UI chrome; only leaf routes navigate.

### B2.4 MVP navigation

MVP exposes **only** the following tree (plus optional **Coming later** disabled rows per **§B2.16**):

- **Dashboard**
- **Content**
  - Themes
  - Collectibles
- **AI Studio**
  - Image Generation
  - Sound Generation
  - Generation History
- **Reviews**
  - QA Review
  - Legal Review
  - Ready to Publish
- **Publishing**
  - Catalog
  - Version History
- **Users**
  - Admin Users
  - Audit Log
- **Settings**
  - Provider Settings
  - Brand Rules
  - Compliance Rules
  - Environment

### B2.5 Later-phase navigation

Features below are **not** MVP sidebar destinations unless shown as **disabled** “Coming later” (**§B2.16**). Assign **V1.1** or **V2.0** as indicated.

| Feature | Phase | Notes |
|---|---|---|
| Store Catalog | V1.1 | Merchandised views of published SKUs / catalog slices |
| Store Layout | V1.1 | Featured rows, ordering, promo tiles |
| Bundles | V1.1 | Bundle entities tied to IAP / coins |
| Mystery Chests | V1.1 | Chest tables, disclosure, EV (`SCR-5`) |
| Limited-Time Offers | V1.1 | Time-boxed SKUs tied to catalog |
| Coin Packs | V1.1 | Deeper editing than read-only `public.products` helpers |
| Analytics | V2.0 | Funnels, AI spend trends, catalog consumption |
| Theme Unlocks | V2.0 | Analytics slice; may surface summary on Dashboard earlier as a **card** only |
| Collectible Sales | V2.0 | Revenue/sales analytics |
| Chest Opens | V2.0 | Engagement analytics |
| Push Templates | V2.0 | Brand-locked template admin (if ever built) |
| Advanced Economy Tools | V2.0 | Simulations, bulk repricing guards |
| Scheduled Releases | V2.0 | Cron-backed promote UI beyond manual publish |
| Rollback UI | V2.0 | Full rollback/diff UX beyond minimal version list |
| Mobile Catalog Preview | V2.0 | Device-frame preview of catalog payload |

**Store parent:** The **Store** group item appears in **Operate** per **§B2.3**; MVP may land **Store** as a shell page linking forward or disabled children until **V1.1** rows ship.

### B2.6 Page header pattern

Every routable page includes:

| Element | Rule |
|---|---|
| **Page title** | H1; matches **Header title** in section tables (**§B2.8**). |
| **Short subtitle** | One line; clarifies scope without legal duplication. |
| **Primary action** | Single dominant CTA (e.g. **Create Theme**); role- and state-gated. |
| **Secondary action** | Optional (filters, export, docs link); never competes visually with primary. |
| **Status chips** | When relevant: **Draft**, **QA**, **Legal**, **Approved**, **Published**, **Archived**, **Blocked** (validator). |

**Example — Themes list**

| Field | Copy |
|---|---|
| **Title** | Themes |
| **Subtitle** | Create slot-machine skins that change the Play screen experience without changing the SpinVault brand. |
| **Primary action** | Create Theme |
| **Secondary action** | View Theme Rules (links `docs/theme-branding-rules.md`) |
| **Status chips** | Optional filters: **All** · **Draft** · **In review** · **Published** |

### B2.7 Dashboard homepage

**Route:** `/admin/dashboard` (see **§B2.15**).

#### Summary cards

| Card | Definition |
|---|---|
| **Ready for QA** | Items in `qa_review` / awaiting QA assignment |
| **Ready for Legal Review** | Items in `legal_review` / awaiting Legal |
| **Ready to Publish** | QA + Legal approved, preconditions satisfied |
| **Published Items** | Count published in selected window (e.g. 7d) |
| **Scheduled Releases** | Items with future `scheduled_at` (**V2.0** full UI; MVP card may read **0** or hide) |
| **Rejected Items** | Items returned to draft from QA or Legal |
| **AI Generations Today** | Count of completed jobs today (image + sound) |
| **Estimated AI Cost Today** | Sum of `estimateCost` for confirmed jobs today |

#### Quick actions

| Action | Route target |
|---|---|
| Create Theme | `/admin/content/themes/new` |
| Create Collectible | `/admin/content/collectibles/new` |
| Generate Image | `/admin/ai/images` |
| Generate Sound | `/admin/ai/sounds` |
| Upload Asset | `/admin/ai/uploads` or contextual modal (**MVP:** simplest path documented in implementation) |
| Publish Catalog | `/admin/publishing/catalog` |

#### Other homepage modules

| Module | Description |
|---|---|
| **Review queues** | Three compact lists or tabs: **QA**, **Legal**, **Ready to publish**; deep-link to `/admin/reviews/*` and entity detail |
| **Publish blockers** | Validator failures: missing assets, `SCR` copy violations, missing price/rarity, missing chest disclosure when linked (**V1.1**) |
| **Recent activity** | Last N `audit_log` rows with actor + action + entity |
| **Provider cost summary** | 24h / 7d estimated spend by provider; link **AI Studio → Provider Costs** (**V2.0** route; MVP shows inline summary only) |

### B2.8 Section definitions

Each table: **Purpose**, **Header title**, **Header subtitle**, **Primary actions**, **Key features**, **Phase**.

#### Dashboard

| Field | Detail |
|---|---|
| **Purpose** | Operational home: queues, blockers, spend, shortcuts. |
| **Header title** | Dashboard |
| **Header subtitle** | Today’s pipeline — review, publish, and safe releases. |
| **Primary actions** | Contextual quick actions (**§B2.7**). |
| **Key features** | Summary cards, queues, blockers, activity feed, cost widgets. |
| **Phase** | **MVP** |

#### Content

| Field | Detail |
|---|---|
| **Purpose** | Parent for themes and collectibles; optional hub cards. |
| **Header title** | Content |
| **Header subtitle** | Themes and collectibles that ship to the mobile catalog. |
| **Primary actions** | **New theme**, **New collectible** (or navigate to children). |
| **Key features** | Child links; no brand-shell fields. |
| **Phase** | **MVP** |

#### Themes

| Field | Detail |
|---|---|
| **Purpose** | Machine skins only — tokens, assets, symbols, audio, shop presence; `MACHINE_OVERRIDE_KEYS` enforced. |
| **Header title** | Themes |
| **Header subtitle** | Slot-machine skins for the Play screen — not app rebrands. |
| **Primary actions** | **Create theme**, filters by status. |
| **Key features** | List + detail tabs (**§B2.9**); validators; publish prerequisites. |
| **Phase** | **MVP** |

#### Collectibles

| Field | Detail |
|---|---|
| **Purpose** | Vanity/profile-layer items (avatars, frames, badges, titles, pets, cabinets, rooms, cars, etc.). |
| **Header title** | Collectibles |
| **Header subtitle** | Profile and store cosmetics — assets, pricing, unlocks. |
| **Primary actions** | **Create collectible**, filters by category/rarity/status. |
| **Key features** | List + detail tabs (**§B2.10**); rarity bands; chest linkage when live. |
| **Phase** | **MVP** |

#### Store

| Field | Detail |
|---|---|
| **Purpose** | Merchandising and presentation beyond individual content rows. |
| **Header title** | Store |
| **Header subtitle** | Catalog presentation, layouts, and promotions. |
| **Primary actions** | **V1.1:** configure catalog/layout/bundles; **MVP:** placeholder or read-only overview. |
| **Key features** | Phased children per **§B2.5**. |
| **Phase** | **MVP** (shell) · **V1.1** (full **Store Catalog / Layout / Bundles**) |

#### Mystery Chests

| Field | Detail |
|---|---|
| **Purpose** | Chest definitions, weights, disclosed probabilities, EV (`SCR-5`). |
| **Header title** | Mystery Chests |
| **Header subtitle** | Randomized offers with odds disclosure. |
| **Primary actions** | **New chest**, validate disclosure. |
| **Key features** | Drop tables; links to collectibles; audit. |
| **Phase** | **V1.1** |

#### AI Studio

| Field | Detail |
|---|---|
| **Purpose** | Provider-backed generation and attachment flows; cost visibility. |
| **Header title** | AI Studio |
| **Header subtitle** | Images, sound, and templates — server-side providers only. |
| **Primary actions** | **New image job**, **New sound job**. |
| **Key features** | Sub-nav (**§B2.11**); job history; safety flags. |
| **Phase** | **MVP** (image + sound + history); **V2.0** (templates admin, provider cost dashboards) |

#### Reviews

| Field | Detail |
|---|---|
| **Purpose** | Cross-content QA/Legal queues and ready-to-publish lane. |
| **Header title** | Reviews |
| **Header subtitle** | QA, Legal, and release readiness across content types. |
| **Primary actions** | **Open queue**, **Approve**, **Reject** (on detail). |
| **Key features** | Sub-nav (**§B2.12**); ties to detail **QA**/**Legal** tabs. |
| **Phase** | **MVP** |

#### Publishing

| Field | Detail |
|---|---|
| **Purpose** | Catalog snapshots, versions, promotion to mobile consumers. |
| **Header title** | Publishing |
| **Header subtitle** | Catalog versions and release history. |
| **Primary actions** | **Publish catalog**, inspect version. |
| **Key features** | Sub-nav (**§B2.13**); links to `store_catalog` / CDN path per architecture sections. |
| **Phase** | **MVP** (catalog + version history); **V2.0** (scheduled, rollback UI, mobile preview) |

#### Analytics

| Field | Detail |
|---|---|
| **Purpose** | Read-only operational and product metrics. |
| **Header title** | Analytics |
| **Header subtitle** | Usage and performance — internal only. |
| **Primary actions** | Date range (**V2.0**). |
| **Key features** | Dashboards for unlocks, sales, chest opens (**§B2.5**). |
| **Phase** | **V2.0** |

#### Users

| Field | Detail |
|---|---|
| **Purpose** | **Admin** accounts — not player profiles. |
| **Header title** | Users |
| **Header subtitle** | Admin accounts, roles, and access. |
| **Primary actions** | **Invite admin**, **Edit roles**. |
| **Key features** | Admin Users list; SSO **V1.1** when enabled. |
| **Phase** | **MVP** |

#### Settings

| Field | Detail |
|---|---|
| **Purpose** | Org config: providers, compliance references, environment. |
| **Header title** | Settings |
| **Header subtitle** | Providers, rules, and environment. |
| **Primary actions** | **Save** (where mutable); secrets remain env/Vault-only. |
| **Key features** | Sub-nav (**§B2.14**). |
| **Phase** | **MVP** |

#### Help / Docs

| Field | Detail |
|---|---|
| **Purpose** | Curated links to internal markdown and runbooks. |
| **Header title** | Help |
| **Header subtitle** | Documentation for admins. |
| **Primary actions** | External/new-tab links. |
| **Key features** | Sprint plan, theme workflow, legal checklist. |
| **Phase** | **MVP** (minimal links); **V1.1** richer index |

### B2.9 Theme detail page tabs

**Route:** `/admin/content/themes/[slug]` · Tabs are horizontal below **§B2.6** header.

| Tab | Purpose |
|---|---|
| Overview | Concept, status, ownership, flags |
| Assets | Preview, thumbnail, hero, cabinet/reel backgrounds |
| Tokens | Nine machine tokens dark/light + contrast |
| Symbols | Symbol set |
| Audio | Theme audio |
| Animations | Rive/Lottie/video (**UI weight V1.1+**) |
| Shop Copy | Store strings + `SCR` scanner |
| Pricing | Coins, IAP, limited-time |
| QA | QA gate |
| Legal | Legal/IP gate |
| Publish | Preconditions, publish actions |
| History | Versions + audit |

### B2.10 Collectible detail page tabs

**Route:** `/admin/content/collectibles/[slug]`

| Tab | Purpose |
|---|---|
| Overview | Category, rarity, status, equip summary |
| Asset | Primary asset + crop/export |
| Store Copy | Copy + `SCR` scanner |
| Pricing | Coins, IAP, limited-time |
| Unlock Rules | `unlock_requirements` editor |
| Chest Drops | Chest linkage (**V1.1** when Mystery Chests ship; **MVP:** hidden or read-only empty) |
| QA | QA gate |
| Legal | Legal gate |
| Publish | Publish actions |
| History | Versions + audit |

### B2.11 AI Studio sub-navigation

| Sub-route | Purpose | Phase |
|---|---|---|
| Image Generation | OpenAI (etc.) jobs, candidates | **MVP** |
| Sound Generation | ElevenLabs SFX jobs | **MVP** |
| Animation Uploads | Manual Rive/Lottie/video | **V1.1** |
| Prompt Templates | Template CRUD | **V2.0** |
| Generation History | All jobs | **MVP** |
| Provider Costs | Spend/analytics by provider | **V2.0** |

### B2.12 Review section sub-navigation

| Sub-route | Purpose | Phase |
|---|---|---|
| QA Review | QA queue | **MVP** |
| Legal Review | Legal queue | **MVP** |
| Ready to Publish | Preconditions met | **MVP** |
| Rejected Items | Returned to draft | **MVP** |
| Review History | Historical decisions | **V1.1** |

### B2.13 Publishing section sub-navigation

| Sub-route | Purpose | Phase |
|---|---|---|
| Catalog | Build/publish snapshot | **MVP** |
| Scheduled Releases | Future publishes | **V2.0** |
| Version History | Immutable versions | **MVP** |
| Rollback | Restore prior catalog | **V2.0** |
| Mobile Catalog Preview | Payload preview | **V2.0** |

### B2.14 Settings sub-navigation

| Sub-route | Purpose | Phase |
|---|---|---|
| Provider Settings | Models, caps, non-secret config | **MVP** |
| Brand Rules | Read-only; links `theme-branding-rules.md` | **MVP** |
| Compliance Rules | `SCR` summary + disclosures | **MVP** |
| Economy Rules | Rarity bands, validators (**V1.1** heavy editing) | **V1.1** |
| Environment | Badge mapping, feature flags (**admin-only**) | **MVP** |
| System Health | Queues, connectivity (**V2.0**) | **V2.0** |

### B2.15 Route naming suggestion (Next.js App Router)

Suggested route tree (prefix **`/admin`**). Implement as `admin/app/admin/...` in the Next.js project.

```
/admin
├── /dashboard
├── /content
│   ├── /themes
│   │   ├── /new
│   │   └── /[slug]
│   └── /collectibles
│       ├── /new
│       └── /[slug]
├── /store                    (V1.1 children: /catalog, /layout, /bundles — phased)
├── /ai
│   ├── /images
│   ├── /sounds
│   ├── /uploads              (MVP upload entry if not modal-only)
│   ├── /templates            (V2.0)
│   ├── /history
│   └── /costs                (V2.0)
├── /reviews
│   ├── /qa
│   ├── /legal
│   ├── /ready-to-publish
│   ├── /rejected
│   └── /history              (V1.1)
├── /publishing
│   ├── /catalog
│   ├── /scheduled            (V2.0)
│   ├── /versions
│   ├── /rollback             (V2.0)
│   └── /preview-mobile       (V2.0)
├── /analytics                (V2.0)
├── /users
│   ├── /admins
│   └── /audit-log
├── /settings
│   ├── /providers
│   ├── /brand-rules
│   ├── /compliance
│   ├── /economy              (V1.1)
│   ├── /environment
│   └── /health               (V2.0)
└── /help
```

**Note:** `[slug]` detail routes must expose tabs **§B2.9** / **§B2.10** including **QA**, **Legal**, **Publish**, **History**.

### B2.16 Acceptance criteria (navigation & IA)

| ID | Criterion |
|---|---|
| **NAV-AC-1** | Navigation and settings expose **no** controls or routes for app icon, app name, splash, legal/support copy, onboarding/login/register branding, IAP trust language, or App Store / Play metadata ([§B Non-goals](#b-dashboard-goals)). |
| **NAV-AC-2** | **AI generation** is **not** one click from **publish**; publishing routes require passing QA/Legal gates and catalog build steps. |
| **NAV-AC-3** | Every **paid** generation path displays **cost estimate** and requires **explicit confirmation** before invoking provider APIs; each job writes **audit** metadata. |
| **NAV-AC-4** | Every **theme** and **collectible** detail page includes **QA**, **Legal**, **Publish**, and **History** tabs (even if read-only for some roles). |
| **NAV-AC-5** | **MVP** sidebar lists **only** **§B2.4** routes; **V1.1** / **V2.0** items from **§B2.5** do **not** appear as active links unless shown **disabled** with **Coming later** (no accidental navigation to shipped stubs). |
| **NAV-AC-6** | **Store** group placement matches **§B2.3**; phased store features remain absent or disabled per **NAV-AC-5** until their phase ships. |

---

## C. Admin Roles

Roles are enforced at three layers: (1) Supabase RLS policies on every admin table, (2) Next.js middleware guarding admin route segments, (3) UI affordance gating in the dashboard.

### C.1 Role definitions

| Role | Primary persona | Scope |
|---|---|---|
| `super_admin` | Engineering / founders | All actions, including role assignment, provider configuration, hard-delete, and rollback |
| `content_manager` | Live-ops / product | Create and edit content, request generation, submit for review, schedule publish |
| `artist_designer` | Art / design | Generate images, edit/crop/export assets, mark candidates as preferred, upload manual assets |
| `economy_manager` | Monetization / data | Set/change price, drop rates, rarity, unlock requirements, limited-time windows |
| `qa_reviewer` | QA | Approve/reject art, copy, and assembled items at QA gate |
| `legal_compliance` | Legal | Approve/reject items at legal/IP gate; flag prompts and copy |
| `read_only_viewer` | Stakeholders, exec, partners | Browse catalog, audit log, and dashboards; no writes |

### C.2 Permission matrix

`C` = create draft · `E` = edit · `G` = trigger AI generation · `A` = approve at gate · `P` = publish/schedule/unpublish · `Arc` = archive · `$` = change pricing · `D` = change drop rates · `U` = change unlock rules · `R` = rollback · `Adm` = admin (assign roles, providers, secrets)

| Action | super_admin | content_manager | artist_designer | economy_manager | qa_reviewer | legal_compliance | read_only_viewer |
|---|---|---|---|---|---|---|---|
| Create content draft (C) | ✓ | ✓ | ✓ (assets only) | — | — | — | — |
| Edit content fields (E) | ✓ | ✓ | ✓ (image/asset fields only) | ✓ ($, D, U) | — | — | — |
| Trigger AI generation (G) | ✓ | ✓ | ✓ | — | — | — | — |
| Approve QA gate | ✓ | — | — | — | ✓ | — | — |
| Approve Legal/IP gate | ✓ | — | — | — | — | ✓ | — |
| Publish / schedule / unpublish (P) | ✓ | ✓ (only if QA + Legal approved) | — | — | — | — | — |
| Archive (Arc) | ✓ | ✓ | — | — | — | — | — |
| Change pricing ($) | ✓ | — | — | ✓ | — | — | — |
| Change drop rates (D) | ✓ | — | — | ✓ | — | — | — |
| Change unlock requirements (U) | ✓ | — | — | ✓ | — | — | — |
| Rollback published version (R) | ✓ | ✓ (recent only, audit logged) | — | — | — | — | — |
| Manage roles, providers, secrets (Adm) | ✓ | — | — | — | — | — | — |
| View catalog, audit log, dashboards | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

**Hard rules baked into RLS, not just UI:**
- No role can mutate any field listed under "Themes Must Not Change" in `docs/theme-branding-rules.md` §4. Those fields do not exist as columns in the admin schema.
- No role can publish unless `qa_status = approved` AND `legal_status = approved` AND all required fields (price, rarity, asset URLs, drop-rate-disclosure-where-applicable) are populated.
- Only `super_admin` can rotate provider API keys (**production:** Supabase Vault / host secrets; **local dev:** `.env.local` on the engineer's machine only, never in tables or git).

---

## D. Content Models

All content items share a common `content_items` envelope plus a category-specific extension table. This keeps queries cheap, audit consistent, and lets us add new categories without schema rewrites.

### D.1 Common envelope (`content_items`)

| Field | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | Internal ID |
| `slug` | `text` unique | Human-readable, immutable after publish (`pharaoh-frame-gold`) |
| `category` | `enum` | `theme` · `collectible` · `avatar` · `frame` · `badge` · `title` · `pet` · `cabinet` · `room` · `car` · `chest_drop` · `seasonal_bundle` |
| `display_name` | `text` | ≤ 32 chars |
| `description` | `text` | Internal description; not shown to users |
| `store_copy` | `jsonb` | `{ tagline, shortDescription, longDescription }` — all length-validated |
| `rarity` | `enum` | `common` · `rare` · `epic` · `legendary` · `mythic` |
| `price_coins` | `bigint` nullable | Virtual coin price; null if IAP-only |
| `iap_sku` | `text` nullable | `com.spinvault.<sku>`; null if coins-only |
| `is_iap_only` | `boolean` | True when `price_coins is null` |
| `is_limited` | `boolean` | True for limited-time items; requires `start_at` and `end_at` |
| `start_at` | `timestamptz` nullable | Scheduled availability start |
| `end_at` | `timestamptz` nullable | Scheduled availability end (required if `is_limited`) |
| `unlock_requirements` | `jsonb` | `{ minLevel, requiresItemId, requiresAchievement, requiresEvent, requiresVipTier }` |
| `ownership_rules` | `jsonb` | `{ maxOwned, accountBound: true, transferable: false }` |
| `equip_rules` | `jsonb` | `{ slot, mutuallyExclusiveWith: [slug…] }` |
| `preview_image_url` | `text` | CDN URL; small preview |
| `thumbnail_url` | `text` | CDN URL; tile/list use |
| `full_image_url` | `text` | CDN URL; hero / detail use |
| `video_preview_url` | `text` nullable | Optional store animation preview |
| `theme_token_data` | `jsonb` nullable | Only for `category = 'theme'`; see D.2 |
| `legal_status` | `enum` | `not_started` · `in_review` · `approved` · `rejected` |
| `qa_status` | `enum` | `not_started` · `in_review` · `approved` · `rejected` |
| `publish_status` | `enum` | `draft` · `generating_assets` · `ready_for_review` · `qa_review` · `legal_review` · `approved` · `scheduled` · `published` · `archived` · `rejected` |
| `current_version_id` | `uuid` nullable | FK to `publish_versions.id` |
| `created_by` | `uuid` | FK `admin_users.id` |
| `approved_by` | `jsonb` | `{ qa: { adminId, at }, legal: { adminId, at }, publish: { adminId, at } }` |
| `created_at` / `updated_at` | `timestamptz` | |

Indexes: `(category, publish_status)`, `(slug)` unique, `(start_at, end_at)` partial where `is_limited = true`, GIN on `unlock_requirements`.

### D.2 Category extensions

#### Theme (`theme_items`)
- `theme_slug` (mirrors `content_items.slug`; FK to existing `public.themes.slug`).
- `tokens_dark` (`jsonb`, exactly the 9 `MACHINE_OVERRIDE_KEYS`, validated by JSON schema).
- `tokens_light` (`jsonb`, same 9 keys).
- `symbol_set_id` (FK `symbol_sets.id`; nullable, falls back to default symbol set).
- `audio_set_id` (FK `audio_sets.id`; nullable, falls back to default sounds).
- `animation_set_id` (FK `animation_sets.id`; nullable).
- `cabinet_dark_url`, `cabinet_light_url`, `reel_dark_url`, `reel_light_url`.
- `contrast_checks` (`jsonb`, the WCAG ratio table from `theme-creation-workflow.md` §2.2).

> **Hard rule.** `tokens_dark` / `tokens_light` are validated by JSON schema to contain **only** the 9 keys in `MACHINE_OVERRIDE_KEYS`. Any other key fails write at the database `CHECK` constraint and at the API server action. No code path lets an admin override `background`, `surface`, `primary`, `textPrimary`, etc.

#### Collectible / Avatar / Frame / Badge / Title / Pet / Cabinet / Room / Car (`collectible_items`)
Single shared extension table; `equip_slot` discriminates.
- `equip_slot` (`enum`: `avatar` · `frame` · `badge` · `title` · `pet` · `cabinet_skin` · `room_bg` · `car` · `none`).
- `animation_asset_id` (`uuid` nullable; FK `animation_assets.id`).
- `audio_cue_id` (`uuid` nullable; equip stinger).
- `lottie_or_rive_url` (`text` nullable).
- `seasonal_event_id` (`uuid` nullable; FK `seasonal_events.id`).

#### Mystery Chest Drop (`chest_drop_entries`)
- `chest_id` (FK `mystery_chests.id`).
- `content_item_id` (FK `content_items.id`).
- `weight` (`numeric(10,4)`; relative weight; we compute `probability` at publish time).
- `pity_pull_min` (nullable).
- `disclosed_probability_pct` (`numeric(6,4)`; **must be present** for any chest exposed in regions requiring drop-rate disclosure).

#### Seasonal Event Bundle (`seasonal_bundles`)
- `event_id` (FK `seasonal_events.id`).
- `included_item_ids` (`uuid[]`).
- `bundle_price_coins`, `bundle_iap_sku`, `bundle_savings_pct` (computed, validated).
- `start_at`, `end_at` (event window; required).

### D.3 Field validations (server-enforced)

- `display_name` ≤ 32 chars; `tagline` ≤ 40; `shortDescription` ≤ 80; `longDescription` ≤ 200.
- `price_coins` between `RARITY_PRICE_BANDS[rarity].min` and `…max` (warn if outside, hard-block if outside ±50%).
- `is_limited = true` ⇒ `start_at` and `end_at` not null and `end_at > start_at + 1 hour`.
- Theme `tokens_dark` / `tokens_light` each match the JSON schema `theme.tokens.v1.json` (exactly 9 keys, hex-color string format).
- Chest entries summed by `chest_id`: weights normalize, computed disclosed probabilities sum to 100% within ±0.01.
- `iap_sku` matches `^com\.spinvault\.[a-z0-9_.]+$` and exists in `public.products`.

---

## E. AI Image Generation Workflow

The dashboard's image workflow is **provider-agnostic by design** — see Section L.4 for the full provider adapter interface. This section describes the human-facing flow.

### E.1 Lifecycle

```
[Select asset type] → [Choose template] → [Edit prompt + params] → [Submit job]
        ↓
[Provider adapter generates N candidates]  (job persisted)
        ↓
[Candidates appear in review grid] → [Artist selects + crops + exports]
        ↓
[Asset attached to content item] → [QA review] → [Legal/IP review]
        ↓
[Approved] → [Eligible for publish]
```

### E.2 Asset types covered

Theme preview card · theme shop thumbnail · slot reel symbol · slot symbol set (full 10) · avatar · profile frame · badge · pet companion · cabinet skin · room background · mystery chest art · seasonal event banner · store promo card.

Each asset type has a fixed **output spec** (resolution, aspect ratio, transparency, safe-zone) defined once in `assetSpecs` and applied automatically at export.

### E.3 Generation parameters (UI fields)

- Asset type (selects spec + template family).
- Style direction (theme preset: `vegas`, `cyber`, `treasure`, or custom).
- Provider (selectable from configured providers; default = current org default).
- Prompt (multi-line; live-validated against safety rules — see J.3).
- Negative prompt (optional).
- Aspect ratio (preset to spec; not editable for finalized asset types).
- Transparent background (boolean; available where the provider supports it).
- Reference images (up to N; uploaded to a private bucket, never sent client-side).
- Style preset (provider-specific; saved per asset type).
- Candidate count (`1`, `2`, `4`).
- Seed (read-only, recorded post-generation; editable on regeneration to lock or vary).

### E.4 Selection, crop, export

After candidates return:

- Each candidate is stored under `generated_assets/<jobId>/<candidateIdx>.png` with full metadata.
- The artist selects one candidate; rejected candidates remain stored for audit but are flagged `selected = false`.
- An in-dashboard cropper enforces the asset spec's safe-zone and final resolution. Output is exported as PNG (and WebP; see O.4).
- The exported asset is stored under `published_assets/<contentItemSlug>/<assetType>-v<n>.{png,webp}` and linked to the content item.
- The artist can mark the asset as "approved for review"; this transitions the parent item to `ready_for_review`.

### E.5 Prompt history & versioning

For every job we persist: prompt text, negative prompt, provider, model, seed (if returned), revised prompt (if returned), parameters, cost estimate, safety-check result, candidate URLs, selected-candidate index, created_by, created_at. This is the full audit trail required for IP defensibility.

---

## F. Prompt Template System

Templates live in `prompt_templates` and are versioned. Each template renders a final prompt by interpolating slots (`{{theme_name}}`, `{{primary_color}}`, etc.) and prepending mandatory **safety preamble** and **brand directives** that admins cannot edit.

### F.1 Template structure

```ts
type PromptTemplate = {
  id: string                  // uuid
  slug: string                // e.g. 'theme.premium-casino'
  name: string                // display name
  assetTypes: AssetType[]     // which asset types may use this template
  brandDirectives: string     // immutable text injected before user prompt
  safetyDirectives: string    // immutable text injected before user prompt
  bodyTemplate: string        // user-editable, with {{slots}}
  negativeTemplate: string    // negative prompt template
  defaultParams: {
    aspectRatio: string
    transparentBackground: boolean
    stylePreset?: string
  }
  version: number
  createdBy: uuid
  createdAt: timestamptz
}
```

### F.2 Initial template set

| Slug | Asset types | Purpose |
|---|---|---|
| `theme.premium-casino` | theme preview, cabinet, reel | Vegas-style premium slot machine art |
| `theme.cyber-neon` | theme preview, cabinet, reel | Cyberpunk neon slot art |
| `theme.treasure-island` | theme preview, cabinet, reel | Tropical treasure adventure slot art |
| `theme.seasonal-event` | seasonal banner, theme preview | Seasonal event art (Halloween, Lunar NY, etc.) |
| `avatar.icon` | avatar | Stylized circular avatar icon |
| `frame.profile` | frame | Decorative frame ring; transparent center |
| `badge.flat` | badge | Flat circular badge; high readability at 64px |
| `pet.companion` | pet | Stylized companion creature; transparent BG |
| `cabinet.skin` | cabinet | Slot cabinet front art; safe-zone respected |
| `symbol.reel` | reel symbol | Single 120×120 reel symbol; transparent BG |
| `room.background` | room bg | Wide room background scene |
| `event.banner` | seasonal banner | Wide promotional banner |

### F.3 Mandatory directives (never editable, prepended on every render)

**Brand directives**
- "SpinVault is a free-to-play casual slots game with virtual coins only."
- "Do not depict real currency, dollar signs, slot machine cash trays, real-world casino logos, or branded chips."
- "Do not depict real persons, celebrities, or trademarked characters."
- "All composition must respect the asset's declared safe zone."

**Safety directives**
- "No nudity, no graphic violence, no gore, no drug paraphernalia."
- "No flashing-light strobe effects or seizure-inducing patterns."
- "No depictions implying guaranteed wins, cash payouts, or real-money gambling."
- "No copyrighted IP, no character likenesses, no trademarked logos or wordmarks."
- "No text overlays unless the template explicitly opts in."

The dashboard renders the final prompt as `safetyDirectives + brandDirectives + body` and shows the admin a **read-only preview** of the full submitted prompt before generation. This makes the safety preamble auditable.

### F.4 Per-asset-type defaults

Per asset spec the dashboard locks the resolution and aspect ratio at the export stage regardless of what the provider produces, and re-runs the safety scan on every regeneration.

---

## G. Theme Creation Workflow

The dashboard exposes the existing `docs/theme-creation-workflow.md` phases as a guided **Theme Wizard**. Every phase gate requires the corresponding role to sign off; the next phase unlocks only when the previous is `approved`.

```
Phase 0: Concept                 (content_manager)
   ↓
Phase 1: AI Generation           (artist_designer, content_manager)
   ↓
Phase 2: Token Selection         (artist_designer + JSON schema validator)
   ↓
Phase 3: Symbol Set              (artist_designer; optional, defaults supplied)
   ↓
Phase 4: Audio Set               (audio lead; optional)
   ↓
Phase 5: Animation Set           (designer; optional)
   ↓
Phase 6: Preview Card + Hero     (artist_designer)
   ↓
Phase 7: Store Copy + Pricing    (content_manager + economy_manager)
   ↓
Phase 8: QA Review               (qa_reviewer)
   ↓
Phase 9: Legal/IP Review         (legal_compliance)
   ↓
Phase 10: Publish (immediate / scheduled)   (super_admin or content_manager)
```

### G.1 Wizard guarantees

- **Token validator** rejects any save where `tokens_dark` or `tokens_light` contain a key outside `MACHINE_OVERRIDE_KEYS`, or where any value is not a 6- or 8-digit hex.
- **Contrast checker** runs the WCAG 3:1 / 4.5:1 ratio table from `theme-creation-workflow.md` §2.2 server-side and persists the measured ratios into `theme_items.contrast_checks`.
- **Brand-bleed check** statically scans the theme spec for any reference to shell tokens (`background`, `surface`, `textPrimary`, `primary`, `accent`, `gold`, `bonus`, `freeSpin`, `destructive`); presence of any blocks publish.
- **Asset spec check** ensures every required asset (preview card 640×360, thumbnail 128×128, hero 1080×540, cabinet dark/light 480×720, reel dark/light 360×480) is attached and dimensionally correct.

### G.2 Pre-publish gate

The Publish action is grayed out unless **all** of the following are true (server-enforced, not just UI):

- Tokens validated, contrast ratios all passing.
- All required assets attached and processed for both PNG + WebP.
- `store_copy` populated and length-valid.
- `price_coins` (or `iap_sku`) set and within rarity band.
- `qa_status = approved` and `legal_status = approved`.
- No open prompt-safety flags.
- Boundary compliance check passing (see G.1).

---

## H. Collectible Creation Workflow

```
Phase 0: Category + Rarity       (content_manager)
   ↓
Phase 1: Equip slot + ownership  (content_manager)
   ↓
Phase 2: AI Generation           (artist_designer)
   ↓
Phase 3: Crop + Export           (artist_designer; auto-fits asset spec)
   ↓
Phase 4: Animation (optional)    (designer; Rive/Lottie or none)
   ↓
Phase 5: Pricing + Unlock        (economy_manager)
   ↓
Phase 6: Chest assignment        (economy_manager; optional)
   ↓
Phase 7: QA Review               (qa_reviewer)
   ↓
Phase 8: Legal Review            (legal_compliance)
   ↓
Phase 9: Publish                 (content_manager / super_admin)
```

**Wizard guarantees:**
- Equip-slot uniqueness rules enforced (one frame equipped at a time, one pet at a time, etc.) and surfaced as `equip_rules`.
- Mutual exclusion (e.g., `bundleId` includes the item) flagged on save.
- If a chest assignment is made, the dashboard recomputes the chest's expected value and disclosed probabilities and refuses to save if drop-rate disclosure is missing.

---

## I. Economy and Pricing Controls

### I.1 Recommended price bands by rarity

| Rarity | Coin floor | Coin ceiling | Notes |
|---|---|---|---|
| common | 0 | 2 500 | Most common items free or low-friction |
| rare | 2 500 | 12 500 | Mid-tier paywall |
| epic | 12 500 | 35 000 | Premium tier |
| legendary | 35 000 | 100 000 | Aspirational, often event-bound |
| mythic | 100 000 | 500 000 (or IAP-only) | Rarely sold for coins; usually chest- or bundle-locked |

These bands are stored in `economy_config.rarity_price_bands` and editable only by `super_admin`.

### I.2 Validations and warnings

- **Soft warning** (yellow) if price is within band but at the extreme 10%.
- **Hard block** (red) if price is more than ±50% outside the band.
- **Hard block** if `is_limited = true` and `end_at` is null.
- **Hard block** if a chest, loot box, or any randomized purchase entry is missing `disclosed_probability_pct` for *any* region — disclosure runs globally, not per-region `[SCR-5]`. (Region-specific extra cards may still be added.)
- **Hard block** on any purchasable virtual currency SKU that exposes an expiration field; `iap_sku` rows where `kind = 'coin_pack'` or `'bundle'` are server-validated to have no `expires_at` `[SCR-6]`.
- **Hard block** on any cosmetic content item whose schema attempts to declare a gameplay effect (`affects_rng`, `affects_payout`, `affects_odds`, `bet_multiplier`, etc.). The columns do not exist in the admin schema; any attempt to add them in code review fails the boundary scanner CI step `[SCR-3, SCR-4]`.
- **Hard block** on any digital purchase row that does not declare an `iap_sku` matching `^com\.spinvault\.[a-z0-9_.]+$` (Apple/Google IAP) when `is_iap_only = true`. Web-checkout SKUs are only allowed if explicitly tagged with a region-entitlement flag set by `super_admin` `[SCR-9]`.
- **Soft warning** if a "limited" item is repriced more than once in 14 days.
- **Soft warning** if drop rates produce an EV that falls outside `[0.6×price, 1.4×price]`.

### I.3 Mystery chest expected value (EV)

For each chest, the dashboard renders:

```
EV(chest) = Σ probability_i × value_estimate_i

where value_estimate_i is sourced from:
  - explicit_estimated_value if set,
  - else collectible.priceCoins,
  - else rarity_floor[rarity_i].
```

The EV display warns if:
- `EV / price < 0.6` (chest is bad value; player-trust risk).
- `EV / price > 1.4` (chest is over-generous; revenue risk).
- Sum of disclosed probabilities ≠ 100% within ±0.01.

### I.4 Limited-time and event controls

- Time windows are surfaced as a single `start_at` / `end_at` pair, with timezone (`America/New_York` default; admin-selectable).
- The Publish step refuses to schedule an item that ends in less than 1 hour.
- Items in a `seasonal_bundle` inherit the event window and cannot extend past the event `end_at`.

---

## J. Compliance and Safety Checks

The dashboard enforces compliance at three points: **prompt submission**, **content draft save**, and **publish**. A failure at any point blocks the action and surfaces the offending field.

### J.1 Copy compliance scanner

A server-side regex + denylist scanner runs on every `display_name`, `tagline`, `shortDescription`, `longDescription` save, and on every `prompt_templates.body_template` save. Categories of forbidden phrases (each anchors to a Store Compliance Rule in [Section Z](#z-store-compliance-rules-canonical)):

| Category | Examples | Rule |
|---|---|---|
| Cashout / withdraw | "cashout", "cash out", "withdraw", "withdrawal", "redeem for cash" | `SCR-2`, `SCR-7` |
| Profit / earn | "profit", "earn money", "make money", "income", "ROI" | `SCR-2`, `SCR-7` |
| Prize / payout / winnings | "prize", "prizes", "payout", "payouts", "real winnings", "real prizes" | `SCR-7` |
| Real-money gambling | "real money", "real cash", "cash prize", "real-money", "wager" (in user-facing copy) | `SCR-1`, `SCR-7` |
| Currency-symbol leakage | bare `$`, `€`, `£`, `¥` as a balance/win label (App Store/Play prices in IAP UI are not authored by admins and are exempt) | `SCR-8` |
| Trade / transfer | "trade", "transfer", "sell", "exchange", "gift to friend" applied to coins or items | `SCR-2` |
| Currency expiration | "expires", "expiring coins", "use before", "valid for N days" applied to purchased coins | `SCR-6` |
| Gameplay-effect claims | "increases odds", "boosts payout", "better RNG", "higher jackpot rate", "improves win rate" | `SCR-4` |
| Misleading scarcity | "only N left" without numeric backing; "ends soon" without `end_at` | `SCR-5` (adjacent) |
| Trademark risk | Casino brand names (curated list), known game brand names, celebrity surnames | (IP) |
| Guarantee language | "guaranteed", "always wins", "never loses", "100% chance" | `SCR-7` |
| Adult / inappropriate | denylist (curated) | (Safety) |

Offending phrases highlight inline in the editor with the rule that flagged them and the SCR id. **Overrides:**
- Categories tied to `SCR-1`, `SCR-2`, `SCR-3`, `SCR-4`, `SCR-6` are **non-overridable by any role**, including `super_admin`. The save fails at the database constraint level.
- Other categories can be overridden by `legal_compliance` with a written justification, which is recorded in `audit_log`.

The scanner also runs against `store_copy.shortDescription` and `store_copy.longDescription` of items already published whenever the catalog is rebuilt. A regression in published copy fails the catalog build and triggers a Slack alert.

### J.2 Drop-rate disclosure check

For any item assigned to a `mystery_chest`:
- `disclosed_probability_pct` must be set per entry.
- The dashboard renders a published-style disclosure card and links it into the mobile chest view.
- Publish blocks if the chest has any entry without a disclosed probability and the chest is shipped to a disclosure region.

### J.3 Prompt safety scanner

Runs before a generation job is submitted to any provider. Checks for:

- Names of known IP characters (curated list, expandable; e.g., "Mickey Mouse", "Harry Potter").
- Trademarked brand names (e.g., "MGM", "Caesars", "Ferrari").
- Celebrity name patterns (basic surname denylist + LLM-based name detector).
- Casino/cashout language ("real money", "win cash").
- Adult / violent terms (curated denylist).

The scan is **advisory** for `super_admin` (warn + audit) and **blocking** for everyone else. All overrides are audit-logged with justification.

### J.4 Generated-image safety review

- Each provider adapter exposes the provider's own safety result; the dashboard records it in `generated_assets.safety_status`.
- Images with `safety_status = flagged` cannot be marked as the selected candidate without a `legal_compliance` override.
- The dashboard offers a manual "report this image" affordance; reported images are removed from publication and queued to legal review.

### J.5 Required-disclosure copy

The dashboard injects standard SpinVault compliance copy into store views and into the published catalog payload's `disclosures` field. Admins can never edit these strings; they are constants in `shared/legal-disclosures.ts` and emitted by the catalog builder:

| String | Rule |
|---|---|
| "Virtual coins only. No cash value." | `SCR-1` |
| "Coins and items cannot be redeemed, withdrawn, sold, traded, transferred, or exchanged." | `SCR-2` |
| "Themes and collectibles are cosmetic only and do not affect odds, payouts, jackpot frequency, or game math." | `SCR-3`, `SCR-4` |
| "Purchased coins do not expire." | `SCR-6` |
| "Drop rates: [auto-rendered table]." | `SCR-5` |
| "All purchases are processed by the App Store / Google Play." | `SCR-9` |

Disclosure rendering rules:
- The chest disclosure card (`SCR-5`) appears **before the purchase confirmation step** in the mobile app's chest-buy flow. The catalog payload includes the table; the mobile app never computes probabilities locally.
- The "no expiration" string (`SCR-6`) appears on every coin-pack tile in the shop.
- The "cosmetic only" string (`SCR-3`/`SCR-4`) appears on every theme and collectible detail page.

---

## K. Publishing Workflow

### K.1 Status machine

```
draft
  ↓ (assets requested)
generating_assets
  ↓ (assets attached, copy filled)
ready_for_review
  ↓ (submit to QA)
qa_review  → rejected → draft
  ↓ (qa_status = approved)
legal_review → rejected → draft
  ↓ (legal_status = approved)
approved
  ↓ (admin publishes)
scheduled  ──────► published   (immediate or at start_at)
  ↓                  ↓
  └─ unpublish ──┐   ↓
                 ▼   ↓
              archived  ◄── archive (any state above approved)
```

### K.2 Publish actions

| Action | Inputs | Effect |
|---|---|---|
| Immediate publish | `contentItemId` | Creates new `publish_versions` row; promotes to `published`; bumps catalog version; updates **`store_catalog` in cloud Postgres** · **MVP:** no CDN invalidation required · **Later:** CDN cache invalidated |
| Scheduled publish | `contentItemId`, `publishAt` | Creates `scheduled_releases` row; cron promotes at `publishAt`; audit-logged |
| Unpublish | `contentItemId` | Sets `publish_status = approved` (back to staging); does **not** revoke entitlement from existing owners |
| Archive | `contentItemId` | Sets `publish_status = archived`; removed from store but preserved for owners |
| Rollback | `contentItemId`, `targetVersionId` | Promotes a previous `publish_versions` row back to current; new audit entry |

### K.3 Versioning & catalog

Each publish creates a `publish_versions` row capturing the full snapshot of the item (envelope + extension + asset URLs + token data + drop rates + price). The mobile app fetches a single bundled `catalog.json` keyed by `catalog_version` (monotonic int).

### K.4 Audit log

Every state transition, edit, generation job, role assignment, and publish/rollback writes to `audit_log` with `actor_id`, `action`, `entity_type`, `entity_id`, `before`, `after`, `at`. Audit log is append-only; admins cannot delete entries.

---

## L. Backend Architecture

### L.1 High-level

```
┌────────────────────────────────────────────────────────────────────┐
│  SpinVault Admin Dashboard         SpinVault Mobile App            │
│  Next.js 14+ App Router            Expo React Native               │
│  TypeScript, RSC + Server Actions  TypeScript                      │
│                                                                    │
│   ▲                                  ▲                             │
│   │ session cookie                   │ HTTPS GET /catalog/v1       │
│   │ (Supabase SSR)                   │ (cached, signed, versioned) │
│   ▼                                  ▼                             │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │                Supabase (Postgres + Auth + Storage)           │  │
│ │                                                               │  │
│ │  • admin_users / admin_roles (RLS-protected)                  │  │
│ │  • content_items + extension tables                           │  │
│ │  • generated_assets / asset_generation_jobs                   │  │
│ │  • publish_versions / store_catalog / audit_log               │  │
│ │  • Storage buckets: generated-assets/, published-assets/      │  │
│ └──────────────────────────────────────────────────────────────┘   │
│        │                                                           │
│        │  service_role JWT (server-only)                           │
│        ▼                                                           │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │  Server Actions / Route Handlers (MVP) · Edge Functions / Worker (later) │   │
│ │  • image-gen-job worker        (calls ImageProviderAdapter)  │   │
│ │  • audio-gen-job worker        (calls AudioProviderAdapter)  │   │
│ │  • catalog-publish job         (MVP: Postgres store_catalog; later: CDN JSON) │   │
│ │  • scheduled-release cron      (promotes scheduled items)    │   │
│ └──────────────────────────────────────────────────────────────┘   │
│        │                                                           │
│        ▼                                                           │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │  Provider Adapters (server-only; keys in .env.local dev, Vault prod) │   │
│ │  Image:  OpenAIImageProvider · GeminiImageProvider · …       │   │
│ │  Audio:  ElevenLabsProvider · OpenAITTSProvider · Upload     │   │
│ │  Animation: RiveStorageProvider · LottieStorageProvider …    │   │
│ └──────────────────────────────────────────────────────────────┘   │
│        │                                                           │
│        ▼                                                           │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │  CDN (Cloudflare or Vercel Edge)                             │   │
│ │  /catalog/v1/<version>.json                                  │   │
│ │  /assets/<path>.{png,webp,mp3,riv,json}                      │   │
│ └──────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────┘
```

### L.2 Recommended dashboard stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 14+ App Router, RSC + Server Actions | Aligns with existing engineering competency; SSR-first; simple deploy |
| Language | TypeScript 5+, strict | Match mobile and Supabase typings |
| UI | Tailwind CSS + shadcn/ui + Radix | Fast, accessible, internal-tool-friendly |
| Forms / validation | React Hook Form + Zod | Schema-first, shared with server action validators |
| Data fetching | TanStack Query for client-side; RSC for server reads | Cache invalidation on publish |
| State | URL state + Zustand for ephemeral UI | Avoid global state for content; the DB is source of truth |
| Auth | Supabase Auth + `@supabase/ssr` | Reuses existing Supabase project; cookie-based sessions |
| Storage | Supabase Storage (private `generated-assets`, public-via-signed-URL `published-assets`) | One platform; signed URLs for asset distribution |
| Background jobs | **MVP / early sprints:** image + audio jobs invoked from **local Next.js** Route Handlers or Server Actions (same machine as `pnpm dev`). **Later:** Supabase Edge Functions, dedicated workers on Fly.io / Render, `pg_cron` for scheduled releases | Keeps MVP simple; cloud worker/R2/CDN deferred (§U.2–U.5) |
| Observability | Sentry + Supabase logs + structured events into `analytics_events` | Reuse existing analytics pipeline |
| Deploy | **Development:** local Next.js + **cloud** Supabase (no local Supabase required). **Production:** Vercel (or similar) + cloud Supabase + optional CDN—deferred until after MVP sprints (see §U.2–U.5). |

### Local admin development setup (default)

**Supabase does not need to be local.** The standard workflow is a **local Next.js admin dashboard** (`pnpm dev` on localhost) connected to the **normal cloud Supabase project** for Auth, Postgres, RLS, and (for MVP) Storage. **Local Supabase** (`supabase start`) is **optional**—use it only for offline migration experiments or when you deliberately want to avoid touching cloud data; it is **not** a prerequisite for building or testing the admin app.

#### 1. Local dashboard + cloud Supabase mode

| Concern | Recommended behavior |
|---|---|
| Admin runtime | Next.js dev server on localhost |
| Supabase | **Cloud** project URL and keys (same as staging or a dedicated dev project—team choice) |
| Auth / Postgres / RLS | All validated against **cloud** Supabase |
| Storage | **Cloud** Supabase Storage buckets (MVP) |
| OpenAI image generation | **Real** calls from **Next.js Server Actions or Route Handlers** on the local machine; provider SDK only imported in server modules |
| ElevenLabs SFX | Same server boundary as OpenAI |
| Provider API keys | **`admin/.env.local` only** (gitignored); never committed |
| Expo / mobile app | **Never** bundles or receives OpenAI, ElevenLabs, or `SUPABASE_SERVICE_ROLE_KEY` |

#### 2. Recommended MVP setup (first implementation phase)

| Layer | Choice |
|---|---|
| Admin dashboard | Local Next.js (dev server) |
| Database / Auth | Cloud Supabase |
| Storage | Supabase Storage first |
| Image provider | OpenAI (`IMAGE_PROVIDER=openai`) |
| Audio provider | ElevenLabs SFX (`AUDIO_PROVIDER=elevenlabs`) |
| Animation | Manual upload (Rive / Lottie / video); `ANIMATION_PROVIDER=upload` |
| Catalog output | **`CATALOG_OUTPUT=supabase`** — write published snapshot to `store_catalog` (or equivalent table); optional **local JSON** file for quick iteration; **CDN + immutable JSON URLs** deferred until post-MVP |
| Mobile | Fetches catalog from **cloud Supabase** (e.g. RPC, REST, or Edge Function reading `store_catalog`) **or** a **local dev API route** when pointing the app at your machine (use only on trusted networks) |

#### 3. Environment variables (example)

Commit **`.env.example`** with placeholder names only; real values live in **`.env.local`** (never committed).

```bash
# Dev ergonomics (optional flag for UI / logging)
LOCAL_ADMIN_MODE=true

# Cloud Supabase (same project the mobile app can use for Auth/data)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Image generation (server-only)
IMAGE_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_IMAGE_MODEL=gpt-image-2

# Audio generation (server-only)
AUDIO_PROVIDER=elevenlabs
ELEVENLABS_API_KEY=...

# Animation: uploads only in MVP
ANIMATION_PROVIDER=upload

# Assets
ASSET_STORAGE=supabase
SUPABASE_STORAGE_BUCKET=admin-generated-assets

# Catalog: table-first for MVP; CDN later
CATALOG_OUTPUT=supabase
CATALOG_TABLE=store_catalog
```

#### 4. Security rules (keys and server boundary)

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are **safe** to expose to the admin browser client (they are public by design; RLS still protects data).
- **`SUPABASE_SERVICE_ROLE_KEY`**, **`OPENAI_API_KEY`**, **`ELEVENLABS_API_KEY`**, and any other provider secret must stay **server-side only**: load them in Server Actions, Route Handlers, or server-only modules; **never** prefix with `NEXT_PUBLIC_`.
- **Never** add provider keys or the service role key to the Expo / React Native app or `app.config` extras.
- **Only** server actions and API routes import provider SDKs and call paid APIs. Client components call server actions; they never see raw keys.

#### 5. Cost note and budget controls

| Cost area | Notes |
|---|---|
| Local admin | No hosting charge while developing on your machine |
| Cloud Supabase | Usage counts toward your Supabase plan (database, Auth MAU, Storage egress, etc.) |
| OpenAI / ElevenLabs | **Pay per use** whenever generation runs—**including from localhost** if keys are present |

**Required safeguards** (product + engineering; apply in dev and prod):

- **Max candidates per generation** — hard cap (e.g. never more than 4 images per job).
- **Daily generation cap** — per admin user and/or per project (config table or env-backed limits).
- **Cost estimate before submit** — call adapter `estimateCost()` and display USD (or credits) in the UI before the admin confirms.
- **Explicit confirmation** — second click or modal for any paid generation; no silent retries that double-spend.
- **Audit log** — one append-only row per paid generation: actor, provider, model, estimated cost, candidate count, timestamps.

#### 6. Optional local Supabase (not default)

Use `supabase start` only when you need:

- Fully offline Postgres for migration prototyping, or  
- A disposable database where mistakes cannot affect cloud users.

Do **not** document local Supabase as required for admin dashboard development.

### L.3 Authentication & RBAC

- `admin_users` table extends `auth.users` 1:1; `admin_roles` is a join table allowing multiple roles per user.
- Sign-in is **SSO-only** via Google/Apple Workspace email allowlist OR magic link to allowlisted addresses. No public sign-up.
- Every server action calls a `requirePermission(action, entity)` helper that:
  1. Validates the Supabase session.
  2. Looks up admin roles.
  3. Evaluates the permission matrix from C.2.
  4. Either returns the actor or throws `PermissionDeniedError`.
- RLS policies on every admin table enforce the same rules; the dashboard cannot bypass RLS by going around the server action layer.

### L.4 AI provider adapter layer

This is the cornerstone abstraction. The dashboard never imports a provider SDK directly.

```ts
// lib/providers/image/ImageProvider.ts (server-only)

export interface ImageProvider {
  readonly id: 'openai' | 'gemini' | 'nano-banana' | (string & {})
  readonly displayName: string
  readonly supportsTransparency: boolean
  readonly supportsReferenceImages: boolean
  readonly supportsEditing: boolean
  readonly supportsVariations: boolean

  generateImage(input: GenerateImageInput): Promise<GenerateImageResult>
  editImage?(input: EditImageInput): Promise<GenerateImageResult>
  generateVariations?(input: VariationsInput): Promise<GenerateImageResult>
  checkJobStatus(jobId: string): Promise<JobStatus>
  estimateCost(input: GenerateImageInput): CostEstimate
}

export type GenerateImageInput = {
  assetType: AssetType
  prompt: string
  negativePrompt?: string
  aspectRatio: AspectRatio
  transparentBackground?: boolean
  referenceImageUrls?: string[]
  stylePreset?: string
  count: 1 | 2 | 4
  seed?: number
}

export type GenerateImageResult = {
  jobId: string
  provider: string
  model: string
  prompt: string
  revisedPrompt?: string
  candidates: Array<{
    url: string                // points to our Storage, not the provider
    width: number
    height: number
    seed?: number
    safetyStatus: 'pass' | 'flagged' | 'unknown'
    providerMeta?: Record<string, unknown>
  }>
  costEstimateUsd: number
  createdBy: string
  createdAt: string
}
```

Each provider implementation is a separate file in `lib/providers/image/`. The factory `getImageProvider(id)` is the only entry point used by the worker.

API keys are read from **`admin/.env.local`** during **local development** and from **Supabase Vault / hosting platform secrets** when the admin app is deployed. Keys are never returned to any client. The dashboard exposes only `provider.id` and `displayName`.

### L.5 Audio + animation adapters

Mirror image adapters: `AudioProvider` (ElevenLabs SFX, OpenAI TTS, manual upload) and `AnimationProvider` (Rive upload, Lottie upload, video upload, Reanimated-spec — the latter is a metadata-only "provider" describing a built-in effect).

### L.6 Mobile catalog publishing

The `catalog-publish` job runs whenever an item transitions to `published` (or a scheduled item flips). It:

1. Builds the new catalog payload (see N.1).
2. Computes a monotonically increasing `catalog_version`.
3. **MVP:** Persists the payload to **`store_catalog`** (or the table named by `CATALOG_TABLE`) in **cloud Supabase** so the mobile app can read via anon/authenticated client or a thin API route. Optionally writes a **local JSON artifact** during development for debugging (`CATALOG_OUTPUT` env switches behavior).
4. **Post-MVP:** Uploads immutable `catalog/v1/<version>.json` and `latest.json` to a **CDN** for edge caching and long TTLs.
5. Records the publish in `audit_log`.
6. Optional: triggers an OTA push so live clients refresh quickly (we still do not call AI from the client).

**Deployment note:** CDN upload, dedicated cloud workers, R2, and production-grade asset hosting are **intentionally deferred** until after the MVP sprints in §U; until then, **cloud Supabase + local admin** is sufficient.

### L.7 Feature flags

A simple `feature_flags` table with `key`, `enabled`, `rollout_pct`, `audience_segment`, `description`, `updated_by`, `updated_at`. Flags evaluated server-side at catalog build time; mobile receives only the resolved flag values for its segment.

---

## M. Database Design

All tables live in the existing Supabase project under a new `admin` schema (or `public` with `admin_*` prefix — we choose `admin` schema for clear RLS boundary).

### M.1 Tables

```sql
-- admin.admin_users (1:1 with auth.users)
admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
)

-- admin.admin_roles (join)
admin_roles (
  user_id uuid references admin.admin_users(id) on delete cascade,
  role admin_role_enum not null,
  granted_by uuid references admin.admin_users(id),
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
)

-- admin.content_items  (envelope; fields per D.1)
content_items (id, slug unique, category, ..., publish_status, current_version_id, ...)

-- admin.theme_items, admin.collectible_items, admin.chest_drop_entries,
-- admin.seasonal_bundles, admin.symbol_sets, admin.audio_sets,
-- admin.animation_sets, admin.mystery_chests, admin.seasonal_events
-- (extensions per D.2)

-- admin.generated_assets
generated_assets (
  id uuid primary key,
  job_id uuid references admin.asset_generation_jobs(id),
  candidate_index int not null,
  storage_path text not null,
  url text not null,                    -- signed CDN URL
  width int, height int,
  safety_status text,                   -- pass | flagged | unknown
  provider_meta jsonb,
  selected boolean not null default false,
  created_at timestamptz not null default now()
)

-- admin.asset_generation_jobs
asset_generation_jobs (
  id uuid primary key,
  content_item_id uuid references admin.content_items(id),
  asset_type text not null,
  provider text not null,
  model text not null,
  prompt text not null,
  negative_prompt text,
  reference_image_urls text[],
  aspect_ratio text not null,
  transparent_background boolean,
  count int not null,
  seed int,
  revised_prompt text,
  cost_estimate_usd numeric(10,4),
  status text not null,                 -- queued | running | succeeded | failed
  error text,
  created_by uuid references admin.admin_users(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
)

-- admin.audio_assets, admin.animation_assets
-- (mirror generated_assets but with audio/animation specifics: durationMs,
--  format, sampleRate, channels, fileSize, loopable, volumeGain, license, source)

-- admin.prompt_templates
prompt_templates (
  id uuid primary key, slug text unique, name text,
  asset_types text[], brand_directives text, safety_directives text,
  body_template text, negative_template text, default_params jsonb,
  version int, created_by uuid, created_at timestamptz
)

-- admin.content_reviews
content_reviews (
  id uuid primary key,
  content_item_id uuid references admin.content_items(id),
  gate text not null,                   -- 'qa' | 'legal'
  status text not null,                 -- 'approved' | 'rejected'
  reviewer_id uuid references admin.admin_users(id),
  notes text,
  created_at timestamptz not null default now()
)

-- admin.publish_versions
publish_versions (
  id uuid primary key,
  content_item_id uuid references admin.content_items(id),
  version int not null,
  snapshot jsonb not null,              -- full content snapshot
  catalog_version bigint not null,      -- catalog_version at publish time
  published_by uuid references admin.admin_users(id),
  published_at timestamptz not null default now(),
  unique (content_item_id, version)
)

-- admin.store_catalog
store_catalog (
  catalog_version bigint primary key,
  payload_url text not null,            -- CDN URL of catalog json
  payload_sha256 text not null,
  built_at timestamptz not null default now(),
  built_by uuid references admin.admin_users(id),
  notes text
)

-- admin.scheduled_releases
scheduled_releases (
  id uuid primary key,
  content_item_id uuid references admin.content_items(id),
  scheduled_at timestamptz not null,
  status text not null default 'pending',   -- pending | published | cancelled
  created_by uuid, created_at timestamptz default now()
)

-- admin.drop_rates  (denormalized snapshot per chest at publish time, used for
-- the disclosure card the mobile app renders)
drop_rates (
  chest_id uuid references admin.mystery_chests(id),
  content_item_id uuid references admin.content_items(id),
  disclosed_probability_pct numeric(6,4) not null,
  rarity text not null,
  catalog_version bigint not null,
  primary key (chest_id, content_item_id, catalog_version)
)

-- admin.audit_log (append-only)
audit_log (
  id bigserial primary key,
  actor_id uuid references admin.admin_users(id),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  before jsonb,
  after jsonb,
  ip inet,
  user_agent text,
  at timestamptz not null default now()
)

-- admin.feature_flags
feature_flags (
  key text primary key,
  enabled boolean not null default false,
  rollout_pct int not null default 0 check (rollout_pct between 0 and 100),
  audience_segment jsonb,
  description text,
  updated_by uuid, updated_at timestamptz
)
```

### M.2 Indexes

- `content_items (category, publish_status)` — store list queries.
- `content_items (start_at, end_at) where is_limited` — scheduled queries.
- `content_items` GIN on `unlock_requirements` and `store_copy`.
- `generated_assets (job_id, selected)` — review grid.
- `asset_generation_jobs (status, created_at desc)` — worker queue.
- `audit_log (actor_id, at desc)`, `audit_log (entity_type, entity_id, at desc)`.
- `publish_versions (content_item_id, version desc)`.
- `scheduled_releases (status, scheduled_at)` — cron query.

### M.3 RLS posture

- `admin` schema: every table has RLS enabled. Default deny.
- Per-role policies: read for all admins, write subject to permission matrix (helper SQL function `admin.has_permission(user_id, action, entity_type)`).
- `audit_log` is `INSERT`-only for the service role; admins read but cannot update or delete.
- The mobile-facing `public` schema does not change in shape, only in *contents* (we'll migrate hardcoded vanity into `public.collectibles` mirror tables read by the mobile app, populated by the admin publish job).

### M.4 Migration plan vs existing schema

- Reuse existing `public.themes` and `public.user_themes` (Phase 3 migration). The admin's `theme_items` is a richer parallel; the publish job upserts the relevant fields back into `public.themes` so existing mobile pathways keep working.
- New `public.collectibles` and `public.user_collectibles` tables replace the in-app hardcoded `vanity-data.ts` over time. MVP keeps both: bundled fallback + remote-served catalog.
- `public.products` IAP catalog already exists and is the source of truth for SKUs; the dashboard reads from it but does not write.

---

## N. API Design

The dashboard uses **Next.js Server Actions** for mutations (typed end-to-end with Zod) and a small set of **public read endpoints** for the mobile app (**MVP:** backed by Postgres / Supabase; **later:** CDN-backed static JSON where useful).

### N.1 Mobile-facing endpoints

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/catalog/v1/latest` | GET | optional (anon-readable) | **MVP:** Returns pointer + payload from **`store_catalog`** (cloud DB) or inline JSON. **Later:** small pointer + CDN URL; edge-cached. |
| `/api/catalog/v1/:version` | GET | optional | **MVP:** Full payload for that `catalog_version` from DB (or local dev route). **Later:** Immutable JSON from CDN (`/catalog/v1/<version>.json`); long CDN TTL. |
| `/api/catalog/v1/themes` | GET | optional | Convenience subset; same data, themes only. |
| `/api/catalog/v1/collectibles` | GET | optional | Convenience subset; collectibles only. |
| `/api/me/entitlements` | GET | user JWT | Returns the current user's owned items (themes, collectibles); read from `public.user_themes` + `public.user_collectibles`. |

The catalog payload shape:

```jsonc
{
  "catalogVersion": 142,
  "builtAt": "2026-05-05T20:00:00Z",
  "themes": [ { "slug":"vegas", "name":"Vegas Classic", "tokens":{ "dark":{...}, "light":{...} },
                "previewUrl":"...", "thumbUrl":"...", "heroUrl":"...",
                "audioSetId":"...", "animationSetId":"...", "priceCoins":0 } ],
  "collectibles": [ { "slug":"avatar-cool", "category":"avatar", "rarity":"common", ... } ],
  "chests": [ { "slug":"weekly-mystery", "drops":[ {"slug":"...", "probability":0.35} ] } ],
  "events": [ { "slug":"summer-2026", "startAt":"...", "endAt":"...", "items":[...] } ],
  "featureFlags": { "showSeasonalBanner": true }
}
```

### N.2 Admin server actions (selected)

| Action | Inputs | Effect |
|---|---|---|
| `createContentItem(input)` | `{ category, slug, displayName, … }` | Creates draft envelope + extension row |
| `updateContentItem(id, patch)` | `{ … }` | Validates with Zod; checks permission; writes audit |
| `requestImageGeneration(id, params)` | adapter `GenerateImageInput` | Enqueues `asset_generation_jobs` row; returns jobId |
| `selectGeneratedCandidate(jobId, candidateIdx)` | | Marks candidate selected; copies to `published_assets` |
| `attachAssetToItem(itemId, assetId, role)` | role = `'preview' | 'thumb' | 'hero' | …` | Wires asset into content_item URLs |
| `submitForReview(itemId, gate)` | gate = `'qa' | 'legal'` | Transitions status; notifies reviewer (Slack webhook optional) |
| `approveReview(itemId, gate)` / `rejectReview(itemId, gate, reason)` | | Updates `qa_status` / `legal_status`; audit |
| `setPricing(itemId, { priceCoins, iapSku })` | economy_manager only | Validates band; warns/blocks; audit |
| `setDropRates(chestId, entries)` | economy_manager only | Validates probability sum; recomputes EV |
| `publishItem(itemId)` | | Enforces all gates; bumps catalog version; triggers catalog build |
| `schedulePublish(itemId, at)` | | Inserts scheduled_releases; cron promotes |
| `unpublishItem(itemId)` | | Reverts to `approved`; rebuilds catalog |
| `archiveItem(itemId)` | | Sets archived; rebuilds catalog |
| `rollbackToVersion(itemId, versionId)` | | Promotes prior `publish_versions`; new audit |
| `assignRole(userId, role)` | super_admin only | |
| `setProviderConfig(providerId, config)` | super_admin only | Updates non-secret config; **secrets in dev:** `.env.local`; **secrets in prod:** Vault / host secrets |

All server actions return `{ ok: true, data }` or `{ ok: false, error: { code, message, fieldErrors? } }` with stable error codes.

### N.3 Webhooks / queue endpoints (server-only)

**MVP (local admin + cloud Supabase):** prefer **Next.js Route Handlers** or **Server Actions** invoked from the dashboard—same process as `pnpm dev`—to run image/audio jobs synchronously or short-async (poll UI). No separate worker process is required for the first shipped iteration.

- **`/api/internal/jobs/image-gen`** (or server action) — **MVP:** called from local/admin server; runs OpenAI adapter; uploads to **cloud** Supabase Storage; updates `asset_generation_jobs`. **Later:** optional Edge Function or queue worker for timeouts/retries at scale.
- **`/api/internal/jobs/audio-gen`** — same pattern for ElevenLabs SFX.
- **`/api/internal/jobs/catalog-publish`** — rebuilds catalog JSON and **writes `store_catalog` row** in cloud Postgres (and optional local file in dev). **CDN upload deferred** (§L.6).
- **`/internal/cron/scheduled-releases`** (`pg_cron`, hourly) — **post-MVP** or lightweight staging only; not required for first local-to-cloud MVP loop.

---

## O. Mobile App Integration

The mobile app already loads themes from a hardcoded `THEME_CONFIGS` map and vanity from `mobile/lib/vanity-data.ts`. We add a remote catalog layer **without breaking the existing pathway**.

### O.1 Catalog fetch + cache

- On app start (after auth), fetch catalog metadata. **MVP:** call your **cloud-hosted** admin API or a **Supabase RPC/view** that reads `store_catalog` / latest version; or during dev, point `EXPO_PUBLIC_CATALOG_BASE_URL` at your machine’s LAN IP for a **local dev endpoint** (team-only; never ship this URL to production builds).
- Compare `catalogVersion` with the last cached version (`AsyncStorage` key `catalog.version`).
- If newer, fetch the full payload (from API response, Storage object, or **later** CDN URL) and write to `AsyncStorage` (`catalog.payload`) + memory.
- All store/catalog reads go through `useCatalog()` which prefers cached payload.

### O.2 Bundled fallback

- The app ships a baseline `catalog.bundled.json` snapshot (built at app build time). If the network fails AND no cached payload exists, the app uses the bundled fallback. The store still works offline.
- The bundled snapshot includes the current Vegas / Cyber / Treasure themes and the existing vanity items. New seasonal/event content is **not** bundled and degrades gracefully (hidden if unavailable).

### O.3 Versioned assets

- Asset URLs returned by the catalog include a content-hash query (`?v=<sha>`); the mobile app caches images via `expo-image` keyed by URL.
- Once an asset is published it is **immutable**. Re-publishing produces a new URL.

### O.4 WebP + PNG fallback

- The catalog publish job exports both PNG and WebP.
- Mobile prefers WebP via `expo-image` (supported on iOS 14+ and Android 4.0+).

### O.5 Offline behavior, reduced-motion, sound toggles

- Audio: only plays if `useAudio()` reports sound enabled. Theme ambience never overrides the user's music toggle.
- Animation: respects existing `useReducedMotion()` (`mobile/lib/use-reduced-motion.ts`); falls back to a static image when reduced motion is on.
- Sandbox: theme animations and audio render only inside the Play screen / slot machine subtree. The TabScreenStack, profile, support, legal, auth, and onboarding screens never load theme audio or animation.

### O.6 Backward compatibility

- Each catalog item has a `minAppVersion`; the mobile app filters out items requiring a higher version.
- Removed/archived items remain owned by users who acquired them; the app keeps the bundled asset paths as a fallback for owners.

### O.7 Feature flags

- `featureFlags` come down inside the catalog payload (resolved per audience).
- `useFeatureFlag('seasonal_banner')` returns the resolved boolean.

---

## P. MVP Scope

### P.1 MVP (Sprint 1–4)

**Must include.**
- **Development setup:** local Next.js admin (`pnpm dev`) against **cloud Supabase** (Auth, Postgres, RLS, Storage)—see **§Local admin development setup** under L.2. No requirement to run Supabase locally.
- Admin auth (Supabase + Google SSO + email allowlist).
- Two roles: `super_admin`, `content_manager`.
- Schema: `admin_users`, `admin_roles`, `content_items`, `theme_items`, `collectible_items`, `generated_assets`, `asset_generation_jobs`, `prompt_templates`, `content_reviews`, `publish_versions`, `store_catalog`, `scheduled_releases`, `audit_log`, `feature_flags`. Drop_rates and seasonal_bundles deferred.
- CRUD for themes and collectibles (avatars, frames, badges) via Server Actions.
- One image provider behind the adapter (**OpenAI** for MVP; Gemini later).
- Manual upload path for assets that don't need AI generation.
- Pricing controls with rarity bands; copy compliance scanner.
- QA + Legal gates, manual approval (no Slack integration yet).
- Immediate publish; catalog snapshot written to **`store_catalog` (cloud Supabase)** first. **CDN + immutable JSON hosting deferred** until post-MVP (see §U.2–U.5). Optional local JSON export for debugging only.
- Mobile app reads catalog from **cloud Supabase** (or a thin API route backed by that table) **or** a **local dev catalog endpoint** when testing against your machine; bundled fallback in app.
- Provider API keys only in **`admin/.env.local`** during development; Expo never receives them.
- Audit log for all create/update/approve/publish/archive actions.
- Docs: this plan, plus an internal "Admin Runbook".

**Explicitly NOT in MVP.**
- Mystery chests + drop-rate disclosure (V1.1).
- Production-grade audio tooling (batch SFX libraries, licensed ingest UX, full ElevenLabs feature surface). **MVP still ships** the server-side sound job stub + `/admin/ai/sounds` UI behind `ELEVENLABS_API_KEY` (see §U.4 Sprint 4 — aligns with roadmap).
- Animation generation; Rive/Lottie/video upload allowed in V1.1.
- Multi-provider image generation (V1.2; adapter is built but only one impl shipped).
- Seasonal bundles (V1.2).
- A/B testing.

### P.2 V1.1 (Sprint 5–8)

- Mystery chests, drop-rate disclosure card, EV calculator.
- Audio uploads (manual) wired into `audio_sets` and theme builder.
- Animation uploads (Rive/Lottie/video) wired into `animation_sets`.
- Roles: `artist_designer`, `economy_manager`, `qa_reviewer`, `legal_compliance`, `read_only_viewer`.
- Slack notifications on review-requested / publish events.
- Scheduled-release UI and cron.

### P.3 V2.0 (Sprint 9+)

- Second image provider (Gemini / Nano Banana) shipped behind toggle.
- ElevenLabs SFX provider for generated sounds.
- OpenAI TTS for narration.
- Seasonal events + bundles + event windows.
- Live A/B price testing.
- Push-notification scheduling (with brand-locked templates).
- Per-region drop-rate disclosure + per-region pricing.

---

## Q. Roadmap

| Sprint | Window | Focus | Outcome |
|---|---|---|---|
| 1 | 2 wk | **Local** Next.js admin + **cloud** Supabase: auth, schema, RLS, audit log | Admins sign in against cloud project; no local Supabase required |
| 2 | 2 wk | Content CRUD + **Supabase Storage** uploads (themes + collectibles envelope) | Create/edit items; upload PNG/WebP to cloud buckets |
| 3 | 2 wk | **OpenAI** image provider via **local** Route Handlers / Server Actions | Real generations from dev machine; keys in `.env.local` |
| 4 | 2 wk | **ElevenLabs** SFX + **catalog publish** to `store_catalog` + mobile/dev fetch | End-to-end catalog in cloud DB; CDN/R2/worker **deferred** |
| 5 | 2 wk | Collectible CRUD (avatars/frames/badges/titles/pets) + pricing controls + audit polish | Admin team can ship cosmetics weekly |
| 6 | 2 wk | Mystery chests + drop rates + EV calculator + disclosure rendering | Chests live in V1.1 |
| 7 | 2 wk | Animation uploads (Rive/Lottie/video) + audio workflows beyond ElevenLabs MVP; expanded roles | Designers + audio leads onboarded |
| 8 | 2 wk | Scheduled publishing, Slack notifications, hardening, observability | V1.1 GA |
| 9 | 2 wk | Second image provider; seasonal events; bundles | V2.0 starts |
| 10 | 2 wk | ElevenLabs SFX provider; OpenAI TTS; per-region disclosure | V2.0 ships |

---

## R. Risks and Open Questions

### R.1 Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | An admin accidentally publishes a payload that bleeds into the brand shell | Medium | Critical | Schema constraints + JSON schema validators + boundary scanner block this at write time, not just at UI |
| R2 | AI image provider outputs IP-infringing content | Medium | High | Mandatory Legal gate; safety scanner; provider safety status; manual override audit-logged |
| R3 | Catalog endpoint outage breaks the store | Low | High | Long-lived client cache + bundled fallback + graceful degradation (**MVP:** API/DB path; **later:** CDN) |
| R4 | Provider API key leaks | Low | Critical | **Dev:** keys only in `admin/.env.local` (gitignored). **Prod:** Vault / host secrets. Never `NEXT_PUBLIC_*`; never returned to client; rotate quarterly |
| R5 | App Store rejection due to drop-rate disclosure or gambling-language regression | Medium | High | Compliance scanner blocks publish; per-region disclosure card; legal gate is mandatory |
| R6 | Economy abuse (too-cheap items, infinite-grind chests) | Medium | Medium | Rarity price bands; EV warnings; audit; weekly economy review |
| R7 | Mobile-app catalog drift across versions | Medium | Medium | `minAppVersion` per item; immutable asset URLs; versioned catalog |
| R8 | Asset-storage cost runaway from generated candidates | Low | Medium | Auto-prune unselected candidates after 30 days unless flagged |
| R9 | Slow image generation jobs degrade UX | Medium | Low | **MVP:** async Route Handler + polling UI; optional background poll; **later:** queue worker when timeouts require it |
| R10 | RLS policy hole exposes admin data to non-admins | Low | High | Default-deny on `admin` schema; integration tests against RLS |

### R.2 Open questions

- Single SSO provider or both Google + Apple Workspace?
- **MVP default (resolved for planning):** long-running or paid image/audio generation runs in **Next.js server routes on the admin host** (localhost in dev, Vercel/server in prod). **Optional later:** Supabase Edge Functions (watch timeouts) or Fly.io / Render worker when traffic/timeouts demand it.
- **MVP default (resolved):** assets and catalog live in **cloud Supabase Storage + Postgres** first. **Deferred:** Cloudflare R2 / S3 + CDN for immutable catalog JSON at scale.
- Do we need per-region price tiers for IAP at MVP, or just USD?
- Disclosed-probability presentation: per-item bar list, table, or both?
- Is `pg_cron` sufficient for scheduled releases or do we want Inngest / Trigger.dev for retries and observability?
- Push-notification copy: brand-locked templates only, or per-event customization (with legal review)?
- What is the legal stance on AI-generated character likeness — automatic block, or human-only review?

---

## S. User Stories

Format: **As a `<role>`, I want to `<action>`, so that `<outcome>`.**

### S.1 Authentication & roles
1. As a super admin, I want to invite a new admin via email allowlist so that they can sign in via SSO without a public sign-up.
2. As a super admin, I want to assign and revoke roles per user so that I can give the right permissions to each team member.
3. As a content manager, I want to see only the actions I'm allowed to perform so that the UI doesn't dangle disabled buttons.

### S.2 Themes
4. As a content manager, I want to start a new theme draft and fill in concept fields so that the team can begin work.
5. As an artist, I want to generate AI candidate images for a theme preview, cabinet, and reels so that I can compare options without manual prompting per asset.
6. As an artist, I want to crop and export the selected image to the exact preview/thumbnail/hero specs so that mobile assets are correct.
7. As an artist, I want to define `tokens_dark` and `tokens_light` for the 9 machine override keys with a live contrast check so that the theme passes WCAG.
8. As a content manager, I want the theme editor to refuse any token outside the 9 allowed keys so that I cannot accidentally bleed into the brand shell.
9. As a QA reviewer, I want a single screen showing the assembled theme card, hero, and Play-screen mock so that I can approve or reject in one pass.
10. As a legal reviewer, I want to see prompt history and IP flags per asset so that I can clear or block.
11. As a content manager, I want to schedule a theme publish for a future date and timezone so that seasonal launches go out without manual work.

### S.3 Collectibles
12. As a content manager, I want to create a new avatar with a rarity, price, and equip slot so that it appears in the store.
13. As an economy manager, I want a price warning if I set a legendary item below the rarity floor so that I avoid mis-pricing.
14. As an artist, I want to upload a manual image (no AI) so that I can use original art when needed.
15. As a content manager, I want to assign a collectible to a chest with a disclosed drop probability so that the chest is publishable in disclosure regions.
16. As a content manager, I want to mark a collectible as limited and pick start/end dates so that it appears only during an event.

### S.4 Mystery chests
17. As an economy manager, I want the chest editor to display computed expected value so that I can spot bad-value or over-generous chests.
18. As a legal reviewer, I want chests without a drop-rate disclosure to be unpublishable so that we don't ship in a non-compliant state.

### S.5 Publishing & rollback
19. As a content manager, I want to publish an item only if QA and Legal are green so that I can't accidentally ship unreviewed content.
20. As a super admin, I want to roll back the catalog to the previous version so that I can recover from a bad publish in seconds.
21. As any admin, I want every action recorded in the audit log so that we have an immutable history.

### S.6 Mobile integration
22. As a mobile user, I want the store to load even when offline so that the experience never feels broken.
23. As a mobile user, I want themes to never look like they replaced my SpinVault account so that I trust the brand.
24. As a mobile user with reduced motion enabled, I want theme animations to be replaced with a static image so that the app respects my settings.

### S.7 Audio & animation
25. As an audio lead, I want to upload a normalized loop and assign it to a theme audio set so that the Play screen plays the right ambience.
26. As a designer, I want to upload a Rive file for a theme cabinet idle and preview it on simulated iOS and Android frames so that I can catch performance issues.

### S.8 Compliance
27. As a legal reviewer, I want the copy editor to highlight forbidden phrases inline so that I can rewrite without context-switching.
28. As a legal reviewer, I want to override a prompt-safety flag with a written justification so that legitimate edge cases are not blocked.

---

## T. Acceptance Criteria

### T.1 Auth & roles
- AC-1.1: Only emails in the configured SSO allowlist can sign in. All others see "Access denied."
- AC-1.2: A user with `read_only_viewer` cannot see edit, generate, approve, or publish buttons in any view.
- AC-1.3: Permission checks pass through `requirePermission()` server-side; manually crafted POSTs to a server action by a non-permitted role return `403`.
- AC-1.4: All role grants and revocations create an `audit_log` row with `action = 'role_granted'` or `'role_revoked'`.

### T.2 Theme creation
- AC-2.1: Saving a theme with any token key outside `MACHINE_OVERRIDE_KEYS` returns a validation error and is rejected at the database `CHECK` constraint.
- AC-2.2: Saving a theme with a token value not matching `^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$` returns a validation error.
- AC-2.3: Contrast ratio computation matches WebAIM's calculator within ±0.01 for all four required pairs.
- AC-2.4: Publishing a theme is impossible while QA or Legal is not `approved`; the Publish button is disabled and the server action returns `403`.
- AC-2.5: A published theme appears in the mobile app's catalog within **60 seconds** of publish when the client uses the **cloud catalog API** (**MVP:** no CDN TTL dependency).

### T.3 Collectibles
- AC-3.1: Creating a collectible with `is_limited = true` and `end_at = null` is rejected.
- AC-3.2: Setting price more than 50% outside the rarity band is rejected; within ±50% but outside band shows a yellow warning the user must confirm.
- AC-3.3: A collectible assigned to a chest without `disclosed_probability_pct` cannot publish.

### T.4 AI image generation
- AC-4.1: The full submitted prompt (with safety + brand directives prepended) is shown to the admin before generation and stored in `asset_generation_jobs.prompt`.
- AC-4.2: A prompt containing any term in the IP/celebrity denylist is blocked for non-`super_admin`; a `super_admin` can override but the override is logged.
- AC-4.3: All candidates are downloaded into our Storage; the dashboard never displays a provider URL directly.
- AC-4.4: Selecting a candidate creates a `published_assets` entry and links it to the content item; the candidate's `selected = true` and unselected siblings have `selected = false`.

### T.5 Publishing
- AC-5.1: Publish increments `catalog_version` and writes a new `store_catalog` row pointing to the new payload URL.
- AC-5.2: A scheduled release flips to `published` at `scheduled_at` ±2 minutes via `pg_cron`.
- AC-5.3: Rollback restores the previous catalog version and creates an `audit_log` entry with `action = 'rollback'` and the prior version id.
- AC-5.4: Unpublishing an item removes it from the catalog but does not delete it from `content_items`.

### T.6 Audit log
- AC-6.1: Every create/update/generate/approve/publish/unpublish/archive/rollback writes one `audit_log` row with non-null `actor_id`, `action`, `entity_type`, `entity_id`, `at`.
- AC-6.2: `audit_log` denies UPDATE and DELETE for all roles including `super_admin`.

### T.7 Mobile catalog client
- AC-7.1: Cold launch with no network shows the bundled fallback within 1 second.
- AC-7.2: Cold launch with network fetches `/catalog/v1/latest`, then payload, and renders within 2 seconds on mid-range Android.
- AC-7.3: Catalog responses are immutable per `catalog_version`. **MVP:** validate immutability at the API/DB layer. **Later:** cache for at least 1 year on CDN when catalog is served as static JSON.
- AC-7.4: An item with `minAppVersion > currentVersion` is hidden from the store.

### T.8 Compliance
- AC-8.1: Saving copy containing any phrase from the gambling-cashout denylist surfaces an inline error and blocks the save (override requires `legal_compliance` role + justification).
- AC-8.2: A chest published without disclosed probabilities returns server error `chest_missing_disclosure`.
- AC-8.3: Any theme attempt referencing a real-world casino brand in copy or art metadata surfaces a Legal review flag automatically.

### T.9 Brand boundary
- AC-9.1: There is no admin field in any table that can mutate `APP_NAME`, `APP_TAGLINE`, app icon path, splash path, or any auth/legal/onboarding screen file.
- AC-9.2: The catalog payload schema does not include any field corresponding to shell tokens (`background`, `surface`, `textPrimary`, `primary`, `accent`, `gold`, `bonus`, `freeSpin`, `destructive`).
- AC-9.3: Contract test in CI loads the catalog payload, evaluates against `catalog.schema.json`, and fails the build if the schema regresses.

### T.10 Store Compliance Rules

One acceptance criterion per [Section Z](#z-store-compliance-rules-canonical) rule. Each criterion is covered by an automated test in CI; rejection paths are exercised, not just the happy path.

- AC-10.1 `SCR-1`: The published catalog payload contains the literal string `"Virtual coins only. No cash value."` in `disclosures.coinDisclosure`. A snapshot test fails if the string is altered.
- AC-10.2 `SCR-2`: The catalog payload contains the literal string `"Coins and items cannot be redeemed, withdrawn, sold, traded, transferred, or exchanged."` in `disclosures.transferDisclosure`. The mobile app renders it on every shop tab and every item detail page.
- AC-10.3 `SCR-3`: The `content_items` schema and every category extension table contain **zero** columns named `affects_*`, `bet_*`, `payout_*`, `odds_*`, `rng_*`, or `jackpot_rate_*`. A schema test in CI fails if any such column is added.
- AC-10.4 `SCR-4`: A unit test attempts to publish a theme whose `theme_token_data` includes any key outside `MACHINE_OVERRIDE_KEYS` (e.g., `betMultiplier`) and asserts the database `CHECK` constraint rejects it.
- AC-10.5 `SCR-5`: A unit test attempts to publish a chest with one entry missing `disclosed_probability_pct` and asserts the server action returns `chest_missing_disclosure`. A second test asserts the disclosure card is included in the catalog payload before the purchase-confirm step.
- AC-10.6 `SCR-6`: A unit test attempts to insert a coin-pack `iap_sku` row with a non-null `expires_at` and asserts the server action returns `coin_pack_cannot_expire`. The catalog payload's coin-pack tiles include `noExpiration: true`.
- AC-10.7 `SCR-7`: A copy-scanner test fires for each forbidden phrase ("cashout", "withdraw", "profit", "earn money", "prize", "payout", "real winnings") and asserts the save is blocked with the corresponding SCR id.
- AC-10.8 `SCR-8`: A copy-scanner test fires when any user-facing balance/win label string contains a bare `$`, `€`, `£`, or `¥` character outside the IAP price-string template, and asserts the save is blocked. (App Store / Play prices are exempt — they originate from `Purchases.getProducts` and are not authored by admins.)
- AC-10.9 `SCR-9`: A unit test attempts to mark `is_iap_only = true` on a content item without a matching `iap_sku` in `public.products` and asserts the save is rejected. A second test asserts that any non-IAP digital purchase route requires an explicit `super_admin`-set `region_entitlement` flag and emits a Legal-review notification on every publish.

---

## U. Sprint Plan

### U.1 Team

- 1 PM (part-time)
- 1 Design / UX (part-time)
- 2 Full-stack engineers (1 lead, 1 IC)
- 1 Mobile engineer (part-time, integration sprints only)
- 1 QA engineer (last week of each sprint)
- Legal review on demand

### U.2 Sprint 1 — Local admin + cloud Supabase (2 weeks)

**Goal:** The Next.js admin runs **locally** (`pnpm dev`) and authenticates against the **cloud** Supabase project (Auth, Postgres, RLS). **No local Supabase stack is required.** Audit log writes succeed end-to-end.

| Story | Owner | Pts |
|---|---|---|
| Stand up Next.js 14 app in `admin/` workspace; Tailwind + shadcn | FS lead | 3 |
| Document `.env.local` + `.env.example`: `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`, optional `LOCAL_ADMIN_MODE` | FS IC | 2 |
| Supabase SSR auth (Google SSO + email allowlist) against **cloud** project | FS lead | 5 |
| `admin` schema migrations: `admin_users`, `admin_roles`, `audit_log` | FS IC | 5 |
| `requirePermission()` helper + RLS policies (service role server-side only) | FS lead | 3 |
| Audit-log writer + middleware | FS IC | 3 |
| Empty dashboard layout: nav, role-gated menu | Design + FS IC | 3 |
| CI: lint, typecheck; migration apply against **cloud** staging branch or preview DB | FS lead | 3 |
| **Demo:** Two admins sign in from localhost; roles enforced; audit rows visible **in cloud** Postgres | All | — |

**Deferred:** Vercel/production deploy, CDN, dedicated queue worker, R2—these ship after Sprints 1–4.

### U.3 Sprint 2 — Content CRUD + Supabase Storage (2 weeks)

**Goal:** CRUD for content envelopes (`content_items` + extensions) and **manual uploads** to **cloud** Supabase Storage (PNG/WebP). Still **no** AI providers.

| Story | Owner | Pts |
|---|---|---|
| `content_items`, `theme_items`, `collectible_items` base migrations + CHECK constraints | FS IC | 5 |
| Theme draft UI: concept, **allowed** token JSON only (`MACHINE_OVERRIDE_KEYS`), contrast checker | FS lead + Design | 8 |
| Storage buckets + signed upload path from **server actions** (keys server-side only) | FS IC | 5 |
| Server actions: `createContentItem`, `updateContentItem`, `attachAssetToItem` | FS lead | 5 |
| Boundary scanner / CI: rejects forbidden shell tokens & paths | FS IC | 3 |
| Collectible CRUD stub (avatars/frames/badges minimum fields) | FS IC | 5 |
| **Demo:** Create a theme + one collectible; assets visible in **cloud** Storage + DB | All | — |

### U.4 Sprint 3 — OpenAI image generation from local admin backend (2 weeks)

**Goal:** **`OpenAIImageProvider`** runs inside **Next.js server routes or Server Actions** on the developer machine; **`OPENAI_API_KEY` in `.env.local` only.** Real generations bill OpenAI when triggered. Expo/mobile unchanged—no keys client-side.

| Story | Owner | Pts |
|---|---|---|
| `ImageProvider` interface + `OpenAIImageProvider` (gpt-image / configured model) | FS lead | 5 |
| `asset_generation_jobs` + `generated_assets` tables | FS IC | 3 |
| Route Handler or Server Action: `requestImageGeneration` → adapter → upload candidates to **cloud** Storage | FS lead | 8 |
| Prompt templates + generation UI (cost estimate + **confirm** before paid call); **max candidates** cap | FS IC + Design | 8 |
| Crop + export (PNG + WebP) to published asset paths | FS lead | 5 |
| Prompt safety scanner (server-side) | FS IC | 3 |
| Audit log: each paid generation (estimate, provider, model, actor) | FS IC | 2 |
| **Demo:** Generate theme preview from localhost; candidates in Storage; job row in **cloud** DB | All | — |

**Not required for this sprint:** Supabase Edge Function worker, Fly.io worker, CDN upload.

### U.5 Sprint 4 — ElevenLabs SFX + catalog publish (Supabase / dev API) (2 weeks)

**Goal:** **`ElevenLabs`** SFX path from the **same server-side boundary**; **publish** writes catalog snapshot to **`store_catalog`** in **cloud Supabase**. Mobile app reads catalog via **cloud API** or **local dev catalog URL** during integration—not via CDN yet.

| Story | Owner | Pts |
|---|---|---|
| `AudioProvider` + ElevenLabs SFX implementation; keys from `.env.local` / Vault later | FS lead | 5 |
| Audio asset tables + upload/normalize workflow (trim/normalize optional MVP) | FS IC | 5 |
| `publish_versions`, `store_catalog` migrations; publish action writes JSON blob / columns to Postgres | FS lead | 5 |
| Catalog build: compose payload per [N.1](#n-api-design); bump `catalog_version` | FS IC | 5 |
| `/api/catalog/v1/latest` + `/:version` backed by **DB** (not CDN) | FS IC | 5 |
| Mobile eng: `useCatalog()` reads from deployed API URL **or** LAN dev URL + cache + bundled fallback | Mobile eng | 8 |
| Optional: `content_reviews` minimal QA/Legal flags if time | FS IC | 3 |
| QA: publish → mobile sees new item against **cloud** catalog | QA | 3 |
| **Demo:** Generated SFX attached to content; catalog row in Supabase; TestFlight/dev client pulls new catalog | All | — |

**Explicitly deferred after Sprint 4:** production dashboard hosting hardening, Cloudflare/Vercel Edge CDN for immutable catalog JSON, R2/S3 asset tiering, dedicated async worker fleet, `pg_cron` scheduled releases at scale.

### U.6 Sprint 5 — Collectible CRUD + Pricing + Audit polish (2 weeks)

**Goal:** Admin team ships cosmetics weekly. Pricing controls live. MVP feature-complete.

| Story | Owner | Pts |
|---|---|---|
| `collectible_items` UI: avatars, frames, badges, titles, pets | Design + FS IC | 8 |
| Pricing controls: rarity bands, validators, warnings | FS lead | 5 |
| Copy compliance scanner v1 with denylists | FS IC | 5 |
| Audit-log viewer (filter by actor / entity / action / date) | FS IC | 5 |
| Admin runbook in `docs/admin-runbook.md` | PM + FS lead | 3 |
| QA full regression + brand-bleed audit | QA | 5 |
| **Demo:** Live-ops creates and publishes 3 collectibles in one sprint without engineering help | All | — |

### U.7 Sprint 6+ — V1.1 onwards

Continue per Q. Roadmap above.

---

## V. AI Image Provider Architecture

### V.1 Provider adapter interface

See L.4 for the canonical TypeScript interface. To recap, every image provider implements:

- `generateImage(input)` — produce N candidates from a prompt + parameters.
- `editImage(input)` — optional; mask + prompt edit of an existing image.
- `generateVariations(input)` — optional; produce variations of a reference image.
- `checkJobStatus(jobId)` — poll long-running jobs.
- `estimateCost(input)` — pre-flight USD estimate.
- `saveGenerationMetadata(...)` — handled by the worker, not the provider, so the audit trail is uniform across providers.

### V.2 Supported provider candidates

| Provider id | Model family (initial) | Notes |
|---|---|---|
| `openai` | OpenAI image generation (latest) | Strong text rendering, well-known safety profile |
| `gemini` | Google Gemini image generation | Strong photoreal; alternative cost profile |
| `nano-banana` | Google Nano Banana | Editing/compositing strength; treat as a Gemini-family adapter |
| `(future)` | TBD | Adapter folder per provider |

### V.3 Asset generation workflow (provider-agnostic)

1. Admin picks asset type → dashboard loads spec + template.
2. Admin chooses provider (or accepts the default).
3. Admin edits the user portion of the prompt; safety + brand directives are prepended automatically.
4. Server-side prompt-safety scanner runs (see J.3).
5. Job enqueued to `asset_generation_jobs`; worker dispatches to the chosen provider adapter.
6. Provider returns candidate URLs; worker downloads each into our Storage; records metadata + safety status.
7. Dashboard renders candidates; admin selects one.
8. Cropper enforces spec; PNG + WebP exported; attached to content item.
9. Item enters `ready_for_review` (QA) and then Legal/IP review.
10. Approved + Legal-approved item is publishable.

### V.4 Asset types covered

Slot themes · theme preview cards · slot symbols · avatars · profile frames · badges · pets · cabinets · room backgrounds · mystery chest art · seasonal banners · store promo cards.

### V.5 Prompt safety rules

Prompts are blocked or warned (per J.3) for:
- Copyrighted characters (curated denylist + LLM-name detector).
- Trademarked brands (curated denylist).
- Celebrity likenesses.
- Casino/cashout language.
- Real-money prize language.
- Offensive or adult content.
- Misleading scarcity claims.

Overrides require `legal_compliance` role and a written justification, persisted to `audit_log`.

### V.6 Storage and metadata

For each generation we persist (in `asset_generation_jobs` + `generated_assets`):

- provider, model, prompt (final, with directives), negative prompt, reference image URLs, aspect ratio, output size, transparent-background flag, count, seed, revised prompt (if returned), cost estimate, safety status per candidate, candidate storage URLs, selected-candidate index, rejected candidates, review status (`qa_status`, `legal_status` of parent item), publish status, created_by, created_at.

Rejected candidates remain in `generated-assets/` for 30 days for audit, then are pruned unless flagged.

### V.7 Mobile app integration

- Mobile **never** calls AI generation directly.
- Mobile only consumes published asset URLs and catalog metadata.
- Provider keys are not present in the Expo bundle, app config, or any mobile-shipped file.

### V.8 Security

- **Local development:** provider keys live in **`admin/.env.local`** only (never committed).
- **Deployed admin:** keys live in Supabase Vault (or Vercel/hosting platform secrets).
- Keys are read only by server-side code (Route Handlers, Server Actions, workers); never sent to the client.
- Key rotation: quarterly; documented runbook.
- Keys are scoped per provider; no shared key across environments.

### V.9 Compliance

Every generated asset must be reviewed against:

- IP / trademark risk (Legal gate).
- No real-money gambling claims (Legal + Copy scanner).
- No cash-prize imagery (Legal review of art).
- No misleading "limited" language (validators per I.2).
- Age-appropriate content (Legal gate).
- App Store / Google Play acceptability (Legal gate).

### V.10 MVP recommendation

For MVP: ship the adapter interface; implement **one provider** first (recommend OpenAI image due to maturity of safety tooling and image quality consistency for casual-game art; Gemini is a strong alternative if cost is a concern). Wire that provider through **Next.js server routes / Server Actions** on **localhost** (keys in **`admin/.env.local`**); **do not** require Edge Functions or a separate worker service for the first shipped iteration. Manual review and publish for every asset. Add the second provider in V2.0 without changing the dashboard UI — only the `provider` selector grows new options.

---

## W. Audio Provider & Asset Architecture

### W.1 Provider adapter

Mirrors V.1 with an `AudioProvider` interface:

```ts
export interface AudioProvider {
  readonly id: 'elevenlabs-sfx' | 'openai-tts' | 'manual-upload' | (string & {})
  readonly displayName: string
  readonly capabilities: { sfx: boolean; tts: boolean; music: boolean }

  generateAudio(input: GenerateAudioInput): Promise<GenerateAudioResult>
  estimateCost(input: GenerateAudioInput): CostEstimate
  checkJobStatus(jobId: string): Promise<JobStatus>
}
```

Manual upload is a "provider" that simply ingests a file the admin supplies (licensed music, original recordings, etc.). All providers are server-side; paid-provider keys live in **`.env.local` (dev)** or **Vault/host secrets (prod)**.

### W.2 Audio asset types

UI tap · spin start · reel stop · small win · big win · mega win · jackpot · scatter / free spin trigger · bonus meter fill · daily wheel spin · chest open · theme ambience loop · theme music loop · optional tutorial narration.

### W.3 Audio workflow

For each sound:

1. Prompt or upload source.
2. Provider/model selected; metadata captured.
3. Candidate audio saved server-side (private bucket).
4. Human review: trim start/end, normalize loudness to **−14 LUFS**, set loop points (if loopable), preview on simulated iOS + Android playback path.
5. Export to compressed mobile format (`.mp3` or `.m4a`; OGG fallback for Android where required).
6. QA on iOS and Android device.
7. Approve.
8. Publish into the versioned asset catalog.

### W.4 Audio metadata

For each audio asset:
- `assetId`, `assetType`, `themeId` (nullable), provider, model, prompt (or `null` for upload), `durationMs`, format, sampleRate, channels, fileSize, `loopable` boolean, `volumeGainDb`, license / source, createdBy, approvedBy, reviewStatus, publishStatus.

### W.5 Compliance & safety (audio)

Flag:
- Copyrighted music samples (denylist + audio fingerprinting if/when integrated; manual review at MVP).
- Celebrity voices.
- Trademarked sound-alikes.
- Casino sounds that misleadingly imply real coin / cash-register payouts.
- Adult / offensive audio.
- Frightening or harmful sounds.
- Audio containing speech that implies real-money winnings ("you won $500").

### W.6 MVP recommendation (audio)

- Allow upload of audio files via "manual-upload" provider.
- Allow generated SFX through one provider (recommend ElevenLabs SFX); **`ELEVENLABS_API_KEY` only in server-side env** (`.env.local` in dev, Vault in prod)—same rule as OpenAI.
- Approval and publish workflow uses the same gates as image assets.
- No in-dashboard waveform editor at MVP; trim + normalize done in Audacity/DAW and re-uploaded.

---

## X. Animation Asset Architecture

### X.1 Provider / asset architecture

| Provider id | Use |
|---|---|
| `reanimated-spec` | Built-in JS animations declared as a spec ({ type, duration, easing, params }) and run by the mobile app's existing Reanimated runtime |
| `rive-upload` | Rive `.riv` files for interactive vector animation |
| `lottie-upload` | Lottie JSON files (if adopted) |
| `video-upload` | Short MP4/WebM previews for the store/shop |
| `(future)` | Sprite sheets if needed |

### X.2 Animation asset types

Theme cabinet idle · reel glow · win line · small-win effect · big-win effect · jackpot effect · bonus meter animation · chest open animation · theme preview animation · shop card animation.

### X.3 Animation workflow

For each animation:
1. Concept + spec.
2. Designer-created or AI-assisted asset (out-of-dashboard tooling for now; uploads to dashboard).
3. Preview in dashboard (Rive/Lottie/video render in an embedded preview).
4. Device performance check (size, FPS estimate, memory budget).
5. Reduced-motion fallback (a static image must be uploaded as fallback).
6. File size check (Rive ≤ 200KB target, Lottie ≤ 100KB, video ≤ 1MB).
7. QA approval.
8. Publish to mobile catalog.

### X.4 Mobile app integration (animation)

- Mobile **never** generates animations.
- Mobile consumes approved published asset URLs.
- Assets are versioned and cached.
- Fallback bundled animation/static used when remote asset fails.
- Respects `useReducedMotion()` — falls back to static image when reduced motion is on.
- Theme animations run only inside the Play / slot machine subtree; never in auth, profile, support, legal, or onboarding screens.

### X.5 Compliance & safety (animation)

Flag:
- Animations implying cash prizes or real-money payouts.
- Flashing / strobe effects that may create accessibility / seizure risk (>3 flashes/sec).
- Trademark / IP concerns in vector art.

### X.6 MVP recommendation (animation)

- Allow upload of Rive, Lottie, video assets.
- Approval/publish workflow same as image/audio.
- Do **not** build an in-dashboard animation editor at MVP.
- Use Reanimated specs for built-in effects only (no custom animation editor); designers configure via metadata fields.

---

## Y. QA Checklist (cross-cutting)

Run at the end of every sprint and before V1.1 / V2.0 GA.

### Y.1 Brand boundary
- [ ] Catalog payload schema contains zero shell tokens.
- [ ] No admin field surface mutates app name, icon, splash, onboarding, login, register, forgot/reset, profile shell, support, legal documents, IAP trust copy, store metadata.
- [ ] Boundary scanner CI step passes on every PR.

### Y.2 Audio
- [ ] Test sounds on iOS and Android device.
- [ ] Test with sound off (no audio plays).
- [ ] Test with music off (no music loops).
- [ ] Test with haptics on/off.
- [ ] Test reduced motion (animations replaced with static fallback).
- [ ] Test asset cache clear (cold load fetches catalog and assets).
- [ ] Test remote asset failure fallback (bundled fallback used).
- [ ] Test theme switching (audio swaps cleanly; no overlap).
- [ ] Test no theme audio leaks into auth / profile / legal / support screens.

### Y.3 Animation
- [ ] Reduced motion replaces animations with static images.
- [ ] No flashing > 3 flashes/sec in any animation.
- [ ] File sizes within budget.
- [ ] Animations only render inside Play / slot machine subtree.

### Y.4 Catalog & rollback
- [ ] Publish a new item; mobile sees it within 60 seconds.
- [ ] Rollback restores prior catalog version.
- [ ] Cold-launch offline shows bundled fallback.
- [ ] `minAppVersion` filtering hides items requiring newer client.

### Y.5 Compliance
- [ ] Copy denylist blocks known forbidden phrases.
- [ ] Chest without disclosed probabilities cannot publish.
- [ ] Prompt safety scanner blocks IP/celebrity prompts for non-super-admins.
- [ ] Audit log entries exist for every action; UPDATE/DELETE on `audit_log` rejected.

### Y.6 Store Compliance Rules (run before every release)
- [ ] `SCR-1` Coin-disclosure string present, unaltered, on every shop screen.
- [ ] `SCR-2` Transfer-disclosure string present, unaltered, on every shop and item-detail screen.
- [ ] `SCR-3` No theme or collectible exposes a gameplay-affecting field; spot-check via the schema test in CI.
- [ ] `SCR-4` Equipping each theme produces no measurable change in spin RNG, payout table, or jackpot frequency (snapshot test against a deterministic-seed spin sequence).
- [ ] `SCR-5` Chest purchase flow shows the disclosure card before purchase confirmation; sum of probabilities = 100% within ±0.01.
- [ ] `SCR-6` Coin-pack tiles render "Purchased coins do not expire."; no expiration UI surface exists.
- [ ] `SCR-7` Copy scanner blocks forbidden words; no forbidden word appears in the published catalog payload.
- [ ] `SCR-8` No bare currency symbol appears as a balance or win label; only `coins` is used.
- [ ] `SCR-9` All in-app digital purchases route through `Purchases.purchaseProduct` (Apple/Google IAP); no third-party checkout is reachable from the mobile app.

---

## Z. Store Compliance Rules (Canonical)

> **Status:** Authoritative. Every dashboard control, validator, scanner, publish gate, and mobile UI element exists to enforce these rules. Sections B–Y reference these IDs as `[SCR-N]`.
>
> **Override policy:** Rules tagged "non-overridable" are enforced at the database constraint and server-action layer. No role — including `super_admin` — can bypass them at runtime. Changing a non-overridable rule requires a schema migration, a code review, and Legal sign-off.

### Z.1 The rules

| ID | Rule | Override policy | Where the dashboard enforces it |
|---|---|---|---|
| `SCR-1` | Coins are virtual only and have no cash value. | Non-overridable | Coin-disclosure string injected into every store view (`J.5`); no field in `content_items` can express a cash equivalent; published catalog asserts `disclosures.coinDisclosure` |
| `SCR-2` | Coins and items cannot be redeemed, withdrawn, sold, traded, transferred, or exchanged. | Non-overridable | Copy scanner blocks "redeem", "withdraw", "trade", "transfer", "sell", "exchange" applied to coins/items (`J.1`); no admin field surfaces transfer mechanics; transfer-disclosure string in catalog (`J.5`) |
| `SCR-3` | Themes and collectibles are cosmetic only. | Non-overridable | `content_items` and category extensions contain zero gameplay-effect columns (`I.2`, `M.1`); schema test fails CI if added (`AC-10.3`) |
| `SCR-4` | Themes must not change odds, payouts, RNG, jackpot frequency, or bet math. | Non-overridable | `theme_token_data` validated by JSON schema to contain only the 9 `MACHINE_OVERRIDE_KEYS` (`D.2`); CHECK constraint at DB; deterministic-seed spin snapshot test (`Y.6`) |
| `SCR-5` | Randomized item purchases must disclose odds before purchase. | Non-overridable | Chest entries require `disclosed_probability_pct` (`I.2`); publish blocked if missing; mobile renders disclosure card before purchase confirm (`J.5`, `O.5`) |
| `SCR-6` | Purchased virtual currency must not expire. | Non-overridable | Coin-pack SKU validator blocks any `expires_at` (`I.2`); copy scanner blocks "expires", "use before", "valid for N days" applied to coins (`J.1`); catalog payload sets `noExpiration: true` on every coin pack |
| `SCR-7` | App copy must not use cashout, withdraw, profit, earn money, prize, payout, or real winnings. | Non-overridable for user-facing copy; advisory for internal-only fields | Copy scanner runs on every store-copy save and on every catalog rebuild (`J.1`); catalog-build job fails if a published string regresses |
| `SCR-8` | Use "coins," not "$," for virtual balances and wins. | Non-overridable for user-facing copy | Copy scanner blocks bare `$`, `€`, `£`, `¥` outside the IAP price-string template (`J.1`); App Store / Play prices from `Purchases.getProducts` are exempt because they are not authored by admins |
| `SCR-9` | All digital purchases must use Apple/Google in-app purchase unless a specific regional entitlement/program is intentionally implemented. | Non-overridable except by `super_admin` with explicit `region_entitlement` flag | `is_iap_only = true` requires a matching `iap_sku` in `public.products` (`I.2`); third-party checkout routes are not reachable from the mobile app (`Y.6`); `region_entitlement` flag emits Legal-review notification on every publish |

### Z.2 Mapping to dashboard surfaces

| Surface | Rules enforced | Mechanism |
|---|---|---|
| `content_items` schema (`M.1`) | `SCR-3`, `SCR-4`, `SCR-6` | Absence of gameplay/expiration columns; CHECK constraints |
| Theme token validator (`G.1`, `D.2`) | `SCR-4` | JSON schema + DB CHECK; only 9 `MACHINE_OVERRIDE_KEYS` allowed |
| Pricing controls (`I.2`) | `SCR-5`, `SCR-6`, `SCR-9` | Hard-block validators; rejects non-IAP digital purchase rows |
| Copy compliance scanner (`J.1`) | `SCR-2`, `SCR-7`, `SCR-8`, plus adjacency to `SCR-1`/`SCR-6` | Server-side denylist with SCR-tagged categories |
| Required-disclosure copy (`J.5`) | `SCR-1`, `SCR-2`, `SCR-3`, `SCR-4`, `SCR-5`, `SCR-6`, `SCR-9` | Constants in `shared/legal-disclosures.ts` injected into catalog |
| Catalog payload schema (`N.1`, `O.4`) | `SCR-3`, `SCR-4`, `SCR-5`, `SCR-6` | Schema test in CI (`AC-9.3`); rebuild fails if disclosure strings regress |
| Mobile shop UI (`O.1`, `O.5`) | `SCR-1`, `SCR-5`, `SCR-6`, `SCR-9` | Shop tiles render canonical disclosures; chest flow shows disclosure card before confirm; IAP routes only |
| QA cross-cut (`Y.6`) | All 9 SCR | Run before every release |
| Acceptance tests (`T.10`) | All 9 SCR | One automated test per SCR |
| Audit log (`K.4`, `M.1`) | All 9 SCR | Every override attempt is recorded with actor, justification, before/after |

### Z.3 Where SCR sits relative to existing docs

| Existing doc | Relationship |
|---|---|
| `docs/legal-launch-checklist.md` | SCR is a runtime/dashboard enforcement of the legal posture established there |
| `docs/theme-branding-rules.md` §2 ("must never change") | SCR-3 and SCR-4 are the gameplay analogue of the brand-shell invariant |
| `docs/theme-creation-workflow.md` §5.2 (Copy compliance rules) | SCR-7 is the canonical denylist; the workflow doc cites SCR ids going forward |
| `shared/legal-disclosures.ts` (to be created) | Single source of truth for the literal disclosure strings (`SCR-1`, `SCR-2`, `SCR-3`, `SCR-4`, `SCR-6`, `SCR-9`) |

### Z.4 Change-control

- Adding, removing, or weakening any SCR rule is a **schema-migration-level change** that requires:
  1. A PR updating this section.
  2. A PR updating `shared/legal-disclosures.ts` and any affected validators/scanners.
  3. Legal sign-off recorded in the PR.
  4. A migration that updates published catalog payloads on the next rebuild.
- Strengthening a rule (e.g., extending the denylist) only requires Legal sign-off in the PR.
- The audit log captures every override attempt and every schema change touching this section.

---

*Last updated: 2026-05-05*
*Document owner: assign before kickoff*
*Engineering owner: assign before kickoff*
*Legal reviewer: assign before kickoff*
