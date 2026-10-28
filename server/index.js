const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'yoletech-super-secret-jwt-key-2026-eniekpo';
const DB_PATH = path.join(__dirname, 'yoletech.db');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const BLOG_DIR = path.join(__dirname, '..', 'content', 'blog');
const BLOG_MEDIA_DIR = path.join(PUBLIC_DIR, 'assets', 'blog');
const ROOT_DIR = path.join(__dirname, '..');

// Ensure directories exist
if (!fs.existsSync(BLOG_DIR)) {
  fs.mkdirSync(BLOG_DIR, { recursive: true });
}
if (!fs.existsSync(BLOG_MEDIA_DIR)) {
  fs.mkdirSync(BLOG_MEDIA_DIR, { recursive: true });
}

// ============================================================================
// 1. CRYPTO & JWT UTILITIES (Zero External Dependencies)
// ============================================================================
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHash] = storedHash.split(':');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
}

function signToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 })
  ).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ============================================================================
// 2. OPEN-SOURCE SQLITE DATABASE INITIALIZATION & SEEDING
// ============================================================================
const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    phone TEXT DEFAULT '',
    company TEXT DEFAULT '',
    service_interest TEXT DEFAULT 'Data Analytics & BI',
    role TEXT DEFAULT 'CLIENT',
    status TEXT DEFAULT 'ACTIVE',
    admin_notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS inquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT DEFAULT '',
    service_category TEXT NOT NULL,
    budget TEXT DEFAULT '$1,500 - $5,000',
    message TEXT NOT NULL,
    status TEXT DEFAULT 'NEW',
    project_progress INTEGER DEFAULT 15,
    admin_response TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS portfolio_projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    organization TEXT NOT NULL,
    period TEXT NOT NULL,
    summary TEXT NOT NULL,
    impact_metrics TEXT NOT NULL,
    tech_stack TEXT NOT NULL,
    preview_image TEXT NOT NULL,
    live_url TEXT DEFAULT '',
    github_url TEXT DEFAULT 'https://github.com/Eniekpo',
    featured INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS testimonials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author_name TEXT NOT NULL,
    author_role TEXT NOT NULL,
    company TEXT NOT NULL,
    service_track TEXT NOT NULL,
    rating INTEGER DEFAULT 5,
    content TEXT NOT NULL,
    approved INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

