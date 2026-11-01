# TODO

Step-level checklist. **A box is ticked only when the thing was actually verified**, then the change is mirrored in [PROGRESS.md](PROGRESS.md) and the matching FR row in [FEATURES.md](FEATURES.md).

`✅ done · 🟨 written but unverified · ⬜ not started · ⏸ blocked`

Last updated: 2026-11-01 (doc sync — roadmap surfaced in README, all docs re-dated; no box flipped, nothing new verified)

---

## Phase 0 — Documentation and structure ✅

- [x] Read the requirements end to end and extract the stack, permissions, data model, FR list
- [x] Decide the real folder tree (Plasmo entry rules + requirements §2.1)
- [x] Create `assets/`, `src/{background,contents,popup,options,lib,components,styles}`, `tests/{unit,e2e}`, `docs/`
- [x] Write `docs/README.md`, `ARCHITECTURE.md`, `LIMITATIONS.md`, `FOLDER_STRUCTURE.md`, `PLAN.md`, `TODO.md`, `PROGRESS.md`, `FEATURES.md`, `TESTING.md`
- [x] Verify Plasmo accepts `src/` with folder-form entries (`popup/index.jsx`) — confirmed by a real build
- [x] Move `subscription-detective-requirements.md` into `docs/` alongside the other docs, with every link updated

---

## Phase 1 — Setup ✅ (CI outstanding)

- [x] `git init` + first commit (`e55be73`)
- [x] `.gitignore` (`node_modules/`, `build/`, `.plasmo/`, `*.log`, `.env*`) — verified: 50 files staged, build output excluded
- [x] `package.json`: `plasmo`, `react@18.3.1`, `react-dom@18.3.1`, `@plasmohq/storage`, `@plasmohq/messaging`, `date-fns`
- [x] Dev deps: `tailwindcss@3.4.17`, `postcss`, `autoprefixer`, `eslint`, `prettier`, `vitest`, `playwright`
- [x] `manifest` block: name, short_name, `minimum_chrome_version 116`, `permissions: [storage, alarms, notifications]`
- [x] `assets/logo.svg` + `assets/icon.png` (512×512) so Plasmo generates the icon set
- [x] Tailwind configured for `src/**/*.{js,jsx}` (`tailwind.config.js`, `postcss.config.js`, `src/styles/tailwind.css`)
- [x] ESLint + Prettier configs and `npm run lint` / `npm run format` — lint is clean (0 errors, 0 warnings)
- [x] Scripts: `dev`, `build`, `package`, `test`, `test:watch`, `test:e2e`, `lint`, `format`
- [x] `tsconfig.json` with `allowJs` — Plasmo refuses to build without one
- [x] `plasmo build` produces a **loadable** extension — verified by loading it into Chromium
- [ ] GitHub Actions: install → lint → test → build (needs a remote)
- [ ] `plasmo dev` hot-reload flow (production build was used for verification instead)

**Exit:** build loads clean ✅; CI green ⬜ (blocked on a remote).

---

## Phase 2 — Core storage and UI 🟨

- [x] JSDoc typedefs for Subscription / Settings — kept inline in `lib/subscription.js` and `lib/storage.js` rather than a separate `types.js`
- [x] `src/lib/storage.js` — `getSubscriptions`, `saveSubscriptions`, `upsertSubscription`, `removeSubscription`, `getSettings`, `saveSettings`, muted sites, clear-all
- [x] `src/lib/schedule.js` — `nextChargeDate`, `rollForward`, `reminderAt`, `upcomingReminders`, `daysUntil`
- [x] `src/lib/currency.js` — `formatMoney`, `toMonthly`, `toYearly`, per-currency totals
- [x] Unit tests: cycle maths incl. Jan 31 → Feb, leap year, custom interval → **91 tests pass**
- [x] Popup shell: list sorted by next charge date, empty state ("Nothing tracked yet")
- [x] Manual add form with validation (name required, price ≥ 0, dates coherent) — verified in browser
- [x] Spend summary (monthly + yearly) — verified in browser
- [x] Category select on the form (FR-12 field)
- [x] Edit + delete with confirmation — verified in the browser (smoke suite)
- [x] Status control: trial / active / cancelled / expired — cancelled path verified in the browser (smoke suite); trial→active "converted" still unexercised
- [x] Options shell: default currency, detection on/off, notifications on/off, reminder timing — renders, zero page errors
- [ ] Verify persistence across a real Chrome restart

**Exit:** FR-12…FR-14, FR-15, FR-17, FR-19, FR-26, FR-40 verified. FR-16 (trial→active "converted") still open.

---

## Phase 3 — Reminders 🟨

- [x] `src/background/alarms.js` — one alarm per (subscription, lead day), named `sd:reminder:<id>:<days>`
- [x] Default lead times `[3, 1]` from settings — paid schedules both (verified); free schedules only the nearest lead (verified)
- [x] `chrome.notifications.create` with title/price/date and an "Open account" button — written, never seen on screen
- [x] Badge count = charges in the next 7 days, cleared at zero, snoozed records excluded — unit-tested, never seen on the toolbar
- [x] Reschedule on `runtime.onStartup` and `onInstalled`; trial → active roll-forward on charge date — written, not exercised
- [x] Snooze (1 day / 3 days / 1 week) and Wake (FR-26) — verified: end date stored, that record's alarms cleared, card shows the label, Wake restores reminders
- [x] Snooze suppresses notifications, alarm scheduling and the badge (one rule in `lib/snooze.js`, used by all three)
- [x] Unit tests for the scheduler against a fake `chrome` API (`alarms.test.js`): names, leads, clearing, badge, trial roll-forward
- [ ] Test: fires with the popup never opened; survives restart; no double fire

