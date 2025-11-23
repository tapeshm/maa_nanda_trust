-- migration: 0014_about_trustees.sql

-- Add trustees_json column to about_content table
-- SQLite does not support adding a column with a default value that is an expression (like a complex JSON string) easily in older versions, 
-- but adding a TEXT column is generally safe. We default to an empty array '[]'.

ALTER TABLE about_content ADD COLUMN trustees_json TEXT NOT NULL DEFAULT '[]';

-- Update the existing row with default trustees data if needed, or let the application handle the fallback.
-- We'll leave it as empty array for now; the application code handles the fallback to DEFAULT_ABOUT_CONTENT if the parsed array is empty or if the row is missing.
