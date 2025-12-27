-- migration: 0017_donation_records.sql

CREATE TABLE IF NOT EXISTS donation_records (
    id TEXT PRIMARY KEY,
    name TEXT,
    mobile TEXT,
    pan_number TEXT,
    committed_amount REAL,
    donated_amount REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_donation_records_created_at ON donation_records(created_at);
CREATE INDEX IF NOT EXISTS idx_donation_records_name ON donation_records(name);

CREATE TRIGGER IF NOT EXISTS trigger_donation_records_updated_at
AFTER UPDATE ON donation_records
FOR EACH ROW
BEGIN
    UPDATE donation_records SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;
