# Testing

Planned 2026-10-31 — nothing to run yet. Start using this in Phase 2; Phase 6 requires every row to have a recorded result.

## Commands (from Phase 1)

```bash
pnpm lint          # eslint
pnpm test          # vitest run — unit tests in tests/unit
pnpm test:e2e      # playwright — loads build/chrome-mv3-dev
pnpm build         # plasmo build
```

## 1. Unit tests (Vitest) — `src/lib/`

Pure functions, no Chrome needed. This is where the real coverage lives.

| Target | Cases that matter |
|---|---|
| `schedule.js` | weekly/monthly/yearly/custom; Jan 31 → Feb 28/29; Dec 31 → Jan 31; start date in the past; trial end == charge date |
| `parse.js` | `$10`, `10 USD`, `€9,99`, `£5/mo`, "after 14 days", "renews on 12 Nov", "billed annually", JSON-LD offers block |
| `detect.js` | keyword hit / miss, URL pattern hit, score below threshold returns null, muted site short-circuits |
| `license.js` | free cap at 3, paid unlimited, expired license → read-only, missing license → free |
| `currency.js` | toMonthly across cycles, mixed currencies are not summed silently |

## 2. E2E (Playwright, extension loaded)

| Flow | Steps | Expected |
|---|---|---|
| Manual add | popup → Add → fill → save | Row appears, sorted by next charge date |
| Persistence | add → reload extension | Record still listed |
| Reminder | create a record dated +3 days, wait for alarm | Exactly one notification, once |
| Restart | reload the extension | Alarms rebuilt, no duplicates |
| Free limit | add 4th record on free tier | Upgrade prompt, existing 3 still editable |
| Banner | visit a signup fixture page, click trial button | Banner appears, prefilled, Dismiss leaves no record |
| Export/import | export JSON → delete all → import | Same records, tags and dates restored |

Fixtures live in `tests/e2e/fixtures/` as local HTML so detection is deterministic — never test against a live third-party site.

## 3. Manual matrix (Phase 6)

| # | Check | Expected |
|---|---|---|
| 1 | Clean profile, install unpacked | Popup opens, empty state explains what to do |
| 2 | Add a trial, close Chrome, reopen | Reminder still scheduled |
| 3 | Notification click | Opens the service's account page |
| 4 | Badge count | Matches charges within 7 days, clears at zero |
| 5 | 5 real signup pages | Banner appears, name/price prefilled, editable |
| 6 | A page with no billing content | No banner, no console errors |
| 7 | Mute a site, revisit | No banner on that site |
| 8 | Delete all data | Storage empty, popup back to empty state |
| 9 | Free tier limit | Prompt appears, nothing lost |
| 10 | Licence offline | Paid state resolves from cache with network off |
| 11 | Keyboard-only | Every control reachable, focus visible, dialogs trap and return focus |
| 12 | Contrast + zoom 200% | Readable, no clipped text |
| 13 | Performance | Content script <50 ms added load (devtools performance) |
| 14 | Edge and Brave | Installs and runs unchanged (NFR-8) |

## 4. Release gate

A phase may only move to ✅ in [PROGRESS.md](PROGRESS.md) when:

1. `pnpm lint`, `pnpm test`, `pnpm build` are clean,
2. the phase's exit criteria in [PLAN.md](PLAN.md) are demonstrably met,
3. the FR rows in [FEATURES.md](FEATURES.md) are flipped with the evidence noted,

and the rule for evidence is the same everywhere: `command → result` or `page → expected vs seen`.
