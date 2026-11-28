import type { IncomingMessage, ServerResponse } from 'node:http';
import { Country, State, City } from 'country-state-city';
import {
  bulkEnrollmentUpdateSchema,
  courseInputSchema,
  courseReorderSchema,
  enrollmentUpdateSchema,
  flattenZodFieldErrors,
  learnPageContentSchema,
  learnerRegistrationSchema,
  normalizeInternationalPhone,
  ENROLLMENT_STATUSES
} from './schema';
import {
  bulkUpdateEnrollments,
  createCourse,
  deleteOrArchiveCourse,
  getAdminLearnSummary,
  getLearnerDashboardData,
  getLearnPageContent,
  listAllCourses,
  listAdminRegistrations,
  listPublishedCourses,
  registerLearnerTransaction,
  reorderCourses,
  updateCourse,
  updateEnrollment,
  updateLearnPageContent,
  type AdminRegistrationRow,
  type DbLike
} from './db';
import type { EnrollmentStatus } from './seed-data';

export interface AuthUserLike {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  service_interest: string;
  role: string;
  status: string;
  created_at: string;
}

export interface LearnRouteContext {
  db: DbLike;
  req: IncomingMessage;
  res: ServerResponse;
  pathname: string;
  parsedUrl: URL;
  clientIp: string;
  parseBody: (req: IncomingMessage) => Promise<Record<string, unknown>>;
  sendJson: (res: ServerResponse, status: number, data: unknown, headers?: Record<string, string>) => void;
  getAuthUser: (req: IncomingMessage) => AuthUserLike | null;
  hashPassword: (password: string) => string;
  signToken: (payload: Record<string, unknown>) => string;
  buildSessionCookie?: (token: string, req: IncomingMessage) => string;
  sendEmailToYoletech: (args: {
    subject: string;
    replyTo?: string;
    fields: Record<string, string>;
  }) => Promise<unknown>;
}

interface RateBucket {
  count: number;
  resetAt: number;
}

const learnRateBuckets = new Map<string, RateBucket>();

