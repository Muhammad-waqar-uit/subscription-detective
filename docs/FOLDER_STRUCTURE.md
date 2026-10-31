# Folder structure

Created 2026-10-31. Folders exist; source files are added phase by phase (see [TODO.md](TODO.md)).

Project root = this directory. It is **not** a git repo yet (TODO P1-2).

## Tree

```
subscription-detective/          # project root
├── subscription-detective-requirements.md   # source of truth for scope (FR-1 … FR-42)
├── package.json                 # ⬜ Phase 1 — scripts, deps, "manifest" key for Plasmo
├── .prettierrc / .eslintrc      # ⬜ Phase 1
├── .github/workflows/           # ⬜ Phase 1 — build + BPP publish (requirements §2)
├── assets/
│   ├── logo.svg                 # ✅ brand vector source (128 viewBox)
│   └── icon.png                 # ✅ 512x512 — Plasmo derives 16/32/48/128/256/512
├── src/                         # all source (Plasmo is configured for the src dir)
│   ├── background/
│   │   ├── index.js             # ⬜ service worker entry: alarms, notifications, badge
│   │   ├── alarms.js            # ⬜ reminder scheduling + reschedule on startup/update
│   │   └── messages/            # ⬜ Plasmo messaging handlers (popup ↔ background)
│   ├── contents/
│   │   ├── detector.jsx         # ⬜ page detection + CSUI "Track this trial?" banner
│   │   └── rules/               # ⬜ per-site detection rules (data only, no logic)
│   ├── popup/
│   │   └── index.jsx            # ⬜ subscription list, spend summary, manual add
│   ├── options/
│   │   └── index.jsx            # ⬜ settings, license, export/import, delete all
│   ├── lib/
│   │   ├── storage.js           # ⬜ @plasmohq/storage wrappers, schema defaults
│   │   ├── detect.js            # ⬜ keyword/URL matching, scoring
│   │   ├── parse.js             # ⬜ price, currency, cycle, trial-length parsing
│   │   ├── schedule.js          # ⬜ next charge date math (date-fns)
│   │   ├── license.js           # ⬜ free vs paid, limits, offline license cache
│   │   ├── currency.js          # ⬜ formatting and monthly/yearly normalisation
│   │   └── types.js             # ⬜ JSDoc typedefs for Subscription / Settings
│   ├── components/              # ⬜ shared React components (rows, badges, modals)
│   └── styles/                  # ⬜ Tailwind entry or CSS modules
├── tests/
│   ├── unit/                    # ⬜ Vitest — lib/ is pure and directly testable
│   └── e2e/                     # ⬜ Playwright — extension loaded in Chromium
└── docs/                        # this folder — see README.md
```

## Plasmo rules that decide placement

Plasmo resolves entries **by file path**, so the wrong path silently changes the manifest:

| Path | Becomes |
|---|---|
| `src/popup/index.jsx` or `src/popup.jsx` | `action.default_popup` |
| `src/options/index.jsx` or `src/options.jsx` | `options_ui` page |
| `src/background/index.js` or `src/background.js` | MV3 service worker |
| `src/contents/detector.jsx` | content script (adds `contents` entry + host match) |
| `assets/icon.png` | generated `icons` block |

Keep every source file inside `src/` — mixing root-level entries with a `src/` dir makes Plasmo miss entries. Anything that is not an entry (logic, components, rules) is imported, never auto-registered.

## Where new code goes

| You are adding… | Location | Rules |
|---|---|---|
| Detection keyword/regex | `src/contents/rules/` | Data only; `detect.js` consumes it (FR-9) |
| Detection or parsing logic | `src/lib/detect.js`, `src/lib/parse.js` | Pure functions, no DOM assumptions beyond a passed-in `Document`; unit tested |
| Chrome API call (alarms, notifications, storage) | wrappers in `src/lib/` or `src/background/` | UI never calls `chrome.*` directly, so it stays testable |
| Reminder date math | `src/lib/schedule.js` | Pure; table-driven tests for cycles and month edges |
| Free/paid gating | `src/lib/license.js` | One gate function; the UI asks it, never re-implements limits (FR-34…FR-38) |
| Page banner UI | `src/contents/detector.jsx` | Wrap all content-script work in try/catch (NFR-7) — never break the host page |
| Shared UI | `src/components/` | Presentational, no storage access |
| Test | `tests/unit/`, `tests/e2e/` | See [TESTING.md](TESTING.md) |
| Doc | `docs/` | Then update the status table in [README.md](README.md) |

## Naming

- `lib/` modules: one concern per file, default-exported functions, named after the verb (`parsePrice`, `nextChargeDate`).
- Content script files: `<purpose>.jsx` — Plasmo derives the script name from the filename.
- No `index.js` barrels inside `src/lib/`; import the concrete file so bundling stays predictable.
