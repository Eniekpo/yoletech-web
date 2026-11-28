# YOLETECH Website Overhaul — CHANGELOG

Production canonical domain: `https://www.yolestica.com`  
Brand theme color preserved: `#1e1b54`, existing logo and typography (`Inter`, `Plus Jakarta Sans`, `JetBrains Mono`).

---

## Phase 1 — Server-Side Rendering (SSR) of All Public Routes
- Created `server/site-config.js` as the single canonical source of truth for owner metadata, all 7 confirmed services, 4-stage delivery process, contact FAQs, navigation links, legacy query redirects, and renamed blog slug redirects.
- Rewrote `server/blog-page.js` to render unique full-page SSR HTML inside `<div id="app-root">` (header, `<main id="main-content">` with unique `<h1>`, real body copy, internal links, and crawlable footer) for `/`, `/about`, `/services`, `/portfolio`, `/learn`, `/blog`, `/blog/:slug`, `/contact`, `/privacy`, `/terms`, and `/cookies`.
- Removed the repeated Home hero + `"Core Digital & Data Services"` strip from all inner pages so it appears strictly on `/`.
- Added true HTTP `404` responses (`renderNotFoundHtml`) on both Node (`server/index.js`) and Vercel (`api/blog-page.js`) with `X-Robots-Tag: noindex, nofollow`.
- Added `npm run build` and `npm run lint` (`scripts/lint.js` syntax checks, strict TypeScript check, zero `any`, JSON validation) plus SSR integration tests (`tests/seo-ssr.test.mjs`).

## Phase 2 — Blocking Preloader & Sample Chart Removal
- Removed the 4-second blocking `#yoletech-preloader` overlay (`"Loading Executive Analytics & Web Experience... 0%"`), `preloader-active` body lock, its dead CSS (`~300` lines in `public/styles.css`), and the hardcoded SVG `"New clients / Signup month"` sample chart from `public/index.html`.
- Fixed the missing/404 `/assets/hero-slide-1-data-science-portrait.png` reference in `public/index.html` to `/assets/home-hero-analyst.jpg`.
- Added accessible HTML `<table>` alternatives (`<details class="dash-a11y-table">`) alongside SVG charts in `public/dashboard.js`.

## Phase 3 — Page Content, CTAs, Case-Study Template & Contact Hardening
- Standardized a single consistent job title (`Data Analyst, Business Intelligence Specialist & Full-Stack Web Developer`), credentials (`B.Sc. Computer Science (M.Sc. IT in progress)` — fixing `public/cv.html` from `M.Sc.` to `B.Sc.`), and WAT (`UTC+1`) business hours across the site.
- Updated Services to all 7 confirmed tracks (`Full-Stack Web Development`, `Data Analysis & Executive BI`, `AI & Workflow Automation`, `Tech Training & Mentorship`, `Customer Support Solutions`, `IT Support & Database Administration`, `AI-Powered Content Creation & Graphic Design`), each with scope, deliverables, tools, process, FAQ, and `"Book a Discovery Call"` CTA, plus the 4-stage `Discovery / Build / Delivery / Support` process.
- Updated Portfolio with structured `Problem / Approach / Tools / Outcome` case-study cards & modal (`"View Case Study"` CTA) and removed unverified numeric metrics.
- Kept the Learn page split hero + minimal course cards (`Title`, `Image`, `"Enroll Now"`, `"Course Details"` modal showing curriculum/outcomes, mode, level, and `TODO(owner)` placeholders for unconfirmed duration/schedule/fee).
- Hardened Contact (`public/app.js`, `server/blog-page.js`, `server/index.js`): added explicit form labels, required consent checkbox, hidden honeypot (`website`), server-side validation, IP + email rate limiting (`429`), response-time statement (`1 business day`), booking link placeholder (`TODO(owner)`), WAT business hours, removed self-linking CTA, and displayed the phone number once as a tap-to-call/WhatsApp block.
- Labeled interactive Home/Services preview widgets clearly as illustrative UI previews and removed unbacked `"Verified"` labels across the UI.

