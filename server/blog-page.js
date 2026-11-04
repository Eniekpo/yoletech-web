const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.join(__dirname, '..');
const BLOG_DIR = path.join(ROOT_DIR, 'content', 'blog');
const INDEX_PATH = path.join(ROOT_DIR, 'public', 'index.html');
const SITE_ORIGIN = (process.env.SITE_URL || 'https://yoletech.yoletica.com').replace(/\/+$/, '');

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({
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
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (field) {
      currentKey = field[1];
      values[currentKey] = stripQuotes(field[2]);
    } else if (currentKey && /^\s+\S/.test(line)) {
      values[currentKey] += `${values[currentKey] ? ' ' : ''}${stripQuotes(line.trim())}`;
    } else {
      currentKey = null;
    }
  }
  return values;
}

function replaceMeta(html, attribute, name, content) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<meta\\s+[\\s\\S]*?${attribute}="${escapedName}"[\\s\\S]*?\\/?>`, 'i');
  if (pattern.test(html)) {
    return html.replace(pattern, `<meta ${attribute}="${name}" content="${escapeHtml(content)}" />`);
  }
  return html.replace('</head>', `    <meta ${attribute}="${name}" content="${escapeHtml(content)}" />\n  </head>`);
}

function removeMeta(html, attribute, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<meta\\s+${attribute}="${escapedName}"\\s+content="[^"]*"\\s*\\/?>\\s*`);
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

