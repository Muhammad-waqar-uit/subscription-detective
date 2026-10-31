import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  isValid,
  parseISO,
  startOfDay
} from "date-fns"

import { CYCLE, DEFAULT_REMINDER_DAYS, LIVE_STATUSES, STATUS } from "./constants"

/** Coerce a Date | ISO string | timestamp into a valid Date, or null. */
export function toDate(value) {
  if (value instanceof Date) return isValid(value) ? value : null
  if (typeof value === "number") {
    const d = new Date(value)
    return isValid(d) ? d : null
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = parseISO(value)
    if (isValid(parsed)) return parsed
    const fallback = new Date(value)
    return isValid(fallback) ? fallback : null
  }
  return null
}

/**
 * The next charge date implied by a start date and a billing cycle.
 * Monthly/yearly are clamped by date-fns, so Jan 31 + 1 month === Feb 28/29.
 */
export function nextChargeDate(startDate, cycle, customDays) {
  const start = toDate(startDate)
  if (!start) return null

  switch (cycle) {
    case CYCLE.WEEKLY:
      return startOfDay(addWeeks(start, 1))
    case CYCLE.MONTHLY:
      return startOfDay(addMonths(start, 1))
    case CYCLE.YEARLY:
      return startOfDay(addYears(start, 1))
    case CYCLE.CUSTOM: {
      const days = Number(customDays)
      if (!Number.isFinite(days) || days <= 0) return null
      return startOfDay(addDays(start, days))
    }
    default:
      return null
  }
}

/** Whole days from now until a date. Negative means the date has passed. */
export function daysUntil(date, now = new Date()) {
  const target = toDate(date)
  if (!target) return null
  return differenceInCalendarDays(startOfDay(target), startOfDay(now))
}

/** The date the user should be reminded on, `days` before the deadline. */
export function reminderAt(subscription, days, now = new Date()) {
  const deadline = toDate(subscription?.trialEndDate) ?? toDate(subscription?.nextChargeDate)
  if (!deadline) return null
  const lead = Number(days)
  if (!Number.isFinite(lead) || lead < 0) return null
  return startOfDay(addDays(deadline, -lead))
}

/**
 * Every reminder still in the future for one subscription.
 * A trial reminds on its end date; anything else on its next charge date.
 */
export function upcomingReminders(subscription, settings, now = new Date()) {
  const leads =
    Array.isArray(settings?.reminderDaysBefore) && settings.reminderDaysBefore.length
      ? settings.reminderDaysBefore
      : DEFAULT_REMINDER_DAYS

  if (!LIVE_STATUSES.includes(subscription?.status)) return []

  return leads
    .map((days) => ({ days, at: reminderAt(subscription, days, now) }))
    .filter((reminder) => reminder.at && reminder.at.getTime() > startOfDay(now).getTime())
    .sort((a, b) => a.at - b.at)
}

/** Move a lapsed trial to active and roll the next charge date forward (Phase 3). */
export function rollForward(subscription, now = new Date()) {
  if (subscription?.status !== STATUS.TRIAL) return subscription
  const charge = toDate(subscription?.nextChargeDate)
  if (!charge || charge.getTime() > now.getTime()) return subscription

  return {
    ...subscription,
    status: STATUS.ACTIVE,
    nextChargeDate: isoDate(nextChargeDate(subscription.nextChargeDate, subscription.billingCycle, subscription.customCycleDays))
  }
}

/** Charges due within `windowDays`, for the badge (FR-24). */
export function chargesDueSoon(subscriptions, windowDays, now = new Date()) {
  return (subscriptions ?? []).filter((subscription) => {
    if (!LIVE_STATUSES.includes(subscription?.status)) return false
    const days = daysUntil(subscription?.nextChargeDate, now)
    return days !== null && days >= 0 && days <= windowDays
  })
}

/** `yyyy-MM-dd` — the format the popup and options page use for date inputs. */
export function isoDate(value) {
  const date = toDate(value)
  if (!date) return ""
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

export function addDaysIso(value, days) {
  const date = toDate(value)
  if (!date) return ""
  return isoDate(addDays(date, days))
}
