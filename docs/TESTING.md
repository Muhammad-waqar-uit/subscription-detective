# Testing

Last updated: 2026-10-31. **Automated layers are live and green; the manual matrix has not been run.**

## Commands

```bash
npm run lint       # eslint src tests --ext .js,.jsx        → 0 errors, 0 warnings
npm test           # vitest run                             → 91 tests, 6 files
npm run build      # plasmo build → build/chrome-mv3-prod   → ~5 s
npm run test:e2e   # playwright: loads the built extension   → 19/19 checks
```

Order matters for the e2e run: it loads `build/chrome-mv3-prod/`, so `npm run build` must have run after the last `src/` change.

## 1. Unit tests (Vitest) — `src/lib/` ✅

Pure functions, no Chrome needed. **91 tests across 6 files, all passing.**

| File | Covers |
|---|---|
| `schedule.test.js` | weekly/monthly/yearly/custom cycles, Jan 31 → Feb, leap year, Dec 31 → Jan 31, past start dates, reminder lead days |
| `parse.test.js` | `$10`, `10 USD`, `€9,99`, `£5/mo`, "after 14 days", "renews on 12 Nov", "billed annually", JSON-LD offers |
| `detect.test.js` | keyword hit/miss, URL pattern hit, score below threshold → null, muted site short-circuits, site rules |
| `currency.test.js` | monthly/yearly normalisation across cycles, per-currency totals |
| `license.test.js` | free cap at 3, paid unlimited, expired/cancelled/deactivated → not paid |
| `subscription.test.js` | record creation, defaults, status transitions, next charge computation |

## 2. E2E (Playwright, extension loaded) 🟨

`tests/e2e/smoke.mjs` launches Chromium (Playwright's bundled build — Chrome itself has removed the `--load-extension` flags) with the extension, then drives the real popup.

| Check | Expected | Result |
|---|---|---|
| Service worker starts | background worker registers | ✅ |
| Extension id resolved | valid 32-char id | ✅ |
| Popup renders | "Subscription Detective" | ✅ |
| Empty state | "Nothing tracked yet" | ✅ |
| Manual add (FR-10) | row appears, summary updates | ✅ |
| Persistence (FR-27) | record in `chrome.storage.local` | ✅ `count=1` |
| Next charge date (FR-12) | computed from start + cycle | ✅ `2026-11-30` |
| Status default (FR-13) | `active` | ✅ |
| Reminder alarms (FR-20/21) | alarms at 3 and 1 days | ✅ `sd:reminder:<id>:3`, `:1` |
| Free cap (FR-34) | 3 accepted | ✅ `count=3` |
| Upgrade prompt (FR-37) | replaces the add button, records still listed | ✅ |
| Popup page errors | none | ✅ |
| Options renders | settings page | ✅ |
| Options counts (FR-41) | "3 record(s) · limit 3" | ✅ |
| Options page errors | none | ✅ |

**Watch out:** `@plasmohq/storage` JSON-serialises values, so `chrome.storage.local.get("subscriptions")` returns a **string**. Decode it before asserting — a raw `.length` is the string length (this produced a convincing fake failure of "393 records").

Not yet covered by e2e: edit, delete, status change, badge, notification delivery, restart reschedule, export/import, banner on a fixture page.

Fixtures for the banner belong in `tests/e2e/fixtures/` as local HTML so detection is deterministic — never test against a live third-party site.

## 3. Manual matrix (Phase 6) ⬜

Nothing in this table has been run yet.

| # | Check | Expected | Result |
|---|---|---|---|
| 1 | Clean profile, install unpacked | Popup opens, empty state explains what to do | ⬜ |
| 2 | Add a trial, close Chrome, reopen | Reminder still scheduled | ⬜ |
| 3 | Notification click | Opens the service's account page | ⬜ |
| 4 | Badge count | Matches charges within 7 days, clears at zero | ⬜ |
| 5 | 5 real signup pages | Banner appears, name/price prefilled, editable | ⬜ |
| 6 | A page with no billing content | No banner, no console errors | ⬜ |
| 7 | Mute a site, revisit | No banner on that site | ⬜ |
| 8 | Delete all data | Storage empty, popup back to empty state | ⬜ |
| 9 | Free tier limit | Prompt appears, nothing lost | ⬜ (automated ✅) |
| 10 | Licence offline | Paid state resolves from cache with network off | ⏸ no provider yet |
| 11 | Keyboard-only | Every control reachable, focus visible, dialogs trap and return focus | ⬜ |
| 12 | Contrast + zoom 200% | Readable, no clipped text | ⬜ |
| 13 | Performance | Content script <50 ms added load (devtools performance) | ⬜ |
| 14 | Edge and Brave | Installs and runs unchanged (NFR-8) | ⬜ |

## 4. Release gate

A phase may only move to ✅ in [PROGRESS.md](PROGRESS.md) when:

1. `npm run lint`, `npm test`, `npm run build` are clean,
2. the phase's exit criteria in [PLAN.md](PLAN.md) are demonstrably met,
3. the FR rows in [FEATURES.md](FEATURES.md) are flipped with the evidence noted.

The rule for evidence is the same everywhere: `command → result`, or `page → expected vs seen`.
