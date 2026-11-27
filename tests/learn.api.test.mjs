import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yoletech-learn-test-'));
const tmpDbPath = path.join(tmpDir, 'test.db');
const sourceDbPath = path.join(process.cwd(), 'server', 'yoletech.db');
if (fs.existsSync(sourceDbPath)) {
  fs.copyFileSync(sourceDbPath, tmpDbPath);
}
process.env.YOLETECH_DB_PATH = tmpDbPath;
delete process.env.RESEND_API_KEY;

const require = createRequire(import.meta.url);
const requestHandler = require('../server/index.js');
const { resetLearnRateLimiter } = require('../server/learn/index.js');

async function invokeApp(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = {
    host: 'localhost:4000',
    'content-type': 'application/json',
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
      let json = null;
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
      resolve({ status: statusCode, headers: resHeaders, text, json });
    };

    Promise.resolve(requestHandler(req, res)).catch(reject);
    process.nextTick(() => {
      if (bodyStr) req.emit('data', Buffer.from(bodyStr));
      req.emit('end');
    });
  });
}

test.after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('GET /api/learn/content returns 7 seeded published courses and default banner/FAQ', async () => {
  const res = await invokeApp('/api/learn/content');
  assert.equal(res.status, 200);
  assert.equal(res.json.courses.length, 7);
  assert.equal(res.json.courses[0].title, 'Full-Stack Web Development');
  assert.equal(res.json.courses[0].duration, '');
  assert.equal(res.json.courses[0].price, '');
  assert.ok(res.json.content.headline.length > 5);
  assert.ok(Array.isArray(res.json.content.faq) && res.json.content.faq.length >= 3);
});

test('Location endpoints return bundled countries, states, and cities without external API', async () => {
  const countries = await invokeApp('/api/learn/locations/countries');
  assert.equal(countries.status, 200);
  const ng = countries.json.countries.find((c) => c.isoCode === 'NG');
  assert.ok(ng);
  assert.equal(ng.phonecode, '234');

  const states = await invokeApp('/api/learn/locations/states?country=NG');
  assert.equal(states.status, 200);
  assert.ok(states.json.states.some((s) => s.isoCode === 'BY'));

  const cities = await invokeApp('/api/learn/locations/cities?country=NG&state=BY');
  assert.equal(cities.status, 200);
  assert.ok(cities.json.cities.some((c) => c.name.toLowerCase().includes('yenagoa')));

  // Country with no predefined states returns empty array cleanly for free-text fallback
  const aqStates = await invokeApp('/api/learn/locations/states?country=AQ');
  assert.equal(aqStates.status, 200);
  assert.deepEqual(aqStates.json.states, []);
});

