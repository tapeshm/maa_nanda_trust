CREATE TABLE events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  longDescription TEXT,
  imageUrl TEXT,
  location TEXT,
  startDate TEXT, -- ISO 8601 date YYYY-MM-DD
  displayDate TEXT, -- Free text e.g. "Jan 19-25, 2026"
  status TEXT CHECK(status IN ('Upcoming', 'Completed', 'Postponed')) DEFAULT 'Upcoming',
  contactPerson TEXT, -- JSON { name: string, avatarUrl: string }
  createdAt INTEGER DEFAULT (unixepoch()),
  updatedAt INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_events_startDate ON events(startDate);
