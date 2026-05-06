# SpinVault — Legal & Support Launch Readiness Checklist

> **Purpose:** This checklist tracks every legal and support value that must be replaced or approved before submitting SpinVault to the App Store and Google Play.
>
> **In-app legal docs vs. hosted URLs:** SpinVault displays Privacy Policy and Terms of Service in-app (via `LegalDocumentModal`) for user convenience. This does not replace the requirement for publicly hosted URLs. Apple App Store Connect and Google Play Console both require a live public URL for Privacy Policy and Terms of Service that resolves in a browser. Both are required.

---

## Status Key

| Symbol | Meaning |
|--------|---------|
| 🔴 | **Launch-blocking** — must be resolved before App Store / Play Store submission |
| 🟡 | **Required** — needed for full functionality but does not block submission in all regions |
| ✅ | Complete |

---

## 1. Required Production Values

Replace every value below with a real, production-ready value before release. Do not use placeholder strings.

| # | Item | Current Value | Status |
|---|------|--------------|--------|
| 1 | **Help Center URL** | `https://TODO_REPLACE_SPINVAULT_HELP_CENTER_URL` | 🔴 |
| 2 | **Support email address** | `support@TODO_REPLACE_SPINVAULT_DOMAIN` | 🔴 |
| 3 | **Privacy Policy public URL** | `https://TODO_REPLACE_SPINVAULT_PRIVACY_POLICY_URL` | 🔴 |
| 4 | **Terms of Service public URL** | `https://TODO_REPLACE_SPINVAULT_TERMS_URL` | 🔴 |
| 5 | **Legal effective date** | `2026-01-01` (placeholder) | 🔴 |
| 6 | **Legal entity / company name** | Not yet defined in legal docs | 🔴 |
| 7 | **Company mailing address** | Not yet defined in legal docs | 🟡 |
| 8 | **App Store Connect — Privacy Policy URL field** | Must match item 3 above | 🔴 |
| 9 | **Google Play Console — Privacy Policy URL field** | Must match item 3 above | 🔴 |
| 10 | **App Store Connect — Terms of Service URL field** | Must match item 4 above | 🟡 |

### Notes on App Store / Google Play metadata

- **Apple App Store Connect** requires a Privacy Policy URL on the app page. This is mandatory for all apps regardless of whether they collect personal data.
- **Google Play Console** requires a Privacy Policy URL for all apps. Apps targeting users under 18 or in certain categories must also meet additional requirements.
- **Terms of Service** is not strictly mandatory in App Store metadata fields but is strongly recommended and required by Apple's App Review Guidelines for social/gaming apps with user accounts and in-app purchases.
- Both stores may reject or remove the app if the linked URLs are inaccessible or return errors at review time.

---

## 2. Files That Contain Placeholders

### `shared/support-urls.ts`

Central source of truth for all external legal and support URLs. Used by both the mobile app and (if applicable) the web app.

```
shared/support-urls.ts
├── SPINVAULT_HELP_CENTER_URL_REQUIRED     → 'https://TODO_REPLACE_SPINVAULT_HELP_CENTER_URL'
├── SPINVAULT_SUPPORT_EMAIL_REQUIRED       → 'support@TODO_REPLACE_SPINVAULT_DOMAIN'
├── SPINVAULT_PRIVACY_URL_REQUIRED         → 'https://TODO_REPLACE_SPINVAULT_PRIVACY_POLICY_URL'
└── SPINVAULT_TERMS_URL_REQUIRED           → 'https://TODO_REPLACE_SPINVAULT_TERMS_URL'
```

Downstream consumers of these values (via `SUPPORT_URLS`):
- `mobile/lib/support-links.ts` — re-exports `SUPPORT_URLS` to the mobile app
- `mobile/components/profile/parity-sections.tsx` — `SupportSection` Help Center and Contact rows
- External URL fallback for future website / web app use

### `shared/legal-documents.ts`

Contains in-app legal document copy. Currently DRAFT — not reviewed by legal counsel.

