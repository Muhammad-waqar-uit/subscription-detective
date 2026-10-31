import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  ALARM_PREFIX,
  advanceLapsedTrials,
  alarmName,
  parseAlarmName,
  reminderLeads,
  syncAlarms,
  updateBadge
} from "../../src/background/alarms"

const NOW = new Date("2026-10-31T09:00:00")
const paid = { plan: "paid", status: "active" }
const free = { plan: "free", status: "unknown" }

let scheduled
let badge

function makeChrome() {
  scheduled = new Map()
  badge = { text: null, color: null }

  return {
    alarms: {
      getAll: vi.fn(async () => [...scheduled.values()]),
      clear: vi.fn(async (name) => {
        scheduled.delete(name)
        return true
      }),
      clearAll: vi.fn(async () => {
        scheduled.clear()
      }),
      create: vi.fn((name, info) => {
        scheduled.set(name, { name, scheduledTime: info.when })
      })
    },
    action: {
      setBadgeText: vi.fn(async ({ text }) => {
        badge.text = text
      }),
      setBadgeBackgroundColor: vi.fn(async ({ color }) => {
        badge.color = color
      })
    }
  }
}

const base = {
  id: "sub-1",
  name: "Notion",
  status: "active",
  nextChargeDate: "2026-11-04",
  trialEndDate: "",
  billingCycle: "monthly",
  startDate: "2026-10-04"
}

beforeEach(() => {
  vi.stubGlobal("chrome", makeChrome())
})

describe("alarm names", () => {
  it("round-trips an alarm name", () => {
    expect(alarmName("sub-1", 3)).toBe(`${ALARM_PREFIX}:sub-1:3`)
    expect(parseAlarmName(alarmName("sub-1", 3))).toEqual({ id: "sub-1", leadDays: 3 })
  })

  it("ignores alarms this extension did not create", () => {
    expect(parseAlarmName("some-other-alarm")).toBe(null)
    expect(parseAlarmName("")).toBe(null)
    expect(parseAlarmName(undefined)).toBe(null)
  })

  it("ignores malformed reminder names", () => {
    expect(parseAlarmName(`${ALARM_PREFIX}:sub-1`)).toBe(null)
    expect(parseAlarmName(`${ALARM_PREFIX}:sub-1:soon`)).toBe(null)
    expect(parseAlarmName(`${ALARM_PREFIX}::3`)).toBe(null)
  })
})

describe("reminderLeads", () => {
  it("gives the free tier a single reminder (FR-36)", () => {
    expect(reminderLeads({ reminderDaysBefore: [3, 1], license: free })).toEqual([1])
  })

  it("gives paid every configured lead time", () => {
    expect(reminderLeads({ reminderDaysBefore: [3, 1], license: paid })).toEqual([3, 1])
    expect(reminderLeads({ reminderDaysBefore: [7, 3, 1], license: paid })).toHaveLength(3)
  })

  it("falls back to the defaults when settings are missing or empty", () => {
    expect(reminderLeads({ license: paid })).toEqual([3, 1])
    expect(reminderLeads({ reminderDaysBefore: [], license: paid })).toEqual([3, 1])
    expect(reminderLeads(undefined, free)).toEqual([1])
  })

  it("drops values that are not sensible day counts", () => {
    expect(reminderLeads({ reminderDaysBefore: [3, -1, "x", 0], license: paid })).toEqual([3, 0])
  })
})

