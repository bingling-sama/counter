-- =========================================================
-- Cloudflare D1 Schema for Counter (Busuanzi-compatible)
-- =========================================================

-- 1. Sites Table: Overall statistics for each domain
CREATE TABLE IF NOT EXISTS sites (
  domain TEXT PRIMARY KEY,
  site_pv INTEGER NOT NULL DEFAULT 0,
  site_uv INTEGER NOT NULL DEFAULT 0,
  offset_pv INTEGER NOT NULL DEFAULT 0,
  offset_uv INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Pages Table: Statistics per domain and path
CREATE TABLE IF NOT EXISTS pages (
  domain TEXT NOT NULL,
  path TEXT NOT NULL,
  page_pv INTEGER NOT NULL DEFAULT 0,
  page_uv INTEGER NOT NULL DEFAULT 0,
  offset_pv INTEGER NOT NULL DEFAULT 0,
  offset_uv INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (domain, path)
);

-- 3. UV Logs Table: Daily unique visitor records (for deduplication)
-- path = '*' indicates site-wide UV record
-- path = '/xxx' indicates page-specific UV record
CREATE TABLE IF NOT EXISTS uv_logs (
  domain TEXT NOT NULL,
  path TEXT NOT NULL,
  visitor_hash TEXT NOT NULL,
  log_date TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (domain, path, visitor_hash, log_date)
);

CREATE INDEX IF NOT EXISTS idx_uv_logs_date ON uv_logs (log_date);
CREATE INDEX IF NOT EXISTS idx_uv_logs_domain ON uv_logs (domain);
