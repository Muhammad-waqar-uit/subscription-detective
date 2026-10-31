import { describe, expect, it } from "vitest"

import { CSV_COLUMNS, csvCell, mergeImported, parseImport, toCsv, toJson } from "../../src/lib/export"

const records = [
  {
    id: "1",
    name: "Notion",
    url: "https://notion.so",
    accountUrl: "https://notion.so/account",
    price: 10,
    currency: "USD",
    billingCycle: "monthly",
    status: "active",
    startDate: "2026-10-31",
    trialEndDate: "",
    nextChargeDate: "2026-11-30",
    category: "productivity",
    notes: 'Team, "shared" plan'
  }
]

describe("csvCell", () => {
  it("quotes every value and doubles inner quotes", () => {
    expect(csvCell('a"b')).toBe('"a""b"')
    expect(csvCell(0)).toBe('"0"')
    expect(csvCell(null)).toBe('""')
    expect(csvCell(undefined)).toBe('""')
  })
})

describe("toCsv", () => {
  it("writes the documented header even with no records", () => {
    expect(toCsv([])).toBe(CSV_COLUMNS.join(","))
  })

  it("writes one line per record with the values in column order", () => {
    const lines = toCsv(records).split("\n")
    expect(lines).toHaveLength(2)
    expect(lines[1]).toContain('"Notion"')
    expect(lines[1]).toContain('"10"')
    expect(lines[1]).toContain('"Team, ""shared"" plan"')
  })

  it("keeps a record whose notes contain a newline inside one quoted cell", () => {
    const csv = toCsv([{ ...records[0], notes: "line one\nline two" }])
    expect(csv.split("\n")).toHaveLength(3)
    expect(csv).toContain('"line one')
    expect(csv).toContain('line two"')
  })
})

describe("toJson", () => {
  it("round-trips through parseImport", () => {
    expect(parseImport(toJson(records))).toEqual(records)
  })

  it("pretty prints so a hand edit is readable", () => {
    expect(toJson(records)).toContain('\n  {')
  })
})

describe("parseImport", () => {
  it("accepts a bare array", () => {
    expect(parseImport(JSON.stringify(records))).toHaveLength(1)
  })

  it("accepts a wrapped export", () => {
    expect(parseImport(JSON.stringify({ subscriptions: records }))).toHaveLength(1)
  })

  it("rejects invalid JSON with a readable message", () => {
    expect(() => parseImport("{not json")).toThrow(/not valid JSON/i)
  })

  it("rejects JSON that is not a record list", () => {
    expect(() => parseImport('{"foo":1}')).toThrow(/array of subscriptions/i)
    expect(() => parseImport("42")).toThrow(/array of subscriptions/i)
  })

  it("rejects a list containing non-objects", () => {
    expect(() => parseImport("[1,2]")).toThrow(/must be an object/i)
    expect(() => parseImport("[null]")).toThrow(/must be an object/i)
  })

  it("treats an empty string as invalid rather than importing nothing", () => {
    expect(() => parseImport("")).toThrow(/not valid JSON/i)
  })
})

describe("mergeImported", () => {
  it("keeps local records and adds new ones", () => {
    const merged = mergeImported([{ id: "1", name: "Old" }], [{ id: "2", name: "New" }])
    expect(merged.map((r) => r.id)).toEqual(["1", "2"])
  })

  it("lets the imported version win on a matching id", () => {
    const merged = mergeImported([{ id: "1", name: "Old" }], [{ id: "1", name: "New" }])
    expect(merged).toEqual([{ id: "1", name: "New" }])
  })

  it("handles empty input on either side", () => {
    expect(mergeImported([], [])).toEqual([])
    expect(mergeImported(undefined, [{ id: "1" }])).toEqual([{ id: "1" }])
    expect(mergeImported([{ id: "1" }], undefined)).toEqual([{ id: "1" }])
  })
})
