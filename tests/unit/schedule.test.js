import { describe, expect, it } from "vitest"

import { CYCLE, STATUS } from "../../src/lib/constants"
import {
  chargesDueSoon,
  daysUntil,
  isoDate,
  nextChargeDate,
  reminderAt,
  rollForward,
  upcomingReminders
} from "../../src/lib/schedule"

const iso = (date) => isoDate(date)

describe("nextChargeDate", () => {
  it("adds a week for weekly cycles", () => {
    expect(iso(nextChargeDate("2026-10-31", CYCLE.WEEKLY))).toBe("2026-11-07")
  })

  it("adds a month for monthly cycles", () => {
    expect(iso(nextChargeDate("2026-10-31", CYCLE.MONTHLY))).toBe("2026-11-30")
  })

  it("clamps to the end of a short month", () => {
    expect(iso(nextChargeDate("2026-01-31", CYCLE.MONTHLY))).toBe("2026-02-28")
  })

  it("handles a leap year February", () => {
    expect(iso(nextChargeDate("2024-01-31", CYCLE.MONTHLY))).toBe("2024-02-29")
  })

  it("adds a year for yearly cycles", () => {
    expect(iso(nextChargeDate("2026-03-15", CYCLE.YEARLY))).toBe("2027-03-15")
  })

  it("supports a custom day interval", () => {
    expect(iso(nextChargeDate("2026-10-01", CYCLE.CUSTOM, 45))).toBe("2026-11-15")
  })

  it("returns null for an unusable custom interval", () => {
    expect(nextChargeDate("2026-10-01", CYCLE.CUSTOM, 0)).toBeNull()
    expect(nextChargeDate("2026-10-01", CYCLE.CUSTOM, "abc")).toBeNull()
  })

  it("returns null for an unknown cycle or invalid date", () => {
    expect(nextChargeDate("2026-10-01", "fortnightly")).toBeNull()
    expect(nextChargeDate("not-a-date", CYCLE.MONTHLY)).toBeNull()
  })
})

describe("daysUntil", () => {
  it("counts whole calendar days ahead", () => {
    expect(daysUntil("2026-11-03", new Date("2026-10-31T22:00:00"))).toBe(3)
  })

  it("goes negative once the date has passed", () => {
    expect(daysUntil("2026-10-30", new Date("2026-10-31T09:00:00"))).toBe(-1)
  })

  it("returns null for an invalid date", () => {
    expect(daysUntil("", new Date())).toBeNull()
  })
})

describe("reminders", () => {
  const trial = {
    id: "a",
    status: STATUS.TRIAL,
    trialEndDate: "2026-11-14",
    nextChargeDate: "2026-11-14",
    billingCycle: CYCLE.MONTHLY
  }

  it("reminds 3 days and 1 day before the trial ends", () => {
    const now = new Date("2026-10-31T08:00:00")
    expect(iso(reminderAt(trial, 3))).toBe("2026-11-11")
    expect(iso(reminderAt(trial, 1))).toBe("2026-11-13")
    expect(upcomingReminders(trial, { reminderDaysBefore: [3, 1] }, now)).toHaveLength(2)
  })

  it("drops reminders that are already in the past", () => {
    const now = new Date("2026-11-12T08:00:00")
    const upcoming = upcomingReminders(trial, { reminderDaysBefore: [3, 1] }, now)
    expect(upcoming).toHaveLength(1)
    expect(upcoming[0].days).toBe(1)
  })

  it("never reminds for cancelled or expired records", () => {
    expect(upcomingReminders({ ...trial, status: STATUS.CANCELLED }, {}, new Date("2026-10-31"))).toEqual([])
  })

  it("falls back to the default lead times when settings are empty", () => {
    expect(upcomingReminders(trial, {}, new Date("2026-10-31T08:00:00"))).toHaveLength(2)
  })
})

describe("rollForward", () => {
  it("converts a lapsed trial to active and advances the charge date", () => {
    const lapsed = {
      status: STATUS.TRIAL,
      trialEndDate: "2026-10-01",
      nextChargeDate: "2026-10-01",
      billingCycle: CYCLE.MONTHLY
    }
    const rolled = rollForward(lapsed, new Date("2026-10-05T00:00:00"))
    expect(rolled.status).toBe(STATUS.ACTIVE)
    expect(rolled.nextChargeDate).toBe("2026-11-01")
  })

  it("leaves a trial that has not ended alone", () => {
    const trial = { status: STATUS.TRIAL, nextChargeDate: "2026-12-01", billingCycle: CYCLE.MONTHLY }
    expect(rollForward(trial, new Date("2026-10-31"))).toBe(trial)
  })
})

describe("chargesDueSoon", () => {
  it("counts only live records inside the window", () => {
    const now = new Date("2026-10-31T09:00:00")
    const list = [
      { status: STATUS.ACTIVE, nextChargeDate: "2026-11-02" },
      { status: STATUS.TRIAL, nextChargeDate: "2026-11-06" },
      { status: STATUS.ACTIVE, nextChargeDate: "2026-12-30" },
      { status: STATUS.CANCELLED, nextChargeDate: "2026-11-01" }
    ]
    expect(chargesDueSoon(list, 7, now)).toHaveLength(2)
  })
})
