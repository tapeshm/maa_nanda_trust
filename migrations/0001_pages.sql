-- [D3:pages.step-03:ddl] Unified pages schema with status flag for preview and published snapshots.
CREATE TABLE IF NOT EXISTS pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL CHECK (slug IN ('landing','activities','events')),
  version INTEGER NOT NULL,
  title TEXT NOT NULL,
  hero_image_key TEXT,
  donate_enabled INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('preview','published')) DEFAULT 'preview',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  published_at TEXT,
  UNIQUE(slug, version, status)
);

CREATE INDEX IF NOT EXISTS idx_pages_slug_status_version ON pages(slug, status, version DESC);

CREATE TABLE IF NOT EXISTS sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('welcome','activities','events')),
  pos INTEGER NOT NULL DEFAULT 0,
  config_json TEXT,
  content_html TEXT,
  content_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_sections_page ON sections(page_id);

CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  image_key TEXT,
  image_alt TEXT,
  description_html TEXT,
  description_json TEXT,
  pos INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_activities_page ON activities(page_id);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  image_key TEXT,
  image_alt TEXT,
  start_date TEXT,
  end_date TEXT,
  description_html TEXT,
  description_json TEXT,
  pos INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_events_page ON events(page_id);
