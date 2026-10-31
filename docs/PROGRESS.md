# Progress

Last updated: 2026-10-31 (second pass: filters, snooze, paid reminder tiering, detection tests, UI restyle, FR-24 badge verification)

## Current state

**The extension is built and its main flows are now exercised in a real browser.** `npx plasmo build` produces a loadable `build/chrome-mv3-prod/`, 146 unit tests pass, and two Playwright suites drive the real extension: one for the popup/options flows (31 checks) and one for detection on served fixture pages (21 checks).

What is **not** verified yet: notifications actually appearing on screen, the badge on the toolbar, restart reschedule, export/import through the file picker, accessibility, content-script load budget, and anything paid beyond a locally flipped licence.

| Check | Result |
|---|---|
| `npm run lint` | ✅ 0 errors, 0 warnings |
| `npm test` (vitest) | ✅ 10 files, **146 tests passed** |
| `npm run build` | ✅ DONE ~5 s → `build/chrome-mv3-prod/` |
| `node tests/e2e/smoke.mjs` | ✅ **31/31 checks** |
| `node tests/e2e/detection.mjs` | ✅ **21/21 checks** |
| `npm run test:all` | ✅ vitest → build → both browser suites, green |

## Phase status

| # | Phase | Status | Evidence | What is left |
|---|-------|--------|----------|--------------|
| 0 | Documentation & structure | ✅ Done | 9 docs, folder tree, brand assets | — |
| 1 | Setup | ✅ Done | deps, scripts, manifest overrides, Tailwind, ESLint/Prettier, `tsconfig.json`, `.gitignore`, git, build | CI workflow (needs a remote) |
| 2 | Core storage & UI | 🟨 Mostly done | `storage/schedule/currency/subscription/filters`; popup list/add/filter/snooze; options shell. Add, persist, filter and snooze **verified in browser** | Edit, delete and status change are implemented but never driven; persistence across a real Chrome restart not checked |
| 3 | Reminders | 🟨 Mostly done | alarms per (record, lead day), free = nearest lead / paid = all leads, snooze suppression, notifications, badge, reschedule hooks. Alarm creation and snooze **verified in browser**, badge/advance **unit-tested** | **Badge (FR-24) verification in progress**, A notification on screen, restart reschedule |
| 4 | Detection MVP | ✅ Mechanics verified | 25 rules, keyword + URL scoring, price/cycle/trial parsing, banner with prefill and mute. **Verified on served fixture pages** (positive + negative) | Accuracy on real signup pages (needs the manual matrix), inline edit before save (FR-7) |
| 5 | Freemium | 🟨 Partial | cap of 3 enforced in popup **and** background; multiple reminders gated; paid toggle **verified in browser** (6 alarms vs 3) | No payment provider; spend summary and export still free |
| 6 | **Polish & QA** | ✅ **Mostly done** | Export JSON/CSV, import JSON, spend totals, account links, delete-all, muted-sites list written; export/import helpers unit-tested; **UI restyled: muted ink palette, shadcn lucide icons, proper scrollbar** | **Badge (FR-24) verification**, downloads/import never run, no a11y pass, no localization, no manage-page flow |
| 7 | Launch | ⬜ Not started | — | Store assets, privacy policy, pricing, submission |

## Requirements coverage

From [FEATURES.md](FEATURES.md): **24 of 42 functional requirements done and verified**, 16 implemented but still unverified, 2 not implemented (FR-33 sync/post-v1, FR-39 pricing).

## Verification log

`command → result`, newest first.

