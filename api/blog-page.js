const { renderBlogPage, renderRouteSeoHtml, renderSitemapXml } = require('../server/blog-page.js');

module.exports = (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    res.statusCode = 405;
    res.end('Method Not Allowed');
    return;
  }

  const { searchParams, pathname } = new URL(req.url, 'https://localhost');
  if (searchParams.get('sitemap') === '1' || pathname === '/sitemap.xml') {
    const xml = renderSitemapXml();
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=600, stale-while-revalidate=3600');
    res.statusCode = 200;
    res.end(req.method === 'HEAD' ? undefined : xml);
    return;
  }

  const slug = searchParams.get('slug');
  const route = searchParams.get('route');
  const html = slug ? renderBlogPage(slug) : renderRouteSeoHtml(route || pathname);
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
