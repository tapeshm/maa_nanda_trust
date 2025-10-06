-- Add HTML column for pre-rendered editor output.
ALTER TABLE editor_documents
  ADD COLUMN content_html TEXT DEFAULT '' NOT NULL;
