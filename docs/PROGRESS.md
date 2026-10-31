# Progress

Last updated: 2026-10-31

## Current state

**The extension is built, loads in Chromium, and behaves correctly in the paths that are automated.** `npx plasmo build` produces a loadable `build/chrome-mv3-prod/`, 91 unit tests pass, and a Playwright smoke test loads the real extension and drives the popup.

What is **not** verified yet: notifications actually appearing on screen, detection against live signup pages, export/import round-trip, accessibility, content-script load budget, and anything paid (no payment provider is wired).

| Check | Result |
|---|---|
| `npx vitest run` | ✅ 6 files, **91 tests passed** (2.4 s) |
| `npx plasmo build` | ✅ DONE ~5 s → `build/chrome-mv3-prod/` |
| `node tests/e2e/smoke.mjs` | ✅ **19/19 checks passed** in a real Chromium with the extension loaded |
| `git log` | ✅ repo initialised, first commit `e55be73` |

## Phase status

| # | Phase | Status | Evidence | What is left |
|---|-------|--------|----------|--------------|
| 0 | Documentation & structure | ✅ Done | 9 docs, folder tree, brand assets | — |
| 1 | Setup | ✅ Done | deps installed, `package.json` scripts + manifest overrides, Tailwind, ESLint/Prettier, `tsconfig.json` (Plasmo requires one even for JS), `.gitignore`, `git init` + first commit, build succeeds | CI workflow (needs a remote), `lint`/`format` never run yet |
| 2 | Core storage & UI | 🟨 Mostly done | `storage.js`, `schedule.js`, `currency.js`, `subscription.js`; popup list/add/edit/delete/status; options shell. Add + persist + sorted list **verified in browser** | Edit, delete and status change are implemented but not exercised in the smoke test; persistence across a real Chrome restart not checked |
| 3 | Reminders | 🟨 Mostly done | `background/alarms.js` + `index.js`: alarms per (record, lead day), notifications, badge, `onStartup`/`onInstalled` reschedule. Alarms with 3-day and 1-day leads **verified in browser** | A notification firing on screen, badge count, restart reschedule and snooze (FR-26, not implemented) |
| 4 | Detection MVP | 🟨 Implemented, unverified live | 25 site rules, keyword + URL scoring, price/cycle/trial parsing, JSON-LD, click listener, throttled MutationObserver, CSUI banner with prefill/mute | Detection accuracy on real signup pages (needs the manual matrix), banner never seen rendered |
| 5 | Freemium | 🟨 Partial | `license.js` gate used by popup **and** background; cap of 3 **verified in browser**; license status shown in options | No payment provider, so "paid" can only be faked locally; reminder/export tiering not gated |
| 6 | Polish & QA | 🟨 Partial | Export JSON/CSV, import JSON, spend totals, account links, delete-all, muted-sites list all written | Export/import never run, no a11y pass, no filters (FR-19), no localization |
| 7 | Launch | ⬜ Not started | — | Store assets, privacy policy, pricing, submission |

## Requirements coverage

From [FEATURES.md](FEATURES.md): **18 of 42 functional requirements done and verified**, 20 implemented but still unverified, 4 not implemented (FR-19 filters, FR-26 snooze, FR-33 sync/post-v1, FR-39 pricing).

## Verification log

`command → result`, newest first.

| Date | Check | Result |
|---|---|---|
| 2026-10-31 | `node tests/e2e/smoke.mjs` | ✅ 19/19 — SW starts, popup/options render with zero page errors, add persists (`nextChargeDate 2026-11-30`), two alarms `sd:reminder:<id>:3` and `:1` created, 4th record blocked with the upgrade prompt, options reports `3 record(s) · limit 3` |
| 2026-10-31 | `npx plasmo build` → inspect `manifest.json` | ✅ `manifest_version 3`, `permissions [storage, alarms, notifications]`, `default_popup popup.html`, `options_ui options.html`, SW `static/background/index.js`, content script `<all_urls>`, 5 icon sizes, `minimum_chrome_version 116`, no `host_permissions` key |
| 2026-10-31 | `npx vitest run` | ✅ 6 files / 91 tests |
| 2026-10-31 | `git init` + `git add -A` | ✅ 50 files staged; `node_modules/`, `build/`, `.plasmo/` correctly ignored |
| 2026-10-31 | Plasmo `src/` + folder-form entry (`popup/index.jsx`) | ✅ Confirmed by build — both `src/popup/index.jsx` and `src/options/index.jsx` became pages |
| 2026-10-31 | Tailwind + React versions | ✅ Pinned React 18.3.1 and Tailwind 3.4.17 after `latest` resolved to React 19 / Tailwind v4, which this config does not support |
| 2026-10-31 | Brand icon rasterised | ✅ `assets/icon.png` verified 512×512, 23 KB, valid PNG signature |

## Bugs found and fixed while building

| Symptom | Cause | Fix |
|---|---|---|
| Popup missing from the build entirely (no `popup.html`, no `default_popup`) | A custom `manifest.action` block in `package.json` **replaced** Plasmo's generated action object, dropping `default_popup` | Removed the `action` override; kept permissions and version overrides only |
| `PLASMO ERROR: ENOENT tsconfig.json` | Plasmo expects a TypeScript config even for a JS project | Added `tsconfig.json` extending `plasmo/templates/tsconfig.base` with `allowJs: true` |
| Notifications could not find an icon | Plasmo emits hashed icon names (`icon128.plasmo.<hash>.png`), so a hardcoded `icon128.png` breaks on every rebuild | `iconUrl()` now reads `chrome.runtime.getManifest().icons` and falls back through 48/any |
| Unit tests saw prices as `undefined` | `parse.js` regex strings used single backslashes, which JS collapses | `String.raw` for the amount pattern; also fixed capture-group order in `parsePrice` |
| Alarm target parsed as `undefined` | `parseAlarmName` assumed a different segment order | Rewritten against the `sd:reminder:<id>:<days>` format and covered by tests |
| Smoke test read storage as an array and failed | `@plasmohq/storage` **JSON-serialises** values, so `chrome.storage.local` holds a string (`length` was string length) | Test decodes the JSON before asserting; app code was already correct |

## History

- **2026-10-31** — Requirements reviewed (v0.1). Stack fixed: Plasmo + JS/JSX + React, `@plasmohq/storage` / `@plasmohq/messaging`, `chrome.alarms` + `chrome.notifications`, date-fns, Vitest. Folder tree + 9 docs written.
- **2026-10-31** — Full build: pure logic layer with 91 unit tests, background worker (alarms, notifications, badge, message router), popup, options, content-script detector. Build verified, then a browser smoke test added and passing.
- **2026-10-31** — Repo initialised and committed; docs re-marked against the verified state above.

## Blocked / needs a decision

1. **Host permissions** — the shipped build uses a static content script on `<all_urls>` with no `host_permissions` key. That triggers Chrome's "read and change all your data on websites you visit" warning at install. The alternative (optional host permission + `activeTab`) needs a permission-request flow in the popup. Decide before store submission.
2. **Payment provider** (blocks Phase 5 completion): ExtensionPay vs Stripe + backend. `license.js` currently trusts a locally stored `license` object, so a paid state can be set by hand for testing.
3. **Pricing** (blocks Phase 7).
