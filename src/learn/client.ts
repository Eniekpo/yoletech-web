import {
  GENDER_OPTIONS,
  evaluatePasswordStrength,
  flattenZodFieldErrors,
  learnerRegistrationSchema,
  normalizeInternationalPhone
} from './schema';
import type { CourseRecord, LearnerEnrollmentView, LearnerProfileRecord } from './db';
import type { LearnPageContentData } from './seed-data';
import {
  escHtml,
  formatDateShort,
  formatModeLabel,
  statusBadgeClass,
  type CityOption,
  type CountryOption,
  type LearnClientState,
  type StateOption,
  type YoletechAppHost
} from './client-types';
import { attachAdminLearnMethods } from './client-admin';

declare const YoletechApp: { prototype: Record<string, unknown> } | undefined;

declare global {
  interface Window {
    YoletechApp?: { prototype: Record<string, unknown> };
    app?: YoletechAppHost;
  }
}

function createInitialLearnState(): LearnClientState {
  return {
    loaded: false,
    loading: false,
    error: '',
    courses: [],
    content: null,

    countries: [],
    countriesLoaded: false,
    countriesLoading: false,
    countryDropdownOpen: false,
    countryHighlightIndex: 0,

    states: [],
    statesLoading: false,
    statesLoadedFor: '',

    cities: [],
    citiesLoading: false,
    citiesLoadedFor: '',

    form: {
      fullName: '',
      gender: '',
      countryCode: '',
      countryName: '',
      countryQuery: '',
      countryPhoneCode: '',
      stateCode: '',
      stateName: '',
      city: '',
      courseId: '',
      phone: '',
      email: '',
      password: '',
      consent: false,
      website: ''
    },
    fieldErrors: {},
    formError: '',
    submitting: false,
    showPassword: false,
    legalModal: '',
    courseModalId: null,

    dashboardLoading: false,
    dashboardLoaded: false,
    dashboardError: '',
    dashboardProfile: null,
    dashboardEnrollments: []
  };
}

const LOCAL_LEARNERS_KEY = 'yoletech_local_learners';

interface LocalLearnerSnapshot {
  profile: LearnerProfileRecord | null;
  enrollments: LearnerEnrollmentView[];
}