```
shared/legal-documents.ts
├── TERMS_OF_SERVICE.effectiveDate         → '2026-01-01'  (placeholder date)
├── TERMS_OF_SERVICE.sections[11].body     → 'support@TODO_REPLACE_SPINVAULT_DOMAIN'  (visible in-app)
├── PRIVACY_POLICY.effectiveDate           → '2026-01-01'  (placeholder date)
├── PRIVACY_POLICY.sections[6].body        → 'support@TODO_REPLACE_SPINVAULT_DOMAIN'  (visible in-app)
└── PRIVACY_POLICY.sections[9].body        → 'support@TODO_REPLACE_SPINVAULT_DOMAIN'  (visible in-app)
```

All section copy is draft text and must be reviewed and approved by qualified legal counsel before submission.

### `mobile/components/modals/LegalDocumentModal.tsx`

Renders the in-app legal document. Contains a DRAFT warning banner that is currently visible to all users:

```
Line 69: ⚠️  DRAFT — pending legal review. Not final.
```

This banner must be removed once legal copy is finalized and approved.

### `mobile/components/profile/parity-sections.tsx`

Contains three non-legal `TODO(launch)` items related to Responsible Play enforcement (not legal URLs, but noted here for completeness):

```
Line 762: TODO(launch): Enforce dailyPurchaseLimit in the shop purchase flow before enabling this UI.
Line 829: TODO(launch): Remove opacity/disabled once cooldown is enforced in ControlDeck spin path.
Line 855: TODO(launch): Remove "coming soon" note once daily spend cap is enforced in shop/index.tsx.
```

---

## 3. Exact Placeholders to Replace

Search the codebase for these strings to confirm no instances remain before submitting to app stores.

| Placeholder string | Where it appears | Action required |
|---|---|---|
| `TODO_REPLACE_SPINVAULT_HELP_CENTER_URL` | `shared/support-urls.ts` L5 | Replace with real Help Center URL |
| `TODO_REPLACE_SPINVAULT_DOMAIN` | `shared/support-urls.ts` L8, `shared/legal-documents.ts` L121, L193, L211 | Replace with real domain (e.g. `spinvault.app`) |
| `TODO_REPLACE_SPINVAULT_PRIVACY_POLICY_URL` | `shared/support-urls.ts` L14 | Replace with real Privacy Policy URL |
| `TODO_REPLACE_SPINVAULT_TERMS_URL` | `shared/support-urls.ts` L20 | Replace with real Terms of Service URL |
| `2026-01-01` (effective date) | `shared/legal-documents.ts` L33, L133 | Replace with actual legal effective date |
| `DRAFT — pending legal review` | `mobile/components/modals/LegalDocumentModal.tsx` L69 | Remove banner once legal copy is approved |

### How to verify no placeholders remain

Run the following search before submitting a production build:

```bash
# From the repo root — should return zero results in a production-ready build
grep -r "TODO_REPLACE" shared/ mobile/
grep -r "DRAFT.*pending legal" mobile/
```

---

## 4. Release Blocker Status

| Item | Severity | Notes |
|------|----------|-------|
| `shared/support-urls.ts` — all four `TODO_REPLACE` values | 🔴 Launch-blocking | Placeholder URLs are visible to users in Help Center and Contact rows. Placeholder email is rendered inside in-app legal document text. |
| `shared/legal-documents.ts` — draft copy not reviewed by lawyer | 🔴 Launch-blocking | App Store and Play Store require accurate Privacy Policy. Draft text may not accurately reflect actual data collection practices. |
| `shared/legal-documents.ts` — `TODO_REPLACE_SPINVAULT_DOMAIN` in legal body text | 🔴 Launch-blocking | Placeholder email address is rendered as visible text inside the in-app Privacy Policy and Terms of Service. |
| `shared/legal-documents.ts` — placeholder `effectiveDate` values | 🔴 Launch-blocking | Effective date must match the date on the lawyer-approved document. |
| `mobile/components/modals/LegalDocumentModal.tsx` — DRAFT warning banner | 🔴 Launch-blocking | Banner is visible to all users in production. Must be removed once legal copy is finalized. |
| `mobile/components/profile/parity-sections.tsx` — Responsible Play enforcement TODOs | 🟡 Functional — not legal | Cooldown mode and daily purchase cap are UI-only; enforcement not implemented. Consider hiding or completing before launch. |

---

## 5. Verification Steps

Run through each step manually on a production build (not Expo Go dev) before submission.

### In-app legal document behavior

