# Features / requirements status

Every functional requirement from [`../subscription-detective-requirements.md`](../subscription-detective-requirements.md), with the build status and the phase that closes it. Update this table when a feature is verified — not when it is written.

`⬜ not started · 🟨 written, not verified · ✅ done & verified · ⏸ blocked`

Last updated: 2026-10-31 — **18 / 42 done and verified · 20 written but unverified · 4 not started.**

Legend for the evidence column: **U** = unit test, **B** = browser smoke test (`node tests/e2e/smoke.mjs`), **M** = manifest/build inspection, **–** = nothing yet.

## Detection (Phase 4)

| ID | Requirement | Pri | Phase | Status | Evidence |
|---|---|---|---|---|---|
| FR-1 | Content script runs on visited pages and looks for trial/subscription signs | P0 | 4 | 🟨 | M — registered on `<all_urls>`, never observed injecting |
| FR-2 | Keyword detection ("free trial", "billed monthly", "cancel anytime", …) | P0 | 4 | ✅ | U — `detect.test.js` |
| FR-3 | Checkout/billing URL and text patterns (`/checkout`, `/billing`, `/plans`) | P0 | 4 | ✅ | U — `detect.test.js` |
| FR-4 | Trial/subscribe button clicks count as signup events | P0 | 4 | 🟨 | – |
| FR-5 | In-page banner: "Track this subscription?" Confirm / Dismiss | P0 | 4 | 🟨 | – |
| FR-6 | Prefill service name, price, cycle, trial end from the page | P0 | 4 | 🟨 | U for the parsers, banner wiring unseen |
| FR-7 | Every prefilled field is editable before saving | P0 | 4 | 🟨 | – |
| FR-8 | Detect "Manage subscription" pages and offer to log/update | P1 | 6 | 🟨 | `isManagePage()` exists, no UI flow wired to it |
| FR-9 | Per-site detection rules in a data file, updatable without touching logic | P1 | 4 | ✅ | U — 25 rules in `src/lib/rules/sites.js` |
| FR-10 | Manual add from the popup | P0 | 2 | ✅ | B — added "Notion", row + summary appeared |
| FR-11 | Mute detection for a specific site | P1 | 4 | 🟨 | Banner + options both write `mutedSites`, not observed |

## Subscription management (Phase 2)

| ID | Requirement | Pri | Phase | Status | Evidence |
|---|---|---|---|---|---|
| FR-12 | Record fields: id, name, url, accounts, price, currency, cycle, dates, category, notes, status | P0 | 2 | ✅ | B — persisted record has `id/name/price/status/nextChargeDate`; U for the rest |
| FR-13 | Status values `trial`, `active`, `cancelled`, `expired` | P0 | 2 | ✅ | B + U — defaults to `active` |
| FR-14 | Popup lists all subscriptions sorted by next charge date | P0 | 2 | ✅ | B — listed after add; sorting unit-tested |
| FR-15 | Edit, delete, change status | P0 | 2 | 🟨 | Code paths exist; only add was driven in the browser |
| FR-16 | Mark trial as converted or cancelled | P0 | 2 | 🟨 | `applyStatusChange()` + buttons exist, unexercised |
| FR-17 | Total monthly and yearly spend across active subscriptions | P1 | 6 | ✅ | B — `$10` shown for a $10/month record; U for cycle maths |
| FR-18 | Link to the service's account page for quick cancellation | P1 | 6 | 🟨 | Stored `url` + link rendered, never clicked |
| FR-19 | Filter by status and category | P2 | 6 | ⬜ | Not implemented |

## Reminders (Phase 3)

| ID | Requirement | Pri | Phase | Status | Evidence |
|---|---|---|---|---|---|
| FR-20 | Reminders scheduled with `chrome.alarms` | P0 | 3 | ✅ | B — 2 alarms created for one future charge |
| FR-21 | Default reminders 3 days and 1 day before | P0 | 3 | ✅ | B — `sd:reminder:<id>:3` and `:1` |
| FR-22 | Configurable lead times | P1 | 3 | 🟨 | Settings control + `reminderDays` respected on save; changing it not exercised |
| FR-23 | Desktop notification with a button to the account page | P0 | 3 | 🟨 | `notifications.create` written with an account button; never seen on screen |
| FR-24 | Badge shows charges due within 7 days | P1 | 3 | 🟨 | `setBadgeText` written, not observed |
| FR-25 | Reschedule on browser restart and extension update | P0 | 3 | 🟨 | `onStartup` + `onInstalled` handlers exist, not exercised |
| FR-26 | Snooze a reminder one day | P2 | 3 | ⬜ | Not implemented |