function getLocalLearnerSnapshot(email: string | undefined): LocalLearnerSnapshot | null {
  const normEmail = String(email || '').trim().toLowerCase();
  if (!normEmail) return null;
  try {
    const raw = localStorage.getItem(LOCAL_LEARNERS_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, LocalLearnerSnapshot>;
    return map[normEmail] || null;
  } catch {
    return null;
  }
}

function saveLocalLearnerSnapshot(
  email: string | undefined,
  profile: LearnerProfileRecord | null,
  enrollments: LearnerEnrollmentView[]
): void {
  const normEmail = String(email || '').trim().toLowerCase();
  if (!normEmail) return;
  try {
    const raw = localStorage.getItem(LOCAL_LEARNERS_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, LocalLearnerSnapshot>) : {};
    map[normEmail] = { profile, enrollments };
    localStorage.setItem(LOCAL_LEARNERS_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors
  }
}

function normalizeUserRole(role: string | undefined): string {
  return String(role || 'CLIENT').trim().toUpperCase();
}

function getFilteredCountries(st: LearnClientState): CountryOption[] {
  const q = st.form.countryQuery.trim().toLowerCase();
  if (!q) return st.countries;
  return st.countries.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.isoCode.toLowerCase().includes(q) ||
      `+${c.phonecode}`.includes(q)
  );
}

function attachLearnClientMethods(proto: Record<string, unknown>): void {
  attachAdminLearnMethods(proto);

  proto.ensureLearnState = function (this: YoletechAppHost): LearnClientState {
    if (!this._learnState) {
      this._learnState = createInitialLearnState();
    }
    return this._learnState;
  };

  proto.loadLearnPublicData = async function (this: YoletechAppHost, force = false): Promise<void> {
    const st = this.ensureLearnState();
    if (st.loading || (st.loaded && !force)) return;
    st.loading = true;
    st.error = '';
    try {
      const data = await this.api('/api/learn/content');
      st.courses = Array.isArray(data.courses) ? (data.courses as CourseRecord[]) : [];
      st.content = (data.content as LearnPageContentData | undefined) || null;
      st.loaded = true;
    } catch (err) {
      st.error = err instanceof Error ? err.message : 'Unable to load training programs right now.';
    } finally {
      st.loading = false;
      if (this.currentPage === 'learn') {
        this.render();
      }
    }
  };

  proto.loadLearnCountries = async function (this: YoletechAppHost): Promise<void> {
    const st = this.ensureLearnState();
    if (st.countriesLoaded || st.countriesLoading) return;
    st.countriesLoading = true;
    try {
      const data = await this.api('/api/learn/locations/countries');
      st.countries = Array.isArray(data.countries) ? (data.countries as CountryOption[]) : [];
      st.countriesLoaded = true;
    } catch {
      st.countries = [];
    } finally {
      st.countriesLoading = false;
      if (this.currentPage === 'learn') {
        this.updateCountryListboxDom();
      }
    }
  };

  proto.loadLearnStates = async function (this: YoletechAppHost, countryCode: string): Promise<void> {
    const st = this.ensureLearnState();
    if (!countryCode) {
      st.states = [];
      st.statesLoadedFor = '';
      return;
    }
    st.statesLoading = true;
    st.states = [];
    st.cities = [];
    st.citiesLoadedFor = '';
    this.render();
    try {
      const data = await this.api(`/api/learn/locations/states?country=${encodeURIComponent(countryCode)}`);
      st.states = Array.isArray(data.states) ? (data.states as StateOption[]) : [];
      st.statesLoadedFor = countryCode;
      // If a country has no states, preload country-level cities so city dropdown still works if available
      if (st.states.length === 0) {
        await this.loadLearnCities(countryCode, '');
      }
    } catch {
      st.states = [];
      st.statesLoadedFor = countryCode;
    } finally {
      st.statesLoading = false;
      if (this.currentPage === 'learn') {
        this.render();
      }
    }
  };

  proto.loadLearnCities = async function (
    this: YoletechAppHost,
    countryCode: string,
    stateCode: string
  ): Promise<void> {
    const st = this.ensureLearnState();
    if (!countryCode) {
      st.cities = [];
      st.citiesLoadedFor = '';
      return;
    }
    const key = `${countryCode}:${stateCode}`;
    st.citiesLoading = true;
    st.cities = [];
    this.render();
    try {
      const qs = new URLSearchParams({ country: countryCode });
      if (stateCode) qs.set('state', stateCode);
      const data = await this.api(`/api/learn/locations/cities?${qs.toString()}`);
      st.cities = Array.isArray(data.cities) ? (data.cities as CityOption[]) : [];
      st.citiesLoadedFor = key;
    } catch {
      st.cities = [];
      st.citiesLoadedFor = key;
    } finally {
      st.citiesLoading = false;
      if (this.currentPage === 'learn') {
        this.render();
      }
    }
  };

  proto.loadLearnerDashboardData = async function (this: YoletechAppHost, force = false): Promise<void> {
    if (!this.user) return;
    const st = this.ensureLearnState();
    if (st.dashboardLoading || (st.dashboardLoaded && !force)) return;
    st.dashboardLoading = true;
    st.dashboardError = '';
    const userRole = normalizeUserRole(this.user.role);
    try {
      const data = await this.api('/api/learn/me');
      const apiProfile = (data.profile as LearnerProfileRecord | null | undefined) || null;
      const apiEnrollments = Array.isArray(data.enrollments)
        ? (data.enrollments as LearnerEnrollmentView[])
        : [];
      if (apiProfile || apiEnrollments.length > 0) {
        st.dashboardProfile = apiProfile;
        st.dashboardEnrollments = apiEnrollments;
        saveLocalLearnerSnapshot(this.user.email, apiProfile, apiEnrollments);
      } else if (userRole === 'LEARNER') {
        const cached = getLocalLearnerSnapshot(this.user.email);
        st.dashboardProfile = cached?.profile || null;
        st.dashboardEnrollments = cached?.enrollments || [];
      } else {
        st.dashboardProfile = null;
        st.dashboardEnrollments = [];
      }
      st.dashboardLoaded = true;
    } catch (err) {
      if (userRole === 'LEARNER') {
        const cached = getLocalLearnerSnapshot(this.user.email);
        if (cached) {
          st.dashboardProfile = cached.profile;
          st.dashboardEnrollments = cached.enrollments;
          st.dashboardLoaded = true;
          st.dashboardError = '';
        } else {
          st.dashboardError = err instanceof Error ? err.message : 'Unable to load your learner dashboard.';
        }
      } else {
        st.dashboardError = err instanceof Error ? err.message : 'Unable to load your learner dashboard.';
      }
    } finally {
      st.dashboardLoading = false;
      if (this.currentPage === 'learn-dashboard') {
        this.render();
      }
    }
  };

  proto.openCourseDetailsModal = function (this: YoletechAppHost, courseId: number): void {
    const st = this.ensureLearnState();
    st.courseModalId = courseId;
    this.render();
    window.setTimeout(() => {
      const dialog = document.getElementById('learn-course-details-modal');
      if (dialog && typeof dialog.focus === 'function') {
        dialog.focus();
      }
    }, 20);
  };

  proto.closeCourseDetailsModal = function (this: YoletechAppHost): void {
    const st = this.ensureLearnState();
    if (st.courseModalId === null) return;
    st.courseModalId = null;
    this.render();
  };

  proto.registerFromCourseModal = function (this: YoletechAppHost, courseId: number): void {
    const st = this.ensureLearnState();
    st.courseModalId = null;
    this.render();
    this.scrollToLearnRegistration(courseId);
  };

  proto.scrollToLearnRegistration = function (this: YoletechAppHost, courseId?: number): void {
    const st = this.ensureLearnState();
    if (courseId && Number.isInteger(courseId)) {
      st.form.courseId = String(courseId);
      delete st.fieldErrors.courseId;
      const selectEl = document.getElementById('learn-courseId') as HTMLSelectElement | null;
      if (selectEl) {
        selectEl.value = String(courseId);
      } else {
        this.render();
      }
    }
    const section = document.getElementById('learn-registration-section');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    window.setTimeout(() => {
      const firstInput = document.getElementById('learn-fullName') as HTMLInputElement | null;
      if (firstInput) firstInput.focus({ preventScroll: true });
    }, 350);
  };

  proto.handleLearnFieldChange = function (
    this: YoletechAppHost,
    field: keyof LearnClientState['form'],
    value: string | boolean
  ): void {
    const st = this.ensureLearnState();
    if (field === 'consent') {
      st.form.consent = Boolean(value);
    } else {
      st.form[field] = String(value);
    }
    if (st.fieldErrors[field]) {
      delete st.fieldErrors[field];
      const errEl = document.getElementById(`learn-${field}-error`);
      if (errEl) errEl.textContent = '';
      const inputEl = document.getElementById(`learn-${field}`);
      if (inputEl) {
        inputEl.classList.remove('is-invalid');
        inputEl.setAttribute('aria-invalid', 'false');
      }
    }
    if (field === 'password') {
      this.updatePasswordStrengthDom();
    }
    if (field === 'stateName' && st.states.length === 0 && st.form.countryCode) {
      // Unlock city input immediately when state is entered manually
      const cityEl = document.getElementById('learn-city') as HTMLInputElement | HTMLSelectElement | null;
      if (cityEl) {
        cityEl.disabled = !st.form.stateName.trim();
      }
    }
  };

  proto.updatePasswordStrengthDom = function (this: YoletechAppHost): void {
    const st = this.ensureLearnState();
    const res = evaluatePasswordStrength(st.form.password);
    const bar = document.getElementById('learn-password-strength-bar');
    const text = document.getElementById('learn-password-strength-text');
    if (bar) {
      bar.setAttribute('data-score', String(res.score));
      bar.style.width = `${Math.max(10, res.score * 25)}%`;
    }
    if (text) {
      text.textContent = st.form.password
        ? `Strength: ${res.label} — ${res.hint}`
        : 'Minimum 8 characters. Mix uppercase, lowercase, numbers, or symbols.';
    }
  };

  proto.toggleLearnPasswordVisibility = function (this: YoletechAppHost): void {
    const st = this.ensureLearnState();
    st.showPassword = !st.showPassword;
    const input = document.getElementById('learn-password') as HTMLInputElement | null;
    const btn = document.getElementById('learn-password-toggle') as HTMLButtonElement | null;
    if (input) input.type = st.showPassword ? 'text' : 'password';
    if (btn) {
      btn.setAttribute('aria-pressed', String(st.showPassword));
      btn.textContent = st.showPassword ? 'Hide' : 'Show';
    }
  };

  proto.updateCountryListboxDom = function (this: YoletechAppHost): void {
    const st = this.ensureLearnState();
    const listEl = document.getElementById('learn-country-listbox');
    const inputEl = document.getElementById('learn-country') as HTMLInputElement | null;
    if (!listEl || !inputEl) return;

    const filtered = getFilteredCountries(st);
    if (!st.countryDropdownOpen) {
      listEl.hidden = true;
      inputEl.setAttribute('aria-expanded', 'false');
      inputEl.removeAttribute('aria-activedescendant');
      return;
    }

    listEl.hidden = false;
    inputEl.setAttribute('aria-expanded', 'true');

    if (st.countriesLoading) {
      listEl.innerHTML = `<li class="learn-combobox-empty" role="option" aria-disabled="true">Loading countries...</li>`;
      return;
    }

    if (filtered.length === 0) {
      listEl.innerHTML = `<li class="learn-combobox-empty" role="option" aria-disabled="true">No matching country found.</li>`;
      inputEl.removeAttribute('aria-activedescendant');
      return;
    }

    if (st.countryHighlightIndex >= filtered.length) st.countryHighlightIndex = 0;
    if (st.countryHighlightIndex < 0) st.countryHighlightIndex = filtered.length - 1;

    const slice = filtered.slice(0, 80);
    listEl.innerHTML = slice
      .map((c, idx) => {
        const isSelected = c.isoCode === st.form.countryCode;
        const isActive = idx === st.countryHighlightIndex;
        return `
          <li
            id="learn-country-opt-${escHtml(c.isoCode)}"
            role="option"
            aria-selected="${isSelected}"
            class="learn-combobox-option ${isActive ? 'is-active' : ''} ${isSelected ? 'is-selected' : ''}"
            onmousedown="event.preventDefault(); window.app.selectLearnCountry('${escHtml(c.isoCode)}')"
          >
            <span class="learn-combobox-option-name">${escHtml(c.flag)} ${escHtml(c.name)}</span>
            <span class="learn-combobox-option-code">+${escHtml(c.phonecode)}</span>
          </li>
        `;
      })
      .join('');

    const activeOpt = slice[st.countryHighlightIndex];
    if (activeOpt) {
      inputEl.setAttribute('aria-activedescendant', `learn-country-opt-${activeOpt.isoCode}`);
      const activeNode = document.getElementById(`learn-country-opt-${activeOpt.isoCode}`);
      if (activeNode && typeof activeNode.scrollIntoView === 'function') {
        activeNode.scrollIntoView({ block: 'nearest' });
      }
    }
  };

  proto.handleLearnCountryInput = function (this: YoletechAppHost, query: string): void {
    const st = this.ensureLearnState();
    st.form.countryQuery = query;
    st.countryDropdownOpen = true;
    st.countryHighlightIndex = 0;
    if (!query.trim()) {
      st.form.countryCode = '';
      st.form.countryName = '';
      st.form.countryPhoneCode = '';
      st.form.stateCode = '';
      st.form.stateName = '';
      st.form.city = '';
      st.states = [];
      st.cities = [];
    }
    this.updateCountryListboxDom();
  };

  proto.handleLearnCountryFocus = function (this: YoletechAppHost): void {
    const st = this.ensureLearnState();
    if (!st.countriesLoaded) {
      void this.loadLearnCountries();
    }
    st.countryDropdownOpen = true;
    this.updateCountryListboxDom();
  };

  proto.handleLearnCountryBlur = function (this: YoletechAppHost): void {
    const st = this.ensureLearnState();
    window.setTimeout(() => {
      st.countryDropdownOpen = false;
      this.updateCountryListboxDom();
    }, 150);
  };

  proto.handleLearnCountryKeydown = function (this: YoletechAppHost, e: KeyboardEvent): void {
    const st = this.ensureLearnState();
    const filtered = getFilteredCountries(st).slice(0, 80);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      st.countryDropdownOpen = true;
      st.countryHighlightIndex = filtered.length ? (st.countryHighlightIndex + 1) % filtered.length : 0;
      this.updateCountryListboxDom();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      st.countryDropdownOpen = true;
      st.countryHighlightIndex = filtered.length
        ? (st.countryHighlightIndex - 1 + filtered.length) % filtered.length
        : 0;
      this.updateCountryListboxDom();
    } else if (e.key === 'Enter' && st.countryDropdownOpen) {
      const picked = filtered[st.countryHighlightIndex];
      if (picked) {
        e.preventDefault();
        void this.selectLearnCountry(picked.isoCode);
      }
    } else if (e.key === 'Escape') {
      st.countryDropdownOpen = false;
      this.updateCountryListboxDom();
    }
  };

  proto.selectLearnCountry = async function (this: YoletechAppHost, isoCode: string): Promise<void> {
    const st = this.ensureLearnState();
    const country = st.countries.find((c) => c.isoCode === isoCode);
    if (!country) return;

    const prevDial = st.form.countryPhoneCode ? `+${st.form.countryPhoneCode}` : '';
    st.form.countryCode = country.isoCode;
    st.form.countryName = country.name;
    st.form.countryQuery = country.name;
    st.form.countryPhoneCode = country.phonecode;
    st.form.stateCode = '';
    st.form.stateName = '';
    st.form.city = '';
    st.countryDropdownOpen = false;
    delete st.fieldErrors.countryCode;
    delete st.fieldErrors.countryName;

    // Default phone prefix to selected country's dialing code if phone is empty or only held previous prefix
    const trimmedPhone = st.form.phone.trim();
    const nextDial = country.phonecode ? `+${country.phonecode}` : '';
    if (nextDial && (!trimmedPhone || trimmedPhone === prevDial)) {
      st.form.phone = `${nextDial} `;
    }

    await this.loadLearnStates(country.isoCode);
  };

  proto.handleLearnStateSelect = async function (this: YoletechAppHost, stateCode: string): Promise<void> {
    const st = this.ensureLearnState();
    const matched = st.states.find((s) => s.isoCode === stateCode);
    st.form.stateCode = matched ? matched.isoCode : '';
    st.form.stateName = matched ? matched.name : '';
    st.form.city = '';
    delete st.fieldErrors.stateName;
    if (matched && st.form.countryCode) {
      await this.loadLearnCities(st.form.countryCode, matched.isoCode);
    } else {
      st.cities = [];
      this.render();
    }
  };

  proto.openLearnLegalModal = function (this: YoletechAppHost, mode: '' | 'terms' | 'privacy'): void {
    const st = this.ensureLearnState();
    st.legalModal = mode;
    this.render();
  };

  proto.handleLearnRegistrationSubmit = async function (this: YoletechAppHost, e: Event): Promise<void> {
    e.preventDefault();
    const st = this.ensureLearnState();
    const form = e.target as HTMLFormElement;

    const readEl = (name: string): string => {
      const el = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
      return el ? el.value : '';
    };
    const consentEl = form.elements.namedItem('consent') as HTMLInputElement | null;

    // Sync latest DOM values into state so re-renders preserve user input
    st.form.fullName = readEl('fullName');
    st.form.gender = readEl('gender');
    if (st.states.length === 0) {
      st.form.stateName = readEl('stateName');
    }
    st.form.city = readEl('city');
    st.form.courseId = readEl('courseId');
    st.form.phone = readEl('phone');
    st.form.email = readEl('email');
    st.form.password = readEl('password');
    st.form.consent = Boolean(consentEl?.checked);
    st.form.website = readEl('website');

    // If user typed a country name directly without clicking the option, attempt exact match
    if (!st.form.countryCode && st.form.countryQuery.trim()) {
      const exact = st.countries.find(
        (c) => c.name.toLowerCase() === st.form.countryQuery.trim().toLowerCase()
      );
      if (exact) {
        st.form.countryCode = exact.isoCode;
        st.form.countryName = exact.name;
        st.form.countryPhoneCode = exact.phonecode;
      }
    }

    const phoneCandidate = st.form.phone.trim();
    const phoneWithPrefix =
      phoneCandidate && !phoneCandidate.startsWith('+') && st.form.countryPhoneCode
        ? `+${st.form.countryPhoneCode}${phoneCandidate.replace(/^0+/, '')}`
        : phoneCandidate;

    const candidate = {
      fullName: st.form.fullName,
      gender: st.form.gender,
      countryCode: st.form.countryCode,
      countryName: st.form.countryName,
      stateCode: st.form.stateCode,
      stateName: st.form.stateName,
      city: st.form.city,
      courseId: st.form.courseId ? Number(st.form.courseId) : 0,
      phone: phoneWithPrefix,
      email: st.form.email,
      password: st.form.password,
      consent: st.form.consent,
      website: st.form.website
    };

    const parsed = learnerRegistrationSchema.safeParse(candidate);
    if (!parsed.success) {
      st.fieldErrors = flattenZodFieldErrors(parsed.error);
      st.formError = Object.values(st.fieldErrors)[0] || 'Please fix the highlighted fields below.';
      this.showToast(st.formError, 'error');
      this.render();
      const firstKey = Object.keys(st.fieldErrors)[0];
      if (firstKey) {
        const focusId =
          firstKey === 'countryCode' || firstKey === 'countryName'
            ? 'learn-country'
            : firstKey === 'stateName'
            ? 'learn-state'
            : `learn-${firstKey}`;
        const el = document.getElementById(focusId);
        if (el && typeof el.focus === 'function') el.focus();
      }
      return;
    }

    const normalized = normalizeInternationalPhone(parsed.data.phone, parsed.data.countryCode);
    const submitPayload = {
      ...parsed.data,
      phone: normalized.valid ? normalized.e164 : parsed.data.phone
    };

    st.submitting = true;
    st.fieldErrors = {};
    st.formError = '';
    this.render();

    try {
      const res = await fetch('/api/learn/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitPayload)
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const serverFieldErrors =
          data.fieldErrors && typeof data.fieldErrors === 'object'
            ? (data.fieldErrors as Record<string, string>)
            : {};
        st.fieldErrors = serverFieldErrors;
        st.formError = typeof data.error === 'string' ? data.error : 'Could not complete registration.';
        this.showToast(st.formError, 'error');
        return;
      }

      const token = String(data.token || '');
      const rawUser = data.user as YoletechAppHost['user'];
      const user = rawUser
        ? { ...rawUser, role: normalizeUserRole(rawUser.role || 'LEARNER') }
        : null;
      const profile = (data.profile as LearnerProfileRecord | undefined) || null;
      const enrollment = (data.enrollment as LearnerEnrollmentView | undefined) || null;
      const enrollments = enrollment ? [enrollment] : [];

      if (token && user) {
        this.token = token;
        this.user = user;
        this.saveLocalRegisteredUser?.(user, submitPayload.password);
        saveLocalLearnerSnapshot(user.email, profile, enrollments);
        localStorage.setItem('yoletech_token', token);
        localStorage.setItem('yoletech_user', JSON.stringify(user));
      }

      // Reset registration form and pre-populate learner dashboard state
      const preservedCourses = st.courses;
      const preservedContent = st.content;
      const preservedCountries = st.countries;
      const nextState = createInitialLearnState();
      nextState.loaded = true;
      nextState.courses = preservedCourses;
      nextState.content = preservedContent;
      nextState.countries = preservedCountries;
      nextState.countriesLoaded = preservedCountries.length > 0;
      nextState.dashboardLoaded = Boolean(profile);
      nextState.dashboardProfile = profile;
      nextState.dashboardEnrollments = enrollments;
      this._learnState = nextState;

      if (typeof this.setFormConfirmation === 'function') {
        this.setFormConfirmation('learn-welcome', {
          title: 'Registration Confirmed!',
          message: `Welcome, <strong>${escHtml(profile?.full_name || user?.name || 'Learner')}</strong>! Your registration for <strong>${escHtml(enrollment?.course_title || 'your course')}</strong> has been received and is currently <strong>PENDING</strong> review.`
        });
      }
      this.showToast('Registration complete! Welcome to your learner dashboard.');
      await this.navigate('learn-dashboard');
    } catch {
      st.formError = 'Network error while submitting registration. Please check your connection and try again.';
      this.showToast(st.formError, 'error');
    } finally {
      if (this._learnState) {
        this._learnState.submitting = false;
      }
      if (this.currentPage === 'learn') {
        this.render();
      }
    }
  };

  proto.mountLearnPage = function (this: YoletechAppHost): void {
    const st = this.ensureLearnState();
    if (!st.loaded && !st.loading) {
      void this.loadLearnPublicData();
    }
    if (!st.countriesLoaded && !st.countriesLoading) {
      void this.loadLearnCountries();
    }
    this.updatePasswordStrengthDom();
  };

  proto.renderLearnPage = function (this: YoletechAppHost): string {
    const st = this.ensureLearnState();
    if (!st.loaded && !st.loading) {
      void this.loadLearnPublicData();
    }
    if (!st.countriesLoaded && !st.countriesLoading) {
      void this.loadLearnCountries();
    }

    const content = st.content;
    const courses = st.courses;
    const headline = content?.headline || 'Build In-Demand Tech Skills. Learn by Doing.';
    const subheadline =
      content?.subheadline ||
      'Hands-on training in web development, data analytics, AI automation, and IT—guided step by step from day one.';
    const ctaLabel = content?.cta_label || 'Register Now';
    const faqs = content?.faq || [];

    const hasCountry = Boolean(st.form.countryCode);
    const countryHasPredefinedStates = st.states.length > 0;
    const stateReady = hasCountry && (countryHasPredefinedStates ? Boolean(st.form.stateCode) : Boolean(st.form.stateName.trim()));
    const stateHasPredefinedCities = st.cities.length > 0;
    const pwdStrength = evaluatePasswordStrength(st.form.password);

    const countryError = st.fieldErrors.countryCode || st.fieldErrors.countryName || '';
    const stateError = st.fieldErrors.stateName || '';

    return `
      <div class="learn-page">
        <!-- HERO / ADVERT BANNER -->
        <section class="learn-hero-section">
          <div class="container">
            <div class="learn-hero-card">
              <div class="learn-hero-grid">
                <div class="learn-hero-copy">
                  <div class="eyebrow"><span class="eyebrow-dot"></span> YOLETECH TRAINING PROGRAMS</div>
                  <h1 class="learn-hero-title">${escHtml(headline)}</h1>
                  <p class="learn-hero-subtitle">${escHtml(subheadline)}</p>

                  <div class="learn-hero-actions">
                    <button type="button" class="btn btn-lime" onclick="window.app.scrollToLearnRegistration()">
                      ${escHtml(ctaLabel)} →
                    </button>
                    <a href="/login" class="btn btn-outline" onclick="event.preventDefault(); window.app.navigate('login');">
                      Sign In
                    </a>
                    ${
                      this.user && normalizeUserRole(this.user.role) === 'LEARNER'
                        ? `<a href="/learn/dashboard" class="btn btn-outline" onclick="event.preventDefault(); window.app.navigate('learn-dashboard');">My Learner Portal →</a>`
                        : this.user && normalizeUserRole(this.user.role) === 'CLIENT'
                        ? `<a href="/portal" class="btn btn-outline" onclick="event.preventDefault(); window.app.navigate('portal');">Client Portal →</a>`
                        : ''
                    }
                  </div>
                </div>

                <div class="learn-hero-media">
                  <img
                    src="/assets/learn-hero-learner.jpg"
                    alt="Learner studying practical technology skills on a laptop in a sunlit workspace"
                    class="learn-hero-img"
                    width="1024"
                    height="576"
                    decoding="async"
                    fetchpriority="high"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- COURSES GRID SECTION -->
        <section id="learn-courses-section" class="section">
          <div class="container">
            <div class="section-header">
              <div class="eyebrow"><span class="eyebrow-dot"></span> TRAINING CATALOG</div>
              <h2 class="section-title">Explore Our Training Programs</h2>
              <p class="section-desc">
                Choose a program aligned with your goals and register directly to begin your enrollment review.
              </p>
            </div>

            ${
              st.loading && !st.loaded
                ? `
              <div class="glass-card learn-state-card" role="status" aria-live="polite">
                <div class="learn-spinner" aria-hidden="true"></div>
                <p>Loading available courses...</p>
              </div>
            `
                : st.error
                ? `
              <div class="glass-card learn-state-card" role="alert">
                <p>${escHtml(st.error)}</p>
                <button type="button" class="btn btn-lime btn-sm" onclick="window.app.loadLearnPublicData(true)">Try Again</button>
              </div>
            `
                : courses.length === 0
                ? `
              <div class="glass-card learn-state-card" role="status">
                <p>No training courses are currently published. Please check back soon.</p>
              </div>
            `
                : `
              <div class="learn-courses-grid">
                ${courses
                  .map(
                    (course) => `
                  <article class="glass-card learn-course-card" data-no-card-icon="true">
                    <h3 class="learn-course-title">${escHtml(course.title)}</h3>
                    <div class="learn-course-media">
                      ${
                        course.image_url
                          ? `<img class="learn-course-image" src="${escHtml(course.image_url)}" alt="${escHtml(course.title)}" loading="lazy" decoding="async" onerror="this.style.display='none';if(this.nextElementSibling){this.nextElementSibling.classList.remove('is-hidden');}" /><div class="learn-course-image-fallback is-hidden" aria-hidden="true"><span>YOLETECH</span></div>`
                          : `<div class="learn-course-image-fallback" role="img" aria-label="${escHtml(course.title)} course image"><span>YOLETECH</span></div>`
                      }
                    </div>
                    <div class="learn-course-card-actions">
                      <button type="button" class="btn btn-lime btn-sm" onclick="window.app.scrollToLearnRegistration(${course.id})">
                        Register for this Course
                      </button>
                      <button type="button" class="btn btn-outline btn-sm" onclick="window.app.openCourseDetailsModal(${course.id})">
                        Course Details
                      </button>
                    </div>
                  </article>
                `
                  )
                  .join('')}
              </div>
            `
            }
          </div>
        </section>

        <!-- HOW IT WORKS STRIP -->
        <section class="section section-alt">
          <div class="container">
            <div class="section-header" style="margin-bottom:32px;">
              <div class="eyebrow"><span class="eyebrow-dot"></span> HOW IT WORKS</div>
              <h2 class="section-title">Simple Path from Registration to Learning</h2>
            </div>
            <div class="learn-how-grid">
              <div class="glass-card learn-how-step">
                <span class="tech-pill lime">Step 01</span>
                <h3>Pick a Program</h3>
                <p>Review the outcomes, level, and delivery mode for each program and select the track that fits you.</p>
              </div>
              <div class="glass-card learn-how-step">
                <span class="tech-pill orange">Step 02</span>
                <h3>Register Your Account</h3>
                <p>Submit the registration form below to create your learner account and record your course request.</p>
              </div>
              <div class="glass-card learn-how-step">
                <span class="tech-pill lime">Step 03</span>
                <h3>Enrollment Review</h3>
                <p>Our team reviews your registration and updates your status on your learner dashboard with next steps.</p>
              </div>
              <div class="glass-card learn-how-step">
                <span class="tech-pill orange">Step 04</span>
                <h3>Begin Sessions</h3>
                <p>Once approved, receive your schedule and start working through practical, guided modules.</p>
              </div>
            </div>
          </div>
        </section>

        <!-- REGISTRATION FORM SECTION -->
        <section id="learn-registration-section" class="section">
          <div class="container" style="max-width:780px;">
            <div class="section-header" style="margin-bottom:28px;">
              <div class="eyebrow"><span class="eyebrow-dot"></span> LEARNER REGISTRATION</div>
              <h2 class="section-title">Register for a Training Program</h2>
              <p class="section-desc">
                Complete the form below to create your learner account and apply for your chosen course.
                Already registered? <a href="/login" style="color:var(--yole-lime);font-weight:700;text-decoration:underline;" onclick="event.preventDefault(); window.app.navigate('login');">Sign in here</a>.
              </p>
            </div>

            <div class="glass-card learn-form-card">
              ${
                st.formError
                  ? `<div class="form-error-box" role="alert" aria-live="assertive"><strong>Please check your registration details:</strong> ${escHtml(st.formError)}</div>`
                  : ''
              }

              <form id="learn-registration-form" novalidate onsubmit="window.app.handleLearnRegistrationSubmit(event)">
                <!-- Honeypot field (hidden from assistive tech and human users) -->
                <div class="learn-honeypot" aria-hidden="true">
                  <label for="learn-website">Website</label>
                  <input id="learn-website" name="website" type="text" tabindex="-1" autocomplete="off" value="${escHtml(st.form.website)}" />
                </div>

                <!-- 1. Full Name -->
                <div class="form-group">
                  <label class="form-label" for="learn-fullName">1. Full Name <span aria-hidden="true">*</span></label>
                  <input
                    id="learn-fullName"
                    name="fullName"
                    type="text"
                    required
                    autocomplete="name"
                    class="form-control ${st.fieldErrors.fullName ? 'is-invalid' : ''}"
                    value="${escHtml(st.form.fullName)}"
                    placeholder="Enter your full name"
                    aria-invalid="${Boolean(st.fieldErrors.fullName)}"
                    aria-describedby="learn-fullName-error"
                    oninput="window.app.handleLearnFieldChange('fullName', this.value)"
                  />
                  <div id="learn-fullName-error" class="field-error-msg" role="alert">${escHtml(st.fieldErrors.fullName || '')}</div>
                </div>

                <!-- 2. Gender -->
                <div class="form-group">
                  <label class="form-label" for="learn-gender">2. Gender <span aria-hidden="true">*</span></label>
                  <select
                    id="learn-gender"
                    name="gender"
                    required
                    class="form-control ${st.fieldErrors.gender ? 'is-invalid' : ''}"
                    aria-invalid="${Boolean(st.fieldErrors.gender)}"
                    aria-describedby="learn-gender-error"
                    onchange="window.app.handleLearnFieldChange('gender', this.value)"
                  >
                    <option value="">Select gender</option>
                    ${GENDER_OPTIONS.map(
                      (g) => `<option value="${g}" ${st.form.gender === g ? 'selected' : ''}>${g}</option>`
                    ).join('')}
                  </select>
                  <div id="learn-gender-error" class="field-error-msg" role="alert">${escHtml(st.fieldErrors.gender || '')}</div>
                </div>

                <!-- 3. Country (searchable combobox) -->
                <div class="form-group learn-combobox-wrap">
                  <label class="form-label" for="learn-country">3. Country <span aria-hidden="true">*</span></label>
                  <input
                    id="learn-country"
                    name="countryQuery"
                    type="text"
                    role="combobox"
                    autocomplete="off"
                    aria-autocomplete="list"
                    aria-expanded="${st.countryDropdownOpen}"
                    aria-controls="learn-country-listbox"
                    aria-invalid="${Boolean(countryError)}"
                    aria-describedby="learn-country-hint learn-country-error"
                    class="form-control ${countryError ? 'is-invalid' : ''}"
                    value="${escHtml(st.form.countryQuery)}"
                    placeholder="Search and select your country..."
                    onfocus="window.app.handleLearnCountryFocus()"
                    onblur="window.app.handleLearnCountryBlur()"
                    oninput="window.app.handleLearnCountryInput(this.value)"
                    onkeydown="window.app.handleLearnCountryKeydown(event)"
                  />
                  <ul id="learn-country-listbox" class="learn-combobox-list" role="listbox" aria-label="Countries" hidden></ul>
                  <div id="learn-country-hint" class="learn-field-hint">
                    ${
                      st.form.countryCode
                        ? `Selected: ${escHtml(st.form.countryName)} (+${escHtml(st.form.countryPhoneCode)})`
                        : 'Type to search all countries and press Enter or click to select.'
                    }
                  </div>
                  <div id="learn-country-error" class="field-error-msg" role="alert">${escHtml(countryError)}</div>
                </div>

                <!-- 4. State & 5. City -->
                <div class="grid-2" style="gap:16px;">
                  <div class="form-group">
                    <label class="form-label" for="learn-state">
                      4. State / Region <span aria-hidden="true">*</span>
                      ${hasCountry && !st.statesLoading && !countryHasPredefinedStates ? '<span class="learn-inline-note">(enter manually)</span>' : ''}
                    </label>
                    ${
                      !hasCountry || st.statesLoading || countryHasPredefinedStates
                        ? `
                      <select
                        id="learn-state"
                        name="stateCode"
                        ${!hasCountry || st.statesLoading ? 'disabled' : ''}
                        class="form-control ${stateError ? 'is-invalid' : ''}"
                        aria-invalid="${Boolean(stateError)}"
                        aria-describedby="learn-state-hint learn-state-error"
                        onchange="window.app.handleLearnStateSelect(this.value)"
                      >
                        <option value="">
                          ${!hasCountry ? 'Select a country first' : st.statesLoading ? 'Loading states...' : 'Select state / region'}
                        </option>
                        ${st.states
                          .map(
                            (s) => `<option value="${escHtml(s.isoCode)}" ${st.form.stateCode === s.isoCode ? 'selected' : ''}>${escHtml(s.name)}</option>`
                          )
                          .join('')}
                      </select>
                    `
                        : `
                      <input
                        id="learn-state"
                        name="stateName"
                        type="text"
                        required
                        class="form-control ${stateError ? 'is-invalid' : ''}"
                        value="${escHtml(st.form.stateName)}"
                        placeholder="Enter your state, province, or region"
                        aria-invalid="${Boolean(stateError)}"
                        aria-describedby="learn-state-hint learn-state-error"
                        oninput="window.app.handleLearnFieldChange('stateName', this.value)"
                      />
                    `
                    }
                    <div id="learn-state-hint" class="learn-field-hint">
                      ${
                        !hasCountry
                          ? 'Choose a country first to load states.'
                          : !st.statesLoading && !countryHasPredefinedStates
                          ? 'No predefined states listed for this country—please type your state or region.'
                          : ''
                      }
                    </div>
                    <div id="learn-state-error" class="field-error-msg" role="alert">${escHtml(stateError)}</div>
                  </div>

                  <div class="form-group">
                    <label class="form-label" for="learn-city">
                      5. City <span aria-hidden="true">*</span>
                      ${stateReady && !st.citiesLoading && !stateHasPredefinedCities ? '<span class="learn-inline-note">(enter manually)</span>' : ''}
                    </label>
                    ${
                      !stateReady || st.citiesLoading || stateHasPredefinedCities
                        ? `
                      <select
                        id="learn-city"
                        name="city"
                        ${!stateReady || st.citiesLoading ? 'disabled' : ''}
                        class="form-control ${st.fieldErrors.city ? 'is-invalid' : ''}"
                        aria-invalid="${Boolean(st.fieldErrors.city)}"
                        aria-describedby="learn-city-hint learn-city-error"
                        onchange="window.app.handleLearnFieldChange('city', this.value)"
                      >
                        <option value="">
                          ${!stateReady ? 'Select a state first' : st.citiesLoading ? 'Loading cities...' : 'Select city'}
                        </option>
                        ${st.cities
                          .map(
                            (c) => `<option value="${escHtml(c.name)}" ${st.form.city === c.name ? 'selected' : ''}>${escHtml(c.name)}</option>`
                          )
                          .join('')}
                      </select>
                    `
                        : `
                      <input
                        id="learn-city"
                        name="city"
                        type="text"
                        required
                        class="form-control ${st.fieldErrors.city ? 'is-invalid' : ''}"
                        value="${escHtml(st.form.city)}"
                        placeholder="Enter your city or town"
                        aria-invalid="${Boolean(st.fieldErrors.city)}"
                        aria-describedby="learn-city-hint learn-city-error"
                        oninput="window.app.handleLearnFieldChange('city', this.value)"
                      />
                    `
                    }
                    <div id="learn-city-hint" class="learn-field-hint">
                      ${
                        !stateReady
                          ? 'Choose or enter a state first to select a city.'
                          : !st.citiesLoading && !stateHasPredefinedCities
                          ? 'No predefined cities listed for this region—please type your city.'
                          : ''
                      }
                    </div>
                    <div id="learn-city-error" class="field-error-msg" role="alert">${escHtml(st.fieldErrors.city || '')}</div>
                  </div>
                </div>

                <!-- 6. Course -->
                <div class="form-group">
                  <label class="form-label" for="learn-courseId">6. Course <span aria-hidden="true">*</span></label>
                  <select
                    id="learn-courseId"
                    name="courseId"
                    required
                    class="form-control ${st.fieldErrors.courseId ? 'is-invalid' : ''}"
                    aria-invalid="${Boolean(st.fieldErrors.courseId)}"
                    aria-describedby="learn-courseId-error"
                    onchange="window.app.handleLearnFieldChange('courseId', this.value)"
                  >
                    <option value="">Select a training program</option>
                    ${courses
                      .map(
                        (c) => `<option value="${c.id}" ${String(c.id) === st.form.courseId ? 'selected' : ''}>${escHtml(c.title)} (${formatModeLabel(c.mode)})</option>`
                      )
                      .join('')}
                  </select>
                  <div id="learn-courseId-error" class="field-error-msg" role="alert">${escHtml(st.fieldErrors.courseId || '')}</div>
                </div>

                <!-- 7. Phone (international format with country dialing prefix) -->
                <div class="form-group">
                  <label class="form-label" for="learn-phone">7. Phone (International Format) <span aria-hidden="true">*</span></label>
                  <div class="learn-phone-input-wrap">
                    <span class="learn-phone-prefix" aria-label="Country dialing prefix">
                      ${st.form.countryPhoneCode ? `+${escHtml(st.form.countryPhoneCode)}` : '+Code'}
                    </span>
                    <input
                      id="learn-phone"
                      name="phone"
                      type="tel"
                      required
                      autocomplete="tel"
                      class="form-control learn-phone-field ${st.fieldErrors.phone ? 'is-invalid' : ''}"
                      value="${escHtml(st.form.phone)}"
                      placeholder="${st.form.countryPhoneCode ? `+${escHtml(st.form.countryPhoneCode)} 802 552 6389` : '+234 802 552 6389'}"
                      aria-invalid="${Boolean(st.fieldErrors.phone)}"
                      aria-describedby="learn-phone-hint learn-phone-error"
                      oninput="window.app.handleLearnFieldChange('phone', this.value)"
                    />
                  </div>
                  <div id="learn-phone-hint" class="learn-field-hint">
                    Include your country dialing code (defaults to your selected country). Validated in international format.
                  </div>
                  <div id="learn-phone-error" class="field-error-msg" role="alert">${escHtml(st.fieldErrors.phone || '')}</div>
                </div>

                <!-- 8. Email -->
                <div class="form-group">
                  <label class="form-label" for="learn-email">8. Email Address <span aria-hidden="true">*</span></label>
                  <input
                    id="learn-email"
                    name="email"
                    type="email"
                    required
                    autocomplete="email"
                    class="form-control ${st.fieldErrors.email ? 'is-invalid' : ''}"
                    value="${escHtml(st.form.email)}"
                    placeholder="you@example.com"
                    aria-invalid="${Boolean(st.fieldErrors.email)}"
                    aria-describedby="learn-email-hint learn-email-error"
                    oninput="window.app.handleLearnFieldChange('email', this.value)"
                  />
                  <div id="learn-email-hint" class="learn-field-hint">Used as your login username for the Learner Dashboard.</div>
                  <div id="learn-email-error" class="field-error-msg" role="alert">${escHtml(st.fieldErrors.email || '')}</div>
                </div>

                <!-- 9. Password -->
                <div class="form-group">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;">
                    <label class="form-label" for="learn-password" style="margin-bottom:0;">9. Password <span aria-hidden="true">*</span></label>
                    <button
                      id="learn-password-toggle"
                      type="button"
                      class="learn-password-toggle-btn"
                      aria-pressed="${st.showPassword}"
                      aria-controls="learn-password"
                      onclick="window.app.toggleLearnPasswordVisibility()"
                    >
                      ${st.showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <input
                    id="learn-password"
                    name="password"
                    type="${st.showPassword ? 'text' : 'password'}"
                    required
                    minlength="8"
                    autocomplete="new-password"
                    class="form-control ${st.fieldErrors.password ? 'is-invalid' : ''}"
                    value="${escHtml(st.form.password)}"
                    placeholder="Minimum 8 characters"
                    aria-invalid="${Boolean(st.fieldErrors.password)}"
                    aria-describedby="learn-password-strength-text learn-password-error"
                    oninput="window.app.handleLearnFieldChange('password', this.value)"
                  />
                  <div class="learn-strength-track" aria-hidden="true">
                    <div id="learn-password-strength-bar" class="learn-strength-fill" data-score="${pwdStrength.score}" style="width:${Math.max(10, pwdStrength.score * 25)}%;"></div>
                  </div>
                  <div id="learn-password-strength-text" class="learn-field-hint" aria-live="polite">
                    ${
                      st.form.password
                        ? `Strength: ${pwdStrength.label} — ${pwdStrength.hint}`
                        : 'Minimum 8 characters. Mix uppercase, lowercase, numbers, or symbols.'
                    }
                  </div>
                  <div id="learn-password-error" class="field-error-msg" role="alert">${escHtml(st.fieldErrors.password || '')}</div>
                </div>

                <!-- Consent Checkbox -->
                <div class="form-group">
                  <label class="learn-consent-label" for="learn-consent">
                    <input
                      id="learn-consent"
                      name="consent"
                      type="checkbox"
                      required
                      ${st.form.consent ? 'checked' : ''}
                      aria-invalid="${Boolean(st.fieldErrors.consent)}"
                      aria-describedby="learn-consent-error"
                      onchange="window.app.handleLearnFieldChange('consent', this.checked)"
                    />
                    <span>
                      I agree to the
                      <button type="button" class="learn-inline-link" onclick="window.app.openLearnLegalModal('terms')">Terms</button>
                      and
                      <button type="button" class="learn-inline-link" onclick="window.app.openLearnLegalModal('privacy')">Privacy Policy</button>.
                    </span>
                  </label>
                  <div id="learn-consent-error" class="field-error-msg" role="alert">${escHtml(st.fieldErrors.consent || '')}</div>
                </div>

                <!-- 10. Register submit button -->
                <button
                  id="learn-register-btn"
                  type="submit"
                  class="btn btn-lime"
                  style="width:100%;padding:14px;font-size:15px;"
                  ${st.submitting || courses.length === 0 ? 'disabled' : ''}
                >
                  ${st.submitting ? 'Registering your account...' : 'Register →'}
                </button>
              </form>
            </div>
          </div>
        </section>

        <!-- FAQ SECTION -->
        ${
          faqs.length > 0
            ? `
          <section class="section section-alt">
            <div class="container" style="max-width:840px;">
              <div class="section-header" style="margin-bottom:28px;">
                <div class="eyebrow"><span class="eyebrow-dot"></span> FREQUENTLY ASKED QUESTIONS</div>
                <h2 class="section-title">Questions About Registration &amp; Training</h2>
              </div>
              <div class="learn-faq-list">
                ${faqs
                  .map(
                    (faq, idx) => `
                  <details class="learn-faq-item" ${idx === 0 ? 'open' : ''}>
                    <summary class="learn-faq-summary">
                      <span>${escHtml(faq.question)}</span>
                      <span class="learn-faq-icon" aria-hidden="true">+</span>
                    </summary>
                    <p class="learn-faq-answer">${escHtml(faq.answer)}</p>
                  </details>
                `
                  )
                  .join('')}
              </div>
            </div>
          </section>
        `
            : ''
        }

        ${st.legalModal ? renderLegalModal(st.legalModal) : ''}
        ${
          st.courseModalId !== null
            ? renderCourseDetailsModal(courses.find((c) => c.id === st.courseModalId) || null)
            : ''
        }
      </div>
    `;
  };

  proto.renderLearnerDashboardPage = function (this: YoletechAppHost): string {
    if (!this.user) {
      return `
        <section class="section">
          <div class="container" style="max-width:560px;text-align:center;">
            <div class="glass-card">
              <div class="eyebrow" style="justify-content:center;"><span class="eyebrow-dot"></span> LEARNER DASHBOARD</div>
              <h1 style="font-size:26px;font-weight:900;margin-bottom:10px;">Sign In Required</h1>
              <p style="color:var(--yole-text-muted);margin-bottom:22px;">
                Please sign in with your registered learner email and password to view your profile and course enrollment status.
              </p>
              <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
                <button type="button" class="btn btn-lime" onclick="window.app.navigate('login')">Sign In →</button>
                <button type="button" class="btn btn-outline" onclick="window.app.navigate('learn')">Browse Courses</button>
              </div>
            </div>
          </div>
        </section>
      `;
    }

    const userRole = normalizeUserRole(this.user.role);
    if (userRole === 'CLIENT' && typeof this.renderClientPortalPage === 'function') {
      this.currentPage = 'portal';
      if (typeof window !== 'undefined' && window.location.pathname !== '/portal') {
        window.history.replaceState({}, '', '/portal');
      }
      return this.renderClientPortalPage();
    }

    const st = this.ensureLearnState();
    if (!st.dashboardLoaded && !st.dashboardLoading) {
      void this.loadLearnerDashboardData();
    }

    const welcomeBanner =
      typeof this.renderFormConfirmation === 'function' ? this.renderFormConfirmation('learn-welcome') : '';

    if (st.dashboardLoading && !st.dashboardLoaded) {
      return `
        <section class="section">
          <div class="container" style="max-width:960px;">
            <div class="glass-card learn-state-card" role="status" aria-live="polite">
              <div class="learn-spinner" aria-hidden="true"></div>
              <p>Loading your learner dashboard...</p>
            </div>
          </div>
        </section>
      `;
    }

    if (st.dashboardError) {
      return `
        <section class="section">
          <div class="container" style="max-width:960px;">
            <div class="glass-card learn-state-card" role="alert">
              <p>${escHtml(st.dashboardError)}</p>
              <button type="button" class="btn btn-lime btn-sm" onclick="window.app.loadLearnerDashboardData(true)">Retry</button>
            </div>
          </div>
        </section>
      `;
    }

    const profile = st.dashboardProfile;
    const enrollments = st.dashboardEnrollments;

    return `
      <section class="section">
        <div class="container" style="max-width:1040px;">
          ${welcomeBanner}

          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;margin-bottom:28px;">
            <div>
              <div class="eyebrow"><span class="eyebrow-dot"></span> LEARNER DASHBOARD</div>
              <h1 style="font-size:clamp(26px,3.2vw,34px);font-weight:900;">
                Welcome, ${escHtml(profile?.full_name || this.user.name)}
              </h1>
              <p style="color:var(--yole-text-muted);font-size:14.5px;">
                View your learner profile details and track your training registration status.
              </p>
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
              <button type="button" class="btn btn-outline btn-sm" onclick="window.app.navigate('learn')">Browse Courses</button>
              <button type="button" class="btn btn-outline btn-sm" onclick="window.app.loadLearnerDashboardData(true)">↻ Refresh</button>
              ${
                normalizeUserRole(this.user.role) === 'ADMIN'
                  ? `<button type="button" class="btn btn-lime btn-sm" onclick="window.app.adminWorkspace='learn';window.app.navigate('admin-dashboard')">Admin Learn →</button>`
                  : ''
              }
              <button type="button" class="btn btn-outline btn-sm" onclick="window.app.logout()">Sign Out</button>
            </div>
          </div>

          <div class="grid-2" style="align-items:start;">
            <!-- READ-ONLY PROFILE CARD -->
            <div class="glass-card">
              <h2 style="font-size:19px;font-weight:900;margin-bottom:16px;">Your Learner Profile</h2>
              ${
                profile
                  ? `
                <dl class="learn-detail-list">
                  <div><dt>Full Name</dt><dd>${escHtml(profile.full_name)}</dd></div>
                  <div><dt>Email</dt><dd>${escHtml(this.user.email)}</dd></div>
                  <div><dt>Gender</dt><dd>${escHtml(profile.gender)}</dd></div>
                  <div><dt>Phone</dt><dd>${escHtml(profile.phone)}</dd></div>
                  <div><dt>Location</dt><dd>${escHtml(`${profile.city}, ${profile.state_name}, ${profile.country_name}`)}</dd></div>
                  <div><dt>Registered On</dt><dd>${formatDateShort(profile.created_at)}</dd></div>
                </dl>
              `
                  : `
                <p style="color:var(--yole-text-muted);font-size:14px;">
                  No learner profile is associated with this account yet.
                </p>
                <button type="button" class="btn btn-lime btn-sm" style="margin-top:14px;" onclick="window.app.navigate('learn')">
                  Explore Training Programs →
                </button>
              `
              }
            </div>

            <!-- READ-ONLY ENROLLMENTS CARD -->
            <div class="glass-card">
              <h2 style="font-size:19px;font-weight:900;margin-bottom:16px;">Your Course Enrollments</h2>
              ${
                enrollments.length === 0
                  ? `
                <p style="color:var(--yole-text-muted);font-size:14px;">
                  You have no course enrollments yet. Visit the Learn page to register for a program.
                </p>
              `
                  : `
                <div style="display:flex;flex-direction:column;gap:14px;">
                  ${enrollments
                    .map(
                      (enr) => `
                    <div class="learn-enrollment-card">
                      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;margin-bottom:8px;">
                        <h3 style="font-size:16.5px;font-weight:800;">${escHtml(enr.course_title)}</h3>
                        <span class="${statusBadgeClass(enr.status)}">${escHtml(enr.status)}</span>
                      </div>
                      <p style="font-size:13.5px;color:var(--yole-text-muted);margin-bottom:10px;">
                        ${escHtml(enr.course_short_description)}
                      </p>
                      <div class="learn-course-badges">
                        <span class="tech-pill">${escHtml(enr.course_level)}</span>
                        <span class="tech-pill orange">${formatModeLabel(enr.course_mode)}</span>
                        ${enr.course_duration ? `<span class="tech-pill">${escHtml(enr.course_duration)}</span>` : ''}
                        ${enr.course_price ? `<span class="tech-pill">${escHtml(enr.course_price)}</span>` : ''}
                      </div>
                      <div style="font-size:12px;color:var(--yole-text-subtle);margin-top:10px;">
                        Submitted ${formatDateShort(enr.created_at)}
                      </div>
                    </div>
                  `
                    )
                    .join('')}
                </div>
              `
              }
            </div>
          </div>
        </div>
      </section>
    `;
  };
}

