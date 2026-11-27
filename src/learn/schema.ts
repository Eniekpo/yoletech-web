import { z } from 'zod';
import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/min';

export const GENDER_OPTIONS = ['Male', 'Female', 'Prefer not to say'] as const;
export const COURSE_MODES = ['online', 'in-person', 'hybrid'] as const;
export const COURSE_STATUSES = ['draft', 'published'] as const;
export const ENROLLMENT_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'] as const;

export interface PasswordStrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  label: 'Too short' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  hint: string;
  checks: {
    minLength: boolean;
    hasLower: boolean;
    hasUpper: boolean;
    hasNumber: boolean;
    hasSymbol: boolean;
  };
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const value = String(password || '');
  const checks = {
    minLength: value.length >= 8,
    hasLower: /[a-z]/.test(value),
    hasUpper: /[A-Z]/.test(value),
    hasNumber: /\d/.test(value),
    hasSymbol: /[^A-Za-z0-9]/.test(value)
  };

  if (!checks.minLength) {
    return {
      score: 0,
      label: 'Too short',
      hint: 'Use at least 8 characters with a mix of letters and numbers.',
      checks
    };
  }

  let points = 1;
  if (checks.hasLower && checks.hasUpper) points += 1;
  if (checks.hasNumber) points += 1;
  if (checks.hasSymbol || value.length >= 12) points += 1;

  const score = Math.min(4, Math.max(1, points)) as 1 | 2 | 3 | 4;
  const labelMap: Record<1 | 2 | 3 | 4, PasswordStrengthResult['label']> = {
    1: 'Weak',
    2: 'Fair',
    3: 'Good',
    4: 'Strong'
  };
  const hintMap: Record<1 | 2 | 3 | 4, string> = {
    1: 'Add uppercase letters, numbers, or symbols to strengthen your password.',
    2: 'Almost there—add a number or special character for stronger security.',
    3: 'Good password. Adding a symbol or extra length makes it even stronger.',
    4: 'Strong password.'
  };

  return {
    score,
    label: labelMap[score],
    hint: hintMap[score],
    checks
  };
}

export function normalizeInternationalPhone(
  rawPhone: string,
  countryCode?: string
): { valid: boolean; e164: string; formatted: string } {
  const cleaned = String(rawPhone || '').trim();
  if (!cleaned) {
    return { valid: false, e164: '', formatted: '' };
  }
  const iso = countryCode && /^[A-Z]{2}$/.test(countryCode.toUpperCase())
    ? (countryCode.toUpperCase() as CountryCode)
    : undefined;

  const parsed = cleaned.startsWith('+')
    ? parsePhoneNumberFromString(cleaned)
    : parsePhoneNumberFromString(cleaned, iso);

  if (!parsed || !parsed.isValid()) {
    return { valid: false, e164: '', formatted: '' };
  }

  return {
    valid: true,
    e164: parsed.number,
    formatted: parsed.formatInternational()
  };
}

export const learnerRegistrationSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Full name must be at least 2 characters.')
      .max(120, 'Full name must be 120 characters or fewer.'),
    gender: z.enum(GENDER_OPTIONS, {
      message: 'Please select a gender option.'
    }),
    countryCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/, 'Please select a valid country.'),
    countryName: z
      .string()
      .trim()
      .min(2, 'Please select a country.')
      .max(100),
    stateCode: z.string().trim().max(20).optional().default(''),
    stateName: z
      .string()
      .trim()
      .min(1, 'Please select or enter your state / region.')
      .max(100, 'State / region must be 100 characters or fewer.'),
    city: z
      .string()
      .trim()
      .min(1, 'Please select or enter your city.')
      .max(100, 'City must be 100 characters or fewer.'),
    courseId: z.coerce
      .number()
      .int('Please select a course.')
      .positive('Please select a valid course.'),
    phone: z
      .string()
      .trim()
      .min(6, 'Please enter a valid international phone number.')
      .max(30, 'Phone number is too long.'),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Please enter a valid email address.')
      .max(180, 'Email address is too long.'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long.')
      .max(128, 'Password must be 128 characters or fewer.'),
    consent: z.boolean().refine((val) => val === true, {
      message: 'You must agree to the Terms and Privacy Policy to register.'
    }),
    website: z.string().optional().default('')
  })
  .superRefine((data, ctx) => {
    const phoneResult = normalizeInternationalPhone(data.phone, data.countryCode);
    if (!phoneResult.valid) {
      ctx.addIssue({
        code: 'custom',
        path: ['phone'],
        message: 'Please enter a valid international phone number for the selected country (e.g. +234 802 552 6389).'
      });
    }
  });

