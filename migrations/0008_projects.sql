-- migration: 0008_projects.sql

CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    longDescription TEXT,
    imageUrl TEXT,
    location TEXT,
    startDate TEXT,
    status TEXT CHECK(status IN ('Ongoing', 'Completed', 'Planned')),
    endDate TEXT,
    budget REAL,
    spent REAL,
    contactPerson TEXT,
    team TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TRIGGER IF NOT EXISTS trigger_projects_updated_at
AFTER UPDATE ON projects
FOR EACH ROW
BEGIN
    UPDATE projects SET updatedAt = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;
