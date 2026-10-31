import { Storage } from "@plasmohq/storage"

import { DEFAULT_REMINDER_DAYS, SCHEMA_VERSION, STORAGE_KEYS } from "./constants"

/**
 * All persistence goes through this module. `@plasmohq/storage` wraps
 * chrome.storage.local, so nothing here works in a plain node test — the pure
 * logic it depends on lives in schedule.js / subscription.js and is tested there.
 */
const storage = new Storage({ area: "local" })

export const DEFAULT_SETTINGS = {
  schemaVersion: SCHEMA_VERSION,
  defaultCurrency: "USD",
  reminderDaysBefore: [...DEFAULT_REMINDER_DAYS],
  notificationsEnabled: true,
  detectionEnabled: true,
  mutedSites: [],
  license: { plan: "free", status: "unknown", checkedAt: null }
}

export async function getSubscriptions() {
  const value = await storage.get(STORAGE_KEYS.SUBSCRIPTIONS)
  return Array.isArray(value) ? value : []
}

export async function saveSubscriptions(subscriptions) {
  await storage.set(STORAGE_KEYS.SUBSCRIPTIONS, subscriptions ?? [])
  return subscriptions ?? []
}

export async function upsertSubscription(subscription) {
  const list = await getSubscriptions()
  const index = list.findIndex((item) => item.id === subscription.id)
  const next = index >= 0 ? list.map((item) => (item.id === subscription.id ? subscription : item)) : [...list, subscription]
  await saveSubscriptions(next)
  return next
}

export async function removeSubscription(id) {
  const list = await getSubscriptions()
  const next = list.filter((item) => item.id !== id)
  await saveSubscriptions(next)
  return next
}

export async function getSettings() {
  const stored = (await storage.get(STORAGE_KEYS.SETTINGS)) ?? {}
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    license: { ...DEFAULT_SETTINGS.license, ...(stored.license ?? {}) },
    reminderDaysBefore: Array.isArray(stored.reminderDaysBefore) && stored.reminderDaysBefore.length
      ? stored.reminderDaysBefore
      : [...DEFAULT_SETTINGS.reminderDaysBefore],
    mutedSites: Array.isArray(stored.mutedSites) ? stored.mutedSites : []
  }
}

export async function saveSettings(patch = {}) {
  const current = await getSettings()
  const next = {
    ...current,
    ...patch,
    license: { ...current.license, ...(patch.license ?? {}) }
  }
  await storage.set(STORAGE_KEYS.SETTINGS, next)
  return next
}

/** FR-32: delete everything this extension stored. */
export async function wipeAll() {
  await storage.remove(STORAGE_KEYS.SUBSCRIPTIONS)
  await storage.remove(STORAGE_KEYS.SETTINGS)
  return { subscriptions: [], settings: { ...DEFAULT_SETTINGS } }
}

export function watchStorage(callback) {
  return storage.watch({
    [STORAGE_KEYS.SUBSCRIPTIONS]: (change) => callback("subscriptions", change.newValue ?? []),
    [STORAGE_KEYS.SETTINGS]: (change) => callback("settings", change.newValue ?? {})
  })
}
