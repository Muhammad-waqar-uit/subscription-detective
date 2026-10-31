/**
 * Loads the built extension into Chromium and exercises it.
 * Run after `npm run build`:
 *
 *   node tests/e2e/smoke.mjs
 *
 * Covers: service worker start, popup/options render, manual add persisting to
 * chrome.storage.local, reminder alarms being scheduled by the background worker,
 * and the free-tier cap blocking the fourth record.
 *
 * Not covered (needs the manual pass in docs/TESTING.md): real notifications firing,
 * detection against live sites, licensing against a payment provider.
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

  // --- reminder alarms scheduled by the background worker (FR-20, FR-21) ---
  let alarms = []
  for (let attempt = 0; attempt < 10; attempt += 1) {
    alarms = await popup.evaluate(() => chrome.alarms.getAll())
    if (alarms.length > 0) break
    await popup.waitForTimeout(300)
  }
  check("alarms: reminders scheduled", alarms.length >= 2, `${alarms.length} alarm(s): ${alarms.map((a) => a.name).join(", ")}`)
  check(
    "alarms: use the 3-day/1-day lead times",
    alarms.some((a) => a.name.endsWith(":3")) && alarms.some((a) => a.name.endsWith(":1"))
  )

  // --- free-tier cap (FR-34, FR-37) --------------------------------------
  await addSubscription(popup, "Figma", "12")
  await addSubscription(popup, "Canva", "15")
  const afterThree = await readStored(popup)
  check("cap: three records accepted", afterThree.length === 3, `count=${afterThree.length}`)

  const bodyAfterThree = (await popup.textContent("body")) ?? ""
  check("cap: upgrade prompt replaces the add button", bodyAfterThree.includes("Free limit reached"))
  check("cap: existing records still listed", bodyAfterThree.includes("Canva") && bodyAfterThree.includes("Notion"))

  check("popup: no page errors", popupErrors.length === 0, popupErrors.slice(0, 2).join(" | "))

  // --- options page ------------------------------------------------------
  const options = await context.newPage()
  const optionErrors = []
  options.on("pageerror", (error) => optionErrors.push(String(error)))
  await options.goto(`chrome-extension://${extensionId}/options.html`, { waitUntil: "domcontentloaded" })
  await options.waitForTimeout(700)

  const optionsBody = (await options.textContent("body")) ?? ""
  check("options renders", optionsBody.includes("settings"))
  check("options shows the record count", optionsBody.includes("3 record(s)"), optionsBody.match(/\\d+ record\\(s\\)/)?.[0])
  check("options shows the free limit", optionsBody.includes("limit 3"))
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
