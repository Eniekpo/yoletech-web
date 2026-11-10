const { renderBlogPage, renderRouteSeoHtml, renderSitemapXml } = require('../server/blog-page.js');

module.exports = (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    res.statusCode = 405;
    res.end('Method Not Allowed');
    return;
  }

  const hostHeader = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  const protoHeader = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const reqOrigin = hostHeader ? `${protoHeader}://${hostHeader}` : undefined;

  const { searchParams, pathname } = new URL(req.url, 'https://localhost');
  if (searchParams.get('sitemap') === '1' || pathname === '/sitemap.xml') {
    const xml = renderSitemapXml(reqOrigin);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=600, stale-while-revalidate=3600');
    res.statusCode = 200;
    res.end(req.method === 'HEAD' ? undefined : xml);
    return;
  }

  const slug = searchParams.get('slug');
  const route = searchParams.get('route');
  const html = slug ? renderBlogPage(slug, reqOrigin) : renderRouteSeoHtml(route || pathname, reqOrigin);
  if (!html) {
    res.statusCode = 404;
    res.end('Article not found');
    return;
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600');
  res.statusCode = 200;
  res.end(req.method === 'HEAD' ? undefined : html);
};