describe("syncAlarms", () => {
  it("schedules one reminder per lead day for paid users", async () => {
    const result = await syncAlarms([base], { reminderDaysBefore: [3, 1], license: paid }, NOW)
    expect(result.scheduled).toBe(2)
    expect([...scheduled.keys()]).toEqual([`${ALARM_PREFIX}:sub-1:3`, `${ALARM_PREFIX}:sub-1:1`])
  })

  it("schedules only the nearest reminder for free users", async () => {
    const result = await syncAlarms([base], { reminderDaysBefore: [3, 1], license: free }, NOW)
    expect(result.scheduled).toBe(1)
    expect([...scheduled.keys()]).toEqual([`${ALARM_PREFIX}:sub-1:1`])
  })

  it("schedules at the start of the lead day, before the charge", async () => {
    await syncAlarms([base], { reminderDaysBefore: [1], license: paid }, NOW)
    const [alarm] = [...scheduled.values()]
    expect(alarm.scheduledTime).toBe(new Date("2026-11-03T00:00:00").getTime())
  })

  it("holds reminders for a snoozed record (FR-26)", async () => {
    const result = await syncAlarms([{ ...base, snoozedUntil: "2026-11-02" }], { reminderDaysBefore: [1], license: paid }, NOW)
    expect(result).toEqual({ scheduled: 0, snoozed: 1 })
    expect(scheduled.size).toBe(0)
  })

  it("skips cancelled, reminder-disabled and past records", async () => {
    const list = [
      { ...base, id: "a", status: "cancelled" },
      { ...base, id: "b", reminderDisabled: true },
      { ...base, id: "c", nextChargeDate: "2026-10-30" }
    ]
    const result = await syncAlarms(list, { reminderDaysBefore: [1], license: paid }, NOW)
    expect(result.scheduled).toBe(0)
  })

  it("clears every alarm when notifications are turned off", async () => {
    scheduled.set("stale", { name: "stale" })
    const result = await syncAlarms([base], { reminderDaysBefore: [1], notificationsEnabled: false, license: paid }, NOW)
    expect(result).toEqual({ scheduled: 0, skipped: "notifications disabled" })
    expect(chrome.alarms.clearAll).toHaveBeenCalled()
    expect(scheduled.size).toBe(0)
  })

  it("removes alarms for records that are gone", async () => {
    await syncAlarms([base], { reminderDaysBefore: [3, 1], license: paid }, NOW)
    await syncAlarms([], { reminderDaysBefore: [3, 1], license: paid }, NOW)
    expect(scheduled.size).toBe(0)
  })
})

describe("updateBadge", () => {
  it("counts live charges due inside the window", async () => {
    const count = await updateBadge([base, { ...base, id: "b", nextChargeDate: "2026-12-30" }], NOW)
    expect(count).toBe(1)
    expect(badge.text).toBe("1")
    expect(badge.color).toBe("#4338CA")
  })

  it("clears the badge when nothing is due", async () => {
    const count = await updateBadge([{ ...base, nextChargeDate: "2026-12-30" }], NOW)
    expect(count).toBe(0)
    expect(badge.text).toBe("")
  })

  it("does not count snoozed, cancelled or undated records", async () => {
    const list = [
      { ...base, id: "a", snoozedUntil: "2026-11-02" },
      { ...base, id: "b", status: "cancelled" },
      { ...base, id: "c", nextChargeDate: "" }
    ]
    expect(await updateBadge(list, NOW)).toBe(0)
  })
})

describe("advanceLapsedTrials", () => {
  it("moves a lapsed trial to active and rolls the charge date", () => {
    const trial = { ...base, status: "trial", nextChargeDate: "2026-10-30", trialEndDate: "2026-10-30" }
    const { subscriptions, changed } = advanceLapsedTrials([trial], NOW)
    expect(changed).toBe(true)
    expect(subscriptions[0].status).toBe("active")
    expect(subscriptions[0].nextChargeDate > "2026-10-30").toBe(true)
  })

  it("leaves running trials and active records alone", () => {
    const list = [base, { ...base, id: "b", status: "trial", nextChargeDate: "2026-11-20", trialEndDate: "2026-11-20" }]
    const { subscriptions, changed } = advanceLapsedTrials(list, NOW)
    expect(changed).toBe(false)
    expect(subscriptions).toEqual(list)
  })
})
