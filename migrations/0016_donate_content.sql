-- migration: 0016_donate_content.sql

CREATE TABLE IF NOT EXISTS donate_content (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    qr_code_url TEXT NOT NULL DEFAULT '',
    appeal TEXT NOT NULL DEFAULT '<p>Your support helps us maintain the temple and serve the community. Every contribution, big or small, makes a difference.</p>',
    updatedAt INTEGER DEFAULT (unixepoch())
);

INSERT OR IGNORE INTO donate_content (id) VALUES (1);
