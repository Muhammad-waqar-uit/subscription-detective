# Subscription Detective — docs

Index of project documentation. **Update the Status column in the same commit as the change it describes.**

Source of truth for *what to build* is [`subscription-detective-requirements.md`](subscription-detective-requirements.md) (FR-1 … FR-42, NFR-1 … NFR-10). These docs track *what is built*.

## Where the project stands

Last verified: **2026-11-01** — `npm run test:all` green (146 unit + 52 browser
checks), `npm run lint` clean, `npm run build` produces a loadable build.

| Phase | Scope | Status |
|---|-------|--------|
| 0 | Documentation & structure | ✅ Done |
| 1 | Setup (builds, loads, lint, scripts) | ✅ Done — CI workflow outstanding |
| 2 | Core storage & UI | 🟨 Mostly done — edit/delete/status unexercised in browser |
| 3 | Reminders | 🟨 Mostly done — notification delivery + toolbar badge unverified |
| 4 | Detection MVP | 🟨 Mechanics verified on fixtures; real-page hit rate unmeasured |
| 5 | Freemium | 🟨 Partial — no payment provider wired |
| 6 | Polish & QA | 🟨 Mostly done — a11y, localisation, Edge/Brave unchecked |
| 7 | Launch | ⬜ Not started |

- **Built and verified:** the MV3 extension builds, loads in Chromium, adds records, persists them, filters and searches them, snoozes a reminder, schedules the right number of alarms for free vs paid, and enforces the 3-record free cap. The detection banner fires on a real signup page and skips a page that is not one. `146` unit tests, `52` browser checks, `lint` clean.
- **Written but unverified:** notification delivery, the badge on screen, restart reschedule, export/import through the file picker, edit/delete, removing a muted site, inline edit in the banner.
- **Not built:** cloud sync (FR-33), pricing/payments (FR-39).

## Documents

| Doc | What it covers | Status | Updated |
|-----|----------------|--------|---------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Stack, module map, data flow, permissions, build output, decisions | ✅ Reflects the code | 2026-11-01 |
| [FOLDER_STRUCTURE.md](FOLDER_STRUCTURE.md) | Annotated tree + where new code goes | ✅ Reflects the code | 2026-11-01 |
| [PLAN.md](PLAN.md) | 7 phases with tasks, exit criteria, FR coverage | ✅ Written | 2026-11-01 |
| [TODO.md](TODO.md) | Step-level checklist: done / written-but-unverified / left | ✅ Living doc | 2026-11-01 |
| [PROGRESS.md](PROGRESS.md) | Phase status, verification log, bugs found, history | ✅ Living doc | 2026-11-01 |
| [FEATURES.md](FEATURES.md) | Every FR with a build status marker + evidence | ✅ 24 done / 16 unverified / 2 not started | 2026-11-01 |
| [LIMITATIONS.md](LIMITATIONS.md) | Chrome/MV3 constraints, detection accuracy, freemium limits | ✅ Living doc | 2026-11-01 |
| [TESTING.md](TESTING.md) | Unit, e2e and manual test plan mapped to FRs | 🟨 Automated layers green (146 unit + 52 browser), manual matrix pending | 2026-11-01 |

## Reading order

- **New to the project:** requirements → [ARCHITECTURE.md](ARCHITECTURE.md) → [FOLDER_STRUCTURE.md](FOLDER_STRUCTURE.md).
- **Picking up work today:** [PROGRESS.md](PROGRESS.md) (where we are) → [TODO.md](TODO.md) (next unchecked box) → [TESTING.md](TESTING.md) (how to prove it works).
- **Deciding what to cut:** [FEATURES.md](FEATURES.md) — P0 items are the launch gate.
- **Before promising anything to a user:** [LIMITATIONS.md](LIMITATIONS.md).

## Status markers used in every doc

| Marker | Meaning |
|--------|---------|
| ✅ | Done and verified (test, manual check, or explicit evidence noted) |
| 🟨 | Written but not verified |
| ⬜ | Not started |
| ⏸ | Blocked — reason written next to it |

## Rules

1. A phase is only ✅ when its **exit criteria** in [PLAN.md](PLAN.md) are met, not when the code is written.
2. Any `src/` change updates the matching doc in the same commit: new module → FOLDER_STRUCTURE, new behaviour → FEATURES, new constraint → LIMITATIONS, finished task → TODO + PROGRESS.
3. Evidence beats adjectives: a verification line is `command → result`, or `manual check → expected vs seen`.
