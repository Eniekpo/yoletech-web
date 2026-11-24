const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.join(__dirname, '..');
const BLOG_DIR = path.join(ROOT_DIR, 'content', 'blog');
const INDEX_PATH = path.join(ROOT_DIR, 'public', 'index.html');
const SITE_ORIGIN = (process.env.SITE_URL || 'https://yolestica.com').replace(/\/+$/, '');

function resolveSiteOrigin(reqOrigin) {
  if (reqOrigin && /^https?:\/\/[^/\s]+$/i.test(reqOrigin) && !/localhost|127\.0\.0\.1/i.test(reqOrigin)) {
    return reqOrigin.replace(/\/+$/, '');
  }
  return SITE_ORIGIN;
}

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

function renderBlogPage(slug, reqOrigin) {
  if (!slug || path.basename(slug) !== slug || slug === '.' || slug === '..') return null;

  const postPath = path.join(BLOG_DIR, `${slug}.md`);
  if (!fs.existsSync(postPath)) return null;

  const origin = resolveSiteOrigin(reqOrigin);
  const post = readFrontmatter(postPath);
  const title = stripQuotes(post.title) || slug;
  const description = stripQuotes(post.summary) || `${title} — Technical article by John Oruebi Eniekpo on YOLETECH.`;
  const author = stripQuotes(post.author) || 'John Oruebi Eniekpo';
  const date = stripQuotes(post.date) || '2026-10-15';
  const category = stripQuotes(post.category) || 'Data Analytics & BI';
  const imagePath = stripQuotes(post.coverImage || '');
  let imageUrl = `${origin}/assets/yoletech-social-logo.png`;
  if (imagePath) {
    try {
      const parsedImageUrl = new URL(imagePath, `${origin}/`);
      if (parsedImageUrl.protocol === 'http:' || parsedImageUrl.protocol === 'https:') imageUrl = parsedImageUrl.href;
    } catch (error) {
      console.warn(`Invalid cover image URL for blog post "${slug}":`, error.message);
    }
  }
  const pageUrl = new URL(`/blog/${encodeURIComponent(slug)}`, `${origin}/`).href;

  let html = fs.readFileSync(INDEX_PATH, 'utf8');
  html = removeMeta(html, 'property', 'og:image');
  html = removeMeta(html, 'property', 'og:image:secure_url');
  html = removeMeta(html, 'property', 'og:image:width');
  html = removeMeta(html, 'property', 'og:image:height');
  html = removeMeta(html, 'property', 'og:image:alt');
  html = removeMeta(html, 'name', 'twitter:image');
  html = removeMeta(html, 'name', 'twitter:image:alt');
  html = replaceMeta(html, 'name', 'description', description);
  html = replaceMeta(html, 'property', 'og:type', 'article');
  html = replaceMeta(html, 'property', 'og:title', title);
  html = replaceMeta(html, 'property', 'og:description', description);
  html = replaceMeta(html, 'property', 'og:logo', `${origin}/assets/yoletech-social-logo.png`);
  if (imageUrl) {
    html = html.replace(
      '</head>',
      `<meta name="image" property="og:image" content="${escapeHtml(imageUrl)}" />\n<meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}" />\n<meta property="og:image:alt" content="${escapeHtml(title)}" />\n<meta property="article:published_time" content="${escapeHtml(date)}" />\n<meta property="article:section" content="${escapeHtml(category)}" />\n<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />\n<meta name="twitter:image:alt" content="${escapeHtml(title)}" />\n</head>`
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

  const plainBodyText = String(post.body || '').replace(/```[\s\S]*?```/g, ' ').trim();
  const wordCount = plainBodyText ? plainBodyText.split(/\s+/).length : 0;

  html = injectDynamicJsonLd(html, {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description,
    image: imageUrl,
    url: pageUrl,
    datePublished: date,
    dateModified: date,
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
  });

  const plainParagraphs = String(post.body || '')
    .replace(/```[\s\S]*?```/g, '')
    .split(/\r?\n\r?\n/)
    .map((p) => p.replace(/^#+\s+/gm, '').trim())
    .filter(Boolean)
    .slice(0, 12)
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
              <li><a class="nav-link" href="/blog">Blog</a></li>
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
          ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" />` : ''}
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
      'Contact John Oruebi Eniekpo at YOLETECH (yoletech@yolestica.com | +234 802 552 6389) for Full-Stack Web Development, Power BI Dashboards, SQL Pipelines, and Automation.',
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

function renderRouteSeoHtml(pathname, reqOrigin) {
  const cleanPath = pathname === '/' ? '/' : `/${String(pathname || '').replace(/^\/+|\/+$/g, '')}`;
  if (cleanPath.startsWith('/blog/')) {
    const slug = cleanPath.slice('/blog/'.length);
    return renderBlogPage(slug, reqOrigin);
  }

  const origin = resolveSiteOrigin(reqOrigin);
  const logoUrl = `${origin}/assets/yoletech-social-logo.png`;
  const cfg = ROUTE_SEO_CONFIG[cleanPath] || ROUTE_SEO_CONFIG['/'];
  const pageUrl = new URL(cleanPath === '/' ? '/' : cleanPath, `${origin}/`).href;

  let html = fs.readFileSync(INDEX_PATH, 'utf8');
  html = replaceMeta(html, 'name', 'description', cfg.description);
  html = replaceMeta(html, 'property', 'og:title', cfg.title);
  html = replaceMeta(html, 'property', 'og:description', cfg.description);
  html = replaceMeta(html, 'property', 'og:url', pageUrl);
  html = replaceMeta(html, 'property', 'og:image', logoUrl);
  html = replaceMeta(html, 'property', 'og:image:secure_url', logoUrl);
  html = replaceMeta(html, 'property', 'og:logo', logoUrl);
  html = replaceMeta(html, 'name', 'twitter:title', cfg.title);
  html = replaceMeta(html, 'name', 'twitter:description', cfg.description);
  html = replaceMeta(html, 'name', 'twitter:image', logoUrl);
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
    isPartOf: { '@id': `${origin}/#website` }
  });

  if (cleanPath !== '/') {
    html = html.replace(
      /<h1 class="hero-title">[\s\S]*?<\/h1>/,
      `<h1 class="hero-title">${escapeHtml(cfg.h1)}</h1>`
    );
    html = html.replace(
      /<p class="hero-subtitle">[\s\S]*?<\/p>/,
      `<p class="hero-subtitle">${escapeHtml(cfg.description)}</p>`
    );

    if (cleanPath === '/blog' && fs.existsSync(BLOG_DIR)) {
      const blogLinks = fs
        .readdirSync(BLOG_DIR)
        .filter((f) => f.endsWith('.md'))
        .map((file) => {
          const slug = path.basename(file, '.md');
          const post = readFrontmatter(path.join(BLOG_DIR, file));
          const postTitle = stripQuotes(post.title) || slug;
          const postDate = stripQuotes(post.date) || '';
          return {
            slug,
            title: postTitle,
            date: postDate,
            summary: stripQuotes(post.summary) || ''
          };
        })
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .map(
          (p) =>
            `<li><a href="/blog/${encodeURIComponent(p.slug)}">${escapeHtml(p.title)}</a>${p.summary ? ` — ${escapeHtml(p.summary)}` : ''}</li>`
        )
        .join('\n');

      if (blogLinks) {
        html = html.replace(
          '</main>',
          `<section class="container section" aria-label="Published Blog Articles"><h2>Latest Articles</h2><ul>\n${blogLinks}\n</ul></section>\n</main>`
        );
      }
    }
  }

  return html;
}

function renderSitemapXml(reqOrigin) {
  const origin = resolveSiteOrigin(reqOrigin);
  const blogEntries = [];
  if (fs.existsSync(BLOG_DIR)) {
    const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.md'));
    for (const file of files) {
      const slug = path.basename(file, '.md');
      const post = readFrontmatter(path.join(BLOG_DIR, file));
      const lastmod = stripQuotes(post.date);
      blogEntries.push({
        slug,
        lastmod: /^\d{4}-\d{2}-\d{2}$/.test(lastmod) ? lastmod : ''
      });
    }
    blogEntries.sort((a, b) => (a.lastmod < b.lastmod ? 1 : -1));
  }
  const latestBlogDate = blogEntries.find((b) => b.lastmod)?.lastmod || '';

  const staticRoutes = [
    { path: '/', changefreq: 'weekly', priority: '1.0' },
    { path: '/services', changefreq: 'weekly', priority: '0.9' },
    { path: '/portfolio', changefreq: 'weekly', priority: '0.9' },
    { path: '/about', changefreq: 'monthly', priority: '0.85' },
    { path: '/blog', changefreq: 'weekly', priority: '0.85', lastmod: latestBlogDate },
    { path: '/testimonials', changefreq: 'weekly', priority: '0.8' },
    { path: '/dashboard', changefreq: 'weekly', priority: '0.8' },
    { path: '/contact', changefreq: 'monthly', priority: '0.8' },
    { path: '/cv.html', changefreq: 'monthly', priority: '0.7' }
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

  const posts = [];
  if (fs.existsSync(BLOG_DIR)) {
    const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.md'));
    for (const file of files) {
      const fullPath = path.join(BLOG_DIR, file);
      const slug = path.basename(file, '.md');
      const post = readFrontmatter(fullPath);
      const stat = fs.statSync(fullPath);
      const dateStr = stripQuotes(post.date) || stat.mtime.toISOString().slice(0, 10);
      const title = stripQuotes(post.title) || slug;
      const summary = stripQuotes(post.summary) || `${title} — Technical article by John Oruebi Eniekpo on YOLETECH.`;
      const author = stripQuotes(post.author) || 'John Oruebi Eniekpo';
      const category = stripQuotes(post.category) || 'Data Analytics & BI';
      const postUrl = new URL(`/blog/${encodeURIComponent(slug)}`, `${origin}/`).href;

      let imageUrl = logoUrl;
      const imagePath = stripQuotes(post.coverImage || '');
      if (imagePath) {
        try {
          const parsedImg = new URL(imagePath, `${origin}/`);
          if (parsedImg.protocol === 'http:' || parsedImg.protocol === 'https:') {
            imageUrl = parsedImg.href;
          }
        } catch {
          // fallback to site logo
        }
      }

      const imgExt = path.extname(imageUrl.split('?')[0]).toLowerCase();
      const imgMime = RSS_MIME_BY_EXT[imgExt] || 'image/png';
      let imgBytes = 0;
      if (imagePath && imagePath.startsWith('/')) {
        const localImg = path.join(ROOT_DIR, 'public', imagePath.replace(/^\/+/, ''));
        try {
          if (fs.existsSync(localImg)) imgBytes = fs.statSync(localImg).size;
        } catch {
          imgBytes = 0;
        }
      }

      const pubDate = toRfc822Date(dateStr, stat.mtimeMs);
      const sortKey = `${dateStr}-${slug}`;

      posts.push({
        sortKey,
        slug,
        title,
        summary,
        author,
        category,
        postUrl,
        imageUrl,
        imgMime,
        imgBytes,
        pubDate
      });
    }
  }

  posts.sort((a, b) => (a.sortKey < b.sortKey ? 1 : -1));
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
    <description>Practical guides, SQL and Python tutorials, Power BI and Tableau dashboard architecture, and full-stack engineering articles by John Oruebi Eniekpo.</description>
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

module.exports = { renderBlogPage, renderRouteSeoHtml, renderSitemapXml, renderRssFeedXml };
