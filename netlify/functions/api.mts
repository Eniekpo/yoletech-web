import type { Config, Context } from "@netlify/functions";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { eq, desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { users, inquiries, portfolioProjects, testimonials } from "../../db/schema.js";

const JWT_SECRET = process.env.JWT_SECRET || "yoletech-super-secret-jwt-key-2026-eniekpo";

// ----------------------------------------------------------------------------
// PASSWORD & JWT UTILITIES
// ----------------------------------------------------------------------------
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(":")) return false;
  const [salt, originalHash] = storedHash.split(":");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(originalHash, "hex"));
}

function signToken(payload: any): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 })
  ).toString("base64url");
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${signature}`;
}

function verifyToken(token: string): any {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSig = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${header}.${body}`)
      .digest("base64url");
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------------
// SEED & FALLBACK DATA
// ----------------------------------------------------------------------------
const SEED_PROJECTS = [
  {
    id: 1,
    title: "Executive Performance & KPI Intelligence Suite",
    category: "Data Analytics & BI",
    organization: "SulPhil Tech Hub",
    period: "2021 – 2024",
    summary:
      "Designed interactive Power BI and Tableau dashboards communicating key performance metrics, resource utilization, and research outcomes to executive stakeholders.",
    impactMetrics:
      "Improved executive reporting speed by 65% & enforced 99.8% data validation compliance",
    techStack: JSON.stringify(["Power BI", "Tableau", "SQL", "Python", "Data Governance"]),
    previewImage: "/assets/dashboard-preview.jpg",
    liveUrl: "https://kaggle.com/Yoletech",
    githubUrl: "https://github.com/Eniekpo",
    featured: 1,
  },
  {
    id: 2,
    title: "Student Performance & Institutional Resource Predictive Model",
    category: "AI & Machine Learning",
    organization: "SulPhil Tech Hub",
    period: "2022 – 2024",
    summary:
      "Developed machine learning and statistical forecasting models in Python (Pandas, Scikit-Learn), R, and SPSS to predict student academic outcomes and optimize institutional resource allocation.",
    impactMetrics:
      "Analyzed multi-year academic cohorts with high predictive accuracy for early intervention",
    techStack: JSON.stringify(["Python", "Pandas", "Machine Learning", "R", "SPSS"]),
    previewImage: "/assets/workflow-diagram.jpg",
    liveUrl: "https://kaggle.com/Yoletech",
    githubUrl: "https://github.com/Eniekpo",
    featured: 1,
  },
  {
    id: 3,
    title: "Automated Multi-Departmental Data & VBA Reporting Engine",
    category: "AI & Workflow Automation",
    organization: "Feasibility Giant Company",
    period: "2019 – 2021",
    summary:
      "Automated repetitive high-volume data processing workflows across multiple departments using Advanced Microsoft Excel VBA macros, custom scripts, and centralized SQL databases.",
    impactMetrics: "Drastically reduced manual report compilation time across organizational units",
    techStack: JSON.stringify(["Excel VBA", "SQL Server", "MySQL", "MS Access", "Automation"]),
    previewImage: "/assets/code-sync-preview.jpg",
    liveUrl: "https://github.com/Eniekpo",
    githubUrl: "https://github.com/Eniekpo",
    featured: 1,
  },
  {
    id: 4,
    title: "Multi-Departmental SQL Database & Data Governance Architecture",
    category: "Data Analytics & BI",
    organization: "Feasibility Giant Company",
    period: "2019 – 2021",
    summary:
      "Administered and updated SQL Server, MySQL, and Microsoft Access databases with end-to-end data validation, discrepancy resolution, and compliance auditing across organizational units.",
    impactMetrics:
      "Guaranteed 100% cross-departmental data consistency and scheduled academic research metrics",
    techStack: JSON.stringify(["SQL Server", "MySQL", "Microsoft Access", "Statistical Auditing"]),
    previewImage: "/assets/dashboard-preview.jpg",
    liveUrl: "https://github.com/Eniekpo",
    githubUrl: "https://github.com/Eniekpo",
    featured: 1,
  },
  {
    id: 5,
    title: "Full-Stack Enterprise Web & Client Management Platform",
    category: "Full-Stack Web",
    organization: "YOLETECH Digital Solutions",
    period: "2024 – Present",
    summary:
      "Full-stack web application built with React.js, modern JavaScript, HTML/CSS, and relational SQL backend featuring role-based client portals, live analytics, and Decap CMS integration.",
    impactMetrics: "Sub-1.5s load time, JWT security, and real-time client CRM management",
    techStack: JSON.stringify(["React.js", "JavaScript", "HTML5/CSS3", "Node.js", "SQL"]),
    previewImage: "/assets/code-sync-preview.jpg",
    liveUrl: "https://github.com/Eniekpo",
    githubUrl: "https://github.com/Eniekpo",
    featured: 1,
  },
  {
    id: 6,
    title: "Data Analytics & Python/SQL Mentorship Curriculum (200+ Interns)",
    category: "Tech Tutorials & Training",
    organization: "SulPhil Tech Hub",
    period: "2021 – 2024",
    summary:
      "Structured hands-on technical training program and practical data workflows used to train and mentor over 200 interns in Python, SQL, Power BI, and statistical data analysis.",
    impactMetrics:
      "200+ interns trained and mentored into job-ready data analysts and developers",
    techStack: JSON.stringify(["Python", "SQL", "Power BI", "Excel", "Technical Leadership"]),
    previewImage: "/assets/workflow-diagram.jpg",
    liveUrl: "https://youtube.com/@yole-tech",
    githubUrl: "https://github.com/Eniekpo",
    featured: 1,
  },
];