## Phase 4 — Canonical Host, Technical SEO, JSON-LD, Sitemap & Robots
- Enforced `https://www.yolestica.com` as the single canonical host with HTTP `301` redirects from `yolestica.com` → `https://www.yolestica.com` in `vercel.json`, `server/index.js`, and `api/blog-page.js`.
- Removed `<meta name="keywords">` from `public/index.html` and SSR templates.
- Enforced `<title>` ≤ 60 chars and `<meta name="description">` ≤ 155 chars across all routes (verified in `scripts/lint.js` and `tests/seo-ssr.test.mjs`).
- Corrected social handles in `Organization`/`Person` JSON-LD (`github.com/Eniekpo`, `linkedin.com/in/yolestica`, `kaggle.com/Yoletech`, `youtube.com/@yole-tech`, `facebook.com/Yoletech`) and added `BreadcrumbList`, `FAQPage`, `Course`, and `BlogPosting` structured data.
- Updated `public/robots.txt`, `public/sitemap.xml`, and `public/admin/config.yml` to `https://www.yolestica.com`, excluding non-indexable routes (`/dashboard`, `/testimonials`, `/admin*`, `/login`, `/register`, `/portal`, `/learn/dashboard`).

## Phase 5 — Routing Cleanup, 301 Redirects & True 404
- Implemented server-side HTTP `301` redirects for all legacy `/?page=...` URLs and `/signup` → `/register` across `vercel.json`, `server/index.js`, and `api/blog-page.js`.
- Replaced legacy `/?page=...` links in `public/admin/index.html` with clean paths (`/admin-dashboard`, `/portfolio`, `/blog`).
- Added Vercel catch-all rewrite to `/api/blog-page?route=/$1` and client `renderNotFoundPage()` so unknown URLs render a genuine HTTP `404` page without reverting to Home on hydration.

## Phase 6 — Dashboard, Admin & Platform Security Hardening
- Removed `"Dashboard"` from public navigation (shown only for authenticated `ADMIN`) and gated `/dashboard`, `GET /api/analytics`, and `POST /api/analytics/sync` strictly behind `ADMIN` authentication (`401`/`403`).
- Removed hardcoded `JWT_SECRET` fallback and hardcoded `'YoleTech@2026#Admin'` password from `server/index.js` and client-side `public/app.js`; server now reads `JWT_SECRET`, `ADMIN_PASSWORD` / `ADMIN_PASSWORD_HASH` from environment variables.
- Implemented `HttpOnly; SameSite=Lax; Path=/` (`Secure` on HTTPS/production) session cookies (`yoletech_session`) on `/api/auth/login`, `/api/auth/register`, and `/api/learn/register`, plus `POST /api/auth/logout`.
- Added server-side Admin auth gate on `/admin`, `/admin/`, and `/admin/index.html` (redirecting unauthenticated requests with `302` → `/login?next=/admin/` and `X-Robots-Tag: noindex, nofollow`, routed through `/api/index.js` in `vercel.json`).
- Added CSRF `Origin` validation on state-changing `/api/*` endpoints, removed wildcard `Access-Control-Allow-Origin: *`, and applied `Strict-Transport-Security`, `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy` headers.

## Phase 7 — Blog Cleanup, Categories, Weekly Digest, Fact Audit & Short Slugs
- Fixed YAML folded-scalar `summary: >-` excerpts across all posts (zero `>-` anywhere).
- Fixed title casing (`Build REST APIs with Python and FastAPI`, normalized wrapped titles and all-caps news headlines).
- Moved all 6 computing pioneer biographies into a new **`Tech History`** category and updated Decap CMS + blog filter pills.
- Merged `technology-updates-12-november-2026` and `yoletech-tech-news-13-november-2026` into `/blog/tech-news-weekly-digest-nov-2026` with HTTP `301` redirects from both old slugs.
- Shortened 8 overly long blog slugs and fixed portfolio typo `ow-to-automate-excel-reports-using-python-and-pandas.md` → `automate-excel-reports-python-pandas.md`, wiring HTTP `301` redirects for all 10 renamed/merged blog slugs in `vercel.json`, `server/index.js`, and `api/blog-page.js`.
- Softened unsourced stats (`"35 percent"`, `"under two seconds"`, `"15–25 percent"`, `"30–50%"`, unverified portfolio metrics) and fixed broken `google.com/search?q=mailto:` links.
- Cross-linked the 2-part Real Estate Machine Learning series, added `updated`/`tags`/`readTime` metadata, blog pagination (9 per page), and Related Articles.

