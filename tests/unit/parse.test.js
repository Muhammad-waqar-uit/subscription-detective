import { describe, expect, it } from "vitest"

import {
  detectCycle,
  extractSubscriptionHints,
  parsePrice,
  parseRenewsOn,
  parseTrialDays
} from "../../src/lib/parse"

describe("parsePrice", () => {
  it("reads a dollar price with a monthly cycle", () => {
    expect(parsePrice("Only $10/month")).toEqual({ amount: 10, currency: "USD", cycle: "monthly" })
  })

  it("reads a decimal comma and euro symbol", () => {
    expect(parsePrice("9,99 € per month")).toEqual({ amount: 9.99, currency: "EUR", cycle: "monthly" })
  })

  it("reads a currency code after the amount and strips thousands separators", () => {
    expect(parsePrice("1,299.00 USD billed annually")).toEqual({ amount: 1299, currency: "USD", cycle: "yearly" })
  })

  it("reads a pound price", () => {
    expect(parsePrice("£5/mo")).toEqual({ amount: 5, currency: "GBP", cycle: "monthly" })
  })

  it("returns null when there is no amount", () => {
    expect(parsePrice("No price here")).toBeNull()
    expect(parsePrice("")).toBeNull()
    expect(parsePrice(null)).toBeNull()
  })

  it("leaves the cycle null when it is not stated", () => {
    expect(parsePrice("$12")).toEqual({ amount: 12, currency: "USD", cycle: null })
  })
})

describe("detectCycle", () => {
  it("recognises yearly, monthly and weekly wording", () => {
    expect(detectCycle("billed annually")).toBe("yearly")
    expect(detectCycle("per year")).toBe("yearly")
    expect(detectCycle("billed monthly")).toBe("monthly")
    expect(detectCycle("each week")).toBe("weekly")
    expect(detectCycle("one payment")).toBeNull()
  })
})

describe("parseTrialDays", () => {
  it("reads an N-day trial", () => {
    expect(parseTrialDays("Start your 14-day free trial")).toBe(14)
    expect(parseTrialDays("14 days free")).toBe(14)
  })

  it("reads 'free for N days' and 'after N days'", () => {
    expect(parseTrialDays("free for 30 days")).toBe(30)
    expect(parseTrialDays("then $9 after 7 days")).toBe(7)
  })

  it("converts weeks and months", () => {
    expect(parseTrialDays("2 week free trial")).toBe(14)
    expect(parseTrialDays("1 month free")).toBe(30)
  })

  it("returns null when no trial length is present", () => {
    expect(parseTrialDays("Subscribe today")).toBeNull()
    expect(parseTrialDays(null)).toBeNull()
  })
})

describe("parseRenewsOn", () => {
  it("reads an ISO date", () => {
    expect(parseRenewsOn("renews on 2026-11-14")).toBe("2026-11-14")
  })

  it("reads a day-month-year date", () => {
    expect(parseRenewsOn("renews on 14 November 2026")).toBe("2026-11-14")
  })

  it("reads a month-day-year date", () => {
    expect(parseRenewsOn("Next payment: November 4, 2026")).toBe("2026-11-04")
  })

  it("returns null when no date is present", () => {
    expect(parseRenewsOn("renews automatically")).toBeNull()
  })
})

describe("extractSubscriptionHints", () => {
  it("combines price, cycle and trial length for the banner prefill", () => {
    expect(extractSubscriptionHints("Start your 14-day free trial, then $12.99 per month")).toEqual({
      price: 12.99,
      currency: "USD",
      billingCycle: "monthly",
      trialDays: 14,
      renewsOn: null
    })
  })
})
