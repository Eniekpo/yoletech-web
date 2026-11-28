import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yoletech-seo-ssr-test-'));
process.env.YOLETECH_DB_PATH = path.join(tmpDir, 'test.db');
process.env.JWT_SECRET = 'test-only-seo-jwt-secret-2026';
process.env.ADMIN_PASSWORD = 'TestSeoAdmin#2026Password';
delete process.env.RESEND_API_KEY;

const require = createRequire(import.meta.url);
const requestHandler = require('../server/index.js');
const vercelBlogHandler = require('../api/blog-page.js');
const { loadAllBlogPosts } = require('../server/blog-page.js');

async function invokeHandler(handler, endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = {
    host: options.host || 'www.yolestica.com',
    'x-forwarded-proto': 'https',
    ...Object.fromEntries(
      Object.entries(options.headers || {}).map(([k, v]) => [k.toLowerCase(), v])
    )
  };
  const bodyStr = typeof options.body === 'string' ? options.body : '';

  const req = new EventEmitter();
  req.method = method;
  req.url = endpoint;
  req.headers = headers;
  req.socket = { remoteAddress: '127.0.0.1' };

  return new Promise((resolve, reject) => {
    const resHeaders = {};
    let statusCode = 200;
    const chunks = [];

    const res = new EventEmitter();
    res.setHeader = (name, value) => {
      resHeaders[String(name).toLowerCase()] = value;
    };
    res.getHeader = (name) => resHeaders[String(name).toLowerCase()];
    res.writeHead = (code, hdrs = {}) => {
      statusCode = code;
      for (const [k, v] of Object.entries(hdrs)) {
        resHeaders[k.toLowerCase()] = v;
      }
      return res;
    };
    res.write = (chunk) => {
      if (chunk !== undefined && chunk !== null) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      }
      return true;
    };
    res.end = (chunk) => {
      if (chunk !== undefined && chunk !== null) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      }
      const text = Buffer.concat(chunks).toString('utf8');
      resolve({ status: res.statusCode || statusCode, headers: resHeaders, text });
    };

    Promise.resolve(handler(req, res)).catch(reject);
    process.nextTick(() => {
      if (bodyStr) req.emit('data', Buffer.from(bodyStr));
      req.emit('end');
    });
  });
}

