# Plan

7 phases, derived from requirements §10. Each phase has a goal, a task list, **exit criteria** (the only thing that makes it ✅), and the FR IDs it closes. Task-level checkboxes live in [TODO.md](TODO.md); current state lives in [PROGRESS.md](PROGRESS.md).

Guiding constraint: **P0 before P1 before P2**, and nothing in Phase 5+ starts before Phase 4 detection works, because the free limit only means something once tracking is real.

---

## Phase 0 — Documentation and structure ✅

**Goal:** know what we are building and where it goes.

- Annotated folder tree, requirements-faithful doc set, status markers, per-phase checklist.

**Exit criteria:** `docs/` is complete enough that a new contributor can answer "what's left?" from `TODO.md` alone. → **met**.

---

## Phase 1 — Setup (1–2 days) ⬜

**Goal:** `pnpm dev` opens Chrome with an empty but installed extension.

- `git init`, `.gitignore`, package manager, Plasmo + React + Tailwind, ESLint + Prettier.
- `assets/icon.png`, Plasmo `manifest` overrides in `package.json` (name, description, permissions, `minimum_chrome_version`).
- CI workflow: install → lint → test → `plasmo build`.

**Exit criteria:** `plasmo build` produces `build/chrome-mv3-prod/` that loads as an unpacked extension with zero console errors; `pnpm lint` and `plasmo build` both pass in CI.

**Closes:** NFR-1, NFR-5 (declaration only).

---

## Phase 2 — Core storage and UI (1 week) ⬜

**Goal:** subscriptions can be created, listed and edited by hand, and survive a browser restart.

- Data model + defaults in `lib/storage.js`, JSDoc types in `lib/types.js`.
- `lib/schedule.js`: normalize weekly/monthly/yearly/custom → `nextChargeDate`; month-end handling.
- Popup: list sorted by next charge date, empty state, create/edit form, delete with confirm.
- Options: default currency, detection toggle, notification toggle.

**Exit criteria:** create → restart Chrome → record still listed with the right next charge date; unit tests cover every billing cycle and a 31st-of-month edge case; `FEATURES.md` rows FR-12…FR-15, FR-40 flip to ✅.

**Closes:** FR-10, FR-12, FR-13, FR-14, FR-15, FR-27, FR-32, FR-40; NFR-3.

---

## Phase 3 — Reminders (3–4 days) ⬜

**Goal:** the user is told before money leaves their account.

- `chrome.alarms` scheduling, reschedule on `onStartup` / `onInstalled`.
- 3-day and 1-day defaults, configurable lead times.
- `chrome.notifications` with an "Open account page" action; badge = charges in next 7 days.
- Mark-as-cancelled straight from the notification flow.

**Exit criteria:** with a test record dated +3 days, the notification fires without the popup ever being opened; alarms survive a Chrome restart and an extension reload; nothing double-fires.

**Closes:** FR-20, FR-21, FR-23, FR-25, FR-26, FR-24, FR-22; NFR-3.

---

## Phase 4 — Detection MVP (1–2 weeks) ⬜

**Goal:** visit a trial signup page, get one honest banner, confirm in two clicks.

- Keyword + URL pattern rules (FR-2, FR-3), per-site rules file (FR-9).
- Click detection on trial/subscribe buttons (FR-4), MutationObserver with throttle for SPAs (§8).
- CSUI banner with Confirm / Dismiss (FR-5), prefilled name/price/cycle/trial end (FR-6), editable (FR-7).
- Report any evidence of a false positive; muted sites (FR-11).

**Exit criteria:** on 10 real signup pages across 5 services, ≥8 produce a banner with a correct service name and a price or trial length prefilled; zero page-breaking errors in the console; the content script adds <50 ms to load (NFR-2).

**Closes:** FR-1…FR-7, FR-9, FR-11; NFR-2, NFR-4, NFR-7, NFR-10.

---

## Phase 5 — Freemium (1 week) ⬜

**Goal:** the third free record is the last free one, and paying lifts the limit offline.

- Limit + gate in `lib/license.js` (FR-34, FR-37); reminders stay free (FR-35).
- Payment integration (ExtensionPay vs Stripe + backend — decide here, record why), plan config (FR-39).
- License check on startup, cached locally (FR-38); options page shows status + manage button (FR-41).
- Gated features: unlimited records, multiple reminders, spend summaries, export (FR-36).

**Exit criteria:** a simulated expired/cancelled license keeps all existing records readable and editable, blocks only new creates, and shows the upgrade path; with network off the cached license still resolves correctly.

**Closes:** FR-34…FR-39, FR-41.

---

## Phase 6 — Polish and QA (1 week) ⬜

**Goal:** nothing embarrassing ships.

- Accessibility pass on popup + options (NFR-6), keyboard and contrast.
- Export/import JSON + CSV (FR-30, FR-31), spend totals (FR-17), filters (FR-19), account links (FR-18), mute list UI (FR-42).
- Extend `LIMITATIONS.md` (seeded in Phase 0), localization scaffolding (NFR-9), performance and memory check (NFR-2, NFR-3).
- Full manual pass of [TESTING.md](TESTING.md).

**Exit criteria:** every checklist row in TESTING.md has a result; zero P0 bugs open; Lighthouse-style keyboard walkthrough completes without a mouse.

**Closes:** FR-8, FR-17, FR-18, FR-19, FR-30, FR-31, FR-42; NFR-6, NFR-8, NFR-9.

---

## Phase 7 — Launch (3–5 days) ⬜

**Goal:** live on the Chrome Web Store.

- Privacy policy (data stays local), permission justifications, 1280×800 screenshots, 440×280 tile, 128×128 icon, demo video.
- Listing copy, single-purpose statement, payment-provider disclosure (requirements §9).
- Submit, verify review, publish, tag the release.

**Exit criteria:** store listing approved and installed from the store (not unpacked) with tracking, reminders and the paywall all working; success-metric baseline recorded.

---

## Coverage check

| Phase | FRs closed | Count |
|---|---|---|
| 1 | NFR-1, NFR-5 | — |
| 2 | 10, 12–15, 27, 32, 40 | 7 |
| 3 | 20–26 | 7 |
| 4 | 1–7, 9, 11 | 9 |
| 5 | 34–39, 41 | 7 |
| 6 | 8, 17–19, 30, 31, 42 | 7 |
| 7 | (NFR-5 listing copy) | — |

P2 items not scheduled: FR-33 (encrypted sync), FR-27… covered, FR-26 snooze is in Phase 3 as P2 — cut first if time runs out.
