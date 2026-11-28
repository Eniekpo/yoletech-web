'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  CANONICAL_ORIGIN,
  OWNER,
  CORE_SERVICES,
  DELIVERY_PROCESS,
  CONTACT_FAQS,
  PRIMARY_NAV
} = require('./site-config.js');

const ROOT_DIR = path.join(__dirname, '..');
const BLOG_DIR = path.join(ROOT_DIR, 'content', 'blog');
const PORTFOLIO_DIR = path.join(ROOT_DIR, 'content', 'portfolio');
const INDEX_PATH = path.join(ROOT_DIR, 'public', 'index.html');
const SITE_ORIGIN = (process.env.SITE_URL || CANONICAL_ORIGIN).replace(/\/+$/, '');

function resolveSiteOrigin(reqOrigin) {
  if (reqOrigin && /^https?:\/\/[^/\s]+$/i.test(reqOrigin) && /localhost|127\.0\.0\.1/i.test(reqOrigin)) {
    return reqOrigin.replace(/\/+$/, '');
  }
  return SITE_ORIGIN;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function stripQuotes(val) {
  const s = String(val || '').trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

function readFrontmatter(filePath) {
  const markdown = fs.readFileSync(filePath, 'utf8');
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) return { body: markdown.trim() };

  const values = { body: (match[2] || '').trim() };
  let currentKey = null;
  let currentListKey = null;

  for (const line of match[1].split(/\r?\n/)) {
    const listItem = line.match(/^\s*-\s+(.+)$/);
    if (listItem && (currentListKey || currentKey)) {
      const target = currentListKey || currentKey;
      if (!Array.isArray(values[target])) values[target] = [];
      currentListKey = target;
      currentKey = null;
      values[target].push(stripQuotes(listItem[1]));
      continue;
    }

    const field = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (field) {
      const key = field[1];
      const rawVal = field[2].trim();
      currentListKey = null;
      if (!rawVal || rawVal === '>-' || rawVal === '>' || rawVal === '|-' || rawVal === '|') {
        currentKey = key;
        values[key] = '';
      } else if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
        currentKey = null;
        try {
          values[key] = JSON.parse(rawVal);
        } catch {
          values[key] = rawVal
            .slice(1, -1)
            .split(',')
            .map((v) => stripQuotes(v))
            .filter(Boolean);
        }
      } else {
        currentKey = key;
        values[key] = stripQuotes(rawVal);
      }
      continue;
    }

    if (currentKey && /^\s+\S/.test(line)) {
      const cont = stripQuotes(line.trim());
      values[currentKey] = values[currentKey] ? `${values[currentKey]} ${cont}` : cont;
      continue;
    }

    if (line.trim() === '') continue;
    currentKey = null;
    currentListKey = null;
  }

  for (const key of Object.keys(values)) {
    if (key !== 'body' && typeof values[key] === 'string') {
      values[key] = values[key].replace(/\s{2,}/g, ' ').trim();
    }
  }
  return values;
}