function extractH1s(html) {
  const matches = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  return matches.map((m) => m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
}

function extractTitle(html) {
  const m = html.match(/<title>([\s\S]*?)<\/title>/i);
  return m ? m[1].trim() : '';
}

test.after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('Phase 1: All public routes return unique server-rendered HTML with single H1 and no repeated Home strip', async () => {
  const posts = loadAllBlogPosts();
  assert.ok(posts.length > 0, 'Expected at least one blog post');
  const sampleBlogPath = `/blog/${posts[0].slug}`;

  const publicRoutes = [
    '/',
    '/about',
    '/services',
    '/portfolio',
    '/learn',
    '/blog',
    sampleBlogPath,
    '/contact',
    '/privacy',
    '/terms',
    '/cookies'
  ];

  const seenH1 = new Set();
  const seenTitle = new Set();

  for (const route of publicRoutes) {
    const res = await invokeHandler(requestHandler, route);
    assert.equal(res.status, 200, `Expected 200 for ${route}`);
    assert.match(res.headers['content-type'] || '', /text\/html/i);

    const h1s = extractH1s(res.text);
    assert.equal(h1s.length, 1, `Expected exactly one <h1> on ${route}, got ${h1s.length}: ${JSON.stringify(h1s)}`);
    assert.ok(h1s[0].length > 3, `Expected non-empty H1 on ${route}`);
    assert.ok(!seenH1.has(h1s[0]), `Duplicate H1 "${h1s[0]}" on ${route}`);
    seenH1.add(h1s[0]);

    const title = extractTitle(res.text);
    assert.ok(title.length > 5, `Expected non-empty <title> on ${route}`);
    assert.ok(!seenTitle.has(title), `Duplicate <title> "${title}" on ${route}`);
    seenTitle.add(title);

    assert.ok(res.text.includes('<main id="main-content"'), `Missing <main id="main-content"> on ${route}`);
    assert.ok(res.text.includes('href="/services"'), `Missing internal nav links on ${route}`);
    assert.ok(!res.text.includes('<meta name="keywords"'), `Found obsolete meta keywords on ${route}`);

    if (route === '/') {
      assert.ok(res.text.includes('CORE DIGITAL &amp; DATA SERVICES'), 'Home should include services strip');
    } else {
      assert.ok(
        !res.text.includes('CORE DIGITAL &amp; DATA SERVICES'),
        `Inner page ${route} must not repeat Home services strip`
      );
      assert.ok(
        !res.text.includes('hero-slide-1-data-science-portrait.png'),
        `Inner page ${route} must not repeat broken Home hero image`
      );
    }
  }
});

test('Phase 1: Non-indexable routes emit noindex meta and X-Robots-Tag', async () => {
  const privateRoutes = ['/login', '/register', '/portal', '/dashboard', '/admin-dashboard', '/learn/dashboard', '/testimonials'];
  for (const route of privateRoutes) {
    const res = await invokeHandler(requestHandler, route);
    assert.equal(res.status, 200, `Expected 200 for ${route}`);
    assert.equal(res.headers['x-robots-tag'], 'noindex, nofollow', `Expected X-Robots-Tag noindex on ${route}`);
    assert.match(res.text, /<meta name="robots" content="noindex, nofollow"/i, `Expected meta robots noindex on ${route}`);
  }
});

test('Phase 1: Unknown routes return genuine HTTP 404 on both server and Vercel handler', async () => {
  for (const unknown of ['/this-route-does-not-exist', '/blog/missing-post-slug-404']) {
    const nodeRes = await invokeHandler(requestHandler, unknown);
    assert.equal(nodeRes.status, 404, `Expected 404 from Node server for ${unknown}`);
    assert.equal(nodeRes.headers['x-robots-tag'], 'noindex, nofollow');
    assert.match(nodeRes.text, /Page Not Found/i);

    const vercelRes = await invokeHandler(
      vercelBlogHandler,
      unknown.startsWith('/blog/')
        ? `/api/blog-page?slug=${unknown.slice('/blog/'.length)}`
        : `/api/blog-page?route=${unknown}`
    );
    assert.equal(vercelRes.status, 404, `Expected 404 from Vercel handler for ${unknown}`);
    assert.equal(vercelRes.headers['x-robots-tag'], 'noindex, nofollow');
    assert.match(vercelRes.text, /Page Not Found/i);
  }
});

test('Phase 2: No blocking preloader or sample Signup month chart appears on public routes', async () => {
  const routes = ['/', '/about', '/services', '/portfolio', '/learn', '/blog', '/contact'];
  for (const route of routes) {
    const res = await invokeHandler(requestHandler, route);
    assert.equal(res.status, 200);
    assert.ok(!res.text.includes('yoletech-preloader'), `Preloader still present on ${route}`);
    assert.ok(!res.text.includes('preloader-active'), `preloader-active class still present on ${route}`);
    assert.ok(!res.text.includes('Loading Executive Analytics'), `Blocking loader text still present on ${route}`);
    assert.ok(!res.text.includes('Signup month'), `Sample chart still present on ${route}`);
    assert.ok(!res.text.includes('New clients'), `Sample chart Y-axis still present on ${route}`);
    assert.ok(!res.text.includes('hero-slide-1-data-science-portrait.png'), `Broken hero image still present on ${route}`);
  }
});

test('Phase 3: Contact API enforces consent, validation, honeypot, and rate limiting; Contact page shows phone once', async () => {
  const contactHtml = await invokeHandler(requestHandler, '/contact');
  assert.equal(contactHtml.status, 200);
  const phoneOccurrences = (contactHtml.text.match(/\+234 802 552 6389/g) || []).length;
  assert.equal(phoneOccurrences, 1, `Expected phone number once on /contact, found ${phoneOccurrences}`);
  assert.ok(contactHtml.text.includes('name="consent"'), 'Expected consent checkbox on /contact');
  assert.ok(contactHtml.text.includes('name="website"'), 'Expected honeypot input on /contact');
  assert.ok(contactHtml.text.includes('WAT (UTC+1)'), 'Expected business hours with time zone on /contact');

  // Missing consent rejected with 400
  const noConsent = await invokeHandler(requestHandler, '/api/inquiries', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Adaeze Nwosu',
      email: 'adaeze@example.com',
      service_category: 'Data Analysis & Executive BI',
      message: 'We need a Power BI dashboard for our quarterly operations review.'
    })
  });
  assert.equal(noConsent.status, 400);

  // Honeypot silently returns 200 without creating a record
  const botSubmit = await invokeHandler(requestHandler, '/api/inquiries', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Spam Bot',
      email: 'bot@example.com',
      message: 'Buy links now please click here!',
      consent: true,
      website: 'https://spam.example'
    })
  });
  assert.equal(botSubmit.status, 200);
  assert.equal(JSON.parse(botSubmit.text).accepted, true);

  // Valid submission succeeds with 201
  const validSubmit = await invokeHandler(requestHandler, '/api/inquiries', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Adaeze Nwosu',
      email: 'adaeze@example.com',
      phone: '+2348011122233',
      service_category: 'Data Analysis & Executive BI',
      message: 'We need a Power BI dashboard for our quarterly operations review.',
      consent: true
    })
  });
  assert.equal(validSubmit.status, 201);
});

