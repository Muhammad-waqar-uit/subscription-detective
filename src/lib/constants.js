/** Shared vocabulary for Subscription Detective. Keep in sync with requirements §3 and §5. */

export const STATUS = {
  TRIAL: "trial",
  ACTIVE: "active",
  CANCELLED: "cancelled",
  EXPIRED: "expired"
}

export const STATUS_LIST = [STATUS.TRIAL, STATUS.ACTIVE, STATUS.CANCELLED, STATUS.EXPIRED]

/** Statuses that count toward the free-tier limit and toward spend totals. */
export const LIVE_STATUSES = [STATUS.TRIAL, STATUS.ACTIVE]

export const CYCLE = {
  WEEKLY: "weekly",
  MONTHLY: "monthly",
  YEARLY: "yearly",
  CUSTOM: "custom"
}

export const CYCLE_LIST = [CYCLE.WEEKLY, CYCLE.MONTHLY, CYCLE.YEARLY, CYCLE.CUSTOM]

export const CATEGORIES = [
  "productivity",
  "entertainment",
  "music",
  "software",
  "health",
  "education",
  "finance",
  "shopping",
  "other"
]

/** Default reminder lead times, in days before the charge (FR-21). */
export const DEFAULT_REMINDER_DAYS = [3, 1]

/** Badge window for charges due soon (FR-24). */
export const BADGE_WINDOW_DAYS = 7

/** Free tier cap (FR-34). */
export const FREE_LIMIT = 3

/** Detection score at which we are confident enough to show a banner (FR-5). */
export const DETECTION_THRESHOLD = 25

export const STORAGE_KEYS = {
  SUBSCRIPTIONS: "subscriptions",
  SETTINGS: "settings"
}

export const SCHEMA_VERSION = 1
