/**
 * Drives the detection banner against local pages, in a real browser, with the
 * extension loaded. Run after `npm run build`:
 *
 *   node tests/e2e/detection.mjs
 *
 * Covers: no banner on a page that is not a signup, banner on a trial signup with
 * name/price/trial prefilled, the record saved by the content script into
 * chrome.storage.local, and muting the host from the banner (FR-4, FR-5, FR-6,
 * FR-7, FR-31).
 *
 * The pages are served over http because content scripts do not run on file://
 * without an explicit "allow access to file URLs" grant.
 */
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { createServer } from "node:http"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

import { chromium } from "playwright"

const extensionPath = resolve("build/chrome-mv3-prod")
const fixturesDir = resolve("tests/fixtures")
const profileDir = mkdtempSync(join(tmpdir(), "sd-detect-"))

const problems = []
let context
let server

function check(label, condition, detail = "") {
  const ok = Boolean(condition)
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`)
  if (!ok) problems.push(label)
  return ok
}

const ROUTES = { "/signup": "signup.html", "/about": "about.html" }

function startServer() {
  return new Promise((ready) => {
    server = createServer((request, response) => {
      const url = new URL(request.url, "http://127.0.0.1")
      const file = ROUTES[url.pathname] ?? (url.pathname === "/" ? "signup.html" : null)

      if (!file) {
        response.writeHead(404, { "content-type": "text/plain" })
        response.end("not found")
        return
      }

      response.writeHead(200, { "content-type": "text/html; charset=utf-8" })
      response.end(readFileSync(join(fixturesDir, file)))
    })

    server.listen(0, "127.0.0.1", () => ready(server.address().port))
  })
}

function isoPlusDays(days) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

/** @plasmohq/storage stores values JSON-serialised, so decode before asserting. */
async function readStorage(worker, key) {
  return worker.evaluate(async (name) => {
    const raw = (await chrome.storage.local.get(name))[name]
    if (!raw) return null
    return typeof raw === "string" ? JSON.parse(raw) : raw
  }, key)
}

const BANNER_TITLE = "Track this subscription?"

try {
  const port = await startServer()
  const origin = `http://127.0.0.1:${port}`

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

  // A normal page must stay quiet — false positives are what make a detector annoying.
  const quiet = await context.newPage()
  const quietErrors = []
  quiet.on("pageerror", (error) => quietErrors.push(String(error)))
  await quiet.goto(`${origin}/about`, { waitUntil: "domcontentloaded" })
  await quiet.waitForTimeout(3500)
  check("about page: no banner", !(await quiet.getByText(BANNER_TITLE).count()))
  check("about page: page itself rendered", ((await quiet.textContent("body")) ?? "").includes("reporting tools"))

  // The signup page must trigger the banner with the offer prefilled.
  const page = await context.newPage()
  const pageErrors = []
  page.on("pageerror", (error) => pageErrors.push(String(error)))
  await page.goto(`${origin}/signup`, { waitUntil: "domcontentloaded" })

  await page.getByText(BANNER_TITLE).waitFor({ timeout: 20_000 }).catch(() => {})
  check("signup page: banner appears", (await page.getByText(BANNER_TITLE).count()) > 0)

  // The banner lives inside Plasmo's shadow root, so read it there — the host's
  // own innerText is intentionally empty.
  const banner = await page
    .locator("plasmo-csui")
    .first()
    .evaluate((host) => host.shadowRoot?.textContent ?? "")
    .catch(() => "")

  check("banner: service name detected", banner.includes("Acme Analytics"), banner.slice(0, 60))
  check("banner: price detected", banner.includes("USD 12"), (banner.match(/Acme Analytics . [^/]+/) ?? [""])[0])
  check("banner: trial length detected", banner.includes("14-day trial detected"), (banner.match(/\d+-day trial detected/) ?? [""])[0])
  check("banner: cycle detected", banner.toLowerCase().includes("monthly"))

  await page.getByRole("button", { name: "Track it" }).click()
  await page.getByText("Tracking Acme Analytics.").waitFor({ timeout: 10_000 }).catch(() => {})
  check("banner: confirms the save", (await page.getByText("Tracking Acme Analytics.").count()) > 0)

  let saved = []
  for (let attempt = 0; attempt < 12; attempt += 1) {
    saved = (await readStorage(worker, "subscriptions")) ?? []
    if (saved.length > 0) break
    await page.waitForTimeout(250)
  }

  check("saved: one record from the banner", saved.length === 1, `count=${saved.length}`)
  check("saved: name", saved[0]?.name === "Acme Analytics", saved[0]?.name)
  check("saved: price and currency", saved[0]?.price === 12 && saved[0]?.currency === "USD", `${saved[0]?.price} ${saved[0]?.currency}`)
  check("saved: cycle", saved[0]?.billingCycle === "monthly", saved[0]?.billingCycle)
  check("saved: trial status", saved[0]?.status === "trial", saved[0]?.status)
  check("saved: trial end is 14 days out", saved[0]?.trialEndDate === isoPlusDays(14), `${saved[0]?.trialEndDate} vs ${isoPlusDays(14)}`)
  check("saved: marked as auto-detected", saved[0]?.detectedAutomatically === true)

  // Muting from the banner must stop it coming back (FR-31).
  await page.reload({ waitUntil: "domcontentloaded" })
  await page.getByText(BANNER_TITLE).waitFor({ timeout: 20_000 }).catch(() => {})
  check("banner: shows again on reload", (await page.getByText(BANNER_TITLE).count()) > 0)

  await page.getByRole("button", { name: /Never show this on/ }).click()
  await page.getByText(BANNER_TITLE).waitFor({ state: "detached", timeout: 10_000 }).catch(() => {})

  let settings = {}
  for (let attempt = 0; attempt < 12; attempt += 1) {
    settings = (await readStorage(worker, "settings")) ?? {}
    if ((settings.mutedSites ?? []).length > 0) break
    await page.waitForTimeout(250)
  }
  check("mute: host stored", (settings.mutedSites ?? []).includes("127.0.0.1"), JSON.stringify(settings.mutedSites))

  await page.reload({ waitUntil: "domcontentloaded" })
  await page.waitForTimeout(3500)
  check("mute: banner stays away on reload", (await page.getByText(BANNER_TITLE).count()) === 0)
  check("mute: record is untouched", ((await readStorage(worker, "subscriptions")) ?? []).length === 1)

  check("detection pages: no page errors", pageErrors.length === 0 && quietErrors.length === 0, pageErrors.slice(0, 2).join(" | "))
} catch (error) {
  console.error("DETECTION ERROR:", error.message)
  problems.push("detection harness")
} finally {
  if (context) await context.close()
  if (server) server.close()
  rmSync(profileDir, { recursive: true, force: true })
}

console.log(problems.length === 0 ? "\nALL CHECKS PASSED" : `\nFAILED: ${problems.join(", ")}`)
process.exit(problems.length === 0 ? 0 : 1)