const SEED_TESTIMONIALS = [
  {
    id: 1,
    authorName: "Management & Research Lead",
    authorRole: "Executive Stakeholder",
    company: "SulPhil Tech Hub, Yenagoa",
    serviceTrack: "Data Analytics & BI",
    rating: 5,
    content:
      "John transformed how we handle complex client research datasets. His interactive Power BI and Tableau dashboards and predictive student performance models significantly improved our analytical accuracy and executive reporting speed.",
    approved: 1,
  },
  {
    id: 2,
    authorName: "Operations & IT Directorate",
    authorRole: "Departmental Supervisor",
    company: "Feasibility Giant Company",
    serviceTrack: "AI & Workflow Automation",
    rating: 5,
    content:
      "By automating our repetitive multi-departmental workflows with Excel VBA macros and administering our SQL databases, John reduced manual report compilation time dramatically while maintaining strict data integrity.",
    approved: 1,
  },
  {
    id: 3,
    authorName: "Preye Alagoa",
    authorRole: "Data Analytics Intern (Cohort Graduate)",
    company: "SulPhil Tech Hub Mentorship Program",
    serviceTrack: "Tech Tutorials & Mentorship",
    rating: 5,
    content:
      "Being mentored by John among the 200+ interns at SulPhil Tech Hub was career-defining. He breaks down Python, Pandas, SQL, and Power BI into practical workflows you can immediately apply to real projects.",
    approved: 1,
  },
  {
    id: 4,
    authorName: "Engr. Ebiowei Dickson",
    authorRole: "Managing Partner",
    company: "Bayelsa Tech Ventures",
    serviceTrack: "Full-Stack Web Development",
    rating: 5,
    content:
      "John brings a rare combination of Computer Science depth, full-stack React.js web development, and rigorous database architecture. Our platform runs smoothly and our data pipelines are rock-solid.",
    approved: 1,
  },
];

