import {
  DEFAULT_LEARN_PAGE_CONTENT,
  DEFAULT_SEED_COURSES,
  type CourseMode,
  type CourseStatus,
  type EnrollmentStatus,
  type LearnFaqItem,
  type LearnPageContentData,
  type LearnerGender
} from './seed-data';
import {
  slugifyCourseTitle,
  type CourseInput,
  type LearnPageContentInput
} from './schema';

export interface DbStatement {
  get(...args: unknown[]): unknown;
  all(...args: unknown[]): unknown[];
  run(...args: unknown[]): { lastInsertRowid?: number | bigint; changes?: number };
}

export interface DbLike {
  exec(sql: string): void;
  prepare(sql: string): DbStatement;
}

export interface CourseRecord {
  id: number;
  title: string;
  slug: string;
  short_description: string;
  outcomes: string[];
  level: string;
  mode: CourseMode;
  duration: string;
  price: string;
  status: CourseStatus;
  display_order: number;
  created_at: string;
  updated_at: string;
  enrollment_count?: number;
}

export interface LearnerProfileRecord {
  id: number;
  user_id: number;
  full_name: string;
  gender: LearnerGender;
  country_code: string;
  country_name: string;
  state_code: string;
  state_name: string;
  city: string;
  phone: string;
  consent_accepted_at: string;
  created_at: string;
  updated_at: string;
}

export interface LearnerEnrollmentView {
  id: number;
  learner_id: number;
  course_id: number;
  status: EnrollmentStatus;
  notes: string;
  created_at: string;
  updated_at: string;
  course_title: string;
  course_slug: string;
  course_level: string;
  course_mode: CourseMode;
  course_duration: string;
  course_price: string;
  course_short_description: string;
}

export interface AdminRegistrationRow {
  enrollment_id: number;
  learner_id: number;
  user_id: number;
  course_id: number;
  full_name: string;
  email: string;
  gender: LearnerGender;
  phone: string;
  country_code: string;
  country_name: string;
  state_code: string;
  state_name: string;
  city: string;
  course_title: string;
  course_slug: string;
  status: EnrollmentStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface AdminLearnSummary {
  totalRegistrations: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  completedCount: number;
  publishedCourses: number;
  totalCourses: number;
  registrationsPerCourse: Array<{
    course_id: number;
    course_title: string;
    course_slug: string;
    count: number;
  }>;
}

export interface RegistrationFilterParams {
  search?: string;
  courseId?: number;
  country?: string;
  status?: EnrollmentStatus;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface RegisteredUserPayload {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  service_interest: string;
  role: string;
  status: string;
  created_at: string;
}

export type RegisterLearnerOutcome =
  | {
      ok: true;
      user: RegisteredUserPayload;
      profile: LearnerProfileRecord;
      enrollment: LearnerEnrollmentView;
    }
  | {
      ok: false;
      code: 'EMAIL_EXISTS' | 'COURSE_NOT_FOUND' | 'DB_ERROR';
    };

interface RawCourseRow {
  id: number;
  title: string;
  slug: string;
  short_description: string;
  outcomes_json: string;
  level: string;
  mode: string;
  duration: string;
  price: string;
  status: string;
  display_order: number;
  created_at: string;
  updated_at: string;
  enrollment_count?: number;
}

interface RawPageContentRow {
  id: number;
  headline: string;
  subheadline: string;
  cta_label: string;
  faq_json: string;
  updated_at: string;
}

function parseJsonStringArray(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((x) => String(x)).filter(Boolean);
    }
  } catch {
    // ignore malformed json
  }
  return [];
}

function parseFaqJson(raw: string | undefined): LearnFaqItem[] {
  if (!raw) return DEFAULT_LEARN_PAGE_CONTENT.faq;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
        .map((item) => ({
          question: String(item.question ?? '').trim(),
          answer: String(item.answer ?? '').trim()
        }))
        .filter((item) => item.question.length > 0 && item.answer.length > 0);
    }
  } catch {
    // fallback below
  }
  return DEFAULT_LEARN_PAGE_CONTENT.faq;
}

