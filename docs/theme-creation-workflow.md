# SpinVault — Paid Theme Creation Workflow

> **Audience:** Product, Design, Engineering, Audio, QA, Legal.
> **Purpose:** End-to-end checklist and reference for designing, building, testing, and releasing a new purchasable slot machine theme in SpinVault.
> **Related docs:** `docs/theme-branding-rules.md` · `docs/legal-launch-checklist.md`

---

## How to use this document

1. Copy the **Theme Spec Template** (Section 10) into a new file: `docs/themes/[theme-id]-spec.md`.
2. Fill in every field before implementation begins.
3. Walk through each numbered section as a phase gate.
4. A section is "done" only when every checkbox in it is ticked and a named approver has signed off.
5. Do not ship a theme if any **launch-blocking** item is open.

---

## Phase 0 — Concept Intake

Complete this section before any art or engineering work begins. Unanswered product questions at this stage become expensive rework later.

| Field | Value |
|---|---|
| Theme name | _________________________ |
| Internal theme ID | _________________________ (lowercase, no spaces, e.g. `pharaoh`, `ocean`, `neon-tokyo`) |
| Short description (≤ 20 words) | _________________________ |
| Target mood | _________________________ (e.g. glamorous, adventurous, dark-mystical, tropical) |
| Target player appeal | _________________________ (e.g. classic casino fans, sci-fi players, casual players) |
| Unlock price — virtual coins | _________________________ |
| Unlock price — IAP (if applicable) | _________________________ |
| Availability | [ ] Permanent  [ ] Seasonal (dates: _______ to _______)  [ ] Event-based (event: _______) |
| Removes / replaces an existing theme? | [ ] No  [ ] Yes — which: _________________________ |
| Requires app version ≥ | _________________________ |
| Legal/IP concerns at concept stage | _________________________ |

### Phase 0 sign-off

| Role | Name | Date |
|---|---|---|
| Product owner | | |
| Art lead | | |
| Legal (if IP concern flagged) | | |

---

## Phase 1 — Art Requirements

All art must be delivered in the formats and sizes below before engineering integration begins.

### 1.1 Required assets

| Asset | Description | Format | Size (px) | Notes |
|---|---|---|---|---|
| Shop preview card | Shown in the Shop theme grid | PNG | 640 × 360 | No text overlay required — theme name is rendered by UI |
| Shop thumbnail | Small tile in "Your Themes" / profile loadout | PNG | 128 × 128 | Cropped to circle on some screens |
| Preview modal hero | Full-width hero image in the theme preview sheet | PNG | 1080 × 540 | May contain subtle theme title treatment, no price text |
| Cabinet background (dark) | Machine cabinet fill, dark mode | PNG | 480 × 720 | Must tile or fill without visible edge seam |
| Cabinet background (light) | Machine cabinet fill, light mode | PNG | 480 × 720 | Lighter palette variant of the dark asset |
| Reel background (dark) | Area behind spinning reels, dark mode | PNG | 360 × 480 | Must not visually compete with symbol art |
| Reel background (light) | Area behind spinning reels, light mode | PNG | 360 × 480 | |
| Slot symbol set (optional) | Custom symbols for this theme | PNG (per symbol) | 120 × 120 | See symbol list below. Shared symbols used if not provided. |
| Profile badge (optional) | Shown on user profile when theme is equipped | PNG | 64 × 64 | Circular safe zone: 80% of canvas |

### 1.2 Slot symbol list (if custom symbols are provided)

Each theme may supply a full 10-symbol set or reuse the default set. If custom symbols are provided, all 10 must be delivered.

| Symbol slot | Default name | Theme name | File |
|---|---|---|---|
| 1 (highest value) | Seven | _________________________ | _________________________ |
| 2 | Bell | _________________________ | _________________________ |
| 3 | Crown | _________________________ | _________________________ |
| 4 | Gem | _________________________ | _________________________ |
| 5 | Star | _________________________ | _________________________ |
| 6 | Horseshoe | _________________________ | _________________________ |
| 7 | Cherry | _________________________ | _________________________ |
| 8 | Watermelon | _________________________ | _________________________ |
| 9 | Orange | _________________________ | _________________________ |
| 10 (lowest value / wild) | Wild | _________________________ | _________________________ |

