/**
 * Detection vocabulary (FR-2, FR-3). Data only — no logic here, so rules can be
 * extended without touching detect.js.
 */

export const SIGNUP_KEYWORDS = [
  "free trial",
  "start trial",
  "start your free trial",
  "try free",
  "subscribe",
  "subscription",
  "billed monthly",
  "billed annually",
  "billed yearly",
  "cancel anytime",
  "renews on",
  "renews automatically",
  "auto-renew",
  "per month",
  "per year",
  "payment method",
  "add payment",
  "credit card"
]

/** URL fragments that suggest a checkout, plans or billing surface. */
export const BILLING_URL_PATTERNS = [
  /\/checkout\b/,
  /\/billing\b/,
  /\/subscribe\b/,
  /\/subscription\b/,
  /\/plans?\b/,
  /\/pricing\b/,
  /\/upgrade\b/,
  /\/payment\b/,
  /\/trial\b/,
  /\/sign-?up\b/
]

/** Button labels that count as a signup event when clicked (FR-4). */
export const SUBSCRIBE_BUTTON_PATTERNS = [
  /start (?:my |your )?free trial/i,
  /start (?:the )?trial/i,
  /try (?:it )?free/i,
  /start free/i,
  /subscribe/i,
  /upgrade (?:to|now)/i,
  /get started/i,
  /begin (?:free )?trial/i
]

/** Labels that mean "this is an existing subscription's management page" (FR-8). */
export const MANAGE_PAGE_PATTERNS = [
  /manage (?:my )?(?:subscription|plan|billing)/i,
  /billing (?:portal|settings)/i,
  /payment (?:methods|details)/i,
  /cancel (?:my )?(?:subscription|plan)/i
]
