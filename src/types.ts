export interface Env {
  DB: D1Database
  // Optional secret key for admin APIs (e.g. updating offsets)
  ADMIN_TOKEN?: string
  // Optional allowed origins (comma separated or * for any)
  ALLOWED_ORIGINS?: string
}

export interface CounterStats {
  site_pv: number
  site_uv: number
  page_pv: number
  page_uv: number
  version: number
}

export interface SiteRecord {
  domain: string
  site_pv: number
  site_uv: number
  offset_pv: number
  offset_uv: number
}

export interface PageRecord {
  domain: string
  path: string
  page_pv: number
  page_uv: number
  offset_pv: number
  offset_uv: number
}