### 1.3 Safe zone and compatibility notes

- **Safe zones:** All critical visual content must sit within the inner 80% of each asset. Edges may be clipped on smaller screens or when assets are masked.
- **No text in art assets:** Theme name, price, and description are rendered by the UI in system fonts. Do not embed text in preview images.
- **No cash, currency, or prize amounts:** Art must not show dollar signs, currency symbols, chip counts, or any copy that implies cash value. See Phase 5 (Copy Requirements) for wording constraints.
- **Dark and light variants:** Every machine-facing asset must have a dark-mode and a light-mode version. If a single asset works for both, it must be confirmed by the art lead.
- **No copyrighted characters or IP:** Art must be original or licensed. Confirm with legal before delivery if any reference art is used.
- **No real brand logos or trademarks:** No casino brand names, playing card manufacturers, or real-world location names may appear in art unless a license is confirmed.

### 1.4 Art sign-off

| Role | Name | Date |
|---|---|---|
| Art lead | | |
| Product owner | | |
| Legal (if IP concern) | | |

---

## Phase 2 — Token Requirements

Themes may override exactly **9 tokens** (`MACHINE_OVERRIDE_KEYS`). No other tokens may be changed.

Provide both a `dark` and a `light` value for every token. If a theme is dark-only, a light fallback that matches the default shell palette must still be provided.

### 2.1 Token values

| Token | Role | Dark value (hex) | Light value (hex) |
|---|---|---|---|
| `cabinetBg` | Machine cabinet fill color | _________________________ | _________________________ |
| `cabinetBorder` | Cabinet edge/border highlight | _________________________ | _________________________ |
| `reelBg` | Reel area fill | _________________________ | _________________________ |
| `reelBorder` | Reel area border/frame | _________________________ | _________________________ |
| `spinButtonStart` | Spin button gradient start | _________________________ | _________________________ |
| `spinButtonEnd` | Spin button gradient end | _________________________ | _________________________ |
| `jackpot` | Jackpot ticker glow, top-prize label in payout table | _________________________ | _________________________ |
| `win` | Standard win overlay, small-prize label | _________________________ | _________________________ |
| `machineAccent` | Payline highlight, corner pulse, cabinet accent | _________________________ | _________________________ |

### 2.2 Accessibility contrast requirements

The following pairs must meet a **minimum 3:1 contrast ratio** (WCAG AA large text):

| Pair | Requirement |
|---|---|
| `jackpot` over `cabinetBg` | ≥ 3:1 |
| `win` over `reelBg` | ≥ 3:1 |
| `machineAccent` over `cabinetBg` | ≥ 3:1 |
| Spin button label (white `#FFFFFF`) over `spinButtonStart` | ≥ 4.5:1 (normal text) |

Contrast ratios must be verified and recorded before engineering integration:

| Pair | Measured ratio | Pass / Fail |
|---|---|---|
| `jackpot` / `cabinetBg` (dark) | | |
| `jackpot` / `cabinetBg` (light) | | |
| `win` / `reelBg` (dark) | | |
| `win` / `reelBg` (light) | | |
| `machineAccent` / `cabinetBg` (dark) | | |
| `machineAccent` / `cabinetBg` (light) | | |
| `#FFFFFF` / `spinButtonStart` (dark) | | |
| `#FFFFFF` / `spinButtonStart` (light) | | |

**Tool:** Use [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) or Figma's built-in contrast plugin.

### 2.3 Token sign-off

| Role | Name | Date |
|---|---|---|
| Design lead | | |
| Engineering lead | | |

---

## Phase 3 — Audio Requirements