function renderBlogPage(slug) {
  if (!slug || path.basename(slug) !== slug || slug === '.' || slug === '..') return null;

  const postPath = path.join(BLOG_DIR, `${slug}.md`);
  if (!fs.existsSync(postPath)) return null;

  const post = readFrontmatter(postPath);
  const title = stripQuotes(post.title) || slug;
  const description = stripQuotes(post.summary) || `${title} — Technical article by John Oruebi Eniekpo on YOLETECH.`;
  const author = stripQuotes(post.author) || 'John Oruebi Eniekpo';
  const date = stripQuotes(post.date) || '2026-10-15';
  const category = stripQuotes(post.category) || 'Data Analytics & BI';
  const imagePath = stripQuotes(post.coverImage || '');
  let imageUrl = `${SITE_ORIGIN}/assets/dashboard-preview.jpg`;
  if (imagePath) {
    try {
      const parsedImageUrl = new URL(imagePath, `${SITE_ORIGIN}/`);
      if (parsedImageUrl.protocol === 'http:' || parsedImageUrl.protocol === 'https:') imageUrl = parsedImageUrl.href;
    } catch (error) {
      console.warn(`Invalid cover image URL for blog post "${slug}":`, error.message);
    }
  }
  const pageUrl = new URL(`/blog/${encodeURIComponent(slug)}`, `${SITE_ORIGIN}/`).href;

  let html = fs.readFileSync(INDEX_PATH, 'utf8');
  html = removeMeta(html, 'property', 'og:image');
  html = removeMeta(html, 'name', 'twitter:image');
  html = replaceMeta(html, 'name', 'description', description);
  html = replaceMeta(html, 'property', 'og:type', 'article');
  html = replaceMeta(html, 'property', 'og:title', title);
  html = replaceMeta(html, 'property', 'og:description', description);
  if (imageUrl) {
    html = html.replace(
      '</head>',
      `<meta property="og:image" content="${escapeHtml(imageUrl)}" />\n<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />\n</head>`
    );
  }
  html = replaceMeta(html, 'property', 'og:url', pageUrl);
  html = replaceMeta(html, 'name', 'twitter:title', title);
  html = replaceMeta(html, 'name', 'twitter:description', description);
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)} | YOLETECH</title>`);
  html = html.replace(
    /<link rel="canonical" href="[^"]*"\s*\/>/,
    `<link rel="canonical" href="${escapeHtml(pageUrl)}" />`
  );

  html = injectDynamicJsonLd(html, {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description,
    image: imageUrl,
    datePublished: date,
    dateModified: date,
    articleSection: category,
    author: {
      '@type': 'Person',
      name: author,
      url: `${SITE_ORIGIN}/about`
    },
    publisher: {
      '@type': 'Organization',
      name: 'YOLETECH',
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_ORIGIN}/assets/yoletech-icon.png`
      }
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': pageUrl
    }
  });

  const plainParagraphs = String(post.body || '')
    .replace(/```[\s\S]*?```/g, '')
    .split(/\r?\n\r?\n/)
    .map((p) => p.replace(/^#+\s+/gm, '').trim())
    .filter(Boolean)
    .slice(0, 6)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join('\n');

  const articleHtml = `
    <div id="app-root">
      <header class="site-header">
        <div class="container nav-inner">
          <a href="/" class="brand-logo"><strong>YOLETECH</strong></a>
          <nav aria-label="Primary Navigation">
            <ul class="nav-links">
              <li><a class="nav-link" href="/dashboard">Dashboard</a></li>
              <li><a class="nav-link" href="/about">About</a></li>
              <li><a class="nav-link" href="/services">Services</a></li>
              <li><a class="nav-link" href="/portfolio">Portfolio</a></li>
              <li><a class="nav-link" href="/testimonials">Testimonials</a></li>
              <li><a class="nav-link active" href="/blog">Blog</a></li>
              <li><a class="nav-link" href="/contact">Contact</a></li>
            </ul>
          </nav>
        </div>
      </header>
      <main class="container section">
        <article>
          <p><a href="/blog">← Back to All Articles</a></p>
          <h1>${escapeHtml(title)}</h1>
          <p>Published <time datetime="${escapeHtml(date)}">${escapeHtml(date)}</time> by <strong>${escapeHtml(author)}</strong> in <span>${escapeHtml(category)}</span></p>
          <p><strong>${escapeHtml(description)}</strong></p>
          ${plainParagraphs}
        </article>
      </main>
    </div>`;

  html = html.replace(/<div id="app-root">[\s\S]*?<\/main>\s*<\/div>/, articleHtml);
  return html;
}

const ROUTE_SEO_CONFIG = {
  '/': {
    title: 'YOLETECH | Executive Business Intelligence, Analytics & Full-Stack Solutions',
    description:
      'YOLETECH — Executive Business Intelligence, Interactive Power BI & Tableau Dashboards, SQL Data Pipelines & Full-Stack Web Development by John Oruebi Eniekpo, B.Sc.',
    h1: 'YOLETECH — Executive Business Intelligence, Data Analytics & Full-Stack Web Development',
    schemaType: 'WebPage'
  },
  '/about': {
    title: 'About John Oruebi Eniekpo | Data Analyst, BI Specialist & Full-Stack Developer — YOLETECH',
    description:
      'Learn about John Oruebi Eniekpo, B.Sc., Lead Data Analyst, Business Intelligence Specialist, and Full-Stack Web Developer behind YOLETECH in Yenagoa, Bayelsa State, Nigeria.',
    h1: 'About John Oruebi Eniekpo — The Developer, Analyst & Automator Behind YOLETECH',
    schemaType: 'AboutPage'
  },
  '/services': {
    title: 'Data Analytics, Power BI, Automation & Full-Stack Web Services | YOLETECH',
    description:
      'Explore YOLETECH services: Full-Stack Web Development, Power BI & Tableau Dashboards, Python & Excel VBA Workflow Automation, SQL Database Governance, and Tech Mentorship.',
    h1: 'Web Development, Data Analytics & Automated Systems for Growing Businesses',
    schemaType: 'CollectionPage'
  },
  '/portfolio': {
    title: 'Portfolio & Case Studies | Data Analytics, BI & Full-Stack Web Projects — YOLETECH',
    description:
      'Explore verified case studies and portfolio projects delivered by YOLETECH across Power BI, Tableau, Python Machine Learning, Streamlit, React.js, and SQL databases.',
    h1: 'Proven Data, BI, Automation & Full-Stack Case Studies',
    schemaType: 'CollectionPage'
  },
  '/testimonials': {
    title: 'Client & Mentee Testimonials | Verified Reviews — YOLETECH',
    description:
      'Read verified client testimonials and endorsements from executive stakeholders, research partners, and 200+ data analytics mentees trained by YOLETECH.',
    h1: 'What Stakeholders, Clients & Mentees Say About YOLETECH',
    schemaType: 'CollectionPage'
  },
  '/blog': {
    title: 'Blog & Tutorials | Data Analytics, Power BI, SQL, Python & Web Engineering — YOLETECH',
    description:
      'Practical technical guides, SQL and Python tutorials, Power BI and Tableau dashboard architecture walkthroughs, and full-stack engineering articles by John Oruebi Eniekpo.',
    h1: 'Articles on Data Analytics, BI, Python & Web Engineering',
    schemaType: 'CollectionPage'
  },
  '/contact': {
    title: 'Contact YOLETECH | Book a Discovery Call or Request a Project Proposal',
    description:
      'Contact John Oruebi Eniekpo at YOLETECH (yoletech@yoletica.com | +234 802 552 6389) for Full-Stack Web Development, Power BI Dashboards, SQL Pipelines, and Automation.',
    h1: "Let's Build Something Great Together — Contact YOLETECH",
    schemaType: 'ContactPage'
  },
  '/dashboard': {
    title: 'Executive BI & Client Operations Dashboard | YOLETECH',
    description:
      'Interactive Executive Business Intelligence Dashboard showcasing real-time client metrics, conversion funnels, service distribution, and analytics performance.',
    h1: 'YOLETECH Executive Business Intelligence & Operations Dashboard',
    schemaType: 'WebPage'
  }
};

function renderRouteSeoHtml(pathname) {
  const cleanPath = pathname === '/' ? '/' : `/${String(pathname || '').replace(/^\/+|\/+$/g, '')}`;
  if (cleanPath.startsWith('/blog/')) {
    const slug = cleanPath.slice('/blog/'.length);
    return renderBlogPage(slug);
  }

  const cfg = ROUTE_SEO_CONFIG[cleanPath] || ROUTE_SEO_CONFIG['/'];
  const pageUrl = new URL(cleanPath === '/' ? '/' : cleanPath, `${SITE_ORIGIN}/`).href;

  let html = fs.readFileSync(INDEX_PATH, 'utf8');
  html = replaceMeta(html, 'name', 'description', cfg.description);
  html = replaceMeta(html, 'property', 'og:title', cfg.title);
  html = replaceMeta(html, 'property', 'og:description', cfg.description);
  html = replaceMeta(html, 'property', 'og:url', pageUrl);
  html = replaceMeta(html, 'name', 'twitter:title', cfg.title);
  html = replaceMeta(html, 'name', 'twitter:description', cfg.description);
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(cfg.title)}</title>`);
  html = html.replace(
    /<link rel="canonical" href="[^"]*"\s*\/>/,
    `<link rel="canonical" href="${escapeHtml(pageUrl)}" />`
  );

  html = injectDynamicJsonLd(html, {
    '@context': 'https://schema.org',
    '@type': cfg.schemaType || 'WebPage',
    name: cfg.title,
    description: cfg.description,
    url: pageUrl,
    isPartOf: { '@id': `${SITE_ORIGIN}/#website` }
  });

  return html;
}