function renderCourseDetailsModal(course: CourseRecord | null): string {
  if (!course) return '';
  return `
    <div class="learn-drawer-backdrop" onclick="window.app.closeCourseDetailsModal()" aria-hidden="true"></div>
    <div id="learn-course-details-modal" class="learn-modal-dialog learn-course-modal" role="dialog" aria-modal="true" aria-labelledby="learn-course-modal-title" tabindex="-1">
      <div class="learn-drawer-header">
        <div>
          <div class="eyebrow" style="margin-bottom:6px;"><span class="eyebrow-dot"></span> COURSE DETAILS</div>
          <h3 id="learn-course-modal-title" style="font-size:22px;font-weight:900;line-height:1.25;">${escHtml(course.title)}</h3>
        </div>
        <button type="button" class="form-confirmation-dismiss" aria-label="Close course details" onclick="window.app.closeCourseDetailsModal()">×</button>
      </div>
      <div class="learn-modal-body">
        ${
          course.image_url
            ? `
          <div class="learn-course-modal-media">
            <img src="${escHtml(course.image_url)}" alt="${escHtml(course.title)}" class="learn-course-modal-img" />
          </div>
        `
            : ''
        }
        <div class="learn-course-badges" style="margin-bottom:4px;">
          <span class="tech-pill lime">${escHtml(course.level)}</span>
          <span class="tech-pill orange">${formatModeLabel(course.mode)}</span>
          ${course.duration ? `<span class="tech-pill">${escHtml(course.duration)}</span>` : ''}
          ${course.price ? `<span class="tech-pill">${escHtml(course.price)}</span>` : ''}
        </div>
        <p class="learn-course-modal-desc">${escHtml(course.short_description)}</p>
        ${
          course.outcomes.length > 0
            ? `
          <div class="learn-outcomes-block">
            <div class="learn-outcomes-label">What you will learn</div>
            <ul class="learn-outcomes-list">
              ${course.outcomes
                .map((outcome) => `<li><span class="learn-check" aria-hidden="true">✓</span><span>${escHtml(outcome)}</span></li>`)
                .join('')}
            </ul>
          </div>
        `
            : ''
        }
      </div>
      <div class="learn-course-modal-footer">
        <button type="button" class="btn btn-lime btn-sm" onclick="window.app.registerFromCourseModal(${course.id})">
          Register for this Course →
        </button>
        <button type="button" class="btn btn-outline btn-sm" onclick="window.app.closeCourseDetailsModal()">
          Close
        </button>
      </div>
    </div>
  `;
}

