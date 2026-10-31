import { ScanSearch } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import { isSignupButton, scorePage } from "../lib/detect"
import { extractSubscriptionHints } from "../lib/parse"

export const config = {
  matches: ["<all_urls>"],
  run_at: "document_idle"
}

/**
 * Content-script UI. Plasmo mounts this inside a shadow root, so the banner uses
 * inline styles — Tailwind classes would not apply across the shadow boundary.
 */
export default function DetectorBanner() {
  const [candidate, setCandidate] = useState(null)
  const [hints, setHints] = useState(null)
  const [hidden, setHidden] = useState(false)
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)

  const mutedRef = useRef([])
  const enabledRef = useRef(true)
  const lastUrlRef = useRef("")

  const evaluate = useCallback(() => {
    if (!enabledRef.current) return

    const body = document.body
    if (!body) return

    const text = (body.innerText ?? "").slice(0, 20_000)
    const result = scorePage(
      { url: window.location.href, title: document.title, text },
      { mutedSites: mutedRef.current }
    )

    if (!result) return

    setCandidate((current) => {
      if (current?.url === result.url) return current
      setHints(extractSubscriptionHints(text))
      setHidden(false)
      setMessage("")
      return result
    })
  }, [])

  // Pull settings once, then evaluate. Detection never blocks the page.
  useEffect(() => {
    let cancelled = false

    chrome.runtime
      .sendMessage({ type: "GET_STATE" })
      .then((response) => {
        if (cancelled || !response?.ok) return
        enabledRef.current = response.settings?.detectionEnabled !== false
        mutedRef.current = response.settings?.mutedSites ?? []
        evaluate()
      })
      .catch(() => {
        /* background asleep or extension reloading — detection is optional */
      })

    return () => {
      cancelled = true
    }
  }, [evaluate])

  // Click on a trial/subscribe button counts as a signup event (FR-4).
  useEffect(() => {
    function onClick(event) {
      const target = event.target instanceof Element ? event.target.closest("button, a, [role='button']") : null
      if (target && isSignupButton(target.textContent)) {
        window.setTimeout(evaluate, 1200)
      }
    }

    document.addEventListener("click", onClick, true)
    return () => document.removeEventListener("click", onClick, true)
  }, [evaluate])

  // Throttled observer for SPAs that change content without reloading.
  useEffect(() => {
    let timer = null

    const observer = new MutationObserver(() => {
      if (timer) return
      timer = window.setTimeout(() => {
        timer = null
        if (lastUrlRef.current !== window.location.href) {
          lastUrlRef.current = window.location.href
        }
        evaluate()
      }, 1500)
    })

    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true })
    return () => {
      observer.disconnect()
      if (timer) window.clearTimeout(timer)
    }
  }, [evaluate])

  if (!candidate || hidden) return null

  async function track() {
    setBusy(true)
    try {
      const subscription = {
        name: candidate.name,
        url: candidate.accountUrl || candidate.url,
        accountUrl: candidate.accountUrl || "",
        price: hints?.price ?? 0,
        currency: hints?.currency ?? "USD",
        billingCycle: hints?.billingCycle ?? "monthly",
        trialDays: hints?.trialDays ?? undefined,
        nextChargeDate: hints?.renewsOn ?? undefined
      }

      const response = await chrome.runtime.sendMessage({ type: "SAVE_DETECTED", subscription })

      if (response?.blocked) {
        setMessage("Free limit reached — open the extension to upgrade.")
        return
      }
      if (response?.duplicate) {
        setMessage(`Already tracking ${response.subscription.name}.`)
        return
      }
      if (!response?.ok) {
        setMessage("Could not save. Open the extension and add it manually.")
        return
      }

      setMessage(`Tracking ${candidate.name}.`)
      window.setTimeout(() => setHidden(true), 1800)
    } finally {
      setBusy(false)
    }
  }

  async function muteSite() {
    setBusy(true)
    try {
      const response = await chrome.runtime.sendMessage({ type: "MUTE_SITE", host: candidate.host })
      setMessage(response?.ok ? `Banner muted on ${candidate.host}.` : "Could not mute this site.")
      window.setTimeout(() => setHidden(true), 1200)
    } finally {
      setBusy(false)
    }
  }

  const priceLabel =
    hints?.price !== null && hints?.price !== undefined
      ? `${hints.currency ?? ""} ${hints.price}`.trim()
      : "price unknown"

  return (
    <div
      style={{
        position: "fixed",
        right: "20px",
        bottom: "20px",
        zIndex: 2147483647,
        width: "320px",
        font: "13px/1.45 ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        color: "#1e232b",
        background: "#ffffff",
        border: "1px solid #dde1e8",
        borderRadius: "14px",
        boxShadow: "0 12px 32px rgba(30, 35, 43, 0.12)",
        padding: "14px"
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: "28px",
            height: "28px",
            borderRadius: "8px",
            background: "#eef0f4",
            color: "#2e343f"
          }}>
          <ScanSearch size={15} strokeWidth={1.75} />
        </span>
        <strong style={{ fontSize: "13px" }}>Track this subscription?</strong>
      </div>

      <p style={{ margin: "0 0 4px", color: "#414957" }}>
        <strong>{candidate.name}</strong> · {priceLabel}
        {hints?.billingCycle ? ` / ${hints.billingCycle}` : ""}
      </p>
      {hints?.trialDays ? (
        <p style={{ margin: "0 0 8px", color: "#6d7688", fontSize: "12px" }}>{hints.trialDays}-day trial detected</p>
      ) : null}

      {message ? <p style={{ margin: "0 0 8px", color: "#2e343f", fontSize: "12px" }}>{message}</p> : null}

      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={track}
          disabled={busy}
          style={{
            flex: 1,
            padding: "7px 10px",
            borderRadius: "8px",
            border: "none",
            background: busy ? "#979fae" : "#2e343f",
            color: "#fff",
            fontWeight: 600,
            cursor: busy ? "default" : "pointer"
          }}>
          {busy ? "Saving…" : "Track it"}
        </button>
        <button
          onClick={() => setHidden(true)}
          style={{
            flex: 1,
            padding: "7px 10px",
            borderRadius: "8px",
            border: "1px solid #dde1e8",
            background: "#fff",
            color: "#414957",
            cursor: "pointer"
          }}>
          Not now
        </button>
      </div>

      <button
        onClick={muteSite}
        disabled={busy}
        style={{
          marginTop: "8px",
          padding: 0,
          border: "none",
          background: "none",
          color: "#6d7688",
          fontSize: "11px",
          textDecoration: "underline",
          cursor: busy ? "default" : "pointer"
        }}>
        Never show this on {candidate.host}
      </button>

      <p style={{ margin: "8px 0 0", color: "#979fae", fontSize: "11px" }}>
        Stored on this device only. Nothing is sent anywhere.
      </p>
    </div>
  )
}
