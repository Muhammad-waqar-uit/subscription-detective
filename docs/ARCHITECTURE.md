# Architecture

Design only — no code exists yet (2026-10-31). Each module below is a `⬜` row in [FOLDER_STRUCTURE.md](FOLDER_STRUCTURE.md).

## Stack

| Area | Choice | Why / caveat |
|---|---|---|
| Framework | Plasmo | Generates the MV3 manifest, hot reload, CSUI, BPP store publishing |
| Language | JavaScript ES2022 + JSX | Requirements fix JS; `lib/` is written so TS can be adopted later without a rewrite |
| UI | React (bundled by Plasmo) | Popup, options, content banner |
| Styling | Tailwind | One config, shared by all three surfaces |
| Storage | `@plasmohq/storage` over `chrome.storage.local` | Local-first; `sync` reserved for a future paid sync tier |
| Messaging | `@plasmohq/messaging` | Popup ↔ background, content → background |
| Scheduling | `chrome.alarms` | Only reliable MV3 timer — `setTimeout` dies with the worker |
| Notifications | `chrome.notifications` | Desktop reminder with an "open account page" button |
| Dates | `date-fns` | Renewal math without a moment-sized bundle |
| Payments | ExtensionPay **or** Stripe + backend | Undecided — see Open decisions |
| Tests | Vitest (unit), Playwright (e2e) | `lib/` is pure, so most coverage is cheap unit tests |

## Module map

```
popup/ ─┐                     lib/storage.js ── chrome.storage.local
options/┼─ lib/* (pure) ───── lib/schedule.js ─┐
        │                      lib/license.js   │
        └─ messaging ─────────► background/index.js ── chrome.alarms
                                    │                  chrome.notifications
                                    └── badge / onStartup reschedule
contents/detector.jsx ── lib/detect.js + lib/parse.js + rules/
                          └── CSUI banner ── user confirms ── save ── schedule
```

Hard rules:

- **`lib/` holds no React and no direct `chrome.*` calls** except `storage.js` (which wraps the API) — everything else receives data and returns data, which is what makes it unit-testable.
- **One mutation point.** Every create goes through `saveSubscription()` so the free-tier check can never be bypassed by a second code path (FR-34, FR-37).
- **Content script never writes to storage.** It detects, shows a banner, and sends a candidate to the background; the background/user path saves.

## Data flow

1. **Storage** — key `subscriptions` holds `Subscription[]` (§5.1), key `settings` holds §5.2. Schema version field (`schemaVersion: 1`) so migrations are possible.
2. **Detection** — `scorePage(document, url)` returns `{ name, price, currency, trialDays, confidence, evidence[] }` or `null`. Layered: rules → JSON-LD → price/date parsing → user confirmation (requirements §8). Never auto-saves.
3. **Scheduling** — on any save/status change: cancel existing alarms for that id, compute reminder times from `settings.reminderDaysBefore` and `nextChargeDate`, create one alarm per lead day (`sub:<id>:<days>`).
4. **Firing** — alarm → read record → skip if status is `cancelled`/`expired` → `notifications.create` → badge recount.
5. **Restart/update** — `onStartup` + `onInstalled` recompute every alarm from stored data, because alarms and worker state do not survive.
6. **Trial → paid** — when `nextChargeDate` passes and status is `trial`, flip to `active` and reschedule (only after the charge date; no charge verification in v1).

## Permissions

| Permission | Reason | Notes |
|---|---|---|
| `storage` | Subscriptions + settings | No sync scope in v1 |
| `alarms` | Renewal reminders | One per subscription per lead day |
| `notifications` | Reminder alerts | Must stay useful with the popup closed |
| Host access | Run the detector on signup pages | **Undecided:** `<all_urls>` vs optional host permission + `activeTab` (requirements §6) |

Minimum Chrome version and the host-permission decision go into the `manifest` block of `package.json`.

## Build output

`plasmo build` → `build/chrome-mv3-prod/` containing the generated `manifest.json`, `popup.html`, `options.html`, `contents/*.js`, `background.js` (service worker) and icons. `.plasmo/` is generated and gitignored; `build/` too. No remotely hosted code anywhere (NFR-1).

## Open decisions

| Decision | Options | Blocks | Default if nobody decides |
|---|---|---|---|
| Host permissions | `<all_urls>` vs optional + prompt | Phase 4 | Optional — safer for review, costs a click |
| Payments | ExtensionPay vs Stripe + backend | Phase 5 | ExtensionPay — no backend to run or secure |
| Pricing | monthly / yearly / lifetime | Phase 7 | — (needs a real number) |
| Sync | local-only vs paid encrypted sync | post-v1 | local-only (FR-33 is P2) |
