# Testing

Last updated: 2026-10-31 (second pass). **Automated layers are live and green; the manual matrix has not been run.**

## Commands

```bash
npm run lint              # eslint src tests --ext .js,.jsx      → 0 errors, 0 warnings
npm test                  # vitest run                          → 146 tests, 10 files
npm run build             # plasmo build → build/chrome-mv3-prod  → ~5 s
npm run test:e2e:smoke    # popup + options + alarms + filters    → 31 checks
npm run test:e2e:detect   # banner on served fixture pages        → 21 checks
npm run test:e2e          # both browser suites, in order
npm run test:all          # vitest → build → both browser suites
```

Order matters for the e2e runs: they load `build/chrome-mv3-prod/`, so a build must have run after the last `src/` change. `npm run test:all` does that for you.

## 1. Unit tests (Vitest) — `src/lib/`, `src/background/` ✅

Pure functions, no Chrome needed. **146 tests across 10 files, all passing.**

| File | Covers |
|---|---|
| `schedule.test.js` | weekly/monthly/yearly/custom cycles, Jan 31 → Feb, leap year, Dec 31 → Jan 31, past start dates, reminder lead days |
| `parse.test.js` | `$10`, `10 USD`, `€9,99`, `£5/mo`, "after 14 days", "renews on 12 Nov", "billed annually", JSON-LD offers |
| `detect.test.js` | keyword hit/miss, URL pattern hit, score below threshold → null, muted site short-circuits, site rules |
| `currency.test.js` | monthly/yearly normalisation across cycles, per-currency totals |
| `license.test.js` | free cap at 3, paid unlimited, expired/cancelled/deactivated → not paid |
| `subscription.test.js` | record creation, defaults, status transitions, next charge computation |
| `snooze.test.js` | end date stored, charge date untouched, invalid durations ignored, snoozed → awake boundary, Wake, badge label |
| `filters.test.js` | live vs concrete status, category, search over name/notes/URL, combined filters, empty/null input |
| `export.test.js` | CSV quoting (quotes, commas, embedded newlines), header, JSON round-trip, import validation messages, merge precedence |
| `alarms.test.js` | alarm name round-trip, free vs paid lead times, scheduling times, snooze suppression, clearing, badge counts, trial roll-forward — against a fake `chrome` API |

`alarms.test.js` is the important new one: it stubs `chrome.alarms` and `chrome.action` with `vi.stubGlobal`, so the scheduler's decisions (how many alarms, at what time, for which records) are asserted without a browser.

## 2. E2E — popup and options (`tests/e2e/smoke.mjs`) ✅

Launches Chromium (Playwright's bundled build — Chrome itself has removed the `--load-extension` flags) with the extension, then drives the real popup and options page.

| Check | Expected | Result |
|---|---|---|
| Service worker starts | background worker registers | ✅ |
| Extension id resolved | valid 32-char id | ✅ |
| Popup renders / empty state | "Subscription Detective", "Nothing tracked yet" | ✅ |
| Manual add (FR-10) | row appears, summary updates | ✅ |
| Persistence (FR-27) | record in `chrome.storage.local` | ✅ `count=1` |
| Next charge date (FR-12) | computed from start + cycle | ✅ `2026-11-30` |
| Status default (FR-13) | `active` | ✅ |
| Reminder alarm (FR-20) | one alarm for a free user | ✅ `sd:reminder:<id>:1` |
| Free lead time (FR-35) | nearest lead only | ✅ |
| Free cap (FR-34) | 3 accepted, 4th refused | ✅ `count=3` |
| Upgrade prompt (FR-37) | replaces the add button, records still listed | ✅ |
| Search filter (FR-19) | "Canva" hides the other records | ✅ |
| Empty result state | "No records match" + Clear | ✅ |
| Status chip (FR-19) | "Cancelled" hides everything, "All" restores | ✅ |
| Snooze (FR-26) | `snoozedUntil` stored, card labelled, that record's alarms gone | ✅ |
| Wake (FR-26) | field removed, reminders rescheduled | ✅ |
| Paid plan (FR-35/36) | switch to paid → 6 alarms for 3 records incl. `:3` | ✅ |
| Page errors | none on popup or options | ✅ |

## 3. E2E — detection (`tests/e2e/detection.mjs`) ✅

Serves `tests/fixtures/` over `http://127.0.0.1:<port>` (a content script does not run on `file://` without an explicit grant) and loads the extension against it.

| Check | Expected | Result |
|---|---|---|
| `about.html` | no banner, page still renders | ✅ |
| `signup.html` | banner appears | ✅ |
| Prefill (FR-6) | `Acme Analytics`, `USD 12`, monthly, `14-day trial detected` | ✅ |
| Save (FR-5/7) | one record, `price 12`, `status trial`, `trialEndDate` exactly +14 days, `detectedAutomatically true` | ✅ |
| Reload | banner offers itself again (not a duplicate until confirmed) | ✅ |
| Mute (FR-11) | `mutedSites` gains `127.0.0.1`, banner gone | ✅ |
| Mute persists | still absent after reload, record untouched | ✅ |
| Page errors | none | ✅ |

**Watch out:** the banner lives in a **shadow root**, so `page.locator("plasmo-csui").innerText()` returns an empty string. Read `host.shadowRoot.textContent`, or use Playwright text locators, which pierce open shadow roots.

**Watch out:** `@plasmohq/storage` JSON-serialises values, so `chrome.storage.local.get("subscriptions")` returns a **string**. Decode it before asserting — a raw `.length` is the string length (this once produced a convincing fake failure of "393 records").

Not yet covered by e2e: edit, delete, status change, badge, notification delivery, restart reschedule, export/import through the file picker, inline edit in the banner.

## 4. Manual matrix (Phase 6) ⬜

Nothing in this table has been run yet.

| # | Check | Expected | Result |
|---|---|---|---|
| 1 | Clean profile, install unpacked | Popup opens, empty state explains what to do | ⬜ |
| 2 | Add a trial, close Chrome, reopen | Reminder still scheduled | ⬜ |
| 3 | Notification click | Opens the service's account page | ⬜ |
| 4 | Badge count | Matches charges within 7 days, clears at zero | ⬜ (unit-tested) |
| 5 | 5 real signup pages | Banner appears, name/price prefilled | ⬜ |
| 6 | A page with no billing content | No banner, no console errors | ⬜ (automated ✅) |
| 7 | Mute a site, revisit | No banner on that site | ⬜ (automated ✅) |
| 8 | Export then import | Round-trip loses nothing | ⬜ |
| 9 | Delete all data | Storage empty, popup back to empty state | ⬜ |
| 10 | Free tier limit | Prompt appears, nothing lost | ⬜ (automated ✅) |
| 11 | Licence offline | Paid state resolves from cache with network off | ⏸ no provider yet |
| 12 | Keyboard-only | Every control reachable, focus visible, dialogs trap and return focus | ⬜ |
| 13 | Contrast + zoom 200% | Readable, no clipped text | ⬜ |
| 14 | Performance | Content script <50 ms added load (devtools performance) | ⬜ |
| 15 | Edge and Brave | Installs and runs unchanged (NFR-8) | ⬜ |

## 5. Release gate

A phase may only move to ✅ in [PROGRESS.md](PROGRESS.md) when:

1. `npm run lint`, `npm test`, `npm run build` are clean,
2. the phase's exit criteria in [PLAN.md](PLAN.md) are demonstrably met,
3. the FR rows in [FEATURES.md](FEATURES.md) are flipped with the evidence noted.

The rule for evidence is the same everywhere: `command → result`, or `page → expected vs seen`.