test('Phase 4: Canonical host 301 redirect, SEO limits, JSON-LD, sitemap.xml, and robots.txt', async () => {
  // Apex domain 301 redirect -> https://www.yolestica.com
  const apexRes = await invokeHandler(requestHandler, '/services', { host: 'yolestica.com' });
  assert.equal(apexRes.status, 301);
  assert.equal(apexRes.headers.location, 'https://www.yolestica.com/services');

  const vercelApexRes = await invokeHandler(vercelBlogHandler, '/api/blog-page?route=/about', { host: 'yolestica.com' });
  assert.equal(vercelApexRes.status, 301);
  assert.equal(vercelApexRes.headers.location, 'https://www.yolestica.com/about');

  // Verify SEO limits, canonical URL, OG image dimensions, and valid JSON-LD on public routes
  const routes = ['/', '/about', '/services', '/portfolio', '/learn', '/blog', '/contact', '/privacy', '/terms', '/cookies'];
  for (const route of routes) {
    const res = await invokeHandler(requestHandler, route);
    assert.equal(res.status, 200);
    const title = extractTitle(res.text).replace(/&amp;/g, '&');
    assert.ok(title.length <= 60, `Title too long (${title.length} chars) on ${route}: ${title}`);

    const descMatch = res.text.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
    assert.ok(descMatch, `Missing meta description on ${route}`);
    const desc = descMatch[1].replace(/&amp;/g, '&');
    assert.ok(desc.length <= 155, `Description too long (${desc.length} chars) on ${route}: ${desc}`);

    const expectedCanonical = route === '/' ? 'https://www.yolestica.com/' : `https://www.yolestica.com${route}`;
    assert.ok(
      res.text.includes(`<link rel="canonical" href="${expectedCanonical}" />`),
      `Expected canonical ${expectedCanonical} on ${route}`
    );
    assert.ok(res.text.includes('property="og:image:width" content="1200"'));
    assert.ok(res.text.includes('property="og:image:height" content="630"'));

    const ldMatches = [...res.text.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
    assert.ok(ldMatches.length >= 2, `Expected base + dynamic JSON-LD on ${route}`);
    for (const m of ldMatches) {
      const parsed = JSON.parse(m[1].trim());
      assert.equal(parsed['@context'], 'https://schema.org');
    }
  }

  // Sitemap contains only canonical www indexable routes
  const sitemap = await invokeHandler(requestHandler, '/sitemap.xml');
  assert.equal(sitemap.status, 200);
  assert.ok(sitemap.text.includes('https://www.yolestica.com/services'));
  assert.ok(sitemap.text.includes('https://www.yolestica.com/learn'));
  assert.ok(!sitemap.text.includes('https://yolestica.com/'));
  assert.ok(!sitemap.text.includes('/dashboard'));
  assert.ok(!sitemap.text.includes('/testimonials'));
  assert.ok(!sitemap.text.includes('/admin'));
  assert.ok(!sitemap.text.includes('/login'));
});

test('Phase 5: Legacy ?page=... queries and /signup return HTTP 301 on Node and Vercel', async () => {
  const legacyCases = [
    ['/?page=portfolio', '/portfolio'],
    ['/?page=admin-dashboard', '/admin-dashboard'],
    ['/?page=blog', '/blog'],
    ['/?page=services', '/services'],
    ['/?page=learn', '/learn'],
    ['/?page=signup', '/register'],
    ['/signup', '/register']
  ];
  for (const [fromUrl, expectedDest] of legacyCases) {
    const nodeRes = await invokeHandler(requestHandler, fromUrl);
    assert.equal(nodeRes.status, 301, `Expected 301 from Node for ${fromUrl}`);
    assert.equal(nodeRes.headers.location, expectedDest, `Expected Location ${expectedDest} for ${fromUrl}`);

    const vercelUrl = fromUrl.startsWith('/?page=')
      ? `/api/blog-page?route=/&${fromUrl.slice(2)}`
      : `/api/blog-page?route=${fromUrl}`;
    const vercelRes = await invokeHandler(vercelBlogHandler, vercelUrl);
    assert.equal(vercelRes.status, 301, `Expected 301 from Vercel for ${fromUrl}`);
    assert.equal(vercelRes.headers.location, expectedDest);
  }

  // Verify admin/index.html no longer links to legacy ?page= URLs
  const adminHtml = fs.readFileSync(path.join(process.cwd(), 'public', 'admin', 'index.html'), 'utf8');
  assert.ok(!adminHtml.includes('?page='), 'public/admin/index.html still contains legacy ?page= links');
});

test('Phase 6: Security hardening (no hardcoded secrets, auth-gated /analytics and /admin/, HttpOnly cookie, CSRF, security headers)', async () => {
  // 1. No hardcoded admin password or JWT fallback in source
  const serverSrc = fs.readFileSync(path.join(process.cwd(), 'server', 'index.js'), 'utf8');
  const appSrc = fs.readFileSync(path.join(process.cwd(), 'public', 'app.js'), 'utf8');
  assert.ok(!serverSrc.includes('YoleTech@2026#Admin'), 'Hardcoded admin password found in server/index.js');
  assert.ok(!appSrc.includes('YoleTech@2026#Admin'), 'Hardcoded admin password found in public/app.js');
  assert.ok(!serverSrc.includes('yoletech-super-secret-jwt-key'), 'Hardcoded JWT secret found in server/index.js');

  // 2. Security headers present on HTML responses
  const homeRes = await invokeHandler(requestHandler, '/');
  assert.ok(homeRes.headers['strict-transport-security'], 'Missing HSTS header');
  assert.equal(homeRes.headers['x-content-type-options'], 'nosniff');
  assert.equal(homeRes.headers['x-frame-options'], 'SAMEORIGIN');
  assert.equal(homeRes.headers['referrer-policy'], 'strict-origin-when-cross-origin');
  assert.ok(homeRes.headers['permissions-policy'], 'Missing Permissions-Policy header');
  assert.ok(homeRes.headers['content-security-policy'], 'Missing CSP header');

  // 3. Unauthenticated /api/analytics, /api/analytics/sync, and /admin/ are blocked
  assert.equal((await invokeHandler(requestHandler, '/api/analytics')).status, 401);
  assert.equal(
    (await invokeHandler(requestHandler, '/api/analytics/sync', { method: 'POST', body: '{}' })).status,
    401
  );

  const unauthAdmin = await invokeHandler(requestHandler, '/admin/');
  assert.equal(unauthAdmin.status, 302);
  assert.equal(unauthAdmin.headers.location, '/login?next=/admin/');
  assert.equal(unauthAdmin.headers['x-robots-tag'], 'noindex, nofollow');

  // 4. Cross-origin CSRF attempt on POST /api/inquiries is blocked with 403
  const csrfAttempt = await invokeHandler(requestHandler, '/api/inquiries', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://evil-attacker.example' },
    body: JSON.stringify({ name: 'Test', email: 't@example.com', message: 'Hello world testing csrf', consent: true })
  });
  assert.equal(csrfAttempt.status, 403);

  // 5. Admin login sets HttpOnly SameSite cookie, cookie grants access to /admin/ and /api/analytics, logout clears cookie
  const loginRes = await invokeHandler(requestHandler, '/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'yoletech@yolestica.com', password: process.env.ADMIN_PASSWORD })
  });
  assert.equal(loginRes.status, 200);
  const setCookie = String(loginRes.headers['set-cookie'] || '');
  assert.match(setCookie, /yoletech_session=/);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Lax/i);

  const cookiePair = setCookie.split(';')[0];
  const authedAdmin = await invokeHandler(requestHandler, '/admin/', { headers: { cookie: cookiePair } });
  assert.equal(authedAdmin.status, 200);
  assert.equal(authedAdmin.headers['x-robots-tag'], 'noindex, nofollow');

  const authedAnalytics = await invokeHandler(requestHandler, '/api/analytics', { headers: { cookie: cookiePair } });
  assert.equal(authedAnalytics.status, 200);

  const logoutRes = await invokeHandler(requestHandler, '/api/auth/logout', { method: 'POST' });
  assert.equal(logoutRes.status, 200);
  assert.match(String(logoutRes.headers['set-cookie'] || ''), /Max-Age=0/);
});

