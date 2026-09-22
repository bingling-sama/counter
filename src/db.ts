import type { CounterStats, SiteRecord, PageRecord } from "./types"

/**
 * Check if a visitor has already visited the given domain & path today.
 */
export async function isVisitorRecorded(
  db: D1Database,
  domain: string,
  path: string,
  visitorHash: string,
  today: string
): Promise<boolean> {
  const query = `
    SELECT 1 FROM uv_logs 
    WHERE domain = ? AND path = ? AND visitor_hash = ? AND log_date = ?
    LIMIT 1
  `
  const res = await db.prepare(query).bind(domain, path, visitorHash, today).first()
  return res !== null
}

/**
 * Increment visit counts and return the current totals (including offsets).
 */
export async function recordAndGetStats(
  db: D1Database,
  domain: string,
  path: string,
  visitorHash: string,
  shouldRecord: boolean = true
): Promise<CounterStats> {
  const today = new Date().toISOString().slice(0, 10)

  if (shouldRecord) {
    // Check UV uniqueness for site ('*') and page (path)
    const [isSiteUvLogged, isPageUvLogged] = await Promise.all([
      isVisitorRecorded(db, domain, "*", visitorHash, today),
      isVisitorRecorded(db, domain, path, visitorHash, today)
    ])

    const isNewSiteUv = !isSiteUvLogged
    const isNewPageUv = !isPageUvLogged

    // Execute atomic batch
    await db.batch([
      // 1. Insert UV logs
      db
        .prepare(
          "INSERT OR IGNORE INTO uv_logs (domain, path, visitor_hash, log_date) VALUES (?, ?, ?, ?)"
        )
        .bind(domain, "*", visitorHash, today),
      db
        .prepare(
          "INSERT OR IGNORE INTO uv_logs (domain, path, visitor_hash, log_date) VALUES (?, ?, ?, ?)"
        )
        .bind(domain, path, visitorHash, today),

      // 2. Upsert site totals
      db
        .prepare(
          `INSERT INTO sites (domain, site_pv, site_uv) VALUES (?, 1, ?)
           ON CONFLICT(domain) DO UPDATE SET
             site_pv = site_pv + 1,
             site_uv = site_uv + ?,
             updated_at = CURRENT_TIMESTAMP`
        )
        .bind(domain, isNewSiteUv ? 1 : 0, isNewSiteUv ? 1 : 0),

      // 3. Upsert page totals
      db
        .prepare(
          `INSERT INTO pages (domain, path, page_pv, page_uv) VALUES (?, ?, 1, ?)
           ON CONFLICT(domain, path) DO UPDATE SET
             page_pv = page_pv + 1,
             page_uv = page_uv + ?,
             updated_at = CURRENT_TIMESTAMP`
        )
        .bind(domain, path, isNewPageUv ? 1 : 0, isNewPageUv ? 1 : 0)
    ])
  }

  // Retrieve current stats
  const [siteRow, pageRow] = await Promise.all([
    db
      .prepare(
        "SELECT (site_pv + offset_pv) AS pv, (site_uv + offset_uv) AS uv FROM sites WHERE domain = ?"
      )
      .bind(domain)
      .first<{ pv: number; uv: number }>(),
    db
      .prepare(
        "SELECT (page_pv + offset_pv) AS pv, (page_uv + offset_uv) AS uv FROM pages WHERE domain = ? AND path = ?"
      )
      .bind(domain, path)
      .first<{ pv: number; uv: number }>()
  ])

  return {
    site_pv: siteRow?.pv ?? 0,
    site_uv: siteRow?.uv ?? 0,
    page_pv: pageRow?.pv ?? 0,
    page_uv: pageRow?.uv ?? 0,
    version: 2.4
  }
}

/**
 * Set historical offset for a site or page.
 */
export async function setOffset(
  db: D1Database,
  domain: string,
  path: string | null,
  offsetPv: number,
  offsetUv: number
): Promise<void> {
  if (!path || path === "*") {
    await db
      .prepare(
        `INSERT INTO sites (domain, site_pv, site_uv, offset_pv, offset_uv) VALUES (?, 0, 0, ?, ?)
         ON CONFLICT(domain) DO UPDATE SET
           offset_pv = ?,
           offset_uv = ?,
           updated_at = CURRENT_TIMESTAMP`
      )
      .bind(domain, offsetPv, offsetUv, offsetPv, offsetUv)
      .run()
  } else {
    await db
      .prepare(
        `INSERT INTO pages (domain, path, page_pv, page_uv, offset_pv, offset_uv) VALUES (?, ?, 0, 0, ?, ?)
         ON CONFLICT(domain, path) DO UPDATE SET
           offset_pv = ?,
           offset_uv = ?,
           updated_at = CURRENT_TIMESTAMP`
      )
      .bind(domain, path, offsetPv, offsetUv, offsetPv, offsetUv)
      .run()
  }
}

/**
 * Get domain details for admin/dashboard.
 */
export async function getDomainOverview(db: D1Database, domain: string) {
  const site = await db
    .prepare("SELECT * FROM sites WHERE domain = ?")
    .bind(domain)
    .first<SiteRecord>()

  const pages = await db
    .prepare(
      "SELECT path, page_pv, page_uv, offset_pv, offset_uv, (page_pv + offset_pv) as total_pv, (page_uv + offset_uv) as total_uv FROM pages WHERE domain = ? ORDER BY total_pv DESC LIMIT 100"
    )
    .bind(domain)
    .all<PageRecord>()

  return { site, pages: pages.results }
}
