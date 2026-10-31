# Limitations

Known constraints for Subscription Detective v1. Seeded from the requirements (§3.1, §5, §6, §8, §12) before any code exists; each line below is a constraint the build must accept, not a bug to be fixed later.

## Manifest V3 / Chrome constraints

- **The service worker is not always running.** Chrome stops it when idle, so no reminder can rely on `setTimeout` or in-memory state. Reminders use `chrome.alarms` only, and every alarm is rebuilt from storage on `onStartup` / `onInstalled`.
- **Alarms have a minimum granularity.** Sub-minute scheduling is not reliable; reminders are day-level by design, which matches the 3-day / 1-day model.
- **No remotely hosted code** (NFR-1). All detection rules must ship inside the bundle — rule updates require a new extension version, not a server fetch.
- **Extension updates reset worker state** and can delay already-scheduled alarms; the startup reschedule path is the safety net.

## Detection accuracy

- **Page layouts vary and will break rules.** Detection is best-effort keyword/pattern scoring, never a guarantee. This is why nothing is saved without user confirmation (FR-5, FR-7).
- **Checkout in an iframe is often invisible** to a content script running on the top document. Some signups will simply be missed.
- **Single-page apps change content without a reload.** A throttled `MutationObserver` covers most of it, but late hydration can arrive after the observer window.
- **Some flows have no trial text at all** (card required upfront, price revealed only in the payment sheet). Those produce no usable prefill; the user falls back to manual add.
- **False positives are acceptable, silent false negatives are not.** A wrong banner costs one Dismiss click; a missed trial costs the user money, so the scoring threshold stays deliberately low.
- **Manage-subscription pages are even less standardized** than signup pages, so FR-8 (P1) will have lower hit rates than FR-5.

## Permissions and privacy

- **Broad host access is a trust and review cost.** Whether detection runs automatically (`<all_urls>`) or after an explicit grant is still undecided; the optional-permission route means the user must actively enable detection before any banner can appear.
- **The browser can read everything the content script sees.** Privacy rests on the promise that page text is processed locally and never transmitted (NFR-4, FR-28) — that promise must be enforced in code review, not assumed.
- **Basic OS-level notification settings can suppress reminders.** If Chrome notifications are muted at the OS level, alarms still fire but nothing is shown; the badge is the fallback (FR-24).
- **`chrome.storage.local` quota** (~10 MB without `unlimitedStorage`) bounds the record count and notes. Fine for thousands of records; not a document store.

## Data model limits

- **No bank, card or email verification** (non-goals §1.4). Prices and dates come from the page or the user, so they can be wrong, and a missed price change is invisible.
- **Trial → paid transitions are date-based, not charge-verified.** When `nextChargeDate` passes the status flips to `active` on schedule; if the user cancelled at the merchant without updating the record, Subscription Detective will believe the subscription is still live.
- **No automatic cancellation** (non-goal). Every record links to the service's account page and the user cancels there.
- **Cancelled is not the same as deleted.** Records can be marked `cancelled` or `expired` and kept for history; deleting is permanent.
- **No sync in v1** (FR-33 is P2). A reinstall loses data unless the user exported it.

## Freemium

- **The free limit is client-side only.** There is no server enforcing 3 records; a determined user can bypass it. This is an accepted trade-off for a local-first product with no account.
- **The cached licence can be stale** until the next online check (FR-38). Offline users keep whatever state was last verified — deliberate, so the extension never locks out a paying customer on a plane.
- **Pricing is not final** (FR-39), so plan copy and paywall strings must live in one config, not be scattered through the UI.

## Known gaps in the current build (2026-10-31)

These are accepted-but-unfinished states, not design constraints. They are listed here so nobody discovers them in production.

- **Host access is `<all_urls>`, shipped.** Detection works automatically today, at the cost of Chrome's "read and change all your data on websites you visit" install warning. The optional-permission route was not taken yet, so the trust cost is currently paid in full.
- **The free tier gates records and reminder count, nothing else.** Free users get one reminder (the nearest lead) and 3 records; multiple reminders need the paid plan. Spend summary and export are still available to free users, so the listing copy must not promise otherwise.
- **No payment provider is wired.** `license.js` reads a locally stored licence object; a paid state can only be set by hand, so FR-38 is unproven against a real purchase or refund.
- **Notification delivery and the badge are unverified.** Alarms are proven to be created; nothing has confirmed that a notification appears, that its button opens the account page, or that the badge count clears at zero.
- **Snooze wakes on a date, not on a change.** A snooze silences reminders until `snoozedUntil`; if the charge date moves earlier while snoozed, the alarm for that lead time is simply not created.
- **Export/import, delete-all, edit, delete and muted-site removal are written but have never been executed**, in a browser or otherwise. Their string work is unit-tested; the file-picker path is not.
- **The banner has no inline edit.** It prefills and saves; corrections happen afterwards via **Edit** in the popup (FR-7 is still open).
- **Content-script cost is unmeasured** (NFR-2), and no accessibility pass (NFR-6) or Edge/Brave check (NFR-8) has been done.

### Testing constraints worth remembering

- **CSUI renders in a shadow root**, so popup Tailwind styles never apply to the banner — it uses inline styles deliberately. Any future restyle must keep that in mind.
- **Chrome removed the `--load-extension` command-line flags**, so a headed Chrome instance cannot load the unpacked build for automation. The e2e test therefore uses Playwright's bundled Chromium, which still supports it. Manual testing is unaffected (load unpacked from `chrome://extensions`).
- **`@plasmohq/storage` JSON-serialises values**, so raw `chrome.storage.local` reads return strings. Tests and debug tooling must decode; counting `.length` on the raw value silently measures characters.

## Not in v1

- Bank/card account linking, email inbox reading, automatic cancellation, mobile app, cloud sync, price-increase alerts, household plans, Firefox/Edge store builds (requirements §1.4, §13).

## Documentation notes

- Docs describe intent until a phase closes; only [PROGRESS.md](PROGRESS.md) and [FEATURES.md](FEATURES.md) reflect verified state.
- `LIMITATIONS.md` is updated whenever a phase discovers a new constraint, in the same commit as the change.
