import {
  CreditCard,
  Database,
  Download,
  Globe2,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Upload,
  VolumeX,
  X
} from "lucide-react"
import { useEffect, useState } from "react"

import "../styles/tailwind.css"
import { FREE_LIMIT } from "../lib/constants"
import { mergeImported, parseImport, toCsv, toJson } from "../lib/export"
import { capabilities } from "../lib/license"
import { getSettings, getSubscriptions, saveSettings, saveSubscriptions, wipeAll } from "../lib/storage"

function download(filename, content, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function Section({ icon: Icon, title, description, children }) {
  return (
    <section className="rounded-xl border border-ink-200 bg-white p-5 shadow-card">
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink-100 text-ink-600">
          <Icon size={15} strokeWidth={1.75} />
        </span>
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-ink-900">{title}</h2>
          {description && <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

export default function Options() {
  const [settings, setSettings] = useState(null)
  const [subscriptions, setSubscriptions] = useState([])
  const [status, setStatus] = useState("")
  const [mutedInput, setMutedInput] = useState("")

  async function load() {
    const [current, list] = await Promise.all([getSettings(), getSubscriptions()])
    setSettings(current)
    setSubscriptions(list)
  }

  useEffect(() => {
    load().catch((error) => console.error("[subscription-detective] options load failed", error))
  }, [])

  const caps = settings ? capabilities(subscriptions, settings.license) : null

  async function persist(patch, message = "Saved") {
    const next = await saveSettings(patch)
    setSettings(next)
    setStatus(message)
    window.setTimeout(() => setStatus(""), 2000)
  }

  function addMutedSite() {
    const site = mutedInput.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "")
    if (!site) return
    const mutedSites = [...new Set([...(settings.mutedSites ?? []), site])]
    setMutedInput("")
    persist({ mutedSites }, `Muted ${site}`)
  }

  function removeMutedSite(site) {
    persist({ mutedSites: (settings.mutedSites ?? []).filter((value) => value !== site) }, `Unmuted ${site}`)
  }

  async function handleImport(event) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const incoming = parseImport(text)
      const merged = mergeImported(subscriptions, incoming)
      await saveSubscriptions(merged)
      setSubscriptions(merged)
      setStatus(`Imported ${incoming.length} record(s)`)
    } catch (error) {
      setStatus(`Import failed: ${error.message}`)
    }
    event.target.value = ""
  }

  async function handleDeleteAll() {
    if (!window.confirm("Delete all subscriptions and settings stored by Subscription Detective?")) return
    await wipeAll()
    await load()
    setStatus("All data deleted")
  }

  if (!settings) {
    return <div className="p-8 text-sm text-ink-500">Loading…</div>
  }

  return (
    <main className="mx-auto max-w-3xl space-y-5 p-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink-900">Subscription Detective — settings</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-500">
            <ShieldCheck size={14} strokeWidth={1.75} className="text-ink-400" />
            {subscriptions.length} record(s) stored on this device ·{" "}
            {caps?.paid ? "Paid plan" : `Free plan (limit ${FREE_LIMIT})`}
          </p>
        </div>
        {status && (
          <span className="mt-1 rounded-lg border border-sage-100 bg-sage-50 px-3 py-1 text-xs font-medium text-sage-700">
            {status}
          </span>
        )}
      </header>

      <Section
        icon={SlidersHorizontal}
        title="Tracking"
        description="How records are priced and when you are reminded.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="currency">Default currency</label>
            <select
              id="currency"
              value={settings.defaultCurrency}
              onChange={(event) => persist({ defaultCurrency: event.target.value }, "Currency updated")}>
              {["USD", "EUR", "GBP", "INR", "CAD", "AUD"].map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="reminders">Reminder days before (comma separated)</label>
            <input
              id="reminders"
              defaultValue={(settings.reminderDaysBefore ?? []).join(", ")}
              onBlur={(event) => {
                const reminderDaysBefore = event.target.value
                  .split(",")
                  .map((value) => Number(value.trim()))
                  .filter((value) => Number.isFinite(value) && value >= 0)
                persist({ reminderDaysBefore }, "Reminders updated")
              }}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <label className="flex items-center gap-2 rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-700">
            <input
              type="checkbox"
              className="!w-auto accent-ink-800"
              checked={settings.notificationsEnabled !== false}
              onChange={(event) => persist({ notificationsEnabled: event.target.checked }, "Notifications updated")}
            />
            Desktop reminders
          </label>

          <label className="flex items-center gap-2 rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-700">
            <input
              type="checkbox"
              className="!w-auto accent-ink-800"
              checked={settings.detectionEnabled !== false}
              onChange={(event) => persist({ detectionEnabled: event.target.checked }, "Detection updated")}
            />
            Detect signups on pages
          </label>
        </div>
      </Section>

      <Section
        icon={VolumeX}
        title="Muted sites"
        description="Subscription Detective never shows the tracking banner on these hosts.">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Globe2
              size={14}
              strokeWidth={1.75}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400"
            />
            <input
              className="pl-8"
              value={mutedInput}
              onChange={(event) => setMutedInput(event.target.value)}
              placeholder="example.com"
              aria-label="Site to mute"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  addMutedSite()
                }
              }}
            />
          </div>
          <button className="btn-ghost shrink-0" onClick={addMutedSite}>Mute</button>
        </div>

        <ul className="mt-3 flex flex-wrap gap-2">
          {(settings.mutedSites ?? []).length === 0 && <li className="text-xs text-ink-400">No muted sites.</li>}
          {(settings.mutedSites ?? []).map((site) => (
            <li key={site} className="flex items-center gap-1.5 rounded-full border border-ink-200 bg-ink-50 py-1 pl-3 pr-1.5 text-xs text-ink-600">
              {site}
              <button
                className="grid h-4 w-4 place-items-center rounded-full text-ink-400 transition-colors hover:bg-ink-200 hover:text-ink-800"
                onClick={() => removeMutedSite(site)}
                aria-label={`Unmute ${site}`}>
                <X size={11} strokeWidth={2.25} />
              </button>
            </li>
          ))}
        </ul>
      </Section>

      <Section icon={CreditCard} title="Plan">
        <p className="text-sm leading-relaxed text-ink-600">
          {caps?.paid
            ? "Paid: unlimited records, multiple reminders, spend summaries and export."
            : `Free: up to ${FREE_LIMIT} active records, one reminder per charge. ${caps?.remaining} slot(s) left.`}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-500" htmlFor="plan">
            License (development)
          </label>
          <select
            id="plan"
            className="!w-auto !py-1 !text-xs"
            value={settings.license?.plan ?? "free"}
            onChange={(event) =>
              persist(
                { license: { plan: event.target.value, status: event.target.value === "paid" ? "active" : "unknown", checkedAt: new Date().toISOString() } },
                "License updated"
              )
            }>
            <option value="free">free</option>
            <option value="paid">paid</option>
          </select>
        </div>
      </Section>

      <Section
        icon={Database}
        title="Data"
        description="Everything stays on this device. Exports are the only way data leaves the browser.">
        <div className="flex flex-wrap gap-2">
          <button
            className="btn-ghost"
            onClick={() => download("subscriptions.json", toJson(subscriptions), "application/json")}>
            <Download size={14} strokeWidth={1.75} />
            Export JSON
          </button>
          <button className="btn-ghost" onClick={() => download("subscriptions.csv", toCsv(subscriptions), "text/csv")}>
            <Download size={14} strokeWidth={1.75} />
            Export CSV
          </button>
          <label className="btn-ghost cursor-pointer">
            <Upload size={14} strokeWidth={1.75} />
            Import JSON
            <input type="file" accept="application/json" className="hidden" onChange={handleImport} />
          </label>
          <button className="btn-danger" onClick={handleDeleteAll}>
            <Trash2 size={14} strokeWidth={1.75} />
            Delete all data
          </button>
        </div>
      </Section>
    </main>
  )
}
