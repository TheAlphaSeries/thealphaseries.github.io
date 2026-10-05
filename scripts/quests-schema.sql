-- The small database behind "Petition to join" (see scripts/worker.js). Already created; kept here as a record.
CREATE TABLE IF NOT EXISTS applications (id INTEGER PRIMARY KEY AUTOINCREMENT, quest TEXT NOT NULL, name TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending', created INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS by_status ON applications (status, created);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