test('Phase 7: Blog fixes (no >- excerpts, FastAPI title, Tech History, weekly digest + 301s, series links)', async () => {
  const posts = loadAllBlogPosts();
  assert.equal(posts.length, 20, 'Expected 20 blog posts after merging 2 daily news items into 1 weekly digest');

  for (const post of posts) {
    assert.ok(!post.summary.includes('>-'), `Found raw YAML >- in summary of ${post.slug}`);
    assert.ok(post.summary.length > 10, `Empty summary in ${post.slug}`);
    assert.ok(!post.summary.includes('35 percent'), `Unsourced 35 percent still in ${post.slug}`);
  }

  const fastapi = posts.find((p) => p.slug === 'build-rest-apis-with-python-and-fast-api');
  assert.ok(fastapi);
  assert.equal(fastapi.title, 'Build REST APIs with Python and FastAPI');

  const techHistory = posts.filter((p) => p.category === 'Tech History');
  assert.equal(techHistory.length, 6, 'Expected 6 biography posts in Tech History');

  // Weekly digest exists and old daily news slugs 301-redirect to it
  const digestRes = await invokeHandler(requestHandler, '/blog/tech-news-weekly-digest-nov-2026');
  assert.equal(digestRes.status, 200);
  assert.match(digestRes.text, /Weekly Tech News Digest/i);

  for (const oldSlug of [
    'technology-updates-12-november-2026',
    'yoletech-tech-news-13-november-2026',
    'from-housing-data-to-an-interactive-ml-app-predicting-real-estate-prices-with-python-scikit-learn-and-streamlit',
    'thomas-edison-the-inventor-who-made-electric-lighting-practical-for-the-modern-world'
  ]) {
    const rNode = await invokeHandler(requestHandler, `/blog/${oldSlug}`);
    assert.equal(rNode.status, 301, `Expected 301 from Node for /blog/${oldSlug}`);
    const rVercel = await invokeHandler(vercelBlogHandler, `/api/blog-page?slug=${oldSlug}`);
    assert.equal(rVercel.status, 301, `Expected 301 from Vercel for /blog/${oldSlug}`);
  }

  // Real Estate ML 2-part series cross-links
  const part1 = await invokeHandler(requestHandler, '/blog/predicting-real-estate-prices-with-python-and-scikit-learn');
  assert.equal(part1.status, 200);
  assert.ok(part1.text.includes('/blog/housing-price-ml-app-python-streamlit'));
  const part2 = await invokeHandler(requestHandler, '/blog/housing-price-ml-app-python-streamlit');
  assert.equal(part2.status, 200);
  assert.ok(part2.text.includes('/blog/predicting-real-estate-prices-with-python-and-scikit-learn'));
});

