import { CYCLE, LIVE_STATUSES } from "./constants"

const SYMBOLS = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  JPY: "¥",
  CAD: "CA$",
  AUD: "A$"
}

const AVERAGE_DAYS_PER_MONTH = 30.44

export function formatMoney(amount, currency = "USD", locale = "en-US") {
  const value = Number(amount)
  if (!Number.isFinite(value)) return "—"
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: value % 1 === 0 ? 0 : 2
    }).format(value)
  } catch {
    return `${SYMBOLS[currency] ?? ""}${value.toFixed(2)}`
  }
}

/** Normalise any billing cycle to a per-month figure. */
export function monthlyEquivalent(amount, cycle, customDays) {
  const value = Number(amount)
  if (!Number.isFinite(value)) return 0

  switch (cycle) {
    case CYCLE.WEEKLY:
      return (value * 52) / 12
    case CYCLE.MONTHLY:
      return value
    case CYCLE.YEARLY:
      return value / 12
    case CYCLE.CUSTOM: {
      const days = Number(customDays)
      if (!Number.isFinite(days) || days <= 0) return 0
      return (value * AVERAGE_DAYS_PER_MONTH) / days
    }
    default:
      return 0
  }
}

export function yearlyEquivalent(amount, cycle, customDays) {
  return monthlyEquivalent(amount, cycle, customDays) * 12
}

/**
 * Spend across live subscriptions in a single currency.
 * Mixed currencies are counted separately rather than silently added together.
 */
export function totals(subscriptions, currency = "USD") {
  const live = (subscriptions ?? []).filter(
    (subscription) => LIVE_STATUSES.includes(subscription?.status) && (subscription?.currency ?? "USD") === currency
  )

  const monthly = live.reduce(
    (sum, subscription) => sum + monthlyEquivalent(subscription.price, subscription.billingCycle, subscription.customCycleDays),
    0
  )

  return {
    count: live.length,
    monthly: Number(monthly.toFixed(2)),
    yearly: Number((monthly * 12).toFixed(2))
  }
}

/** Currencies actually present in the list, for the summary UI. */
export function currenciesInUse(subscriptions) {
  const set = new Set((subscriptions ?? []).map((subscription) => subscription?.currency ?? "USD"))
  return [...set].sort()
}
