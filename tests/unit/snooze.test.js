import { describe, expect, it } from "vitest"

import { SNOOZE_OPTIONS, clearSnooze, isSnoozed, snooze, snoozeLabel } from "../../src/lib/snooze"

const NOW = new Date("2026-10-31T09:00:00")
const base = { id: "abc", name: "Notion", status: "active", nextChargeDate: "2026-11-04", reminderDisabled: false }

describe("snooze", () => {
  it("stores an ISO end date and keeps the charge date", () => {
    const result = snooze(base, 3, NOW)
    expect(result.snoozedUntil).toBe("2026-11-03")
    expect(result.nextChargeDate).toBe(base.nextChargeDate)
    expect(result.status).toBe("active")
  })

  it("does not mutate the record it was given", () => {
    const copy = { ...base }
    snooze(copy, 1, NOW)
    expect(copy).toEqual(base)
  })

  it("ignores an invalid duration instead of silently silencing reminders forever", () => {
    expect(snooze(base, 0, NOW)).toBe(base)
    expect(snooze(base, -2, NOW)).toBe(base)
    expect(snooze(base, Number.NaN, NOW)).toBe(base)
    expect(snooze(null, 1, NOW)).toBe(null)
  })

  it("is snoozed until the day it was snoozed to, then wakes", () => {
    const snoozed = snooze(base, 3, NOW)
    expect(isSnoozed(snoozed, NOW)).toBe(true)
    expect(isSnoozed(snoozed, new Date("2026-11-02T23:00:00"))).toBe(true)
    expect(isSnoozed(snoozed, new Date("2026-11-03T00:01:00"))).toBe(false)
  })

  it("treats a record without snoozedUntil as awake", () => {
    expect(isSnoozed(base, NOW)).toBe(false)
    expect(isSnoozed({ ...base, snoozedUntil: "" }, NOW)).toBe(false)
    expect(isSnoozed(undefined, NOW)).toBe(false)
  })

  it("clears the snooze without touching the rest of the record", () => {
    const snoozed = snooze(base, 7, NOW)
    const woken = clearSnooze(snoozed, NOW)
    expect(woken).not.toHaveProperty("snoozedUntil")
    expect(woken.nextChargeDate).toBe(base.nextChargeDate)
    expect(woken.updatedAt).toBe(NOW.toISOString())
    expect(isSnoozed(woken, NOW)).toBe(false)
  })

  it("labels the remaining time for the card", () => {
    expect(snoozeLabel(snooze(base, 3, NOW), NOW)).toBe("3d left")
    expect(snoozeLabel(snooze(base, 1, NOW), NOW)).toBe("1d left")
    expect(snoozeLabel(base, NOW)).toBe("")
  })

  it("offers the documented options", () => {
    expect(SNOOZE_OPTIONS.map((option) => option.days)).toEqual([1, 3, 7])
  })
})
