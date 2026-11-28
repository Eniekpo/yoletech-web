import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yoletech-seo-ssr-test-'));
process.env.YOLETECH_DB_PATH = path.join(tmpDir, 'test.db');
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