function seedDatabase() {
  // 1. Seed Admin & Sample Registered Clients
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (name, email, password_hash, phone, company, service_interest, role, status, admin_notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Master Admin Account (John Oruebi Eniekpo)
    insertUser.run(
      'John Oruebi Eniekpo, B.Sc.',
      'yoletech@yolestica.com',
      hashPassword('YoleTech@2026#Admin'),
      '+234 802 552 6389',
      'YOLETECH Headquarters',
      'Full-Stack, BI & AI Architecture',
      'ADMIN',
      'ACTIVE',
      'Master Administrator & Founder Account.',
      '2026-01-10 09:00:00'
    );

    // Demo Client Account (for testing client portal)
    insertUser.run(
      'Dr. Tarila Okoro',
      'client@example.com',
      hashPassword('Client@2026'),
      '+234 803 441 9201',
      'Niger Delta Academic Research Consortium',
      'Data Analytics & BI',
      'CLIENT',
      'ACTIVE',
      'Executive Power BI & SPSS research dataset validation project active.',
      '2026-08-14 11:30:00'
    );

    // Additional realistic registered clients
    insertUser.run(
      'Engr. Ebiowei Dickson',
      'ebiowei@bayelsatechventures.ng',
      hashPassword('Client@2026'),
      '+234 806 118 3340',
      'Bayelsa Tech Ventures',
      'Full-Stack Web Development',
      'CLIENT',
      'ACTIVE',
      'React.js + SQL client operations portal and automated reporting integration.',
      '2026-09-02 14:15:00'
    );

    insertUser.run(
      'Amaka Nwosu',
      'a.nwosu@primelogistics.com',
      hashPassword('Client@2026'),
      '+234 812 904 5512',
      'Prime Logistics & Supply Ltd',
      'AI & Workflow Automation',
      'CLIENT',
      'ONBOARDING',
      'Automating multi-departmental Excel VBA workbooks into SQL Server.',
      '2026-09-21 16:40:00'
    );

    insertUser.run(
      'Marcus Vance',
      'mvance@globaledumetrix.io',
      hashPassword('Client@2026'),
      '+44 7700 900412',
      'Global EduMetrix (UK Remote)',
      'Data Analytics & BI',
      'CLIENT',
      'COMPLETED',
      'Delivered student performance predictive ML model & Tableau executive views.',
      '2026-10-05 10:20:00'
    );

    insertUser.run(
      'Preye Alagoa',
      'preye.alagoa@sulphilcohort.org',
      hashPassword('Client@2026'),
      '+234 705 339 8172',
      'SulPhil Analytics Cohort Alumni',
      'Tech Tutorials & Mentorship',
      'CLIENT',
      'ACTIVE',
      'Corporate team training in Python (Pandas), SQL querying, and Power BI.',
      '2026-10-19 08:50:00'
    );
  }

  // 2. Seed Inquiries
  const inquiryCount = db.prepare('SELECT COUNT(*) as count FROM inquiries').get().count;
  if (inquiryCount === 0) {
    const insertInquiry = db.prepare(`
      INSERT INTO inquiries (user_id, name, email, phone, service_category, budget, message, status, project_progress, admin_response, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertInquiry.run(
      2,
      'Dr. Tarila Okoro',
      'client@example.com',
      '+234 803 441 9201',
      'Data Analytics & Dashboards',
      '$1,500 - $5,000',
      'We need an interactive Power BI dashboard and statistical auditing in Python/SPSS for our multi-institution student performance dataset (45,000+ rows).',
      'IN_PROGRESS',
      75,
      'SQL schema validation and Python Pandas cleaning completed. Power BI executive views are 75% ready for stakeholder review.',
      '2026-10-12 10:15:00'
    );

    insertInquiry.run(
      3,
      'Engr. Ebiowei Dickson',
      'ebiowei@bayelsatechventures.ng',
      '+234 806 118 3340',
      'Web Development',
      '$1,500 - $5,000',
      'Looking to build a custom React.js full-stack web platform with role-based dashboards and automated SQL reporting.',
      'IN_PROGRESS',
      60,
      'Frontend React components and SQLite/SQL API endpoints deployed to staging.',
      '2026-10-18 15:30:00'
    );

    insertInquiry.run(
      4,
      'Amaka Nwosu',
      'a.nwosu@primelogistics.com',
      '+234 812 904 5512',
      'AI & Automation',
      '$500 - $1,500',
      'Our operations team spends 18 hours every week compiling 6 departmental Excel sheets. We want Excel VBA macros + Python SQL automation.',
      'NEW',
      20,
      'Initial data audit scheduled. Reviewing sample Excel workbooks.',
      '2026-10-24 13:10:00'
    );
  }

  // 3. Seed Authentic CV Portfolio Projects
  const projectCount = db.prepare('SELECT COUNT(*) as count FROM portfolio_projects').get().count;
  if (projectCount === 0) {
    const insertProject = db.prepare(`
      INSERT INTO portfolio_projects (title, category, organization, period, summary, impact_metrics, tech_stack, preview_image, live_url, github_url, featured)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertProject.run(
      'Executive Performance & KPI Intelligence Suite',
      'Data Analytics & BI',
      'SulPhil Tech Hub',
      '2021 – 2024',
      'Designed interactive Power BI and Tableau dashboards communicating key performance metrics, resource utilization, and research outcomes to executive stakeholders.',
      'Improved executive reporting speed by 65% & enforced 99.8% data validation compliance',
      JSON.stringify(['Power BI', 'Tableau', 'SQL', 'Python', 'Data Governance']),
      '/assets/dashboard-preview.jpg',
      'https://kaggle.com/Yoletech',
      'https://github.com/Eniekpo',
      1
    );

    insertProject.run(
      'Student Performance & Institutional Resource Predictive Model',
      'AI & Machine Learning',
      'SulPhil Tech Hub',
      '2022 – 2024',
      'Developed machine learning and statistical forecasting models in Python (Pandas, Scikit-Learn), R, and SPSS to predict student academic outcomes and optimize institutional resource allocation.',
      'Analyzed multi-year academic cohorts with high predictive accuracy for early intervention',
      JSON.stringify(['Python', 'Pandas', 'Machine Learning', 'R', 'SPSS']),
      '/assets/workflow-diagram.jpg',
      'https://kaggle.com/Yoletech',
      'https://github.com/Eniekpo',
      1
    );

    insertProject.run(
      'Automated Multi-Departmental Data & VBA Reporting Engine',
      'AI & Workflow Automation',
      'Feasibility Giant Company',
      '2019 – 2021',
      'Automated repetitive high-volume data processing workflows across multiple departments using Advanced Microsoft Excel VBA macros, custom scripts, and centralized SQL databases.',
      'Drastically reduced manual report compilation time across organizational units',
      JSON.stringify(['Excel VBA', 'SQL Server', 'MySQL', 'MS Access', 'Automation']),
      '/assets/code-sync-preview.jpg',
      'https://github.com/Eniekpo',
      'https://github.com/Eniekpo',
      1
    );

    insertProject.run(
      'Multi-Departmental SQL Database & Data Governance Architecture',
      'Data Analytics & BI',
      'Feasibility Giant Company',
      '2019 – 2021',
      'Administered and updated SQL Server, MySQL, and Microsoft Access databases with end-to-end data validation, discrepancy resolution, and compliance auditing across organizational units.',
      'Guaranteed 100% cross-departmental data consistency and scheduled academic research metrics',
      JSON.stringify(['SQL Server', 'MySQL', 'Microsoft Access', 'Statistical Auditing']),
      '/assets/dashboard-preview.jpg',
      'https://github.com/Eniekpo',
      'https://github.com/Eniekpo',
      1
    );

    insertProject.run(
      'Full-Stack Enterprise Web & Client Management Platform',
      'Full-Stack Web',
      'YOLETECH Digital Solutions',
      '2024 – Present',
      'Full-stack web application built with React.js, modern JavaScript, HTML/CSS, and relational SQL backend featuring role-based client portals, live analytics, and Decap CMS integration.',
      'Sub-1.5s load time, JWT security, and real-time client CRM management',
      JSON.stringify(['React.js', 'JavaScript', 'HTML5/CSS3', 'Node.js', 'SQL']),
      '/assets/code-sync-preview.jpg',
      'https://github.com/Eniekpo',
      'https://github.com/Eniekpo',
      1
    );

    insertProject.run(
      'Data Analytics & Python/SQL Mentorship Curriculum (200+ Interns)',
      'Tech Tutorials & Training',
      'SulPhil Tech Hub',
      '2021 – 2024',
      'Structured hands-on technical training program and practical data workflows used to train and mentor over 200 interns in Python, SQL, Power BI, and statistical data analysis.',
      '200+ interns trained and mentored into job-ready data analysts and developers',
      JSON.stringify(['Python', 'SQL', 'Power BI', 'Excel', 'Technical Leadership']),
      '/assets/workflow-diagram.jpg',
      'https://youtube.com/@yole-tech',
      'https://github.com/Eniekpo',
      1
    );
  }

  // 4. Seed Verified Testimonials
  const testimonialCount = db.prepare('SELECT COUNT(*) as count FROM testimonials').get().count;
  if (testimonialCount === 0) {
    const insertTestimonial = db.prepare(`
      INSERT INTO testimonials (author_name, author_role, company, service_track, rating, content, approved)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertTestimonial.run(
      'Management & Research Lead',
      'Executive Stakeholder',
      'SulPhil Tech Hub, Yenagoa',
      'Data Analytics & BI',
      5,
      'John transformed how we handle complex client research datasets. His interactive Power BI and Tableau dashboards and predictive student performance models significantly improved our analytical accuracy and executive reporting speed.',
      1
    );

    insertTestimonial.run(
      'Operations & IT Directorate',
      'Departmental Supervisor',
      'Feasibility Giant Company',
      'AI & Workflow Automation',
      5,
      'By automating our repetitive multi-departmental workflows with Excel VBA macros and administering our SQL databases, John reduced manual report compilation time dramatically while maintaining strict data integrity.',
      1
    );

    insertTestimonial.run(
      'Preye Alagoa',
      'Data Analytics Intern (Cohort Graduate)',
      'SulPhil Tech Hub Mentorship Program',
      'Tech Tutorials & Mentorship',
      5,
      'Being mentored by John among the 200+ interns at SulPhil Tech Hub was career-defining. He breaks down Python, Pandas, SQL, and Power BI into practical workflows you can immediately apply to real projects.',
      1
    );

    insertTestimonial.run(
      'Engr. Ebiowei Dickson',
      'Managing Partner',
      'Bayelsa Tech Ventures',
      'Full-Stack Web Development',
      5,
      'John brings a rare combination of Computer Science depth, full-stack React.js web development, and rigorous database architecture. Our platform runs smoothly and our data pipelines are rock-solid.',
      1
    );
  }
}

seedDatabase();

// ============================================================================
// 3. DECAP CMS MARKDOWN PARSER & WRITER (/content/blog/*.md)
// ============================================================================
function parseMarkdownFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const slug = path.basename(filePath, '.md');
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);

  const meta = {
    slug,
    title: slug,
    date: '2026-10-15',
    category: 'Data Analytics & BI',
    readTime: '5 min read',
    author: 'John Oruebi Eniekpo, B.Sc.',
    coverImage: '/assets/dashboard-preview.jpg',
    summary: '',
    tags: ['Python', 'SQL', 'Power BI'],
    featured: false
  };

  let body = raw;
  if (match) {
    const frontmatter = match[1];
    body = match[2].trim();
    const lines = frontmatter.split(/\r?\n/);
    for (const line of lines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const key = line.slice(0, colonIdx).trim();
      let val = line.slice(colonIdx + 1).trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      if (key === 'tags') {
        try {
          meta.tags = JSON.parse(val);
        } catch {
          meta.tags = val
            .replace(/^\[|\]$/g, '')
            .split(',')
            .map((s) => s.trim().replace(/^["']|["']$/g, ''))
            .filter(Boolean);
        }
      } else if (key === 'featured') {
        meta.featured = val === 'true';
      } else if (key in meta) {
        meta[key] = val;
      }
    }
  }

  return { ...meta, body };
}

function writeMarkdownFile(slug, data) {
  const safeSlug = slug
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const tagsArray = Array.isArray(data.tags)
    ? data.tags
    : String(data.tags || 'Python, SQL')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

  const content = `---
title: "${String(data.title || 'Untitled Article').replace(/"/g, '\\"')}"
date: "${data.date || new Date().toISOString().slice(0, 10)}"
category: "${data.category || 'Data Analytics & BI'}"
readTime: "${data.readTime || '5 min read'}"
author: "${data.author || 'John Oruebi Eniekpo, B.Sc.'}"
coverImage: "${data.coverImage || '/assets/dashboard-preview.jpg'}"
summary: "${String(data.summary || '').replace(/"/g, '\\"')}"
tags: ${JSON.stringify(tagsArray)}
featured: ${data.featured ? 'true' : 'false'}
---

