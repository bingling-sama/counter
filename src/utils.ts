/**
 * Calculate SHA-256 hash using Web Crypto API.
 */
export async function sha256(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

/**
 * Normalize path: ensure leading slash, remove trailing slash (except root), remove query/hash.
 */
export function normalizePath(path: string): string {
  if (!path) return "/"
  let clean = path.split("?")[0].split("#")[0].trim()
  if (!clean.startsWith("/")) clean = "/" + clean
  if (clean.length > 1 && clean.endsWith("/")) clean = clean.slice(0, -1)
  return clean
}

/**
 * Extract domain and path from Referer or query parameters fallback.
 */
export function extractTarget(
  request: Request,
  url: URL
): { domain: string; path: string } | null {
  // 1. Try query parameters first if explicitly passed
  const queryDomain = url.searchParams.get("domain")
  const queryPath = url.searchParams.get("path")
  if (queryDomain) {
    return {
      domain: queryDomain.toLowerCase().trim(),
      path: normalizePath(queryPath || "/")
    }
  }

  // 2. Try Referer header
  const referer = request.headers.get("referer")
  if (referer) {
    try {
      const refUrl = new URL(referer)
      return {
        domain: refUrl.hostname.toLowerCase(),
        path: normalizePath(refUrl.pathname)
      }
    } catch {
      // Invalid referer URL format
    }
  }

  // 3. Try Origin header
  const origin = request.headers.get("origin")
  if (origin) {
    try {
      const orgUrl = new URL(origin)
      return {
        domain: orgUrl.hostname.toLowerCase(),
        path: "/"
      }
    } catch {
      // Invalid origin
    }
  }

  return null
}

/**
 * Generate standard CORS headers.
 */
export function corsHeaders(origin: string | null = "*"): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400"
  }
}