function estimateReadTime(body) {
  const words = String(body || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const mins = Math.max(1, Math.round(words / 220));
  return `${mins} min read`;
}

function loadAllBlogPosts() {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((file) => {
      const fullPath = path.join(BLOG_DIR, file);
      const slug = path.basename(file, '.md');
      const fm = readFrontmatter(fullPath);
      const body = String(fm.body || '');
      const plainSummary = stripQuotes(fm.summary) || body.replace(/[#*`>\-\n]+/g, ' ').trim().slice(0, 180);
      return {
        slug,
        title: stripQuotes(fm.title) || slug,
        date: stripQuotes(fm.date) || '2026-10-15',
        updated: stripQuotes(fm.updated) || stripQuotes(fm.date) || '2026-10-15',
        category: stripQuotes(fm.category) || 'Data Analytics & BI',
        readTime: stripQuotes(fm.readTime) || estimateReadTime(body),
        author: stripQuotes(fm.author) || OWNER.name,
        coverImage: stripQuotes(fm.coverImage) || '',
        summary: plainSummary,
        tags: Array.isArray(fm.tags) ? fm.tags : [],
        series: stripQuotes(fm.series) || '',
        seriesPart: fm.seriesPart ? Number(fm.seriesPart) : null,
        featured: fm.featured === true || fm.featured === 'true',
        body
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.slug.localeCompare(b.slug)));
}

function loadAllPortfolioProjects() {
  if (!fs.existsSync(PORTFOLIO_DIR)) return [];
  return fs
    .readdirSync(PORTFOLIO_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((file) => {
      const fullPath = path.join(PORTFOLIO_DIR, file);
      const slug = path.basename(file, '.md');
      const fm = readFrontmatter(fullPath);
      return {
        slug,
        title: stripQuotes(fm.title) || slug,
        date: stripQuotes(fm.date) || '2026-04-01',
        category: stripQuotes(fm.category) || 'Data Analytics & BI',
        organization: stripQuotes(fm.organization) || 'YOLETECH',
        period: stripQuotes(fm.period) || '2026',
        preview_image: stripQuotes(fm.preview_image) || '/assets/dashboard-preview.jpg',
        demo_url: stripQuotes(fm.demo_url || fm.live_url) || '',
        impact_metrics: stripQuotes(fm.impact_metrics) || '',
        tech_stack: Array.isArray(fm.tech_stack) ? fm.tech_stack : [],
        summary: stripQuotes(fm.summary) || '',
        featured: fm.featured !== false && fm.featured !== 'false',
        body: String(fm.body || '')
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

function loadPublishedLearnDataForSeo() {
  try {
    const { DatabaseSync } = require('node:sqlite');
    const dbPath = process.env.YOLETECH_DB_PATH || path.join(__dirname, 'yoletech.db');
    if (fs.existsSync(dbPath)) {
      const db = new DatabaseSync(dbPath, { readOnly: true });
      const cols = db.prepare('PRAGMA table_info(courses)').all();
      const hasImageCol = Array.isArray(cols) && cols.some((c) => c.name === 'image_url');
      const courses = db
        .prepare(
          `SELECT id, title, slug, ${hasImageCol ? 'image_url,' : "'' AS image_url,"} short_description, outcomes_json, level, mode, duration, price
           FROM courses WHERE status = 'published' ORDER BY display_order ASC, id ASC`
        )
        .all()
        .map((row) => {
          let outcomes = [];
          try {
            const parsed = JSON.parse(row.outcomes_json || '[]');
            if (Array.isArray(parsed)) outcomes = parsed;
          } catch {}
          return { ...row, outcomes };
        });
      const content = db.prepare(`SELECT headline, subheadline, cta_label, faq_json FROM learn_page_content WHERE id = 1`).get();
      db.close();
      let faq = [];
      if (content && content.faq_json) {
        try {
          const parsed = JSON.parse(content.faq_json);
          if (Array.isArray(parsed)) faq = parsed;
        } catch {}
      }
      return {
        courses: Array.isArray(courses) ? courses : [],
        content: content ? { ...content, faq } : null
      };
    }
  } catch {
    // Fall back to bundled defaults
  }
  try {
    const learnMod = require('./learn/index.js');
    return {
      courses: Array.isArray(learnMod.DEFAULT_SEED_COURSES) ? learnMod.DEFAULT_SEED_COURSES : [],
      content: learnMod.DEFAULT_LEARN_PAGE_CONTENT || null
    };
  } catch {
    return { courses: [], content: null };
  }
}

function renderMarkdownLite(md) {
  const lines = String(md || '').split(/\r?\n/);
  const out = [];
  let inCode = false;
  let codeLines = [];
  let listType = null;
  let listItems = [];
  let para = [];

  const formatInline = (txt) =>
    escapeHtml(txt)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)/g, '<a href="$2">$1</a>');

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${formatInline(para.join(' ').trim())}</p>`);
      para = [];
    }
  };
  const flushList = () => {
    if (listItems.length) {
      const tag = listType === 'ol' ? 'ol' : 'ul';
      out.push(`<${tag}>${listItems.map((it) => `<li>${formatInline(it)}</li>`).join('')}</${tag}>`);
      listItems = [];
      listType = null;
    }
  };

  for (const rawLine of lines) {
    if (/^```/.test(rawLine.trim())) {
      flushPara();
      flushList();
      if (!inCode) {
        inCode = true;
        codeLines = [];
      } else {
        out.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
        inCode = false;
        codeLines = [];
      }
      continue;
    }
    if (inCode) {
      codeLines.push(rawLine);
      continue;
    }
    const line = rawLine.trim();
    if (!line) {
      flushPara();
      flushList();
      continue;
    }
    const hm = line.match(/^(#{1,6})\s+(.+?)\s*#*$/);
    if (hm) {
      flushPara();
      flushList();
      const lvl = Math.min(6, Math.max(2, hm[1].length === 1 ? 2 : hm[1].length));
      out.push(`<h${lvl}>${formatInline(hm[2])}</h${lvl}>`);
      continue;
    }
    const ul = line.match(/^[-*]\s+(.+)$/);
    if (ul) {
      flushPara();
      if (listType && listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(ul[1]);
      continue;
    }
    const ol = line.match(/^\d+\.\s+(.+)$/);
    if (ol) {
      flushPara();
      if (listType && listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(ol[1]);
      continue;
    }
    flushList();
    para.push(line);
  }
  flushPara();
  flushList();
  return out.join('\n');
}

function replaceMeta(html, attribute, name, content) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<meta\\s+[^>]*?\\b${attribute}="${escapedName}"[^>]*?\\/?>`, 'i');
  const extraAttr = attribute === 'property' && name === 'og:image' ? 'name="image" ' : '';
  if (pattern.test(html)) {
    return html.replace(pattern, `<meta ${extraAttr}${attribute}="${name}" content="${escapeHtml(content)}" />`);
  }
  return html.replace('</head>', `    <meta ${extraAttr}${attribute}="${name}" content="${escapeHtml(content)}" />\n  </head>`);
}

function removeMeta(html, attribute, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<meta\\s+[^>]*?\\b${attribute}="${escapedName}"[^>]*?\\/?>\\s*`, 'i');
  return html.replace(pattern, '');
}

function injectDynamicJsonLd(html, schemaObj) {
  const jsonText = JSON.stringify(schemaObj).replace(/<\//g, '<\\/');
  const placeholderPattern = /<script id="dynamic-seo-jsonld" type="application\/ld\+json">[\s\S]*?<\/script>/;
  if (placeholderPattern.test(html)) {
    return html.replace(
      placeholderPattern,
      `<script id="dynamic-seo-jsonld" type="application/ld+json">${jsonText}</script>`
    );
  }
  return html.replace('</head>', `<script id="dynamic-seo-jsonld" type="application/ld+json">${jsonText}</script>\n</head>`);
}

function renderSsrHeader(activePath) {
  const navLinks = PRIMARY_NAV.map((item) => {
    const isActive =
      activePath === item.path ||
      (item.path === '/blog' && activePath.startsWith('/blog/')) ||
      (item.path === '/learn' && activePath.startsWith('/learn'));
    return `<li><a class="nav-link${isActive ? ' active' : ''}" href="${item.path}">${escapeHtml(item.label)}</a></li>`;
  }).join('');

  return `
    <a href="#main-content" class="skip-link">Skip to main content</a>
    <header class="site-header">
      <div id="scroll-progress-bar" class="scroll-progress-bar" aria-hidden="true"></div>
      <div class="container nav-inner">
        <a href="/" class="brand-logo" aria-label="YOLETECH Home">
          <span class="brand-icon-box"><span class="y">Y</span><span class="t">T</span></span>
          <span class="brand-wordmark">
            <span class="yole">YOLE</span><span class="tech">TECH</span>
          </span>
        </a>
        <nav aria-label="Primary navigation">
          <ul class="nav-links">${navLinks}</ul>
        </nav>
        <div class="nav-actions">
          <div class="nav-auth-group">
            <a href="/login" class="btn btn-outline btn-sm">Client Login</a>
            <a href="/register" class="btn btn-lime btn-sm">Create Account</a>
          </div>
        </div>
      </div>
    </header>
  `;
}

function renderSsrFooter() {
  const year = new Date().getFullYear();
  return `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-columns">
          <div class="footer-col">
            <a href="/" class="brand-logo" aria-label="YOLETECH Home">
              <span class="brand-icon-box"><span class="y">Y</span><span class="t">T</span></span>
              <span class="brand-wordmark"><span class="yole">YOLE</span><span class="tech">TECH</span></span>
            </a>
            <p class="footer-col-desc">Data analytics, executive business intelligence, workflow automation, full-stack web development, and practical tech training.</p>
            <p class="footer-col-meta">${escapeHtml(OWNER.serviceArea)}</p>
          </div>
          <div class="footer-col">
            <h2 class="footer-col-title">Quick Links</h2>
            <ul class="footer-plain-links">
              <li><a href="/">Home</a></li>
              <li><a href="/services">Services</a></li>
              <li><a href="/portfolio">Portfolio</a></li>
              <li><a href="/learn">Learn</a></li>
              <li><a href="/blog">Blog</a></li>
              <li><a href="/about">About</a></li>
              <li><a href="/contact">Contact</a></li>
            </ul>
          </div>
          <div class="footer-col">
            <h2 class="footer-col-title">Services</h2>
            <ul class="footer-plain-links">
              ${CORE_SERVICES.slice(0, 5)
                .map((s) => `<li><a href="/services#${s.id}">${escapeHtml(s.title)}</a></li>`)
                .join('')}
            </ul>
          </div>
          <div class="footer-col">
            <h2 class="footer-col-title">Legal &amp; Contact</h2>
            <ul class="footer-plain-links">
              <li><a href="/privacy">Privacy Policy</a></li>
              <li><a href="/terms">Terms of Service</a></li>
              <li><a href="/cookies">Cookie Notice</a></li>
              <li><a href="mailto:${OWNER.email}">${escapeHtml(OWNER.email)}</a></li>
              <li><a href="${OWNER.socials.github}" target="_blank" rel="noopener noreferrer">GitHub</a></li>
              <li><a href="${OWNER.socials.linkedin}" target="_blank" rel="noopener noreferrer">LinkedIn</a></li>
              <li><a href="${OWNER.socials.youtube}" target="_blank" rel="noopener noreferrer">YouTube</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-legal">
          <span>© ${year} YOLETECH. All rights reserved.</span>
          <span>${escapeHtml(OWNER.location)}</span>
        </div>
      </div>
    </footer>
  `;
}

function buildHomeMainHtml() {
  const featuredProjects = loadAllPortfolioProjects().slice(0, 3);
  const recentPosts = loadAllBlogPosts().slice(0, 3);
  return `
    <main id="main-content" class="home-page-view">
      <section class="hero-section">
        <div class="container hero-slideshow-wrapper">
          <div class="hero-slide-grid">
            <div>
              <div class="eyebrow"><span class="eyebrow-dot"></span> DATA ANALYTICS, BI &amp; FULL-STACK ENGINEERING</div>
              <h1 class="hero-title">Data Analytics, Executive BI &amp; Full-Stack Web Solutions</h1>
              <p class="hero-subtitle">
                YOLETECH helps organizations and teams build reliable full-stack web applications, interactive Power BI and Tableau dashboards, SQL pipelines, and automated workflows.
              </p>
              <div class="hero-cta-row">
                <a href="/contact" class="btn btn-lime">Book a Discovery Call →</a>
                <a href="/portfolio" class="btn btn-outline">View Case Studies</a>
              </div>
            </div>
            <div class="hero-visual-box">
              <div class="portrait-orbit-card">
                <img src="/assets/home-hero-analyst.jpg" alt="Analytics dashboard workspace at YOLETECH" width="960" height="640" fetchpriority="high" decoding="async" />
              </div>
            </div>
          </div>
        </div>

        <div class="service-strip-bar">
          <div class="container">
            <div class="eyebrow" style="margin-bottom:14px;"><span class="eyebrow-dot"></span> CORE DIGITAL &amp; DATA SERVICES</div>
            <h2 class="sr-only">Core Digital &amp; Data Services</h2>
            <div class="service-strip-grid">
              ${CORE_SERVICES.map(
                (srv) => `
                <a href="/services#${srv.id}" class="service-strip-item" style="text-decoration:none;color:inherit;">
                  <div>
                    <div class="service-strip-title">${escapeHtml(srv.title)}</div>
                    <div class="service-strip-sub">${escapeHtml(srv.shortTag)}</div>
                  </div>
                </a>`
              ).join('')}
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="container">
          <div class="section-header">
            <h2 class="section-title">Featured Portfolio Case Studies</h2>
            <p class="section-desc">Explore real dashboards, automation pipelines, and full-stack web systems.</p>
          </div>
          <div class="grid-3">
            ${featuredProjects
              .map(
                (p) => `
              <article class="glass-card">
                <span class="tech-pill lime">${escapeHtml(p.category)}</span>
                <h3 style="margin:10px 0 8px;">${escapeHtml(p.title)}</h3>
                <p style="color:var(--yole-text-muted);font-size:14px;margin-bottom:14px;">${escapeHtml(p.summary)}</p>
                <a href="/portfolio#${encodeURIComponent(p.slug)}" class="btn btn-outline btn-sm">View Case Study →</a>
              </article>`
              )
              .join('')}
          </div>
        </div>
      </section>

      <section class="section section-alt">
        <div class="container">
          <div class="section-header">
            <h2 class="section-title">Latest Technical Articles &amp; Guides</h2>
            <p class="section-desc">Practical walkthroughs on Power BI, SQL, Python automation, and web engineering.</p>
          </div>
          <div class="grid-3">
            ${recentPosts
              .map(
                (post) => `
              <article class="glass-card">
                <span class="tech-pill lime">${escapeHtml(post.category)}</span>
                <h3 style="margin:10px 0 8px;"><a href="/blog/${encodeURIComponent(post.slug)}">${escapeHtml(post.title)}</a></h3>
                <p style="color:var(--yole-text-muted);font-size:14px;margin-bottom:12px;">${escapeHtml(post.summary)}</p>
                <div style="font-size:13px;color:var(--yole-text-muted);">${escapeHtml(post.date)} · ${escapeHtml(post.readTime)}</div>
              </article>`
              )
              .join('')}
          </div>
        </div>
      </section>
    </main>
  `;
}

function buildAboutMainHtml() {
  return `
    <main id="main-content">
      <section class="section">
        <div class="container">
          <div class="hero-slide-grid section-block-gap">
            <div>
              <div class="eyebrow"><span class="eyebrow-dot"></span> ABOUT YOLETECH</div>
              <h1 class="hero-title">About ${escapeHtml(OWNER.name)} &amp; YOLETECH</h1>
              <p class="hero-subtitle">
                ${escapeHtml(OWNER.jobTitle)} based in ${escapeHtml(OWNER.serviceArea)}.
              </p>
              <p style="color:var(--yole-text-muted);margin-bottom:22px;">${escapeHtml(OWNER.bio)}</p>
              <div class="hero-cta-row">
                <a href="/contact" class="btn btn-lime">Book a Discovery Call →</a>
                <a href="/portfolio" class="btn btn-outline">View Case Studies</a>
              </div>
            </div>
            <div class="hero-visual-box">
              <img src="/assets/about-analytics-workspace.jpg" alt="Data analytics and engineering workspace" width="960" height="640" decoding="async" style="border-radius:16px;width:100%;height:auto;" />
            </div>
          </div>

          <section class="section-block-gap" aria-labelledby="about-story-heading">
            <h2 id="about-story-heading" class="section-title">Founder Story &amp; Approach</h2>
            <div class="grid-2">
              <article class="glass-card">
                <h3>Background</h3>
                <p style="color:var(--yole-text-muted);">
                  YOLETECH was founded by ${escapeHtml(OWNER.name)} (${escapeHtml(OWNER.credentials)}) to bridge practical software engineering, reliable SQL data architecture, and clear business intelligence reporting.
                </p>
              </article>
              <article class="glass-card">
                <h3>How We Work</h3>
                <p style="color:var(--yole-text-muted);">
                  Every engagement begins with data and requirements clarity, favors maintainable architectures over bloat, and ends with clear documentation so your team owns the outcome.
                </p>
              </article>
            </div>
          </section>

          <section class="section-block-gap" aria-labelledby="about-tools-heading">
            <h2 id="about-tools-heading" class="section-title">Core Tools &amp; Credentials</h2>
            <div class="grid-2">
              <article class="glass-card">
                <h3>Technical Toolkit</h3>
                <p style="color:var(--yole-text-muted);">Python (Pandas, Scikit-Learn), SQL (SQL Server, MySQL, SQLite), Power BI, Tableau, Microsoft Excel &amp; VBA, JavaScript/TypeScript, React.js, Node.js, HTML5/CSS3, and WordPress.</p>
              </article>
              <article class="glass-card">
                <h3>Academic &amp; Professional Credentials</h3>
                <ul style="padding-left:20px;color:var(--yole-text-muted);">
                  <li>B.Sc. in Computer Science — National Open University of Nigeria (NOUN)</li>
                  <li>M.Sc. in Information Technology (in progress) — NOUN</li>
                  <li>TODO(owner): Add public verification URLs for Google / Coursera / Kaggle certificates</li>
                </ul>
              </article>
            </div>
          </section>
        </div>
      </section>
    </main>
  `;
}

function buildServicesMainHtml() {
  return `
    <main id="main-content">
      <section class="section">
        <div class="container">
          <div class="section-header">
            <div class="eyebrow"><span class="eyebrow-dot"></span> YOLETECH SERVICES</div>
            <h1 class="section-title">Data Analytics, BI, Automation &amp; Web Services</h1>
            <p class="section-desc">Structured engineering, business intelligence, automation, support, and training services tailored to your organization.</p>
            <div style="margin-top:20px;">
              <a href="/contact" class="btn btn-lime">Book a Discovery Call →</a>
            </div>
          </div>

          <div class="grid-2 section-block-gap">
            ${CORE_SERVICES.map(
              (srv) => `
              <article id="${srv.id}" class="glass-card">
                <h2 style="font-size:22px;margin-bottom:8px;">${escapeHtml(srv.title)}</h2>
                <p style="color:var(--yole-text-muted);margin-bottom:14px;">${escapeHtml(srv.scope)}</p>
                <h3 style="font-size:14px;text-transform:uppercase;margin-bottom:8px;">Key Deliverables</h3>
                <ul style="padding-left:20px;margin-bottom:14px;color:var(--yole-text-muted);">
                  ${srv.deliverables.map((d) => `<li>${escapeHtml(d)}</li>`).join('')}
                </ul>
                <p style="font-size:13px;color:var(--yole-text-muted);margin-bottom:10px;"><strong>Tools:</strong> ${escapeHtml(srv.tools.join(', '))}</p>
                <p style="font-size:13px;color:var(--yole-text-muted);margin-bottom:14px;"><strong>Process:</strong> ${escapeHtml(srv.process)}</p>
                <details style="margin-bottom:16px;">
                  <summary style="font-weight:700;cursor:pointer;">${escapeHtml(srv.faq.q)}</summary>
                  <p style="margin-top:8px;color:var(--yole-text-muted);">${escapeHtml(srv.faq.a)}</p>
                </details>
                <a href="/contact" class="btn btn-lime btn-sm">Book a Discovery Call →</a>
              </article>`
            ).join('')}
          </div>

          <section aria-labelledby="services-process-heading">
            <h2 id="services-process-heading" class="section-title">Our 4-Stage Delivery Process</h2>
            <div class="grid-2">
              ${DELIVERY_PROCESS.map(
                (p) => `
                <article class="glass-card">
                  <h3>${escapeHtml(p.step)}. ${escapeHtml(p.title)}</h3>
                  <p style="color:var(--yole-text-muted);">${escapeHtml(p.detail)}</p>
                </article>`
              ).join('')}
            </div>
          </section>
        </div>
      </section>
    </main>
  `;
}

function buildPortfolioMainHtml() {
  const projects = loadAllPortfolioProjects();
  return `
    <main id="main-content">
      <section class="section">
        <div class="container">
          <div class="section-header">
            <div class="eyebrow"><span class="eyebrow-dot"></span> PORTFOLIO &amp; CASE STUDIES</div>
            <h1 class="section-title">BI, Automation &amp; Web Case Studies</h1>
            <p class="section-desc">Selected dashboards, machine learning apps, and workflow automation systems built by YOLETECH.</p>
          </div>
          <div class="grid-2">
            ${projects
              .map(
                (p) => `
              <article id="${escapeHtml(p.slug)}" class="glass-card">
                <img src="${escapeHtml(p.preview_image)}" alt="${escapeHtml(p.title)}" width="640" height="360" loading="lazy" decoding="async" style="width:100%;height:auto;border-radius:12px;margin-bottom:14px;" />
                <span class="tech-pill lime">${escapeHtml(p.category)}</span>
                <h2 style="font-size:21px;margin:10px 0 8px;">${escapeHtml(p.title)}</h2>
                <p style="color:var(--yole-text-muted);margin-bottom:12px;">${escapeHtml(p.summary || 'TODO(owner): Add problem, approach, and outcome summary for this case study.')}</p>
                ${p.tech_stack.length ? `<p style="font-size:13px;color:var(--yole-text-muted);margin-bottom:12px;"><strong>Tools:</strong> ${escapeHtml(p.tech_stack.join(', '))}</p>` : ''}
                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                  ${p.demo_url ? `<a href="${escapeHtml(p.demo_url)}" class="btn btn-lime btn-sm">View Case Study →</a>` : `<a href="/contact" class="btn btn-outline btn-sm">Book a Discovery Call</a>`}
                </div>
              </article>`
              )
              .join('')}
          </div>
        </div>
      </section>
    </main>
  `;
}

function buildLearnMainHtml() {
  const { courses, content } = loadPublishedLearnDataForSeo();
  const headline = content?.headline || 'Build In-Demand Tech Skills. Learn by Doing.';
  const subheadline =
    content?.subheadline ||
    'Hands-on training in web development, data analytics, AI automation, and IT—guided step by step from day one.';
  const faqs = Array.isArray(content?.faq) ? content.faq : [];

  return `
    <main id="main-content" class="learn-page">
      <section class="learn-hero-section">
        <div class="container">
          <div class="learn-hero-card">
            <div class="learn-hero-grid">
              <div class="learn-hero-copy">
                <div class="eyebrow"><span class="eyebrow-dot"></span> YOLETECH TRAINING PROGRAMS</div>
                <h1 class="learn-hero-title">${escapeHtml(headline)}</h1>
                <p class="learn-hero-subtitle">${escapeHtml(subheadline)}</p>
                <div class="learn-hero-actions">
                  <a href="#learn-registration-section" class="btn btn-lime">Enroll Now →</a>
                  <a href="/login" class="btn btn-outline">Sign In</a>
                </div>
              </div>
              <div class="learn-hero-media">
                <img src="/assets/learn-hero-learner.jpg" alt="Learner studying practical technology skills on a laptop" class="learn-hero-img" width="1024" height="576" fetchpriority="high" decoding="async" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="learn-courses-section" class="section">
        <div class="container">
          <div class="section-header">
            <h2 class="section-title">Explore Our Training Programs</h2>
            <p class="section-desc">Choose a training track aligned with your goals and enroll below.</p>
          </div>
          <div class="learn-courses-grid">
            ${courses
              .map(
                (c) => `
              <article id="${escapeHtml(c.slug)}" class="glass-card learn-course-card" data-no-card-icon="true">
                <h3 class="learn-course-title">${escapeHtml(c.title)}</h3>
                <div class="learn-course-media">
                  ${
                    c.image_url
                      ? `<img class="learn-course-image" src="${escapeHtml(c.image_url)}" alt="${escapeHtml(c.title)}" width="640" height="400" loading="lazy" decoding="async" />`
                      : `<div class="learn-course-image-fallback"><span>YOLETECH</span></div>`
                  }
                </div>
                <div class="learn-course-card-actions">
                  <a href="#learn-registration-section" class="btn btn-lime btn-sm">Enroll Now</a>
                  <a href="#learn-registration-section" class="btn btn-outline btn-sm">Course Details</a>
                </div>
              </article>`
              )
              .join('')}
          </div>
        </div>
      </section>

      <section id="learn-registration-section" class="section section-alt">
        <div class="container" style="max-width:780px;">
          <h2 class="section-title">Learner Registration</h2>
          <p class="section-desc">Complete the registration form to create your learner account and apply for your selected course. Already enrolled? <a href="/login">Sign in to your Learner Portal</a>.</p>
        </div>
      </section>

      ${
        faqs.length
          ? `
      <section class="section">
        <div class="container" style="max-width:840px;">
          <h2 class="section-title">Frequently Asked Questions</h2>
          <div class="learn-faq-list">
            ${faqs
              .map(
                (f) => `
              <details class="learn-faq-item">
                <summary class="learn-faq-summary">${escapeHtml(f.question)}</summary>
                <p class="learn-faq-answer">${escapeHtml(f.answer)}</p>
              </details>`
              )
              .join('')}
          </div>
        </div>
      </section>`
          : ''
      }
    </main>
  `;
}

function buildBlogIndexMainHtml() {
  const posts = loadAllBlogPosts();
  return `
    <main id="main-content">
      <section class="section">
        <div class="container">
          <div class="section-header">
            <div class="eyebrow"><span class="eyebrow-dot"></span> INSIGHTS &amp; TUTORIALS</div>
            <h1 class="section-title">YOLETECH Blog &amp; Technical Tutorials</h1>
            <p class="section-desc">Practical articles on data analytics, Power BI, SQL, Python automation, and full-stack web engineering.</p>
          </div>
          <div class="grid-3">
            ${posts
              .map(
                (post) => `
              <article class="glass-card blog-card">
                ${
                  post.coverImage
                    ? `<div class="blog-card-image"><img src="${escapeHtml(post.coverImage)}" alt="${escapeHtml(post.title)}" width="600" height="400" loading="lazy" decoding="async" /></div>`
                    : ''
                }
                <span class="tech-pill lime">${escapeHtml(post.category)}</span>
                <h2 style="font-size:20px;margin:10px 0 8px;"><a href="/blog/${encodeURIComponent(post.slug)}">${escapeHtml(post.title)}</a></h2>
                <p style="color:var(--yole-text-muted);font-size:14px;margin-bottom:12px;">${escapeHtml(post.summary)}</p>
                <div style="font-size:12.5px;color:var(--yole-text-muted);">
                  By ${escapeHtml(post.author)} · <time datetime="${escapeHtml(post.date)}">${escapeHtml(post.date)}</time> · ${escapeHtml(post.readTime)}
                </div>
              </article>`
              )
              .join('')}
          </div>
        </div>
      </section>
    </main>
  `;
}

function buildContactMainHtml() {
  return `
    <main id="main-content">
      <section class="section">
        <div class="container">
          <div style="max-width:680px;margin-bottom:32px;">
            <div class="eyebrow"><span class="eyebrow-dot"></span> CONTACT YOLETECH</div>
            <h1 class="hero-title">Start a Conversation About Your Project</h1>
            <p style="color:var(--yole-text-muted);">${escapeHtml(OWNER.responseTimeStatement)}</p>
          </div>
          <div class="grid-2" style="align-items:start;">
            <div class="glass-card">
              <h2>Send a Project Inquiry</h2>
              <form action="/api/inquiries" method="post">
                <div class="form-group">
                  <label class="form-label" for="ssr-contact-name">Full Name *</label>
                  <input id="ssr-contact-name" name="name" type="text" required class="form-control" autocomplete="name" />
                </div>
                <div class="form-group">
                  <label class="form-label" for="ssr-contact-email">Email Address *</label>
                  <input id="ssr-contact-email" name="email" type="email" required class="form-control" autocomplete="email" />
                </div>
                <div class="form-group">
                  <label class="form-label" for="ssr-contact-phone">Phone / WhatsApp</label>
                  <input id="ssr-contact-phone" name="phone" type="tel" class="form-control" autocomplete="tel" />
                </div>
                <div class="form-group">
                  <label class="form-label" for="ssr-contact-service">Service *</label>
                  <select id="ssr-contact-service" name="service_category" required class="form-control">
                    ${CORE_SERVICES.map((s) => `<option value="${escapeHtml(s.title)}">${escapeHtml(s.title)}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label" for="ssr-contact-message">Project Details *</label>
                  <textarea id="ssr-contact-message" name="message" rows="5" required class="form-control"></textarea>
                </div>
                <div class="learn-honeypot" aria-hidden="true">
                  <label for="ssr-contact-website">Website</label>
                  <input id="ssr-contact-website" name="website" type="text" tabindex="-1" autocomplete="off" />
                </div>
                <div class="form-group">
                  <label class="learn-consent-label" for="ssr-contact-consent">
                    <input id="ssr-contact-consent" name="consent" type="checkbox" required />
                    <span>I agree to the <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>.</span>
                  </label>
                </div>
                <button type="submit" class="btn btn-lime">Send Message →</button>
              </form>
            </div>
            <div class="glass-card">
              <h2>Direct Contact &amp; Business Hours</h2>
              <p><strong>Email:</strong> <a href="mailto:${OWNER.email}">${escapeHtml(OWNER.email)}</a></p>
              <p><strong>Tap to Call / WhatsApp:</strong> <a href="tel:${OWNER.phoneE164}">${escapeHtml(OWNER.phoneDisplay)}</a> · <a href="${OWNER.whatsappUrl}" target="_blank" rel="noopener noreferrer">Open WhatsApp ↗</a></p>
              <p><strong>Business Hours:</strong> ${escapeHtml(OWNER.workingHours)}</p>
              <p><strong>Service Area:</strong> ${escapeHtml(OWNER.serviceArea)}</p>
              <p><strong>Discovery Call Booking:</strong> ${escapeHtml(OWNER.bookingUrlPlaceholder)}</p>
              <h3 style="margin-top:20px;">Frequently Asked Questions</h3>
              ${CONTACT_FAQS.map(
                (f) => `<details style="margin-top:10px;"><summary style="font-weight:700;">${escapeHtml(f.q)}</summary><p style="margin-top:6px;color:var(--yole-text-muted);">${escapeHtml(f.a)}</p></details>`
              ).join('')}
            </div>
          </div>
        </div>
      </section>
    </main>
  `;
}

function buildLegalMainHtml(kind) {
  if (kind === 'privacy') {
    return `
      <main id="main-content"><section class="section"><div class="container" style="max-width:820px;">
        <div class="eyebrow"><span class="eyebrow-dot"></span> LEGAL — DRAFT FOR OWNER REVIEW</div>
        <h1>Privacy Policy</h1>
        <p style="color:var(--yole-text-muted);">Draft prepared for YOLETECH (${escapeHtml(CANONICAL_ORIGIN)}) referencing the Nigeria Data Protection Act (NDPA) 2023. TODO(owner): Confirm legal entity registration details and Data Protection Officer contact prior to legal sign-off.</p>
        <h2>1. Data We Collect</h2>
        <p>When you submit a contact inquiry, create a client account, or register as a learner, we collect the information you provide (such as full name, email address, phone number, location, organization, and inquiry or course details).</p>
        <h2>2. How We Use Your Data</h2>
        <p>We process personal data solely to respond to inquiries, deliver contracted services, manage learner course enrollments, and maintain account security. We do not sell personal data.</p>
        <h2>3. Your Rights Under the Nigeria Data Protection Act (NDPA)</h2>
        <p>You may request access, correction, portability, restriction, or deletion of your personal data by emailing <a href="mailto:${OWNER.email}">${escapeHtml(OWNER.email)}</a>.</p>
        <h2>4. Retention &amp; Security</h2>
        <p>Passwords are stored with salted cryptographic hashing. Session cookies use HttpOnly and SameSite protections.</p>
      </div></section></main>`;
  }
  if (kind === 'terms') {
    return `
      <main id="main-content"><section class="section"><div class="container" style="max-width:820px;">
        <div class="eyebrow"><span class="eyebrow-dot"></span> LEGAL — DRAFT FOR OWNER REVIEW</div>
        <h1>Terms of Service</h1>
        <p style="color:var(--yole-text-muted);">Draft prepared for YOLETECH (${escapeHtml(CANONICAL_ORIGIN)}). TODO(owner): Review governing jurisdiction, payment/refund terms, and SLA wording with legal counsel.</p>
        <h2>1. Services &amp; Training</h2>
        <p>Project scopes, timelines, and fees for web development, data analytics, automation, support, and training programs are confirmed in writing before work begins.</p>
        <h2>2. Accounts &amp; Acceptable Use</h2>
        <p>You are responsible for safeguarding your login credentials and ensuring submitted information is accurate.</p>
        <h2>3. Intellectual Property</h2>
        <p>Site content, tutorials, and training materials remain the intellectual property of YOLETECH unless explicitly assigned in a signed client agreement.</p>
      </div></section></main>`;
  }
  return `
    <main id="main-content"><section class="section"><div class="container" style="max-width:820px;">
      <div class="eyebrow"><span class="eyebrow-dot"></span> LEGAL — DRAFT FOR OWNER REVIEW</div>
      <h1>Cookie Notice</h1>
      <p style="color:var(--yole-text-muted);">This notice explains how YOLETECH uses cookies and local storage on ${escapeHtml(CANONICAL_ORIGIN)}.</p>
      <h2>1. Essential Storage</h2>
      <p>We use essential session cookies and theme preferences to keep authenticated accounts signed in and remember light/dark mode.</p>
      <h2>2. Optional Analytics Cookies</h2>
      <p>Optional analytics scripts (Google Tag Manager) are only loaded if you explicitly grant consent via the cookie banner. You can change your preference at any time.</p>
    </div></section></main>`;
}

function buildAuthOrAppMainHtml(routePath, title, desc) {
  return `
    <main id="main-content">
      <section class="section">
        <div class="container" style="max-width:600px;">
          <div class="glass-card">
            <h1>${escapeHtml(title)}</h1>
            <p style="color:var(--yole-text-muted);margin:10px 0 18px;">${escapeHtml(desc)}</p>
            <p><a href="/" class="btn btn-outline btn-sm">← Return to Home</a></p>
          </div>
        </div>
      </section>
    </main>
  `;
}

function buildNotFoundMainHtml(pathname) {
  return `
    <main id="main-content">
      <section class="section">
        <div class="container" style="max-width:640px;text-align:center;">
          <div class="glass-card">
            <div class="eyebrow" style="justify-content:center;"><span class="eyebrow-dot"></span> ERROR 404</div>
            <h1>Page Not Found</h1>
            <p style="color:var(--yole-text-muted);margin:12px 0 24px;">
              We could not find <code>${escapeHtml(pathname)}</code>. The page may have moved or the URL may contain a typo.
            </p>
            <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
              <a href="/" class="btn btn-lime">Go to Home →</a>
              <a href="/services" class="btn btn-outline">Explore Services</a>
              <a href="/blog" class="btn btn-outline">Read Blog</a>
              <a href="/contact" class="btn btn-outline">Contact Us</a>
            </div>
          </div>
        </div>
      </section>
    </main>
  `;
}

const ROUTE_SEO_CONFIG = {
  '/': {
    title: 'YOLETECH | Data Analytics, BI & Full-Stack Web Services',
    description:
      'YOLETECH builds full-stack web apps, Power BI & Tableau dashboards, Python/SQL automation, and practical tech training.',
    schemaType: 'WebPage',
    indexable: true
  },
  '/about': {
    title: 'About John Oruebi Eniekpo | YOLETECH',
    description:
      'Meet John Oruebi Eniekpo, Data Analyst, BI Specialist, and Full-Stack Web Developer behind YOLETECH in Nigeria and remote.',
    schemaType: 'AboutPage',
    indexable: true
  },
  '/services': {
    title: 'Data Analytics, BI, Automation & Web Services | YOLETECH',
    description:
      'Explore YOLETECH services: full-stack web development, Power BI & Tableau BI, AI workflow automation, IT support, and training.',
    schemaType: 'CollectionPage',
    indexable: true
  },
  '/portfolio': {
    title: 'Portfolio & Case Studies | YOLETECH',
    description:
      'Explore YOLETECH case studies across Power BI dashboards, Python machine learning apps, workflow automation, and web platforms.',
    schemaType: 'CollectionPage',
    indexable: true
  },
  '/learn': {
    title: 'Learn Tech Skills & Training Programs | YOLETECH',
    description:
      'Hands-on training in web development, data analytics, AI automation, and IT—guided step by step from day one.',
    schemaType: 'CollectionPage',
    indexable: true
  },
  '/blog': {
    title: 'Blog & Tech Tutorials | YOLETECH',
    description:
      'Practical tutorials and guides on Power BI, SQL, Python automation, machine learning, and full-stack web engineering.',
    schemaType: 'CollectionPage',
    indexable: true
  },
  '/contact': {
    title: 'Contact YOLETECH | Book a Discovery Call',
    description:
      'Contact YOLETECH for full-stack web development, BI dashboards, SQL pipelines, automation, or training. Responses in 1 business day.',
    schemaType: 'ContactPage',
    indexable: true
  },
  '/privacy': {
    title: 'Privacy Policy | YOLETECH',
    description: 'How YOLETECH collects, uses, and protects your personal data under the Nigeria Data Protection Act (NDPA).',
    schemaType: 'WebPage',
    indexable: true
  },
  '/terms': {
    title: 'Terms of Service | YOLETECH',
    description: 'Terms governing YOLETECH digital services, client portal accounts, and training program registrations.',
    schemaType: 'WebPage',
    indexable: true
  },
  '/cookies': {
    title: 'Cookie Notice | YOLETECH',
    description: 'Details on essential cookies, session storage, and optional analytics consent on YOLETECH.',
    schemaType: 'WebPage',
    indexable: true
  },
  '/testimonials': {
    title: 'Client Testimonials | YOLETECH',
    description: 'Client feedback and project endorsements submitted to YOLETECH.',
    schemaType: 'CollectionPage',
    indexable: false
  },
  '/dashboard': {
    title: 'Analytics Dashboard | YOLETECH',
    description: 'Authenticated YOLETECH client and operations analytics dashboard.',
    schemaType: 'WebPage',
    indexable: false
  },
  '/learn/dashboard': {
    title: 'Learner Portal | YOLETECH',
    description: 'View your YOLETECH learner profile and course enrollment status.',
    schemaType: 'WebPage',
    indexable: false
  },
  '/login': {
    title: 'Sign In | YOLETECH Portal',
    description: 'Sign in to your YOLETECH Client Portal or Learner Portal.',
    schemaType: 'WebPage',
    indexable: false
  },
  '/register': {
    title: 'Create Account | YOLETECH Client Portal',
    description: 'Create a YOLETECH Client Portal account to request projects and track deliverables.',
    schemaType: 'WebPage',
    indexable: false
  },
  '/portal': {
    title: 'Client Portal | YOLETECH',
    description: 'Manage your YOLETECH project requests, deliverables, and account settings.',
    schemaType: 'WebPage',
    indexable: false
  },
  '/admin-dashboard': {
    title: 'Admin Dashboard | YOLETECH',
    description: 'Authenticated YOLETECH administration workspace.',
    schemaType: 'WebPage',
    indexable: false
  }
};

function buildBreadcrumbJsonLd(origin, crumbs) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: c.name,
      item: `${origin}${c.path}`
    }))
  };
}

function replaceAppRootHtml(html, innerHtml) {
  const startMarker = '<div id="app-root">';
  const startIdx = html.indexOf(startMarker);
  if (startIdx === -1) return html;
  const endMarker = '\n  <!-- FLOATING CONTACT WIDGET';
  let endIdx = html.indexOf(endMarker, startIdx);
  if (endIdx === -1) {
    endIdx = html.indexOf('</div>\n\n', startIdx);
  }
  if (endIdx === -1) return html;
  return `${html.slice(0, startIdx)}<div id="app-root">\n${innerHtml}\n  </div>${html.slice(endIdx)}`;
}

function renderBlogPage(slug, reqOrigin) {
  if (!slug || path.basename(slug) !== slug || slug === '.' || slug === '..') return null;

  const postPath = path.join(BLOG_DIR, `${slug}.md`);
  if (!fs.existsSync(postPath)) return null;

  const origin = resolveSiteOrigin(reqOrigin);
  const post = readFrontmatter(postPath);
  const title = stripQuotes(post.title) || slug;
  const seoTitle = title.length > 48 ? `${title.slice(0, 47).trim()}… | YOLETECH` : `${title} | YOLETECH`;
  const rawSummary = stripQuotes(post.summary) || `${title} — Technical article by ${OWNER.name} on YOLETECH.`;
  const description = rawSummary.length > 155 ? `${rawSummary.slice(0, 152).trim()}…` : rawSummary;
  const author = stripQuotes(post.author) || OWNER.name;
  const date = stripQuotes(post.date) || '2026-10-15';
  const updated = stripQuotes(post.updated) || date;
  const category = stripQuotes(post.category) || 'Data Analytics & BI';
  const readTime = stripQuotes(post.readTime) || estimateReadTime(post.body);
  const tags = Array.isArray(post.tags) ? post.tags : [];
  const imagePath = stripQuotes(post.coverImage || '');
  let imageUrl = `${origin}/assets/yoletech-social-logo.png`;
  if (imagePath) {
    try {
      const parsedImageUrl = new URL(imagePath, `${origin}/`);
      if (parsedImageUrl.protocol === 'http:' || parsedImageUrl.protocol === 'https:') imageUrl = parsedImageUrl.href;
    } catch {}
  }
  const pageUrl = new URL(`/blog/${encodeURIComponent(slug)}`, `${origin}/`).href;

  let html = fs.readFileSync(INDEX_PATH, 'utf8');
  html = removeMeta(html, 'name', 'keywords');
  html = removeMeta(html, 'property', 'og:image');
  html = removeMeta(html, 'property', 'og:image:secure_url');
  html = removeMeta(html, 'property', 'og:image:width');
  html = removeMeta(html, 'property', 'og:image:height');
  html = removeMeta(html, 'property', 'og:image:alt');
  html = removeMeta(html, 'name', 'twitter:image');
  html = removeMeta(html, 'name', 'twitter:image:alt');
  html = replaceMeta(html, 'name', 'description', description);
  html = replaceMeta(
    html,
    'name',
    'robots',
    'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
  );
  html = replaceMeta(html, 'property', 'og:type', 'article');
  html = replaceMeta(html, 'property', 'og:title', seoTitle);
  html = replaceMeta(html, 'property', 'og:description', description);
  html = replaceMeta(html, 'property', 'og:logo', `${origin}/assets/yoletech-social-logo.png`);
  html = html.replace(
    '</head>',
    `<meta name="image" property="og:image" content="${escapeHtml(imageUrl)}" />\n<meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}" />\n<meta property="og:image:width" content="1200" />\n<meta property="og:image:height" content="630" />\n<meta property="og:image:alt" content="${escapeHtml(title)}" />\n<meta property="article:published_time" content="${escapeHtml(date)}" />\n<meta property="article:modified_time" content="${escapeHtml(updated)}" />\n<meta property="article:section" content="${escapeHtml(category)}" />\n<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />\n<meta name="twitter:image:alt" content="${escapeHtml(title)}" />\n</head>`
  );
  html = replaceMeta(html, 'property', 'og:url', pageUrl);
  html = replaceMeta(html, 'name', 'twitter:title', seoTitle);
  html = replaceMeta(html, 'name', 'twitter:description', description);
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(seoTitle)}</title>`);
  html = html.replace(/<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${escapeHtml(pageUrl)}" />`);

  const plainBodyText = String(post.body || '').replace(/```[\s\S]*?```/g, ' ').trim();
  const wordCount = plainBodyText ? plainBodyText.split(/\s+/).length : 0;

  html = injectDynamicJsonLd(html, {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        headline: title,
        description,
        image: imageUrl,
        url: pageUrl,
        datePublished: date,
        dateModified: updated,
        articleSection: category,
        wordCount,
        inLanguage: 'en',
        author: {
          '@type': 'Person',
          name: author,
          url: `${origin}/about`
        },
        publisher: {
          '@type': 'Organization',
          name: 'YOLETECH',
          logo: {
            '@type': 'ImageObject',
            url: `${origin}/assets/yoletech-icon.png`
          }
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': pageUrl
        }
      },
      buildBreadcrumbJsonLd(origin, [
        { name: 'Home', path: '/' },
        { name: 'Blog', path: '/blog' },
        { name: title, path: `/blog/${encodeURIComponent(slug)}` }
      ])
    ]
  });

  const allPosts = loadAllBlogPosts();
  const seriesName = stripQuotes(post.series || '');
  const seriesPosts = seriesName
    ? allPosts
        .filter((p) => p.series === seriesName)
        .sort((a, b) => (a.seriesPart || 0) - (b.seriesPart || 0))
    : [];
  const related = allPosts.filter((p) => p.slug !== slug && p.category === category).slice(0, 3);
  const articleBodyHtml = renderMarkdownLite(post.body || '');

  const seriesHtml =
    seriesPosts.length > 1
      ? `<aside style="margin:18px 0;padding:14px 16px;border-radius:12px;border:1px solid var(--yole-border-subtle);" aria-label="Article series">
          <strong>Series: ${escapeHtml(seriesName)}</strong>
          <ol style="margin:8px 0 0;padding-left:20px;">
            ${seriesPosts
              .map((sp) =>
                sp.slug === slug
                  ? `<li><strong>Part ${sp.seriesPart || ''}: ${escapeHtml(sp.title)} (Current)</strong></li>`
                  : `<li><a href="/blog/${encodeURIComponent(sp.slug)}">Part ${sp.seriesPart || ''}: ${escapeHtml(sp.title)}</a></li>`
              )
              .join('')}
          </ol>
        </aside>`
      : '';

  const ssrInner = `
    ${renderSsrHeader(`/blog/${slug}`)}
    <main id="main-content" class="container section" style="max-width:860px;">
      <nav aria-label="Breadcrumb" style="margin-bottom:18px;font-size:13.5px;">
        <a href="/">Home</a> / <a href="/blog">Blog</a> / <span>${escapeHtml(title)}</span>
      </nav>
      <article class="glass-card article-detail-card">
        <div style="font-size:13px;color:var(--yole-text-muted);margin-bottom:10px;">
          <span>${escapeHtml(category)}</span> · Published <time datetime="${escapeHtml(date)}">${escapeHtml(date)}</time>${updated !== date ? ` · Updated <time datetime="${escapeHtml(updated)}">${escapeHtml(updated)}</time>` : ''} · ${escapeHtml(readTime)}
        </div>
        <h1>${escapeHtml(title)}</h1>
        <p style="font-size:14px;color:var(--yole-text-muted);margin:10px 0 18px;">By <strong>${escapeHtml(author)}</strong> — ${escapeHtml(OWNER.jobTitle)}</p>
        ${imagePath ? `<img src="${escapeHtml(imagePath)}" alt="${escapeHtml(title)}" width="960" height="540" decoding="async" style="width:100%;height:auto;border-radius:12px;margin-bottom:20px;" />` : ''}
        <p><strong>${escapeHtml(rawSummary)}</strong></p>
        ${seriesHtml}
        <div class="article-content">${articleBodyHtml}</div>
        ${
          tags.length
            ? `<div style="margin-top:20px;display:flex;gap:8px;flex-wrap:wrap;">${tags.map((t) => `<span class="tech-pill">${escapeHtml(t)}</span>`).join('')}</div>`
            : ''
        }
      </article>
      ${
        related.length
          ? `<section style="margin-top:32px;" aria-labelledby="related-posts-heading">
              <h2 id="related-posts-heading">Related Articles</h2>
              <ul>${related.map((r) => `<li><a href="/blog/${encodeURIComponent(r.slug)}">${escapeHtml(r.title)}</a></li>`).join('')}</ul>
            </section>`
          : ''
      }
    </main>
    ${renderSsrFooter()}
  `;

  html = replaceAppRootHtml(html, ssrInner);
  return html;
}

function renderRouteSeoHtml(pathname, reqOrigin) {
  const cleanPath = pathname === '/' ? '/' : `/${String(pathname || '').replace(/^\/+|\/+$/g, '')}`;
  if (cleanPath.startsWith('/blog/')) {
    const slug = cleanPath.slice('/blog/'.length);
    return renderBlogPage(slug, reqOrigin);
  }

  const origin = resolveSiteOrigin(reqOrigin);
  const logoUrl = `${origin}/assets/yoletech-social-logo.png`;
  const cfg = ROUTE_SEO_CONFIG[cleanPath];
  if (!cfg) {
    return null;
  }

  const pageUrl = new URL(cleanPath === '/' ? '/' : cleanPath, `${origin}/`).href;
  let title = cfg.title;
  let description = cfg.description;
  let html = fs.readFileSync(INDEX_PATH, 'utf8');
  html = removeMeta(html, 'name', 'keywords');

  const graph = [];

  if (cleanPath === '/learn') {
    const { courses, content } = loadPublishedLearnDataForSeo();
    if (content && content.subheadline && content.subheadline.length <= 155) {
      description = content.subheadline;
    }
    const courseItems = courses.map((course, idx) => {
      const courseNode = {
        '@type': 'Course',
        name: String(course.title),
        description: String(course.short_description),
        url: `${origin}/learn#${encodeURIComponent(String(course.slug))}`,
        provider: {
          '@type': 'Organization',
          '@id': `${origin}/#organization`,
          name: 'YOLETECH',
          sameAs: `${origin}/`
        },
        educationalLevel: String(course.level || 'Beginner'),
        hasCourseInstance: {
          '@type': 'CourseInstance',
          courseMode: String(course.mode || 'online')
        }
      };
      if (course.image_url && typeof course.image_url === 'string') {
        const rawImg = course.image_url.trim();
        if (rawImg && !rawImg.startsWith('data:')) {
          try {
            const parsedImg = new URL(rawImg, `${origin}/`);
            if (parsedImg.protocol === 'http:' || parsedImg.protocol === 'https:') {
              courseNode.image = parsedImg.href;
            }
          } catch {}
        }
      }
      if (course.duration && String(course.duration).trim()) {
        courseNode.timeRequired = String(course.duration).trim();
      }
      if (course.price && String(course.price).trim()) {
        courseNode.offers = {
          '@type': 'Offer',
          description: String(course.price).trim(),
          category: 'Paid'
        };
      }
      return { '@type': 'ListItem', position: idx + 1, item: courseNode };
    });

    graph.push({
      '@type': 'ItemList',
      name: content?.headline || title,
      description,
      url: pageUrl,
      itemListElement: courseItems
    });
    graph.push(buildBreadcrumbJsonLd(origin, [{ name: 'Home', path: '/' }, { name: 'Learn', path: '/learn' }]));
    if (content && Array.isArray(content.faq) && content.faq.length > 0) {
      graph.push({
        '@type': 'FAQPage',
        mainEntity: content.faq.map((f) => ({
          '@type': 'Question',
          name: String(f.question),
          acceptedAnswer: { '@type': 'Answer', text: String(f.answer) }
        }))
      });
    }
  } else if (cleanPath === '/about') {
    graph.push({
      '@type': 'AboutPage',
      name: title,
      description,
      url: pageUrl,
      isPartOf: { '@id': `${origin}/#website` }
    });
    graph.push({
      '@type': 'Person',
      '@id': `${origin}/#founder`,
      name: OWNER.name,
      jobTitle: OWNER.jobTitle,
      url: `${origin}/about`,
      worksFor: { '@id': `${origin}/#organization` },
      sameAs: [OWNER.socials.github, OWNER.socials.linkedin, OWNER.socials.kaggle, OWNER.socials.youtube]
    });
    graph.push(buildBreadcrumbJsonLd(origin, [{ name: 'Home', path: '/' }, { name: 'About', path: '/about' }]));
  } else if (cleanPath === '/services') {
    graph.push({
      '@type': 'CollectionPage',
      name: title,
      description,
      url: pageUrl,
      isPartOf: { '@id': `${origin}/#website` }
    });
    graph.push(buildBreadcrumbJsonLd(origin, [{ name: 'Home', path: '/' }, { name: 'Services', path: '/services' }]));
    graph.push({
      '@type': 'FAQPage',
      mainEntity: CORE_SERVICES.map((s) => ({
        '@type': 'Question',
        name: s.faq.q,
        acceptedAnswer: { '@type': 'Answer', text: s.faq.a }
      }))
    });
  } else if (cleanPath === '/contact') {
    graph.push({
      '@type': 'ContactPage',
      name: title,
      description,
      url: pageUrl,
      isPartOf: { '@id': `${origin}/#website` }
    });
    graph.push(buildBreadcrumbJsonLd(origin, [{ name: 'Home', path: '/' }, { name: 'Contact', path: '/contact' }]));
    graph.push({
      '@type': 'FAQPage',
      mainEntity: CONTACT_FAQS.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a }
      }))
    });
  } else {
    graph.push({
      '@type': cfg.schemaType || 'WebPage',
      name: title,
      description,
      url: pageUrl,
      isPartOf: { '@id': `${origin}/#website` }
    });
    if (cleanPath !== '/') {
      const label = cleanPath.slice(1).replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      graph.push(buildBreadcrumbJsonLd(origin, [{ name: 'Home', path: '/' }, { name: label, path: cleanPath }]));
    }
  }

  html = replaceMeta(html, 'name', 'description', description);
  html = replaceMeta(
    html,
    'name',
    'robots',
    cfg.indexable
      ? 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
      : 'noindex, nofollow'
  );
  html = replaceMeta(html, 'property', 'og:title', title);
  html = replaceMeta(html, 'property', 'og:description', description);
  html = replaceMeta(html, 'property', 'og:url', pageUrl);
  html = replaceMeta(html, 'property', 'og:image', logoUrl);
  html = replaceMeta(html, 'property', 'og:image:secure_url', logoUrl);
  html = replaceMeta(html, 'property', 'og:logo', logoUrl);
  html = replaceMeta(html, 'name', 'twitter:title', title);
  html = replaceMeta(html, 'name', 'twitter:description', description);
  html = replaceMeta(html, 'name', 'twitter:image', logoUrl);
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`);
  html = html.replace(/<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${escapeHtml(pageUrl)}" />`);
  html = injectDynamicJsonLd(html, { '@context': 'https://schema.org', '@graph': graph });

  let mainHtml = '';
  switch (cleanPath) {
    case '/':
      mainHtml = buildHomeMainHtml();
      break;
    case '/about':
      mainHtml = buildAboutMainHtml();
      break;
    case '/services':
      mainHtml = buildServicesMainHtml();
      break;
    case '/portfolio':
      mainHtml = buildPortfolioMainHtml();
      break;
    case '/learn':
      mainHtml = buildLearnMainHtml();
      break;
    case '/blog':
      mainHtml = buildBlogIndexMainHtml();
      break;
    case '/contact':
      mainHtml = buildContactMainHtml();
      break;
    case '/privacy':
      mainHtml = buildLegalMainHtml('privacy');
      break;
    case '/terms':
      mainHtml = buildLegalMainHtml('terms');
      break;
    case '/cookies':
      mainHtml = buildLegalMainHtml('cookies');
      break;
    default:
      mainHtml = buildAuthOrAppMainHtml(cleanPath, title.replace(/\s*\|\s*YOLETECH.*$/, ''), description);
      break;
  }

  const ssrInner = `${renderSsrHeader(cleanPath)}\n${mainHtml}\n${renderSsrFooter()}`;
  html = replaceAppRootHtml(html, ssrInner);
  return html;
}

