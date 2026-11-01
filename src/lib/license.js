import { FREE_LIMIT, LIVE_STATUSES } from "./constants"

/** Statuses that mean the licence is no longer granting paid access. */
const DEAD_STATUSES = ["expired", "cancelled", "canceled", "deactivated", "refunded", "revoked"]

/**
 * Paid access. Unknown or missing licences resolve to free, never to paid, and a
 * deactivated/expired licence immediately stops granting paid features.
 */
export function isPaid(license) {
  if (!license || typeof license !== "object") return false
  if (license.plan !== "paid") return false
  if (license.status && DEAD_STATUSES.includes(String(license.status).toLowerCase())) return false
  return true
}

/** Records that count toward the free cap: live trials and active subscriptions. */
export function activeCount(subscriptions) {
  return (subscriptions ?? []).filter((subscription) => LIVE_STATUSES.includes(subscription?.status)).length
}

/** FR-34 / FR-37: may the user create another record? */
export function canAdd(subscriptions, license) {
  if (isPaid(license)) return true
  return activeCount(subscriptions) < FREE_LIMIT
}

/** How many more records the free tier allows (Infinity when paid). */
export function remainingFreeSlots(subscriptions, license) {
  if (isPaid(license)) return Number.POSITIVE_INFINITY
  return Math.max(0, FREE_LIMIT - activeCount(subscriptions))
}

/**
 * One place that decides what the current licence unlocks, so no UI re-implements
 * the rules (FR-35, FR-36).
 */
export function capabilities(subscriptions, license) {
  const paid = isPaid(license)

  return {
    paid,
    maxSubscriptions: paid ? Number.POSITIVE_INFINITY : FREE_LIMIT,
    used: activeCount(subscriptions),
    remaining: remainingFreeSlots(subscriptions, license),
    canAdd: canAdd(subscriptions, license),
    canEdit: true,
    multipleReminders: paid,
    customReminderTiming: paid,
    spendSummary: paid,
    export: paid,
    unlimitedHistory: paid
  }
}

/**
 * Whether a cached licence should be re-checked. Offline-first: a stale cache keeps
 * working, it just gets refreshed when the network allows (FR-38).
 */
export function licenseIsStale(license, now = new Date(), maxAgeHours = 24) {
  const checkedAt = license?.checkedAt ? new Date(license.checkedAt) : null
  if (!checkedAt || Number.isNaN(checkedAt.getTime())) return true
  return (now.getTime() - checkedAt.getTime()) / 3_600_000 > maxAgeHours
}