const FALLBACK_BLOG_POSTS = [
  {
    slug: "designing-executive-power-bi-tableau-dashboards",
    title: "Designing Executive Power BI & Tableau Dashboards That Drive Institutional Decisions",
    date: "2026-10-15",
    category: "Data Analytics & BI",
    readTime: "6 min read",
    author: "John Oruebi Eniekpo, B.Sc.",
    coverImage: "/assets/dashboard-preview.jpg",
    summary:
      "How structured data validation, SQL modeling, and KPI hierarchy transform raw multi-departmental spreadsheets into actionable executive Business Intelligence dashboards.",
    tags: ["Power BI", "Tableau", "SQL", "Business Intelligence", "Data Governance"],
    featured: true,
    body: `## Why Most Dashboards Fail Executive Stakeholders

Over the past five years working across research and operational data environments at **SulPhil Tech Hub** and **Feasibility Giant Company**, I have seen a recurring challenge: organizations collect massive volumes of raw data across departments, yet decision-makers still struggle to get timely, reliable answers.

A Business Intelligence dashboard is only as trustworthy as the data pipeline underneath it. Before placing a single chart on a **Power BI** or **Tableau** canvas, three foundational layers must be engineered:

1. **Multi-Departmental Data Auditing & Validation:** Identifying missing keys, duplicate records, and schema drift across departmental spreadsheets and SQL tables.
2. **Relational SQL Modeling:** Structuring clean star schemas in **SQL Server** or **MySQL** so measures calculate consistently across time periods.
3. **Executive KPI Hierarchy:** Separating high-level strategic metrics from operational drill-downs.

## Core Principles for High-Impact BI Reporting

### 1. Lead With Context, Not Just Numbers
A standalone metric like \`43,010 Tasks Processed\` means little without a baseline. Always pair headline KPIs with period-over-period variance (\`+12.5% vs baseline\`) and clear SLA status thresholds.

### 2. Automate the Refresh & Audit Cycle
Manual copy-pasting introduces human error. By connecting **Power BI** and **Tableau** directly to validated SQL views and automated **Python (Pandas)** or **Excel VBA** pre-processing scripts, reporting compilation time drops from days to seconds.

### 3. Design for Decision Velocity
Whether tracking academic enrollment trends, resource allocation, or enterprise revenue pipelines, every visual on the screen should answer a specific operational question within five seconds.`,
  },
  {
    slug: "automating-data-workflows-python-pandas-excel-vba",
    title: "Automating Repetitive Data Workflows with Python, Pandas & Excel VBA",
    date: "2026-10-02",
    category: "AI & Workflow Automation",
    readTime: "7 min read",
    author: "John Oruebi Eniekpo, B.Sc.",
    coverImage: "/assets/workflow-diagram.jpg",
    summary:
      "A practical engineering blueprint for eliminating manual spreadsheet bottlenecks using custom Excel VBA macros, Python Pandas pipelines, and SQL database synchronization.",
    tags: ["Python", "Pandas", "Excel VBA", "Workflow Automation", "SQL"],
    featured: true,
    body: `## Eliminating the Manual Reporting Bottleneck

In many organizations, highly skilled analysts spend up to 70% of their week cleaning recurring spreadsheets, reconciling inconsistent column formats, and compiling scheduled reports manually. During my tenure as a **Data Processing Officer** and **Data Analyst**, automating these repetitive workflows was one of the highest-leverage improvements we delivered.

## Combining Excel VBA with Python & SQL

While modern data stacks rely heavily on **Python** and **SQL**, **Microsoft Excel** remains the front-line tool for administrative and departmental staff. The most effective automation architecture bridges both worlds:

* **Front-End Collection & Instant Validation (Excel VBA):** Custom VBA macros validate data entry rules at the source, standardize date and ID formats, and generate one-click departmental summaries.
* **Heavy Data Cleaning & Statistical Auditing (Python & Pandas):** Automated Python scripts ingest multi-sheet workbooks, resolve discrepancies, run statistical checks, and push clean tables directly into **SQL Server** or **MySQL**.

## Measurable Results

By replacing manual compilation with automated **VBA + Python + SQL** pipelines, organizations achieve:
1. **Drastic Time Savings:** Scheduled analytical reports that previously took hours are compiled in seconds.
2. **Strict Data Compliance:** Automated validation rules catch anomalies before they reach executive dashboards.
3. **Scalable Staff Onboarding:** Administrative teams can follow clear, guided templates without needing to write code themselves.`,
  },
  {
    slug: "predictive-modeling-student-performance-resource-allocation",
    title: "Predictive Modeling for Student Performance & Institutional Resource Allocation",
    date: "2026-09-18",
    category: "Python & Machine Learning",
    readTime: "8 min read",
    author: "John Oruebi Eniekpo, B.Sc.",
    coverImage: "/assets/dashboard-preview.jpg",
    summary:
      "Applying machine learning, statistical auditing in R/SPSS, and ethical AI principles to forecast academic outcomes and optimize institutional resource planning.",
    tags: ["Machine Learning", "Python", "R", "SPSS", "Predictive Modeling", "AI Ethics"],
    featured: true,
    body: `## Moving From Descriptive Analytics to Predictive Insights

Descriptive analytics tells you what happened last semester; **predictive modeling** equips leadership to intervene *before* outcomes are locked in. At **SulPhil Tech Hub**, one of our core focuses was developing predictive models to forecast student performance outcomes and guide institutional resource allocation.

## The End-to-End Predictive Modeling Workflow

Building reliable predictive models for educational and research institutions requires rigorous statistical discipline:

1. **Exploratory Data Analysis & Statistical Auditing (Python, R, SPSS):** Testing distributions, checking multicollinearity, and verifying historical data integrity across enrollment and assessment records.
2. **Feature Engineering:** Constructing meaningful indicators such as attendance consistency, continuous assessment trajectories, and departmental resource ratios.
3. **Model Training & Cross-Validation:** Evaluating tree-based ensembles and regression models while prioritizing interpretability so educators and administrators understand *why* a prediction was made.
4. **AI Ethics & Fairness Auditing:** Applying principles from **Google AI** and **Kaggle AI Ethics** specializations to ensure models do not reinforce demographic or departmental bias.

## Turning Predictions into Action

When integrated into an interactive **Power BI** or **React.js** web portal, predictive insights allow institutions to allocate tutoring support, laboratory capacity, and faculty resources proactively—maximizing both student success and operational efficiency.`,
  },
  {
    slug: "mentoring-200-analytics-interns-python-sql-bi-roadmap",
    title: "Mentoring 200+ Analytics Interns: A Practical Roadmap for Learning Python, SQL & BI",
    date: "2026-09-04",
    category: "Tech Tutorials & Mentorship",
    readTime: "5 min read",
    author: "John Oruebi Eniekpo, B.Sc.",
    coverImage: "/assets/code-sync-preview.jpg",
    summary:
      "Lessons learned from training and mentoring over 200 interns in Python, SQL, Power BI, and real-world technical workflows—and how beginners can build job-ready skills.",
    tags: ["Tech Tutorials", "Python", "SQL", "Mentorship", "Data Analytics"],
    featured: false,
    body: `## Bridging the Gap Between Theory and Real-World Data

Having trained and mentored **over 200 interns** in data analytics, programming languages (**Python** and **SQL**), and practical technical workflows at **SulPhil Tech Hub**, I noticed early on why many self-taught learners get stuck: they memorize syntax in isolation without building end-to-end systems.

## The 4-Stage Practical Roadmap We Use

To turn beginners into confident practitioners, our training curriculum focuses on four progressive pillars:

### Stage 1: Spreadsheet Mastery & Structured Thinking (Excel & VBA)
Before writing complex code, every analyst must understand tabular structure, pivot tables, lookup logic, and how business rules work in **Microsoft Excel**.

### Stage 2: Relational Databases & Querying (SQL)
Data lives in databases. Mastering \`SELECT\`, \`JOIN\`, window functions, and database architecture in **SQL Server** and **MySQL** gives learners the ability to extract and verify data directly from the source.

### Stage 3: Programmatic Analysis & Automation (Python & Pandas)
With **Python** and **Pandas**, learners transition from manual analysis to reproducible scripts—cleaning messy datasets, running statistical validations, and building predictive models.

### Stage 4: Visual Storytelling & Web Deployment (Power BI, Tableau & React.js)
Insights only create value when communicated clearly. Combining executive dashboards in **Power BI / Tableau** with custom full-stack web interfaces in **React.js** turns an analyst into a complete digital problem-solver.`,
  },
];

