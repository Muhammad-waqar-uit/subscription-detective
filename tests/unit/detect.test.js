import { describe, expect, it } from "vitest"

import { guessName, hostOf, isSignupButton, scorePage } from "../../src/lib/detect"

describe("hostOf", () => {
  it("strips www and lowercases", () => {
    expect(hostOf("https://WWW.Notion.so/pricing")).toBe("notion.so")
  })

  it("returns an empty string for junk", () => {
    expect(hostOf("not a url")).toBe("")
    expect(hostOf(undefined)).toBe("")
  })
})

describe("guessName", () => {
  it("drops pricing words from the title", () => {
    expect(guessName("Pricing | Notion", "notion.so")).toBe("Notion")
  })

  it("falls back to the domain", () => {
    expect(guessName("", "acme.io")).toBe("Acme")
  })

  it("never returns an empty name", () => {
    expect(guessName("Checkout", "")).toBe("Unknown service")
  })
})

describe("scorePage", () => {
  it("recognises a known service from the domain alone", () => {
    const result = scorePage({ url: "https://www.notion.so/pricing", title: "", text: "" })
    expect(result).not.toBeNull()
    expect(result.name).toBe("Notion")
    expect(result.accountUrl).toContain("notion.so")
  })

  it("returns null for a page with no signals at all", () => {
    expect(scorePage({ url: "https://example.com/blog", title: "Hello", text: "Just a blog post" })).toBeNull()
  })

  it("returns null for an unusable url", () => {
    expect(scorePage({ url: "nonsense" })).toBeNull()
  })

  it("honours muted sites, including subdomains", () => {
    const page = { url: "https://app.notion.so/pricing", text: "free trial" }
    expect(scorePage(page)).not.toBeNull()
    expect(scorePage(page, { mutedSites: ["notion.so"] })).toBeNull()
    expect(scorePage(page, { mutedSites: ["app.notion.so"] })).toBeNull()
  })

  it("needs more than a billing URL on its own", () => {
    expect(scorePage({ url: "https://example.com/checkout" })).toBeNull()
  })

  it("crosses the threshold with a billing URL plus trial wording", () => {
    const result = scorePage({
      url: "https://example.com/checkout",
      title: "Start your free trial",
      text: "billed monthly, cancel anytime"
    })
    expect(result).not.toBeNull()
    expect(result.signals.length).toBeGreaterThan(1)
    expect(result.confidence).toBeGreaterThan(0)
  })

  it("detects a managed/billing page for an existing subscription", () => {
    const result = scorePage({
      url: "https://acme.io/account/billing",
      title: "Manage subscription",
      text: "Manage my subscription and cancel anytime"
    })
    expect(result.isManagePage).toBe(true)
  })

  it("uses extra site rules before the bundled ones", () => {
    const result = scorePage(
      { url: "https://acme.io/checkout", title: "Start trial", text: "free trial" },
      { siteRules: [{ name: "Acme Pro", hosts: ["acme.io"] }] }
    )
    expect(result.name).toBe("Acme Pro")
    expect(result.signals[0]).toContain("Acme Pro")
  })
})

describe("isSignupButton", () => {
  it("matches trial and subscribe labels", () => {
    expect(isSignupButton("Start my free trial")).toBe(true)
    expect(isSignupButton("Subscribe now")).toBe(true)
    expect(isSignupButton("Upgrade to Pro")).toBe(true)
  })

  it("ignores unrelated or oversized labels", () => {
    expect(isSignupButton("Read the docs")).toBe(false)
    expect(isSignupButton("")).toBe(false)
    expect(isSignupButton("x".repeat(80))).toBe(false)
  })
})
