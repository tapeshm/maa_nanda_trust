PRAGMA foreign_keys=OFF;

CREATE TABLE pages_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL CHECK (slug IN ('landing','activities','events','about','transparency')),
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

INSERT INTO pages_new SELECT * FROM pages;

DROP TABLE pages;

ALTER TABLE pages_new RENAME TO pages;

CREATE INDEX idx_pages_slug_status_version ON pages(slug, status, version DESC);

PRAGMA foreign_keys=ON;
