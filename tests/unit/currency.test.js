import { describe, expect, it } from "vitest"

import { CYCLE, STATUS } from "../../src/lib/constants"
import { currenciesInUse, formatMoney, monthlyEquivalent, totals, yearlyEquivalent } from "../../src/lib/currency"

describe("formatMoney", () => {
  it("formats USD without trailing zeros for whole amounts", () => {
    expect(formatMoney(10, "USD")).toBe("$10")
  })

  it("keeps two decimals when there are cents", () => {
    expect(formatMoney(9.5, "USD")).toBe("$9.50")
  })

  it("formats other currencies", () => {
    expect(formatMoney(5, "GBP")).toBe("£5")
  })

  it("returns a dash for unusable input", () => {
    expect(formatMoney("nope", "USD")).toBe("—")
  })
})

describe("monthlyEquivalent", () => {
  it("annualises then divides weekly prices", () => {
    expect(monthlyEquivalent(12, CYCLE.WEEKLY)).toBeCloseTo(52, 2)
  })

  it("passes monthly prices through", () => {
    expect(monthlyEquivalent(10, CYCLE.MONTHLY)).toBe(10)
  })

  it("divides yearly prices by twelve", () => {
    expect(monthlyEquivalent(120, CYCLE.YEARLY)).toBe(10)
  })

  it("normalises a custom day interval", () => {
    expect(monthlyEquivalent(20, CYCLE.CUSTOM, 60)).toBeCloseTo(10.15, 2)
  })

  it("falls back to zero for an unusable custom interval", () => {
    expect(monthlyEquivalent(20, CYCLE.CUSTOM, 0)).toBe(0)
    expect(monthlyEquivalent(20, CYCLE.CUSTOM)).toBe(0)
  })

  it("computes a yearly figure", () => {
    expect(yearlyEquivalent(10, CYCLE.MONTHLY)).toBeCloseTo(120, 2)
  })
})

describe("totals", () => {
  const list = [
    { status: STATUS.ACTIVE, price: 10, currency: "USD", billingCycle: CYCLE.MONTHLY },
    { status: STATUS.TRIAL, price: 120, currency: "USD", billingCycle: CYCLE.YEARLY },
    { status: STATUS.CANCELLED, price: 50, currency: "USD", billingCycle: CYCLE.MONTHLY },
    { status: STATUS.ACTIVE, price: 9, currency: "EUR", billingCycle: CYCLE.MONTHLY }
  ]

  it("sums live subscriptions per month and per year", () => {
    expect(totals(list, "USD")).toEqual({ count: 2, monthly: 20, yearly: 240 })
  })

  it("ignores cancelled records", () => {
    expect(totals(list, "USD").count).toBe(2)
  })

  it("does not silently add different currencies together", () => {
    expect(totals(list, "EUR").monthly).toBe(9)
  })

  it("lists the currencies in use", () => {
    expect(currenciesInUse(list)).toEqual(["EUR", "USD"])
  })
})