function renderSitemapXml() {
  const staticRoutes = [
    { path: '/', changefreq: 'weekly', priority: '1.0' },
    { path: '/services', changefreq: 'weekly', priority: '0.9' },
    { path: '/portfolio', changefreq: 'weekly', priority: '0.9' },
    { path: '/about', changefreq: 'monthly', priority: '0.85' },
    { path: '/blog', changefreq: 'weekly', priority: '0.85' },
    { path: '/testimonials', changefreq: 'weekly', priority: '0.8' },
    { path: '/dashboard', changefreq: 'weekly', priority: '0.8' },
    { path: '/contact', changefreq: 'monthly', priority: '0.8' },
    { path: '/cv.html', changefreq: 'monthly', priority: '0.7' }
  ];

  const urls = staticRoutes.map(
    (r) => `  <url>
    <loc>${escapeHtml(`${SITE_ORIGIN}${r.path}`)}</loc>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`
  );

  if (fs.existsSync(BLOG_DIR)) {
    const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.md'));
    for (const file of files) {
      const slug = path.basename(file, '.md');
      const post = readFrontmatter(path.join(BLOG_DIR, file));
      const lastmod = stripQuotes(post.date);
      urls.push(`  <url>
    <loc>${escapeHtml(`${SITE_ORIGIN}/blog/${encodeURIComponent(slug)}`)}</loc>${
      /^\d{4}-\d{2}-\d{2}$/.test(lastmod) ? `\n    <lastmod>${lastmod}</lastmod>` : ''
    }
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`);
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

module.exports = { renderBlogPage, renderRouteSeoHtml, renderSitemapXml };