- [ ] Tap "Terms of Service" on the onboarding age gate → in-app modal opens, no browser opens
- [ ] Tap "Privacy Policy" on the onboarding age gate → in-app modal opens, no browser opens
- [ ] Close modal → returns to age gate, Continue button still disabled until 18+ is selected
- [ ] Tap "Terms of Service" on the onboarding signup step → in-app modal opens
- [ ] Tap "Privacy Policy" on the onboarding signup step → in-app modal opens
- [ ] Complete onboarding → go to Profile → Support → tap "Privacy Policy" → in-app modal opens
- [ ] Profile → Support → tap "Terms of Service" → in-app modal opens
- [ ] Modal shows correct title ("Privacy Policy" or "Terms of Service")
- [ ] Modal content scrolls fully on iPhone SE (small device)
- [ ] Modal dismisses on Close button tap
- [ ] Modal dismisses on Android hardware back button
- [ ] Modal dismisses on tap above the sheet
- [ ] DRAFT banner is **not present** in the production build (only after legal copy is approved)

### External links

- [ ] Profile → Support → tap "Help Center" → opens real Help Center URL in the system browser
- [ ] Profile → Support → tap "Contact Support" → opens `mailto:` link in the mail client
- [ ] Both links resolve to real, accessible URLs (not `TODO_REPLACE` strings)

### Public hosted URLs (store metadata)

- [ ] Privacy Policy URL entered in App Store Connect loads correctly in Safari
- [ ] Privacy Policy URL entered in Google Play Console loads correctly in Chrome
- [ ] Terms of Service URL resolves and loads correctly
- [ ] Both URLs return HTTP 200 (not 404 or redirect loop)
- [ ] Both pages are accessible without login

### Placeholder verification

- [ ] `grep -r "TODO_REPLACE" shared/ mobile/` returns zero results
- [ ] `grep -r "DRAFT.*pending legal" mobile/` returns zero results
- [ ] `grep -r "TODO_REPLACE_SPINVAULT_DOMAIN" .` returns zero results
- [ ] Effective dates in Privacy Policy and Terms match the lawyer-approved document

---

## 6. Suggested Production Environment Values

Replace each placeholder below with a real value. Do not use invented or fake URLs.

```
# shared/support-urls.ts

SPINVAULT_HELP_CENTER_URL       = https://[YOUR_HELP_CENTER_DOMAIN]/  
SPINVAULT_SUPPORT_EMAIL         = support@[YOUR_DOMAIN]
SPINVAULT_PRIVACY_URL           = https://[YOUR_DOMAIN]/privacy
SPINVAULT_TERMS_URL             = https://[YOUR_DOMAIN]/terms

# shared/legal-documents.ts

effectiveDate (both documents)  = [YYYY-MM-DD of lawyer-approved version]
contact email (3 occurrences)   = support@[YOUR_DOMAIN]
legal entity name               = [YOUR_COMPANY_LEGAL_NAME]
mailing address (if required)   = [YOUR_COMPANY_ADDRESS]
```

### Recommended hosted URL structure

```
https://spinvault.app/privacy      ← Privacy Policy (must be publicly accessible)
https://spinvault.app/terms        ← Terms of Service
https://support.spinvault.app/     ← Help Center (can be Notion, Zendesk, Intercom, etc.)
support@spinvault.app              ← Support inbox
```

These are suggested formats only. Replace `spinvault.app` with the actual registered domain.

---

## 7. Important Notes

### In-app legal docs and hosted URLs serve different purposes

| Purpose | In-app modal (`LegalDocumentModal`) | Hosted public URL |
|---|---|---|
| User can read legal docs without leaving the app | ✅ Yes | ❌ No |
| App Store Connect / Google Play Console metadata field | ❌ Not accepted | ✅ Required |
| Accessible without the app installed | ❌ No | ✅ Yes |
| Can be linked from email, website, social media | ❌ No | ✅ Yes |
| Legal counsel can review and approve | ✅ Yes (via `shared/legal-documents.ts`) | ✅ Yes |

**Both are required.** The in-app modal improves user experience and meets store guidelines for in-app accessibility. The hosted URL meets the mandatory store metadata requirement and provides external access.

### Legal review is not optional

