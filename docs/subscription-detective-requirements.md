# Subscription Detective: Requirements Document

Version 0.1 (Draft)
Platform: Chrome Extension (Manifest V3)
Framework: Plasmo (JavaScript / React)

---

## 1. Overview

### 1.1 Product Summary
Subscription Detective is a Chrome extension that detects when a user signs up for a free trial or a paid subscription, logs it locally, and reminds them before they get charged. All data stays on the user's device by default.

### 1.2 Problem Statement
People forget to cancel free trials and lose money on subscriptions they no longer use. Existing tools either require linking a bank account (privacy concern) or need manual data entry (high friction).

### 1.3 Goals
- Detect subscriptions and trials automatically with minimal user effort.
- Remind users before a charge happens.
- Keep all data local so privacy is a core selling point.
- Reach a freemium model that converts free users into paid ones.

### 1.4 Non-Goals (v1)
- No bank or card account linking.
- No reading of the user's email inbox.
- No automatic cancellation of subscriptions.
- No mobile app.
- No cloud sync (planned for a later version).

### 1.5 Target Users
- Students and young professionals who sign up for many free trials.
- Freelancers and developers who pay for several SaaS tools.
- Privacy-conscious users who avoid finance apps that link bank accounts.

---

## 2. Tech Stack

| Area | Choice | Notes |
|---|---|---|
| Framework | Plasmo | Handles bundling, manifest generation, hot reload, and publishing |
| Language | JavaScript (ES2022) with JSX | Plasmo supports JS; TypeScript can be added later without a rewrite |
| UI | React (bundled with Plasmo) | Used for popup, options page, and in-page UI |
| Styling | Tailwind CSS or plain CSS modules | Plasmo has built-in support for both |
| Local storage | `@plasmohq/storage` | Wraps `chrome.storage`; supports local and sync areas |
| Messaging | `@plasmohq/messaging` | Communication between content scripts, popup, and background |
| Content UI | Plasmo CSUI (Content Script UI) | Used for the "Track this trial?" banner on pages |
| Background | MV3 service worker | Handles alarms, notifications, and badge updates |
| Scheduling | `chrome.alarms` API | Used for renewal reminders |
| Notifications | `chrome.notifications` API | Used for reminder alerts |
| Date handling | `date-fns` | Lightweight date math |
| Payments | ExtensionPay (Stripe based) or Stripe Checkout via a small backend | Handles the paid tier and license checks |
| Testing | Vitest (unit), Playwright (end to end with extension loaded) | |
| Linting | ESLint and Prettier | |
| CI/CD | GitHub Actions with the Plasmo BPP action | Automates Chrome Web Store submission |

### 2.1 Suggested Project Structure

```
subscription-detective/
├── assets/                 # icons and images
├── src/
│   ├── background/
│   │   ├── index.js        # service worker entry
│   │   ├── alarms.js       # reminder scheduling
│   │   └── messages/       # Plasmo messaging handlers
│   ├── contents/
│   │   ├── detector.jsx    # page detection + CSUI banner
│   │   └── rules/          # detection rules per site
│   ├── popup/
│   │   └── index.jsx       # subscription list and summary
│   ├── options/
│   │   └── index.jsx       # settings, export, license
│   ├── lib/
│   │   ├── storage.js      # storage helpers
│   │   ├── detect.js       # detection logic
│   │   ├── parse.js        # price, currency, date parsing
│   │   ├── license.js      # free vs paid checks
│   │   └── currency.js     # formatting helpers
│   └── components/         # shared React components
├── package.json
└── README.md
```

---

## 3. Functional Requirements

Priority levels: **P0** = must have for launch, **P1** = should have, **P2** = later.

### 3.1 Detection

| ID | Requirement | Priority |
|---|---|---|
| FR-1 | The extension shall run a content script on pages the user visits and check for signs of a trial or subscription signup. | P0 |
| FR-2 | Detection shall look for keywords such as "free trial", "start trial", "subscribe", "billed monthly", "billed annually", "cancel anytime", "renews on". | P0 |
| FR-3 | Detection shall look for checkout and billing page patterns in the URL and page text (for example `/checkout`, `/billing`, `/subscribe`, `/plans`). | P0 |
| FR-4 | When the user clicks a button that matches a trial or subscribe pattern, the extension shall treat it as a possible signup event. | P0 |
| FR-5 | On a possible signup, the extension shall show a small in-page banner asking "Track this subscription?" with Confirm and Dismiss actions. | P0 |
| FR-6 | The extension shall try to prefill the service name (from the page title or domain), price, billing cycle, and trial end date from page text. | P0 |
| FR-7 | The user shall be able to edit any prefilled field before saving. | P0 |
| FR-8 | The extension shall detect account or billing portal pages (for example "Manage subscription" pages) and offer to log or update the subscription found there. | P1 |
| FR-9 | Detection rules for popular services shall be stored in a rules file so they can be updated without changing core logic. | P1 |
| FR-10 | The user shall be able to add a subscription manually from the popup. | P0 |
| FR-11 | The user shall be able to mute detection for a specific site. | P1 |