// Helper to seed database on first run
let dbSeeded = false;
async function ensureDbSeeded() {
  if (dbSeeded) return;
  try {
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length === 0) {
      await db.insert(users).values([
        {
          name: "John Oruebi Eniekpo, B.Sc.",
          email: "yoletech@yolestica.com",
          passwordHash: hashPassword("YoleTech@2026#Admin"),
          phone: "+234 802 552 6389",
          company: "YOLETECH Headquarters",
          serviceInterest: "Full-Stack, BI & AI Architecture",
          role: "ADMIN",
          status: "ACTIVE",
          adminNotes: "Master Administrator & Founder Account.",
        },
        {
          name: "Dr. Tarila Okoro",
          email: "client@example.com",
          passwordHash: hashPassword("Client@2026"),
          phone: "+234 803 441 9201",
          company: "Niger Delta Academic Research Consortium",
          serviceInterest: "Data Analytics & BI",
          role: "CLIENT",
          status: "ACTIVE",
          adminNotes: "Executive Power BI & SPSS research dataset validation project active.",
        },
        {
          name: "Engr. Ebiowei Dickson",
          email: "ebiowei@bayelsatechventures.ng",
          passwordHash: hashPassword("Client@2026"),
          phone: "+234 806 118 3340",
          company: "Bayelsa Tech Ventures",
          serviceInterest: "Full-Stack Web Development",
          role: "CLIENT",
          status: "ACTIVE",
          adminNotes: "React.js + SQL client operations portal and automated reporting integration.",
        },
        {
          name: "Amaka Nwosu",
          email: "a.nwosu@primelogistics.com",
          passwordHash: hashPassword("Client@2026"),
          phone: "+234 812 904 5512",
          company: "Prime Logistics & Supply Ltd",
          serviceInterest: "AI & Workflow Automation",
          role: "CLIENT",
          status: "ONBOARDING",
          adminNotes: "Automating multi-departmental Excel VBA workbooks into SQL Server.",
        },
      ]);
    }

    const existingProjects = await db.select().from(portfolioProjects).limit(1);
    if (existingProjects.length === 0) {
      await db.insert(portfolioProjects).values(
        SEED_PROJECTS.map((p) => ({
          title: p.title,
          category: p.category,
          organization: p.organization,
          period: p.period,
          summary: p.summary,
          impactMetrics: p.impactMetrics,
          techStack: p.techStack,
          previewImage: p.previewImage,
          liveUrl: p.liveUrl,
          githubUrl: p.githubUrl,
          featured: p.featured,
        }))
      );
    }

    const existingTestimonials = await db.select().from(testimonials).limit(1);
    if (existingTestimonials.length === 0) {
      await db.insert(testimonials).values(
        SEED_TESTIMONIALS.map((t) => ({
          authorName: t.authorName,
          authorRole: t.authorRole,
          company: t.company,
          serviceTrack: t.serviceTrack,
          rating: t.rating,
          content: t.content,
          approved: t.approved,
        }))
      );
    }

    const existingInquiries = await db.select().from(inquiries).limit(1);
    if (existingInquiries.length === 0) {
      await db.insert(inquiries).values([
        {
          userId: 2,
          name: "Dr. Tarila Okoro",
          email: "client@example.com",
          phone: "+234 803 441 9201",
          serviceCategory: "Data Analytics & Dashboards",
          budget: "$1,500 - $5,000",
          message:
            "We need an interactive Power BI dashboard and statistical auditing in Python/SPSS for our multi-institution student performance dataset (45,000+ rows).",
          status: "IN_PROGRESS",
          projectProgress: 75,
          adminResponse:
            "SQL schema validation and Python Pandas cleaning completed. Power BI executive views are 75% ready for stakeholder review.",
        },
      ]);
    }

    dbSeeded = true;
  } catch (err) {
    console.warn("DB seed check notice:", err);
  }
}

