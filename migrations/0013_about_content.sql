-- migration: 0013_about_content.sql

CREATE TABLE IF NOT EXISTS about_content (
    id INTEGER PRIMARY KEY CHECK (id = 1), -- Ensure singleton row
    hero_title TEXT NOT NULL DEFAULT 'About Maa Nanda Kansuwa Trust',
    hero_description TEXT NOT NULL DEFAULT 'Dedicated to preserving the spiritual heritage and serving the community of Kansuwa.',
    mission_title TEXT NOT NULL DEFAULT 'Our Mission',
    mission_description TEXT NOT NULL DEFAULT '<p>To restore and maintain the sacred Rajrajeshwari Mandir while fostering a community grounded in service, devotion, and cultural preservation.</p>',
    vision_title TEXT NOT NULL DEFAULT 'Our Vision',
    vision_description TEXT NOT NULL DEFAULT 'A thriving spiritual center that uplifts the local community through education, healthcare, and sustainable development.',
    values_json TEXT NOT NULL DEFAULT '[{"title":"Seva (Service)","description":"Selfless service to the deity and the community."},{"title":"Dharma (Duty)","description":"Upholding righteous conduct and spiritual traditions."},{"title":"Sangha (Community)","description":"Building a supportive and united community."}]',
    story_title TEXT NOT NULL DEFAULT 'Our Story',
    story_description TEXT NOT NULL DEFAULT '<p>The Maa Nanda Kansuwa Trust was established to formalize the centuries-old tradition of worship and community service in Kansuwa village. Rooted in the legend of Maa Nanda, we strive to keep the flame of devotion alive for future generations.</p>',
    updatedAt INTEGER DEFAULT (unixepoch())
);

-- Insert default row if it doesn't exist
INSERT OR IGNORE INTO about_content (id) VALUES (1);