export function checkCompositeRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const current = learnRateBuckets.get(key);
  if (!current || now > current.resetAt) {
    learnRateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  current.count += 1;
  learnRateBuckets.set(key, current);
  if (current.count > limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

export function resetLearnRateLimiter(): void {
  learnRateBuckets.clear();
}

function isOriginAllowed(req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (!origin || !host) return true;
  try {
    const parsedOrigin = new URL(Array.isArray(origin) ? origin[0] || '' : origin);
    const expectedHost = String(Array.isArray(host) ? host[0] : host).split(',')[0]?.trim().toLowerCase();
    return parsedOrigin.host.toLowerCase() === expectedHost;
  } catch {
    return false;
  }
}

interface CountryItem {
  isoCode: string;
  name: string;
  phonecode: string;
  flag: string;
}

let cachedCountries: CountryItem[] | null = null;
function getCountryList(): CountryItem[] {
  if (!cachedCountries) {
    cachedCountries = Country.getAllCountries()
      .map((c) => ({
        isoCode: c.isoCode,
        name: c.name,
        phonecode: String(c.phonecode || '').replace(/^\+/, ''),
        flag: c.flag || ''
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  return cachedCountries;
}

function escapeCsvCell(value: unknown): string {
  let str = String(value ?? '').replace(/\r?\n/g, ' ');
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

function buildRegistrationsCsv(rows: AdminRegistrationRow[]): string {
  const headers = [
    'Enrollment ID',
    'Full Name',
    'Email',
    'Gender',
    'Phone',
    'Country',
    'State / Region',
    'City',
    'Course',
    'Status',
    'Notes',
    'Registered At'
  ];
  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      [
        r.enrollment_id,
        r.full_name,
        r.email,
        r.gender,
        r.phone,
        r.country_name,
        r.state_name,
        r.city,
        r.course_title,
        r.status,
        r.notes,
        r.created_at
      ]
        .map(escapeCsvCell)
        .join(',')
    )
  ];
  return lines.join('\n');
}

async function dispatchLearnerConfirmationEmail(args: {
  to: string;
  fullName: string;
  courseTitle: string;
}): Promise<{ delivered: boolean; mode: 'resend' | 'stub' }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || 'YOLETECH Learn <onboarding@resend.dev>',
          to: [args.to],
          subject: `Registration received: ${args.courseTitle} — YOLETECH`,
          html: `<p>Hi ${args.fullName.replace(/[&<>"']/g, '')},</p>
<p>Thank you for registering for <strong>${args.courseTitle.replace(/[&<>"']/g, '')}</strong> at YOLETECH.</p>
<p>Your registration is currently <strong>PENDING</strong> review. You can sign in anytime at <code>/learn/dashboard</code> with your registered email and password to view your status.</p>
<p>— YOLETECH Team</p>`
        })
      });
      if (res.ok) {
        return { delivered: true, mode: 'resend' };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[Learn Email] Resend learner confirmation failed:', msg);
    }
  }

  // TODO: Configure RESEND_API_KEY and RESEND_FROM_EMAIL (or wire your preferred transactional email provider)
  // to send live confirmation emails directly to learners in production.
  console.log('[Learn Email Stub] Learner confirmation email queued (console stub):', {
    to: args.to,
    subject: `Registration received: ${args.courseTitle} — YOLETECH`,
    fullName: args.fullName,
    courseTitle: args.courseTitle
  });
  return { delivered: false, mode: 'stub' };
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export async function handleLearnApiRequest(ctx: LearnRouteContext): Promise<boolean> {
  const { db, req, res, pathname, parsedUrl, clientIp, parseBody, sendJson, getAuthUser } = ctx;
  const method = req.method || 'GET';

  if (!pathname.startsWith('/api/learn') && !pathname.startsWith('/api/admin/learn')) {
    return false;
  }

  // CSRF / Origin check for state-changing requests
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    if (!isOriginAllowed(req)) {
      sendJson(res, 403, { error: 'Invalid request origin.' });
      return true;
    }
  }

  // ==========================================================================
  // PUBLIC LOCATIONS ENDPOINTS (bundled country-state-city, no external API)
  // ==========================================================================
  if (pathname === '/api/learn/locations/countries' && method === 'GET') {
    sendJson(
      res,
      200,
      { countries: getCountryList() },
      { 'Cache-Control': 'public, max-age=86400' }
    );
    return true;
  }

  if (pathname === '/api/learn/locations/states' && method === 'GET') {
    const country = String(parsedUrl.searchParams.get('country') || '').trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(country)) {
      sendJson(res, 400, { error: 'Valid 2-letter ISO country code is required.' });
      return true;
    }
    const states = State.getStatesOfCountry(country)
      .map((s) => ({ isoCode: s.isoCode, name: s.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
    sendJson(res, 200, { country, states }, { 'Cache-Control': 'public, max-age=86400' });
    return true;
  }

  if (pathname === '/api/learn/locations/cities' && method === 'GET') {
    const country = String(parsedUrl.searchParams.get('country') || '').trim().toUpperCase();
    const state = String(parsedUrl.searchParams.get('state') || '').trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(country)) {
      sendJson(res, 400, { error: 'Valid 2-letter ISO country code is required.' });
      return true;
    }
    const cities = state
      ? City.getCitiesOfState(country, state).map((c) => ({ name: c.name }))
      : (City.getCitiesOfCountry(country) || []).map((c) => ({ name: c.name }));
    const uniqueSorted = Array.from(new Set(cities.map((c) => c.name)))
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ name }));
    sendJson(
      res,
      200,
      { country, state, cities: uniqueSorted },
      { 'Cache-Control': 'public, max-age=86400' }
    );
    return true;
  }

  // ==========================================================================
  // PUBLIC LEARN PAGE CONTENT & PUBLISHED COURSES
  // ==========================================================================
  if (pathname === '/api/learn/content' && method === 'GET') {
    const courses = listPublishedCourses(db);
    const content = getLearnPageContent(db);
    sendJson(res, 200, { courses, content }, { 'Cache-Control': 'no-store' });
    return true;
  }

  // ==========================================================================
  // PUBLIC LEARNER REGISTRATION ENDPOINT
  // ==========================================================================
  if (pathname === '/api/learn/register' && method === 'POST') {
    const ipRate = checkCompositeRateLimit(`learn:ip:${clientIp}`, 10, 15 * 60 * 1000);
    if (!ipRate.allowed) {
      sendJson(
        res,
        429,
        { error: 'Too many registration attempts. Please wait a few minutes and try again.' },
        { 'Retry-After': String(ipRate.retryAfterSeconds) }
      );
      return true;
    }

    const body = await parseBody(req);

    // Honeypot check: bots filling hidden "website" field are rejected cleanly
    if (typeof body.website === 'string' && body.website.trim().length > 0) {
      sendJson(res, 400, { error: 'Unable to process registration request.' });
      return true;
    }

    const parsed = learnerRegistrationSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors = flattenZodFieldErrors(parsed.error);
      const firstError = Object.values(fieldErrors)[0] || 'Please check the highlighted fields.';
      sendJson(res, 400, { error: firstError, fieldErrors });
      return true;
    }

    const input = parsed.data;

    // Rate-limit by normalized email as well as IP
    const emailRate = checkCompositeRateLimit(`learn:email:${input.email}`, 5, 15 * 60 * 1000);
    if (!emailRate.allowed) {
      sendJson(
        res,
        429,
        { error: 'Too many registration attempts for this request. Please try again later.' },
        { 'Retry-After': String(emailRate.retryAfterSeconds) }
      );
      return true;
    }

    // Validate country exists in bundled dataset
    const countryRecord = Country.getCountryByCode(input.countryCode);
    if (!countryRecord) {
      sendJson(res, 400, {
        error: 'Please select a valid country.',
        fieldErrors: { countryCode: 'Please select a valid country.' }
      });
      return true;
    }

    const normalizedPhone = normalizeInternationalPhone(input.phone, countryRecord.isoCode);
    if (!normalizedPhone.valid) {
      sendJson(res, 400, {
        error: 'Please enter a valid international phone number.',
        fieldErrors: { phone: 'Please enter a valid international phone number.' }
      });
      return true;
    }

    const passwordHash = ctx.hashPassword(input.password);
    const result = registerLearnerTransaction(db, {
      fullName: input.fullName,
      gender: input.gender,
      countryCode: countryRecord.isoCode,
      countryName: countryRecord.name,
      stateCode: input.stateCode || '',
      stateName: input.stateName,
      city: input.city,
      courseId: input.courseId,
      phoneE164: normalizedPhone.e164,
      email: input.email,
      passwordHash
    });

    if (!result.ok) {
      if (result.code === 'COURSE_NOT_FOUND') {
        sendJson(res, 400, {
          error: 'The selected course is currently unavailable. Please choose another course.',
          fieldErrors: { courseId: 'Please choose an available course.' }
        });
        return true;
      }
      if (result.code === 'EMAIL_EXISTS') {
        // Generic friendly message that does not explicitly enumerate/leak account existence
        sendJson(res, 409, {
          error:
            'We could not complete registration with these details. If you have already registered, please sign in to your learner dashboard or check your email address.'
        });
        return true;
      }
      sendJson(res, 500, { error: 'Could not complete registration. Please try again.' });
      return true;
    }

    const token = ctx.signToken({
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      phone: result.user.phone,
      company: result.user.company,
      service_interest: result.user.service_interest,
      role: result.user.role,
      status: result.user.status,
      created_at: result.user.created_at
    });

    // Fire confirmation email + admin notification (non-blocking if external relay is slow/offline)
    await dispatchLearnerConfirmationEmail({
      to: result.user.email,
      fullName: result.profile.full_name,
      courseTitle: result.enrollment.course_title
    });

    void ctx.sendEmailToYoletech({
      subject: `[YOLETECH Learn Registration] ${result.profile.full_name} — ${result.enrollment.course_title}`,
      replyTo: result.user.email,
      fields: {
        Event: 'New Learner Registration',
        'Full Name': result.profile.full_name,
        Gender: result.profile.gender,
        Course: result.enrollment.course_title,
        Location: `${result.profile.city}, ${result.profile.state_name}, ${result.profile.country_name}`,
        Phone: result.profile.phone,
        Email: result.user.email,
        Status: result.enrollment.status
      }
    }).catch(() => {
      // Admin notification relay failure does not block learner signup
    });

    const extraHeaders: Record<string, string> = { 'Cache-Control': 'no-store' };
    if (typeof ctx.buildSessionCookie === 'function') {
      extraHeaders['Set-Cookie'] = ctx.buildSessionCookie(token, req);
    }

    sendJson(
      res,
      201,
      {
        token,
        user: result.user,
        profile: result.profile,
        enrollment: result.enrollment
      },
      extraHeaders
    );
    return true;
  }

  // ==========================================================================
  // AUTHENTICATED LEARNER DASHBOARD ENDPOINT
  // ==========================================================================
  if (pathname === '/api/learn/me' && method === 'GET') {
    const user = getAuthUser(req);
    if (!user) {
      sendJson(res, 401, { error: 'Please sign in to access your learner dashboard.' });
      return true;
    }
    const { profile, enrollments } = getLearnerDashboardData(db, user.id);
    sendJson(res, 200, { user, profile, enrollments }, { 'Cache-Control': 'no-store' });
    return true;
  }

  // ==========================================================================
  // ADMIN LEARN ENDPOINTS (strict server-side ADMIN role guard)
  // ==========================================================================
  if (pathname.startsWith('/api/admin/learn')) {
    const admin = getAuthUser(req);
    if (!admin || admin.role !== 'ADMIN') {
      sendJson(res, 403, { error: 'Admin access required.' });
      return true;
    }

    if (pathname === '/api/admin/learn/summary' && method === 'GET') {
      const summary = getAdminLearnSummary(db);
      sendJson(res, 200, { summary }, { 'Cache-Control': 'no-store' });
      return true;
    }

    // Courses CRUD & Reorder
    if (pathname === '/api/admin/learn/courses' && method === 'GET') {
      const courses = listAllCourses(db);
      sendJson(res, 200, { courses }, { 'Cache-Control': 'no-store' });
      return true;
    }

    if (pathname === '/api/admin/learn/courses' && method === 'POST') {
      const body = await parseBody(req);
      const parsed = courseInputSchema.safeParse(body);
      if (!parsed.success) {
        const fieldErrors = flattenZodFieldErrors(parsed.error);
        sendJson(res, 400, { error: Object.values(fieldErrors)[0] || 'Invalid course data.', fieldErrors });
        return true;
      }
      const course = createCourse(db, parsed.data);
      sendJson(res, 201, { course });
      return true;
    }

    if (pathname === '/api/admin/learn/courses/reorder' && method === 'PUT') {
      const body = await parseBody(req);
      const parsed = courseReorderSchema.safeParse(body);
      if (!parsed.success) {
        sendJson(res, 400, { error: 'Provide an ordered list of course IDs.' });
        return true;
      }
      const courses = reorderCourses(db, parsed.data.orderedIds);
      sendJson(res, 200, { courses });
      return true;
    }

    if (pathname.startsWith('/api/admin/learn/courses/') && method === 'PUT') {
      const id = Number(pathname.split('/').pop());
      if (!Number.isInteger(id) || id <= 0) {
        sendJson(res, 400, { error: 'Invalid course ID.' });
        return true;
      }
      const body = await parseBody(req);
      // Allow partial toggle (e.g. { status: 'published' | 'draft' }) or full edit
      const isStatusOnly =
        Object.keys(body).length === 1 && (body.status === 'draft' || body.status === 'published');
      if (isStatusOnly) {
        const updated = updateCourse(db, id, { status: body.status as 'draft' | 'published' });
        if (!updated) {
          sendJson(res, 404, { error: 'Course not found.' });
          return true;
        }
        sendJson(res, 200, { course: updated });
        return true;
      }
      const parsed = courseInputSchema.safeParse(body);
      if (!parsed.success) {
        const fieldErrors = flattenZodFieldErrors(parsed.error);
        sendJson(res, 400, { error: Object.values(fieldErrors)[0] || 'Invalid course data.', fieldErrors });
        return true;
      }
      try {
        const updated = updateCourse(db, id, parsed.data);
        if (!updated) {
          sendJson(res, 404, { error: 'Course not found.' });
          return true;
        }
        sendJson(res, 200, { course: updated });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/UNIQUE constraint failed: courses\.slug/i.test(msg)) {
          sendJson(res, 409, {
            error: 'Another course already uses that slug.',
            fieldErrors: { slug: 'That slug is already in use.' }
          });
          return true;
        }
        throw err;
      }
      return true;
    }

    if (pathname.startsWith('/api/admin/learn/courses/') && method === 'DELETE') {
      const id = Number(pathname.split('/').pop());
      if (!Number.isInteger(id) || id <= 0) {
        sendJson(res, 400, { error: 'Invalid course ID.' });
        return true;
      }
      const outcome = deleteOrArchiveCourse(db, id);
      if (outcome.action === 'not_found') {
        sendJson(res, 404, { error: 'Course not found.' });
        return true;
      }
      sendJson(res, 200, outcome);
      return true;
    }

    // Registrations list, filter, pagination & CSV export
    if (pathname === '/api/admin/learn/registrations' && method === 'GET') {
      const search = parsedUrl.searchParams.get('search') || undefined;
      const courseIdRaw = parsedUrl.searchParams.get('courseId');
      const courseId = courseIdRaw ? Number(courseIdRaw) : undefined;
      const country = parsedUrl.searchParams.get('country') || undefined;
      const statusRaw = (parsedUrl.searchParams.get('status') || '').toUpperCase();
      const status = (ENROLLMENT_STATUSES as readonly string[]).includes(statusRaw)
        ? (statusRaw as EnrollmentStatus)
        : undefined;
      const from = parsedUrl.searchParams.get('from') || undefined;
      const to = parsedUrl.searchParams.get('to') || undefined;
      const format = (parsedUrl.searchParams.get('format') || '').toLowerCase();

      if ((from && !isValidIsoDate(from)) || (to && !isValidIsoDate(to)) || (from && to && from > to)) {
        sendJson(res, 400, { error: 'Provide valid dates with From on or before To.' });
        return true;
      }

      const page = Number(parsedUrl.searchParams.get('page')) || 1;
      const limit = Number(parsedUrl.searchParams.get('limit')) || 20;

      const data = listAdminRegistrations(
        db,
        { search, courseId, country, status, from, to, page, limit },
        format !== 'csv'
      );

      if (format === 'csv') {
        const csv = buildRegistrationsCsv(data.registrations);
        res.writeHead(200, {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="yoletech-learn-registrations-${new Date().toISOString().slice(0, 10)}.csv"`,
          'Cache-Control': 'no-store'
        });
        res.end(csv);
        return true;
      }

      sendJson(res, 200, data, { 'Cache-Control': 'no-store' });
      return true;
    }

    // Bulk status update
    if (pathname === '/api/admin/learn/registrations/bulk' && method === 'PUT') {
      const body = await parseBody(req);
      const parsed = bulkEnrollmentUpdateSchema.safeParse(body);
      if (!parsed.success) {
        const fieldErrors = flattenZodFieldErrors(parsed.error);
        sendJson(res, 400, { error: Object.values(fieldErrors)[0] || 'Invalid bulk update request.', fieldErrors });
        return true;
      }
      const updatedCount = bulkUpdateEnrollments(db, parsed.data.ids, parsed.data.status);
      sendJson(res, 200, { updatedCount, status: parsed.data.status });
      return true;
    }

    // Single registration status / notes update
    if (pathname.startsWith('/api/admin/learn/registrations/') && method === 'PUT') {
      const id = Number(pathname.split('/').pop());
      if (!Number.isInteger(id) || id <= 0) {
        sendJson(res, 400, { error: 'Invalid registration ID.' });
        return true;
      }
      const body = await parseBody(req);
      const parsed = enrollmentUpdateSchema.safeParse(body);
      if (!parsed.success) {
        const fieldErrors = flattenZodFieldErrors(parsed.error);
        sendJson(res, 400, { error: Object.values(fieldErrors)[0] || 'Invalid update data.', fieldErrors });
        return true;
      }
      const updated = updateEnrollment(db, id, parsed.data);
      if (!updated) {
        sendJson(res, 404, { error: 'Registration not found.' });
        return true;
      }
      sendJson(res, 200, { registration: updated });
      return true;
    }

    // Page content & FAQ management
    if (pathname === '/api/admin/learn/content' && method === 'GET') {
      const content = getLearnPageContent(db);
      sendJson(res, 200, { content }, { 'Cache-Control': 'no-store' });
      return true;
    }

    if (pathname === '/api/admin/learn/content' && method === 'PUT') {
      const body = await parseBody(req);
      const parsed = learnPageContentSchema.safeParse(body);
      if (!parsed.success) {
        const fieldErrors = flattenZodFieldErrors(parsed.error);
        sendJson(res, 400, { error: Object.values(fieldErrors)[0] || 'Invalid page content.', fieldErrors });
        return true;
      }
      const content = updateLearnPageContent(db, parsed.data);
      sendJson(res, 200, { content });
      return true;
    }
  }

  return false;
}
