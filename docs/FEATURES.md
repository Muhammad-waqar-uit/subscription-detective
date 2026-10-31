# Features / requirements status

Every functional requirement from [`../subscription-detective-requirements.md`](../subscription-detective-requirements.md), with the build status and the phase that closes it. Update this table when a feature is verified — not when it is written.

`⬜ not started · 🟨 in progress · ✅ done & verified · ⏸ blocked`

Last updated: 2026-10-31 — **0 / 42 done** (nothing built yet).

## Detection (Phase 4)

| ID | Requirement | Pri | Phase | Status |
|---|---|---|---|---|
| FR-1 | Content script runs on visited pages and looks for trial/subscription signs | P0 | 4 | ⬜ |
| FR-2 | Keyword detection ("free trial", "billed monthly", "cancel anytime", …) | P0 | 4 | ⬜ |
| FR-3 | Checkout/billing URL and text patterns (`/checkout`, `/billing`, `/plans`) | P0 | 4 | ⬜ |
| FR-4 | Trial/subscribe button clicks count as signup events | P0 | 4 | ⬜ |
| FR-5 | In-page banner: "Track this subscription?" Confirm / Dismiss | P0 | 4 | ⬜ |
| FR-6 | Prefill service name, price, cycle, trial end from the page | P0 | 4 | ⬜ |
| FR-7 | Every prefilled field is editable before saving | P0 | 4 | ⬜ |
| FR-8 | Detect "Manage subscription" pages and offer to log/update | P1 | 6 | ⬜ |
| FR-9 | Per-site detection rules in a data file, updatable without touching logic | P1 | 4 | ⬜ |
| FR-10 | Manual add from the popup | P0 | 2 | ⬜ |
| FR-11 | Mute detection for a specific site | P1 | 4 | ⬜ |

## Subscription management (Phase 2)

| ID | Requirement | Pri | Phase | Status |
|---|---|---|---|---|
| FR-12 | Record fields: id, name, url, accounts, price, currency, cycle, dates, category, notes, status | P0 | 2 | ⬜ |
| FR-13 | Status values `trial`, `active`, `cancelled`, `expired` | P0 | 2 | ⬜ |
| FR-14 | Popup lists all subscriptions sorted by next charge date | P0 | 2 | ⬜ |
| FR-15 | Edit, delete, change status | P0 | 2 | ⬜ |
| FR-16 | Mark trial as converted or cancelled | P0 | 2 | ⬜ |
| FR-17 | Total monthly and yearly spend across active subscriptions | P1 | 6 | ⬜ |
| FR-18 | Link to the service's account page for quick cancellation | P1 | 6 | ⬜ |
| FR-19 | Filter by status and category | P2 | 6 | ⬜ |

## Reminders (Phase 3)

| ID | Requirement | Pri | Phase | Status |
|---|---|---|---|---|
| FR-20 | Reminders scheduled with `chrome.alarms` | P0 | 3 | ⬜ |
| FR-21 | Default reminders 3 days and 1 day before | P0 | 3 | ⬜ |
| FR-22 | Configurable lead times | P1 | 3 | ⬜ |
| FR-23 | Desktop notification with a button to the account page | P0 | 3 | ⬜ |
| FR-24 | Badge shows charges due within 7 days | P1 | 3 | ⬜ |
| FR-25 | Reschedule on browser restart and extension update | P0 | 3 | ⬜ |
| FR-26 | Snooze a reminder one day | P2 | 3 | ⬜ |

## Data and privacy

| ID | Requirement | Pri | Phase | Status |
|---|---|---|---|---|
| FR-27 | All data in `chrome.storage.local` | P0 | 2 | ⬜ |
| FR-28 | Free tier sends nothing to a server | P0 | 2 | ⬜ |
| FR-29 | No analytics containing page content, URLs or subscription data | P0 | 6 | ⬜ |
| FR-30 | Export all data as JSON and CSV | P1 | 6 | ⬜ |
| FR-31 | Import a previously exported JSON | P1 | 6 | ⬜ |
| FR-32 | Delete all data from settings | P0 | 2 | ⬜ |
| FR-33 | Optional encrypted cloud sync as a paid feature (later) | P2 | post-v1 | ⬜ |

## Freemium and licensing (Phase 5)

| ID | Requirement | Pri | Phase | Status |
|---|---|---|---|---|
| FR-34 | Free tier tracks up to 3 active subscriptions/trials | P0 | 5 | ⬜ |
| FR-35 | Free tier includes one reminder before each charge | P0 | 5 | ⬜ |
| FR-36 | Paid: unlimited records, multiple reminders, spend summaries, export | P0 | 5 | ⬜ |
| FR-37 | At the limit: upgrade prompt, existing records still viewable/editable | P0 | 5 | ⬜ |
| FR-38 | License checked on startup, cached locally, works offline | P0 | 5 | ⬜ |
| FR-39 | Pricing: monthly, yearly, lifetime | P1 | 5/7 | ⬜ |

## Settings

| ID | Requirement | Pri | Phase | Status |
|---|---|---|---|---|
| FR-40 | Options: default currency, reminder timing, notifications on/off, detection on/off | P0 | 2 | ⬜ |
| FR-41 | Options: license status + upgrade/manage | P0 | 5 | ⬜ |
| FR-42 | Options: list and remove muted sites | P1 | 6 | ⬜ |

## Non-functional

| ID | Requirement | Phase | Status |
|---|---|---|---|
| NFR-1 | MV3 compliant, no remote code, no background page | 1 | ⬜ |
| NFR-2 | Content script <50 ms added load, runs when idle | 4 | ⬜ |
| NFR-3 | Service worker idle when nothing fires | 2/3 | ⬜ |
| NFR-4 | Page text processed locally only | 4 | ⬜ |
| NFR-5 | Minimum permissions, each justified in the listing | 1 | ⬜ |
| NFR-6 | Popup/options keyboard navigable, labelled, contrast-safe | 6 | ⬜ |
| NFR-7 | Detection failures never break the host page | 4 | ⬜ |
| NFR-8 | Latest two Chrome majors; Edge/Brave unchanged | 6 | ⬜ |
| NFR-9 | Strings ready for translation, English only | 6 | ⬜ |
| NFR-10 | Escape page-derived text, strict CSP | 4 | ⬜ |

## Cut list (if time runs short)

In this order: FR-26 (snooze) → FR-19 (filters) → FR-8 (manage-page detection) → FR-24 (badge) → FR-33 (sync, already post-v1). Never cut a P0.
