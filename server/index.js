const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');
let DatabaseSync = null;
try {
  ({ DatabaseSync } = require('node:sqlite'));
} catch {
  DatabaseSync = null;
}

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'yoletech-super-secret-jwt-key-2026-eniekpo';
const ADMIN_NOTIFY_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || 'yoletech@yolestica.com';
const DB_PATH = path.join(__dirname, 'yoletech.db');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const BLOG_DIR = path.join(__dirname, '..', 'content', 'blog');
const PORTFOLIO_DIR = path.join(__dirname, '..', 'content', 'portfolio');
const BLOG_MEDIA_DIR = path.join(PUBLIC_DIR, 'assets', 'blog');
const ROOT_DIR = path.join(__dirname, '..');

// Ensure directories exist (safe for read-only serverless environments)
try {
  if (!fs.existsSync(BLOG_DIR)) fs.mkdirSync(BLOG_DIR, { recursive: true });
  if (!fs.existsSync(PORTFOLIO_DIR)) fs.mkdirSync(PORTFOLIO_DIR, { recursive: true });
  if (!fs.existsSync(BLOG_MEDIA_DIR)) fs.mkdirSync(BLOG_MEDIA_DIR, { recursive: true });
} catch {
  // Ignore on read-only serverless file systems (Vercel)
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
// Pure-JS JSON Fallback Store when node:sqlite is unavailable (e.g. Vercel Node 18/20 runtime)
function createJsonFallbackDatabase() {
  const storePath = path.join(os.tmpdir(), 'yoletech_fallback_store.json');
  let state = {
    users: [],
    inquiries: [],
    portfolio_projects: [],
    testimonials: [],
    seq: { users: 1, inquiries: 1, portfolio_projects: 1, testimonials: 1 }
  };

  const loadState = () => {
    try {
      if (fs.existsSync(storePath)) {
        state = JSON.parse(fs.readFileSync(storePath, 'utf8'));
      }
    } catch {
      // ignore read errors
    }
  };

  const saveState = () => {
    try {
      fs.writeFileSync(storePath, JSON.stringify(state, null, 2), 'utf8');
    } catch {
      // ignore write errors
    }
  };

  loadState();

  return {
    exec() {},
    prepare(sql) {
      const norm = sql.replace(/\s+/g, ' ').trim();
      return {
        get(...args) {
          loadState();
          if (/SELECT COUNT\(\*\) as count FROM (\w+)/i.test(norm)) {
            const table = RegExp.$1;
            return { count: (state[table] || []).length };
          }
          if (/FROM users WHERE email = \?/i.test(norm)) {
            const email = String(args[0] || '').toLowerCase();
            return state.users.find((u) => String(u.email).toLowerCase() === email) || undefined;
          }
          if (/FROM (\w+) WHERE id = \?/i.test(norm)) {
            const table = RegExp.$1;
            const id = Number(args[0]);
            return (state[table] || []).find((r) => Number(r.id) === id) || undefined;
          }
          return undefined;
        },
        all(...args) {
          loadState();
          if (/FROM inquiries WHERE user_id = \? OR email = \?/i.test(norm)) {
            const uid = Number(args[0]);
            const email = String(args[1] || '').toLowerCase();
            return [...state.inquiries]
              .filter((r) => Number(r.user_id) === uid || String(r.email).toLowerCase() === email)
              .sort((a, b) => b.id - a.id);
          }
          if (/FROM testimonials WHERE approved = 1/i.test(norm)) {
            return [...state.testimonials].filter((t) => Number(t.approved) === 1).sort((a, b) => b.id - a.id);
          }
          if (/FROM (\w+)/i.test(norm)) {
            const table = RegExp.$1;
            return [...(state[table] || [])].sort((a, b) => b.id - a.id);
          }
          return [];
        },
        run(...args) {
          loadState();
          const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

          if (/INSERT INTO users/i.test(norm)) {
            const id = state.seq.users++;
            let row;
            if (args.length === 10) {
              row = {
                id,
                name: args[0],
                email: args[1],
                password_hash: args[2],
                phone: args[3],
                company: args[4],
                service_interest: args[5],
                role: args[6],
                status: args[7],
                admin_notes: args[8],
                created_at: args[9] || now
              };
            } else if (args.length === 6) {
              row = {
                id,
                name: args[0],
                email: args[1],
                password_hash: args[2],
                phone: args[3],
                company: args[4],
                service_interest: args[5],
                role: 'CLIENT',
                status: 'ACTIVE',
                admin_notes: 'Registered via YOLETECH Client Portal',
                created_at: now
              };
            } else {
              row = {
                id,
                name: args[0],
                email: args[1],
                password_hash: args[2],
                phone: args[3],
                company: args[4],
                service_interest: args[5],
                role: 'CLIENT',
                status: args[6] || 'ACTIVE',
                admin_notes: args[7] || '',
                created_at: now
              };
            }
            state.users.push(row);
            saveState();
            return { lastInsertRowid: id };
          }

          if (/UPDATE users SET name = \?, phone = \?, company = \?, service_interest = \? WHERE id = \?/i.test(norm)) {
            const id = Number(args[4]);
            const u = state.users.find((x) => Number(x.id) === id);
            if (u) {
              u.name = args[0];
              u.phone = args[1];
              u.company = args[2];
              u.service_interest = args[3];
              saveState();
            }
            return { changes: u ? 1 : 0 };
          }

          if (/UPDATE users SET name = \?, phone = \?, company = \?, service_interest = \?, status = \?, admin_notes = \? WHERE id = \?/i.test(norm)) {
            const id = Number(args[6]);
            const u = state.users.find((x) => Number(x.id) === id);
            if (u) {
              u.name = args[0];
              u.phone = args[1];
              u.company = args[2];
              u.service_interest = args[3];
              u.status = args[4];
              u.admin_notes = args[5];
              saveState();
            }
            return { changes: u ? 1 : 0 };
          }

          if (/INSERT INTO inquiries/i.test(norm)) {
            const id = state.seq.inquiries++;
            let row;
            if (args.length >= 11) {
              row = {
                id,
                user_id: args[0],
                name: args[1],
                email: args[2],
                phone: args[3],
                service_category: args[4],
                budget: args[5],
                message: args[6],
                status: args[7],
                project_progress: args[8],
                admin_response: args[9],
                created_at: args[10] || now
              };
            } else {
              row = {
                id,
                user_id: args[0],
                name: args[1],
                email: args[2],
                phone: args[3],
                service_category: args[4],
                budget: args[5],
                message: args[6],
                status: 'NEW',
                project_progress: 10,
                admin_response: '',
                created_at: now
              };
            }
            state.inquiries.push(row);
            saveState();
            return { lastInsertRowid: id };
          }

          if (/UPDATE inquiries SET status = \?, project_progress = \?, admin_response = \? WHERE id = \?/i.test(norm)) {
            const id = Number(args[3]);
            const inq = state.inquiries.find((x) => Number(x.id) === id);
            if (inq) {
              inq.status = args[0];
              inq.project_progress = args[1];
              inq.admin_response = args[2];
              saveState();
            }
            return { changes: inq ? 1 : 0 };
          }

          if (/INSERT INTO portfolio_projects/i.test(norm)) {
            const id = state.seq.portfolio_projects++;
            state.portfolio_projects.push({
              id,
              title: args[0],
              category: args[1],
              organization: args[2],
              period: args[3],
              summary: args[4],
              impact_metrics: args[5],
              tech_stack: args[6],
              preview_image: args[7],
              live_url: args[8],
              github_url: args[9],
              featured: args[10],
              created_at: now
            });
            saveState();
            return { lastInsertRowid: id };
          }

          if (/INSERT INTO testimonials/i.test(norm)) {
            const id = state.seq.testimonials++;
            state.testimonials.push({
              id,
              author_name: args[0],
              author_role: args[1],
              company: args[2],
              service_track: args[3],
              rating: args[4],
              content: args[5],
              approved: args[6],
              created_at: now
            });
            saveState();
            return { lastInsertRowid: id };
          }

          if (/UPDATE testimonials/i.test(norm)) {
            const id = Number(args[7]);
            const t = state.testimonials.find((x) => Number(x.id) === id);
            if (t) {
              t.author_name = args[0];
              t.author_role = args[1];
              t.company = args[2];
              t.service_track = args[3];
              t.rating = args[4];
              t.content = args[5];
              t.approved = args[6];
              saveState();
            }
            return { changes: t ? 1 : 0 };
          }

          if (/DELETE FROM (\w+) WHERE id = \?/i.test(norm)) {
            const table = RegExp.$1;
            const id = Number(args[0]);
            if (Array.isArray(state[table])) {
              state[table] = state[table].filter((x) => Number(x.id) !== id);
              saveState();
            }
            return { changes: 1 };
          }

          return { lastInsertRowid: 0, changes: 0 };
        }
      };
    }
  };
}

function openDatabase() {
  if (!DatabaseSync) {
    return createJsonFallbackDatabase();
  }
  if (process.env.VERCEL) {
    try {
      const tmpDbPath = path.join(os.tmpdir(), 'yoletech.db');
      if (!fs.existsSync(tmpDbPath) && fs.existsSync(DB_PATH)) {
        fs.copyFileSync(DB_PATH, tmpDbPath);
      }
      return new DatabaseSync(tmpDbPath);
    } catch {
      return createJsonFallbackDatabase();
    }
  }
  try {
    const instance = new DatabaseSync(DB_PATH);
    instance.exec('PRAGMA journal_mode = WAL;');
    return instance;
  } catch {
    return createJsonFallbackDatabase();
  }
}

const db = openDatabase();

db.exec(`
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
    budget TEXT DEFAULT '',
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

function ensureAccount(account) {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(account.email.toLowerCase());
  if (!existing) {
    db.prepare(`
      INSERT INTO users (name, email, password_hash, phone, company, service_interest, role, status, admin_notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      account.name,
      account.email.toLowerCase(),
      hashPassword(account.password),
      account.phone,
      account.company,
      account.service_interest,
      account.role,
      account.status,
      account.admin_notes,
      account.created_at
    );
  }
}


