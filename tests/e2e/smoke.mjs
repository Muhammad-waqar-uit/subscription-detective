/**
 * Loads the built extension into Chromium and exercises it.
 * Run after `npm run build`:
 *
 *   node tests/e2e/smoke.mjs
 *
 * Covers: service worker start, popup/options render, manual add persisting to
 * chrome.storage.local, reminder alarms (free = one lead, paid = all leads),
 * the free-tier cap blocking the fourth record, status/search filters, snooze and
 * wake, and the paid-plan toggle.
 *
 * Detection has its own run: tests/e2e/detection.mjs. Still manual (see
 * docs/TESTING.md): notifications appearing on screen, a real payment provider.
 */
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

import { chromium } from "playwright"

const extensionPath = resolve("build/chrome-mv3-prod")
const profileDir = mkdtempSync(join(tmpdir(), "sd-smoke-"))

const problems = []
let context

function check(label, condition, detail = "") {
  const ok = Boolean(condition)
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`)
  if (!ok) problems.push(label)
  return ok
}

async function addSubscription(page, name, price) {
  await page.click("text=Add subscription")
  await page.waitForSelector("#name")
  await page.fill("#name", name)
  await page.fill("#price", price)
  await page.click('button[type="submit"]')
  await page.waitForTimeout(400)
}


/** Alarm creation is async in the worker, so poll instead of guessing a delay. */
async function waitForAlarms(page, expected) {
  let alarms = []
  for (let attempt = 0; attempt < 24; attempt += 1) {
    alarms = await page.evaluate(() => chrome.alarms.getAll())
    if (alarms.length >= expected) return alarms
    await page.waitForTimeout(250)
  }
  return alarms
}

/** @plasmohq/storage stores values JSON-serialised, so decode before asserting. */
async function readStored(page) {
  return page.evaluate(async () => {
    const raw = (await chrome.storage.local.get("subscriptions")).subscriptions
    if (!raw) return []
    return typeof raw === "string" ? JSON.parse(raw) : raw
  })
}

try {
  context = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      "--no-first-run",
      "--no-default-browser-check"
    ]
  })

  let worker = context.serviceWorkers()[0]
  if (!worker) worker = await context.waitForEvent("serviceworker", { timeout: 20_000 })
  check("service worker started", Boolean(worker))

  const extensionId = new URL(worker.url()).host
  check("extension id resolved", /^[a-p]{32}$/.test(extensionId), extensionId)

  const popup = await context.newPage()
  const popupErrors = []
  popup.on("pageerror", (error) => popupErrors.push(String(error)))
  popup.on("console", (message) => {
    if (message.type() === "error") popupErrors.push(message.text())
  })

  await popup.goto(`chrome-extension://${extensionId}/popup.html`, { waitUntil: "domcontentloaded" })
  await popup.waitForTimeout(900)

  check("popup renders", ((await popup.textContent("body")) ?? "").includes("Subscription Detective"))
  check("popup starts empty", ((await popup.textContent("body")) ?? "").includes("Nothing tracked yet"))

  // --- manual add (FR-10, FR-12, FR-14) -----------------------------------
  await addSubscription(popup, "Notion", "10")
  check("add: record appears in list", ((await popup.textContent("body")) ?? "").includes("Notion"))
  check("add: spend summary updates", ((await popup.textContent("body")) ?? "").includes("$10"))

  const stored = await readStored(popup)
  check("add: persisted to chrome.storage.local", stored.length === 1, `count=${stored.length}`)
  check("add: next charge date computed", Boolean(stored[0]?.nextChargeDate), stored[0]?.nextChargeDate)
  check("add: status defaulted to active", stored[0]?.status === "active")

  // --- reminder alarms scheduled by the background worker (FR-20, FR-21, FR-36) ---
  const alarms = await waitForAlarms(popup, 1)
  check("alarms: reminder scheduled", alarms.length === 1, `${alarms.length} alarm(s): ${alarms.map((a) => a.name).join(", ")}`)
  check("alarms: free plan uses the nearest lead time only", alarms[0]?.name.endsWith(":1"), alarms[0]?.name)

  // --- free-tier cap (FR-34, FR-37) --------------------------------------
  await addSubscription(popup, "Figma", "12")
  await addSubscription(popup, "Canva", "15")
  const afterThree = await readStored(popup)
  check("cap: three records accepted", afterThree.length === 3, `count=${afterThree.length}`)

  const bodyAfterThree = (await popup.textContent("body")) ?? ""
  check("cap: upgrade prompt replaces the add button", bodyAfterThree.includes("Free limit reached"))
  check("cap: existing records still listed", bodyAfterThree.includes("Canva") && bodyAfterThree.includes("Notion"))

  // --- filters (FR-19) ---------------------------------------------------
  await popup.fill("#search", "Canva")
  await popup.waitForTimeout(250)
  const filteredBody = (await popup.textContent("body")) ?? ""
  check("filter: search narrows the list", filteredBody.includes("Canva") && !filteredBody.includes("Notion"))

  await popup.fill("#search", "zzz-not-a-service")
  await popup.waitForTimeout(250)
  check("filter: explains an empty result", ((await popup.textContent("body")) ?? "").includes("No records match"))

  await popup.getByRole("button", { name: "Clear", exact: true }).click()
  await popup.waitForTimeout(250)
  check("filter: clear restores the list", ((await popup.textContent("body")) ?? "").includes("Notion"))

  await popup.getByRole("button", { name: "Cancelled", exact: true }).click()
  await popup.waitForTimeout(250)
  check("filter: status chip hides non-matching records", (await popup.locator("li[data-id]").count()) === 0)

  await popup.getByRole("button", { name: "All", exact: true }).click()
  await popup.waitForTimeout(250)
  check("filter: status chip restores the list", (await popup.locator("li[data-id]").count()) === 3)

  // --- edit, delete, status change (FR-15, FR-16) -------------------------
  await popup.getByRole("button", { name: "Edit Notion" }).click()
  await popup.waitForSelector("#name")
  check("edit: opens the form prefilled from the record", (await popup.locator("#name").inputValue()) === "Notion")
  await popup.fill("#name", "Notion Pro")
  await popup.click('button[type="submit"]')
  await popup.waitForTimeout(400)
  check("edit: new name persisted", ((await popup.textContent("body")) ?? "").includes("Notion Pro"))

  // --- delete (FR-15) ----------------------------------------------------
  // Register the confirm dialog BEFORE the click — Playwright dismisses it
  // immediately, so a handler registered afterwards never sees it.
  await popup.on("dialog", (dialog) => dialog.accept())
  await popup.getByRole("button", { name: "Delete Figma" }).click()
  await popup.waitForTimeout(400)
  const afterDelete = await readStored(popup)
  check("delete: record removed", afterDelete.every((item) => item.name !== "Figma"), `${afterDelete.length} record(s) left`)

  // --- status change (FR-16) ---------------------------------------------
  await popup.getByRole("button", { name: "Mark Notion Pro cancelled" }).click()
  await popup.waitForTimeout(400)
  const notion = (await readStored(popup)).find((item) => item.name === "Notion Pro")
  check("status: record marked cancelled", notion?.status === "cancelled", notion?.status)
  const liveAfterCancel = (await readStored(popup)).filter((item) => ["trial", "active"].includes(item.status))
  check("status: cancelled records stop counting live", liveAfterCancel.length === 1, `${liveAfterCancel.length} live`)

  // --- snooze (FR-26) ----------------------------------------------------
  await popup.getByRole("button", { name: "Snooze Canva for 1 day" }).click()
  await popup.waitForTimeout(500)

  const canva = (await readStored(popup)).find((item) => item.name === "Canva")
  check("snooze: record stores an end date", Boolean(canva?.snoozedUntil), canva?.snoozedUntil)
  check("snooze: card says so", ((await popup.textContent("body")) ?? "").includes("Snoozed"))

  const afterSnooze = await popup.evaluate(() => chrome.alarms.getAll())
  check(
    "snooze: that record's reminders are cleared",
    !afterSnooze.some((alarm) => alarm.name.includes(canva?.id)),
    `${afterSnooze.length} alarm(s) left`
  )

  await popup.getByRole("button", { name: "Wake Canva" }).click()
  await popup.waitForTimeout(500)
  const woken = (await readStored(popup)).find((item) => item.name === "Canva")
  check("snooze: wake removes the end date", !woken?.snoozedUntil, String(woken?.snoozedUntil))

  check("popup: no page errors", popupErrors.length === 0, popupErrors.slice(0, 2).join(" | "))

  // --- options page ------------------------------------------------------
  const options = await context.newPage()
  const optionErrors = []
  options.on("pageerror", (error) => optionErrors.push(String(error)))
  await options.goto(`chrome-extension://${extensionId}/options.html`, { waitUntil: "domcontentloaded" })
  await options.waitForTimeout(700)

  const optionsBody = (await options.textContent("body")) ?? ""
  check("options renders", optionsBody.includes("settings"))
  check("options shows the record count", optionsBody.includes("2 record(s)"), optionsBody.match(/\\d+ record\\(s\\)/)?.[0])
  check("options shows the free limit", optionsBody.includes("limit 3"))
  // --- paid tier (FR-35, FR-36) -----------------------------------------
  await options.selectOption("#plan", "paid")
  await options.waitForTimeout(800)
  check("plan: paid state persists", ((await options.textContent("body")) ?? "").includes("Paid"))

  // Paid schedules every lead time for every live record. The live count is
  // driven by the state above (3 added − 1 deleted − 1 cancelled = 1 live),
  // not hardcoded, so the assertion stays honest as the suite grows.
  const liveCount = (await readStored(popup)).filter((item) => ["trial", "active"].includes(item.status)).length
  const paidAlarms = await waitForAlarms(options, liveCount * 2)
  check("plan: paid schedules every lead time", paidAlarms.length === liveCount * 2, `${paidAlarms.length} alarm(s) for ${liveCount} live record(s)`)
  check("plan: paid includes the 3-day lead", paidAlarms.some((alarm) => alarm.name.endsWith(":3")))

  check("options: no page errors", optionErrors.length === 0, optionErrors.slice(0, 2).join(" | "))
} catch (error) {
  console.error("SMOKE ERROR:", error.message)
  problems.push("smoke harness")
} finally {
  if (context) await context.close()
  rmSync(profileDir, { recursive: true, force: true })
}

console.log(problems.length === 0 ? "\nALL CHECKS PASSED" : `\nFAILED: ${problems.join(", ")}`)
process.exit(problems.length === 0 ? 0 : 1)