The current content in `shared/legal-documents.ts` is draft text written for structural reference. It has not been reviewed by a lawyer and does not constitute legal advice. Content that inaccurately describes data collection practices could expose the company to regulatory risk in jurisdictions with strict privacy laws (GDPR, CCPA, PIPEDA, etc.).

**Minimum recommended legal review before launch:**
- Privacy Policy — reviewed for accuracy against actual data collection (Supabase, RevenueCat, ad networks, analytics)
- Terms of Service — reviewed for jurisdictional compliance, IAP refund language, and age restriction enforceability
- Age-gating mechanism — confirm that the current "I am 18 or older" checkbox satisfies requirements in target markets

---

## 8. Trademark / Brand Name Review

> **Engineering note:** All items in this section are business or legal actions. No code changes are required unless the outcome changes the brand name, symbol usage, or copy.

### 8.1 Official app name

| Item | Current value | Action |
|---|---|---|
| In-app display name | `SpinVault` | Confirm this is the final, approved name |
| Formal / legal name | `SpinVault Lucky Slots` | Used in legal documents (Terms of Service, Privacy Policy intro) — confirm with counsel |
| App Store listing name | Not yet submitted | Confirm availability at submit time |
| Google Play listing name | Not yet submitted | Confirm availability at submit time |
| Brand constant source of truth | `shared/brand.ts` → `APP_NAME` | Engineering reference — update if name changes |

### 8.2 Trademark status

| Item | Status | Action required |
|---|---|---|
| Trademark search completed for "SpinVault" | 🔴 Unknown | Business/legal must confirm a trademark clearance search was conducted |
| Trademark search completed for "SpinVault Lucky Slots" | 🔴 Unknown | Same as above |
| Trademark application filed or planned | 🔴 Unknown | Business decision — confirm with founders/legal |
| `™` symbol usage approved | 🔴 Not approved | Do not use `™` without explicit legal confirmation |
| `®` symbol usage approved | 🔴 Not approved — not registered | Do not use `®` under any circumstances unless trademark registration is confirmed |
| "SpinVault is a registered trademark" language | 🔴 Do not use | No registration confirmed |
| Safe alternative wording if trademark note needed | — | "SpinVault is a brand name used for this app." |

**Current code status:** No `™` or `®` symbols appear anywhere in the codebase. This is correct. Do not add them unless legal explicitly approves.

### 8.3 Domain and handle availability

| Item | Status | Action |
|---|---|---|
| Domain `spinvault.app` or equivalent | 🔴 Unknown | Confirm registration |
| Privacy Policy URL resolves at domain | 🔴 Unknown — URL is still a placeholder | See Section 1, item 3 |
| Terms of Service URL resolves at domain | 🔴 Unknown — URL is still a placeholder | See Section 1, item 4 |
| App Store name `SpinVault` available | 🔴 Not yet checked | Check App Store Connect before submission |
| Google Play name `SpinVault` available | 🔴 Not yet checked | Check Play Console before submission |
| Social handles `@spinvault` (Instagram, TikTok, X, etc.) | 🔴 Unknown | Business action |

### 8.4 Brand name in legal documents

The in-app legal documents (`shared/legal-documents.ts`) currently use:
- **Opening definition:** `SpinVault Lucky Slots ("SpinVault", "we", "our", or "us")` — correct legal drafting style
- **Body:** `SpinVault` throughout — consistent with the defined short name
- **No trademark symbols** — correct pending legal confirmation

These are controlled by `APP_NAME` and `APP_FULL_NAME` constants in `shared/brand.ts`. If the formal name changes, update those two constants and the legal document intros will reflect the change automatically.

### 8.5 Compliance copy

The following compliance lines are used in-app. Legal should confirm the wording is sufficient for target markets:

| Copy | Location | Notes |
|---|---|---|
| `"Virtual coins only. No cash value."` | Onboarding welcome step | Short disclosure — confirm sufficiency |
| `"Virtual coins and rewards are for entertainment only. No cash value. SpinVault does not offer real-money gambling or cash prizes."` | Onboarding age gate | Longer form — confirm wording |
| `"All amounts are virtual coins. No real-money payouts."` | Slot machine InfoModal | Confirm for gambling compliance |
| `"Virtual coins have no cash value and cannot be refunded."` | IAP confirmation dialog | Confirm for consumer protection compliance |

---

*Last updated: 2026-05-05*
*Checklist owner: assign before launch*