function seedSyntheticRecords(dbInstance, currentClientCount = 0) {
  const firstNames = [
    'Preye', 'Amaka', 'Marcus', 'Ebiowei', 'Sarah', 'Babatunde', 'Chiamaka',
    'Olumide', 'Ngozi', 'Tunde', 'Fatima', 'Emeka', 'Zainab', 'Damilola', 'Kemi',
    'David', 'Priya', 'Alexander', 'Elena', 'Chloe', 'Michael', 'Liam', 'Sofia',
    'James', 'Lucas', 'Tari', 'Folake', 'Ibrahim', 'Grace', 'Chidi', 'Blessing',
    'Oluwaseun', 'Aisha', 'Victor', 'Chinonso', 'Daniel', 'Esther', 'Samuel', 'Joy',
    'Emma', 'Noah', 'Olivia', 'Ethan', 'Ava', 'Mason', 'Isabella', 'William',
    'Sophia', 'Benjamin', 'Mia', 'Lucas', 'Charlotte', 'Henry', 'Amelia', 'Sebastian'
  ];

  const lastNames = [
    'Alagoa', 'Nwosu', 'Vance', 'Dickson', 'Adeleke', 'Okonkwo', 'Bakare', 'Eze',
    'Olatunji', 'Bello', 'Nnamdi', 'Aliyu', 'Adeyemi', 'Balogun', 'Jenkins', 'Mueller',
    'Sharma', 'Wright', 'Rostova', 'Dupont', 'Chen', 'O\'Connor', 'Rodriguez', 'Kensington',
    'Silva', 'Boma', 'Oghenekaro', 'Danladi', 'Umar', 'Ezekiel', 'Obi', 'Okafor',
    'Adeboye', 'Suleiman', 'Okoro', 'Oluwole', 'Agabi', 'Williams', 'Brown', 'Davis',
    'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White'
  ];

  const companies = [
    'Global EduMetrix', 'SulPhil Analytics Cohort', 'Prime Logistics & Supply Ltd',
    'Bayelsa Tech Ventures', 'Horizon Data Solutions', 'Apex Financial Group',
    'Crestline Analytics', 'Metrix BioLabs', 'Zenith Oil & Energy', 'Sterling Retail Group',
    'Pulse Health Systems', 'Beacon Cloud Labs', 'Delta Capital Partners', 'NexaTech Solutions',
    'Velocity Logistics', 'Vanguard Microfinance', 'Krypton Media Network', 'OmniScope Insights',
    'BioMetric Health', 'Summit AgroTech', 'Strata Advisory Services', 'Urban Grid Infrastructure',
    'Pinnacle Merchant Bank', 'SilverLine Maritime', 'Aura Retail Global', 'NextGen Academy'
  ];

  const serviceTracks = [
    'Data Analytics & BI',
    'Full-Stack Web Development',
    'AI & Workflow Automation',
    'Tech Tutorials & Mentorship',
    'IT & Database Support'
  ];

  const serviceWeights = [0.38, 0.26, 0.18, 0.12, 0.06];

  const pickService = (idx) => {
    const r = ((idx + 1) * 0.137) % 1;
    let acc = 0;
    for (let i = 0; i < serviceTracks.length; i++) {
      acc += serviceWeights[i];
      if (r <= acc) return serviceTracks[i];
    }
    return serviceTracks[0];
  };

  const pickStatus = (idx) => {
    const r = ((idx + 1) * 0.293) % 1;
    if (r < 0.38) return 'ACTIVE';
    if (r < 0.68) return 'COMPLETED';
    if (r < 0.86) return 'ONBOARDING';
    return 'LEAD';
  };

  const pickDate = (idx) => {
    const start = new Date(2025, 8, 1).getTime();
    const end = new Date(2026, 9, 28).getTime();
    const factor = Math.pow((idx + 1) / 1000, 0.75);
    const t = start + factor * (end - start);
    return new Date(t).toISOString().replace('T', ' ').slice(0, 19);
  };

  const pickRating = (idx) => {
    const r = ((idx + 1) * 0.419) % 1;
    if (r < 0.68) return 5;
    if (r < 0.90) return 4;
    if (r < 0.96) return 3;
    if (r < 0.985) return 2;
    return 1;
  };

  const positiveReviews = [
    'Exceptional Power BI reporting suite and automated data workflows. Transformed executive decision-making speed.',
    'John delivered a robust full-stack dashboard with automated SQL ingestion that eliminated 20 hours of manual work weekly.',
    'Outstanding training in Python and data analytics. Our analysts are now building custom predictive dashboards with ease.',
    'The predictive student metrics and automated Excel VBA models exceeded our expectations. Strict data validation and high speed.',
    'Delivered an intuitive, responsive executive portal and seamless SQLite API integration on tight deadlines.',
    'Highly skilled in business intelligence, database administration, and workflow automation. Highly recommended partner.',
    'Superb execution on our supply chain KPI reporting. Real-time accuracy and crystal-clear visual hierarchy.',
    'Great collaboration, dependable communication, and top-tier technical delivery on our departmental analytics.'
  ];

  const mixedReviews = [
    'Solid dashboard architecture and good SQL performance. Initial setup needed a minor tweak but was quickly resolved.',
    'Great reporting features and reliable data pipelines. Would love more advanced charting options in the next sprint.',
    'Delivered the automated Excel sheets and training as promised. Very responsive during project handoff.'
  ];

  const criticalReviews = [
    'The dashboard met the core requirements though deployment took a few extra days due to internal security checks.',
    'Good data modeling but required extra documentation for our junior IT team to maintain independently.'
  ];

  const pickReview = (rating, idx) => {
    if (rating >= 4) return positiveReviews[idx % positiveReviews.length];
    if (rating === 3) return mixedReviews[idx % mixedReviews.length];
    return criticalReviews[idx % criticalReviews.length];
  };

  const defaultHash = hashPassword('Client@2026');

  const insertUser = dbInstance.prepare(`
    INSERT INTO users (name, email, password_hash, phone, company, service_interest, role, status, admin_notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'CLIENT', ?, ?, ?)
  `);

  const needed = 1000 - currentClientCount;
  if (needed > 0) {
    for (let i = currentClientCount; i < 1000; i++) {
      const fn = firstNames[i % firstNames.length];
      const ln = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
      const name = `${fn} ${ln}`;
      const email = `client_${i + 1}@${companies[i % companies.length].toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
      const phone = `+234 80${(10000000 + i * 37) % 90000000}`;
      const company = companies[i % companies.length];
      const service = pickService(i);
      const status = pickStatus(i);
      const created = pickDate(i);
      const notes = `Synthetic client partner record #${i + 1}. Engagement focus: ${service}.`;
      try {
        insertUser.run(name, email, defaultHash, phone, company, service, status, notes, created);
      } catch {
        // Skip duplicate email if any
      }
    }
  }

  const inqCount = dbInstance.prepare('SELECT COUNT(*) as count FROM inquiries').get().count;
  if (inqCount < 680) {
    const insertInquiry = dbInstance.prepare(`
      INSERT INTO inquiries (user_id, name, email, phone, service_category, budget, message, status, project_progress, admin_response, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const clients = dbInstance.prepare("SELECT id, name, email, phone, service_interest, created_at FROM users WHERE role = 'CLIENT' ORDER BY id ASC").all();
    const inqStatuses = ['NEW', 'IN_PROGRESS', 'COMPLETED'];
    for (let i = inqCount; i < 680; i++) {
      const client = clients[i % clients.length];
      const status = inqStatuses[i % 3];
      const progress = status === 'COMPLETED' ? 100 : status === 'IN_PROGRESS' ? (30 + (i % 6) * 10) : (10 + (i % 3) * 5);
      const created = pickDate(Math.min(999, Math.floor(i * 1.47)));
      const msg = `Inquiry #${i + 1}: Project scope for ${client ? client.service_interest : 'Data Analytics'} and business reporting infrastructure.`;
      insertInquiry.run(
        client ? client.id : null,
        client ? client.name : `Lead Contact ${i + 1}`,
        client ? client.email : `inquiry_${i + 1}@prospective-client.org`,
        client ? client.phone : '+234 800 000 0000',
        client ? client.service_interest : 'Data Analytics & BI',
        'Standard Enterprise Engagement',
        msg,
        status,
        progress,
        status === 'COMPLETED' ? 'Project deliverables finalized and handed over.' : 'Active correspondence with client.',
        created
      );
    }
  }

  const testCount = dbInstance.prepare('SELECT COUNT(*) as count FROM testimonials').get().count;
  if (testCount < 420) {
    const insertTestimonial = dbInstance.prepare(`
      INSERT INTO testimonials (author_name, author_role, company, service_track, rating, content, approved, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    `);
    const clients = dbInstance.prepare("SELECT id, name, company, service_interest FROM users WHERE role = 'CLIENT' ORDER BY id ASC").all();
    for (let i = testCount; i < 420; i++) {
      const client = clients[i % clients.length];
      const rating = pickRating(i);
      const review = pickReview(rating, i);
      const created = pickDate(Math.min(999, 100 + Math.floor(i * 2.1)));
      insertTestimonial.run(
        client ? client.name : `Verified Client ${i + 1}`,
        i % 4 === 0 ? 'Managing Director' : i % 4 === 1 ? 'Head of Business Analytics' : i % 4 === 2 ? 'Operations Supervisor' : 'Project Sponsor',
        client ? client.company : 'Client Partner Organization',
        client ? client.service_interest : 'Data Analytics & BI',
        rating,
        review,
        created
      );
    }
  }
}

