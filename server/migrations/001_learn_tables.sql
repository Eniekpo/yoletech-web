-- 001_learn_tables.sql
-- Adds Learn courses, learner profiles, enrollments, and editable Learn page content.
-- Existing tables (users, inquiries, portfolio_projects, testimonials) are untouched.

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  short_description TEXT NOT NULL,
  outcomes_json TEXT NOT NULL DEFAULT '[]',
  level TEXT NOT NULL DEFAULT 'Beginner',
  mode TEXT NOT NULL DEFAULT 'online' CHECK(mode IN ('online', 'in-person', 'hybrid')),
  duration TEXT DEFAULT '',
  price TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('draft', 'published')),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS learner_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK(gender IN ('Male', 'Female', 'Prefer not to say')),
  country_code TEXT NOT NULL,
  country_name TEXT NOT NULL,
  state_code TEXT DEFAULT '',
  state_name TEXT NOT NULL,
  city TEXT NOT NULL,
  phone TEXT NOT NULL,
  consent_accepted_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  learner_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED')),
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (learner_id) REFERENCES learner_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS learn_page_content (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  headline TEXT NOT NULL,
  subheadline TEXT NOT NULL,
  cta_label TEXT NOT NULL,
  faq_json TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_courses_status_order ON courses(status, display_order, id);
CREATE INDEX IF NOT EXISTS idx_enrollments_learner ON enrollments(learner_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status_created ON enrollments(status, created_at);
CREATE INDEX IF NOT EXISTS idx_learner_profiles_country ON learner_profiles(country_name);
