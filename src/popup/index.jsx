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
  [STATUS.TRIAL]: "bg-amber-100 text-amber-800",
  [STATUS.ACTIVE]: "bg-emerald-100 text-emerald-700",
  [STATUS.CANCELLED]: "bg-slate-200 text-slate-600",
  [STATUS.EXPIRED]: "bg-slate-200 text-slate-500"
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
    return <div className="w-[380px] p-6 text-sm text-slate-500">Loading…</div>
  }

  return (
    <div className="w-[380px] bg-slate-50">
      <header className="flex items-center justify-between gap-2 bg-gradient-to-br from-brand-700 to-brand-900 px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/15 text-sm">🔍</span>
          <div>
            <h1 className="text-sm font-semibold leading-tight">Subscription Detective</h1>
            <p className="text-[11px] leading-tight text-brand-100">
              {summary.count} tracked · {caps?.paid ? "paid" : "free"} plan
            </p>
          </div>
        </div>
        <button className="rounded-md bg-white/15 px-2 py-1 text-xs font-medium hover:bg-white/25" onClick={() => chrome.runtime.openOptionsPage()}>
          Settings
        </button>
      </header>

      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Per month</p>
          <p className="text-lg font-semibold text-slate-900">{formatMoney(summary.monthly, settings?.defaultCurrency)}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Per year</p>
          <p className="text-sm font-medium text-slate-700">{formatMoney(summary.yearly, settings?.defaultCurrency)}</p>
        </div>
      </div>

      {form ? (
        <form className="space-y-2 border-b border-slate-200 bg-white p-4" onSubmit={handleSave}>
          <div>
            <label className="label" htmlFor="name">Service name</label>
            <input id="name" value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Notion" />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label" htmlFor="price">Price</label>
              <input id="price" value={form.price} onChange={(event) => update("price", event.target.value)} placeholder="10" inputMode="decimal" />
              {errors.price && <p className="mt-1 text-xs text-red-600">{errors.price}</p>}
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
              {errors.customCycleDays && <p className="mt-1 text-xs text-red-600">{errors.customCycleDays}</p>}
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
              {errors.trialEndDate && <p className="mt-1 text-xs text-red-600">{errors.trialEndDate}</p>}
            </div>
          </div>

          <div>
            <label className="label" htmlFor="accountUrl">Account page</label>
            <input id="accountUrl" value={form.accountUrl} onChange={(event) => update("accountUrl", event.target.value)} placeholder="https://service.com/account" />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" className="btn-ghost" onClick={() => setForm(null)}>Cancel</button>
            <button type="submit" className="btn-primary">Save</button>
          </div>
        </form>
      ) : null}

      {subscriptions.length > 0 && (
        <div className="space-y-2 border-b border-slate-200 bg-white px-3 py-2">
          <input
            id="search"
            type="search"
            value={filter.query}
            onChange={(event) => setFilterField("query", event.target.value)}
            placeholder="Search name, notes, URL"
            aria-label="Search subscriptions"
          />

          <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Filter by status">
            {STATUS_FILTERS.map((option) => {
              const active = filter.status === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    active ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                  onClick={() => setFilterField("status", option.value)}>
                  {option.label}
                </button>
              )
            })}
          </div>

          <select
            id="filterCategory"
            aria-label="Filter by category"
            className="!py-1 !text-xs"
            value={filter.category}
            onChange={(event) => setFilterField("category", event.target.value)}>
            {CATEGORY_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      )}

      <ul className="max-h-[320px] space-y-2 overflow-y-auto p-3">
        {subscriptions.length === 0 && (
          <li className="card text-center text-sm text-slate-500">
            Nothing tracked yet. Visit a signup page and confirm the banner, or add one manually.
          </li>
        )}

        {subscriptions.length > 0 && visible.length === 0 && (
          <li className="card text-center text-sm text-slate-500">
            No records match this filter.
            <button className="ml-2 text-xs font-medium text-brand-700 hover:underline" onClick={() => setFilter(EMPTY_FILTER)}>
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
                  <p className="truncate text-sm font-semibold text-slate-900">{subscription.name}</p>
                  <p className="text-xs text-slate-500">
                    {formatMoney(subscription.price, subscription.currency)} / {subscription.billingCycle} · {dueLabel(subscription)}
                  </p>
                  {snoozed && (
                    <p className="mt-1 text-[11px] font-medium text-amber-700">
                      🔕 Snoozed · {snoozeLabel(subscription)}
                    </p>
                  )}
                </div>
                <span className={`pill ${STATUS_STYLES[subscription.status] ?? "bg-slate-100 text-slate-600"}`}>
                  {subscription.status}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1">
                <button className="btn-ghost !px-2 !py-1 !text-xs" onClick={() => openForm(subscription)}>Edit</button>

                {LIVE_STATUSES.includes(subscription.status) && !snoozed &&
                  SNOOZE_OPTIONS.map((option) => (
                    <button
                      key={option.days}
                      className="btn-ghost !px-2 !py-1 !text-xs"
                      aria-label={`Snooze ${subscription.name} for ${option.label}`}
                      onClick={() => handleSnooze(subscription, option.days)}>
                      Snooze {option.label === "1 day" ? "1d" : option.label === "3 days" ? "3d" : "1w"}
                    </button>
                  ))}

                {snoozed && (
                  <button
                    className="btn-ghost !px-2 !py-1 !text-xs"
                    aria-label={`Wake ${subscription.name}`}
                    onClick={() => handleWake(subscription)}>
                    Wake
                  </button>
                )}

                {LIVE_STATUSES.includes(subscription.status) && (
                  <button className="btn-ghost !px-2 !py-1 !text-xs" onClick={() => handleStatus(subscription, STATUS.CANCELLED)}>
                    Mark cancelled
                  </button>
                )}

                {subscription.status === STATUS.TRIAL && (
                  <button className="btn-ghost !px-2 !py-1 !text-xs" onClick={() => handleStatus(subscription, STATUS.ACTIVE)}>
                    Converted
                  </button>
                )}

                {(subscription.accountUrl || subscription.url) && (
                  <a
                    className="btn-ghost !px-2 !py-1 !text-xs"
                    href={subscription.accountUrl || subscription.url}
                    target="_blank"
                    rel="noreferrer">
                    Account
                  </a>
                )}

                <button className="btn-danger !px-2 !py-1 !text-xs" onClick={() => handleDelete(subscription)}>Delete</button>
              </div>
            </li>
          )
        })}
      </ul>

      <footer className="flex items-center justify-between gap-2 border-t border-slate-200 bg-white px-3 py-2">
        {caps?.canAdd ? (
          <button className="btn-primary w-full" onClick={() => openForm()}>Add subscription</button>
        ) : (
          <button className="btn-primary w-full" onClick={() => chrome.runtime.openOptionsPage()}>
            Free limit reached — upgrade
          </button>
        )}
      </footer>
    </div>
  )
}