**Exit:** a record dated +3 days notifies exactly once. **Not yet met** — alarm *creation* is verified, notification *delivery* is not.

---

## Phase 4 — Detection MVP 🟨

- [x] `src/lib/rules/keywords.js` + `sites.js` — keyword list, URL patterns, 25 per-site rules (FR-2, FR-3, FR-9). Lives under `lib/` because Plasmo treats every file in `contents/` as a content-script entry
- [x] `src/lib/detect.js` — `scoreSignals`, `detectCandidate`, `isManagePage`, muted-site short-circuit
- [x] `src/lib/parse.js` — price, currency symbol, "after 14 days", "renews on", cycle, JSON-LD offers
- [x] Click listener on trial/subscribe buttons (FR-4)
- [x] MutationObserver, throttled, for SPA route changes
- [x] CSUI banner: "Track this subscription?" Confirm / Dismiss, inline styles (a CSUI shadow root does not receive Tailwind)
- [x] Prefill on the banner (FR-6) — verified: name, `USD 12`, monthly, 14-day trial
- [x] Inline edit before saving (FR-7) — every prefilled field is editable in the banner before saving; inline corrections are saved
- [x] Mute current site from the banner (FR-11)
- [x] Everything wrapped in try/catch (NFR-7); no `innerHTML`, all page text rendered as text nodes (NFR-10)
- [ ] Measure added load time (<50 ms, NFR-2)
- [ ] Test on 10 real signup pages, record hit rate in PROGRESS
- [x] Fixture pages (`tests/fixtures/`) served over http by `tests/e2e/detection.mjs` — 21 checks: banner on the signup page, none on the about page, record saved, host muted from the banner

**Exit:** ≥8/10 real pages detected correctly, no page breakage. Mechanics ✅ on fixtures; **real-page hit rate still unmeasured**.

---

## Phase 5 — Freemium 🟨

- [x] `src/lib/license.js` — `canAdd()`, `isPaid()`, `FREE_LIMIT = 3`, `isExpiredStatus`
- [x] Free-tier enforcement at the mutation point: popup **and** background both call `canAdd()` on `SAVE_DETECTED`
- [x] Upgrade prompt when the limit is reached, existing records still viewable/editable (FR-37) — verified in browser
- [x] License status shown in options ("Free plan (limit 3)") — verified in browser
- [ ] Decide payment provider: ExtensionPay vs Stripe + backend → record the choice + reason in ARCHITECTURE
- [ ] License check on startup against a provider, cached for offline (FR-38)
- [x] Gate multiple reminders behind the paid plan (FR-36) — verified: free = 1 alarm, paid = 6 for 3 records
- [ ] Gate spend summary and export behind the paid plan, or drop the claim from the listing copy
- [ ] Test expired/cancelled license with network disabled

**Exit:** free user capped at 3 ✅, paid uncapped ✅ (verified by switching the plan), offline license resolves ⬜ (nothing to resolve against).

---

## Phase 6 — Polish and QA 🟨

- [ ] Accessibility: focus order, labels, contrast, keyboard-only walkthrough (NFR-6)
- [x] Export JSON + CSV and import JSON, extracted to `lib/export.js` — CSV quoting, parse validation and merge are unit-tested
- [ ] Trigger a real download and pick a real file (FR-30, FR-31) — never run through the file picker
- [x] Spend totals monthly/yearly (FR-17) — verified in browser
- [ ] Account-page links (FR-18) — rendered, never clicked
- [x] Filters: search over name/notes/URL, status chips, category select, explicit empty state (FR-19) — verified in the smoke test, unit-tested in `filters.test.js`
- [x] Mute the current host from the banner (FR-11) — verified in the detection suite
- [ ] Remove a muted site from options (FR-42) — written, not exercised
- [ ] Manage-subscription page detection flow (FR-8) — `isManagePage()` exists, no UI wired
- [ ] Extend `docs/LIMITATIONS.md` with QA findings
- [ ] Localization scaffolding, English strings extracted (NFR-9)
- [ ] Full manual pass of TESTING.md

**Exit:** every TESTING.md row has a recorded result. **Not met** — the automated section is green, the manual matrix is untouched.

---

## Phase 7 — Launch ⬜

- [ ] Privacy policy page (local-only promise stated)
- [ ] Permission justifications per permission
- [ ] Screenshots 1280×800, tile 440×280, icon 128×128, demo video
- [ ] Listing copy + single-purpose statement
- [ ] Payment provider disclosed in listing
- [ ] Submit → review → publish → tag `v1.0.0`

---

## Open questions

- [x] **Host permissions:** resolved *for now* as a static content script on `<all_urls>` with no `host_permissions` key. Consequence: Chrome shows the "read and change all your data on websites you visit" warning at install, and store review will ask why. Revisit (optional permission + `activeTab`) before submission.
- [ ] **Payments:** ExtensionPay (fast, ~no backend) vs Stripe checkout + license backend (more control, more work). Blocks Phase 5 completion.
- [ ] **Pricing:** monthly / yearly / lifetime numbers — before Phase 7.