function hydrateCourse(row: RawCourseRow): CourseRecord {
  const modeVal = row.mode === 'in-person' || row.mode === 'hybrid' ? row.mode : 'online';
  const statusVal: CourseStatus = row.status === 'draft' ? 'draft' : 'published';
  return {
    id: Number(row.id),
    title: String(row.title),
    slug: String(row.slug),
    short_description: String(row.short_description),
    outcomes: parseJsonStringArray(row.outcomes_json),
    level: String(row.level || 'Beginner'),
    mode: modeVal,
    duration: String(row.duration || ''),
    price: String(row.price || ''),
    status: statusVal,
    display_order: Number(row.display_order || 0),
    created_at: String(row.created_at || ''),
    updated_at: String(row.updated_at || ''),
    ...(row.enrollment_count !== undefined ? { enrollment_count: Number(row.enrollment_count) } : {})
  };
}

export function ensureLearnSchemaAndSeed(db: DbLike): void {
  db.exec(`
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
  `);

  const countRow = db.prepare('SELECT COUNT(*) as count FROM courses').get() as { count?: number } | undefined;
  if (!countRow || Number(countRow.count || 0) === 0) {
    const insertCourse = db.prepare(`
      INSERT OR IGNORE INTO courses
        (title, slug, short_description, outcomes_json, level, mode, duration, price, status, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const c of DEFAULT_SEED_COURSES) {
      insertCourse.run(
        c.title,
        c.slug,
        c.short_description,
        JSON.stringify(c.outcomes),
        c.level,
        c.mode,
        c.duration,
        c.price,
        c.status,
        c.display_order
      );
    }
  }

  const contentRow = db.prepare('SELECT id FROM learn_page_content WHERE id = 1').get() as { id?: number } | undefined;
  if (!contentRow) {
    db.prepare(`
      INSERT INTO learn_page_content (id, headline, subheadline, cta_label, faq_json)
      VALUES (1, ?, ?, ?, ?)
    `).run(
      DEFAULT_LEARN_PAGE_CONTENT.headline,
      DEFAULT_LEARN_PAGE_CONTENT.subheadline,
      DEFAULT_LEARN_PAGE_CONTENT.cta_label,
      JSON.stringify(DEFAULT_LEARN_PAGE_CONTENT.faq)
    );
  }
}

export function listPublishedCourses(db: DbLike): CourseRecord[] {
  const rows = db
    .prepare(
      `SELECT id, title, slug, short_description, outcomes_json, level, mode, duration, price, status, display_order, created_at, updated_at
       FROM courses
       WHERE status = 'published'
       ORDER BY display_order ASC, id ASC`
    )
    .all() as RawCourseRow[];
  return rows.map(hydrateCourse);
}

export function listAllCourses(db: DbLike): CourseRecord[] {
  const rows = db
    .prepare(
      `SELECT c.id, c.title, c.slug, c.short_description, c.outcomes_json, c.level, c.mode, c.duration, c.price, c.status, c.display_order, c.created_at, c.updated_at,
              COUNT(e.id) AS enrollment_count
       FROM courses c
       LEFT JOIN enrollments e ON e.course_id = c.id
       GROUP BY c.id
       ORDER BY c.display_order ASC, c.id ASC`
    )
    .all() as RawCourseRow[];
  return rows.map(hydrateCourse);
}

export function getCourseById(db: DbLike, id: number): CourseRecord | null {
  const row = db
    .prepare(
      `SELECT id, title, slug, short_description, outcomes_json, level, mode, duration, price, status, display_order, created_at, updated_at
       FROM courses WHERE id = ?`
    )
    .get(id) as RawCourseRow | undefined;
  return row ? hydrateCourse(row) : null;
}

export function createCourse(db: DbLike, input: CourseInput): CourseRecord {
  const baseSlug = input.slug && input.slug.length > 0 ? input.slug : slugifyCourseTitle(input.title);
  let slug = baseSlug || `course-${Date.now()}`;
  const existing = db.prepare('SELECT id FROM courses WHERE slug = ?').get(slug) as { id?: number } | undefined;
  if (existing) {
    slug = `${slug}-${Date.now().toString().slice(-4)}`;
  }

  let displayOrder = input.display_order;
  if (!displayOrder) {
    const maxRow = db.prepare('SELECT COALESCE(MAX(display_order), 0) AS max_order FROM courses').get() as
      | { max_order?: number }
      | undefined;
    displayOrder = Number(maxRow?.max_order || 0) + 1;
  }

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const res = db
    .prepare(
      `INSERT INTO courses (title, slug, short_description, outcomes_json, level, mode, duration, price, status, display_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.title,
      slug,
      input.short_description,
      JSON.stringify(input.outcomes),
      input.level,
      input.mode,
      input.duration || '',
      input.price || '',
      input.status || 'draft',
      displayOrder,
      now,
      now
    );

  const created = getCourseById(db, Number(res.lastInsertRowid));
  if (!created) {
    throw new Error('Failed to retrieve newly created course.');
  }
  return created;
}

export function updateCourse(db: DbLike, id: number, input: Partial<CourseInput>): CourseRecord | null {
  const existing = getCourseById(db, id);
  if (!existing) return null;

  const nextTitle = input.title ?? existing.title;
  const nextSlug =
    input.slug && input.slug.length > 0 ? input.slug : existing.slug;
  const nextDesc = input.short_description ?? existing.short_description;
  const nextOutcomes = input.outcomes ?? existing.outcomes;
  const nextLevel = input.level ?? existing.level;
  const nextMode = input.mode ?? existing.mode;
  const nextDuration = input.duration !== undefined ? input.duration : existing.duration;
  const nextPrice = input.price !== undefined ? input.price : existing.price;
  const nextStatus = input.status ?? existing.status;
  const nextOrder = input.display_order !== undefined ? input.display_order : existing.display_order;
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  db.prepare(
    `UPDATE courses
     SET title = ?, slug = ?, short_description = ?, outcomes_json = ?, level = ?, mode = ?, duration = ?, price = ?, status = ?, display_order = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    nextTitle,
    nextSlug,
    nextDesc,
    JSON.stringify(nextOutcomes),
    nextLevel,
    nextMode,
    nextDuration,
    nextPrice,
    nextStatus,
    nextOrder,
    now,
    id
  );

  return getCourseById(db, id);
}

export function deleteOrArchiveCourse(
  db: DbLike,
  id: number
): { action: 'deleted' | 'archived' | 'not_found'; enrollmentCount: number } {
  const existing = getCourseById(db, id);
  if (!existing) return { action: 'not_found', enrollmentCount: 0 };

  const countRow = db
    .prepare('SELECT COUNT(*) as count FROM enrollments WHERE course_id = ?')
    .get(id) as { count?: number } | undefined;
  const enrollmentCount = Number(countRow?.count || 0);

  if (enrollmentCount > 0) {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    db.prepare(`UPDATE courses SET status = 'draft', updated_at = ? WHERE id = ?`).run(now, id);
    return { action: 'archived', enrollmentCount };
  }

  db.prepare('DELETE FROM courses WHERE id = ?').run(id);
  return { action: 'deleted', enrollmentCount: 0 };
}

export function reorderCourses(db: DbLike, orderedIds: number[]): CourseRecord[] {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const stmt = db.prepare('UPDATE courses SET display_order = ?, updated_at = ? WHERE id = ?');
  db.exec('BEGIN IMMEDIATE;');
  try {
    orderedIds.forEach((courseId, index) => {
      stmt.run(index + 1, now, courseId);
    });
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
  return listAllCourses(db);
}

export function getLearnPageContent(db: DbLike): LearnPageContentData {
  const row = db
    .prepare('SELECT id, headline, subheadline, cta_label, faq_json, updated_at FROM learn_page_content WHERE id = 1')
    .get() as RawPageContentRow | undefined;
  if (!row) {
    return { ...DEFAULT_LEARN_PAGE_CONTENT };
  }
  return {
    headline: String(row.headline || DEFAULT_LEARN_PAGE_CONTENT.headline),
    subheadline: String(row.subheadline || DEFAULT_LEARN_PAGE_CONTENT.subheadline),
    cta_label: String(row.cta_label || DEFAULT_LEARN_PAGE_CONTENT.cta_label),
    faq: parseFaqJson(row.faq_json),
    updated_at: String(row.updated_at || '')
  };
}

export function updateLearnPageContent(db: DbLike, input: LearnPageContentInput): LearnPageContentData {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const exists = db.prepare('SELECT id FROM learn_page_content WHERE id = 1').get() as { id?: number } | undefined;
  if (exists) {
    db.prepare(
      `UPDATE learn_page_content
       SET headline = ?, subheadline = ?, cta_label = ?, faq_json = ?, updated_at = ?
       WHERE id = 1`
    ).run(input.headline, input.subheadline, input.cta_label, JSON.stringify(input.faq), now);
  } else {
    db.prepare(
      `INSERT INTO learn_page_content (id, headline, subheadline, cta_label, faq_json, updated_at)
       VALUES (1, ?, ?, ?, ?, ?)`
    ).run(input.headline, input.subheadline, input.cta_label, JSON.stringify(input.faq), now);
  }
  return getLearnPageContent(db);
}

export function registerLearnerTransaction(
  db: DbLike,
  params: {
    fullName: string;
    gender: LearnerGender;
    countryCode: string;
    countryName: string;
    stateCode: string;
    stateName: string;
    city: string;
    courseId: number;
    phoneE164: string;
    email: string;
    passwordHash: string;
  }
): RegisterLearnerOutcome {
  const normalizedEmail = params.email.trim().toLowerCase();
  const course = db
    .prepare(
      `SELECT id, title, slug, short_description, outcomes_json, level, mode, duration, price, status, display_order, created_at, updated_at
       FROM courses WHERE id = ? AND status = 'published'`
    )
    .get(params.courseId) as RawCourseRow | undefined;

  if (!course) {
    return { ok: false, code: 'COURSE_NOT_FOUND' };
  }

  const existingUser = db
    .prepare('SELECT id FROM users WHERE LOWER(email) = ?')
    .get(normalizedEmail) as { id?: number } | undefined;

  if (existingUser) {
    return { ok: false, code: 'EMAIL_EXISTS' };
  }

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  db.exec('BEGIN IMMEDIATE;');
  try {
    const userRes = db
      .prepare(
        `INSERT INTO users (name, email, password_hash, phone, company, service_interest, role, status, admin_notes, created_at)
         VALUES (?, ?, ?, ?, '', ?, 'LEARNER', 'ACTIVE', 'Registered via YOLETECH Learn', ?)`
      )
      .run(
        params.fullName,
        normalizedEmail,
        params.passwordHash,
        params.phoneE164,
        course.title,
        now
      );

    const userId = Number(userRes.lastInsertRowid);

    const profileRes = db
      .prepare(
        `INSERT INTO learner_profiles
          (user_id, full_name, gender, country_code, country_name, state_code, state_name, city, phone, consent_accepted_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        userId,
        params.fullName,
        params.gender,
        params.countryCode,
        params.countryName,
        params.stateCode,
        params.stateName,
        params.city,
        params.phoneE164,
        now,
        now,
        now
      );

    const learnerId = Number(profileRes.lastInsertRowid);

    const enrollRes = db
      .prepare(
        `INSERT INTO enrollments (learner_id, course_id, status, notes, created_at, updated_at)
         VALUES (?, ?, 'PENDING', '', ?, ?)`
      )
      .run(learnerId, Number(course.id), now, now);

    const enrollmentId = Number(enrollRes.lastInsertRowid);
    db.exec('COMMIT;');

    const user: RegisteredUserPayload = {
      id: userId,
      name: params.fullName,
      email: normalizedEmail,
      phone: params.phoneE164,
      company: '',
      service_interest: course.title,
      role: 'LEARNER',
      status: 'ACTIVE',
      created_at: now
    };

    const profile: LearnerProfileRecord = {
      id: learnerId,
      user_id: userId,
      full_name: params.fullName,
      gender: params.gender,
      country_code: params.countryCode,
      country_name: params.countryName,
      state_code: params.stateCode,
      state_name: params.stateName,
      city: params.city,
      phone: params.phoneE164,
      consent_accepted_at: now,
      created_at: now,
      updated_at: now
    };

    const hydratedCourse = hydrateCourse(course);
    const enrollment: LearnerEnrollmentView = {
      id: enrollmentId,
      learner_id: learnerId,
      course_id: hydratedCourse.id,
      status: 'PENDING',
      notes: '',
      created_at: now,
      updated_at: now,
      course_title: hydratedCourse.title,
      course_slug: hydratedCourse.slug,
      course_level: hydratedCourse.level,
      course_mode: hydratedCourse.mode,
      course_duration: hydratedCourse.duration,
      course_price: hydratedCourse.price,
      course_short_description: hydratedCourse.short_description
    };

    return { ok: true, user, profile, enrollment };
  } catch (err) {
    db.exec('ROLLBACK;');
    const message = err instanceof Error ? err.message : String(err);
    if (/UNIQUE constraint failed: users\.email/i.test(message)) {
      return { ok: false, code: 'EMAIL_EXISTS' };
    }
    throw err;
  }
}

export function getLearnerDashboardData(
  db: DbLike,
  userId: number
): { profile: LearnerProfileRecord | null; enrollments: LearnerEnrollmentView[] } {
  const profile = db
    .prepare(
      `SELECT id, user_id, full_name, gender, country_code, country_name, state_code, state_name, city, phone, consent_accepted_at, created_at, updated_at
       FROM learner_profiles WHERE user_id = ?`
    )
    .get(userId) as LearnerProfileRecord | undefined;

  if (!profile) {
    return { profile: null, enrollments: [] };
  }

  const enrollments = db
    .prepare(
      `SELECT e.id, e.learner_id, e.course_id, e.status, e.notes, e.created_at, e.updated_at,
              c.title AS course_title, c.slug AS course_slug, c.level AS course_level, c.mode AS course_mode,
              c.duration AS course_duration, c.price AS course_price, c.short_description AS course_short_description
       FROM enrollments e
       INNER JOIN courses c ON c.id = e.course_id
       WHERE e.learner_id = ?
       ORDER BY e.created_at DESC, e.id DESC`
    )
    .all(profile.id) as LearnerEnrollmentView[];

  return { profile, enrollments };
}

export function getAdminLearnSummary(db: DbLike): AdminLearnSummary {
  const statusRows = db
    .prepare(`SELECT status, COUNT(*) as count FROM enrollments GROUP BY status`)
    .all() as Array<{ status: string; count: number }>;

  let totalRegistrations = 0;
  let pendingCount = 0;
  let approvedCount = 0;
  let rejectedCount = 0;
  let completedCount = 0;

  for (const row of statusRows) {
    const cnt = Number(row.count || 0);
    totalRegistrations += cnt;
    if (row.status === 'PENDING') pendingCount = cnt;
    else if (row.status === 'APPROVED') approvedCount = cnt;
    else if (row.status === 'REJECTED') rejectedCount = cnt;
    else if (row.status === 'COMPLETED') completedCount = cnt;
  }

  const courseCounts = db
    .prepare(
      `SELECT c.id AS course_id, c.title AS course_title, c.slug AS course_slug, COUNT(e.id) AS count
       FROM courses c
       LEFT JOIN enrollments e ON e.course_id = c.id
       GROUP BY c.id
       ORDER BY c.display_order ASC, c.id ASC`
    )
    .all() as Array<{ course_id: number; course_title: string; course_slug: string; count: number }>;

  const publishedRow = db
    .prepare(`SELECT COUNT(*) as count FROM courses WHERE status = 'published'`)
    .get() as { count?: number } | undefined;

  return {
    totalRegistrations,
    pendingCount,
    approvedCount,
    rejectedCount,
    completedCount,
    publishedCourses: Number(publishedRow?.count || 0),
    totalCourses: courseCounts.length,
    registrationsPerCourse: courseCounts.map((r) => ({
      course_id: Number(r.course_id),
      course_title: String(r.course_title),
      course_slug: String(r.course_slug),
      count: Number(r.count || 0)
    }))
  };
}

function buildRegistrationsWhereClause(filters: RegistrationFilterParams): {
  whereSql: string;
  params: unknown[];
} {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.courseId && Number.isInteger(filters.courseId) && filters.courseId > 0) {
    clauses.push('e.course_id = ?');
    params.push(filters.courseId);
  }
  if (filters.country && filters.country.trim()) {
    clauses.push('(LOWER(lp.country_name) = LOWER(?) OR LOWER(lp.country_code) = LOWER(?))');
    params.push(filters.country.trim(), filters.country.trim());
  }
  if (filters.status) {
    clauses.push('e.status = ?');
    params.push(filters.status);
  }
  if (filters.from && /^\d{4}-\d{2}-\d{2}$/.test(filters.from)) {
    clauses.push('date(e.created_at) >= date(?)');
    params.push(filters.from);
  }
  if (filters.to && /^\d{4}-\d{2}-\d{2}$/.test(filters.to)) {
    clauses.push('date(e.created_at) <= date(?)');
    params.push(filters.to);
  }
  if (filters.search && filters.search.trim()) {
    const like = `%${filters.search.trim().toLowerCase()}%`;
    clauses.push(
      `(LOWER(lp.full_name) LIKE ? OR LOWER(u.email) LIKE ? OR LOWER(lp.phone) LIKE ? OR LOWER(lp.city) LIKE ? OR LOWER(lp.state_name) LIKE ? OR LOWER(lp.country_name) LIKE ? OR LOWER(c.title) LIKE ?)`
    );
    params.push(like, like, like, like, like, like, like);
  }

  return {
    whereSql: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    params
  };
}

export function listAdminRegistrations(
  db: DbLike,
  filters: RegistrationFilterParams,
  paginate = true
): {
  registrations: AdminRegistrationRow[];
  countries: string[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
} {
  const { whereSql, params } = buildRegistrationsWhereClause(filters);

  const countRow = db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM enrollments e
       INNER JOIN learner_profiles lp ON lp.id = e.learner_id
       INNER JOIN users u ON u.id = lp.user_id
       INNER JOIN courses c ON c.id = e.course_id
       ${whereSql}`
    )
    .get(...params) as { count?: number } | undefined;

  const total = Number(countRow?.count || 0);
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * limit;

  const limitSql = paginate ? 'LIMIT ? OFFSET ?' : '';
  const queryParams = paginate ? [...params, limit, offset] : params;

  const rows = db
    .prepare(
      `SELECT e.id AS enrollment_id, e.learner_id, lp.user_id, e.course_id,
              lp.full_name, u.email, lp.gender, lp.phone,
              lp.country_code, lp.country_name, lp.state_code, lp.state_name, lp.city,
              c.title AS course_title, c.slug AS course_slug,
              e.status, e.notes, e.created_at, e.updated_at
       FROM enrollments e
       INNER JOIN learner_profiles lp ON lp.id = e.learner_id
       INNER JOIN users u ON u.id = lp.user_id
       INNER JOIN courses c ON c.id = e.course_id
       ${whereSql}
       ORDER BY e.created_at DESC, e.id DESC
       ${limitSql}`
    )
    .all(...queryParams) as AdminRegistrationRow[];

  const countryRows = db
    .prepare(`SELECT DISTINCT country_name FROM learner_profiles WHERE country_name <> '' ORDER BY country_name ASC`)
    .all() as Array<{ country_name: string }>;

  return {
    registrations: rows,
    countries: countryRows.map((r) => String(r.country_name)),
    pagination: {
      page: safePage,
      limit,
      total,
      totalPages
    }
  };
}

export function updateEnrollment(
  db: DbLike,
  enrollmentId: number,
  updates: { status?: EnrollmentStatus; notes?: string }
): AdminRegistrationRow | null {
  const existing = db
    .prepare('SELECT id, status, notes FROM enrollments WHERE id = ?')
    .get(enrollmentId) as { id: number; status: EnrollmentStatus; notes: string } | undefined;

  if (!existing) return null;

  const nextStatus = updates.status ?? existing.status;
  const nextNotes = updates.notes !== undefined ? updates.notes : existing.notes;
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  db.prepare(`UPDATE enrollments SET status = ?, notes = ?, updated_at = ? WHERE id = ?`).run(
    nextStatus,
    nextNotes,
    now,
    enrollmentId
  );

  const row = db
    .prepare(
      `SELECT e.id AS enrollment_id, e.learner_id, lp.user_id, e.course_id,
              lp.full_name, u.email, lp.gender, lp.phone,
              lp.country_code, lp.country_name, lp.state_code, lp.state_name, lp.city,
              c.title AS course_title, c.slug AS course_slug,
              e.status, e.notes, e.created_at, e.updated_at
       FROM enrollments e
       INNER JOIN learner_profiles lp ON lp.id = e.learner_id
       INNER JOIN users u ON u.id = lp.user_id
       INNER JOIN courses c ON c.id = e.course_id
       WHERE e.id = ?`
    )
    .get(enrollmentId) as AdminRegistrationRow | undefined;

  return row || null;
}

export function bulkUpdateEnrollments(
  db: DbLike,
  ids: number[],
  status: EnrollmentStatus
): number {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const stmt = db.prepare('UPDATE enrollments SET status = ?, updated_at = ? WHERE id = ?');
  let updated = 0;
  db.exec('BEGIN IMMEDIATE;');
  try {
    for (const id of ids) {
      const res = stmt.run(status, now, id);
      updated += Number(res.changes || 0);
    }
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
  return updated;
}