Audio is optional for the initial release of a theme. If audio is not provided, the theme inherits the default SpinVault sound set.

### 3.1 Required audio files (if custom audio is included)

| Sound | Trigger | Format | Max duration | Notes |
|---|---|---|---|---|
| Spin initiation | User taps Spin | OGG + MP3 | 0.5 s | Short mechanical or thematic click/whoosh |
| Reel stop | Each reel stops | OGG + MP3 | 0.3 s | One file; played per-reel with slight delay |
| Small win | Win < 5× bet | OGG + MP3 | 1.5 s | Upbeat chime or brief fanfare |
| Big win | Win ≥ 5× bet | OGG + MP3 | 3.0 s | More dramatic; may loop briefly |
| Jackpot / mega win | Jackpot line hit | OGG + MP3 | 5.0 s | Full celebration audio |
| Free spin entry | Free spin session starts | OGG + MP3 | 2.0 s | Distinct from win sounds |
| Bonus trigger | Bonus round activates | OGG + MP3 | 2.0 s | |
| Theme ambient loop (optional) | Background music during Play | OGG + MP3 | 30–60 s | Must loop cleanly. Disabled if player has muted music. |

### 3.2 Audio constraints

- [ ] All audio is original or covered by a confirmed license. License file or confirmation must be on record.
- [ ] No copyrighted jingles, songs, or sound effects from external sources unless licensed.
- [ ] No sounds that mimic real-money casino equipment in a misleading way (e.g. do not use realistic slot machine coin drop sounds intended to simulate cash payouts).
- [ ] Volume is normalised to **−14 LUFS** to match the default SpinVault sound set.
- [ ] Audio respects the in-app music/sound mute toggles. No audio plays if the user has disabled sound.
- [ ] Audio does not contain speech, lyrics, or any language that implies real-money winnings ("You won $500!").

### 3.3 Audio sign-off

| Role | Name | Date |
|---|---|---|
| Audio lead | | |
| Legal (if licensed audio) | | |
| Product owner | | |

---

## Phase 4 — Engineering Requirements

### 4.1 Implementation checklist

- [ ] Add theme ID to `CasinoThemeId` union type in `mobile/theme/tokens.ts`
- [ ] Add `dark` and `light` skin entry to `MACHINE_SKINS` in `mobile/theme/tokens.ts`, overriding only the 9 `MACHINE_OVERRIDE_KEYS`
- [ ] Add theme to `GameState.ownedThemes` initial state and unlock/purchase logic in `mobile/lib/game-context.tsx`
- [ ] Add theme preview data (name, description, price, preview image path) to the shop catalog in `mobile/lib/shop-iap-catalog.ts` or equivalent
- [ ] Add or update the Shop theme card in the Shop screen to include the new theme
- [ ] Add the preview modal content for the new theme in the Shop preview sheet
- [ ] Confirm `setTheme()` in `game-context.tsx` enforces ownership before equipping
- [ ] Add analytics events for theme unlock (`theme_unlocked`) and equip (`theme_equipped`) per the event naming convention (see Section 8)
- [ ] If custom audio is provided: integrate audio files and wire to existing sound hooks
- [ ] If custom symbols are provided: integrate symbol assets and wire to `SlotSymbol.tsx`

### 4.2 Boundary compliance check

Before opening a PR, the engineer must confirm all of the following:

- [ ] The new theme entry in `MACHINE_SKINS` overrides **only** the 9 `MACHINE_OVERRIDE_KEYS`. No shell tokens (`background`, `surface`, `textPrimary`, `primary`, `accent`, `gold`, `bonus`, `freeSpin`, `destructive`, etc.) are touched.
- [ ] No auth screen (`login-screen.tsx`, `register-screen.tsx`, `forgot-password-screen.tsx`, `reset-password-screen.tsx`) references the new theme.
- [ ] No onboarding screen (`OnboardingScreen.tsx`) references the new theme.
- [ ] No profile or support screen (`parity-sections.tsx`, `profile/index.tsx`) references the new theme.
- [ ] No legal modal (`LegalDocumentModal.tsx`) references the new theme.
- [ ] No new usage of `t.jackpot` or `t.machineAccent` has been introduced outside slot machine components.
- [ ] The Shop screen uses only shell-stable tokens for card chrome, price labels, and CTAs.

