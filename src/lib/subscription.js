import {
  CATEGORIES,
  CYCLE,
  CYCLE_LIST,
  STATUS,
  STATUS_LIST
} from "./constants"
import { addDaysIso, isoDate, nextChargeDate } from "./schedule"

/** Stable id even outside a secure context (tests, older Chrome). */
export function newId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `sub_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export function createSubscription(input = {}, now = new Date()) {
  const billingCycle = CYCLE_LIST.includes(input.billingCycle) ? input.billingCycle : CYCLE.MONTHLY
  const startDate = input.startDate || isoDate(now)
  const trialEndDate = input.trialEndDate || (input.trialDays ? addDaysIso(startDate, input.trialDays) : "")
  const hasTrial = Boolean(trialEndDate)

  const computedNextCharge =
    input.nextChargeDate ||
    trialEndDate ||
    isoDate(nextChargeDate(startDate, billingCycle, input.customCycleDays)) ||
    ""

  const price = Number(input.price)

  return {
    id: input.id || newId(),
    name: String(input.name ?? "").trim(),
    url: String(input.url ?? "").trim(),
    accountUrl: String(input.accountUrl ?? "").trim(),
    price: Number.isFinite(price) && price >= 0 ? price : 0,
    currency: String(input.currency ?? "USD").toUpperCase(),
    billingCycle,
    customCycleDays: billingCycle === CYCLE.CUSTOM ? Number(input.customCycleDays) || 30 : null,
    status: STATUS_LIST.includes(input.status) ? input.status : hasTrial ? STATUS.TRIAL : STATUS.ACTIVE,
    startDate,
    trialEndDate,
    nextChargeDate: computedNextCharge,
    category: CATEGORIES.includes(input.category) ? input.category : "other",
    notes: String(input.notes ?? ""),
    detectedAutomatically: Boolean(input.detectedAutomatically),
    createdAt: input.createdAt || now.toISOString(),
    updatedAt: now.toISOString()
  }
}

/** Field-level validation for the add/edit form. Returns human-readable errors. */
export function validateSubscription(input = {}) {
  const errors = {}

  if (!String(input.name ?? "").trim()) errors.name = "Service name is required."

  const price = Number(input.price)
  if (input.price !== "" && input.price !== undefined && input.price !== null) {
    if (!Number.isFinite(price) || price < 0) errors.price = "Price must be zero or more."
  }

  if (input.billingCycle === CYCLE.CUSTOM) {
    const days = Number(input.customCycleDays)
    if (!Number.isFinite(days) || days <= 0) errors.customCycleDays = "Custom cycle needs a positive number of days."
  }

  if (input.startDate && Number.isNaN(new Date(input.startDate).getTime())) {
    errors.startDate = "Start date is not a valid date."
  }

  if (input.trialEndDate && input.startDate && input.trialEndDate < input.startDate) {
    errors.trialEndDate = "Trial end cannot be before the start date."
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

/** Status transitions that must also touch dates or the reminder schedule (FR-16). */
export function applyStatusChange(subscription, status, now = new Date()) {
  if (!STATUS_LIST.includes(status)) return subscription

  const updated = { ...subscription, status, updatedAt: now.toISOString() }

  if (status === STATUS.CANCELLED || status === STATUS.EXPIRED) {
    return { ...updated, reminderDisabled: true }
  }

  if (status === STATUS.ACTIVE && subscription.status === STATUS.TRIAL) {
    return {
      ...updated,
      reminderDisabled: false,
      trialEndDate: "",
      nextChargeDate:
        subscription.nextChargeDate ||
        isoDate(nextChargeDate(subscription.startDate, subscription.billingCycle, subscription.customCycleDays))
    }
  }

  return { ...updated, reminderDisabled: false }
}

export function sortByNextCharge(subscriptions = []) {
  return [...subscriptions].sort((a, b) => {
    const left = a?.nextChargeDate || "9999-12-31"
    const right = b?.nextChargeDate || "9999-12-31"
    return left.localeCompare(right)
  })
}