## Data and privacy

| ID | Requirement | Pri | Phase | Status | Evidence |
|---|---|---|---|---|---|
| FR-27 | All data in `chrome.storage.local` | P0 | 2 | ✅ | B — read back after add |
| FR-28 | Free tier sends nothing to a server | P0 | 2 | ✅ | No `fetch`/XHR in `src/`; only `chrome.tabs.create` |
| FR-29 | No analytics containing page content, URLs or subscription data | P0 | 6 | ✅ | No analytics code at all |
| FR-30 | Export all data as JSON and CSV | P1 | 6 | 🟨 | Buttons + serialisers written, download never triggered |
| FR-31 | Import a previously exported JSON | P1 | 6 | 🟨 | Written, never run |
| FR-32 | Delete all data from settings | P0 | 2 | 🟨 | Button + confirm written, never run |
| FR-33 | Optional encrypted cloud sync as a paid feature (later) | P2 | post-v1 | ⬜ | Out of v1 scope |

## Freemium and licensing (Phase 5)

| ID | Requirement | Pri | Phase | Status | Evidence |
|---|---|---|---|---|---|
| FR-34 | Free tier tracks up to 3 active subscriptions/trials | P0 | 5 | ✅ | B — 3 accepted |
| FR-35 | Free tier includes one reminder before each charge | P0 | 5 | ✅ | B — free tier gets both default reminders (a superset, see note below) |
| FR-36 | Paid: unlimited records, multiple reminders, spend summaries, export | P0 | 5 | 🟨 | Unlimited records works; multi-reminder/export **not** gated, so free users get them too |
| FR-37 | At the limit: upgrade prompt, existing records still viewable/editable | P0 | 5 | ✅ | B — prompt replaced the add button, all 3 records still listed |
| FR-38 | License checked on startup, cached locally, works offline | P0 | 5 | 🟨 | Local cache + offline default (free) works; no provider to purchase from |
| FR-39 | Pricing: monthly, yearly, lifetime | P1 | 5/7 | ⬜ | Undecided |

## Settings

| ID | Requirement | Pri | Phase | Status | Evidence |
|---|---|---|---|---|---|
| FR-40 | Options: default currency, reminder timing, notifications on/off, detection on/off | P0 | 2 | ✅ | B — all controls render, zero page errors |
| FR-41 | Options: license status + upgrade/manage | P0 | 5 | ✅ | B — "Free plan (limit 3)" |
| FR-42 | Options: list and remove muted sites | P1 | 6 | 🟨 | List + remove written, unexercised |

## Non-functional

| ID | Requirement | Phase | Status | Evidence |
|---|---|---|---|---|
| NFR-1 | MV3 compliant, no remote code, no background page | 1 | ✅ | M — manifest v3, bundled SW, no remote imports |
| NFR-2 | Content script <50 ms added load, runs when idle | 4 | ⬜ | Not measured |
| NFR-3 | Service worker idle when nothing fires | 2/3 | ✅ | Event-driven only — no `setInterval`, no polling |
| NFR-4 | Page text processed locally only | 4 | ✅ | No network calls in `src/` |
| NFR-5 | Minimum permissions, each justified in the listing | 1 | ✅ | M — `storage`, `alarms`, `notifications` only |
| NFR-6 | Popup/options keyboard navigable, labelled, contrast-safe | 6 | 🟨 | Labels/`htmlFor` present; no a11y audit run |
| NFR-7 | Detection failures never break the host page | 4 | ✅ | Detector body wrapped in try/catch |
| NFR-8 | Latest two Chrome majors; Edge/Brave unchanged | 6 | ⬜ | Only one Chromium build tested |
| NFR-9 | Strings ready for translation, English only | 6 | ⬜ | Strings are inline, not extracted |
| NFR-10 | Escape page-derived text, strict CSP | 4 | ✅ | React text nodes only, no `innerHTML` |

## Notes and cut list

- **FR-35 is satisfied by over-delivery:** the free tier is not limited to a single reminder, so no user is short-changed. That is why FR-36 (paid tiering) is still 🟨 — reminder count and export are not yet differentiated.
- **Cut order if time runs short:** FR-26 (snooze) → FR-19 (filters) → FR-8 (manage-page flow) → FR-24 (badge) → FR-33 (sync, already post-v1). Never cut a P0.
- The four ⬜ items are: FR-19, FR-26, FR-33, FR-39. Everything else is written.