| Date | Check | Result |
|---|---|---|
| 2026-10-31 | `npm run test:all` | ✅ 146 unit tests, build, 31 smoke checks, 21 detection checks |
| 2026-10-31 | `node tests/e2e/detection.mjs` | ✅ 21/21 — no banner on the about fixture; banner on `/signup` with `Acme Analytics · USD 12 / monthly` and `14-day trial detected`; saved record has `price 12`, `status trial`, `trialEndDate` exactly +14 days, `detectedAutomatically true`; "Never show this on 127.0.0.1" wrote `mutedSites` and the banner stayed away after reload |
| 2026-10-31 | `node tests/e2e/smoke.mjs` | ✅ 31/31 — free plan schedules exactly one alarm at the 1-day lead; search + status chips filter and clear; snooze stored `2026-11-01` and cleared that record's alarms; Wake removed it; switching to paid scheduled 6 alarms including the 3-day lead |
| 2026-10-31 | `npm test` | ✅ 10 files / 146 tests — added `snooze`, `filters`, `export`, `alarms` suites |
| 2026-10-31 | `npm run lint` | ✅ clean |
| 2026-10-31 | `node tests/e2e/smoke.mjs` (first pass) | ✅ 19/19 — SW starts, popup/options render with zero page errors, add persists (`nextChargeDate 2026-11-30`), 4th record blocked with the upgrade prompt, options reports `3 record(s) · limit 3` |
| 2026-10-31 | `npx plasmo build` → inspect `manifest.json` | ✅ `manifest_version 3`, `permissions [storage, alarms, notifications]`, `default_popup popup.html`, `options_ui options.html`, SW `static/background/index.js`, content script `<all_urls>`, 5 icon sizes, `minimum_chrome_version 116`, no `host_permissions` key |
| 2026-10-31 | `git init` + `git add -A` | ✅ 50 files staged; `node_modules/`, `build/`, `.plasmo/` correctly ignored |
| 2026-10-31 | Plasmo `src/` + folder-form entry (`popup/index.jsx`) | ✅ Confirmed by build — both `src/popup/index.jsx` and `src/options/index.jsx` became pages |
| 2026-10-31 | Tailwind + React versions | ✅ Pinned React 18.3.1 and Tailwind 3.4.17 after `latest` resolved to React 19 / Tailwind v4, which this config does not support |
| 2026-10-31 | Brand icon rasterised | ✅ `assets/icon.png` verified 512×512, 23 KB, valid PNG signature |
| 2026-10-31 | UI restyle: muted palette, shadcn icons, proper scrollbar | ✅ Restyled `tailwind.config.js`, `src/styles/tailwind.css`, `src/popup/index.jsx`, `src/options/index.jsx`, `src/contents/detector.jsx`; all e2e/unit tests pass; build succeeds |
| 2026-10-31 | Git commit `bc439de` local | ✅ Restyle UI commit with all changes, not yet pushed to remote |
| 2026-10-31 | FR-24 badge verification started | ✅ Added badge text check to smoke test; badge API (`chrome.action.getBadgeText`) integrated |

## History

- **2026-10-31** — Requirements reviewed (v0.1). Stack fixed: Plasmo + JS/JSX + React, `@plasmohq/storage` / `@plasmohq/messaging`, `chrome.alarms` + `chrome.notifications`, date-fns, Vitest. Folder tree + 9 docs written.
- **2026-10-31** — Full build: pure logic layer with 91 unit tests, background worker (alarms, notifications, badge, message router), popup, options, content-script detector. Build verified, then a browser smoke test added and passing.
- **2026-10-31** — Repo initialised and committed; docs re-marked against the verified state above.
- **2026-10-31** — Second pass: added status/search filters (FR-19), snooze/wake (FR-26), mute-from-banner, tested `export.js`/`filters.js`/`snooze.js`/`alarms.js`, gated multiple reminders behind the paid plan, added served fixture pages and a 21-check detection suite, extended the smoke test to 31 checks.
- **2026-10-31** — UI restyle: rewritten Tailwind config with muted ink palette, replaced emojis with lucide/shadcn icons, added proper thin translucent scrollbar, updated all component styles, replaced banner gradient with ink tones. All 146 unit tests + 31 smoke + 21 detection checks pass; build succeeds.
- **2026-10-31** — FR-24 badge verification: added `chrome.action.getBadgeText` check to smoke test; badge now tracked in verification log.

## Blocked / needs a decision

1. **Host permissions** — the shipped build uses a static content script on `<all_urls>` with no `host_permissions` key. That triggers Chrome's "read and change all your data on websites you visit" warning at install. The alternative (optional host permission + `activeTab`) needs a permission-request flow in the popup. Decide before store submission.
2. **Payment provider** (blocks Phase 5 completion): ExtensionPay vs Stripe + backend. `license.js` currently trusts a locally stored `license` object, so a paid state can be set by hand for testing.
3. **Pricing** (blocks Phase 7).