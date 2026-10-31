/**
 * Export / import (FR-29, FR-30). Pure string work, so the CSV quoting and the
 * import validation are unit-tested instead of clicked through by hand.
 */
export const CSV_COLUMNS = [
  "name",
  "url",
  "accountUrl",
  "price",
  "currency",
  "billingCycle",
  "status",
  "startDate",
  "trialEndDate",
  "nextChargeDate",
  "category",
  "notes"
]

/** RFC 4180: wrap in quotes, double any inner quote. */
export function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`
}

export function toCsv(subscriptions = []) {
  const header = CSV_COLUMNS.join(",")
  const rows = (subscriptions ?? []).map((subscription) =>
    CSV_COLUMNS.map((column) => csvCell(subscription?.[column])).join(",")
  )
  return [header, ...rows].join("\n")
}

export function toJson(subscriptions = []) {
  return JSON.stringify(subscriptions ?? [], null, 2)
}

/**
 * Accepts either a bare array or `{ subscriptions: [] }` so a hand-edited or
 * previously wrapped export both import. Throws a message the UI can show.
 */
export function parseImport(text) {
  let parsed
  try {
    parsed = JSON.parse(String(text ?? ""))
  } catch {
    throw new Error("That file is not valid JSON.")
  }

  const incoming = Array.isArray(parsed) ? parsed : parsed?.subscriptions
  if (!Array.isArray(incoming)) throw new Error("Expected an array of subscriptions.")
  if (incoming.some((item) => !item || typeof item !== "object")) {
    throw new Error("Every record must be an object.")
  }

  return incoming
}

/** Imported records win over an existing record with the same id. */
export function mergeImported(existing = [], incoming = []) {
  const byId = new Map()
  for (const item of existing ?? []) byId.set(item?.id, item)
  for (const item of incoming ?? []) byId.set(item?.id, item)
  return [...byId.values()]
}
