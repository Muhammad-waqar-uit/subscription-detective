import { BADGE_WINDOW_DAYS, LIVE_STATUSES, STATUS } from "../lib/constants"
import { formatMoney } from "../lib/currency"
import { capabilities, canAdd } from "../lib/license"
import { daysUntil } from "../lib/schedule"
import { createSubscription } from "../lib/subscription"
import { addMutedSite } from "../lib/rules/sites"
import { isSnoozed } from "../lib/snooze"
import { getSettings, getSubscriptions, saveSettings, saveSubscriptions, upsertSubscription } from "../lib/storage"
import { advanceLapsedTrials, parseAlarmName, syncAlarms, updateBadge } from "./alarms"

/**
 * Resolve the extension icon from the built manifest. Plasmo emits hashed icon
 * filenames (icon128.plasmo.<hash>.png), so a hardcoded path would break on the
 * next build.
 */
function iconUrl() {
  try {
    const icons = chrome.runtime.getManifest().icons ?? {}
    const path = icons[128] ?? icons[48] ?? Object.values(icons)[0]
    return path ? chrome.runtime.getURL(path) : undefined
  } catch {
    return undefined
  }
}

async function refresh(reason) {
  const settings = await getSettings()
  const stored = await getSubscriptions()
  const { subscriptions, changed } = advanceLapsedTrials(stored)

  if (changed) await saveSubscriptions(subscriptions)

  const schedule = await syncAlarms(subscriptions, settings)
  const badge = await updateBadge(subscriptions)

  console.info(`[subscription-detective] refresh (${reason})`, {
    records: subscriptions.length,
    alarms: schedule.scheduled,
    badge
  })

  return { subscriptions, settings }
}

async function bootstrap() {
  await refresh("bootstrap")
}

chrome.runtime.onInstalled.addListener(() => {
  bootstrap().catch((error) => console.error("[subscription-detective] install failed", error))
})

chrome.runtime.onStartup.addListener(() => {
  bootstrap().catch((error) => console.error("[subscription-detective] startup failed", error))
})

chrome.alarms.onAlarm.addListener((alarm) => {
  handleAlarm(alarm).catch((error) => console.error("[subscription-detective] alarm failed", error))
})

async function handleAlarm(alarm) {
  const parsed = parseAlarmName(alarm.name)
  if (!parsed) return

  const settings = await getSettings()
  if (settings.notificationsEnabled === false) return

  const subscriptions = await getSubscriptions()
  const subscription = subscriptions.find((item) => item.id === parsed.id)
  if (!subscription || !LIVE_STATUSES.includes(subscription.status)) return
  if (subscription.reminderDisabled) return
  if (isSnoozed(subscription)) return

  const deadline = subscription.trialEndDate || subscription.nextChargeDate
  const days = daysUntil(deadline)
  const money = formatMoney(subscription.price, subscription.currency)
  const isTrial = subscription.status === STATUS.TRIAL

  const title = isTrial ? `${subscription.name}: trial ends soon` : `${subscription.name}: upcoming charge`
  const when = days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`
  const message = isTrial
    ? `${money} will be charged ${when} unless you cancel.`
    : `${money} ${when}.`

  await chrome.notifications.create(`sd:${subscription.id}:${parsed.leadDays}`, {
    type: "basic",
    iconUrl: iconUrl(),
    title,
    message,
    buttons: [{ title: "Open account page" }],
    priority: 2
  })
}

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (buttonIndex !== 0) return
  openAccountPage(notificationId).catch((error) => console.error("[subscription-detective] open failed", error))
})

chrome.notifications.onClicked.addListener((notificationId) => {
  openAccountPage(notificationId).catch((error) => console.error("[subscription-detective] open failed", error))
})

async function openAccountPage(notificationId) {
  const [, id] = String(notificationId ?? "").split(":")
  if (!id) return

  const subscriptions = await getSubscriptions()
  const subscription = subscriptions.find((item) => item.id === id)
  const target = subscription?.accountUrl || subscription?.url
  if (target) {
    await chrome.tabs.create({ url: target })
    return
  }
  await chrome.runtime.openOptionsPage()
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then((result) => sendResponse({ ok: true, ...result }))
    .catch((error) => {
      console.error("[subscription-detective] message failed", message?.type, error)
      sendResponse({ ok: false, error: String(error?.message ?? error) })
    })
  return true
})

async function handleMessage(message = {}) {
  switch (message.type) {
    case "SUBSCRIPTIONS_CHANGED": {
      const { subscriptions } = await refresh("subscriptions changed")
      return { subscriptions }
    }

    case "GET_STATE": {
      const subscriptions = await getSubscriptions()
      const settings = await getSettings()
      return { subscriptions, settings, caps: capabilities(subscriptions, settings.license) }
    }

    case "SAVE_DETECTED": {
      const settings = await getSettings()
      const subscriptions = await getSubscriptions()

      if (!canAdd(subscriptions, settings.license)) {
        return { blocked: true, reason: "free-limit" }
      }

      const existing = subscriptions.find(
        (item) => item.name?.toLowerCase() === String(message.subscription?.name ?? "").toLowerCase() && item.status !== STATUS.CANCELLED
      )
      if (existing) {
        return { duplicate: true, subscription: existing }
      }

      const created = createSubscription({ ...message.subscription, detectedAutomatically: true })
      const next = await upsertSubscription(created)
      await refresh("detected subscription saved")
      return { subscription: created, subscriptions: next }
    }

    // FR-31: the banner can mute the current host without opening options.
    case "MUTE_SITE": {
      const settings = await getSettings()
      const mutedSites = addMutedSite(settings.mutedSites ?? [], message.host)
      const next = await saveSettings({ mutedSites })
      return { mutedSites: next.mutedSites }
    }

    case "AUTO_DETECT_HINT": {
      const settings = await getSettings()
      return { detectionEnabled: settings.detectionEnabled !== false, mutedSites: settings.mutedSites ?? [] }
    }

    default:
      return { ignored: true }
  }
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return
  if (!("subscriptions" in changes) && !("settings" in changes)) return
  refresh("storage changed").catch((error) => console.error("[subscription-detective] resync failed", error))
})

console.info("[subscription-detective] service worker loaded", { badgeWindow: BADGE_WINDOW_DAYS })
