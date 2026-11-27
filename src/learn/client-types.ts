import type {
  AdminLearnSummary,
  AdminRegistrationRow,
  CourseRecord,
  LearnerEnrollmentView,
  LearnerProfileRecord
} from './db';
import type { LearnFaqItem, LearnPageContentData } from './seed-data';

export interface CountryOption {
  isoCode: string;
  name: string;
  phonecode: string;
  flag: string;
}

export interface StateOption {
  isoCode: string;
  name: string;
}

export interface CityOption {
  name: string;
}

export interface LearnFormValues {
  fullName: string;
  gender: string;
  countryCode: string;
  countryName: string;
  countryQuery: string;
  countryPhoneCode: string;
  stateCode: string;
  stateName: string;
  city: string;
  courseId: string;
  phone: string;
  email: string;
  password: string;
  consent: boolean;
  website: string;
}

export interface LearnClientState {
  loaded: boolean;
  loading: boolean;
  error: string;
  courses: CourseRecord[];
  content: LearnPageContentData | null;

  countries: CountryOption[];
  countriesLoaded: boolean;
  countriesLoading: boolean;
  countryDropdownOpen: boolean;
  countryHighlightIndex: number;

  states: StateOption[];
  statesLoading: boolean;
  statesLoadedFor: string;

  cities: CityOption[];
  citiesLoading: boolean;
  citiesLoadedFor: string;

  form: LearnFormValues;
  fieldErrors: Record<string, string>;
  formError: string;
  submitting: boolean;
  showPassword: boolean;
  legalModal: '' | 'terms' | 'privacy';
  courseModalId: number | null;

  dashboardLoading: boolean;
  dashboardLoaded: boolean;
  dashboardError: string;
  dashboardProfile: LearnerProfileRecord | null;
  dashboardEnrollments: LearnerEnrollmentView[];
}

export interface AdminLearnState {
  subTab: 'courses' | 'registrations' | 'content';
  loading: boolean;
  loaded: boolean;
  error: string;
  summary: AdminLearnSummary | null;
  courses: CourseRecord[];
  editingCourseId: number | null;
  courseFormOpen: boolean;
  courseSubmitting: boolean;
  courseError: string;
  courseFieldErrors: Record<string, string>;
  courseImageDraft: string;
  courseImageUploading: boolean;

  registrations: AdminRegistrationRow[];
  countries: string[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  regLoading: boolean;
  regError: string;
  regFilters: {
    search: string;
    courseId: string;
    country: string;
    status: string;
    from: string;
    to: string;
    page: number;
    limit: number;
  };
  selectedIds: number[];
  bulkStatus: string;
  bulkUpdating: boolean;
  drawerRegistrationId: number | null;
  drawerSaving: boolean;

  pageContent: LearnPageContentData | null;
  draftFaq: LearnFaqItem[] | null;
  contentSaving: boolean;
  contentError: string;
  contentMessage: string;
}

export interface AppUserLike {
  id: number;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  service_interest?: string;
  role: string;
  status?: string;
  created_at?: string;
}

export interface YoletechAppHost {
  currentPage: string;
  adminWorkspace: string;
  token: string | null;
  user: AppUserLike | null;
  _learnState?: LearnClientState;
  _adminLearnState?: AdminLearnState;
  api(endpoint: string, options?: RequestInit): Promise<Record<string, unknown>>;
  navigate(page: string, extra?: string | null): Promise<void>;
  render(): void;
  showToast(msg: string, type?: 'success' | 'error'): void;
  setFormConfirmation?(formKey: string, data: Record<string, unknown>): void;
  renderFormConfirmation?(formKey: string): string;
  saveLocalRegisteredUser?(userObj: AppUserLike, rawPassword?: string): void;
  renderClientPortalPage?(): string;
  logout?(showNotification?: boolean): void;
  // Learn methods attached on prototype
  ensureLearnState(): LearnClientState;
  ensureAdminLearnState(): AdminLearnState;
  loadLearnPublicData(force?: boolean): Promise<void>;
  loadLearnCountries(): Promise<void>;
  loadLearnStates(countryCode: string): Promise<void>;
  loadLearnCities(countryCode: string, stateCode: string): Promise<void>;
  loadLearnerDashboardData(force?: boolean): Promise<void>;
  loadAdminLearnData(force?: boolean): Promise<void>;
  loadAdminLearnRegistrations(): Promise<void>;
  syncDraftFaqFromDom(): void;
  updateCountryListboxDom(): void;
  updatePasswordStrengthDom(): void;
  selectLearnCountry(isoCode: string): Promise<void>;
  scrollToLearnRegistration(courseId?: number): void;
  openCourseDetailsModal(courseId: number): void;
  closeCourseDetailsModal(): void;
  registerFromCourseModal(courseId: number): void;
  renderLearnPage(): string;
  renderLearnerDashboardPage(): string;
  renderAdminLearnWorkspace(): string;
  mountLearnPage(): void;
}

export function escHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatModeLabel(mode: string): string {
  if (mode === 'in-person') return 'In-Person';
  if (mode === 'hybrid') return 'Hybrid';
  return 'Online';
}

export function formatDateShort(raw: string | undefined): string {
  if (!raw) return '—';
  const trimmed = String(raw).trim();
  const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(trimmed) ? `${trimmed.replace(' ', 'T')}Z` : trimmed;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return trimmed.slice(0, 10);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case 'APPROVED':
      return 'learn-status-badge status-approved';
    case 'COMPLETED':
      return 'learn-status-badge status-completed';
    case 'REJECTED':
      return 'learn-status-badge status-rejected';
    default:
      return 'learn-status-badge status-pending';
  }
}
