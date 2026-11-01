# Subscription Detective v0.1.0

<img src="docs/images/banner.png" alt="The detection banner appearing on a signup page" width="880" />

Catches the free trials you forgot about, before they charge your card.

## What's new

- Detects trial and subscription signups from page text, URL patterns and 25 site rules.
- One-click add from the banner, or add manually from the popup.
- Desktop reminder before each charge — 3 days and 1 day for paid, 1 day for free.
- Edit, cancel, convert or delete a record; snooze a record for a day, three days or a week.
- Filter by status, category, or search; badge count for charges in the next 7 days.
- Free tier tracks 3 active subscriptions with one reminder each.
- Everything stays in `chrome.storage.local` — no account, no server, no analytics.

## Install

Download `chrome-mv3-prod.zip`, unzip it, then in `chrome://extensions` turn on **Developer mode** and **Load unpacked** → select the unzipped `chrome-mv3-prod` folder.

## Status

146 unit tests passing, 57 browser checks across two Playwright suites. Detection, capture, storage, filters, snooze, free-tier cap, options, mute, edit, delete and status change are all verified in a real browser.

Notification delivery, toolbar badge, export/import through the file picker, accessibility audit, localisation and Edge/Brave are deferred to post-v1.

## License

MIT. See [package.json](package.json) for the package metadata.

Subscription Detective is not financial advice and does not cancel anything for you. Detection is best-effort: it can miss an offer, and it never verifies a charge with the merchant.