test('Phase 8: Legal pages, consent-gated GTM, full crawlable footer, and clean nav', async () => {
  const indexHtml = fs.readFileSync(path.join(process.cwd(), 'public', 'index.html'), 'utf8');
  assert.ok(
    !indexHtml.includes('<script async src="https://www.googletagmanager.com/gtm.js'),
    'GTM must be gated behind cookie consent, not loaded unconditionally'
  );
  assert.ok(indexHtml.includes('yoletech_cookie_consent'), 'Expected consent check for analytics');

  for (const legalRoute of ['/privacy', '/terms', '/cookies']) {
    const res = await invokeHandler(requestHandler, legalRoute);
    assert.equal(res.status, 200, `Expected 200 for ${legalRoute}`);
    assert.ok(res.text.includes('footer-columns'), `Expected crawlable multi-column footer on ${legalRoute}`);
    assert.ok(res.text.includes('href="/privacy"'));
    assert.ok(res.text.includes('href="/terms"'));
    assert.ok(res.text.includes('href="/cookies"'));
  }

  const homeRes = await invokeHandler(requestHandler, '/');
  assert.ok(homeRes.text.includes('Create Account'), 'Expected Create Account CTA in nav');
  assert.ok(!homeRes.text.includes('Register Portal'), 'Old Register Portal label should be replaced');
  assert.ok(!homeRes.text.includes('href="/testimonials"'), 'Testimonials should be hidden from nav/footer');
  assert.ok(!homeRes.text.includes('href="/dashboard"'), 'Dashboard should be hidden from public nav/footer');
});

test('Phase 9: Accessibility (skip link, focus-visible, reduced motion) and performance (deferred scripts, display=swap)', async () => {
  const indexHtml = fs.readFileSync(path.join(process.cwd(), 'public', 'index.html'), 'utf8');
  assert.ok(indexHtml.includes('<script defer src="/app.js"></script>'), 'Expected defer on /app.js');
  assert.ok(indexHtml.includes('<script defer src="/learn.js"></script>'), 'Expected defer on /learn.js');
  assert.ok(indexHtml.includes('display=swap'), 'Expected font-display swap on Google Fonts');

  const css = fs.readFileSync(path.join(process.cwd(), 'public', 'styles.css'), 'utf8');
  assert.ok(css.includes(':focus-visible'), 'Expected global focus-visible styles');
  assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'), 'Expected prefers-reduced-motion rules');
  assert.ok(css.includes('.skip-link'), 'Expected skip-link styles');

  const homeRes = await invokeHandler(requestHandler, '/');
  assert.ok(homeRes.text.includes('class="skip-link"'), 'Expected skip-to-content link in SSR HTML');
});