### 3.2 Subscription Management

| ID | Requirement | Priority |
|---|---|---|
| FR-12 | Each subscription record shall store: id, service name, site URL, price, currency, billing cycle (weekly, monthly, yearly, custom), start date, trial end date (optional), next charge date, category, notes, status. | P0 |
| FR-13 | Status values shall be: `trial`, `active`, `cancelled`, `expired`. | P0 |
| FR-14 | The popup shall list all subscriptions sorted by next charge date. | P0 |
| FR-15 | The user shall be able to edit, delete, and change the status of any subscription. | P0 |
| FR-16 | The user shall be able to mark a trial as "converted to paid" or "cancelled". | P0 |
| FR-17 | The popup shall show total monthly spend and total yearly spend across active subscriptions. | P1 |
| FR-18 | The popup shall show a link to the service's account page so the user can cancel quickly. | P1 |
| FR-19 | The extension shall support filtering by status and category. | P2 |

### 3.3 Reminders

| ID | Requirement | Priority |
|---|---|---|
| FR-20 | The extension shall schedule reminders using `chrome.alarms`. | P0 |
| FR-21 | By default, a reminder shall fire 3 days before and 1 day before a trial ends or a charge happens. | P0 |
| FR-22 | The user shall be able to configure reminder lead times in settings. | P1 |
| FR-23 | Reminders shall appear as Chrome desktop notifications, with a button to open the service's account page. | P0 |
| FR-24 | The extension icon badge shall show the number of charges due within the next 7 days. | P1 |
| FR-25 | Reminders shall be rescheduled when the browser restarts or the extension updates. | P0 |
| FR-26 | The user shall be able to snooze a reminder for one day. | P2 |

### 3.4 Data and Privacy

| ID | Requirement | Priority |
|---|---|---|
| FR-27 | All subscription data shall be stored locally using `chrome.storage.local`. | P0 |
| FR-28 | The extension shall not send subscription data to any server in the free tier. | P0 |
| FR-29 | The extension shall not collect analytics that contain page content, URLs, or subscription details. Basic anonymous usage counts are allowed only if the user opts in. | P0 |
| FR-30 | The user shall be able to export all data as JSON and CSV. | P1 |
| FR-31 | The user shall be able to import a previously exported JSON file. | P1 |
| FR-32 | The user shall be able to delete all data from the settings page. | P0 |
| FR-33 | Optional encrypted cloud sync may be offered as a paid feature in a later release. | P2 |

### 3.5 Freemium and Licensing

| ID | Requirement | Priority |
|---|---|---|
| FR-34 | The free tier shall allow tracking up to 3 active subscriptions or trials. | P0 |
| FR-35 | The free tier shall include basic reminders (one reminder before each charge). | P0 |
| FR-36 | The paid tier shall allow unlimited subscriptions, multiple custom reminders, spend summaries, and export. | P0 |
| FR-37 | When the free limit is reached, the extension shall show an upgrade prompt and shall still let the user view and edit existing records. | P0 |
| FR-38 | License status shall be checked on startup and cached locally so the extension works offline. | P0 |
| FR-39 | Pricing proposal: monthly plan, yearly plan, and a one time lifetime option. Final prices to be decided before launch. | P1 |

### 3.6 Settings

| ID | Requirement | Priority |
|---|---|---|
| FR-40 | The options page shall allow setting default currency, reminder timing, notification on/off, and detection on/off. | P0 |
| FR-41 | The options page shall show license status and an upgrade or manage button. | P0 |
| FR-42 | The options page shall list sites where detection is muted and allow removing them. | P1 |

---

## 4. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-1 | **Manifest V3 compliance.** No remotely hosted code, and no use of background pages. |
| NFR-2 | **Performance.** The content script shall add less than 50 ms to page load on average and shall not block rendering. Detection shall run after the page is idle. |
| NFR-3 | **Memory.** The service worker shall stay idle when no events are firing. |
| NFR-4 | **Privacy.** Page text shall be processed in the browser and never leave the device. Only the minimum fields needed are stored. |
| NFR-5 | **Permissions.** Request the smallest set possible (see section 6). Explain each permission in the store listing. |
| NFR-6 | **Accessibility.** The popup and options page shall be keyboard navigable, with sufficient color contrast and labelled controls. |
| NFR-7 | **Reliability.** Detection failures shall never break the host page. All content script code shall be wrapped in error handling. |
| NFR-8 | **Compatibility.** Support the latest two major versions of Chrome. Edge and Brave should work with no changes. Plasmo can build for Firefox later. |
| NFR-9 | **Localization.** Prepare strings for translation. English only at launch. |
| NFR-10 | **Security.** Escape all text taken from pages before rendering it in the UI. Use a strict content security policy. |

---

## 5. Data Model

### 5.1 Subscription

