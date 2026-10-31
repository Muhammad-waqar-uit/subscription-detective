import { describe, expect, it } from "vitest"

import {
  EMPTY_FILTER,
  FILTER_LIVE,
  filterSubscriptions,
  isFiltering,
  isValidStatusFilter
} from "../../src/lib/filters"

const records = [
  { id: "1", name: "Notion", status: "active", category: "productivity", notes: "team wiki", url: "https://notion.so" },
  { id: "2", name: "Spotify", status: "trial", category: "music", notes: "", url: "https://spotify.com" },
  { id: "3", name: "Netflix", status: "cancelled", category: "entertainment", notes: "shared with family", url: "https://netflix.com" }
]

describe("filterSubscriptions", () => {
  it("returns everything for the empty filter", () => {
    expect(filterSubscriptions(records, EMPTY_FILTER)).toHaveLength(3)
  })

  it("defaults to showing everything when no filter is passed", () => {
    expect(filterSubscriptions(records)).toHaveLength(3)
    expect(filterSubscriptions()).toEqual([])
  })

  it("filters by live status, which means trial plus active", () => {
    const live = filterSubscriptions(records, { status: FILTER_LIVE })
    expect(live.map((record) => record.id)).toEqual(["1", "2"])
  })

  it("filters by one concrete status", () => {
    expect(filterSubscriptions(records, { status: "cancelled" }).map((r) => r.id)).toEqual(["3"])
  })

  it("filters by category", () => {
    expect(filterSubscriptions(records, { category: "music" }).map((r) => r.id)).toEqual(["2"])
  })

  it("searches name, notes and url case-insensitively", () => {
    expect(filterSubscriptions(records, { query: "spot" }).map((r) => r.id)).toEqual(["2"])
    expect(filterSubscriptions(records, { query: "TEAM WIKI" }).map((r) => r.id)).toEqual(["1"])
    expect(filterSubscriptions(records, { query: "netflix.com" }).map((r) => r.id)).toEqual(["3"])
  })

  it("ignores whitespace-only searches", () => {
    expect(filterSubscriptions(records, { query: "   " })).toHaveLength(3)
  })

  it("combines filters", () => {
    expect(filterSubscriptions(records, { status: FILTER_LIVE, category: "music" }).map((r) => r.id)).toEqual(["2"])
    expect(filterSubscriptions(records, { status: FILTER_LIVE, category: "music", query: "notion" })).toEqual([])
  })

  it("returns an empty list rather than throwing on odd input", () => {
    expect(filterSubscriptions([], { status: "active" })).toEqual([])
    expect(filterSubscriptions(null)).toEqual([])
    expect(filterSubscriptions([{ id: "x", name: "Xero" }], { query: "xero" })).toHaveLength(1)
  })
})

describe("isFiltering", () => {
  it("is false for the empty filter", () => {
    expect(isFiltering(EMPTY_FILTER)).toBe(false)
    expect(isFiltering({ status: "all", category: "all", query: " " })).toBe(false)
  })

  it("is true when any dimension narrows the list", () => {
    expect(isFiltering({ status: "trial" })).toBe(true)
    expect(isFiltering({ category: "music" })).toBe(true)
    expect(isFiltering({ query: "spot" })).toBe(true)
  })
})

describe("isValidStatusFilter", () => {
  it("accepts the sentinels and real statuses", () => {
    expect(isValidStatusFilter("all")).toBe(true)
    expect(isValidStatusFilter(FILTER_LIVE)).toBe(true)
    expect(isValidStatusFilter("trial")).toBe(true)
  })

  it("rejects anything else", () => {
    expect(isValidStatusFilter("archived")).toBe(false)
    expect(isValidStatusFilter(undefined)).toBe(false)
  })
})
