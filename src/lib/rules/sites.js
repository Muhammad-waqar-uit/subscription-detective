/**
 * Per-site rules for services people commonly pay for (FR-9).
 * Matching is suffix-based on the hostname: every entry also matches subdomains.
 */

export const SITE_RULES = [
  { name: "Netflix", hosts: ["netflix.com"], accountUrl: "https://www.netflix.com/account" },
  { name: "Spotify", hosts: ["spotify.com"], accountUrl: "https://www.spotify.com/account/overview/" },
  { name: "Notion", hosts: ["notion.so", "notion.site"], accountUrl: "https://www.notion.so/my-account" },
  { name: "Figma", hosts: ["figma.com"], accountUrl: "https://www.figma.com/settings" },
  { name: "Canva", hosts: ["canva.com"], accountUrl: "https://www.canva.com/settings/billing" },
  { name: "Adobe", hosts: ["adobe.com"], accountUrl: "https://account.adobe.com/plans" },
  { name: "ChatGPT", hosts: ["chatgpt.com", "openai.com"], accountUrl: "https://chatgpt.com/#settings/Subscription" },
  { name: "Claude", hosts: ["claude.ai", "anthropic.com"], accountUrl: "https://claude.ai/settings/billing" },
  { name: "GitHub", hosts: ["github.com"], accountUrl: "https://github.com/settings/billing" },
  { name: "Slack", hosts: ["slack.com"], accountUrl: "https://slack.com/intl/en-gb/help/articles/218915087" },
  { name: "Dropbox", hosts: ["dropbox.com"], accountUrl: "https://www.dropbox.com/account/plan" },
  { name: "Disney+", hosts: ["disneyplus.com"], accountUrl: "https://www.disneyplus.com/account" },
  { name: "Hulu", hosts: ["hulu.com"], accountUrl: "https://secure.hulu.com/account" },
  { name: "Max", hosts: ["max.com", "hbomax.com"], accountUrl: "https://www.max.com/settings" },
  { name: "YouTube Premium", hosts: ["youtube.com"], accountUrl: "https://www.youtube.com/paid_memberships" },
  { name: "Amazon Prime", hosts: ["amazon.com", "primevideo.com"], accountUrl: "https://www.amazon.com/gp/primecentral" },
  { name: "Apple", hosts: ["apple.com", "icloud.com"], accountUrl: "https://appleid.apple.com" },
  { name: "Microsoft 365", hosts: ["microsoft.com", "office.com"], accountUrl: "https://account.microsoft.com/services" },
  { name: "Zoom", hosts: ["zoom.us"], accountUrl: "https://zoom.us/billing" },
  { name: "Linear", hosts: ["linear.app"], accountUrl: "https://linear.app/settings/billing" },
  { name: "Vercel", hosts: ["vercel.com"], accountUrl: "https://vercel.com/account/billing" },
  { name: "Cursor", hosts: ["cursor.com", "cursor.sh"], accountUrl: "https://cursor.com/settings" },
  { name: "Midjourney", hosts: ["midjourney.com"], accountUrl: "https://www.midjourney.com/account" },
  { name: "Grammarly", hosts: ["grammarly.com"], accountUrl: "https://account.grammarly.com" },
  { name: "Duolingo", hosts: ["duolingo.com"], accountUrl: "https://www.duolingo.com/settings" }
]

/** Strip `www.` and lowercase a hostname. */
export function normalizeHost(host) {
  return String(host ?? "")
    .toLowerCase()
    .replace(/^www\./, "")
}

/**
 * Find the rule for a hostname. Extra rules (user or remotely updated lists) are
 * checked first so they can override the bundled ones.
 */
export function findSiteRule(host, extraRules = []) {
  const target = normalizeHost(host)
  if (!target) return null

  const pool = [...(extraRules ?? []), ...SITE_RULES]

  return (
    pool.find((rule) =>
      (rule?.hosts ?? []).some((candidate) => {
        const value = normalizeHost(candidate)
        return target === value || target.endsWith(`.${value}`)
      })
    ) ?? null
  )
}

/** True when `host` is one of the muted sites, or a subdomain of one (FR-11). */
export function isMutedHost(host, mutedSites = []) {
  const target = normalizeHost(host)
  if (!target) return false

  return (mutedSites ?? []).some((site) => {
    const value = normalizeHost(site)
    return Boolean(value) && (target === value || target.endsWith(`.${value}`))
  })
}

/**
 * Add a host to the muted list (FR-31). Normalises first so `https://Acme.com/x`
 * and `acme.com` collapse to one entry, and returns a new array.
 */
export function addMutedSite(mutedSites = [], host) {
  const value = normalizeHost(host)
  if (!value) return [...(mutedSites ?? [])]
  return [...new Set([...(mutedSites ?? []).map((site) => normalizeHost(site)).filter(Boolean), value])]
}
