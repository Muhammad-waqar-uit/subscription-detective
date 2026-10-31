import { CATEGORIES, LIVE_STATUSES, STATUS_LIST } from "./constants"

/**
 * List filtering (FR-19). Pure so the popup stays a view and the rules are
 * testable: search matches name/notes/URL, status accepts "all", "live" or a
 * concrete status, category accepts "all" or a category.
 */
export const FILTER_ALL = "all"
export const FILTER_LIVE = "live"

export const STATUS_FILTERS = [
  { value: FILTER_ALL, label: "All" },
  { value: FILTER_LIVE, label: "Live" },
  { value: "trial", label: "Trial" },
  { value: "active", label: "Active" },
  { value: "cancelled", label: "Cancelled" }
]

export const CATEGORY_FILTERS = [{ value: FILTER_ALL, label: "All categories" }].concat(
  CATEGORIES.map((category) => ({ value: category, label: category }))
)

export const EMPTY_FILTER = { status: FILTER_ALL, category: FILTER_ALL, query: "" }

function matchesStatus(subscription, status) {
  if (!status || status === FILTER_ALL) return true
  if (status === FILTER_LIVE) return LIVE_STATUSES.includes(subscription?.status)
  return subscription?.status === status
}

function matchesQuery(subscription, query) {
  const needle = String(query ?? "").trim().toLowerCase()
  if (!needle) return true

  const haystack = [subscription?.name, subscription?.notes, subscription?.url, subscription?.accountUrl, subscription?.category]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  return haystack.includes(needle)
}

export function filterSubscriptions(subscriptions = [], filter = EMPTY_FILTER) {
  const { status, category, query } = { ...EMPTY_FILTER, ...filter }

  return (subscriptions ?? []).filter((subscription) => {
    if (!matchesStatus(subscription, status)) return false
    if (category && category !== FILTER_ALL && subscription?.category !== category) return false
    return matchesQuery(subscription, query)
  })
}

/** True when a filter is doing something — used to tell "empty" from "no matches". */
export function isFiltering(filter = EMPTY_FILTER) {
  const { status, category, query } = { ...EMPTY_FILTER, ...filter }
  return (
    (status && status !== FILTER_ALL) ||
    (category && category !== FILTER_ALL) ||
    String(query ?? "").trim() !== ""
  )
}

/** Guard against a filter value that no longer exists in the data. */
export function isValidStatusFilter(value) {
  return value === FILTER_ALL || value === FILTER_LIVE || STATUS_LIST.includes(value)
}