## Phase 8 — Legal Pages, Cookie Consent, Full Footer & Navigation
- Added `/privacy`, `/terms`, and `/cookies` pages (both SSR and SPA), referencing the Nigeria Data Protection Act (NDPA) 2023 and marked draft for legal review.
- Gated Google Tag Manager (`G-XB50V6V6LG`) behind an accessible Cookie Consent banner (`Accept Analytics` / `Essential Only` + `"Cookie Settings"` footer button).
- Replaced the tabbed footer with an always-visible, crawlable 4-column footer (Quick Links, Services, Legal & Contact, Social Handles) and suppressed self-linking contact banners on `/contact`.
- Updated primary nav to `Home`, `Services`, `Portfolio`, `Learn`, `Blog`, `About`, `Contact`, plus `Client Login` and `Create Account` (hiding `/testimonials` and `/dashboard` from public nav/footer/sitemap).

## Phase 9 — Accessibility (WCAG 2.1 AA), Performance & Verification
- Improved dark- and light-theme contrast (`--yole-text-muted`, `--yole-text-subtle`, `--yole-link-accent`, `.scope-tab-num`, `.bi-range-pill.active`, `.services-ticker`), added explicit `<label for="...">` tags on interactive ROI sliders, added universal `:focus-visible` outlines, and added a keyboard skip-to-content link.
- Enforced global `@media (prefers-reduced-motion: reduce)` across CSS animations/marquees and JS slideshow/KPI/scroll routines.
- Added `defer` to client scripts, scoped the 660 KB `/learn.js` bundle strictly to `/learn`, `/learn/dashboard`, and `/admin-dashboard` (with on-demand lazy loading for SPA navigation), added non-throwing `GET /api/auth/session` to eliminate anonymous `401` console noise, added `preload` for the Home LCP hero image, and optimized 24 oversized hero/blog/icon assets in-place (**32.7 MB → 2.7 MB**, 92% reduction).
- Moved `public/admin/index.html` → `server/admin-cms.html` so Vercel enforces the server-side `/admin/` auth gate (`302 /login?next=/admin/`), switched `vercel.json` redirects to exact HTTP `301` (`statusCode: 301`), and added CSP headers for static `/` while excluding `/admin/`.

---

## Owner Action Items (`TODO(owner)`)
1. **Vercel Environment Variables (Required before Admin login in production):** Set `JWT_SECRET` (32+ random hex chars) and `ADMIN_PASSWORD` (or `ADMIN_PASSWORD_HASH`) in Vercel Project Settings → Environment Variables.
2. **Discovery Call Booking URL:** Replace `TODO(owner): Add your Calendly or Cal.com discovery call booking URL` in `server/site-config.js` and `public/data.js`.
3. **Certificate Verification Links:** Add public Google/Coursera/Kaggle verification URLs in `server/blog-page.js` and `public/data.js`.
4. **Learn Program Details:** Fill confirmed `duration`, `schedule`, and `fee` values per course via Admin Learn (`/admin-dashboard`) or `src/learn/client.ts`.
5. **Portfolio Outcomes:** Replace `TODO(owner)` outcome placeholders in `content/portfolio/*.md` and `public/data.js` with verified client results or notebook evaluation metrics (R²/MAE/RMSE).
6. **Legal Review:** Review draft `/privacy` (confirm registered entity name and DPO contact under NDPA 2023), `/terms` (governing jurisdiction, payment/refund clauses), and `/cookies`.
7. **Testimonials:** When real dated, consented client testimonials are ready, publish them via Admin and re-enable `/testimonials` in navigation and `sitemap.xml`.
