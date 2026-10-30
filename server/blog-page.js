const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.join(__dirname, '..');
const BLOG_DIR = path.join(ROOT_DIR, 'content', 'blog');
const INDEX_PATH = path.join(ROOT_DIR, 'public', 'index.html');
const SITE_ORIGIN = (process.env.SITE_URL || 'https://www.yolestica.com').replace(/\/+$/, '');

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function readFrontmatter(filePath) {
  const markdown = fs.readFileSync(filePath, 'utf8');
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return {};

  const values = {};
  let currentKey = null;
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (field) {
      currentKey = field[1];
      values[currentKey] = field[2];
    } else if (currentKey && /^\s+\S/.test(line)) {
      values[currentKey] += `${values[currentKey] ? ' ' : ''}${line.trim()}`;
    } else {
      currentKey = null;
    }
  }
  return values;
}

function replaceMeta(html, attribute, name, content) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<meta\\s+${attribute}="${escapedName}"\\s+content="[^"]*"\\s*\\/?>`);
  return html.replace(pattern, `<meta ${attribute}="${name}" content="${escapeHtml(content)}" />`);
}

function renderBlogPage(slug) {
  if (!slug || path.basename(slug) !== slug || slug === '.' || slug === '..') return null;

  const postPath = path.join(BLOG_DIR, `${slug}.md`);
  if (!fs.existsSync(postPath)) return null;

  const post = readFrontmatter(postPath);
  const title = post.title || slug;
  const description = post.summary || '';
  const imagePath = post.coverImage || '/assets/dashboard-preview.jpg';
  let imageUrl;
  try {
    imageUrl = new URL(imagePath, `${SITE_ORIGIN}/`).href;
  } catch {
    imageUrl = new URL('/assets/dashboard-preview.jpg', `${SITE_ORIGIN}/`).href;
  }
  const pageUrl = new URL(`/blog/${encodeURIComponent(slug)}`, `${SITE_ORIGIN}/`).href;

  let html = fs.readFileSync(INDEX_PATH, 'utf8');
  html = replaceMeta(html, 'property', 'og:type', 'article');
  html = replaceMeta(html, 'property', 'og:title', title);
  html = replaceMeta(html, 'property', 'og:description', description);
  html = replaceMeta(html, 'property', 'og:image', imageUrl);
  html = replaceMeta(html, 'property', 'og:url', pageUrl);
  html = replaceMeta(html, 'name', 'twitter:title', title);
  html = replaceMeta(html, 'name', 'twitter:description', description);
  html = replaceMeta(html, 'name', 'twitter:image', imageUrl);
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)} | YOLETECH</title>`);
  html = html.replace(
    /<link rel="canonical" href="[^"]*"\s*\/>/,
    `<link rel="canonical" href="${escapeHtml(pageUrl)}" />`
  );
  return html;
}

module.exports = { renderBlogPage };
