# TODO

Step-level checklist. Tick a box only when it is actually verified, then mirror the change in [PROGRESS.md](PROGRESS.md) and the matching FR row in [FEATURES.md](FEATURES.md).

`✅ done · 🟨 in progress · ⬜ not started · ⏸ blocked`

Last updated: 2026-10-31

---

## Phase 0 — Documentation and structure ✅

- [x] Read the requirements end to end and extract the stack, permissions, data model, FR list
- [x] Decide the real folder tree (Plasmo entry rules + requirements §2.1)
- [x] Create `assets/`, `src/{background,contents,popup,options,lib,components,styles}`, `tests/{unit,e2e}`, `docs/`
- [x] Write `docs/README.md`, `ARCHITECTURE.md`, `LIMITATIONS.md`, `FOLDER_STRUCTURE.md`, `PLAN.md`, `TODO.md`, `PROGRESS.md`, `FEATURES.md`, `TESTING.md`
- [x] Verify Plasmo accepts `src/` with folder-form entries (`popup/index.jsx`)
- [ ] Move `subscription-detective-requirements.md` into `docs/` once the repo is initialized

---

## Phase 1 — Setup ⬜

- [ ] `git init` + first commit (`chore: scaffold`)
- [ ] `.gitignore` (`node_modules/`, `build/`, `.plasmo/`, `.env*`)
- [ ] `package.json`: `plasmo`, `react`, `react-dom`, `@plasmohq/storage`, `@plasmohq/messaging`, `date-fns`
- [ ] Dev deps: `tailwindcss`, `postcss`, `autoprefixer`, `eslint`, `prettier`, `vitest`, `@playwright/test`
- [ ] `manifest` block in `package.json`: name, description, version, `permissions: [storage, alarms, notifications]`, host permissions decision (see open question below)
- [x] `assets/logo.svg` + `assets/icon.png` (512×512) so Plasmo generates the icon set
- [ ] Tailwind configured for `src/**/*.{js,jsx}`
- [ ] ESLint + Prettier + `pnpm lint` / `pnpm format` scripts
- [ ] Scripts: `dev`, `build`, `test`, `test:e2e`
- [ ] GitHub Actions: install → lint → test → build
- [ ] `plasmo dev` loads the extension in Chrome with no console errors

**Exit:** unpacked `build/chrome-mv3-dev` loads clean; CI green on an empty commit.

---

## Phase 2 — Core storage and UI ⬜

- [ ] `src/lib/types.js` — JSDoc typedefs for Subscription and Settings (§5.1, §5.2)
- [ ] `src/lib/storage.js` — `getSubscriptions`, `saveSubscription`, `deleteSubscription`, `getSettings`, defaults merge
- [ ] `src/lib/schedule.js` — `nextChargeDate(start, cycle)`, weekly/monthly/yearly/custom
- [ ] `src/lib/currency.js` — `formatMoney`, `toMonthly`
- [ ] Unit tests: cycle math incl. Jan 31 → Feb, leap year, custom interval
- [ ] Popup shell: list sorted by next charge date, empty state
- [ ] Manual add form with validation (name required, price ≥ 0, dates coherent)
- [ ] Edit + delete with confirmation
- [ ] Status control: trial / active / cancelled / expired (FR-13)
- [ ] Options shell: default currency, detection on/off, notifications on/off
- [ ] Verify persistence across a Chrome restart

**Exit:** FR-12…FR-15, FR-40 verified manually and in `FEATURES.md`.

---

## Phase 3 — Reminders ⬜

- [ ] `src/background/alarms.js` — create/cancel per record, one alarm per (subscription, lead day)
- [ ] Default lead times `[3, 1]` from settings
- [ ] `chrome.notifications.create` with title/price/date and an "Open account" button
- [ ] Badge count = charges in the next 7 days, cleared when zero
- [ ] Reschedule on `runtime.onStartup` and `onInstalled` (trial → active transition on charge date)
- [ ] Snooze 1 day (P2 — cut first)
- [ ] Test: fires with popup never opened; survives restart; no double fire

**Exit:** a record dated +3 days notifies exactly once.

---

## Phase 4 — Detection MVP ⬜

- [ ] `src/contents/rules/` — keyword list and URL patterns (FR-2, FR-3)
- [ ] Per-site rules for the first 10 services (FR-9)
- [ ] `src/lib/detect.js` — `scorePage(document, url)` → candidate or null
- [ ] `src/lib/parse.js` — price, currency symbol, "after 14 days", "renews on", JSON-LD
- [ ] Click listener on trial/subscribe buttons (FR-4)
- [ ] MutationObserver, throttled, for SPA route changes
- [ ] CSUI banner: "Track this trial?" Confirm / Dismiss, never blocks the page
- [ ] Prefill + editable fields (FR-6, FR-7)
- [ ] Mute current site from the banner (FR-11)
- [ ] Everything wrapped in try/catch (NFR-7); escape all page-derived text (NFR-10)
- [ ] Measure added load time (<50 ms, NFR-2)
- [ ] Test on 10 real signup pages, record hit rate in PROGRESS

**Exit:** ≥8/10 pages detected correctly, no page breakage.

---

## Phase 5 — Freemium ⬜

- [ ] `src/lib/license.js` — `canAdd()`, `isPaid()`, `LIMITS = { free: 3 }`
- [ ] Free-tier enforcement at the single mutation point, not in the UI
- [ ] Upgrade prompt when limit reached, existing records still editable (FR-37)
- [ ] Decide payment provider: ExtensionPay vs Stripe + backend → record the choice + reason in ARCHITECTURE
- [ ] License check on startup, cached locally for offline (FR-38)
- [ ] Options: license status + upgrade/manage (FR-41)
- [ ] Gate paid features: unlimited, multiple reminders, summaries, export (FR-36)
- [ ] Test expired/cancelled license with network disabled

**Exit:** free user capped at 3, paid uncapped, offline license resolves.

---

## Phase 6 — Polish and QA ⬜

- [ ] Accessibility: focus order, labels, contrast, keyboard-only walkthrough (NFR-6)
- [ ] Export JSON + CSV, import JSON with preview (FR-30, FR-31)
- [ ] Spend totals monthly/yearly (FR-17)
- [ ] Account-page links (FR-18), filters by status/category (FR-19)
- [ ] Muted-sites list in options (FR-42)
- [ ] Manage-subscription page detection (FR-8, P1)
- [ ] Extend `docs/LIMITATIONS.md` with QA findings (seeded in Phase 0)
- [ ] Localization scaffolding, English strings extracted (NFR-9)
- [ ] Full manual pass of TESTING.md

**Exit:** every TESTING.md row has a recorded result.

---

## Phase 7 — Launch ⬜

- [ ] Privacy policy page (local-only promise stated)
- [ ] Permission justifications per permission
- [ ] Screenshots 1280×800, tile 440×280, icon 128×128, demo video
- [ ] Listing copy + single-purpose statement
- [ ] Payment provider disclosed in listing
- [ ] Submit → review → publish → tag `v1.0.0`

---

## Open questions (block a phase until answered)

- [ ] **Host permissions:** `<all_urls>` vs optional host permission + `activeTab`. This decides whether detection is automatic or click-to-enable, and it shapes FR-1/FR-5. Decide in Phase 1, before writing the content script.
- [ ] **Payments:** ExtensionPay (fast, ~no backend) vs Stripe checkout + license backend (more control, more work). Needed before Phase 5.
- [ ] **Pricing:** monthly / yearly / lifetime numbers — before Phase 7.
