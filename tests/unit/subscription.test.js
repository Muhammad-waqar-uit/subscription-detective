import { describe, expect, it } from "vitest"

import { CYCLE, STATUS } from "../../src/lib/constants"
import {
  applyStatusChange,
  createSubscription,
  newId,
  sortByNextCharge,
  validateSubscription
} from "../../src/lib/subscription"

const NOW = new Date("2026-10-31T10:00:00Z")

describe("newId", () => {
  it("produces unique ids", () => {
    const ids = new Set(Array.from({ length: 50 }, () => newId()))
    expect(ids.size).toBe(50)
  })
})

describe("createSubscription", () => {
  it("fills sensible defaults and computes the next charge from the cycle", () => {
    const created = createSubscription(
      { name: "Notion", price: "10", billingCycle: CYCLE.MONTHLY, startDate: "2026-10-31" },
      NOW
    )

    expect(created.id).toBeTruthy()
    expect(created.price).toBe(10)
    expect(created.currency).toBe("USD")
    expect(created.status).toBe(STATUS.ACTIVE)
    expect(created.nextChargeDate).toBe("2026-11-30")
    expect(created.createdAt).toBe(NOW.toISOString())
    expect(created.updatedAt).toBe(NOW.toISOString())
  })

  it("treats a trial-length hint as a trial with an end date", () => {
    const created = createSubscription(
      { name: "Figma", price: 12, trialDays: 14, startDate: "2026-10-31" },
      NOW
    )

    expect(created.status).toBe(STATUS.TRIAL)
    expect(created.trialEndDate).toBe("2026-11-14")
    expect(created.nextChargeDate).toBe("2026-11-14")
  })

  it("keeps an explicit charge date over the computed one", () => {
    const created = createSubscription(
      { name: "Adobe", nextChargeDate: "2027-01-05", startDate: "2026-10-31" },
      NOW
    )
    expect(created.nextChargeDate).toBe("2027-01-05")
  })

  it("rejects nonsense prices and cycles without throwing", () => {
    const created = createSubscription({ name: "Odd", price: "free", billingCycle: "hourly" }, NOW)
    expect(created.price).toBe(0)
    expect(created.billingCycle).toBe(CYCLE.MONTHLY)
  })

  it("stores custom cycle days only for custom cycles", () => {
    expect(createSubscription({ name: "A", billingCycle: CYCLE.CUSTOM, customCycleDays: 45 }, NOW).customCycleDays).toBe(45)
    expect(createSubscription({ name: "B", billingCycle: CYCLE.MONTHLY, customCycleDays: 45 }, NOW).customCycleDays).toBeNull()
  })
})

describe("validateSubscription", () => {
  it("requires a name", () => {
    const result = validateSubscription({ name: "  " })
    expect(result.valid).toBe(false)
    expect(result.errors.name).toBeTruthy()
  })

  it("rejects a negative price", () => {
    expect(validateSubscription({ name: "A", price: -5 }).errors.price).toBeTruthy()
  })

  it("requires days for a custom cycle", () => {
    expect(validateSubscription({ name: "A", billingCycle: CYCLE.CUSTOM }).errors.customCycleDays).toBeTruthy()
    expect(validateSubscription({ name: "A", billingCycle: CYCLE.CUSTOM, customCycleDays: 30 }).valid).toBe(true)
  })

  it("rejects a trial that ends before it starts", () => {
    const result = validateSubscription({ name: "A", startDate: "2026-10-31", trialEndDate: "2026-10-01" })
    expect(result.errors.trialEndDate).toBeTruthy()
  })

  it("accepts a normal record", () => {
    expect(validateSubscription({ name: "Notion", price: 10, billingCycle: CYCLE.MONTHLY }).valid).toBe(true)
  })
})

describe("applyStatusChange", () => {
  const trial = {
    id: "a",
    status: STATUS.TRIAL,
    trialEndDate: "2026-11-14",
    nextChargeDate: "2026-11-14",
    billingCycle: CYCLE.MONTHLY
  }

  it("disables reminders when cancelled", () => {
    const cancelled = applyStatusChange(trial, STATUS.CANCELLED, NOW)
    expect(cancelled.status).toBe(STATUS.CANCELLED)
    expect(cancelled.reminderDisabled).toBe(true)
  })

  it("clears the trial end when a trial converts to active", () => {
    const active = applyStatusChange(trial, STATUS.ACTIVE, NOW)
    expect(active.status).toBe(STATUS.ACTIVE)
    expect(active.trialEndDate).toBe("")
    expect(active.reminderDisabled).toBe(false)
  })

  it("ignores unknown statuses", () => {
    expect(applyStatusChange(trial, "paused", NOW)).toBe(trial)
  })
})

describe("sortByNextCharge", () => {
  it("orders by the next charge date, undated last", () => {
    const list = [
      { id: "c", nextChargeDate: "" },
      { id: "b", nextChargeDate: "2026-12-01" },
      { id: "a", nextChargeDate: "2026-11-05" }
    ]
    expect(sortByNextCharge(list).map((item) => item.id)).toEqual(["a", "b", "c"])
  })
})
