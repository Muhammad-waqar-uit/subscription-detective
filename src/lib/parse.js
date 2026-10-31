/**
 * Best-effort extraction of price, currency, billing cycle and trial length from
 * page text. Pure functions — the caller passes the text, nothing touches the DOM.
 */

const SYMBOL_TO_CODE = {
  $: "USD",
  "€": "EUR",
  "£": "GBP",
  "₹": "INR",
  "¥": "JPY"
}

const CODES = ["USD", "EUR", "GBP", "INR", "CAD", "AUD", "JPY"]

const AMOUNT = String.raw`(?:\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d{1,4}(?:[.,]\d{1,2})?)`

const CURRENCY_FIRST = new RegExp(`(?:([$€£₹¥])|\\b(${CODES.join("|")})\\b)\\s*(${AMOUNT})`, "i")
const AMOUNT_FIRST = new RegExp(`(${AMOUNT})\\s*(?:([$€£₹¥])|\\b(${CODES.join("|")})\\b)`, "i")

const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december"
]

function normalizeAmount(raw) {
  if (!raw) return null
  let value = String(raw).trim()

  // "1,299.00" -> strip the thousands separator; "9,99" -> decimal comma
  if (value.includes(".") && value.includes(",")) {
    value = value.replace(/,/g, "")
  } else {
    const commaDecimals = value.match(/,(\d{1,2})$/)
    value = commaDecimals ? value.replace(",", ".") : value.replace(/,/g, "")
  }

  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function detectCycle(text) {
  if (!text) return null
  const haystack = String(text).toLowerCase()

  if (/\b(?:per\s+)?(?:year|yearly|annual|annually|yr)\b/.test(haystack)) return "yearly"
  if (/\b(?:per\s+)?(?:month|monthly|mo)\b/.test(haystack)) return "monthly"
  if (/\b(?:per\s+)?(?:week|weekly|wk)\b/.test(haystack)) return "weekly"
  return null
}

/** Returns `{ amount, currency, cycle }` with nulls for anything not found. */
export function parsePrice(text) {
  if (!text) return null
  const haystack = String(text)

  const currencyFirstMatch = haystack.match(CURRENCY_FIRST)
  const match = currencyFirstMatch ?? haystack.match(AMOUNT_FIRST)
  if (!match) return null

  const currencyFirst = Boolean(currencyFirstMatch)
  const symbol = currencyFirst ? match[1] : match[2]
  const code = currencyFirst ? match[2] : match[3]
  const amount = normalizeAmount(currencyFirst ? match[3] : match[1])

  if (amount === null) return null

  return {
    amount,
    currency: code ? code.toUpperCase() : (SYMBOL_TO_CODE[symbol] ?? null),
    cycle: detectCycle(haystack)
  }
}

/** Trial length in days, e.g. "14-day free trial", "free for 30 days". */
export function parseTrialDays(text) {
  if (!text) return null
  const haystack = String(text).toLowerCase()

  const patterns = [
    { re: /(\d{1,3})[\s-]*day(?:s)?\s*(?:free\s*)?trial/, factor: 1 },
    { re: /(\d{1,3})[\s-]*days?\s*free/, factor: 1 },
    { re: /free\s*(?:for\s*)?(\d{1,3})\s*days?/, factor: 1 },
    { re: /after\s*(\d{1,3})\s*days?/, factor: 1 },
    { re: /(\d{1,2})[\s-]*week(?:s)?\s*(?:free\s*)?trial/, factor: 7 },
    { re: /(\d{1,2})[\s-]*months?\s*free/, factor: 30 }
  ]

  for (const { re, factor } of patterns) {
    const match = haystack.match(re)
    if (match) {
      const days = Number.parseInt(match[1], 10) * factor
      if (Number.isFinite(days) && days > 0 && days <= 400) return days
    }
  }

  return null
}

/** "renews on 14 November 2026" / "next payment on 2026-11-14" -> ISO date. */
export function parseRenewsOn(text) {
  if (!text) return null
  const haystack = String(text)

  const iso = haystack.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

  const monthNames = MONTH_NAMES.join("|")
  const dayMonth = haystack.match(
    new RegExp(`\\b(\\d{1,2})\\s+(${monthNames})\\s+(20\\d{2})\\b`, "i")
  )
  if (dayMonth) {
    const day = dayMonth[1].padStart(2, "0")
    const month = String(MONTH_NAMES.indexOf(dayMonth[2].toLowerCase()) + 1).padStart(2, "0")
    return `${dayMonth[3]}-${month}-${day}`
  }

  const monthDay = haystack.match(
    new RegExp(`\\b(${monthNames})\\s+(\\d{1,2}),?\\s+(20\\d{2})\\b`, "i")
  )
  if (monthDay) {
    const month = String(MONTH_NAMES.indexOf(monthDay[1].toLowerCase()) + 1).padStart(2, "0")
    return `${monthDay[3]}-${month}-${monthDay[2].padStart(2, "0")}`
  }

  return null
}

/** Everything the banner prefills in one call (FR-6). */
export function extractSubscriptionHints(text) {
  const price = parsePrice(text)
  const trialDays = parseTrialDays(text)

  return {
    price: price?.amount ?? null,
    currency: price?.currency ?? null,
    billingCycle: price?.cycle ?? null,
    trialDays,
    renewsOn: parseRenewsOn(text)
  }
}