function renderNotFoundHtml(pathname, reqOrigin) {
  const origin = resolveSiteOrigin(reqOrigin);
  let html = fs.readFileSync(INDEX_PATH, 'utf8');
  html = removeMeta(html, 'name', 'keywords');
  html = replaceMeta(html, 'name', 'robots', 'noindex, nofollow');
  html = replaceMeta(html, 'name', 'description', 'The requested page could not be found on YOLETECH.');
  html = html.replace(/<title>[^<]*<\/title>/, '<title>Page Not Found | YOLETECH</title>');
  html = html.replace(/<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${escapeHtml(origin)}/" />`);
  const ssrInner = `${renderSsrHeader('')}\n${buildNotFoundMainHtml(pathname)}\n${renderSsrFooter()}`;
  return replaceAppRootHtml(html, ssrInner);
}

function renderSitemapXml(reqOrigin) {
  const origin = resolveSiteOrigin(reqOrigin);
  const blogEntries = loadAllBlogPosts().map((post) => ({
    slug: post.slug,
    lastmod: /^\d{4}-\d{2}-\d{2}$/.test(post.updated || post.date) ? (post.updated || post.date) : ''
  }));
  const latestBlogDate = blogEntries.find((b) => b.lastmod)?.lastmod || '';

  const staticRoutes = [
    { path: '/', changefreq: 'weekly', priority: '1.0' },
    { path: '/services', changefreq: 'weekly', priority: '0.9' },
    { path: '/portfolio', changefreq: 'weekly', priority: '0.9' },
    { path: '/learn', changefreq: 'weekly', priority: '0.9' },
    { path: '/blog', changefreq: 'weekly', priority: '0.85', lastmod: latestBlogDate },
    { path: '/about', changefreq: 'monthly', priority: '0.85' },
    { path: '/contact', changefreq: 'monthly', priority: '0.8' },
    { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
    { path: '/terms', changefreq: 'yearly', priority: '0.3' },
    { path: '/cookies', changefreq: 'yearly', priority: '0.3' }
  ];

  const urls = staticRoutes.map(
    (r) => `  <url>
    <loc>${escapeHtml(`${origin}${r.path}`)}</loc>${r.lastmod ? `\n    <lastmod>${r.lastmod}</lastmod>` : ''}
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`
  );

  for (const entry of blogEntries) {
    urls.push(`  <url>
    <loc>${escapeHtml(`${origin}/blog/${encodeURIComponent(entry.slug)}`)}</loc>${entry.lastmod ? `\n    <lastmod>${entry.lastmod}</lastmod>` : ''}
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

const RSS_MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml'
};

function escapeCdata(value) {
  return String(value || '').replace(/\]\]>/g, ']]]]><![CDATA[>');
}

function toRfc822Date(dateStr, fallbackTimeMs) {
  const clean = stripQuotes(dateStr);
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const parsed = new Date(`${clean}T09:00:00.000Z`);
    if (!Number.isNaN(parsed.getTime())) return parsed.toUTCString();
  }
  const parsed = new Date(clean || fallbackTimeMs || Date.now());
  return Number.isNaN(parsed.getTime()) ? new Date().toUTCString() : parsed.toUTCString();
}

function renderRssFeedXml(reqOrigin, feedPath = '/rss.xml') {
  const origin = resolveSiteOrigin(reqOrigin);
  const feedUrl = new URL(feedPath, `${origin}/`).href;
  const blogUrl = `${origin}/blog`;
  const logoUrl = `${origin}/assets/yoletech-social-logo.png`;

  const posts = loadAllBlogPosts().map((post) => {
    const postUrl = new URL(`/blog/${encodeURIComponent(post.slug)}`, `${origin}/`).href;
    let imageUrl = logoUrl;
    if (post.coverImage) {
      try {
        const parsedImg = new URL(post.coverImage, `${origin}/`);
        if (parsedImg.protocol === 'http:' || parsedImg.protocol === 'https:') imageUrl = parsedImg.href;
      } catch {}
    }
    const imgExt = path.extname(imageUrl.split('?')[0]).toLowerCase();
    const imgMime = RSS_MIME_BY_EXT[imgExt] || 'image/png';
    let imgBytes = 0;
    if (post.coverImage && post.coverImage.startsWith('/')) {
      const localImg = path.join(ROOT_DIR, 'public', post.coverImage.replace(/^\/+/, ''));
      try {
        if (fs.existsSync(localImg)) imgBytes = fs.statSync(localImg).size;
      } catch {}
    }
    return {
      ...post,
      postUrl,
      imageUrl,
      imgMime,
      imgBytes,
      pubDate: toRfc822Date(post.date, Date.now())
    };
  });

  const lastBuildDate = posts.length ? posts[0].pubDate : new Date().toUTCString();
  const itemsXml = posts
    .map((p) => {
      const enclosureTag = p.imageUrl
        ? `\n      <enclosure url="${escapeHtml(p.imageUrl)}" length="${p.imgBytes}" type="${escapeHtml(p.imgMime)}" />\n      <media:content url="${escapeHtml(p.imageUrl)}" medium="image" type="${escapeHtml(p.imgMime)}" />`
        : '';
      return `    <item>
      <title><![CDATA[${escapeCdata(p.title)}]]></title>
      <link>${escapeHtml(p.postUrl)}</link>
      <guid isPermaLink="true">${escapeHtml(p.postUrl)}</guid>
      <pubDate>${escapeHtml(p.pubDate)}</pubDate>
      <dc:creator><![CDATA[${escapeCdata(p.author)}]]></dc:creator>
      <category><![CDATA[${escapeCdata(p.category)}]]></category>
      <description><![CDATA[${escapeCdata(p.summary)}]]></description>${enclosureTag}
    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>YOLETECH Blog &amp; Tutorials</title>
    <link>${escapeHtml(blogUrl)}</link>
    <description>Practical guides on data analytics, Power BI, SQL, Python automation, and full-stack web engineering by ${escapeHtml(OWNER.name)}.</description>
    <language>en-us</language>
    <lastBuildDate>${escapeHtml(lastBuildDate)}</lastBuildDate>
    <atom:link href="${escapeHtml(feedUrl)}" rel="self" type="application/rss+xml" />
    <image>
      <url>${escapeHtml(logoUrl)}</url>
      <title>YOLETECH Blog &amp; Tutorials</title>
      <link>${escapeHtml(blogUrl)}</link>
    </image>
${itemsXml}
  </channel>
</rss>
`;
}

module.exports = {
  ROUTE_SEO_CONFIG,
  renderBlogPage,
  renderRouteSeoHtml,
  renderNotFoundHtml,
  renderSitemapXml,
  renderRssFeedXml,
  loadAllBlogPosts,
  loadAllPortfolioProjects
};