export type LearnerRegistrationInput = z.infer<typeof learnerRegistrationSchema>;

export function slugifyCourseTitle(input: string): string {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}

const RASTER_DATA_URI_RE = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i;

export function isValidCourseImageUrl(raw: string): boolean {
  const value = String(raw || '').trim();
  if (!value) return true;
  if (RASTER_DATA_URI_RE.test(value)) return true;
  if (value.startsWith('/') && !value.startsWith('//') && !/\s/.test(value)) {
    return true;
  }
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export const courseInputSchema = z.object({
  title: z.string().trim().min(3, 'Course title must be at least 3 characters.').max(140),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug may only contain lowercase letters, numbers, and hyphens.')
    .max(140)
    .optional()
    .or(z.literal('')),
  image_url: z
    .string()
    .trim()
    .max(1_500_000, 'Course image is too large. Please upload a smaller image (under 1 MB).')
    .refine(isValidCourseImageUrl, {
      message: 'Provide a valid image URL (https://... or /assets/...) or upload a PNG, JPG, WebP, or GIF image.'
    })
    .optional()
    .default(''),
  short_description: z
    .string()
    .trim()
    .min(10, 'Short description must be at least 10 characters.')
    .max(600),
  outcomes: z
    .array(z.string().trim().min(2, 'Each outcome must be at least 2 characters.').max(220))
    .min(1, 'Provide at least one learning outcome.')
    .max(12, 'Provide at most 12 learning outcomes.'),
  level: z.string().trim().min(2, 'Level is required.').max(60),
  mode: z.enum(COURSE_MODES, { message: 'Select online, in-person, or hybrid.' }),
  duration: z.string().trim().max(80).optional().default(''),
  price: z.string().trim().max(80).optional().default(''),
  status: z.enum(COURSE_STATUSES).optional().default('draft'),
  display_order: z.coerce.number().int().min(0).max(9999).optional().default(0)
});

export type CourseInput = z.infer<typeof courseInputSchema>;

export const courseReorderSchema = z.object({
  orderedIds: z.array(z.coerce.number().int().positive()).min(1, 'Provide at least one course ID.')
});

export const enrollmentUpdateSchema = z.object({
  status: z.enum(ENROLLMENT_STATUSES, { message: 'Invalid enrollment status.' }).optional(),
  notes: z.string().trim().max(2000, 'Notes must be 2,000 characters or fewer.').optional()
});

export const bulkEnrollmentUpdateSchema = z.object({
  ids: z.array(z.coerce.number().int().positive()).min(1, 'Select at least one registration.'),
  status: z.enum(ENROLLMENT_STATUSES, { message: 'Invalid enrollment status.' })
});

export const learnFaqItemSchema = z.object({
  question: z.string().trim().min(3, 'Question must be at least 3 characters.').max(240),
  answer: z.string().trim().min(5, 'Answer must be at least 5 characters.').max(1500)
});

export const learnPageContentSchema = z.object({
  headline: z.string().trim().min(5, 'Headline must be at least 5 characters.').max(180),
  subheadline: z.string().trim().min(10, 'Sub-headline must be at least 10 characters.').max(500),
  cta_label: z.string().trim().min(2, 'CTA label must be at least 2 characters.').max(60),
  faq: z.array(learnFaqItemSchema).max(20, 'Maximum of 20 FAQ items allowed.')
});

export type LearnPageContentInput = z.infer<typeof learnPageContentSchema>;

export function flattenZodFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : '_form';
    if (!fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}