function renderLegalModal(kind: 'terms' | 'privacy'): string {
  const isTerms = kind === 'terms';
  return `
    <div class="learn-drawer-backdrop" onclick="window.app.openLearnLegalModal('')" aria-hidden="true"></div>
    <div class="learn-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="learn-legal-title">
      <div class="learn-drawer-header">
        <h3 id="learn-legal-title" style="font-size:20px;font-weight:900;">
          ${isTerms ? 'Training Registration Terms' : 'Learner Privacy Policy'}
        </h3>
        <button type="button" class="form-confirmation-dismiss" aria-label="Close dialog" onclick="window.app.openLearnLegalModal('')">×</button>
      </div>
      <div class="learn-modal-body">
        ${
          isTerms
            ? `
          <p>By registering for a YOLETECH training program, you confirm that the registration details you submit are accurate and belong to you.</p>
          <p>Submitting a registration creates your learner account and places your enrollment in <strong>Pending</strong> status for review. Session schedules, delivery logistics, and enrollment confirmation are communicated after review.</p>
          <p>You are responsible for keeping your account password confidential.</p>
        `
            : `
          <p>YOLETECH collects your name, gender, location, phone number, email address, and course selection solely to manage your learner account, review your training enrollment, and communicate course updates.</p>
          <p>Your password is stored using salted cryptographic hashing and is never stored or displayed in plain text. We do not sell learner registration information to third parties.</p>
          <p>To request updates or deletion of your registration record, contact <strong>yoletech@yolestica.com</strong>.</p>
        `
        }
      </div>
      <div style="margin-top:18px;text-align:right;">
        <button type="button" class="btn btn-lime btn-sm" onclick="window.app.openLearnLegalModal('')">Close</button>
      </div>
    </div>
  `;
}

const hostCtor =
  typeof YoletechApp !== 'undefined'
    ? YoletechApp
    : typeof window !== 'undefined'
    ? window.YoletechApp
    : undefined;

if (hostCtor && hostCtor.prototype) {
  attachLearnClientMethods(hostCtor.prototype);
}

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !window.app) return;
    const learnSt = window.app._learnState;
    if (learnSt && learnSt.courseModalId !== null) {
      learnSt.courseModalId = null;
      window.app.render();
      return;
    }
    if (learnSt && learnSt.legalModal) {
      learnSt.legalModal = '';
      window.app.render();
      return;
    }
    const adminSt = window.app._adminLearnState;
    if (adminSt && adminSt.drawerRegistrationId !== null) {
      adminSt.drawerRegistrationId = null;
      window.app.render();
    }
  });
}

export { attachLearnClientMethods };
