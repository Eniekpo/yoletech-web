"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/learn/server-entry.ts
var server_entry_exports = {};
__export(server_entry_exports, {
  COURSE_MODES: () => COURSE_MODES,
  COURSE_STATUSES: () => COURSE_STATUSES,
  DEFAULT_LEARN_PAGE_CONTENT: () => DEFAULT_LEARN_PAGE_CONTENT,
  DEFAULT_SEED_COURSES: () => DEFAULT_SEED_COURSES,
  ENROLLMENT_STATUSES: () => ENROLLMENT_STATUSES,
  GENDER_OPTIONS: () => GENDER_OPTIONS,
  LEGACY_DEFAULT_LEARN_HEADLINE: () => LEGACY_DEFAULT_LEARN_HEADLINE,
  LEGACY_DEFAULT_LEARN_SUBHEADLINE: () => LEGACY_DEFAULT_LEARN_SUBHEADLINE,
  bulkEnrollmentUpdateSchema: () => bulkEnrollmentUpdateSchema,
  bulkUpdateEnrollments: () => bulkUpdateEnrollments,
  checkCompositeRateLimit: () => checkCompositeRateLimit,
  courseInputSchema: () => courseInputSchema,
  courseReorderSchema: () => courseReorderSchema,
  createCourse: () => createCourse,
  deleteOrArchiveCourse: () => deleteOrArchiveCourse,
  enrollmentUpdateSchema: () => enrollmentUpdateSchema,
  ensureLearnSchemaAndSeed: () => ensureLearnSchemaAndSeed,
  evaluatePasswordStrength: () => evaluatePasswordStrength,
  flattenZodFieldErrors: () => flattenZodFieldErrors,
  getAdminLearnSummary: () => getAdminLearnSummary,
  getCourseById: () => getCourseById,
  getLearnPageContent: () => getLearnPageContent,
  getLearnerDashboardData: () => getLearnerDashboardData,
  handleLearnApiRequest: () => handleLearnApiRequest,
  isValidCourseImageUrl: () => isValidCourseImageUrl,
  learnFaqItemSchema: () => learnFaqItemSchema,
  learnPageContentSchema: () => learnPageContentSchema,
  learnerRegistrationSchema: () => learnerRegistrationSchema,
  listAdminRegistrations: () => listAdminRegistrations,
  listAllCourses: () => listAllCourses,
  listPublishedCourses: () => listPublishedCourses,
  normalizeInternationalPhone: () => normalizeInternationalPhone,
  registerLearnerTransaction: () => registerLearnerTransaction,
  reorderCourses: () => reorderCourses,
  resetLearnRateLimiter: () => resetLearnRateLimiter,
  slugifyCourseTitle: () => slugifyCourseTitle,
  updateCourse: () => updateCourse,
  updateEnrollment: () => updateEnrollment,
  updateLearnPageContent: () => updateLearnPageContent
});
module.exports = __toCommonJS(server_entry_exports);

// src/learn/seed-data.ts
var DEFAULT_SEED_COURSES = [
  {
    title: "Full-Stack Web Development",
    slug: "full-stack-web-development",
    image_url: "/assets/code-sync-preview.jpg",
    short_description: "Build responsive web applications from user interfaces to backend APIs and relational databases through guided, hands-on projects.",
    outcomes: [
      "Structure accessible HTML, modern CSS, and interactive JavaScript interfaces",
      "Design and build RESTful backend endpoints with server-side validation",
      "Model relational database tables and write safe parameterized queries",
      "Deploy and maintain a working web application from development to production"
    ],
    level: "Beginner to Intermediate",
    mode: "hybrid",
    duration: "",
    price: "",
    status: "published",
    display_order: 1
  },
  {
    title: "Data Analysis and Business Intelligence",
    slug: "data-analysis-and-business-intelligence",
    image_url: "/assets/dashboard-preview.jpg",
    short_description: "Learn how to clean, analyze, and turn raw spreadsheets and database tables into clear dashboards and decision-ready reports.",
    outcomes: [
      "Clean, transform, and validate structured datasets with spreadsheets, SQL, and Python",
      "Write SQL queries to aggregate, filter, and join multi-table business data",
      "Build interactive dashboards and KPI summaries in BI tools",
      "Communicate analytical findings clearly to non-technical stakeholders"
    ],
    level: "Beginner to Intermediate",
    mode: "hybrid",
    duration: "",
    price: "",
    status: "published",
    display_order: 2
  },
  {
    title: "AI Automation",
    slug: "ai-automation",
    image_url: "/assets/workflow-diagram.jpg",
    short_description: "Streamline repetitive business tasks by connecting APIs, scripts, and AI-assisted workflows to save manual effort and reduce errors.",
    outcomes: [
      "Map manual operational processes and identify practical automation opportunities",
      "Build reliable workflow automations connecting forms, spreadsheets, email, and APIs",
      "Use AI prompts and structured outputs safely inside repeatable tasks",
      "Monitor, test, and maintain automated pipelines with clear error handling"
    ],
    level: "Intermediate",
    mode: "online",
    duration: "",
    price: "",
    status: "published",
    display_order: 3
  },
  {
    title: "Customer Support Solutions (AI assistants and chatbots)",
    slug: "customer-support-solutions-ai-assistants-and-chatbots",
    image_url: "/assets/about-analytics-workspace.jpg",
    short_description: "Design helpful customer support workflows, knowledge bases, and AI-assisted chat experiences with clear human handoff.",
    outcomes: [
      "Organize FAQs and help documentation into structured support knowledge bases",
      "Configure conversational assistants and chat flows for common customer requests",
      "Set up escalation rules and human handoff paths for complex inquiries",
      "Review support conversations to improve response clarity and reliability"
    ],
    level: "Beginner to Intermediate",
    mode: "online",
    duration: "",
    price: "",
    status: "published",
    display_order: 4
  },
  {
    title: "IT Support",
    slug: "it-support",
    image_url: "/assets/home-hero-analyst.jpg",
    short_description: "Develop practical skills in workstation setup, networking basics, system troubleshooting, backups, and everyday technical support.",
    outcomes: [
      "Diagnose and resolve common hardware, operating system, and software issues",
      "Configure user accounts, local networks, and core office productivity tools",
      "Apply foundational security hygiene, updates, and data backup practices",
      "Document incidents and communicate clearly when assisting end users"
    ],
    level: "Beginner",
    mode: "hybrid",
    duration: "",
    price: "",
    status: "published",
    display_order: 5
  },
  {
    title: "AI-Powered Content Creation and Graphic Design",
    slug: "ai-powered-content-creation-and-graphic-design",
    image_url: "/assets/yoletech-hero-banner.png",
    short_description: "Combine core visual design principles with modern AI-assisted tools to produce consistent brand graphics, layouts, and digital media.",
    outcomes: [
      "Apply typography, color contrast, and layout hierarchy across digital assets",
      "Use AI-assisted ideation and editing tools responsibly within a creative workflow",
      "Create reusable templates for social media, presentations, and web visuals",
      "Prepare and export clean design files for web and print formats"
    ],
    level: "Beginner",
    mode: "online",
    duration: "",
    price: "",
    status: "published",
    display_order: 6
  },
  {
    title: "Tech Tutorials (general tech skills)",
    slug: "tech-tutorials-general-tech-skills",
    image_url: "/assets/about-analytics-workspace.jpg",
    short_description: "Strengthen everyday digital fluency\u2014from productivity suites and cloud collaboration to basic troubleshooting and safe online habits.",
    outcomes: [
      "Work confidently with spreadsheets, documents, email, and cloud storage",
      "Organize files, collaborate online, and manage digital workflows efficiently",
      "Practice account security, password hygiene, and safe browsing habits",
      "Build a foundation for transitioning into specialized technical tracks"
    ],
    level: "Beginner",
    mode: "hybrid",
    duration: "",
    price: "",
    status: "published",
    display_order: 7
  }
];
var LEGACY_DEFAULT_LEARN_HEADLINE = "Practical Tech Training Built Around Real-World Skills";
var LEGACY_DEFAULT_LEARN_SUBHEADLINE = "Explore structured training programs across every Yoletech discipline\u2014from full-stack web development and data analytics to AI automation, IT support, and digital skills. Register below to reserve your place.";
var DEFAULT_LEARN_PAGE_CONTENT = {
  headline: "Build In-Demand Tech Skills. Learn by Doing.",
  subheadline: "Hands-on training in web development, data analytics, AI automation, and IT\u2014guided step by step from day one.",
  cta_label: "Enroll Now",
  faq: [
    {
      question: "Who can register for a Yoletech training program?",
      answer: "Programs are open to beginners, students, career switchers, and working professionals who want practical, guided training in technology and digital operations."
    },
    {
      question: "How are sessions delivered?",
      answer: "Delivery mode depends on the selected course and may be online, in-person, or hybrid. Specific schedule details are shared after your registration is reviewed."
    },
    {
      question: "What happens after I submit the registration form?",
      answer: "Your learner account is created immediately and your enrollment starts in Pending status. You can sign in to your learner dashboard anytime to check your status while the Yoletech team reviews your application."
    },
    {
      question: "Do I need prior technical experience before registering?",
      answer: "Not for beginner tracks. Each course card shows its intended level so you can choose a program that fits your current background."
    }
  ]
};

