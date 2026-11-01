# Architecture

Written as design first; updated 2026-10-31 once the code existed, so the module map and the decisions below reflect what is actually in `src/`.

Re-checked 2026-11-01 against the tree on disk — no `src/` change since, so the module map and the decisions table are still accurate.

## Stack

| Area | Choice | Why / caveat |
|---|---|---|
| Framework | Plasmo 0.90 | Generates the MV3 manifest, CSUI, hot reload, BPP store publishing |
| Language | JavaScript ES2022 + JSX | Requirements fix JS; `lib/` is written so TS can be adopted later |
| UI | React **18.3.1** (pinned) | `latest` now resolves to React 19, which Plasmo 0.90 was not validated against |
| Styling | Tailwind **3.4.17** (pinned) | Tailwind v4 drops `tailwind.config.js` and the `tailwindcss` PostCSS plugin; the classic setup is pinned deliberately |
| Storage | `@plasmohq/storage` over `chrome.storage.local` | Local-first. Values are **JSON-serialised** — see the caveat below |
| Messaging | `chrome.runtime.sendMessage` + `onMessage` | `@plasmohq/messaging` is installed for the future; the current router is the plain API (one less layer to debug) |
| Scheduling | `chrome.alarms` | Only reliable MV3 timer — `setTimeout` dies with the worker |
| Notifications | `chrome.notifications` | Desktop reminder with an "open account" button |
| Dates | `date-fns` | Renewal maths without a moment-sized bundle |
| Payments | — not wired | See open decisions |
| Tests | Vitest (unit), Playwright (e2e, bundled Chromium) | `lib/` is pure, so most coverage is cheap unit tests; the browser suites cover popup/options and detection separately |

## Module map

```
popup/index.jsx ─┐   lib/storage.js ── chrome.storage.local
                 ├─  lib/schedule.js, currency.js, subscription.js
options/index.jsx┘   lib/license.js, filters.js, snooze.js, export.js   (all pure)
                 └─ sendMessage ─────► background/index.js ── chrome.alarms
                                            │                  chrome.notifications
                                            └── badge / onStartup reschedule
contents/detector.jsx ── lib/detect.js + lib/parse.js + lib/rules/*
                          └── CSUI banner ── confirm ── SAVE_DETECTED ── background
                                          └── mute ───── MUTE_SITE ───── settings.mutedSites
```

Hard rules, all respected in the current code:

- **`lib/` holds no React and no direct `chrome.*` calls** except `storage.js`, which wraps the API. Everything else takes data and returns data — that is what makes 146 unit tests possible without a browser.
- **The background is the enforcement point.** The popup also checks the cap so the UI can explain itself, but `SAVE_DETECTED` is rejected there, so a second code path cannot bypass the free limit.
- **The content script never writes storage.** It detects, shows a banner, and sends a candidate to the background.

## Data flow

1. **Storage** — key `subscriptions` holds `Subscription[]` (§5.1), key `settings` holds §5.2 (default currency, reminder days, notifications on/off, detection on/off). `@plasmohq/storage` writes each value as a **JSON string** into `chrome.storage.local`; anything reading the raw API (tests, debugging, future migrations) must `JSON.parse` it.
2. **Detection** — `detectCandidate(document, url, mutedSites)` returns `{ name, price, currency, trialDays, confidence, evidence[] }` or `null`. Layered: site rules → keywords → URL patterns → price/date parsing → user confirmation (§8). Never auto-saves.
3. **Scheduling** — on any save or status change: cancel every reminder alarm, recompute from `settings.reminderDaysBefore` and `nextChargeDate`, and create one alarm per lead day named `sd:reminder:<id>:<days>`. A free licence schedules only the nearest lead (FR-36); a paid licence schedules all of them. Snoozed records (FR-26) are skipped entirely.
4. **Firing** — alarm → read record → skip unless status is live (`trial`/`active`), not reminder-disabled and not snoozed → `chrome.notifications.create` with an account button → badge recount. The badge ignores snoozed records too, so a snooze means quiet everywhere.
5. **Restart/update** — `onStartup` and `onInstalled` rebuild every alarm from stored data, because alarms and worker state do not survive.
6. **Trial → paid** — when the charge date passes and status is `trial`, `rollForward` flips it to `active` and reschedules. There is no charge verification in v1.

## Permissions

| Permission | Reason | Notes |
|---|---|---|
| `storage` | Subscriptions + settings | No `sync` scope in v1 |
| `alarms` | Renewal reminders | One per subscription per lead day |
| `notifications` | Reminder alerts | Must stay useful with the popup closed |
| Host access | Run the detector on signup pages | **Current build:** static content script on `<all_urls>`, no `host_permissions` key. Consequence: the install prompt warns about reading data on all sites. Revisit before store submission |

`minimum_chrome_version: 116`, set in the `manifest` block of `package.json`.

## Notification icon

Plasmo emits **hashed** icon filenames (`icon128.plasmo.<hash>.png`), so a hardcoded path breaks on the next build. The background resolves it at runtime:

```js
const icons = chrome.runtime.getManifest().icons ?? {}
const path = icons[128] ?? icons[48] ?? Object.values(icons)[0]
```

## Build output

`plasmo build` → `build/chrome-mv3-prod/`:

```
manifest.json                      popup.html          popup.<hash>.js
detector.<hash>.js                 options.html        popup.<hash>.css   (shared by both pages)
static/background/index.js         icon16/32/48/64/128.plasmo.<hash>.png
```

`.plasmo/` and `build/` are generated and gitignored. No remotely hosted code anywhere (NFR-1).

## Decisions and why

| Decision | Reason |
|---|---|
| Folder-form entries (`popup/index.jsx`) | Verified supported by a real build; keeps each surface's files together |
| No `manifest.action` override in `package.json` | It **replaces** Plasmo's generated action object and silently removes `default_popup` — the popup vanished from the build until this was removed |
| `tsconfig.json` with `allowJs` | Plasmo refuses to build without a tsconfig, even for a JS project |
| Detection rules in `src/lib/rules/`, not `src/contents/` | Every file in `contents/` becomes a content-script entry |
| Banner uses inline styles | CSUI renders inside a shadow root, so the popup's Tailwind stylesheet does not apply |
| React 18 / Tailwind 3 pinned | v19 / v4 are incompatible with this Plasmo version and PostCSS config respectively |
| Free cap checked in popup **and** background | Single visible enforcement point (background) plus a UI that can explain the limit |
| Snooze is a field, not a status | `snoozedUntil` silences reminders while the record still reads `trial`/`active`, so spend totals and charge dates stay true |
| Filters/search are pure functions (`lib/filters.js`) | Keeps the popup a view and lets the filter rules be unit-tested |

## Open decisions

| Decision | Options | Blocks | Current behaviour |
|---|---|---|---|
| Host permissions | `<all_urls>` vs optional + prompt | Store submission | `<all_urls>` |
| Payments | ExtensionPay vs Stripe + backend | Phase 5 completion | None; `license.js` reads a locally stored object |
| Pricing | monthly / yearly / lifetime | Phase 7 | — |
| Sync | local-only vs paid encrypted sync | post-v1 | local-only (FR-33 is P2) |