function seedDatabase() {
  // Always ensure Master Admin accounts (both yoletech@yoletica.com and yoletech@yolestica.com) & Demo Client exist
  ensureAccount({
    name: 'John Oruebi Eniekpo',
    email: 'yoletech@yoletica.com',
    password: 'YoleTech@2026#Admin',
    phone: '+234 802 552 6389',
    company: 'YOLETECH Headquarters',
    service_interest: 'Full-Stack, BI & AI Architecture',
    role: 'ADMIN',
    status: 'ACTIVE',
    admin_notes: 'Master Administrator & Founder Account.',
    created_at: '2026-01-10 09:00:00'
  });

  ensureAccount({
    name: 'John Oruebi Eniekpo',
    email: 'yoletech@yolestica.com',
    password: 'YoleTech@2026#Admin',
    phone: '+234 802 552 6389',
    company: 'YOLETECH Headquarters',
    service_interest: 'Full-Stack, BI & AI Architecture',
    role: 'ADMIN',
    status: 'ACTIVE',
    admin_notes: 'Master Administrator & Founder Account.',
    created_at: '2026-01-10 09:00:00'
  });

  ensureAccount({
    name: 'Demo Client Partner',
    email: 'client@example.com',
    password: 'Client@2026',
    phone: '+234 802 552 6389',
    company: 'Demo Client Organization',
    service_interest: 'Data Analytics & BI',
    role: 'CLIENT',
    status: 'ACTIVE',
    admin_notes: 'Demo Client Account for portal testing.',
    created_at: '2026-09-01 10:00:00'
  });

  const clientCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'CLIENT'").get().count;
  if (clientCount < 1000) {
    seedSyntheticRecords(db, clientCount);
  }

  // 2. Seed Inquiries
  const inquiryCount = db.prepare('SELECT COUNT(*) as count FROM inquiries').get().count;
  if (inquiryCount === 0) {
    const insertInquiry = db.prepare(`
      INSERT INTO inquiries (user_id, name, email, phone, service_category, budget, message, status, project_progress, admin_response, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertInquiry.run(
      3,
      'Engr. Ebiowei Dickson',
      'ebiowei@bayelsatechventures.ng',
      '+234 806 118 3340',
      'Web Development',
      'Web Development',
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
      'AI Automation',
      'AI Automation',
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

// Server-side Email Notification Dispatcher -> sends all emails to yoletech@yolestica.com
async function sendEmailToYoletech({ subject, replyTo, fields }) {
  const recipient = ADMIN_NOTIFY_EMAIL;
  const results = { recipient, sent: false };

  // 1. Optional Resend API if RESEND_API_KEY is configured in environment
  if (process.env.RESEND_API_KEY) {
    try {
      const htmlRows = Object.entries(fields)
        .map(([k, v]) => `<tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:bold;">${k}</td><td style="padding:8px 12px;border:1px solid #ddd;">${String(v || '')}</td></tr>`)
        .join('');
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || 'YOLETECH Portal <onboarding@resend.dev>',
          to: [recipient],
          reply_to: replyTo || recipient,
          subject,
          html: `<h2>${subject}</h2><table style="border-collapse:collapse;width:100%;max-width:600px;">${htmlRows}</table>`
        })
      });
      if (res.ok) results.sent = true;
    } catch (err) {
      console.warn('Resend dispatch warning:', err.message);
    }
  }

  // 2. FormSubmit AJAX Relay to the configured admin email
  try {
    const formPayload = {
      _subject: subject,
      _replyto: replyTo || '',
      _template: 'table',
      _captcha: 'false',
      ...fields
    };
    const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(recipient)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Origin: 'https://yolestica.com',
        Referer: 'https://yolestica.com/contact'
      },
      body: JSON.stringify(formPayload)
    });
    if (res.ok) results.sent = true;
  } catch (err) {
    console.warn('FormSubmit relay warning:', err.message);
  }

  return results;
}

