-- [D3:editor-tiptap.step-07:editor-documents-schema]
CREATE TABLE IF NOT EXISTS editor_documents (
  slug TEXT NOT NULL,
  document_id TEXT NOT NULL,
  profile TEXT NOT NULL,
  content_json TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (slug, document_id)
);

CREATE INDEX IF NOT EXISTS idx_editor_documents_slug ON editor_documents (slug);
