import {
  ArrowUpRight,
  Ban,
  Bell,
  BellOff,
  Check,
  ListFilter,
  Pencil,
  Plus,
  Search,
  Settings as SettingsIcon,
  Trash2
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import "../styles/tailwind.css"
import { CATEGORIES, CYCLE, CYCLE_LIST, LIVE_STATUSES, STATUS } from "../lib/constants"
import { formatMoney, totals } from "../lib/currency"
import { CATEGORY_FILTERS, EMPTY_FILTER, STATUS_FILTERS, filterSubscriptions } from "../lib/filters"
import { capabilities } from "../lib/license"
import { daysUntil, isoDate } from "../lib/schedule"
import { SNOOZE_OPTIONS, clearSnooze, isSnoozed, snooze, snoozeLabel } from "../lib/snooze"
import { getSettings, getSubscriptions, removeSubscription, upsertSubscription } from "../lib/storage"
import { applyStatusChange, createSubscription, sortByNextCharge, validateSubscription } from "../lib/subscription"

const STATUS_STYLES = {
  [STATUS.TRIAL]: "pill-trial",
  [STATUS.ACTIVE]: "pill-active",
  [STATUS.CANCELLED]: "pill-muted",
  [STATUS.EXPIRED]: "pill-muted"
}

const EMPTY_FORM = {
  name: "",
  url: "",
  accountUrl: "",
  price: "",
  currency: "USD",
  billingCycle: CYCLE.MONTHLY,
  customCycleDays: "",
  status: STATUS.ACTIVE,
  startDate: isoDate(new Date()),
  trialEndDate: "",
  category: "other",
  notes: ""
}

function extensionIcon() {
  try {
    const icons = chrome.runtime.getManifest().icons ?? {}
    const path = icons[48] ?? icons[128] ?? Object.values(icons)[0]
    return path ? chrome.runtime.getURL(path) : null
  } catch {
    return null
  }
}

function dueLabel(subscription) {
  const target = subscription.trialEndDate || subscription.nextChargeDate
  const days = daysUntil(target)
  if (days === null) return "no date"
  if (days < 0) return `${Math.abs(days)}d overdue`
  if (days === 0) return "today"
  if (days === 1) return "tomorrow"
  return `in ${days}d`
}

export default function Popup() {
  const [subscriptions, setSubscriptions] = useState([])
  const [settings, setSettings] = useState(null)
  const [form, setForm] = useState(null)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState(EMPTY_FILTER)

  const caps = useMemo(() => (settings ? capabilities(subscriptions, settings.license) : null), [subscriptions, settings])
  const summary = useMemo(
    () => totals(subscriptions, settings?.defaultCurrency ?? "USD"),
    [subscriptions, settings]
  )
  const visible = useMemo(() => filterSubscriptions(subscriptions, filter), [subscriptions, filter])
  const icon = useMemo(extensionIcon, [])

  async function load() {
    const [list, currentSettings] = await Promise.all([getSubscriptions(), getSettings()])
    setSubscriptions(sortByNextCharge(list))
    setSettings(currentSettings)
    setLoading(false)
  }

  useEffect(() => {
    load().catch((error) => console.error("[subscription-detective] popup load failed", error))
  }, [])

  function openForm(preset = {}) {
    if (caps && !caps.canAdd) return
    setErrors({})
    setForm({ ...EMPTY_FORM, currency: settings?.defaultCurrency ?? "USD", ...preset })
  }

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function setFilterField(field, value) {
    setFilter((current) => ({ ...current, [field]: value }))
  }

  async function handleSave(event) {
    event.preventDefault()
    const result = validateSubscription(form)
    setErrors(result.errors)
    if (!result.valid) return

    const created = createSubscription(form)
    await upsertSubscription(created)
    setForm(null)
    await load()
  }

  async function handleDelete(subscription) {
    const confirmed = window.confirm(`Delete ${subscription.name}? This cannot be undone.`)
    if (!confirmed) return
    await removeSubscription(subscription.id)
    await load()
  }

  async function handleStatus(subscription, status) {
    await upsertSubscription(applyStatusChange(subscription, status))
    await load()
  }

  async function handleSnooze(subscription, days) {
    await upsertSubscription(snooze(subscription, days))
    await load()
  }

  async function handleWake(subscription) {
    await upsertSubscription(clearSnooze(subscription))
    await load()
  }

  if (loading) {
    return <div className="w-[380px] bg-ink-50 p-6 text-sm text-ink-500">Loading…</div>
  }

  return (
    <div className="w-[380px] bg-ink-50">
      <header className="flex items-center justify-between gap-2 bg-ink-800 px-4 py-3 text-white">
        <div className="flex items-center gap-2.5">
          {icon ? (
            <img src={icon} alt="" className="h-7 w-7 rounded-lg" />
          ) : (
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/10">
              <Search size={14} strokeWidth={2} />
            </span>
          )}
          <div>
            <h1 className="text-sm font-semibold leading-tight tracking-tight">Subscription Detective</h1>
            <p className="text-[11px] leading-tight text-ink-300">
              {summary.count} tracked · {caps?.paid ? "paid plan" : "free plan"}
            </p>
          </div>
        </div>
        <button
          className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2 py-1 text-xs font-medium text-ink-100 transition-colors hover:bg-white/10"
          onClick={() => chrome.runtime.openOptionsPage()}
          aria-label="Open settings">
          <SettingsIcon size={13} strokeWidth={1.75} />
          Settings
        </button>
      </header>

      <div className="grid grid-cols-2 divide-x divide-ink-100 border-b border-ink-200 bg-white">
        <div className="px-4 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-400">Per month</p>
          <p className="text-lg font-semibold tracking-tight text-ink-900">
            {formatMoney(summary.monthly, settings?.defaultCurrency)}
          </p>
        </div>
        <div className="px-4 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-400">Per year</p>
          <p className="text-lg font-semibold tracking-tight text-ink-600">
            {formatMoney(summary.yearly, settings?.defaultCurrency)}
          </p>
        </div>
      </div>

      {form ? (
        <form className="space-y-2.5 border-b border-ink-200 bg-white p-4" onSubmit={handleSave}>
          <div>
            <label className="label" htmlFor="name">Service name</label>
            <input id="name" value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Notion" />
            {errors.name && <p className="mt-1 text-xs text-rust-600">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label" htmlFor="price">Price</label>
              <input id="price" value={form.price} onChange={(event) => update("price", event.target.value)} placeholder="10" inputMode="decimal" />
              {errors.price && <p className="mt-1 text-xs text-rust-600">{errors.price}</p>}
            </div>
            <div>
              <label className="label" htmlFor="currency">Currency</label>
              <select id="currency" value={form.currency} onChange={(event) => update("currency", event.target.value)}>
                {["USD", "EUR", "GBP", "INR", "CAD", "AUD"].map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label" htmlFor="cycle">Billing cycle</label>
              <select id="cycle" value={form.billingCycle} onChange={(event) => update("billingCycle", event.target.value)}>
                {CYCLE_LIST.map((cycle) => (
                  <option key={cycle} value={cycle}>{cycle}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="status">Status</label>
              <select id="status" value={form.status} onChange={(event) => update("status", event.target.value)}>
                {[STATUS.TRIAL, STATUS.ACTIVE].map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="category">Category</label>
              <select id="category" value={form.category} onChange={(event) => update("category", event.target.value)}>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>

          {form.billingCycle === CYCLE.CUSTOM && (
            <div>
              <label className="label" htmlFor="customDays">Custom cycle (days)</label>
              <input id="customDays" value={form.customCycleDays} onChange={(event) => update("customCycleDays", event.target.value)} inputMode="numeric" />
              {errors.customCycleDays && <p className="mt-1 text-xs text-rust-600">{errors.customCycleDays}</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label" htmlFor="startDate">Start date</label>
              <input id="startDate" type="date" value={form.startDate} onChange={(event) => update("startDate", event.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="trialEnd">Trial ends</label>
              <input id="trialEnd" type="date" value={form.trialEndDate} onChange={(event) => update("trialEndDate", event.target.value)} />
              {errors.trialEndDate && <p className="mt-1 text-xs text-rust-600">{errors.trialEndDate}</p>}
            </div>
          </div>

          <div>
            <label className="label" htmlFor="accountUrl">Account page</label>
            <input id="accountUrl" value={form.accountUrl} onChange={(event) => update("accountUrl", event.target.value)} placeholder="https://service.com/account" />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" className="btn-ghost" onClick={() => setForm(null)}>Cancel</button>
            <button type="submit" className="btn-primary">
              <Check size={14} strokeWidth={2} />
              Save
            </button>
          </div>
        </form>
      ) : null}

      {subscriptions.length > 0 && (
        <div className="space-y-2 border-b border-ink-200 bg-white px-3 py-2.5">
          <div className="relative">
            <Search
              size={14}
              strokeWidth={1.75}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400"
            />
            <input
              id="search"
              type="search"
              className="pl-8"
              value={filter.query}
              onChange={(event) => setFilterField("query", event.target.value)}
              placeholder="Search name, notes, URL"
              aria-label="Search subscriptions"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Filter by status">
            {STATUS_FILTERS.map((option) => {
              const active = filter.status === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                    active
                      ? "bg-ink-800 text-white"
                      : "bg-ink-100 text-ink-600 hover:bg-ink-200 hover:text-ink-800"
                  }`}
                  onClick={() => setFilterField("status", option.value)}>
                  {option.label}
                </button>
              )
            })}
          </div>

          <div className="relative">
            <ListFilter
              size={13}
              strokeWidth={1.75}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400"
            />
            <select
              id="filterCategory"
              aria-label="Filter by category"
              className="!py-1 pl-8 !text-xs text-ink-600"
              value={filter.category}
              onChange={(event) => setFilterField("category", event.target.value)}>
              {CATEGORY_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <ul className="max-h-[300px] space-y-2 overflow-y-auto p-3">
        {subscriptions.length === 0 && (
          <li className="card text-center text-sm text-ink-500">
            Nothing tracked yet. Visit a signup page and confirm the banner, or add one manually.
          </li>
        )}

        {subscriptions.length > 0 && visible.length === 0 && (
          <li className="card text-center text-sm text-ink-500">
            No records match this filter.
            <button className="ml-2 text-xs font-medium text-ink-800 underline decoration-ink-300 underline-offset-2 hover:decoration-ink-800" onClick={() => setFilter(EMPTY_FILTER)}>
              Clear
            </button>
          </li>
        )}

        {visible.map((subscription) => {
          const snoozed = isSnoozed(subscription)
          return (
            <li key={subscription.id} className="card" data-id={subscription.id} data-status={subscription.status}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold tracking-tight text-ink-900">{subscription.name}</p>
                  <p className="text-xs text-ink-500">
                    {formatMoney(subscription.price, subscription.currency)} / {subscription.billingCycle}
                    <span className="mx-1 text-ink-300">·</span>
                    {dueLabel(subscription)}
                  </p>
                  {snoozed && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-clay-700">
                      <BellOff size={12} strokeWidth={1.75} />
                      Snoozed · {snoozeLabel(subscription)}
                    </p>
                  )}
                </div>
                <span className={STATUS_STYLES[subscription.status] ?? "pill-muted"}>
                  {subscription.status}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1">
                <button className="icon-button" aria-label={`Edit ${subscription.name}`} onClick={() => openForm(subscription)}>
                  <Pencil size={12} strokeWidth={1.75} />
                  Edit
                </button>

                {LIVE_STATUSES.includes(subscription.status) && !snoozed &&
                  SNOOZE_OPTIONS.map((option) => (
                    <button
                      key={option.days}
                      className="icon-button"
                      aria-label={`Snooze ${subscription.name} for ${option.label}`}
                      onClick={() => handleSnooze(subscription, option.days)}>
                      <BellOff size={12} strokeWidth={1.75} />
                      {option.days === 1 ? "1d" : option.days === 3 ? "3d" : "1w"}
                    </button>
                  ))}

                {snoozed && (
                  <button className="icon-button" aria-label={`Wake ${subscription.name}`} onClick={() => handleWake(subscription)}>
                    <Bell size={12} strokeWidth={1.75} />
                    Wake
                  </button>
                )}

                {LIVE_STATUSES.includes(subscription.status) && (
                  <button className="icon-button" aria-label={`Mark ${subscription.name} cancelled`} onClick={() => handleStatus(subscription, STATUS.CANCELLED)}>
                    <Ban size={12} strokeWidth={1.75} />
                    Cancelled
                  </button>
                )}

                {subscription.status === STATUS.TRIAL && (
                  <button className="icon-button" aria-label={`Mark ${subscription.name} converted`} onClick={() => handleStatus(subscription, STATUS.ACTIVE)}>
                    <Check size={12} strokeWidth={2} />
                    Converted
                  </button>
                )}

                {(subscription.accountUrl || subscription.url) && (
                  <a
                    className="icon-button"
                    href={subscription.accountUrl || subscription.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${subscription.name} account page`}>
                    Account
                    <ArrowUpRight size={12} strokeWidth={1.75} />
                  </a>
                )}

                <button className="icon-button hover:!border-rust-100 hover:!bg-rust-50 hover:!text-rust-600" aria-label={`Delete ${subscription.name}`} onClick={() => handleDelete(subscription)}>
                  <Trash2 size={12} strokeWidth={1.75} />
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      <footer className="border-t border-ink-200 bg-white px-3 py-2.5">
        {caps?.canAdd ? (
          <button className="btn-primary w-full" onClick={() => openForm()}>
            <Plus size={14} strokeWidth={2} />
            Add subscription
          </button>
        ) : (
          <button className="btn-primary w-full" onClick={() => chrome.runtime.openOptionsPage()}>
            Free limit reached — upgrade
            <ArrowUpRight size={14} strokeWidth={2} />
          </button>
        )}
      </footer>
    </div>
  )
}
