# Subscription Detective — docs

Index of project documentation. **Update the Status column in the same commit as the change it describes.**

Source of truth for *what to build* is [`../subscription-detective-requirements.md`](../subscription-detective-requirements.md) (FR-1 … FR-42, NFR-1 … NFR-10). These docs track *what is built*.

## Where the project stands

- **Built and verified:** the MV3 extension builds, loads in Chromium, adds records, persists them, schedules reminder alarms and enforces the 3-record free cap. `91` unit tests, `19` browser checks, `lint` clean.
- **Written but unverified:** the detection banner, notifications on screen, badge, export/import, edit/delete, muted sites.
- **Not built:** filters (FR-19), snooze (FR-26), cloud sync (FR-33), pricing/payments (FR-39).

## Documents

| Doc | What it covers | Status | Updated |
|-----|----------------|--------|---------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Stack, module map, data flow, permissions, build output, decisions | ✅ Reflects the code | 2026-10-31 |
| [FOLDER_STRUCTURE.md](FOLDER_STRUCTURE.md) | Annotated tree + where new code goes | ✅ Reflects the code | 2026-10-31 |
| [PLAN.md](PLAN.md) | 7 phases with tasks, exit criteria, FR coverage | ✅ Written | 2026-10-31 |
| [TODO.md](TODO.md) | Step-level checklist: done / written-but-unverified / left | ✅ Living doc | 2026-10-31 |
| [PROGRESS.md](PROGRESS.md) | Phase status, verification log, bugs found, history | ✅ Living doc | 2026-10-31 |
| [FEATURES.md](FEATURES.md) | Every FR with a build status marker + evidence | ✅ 18 done / 20 unverified / 4 not started | 2026-10-31 |
| [LIMITATIONS.md](LIMITATIONS.md) | Chrome/MV3 constraints, detection accuracy, freemium limits | ✅ Living doc | 2026-10-31 |
| [TESTING.md](TESTING.md) | Unit, e2e and manual test plan mapped to FRs | 🟨 Automated layers green, manual matrix pending | 2026-10-31 |

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
