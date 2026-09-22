export interface Env {
  DB?: D1Database
  counter_db?: D1Database
  ADMIN_TOKEN?: string
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
