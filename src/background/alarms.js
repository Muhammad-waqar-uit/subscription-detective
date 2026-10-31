import { BADGE_WINDOW_DAYS, LIVE_STATUSES, STATUS } from "../lib/constants"
import { reminderAt, rollForward } from "../lib/schedule"

export const ALARM_PREFIX = "sd:reminder"

export function alarmName(subscriptionId, leadDays) {
  return `${ALARM_PREFIX}:${subscriptionId}:${leadDays}`
}

export function parseAlarmName(name) {
  const value = String(name ?? "")
  if (!value.startsWith(`${ALARM_PREFIX}:`)) return null

  // "sd:reminder:<subscriptionId>:<leadDays>"
  const parts = value.split(":")
  const id = parts[2]
  const leadDays = Number(parts[3])

  if (!id || !Number.isFinite(leadDays)) return null
  return { id, leadDays }
}

/** Remove every alarm this extension scheduled. */
async function clearReminderAlarms() {
  const alarms = await chrome.alarms.getAll()
  await Promise.all(
    alarms.filter((alarm) => alarm.name.startsWith(`${ALARM_PREFIX}:`)).map((alarm) => chrome.alarms.clear(alarm.name))
  )
}

export function reminderLeads(settings) {
  const leads = settings?.reminderDaysBefore
  if (!Array.isArray(leads) || leads.length === 0) return [3, 1]
  return leads.filter((days) => Number.isFinite(Number(days)) && Number(days) >= 0).map(Number)
}

/**
 * Rebuild every reminder alarm from stored data. Called after any mutation, on
 * install and on startup — alarms do not survive a restart (FR-25).
 */
export async function syncAlarms(subscriptions, settings, now = new Date()) {
  if (settings?.notificationsEnabled === false) {
    await chrome.alarms.clearAll()
    return { scheduled: 0, skipped: "notifications disabled" }
  }

  await clearReminderAlarms()

  const leads = reminderLeads(settings)
  let scheduled = 0

  for (const subscription of subscriptions ?? []) {
    if (!LIVE_STATUSES.includes(subscription?.status)) continue
    if (subscription?.reminderDisabled) continue

    for (const days of leads) {
      const at = reminderAt(subscription, days, now)
      if (!at || at.getTime() <= now.getTime()) continue
      chrome.alarms.create(alarmName(subscription.id, days), { when: at.getTime() })
      scheduled += 1
    }
  }

  return { scheduled }
}

/** Badge = live charges due within the window (FR-24). */
export async function updateBadge(subscriptions, now = new Date()) {
  const due = (subscriptions ?? []).filter((subscription) => {
    if (!LIVE_STATUSES.includes(subscription?.status)) return false
    const target = subscription.trialEndDate || subscription.nextChargeDate
    if (!target) return false
    const date = new Date(target)
    if (Number.isNaN(date.getTime())) return false
    const days = Math.round((date.getTime() - now.getTime()) / 86_400_000)
    return days >= 0 && days <= BADGE_WINDOW_DAYS
  })

  const count = due.length
  await chrome.action.setBadgeBackgroundColor({ color: "#4338CA" })
  await chrome.action.setBadgeText({ text: count > 0 ? String(count) : "" })
  return count
}

/**
 * Move lapsed trials to active so the list and reminders stay truthful.
 * Returns the (possibly updated) list plus whether anything changed.
 */
export function advanceLapsedTrials(subscriptions, now = new Date()) {
  let changed = false
  const next = (subscriptions ?? []).map((subscription) => {
    if (subscription?.status !== STATUS.TRIAL) return subscription
    const rolled = rollForward(subscription, now)
    if (rolled !== subscription) changed = true
    return rolled
  })
  return { subscriptions: next, changed }
}
