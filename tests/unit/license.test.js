import { describe, expect, it } from "vitest"

import { FREE_LIMIT, STATUS } from "../../src/lib/constants"
import {
  activeCount,
  canAdd,
  capabilities,
  isPaid,
  licenseIsStale,
  remainingFreeSlots
} from "../../src/lib/license"

const live = (id) => ({ id, status: STATUS.ACTIVE })
const free = { plan: "free", status: "unknown", checkedAt: null }
const paid = { plan: "paid", status: "active", checkedAt: "2026-10-31T00:00:00Z" }

describe("isPaid", () => {
  it("treats missing or free licences as free", () => {
    expect(isPaid(null)).toBe(false)
    expect(isPaid(undefined)).toBe(false)
    expect(isPaid(free)).toBe(false)
  })

  it("accepts an active paid licence", () => {
    expect(isPaid(paid)).toBe(true)
    expect(isPaid({ plan: "paid" })).toBe(true)
  })

  it("stops granting paid features once the licence is deactivated", () => {
    for (const status of ["expired", "cancelled", "deactivated", "refunded", "revoked"]) {
      expect(isPaid({ plan: "paid", status })).toBe(false)
    }
  })

  it("is case insensitive about status", () => {
    expect(isPaid({ plan: "paid", status: "Deactivated" })).toBe(false)
  })
})

describe("free tier limits", () => {
  it("counts only live records", () => {
    const list = [live("a"), { id: "b", status: STATUS.CANCELLED }, { id: "c", status: STATUS.TRIAL }]
    expect(activeCount(list)).toBe(2)
  })

  it("allows records below the cap", () => {
    expect(canAdd([live("a"), live("b")], free)).toBe(true)
    expect(remainingFreeSlots([live("a")], free)).toBe(FREE_LIMIT - 1)
  })

  it("blocks the record that would exceed the cap", () => {
    const full = Array.from({ length: FREE_LIMIT }, (_, i) => live(String(i)))
    expect(canAdd(full, free)).toBe(false)
    expect(remainingFreeSlots(full, free)).toBe(0)
  })

  it("does not count cancelled records against the cap", () => {
    const list = [live("a"), live("b"), { id: "c", status: STATUS.EXPIRED }]
    expect(canAdd(list, free)).toBe(true)
  })

  it("lifts the cap for paid users", () => {
    const full = Array.from({ length: 10 }, (_, i) => live(String(i)))
    expect(canAdd(full, paid)).toBe(true)
    expect(remainingFreeSlots(full, paid)).toBe(Number.POSITIVE_INFINITY)
  })
})

describe("capabilities", () => {
  it("gates paid-only features on the free tier", () => {
    const caps = capabilities([live("a")], free)
    expect(caps).toMatchObject({
      paid: false,
      maxSubscriptions: FREE_LIMIT,
      export: false,
      spendSummary: false,
      multipleReminders: false
    })
  })

  it("unlocks them for paid users", () => {
    const caps = capabilities([live("a")], paid)
    expect(caps).toMatchObject({ paid: true, export: true, spendSummary: true, canAdd: true })
  })
})

describe("licenseIsStale", () => {
  it("is stale when never checked", () => {
    expect(licenseIsStale(free)).toBe(true)
  })

  it("is fresh within the window and stale after it", () => {
    const now = new Date("2026-10-31T12:00:00Z")
    expect(licenseIsStale({ checkedAt: "2026-10-31T06:00:00Z" }, now, 24)).toBe(false)
    expect(licenseIsStale({ checkedAt: "2026-10-25T06:00:00Z" }, now, 24)).toBe(true)
  })
})
