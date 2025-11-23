PRAGMA foreign_keys=OFF;

CREATE TABLE sections_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('welcome','activities','events','content')),
  pos INTEGER NOT NULL DEFAULT 0,
  config_json TEXT,
  content_html TEXT,
  content_json TEXT
);

INSERT INTO sections_new SELECT * FROM sections;

DROP TABLE sections;

ALTER TABLE sections_new RENAME TO sections;

CREATE INDEX idx_sections_page ON sections(page_id);

PRAGMA foreign_keys=ON;