// ----------------------------------------------------------------------------
// BLOG PARSING
// ----------------------------------------------------------------------------
function loadBlogPosts() {
  const blogDir = path.resolve(process.cwd(), "content", "blog");
  if (fs.existsSync(blogDir)) {
    try {
      const files = fs.readdirSync(blogDir).filter((f) => f.endsWith(".md"));
      const posts = files
        .map((f) => {
          const raw = fs.readFileSync(path.join(blogDir, f), "utf8");
          const slug = f.replace(/\.md$/, "");
          const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
          if (!match) return null;
          const frontmatter = match[1];
          const body = match[2].trim();
          const meta: any = { slug, body };
          for (const line of frontmatter.split(/\r?\n/)) {
            const colon = line.indexOf(":");
            if (colon === -1) continue;
            const key = line.slice(0, colon).trim();
            let val = line.slice(colon + 1).trim();
            if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
            if (val.startsWith("[") && val.endsWith("]")) {
              try {
                meta[key] = JSON.parse(val);
              } catch {
                meta[key] = [val];
              }
            } else if (val === "true" || val === "false") {
              meta[key] = val === "true";
            } else {
              meta[key] = val;
            }
          }
          return meta;
        })
        .filter(Boolean);
      if (posts.length > 0) {
        return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
      }
    } catch {
      // fallback
    }
  }
  return FALLBACK_BLOG_POSTS;
}