test('Learner registration happy path, duplicate protection, honeypot, login, and learner dashboard', async () => {
  resetLearnRateLimiter();
  const contentRes = await invokeApp('/api/learn/content');
  const firstCourseId = contentRes.json.courses[0].id;

  // Honeypot rejection
  const botRes = await invokeApp('/api/learn/register', {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'Spam Bot',
      gender: 'Prefer not to say',
      countryCode: 'NG',
      countryName: 'Nigeria',
      stateCode: 'BY',
      stateName: 'Bayelsa',
      city: 'Yenagoa',
      courseId: firstCourseId,
      phone: '+2348025526389',
      email: 'bot@example.com',
      password: 'Password123!',
      consent: true,
      website: 'https://spam.example'
    })
  });
  assert.equal(botRes.status, 400);

  // Happy path registration
  const regPayload = {
    fullName: 'Chidi Okafor',
    gender: 'Male',
    countryCode: 'NG',
    countryName: 'Nigeria',
    stateCode: 'BY',
    stateName: 'Bayelsa',
    city: 'Yenagoa',
    courseId: firstCourseId,
    phone: '+234 802 552 6389',
    email: 'chidi.learner@example.com',
    password: 'LearnPassword#2026',
    consent: true,
    website: ''
  };

  const regRes = await invokeApp('/api/learn/register', {
    method: 'POST',
    body: JSON.stringify(regPayload)
  });
  assert.equal(regRes.status, 201);
  assert.ok(regRes.json.token);
  assert.equal(regRes.json.user.role, 'LEARNER');
  assert.equal(regRes.json.profile.phone, '+2348025526389');
  assert.equal(regRes.json.enrollment.status, 'PENDING');

  // Learner dashboard returns profile and enrollment
  const meRes = await invokeApp('/api/learn/me', {
    headers: { Authorization: `Bearer ${regRes.json.token}` }
  });
  assert.equal(meRes.status, 200);
  assert.equal(meRes.json.profile.full_name, 'Chidi Okafor');
  assert.equal(meRes.json.enrollments.length, 1);
  assert.equal(meRes.json.enrollments[0].status, 'PENDING');

  // Duplicate email returns 409 with generic non-enumerating error
  const dupRes = await invokeApp('/api/learn/register', {
    method: 'POST',
    body: JSON.stringify(regPayload)
  });
  assert.equal(dupRes.status, 409);
  assert.equal(/already exists/i.test(dupRes.json.error), false);

  // Existing /api/auth/login still works for learners
  const loginRes = await invokeApp('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'chidi.learner@example.com',
      password: 'LearnPassword#2026'
    })
  });
  assert.equal(loginRes.status, 200);
  assert.equal(loginRes.json.user.role, 'LEARNER');

  // Learner cannot access admin Learn endpoints (server-side guard)
  const forbiddenRes = await invokeApp('/api/admin/learn/summary', {
    headers: { Authorization: `Bearer ${loginRes.json.token}` }
  });
  assert.equal(forbiddenRes.status, 403);
});

