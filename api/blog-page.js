const {
  ROUTE_SEO_CONFIG,
  renderBlogPage,
  renderRouteSeoHtml,
  renderNotFoundHtml,
  renderSitemapXml,
  renderRssFeedXml
} = require('../server/blog-page.js');
const { LEGACY_QUERY_REDIRECTS, BLOG_SLUG_REDIRECTS } = require('../server/site-config.js');

module.exports = (req, res) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://app.chatwoot.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self' https://www.google-analytics.com https://app.chatwoot.com wss://app.chatwoot.com https://formsubmit.co; frame-src 'self' https://app.chatwoot.com; frame-ancestors 'self'; base-uri 'self'; object-src 'none'"
  );

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    res.statusCode = 405;
    res.end('Method Not Allowed');
    return;
  }

  const hostHeader = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  const bareHost = hostHeader.toLowerCase().replace(/:\d+$/, '');
  if (bareHost === 'yolestica.com') {
    const dest = `https://www.yolestica.com${req.url.startsWith('/api/blog-page') ? new URL(req.url, 'https://www.yolestica.com').searchParams.get('route') || '/' : req.url}`;
    res.setHeader('Location', dest);
    res.statusCode = 301;
    res.end();
    return;
  }
  const protoHeader = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const reqOrigin = hostHeader ? `${protoHeader}://${hostHeader}` : undefined;

  const { searchParams, pathname } = new URL(req.url, 'https://localhost');

  // Legacy ?page=... 301 redirects
  if (searchParams.has('page')) {
    const legacyPage = String(searchParams.get('page') || '').replace(/^\/+|\/+$/g, '').toLowerCase();
    if (legacyPage.startsWith('blog/')) {
      const legacySlug = legacyPage.slice('blog/'.length);
      const targetSlug = BLOG_SLUG_REDIRECTS[legacySlug] || legacySlug;
      res.setHeader('Location', `/blog/${encodeURIComponent(targetSlug)}`);
      res.statusCode = 301;
      res.end();
      return;
    }
    const target = LEGACY_QUERY_REDIRECTS[legacyPage];
    if (target) {
      res.setHeader('Location', target);
      res.statusCode = 301;
      res.end();
      return;
    }
  }

  const slug = searchParams.get('slug');
  const route = searchParams.get('route');
  const targetRoute = route || pathname;

  if (targetRoute === '/signup' || targetRoute === '/signup/') {
    res.setHeader('Location', '/register');
    res.statusCode = 301;
    res.end();
    return;
  }

  if (slug) {
    const cleanSlug = decodeURIComponent(slug).replace(/\/+$/, '');
    if (BLOG_SLUG_REDIRECTS[cleanSlug]) {
      res.setHeader('Location', `/blog/${BLOG_SLUG_REDIRECTS[cleanSlug]}`);
      res.statusCode = 301;
      res.end();
      return;
    }
  }

  if (
    searchParams.get('rss') === '1' ||
    pathname === '/rss.xml' ||
    pathname === '/feed.xml' ||
    pathname === '/feed' ||
    pathname === '/blog/rss.xml' ||
    pathname === '/blog/feed'
  ) {
    const feedPath = pathname.startsWith('/api/') ? '/rss.xml' : pathname;
    const rssXml = renderRssFeedXml(reqOrigin, feedPath);
    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600');
    res.statusCode = 200;
    res.end(req.method === 'HEAD' ? undefined : rssXml);
    return;
  }

  if (searchParams.get('sitemap') === '1' || pathname === '/sitemap.xml') {
    const xml = renderSitemapXml(reqOrigin);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=600, stale-while-revalidate=3600');
    res.statusCode = 200;
    res.end(req.method === 'HEAD' ? undefined : xml);
    return;
  }

  const html = slug ? renderBlogPage(slug, reqOrigin) : renderRouteSeoHtml(targetRoute, reqOrigin);
  if (!html) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.statusCode = 404;
    res.end(req.method === 'HEAD' ? undefined : renderNotFoundHtml(slug ? `/blog/${slug}` : targetRoute, reqOrigin));
    return;
  }

  const cleanRoute = targetRoute === '/' ? '/' : `/${String(targetRoute || '').replace(/^\/+|\/+$/g, '')}`;
  const cfg = ROUTE_SEO_CONFIG[cleanRoute];
  if (cfg && cfg.indexable === false) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600');
  res.statusCode = 200;
  res.end(req.method === 'HEAD' ? undefined : html);
};
