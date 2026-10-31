import { DETECTION_THRESHOLD } from "./constants"
import {
  BILLING_URL_PATTERNS,
  MANAGE_PAGE_PATTERNS,
  SIGNUP_KEYWORDS,
  SUBSCRIBE_BUTTON_PATTERNS
} from "./rules/keywords"
import { findSiteRule, isMutedHost, normalizeHost } from "./rules/sites"

export function hostOf(url) {
  try {
    return normalizeHost(new URL(url).hostname)
  } catch {
    return ""
  }
}

/** Trim page titles down to something that looks like a service name. */
export function guessName(title, host) {
  const cleaned = String(title ?? "")
    .split(/[|\-–—:·]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .find((part) => part.length > 1 && part.length < 40 && !/^(pricing|plans?|checkout|billing|sign ?up|subscribe)$/i.test(part))

  if (cleaned) return cleaned

  const [first] = String(host ?? "").split(".")
  if (!first) return "Unknown service"
  return first.charAt(0).toUpperCase() + first.slice(1)
}

/**
 * Score a page for "this looks like a trial or subscription signup".
 *
 * Pure: everything comes from the caller's snapshot of the page, so this is
 * unit-testable without a browser.
 *
 * @returns {null | { host: string, url: string, score: number, confidence: number,
 *                    name: string, signals: string[], isManagePage: boolean }}
 */
export function scorePage(page = {}, options = {}) {
  const { url = "", title = "", text = "", buttonText = "" } = page
  const host = hostOf(url)
  if (!host) return null
  if (isMutedHost(host, options.mutedSites)) return null

  const signals = []
  let score = 0

  const rule = findSiteRule(host, options.siteRules)
  if (rule) {
    score += 40
    signals.push(`known site: ${rule.name}`)
  }

  const haystack = `${title} ${text} ${buttonText}`.toLowerCase()
  for (const keyword of SIGNUP_KEYWORDS) {
    if (haystack.includes(keyword)) {
      score += 8
      signals.push(`keyword: ${keyword}`)
    }
  }

  const path = String(url).toLowerCase()
  for (const pattern of BILLING_URL_PATTERNS) {
    if (pattern.test(path)) {
      score += 20
      signals.push(`billing url: ${pattern.source}`)
      break
    }
  }

  if (SUBSCRIBE_BUTTON_PATTERNS.some((pattern) => pattern.test(buttonText))) {
    score += 15
    signals.push("subscribe button")
  }

  if (score < (options.threshold ?? DETECTION_THRESHOLD)) return null

  const isManagePage = MANAGE_PAGE_PATTERNS.some((pattern) => pattern.test(haystack))

  return {
    host,
    url,
    score,
    confidence: Math.min(1, score / 100),
    name: rule?.name ?? guessName(title, host),
    accountUrl: rule?.accountUrl ?? `https://${host}`,
    isManagePage,
    signals
  }
}

/** True when the click target looks like a trial/subscribe button (FR-4). */
export function isSignupButton(label) {
  const value = String(label ?? "").trim()
  if (!value || value.length > 60) return false
  return SUBSCRIBE_BUTTON_PATTERNS.some((pattern) => pattern.test(value))
}