test('Admin Learn endpoints manage courses, registrations, bulk updates, CSV export, and page content', async () => {
  // Sign in as seeded admin
  const adminLogin = await invokeApp('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'yoletech@yoletica.com',
      password: 'YoleTech@2026#Admin'
    })
  });
  assert.equal(adminLogin.status, 200);
  const adminHeaders = { Authorization: `Bearer ${adminLogin.json.token}` };

  // Existing Client CRM does not leak LEARNER accounts
  const clientsRes = await invokeApp('/api/clients', { headers: adminHeaders });
  assert.equal(clientsRes.status, 200);
  assert.equal(
    clientsRes.json.clients.some((c) => c.email === 'chidi.learner@example.com'),
    false
  );

  // Summary strip reflects real data
  const summaryRes = await invokeApp('/api/admin/learn/summary', { headers: adminHeaders });
  assert.equal(summaryRes.status, 200);
  assert.equal(summaryRes.json.summary.totalRegistrations, 1);
  assert.equal(summaryRes.json.summary.pendingCount, 1);

  // Filter registrations & update status + notes
  const listRes = await invokeApp('/api/admin/learn/registrations?status=PENDING&search=Chidi', {
    headers: adminHeaders
  });
  assert.equal(listRes.status, 200);
  assert.equal(listRes.json.registrations.length, 1);
  const enrId = listRes.json.registrations[0].enrollment_id;

  const updRes = await invokeApp(`/api/admin/learn/registrations/${enrId}`, {
    method: 'PUT',
    headers: adminHeaders,
    body: JSON.stringify({ status: 'APPROVED', notes: 'Confirmed for cohort intake.' })
  });
  assert.equal(updRes.status, 200);
  assert.equal(updRes.json.registration.status, 'APPROVED');
  assert.equal(updRes.json.registration.notes, 'Confirmed for cohort intake.');

  // Bulk status update
  const bulkRes = await invokeApp('/api/admin/learn/registrations/bulk', {
    method: 'PUT',
    headers: adminHeaders,
    body: JSON.stringify({ ids: [enrId], status: 'COMPLETED' })
  });
  assert.equal(bulkRes.status, 200);
  assert.equal(bulkRes.json.updatedCount, 1);

  // CSV export
  const csvRes = await invokeApp('/api/admin/learn/registrations?format=csv', {
    headers: adminHeaders
  });
  assert.equal(csvRes.status, 200);
  assert.match(csvRes.text, /Chidi Okafor/);
  assert.match(csvRes.text, /COMPLETED/);

  // Create, toggle, reorder, and delete a course
  const createCourseRes = await invokeApp('/api/admin/learn/courses', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      title: 'SQL Database Foundations',
      slug: '',
      short_description: 'Learn relational database modeling, queries, and reporting basics.',
      outcomes: ['Write SELECT and JOIN queries', 'Design normalized tables'],
      level: 'Beginner',
      mode: 'online',
      duration: '4 weeks',
      price: '',
      status: 'draft',
      display_order: 8
    })
  });
  assert.equal(createCourseRes.status, 201);
  const newCourseId = createCourseRes.json.course.id;

  const publishRes = await invokeApp(`/api/admin/learn/courses/${newCourseId}`, {
    method: 'PUT',
    headers: adminHeaders,
    body: JSON.stringify({ status: 'published' })
  });
  assert.equal(publishRes.status, 200);
  assert.equal(publishRes.json.course.status, 'published');

  const deleteRes = await invokeApp(`/api/admin/learn/courses/${newCourseId}`, {
    method: 'DELETE',
    headers: adminHeaders
  });
  assert.equal(deleteRes.status, 200);
  assert.equal(deleteRes.json.action, 'deleted');

  // Archiving a course that has enrollments preserves records
  const enrolledCourseId = listRes.json.registrations[0].course_id;
  const archiveRes = await invokeApp(`/api/admin/learn/courses/${enrolledCourseId}`, {
    method: 'DELETE',
    headers: adminHeaders
  });
  assert.equal(archiveRes.status, 200);
  assert.equal(archiveRes.json.action, 'archived');

  // Re-publish so /learn SSR check sees it
  await invokeApp(`/api/admin/learn/courses/${enrolledCourseId}`, {
    method: 'PUT',
    headers: adminHeaders,
    body: JSON.stringify({ status: 'published' })
  });

  // Update Learn banner & FAQ content
  const contentUpdate = await invokeApp('/api/admin/learn/content', {
    method: 'PUT',
    headers: adminHeaders,
    body: JSON.stringify({
      headline: 'Build Practical Digital Skills With YOLETECH',
      subheadline: 'Structured training across web, data, AI, and IT disciplines.',
      cta_label: 'Apply Today',
      faq: [{ question: 'Can beginners apply?', answer: 'Yes, beginner tracks welcome newcomers.' }]
    })
  });
  assert.equal(contentUpdate.status, 200);
  assert.equal(contentUpdate.json.content.cta_label, 'Apply Today');

  // Verify SSR SEO HTML for /learn includes real Course JSON-LD
  const learnHtmlRes = await invokeApp('/learn');
  assert.equal(learnHtmlRes.status, 200);
  assert.match(learnHtmlRes.text, /"@type":"Course"/);
  assert.match(learnHtmlRes.text, /Full-Stack Web Development/);
  assert.match(learnHtmlRes.text, /Build Practical Digital Skills With YOLETECH/);
});

test('Rate limiter blocks excessive Learn registration attempts per email', async () => {
  resetLearnRateLimiter();
  const payload = {
    fullName: 'Rate Test',
    gender: 'Female',
    countryCode: 'NG',
    countryName: 'Nigeria',
    stateCode: 'BY',
    stateName: 'Bayelsa',
    city: 'Yenagoa',
    courseId: 1,
    phone: '+2348025526389',
    email: 'chidi.learner@example.com',
    password: 'RateLimitPassword#1',
    consent: true,
    website: ''
  };
  let lastStatus = 0;
  for (let i = 0; i < 6; i += 1) {
    const res = await invokeApp('/api/learn/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    lastStatus = res.status;
  }
  assert.equal(lastStatus, 429);
});
