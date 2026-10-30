const { renderBlogPage } = require('../server/blog-page.js');

module.exports = (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    res.statusCode = 405;
    res.end('Method Not Allowed');
    return;
  }

  const { searchParams } = new URL(req.url, 'https://localhost');
  const html = renderBlogPage(searchParams.get('slug'));
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