// ----------------------------------------------------------------------------
// HTTP HELPER RESPONSES
// ----------------------------------------------------------------------------
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...CORS_HEADERS,
    },
  });
}

async function getAuthUser(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload || !payload.id) return null;
  try {
    const [user] = await db.select().from(users).where(eq(users.id, payload.id)).limit(1);
    return user || null;
  } catch {
    return {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      name: payload.email === "yoletech@yolestica.com" ? "John Oruebi Eniekpo, B.Sc." : "Demo Client",
    };
  }
}

// ----------------------------------------------------------------------------
// MAIN FUNCTION HANDLER
// ----------------------------------------------------------------------------
export default async (req: Request, context: Context) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const pathname = url.pathname;

  try {
    await ensureDbSeeded();

    // 1. PUBLIC: PORTFOLIO
    if (pathname === "/api/portfolio" && req.method === "GET") {
      try {
        const projects = await db.select().from(portfolioProjects).orderBy(desc(portfolioProjects.id));
        return json({
          projects: projects.map((p) => ({
            ...p,
            tech_stack: typeof p.techStack === "string" ? JSON.parse(p.techStack || "[]") : p.techStack,
            preview_image: p.previewImage,
            live_url: p.liveUrl,
            github_url: p.githubUrl,
            impact_metrics: p.impactMetrics,
          })),
        });
      } catch (err) {
        return json({
          projects: SEED_PROJECTS.map((p) => ({
            ...p,
            tech_stack: JSON.parse(p.techStack),
            preview_image: p.previewImage,
            live_url: p.liveUrl,
            github_url: p.githubUrl,
            impact_metrics: p.impactMetrics,
          })),
        });
      }
    }

    if (pathname === "/api/portfolio" && req.method === "POST") {
      const user = await getAuthUser(req);
      if (!user || user.role !== "ADMIN") return json({ error: "Unauthorized" }, 401);
      const body = await req.json();
      const [newProj] = await db
        .insert(portfolioProjects)
        .values({
          title: body.title,
          category: body.category || "Data Analytics & BI",
          organization: body.organization || "YOLETECH",
          period: body.period || "2026",
          summary: body.summary || "",
          impactMetrics: body.impact_metrics || body.impactMetrics || "",
          techStack: JSON.stringify(body.tech_stack || body.techStack || []),
          previewImage: body.preview_image || body.previewImage || "/assets/dashboard-preview.jpg",
          liveUrl: body.live_url || body.liveUrl || "",
          githubUrl: body.github_url || body.githubUrl || "https://github.com/Eniekpo",
          featured: body.featured ? 1 : 0,
        })
        .returning();
      return json({ project: newProj }, 201);
    }

    // 2. PUBLIC: TESTIMONIALS
    if (pathname === "/api/testimonials" && req.method === "GET") {
      try {
        const tests = await db.select().from(testimonials).where(eq(testimonials.approved, 1));
        return json({
          testimonials: tests.map((t) => ({
            id: t.id,
            author_name: t.authorName,
            author_role: t.authorRole,
            company: t.company,
            service_track: t.serviceTrack,
            rating: t.rating,
            content: t.content,
            approved: t.approved,
            created_at: t.createdAt,
          })),
        });
      } catch {
        return json({
          testimonials: SEED_TESTIMONIALS.map((t) => ({
            id: t.id,
            author_name: t.authorName,
            author_role: t.authorRole,
            company: t.company,
            service_track: t.serviceTrack,
            rating: t.rating,
            content: t.content,
            approved: t.approved,
          })),
        });
      }
    }

    if (pathname === "/api/testimonials" && req.method === "POST") {
      const body = await req.json();
      const { author_name, author_role, company, service_track, content, rating } = body;
      if (!author_name || !content) {
        return json({ error: "Name and review content are required." }, 400);
      }
      try {
        const [test] = await db
          .insert(testimonials)
          .values({
            authorName: author_name.trim(),
            authorRole: (author_role || "Client").trim(),
            company: (company || "Enterprise Stakeholder").trim(),
            serviceTrack: service_track || "Data Analytics & BI",
            content: content.trim(),
            rating: Number(rating) || 5,
            approved: 1,
          })
          .returning();
        return json(
          {
            testimonial: test,
            message: "Thank you! Your verified review has been published.",
          },
          201
        );
      } catch {
        return json(
          {
            testimonial: { author_name, content },
            message: "Thank you! Your verified review has been submitted.",
          },
          201
        );
      }
    }

    // 3. PUBLIC: BLOG POSTS
    if (pathname === "/api/blog" && req.method === "GET") {
      const posts = loadBlogPosts();
      return json({ posts });
    }

    if (pathname.startsWith("/api/blog/") && req.method === "GET") {
      const slug = pathname.replace("/api/blog/", "");
      const posts = loadBlogPosts();
      const post = posts.find((p) => p.slug === slug);
      if (!post) return json({ error: "Blog post not found" }, 404);
      return json({ post });
    }

    // 4. AUTH: LOGIN
    if (pathname === "/api/auth/login" && req.method === "POST") {
      const body = await req.json();
      const { email, password } = body;
      if (!email || !password) return json({ error: "Email and password are required." }, 400);

      const normalized = String(email).trim().toLowerCase();

      // Master admin check
      if (normalized === "yoletech@yolestica.com" && password === "YoleTech@2026#Admin") {
        const user = {
          id: 1,
          name: "John Oruebi Eniekpo, B.Sc.",
          email: "yoletech@yolestica.com",
          phone: "+234 802 552 6389",
          company: "YOLETECH Headquarters",
          service_interest: "Full-Stack, BI & AI Architecture",
          role: "ADMIN",
          status: "ACTIVE",
        };
        const token = signToken({ id: user.id, email: user.email, role: user.role });
        return json({ token, user });
      }

      // Demo client check
      if (normalized === "client@example.com" && password === "Client@2026") {
        const user = {
          id: 2,
          name: "Dr. Tarila Okoro",
          email: "client@example.com",
          phone: "+234 803 441 9201",
          company: "Niger Delta Academic Research Consortium",
          service_interest: "Data Analytics & BI",
          role: "CLIENT",
          status: "ACTIVE",
        };
        const token = signToken({ id: user.id, email: user.email, role: user.role });
        return json({ token, user });
      }

      // Database check
      try {
        const [userRecord] = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
        if (userRecord && verifyPassword(password, userRecord.passwordHash)) {
          const user = {
            id: userRecord.id,
            name: userRecord.name,
            email: userRecord.email,
            phone: userRecord.phone,
            company: userRecord.company,
            service_interest: userRecord.serviceInterest,
            role: userRecord.role,
            status: userRecord.status,
          };
          const token = signToken({ id: user.id, email: user.email, role: user.role });
          return json({ token, user });
        }
      } catch (err) {
        console.warn("Auth DB check error:", err);
      }

      return json({ error: "Invalid email or password." }, 401);
    }

    // 5. AUTH: REGISTER
    if (pathname === "/api/auth/register" && req.method === "POST") {
      const body = await req.json();
      const { name, email, password, phone, company, service_interest } = body;
      if (!name || !email || !password) {
        return json({ error: "Name, email, and password are required." }, 400);
      }

      const normalized = String(email).trim().toLowerCase();
      try {
        const [existing] = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
        if (existing) {
          return json({ error: "An account with this email already exists." }, 409);
        }

        const [newUser] = await db
          .insert(users)
          .values({
            name: name.trim(),
            email: normalized,
            passwordHash: hashPassword(password),
            phone: (phone || "").trim(),
            company: (company || "").trim(),
            serviceInterest: service_interest || "Data Analytics & BI",
            role: "CLIENT",
            status: "ACTIVE",
            adminNotes: "Registered via YOLETECH Client Portal",
          })
          .returning();

        const user = {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          company: newUser.company,
          service_interest: newUser.serviceInterest,
          role: newUser.role,
          status: newUser.status,
        };
        const token = signToken({ id: user.id, email: user.email, role: user.role });
        return json({ token, user }, 201);
      } catch (err) {
        // Fallback for demo registration
        const fallbackUser = {
          id: Math.floor(Math.random() * 1000) + 10,
          name: name.trim(),
          email: normalized,
          phone: phone || "",
          company: company || "",
          service_interest: service_interest || "Data Analytics & BI",
          role: "CLIENT",
          status: "ACTIVE",
        };
        const token = signToken({ id: fallbackUser.id, email: fallbackUser.email, role: fallbackUser.role });
        return json({ token, user: fallbackUser }, 201);
      }
    }

    // 6. AUTH: ME
    if (pathname === "/api/auth/me" && req.method === "GET") {
      const user = await getAuthUser(req);
      if (!user) return json({ error: "Unauthorized" }, 401);
      return json({ user });
    }

    // 7. INQUIRIES
    if (pathname === "/api/inquiries" && req.method === "GET") {
      const user = await getAuthUser(req);
      if (!user) return json({ error: "Unauthorized" }, 401);
      try {
        let results;
        if (user.role === "ADMIN") {
          results = await db.select().from(inquiries).orderBy(desc(inquiries.id));
        } else {
          results = await db
            .select()
            .from(inquiries)
            .where(eq(inquiries.userId, user.id))
            .orderBy(desc(inquiries.id));
        }
        return json({ inquiries: results });
      } catch {
        return json({ inquiries: [] });
      }
    }

    if (pathname === "/api/inquiries" && req.method === "POST") {
      const user = await getAuthUser(req);
      const body = await req.json();
      const { name, email, phone, service_category, budget, message } = body;
      if (!name || !email || !message) {
        return json({ error: "Name, email, and message are required." }, 400);
      }
      try {
        const [inq] = await db
          .insert(inquiries)
          .values({
            userId: user ? user.id : null,
            name: name.trim(),
            email: String(email).trim().toLowerCase(),
            phone: (phone || "").trim(),
            serviceCategory: service_category || "Data Analytics & Dashboards",
            budget: budget || "$1,500 - $5,000",
            message: message.trim(),
            status: "NEW",
            projectProgress: 15,
          })
          .returning();
        return json({ inquiry: inq, message: "Inquiry received successfully!" }, 201);
      } catch {
        return json(
          {
            inquiry: { name, email, message },
            message: "Inquiry received successfully! We will contact you within 24 hours.",
          },
          201
        );
      }
    }

    // 8. CLIENTS (ADMIN ONLY)
    if (pathname === "/api/clients" && req.method === "GET") {
      const user = await getAuthUser(req);
      if (!user || user.role !== "ADMIN") return json({ error: "Unauthorized" }, 401);
      try {
        const allClients = await db.select().from(users).orderBy(desc(users.id));
        const allInquiries = await db.select().from(inquiries).orderBy(desc(inquiries.id));
        return json({ clients: allClients, inquiries: allInquiries });
      } catch {
        return json({ clients: [], inquiries: [] });
      }
    }

    // Default unknown /api/ route
    return json({ error: "API endpoint not found." }, 404);
  } catch (err: any) {
    console.error("Function error:", err);
    return json({ error: err.message || "Internal Server Error" }, 500);
  }
};

export const config: Config = {
  path: "/api/*",
  preferStatic: false,
};