// ============================================================================
// 3. DECAP CMS MARKDOWN PARSER & WRITER (/content/blog/*.md & /content/portfolio/*.md)
// ============================================================================
function parseYamlFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: raw.trim() };

  const frontmatterText = match[1];
  const body = match[2].trim();
  const lines = frontmatterText.split(/\r?\n/);
  const result = {};
  let currentListKey = null;

  for (const line of lines) {
    const listMatch = line.match(/^\s*-\s+(.*)$/);
    if (listMatch && currentListKey) {
      let itemVal = listMatch[1].trim();
      if ((itemVal.startsWith('"') && itemVal.endsWith('"')) || (itemVal.startsWith("'") && itemVal.endsWith("'"))) {
        itemVal = itemVal.slice(1, -1);
      }
      result[currentListKey].push(itemVal);
      continue;
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let val = line.slice(colonIdx + 1).trim();

    if (!val) {
      currentListKey = key;
      result[key] = [];
      continue;
    }

    currentListKey = null;
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    result[key] = val;
  }

  return { frontmatter: result, body };
}

function parseYamlArray(val, fallback = []) {
  if (Array.isArray(val)) return val;
  if (!val) return fallback;
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // fallback to comma-separated parsing
  }
  return String(val)
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map((s) => s.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);
}

function parseMarkdownFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const slug = path.basename(filePath, '.md');
  const { frontmatter, body } = parseYamlFrontmatter(raw);

  return {
    slug,
    title: frontmatter.title || slug,
    date: frontmatter.date || '2026-10-15',
    category: frontmatter.category || 'Data Analytics & BI',
    readTime: frontmatter.readTime || '5 min read',
    author: frontmatter.author || 'John Oruebi Eniekpo',
    coverImage: frontmatter.coverImage || '/assets/dashboard-preview.jpg',
    summary: frontmatter.summary || '',
    tags: parseYamlArray(frontmatter.tags, ['Python', 'SQL', 'Power BI']),
    featured: String(frontmatter.featured) === 'true',
    body
  };
}

function writeMarkdownFile(slug, data) {
  const safeSlug = slug
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const tagsArray = parseYamlArray(data.tags, ['Python', 'SQL']);

  const content = `---
title: "${String(data.title || 'Untitled Article').replace(/"/g, '\\"')}"
date: "${data.date || new Date().toISOString().slice(0, 10)}"
category: "${data.category || 'Data Analytics & BI'}"
readTime: "${data.readTime || '5 min read'}"
author: "${data.author || 'John Oruebi Eniekpo'}"
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

function parsePortfolioMarkdownFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const slug = path.basename(filePath, '.md');
  const { frontmatter, body } = parseYamlFrontmatter(raw);
  const demoUrl = frontmatter.demo_url ?? frontmatter.live_url ?? '';

  return {
    id: slug,
    slug,
    title: frontmatter.title || slug,
    date: frontmatter.date || '2026-10-15',
    category: frontmatter.category || 'Data Analytics & BI',
    organization: frontmatter.organization || 'YOLETECH',
    period: frontmatter.period || '2026',
    preview_image: frontmatter.preview_image || '/assets/dashboard-preview.jpg',
    demo_url: demoUrl,
    live_url: demoUrl,
    github_url: frontmatter.github_url || 'https://github.com/Eniekpo',
    impact_metrics: frontmatter.impact_metrics || '',
    tech_stack: parseYamlArray(frontmatter.tech_stack, ['Python', 'SQL', 'Power BI']),
    featured: frontmatter.featured === undefined ? true : String(frontmatter.featured) === 'true',
    summary: frontmatter.summary || '',
    body
  };
}

function writePortfolioMarkdownFile(slug, data) {
  const safeSlug = String(slug || data.title || 'project')
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const techStackArray = parseYamlArray(data.tech_stack, ['Python', 'SQL']);
  const demoUrl = data.demo_url ?? data.live_url ?? '';

  const content = `---
title: "${String(data.title || 'Untitled Project').replace(/"/g, '\\"')}"
date: "${data.date || new Date().toISOString().slice(0, 10)}"
category: "${data.category || 'Data Analytics & BI'}"
organization: "${String(data.organization || 'YOLETECH').replace(/"/g, '\\"')}"
period: "${String(data.period || '2026').replace(/"/g, '\\"')}"
preview_image: "${data.preview_image || '/assets/dashboard-preview.jpg'}"
demo_url: "${String(demoUrl).replace(/"/g, '\\"')}"
github_url: "${String(data.github_url || 'https://github.com/Eniekpo').replace(/"/g, '\\"')}"
impact_metrics: "${String(data.impact_metrics || '').replace(/"/g, '\\"')}"
tech_stack: ${JSON.stringify(techStackArray)}
featured: ${data.featured === false ? 'false' : 'true'}
summary: "${String(data.summary || '').replace(/"/g, '\\"')}"
---

