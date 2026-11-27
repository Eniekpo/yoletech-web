# YOLETECH — Official Full-Stack Website, Client Portal, Admin CRM & Decap Bridge Blog

**Owner:** John Oruebi Eniekpo, B.Sc. (M.Sc. IT In-View)  
**Roles:** Data Analyst | Business Intelligence Specialist | Full-Stack Web Developer  
**Location:** Yenagoa, Bayelsa State, Nigeria (Available for Global Remote)  
**Contact:** `+234 802 552 6389` | `yoletech@yolestica.com`

---

## 1. Quick Start

```bash
cd /Users/yoletech/Desktop/PROJECTS/yoletech-web
npm install
npm run db:migrate
npm run db:seed:learn
npm run build:learn
npm start
```

The server starts on **`http://localhost:4000`**.

### Useful Commands

| Command | Purpose |
| :--- | :--- |
| `npm run db:migrate` | Apply idempotent SQL migrations (`server/migrations/*.sql`) to `server/yoletech.db` |
| `npm run db:seed:learn` | Seed the 7 default Learn training courses and editable Learn banner/FAQ content |
| `npm run typecheck` | Run strict TypeScript type-checking (`tsc -p tsconfig.json`) on `src/learn/*.ts` |
| `npm run build:learn` | Bundle `src/learn/` into `server/learn/index.js` and `public/learn.js` |
| `npm test` | Run unit tests (Zod schema & phone validation) and HTTP integration tests via `node:test` |

### Environment Variables

| Variable | Required | Description |
| :--- | :--- | :--- |
| `PORT` | Optional | HTTP server port (defaults to `4000`) |
| `JWT_SECRET` | Recommended in prod | Secret for signing HS256 JWT tokens |
| `ADMIN_NOTIFY_EMAIL` | Optional | Admin email recipient (defaults to `yoletech@yolestica.com`) |
| `RESEND_API_KEY` | Optional | When set, sends confirmation emails directly to learners and admin via Resend; otherwise learner confirmations log to a server console stub |
| `RESEND_FROM_EMAIL` | Optional | Sender address for Resend transactional emails |
| `YOLETECH_DB_PATH` | Optional | Override path to the SQLite database file (defaults to `server/yoletech.db`) |

| Route | Description |
| :--- | :--- |
| `http://localhost:4000/` | **Home** — 6-Slide Hero Service Slideshow, 8-Service Feature Strip, CV Impact Metrics, Interactive BI/Code/Workflow Previews |
| `http://localhost:4000/about` | **About** — Full CV Bio, Technical Proficiencies, Experience Timeline, Education & Google/Kaggle Certifications |
| `http://localhost:4000/services` | **Services** — 8 Service Cards, Interactive Previews, Service Delivery Scope Table & 4-Step Process |
| `http://localhost:4000/learn` | **Learn** — Editable Training Banner, Published Courses Grid, How It Works, FAQ, and 10-Field Learner Registration Form |
| `http://localhost:4000/learn/dashboard` | **Learner Dashboard** — Protected read-only view of learner profile and enrolled course status |
| `http://localhost:4000/dashboard` | **Dashboard** — Client & Delivery Analytics Dashboard |
| `http://localhost:4000/portfolio` | **Portfolio** — Filterable Case Studies across Data/BI, AI/ML, VBA Automation, Full-Stack Web & Training |
| `http://localhost:4000/testimonials` | **Testimonials** — Verified Stakeholder & Mentee Reviews + Live Submission Form |
| `http://localhost:4000/blog` | **Blog** — Technical Markdown Articles powered by Decap CMS & Decap Bridge |
| `http://localhost:4000/contact` | **Contact** — Interactive Service Inquiry Form, WhatsApp Discovery Call, Social Links & Quick FAQ |
| `http://localhost:4000/login` | **Auth Portal** — User Login (Clients, Learners & Admin) & Client Registration Portal |
| `http://localhost:4000/portal` | **Client Portal** — Protected workspace for registered clients to track project progress & submit requests |
| `http://localhost:4000/admin-dashboard` | **Admin Dashboard** — Client CRM, Delivery Milestone Tracker, and **Learn** management (Courses, Registrations, CSV Export, Bulk Status, Banner/FAQ Content) |
| `http://localhost:4000/admin/` | **Decap CMS Bridge** — Standalone Git/Markdown Content Manager |
| `http://localhost:4000/cv.html` | **Official Printable CV** — Print/Save-to-PDF Curriculum Vitae |


## 3. Brand Color System

| Colour | HEX Code | Usage |
| :--- | :--- | :--- |
| **Deep Indigo** | `#2F2B73` | Main backgrounds, cards, and `"YOLE"` brand identity |
| **Lime Green** | `#C8E61E` | Primary CTA buttons, accents, charts, and `"TECH"` lettering |
| **Orange** | `#F7941D` | Decorative swoosh accent, orbital nodes, and secondary badges |
| **White** | `#FFFFFF` | High-contrast text on dark backgrounds and outline controls |
