-- myNote V1 schema. day_of_week: 0=Monday … 6=Sunday.
-- reminder_dismissals is keyed by event + local date so a dismiss lasts one day.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  reminder_lead_days INTEGER NOT NULL CHECK (reminder_lead_days IN (1, 2)),
  home_photo_path TEXT,
  home_photo_visible INTEGER NOT NULL CHECK (home_photo_visible IN (0, 1)) DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS note_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content_json TEXT NOT NULL,
  group_id TEXT,
  cover_image_path TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (group_id) REFERENCES note_groups(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS todos (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  done INTEGER NOT NULL CHECK (done IN (0, 1)) DEFAULT 0,
  due_date TEXT,
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  event_date TEXT NOT NULL,
  reminder_enabled INTEGER NOT NULL CHECK (reminder_enabled IN (0, 1)) DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS timetable_entries (
  id TEXT PRIMARY KEY,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_minutes INTEGER NOT NULL,
  end_minutes INTEGER NOT NULL,
  title TEXT NOT NULL,
  location TEXT,
  updated_at TEXT NOT NULL,
  CHECK (end_minutes > start_minutes)
);

CREATE TABLE IF NOT EXISTS reminder_dismissals (
  event_id TEXT NOT NULL,
  for_date TEXT NOT NULL,
  dismissed_at TEXT NOT NULL,
  PRIMARY KEY (event_id, for_date),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);
