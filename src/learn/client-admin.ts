import {
  COURSE_MODES,
  ENROLLMENT_STATUSES,
  courseInputSchema,
  flattenZodFieldErrors,
  learnPageContentSchema
} from './schema';
import type { AdminLearnSummary, AdminRegistrationRow, CourseRecord } from './db';
import type { LearnFaqItem, LearnPageContentData } from './seed-data';
import {
  escHtml,
  formatDateShort,
  formatModeLabel,
  statusBadgeClass,
  type AdminLearnState,
  type YoletechAppHost
} from './client-types';

export function createInitialAdminLearnState(): AdminLearnState {
  return {
    subTab: 'courses',
    loading: false,
    loaded: false,
    error: '',
    summary: null,
    courses: [],
    editingCourseId: null,
    courseFormOpen: false,
    courseSubmitting: false,
    courseError: '',
    courseFieldErrors: {},

    registrations: [],
    countries: [],
    pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
    regLoading: false,
    regError: '',
    regFilters: {
      search: '',
      courseId: '',
      country: '',
      status: '',
      from: '',
      to: '',
      page: 1,
      limit: 20
    },
    selectedIds: [],
    bulkStatus: 'APPROVED',
    bulkUpdating: false,
    drawerRegistrationId: null,
    drawerSaving: false,

    pageContent: null,
    draftFaq: null,
    contentSaving: false,
    contentError: '',
    contentMessage: ''
  };
}

