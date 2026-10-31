import { addDaysIso, daysUntil, isoDate } from "./schedule"

/**
 * Snooze (FR-26): silence the reminders for one record without lying about its
 * status. The charge date is untouched, so the list, totals and badge stay
 * truthful — only notifications are held back until `snoozedUntil`.
 *
 * A snooze lasts until the start of `snoozedUntil`, so "1 day" means "quiet for
 * the rest of today", not "quiet for 48 hours".
 */
export const SNOOZE_OPTIONS = [
  { days: 1, label: "1 day" },
  { days: 3, label: "3 days" },
  { days: 7, label: "1 week" }
]

export function snooze(subscription, days, now = new Date()) {
  const lead = Number(days)
  if (!subscription || !Number.isFinite(lead) || lead <= 0) return subscription

  return {
    ...subscription,
    snoozedUntil: addDaysIso(isoDate(now), lead),
    updatedAt: now.toISOString()
  }
}

export function clearSnooze(subscription, now = new Date()) {
  if (!subscription) return subscription
  const next = { ...subscription, updatedAt: now.toISOString() }
  delete next.snoozedUntil
  return next
}

/** True while reminders for this record should stay silent. */
export function isSnoozed(subscription, now = new Date()) {
  if (!subscription?.snoozedUntil) return false
  const remaining = daysUntil(subscription.snoozedUntil, now)
  return remaining !== null && remaining > 0
}

/** Human label for the record card, e.g. "1d left". */
export function snoozeLabel(subscription, now = new Date()) {
  if (!isSnoozed(subscription, now)) return ""
  const remaining = daysUntil(subscription.snoozedUntil, now)
  return remaining === 1 ? "1d left" : `${remaining}d left`
}