### 4.3 Engineering sign-off

| Role | Name | Date |
|---|---|---|
| Engineer | | |
| Engineering lead / reviewer | | |

---

## Phase 5 — Copy Requirements

All user-facing copy for a theme must be reviewed and approved before it ships.

### 5.1 Required copy fields

| Copy field | Max length | Value |
|---|---|---|
| Theme display name | 20 chars | _________________________ |
| Shop card tagline | 40 chars | _________________________ |
| Shop card short description | 80 chars | _________________________ |
| Preview modal description | 200 chars | _________________________ |
| Profile badge label (if badge is included) | 16 chars | _________________________ |
| Push notification copy (if theme has an unlock event) | 90 chars | _________________________ |

### 5.2 Copy compliance rules

All theme copy must satisfy the following. Mark each as confirmed before copy is approved.

- [ ] Does not use the words "win," "cash," "money," "prize," "payout," "jackpot," "guaranteed," or "real" in a context that implies real-money gambling or cash prizes.
  - Acceptable: "Spin to glory in Vegas Classic — 1,000 virtual coins to unlock."
  - Not acceptable: "Win real cash prizes with Vegas Classic!" or "Guaranteed payouts!"
- [ ] Does not name or imply a real casino brand, gambling establishment, or licensed property without confirmed rights.
- [ ] Does not contain superlatives claiming the theme improves win rates or odds (e.g. "Luckiest theme," "Win more with Treasure Island").
- [ ] Theme name does not conflict with a registered trademark. Legal spot-check required for names referencing places, brands, or cultural symbols.
- [ ] Copy uses `APP_NAME = 'SpinVault'` for any brand references. Do not use "Lucky Slots" as the primary app name in theme copy.
- [ ] Short descriptions align with the approved in-app product copy: themes change the machine style, not the account.

### 5.3 Copy sign-off

| Role | Name | Date |
|---|---|---|
| Product/content owner | | |
| Legal | | |

---

## Phase 6 — QA Checklist

Run on a physical device (iOS and Android) with a fresh test account.

### 6.1 Purchase and equip flow

- [ ] Theme appears correctly in the Shop grid with the right name, description, and price
- [ ] Preview modal opens with the correct hero image and copy
- [ ] Tapping "Unlock" / "Buy" triggers the correct unlock or IAP flow
- [ ] After purchase, theme appears in "Your Themes" with an active indicator
- [ ] Tapping "Equip" sets the theme as active
- [ ] Tapping "Equip" on a different theme correctly switches away from the new theme
- [ ] Re-equipping the new theme after switching away works correctly
- [ ] Theme persists after closing and reopening the app (cold launch)
- [ ] Theme persists after backgrounding and foregrounding the app
- [ ] Theme persists after the user signs out and signs back in (if theme ownership is synced to account)

### 6.2 Play screen — theme changes (must all pass)

- [ ] Cabinet background color matches the theme's `cabinetBg` token
- [ ] Cabinet border matches `cabinetBorder`
- [ ] Reel background matches `reelBg`
- [ ] Reel border matches `reelBorder`
- [ ] Spin button gradient matches `spinButtonStart` → `spinButtonEnd`
- [ ] Payline highlight color matches `machineAccent`
- [ ] Win overlay/celebration color uses `win` token
- [ ] Jackpot ticker uses `jackpot` token
- [ ] If custom symbols are included: correct symbols appear on reels
- [ ] If custom audio is included: custom sounds play on spin, win, big win, jackpot, free spin entry
- [ ] Audio respects the in-app mute toggle

### 6.3 Global brand shell — must remain unchanged