export function attachAdminLearnMethods(proto: Record<string, unknown>): void {
  proto.ensureAdminLearnState = function (this: YoletechAppHost): AdminLearnState {
    if (!this._adminLearnState) {
      this._adminLearnState = createInitialAdminLearnState();
    }
    return this._adminLearnState;
  };

  proto.loadAdminLearnData = async function (this: YoletechAppHost, force = false): Promise<void> {
    if (!this.user || this.user.role !== 'ADMIN') return;
    const st = this.ensureAdminLearnState();
    if (st.loading || (st.loaded && !force)) return;
    st.loading = true;
    st.error = '';
    try {
      const [summaryRes, coursesRes, contentRes] = await Promise.all([
        this.api('/api/admin/learn/summary'),
        this.api('/api/admin/learn/courses'),
        this.api('/api/admin/learn/content')
      ]);
      st.summary = (summaryRes.summary as AdminLearnSummary | undefined) || null;
      st.courses = Array.isArray(coursesRes.courses) ? (coursesRes.courses as CourseRecord[]) : [];
      st.pageContent = (contentRes.content as LearnPageContentData | undefined) || null;
      st.draftFaq = st.pageContent ? st.pageContent.faq.map((f) => ({ ...f })) : [];
      st.loaded = true;
      await this.loadAdminLearnRegistrations();
    } catch (err) {
      st.error = err instanceof Error ? err.message : 'Unable to load Learn management data.';
    } finally {
      st.loading = false;
      if (this.currentPage === 'admin-dashboard' && this.adminWorkspace === 'learn') {
        this.render();
      }
    }
  };

  proto.loadAdminLearnRegistrations = async function (this: YoletechAppHost): Promise<void> {
    if (!this.user || this.user.role !== 'ADMIN') return;
    const st = this.ensureAdminLearnState();
    st.regLoading = true;
    st.regError = '';
    const f = st.regFilters;
    const params = new URLSearchParams();
    if (f.search.trim()) params.set('search', f.search.trim());
    if (f.courseId) params.set('courseId', f.courseId);
    if (f.country) params.set('country', f.country);
    if (f.status) params.set('status', f.status);
    if (f.from) params.set('from', f.from);
    if (f.to) params.set('to', f.to);
    params.set('page', String(f.page || 1));
    params.set('limit', String(f.limit || 20));

    try {
      const data = await this.api(`/api/admin/learn/registrations?${params.toString()}`);
      st.registrations = Array.isArray(data.registrations)
        ? (data.registrations as AdminRegistrationRow[])
        : [];
      st.countries = Array.isArray(data.countries) ? (data.countries as string[]) : [];
      const pag = data.pagination as AdminLearnState['pagination'] | undefined;
      if (pag) st.pagination = pag;
      st.selectedIds = st.selectedIds.filter((id) =>
        st.registrations.some((r) => r.enrollment_id === id)
      );
    } catch (err) {
      st.regError = err instanceof Error ? err.message : 'Could not load registrations.';
    } finally {
      st.regLoading = false;
      if (this.currentPage === 'admin-dashboard' && this.adminWorkspace === 'learn') {
        this.render();
      }
    }
  };

  proto.setAdminLearnSubTab = function (
    this: YoletechAppHost,
    tab: 'courses' | 'registrations' | 'content'
  ): void {
    const st = this.ensureAdminLearnState();
    st.subTab = tab;
    if (tab === 'registrations') {
      void this.loadAdminLearnRegistrations();
    }
    this.render();
  };

  proto.openAdminCourseEditor = function (this: YoletechAppHost, courseId: number | null): void {
    const st = this.ensureAdminLearnState();
    st.editingCourseId = courseId;
    st.courseFormOpen = true;
    st.courseError = '';
    st.courseFieldErrors = {};
    this.render();
  };

  proto.closeAdminCourseEditor = function (this: YoletechAppHost): void {
    const st = this.ensureAdminLearnState();
    st.editingCourseId = null;
    st.courseFormOpen = false;
    st.courseError = '';
    st.courseFieldErrors = {};
    this.render();
  };

  proto.handleAdminCourseSave = async function (this: YoletechAppHost, e: Event): Promise<void> {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const st = this.ensureAdminLearnState();
    const getVal = (name: string): string => {
      const el = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
      return el ? el.value : '';
    };
    const outcomesRaw = getVal('outcomes')
      .split(/\r?\n/)
      .map((line) => line.replace(/^[-*•]\s*/, '').trim())
      .filter(Boolean);

    const rawPayload = {
      title: getVal('title'),
      slug: getVal('slug'),
      short_description: getVal('short_description'),
      outcomes: outcomesRaw,
      level: getVal('level'),
      mode: getVal('mode'),
      duration: getVal('duration'),
      price: getVal('price'),
      status: getVal('status'),
      display_order: Number(getVal('display_order') || 0)
    };

    const parsed = courseInputSchema.safeParse(rawPayload);
    if (!parsed.success) {
      st.courseFieldErrors = flattenZodFieldErrors(parsed.error);
      st.courseError = Object.values(st.courseFieldErrors)[0] || 'Please fix the highlighted course fields.';
      this.showToast(st.courseError, 'error');
      this.render();
      return;
    }

    st.courseSubmitting = true;
    st.courseError = '';
    st.courseFieldErrors = {};
    this.render();

    try {
      if (st.editingCourseId) {
        await this.api(`/api/admin/learn/courses/${st.editingCourseId}`, {
          method: 'PUT',
          body: JSON.stringify(parsed.data)
        });
        this.showToast('Course updated successfully.');
      } else {
        await this.api('/api/admin/learn/courses', {
          method: 'POST',
          body: JSON.stringify(parsed.data)
        });
        this.showToast('Course created successfully.');
      }
      st.courseFormOpen = false;
      st.editingCourseId = null;
      await this.loadAdminLearnData(true);
      await this.loadLearnPublicData(true);
    } catch (err) {
      st.courseError = err instanceof Error ? err.message : 'Unable to save course.';
      this.showToast(st.courseError, 'error');
    } finally {
      st.courseSubmitting = false;
      this.render();
    }
  };

  proto.toggleAdminCourseStatus = async function (
    this: YoletechAppHost,
    courseId: number,
    nextStatus: 'draft' | 'published'
  ): Promise<void> {
    try {
      await this.api(`/api/admin/learn/courses/${courseId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus })
      });
      this.showToast(nextStatus === 'published' ? 'Course published.' : 'Course moved to draft.');
      await this.loadAdminLearnData(true);
      await this.loadLearnPublicData(true);
    } catch (err) {
      this.showToast(err instanceof Error ? err.message : 'Failed to update course status.', 'error');
    }
  };

  proto.moveAdminCourseOrder = async function (
    this: YoletechAppHost,
    courseId: number,
    direction: -1 | 1
  ): Promise<void> {
    const st = this.ensureAdminLearnState();
    const list = [...st.courses];
    const idx = list.findIndex((c) => c.id === courseId);
    const targetIdx = idx + direction;
    if (idx < 0 || targetIdx < 0 || targetIdx >= list.length) return;
    const itemA = list[idx];
    const itemB = list[targetIdx];
    if (!itemA || !itemB) return;
    list[idx] = itemB;
    list[targetIdx] = itemA;

    try {
      const res = await this.api('/api/admin/learn/courses/reorder', {
        method: 'PUT',
        body: JSON.stringify({ orderedIds: list.map((c) => c.id) })
      });
      st.courses = Array.isArray(res.courses) ? (res.courses as CourseRecord[]) : list;
      this.showToast('Course order updated.');
      await this.loadLearnPublicData(true);
      this.render();
    } catch (err) {
      this.showToast(err instanceof Error ? err.message : 'Could not reorder courses.', 'error');
    }
  };

  proto.deleteAdminCourse = async function (this: YoletechAppHost, courseId: number): Promise<void> {
    const st = this.ensureAdminLearnState();
    const target = st.courses.find((c) => c.id === courseId);
    const hasEnrollments = (target?.enrollment_count || 0) > 0;
    const promptMsg = hasEnrollments
      ? `"${target?.title || 'This course'}" has ${target?.enrollment_count} registration(s). Archive it to Draft so existing enrollments are preserved?`
      : `Permanently delete "${target?.title || 'this course'}"?`;
    if (typeof window !== 'undefined' && !window.confirm(promptMsg)) return;

    try {
      const res = await this.api(`/api/admin/learn/courses/${courseId}`, { method: 'DELETE' });
      const action = String(res.action || 'deleted');
      this.showToast(
        action === 'archived'
          ? 'Course archived to draft (existing registrations preserved).'
          : 'Course deleted.'
      );
      await this.loadAdminLearnData(true);
      await this.loadLearnPublicData(true);
    } catch (err) {
      this.showToast(err instanceof Error ? err.message : 'Could not delete course.', 'error');
    }
  };

  proto.applyAdminRegFilters = function (this: YoletechAppHost, e?: Event): void {
    if (e) e.preventDefault();
    const st = this.ensureAdminLearnState();
    const getById = (id: string): string => {
      const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
      return el ? el.value : '';
    };
    st.regFilters.search = getById('admin-learn-reg-search');
    st.regFilters.courseId = getById('admin-learn-reg-course');
    st.regFilters.country = getById('admin-learn-reg-country');
    st.regFilters.status = getById('admin-learn-reg-status');
    st.regFilters.from = getById('admin-learn-reg-from');
    st.regFilters.to = getById('admin-learn-reg-to');
    st.regFilters.page = 1;
    void this.loadAdminLearnRegistrations();
  };

  proto.clearAdminRegFilters = function (this: YoletechAppHost): void {
    const st = this.ensureAdminLearnState();
    st.regFilters = {
      search: '',
      courseId: '',
      country: '',
      status: '',
      from: '',
      to: '',
      page: 1,
      limit: 20
    };
    void this.loadAdminLearnRegistrations();
  };

  proto.setAdminRegPage = function (this: YoletechAppHost, nextPage: number): void {
    const st = this.ensureAdminLearnState();
    const clamped = Math.max(1, Math.min(st.pagination.totalPages, nextPage));
    st.regFilters.page = clamped;
    void this.loadAdminLearnRegistrations();
  };

  proto.toggleAdminRegSelection = function (
    this: YoletechAppHost,
    enrollmentId: number,
    checked: boolean
  ): void {
    const st = this.ensureAdminLearnState();
    if (checked) {
      if (!st.selectedIds.includes(enrollmentId)) st.selectedIds.push(enrollmentId);
    } else {
      st.selectedIds = st.selectedIds.filter((id) => id !== enrollmentId);
    }
    this.render();
  };

  proto.toggleAdminRegSelectAll = function (this: YoletechAppHost, checked: boolean): void {
    const st = this.ensureAdminLearnState();
    st.selectedIds = checked ? st.registrations.map((r) => r.enrollment_id) : [];
    this.render();
  };

  proto.handleAdminBulkStatusUpdate = async function (this: YoletechAppHost): Promise<void> {
    const st = this.ensureAdminLearnState();
    if (st.selectedIds.length === 0) {
      this.showToast('Select at least one registration first.', 'error');
      return;
    }
    const selEl = document.getElementById('admin-learn-bulk-status') as HTMLSelectElement | null;
    const status = selEl ? selEl.value : st.bulkStatus;
    st.bulkStatus = status;
    st.bulkUpdating = true;
    this.render();
    try {
      await this.api('/api/admin/learn/registrations/bulk', {
        method: 'PUT',
        body: JSON.stringify({ ids: st.selectedIds, status })
      });
      this.showToast(`Updated ${st.selectedIds.length} registration(s) to ${status}.`);
      st.selectedIds = [];
      await this.loadAdminLearnData(true);
    } catch (err) {
      this.showToast(err instanceof Error ? err.message : 'Bulk update failed.', 'error');
    } finally {
      st.bulkUpdating = false;
      this.render();
    }
  };

  proto.openAdminRegDrawer = function (this: YoletechAppHost, enrollmentId: number | null): void {
    const st = this.ensureAdminLearnState();
    st.drawerRegistrationId = enrollmentId;
    this.render();
  };

  proto.handleAdminRegDrawerSave = async function (
    this: YoletechAppHost,
    e: Event,
    enrollmentId: number
  ): Promise<void> {
    e.preventDefault();
    const st = this.ensureAdminLearnState();
    const form = e.target as HTMLFormElement;
    const statusEl = form.elements.namedItem('status') as HTMLSelectElement | null;
    const notesEl = form.elements.namedItem('notes') as HTMLTextAreaElement | null;
    st.drawerSaving = true;
    this.render();
    try {
      await this.api(`/api/admin/learn/registrations/${enrollmentId}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: statusEl ? statusEl.value : 'PENDING',
          notes: notesEl ? notesEl.value : ''
        })
      });
      this.showToast('Registration updated.');
      await this.loadAdminLearnData(true);
    } catch (err) {
      this.showToast(err instanceof Error ? err.message : 'Could not save registration.', 'error');
    } finally {
      st.drawerSaving = false;
      this.render();
    }
  };

  proto.exportAdminLearnCsv = async function (this: YoletechAppHost): Promise<void> {
    const st = this.ensureAdminLearnState();
    const f = st.regFilters;
    const params = new URLSearchParams();
    if (f.search.trim()) params.set('search', f.search.trim());
    if (f.courseId) params.set('courseId', f.courseId);
    if (f.country) params.set('country', f.country);
    if (f.status) params.set('status', f.status);
    if (f.from) params.set('from', f.from);
    if (f.to) params.set('to', f.to);
    params.set('format', 'csv');

    try {
      const headers: Record<string, string> = {};
      if (this.token) headers.Authorization = `Bearer ${this.token}`;
      const res = await fetch(`/api/admin/learn/registrations?${params.toString()}`, { headers });
      if (!res.ok) throw new Error('Could not export CSV.');
      const csvText = await res.text();
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `yoletech-learn-registrations-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      this.showToast('Exported Learn registrations CSV.');
    } catch (err) {
      this.showToast(err instanceof Error ? err.message : 'CSV export failed.', 'error');
    }
  };

  proto.addAdminLearnFaqItem = function (this: YoletechAppHost): void {
    const st = this.ensureAdminLearnState();
    this.syncDraftFaqFromDom();
    if (!st.draftFaq) st.draftFaq = [];
    st.draftFaq.push({ question: '', answer: '' });
    this.render();
  };

  proto.removeAdminLearnFaqItem = function (this: YoletechAppHost, idx: number): void {
    const st = this.ensureAdminLearnState();
    this.syncDraftFaqFromDom();
    if (!st.draftFaq) return;
    st.draftFaq.splice(idx, 1);
    this.render();
  };

  proto.syncDraftFaqFromDom = function (this: YoletechAppHost): void {
    const st = this.ensureAdminLearnState();
    const form = document.getElementById('admin-learn-content-form') as HTMLFormElement | null;
    if (!form) return;
    const headlineEl = form.elements.namedItem('headline') as HTMLInputElement | null;
    const subEl = form.elements.namedItem('subheadline') as HTMLTextAreaElement | null;
    const ctaEl = form.elements.namedItem('cta_label') as HTMLInputElement | null;
    if (st.pageContent) {
      if (headlineEl) st.pageContent.headline = headlineEl.value;
      if (subEl) st.pageContent.subheadline = subEl.value;
      if (ctaEl) st.pageContent.cta_label = ctaEl.value;
    }
    const qEls = form.querySelectorAll<HTMLInputElement>('[data-faq-q]');
    const aEls = form.querySelectorAll<HTMLTextAreaElement>('[data-faq-a]');
    const items: LearnFaqItem[] = [];
    qEls.forEach((qEl, i) => {
      items.push({
        question: qEl.value,
        answer: aEls[i]?.value || ''
      });
    });
    if (items.length > 0 || qEls.length === 0) {
      st.draftFaq = items;
    }
  };

  proto.handleAdminLearnContentSave = async function (this: YoletechAppHost, e: Event): Promise<void> {
    e.preventDefault();
    const st = this.ensureAdminLearnState();
    this.syncDraftFaqFromDom();
    const form = e.target as HTMLFormElement;
    const headline = (form.elements.namedItem('headline') as HTMLInputElement | null)?.value || '';
    const subheadline = (form.elements.namedItem('subheadline') as HTMLTextAreaElement | null)?.value || '';
    const cta_label = (form.elements.namedItem('cta_label') as HTMLInputElement | null)?.value || '';
    const faq = (st.draftFaq || []).filter((f) => f.question.trim() || f.answer.trim());

    const parsed = learnPageContentSchema.safeParse({ headline, subheadline, cta_label, faq });
    if (!parsed.success) {
      const errs = flattenZodFieldErrors(parsed.error);
      st.contentError = Object.values(errs)[0] || 'Please check the page content fields.';
      st.contentMessage = '';
      this.showToast(st.contentError, 'error');
      this.render();
      return;
    }

    st.contentSaving = true;
    st.contentError = '';
    st.contentMessage = '';
    this.render();
    try {
      const res = await this.api('/api/admin/learn/content', {
        method: 'PUT',
        body: JSON.stringify(parsed.data)
      });
      st.pageContent = (res.content as LearnPageContentData | undefined) || parsed.data;
      st.draftFaq = st.pageContent.faq.map((f) => ({ ...f }));
      st.contentMessage = 'Learn page banner and FAQ content saved.';
      this.showToast('Learn page content updated.');
      await this.loadLearnPublicData(true);
    } catch (err) {
      st.contentError = err instanceof Error ? err.message : 'Could not update content.';
      this.showToast(st.contentError, 'error');
    } finally {
      st.contentSaving = false;
      this.render();
    }
  };

  proto.renderAdminLearnWorkspace = function (this: YoletechAppHost): string {
    if (!this.user || this.user.role !== 'ADMIN') {
      return `<div class="glass-card"><p>Admin access required.</p></div>`;
    }
    const st = this.ensureAdminLearnState();
    if (!st.loaded && !st.loading) {
      void this.loadAdminLearnData();
    }

    if (st.loading && !st.loaded) {
      return `
        <div class="glass-card learn-state-card" role="status" aria-live="polite">
          <div class="learn-spinner" aria-hidden="true"></div>
          <p>Loading Learn courses and registrations...</p>
        </div>
      `;
    }

    if (st.error && !st.loaded) {
      return `
        <div class="glass-card learn-state-card" role="alert">
          <p>${escHtml(st.error)}</p>
          <button type="button" class="btn btn-lime btn-sm" onclick="window.app.loadAdminLearnData(true)">Retry</button>
        </div>
      `;
    }

    const summary = st.summary;
    const summaryHtml = summary
      ? `
      <div class="metrics-strip learn-admin-summary" style="margin-bottom:20px;">
        <div class="metric-cell">
          <div class="metric-number">${summary.totalRegistrations}</div>
          <div class="metric-label">Total<br/>Registrations</div>
        </div>
        <div class="metric-cell">
          <div class="metric-number" style="color:#F7941D;">${summary.pendingCount}</div>
          <div class="metric-label">Pending<br/>Review</div>
        </div>
        <div class="metric-cell">
          <div class="metric-number">${summary.approvedCount + summary.completedCount}</div>
          <div class="metric-label">Approved &amp;<br/>Completed</div>
        </div>
        <div class="metric-cell">
          <div class="metric-number" style="color:#F7941D;">${summary.publishedCourses} / ${summary.totalCourses}</div>
          <div class="metric-label">Published<br/>Courses</div>
        </div>
      </div>
      <div class="glass-card learn-course-breakdown" style="margin-bottom:24px;padding:18px 22px;">
        <div class="learn-breakdown-title">Registrations per Course (Real Data)</div>
        <div class="learn-breakdown-chips">
          ${summary.registrationsPerCourse
            .map(
              (item) => `
            <div class="learn-breakdown-chip">
              <span>${escHtml(item.course_title)}</span>
              <strong>${item.count}</strong>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `
      : '';

    const subNavHtml = `
      <div class="learn-admin-subnav" role="tablist" aria-label="Learn management sections">
        <button type="button" role="tab" aria-selected="${st.subTab === 'courses'}" class="selector-pill ${st.subTab === 'courses' ? 'active' : ''}" onclick="window.app.setAdminLearnSubTab('courses')">
          Courses (${st.courses.length})
        </button>
        <button type="button" role="tab" aria-selected="${st.subTab === 'registrations'}" class="selector-pill ${st.subTab === 'registrations' ? 'active' : ''}" onclick="window.app.setAdminLearnSubTab('registrations')">
          Registrations (${summary ? summary.totalRegistrations : st.pagination.total})
        </button>
        <button type="button" role="tab" aria-selected="${st.subTab === 'content'}" class="selector-pill ${st.subTab === 'content' ? 'active' : ''}" onclick="window.app.setAdminLearnSubTab('content')">
          Page Content &amp; FAQ
        </button>
        <a href="/learn" class="btn btn-outline btn-sm" style="margin-left:auto;" onclick="event.preventDefault(); window.app.navigate('learn');">
          View Live /learn Page ↗
        </a>
      </div>
    `;

    let bodyHtml = '';
    if (st.subTab === 'courses') {
      bodyHtml = renderAdminCoursesSection(st);
    } else if (st.subTab === 'registrations') {
      bodyHtml = renderAdminRegistrationsSection(st);
    } else {
      bodyHtml = renderAdminContentSection(st);
    }

    const drawerItem = st.drawerRegistrationId
      ? st.registrations.find((r) => r.enrollment_id === st.drawerRegistrationId) || null
      : null;

    return `
      <div class="learn-admin-workspace">
        ${summaryHtml}
        ${subNavHtml}
        ${bodyHtml}
        ${drawerItem ? renderAdminRegistrationDrawer(drawerItem, st.drawerSaving) : ''}
      </div>
    `;
  };
}

function renderAdminCoursesSection(st: AdminLearnState): string {
  const editing = st.editingCourseId
    ? st.courses.find((c) => c.id === st.editingCourseId) || null
    : null;

  const editorHtml = st.courseFormOpen
    ? `
      <div class="glass-card" style="margin-bottom:24px;border-color:var(--yole-lime);">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px;">
          <h3 style="font-size:20px;font-weight:800;">${editing ? `Edit Course: ${escHtml(editing.title)}` : 'Create New Course'}</h3>
          <button type="button" class="btn btn-outline btn-sm" onclick="window.app.closeAdminCourseEditor()">Cancel</button>
        </div>
        ${st.courseError ? `<div class="form-error-box" role="alert">${escHtml(st.courseError)}</div>` : ''}
        <form novalidate onsubmit="window.app.handleAdminCourseSave(event)">
          <div class="grid-2" style="gap:14px;">
            <div class="form-group">
              <label class="form-label" for="admin-course-title">Course Title *</label>
              <input id="admin-course-title" name="title" type="text" required class="form-control ${st.courseFieldErrors.title ? 'is-invalid' : ''}" value="${escHtml(editing?.title || '')}" placeholder="e.g. Full-Stack Web Development" />
              ${st.courseFieldErrors.title ? `<div class="field-error-msg">${escHtml(st.courseFieldErrors.title)}</div>` : ''}
            </div>
            <div class="form-group">
              <label class="form-label" for="admin-course-slug">Slug (optional — auto-generated if empty)</label>
              <input id="admin-course-slug" name="slug" type="text" class="form-control ${st.courseFieldErrors.slug ? 'is-invalid' : ''}" value="${escHtml(editing?.slug || '')}" placeholder="full-stack-web-development" />
              ${st.courseFieldErrors.slug ? `<div class="field-error-msg">${escHtml(st.courseFieldErrors.slug)}</div>` : ''}
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="admin-course-desc">Short Description *</label>
            <textarea id="admin-course-desc" name="short_description" rows="2" required class="form-control ${st.courseFieldErrors.short_description ? 'is-invalid' : ''}" placeholder="Honest summary of what learners will build and practice...">${escHtml(editing?.short_description || '')}</textarea>
            ${st.courseFieldErrors.short_description ? `<div class="field-error-msg">${escHtml(st.courseFieldErrors.short_description)}</div>` : ''}
          </div>

          <div class="form-group">
            <label class="form-label" for="admin-course-outcomes">Learning Outcomes (one per line) *</label>
            <textarea id="admin-course-outcomes" name="outcomes" rows="4" required class="form-control ${st.courseFieldErrors.outcomes ? 'is-invalid' : ''}" placeholder="One learning outcome per line">${escHtml((editing?.outcomes || []).join('\n'))}</textarea>
            ${st.courseFieldErrors.outcomes ? `<div class="field-error-msg">${escHtml(st.courseFieldErrors.outcomes)}</div>` : ''}
          </div>

          <div class="grid-3" style="gap:14px;">
            <div class="form-group">
              <label class="form-label" for="admin-course-level">Level *</label>
              <input id="admin-course-level" name="level" type="text" required class="form-control" value="${escHtml(editing?.level || 'Beginner')}" placeholder="Beginner / Intermediate / All Levels" />
            </div>
            <div class="form-group">
              <label class="form-label" for="admin-course-mode">Mode *</label>
              <select id="admin-course-mode" name="mode" class="form-control">
                ${COURSE_MODES.map(
                  (m) => `<option value="${m}" ${(editing?.mode || 'online') === m ? 'selected' : ''}>${formatModeLabel(m)}</option>`
                ).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="admin-course-status">Status *</label>
              <select id="admin-course-status" name="status" class="form-control">
                <option value="published" ${(editing?.status || 'published') === 'published' ? 'selected' : ''}>Published</option>
                <option value="draft" ${editing?.status === 'draft' ? 'selected' : ''}>Draft</option>
              </select>
            </div>
          </div>

          <div class="grid-3" style="gap:14px;">
            <div class="form-group">
              <label class="form-label" for="admin-course-duration">Duration (optional — shown only when filled)</label>
              <input id="admin-course-duration" name="duration" type="text" class="form-control" value="${escHtml(editing?.duration || '')}" placeholder="Leave blank if not set" />
            </div>
            <div class="form-group">
              <label class="form-label" for="admin-course-price">Price (optional — shown only when filled)</label>
              <input id="admin-course-price" name="price" type="text" class="form-control" value="${escHtml(editing?.price || '')}" placeholder="Leave blank if not set" />
            </div>
            <div class="form-group">
              <label class="form-label" for="admin-course-order">Display Order</label>
              <input id="admin-course-order" name="display_order" type="number" min="0" class="form-control" value="${editing ? editing.display_order : st.courses.length + 1}" />
            </div>
          </div>

          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button type="submit" class="btn btn-lime" ${st.courseSubmitting ? 'disabled' : ''}>
              ${st.courseSubmitting ? 'Saving...' : editing ? 'Save Course Changes' : 'Create Course'}
            </button>
            <button type="button" class="btn btn-outline" onclick="window.app.closeAdminCourseEditor()">Cancel</button>
          </div>
        </form>
      </div>
    `
    : '';

  return `
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:18px;">
      <div>
        <h2 style="font-size:21px;font-weight:900;">Training Courses</h2>
        <p style="font-size:13.5px;color:var(--yole-text-muted);">Publish, reorder, edit, or archive courses shown on /learn.</p>
      </div>
      <button type="button" class="btn btn-lime btn-sm" onclick="window.app.openAdminCourseEditor(null)">+ Add Course</button>
    </div>
    ${editorHtml}
    ${
      st.courses.length === 0
        ? `<div class="glass-card learn-state-card"><p>No courses found. Create your first course above.</p></div>`
        : `
      <div class="table-wrapper">
        <table class="yole-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Course</th>
              <th>Level &amp; Mode</th>
              <th>Optional Info</th>
              <th>Status</th>
              <th>Enrollments</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${st.courses
              .map(
                (c, idx) => `
              <tr>
                <td>
                  <div style="display:flex;align-items:center;gap:4px;">
                    <button type="button" class="btn btn-outline btn-sm learn-icon-btn" aria-label="Move ${escHtml(c.title)} up" ${idx === 0 ? 'disabled' : ''} onclick="window.app.moveAdminCourseOrder(${c.id}, -1)">↑</button>
                    <button type="button" class="btn btn-outline btn-sm learn-icon-btn" aria-label="Move ${escHtml(c.title)} down" ${idx === st.courses.length - 1 ? 'disabled' : ''} onclick="window.app.moveAdminCourseOrder(${c.id}, 1)">↓</button>
                  </div>
                </td>
                <td>
                  <div style="font-weight:800;font-size:14.5px;">${escHtml(c.title)}</div>
                  <div style="font-size:12px;color:var(--yole-text-muted);">/${escHtml(c.slug)} • ${c.outcomes.length} outcomes</div>
                </td>
                <td>
                  <span class="tech-pill">${escHtml(c.level)}</span>
                  <span class="tech-pill orange" style="margin-left:4px;">${formatModeLabel(c.mode)}</span>
                </td>
                <td style="font-size:12.5px;color:var(--yole-text-muted);">
                  ${c.duration ? `<div>Duration: ${escHtml(c.duration)}</div>` : ''}
                  ${c.price ? `<div>Price: ${escHtml(c.price)}</div>` : ''}
                  ${!c.duration && !c.price ? '<span>—</span>' : ''}
                </td>
                <td>
                  <button type="button" class="tech-pill ${c.status === 'published' ? 'lime' : 'orange'}" style="cursor:pointer;" onclick="window.app.toggleAdminCourseStatus(${c.id}, '${c.status === 'published' ? 'draft' : 'published'}')">
                    ${c.status === 'published' ? 'Published' : 'Draft'}
                  </button>
                </td>
                <td><strong>${c.enrollment_count || 0}</strong></td>
                <td>
                  <div style="display:flex;gap:6px;flex-wrap:wrap;">
                    <button type="button" class="btn btn-outline btn-sm" onclick="window.app.openAdminCourseEditor(${c.id})">Edit</button>
                    <button type="button" class="btn btn-outline btn-sm" style="border-color:#ef4444;color:#ef4444;" onclick="window.app.deleteAdminCourse(${c.id})">
                      ${(c.enrollment_count || 0) > 0 ? 'Archive' : 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `
    }
  `;
}

function renderAdminRegistrationsSection(st: AdminLearnState): string {
  const f = st.regFilters;
  const allSelected =
    st.registrations.length > 0 && st.registrations.every((r) => st.selectedIds.includes(r.enrollment_id));

  return `
    <div class="glass-card" style="margin-bottom:20px;padding:20px;">
      <form onsubmit="window.app.applyAdminRegFilters(event)" class="learn-admin-filters">
        <div class="learn-filter-field">
          <label class="form-label" for="admin-learn-reg-search">Search</label>
          <input id="admin-learn-reg-search" type="text" class="form-control" value="${escHtml(f.search)}" placeholder="Name, email, phone, city..." />
        </div>
        <div class="learn-filter-field">
          <label class="form-label" for="admin-learn-reg-course">Course</label>
          <select id="admin-learn-reg-course" class="form-control">
            <option value="">All Courses</option>
            ${st.courses
              .map(
                (c) => `<option value="${c.id}" ${String(c.id) === f.courseId ? 'selected' : ''}>${escHtml(c.title)}</option>`
              )
              .join('')}
          </select>
        </div>
        <div class="learn-filter-field">
          <label class="form-label" for="admin-learn-reg-country">Country</label>
          <select id="admin-learn-reg-country" class="form-control">
            <option value="">All Countries</option>
            ${st.countries
              .map(
                (country) => `<option value="${escHtml(country)}" ${country === f.country ? 'selected' : ''}>${escHtml(country)}</option>`
              )
              .join('')}
          </select>
        </div>
        <div class="learn-filter-field">
          <label class="form-label" for="admin-learn-reg-status">Status</label>
          <select id="admin-learn-reg-status" class="form-control">
            <option value="">All Statuses</option>
            ${ENROLLMENT_STATUSES.map(
              (s) => `<option value="${s}" ${s === f.status ? 'selected' : ''}>${s}</option>`
            ).join('')}
          </select>
        </div>
        <div class="learn-filter-field">
          <label class="form-label" for="admin-learn-reg-from">From Date</label>
          <input id="admin-learn-reg-from" type="date" class="form-control" value="${escHtml(f.from)}" />
        </div>
        <div class="learn-filter-field">
          <label class="form-label" for="admin-learn-reg-to">To Date</label>
          <input id="admin-learn-reg-to" type="date" class="form-control" value="${escHtml(f.to)}" />
        </div>
        <div class="learn-filter-actions">
          <button type="submit" class="btn btn-lime btn-sm">Apply Filters</button>
          <button type="button" class="btn btn-outline btn-sm" onclick="window.app.clearAdminRegFilters()">Reset</button>
          <button type="button" class="btn btn-outline btn-sm" onclick="window.app.exportAdminLearnCsv()">⬇ Export CSV</button>
        </div>
      </form>
    </div>

    <div class="learn-bulk-bar">
      <div style="font-size:13.5px;color:var(--yole-text-muted);">
        Showing <strong>${st.registrations.length}</strong> of <strong>${st.pagination.total}</strong> registrations
        ${st.selectedIds.length > 0 ? ` • <strong style="color:var(--yole-lime);">${st.selectedIds.length} selected</strong>` : ''}
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <label for="admin-learn-bulk-status" class="sr-only">Bulk status</label>
        <select id="admin-learn-bulk-status" class="form-control" style="width:auto;padding:7px 12px;font-size:13px;" onchange="window.app.ensureAdminLearnState().bulkStatus=this.value;">
          ${ENROLLMENT_STATUSES.map(
            (s) => `<option value="${s}" ${s === st.bulkStatus ? 'selected' : ''}>Set ${s}</option>`
          ).join('')}
        </select>
        <button type="button" class="btn btn-outline btn-sm" ${st.selectedIds.length === 0 || st.bulkUpdating ? 'disabled' : ''} onclick="window.app.handleAdminBulkStatusUpdate()">
          ${st.bulkUpdating ? 'Updating...' : 'Apply Bulk Status'}
        </button>
      </div>
    </div>

    ${st.regError ? `<div class="form-error-box" role="alert">${escHtml(st.regError)}</div>` : ''}

    ${
      st.regLoading
        ? `<div class="glass-card learn-state-card" role="status"><div class="learn-spinner" aria-hidden="true"></div><p>Loading registrations...</p></div>`
        : st.registrations.length === 0
        ? `<div class="glass-card learn-state-card"><p>No learner registrations match your current filters.</p></div>`
        : `
      <div class="table-wrapper">
        <table class="yole-table">
          <thead>
            <tr>
              <th style="width:40px;">
                <input type="checkbox" aria-label="Select all visible registrations" ${allSelected ? 'checked' : ''} onchange="window.app.toggleAdminRegSelectAll(this.checked)" />
              </th>
              <th>Learner</th>
              <th>Phone</th>
              <th>Location</th>
              <th>Course</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${st.registrations
              .map(
                (r) => `
              <tr>
                <td>
                  <input type="checkbox" aria-label="Select ${escHtml(r.full_name)}" ${st.selectedIds.includes(r.enrollment_id) ? 'checked' : ''} onchange="window.app.toggleAdminRegSelection(${r.enrollment_id}, this.checked)" />
                </td>
                <td>
                  <div style="font-weight:800;font-size:14px;">${escHtml(r.full_name)}</div>
                  <div style="font-size:12px;color:var(--yole-text-muted);">${escHtml(r.email)}</div>
                </td>
                <td style="font-size:13px;">${escHtml(r.phone)}</td>
                <td style="font-size:13px;">${escHtml(`${r.city}, ${r.state_name}, ${r.country_name}`)}</td>
                <td><span class="tech-pill">${escHtml(r.course_title)}</span></td>
                <td><span class="${statusBadgeClass(r.status)}">${escHtml(r.status)}</span></td>
                <td style="font-size:12.5px;color:var(--yole-text-muted);">${formatDateShort(r.created_at)}</td>
                <td>
                  <button type="button" class="btn btn-outline btn-sm" onclick="window.app.openAdminRegDrawer(${r.enrollment_id})">Inspect</button>
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>

      <div class="learn-pagination-bar">
        <button type="button" class="btn btn-outline btn-sm" ${st.pagination.page <= 1 ? 'disabled' : ''} onclick="window.app.setAdminRegPage(${st.pagination.page - 1})">← Previous</button>
        <span style="font-size:13px;color:var(--yole-text-muted);">Page <strong>${st.pagination.page}</strong> of <strong>${st.pagination.totalPages}</strong></span>
        <button type="button" class="btn btn-outline btn-sm" ${st.pagination.page >= st.pagination.totalPages ? 'disabled' : ''} onclick="window.app.setAdminRegPage(${st.pagination.page + 1})">Next →</button>
      </div>
    `
    }
  `;
}

function renderAdminRegistrationDrawer(row: AdminRegistrationRow, saving: boolean): string {
  return `
    <div class="learn-drawer-backdrop" onclick="window.app.openAdminRegDrawer(null)" aria-hidden="true"></div>
    <aside class="learn-drawer" role="dialog" aria-modal="true" aria-labelledby="learn-drawer-title">
      <div class="learn-drawer-header">
        <div>
          <div class="eyebrow" style="margin-bottom:4px;"><span class="eyebrow-dot"></span> REGISTRATION #${row.enrollment_id}</div>
          <h3 id="learn-drawer-title" style="font-size:21px;font-weight:900;">${escHtml(row.full_name)}</h3>
        </div>
        <button type="button" class="form-confirmation-dismiss" aria-label="Close registration details" onclick="window.app.openAdminRegDrawer(null)">×</button>
      </div>
      <div class="learn-drawer-body">
        <dl class="learn-detail-list">
          <div><dt>Email</dt><dd><a href="mailto:${escHtml(row.email)}" style="color:var(--yole-lime);">${escHtml(row.email)}</a></dd></div>
          <div><dt>Phone</dt><dd>${escHtml(row.phone)}</dd></div>
          <div><dt>Gender</dt><dd>${escHtml(row.gender)}</dd></div>
          <div><dt>Location</dt><dd>${escHtml(`${row.city}, ${row.state_name}, ${row.country_name}`)}</dd></div>
          <div><dt>Course</dt><dd><strong>${escHtml(row.course_title)}</strong></dd></div>
          <div><dt>Registered</dt><dd>${formatDateShort(row.created_at)}</dd></div>
        </dl>

        <form onsubmit="window.app.handleAdminRegDrawerSave(event, ${row.enrollment_id})" style="margin-top:20px;">
          <div class="form-group">
            <label class="form-label" for="drawer-reg-status">Enrollment Status</label>
            <select id="drawer-reg-status" name="status" class="form-control">
              ${ENROLLMENT_STATUSES.map(
                (s) => `<option value="${s}" ${row.status === s ? 'selected' : ''}>${s}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="drawer-reg-notes">Internal Admin Notes</label>
            <textarea id="drawer-reg-notes" name="notes" rows="4" class="form-control" placeholder="Add review notes, onboarding details, or cohort assignment...">${escHtml(row.notes || '')}</textarea>
          </div>
          <div style="display:flex;gap:10px;">
            <button type="submit" class="btn btn-lime" style="flex:1;" ${saving ? 'disabled' : ''}>
              ${saving ? 'Saving...' : 'Save Status & Notes'}
            </button>
            <button type="button" class="btn btn-outline" onclick="window.app.openAdminRegDrawer(null)">Close</button>
          </div>
        </form>
      </div>
    </aside>
  `;
}

function renderAdminContentSection(st: AdminLearnState): string {
  const c = st.pageContent;
  const faqs = st.draftFaq || c?.faq || [];

  return `
    <div class="glass-card" style="max-width:860px;">
      <h2 style="font-size:21px;font-weight:900;margin-bottom:6px;">Learn Page Banner &amp; FAQ Content</h2>
      <p style="font-size:13.5px;color:var(--yole-text-muted);margin-bottom:20px;">
        Updates made here are reflected immediately on the live /learn page.
      </p>
      ${st.contentError ? `<div class="form-error-box" role="alert">${escHtml(st.contentError)}</div>` : ''}
      ${st.contentMessage ? `<div class="form-confirmation-box" role="status"><div class="form-confirmation-title"><span class="form-confirmation-badge">✓</span><span>${escHtml(st.contentMessage)}</span></div></div>` : ''}
      <form id="admin-learn-content-form" novalidate onsubmit="window.app.handleAdminLearnContentSave(event)">
        <div class="form-group">
          <label class="form-label" for="admin-learn-headline">Banner Headline *</label>
          <input id="admin-learn-headline" name="headline" type="text" required class="form-control" value="${escHtml(c?.headline || '')}" />
        </div>
        <div class="form-group">
          <label class="form-label" for="admin-learn-subheadline">Banner Sub-headline *</label>
          <textarea id="admin-learn-subheadline" name="subheadline" rows="3" required class="form-control">${escHtml(c?.subheadline || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label" for="admin-learn-cta">Primary CTA Button Label *</label>
          <input id="admin-learn-cta" name="cta_label" type="text" required class="form-control" value="${escHtml(c?.cta_label || 'Register Now')}" />
        </div>

        <div style="margin:24px 0 12px;display:flex;justify-content:space-between;align-items:center;gap:10px;">
          <h3 style="font-size:17px;font-weight:800;">FAQ Items (${faqs.length})</h3>
          <button type="button" class="btn btn-outline btn-sm" onclick="window.app.addAdminLearnFaqItem()">+ Add FAQ Item</button>
        </div>

        <div style="display:flex;flex-direction:column;gap:14px;margin-bottom:20px;">
          ${faqs
            .map(
              (item, idx) => `
            <div class="learn-admin-faq-row">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <strong style="font-size:13px;color:var(--yole-lime);">FAQ #${idx + 1}</strong>
                <button type="button" class="btn btn-outline btn-sm" style="border-color:#ef4444;color:#ef4444;padding:4px 10px;font-size:11.5px;" onclick="window.app.removeAdminLearnFaqItem(${idx})">Remove</button>
              </div>
              <div class="form-group" style="margin-bottom:10px;">
                <label class="form-label" for="faq-q-${idx}">Question</label>
                <input id="faq-q-${idx}" type="text" data-faq-q="${idx}" class="form-control" value="${escHtml(item.question)}" placeholder="Enter question..." />
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label" for="faq-a-${idx}">Answer</label>
                <textarea id="faq-a-${idx}" rows="2" data-faq-a="${idx}" class="form-control" placeholder="Enter honest answer...">${escHtml(item.answer)}</textarea>
              </div>
            </div>
          `
            )
            .join('')}
        </div>

        <button type="submit" class="btn btn-lime" ${st.contentSaving ? 'disabled' : ''}>
          ${st.contentSaving ? 'Saving Content...' : 'Save Page Content & FAQ'}
        </button>
      </form>
    </div>
  `;
}
