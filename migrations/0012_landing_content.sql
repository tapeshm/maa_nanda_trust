-- migration: 0012_landing_content.sql

CREATE TABLE IF NOT EXISTS landing_content (
    id INTEGER PRIMARY KEY CHECK (id = 1), -- Ensure singleton row
    hero_eyebrow TEXT NOT NULL DEFAULT 'Maa Nanda Kansuwa Trust',
    hero_title TEXT NOT NULL DEFAULT 'Enter the Divine Resonance',
    hero_description TEXT NOT NULL DEFAULT 'Guided by centuries of Himalayan devotion, the temple opens its doors to every seeker with warmth, wisdom, and seva.',
    welcome_title TEXT NOT NULL DEFAULT 'Rajrajeshwari Mandir',
    welcome_description TEXT NOT NULL DEFAULT 'In the heart of the Garhwal Himalayas, the Maa Nanda Devi Trust is dedicated to preserving the sacred heritage of the Rajrajeshwari Mandir, fostering community well-being, and living in service to the divine feminine.',
    projects_title TEXT NOT NULL DEFAULT 'Our Projects',
    projects_description TEXT NOT NULL DEFAULT 'Current initiatives and ongoing service projects.',
    events_title TEXT NOT NULL DEFAULT 'Upcoming Events',
    events_description TEXT NOT NULL DEFAULT 'Join us for festivals, workshops, and community gatherings.',
    updatedAt INTEGER DEFAULT (unixepoch())
);

-- Insert default row if it doesn't exist
INSERT OR IGNORE INTO landing_content (id) VALUES (1);
