import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  learnerRegistrationSchema,
  courseInputSchema,
  learnPageContentSchema,
  evaluatePasswordStrength,
  normalizeInternationalPhone,
  flattenZodFieldErrors
} = require('../server/learn/index.js');

const validRegistration = {
  fullName: 'Ada Lovelace',
  gender: 'Female',
  countryCode: 'NG',
  countryName: 'Nigeria',
  stateCode: 'BY',
  stateName: 'Bayelsa',
  city: 'Yenagoa',
  courseId: 1,
  phone: '+234 802 552 6389',
  email: 'ada.lovelace@example.com',
  password: 'StrongPassword#2026',
  consent: true,
  website: ''
};

test('learnerRegistrationSchema accepts valid registration payload', () => {
  const result = learnerRegistrationSchema.safeParse(validRegistration);
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.email, 'ada.lovelace@example.com');
    assert.equal(result.data.courseId, 1);
  }
});

test('learnerRegistrationSchema rejects invalid international phone number', () => {
  const result = learnerRegistrationSchema.safeParse({
    ...validRegistration,
    phone: '+234 123'
  });
  assert.equal(result.success, false);
  if (!result.success) {
    const errs = flattenZodFieldErrors(result.error);
    assert.ok(errs.phone);
  }
});

test('learnerRegistrationSchema rejects password shorter than 8 characters', () => {
  const result = learnerRegistrationSchema.safeParse({
    ...validRegistration,
    password: 'short'
  });
  assert.equal(result.success, false);
  if (!result.success) {
    const errs = flattenZodFieldErrors(result.error);
    assert.ok(errs.password);
  }
});

test('learnerRegistrationSchema requires explicit Terms & Privacy consent', () => {
  const result = learnerRegistrationSchema.safeParse({
    ...validRegistration,
    consent: false
  });
  assert.equal(result.success, false);
  if (!result.success) {
    const errs = flattenZodFieldErrors(result.error);
    assert.ok(errs.consent);
  }
});

test('learnerRegistrationSchema rejects invalid email and invalid gender', () => {
  const result = learnerRegistrationSchema.safeParse({
    ...validRegistration,
    email: 'not-an-email',
    gender: 'Unknown'
  });
  assert.equal(result.success, false);
  if (!result.success) {
    const errs = flattenZodFieldErrors(result.error);
    assert.ok(errs.email);
    assert.ok(errs.gender);
  }
});

test('normalizeInternationalPhone formats valid E.164 phone numbers', () => {
  const ng = normalizeInternationalPhone('+234 802 552 6389', 'NG');
  assert.equal(ng.valid, true);
  assert.equal(ng.e164, '+2348025526389');

  const uk = normalizeInternationalPhone('07911 123456', 'GB');
  assert.equal(uk.valid, true);
  assert.equal(uk.e164, '+447911123456');

  const bad = normalizeInternationalPhone('555', 'US');
  assert.equal(bad.valid, false);
});

test('evaluatePasswordStrength scores short, weak, and strong passwords', () => {
  assert.equal(evaluatePasswordStrength('abc').score, 0);
  assert.equal(evaluatePasswordStrength('abcdefgh').score, 1);
  assert.equal(evaluatePasswordStrength('Abcd1234!@#').score, 4);
});

test('courseInputSchema validates optional duration, price, and image_url fields cleanly', () => {
  const baseCourse = {
    title: 'Cloud Operations Fundamentals',
    slug: '',
    image_url: '/assets/dashboard-preview.jpg',
    short_description: 'Hands-on introduction to managing cloud resources and deployment workflows.',
    outcomes: ['Configure cloud storage', 'Deploy web applications'],
    level: 'Beginner',
    mode: 'online',
    duration: '',
    price: '',
    status: 'draft',
    display_order: 8
  };
  assert.equal(courseInputSchema.safeParse(baseCourse).success, true);
  assert.equal(courseInputSchema.safeParse({ ...baseCourse, image_url: '' }).success, true);
  assert.equal(
    courseInputSchema.safeParse({ ...baseCourse, image_url: 'https://cdn.example.com/course.webp' }).success,
    true
  );
  assert.equal(
    courseInputSchema.safeParse({
      ...baseCourse,
      image_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    }).success,
    true
  );
  // Reject unsafe protocols or SVG data URIs
  assert.equal(courseInputSchema.safeParse({ ...baseCourse, image_url: 'javascript:alert(1)' }).success, false);
  assert.equal(
    courseInputSchema.safeParse({ ...baseCourse, image_url: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=' }).success,
    false
  );
});

test('learnPageContentSchema validates editable banner and FAQ items', () => {
  const parsed = learnPageContentSchema.safeParse({
    headline: 'Learn Practical Tech Skills at YOLETECH',
    subheadline: 'Structured training programs designed for practical hands-on learning.',
    cta_label: 'Register Now',
    faq: [{ question: 'How do I start?', answer: 'Pick a course and complete the form.' }]
  });
  assert.equal(parsed.success, true);
});