// src/learn/schema.ts
var import_zod = require("zod");
var import_min = require("libphonenumber-js/min");
var GENDER_OPTIONS = ["Male", "Female", "Prefer not to say"];
var COURSE_MODES = ["online", "in-person", "hybrid"];
var COURSE_STATUSES = ["draft", "published"];
var ENROLLMENT_STATUSES = ["PENDING", "APPROVED", "REJECTED", "COMPLETED"];
function evaluatePasswordStrength(password) {
  const value = String(password || "");
  const checks = {
    minLength: value.length >= 8,
    hasLower: /[a-z]/.test(value),
    hasUpper: /[A-Z]/.test(value),
    hasNumber: /\d/.test(value),
    hasSymbol: /[^A-Za-z0-9]/.test(value)
  };
  if (!checks.minLength) {
    return {
      score: 0,
      label: "Too short",
      hint: "Use at least 8 characters with a mix of letters and numbers.",
      checks
    };
  }
  let points = 1;
  if (checks.hasLower && checks.hasUpper) points += 1;
  if (checks.hasNumber) points += 1;
  if (checks.hasSymbol || value.length >= 12) points += 1;
  const score = Math.min(4, Math.max(1, points));
  const labelMap = {
    1: "Weak",
    2: "Fair",
    3: "Good",
    4: "Strong"
  };
  const hintMap = {
    1: "Add uppercase letters, numbers, or symbols to strengthen your password.",
    2: "Almost there\u2014add a number or special character for stronger security.",
    3: "Good password. Adding a symbol or extra length makes it even stronger.",
    4: "Strong password."
  };
  return {
    score,
    label: labelMap[score],
    hint: hintMap[score],
    checks
  };
}
function normalizeInternationalPhone(rawPhone, countryCode) {
  const cleaned = String(rawPhone || "").trim();
  if (!cleaned) {
    return { valid: false, e164: "", formatted: "" };
  }
  const iso = countryCode && /^[A-Z]{2}$/.test(countryCode.toUpperCase()) ? countryCode.toUpperCase() : void 0;
  const parsed = cleaned.startsWith("+") ? (0, import_min.parsePhoneNumberFromString)(cleaned) : (0, import_min.parsePhoneNumberFromString)(cleaned, iso);
  if (!parsed || !parsed.isValid()) {
    return { valid: false, e164: "", formatted: "" };
  }
  return {
    valid: true,
    e164: parsed.number,
    formatted: parsed.formatInternational()
  };
}
var learnerRegistrationSchema = import_zod.z.object({
  fullName: import_zod.z.string().trim().min(2, "Full name must be at least 2 characters.").max(120, "Full name must be 120 characters or fewer."),
  gender: import_zod.z.enum(GENDER_OPTIONS, {
    message: "Please select a gender option."
  }),
  countryCode: import_zod.z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Please select a valid country."),
  countryName: import_zod.z.string().trim().min(2, "Please select a country.").max(100),
  stateCode: import_zod.z.string().trim().max(20).optional().default(""),
  stateName: import_zod.z.string().trim().min(1, "Please select or enter your state / region.").max(100, "State / region must be 100 characters or fewer."),
  city: import_zod.z.string().trim().min(1, "Please select or enter your city.").max(100, "City must be 100 characters or fewer."),
  courseId: import_zod.z.coerce.number().int("Please select a course.").positive("Please select a valid course."),
  phone: import_zod.z.string().trim().min(6, "Please enter a valid international phone number.").max(30, "Phone number is too long."),
  email: import_zod.z.string().trim().toLowerCase().email("Please enter a valid email address.").max(180, "Email address is too long."),
  password: import_zod.z.string().min(8, "Password must be at least 8 characters long.").max(128, "Password must be 128 characters or fewer."),
  consent: import_zod.z.boolean().refine((val) => val === true, {
    message: "You must agree to the Terms and Privacy Policy to register."
  }),
  website: import_zod.z.string().optional().default("")
}).superRefine((data, ctx) => {
  const phoneResult = normalizeInternationalPhone(data.phone, data.countryCode);
  if (!phoneResult.valid) {
    ctx.addIssue({
      code: "custom",
      path: ["phone"],
      message: "Please enter a valid international phone number for the selected country (e.g. +234 802 552 6389)."
    });
  }
});
function slugifyCourseTitle(input) {
  return String(input || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 120);
}
var RASTER_DATA_URI_RE = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i;
function isValidCourseImageUrl(raw) {
  const value = String(raw || "").trim();
  if (!value) return true;
  if (RASTER_DATA_URI_RE.test(value)) return true;
  if (value.startsWith("/") && !value.startsWith("//") && !/\s/.test(value)) {
    return true;
  }
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}
var courseInputSchema = import_zod.z.object({
  title: import_zod.z.string().trim().min(3, "Course title must be at least 3 characters.").max(140),
  slug: import_zod.z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug may only contain lowercase letters, numbers, and hyphens.").max(140).optional().or(import_zod.z.literal("")),
  image_url: import_zod.z.string().trim().max(15e5, "Course image is too large. Please upload a smaller image (under 1 MB).").refine(isValidCourseImageUrl, {
    message: "Provide a valid image URL (https://... or /assets/...) or upload a PNG, JPG, WebP, or GIF image."
  }).optional().default(""),
  short_description: import_zod.z.string().trim().min(10, "Short description must be at least 10 characters.").max(600),
  outcomes: import_zod.z.array(import_zod.z.string().trim().min(2, "Each outcome must be at least 2 characters.").max(220)).min(1, "Provide at least one learning outcome.").max(12, "Provide at most 12 learning outcomes."),
  level: import_zod.z.string().trim().min(2, "Level is required.").max(60),
  mode: import_zod.z.enum(COURSE_MODES, { message: "Select online, in-person, or hybrid." }),
  duration: import_zod.z.string().trim().max(80).optional().default(""),
  price: import_zod.z.string().trim().max(80).optional().default(""),
  status: import_zod.z.enum(COURSE_STATUSES).optional().default("draft"),
  display_order: import_zod.z.coerce.number().int().min(0).max(9999).optional().default(0)
});
var courseReorderSchema = import_zod.z.object({
  orderedIds: import_zod.z.array(import_zod.z.coerce.number().int().positive()).min(1, "Provide at least one course ID.")
});
var enrollmentUpdateSchema = import_zod.z.object({
  status: import_zod.z.enum(ENROLLMENT_STATUSES, { message: "Invalid enrollment status." }).optional(),
  notes: import_zod.z.string().trim().max(2e3, "Notes must be 2,000 characters or fewer.").optional()
});
var bulkEnrollmentUpdateSchema = import_zod.z.object({
  ids: import_zod.z.array(import_zod.z.coerce.number().int().positive()).min(1, "Select at least one registration."),
  status: import_zod.z.enum(ENROLLMENT_STATUSES, { message: "Invalid enrollment status." })
});
var learnFaqItemSchema = import_zod.z.object({
  question: import_zod.z.string().trim().min(3, "Question must be at least 3 characters.").max(240),
  answer: import_zod.z.string().trim().min(5, "Answer must be at least 5 characters.").max(1500)
});
var learnPageContentSchema = import_zod.z.object({
  headline: import_zod.z.string().trim().min(5, "Headline must be at least 5 characters.").max(180),
  subheadline: import_zod.z.string().trim().min(10, "Sub-headline must be at least 10 characters.").max(500),
  cta_label: import_zod.z.string().trim().min(2, "CTA label must be at least 2 characters.").max(60),
  faq: import_zod.z.array(learnFaqItemSchema).max(20, "Maximum of 20 FAQ items allowed.")
});
function flattenZodFieldErrors(error) {
  const fieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : "_form";
    if (!fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

// src/learn/db.ts
function isJsonFallback(db) {
  return Boolean(db.__isJsonFallback && typeof db.__getState === "function" && typeof db.__saveState === "function");
}
function getFallbackState(db) {
  const s = db.__getState();
  if (!Array.isArray(s.users)) s.users = [];
  if (!Array.isArray(s.courses)) s.courses = [];
  if (!Array.isArray(s.learner_profiles)) s.learner_profiles = [];
  if (!Array.isArray(s.enrollments)) s.enrollments = [];
  if (!s.seq) {
    s.seq = { users: 1, courses: 1, learner_profiles: 1, enrollments: 1 };
  }
  if (typeof s.seq.courses !== "number") s.seq.courses = 1;
  if (typeof s.seq.learner_profiles !== "number") s.seq.learner_profiles = 1;
  if (typeof s.seq.enrollments !== "number") s.seq.enrollments = 1;
  return s;
}
function nowTimestamp() {
  return (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").slice(0, 19);
}
function parseJsonStringArray(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((x) => String(x)).filter(Boolean);
    }
  } catch {
  }
  return [];
}
function parseFaqJson(raw) {
  if (!raw) return DEFAULT_LEARN_PAGE_CONTENT.faq;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => Boolean(item) && typeof item === "object").map((item) => ({
        question: String(item.question ?? "").trim(),
        answer: String(item.answer ?? "").trim()
      })).filter((item) => item.question.length > 0 && item.answer.length > 0);
    }
  } catch {
  }
  return DEFAULT_LEARN_PAGE_CONTENT.faq;
}
function hydrateCourse(row) {
  const modeVal = row.mode === "in-person" || row.mode === "hybrid" ? row.mode : "online";
  const statusVal = row.status === "draft" ? "draft" : "published";
  return {
    id: Number(row.id),
    title: String(row.title),
    slug: String(row.slug),
    image_url: String(row.image_url || ""),
    short_description: String(row.short_description),
    outcomes: parseJsonStringArray(row.outcomes_json),
    level: String(row.level || "Beginner"),
    mode: modeVal,
    duration: String(row.duration || ""),
    price: String(row.price || ""),
    status: statusVal,
    display_order: Number(row.display_order || 0),
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || ""),
    ...row.enrollment_count !== void 0 ? { enrollment_count: Number(row.enrollment_count) } : {}
  };
}
function ensureLearnSchemaAndSeed(db) {
  if (isJsonFallback(db)) {
    const s = getFallbackState(db);
    let dirty = false;
    const now = nowTimestamp();
    if (s.courses.length === 0) {
      for (const c of DEFAULT_SEED_COURSES) {
        const id = s.seq.courses++;
        s.courses.push({
          id,
          title: c.title,
          slug: c.slug,
          image_url: c.image_url,
          short_description: c.short_description,
          outcomes: [...c.outcomes],
          level: c.level,
          mode: c.mode,
          duration: c.duration,
          price: c.price,
          status: c.status,
          display_order: c.display_order,
          created_at: now,
          updated_at: now
        });
      }
      dirty = true;
    } else {
      for (const c of s.courses) {
        if (typeof c.image_url !== "string") {
          c.image_url = "";
          dirty = true;
        }
      }
    }
    if (!s.learn_page_content) {
      s.learn_page_content = {
        headline: DEFAULT_LEARN_PAGE_CONTENT.headline,
        subheadline: DEFAULT_LEARN_PAGE_CONTENT.subheadline,
        cta_label: DEFAULT_LEARN_PAGE_CONTENT.cta_label,
        faq: DEFAULT_LEARN_PAGE_CONTENT.faq.map((f) => ({ ...f })),
        updated_at: now
      };
      dirty = true;
    } else if (s.learn_page_content.headline === LEGACY_DEFAULT_LEARN_HEADLINE && s.learn_page_content.subheadline === LEGACY_DEFAULT_LEARN_SUBHEADLINE) {
      s.learn_page_content.headline = DEFAULT_LEARN_PAGE_CONTENT.headline;
      s.learn_page_content.subheadline = DEFAULT_LEARN_PAGE_CONTENT.subheadline;
      s.learn_page_content.updated_at = now;
      dirty = true;
    }
    if (dirty) db.__saveState();
    return;
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      image_url TEXT DEFAULT '',
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
  const courseColumns = db.prepare("PRAGMA table_info(courses)").all();
  if (!courseColumns.some((col) => col.name === "image_url")) {
    db.exec(`ALTER TABLE courses ADD COLUMN image_url TEXT DEFAULT ''`);
    const backfillImage = db.prepare(
      `UPDATE courses SET image_url = ? WHERE slug = ? AND (image_url IS NULL OR TRIM(image_url) = '')`
    );
    for (const c of DEFAULT_SEED_COURSES) {
      if (c.image_url) {
        backfillImage.run(c.image_url, c.slug);
      }
    }
  }
  const countRow = db.prepare("SELECT COUNT(*) as count FROM courses").get();
  if (!countRow || Number(countRow.count || 0) === 0) {
    const insertCourse = db.prepare(`
      INSERT OR IGNORE INTO courses
        (title, slug, image_url, short_description, outcomes_json, level, mode, duration, price, status, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const c of DEFAULT_SEED_COURSES) {
      insertCourse.run(
        c.title,
        c.slug,
        c.image_url,
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
  const contentRow = db.prepare("SELECT id, headline, subheadline FROM learn_page_content WHERE id = 1").get();
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
  } else if (contentRow.headline === LEGACY_DEFAULT_LEARN_HEADLINE && contentRow.subheadline === LEGACY_DEFAULT_LEARN_SUBHEADLINE) {
    db.prepare(`
      UPDATE learn_page_content
      SET headline = ?, subheadline = ?, updated_at = ?
      WHERE id = 1
    `).run(DEFAULT_LEARN_PAGE_CONTENT.headline, DEFAULT_LEARN_PAGE_CONTENT.subheadline, nowTimestamp());
  }
}
function listPublishedCourses(db) {
  if (isJsonFallback(db)) {
    const s = getFallbackState(db);
    return s.courses.filter((c) => c.status === "published").map((c) => ({ ...c, image_url: String(c.image_url || "") })).sort((a, b) => a.display_order - b.display_order || a.id - b.id);
  }
  const rows = db.prepare(
    `SELECT id, title, slug, image_url, short_description, outcomes_json, level, mode, duration, price, status, display_order, created_at, updated_at
       FROM courses
       WHERE status = 'published'
       ORDER BY display_order ASC, id ASC`
  ).all();
  return rows.map(hydrateCourse);
}
function listAllCourses(db) {
  if (isJsonFallback(db)) {
    const s = getFallbackState(db);
    return [...s.courses].map((c) => ({
      ...c,
      image_url: String(c.image_url || ""),
      enrollment_count: s.enrollments.filter((e) => e.course_id === c.id).length
    })).sort((a, b) => a.display_order - b.display_order || a.id - b.id);
  }
  const rows = db.prepare(
    `SELECT c.id, c.title, c.slug, c.image_url, c.short_description, c.outcomes_json, c.level, c.mode, c.duration, c.price, c.status, c.display_order, c.created_at, c.updated_at,
              COUNT(e.id) AS enrollment_count
       FROM courses c
       LEFT JOIN enrollments e ON e.course_id = c.id
       GROUP BY c.id
       ORDER BY c.display_order ASC, c.id ASC`
  ).all();
  return rows.map(hydrateCourse);
}
function getCourseById(db, id) {
  if (isJsonFallback(db)) {
    const s = getFallbackState(db);
    const found = s.courses.find((c) => c.id === id);
    return found ? { ...found, image_url: String(found.image_url || "") } : null;
  }
  const row = db.prepare(
    `SELECT id, title, slug, image_url, short_description, outcomes_json, level, mode, duration, price, status, display_order, created_at, updated_at
       FROM courses WHERE id = ?`
  ).get(id);
  return row ? hydrateCourse(row) : null;
}
function createCourse(db, input) {
  const baseSlug = input.slug && input.slug.length > 0 ? input.slug : slugifyCourseTitle(input.title);
  let slug = baseSlug || `course-${Date.now()}`;
  const now = nowTimestamp();
  if (isJsonFallback(db)) {
    const s = getFallbackState(db);
    if (s.courses.some((c) => c.slug === slug)) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }
    const maxOrder = s.courses.reduce((m, c) => Math.max(m, c.display_order), 0);
    const created2 = {
      id: s.seq.courses++,
      title: input.title,
      slug,
      image_url: input.image_url || "",
      short_description: input.short_description,
      outcomes: [...input.outcomes],
      level: input.level,
      mode: input.mode,
      duration: input.duration || "",
      price: input.price || "",
      status: input.status || "draft",
      display_order: input.display_order || maxOrder + 1,
      created_at: now,
      updated_at: now
    };
    s.courses.push(created2);
    db.__saveState();
    return created2;
  }
  const existing = db.prepare("SELECT id FROM courses WHERE slug = ?").get(slug);
  if (existing) {
    slug = `${slug}-${Date.now().toString().slice(-4)}`;
  }
  let displayOrder = input.display_order;
  if (!displayOrder) {
    const maxRow = db.prepare("SELECT COALESCE(MAX(display_order), 0) AS max_order FROM courses").get();
    displayOrder = Number(maxRow?.max_order || 0) + 1;
  }
  const res = db.prepare(
    `INSERT INTO courses (title, slug, image_url, short_description, outcomes_json, level, mode, duration, price, status, display_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    input.title,
    slug,
    input.image_url || "",
    input.short_description,
    JSON.stringify(input.outcomes),
    input.level,
    input.mode,
    input.duration || "",
    input.price || "",
    input.status || "draft",
    displayOrder,
    now,
    now
  );
  const created = getCourseById(db, Number(res.lastInsertRowid));
  if (!created) {
    throw new Error("Failed to retrieve newly created course.");
  }
  return created;
}
function updateCourse(db, id, input) {
  const now = nowTimestamp();
  if (isJsonFallback(db)) {
    const s = getFallbackState(db);
    const target = s.courses.find((c) => c.id === id);
    if (!target) return null;
    if (input.slug && input.slug.length > 0 && s.courses.some((c) => c.id !== id && c.slug === input.slug)) {
      throw new Error("UNIQUE constraint failed: courses.slug");
    }
    target.title = input.title ?? target.title;
    target.slug = input.slug && input.slug.length > 0 ? input.slug : target.slug;
    target.image_url = input.image_url !== void 0 ? input.image_url : String(target.image_url || "");
    target.short_description = input.short_description ?? target.short_description;
    target.outcomes = input.outcomes ?? target.outcomes;
    target.level = input.level ?? target.level;
    target.mode = input.mode ?? target.mode;
    target.duration = input.duration !== void 0 ? input.duration : target.duration;
    target.price = input.price !== void 0 ? input.price : target.price;
    target.status = input.status ?? target.status;
    target.display_order = input.display_order !== void 0 ? input.display_order : target.display_order;
    target.updated_at = now;
    db.__saveState();
    return target;
  }
  const existing = getCourseById(db, id);
  if (!existing) return null;
  const nextTitle = input.title ?? existing.title;
  const nextSlug = input.slug && input.slug.length > 0 ? input.slug : existing.slug;
  const nextImageUrl = input.image_url !== void 0 ? input.image_url : existing.image_url;
  const nextDesc = input.short_description ?? existing.short_description;
  const nextOutcomes = input.outcomes ?? existing.outcomes;
  const nextLevel = input.level ?? existing.level;
  const nextMode = input.mode ?? existing.mode;
  const nextDuration = input.duration !== void 0 ? input.duration : existing.duration;
  const nextPrice = input.price !== void 0 ? input.price : existing.price;
  const nextStatus = input.status ?? existing.status;
  const nextOrder = input.display_order !== void 0 ? input.display_order : existing.display_order;
  db.prepare(
    `UPDATE courses
     SET title = ?, slug = ?, image_url = ?, short_description = ?, outcomes_json = ?, level = ?, mode = ?, duration = ?, price = ?, status = ?, display_order = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    nextTitle,
    nextSlug,
    nextImageUrl,
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
function deleteOrArchiveCourse(db, id) {
  const now = nowTimestamp();
  if (isJsonFallback(db)) {
    const s = getFallbackState(db);
    const target = s.courses.find((c) => c.id === id);
    if (!target) return { action: "not_found", enrollmentCount: 0 };
    const enrollmentCount2 = s.enrollments.filter((e) => e.course_id === id).length;
    if (enrollmentCount2 > 0) {
      target.status = "draft";
      target.updated_at = now;
      db.__saveState();
      return { action: "archived", enrollmentCount: enrollmentCount2 };
    }
    s.courses = s.courses.filter((c) => c.id !== id);
    db.__saveState();
    return { action: "deleted", enrollmentCount: 0 };
  }
  const existing = getCourseById(db, id);
  if (!existing) return { action: "not_found", enrollmentCount: 0 };
  const countRow = db.prepare("SELECT COUNT(*) as count FROM enrollments WHERE course_id = ?").get(id);
  const enrollmentCount = Number(countRow?.count || 0);
  if (enrollmentCount > 0) {
    db.prepare(`UPDATE courses SET status = 'draft', updated_at = ? WHERE id = ?`).run(now, id);
    return { action: "archived", enrollmentCount };
  }
  db.prepare("DELETE FROM courses WHERE id = ?").run(id);
  return { action: "deleted", enrollmentCount: 0 };
}
function reorderCourses(db, orderedIds) {
  const now = nowTimestamp();
  if (isJsonFallback(db)) {
    const s = getFallbackState(db);
    orderedIds.forEach((courseId, index) => {
      const target = s.courses.find((c) => c.id === courseId);
      if (target) {
        target.display_order = index + 1;
        target.updated_at = now;
      }
    });
    db.__saveState();
    return listAllCourses(db);
  }
  const stmt = db.prepare("UPDATE courses SET display_order = ?, updated_at = ? WHERE id = ?");
  db.exec("BEGIN IMMEDIATE;");
  try {
    orderedIds.forEach((courseId, index) => {
      stmt.run(index + 1, now, courseId);
    });
    db.exec("COMMIT;");
  } catch (err) {
    db.exec("ROLLBACK;");
    throw err;
  }
  return listAllCourses(db);
}
function getLearnPageContent(db) {
  if (isJsonFallback(db)) {
    const s = getFallbackState(db);
    return s.learn_page_content || { ...DEFAULT_LEARN_PAGE_CONTENT };
  }
  const row = db.prepare("SELECT id, headline, subheadline, cta_label, faq_json, updated_at FROM learn_page_content WHERE id = 1").get();
  if (!row) {
    return { ...DEFAULT_LEARN_PAGE_CONTENT };
  }
  return {
    headline: String(row.headline || DEFAULT_LEARN_PAGE_CONTENT.headline),
    subheadline: String(row.subheadline || DEFAULT_LEARN_PAGE_CONTENT.subheadline),
    cta_label: String(row.cta_label || DEFAULT_LEARN_PAGE_CONTENT.cta_label),
    faq: parseFaqJson(row.faq_json),
    updated_at: String(row.updated_at || "")
  };
}
function updateLearnPageContent(db, input) {
  const now = nowTimestamp();
  if (isJsonFallback(db)) {
    const s = getFallbackState(db);
    s.learn_page_content = {
      headline: input.headline,
      subheadline: input.subheadline,
      cta_label: input.cta_label,
      faq: input.faq.map((f) => ({ ...f })),
      updated_at: now
    };
    db.__saveState();
    return s.learn_page_content;
  }
  const exists = db.prepare("SELECT id FROM learn_page_content WHERE id = 1").get();
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
function registerLearnerTransaction(db, params) {
  const normalizedEmail = params.email.trim().toLowerCase();
  const now = nowTimestamp();
  if (isJsonFallback(db)) {
    const s = getFallbackState(db);
    const course2 = s.courses.find((c) => c.id === params.courseId && c.status === "published");
    if (!course2) return { ok: false, code: "COURSE_NOT_FOUND" };
    if (s.users.some((u) => String(u.email).toLowerCase() === normalizedEmail)) {
      return { ok: false, code: "EMAIL_EXISTS" };
    }
    const userId = s.seq.users++;
    const userRow = {
      id: userId,
      name: params.fullName,
      email: normalizedEmail,
      password_hash: params.passwordHash,
      phone: params.phoneE164,
      company: "",
      service_interest: course2.title,
      role: "LEARNER",
      status: "ACTIVE",
      admin_notes: "Registered via YOLETECH Learn",
      created_at: now
    };
    const learnerId = s.seq.learner_profiles++;
    const profile = {
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
    const enrollmentId = s.seq.enrollments++;
    const enrollmentRow = {
      id: enrollmentId,
      learner_id: learnerId,
      course_id: course2.id,
      status: "PENDING",
      notes: "",
      created_at: now,
      updated_at: now
    };
    s.users.push(userRow);
    s.learner_profiles.push(profile);
    s.enrollments.push(enrollmentRow);
    db.__saveState();
    const user = {
      id: userId,
      name: params.fullName,
      email: normalizedEmail,
      phone: params.phoneE164,
      company: "",
      service_interest: course2.title,
      role: "LEARNER",
      status: "ACTIVE",
      created_at: now
    };
    const enrollment = {
      ...enrollmentRow,
      course_title: course2.title,
      course_slug: course2.slug,
      course_level: course2.level,
      course_mode: course2.mode,
      course_duration: course2.duration,
      course_price: course2.price,
      course_short_description: course2.short_description
    };
    return { ok: true, user, profile, enrollment };
  }
  const course = db.prepare(
    `SELECT id, title, slug, image_url, short_description, outcomes_json, level, mode, duration, price, status, display_order, created_at, updated_at
       FROM courses WHERE id = ? AND status = 'published'`
  ).get(params.courseId);
  if (!course) {
    return { ok: false, code: "COURSE_NOT_FOUND" };
  }
  const existingUser = db.prepare("SELECT id FROM users WHERE LOWER(email) = ?").get(normalizedEmail);
  if (existingUser) {
    return { ok: false, code: "EMAIL_EXISTS" };
  }
  db.exec("BEGIN IMMEDIATE;");
  try {
    const userRes = db.prepare(
      `INSERT INTO users (name, email, password_hash, phone, company, service_interest, role, status, admin_notes, created_at)
         VALUES (?, ?, ?, ?, '', ?, 'LEARNER', 'ACTIVE', 'Registered via YOLETECH Learn', ?)`
    ).run(
      params.fullName,
      normalizedEmail,
      params.passwordHash,
      params.phoneE164,
      course.title,
      now
    );
    const userId = Number(userRes.lastInsertRowid);
    const profileRes = db.prepare(
      `INSERT INTO learner_profiles
          (user_id, full_name, gender, country_code, country_name, state_code, state_name, city, phone, consent_accepted_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
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
    const enrollRes = db.prepare(
      `INSERT INTO enrollments (learner_id, course_id, status, notes, created_at, updated_at)
         VALUES (?, ?, 'PENDING', '', ?, ?)`
    ).run(learnerId, Number(course.id), now, now);
    const enrollmentId = Number(enrollRes.lastInsertRowid);
    db.exec("COMMIT;");
    const user = {
      id: userId,
      name: params.fullName,
      email: normalizedEmail,
      phone: params.phoneE164,
      company: "",
      service_interest: course.title,
      role: "LEARNER",
      status: "ACTIVE",
      created_at: now
    };
    const profile = {
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
    const enrollment = {
      id: enrollmentId,
      learner_id: learnerId,
      course_id: hydratedCourse.id,
      status: "PENDING",
      notes: "",
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
    db.exec("ROLLBACK;");
    const message = err instanceof Error ? err.message : String(err);
    if (/UNIQUE constraint failed: users\.email/i.test(message)) {
      return { ok: false, code: "EMAIL_EXISTS" };
    }
    throw err;
  }
}
function getLearnerDashboardData(db, userId) {
  if (isJsonFallback(db)) {
    const s = getFallbackState(db);
    const profile2 = s.learner_profiles.find((p) => p.user_id === userId) || null;
    if (!profile2) return { profile: null, enrollments: [] };
    const enrollments2 = s.enrollments.filter((e) => e.learner_id === profile2.id).map((e) => {
      const course = s.courses.find((c) => c.id === e.course_id);
      return {
        ...e,
        course_title: course?.title || "Course",
        course_slug: course?.slug || "",
        course_level: course?.level || "Beginner",
        course_mode: course?.mode || "online",
        course_duration: course?.duration || "",
        course_price: course?.price || "",
        course_short_description: course?.short_description || ""
      };
    }).sort((a, b) => b.id - a.id);
    return { profile: profile2, enrollments: enrollments2 };
  }
  const profile = db.prepare(
    `SELECT id, user_id, full_name, gender, country_code, country_name, state_code, state_name, city, phone, consent_accepted_at, created_at, updated_at
       FROM learner_profiles WHERE user_id = ?`
  ).get(userId);
  if (!profile) {
    return { profile: null, enrollments: [] };
  }
  const enrollments = db.prepare(
    `SELECT e.id, e.learner_id, e.course_id, e.status, e.notes, e.created_at, e.updated_at,
              c.title AS course_title, c.slug AS course_slug, c.level AS course_level, c.mode AS course_mode,
              c.duration AS course_duration, c.price AS course_price, c.short_description AS course_short_description
       FROM enrollments e
       INNER JOIN courses c ON c.id = e.course_id
       WHERE e.learner_id = ?
       ORDER BY e.created_at DESC, e.id DESC`
  ).all(profile.id);
  return { profile, enrollments };
}
function getAdminLearnSummary(db) {
  if (isJsonFallback(db)) {
    const s = getFallbackState(db);
    const sortedCourses = [...s.courses].sort((a, b) => a.display_order - b.display_order || a.id - b.id);
    return {
      totalRegistrations: s.enrollments.length,
      pendingCount: s.enrollments.filter((e) => e.status === "PENDING").length,
      approvedCount: s.enrollments.filter((e) => e.status === "APPROVED").length,
      rejectedCount: s.enrollments.filter((e) => e.status === "REJECTED").length,
      completedCount: s.enrollments.filter((e) => e.status === "COMPLETED").length,
      publishedCourses: s.courses.filter((c) => c.status === "published").length,
      totalCourses: s.courses.length,
      registrationsPerCourse: sortedCourses.map((c) => ({
        course_id: c.id,
        course_title: c.title,
        course_slug: c.slug,
        count: s.enrollments.filter((e) => e.course_id === c.id).length
      }))
    };
  }
  const statusRows = db.prepare(`SELECT status, COUNT(*) as count FROM enrollments GROUP BY status`).all();
  let totalRegistrations = 0;
  let pendingCount = 0;
  let approvedCount = 0;
  let rejectedCount = 0;
  let completedCount = 0;
  for (const row of statusRows) {
    const cnt = Number(row.count || 0);
    totalRegistrations += cnt;
    if (row.status === "PENDING") pendingCount = cnt;
    else if (row.status === "APPROVED") approvedCount = cnt;
    else if (row.status === "REJECTED") rejectedCount = cnt;
    else if (row.status === "COMPLETED") completedCount = cnt;
  }
  const courseCounts = db.prepare(
    `SELECT c.id AS course_id, c.title AS course_title, c.slug AS course_slug, COUNT(e.id) AS count
       FROM courses c
       LEFT JOIN enrollments e ON e.course_id = c.id
       GROUP BY c.id
       ORDER BY c.display_order ASC, c.id ASC`
  ).all();
  const publishedRow = db.prepare(`SELECT COUNT(*) as count FROM courses WHERE status = 'published'`).get();
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
function buildRegistrationsWhereClause(filters) {
  const clauses = [];
  const params = [];
  if (filters.courseId && Number.isInteger(filters.courseId) && filters.courseId > 0) {
    clauses.push("e.course_id = ?");
    params.push(filters.courseId);
  }
  if (filters.country && filters.country.trim()) {
    clauses.push("(LOWER(lp.country_name) = LOWER(?) OR LOWER(lp.country_code) = LOWER(?))");
    params.push(filters.country.trim(), filters.country.trim());
  }
  if (filters.status) {
    clauses.push("e.status = ?");
    params.push(filters.status);
  }
  if (filters.from && /^\d{4}-\d{2}-\d{2}$/.test(filters.from)) {
    clauses.push("date(e.created_at) >= date(?)");
    params.push(filters.from);
  }
  if (filters.to && /^\d{4}-\d{2}-\d{2}$/.test(filters.to)) {
    clauses.push("date(e.created_at) <= date(?)");
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
    whereSql: clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "",
    params
  };
}
function hydrateFallbackRegistration(s, e) {
  const lp = s.learner_profiles.find((p) => p.id === e.learner_id);
  const u = lp ? s.users.find((usr) => usr.id === lp.user_id) : void 0;
  const c = s.courses.find((course) => course.id === e.course_id);
  if (!lp || !u || !c) return null;
  return {
    enrollment_id: e.id,
    learner_id: lp.id,
    user_id: u.id,
    course_id: c.id,
    full_name: lp.full_name,
    email: u.email,
    gender: lp.gender,
    phone: lp.phone,
    country_code: lp.country_code,
    country_name: lp.country_name,
    state_code: lp.state_code,
    state_name: lp.state_name,
    city: lp.city,
    course_title: c.title,
    course_slug: c.slug,
    status: e.status,
    notes: e.notes,
    created_at: e.created_at,
    updated_at: e.updated_at
  };
}
function listAdminRegistrations(db, filters, paginate = true) {
  if (isJsonFallback(db)) {
    const s = getFallbackState(db);
    let rows2 = s.enrollments.map((e) => hydrateFallbackRegistration(s, e)).filter((r) => r !== null);
    if (filters.courseId && filters.courseId > 0) {
      rows2 = rows2.filter((r) => r.course_id === filters.courseId);
    }
    if (filters.country && filters.country.trim()) {
      const target = filters.country.trim().toLowerCase();
      rows2 = rows2.filter(
        (r) => r.country_name.toLowerCase() === target || r.country_code.toLowerCase() === target
      );
    }
    if (filters.status) {
      rows2 = rows2.filter((r) => r.status === filters.status);
    }
    if (filters.from && /^\d{4}-\d{2}-\d{2}$/.test(filters.from)) {
      const from = filters.from;
      rows2 = rows2.filter((r) => r.created_at.slice(0, 10) >= from);
    }
    if (filters.to && /^\d{4}-\d{2}-\d{2}$/.test(filters.to)) {
      const to = filters.to;
      rows2 = rows2.filter((r) => r.created_at.slice(0, 10) <= to);
    }
    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      rows2 = rows2.filter(
        (r) => r.full_name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || r.phone.toLowerCase().includes(q) || r.city.toLowerCase().includes(q) || r.state_name.toLowerCase().includes(q) || r.country_name.toLowerCase().includes(q) || r.course_title.toLowerCase().includes(q)
      );
    }
    rows2.sort((a, b) => b.enrollment_id - a.enrollment_id);
    const total2 = rows2.length;
    const page2 = Math.max(1, Number(filters.page) || 1);
    const limit2 = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const totalPages2 = Math.max(1, Math.ceil(total2 / limit2));
    const safePage2 = Math.min(page2, totalPages2);
    const paged = paginate ? rows2.slice((safePage2 - 1) * limit2, safePage2 * limit2) : rows2;
    const countries = Array.from(new Set(s.learner_profiles.map((p) => p.country_name).filter(Boolean))).sort();
    return {
      registrations: paged,
      countries,
      pagination: { page: safePage2, limit: limit2, total: total2, totalPages: totalPages2 }
    };
  }
  const { whereSql, params } = buildRegistrationsWhereClause(filters);
  const countRow = db.prepare(
    `SELECT COUNT(*) AS count
       FROM enrollments e
       INNER JOIN learner_profiles lp ON lp.id = e.learner_id
       INNER JOIN users u ON u.id = lp.user_id
       INNER JOIN courses c ON c.id = e.course_id
       ${whereSql}`
  ).get(...params);
  const total = Number(countRow?.count || 0);
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * limit;
  const limitSql = paginate ? "LIMIT ? OFFSET ?" : "";
  const queryParams = paginate ? [...params, limit, offset] : params;
  const rows = db.prepare(
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
  ).all(...queryParams);
  const countryRows = db.prepare(`SELECT DISTINCT country_name FROM learner_profiles WHERE country_name <> '' ORDER BY country_name ASC`).all();
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
function updateEnrollment(db, enrollmentId, updates) {
  const now = nowTimestamp();
  if (isJsonFallback(db)) {
    const s = getFallbackState(db);
    const target = s.enrollments.find((e) => e.id === enrollmentId);
    if (!target) return null;
    if (updates.status) target.status = updates.status;
    if (updates.notes !== void 0) target.notes = updates.notes;
    target.updated_at = now;
    db.__saveState();
    return hydrateFallbackRegistration(s, target);
  }
  const existing = db.prepare("SELECT id, status, notes FROM enrollments WHERE id = ?").get(enrollmentId);
  if (!existing) return null;
  const nextStatus = updates.status ?? existing.status;
  const nextNotes = updates.notes !== void 0 ? updates.notes : existing.notes;
  db.prepare(`UPDATE enrollments SET status = ?, notes = ?, updated_at = ? WHERE id = ?`).run(
    nextStatus,
    nextNotes,
    now,
    enrollmentId
  );
  const row = db.prepare(
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
  ).get(enrollmentId);
  return row || null;
}
function bulkUpdateEnrollments(db, ids, status) {
  const now = nowTimestamp();
  if (isJsonFallback(db)) {
    const s = getFallbackState(db);
    let updated2 = 0;
    for (const id of ids) {
      const target = s.enrollments.find((e) => e.id === id);
      if (target) {
        target.status = status;
        target.updated_at = now;
        updated2 += 1;
      }
    }
    db.__saveState();
    return updated2;
  }
  const stmt = db.prepare("UPDATE enrollments SET status = ?, updated_at = ? WHERE id = ?");
  let updated = 0;
  db.exec("BEGIN IMMEDIATE;");
  try {
    for (const id of ids) {
      const res = stmt.run(status, now, id);
      updated += Number(res.changes || 0);
    }
    db.exec("COMMIT;");
  } catch (err) {
    db.exec("ROLLBACK;");
    throw err;
  }
  return updated;
}

// src/learn/routes.ts
var import_country_state_city = require("country-state-city");
var learnRateBuckets = /* @__PURE__ */ new Map();
function checkCompositeRateLimit(key, limit, windowMs) {
  const now = Date.now();
  const current = learnRateBuckets.get(key);
  if (!current || now > current.resetAt) {
    learnRateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  current.count += 1;
  learnRateBuckets.set(key, current);
  if (current.count > limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1e3))
    };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}
function resetLearnRateLimiter() {
  learnRateBuckets.clear();
}
function isOriginAllowed(req) {
  const origin = req.headers.origin;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  if (!origin || !host) return true;
  try {
    const parsedOrigin = new URL(Array.isArray(origin) ? origin[0] || "" : origin);
    const expectedHost = String(Array.isArray(host) ? host[0] : host).split(",")[0]?.trim().toLowerCase();
    return parsedOrigin.host.toLowerCase() === expectedHost;
  } catch {
    return false;
  }
}
var cachedCountries = null;
function getCountryList() {
  if (!cachedCountries) {
    cachedCountries = import_country_state_city.Country.getAllCountries().map((c) => ({
      isoCode: c.isoCode,
      name: c.name,
      phonecode: String(c.phonecode || "").replace(/^\+/, ""),
      flag: c.flag || ""
    })).sort((a, b) => a.name.localeCompare(b.name));
  }
  return cachedCountries;
}
function escapeCsvCell(value) {
  let str = String(value ?? "").replace(/\r?\n/g, " ");
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}
function buildRegistrationsCsv(rows) {
  const headers = [
    "Enrollment ID",
    "Full Name",
    "Email",
    "Gender",
    "Phone",
    "Country",
    "State / Region",
    "City",
    "Course",
    "Status",
    "Notes",
    "Registered At"
  ];
  const lines = [
    headers.join(","),
    ...rows.map(
      (r) => [
        r.enrollment_id,
        r.full_name,
        r.email,
        r.gender,
        r.phone,
        r.country_name,
        r.state_name,
        r.city,
        r.course_title,
        r.status,
        r.notes,
        r.created_at
      ].map(escapeCsvCell).join(",")
    )
  ];
  return lines.join("\n");
}
async function dispatchLearnerConfirmationEmail(args) {
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || "YOLETECH Learn <onboarding@resend.dev>",
          to: [args.to],
          subject: `Registration received: ${args.courseTitle} \u2014 YOLETECH`,
          html: `<p>Hi ${args.fullName.replace(/[&<>"']/g, "")},</p>
<p>Thank you for registering for <strong>${args.courseTitle.replace(/[&<>"']/g, "")}</strong> at YOLETECH.</p>
<p>Your registration is currently <strong>PENDING</strong> review. You can sign in anytime at <code>/learn/dashboard</code> with your registered email and password to view your status.</p>
<p>\u2014 YOLETECH Team</p>`
        })
      });
      if (res.ok) {
        return { delivered: true, mode: "resend" };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("[Learn Email] Resend learner confirmation failed:", msg);
    }
  }
  console.log("[Learn Email Stub] Learner confirmation email queued (console stub):", {
    to: args.to,
    subject: `Registration received: ${args.courseTitle} \u2014 YOLETECH`,
    fullName: args.fullName,
    courseTitle: args.courseTitle
  });
  return { delivered: false, mode: "stub" };
}
function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = /* @__PURE__ */ new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
async function handleLearnApiRequest(ctx) {
  const { db, req, res, pathname, parsedUrl, clientIp, parseBody, sendJson, getAuthUser } = ctx;
  const method = req.method || "GET";
  if (!pathname.startsWith("/api/learn") && !pathname.startsWith("/api/admin/learn")) {
    return false;
  }
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    if (!isOriginAllowed(req)) {
      sendJson(res, 403, { error: "Invalid request origin." });
      return true;
    }
  }
  if (pathname === "/api/learn/locations/countries" && method === "GET") {
    sendJson(
      res,
      200,
      { countries: getCountryList() },
      { "Cache-Control": "public, max-age=86400" }
    );
    return true;
  }
  if (pathname === "/api/learn/locations/states" && method === "GET") {
    const country = String(parsedUrl.searchParams.get("country") || "").trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(country)) {
      sendJson(res, 400, { error: "Valid 2-letter ISO country code is required." });
      return true;
    }
    const states = import_country_state_city.State.getStatesOfCountry(country).map((s) => ({ isoCode: s.isoCode, name: s.name })).sort((a, b) => a.name.localeCompare(b.name));
    sendJson(res, 200, { country, states }, { "Cache-Control": "public, max-age=86400" });
    return true;
  }
  if (pathname === "/api/learn/locations/cities" && method === "GET") {
    const country = String(parsedUrl.searchParams.get("country") || "").trim().toUpperCase();
    const state = String(parsedUrl.searchParams.get("state") || "").trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(country)) {
      sendJson(res, 400, { error: "Valid 2-letter ISO country code is required." });
      return true;
    }
    const cities = state ? import_country_state_city.City.getCitiesOfState(country, state).map((c) => ({ name: c.name })) : (import_country_state_city.City.getCitiesOfCountry(country) || []).map((c) => ({ name: c.name }));
    const uniqueSorted = Array.from(new Set(cities.map((c) => c.name))).sort((a, b) => a.localeCompare(b)).map((name) => ({ name }));
    sendJson(
      res,
      200,
      { country, state, cities: uniqueSorted },
      { "Cache-Control": "public, max-age=86400" }
    );
    return true;
  }
  if (pathname === "/api/learn/content" && method === "GET") {
    const courses = listPublishedCourses(db);
    const content = getLearnPageContent(db);
    sendJson(res, 200, { courses, content }, { "Cache-Control": "no-store" });
    return true;
  }
  if (pathname === "/api/learn/register" && method === "POST") {
    const ipRate = checkCompositeRateLimit(`learn:ip:${clientIp}`, 10, 15 * 60 * 1e3);
    if (!ipRate.allowed) {
      sendJson(
        res,
        429,
        { error: "Too many registration attempts. Please wait a few minutes and try again." },
        { "Retry-After": String(ipRate.retryAfterSeconds) }
      );
      return true;
    }
    const body = await parseBody(req);
    if (typeof body.website === "string" && body.website.trim().length > 0) {
      sendJson(res, 400, { error: "Unable to process registration request." });
      return true;
    }
    const parsed = learnerRegistrationSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors = flattenZodFieldErrors(parsed.error);
      const firstError = Object.values(fieldErrors)[0] || "Please check the highlighted fields.";
      sendJson(res, 400, { error: firstError, fieldErrors });
      return true;
    }
    const input = parsed.data;
    const emailRate = checkCompositeRateLimit(`learn:email:${input.email}`, 5, 15 * 60 * 1e3);
    if (!emailRate.allowed) {
      sendJson(
        res,
        429,
        { error: "Too many registration attempts for this request. Please try again later." },
        { "Retry-After": String(emailRate.retryAfterSeconds) }
      );
      return true;
    }
    const countryRecord = import_country_state_city.Country.getCountryByCode(input.countryCode);
    if (!countryRecord) {
      sendJson(res, 400, {
        error: "Please select a valid country.",
        fieldErrors: { countryCode: "Please select a valid country." }
      });
      return true;
    }
    const normalizedPhone = normalizeInternationalPhone(input.phone, countryRecord.isoCode);
    if (!normalizedPhone.valid) {
      sendJson(res, 400, {
        error: "Please enter a valid international phone number.",
        fieldErrors: { phone: "Please enter a valid international phone number." }
      });
      return true;
    }
    const passwordHash = ctx.hashPassword(input.password);
    const result = registerLearnerTransaction(db, {
      fullName: input.fullName,
      gender: input.gender,
      countryCode: countryRecord.isoCode,
      countryName: countryRecord.name,
      stateCode: input.stateCode || "",
      stateName: input.stateName,
      city: input.city,
      courseId: input.courseId,
      phoneE164: normalizedPhone.e164,
      email: input.email,
      passwordHash
    });
    if (!result.ok) {
      if (result.code === "COURSE_NOT_FOUND") {
        sendJson(res, 400, {
          error: "The selected course is currently unavailable. Please choose another course.",
          fieldErrors: { courseId: "Please choose an available course." }
        });
        return true;
      }
      if (result.code === "EMAIL_EXISTS") {
        sendJson(res, 409, {
          error: "We could not complete registration with these details. If you have already registered, please sign in to your learner dashboard or check your email address."
        });
        return true;
      }
      sendJson(res, 500, { error: "Could not complete registration. Please try again." });
      return true;
    }
    const token = ctx.signToken({
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      phone: result.user.phone,
      company: result.user.company,
      service_interest: result.user.service_interest,
      role: result.user.role,
      status: result.user.status,
      created_at: result.user.created_at
    });
    await dispatchLearnerConfirmationEmail({
      to: result.user.email,
      fullName: result.profile.full_name,
      courseTitle: result.enrollment.course_title
    });
    void ctx.sendEmailToYoletech({
      subject: `[YOLETECH Learn Registration] ${result.profile.full_name} \u2014 ${result.enrollment.course_title}`,
      replyTo: result.user.email,
      fields: {
        Event: "New Learner Registration",
        "Full Name": result.profile.full_name,
        Gender: result.profile.gender,
        Course: result.enrollment.course_title,
        Location: `${result.profile.city}, ${result.profile.state_name}, ${result.profile.country_name}`,
        Phone: result.profile.phone,
        Email: result.user.email,
        Status: result.enrollment.status
      }
    }).catch(() => {
    });
    const extraHeaders = { "Cache-Control": "no-store" };
    if (typeof ctx.buildSessionCookie === "function") {
      extraHeaders["Set-Cookie"] = ctx.buildSessionCookie(token, req);
    }
    sendJson(
      res,
      201,
      {
        token,
        user: result.user,
        profile: result.profile,
        enrollment: result.enrollment
      },
      extraHeaders
    );
    return true;
  }
  if (pathname === "/api/learn/me" && method === "GET") {
    const user = getAuthUser(req);
    if (!user) {
      sendJson(res, 401, { error: "Please sign in to access your learner dashboard." });
      return true;
    }
    const { profile, enrollments } = getLearnerDashboardData(db, user.id);
    sendJson(res, 200, { user, profile, enrollments }, { "Cache-Control": "no-store" });
    return true;
  }
  if (pathname.startsWith("/api/admin/learn")) {
    const admin = getAuthUser(req);
    if (!admin || admin.role !== "ADMIN") {
      sendJson(res, 403, { error: "Admin access required." });
      return true;
    }
    if (pathname === "/api/admin/learn/summary" && method === "GET") {
      const summary = getAdminLearnSummary(db);
      sendJson(res, 200, { summary }, { "Cache-Control": "no-store" });
      return true;
    }
    if (pathname === "/api/admin/learn/courses" && method === "GET") {
      const courses = listAllCourses(db);
      sendJson(res, 200, { courses }, { "Cache-Control": "no-store" });
      return true;
    }
    if (pathname === "/api/admin/learn/courses" && method === "POST") {
      const body = await parseBody(req);
      const parsed = courseInputSchema.safeParse(body);
      if (!parsed.success) {
        const fieldErrors = flattenZodFieldErrors(parsed.error);
        sendJson(res, 400, { error: Object.values(fieldErrors)[0] || "Invalid course data.", fieldErrors });
        return true;
      }
      const course = createCourse(db, parsed.data);
      sendJson(res, 201, { course });
      return true;
    }
    if (pathname === "/api/admin/learn/courses/reorder" && method === "PUT") {
      const body = await parseBody(req);
      const parsed = courseReorderSchema.safeParse(body);
      if (!parsed.success) {
        sendJson(res, 400, { error: "Provide an ordered list of course IDs." });
        return true;
      }
      const courses = reorderCourses(db, parsed.data.orderedIds);
      sendJson(res, 200, { courses });
      return true;
    }
    if (pathname.startsWith("/api/admin/learn/courses/") && method === "PUT") {
      const id = Number(pathname.split("/").pop());
      if (!Number.isInteger(id) || id <= 0) {
        sendJson(res, 400, { error: "Invalid course ID." });
        return true;
      }
      const body = await parseBody(req);
      const isStatusOnly = Object.keys(body).length === 1 && (body.status === "draft" || body.status === "published");
      if (isStatusOnly) {
        const updated = updateCourse(db, id, { status: body.status });
        if (!updated) {
          sendJson(res, 404, { error: "Course not found." });
          return true;
        }
        sendJson(res, 200, { course: updated });
        return true;
      }
      const parsed = courseInputSchema.safeParse(body);
      if (!parsed.success) {
        const fieldErrors = flattenZodFieldErrors(parsed.error);
        sendJson(res, 400, { error: Object.values(fieldErrors)[0] || "Invalid course data.", fieldErrors });
        return true;
      }
      try {
        const updated = updateCourse(db, id, parsed.data);
        if (!updated) {
          sendJson(res, 404, { error: "Course not found." });
          return true;
        }
        sendJson(res, 200, { course: updated });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/UNIQUE constraint failed: courses\.slug/i.test(msg)) {
          sendJson(res, 409, {
            error: "Another course already uses that slug.",
            fieldErrors: { slug: "That slug is already in use." }
          });
          return true;
        }
        throw err;
      }
      return true;
    }
    if (pathname.startsWith("/api/admin/learn/courses/") && method === "DELETE") {
      const id = Number(pathname.split("/").pop());
      if (!Number.isInteger(id) || id <= 0) {
        sendJson(res, 400, { error: "Invalid course ID." });
        return true;
      }
      const outcome = deleteOrArchiveCourse(db, id);
      if (outcome.action === "not_found") {
        sendJson(res, 404, { error: "Course not found." });
        return true;
      }
      sendJson(res, 200, outcome);
      return true;
    }
    if (pathname === "/api/admin/learn/registrations" && method === "GET") {
      const search = parsedUrl.searchParams.get("search") || void 0;
      const courseIdRaw = parsedUrl.searchParams.get("courseId");
      const courseId = courseIdRaw ? Number(courseIdRaw) : void 0;
      const country = parsedUrl.searchParams.get("country") || void 0;
      const statusRaw = (parsedUrl.searchParams.get("status") || "").toUpperCase();
      const status = ENROLLMENT_STATUSES.includes(statusRaw) ? statusRaw : void 0;
      const from = parsedUrl.searchParams.get("from") || void 0;
      const to = parsedUrl.searchParams.get("to") || void 0;
      const format = (parsedUrl.searchParams.get("format") || "").toLowerCase();
      if (from && !isValidIsoDate(from) || to && !isValidIsoDate(to) || from && to && from > to) {
        sendJson(res, 400, { error: "Provide valid dates with From on or before To." });
        return true;
      }
      const page = Number(parsedUrl.searchParams.get("page")) || 1;
      const limit = Number(parsedUrl.searchParams.get("limit")) || 20;
      const data = listAdminRegistrations(
        db,
        { search, courseId, country, status, from, to, page, limit },
        format !== "csv"
      );
      if (format === "csv") {
        const csv = buildRegistrationsCsv(data.registrations);
        res.writeHead(200, {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="yoletech-learn-registrations-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv"`,
          "Cache-Control": "no-store"
        });
        res.end(csv);
        return true;
      }
      sendJson(res, 200, data, { "Cache-Control": "no-store" });
      return true;
    }
    if (pathname === "/api/admin/learn/registrations/bulk" && method === "PUT") {
      const body = await parseBody(req);
      const parsed = bulkEnrollmentUpdateSchema.safeParse(body);
      if (!parsed.success) {
        const fieldErrors = flattenZodFieldErrors(parsed.error);
        sendJson(res, 400, { error: Object.values(fieldErrors)[0] || "Invalid bulk update request.", fieldErrors });
        return true;
      }
      const updatedCount = bulkUpdateEnrollments(db, parsed.data.ids, parsed.data.status);
      sendJson(res, 200, { updatedCount, status: parsed.data.status });
      return true;
    }
    if (pathname.startsWith("/api/admin/learn/registrations/") && method === "PUT") {
      const id = Number(pathname.split("/").pop());
      if (!Number.isInteger(id) || id <= 0) {
        sendJson(res, 400, { error: "Invalid registration ID." });
        return true;
      }
      const body = await parseBody(req);
      const parsed = enrollmentUpdateSchema.safeParse(body);
      if (!parsed.success) {
        const fieldErrors = flattenZodFieldErrors(parsed.error);
        sendJson(res, 400, { error: Object.values(fieldErrors)[0] || "Invalid update data.", fieldErrors });
        return true;
      }
      const updated = updateEnrollment(db, id, parsed.data);
      if (!updated) {
        sendJson(res, 404, { error: "Registration not found." });
        return true;
      }
      sendJson(res, 200, { registration: updated });
      return true;
    }
    if (pathname === "/api/admin/learn/content" && method === "GET") {
      const content = getLearnPageContent(db);
      sendJson(res, 200, { content }, { "Cache-Control": "no-store" });
      return true;
    }
    if (pathname === "/api/admin/learn/content" && method === "PUT") {
      const body = await parseBody(req);
      const parsed = learnPageContentSchema.safeParse(body);
      if (!parsed.success) {
        const fieldErrors = flattenZodFieldErrors(parsed.error);
        sendJson(res, 400, { error: Object.values(fieldErrors)[0] || "Invalid page content.", fieldErrors });
        return true;
      }
      const content = updateLearnPageContent(db, parsed.data);
      sendJson(res, 200, { content });
      return true;
    }
  }
  return false;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  COURSE_MODES,
  COURSE_STATUSES,
  DEFAULT_LEARN_PAGE_CONTENT,
  DEFAULT_SEED_COURSES,
  ENROLLMENT_STATUSES,
  GENDER_OPTIONS,
  LEGACY_DEFAULT_LEARN_HEADLINE,
  LEGACY_DEFAULT_LEARN_SUBHEADLINE,
  bulkEnrollmentUpdateSchema,
  bulkUpdateEnrollments,
  checkCompositeRateLimit,
  courseInputSchema,
  courseReorderSchema,
  createCourse,
  deleteOrArchiveCourse,
  enrollmentUpdateSchema,
  ensureLearnSchemaAndSeed,
  evaluatePasswordStrength,
  flattenZodFieldErrors,
  getAdminLearnSummary,
  getCourseById,
  getLearnPageContent,
  getLearnerDashboardData,
  handleLearnApiRequest,
  isValidCourseImageUrl,
  learnFaqItemSchema,
  learnPageContentSchema,
  learnerRegistrationSchema,
  listAdminRegistrations,
  listAllCourses,
  listPublishedCourses,
  normalizeInternationalPhone,
  registerLearnerTransaction,
  reorderCourses,
  resetLearnRateLimiter,
  slugifyCourseTitle,
  updateCourse,
  updateEnrollment,
  updateLearnPageContent
});
