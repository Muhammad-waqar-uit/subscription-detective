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
    return <div className="p-8 text-sm text-slate-500">Loading…</div>
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Subscription Detective — settings</h1>
          <p className="text-sm text-slate-500">
            {subscriptions.length} record(s) · {caps?.paid ? "Paid plan" : `Free plan (limit ${FREE_LIMIT})`}
          </p>
        </div>
        {status && <span className="rounded-md bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">{status}</span>}
      </header>

      <section className="card space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Tracking</h2>

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

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="!w-auto"
              checked={settings.notificationsEnabled !== false}
              onChange={(event) => persist({ notificationsEnabled: event.target.checked }, "Notifications updated")}
            />
            Desktop reminders
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="!w-auto"
              checked={settings.detectionEnabled !== false}
              onChange={(event) => persist({ detectionEnabled: event.target.checked }, "Detection updated")}
            />
            Detect signups on pages
          </label>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Muted sites</h2>
        <p className="text-xs text-slate-500">Subscription Detective never shows the tracking banner on these hosts.</p>

        <div className="flex gap-2">
          <input
            value={mutedInput}
            onChange={(event) => setMutedInput(event.target.value)}
            placeholder="example.com"
            aria-label="Site to mute"
          />
          <button className="btn-ghost shrink-0" onClick={addMutedSite}>Mute</button>
        </div>

        <ul className="flex flex-wrap gap-2">
          {(settings.mutedSites ?? []).length === 0 && <li className="text-xs text-slate-400">No muted sites.</li>}
          {(settings.mutedSites ?? []).map((site) => (
            <li key={site} className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs">
              {site}
              <button className="text-slate-500 hover:text-red-600" onClick={() => removeMutedSite(site)} aria-label={`Unmute ${site}`}>
                ×
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Plan</h2>
        <p className="text-sm text-slate-600">
          {caps?.paid
            ? "Paid: unlimited records, multiple reminders, spend summaries and export."
            : `Free: up to ${FREE_LIMIT} active records, one reminder per charge. ${caps?.remaining} slot(s) left.`}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-semibold text-slate-500" htmlFor="plan">License (development)</label>
          <select
            id="plan"
            className="!w-auto"
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
      </section>

      <section className="card space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Data</h2>
        <p className="text-xs text-slate-500">Everything stays on this device. Exports are the only way data leaves the browser.</p>

        <div className="flex flex-wrap gap-2">
          <button
            className="btn-ghost"
            onClick={() => download("subscriptions.json", toJson(subscriptions), "application/json")}>
            Export JSON
          </button>
          <button className="btn-ghost" onClick={() => download("subscriptions.csv", toCsv(subscriptions), "text/csv")}>
            Export CSV
          </button>
          <label className="btn-ghost cursor-pointer">
            Import JSON
            <input type="file" accept="application/json" className="hidden" onChange={handleImport} />
          </label>
          <button className="btn-danger" onClick={handleDeleteAll}>Delete all data</button>
        </div>
      </section>
    </main>
  )
}
