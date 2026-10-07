-- The small database behind "Petition to join" (see scripts/worker.js). Already created; kept here as a record.
CREATE TABLE IF NOT EXISTS applications (id INTEGER PRIMARY KEY AUTOINCREMENT, quest TEXT NOT NULL, name TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending', created INTEGER NOT NULL, role TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', seed INTEGER NOT NULL DEFAULT 0);
-- email: where the keeper can reach them (never shown on the site). seed: the number their figure is drawn from.
CREATE INDEX IF NOT EXISTS by_status ON applications (status, created);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