${data.body || ''}
`;
  const filePath = path.join(BLOG_DIR, `${safeSlug}.md`);
  fs.writeFileSync(filePath, content, 'utf8');
  return parseMarkdownFile(filePath);
}

function getAllBlogPosts() {
  if (!fs.existsSync(BLOG_DIR)) return [];
  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.md'));
  const posts = files.map((f) => parseMarkdownFile(path.join(BLOG_DIR, f)));
  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

// ============================================================================
// 4. HTTP HELPERS & REQUEST PARSING
// ============================================================================
function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 5 * 1024 * 1024) reject(new Error('Payload too large'));
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

function getAuthUser(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) return null;
  const user = db
    .prepare(
      'SELECT id, name, email, phone, company, service_interest, role, status, admin_notes, created_at FROM users WHERE id = ?'
    )
    .get(payload.id);
  return user || null;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.yml': 'text/yaml; charset=utf-8',
  '.yaml': 'text/yaml; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// ============================================================================
// 5. MAIN SERVER & API ROUTER
// ============================================================================
const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 200, { ok: true });
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  try {
    // --- AUTH ENDPOINTS ---
    if (pathname === '/api/auth/register' && req.method === 'POST') {
      const body = await parseBody(req);
      const { name, email, password, phone, company, service_interest } = body;
      if (!name || !email || !password) {
        return sendJson(res, 400, { error: 'Name, email, and password are required.' });
      }
      const normalizedEmail = String(email).trim().toLowerCase();
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
      if (existing) {
        return sendJson(res, 409, { error: 'An account with this email already exists.' });
      }
      const passwordHash = hashPassword(password);
      const info = db
        .prepare(
          `INSERT INTO users (name, email, password_hash, phone, company, service_interest, role, status, admin_notes)
           VALUES (?, ?, ?, ?, ?, ?, 'CLIENT', 'ACTIVE', 'Registered via YOLETECH Client Portal')`
        )
        .run(
          name.trim(),
          normalizedEmail,
          passwordHash,
          (phone || '').trim(),
          (company || '').trim(),
          service_interest || 'Data Analytics & BI'
        );

      const user = db
        .prepare(
          'SELECT id, name, email, phone, company, service_interest, role, status, created_at FROM users WHERE id = ?'
        )
        .get(info.lastInsertRowid);
      const token = signToken({ id: user.id, email: user.email, role: user.role });
      return sendJson(res, 201, { token, user });
    }

    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const body = await parseBody(req);
      const { email, password } = body;
      if (!email || !password) {
        return sendJson(res, 400, { error: 'Email and password are required.' });
      }
      const normalizedEmail = String(email).trim().toLowerCase();
      const userRecord = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
      if (!userRecord || !verifyPassword(password, userRecord.password_hash)) {
        return sendJson(res, 401, { error: 'Invalid email or password.' });
      }
      const user = {
        id: userRecord.id,
        name: userRecord.name,
        email: userRecord.email,
        phone: userRecord.phone,
        company: userRecord.company,
        service_interest: userRecord.service_interest,
        role: userRecord.role,
        status: userRecord.status,
        created_at: userRecord.created_at
      };
      const token = signToken({ id: user.id, email: user.email, role: user.role });
      return sendJson(res, 200, { token, user });
    }

    if (pathname === '/api/auth/me' && req.method === 'GET') {
      const user = getAuthUser(req);
      if (!user) return sendJson(res, 401, { error: 'Unauthorized' });
      return sendJson(res, 200, { user });
    }

    if (pathname === '/api/auth/profile' && req.method === 'PUT') {
      const user = getAuthUser(req);
      if (!user) return sendJson(res, 401, { error: 'Unauthorized' });
      const body = await parseBody(req);
      db.prepare(
        `UPDATE users SET name = ?, phone = ?, company = ?, service_interest = ? WHERE id = ?`
      ).run(
        body.name || user.name,
        body.phone ?? user.phone,
        body.company ?? user.company,
        body.service_interest || user.service_interest,
        user.id
      );
      const updated = db
        .prepare(
          'SELECT id, name, email, phone, company, service_interest, role, status, created_at FROM users WHERE id = ?'
        )
        .get(user.id);
      return sendJson(res, 200, { user: updated });
    }

    // --- ADMIN CLIENT MANAGEMENT ENDPOINTS ---
    if (pathname === '/api/clients' && req.method === 'GET') {
      const user = getAuthUser(req);
      if (!user || user.role !== 'ADMIN') {
        return sendJson(res, 403, { error: 'Admin access required.' });
      }
      const clients = db
        .prepare(
          `SELECT id, name, email, phone, company, service_interest, role, status, admin_notes, created_at
           FROM users ORDER BY id DESC`
        )
        .all();
      const inquiries = db.prepare('SELECT * FROM inquiries ORDER BY id DESC').all();
      return sendJson(res, 200, { clients, inquiries });
    }

    if (pathname === '/api/clients' && req.method === 'POST') {
      const user = getAuthUser(req);
      if (!user || user.role !== 'ADMIN') {
        return sendJson(res, 403, { error: 'Admin access required.' });
      }
      const body = await parseBody(req);
      if (!body.name || !body.email) {
        return sendJson(res, 400, { error: 'Name and email are required.' });
      }
      const normalizedEmail = String(body.email).trim().toLowerCase();
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
      if (existing) {
        return sendJson(res, 409, { error: 'A client with this email already exists.' });
      }
      const passHash = hashPassword(body.password || 'Client@2026');
      const info = db
        .prepare(
          `INSERT INTO users (name, email, password_hash, phone, company, service_interest, role, status, admin_notes)
           VALUES (?, ?, ?, ?, ?, ?, 'CLIENT', ?, ?)`
        )
        .run(
          body.name.trim(),
          normalizedEmail,
          passHash,
          body.phone || '',
          body.company || '',
          body.service_interest || 'Data Analytics & BI',
          body.status || 'ACTIVE',
          body.admin_notes || ''
        );
      const created = db
        .prepare(
          'SELECT id, name, email, phone, company, service_interest, role, status, admin_notes, created_at FROM users WHERE id = ?'
        )
        .get(info.lastInsertRowid);
      return sendJson(res, 201, { client: created });
    }

    if (pathname.startsWith('/api/clients/') && req.method === 'PUT') {
      const user = getAuthUser(req);
      if (!user || user.role !== 'ADMIN') {
        return sendJson(res, 403, { error: 'Admin access required.' });
      }
      const clientId = Number(pathname.split('/').pop());
      const body = await parseBody(req);
      const target = db.prepare('SELECT * FROM users WHERE id = ?').get(clientId);
      if (!target) return sendJson(res, 404, { error: 'Client not found.' });

      db.prepare(
        `UPDATE users
         SET name = ?, phone = ?, company = ?, service_interest = ?, status = ?, admin_notes = ?
         WHERE id = ?`
      ).run(
        body.name ?? target.name,
        body.phone ?? target.phone,
        body.company ?? target.company,
        body.service_interest ?? target.service_interest,
        body.status ?? target.status,
        body.admin_notes ?? target.admin_notes,
        clientId
      );
      const updated = db
        .prepare(
          'SELECT id, name, email, phone, company, service_interest, role, status, admin_notes, created_at FROM users WHERE id = ?'
        )
        .get(clientId);
      return sendJson(res, 200, { client: updated });
    }

    if (pathname.startsWith('/api/clients/') && req.method === 'DELETE') {
      const user = getAuthUser(req);
      if (!user || user.role !== 'ADMIN') {
        return sendJson(res, 403, { error: 'Admin access required.' });
      }
      const clientId = Number(pathname.split('/').pop());
      if (clientId === user.id) {
        return sendJson(res, 400, { error: 'Cannot delete the master admin account.' });
      }
      db.prepare('DELETE FROM users WHERE id = ?').run(clientId);
      return sendJson(res, 200, { deleted: true });
    }

    // --- PROJECT INQUIRIES ENDPOINTS ---
    if (pathname === '/api/inquiries' && req.method === 'GET') {
      const user = getAuthUser(req);
      if (!user) return sendJson(res, 401, { error: 'Unauthorized' });
      if (user.role === 'ADMIN') {
        const inquiries = db.prepare('SELECT * FROM inquiries ORDER BY id DESC').all();
        return sendJson(res, 200, { inquiries });
      } else {
        const inquiries = db
          .prepare('SELECT * FROM inquiries WHERE user_id = ? OR email = ? ORDER BY id DESC')
          .all(user.id, user.email);
        return sendJson(res, 200, { inquiries });
      }
    }

    if (pathname === '/api/inquiries' && req.method === 'POST') {
      const authUser = getAuthUser(req);
      const body = await parseBody(req);
      const { name, email, phone, service_category, budget, message } = body;
      if (!name || !email || !message) {
        return sendJson(res, 400, { error: 'Name, email, and project details are required.' });
      }
      const info = db
        .prepare(
          `INSERT INTO inquiries (user_id, name, email, phone, service_category, budget, message, status, project_progress)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'NEW', 10)`
        )
        .run(
          authUser ? authUser.id : null,
          name.trim(),
          email.trim().toLowerCase(),
          (phone || '').trim(),
          service_category || 'Data Analytics & Dashboards',
          budget || '$1,500 - $5,000',
          message.trim()
        );
      const inquiry = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(info.lastInsertRowid);
      return sendJson(res, 201, { inquiry });
    }

    if (pathname.startsWith('/api/inquiries/') && req.method === 'PUT') {
      const user = getAuthUser(req);
      if (!user || user.role !== 'ADMIN') {
        return sendJson(res, 403, { error: 'Admin access required.' });
      }
      const id = Number(pathname.split('/').pop());
      const body = await parseBody(req);
      const existing = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(id);
      if (!existing) return sendJson(res, 404, { error: 'Inquiry not found' });

      db.prepare(
        `UPDATE inquiries SET status = ?, project_progress = ?, admin_response = ? WHERE id = ?`
      ).run(
        body.status ?? existing.status,
        body.project_progress ?? existing.project_progress,
        body.admin_response ?? existing.admin_response,
        id
      );
      const updated = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(id);
      return sendJson(res, 200, { inquiry: updated });
    }

    if (pathname.startsWith('/api/inquiries/') && req.method === 'DELETE') {
      const user = getAuthUser(req);
      if (!user || user.role !== 'ADMIN') {
        return sendJson(res, 403, { error: 'Admin access required.' });
      }
      const id = Number(pathname.split('/').pop());
      db.prepare('DELETE FROM inquiries WHERE id = ?').run(id);
      return sendJson(res, 200, { deleted: true });
    }

    // --- PORTFOLIO PROJECTS ENDPOINTS ---
    if (pathname === '/api/portfolio' && req.method === 'GET') {
      const rows = db.prepare('SELECT * FROM portfolio_projects ORDER BY id ASC').all();
      const projects = rows.map((r) => ({
        ...r,
        tech_stack: (() => {
          try {
            return JSON.parse(r.tech_stack);
          } catch {
            return String(r.tech_stack).split(',').map((s) => s.trim());
          }
        })()
      }));
      return sendJson(res, 200, { projects });
    }

    if (pathname === '/api/portfolio' && req.method === 'POST') {
      const user = getAuthUser(req);
      if (!user || user.role !== 'ADMIN') {
        return sendJson(res, 403, { error: 'Admin access required.' });
      }
      const body = await parseBody(req);
      const techStack = Array.isArray(body.tech_stack)
        ? JSON.stringify(body.tech_stack)
        : JSON.stringify(
            String(body.tech_stack || 'Python, SQL')
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          );
      const info = db
        .prepare(
          `INSERT INTO portfolio_projects (title, category, organization, period, summary, impact_metrics, tech_stack, preview_image, live_url, github_url, featured)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
        )
        .run(
          body.title,
          body.category || 'Data Analytics & BI',
          body.organization || 'YOLETECH',
          body.period || '2026',
          body.summary || '',
          body.impact_metrics || '',
          techStack,
          body.preview_image || '/assets/dashboard-preview.jpg',
          body.live_url || 'https://github.com/Eniekpo',
          body.github_url || 'https://github.com/Eniekpo'
        );
      const created = db.prepare('SELECT * FROM portfolio_projects WHERE id = ?').get(info.lastInsertRowid);
      return sendJson(res, 201, { project: created });
    }

    if (pathname.startsWith('/api/portfolio/') && req.method === 'PUT') {
      const user = getAuthUser(req);
      if (!user || user.role !== 'ADMIN') {
        return sendJson(res, 403, { error: 'Admin access required.' });
      }
      const id = Number(pathname.split('/').pop());
      const existing = db.prepare('SELECT * FROM portfolio_projects WHERE id = ?').get(id);
      if (!existing) return sendJson(res, 404, { error: 'Project not found.' });
      const body = await parseBody(req);
      const techStack = body.tech_stack
        ? Array.isArray(body.tech_stack)
          ? JSON.stringify(body.tech_stack)
          : JSON.stringify(
              String(body.tech_stack)
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            )
        : existing.tech_stack;

      db.prepare(
        `UPDATE portfolio_projects
         SET title = ?, category = ?, organization = ?, period = ?, summary = ?, impact_metrics = ?, tech_stack = ?, preview_image = ?, live_url = ?, github_url = ?, featured = ?
         WHERE id = ?`
      ).run(
        body.title ?? existing.title,
        body.category ?? existing.category,
        body.organization ?? existing.organization,
        body.period ?? existing.period,
        body.summary ?? existing.summary,
        body.impact_metrics ?? existing.impact_metrics,
        techStack,
        body.preview_image ?? existing.preview_image,
        body.live_url ?? existing.live_url,
        body.github_url ?? existing.github_url,
        body.featured ?? existing.featured,
        id
      );
      const updated = db.prepare('SELECT * FROM portfolio_projects WHERE id = ?').get(id);
      return sendJson(res, 200, { project: updated });
    }

    if (pathname.startsWith('/api/portfolio/') && req.method === 'DELETE') {
      const user = getAuthUser(req);
      if (!user || user.role !== 'ADMIN') {
        return sendJson(res, 403, { error: 'Admin access required.' });
      }
      const id = Number(pathname.split('/').pop());
      db.prepare('DELETE FROM portfolio_projects WHERE id = ?').run(id);
      return sendJson(res, 200, { deleted: true });
    }

    // --- TESTIMONIALS ENDPOINTS ---
    if (pathname === '/api/testimonials' && req.method === 'GET') {
      const user = getAuthUser(req);
      const showAll = user && user.role === 'ADMIN';
      const rows = showAll
        ? db.prepare('SELECT * FROM testimonials ORDER BY id DESC').all()
        : db.prepare('SELECT * FROM testimonials WHERE approved = 1 ORDER BY id DESC').all();
      return sendJson(res, 200, { testimonials: rows });
    }

    if (pathname === '/api/testimonials' && req.method === 'POST') {
      const user = getAuthUser(req);
      const body = await parseBody(req);
      if (!body.author_name || !body.content) {
        return sendJson(res, 400, { error: 'Name and testimonial message are required.' });
      }
      const approved = user && user.role === 'ADMIN' ? 1 : 1;
      const info = db
        .prepare(
          `INSERT INTO testimonials (author_name, author_role, company, service_track, rating, content, approved)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          body.author_name.trim(),
          (body.author_role || 'Client Partner').trim(),
          (body.company || '').trim(),
          body.service_track || 'Data Analytics & BI',
          Number(body.rating) || 5,
          body.content.trim(),
          approved
        );
      const testimonial = db.prepare('SELECT * FROM testimonials WHERE id = ?').get(info.lastInsertRowid);
      return sendJson(res, 201, { testimonial });
    }

    if (pathname.startsWith('/api/testimonials/') && req.method === 'PUT') {
      const user = getAuthUser(req);
      if (!user || user.role !== 'ADMIN') {
        return sendJson(res, 403, { error: 'Admin access required.' });
      }
      const id = Number(pathname.split('/').pop());
      const existing = db.prepare('SELECT * FROM testimonials WHERE id = ?').get(id);
      if (!existing) return sendJson(res, 404, { error: 'Testimonial not found.' });
      const body = await parseBody(req);
      db.prepare(
        `UPDATE testimonials
         SET author_name = ?, author_role = ?, company = ?, service_track = ?, rating = ?, content = ?, approved = ?
         WHERE id = ?`
      ).run(
        body.author_name ?? existing.author_name,
        body.author_role ?? existing.author_role,
        body.company ?? existing.company,
        body.service_track ?? existing.service_track,
        body.rating ?? existing.rating,
        body.content ?? existing.content,
        body.approved ?? existing.approved,
        id
      );
      const updated = db.prepare('SELECT * FROM testimonials WHERE id = ?').get(id);
      return sendJson(res, 200, { testimonial: updated });
    }

    if (pathname.startsWith('/api/testimonials/') && req.method === 'DELETE') {
      const user = getAuthUser(req);
      if (!user || user.role !== 'ADMIN') {
        return sendJson(res, 403, { error: 'Admin access required.' });
      }
      const id = Number(pathname.split('/').pop());
      db.prepare('DELETE FROM testimonials WHERE id = ?').run(id);
      return sendJson(res, 200, { deleted: true });
    }

    // --- DECAP CMS / BRIDGE BLOG ENDPOINTS ---
    if (pathname === '/api/blog' && req.method === 'GET') {
      const posts = getAllBlogPosts();
      return sendJson(res, 200, { posts });
    }

    if (pathname.startsWith('/api/blog/') && req.method === 'GET') {
      const slug = path.basename(decodeURIComponent(pathname.split('/').pop()));
      const filePath = path.join(BLOG_DIR, `${slug}.md`);
      if (!fs.existsSync(filePath)) {
        return sendJson(res, 404, { error: 'Article not found.' });
      }
      return sendJson(res, 200, { post: parseMarkdownFile(filePath) });
    }

    if (pathname === '/api/blog' && req.method === 'POST') {
      const user = getAuthUser(req);
      if (!user || user.role !== 'ADMIN') {
        return sendJson(res, 403, { error: 'Admin access required to publish articles.' });
      }
      const body = await parseBody(req);
      if (!body.title || !body.body) {
        return sendJson(res, 400, { error: 'Title and Markdown body are required.' });
      }
      const slug = body.slug || body.title;
      const post = writeMarkdownFile(slug, body);
      return sendJson(res, 201, { post });
    }

    if (pathname.startsWith('/api/blog/') && req.method === 'PUT') {
      const user = getAuthUser(req);
      if (!user || user.role !== 'ADMIN') {
        return sendJson(res, 403, { error: 'Admin access required.' });
      }
      const slug = path.basename(decodeURIComponent(pathname.split('/').pop()));
      const existingPath = path.join(BLOG_DIR, `${slug}.md`);
      const existingData = fs.existsSync(existingPath) ? parseMarkdownFile(existingPath) : {};
      const body = await parseBody(req);
      const merged = {
        ...existingData,
        ...body,
        featured: body.featured !== undefined ? body.featured : existingData.featured
      };
      const post = writeMarkdownFile(slug, merged);
      return sendJson(res, 200, { post });
    }

    if (pathname.startsWith('/api/blog/') && req.method === 'DELETE') {
      const user = getAuthUser(req);
      if (!user || user.role !== 'ADMIN') {
        return sendJson(res, 403, { error: 'Admin access required.' });
      }
      const slug = path.basename(decodeURIComponent(pathname.split('/').pop()));
      const filePath = path.join(BLOG_DIR, `${slug}.md`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return sendJson(res, 200, { deleted: true });
    }

    // --- DECAP CMS LOCAL BACKEND PROXY API (/api/v1) ---
    if (pathname === '/api/v1' && req.method === 'GET') {
      return sendJson(res, 200, {
        repo: 'Eniekpo/yoletech-web',
        publish_modes: ['simple'],
        type: 'local_fs'
      });
    }

    if (pathname === '/api/v1' && req.method === 'POST') {
      const { action, params = {} } = await parseBody(req);

      const resolveSafeRepoPath = (relPath) => {
        const resolved = path.resolve(ROOT_DIR, String(relPath || '').replace(/^\/+/, ''));
        if (!resolved.startsWith(ROOT_DIR)) {
          throw new Error('Invalid repository path');
        }
        return resolved;
      };

      if (action === 'info') {
        return sendJson(res, 200, {
          repo: 'Eniekpo/yoletech-web',
          publish_modes: ['simple'],
          type: 'local_fs'
        });
      }

      if (action === 'entriesByFolder') {
        const folderPath = resolveSafeRepoPath(params.folder || 'content/blog');
        const ext = `.${params.extension || 'md'}`;
        if (!fs.existsSync(folderPath)) return sendJson(res, 200, []);
        const files = fs.readdirSync(folderPath).filter((f) => f.endsWith(ext));
        const entries = files.map((fileName) => {
          const full = path.join(folderPath, fileName);
          const stat = fs.statSync(full);
          const rel = path.relative(ROOT_DIR, full).split(path.sep).join('/');
          return {
            data: fs.readFileSync(full, 'utf8'),
            file: {
              path: rel,
              label: null,
              id: rel,
              author: 'John Oruebi Eniekpo, B.Sc.',
              updatedOn: stat.mtime.toISOString()
            }
          };
        });
        return sendJson(res, 200, entries);
      }

      if (action === 'entriesByFiles') {
        const files = Array.isArray(params.files) ? params.files : [];
        const entries = files
          .map((f) => {
            const full = resolveSafeRepoPath(f.path);
            if (!fs.existsSync(full)) return null;
            const stat = fs.statSync(full);
            return {
              data: fs.readFileSync(full, 'utf8'),
              file: {
                path: f.path,
                label: f.label || null,
                id: f.path,
                author: 'John Oruebi Eniekpo, B.Sc.',
                updatedOn: stat.mtime.toISOString()
              }
            };
          })
          .filter(Boolean);
        return sendJson(res, 200, entries);
      }

      if (action === 'getEntry') {
        const full = resolveSafeRepoPath(params.path);
        if (!fs.existsSync(full)) {
          return sendJson(res, 404, { error: 'Entry not found' });
        }
        const stat = fs.statSync(full);
        return sendJson(res, 200, {
          data: fs.readFileSync(full, 'utf8'),
          file: {
            path: params.path,
            label: null,
            id: params.path,
            author: 'John Oruebi Eniekpo, B.Sc.',
            updatedOn: stat.mtime.toISOString()
          }
        });
      }

      if (action === 'persistEntry') {
        const dataFiles = Array.isArray(params.dataFiles)
          ? params.dataFiles
          : params.entry
          ? [params.entry]
          : [];
        for (const df of dataFiles) {
          if (!df || !df.path) continue;
          const full = resolveSafeRepoPath(df.path);
          fs.mkdirSync(path.dirname(full), { recursive: true });
          fs.writeFileSync(full, df.raw || '', 'utf8');
        }
        const assets = Array.isArray(params.assets) ? params.assets : [];
        for (const asset of assets) {
          if (!asset || !asset.path || !asset.content) continue;
          const full = resolveSafeRepoPath(asset.path);
          fs.mkdirSync(path.dirname(full), { recursive: true });
          fs.writeFileSync(full, Buffer.from(asset.content, asset.encoding || 'base64'));
        }
        return sendJson(res, 200, { saved: true });
      }

      if (action === 'deleteFiles' || action === 'deleteFile') {
        const pathsToDelete = Array.isArray(params.paths)
          ? params.paths
          : params.path
          ? [params.path]
          : [];
        for (const p of pathsToDelete) {
          const full = resolveSafeRepoPath(p);
          if (fs.existsSync(full) && fs.statSync(full).isFile()) {
            fs.unlinkSync(full);
          }
        }
        return sendJson(res, 200, { deleted: true });
      }

      if (action === 'getMedia') {
        const mediaFolder = params.mediaFolder || 'public/assets/blog';
        const publicFolder = params.publicFolder || '/assets/blog';
        const fullDir = resolveSafeRepoPath(mediaFolder);
        if (!fs.existsSync(fullDir)) return sendJson(res, 200, []);
        const files = fs
          .readdirSync(fullDir)
          .filter((f) => !f.startsWith('.') && fs.statSync(path.join(fullDir, f)).isFile());
        const media = files.map((name) => {
          const full = path.join(fullDir, name);
          const stat = fs.statSync(full);
          const relPath = `${mediaFolder.replace(/\/$/, '')}/${name}`;
          return {
            id: relPath,
            name,
            size: stat.size,
            displayURL: `${publicFolder.replace(/\/$/, '')}/${name}`,
            path: relPath
          };
        });
        return sendJson(res, 200, media);
      }

      if (action === 'getMediaFile') {
        const relPath = params.path || '';
        const full = resolveSafeRepoPath(relPath);
        if (!fs.existsSync(full)) return sendJson(res, 404, { error: 'Media file not found' });
        const stat = fs.statSync(full);
        const name = path.basename(full);
        const displayURL = relPath.startsWith('public/') ? relPath.slice('public'.length) : `/${relPath}`;
        return sendJson(res, 200, {
          id: relPath,
          name,
          size: stat.size,
          displayURL,
          path: relPath
        });
      }

      if (action === 'persistMedia') {
        const asset = params.asset || {};
        if (!asset.path || !asset.content) {
          return sendJson(res, 400, { error: 'Invalid media payload' });
        }
        const full = resolveSafeRepoPath(asset.path);
        fs.mkdirSync(path.dirname(full), { recursive: true });
        const buf = Buffer.from(asset.content, asset.encoding || 'base64');
        fs.writeFileSync(full, buf);
        const name = path.basename(full);
        const displayURL = asset.path.startsWith('public/')
          ? asset.path.slice('public'.length)
          : `/assets/blog/${name}`;
        return sendJson(res, 200, {
          id: asset.path,
          name,
          size: buf.length,
          displayURL,
          path: asset.path
        });
      }

      if (action === 'unpublishedEntries') {
        return sendJson(res, 200, []);
      }

      return sendJson(res, 200, {});
    }

    // Return 404 JSON for any unknown /api/* route
    if (pathname.startsWith('/api/')) {
      return sendJson(res, 404, { error: 'API endpoint not found.' });
    }

    // Redirect /admin to /admin/ so Decap CMS resolves relative config.yml cleanly
    if (pathname === '/admin') {
      res.writeHead(302, { Location: '/admin/' });
      res.end();
      return;
    }

    // --- STATIC FILE & SPA FALLBACK SERVING ---
    let relativeTarget = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    if (pathname === '/admin/') {
      relativeTarget = path.join('admin', 'index.html');
    } else if (pathname === '/config.yml') {
      relativeTarget = path.join('admin', 'config.yml');
    }

    const filePath = path.resolve(PUBLIC_DIR, relativeTarget);
    if (!filePath.startsWith(PUBLIC_DIR)) {
      return sendJson(res, 403, { error: 'Forbidden' });
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    // SPA fallback to index.html
    const indexHtml = path.join(PUBLIC_DIR, 'index.html');
    if (fs.existsSync(indexHtml)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      fs.createReadStream(indexHtml).pipe(res);
      return;
    }

    sendJson(res, 404, { error: 'Not Found' });
  } catch (err) {
    console.error('Server error:', err);
    sendJson(res, 500, { error: err.message || 'Internal Server Error' });
  }
});

server.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`🚀 YOLETECH Full-Stack Server & SQLite DB Running on Port ${PORT}`);
  console.log(`👉 Website URL:       http://localhost:${PORT}`);
  console.log(`👉 Admin Dashboard:   http://localhost:${PORT}/admin-dashboard`);
  console.log(`👉 Decap CMS Bridge:  http://localhost:${PORT}/admin/`);
  console.log(`================================================================`);
});
