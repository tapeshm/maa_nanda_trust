-- migration: 0015_transparency_content.sql

CREATE TABLE IF NOT EXISTS transparency_content (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    hero_title TEXT NOT NULL DEFAULT 'Transparency & Compliance',
    hero_description TEXT NOT NULL DEFAULT 'Official documents, financial reports, and registration details of the Maa Nanda Kansuwa Trust.',
    trust_name TEXT NOT NULL DEFAULT 'Maa Nanda Kansuwa Trust',
    registration_number TEXT NOT NULL DEFAULT 'UK1234567890',
    registration_date TEXT NOT NULL DEFAULT '2023-01-15',
    property_details_json TEXT NOT NULL DEFAULT '["Temple land and premises at Kansuwa Village, Rudraprayag, Uttarakhand.","Community hall adjacent to the temple.","Agricultural land for community farming initiatives."]',
    documents_json TEXT NOT NULL DEFAULT '[{"name":"Trust Deed","url":"/documents/trust-deed.pdf","description":"The official legal document establishing the trust and its objectives."},{"name":"Annual Report 2024","url":"/documents/annual-report-2024.pdf","description":"A summary of the trust''s activities and financial statements for the fiscal year 2024."},{"name":"80G Tax Exemption Certificate","url":"/documents/80g-certificate.pdf","description":"Certificate granting tax exemption for donations made to the trust."}]',
    updatedAt INTEGER DEFAULT (unixepoch())
);

INSERT OR IGNORE INTO transparency_content (id) VALUES (1);