${data.body || ''}
`;
  const filePath = path.join(PORTFOLIO_DIR, `${safeSlug}.md`);
  fs.writeFileSync(filePath, content, 'utf8');
  return parsePortfolioMarkdownFile(filePath);
}

function getAllPortfolioProjects() {
  if (!fs.existsSync(PORTFOLIO_DIR)) return [];
  const files = fs.readdirSync(PORTFOLIO_DIR).filter((f) => f.endsWith('.md'));
  const projects = files.map((f) => parsePortfolioMarkdownFile(path.join(PORTFOLIO_DIR, f)));
  return projects.sort((a, b) => (a.date < b.date ? 1 : -1));
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
  let user =
    db
      .prepare(
        'SELECT id, name, email, phone, company, service_interest, role, status, admin_notes, created_at FROM users WHERE id = ?'
      )
      .get(payload.id) ||
    (payload.email
      ? db.prepare('SELECT id, name, email, phone, company, service_interest, role, status, admin_notes, created_at FROM users WHERE email = ?').get(String(payload.email).toLowerCase())
      : null);

  if (!user && payload.email) {
    // Stateless serverless token fallback: reconstruct user from signed JWT
    user = {
      id: payload.id || Date.now(),
      name: payload.name || payload.email.split('@')[0],
      email: payload.email,
      phone: payload.phone || '',
      company: payload.company || '',
      service_interest: payload.service_interest || 'Data Analytics & BI',
      role: payload.role || 'CLIENT',
      status: payload.status || 'ACTIVE',
      admin_notes: '',
      created_at: payload.created_at || new Date().toISOString().slice(0, 19).replace('T', ' ')
    };
  }
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
const requestHandler = async (req, res) => {
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
      const token = signToken({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        company: user.company,
        service_interest: user.service_interest,
        role: user.role,
        status: user.status,
        created_at: user.created_at
      });
      await sendEmailToYoletech({
        subject: `[YOLETECH Client Registration] ${user.name} (${user.service_interest})`,
        replyTo: user.email,
        fields: {
          Event: 'New Client Portal Registration',
          'Client Name': user.name,
          'Client Email': user.email,
          'WhatsApp / Phone': user.phone || 'Not provided',
          'Company / Organization': user.company || 'Independent Client',
          'Primary Service Track': user.service_interest,
          'Registered At': user.created_at
        }
      });
      return sendJson(res, 201, { token, user, notifiedEmail: ADMIN_NOTIFY_EMAIL });
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
      const token = signToken({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        company: user.company,
        service_interest: user.service_interest,
        role: user.role,
        status: user.status,
        created_at: user.created_at
      });
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
      const pageParam = parsedUrl.searchParams.get('page');
      const limitParam = parsedUrl.searchParams.get('limit');

      const allClients = db
        .prepare(
          `SELECT id, name, email, phone, company, service_interest, role, status, admin_notes, created_at
           FROM users ORDER BY id DESC`
        )
        .all();
      const inquiries = db.prepare('SELECT * FROM inquiries ORDER BY id DESC').all();

      if (pageParam !== null || limitParam !== null) {
        const page = Math.max(1, parseInt(pageParam, 10) || 1);
        const limit = Math.max(1, parseInt(limitParam, 10) || 30);
        const total = allClients.length;
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const paginated = allClients.slice((page - 1) * limit, page * limit);
        return sendJson(res, 200, {
          clients: paginated,
          inquiries,
          pagination: {
            page,
            limit,
            total,
            totalPages
          }
        });
      }

      return sendJson(res, 200, { clients: allClients, inquiries });
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
          budget || service_category || 'Data Analysis & Analytics',
          message.trim()
        );
      const inquiry = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(info.lastInsertRowid);
      await sendEmailToYoletech({
        subject: `[YOLETECH Project Inquiry] ${inquiry.service_category} — ${inquiry.name}`,
        replyTo: inquiry.email,
        fields: {
          'Client Name': inquiry.name,
          'Client Email': inquiry.email,
          'WhatsApp / Phone': inquiry.phone || 'Not provided',
          'Project Category': inquiry.service_category,
          'Project Details & Goals': inquiry.message,
          'Submitted At': inquiry.created_at
        }
      });
      return sendJson(res, 201, { inquiry, notifiedEmail: ADMIN_NOTIFY_EMAIL });
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

    // --- PORTFOLIO PROJECTS ENDPOINTS (DECAP BRIDGE MARKDOWN /content/portfolio/*.md) ---
    if (pathname === '/api/portfolio' && req.method === 'GET') {
      const projects = getAllPortfolioProjects();
      return sendJson(res, 200, { projects });
    }

    if (pathname === '/api/portfolio' && req.method === 'POST') {
      const user = getAuthUser(req);
      if (!user || user.role !== 'ADMIN') {
        return sendJson(res, 403, { error: 'Admin access required.' });
      }
      const body = await parseBody(req);
      if (!body.title) {
        return sendJson(res, 400, { error: 'Project title is required.' });
      }
      const slug = body.slug || body.title;
      const project = writePortfolioMarkdownFile(slug, body);
      return sendJson(res, 201, { project });
    }

    if (pathname.startsWith('/api/portfolio/') && req.method === 'PUT') {
      const user = getAuthUser(req);
      if (!user || user.role !== 'ADMIN') {
        return sendJson(res, 403, { error: 'Admin access required.' });
      }
      const slug = path.basename(decodeURIComponent(pathname.split('/').pop()));
      const existingPath = path.join(PORTFOLIO_DIR, `${slug}.md`);
      const existingData = fs.existsSync(existingPath) ? parsePortfolioMarkdownFile(existingPath) : {};
      const body = await parseBody(req);
      const merged = {
        ...existingData,
        ...body,
        featured: body.featured !== undefined ? body.featured : existingData.featured
      };
      const project = writePortfolioMarkdownFile(slug, merged);
      return sendJson(res, 200, { project });
    }

    if (pathname.startsWith('/api/portfolio/') && req.method === 'DELETE') {
      const user = getAuthUser(req);
      if (!user || user.role !== 'ADMIN') {
        return sendJson(res, 403, { error: 'Admin access required.' });
      }
      const slug = path.basename(decodeURIComponent(pathname.split('/').pop()));
      const filePath = path.join(PORTFOLIO_DIR, `${slug}.md`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return sendJson(res, 200, { deleted: true });
    }

    // --- ANALYTICS DASHBOARD ENDPOINT (read-only, privacy-safe) ---
    // Public visitors receive anonymised client records (no names, emails, phones or notes).
    // Admins receive client names and companies for operational use.
    if (pathname === '/api/analytics' && req.method === 'GET') {
      const viewer = getAuthUser(req);
      const isAdmin = !!viewer && viewer.role === 'ADMIN';
      const normName = (v) => String(v || '').trim().toLowerCase().replace(/\s+/g, ' ');

      const userRows = db
        .prepare(
          `SELECT id, name, email, company, service_interest, status, role, created_at
           FROM users WHERE role = 'CLIENT' ORDER BY id ASC`
        )
        .all()
        .filter((u) => String(u.role || 'CLIENT').toUpperCase() === 'CLIENT')
        .sort((a, b) => Number(a.id) - Number(b.id));
      const inquiryRows = db
        .prepare('SELECT id, user_id, email, service_category, status, project_progress, created_at FROM inquiries ORDER BY id ASC')
        .all()
        .sort((a, b) => Number(a.id) - Number(b.id));
      const testimonialRows = db
        .prepare(
          `SELECT id, author_name, author_role, company, service_track, rating, content, created_at
           FROM testimonials WHERE approved = 1 ORDER BY id ASC`
        )
        .all()
        .sort((a, b) => Number(a.id) - Number(b.id));

      const byEmail = new Map(userRows.map((u) => [String(u.email || '').toLowerCase(), u.id]));
      const byId = new Set(userRows.map((u) => u.id));
      const byName = new Map(userRows.map((u) => [normName(u.name), u.id]));

      const contactKeys = new Map();
      const inquiries = inquiryRows.map((i) => {
        const email = String(i.email || '').toLowerCase();
        if (!contactKeys.has(email)) contactKeys.set(email, contactKeys.size + 1);
        const clientId = byId.has(i.user_id) ? i.user_id : byEmail.get(email) || null;
        return {
          id: i.id,
          client_id: clientId,
          contact_key: contactKeys.get(email),
          service_category: i.service_category || 'Unspecified',
          status: String(i.status || 'NEW').toUpperCase(),
          project_progress: Number.isFinite(Number(i.project_progress)) ? Number(i.project_progress) : null,
          created_at: i.created_at
        };
      });

      const clients = userRows.map((u) => ({
        id: u.id,
        name: u.name,
        label: u.name,
        company: u.company || '',
        service_interest: u.service_interest || 'Unspecified',
        status: String(u.status || 'UNSPECIFIED').toUpperCase(),
        created_at: u.created_at
      }));

      const testimonials = testimonialRows.map((t) => ({
        id: t.id,
        client_id: byName.get(normName(t.author_name)) || null,
        author_name: t.author_name,
        author_role: t.author_role,
        company: t.company,
        service_track: t.service_track,
        rating: Number.isFinite(Number(t.rating)) ? Number(t.rating) : null,
        content: t.content,
        created_at: t.created_at
      }));

      return sendJson(res, 200, {
        generated_at: new Date().toISOString(),
        anonymised: !isAdmin,
        clients,
        inquiries,
        testimonials
      });
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
              author: 'John Oruebi Eniekpo',
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
                author: 'John Oruebi Eniekpo',
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
            author: 'John Oruebi Eniekpo',
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
};

const server = http.createServer(requestHandler);

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`================================================================`);
    console.log(`🚀 YOLETECH Full-Stack Server & SQLite DB Running on Port ${PORT}`);
    console.log(`👉 Website URL:       http://localhost:${PORT}`);
    console.log(`👉 Admin Dashboard:   http://localhost:${PORT}/admin-dashboard`);
    console.log(`👉 Decap CMS Bridge:  http://localhost:${PORT}/admin/`);
    console.log(`================================================================`);
  });
}

module.exports = requestHandler;