- [ ] **Onboarding:** SpinVault teal primary button, gold accent, no theme colors bleed in
- [ ] **Login screen:** "SpinVault" kicker text, teal primary button — brand-stable
- [ ] **Register / Forgot password / Reset password:** brand-stable
- [ ] **Profile header:** avatar, username, coin balance — shell colors only
- [ ] **Daily rewards — weekly streak bonus:** coin amount displays in **gold** (#D4AF37), not the new theme's `jackpot` color
- [ ] **Daily spin wheel:** all 8 segments display reward-positive colors; no red or off-brand segments
- [ ] **Missions tab:** completed checkmarks are green; no theme-colored indicators
- [ ] **Support section:** Help Center, Contact Support, Privacy Policy, Terms — shell colors only
- [ ] **Privacy Policy modal:** shell background, shell text, no machine-skin bleed
- [ ] **Terms of Service modal:** shell background, shell text, no machine-skin bleed
- [ ] **IAP purchase confirmation dialog:** "Virtual coins have no cash value and cannot be refunded" — standard copy and shell colors, unaffected by theme
- [ ] **Restore Purchases flow:** standard toast copy and colors
- [ ] **Tab bar chrome:** icon and label colors unchanged

### 6.4 Accessibility

- [ ] All contrast ratios recorded in Phase 2 are visually verified on device
- [ ] Spin button label ("SPIN") is legible on the theme's spin button gradient in both light and dark modes
- [ ] Win overlay text is legible over the `win` / `jackpot` token color on the reel background
- [ ] No animated element flashes more than 3 times per second (seizure risk)

### 6.5 QA sign-off

| Role | Name | Device(s) tested | Date |
|---|---|---|---|
| QA lead | | | |
| Engineer (self-test) | | | |

---

## Phase 7 — Release Checklist

Complete all items before the theme is included in a production release.

### 7.1 Legal and IP

- [ ] Theme name does not infringe a registered trademark — legal confirmation on record
- [ ] All art is original or covered by a confirmed license — license file stored in `docs/licenses/`
- [ ] All audio is original or covered by a confirmed license — license file stored in `docs/licenses/`
- [ ] No real-money gambling implication in any copy, art, or audio — legal confirmation on record
- [ ] If the theme references a real place, brand, or cultural symbol: explicit legal sign-off on record

### 7.2 Art, audio, and product

- [ ] Final art assets committed to the correct `assets/` paths
- [ ] Final audio files committed to the correct `assets/audio/` paths (if applicable)
- [ ] Shop preview card and thumbnail look correct on the App Store screenshot resolution
- [ ] App Store / Play Store screenshots updated if the new theme will be featured in store marketing
- [ ] Theme pricing approved by the product owner and, if applicable, the monetization team

### 7.3 Analytics

Analytics events to confirm are firing correctly before release:

| Event | Trigger | Required properties |
|---|---|---|
| `theme_previewed` | User opens the theme preview modal | `theme_id`, `source` (shop / promo / etc.) |
| `theme_unlock_started` | User taps "Unlock" / "Buy" | `theme_id`, `price_coins` or `sku` |
| `theme_unlocked` | Theme successfully unlocked or purchased | `theme_id`, `method` (coins / iap) |
| `theme_equipped` | User equips the theme | `theme_id` |
| `theme_unequipped` | User switches away from this theme | `theme_id`, `next_theme_id` |

- [ ] All events above confirmed firing in staging with correct properties
- [ ] Event names follow the existing `AnalyticsEvents` convention in `lib/analytics/track.ts`

### 7.4 Version and release notes

- [ ] Theme included in the app release notes / changelog: "New theme: [Theme Name]"
- [ ] Internal release notes include: theme ID, files changed, QA owner, approvals
- [ ] Minimum app version requirement noted (if theme requires new runtime APIs)

### 7.5 Release sign-off

| Role | Name | Date |
|---|---|---|
| Product owner | | |
| Engineering lead | | |
| Legal | | |
| QA lead | | |

---

## Phase 8 — Post-Release Monitoring

Monitor the following in the first 48 hours after the theme goes live:

- [ ] No crash reports related to the new theme's token values or asset loading
- [ ] `theme_previewed`, `theme_unlocked`, and `theme_equipped` events appear in analytics
- [ ] No support tickets about visual glitches, missing assets, or incorrect colors
- [ ] Revenue / unlock rate within expected range (flag outliers to product)
- [ ] App Store review queue: no new reviews mentioning the theme name negatively

---

## 10. Theme Spec Template

Copy this template into `docs/themes/[theme-id]-spec.md` for each new theme. Delete the instructional text in brackets before sharing with the team.

---

```markdown
# Theme Spec — [Theme Display Name]

> Status: [ ] Draft  [ ] In Review  [ ] Approved  [ ] In Development  [ ] QA  [ ] Released
> Spec owner: [name]
> Last updated: [date]

---

## Concept

| Field | Value |
|---|---|
| Theme name | |
| Theme ID | |
| Short description (≤ 20 words) | |
| Target mood | |
| Target player appeal | |
| Unlock price — virtual coins | |
| Unlock price — IAP SKU (if applicable) | |
| Availability | [ ] Permanent  [ ] Seasonal (dates: ___)  [ ] Event |
| Seasonal removal date (if applicable) | |
| Replaces an existing theme? | [ ] No  [ ] Yes — which: |
| Minimum app version | |

---

## Art

| Asset | File path | Status |
|---|---|---|
| Shop preview card (640 × 360) | `assets/images/store-offers/[theme-id]-preview.png` | [ ] Not started  [ ] In progress  [ ] Delivered  [ ] Approved |
| Shop thumbnail (128 × 128) | `assets/images/store-offers/[theme-id]-thumb.png` | [ ] Not started  [ ] In progress  [ ] Delivered  [ ] Approved |
| Preview modal hero (1080 × 540) | `assets/images/store-offers/[theme-id]-hero.png` | [ ] Not started  [ ] In progress  [ ] Delivered  [ ] Approved |
| Cabinet bg — dark (480 × 720) | `assets/images/themes/[theme-id]/cabinet-dark.png` | [ ] Not started  [ ] In progress  [ ] Delivered  [ ] Approved |
| Cabinet bg — light (480 × 720) | `assets/images/themes/[theme-id]/cabinet-light.png` | [ ] Not started  [ ] In progress  [ ] Delivered  [ ] Approved |
| Reel bg — dark (360 × 480) | `assets/images/themes/[theme-id]/reel-dark.png` | [ ] Not started  [ ] In progress  [ ] Delivered  [ ] Approved |
| Reel bg — light (360 × 480) | `assets/images/themes/[theme-id]/reel-light.png` | [ ] Not started  [ ] In progress  [ ] Delivered  [ ] Approved |
| Custom symbols (optional) | `assets/images/themes/[theme-id]/symbols/` | [ ] N/A  [ ] In progress  [ ] Delivered  [ ] Approved |
| Profile badge (optional, 64 × 64) | `assets/images/themes/[theme-id]/badge.png` | [ ] N/A  [ ] In progress  [ ] Delivered  [ ] Approved |

Custom symbols provided: [ ] Yes (all 10)  [ ] No — using default symbols

IP / licensing notes:
[Describe any reference art used. Confirm all original or licensed.]

Art approved by: ___________  Date: ___________

---

## Tokens

| Token | Dark value | Light value | Contrast check |
|---|---|---|---|
| `cabinetBg` | | | — |
| `cabinetBorder` | | | — |
| `reelBg` | | | — |
| `reelBorder` | | | — |
| `spinButtonStart` | | | `#FFF` over start: ___:1 |
| `spinButtonEnd` | | | — |
| `jackpot` | | | over `cabinetBg`: ___:1 |
| `win` | | | over `reelBg`: ___:1 |
| `machineAccent` | | | over `cabinetBg`: ___:1 |

All contrast ratios ≥ 3:1: [ ] Yes  [ ] No — describe: ________________

Tokens approved by: ___________  Date: ___________

---

## Audio

Custom audio included: [ ] Yes  [ ] No — using default SpinVault sounds

| Sound | File path | Duration | Status |
|---|---|---|---|
| Spin initiation | `assets/audio/themes/[theme-id]/spin.mp3` | | [ ] N/A  [ ] Delivered  [ ] Approved |
| Reel stop | `assets/audio/themes/[theme-id]/reel-stop.mp3` | | [ ] N/A  [ ] Delivered  [ ] Approved |
| Small win | `assets/audio/themes/[theme-id]/win-small.mp3` | | [ ] N/A  [ ] Delivered  [ ] Approved |
| Big win | `assets/audio/themes/[theme-id]/win-big.mp3` | | [ ] N/A  [ ] Delivered  [ ] Approved |
| Jackpot | `assets/audio/themes/[theme-id]/jackpot.mp3` | | [ ] N/A  [ ] Delivered  [ ] Approved |
| Free spin entry | `assets/audio/themes/[theme-id]/free-spin.mp3` | | [ ] N/A  [ ] Delivered  [ ] Approved |
| Ambient loop (optional) | `assets/audio/themes/[theme-id]/ambient.mp3` | | [ ] N/A  [ ] Delivered  [ ] Approved |

License file (if applicable): `docs/licenses/[theme-id]-audio-license.txt`
Volume normalised to −14 LUFS: [ ] Yes  [ ] N/A

Audio approved by: ___________  Date: ___________

---

## Copy

| Field | Value |
|---|---|
| Theme display name | |
| Shop card tagline (≤ 40 chars) | |
| Shop card short description (≤ 80 chars) | |
| Preview modal description (≤ 200 chars) | |
| Profile badge label (≤ 16 chars, if badge included) | |
| Push notification copy (≤ 90 chars, if unlock event) | |

Compliance check:
- [ ] No copy implies real-money gambling, cash prizes, or improved win odds
- [ ] Theme name does not infringe a trademark — legal check: [ ] Not needed  [ ] Confirmed on ___
- [ ] References to SpinVault use `APP_NAME = 'SpinVault'`

Copy approved by: ___________  Date: ___________

---

## Engineering notes

[ ] Theme ID added to `CasinoThemeId`
[ ] Skin entry added to `MACHINE_SKINS` (dark + light, 9 tokens only)
[ ] Added to `GameState.ownedThemes` and unlock logic
[ ] Shop catalog entry added
[ ] Shop card and preview modal implemented
[ ] Analytics events wired: `theme_previewed`, `theme_unlock_started`, `theme_unlocked`, `theme_equipped`, `theme_unequipped`
[ ] Custom audio integrated (if applicable)
[ ] Custom symbols integrated (if applicable)
[ ] Boundary compliance check passed (no shell token changes, no auth/profile/legal screen changes)

Engineer: ___________  Reviewer: ___________  Date: ___________

---

## QA sign-off

[ ] Purchase / equip flow — pass
[ ] Play screen theme changes — pass
[ ] Global shell screens stable — pass
[ ] Accessibility contrast verified on device — pass
[ ] Cold launch theme persistence — pass
[ ] iOS device: ___________
[ ] Android device: ___________

QA lead: ___________  Date: ___________

---

## Release sign-off

[ ] Legal/IP — cleared  [ ] Art — approved  [ ] Audio — approved
[ ] Copy — approved  [ ] Economy/pricing — approved
[ ] Analytics events confirmed in staging
[ ] App Store screenshots updated (if theme is featured)
[ ] Release notes entry written

Product owner: ___________
Engineering lead: ___________
Legal: ___________
Date: ___________
```

---

*Last updated: 2026-05-05*
*Document owner: assign before launch*