```json
{
  "id": "uuid",
  "name": "Notion",
  "url": "https://www.notion.so",
  "accountUrl": "https://www.notion.so/my-account",
  "price": 10.0,
  "currency": "USD",
  "billingCycle": "monthly",
  "status": "trial",
  "startDate": "2026-10-31",
  "trialEndDate": "2026-11-14",
  "nextChargeDate": "2026-11-14",
  "category": "productivity",
  "notes": "",
  "detectedAutomatically": true,
  "createdAt": "2026-10-31T10:00:00Z",
  "updatedAt": "2026-10-31T10:00:00Z"
}
```

### 5.2 Settings

```json
{
  "defaultCurrency": "USD",
  "reminderDaysBefore": [3, 1],
  "notificationsEnabled": true,
  "detectionEnabled": true,
  "mutedSites": ["example.com"],
  "license": {
    "plan": "free",
    "checkedAt": "2026-10-31T10:00:00Z"
  }
}
```

---

## 6. Chrome Permissions

| Permission | Reason |
|---|---|
| `storage` | Save subscriptions and settings locally |
| `alarms` | Schedule reminders |
| `notifications` | Show reminder alerts |
| Host permissions (`<all_urls>` or optional) | Run the detector on pages where signups happen |

**Recommendation:** Request host access as an *optional* permission, or use `activeTab` plus a user prompt, to reduce store review friction and build trust. If broad host access is needed for automatic detection, explain clearly in the listing and onboarding why it is required and that nothing leaves the device.

---

## 7. User Flows

### 7.1 Auto Detect a Trial
1. User visits a service and clicks "Start free trial".
2. Content script detects the click and parses the page for price and trial length.
3. In-page banner appears: "Track this free trial?"
4. User confirms, edits fields if needed, and saves.
5. Background worker schedules reminder alarms.
6. User receives notifications before the trial ends.

### 7.2 Manual Add
1. User opens the popup and clicks "Add".
2. User fills in name, price, cycle, and dates.
3. Record is saved and reminders are scheduled.

### 7.3 Hit the Free Limit
1. User tries to add a fourth subscription.
2. Upgrade prompt appears with plan options.
3. After payment, license is verified and the limit is lifted.

### 7.4 Reminder
1. Alarm fires at the configured time.
2. Notification shows the service name, price, and date.
3. User clicks the notification to open the service's account page, or marks it as cancelled from the popup.

---

## 8. Detection Approach

Detection should be layered, from cheap and reliable to flexible:

1. **Rule based matching.** Keyword and regex patterns for trial and billing phrases, plus per-site rules for popular services.
2. **Structured data.** Read page metadata and JSON-LD where available.
3. **Price and date parsing.** Extract amounts, currency symbols, and phrases like "after 14 days" or "renews on".
4. **User confirmation.** Always ask before saving, which keeps false positives harmless.

An optional AI assisted parser can be considered later, but it would conflict with the local-first promise unless it runs on device.

**Known risks:** page layouts vary widely, some checkouts run in iframes, and many sites are single page apps that change content without reloading. Use a `MutationObserver` with throttling to handle dynamic pages.

---

## 9. Chrome Web Store Requirements

- Clear single purpose description.
- Privacy policy page stating that data stays on the device.
- Justification text for each permission.
- Screenshots (1280x800), a small promo tile (440x280), and a 128x128 icon.
- A short demo video is recommended.
- Disclose any payment provider used.

---

## 10. Milestones

| Phase | Scope | Estimated Time |
|---|---|---|
| 1. Setup | Plasmo project, folder structure, lint, CI | 1 to 2 days |
| 2. Core storage and UI | Data model, popup list, manual add and edit | 1 week |
| 3. Reminders | Alarms, notifications, badge | 3 to 4 days |
| 4. Detection MVP | Keyword rules, banner, price and date parsing | 1 to 2 weeks |
| 5. Freemium | Limit logic, payment integration, license cache | 1 week |
| 6. Polish and QA | Edge cases, accessibility, performance tests | 1 week |
| 7. Launch | Store listing, privacy policy, submission | 3 to 5 days |

---

## 11. Success Metrics

- Install to first tracked subscription rate above 40%.
- Seven day retention above 30%.
- Free to paid conversion between 2% and 5%.
- Chrome Web Store rating of 4.5 or higher.
- Fewer than 5% of detection banners dismissed as false positives.

---

## 12. Risks and Open Questions

| Risk or Question | Mitigation or Next Step |
|---|---|
| Broad host permission may slow store review or scare users | Use optional permissions and clear onboarding |
| Detection accuracy varies by site | Start with top 50 services, add rules over time, always confirm with user |
| Competitors exist in the space | Focus on local-first privacy and a fast, low friction UX |
| Payment handling in extensions | Evaluate ExtensionPay versus a custom Stripe backend |
| Service worker can be stopped by Chrome | Rely on `chrome.alarms` and rebuild state on startup |
| Pricing not finalized | Run a short survey or landing page test before launch |

---

## 13. Future Ideas

- Encrypted cloud sync across devices.
- Crypto and wallet based recurring payment tracking.
- Price increase alerts for tracked services.
- Shared household plans.
- Firefox and Edge store releases using Plasmo's multi-browser build.
