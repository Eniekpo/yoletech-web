// ============================================================================
// YOLETECH — FULL-STACK APPLICATION CONTROLLER & ROUTER
// Owner: John Oruebi Eniekpo, M.Sc.
// ============================================================================

class YoletechApp {
  constructor() {
    this.currentPage = 'home';
    this.currentSlide = 0;
    this.slideInterval = null;
    this.portfolioFilter = 'ALL';
    this.blogFilter = 'ALL';
    this.activeBlogPost = null;
    this.showcaseTab = 'dashboard';
    this.aboutTab = 'skills';
    this.serviceScopeTab = 0;
    this.authMode = 'login';
    this.adminTab = 'clients';
    this.footerTab = 'overview';
    this.clientSearch = '';
    this.clientStatusFilter = 'ALL';
    this.adminClientPage = 1;
    this.adminClientLimit = 30;
    this.testimonialPage = 1;
    this.testimonialLimit = 8;
    this.contactServiceSelected = 'Data Analysis & Analytics';
    this.mobileMenuOpen = false;
    this.editingBlogPost = null;
    this.editingPortfolioProject = null;

    this.token = localStorage.getItem('yoletech_token') || null;
    this.user = JSON.parse(localStorage.getItem('yoletech_user') || 'null');

    this.portfolio = [];
    this.testimonials = [];
    this.blogPosts = [];
    this.clients = [];
    this.inquiries = [];
    this.toastMessage = null;
    this.notifyEmail = 'yoletech@yolestica.com';
    this.showPassword = false;
    this.lastContactSubmission = null;
    this.formConfirmations = {};
    this.renderedPage = null;
    const savedTheme = localStorage.getItem('yoletech_theme');
    const prefersLight = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    this.theme = savedTheme || (prefersLight ? 'light' : 'dark');
  }

  async init() {
    this.bindPopState();
    this.applyTheme(this.theme, false);
    this.bindThemeListener();
    this.resolveInitialRoute();
    await this.loadPublicData();
    if (this.token) {
      await this.verifySession();
    }
    if (typeof this.loadDashboardData === 'function') {
      try {
        await this.loadDashboardData(true);
      } catch (e) {
        console.warn('Dashboard pre-load notice:', e);
      }
    }
    this.render();
    this.startSlideshow();
  }

  bindPopState() {
    window.addEventListener('popstate', () => {
      this.resolveInitialRoute();
      this.render();
    });
  }

  resolveInitialRoute() {
    const params = new URLSearchParams(window.location.search || '');
    const queryPage = (params.get('page') || '').replace(/^\/+|\/+$/g, '').toLowerCase();
    const hashPage = (window.location.hash || '').replace(/^#+|\/+$/g, '').replace(/^\/+/, '').toLowerCase();
    const pathPage = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
    const path = queryPage || hashPage || pathPage;

    const validPages = [
      'home',
      'dashboard',
      'about',
      'services',
      'portfolio',
      'testimonials',
      'blog',
      'contact',
      'login',
      'register',
      'portal',
      'admin-dashboard'
    ];
    if (!path || path === '' || path === 'index.html') {
      this.currentPage = 'home';
    } else if (path.startsWith('blog/')) {
      this.currentPage = 'blog-detail';
      this.activeBlogSlug = path.split('/')[1];
      if (this.blogPosts.length > 0) {
        this.activeBlogPost = this.blogPosts.find((p) => p.slug === this.activeBlogSlug) || null;
      }
      if (queryPage || hashPage) {
        window.history.replaceState({}, '', `/blog/${this.activeBlogSlug}`);
      }
    } else if (validPages.includes(path)) {
      if (path === 'register') {
        this.currentPage = 'login';
        this.authMode = 'register';
      } else {
        this.currentPage = path;
      }
      if (queryPage || hashPage) {
        window.history.replaceState({}, '', path === 'home' ? '/' : `/${path}`);
      }
    } else {
      this.currentPage = 'home';
    }
  }

  async api(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    const res = await fetch(endpoint, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Request failed');
    }
    return data;
  }

  getLocalRegisteredUsers() {
    try {
      return JSON.parse(localStorage.getItem('yoletech_registered_clients') || '[]');
    } catch {
      return [];
    }
  }

  saveLocalRegisteredUser(userObj, rawPassword = '') {
    try {
      const list = this.getLocalRegisteredUsers();
      const email = String(userObj.email || '').trim().toLowerCase();
      const idx = list.findIndex((u) => String(u.email || '').toLowerCase() === email);
      const record = {
        ...userObj,
        email,
        _pwd: rawPassword || (idx >= 0 ? list[idx]._pwd : '')
      };
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...record };
      } else {
        list.unshift(record);
      }
      localStorage.setItem('yoletech_registered_clients', JSON.stringify(list));
    } catch (e) {
      console.warn('Local user cache warning:', e);
    }
  }

  getLocalInquiries() {
    try {
      return JSON.parse(localStorage.getItem('yoletech_local_inquiries') || '[]');
    } catch {
      return [];
    }
  }

  saveLocalInquiry(inquiryObj) {
    try {
      const list = this.getLocalInquiries();
      const exists = list.some((i) => Number(i.id) === Number(inquiryObj.id) && i.created_at === inquiryObj.created_at);
      if (!exists) {
        list.unshift(inquiryObj);
        localStorage.setItem('yoletech_local_inquiries', JSON.stringify(list));
      }
    } catch (e) {
      console.warn('Local inquiry cache warning:', e);
    }
  }

  async sendEmailToYoletech({ subject, replyTo, fields }) {
    const recipient = this.notifyEmail || 'yoletech@yolestica.com';
    try {
      const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(recipient)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          _subject: subject,
          _replyto: replyTo || '',
          _template: 'table',
          _captcha: 'false',
          ...fields
        })
      });
      return res.ok;
    } catch (err) {
      console.warn('Browser email relay warning:', err);
      return false;
    }
  }

  parseFrontmatterMarkdown(rawContent, slug) {
    const normalized = String(rawContent || '').replace(/\r\n/g, '\n');
    const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    const meta = {};
    let body = normalized.trim();

    if (match) {
      const yamlBlock = match[1];
      body = match[2].trim();
      const lines = yamlBlock.split('\n');
      let currentListKey = null;

      for (const line of lines) {
        const listItemMatch = line.match(/^\s*-\s+(.+)$/);
        if (listItemMatch && currentListKey) {
          let itemVal = listItemMatch[1].trim();
          if ((itemVal.startsWith('"') && itemVal.endsWith('"')) || (itemVal.startsWith("'") && itemVal.endsWith("'"))) {
            itemVal = itemVal.slice(1, -1);
          }
          meta[currentListKey].push(itemVal);
          continue;
        }
        const kvMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
        if (!kvMatch) continue;
        const key = kvMatch[1].trim();
        let val = kvMatch[2].trim();
        if (val === '') {
          currentListKey = key;
          meta[key] = [];
          continue;
        }
        currentListKey = null;
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (val.startsWith('[') && val.endsWith(']')) {
          try {
            meta[key] = JSON.parse(val);
            continue;
          } catch {}
        }
        meta[key] = val;
      }
    }
    return { slug, meta, body };
  }

  async fetchGitHubCollection(folderType) {
    try {
      const apiUrl = `https://api.github.com/repos/Eniekpo/yoletech-web/contents/content/${folderType}?ref=main`;
      const res = await fetch(apiUrl);
      if (!res.ok) return [];
      const files = await res.json();
      if (!Array.isArray(files)) return [];
      const mdFiles = files.filter((f) => f.name && f.name.endsWith('.md') && f.download_url);

      const items = await Promise.all(
        mdFiles.map(async (file) => {
          const rawRes = await fetch(file.download_url);
          const rawText = await rawRes.text();
          const slug = file.name.replace(/\.md$/i, '');
          const { meta, body } = this.parseFrontmatterMarkdown(rawText, slug);

          if (folderType === 'portfolio') {
            const techStack = Array.isArray(meta.tech_stack)
              ? meta.tech_stack
              : String(meta.tech_stack || 'Python, SQL, Power BI').split(',').map((s) => s.trim()).filter(Boolean);
            return {
              id: slug,
              slug,
              title: meta.title || slug,
              date: meta.date || '2026-01-01',
              category: meta.category || 'Data Analytics & BI',
              organization: meta.organization || 'YOLETECH',
              period: meta.period || '2026',
              summary: meta.summary || body.slice(0, 220),
              impact_metrics: meta.impact_metrics || 'Verified production delivery',
              tech_stack: techStack,
              preview_image: meta.preview_image || '/assets/dashboard-preview.jpg',
              demo_url: meta.demo_url || meta.live_url || '',
              live_url: meta.demo_url || meta.live_url || '',
              github_url: meta.github_url || 'https://github.com/Eniekpo',
              featured: meta.featured !== 'false' && meta.featured !== false,
              body
            };
          } else {
            const tags = Array.isArray(meta.tags)
              ? meta.tags
              : String(meta.tags || 'Python, SQL, Power BI').split(',').map((s) => s.trim()).filter(Boolean);
            return {
              slug,
              title: meta.title || slug,
              date: meta.date || '2026-01-01',
              category: meta.category || 'Data Analytics & BI',
              readTime: meta.readTime || '5 min read',
              author: meta.author || 'John Oruebi Eniekpo',
              coverImage: meta.coverImage || '/assets/dashboard-preview.jpg',
              summary: meta.summary || body.slice(0, 180),
              tags,
              featured: meta.featured === 'true' || meta.featured === true,
              body
            };
          }
        })
      );

      return items.sort((a, b) => (a.date < b.date ? 1 : -1));
    } catch (e) {
      console.warn(`GitHub fallback fetch failed for ${folderType}:`, e);
      return [];
    }
  }

  async loadPublicData() {
    const [portSettled, testSettled, blogSettled] = await Promise.allSettled([
      this.api('/api/portfolio'),
      this.api('/api/testimonials'),
      this.api('/api/blog')
    ]);

    this.portfolio =
      portSettled.status === 'fulfilled' && Array.isArray(portSettled.value?.projects)
        ? portSettled.value.projects
        : [];
    this.testimonials =
      testSettled.status === 'fulfilled' && Array.isArray(testSettled.value?.testimonials)
        ? testSettled.value.testimonials
        : [];
    this.blogPosts =
      blogSettled.status === 'fulfilled' && Array.isArray(blogSettled.value?.posts)
        ? blogSettled.value.posts
        : [];

    // Fallback or live sync with GitHub Decap Bridge content if API is unavailable or empty
    if (this.portfolio.length === 0) {
      this.portfolio = await this.fetchGitHubCollection('portfolio');
    }
    if (this.blogPosts.length === 0) {
      this.blogPosts = await this.fetchGitHubCollection('blog');
    }
    if (this.testimonials.length === 0 && window.YOLETECH_DATA?.defaultTestimonials) {
      this.testimonials = window.YOLETECH_DATA.defaultTestimonials;
    }

    if (this.currentPage === 'blog-detail' && this.activeBlogSlug) {
      this.activeBlogPost = this.blogPosts.find((p) => p.slug === this.activeBlogSlug) || null;
    }
  }

  async verifySession() {
    try {
      const { user } = await this.api('/api/auth/me');
      this.user = user;
      localStorage.setItem('yoletech_user', JSON.stringify(user));
    } catch {
      // Preserve locally stored authenticated session if serverless container restarted
      if (!this.user) {
        this.logout(false);
        return;
      }
    }
    if (this.user?.role === 'ADMIN') {
      await this.loadAdminData();
    } else if (this.user) {
      await this.loadClientData();
    }
  }

  async loadAdminData() {
    let apiClients = [];
    let apiInquiries = [];
    try {
      const data = await this.api('/api/clients');
      apiClients = data.clients || [];
      apiInquiries = data.inquiries || [];
    } catch (err) {
      console.warn('Admin API fallback used:', err.message);
    }

    const localUsers = this.getLocalRegisteredUsers();
    const mergedClients = [...apiClients];
    localUsers.forEach((lu) => {
      if (!mergedClients.some((c) => String(c.email).toLowerCase() === String(lu.email).toLowerCase())) {
        mergedClients.unshift(lu);
      }
    });
    this.clients = mergedClients;

    const localInq = this.getLocalInquiries();
    const mergedInq = [...apiInquiries];
    localInq.forEach((li) => {
      if (!mergedInq.some((i) => i.email === li.email && i.message === li.message)) {
        mergedInq.unshift(li);
      }
    });
    this.inquiries = mergedInq;
  }

  async loadClientData() {
    let apiInquiries = [];
    try {
      const data = await this.api('/api/inquiries');
      apiInquiries = data.inquiries || [];
    } catch (err) {
      console.warn('Client inquiries local fallback used:', err.message);
    }
    const myEmail = String(this.user?.email || '').toLowerCase();
    const localInq = this.getLocalInquiries().filter((i) => String(i.email || '').toLowerCase() === myEmail);
    const merged = [...apiInquiries];
    localInq.forEach((li) => {
      if (!merged.some((i) => i.message === li.message && i.service_category === li.service_category)) {
        merged.unshift(li);
      }
    });
    this.inquiries = merged;
  }

  showToast(msg, type = 'success') {
    this.toastMessage = { msg, type };
    this.renderToast();
    setTimeout(() => {
      this.toastMessage = null;
      this.renderToast();
    }, 4500);
  }

  renderToast() {
    let container = document.getElementById('toast-container');
    if (!container) return;
    if (!this.toastMessage) {
      container.innerHTML = '';
      return;
    }
    const isErr = this.toastMessage.type === 'error';
    container.innerHTML = `
      <div class="toast-banner" style="position:fixed;bottom:24px;right:24px;z-index:9999;background:${
        isErr ? '#7f1d1d' : '#1E1B54'
      };border:2px solid ${
      isErr ? '#F7941D' : '#C8E61E'
    };color:#FFFFFF;padding:14px 22px;border-radius:14px;box-shadow:0 16px 40px rgba(0,0,0,0.6);display:flex;align-items:center;gap:12px;font-weight:700;font-size:14px;">
        <span style="color:${isErr ? '#F7941D' : '#C8E61E'};font-size:18px;">${isErr ? '⚠️' : '✓'}</span>
        <span>${this.toastMessage.msg}</span>
      </div>
    `;
  }

  setFormConfirmation(formKey, data) {
    if (!this.formConfirmations) this.formConfirmations = {};
    this.formConfirmations[formKey] = {
      type: 'success',
      ...data,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    this.updateFormFeedbackDOM(formKey);
  }

  dismissFormConfirmation(formKey) {
    if (this.formConfirmations && this.formConfirmations[formKey]) {
      delete this.formConfirmations[formKey];
    }
    const el = document.getElementById(`form-feedback-${formKey}`);
    if (el) {
      el.innerHTML = '';
    }
  }

  buildFormFeedbackHtml(formKey, conf) {
    if (!conf) return '';
    if (conf.type === 'error') {
      return `
        <div class="form-error-box" role="alert">
          <div class="form-confirmation-header">
            <div class="form-confirmation-title" style="color:#F7941D;">
              <span style="font-size:16px;">⚠️</span>
              <span>${conf.title || 'Form Validation Error'}</span>
            </div>
            <button type="button" class="form-confirmation-dismiss" title="Dismiss" onclick="window.app.dismissFormConfirmation('${formKey}')">×</button>
          </div>
          <p style="font-size:13px;color:#FFFFFF;margin:0;line-height:1.5;">${conf.message}</p>
        </div>
      `;
    }
    return `
      <div class="form-confirmation-box" role="status">
        <div class="form-confirmation-header">
          <div class="form-confirmation-title">
            <span class="form-confirmation-badge">✓</span>
            <span>${conf.title || 'Submission Confirmed'}</span>
          </div>
          <button type="button" class="form-confirmation-dismiss" title="Dismiss" onclick="window.app.dismissFormConfirmation('${formKey}')">×</button>
        </div>
        <p style="font-size:13.5px;color:#FFFFFF;margin-bottom:${conf.actionsHtml ? '12px' : '0'};line-height:1.55;">
          ${conf.message}
        </p>
        ${conf.actionsHtml || ''}
      </div>
    `;
  }

  renderFormConfirmation(formKey) {
    const conf = this.formConfirmations?.[formKey];
    return `<div id="form-feedback-${formKey}">${this.buildFormFeedbackHtml(formKey, conf)}</div>`;
  }

  updateFormFeedbackDOM(formKey) {
    const container = document.getElementById(`form-feedback-${formKey}`);
    if (!container) return;
    const conf = this.formConfirmations?.[formKey];
    container.innerHTML = this.buildFormFeedbackHtml(formKey, conf);
  }

  clearFieldError(field) {
    if (!field) return;
    if (field.classList) {
      field.classList.remove('is-invalid');
    }
    if (field.parentNode && field.parentNode.querySelectorAll) {
      const existing = field.parentNode.querySelectorAll('.field-error-msg');
      existing.forEach((el) => el.remove());
    }
  }

  setFieldError(field, msg) {
    if (!field) return;
    this.clearFieldError(field);
    if (field.classList) {
      field.classList.remove('is-valid');
      field.classList.add('is-invalid');
    }
    if (field.parentNode && typeof document !== 'undefined' && document.createElement) {
      const errEl = document.createElement('div');
      errEl.className = 'field-error-msg';
      errEl.innerHTML = `<span>⚠️</span><span>${msg}</span>`;
      if (field.parentNode.appendChild) {
        field.parentNode.appendChild(errEl);
      }
    }
    if (field.addEventListener && !field._validationBound) {
      field._validationBound = true;
      field.addEventListener('input', () => {
        this.clearFieldError(field);
      });
    }
  }

  validateForm(form, formKey, rules) {
    if (!form) return true;
    if (this.formConfirmations?.[formKey]) {
      delete this.formConfirmations[formKey];
      this.updateFormFeedbackDOM(formKey);
    }

    const errors = [];
    let firstInvalidField = null;

    for (const rule of rules) {
      const field = form[rule.name];
      if (!field) continue;
      this.clearFieldError(field);

      const rawVal = String(field.value ?? '');
      const val = rule.trim === false ? rawVal : rawVal.trim();
      let fieldErr = null;

      if (rule.required && !val) {
        fieldErr = `${rule.label} is required.`;
      } else if (val) {
        if (rule.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val)) {
          fieldErr = `Please enter a valid email address for ${rule.label} (e.g. name@company.com).`;
        } else if (rule.type === 'phone' && !/^[+\d][\d\s().-]{6,22}$/.test(val)) {
          fieldErr = `Please enter a valid phone or WhatsApp number for ${rule.label}.`;
        } else if (rule.type === 'url' && !/^(https?:\/\/[^\s/$.?#].[^\s]*|\/[^\s]*)$/i.test(val)) {
          fieldErr = `Please enter a valid URL for ${rule.label} (starting with https:// or /).`;
        } else if (rule.minLength && val.length < rule.minLength) {
          fieldErr = `${rule.label} must be at least ${rule.minLength} characters long.`;
        }
      }

      if (fieldErr) {
        errors.push(fieldErr);
        this.setFieldError(field, fieldErr);
        if (!firstInvalidField) firstInvalidField = field;
      } else if (val && field.classList) {
        field.classList.add('is-valid');
      }
    }

    if (errors.length > 0) {
      this.setFormConfirmation(formKey, {
        type: 'error',
        title: 'Form Validation Required',
        message: errors[0]
      });
      this.showToast(errors[0], 'error');
      if (firstInvalidField && typeof firstInvalidField.focus === 'function') {
        firstInvalidField.focus();
      }
      return false;
    }

    return true;
  }

  selectContactService(rawService) {
    const map = {
      'Web Development': 'Web Development',
      'Full-Stack Web': 'Web Development',
      'Full-Stack Web Development': 'Web Development',
      'Data Analysis & Analytics': 'Data Analysis & Analytics',
      'Data Analytics & BI': 'Data Analysis & Analytics',
      'Data Analytics & Dashboards': 'Data Analysis & Analytics',
      'AI Automation': 'AI Automation',
      'AI & Machine Learning': 'AI Automation',
      'AI & Workflow Automation': 'AI Automation',
      'AI & Automation': 'AI Automation',
      'Tech Tutorials': 'Tech Tutorials',
      'Tech Tutorials & Mentorship': 'Tech Tutorials',
      'Tech Tutorials & Training': 'Tech Tutorials',
      'Graphic Design': 'Graphic Design',
      'Graphic Design & Video': 'Graphic Design',
      'Video Editing': 'Video Editing',
      'Customer Support': 'Customer Support',
      'IT Support': 'IT Support',
      'IT & Database Support': 'IT Support',
      'IT & Customer Support': 'IT Support'
    };
    this.contactServiceSelected = map[rawService] || rawService || 'Data Analysis & Analytics';
    this.navigate('contact');
  }

  async navigate(page, extra = null) {
    this.mobileMenuOpen = false;
    if (page === 'blog-detail' && extra) {
      this.currentPage = 'blog-detail';
      this.activeBlogSlug = extra;
      this.activeBlogPost = this.blogPosts.find((p) => p.slug === extra) || null;
      window.history.pushState({}, '', `/blog/${extra}`);
    } else if (page === 'register') {
      this.currentPage = 'login';
      this.authMode = 'register';
      window.history.pushState({}, '', '/register');
    } else {
      this.currentPage = page;
      if (page === 'login' && !extra) this.authMode = 'login';
      const url = page === 'home' ? '/' : `/${page}`;
      window.history.pushState({}, '', url);
    }

    if (this.currentPage === 'admin-dashboard' && this.user?.role === 'ADMIN') {
      await this.loadAdminData();
    } else if (this.currentPage === 'portal' && this.user) {
      await this.loadClientData();
    } else if (this.currentPage === 'dashboard' && typeof this.loadDashboardData === 'function') {
      await this.loadDashboardData(true);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.render();
  }

  startSlideshow() {
    if (this.slideInterval) clearInterval(this.slideInterval);
    this.slideInterval = setInterval(() => {
      if (this.currentPage === 'home' && !this.slidePaused) {
        const slides = window.YOLETECH_DATA.heroSlides;
        this.currentSlide = (this.currentSlide + 1) % slides.length;
        this.updateHeroSlideDOM();
      }
    }, 6500);
  }

  setSlide(index) {
    const slides = window.YOLETECH_DATA.heroSlides;
    this.currentSlide = (index + slides.length) % slides.length;
    this.updateHeroSlideDOM();
  }

  updateHeroSlideDOM() {
    const container = document.getElementById('hero-slideshow-mount');
    if (container) {
      container.innerHTML = this.renderHeroSlideInner();
      this.initKpiCounters(container);
    }
  }

  getKpiStepConfig(target, decimals) {
    const absTarget = Math.abs(target);
    if (absTarget === 0) {
      return { stepSize: 1, intervalMs: 50 };
    }
    // Sub-unit decimals (e.g. 0.03ms)
    if (absTarget < 1) {
      const unitStep = Math.pow(10, -Math.max(1, decimals));
      return { stepSize: unitStep, intervalMs: 220 };
    }
    // Small decimal metrics (e.g. +12.5%)
    if (decimals > 0 && absTarget <= 20) {
      return { stepSize: 0.5, intervalMs: 42 };
    }
    // Small integers (e.g. 5+, 8+, CRM counts)
    if (absTarget <= 15 && decimals === 0) {
      const intervalMs = Math.max(85, Math.min(140, Math.round(750 / absTarget)));
      return { stepSize: 1, intervalMs };
    }
    // Medium decimals & percentages (e.g. 99.9%)
    if (absTarget <= 100 && decimals > 0) {
      return { stepSize: Number((absTarget / 37).toFixed(decimals)), intervalMs: 30 };
    }
    // Medium integers & percentages (e.g. 100%, project progress)
    if (absTarget <= 100) {
      const stepSize = absTarget <= 40 ? 1 : 2;
      return { stepSize, intervalMs: 24 };
    }
    // Hundreds (e.g. 200+ interns mentored)
    if (absTarget <= 1000) {
      const stepSize = Math.max(2, Math.ceil(absTarget / 40));
      return { stepSize, intervalMs: 30 };
    }
    // Thousands (e.g. 43,010 records audited)
    if (absTarget <= 100000) {
      const stepSize = Math.max(10, Math.ceil(absTarget / 55));
      return { stepSize, intervalMs: 26 };
    }
    // Millions+ (e.g. 5,903,500 workflows)
    const stepSize = Math.max(100, Math.ceil(absTarget / 70));
    return { stepSize, intervalMs: 22 };
  }

  formatKpiValue(val, decimals, useComma, prefix, suffix) {
    let numStr;
    if (decimals > 0) {
      numStr = val.toFixed(decimals);
      if (useComma) {
        const parts = numStr.split('.');
        parts[0] = Number(parts[0]).toLocaleString('en-US');
        numStr = parts.join('.');
      }
    } else {
      const rounded = Math.round(val);
      numStr = useComma ? rounded.toLocaleString('en-US') : String(rounded);
    }
    return `${prefix}${numStr}${suffix}`;
  }

  animateKpiElement(el) {
    if (!el) return;
    if (el._kpiTimer) {
      clearInterval(el._kpiTimer);
      el._kpiTimer = null;
    }

    const target = parseFloat(el.getAttribute('data-kpi-target'));
    if (isNaN(target)) return;

    const decimals = parseInt(el.getAttribute('data-kpi-decimals') || '0', 10);
    const useComma = el.getAttribute('data-kpi-comma') === 'true';
    const prefix = el.getAttribute('data-kpi-prefix') || '';
    const suffix = el.getAttribute('data-kpi-suffix') || '';

    if (target <= 0) {
      el.textContent = this.formatKpiValue(target, decimals, useComma, prefix, suffix);
      return;
    }

    const { stepSize, intervalMs } = this.getKpiStepConfig(target, decimals);
    let current = 0;
    el.textContent = this.formatKpiValue(0, decimals, useComma, prefix, suffix);

    el._kpiTimer = setInterval(() => {
      current = Number((current + stepSize).toFixed(Math.max(decimals, 4)));
      if (current >= target) {
        current = target;
        clearInterval(el._kpiTimer);
        el._kpiTimer = null;
      }
      el.textContent = this.formatKpiValue(current, decimals, useComma, prefix, suffix);
    }, intervalMs);
  }

  initKpiCounters(rootEl = document) {
    const elements = rootEl.querySelectorAll('[data-kpi-target]');
    if (!elements.length) return;

    if (!('IntersectionObserver' in window)) {
      elements.forEach((el) => this.animateKpiElement(el));
      return;
    }

    if (this.kpiObserver && rootEl === document) {
      this.kpiObserver.disconnect();
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.animateKpiElement(entry.target);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    if (rootEl === document) {
      this.kpiObserver = observer;
    }

    elements.forEach((el) => observer.observe(el));
  }

  logout(showNotification = true) {
    this.token = null;
    this.user = null;
    localStorage.removeItem('yoletech_token');
    localStorage.removeItem('yoletech_user');
    if (showNotification) {
      this.showToast('Signed out successfully.');
      this.navigate('home');
    }
  }

  exportClientsToCSV() {
    const clientRows = this.clients.filter((c) => c.role !== 'ADMIN');
    const headers = ['ID', 'Full Name', 'Email', 'Phone/WhatsApp', 'Company', 'Service Track', 'Status', 'Admin Notes', 'Registered At'];
    const csvLines = [
      headers.join(','),
      ...clientRows.map((c) =>
        [
          c.id,
          `"${(c.name || '').replace(/"/g, '""')}"`,
          `"${(c.email || '').replace(/"/g, '""')}"`,
          `"${(c.phone || '').replace(/"/g, '""')}"`,
          `"${(c.company || '').replace(/"/g, '""')}"`,
          `"${(c.service_interest || '').replace(/"/g, '""')}"`,
          `"${(c.status || '').replace(/"/g, '""')}"`,
          `"${(c.admin_notes || '').replace(/"/g, '""')}"`,
          `"${(c.created_at || '').replace(/"/g, '""')}"`
        ].join(',')
      )
    ];
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yoletech_registered_clients_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Exported registered clients to CSV!');
  }

  // ==========================================================================

  // ==========================================================================
  // THEME MANAGEMENT (LIGHT & CURRENT THEME)
  // ==========================================================================
  renderThemeToggle(mode = 'desktop') {
    const isLight = this.theme === 'light';
    const nextThemeLabel = isLight ? 'Current Theme (Dark)' : 'Light Theme';
    // In dark mode: show Sun icon to switch to Light Theme (matches user design)
    // In light mode: show Moon icon to switch back to Dark Theme
    const icon = isLight
      ? '<svg class="theme-toggle-icon icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
      : '<svg class="theme-toggle-icon icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.07" y2="4.93"/></svg>';
    const textLabel = isLight ? 'Dark Mode' : 'Light Mode';

    if (mode === 'mobile') {
      return `
        <button
          type="button"
          class="theme-toggle-btn theme-toggle-mobile"
          data-mode="mobile"
          onclick="window.app.toggleTheme()"
          aria-label="Current theme: ${isLight ? 'Light' : 'Dark'}. Switch to ${nextThemeLabel}"
          title="Switch to ${nextThemeLabel}"
        >
          <span class="theme-toggle-track">
            ${icon}
          </span>
          <span class="theme-toggle-label">${textLabel}</span>
        </button>
      `;
    }

    return `
      <button
        type="button"
        class="theme-toggle-btn theme-toggle-circle"
        data-mode="desktop"
        onclick="window.app.toggleTheme()"
        aria-label="Switch to ${nextThemeLabel}"
        title="Switch to ${nextThemeLabel}"
      >
        <span class="theme-toggle-track">
          ${icon}
        </span>
      </button>
    `;
  }

  toggleTheme() {
    const next = this.theme === 'light' ? 'dark' : 'light';
    this.applyTheme(next, true);
  }

  applyTheme(theme, save = true) {
    this.theme = theme === 'light' ? 'light' : 'dark';
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.setAttribute('data-theme', this.theme);
      document.querySelectorAll('.theme-toggle-btn').forEach((btn) => {
        const mode = btn.getAttribute('data-mode') || 'desktop';
        btn.outerHTML = this.renderThemeToggle(mode);
      });
    }
    if (save && typeof localStorage !== 'undefined') {
      localStorage.setItem('yoletech_theme', this.theme);
    }
    if (this.currentPage === 'dashboard' && typeof this.updateDashboardBody === 'function') {
      this.updateDashboardBody();
    }
  }

  
  renderSocialIcon(network) {
    const icons = {
      github:
        '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>',
      linkedin:
        '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9h2.79v8.37H6.46v-8.37M7.86 6.81a1.62 1.62 0 1 0 0 3.24 1.62 1.62 0 0 0 0-3.24z"/></svg>',
      kaggle:
        '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.825 23.859c-.022.09-.117.141-.281.141h-3.139c-.187 0-.351-.082-.492-.248l-5.178-6.589-1.448 1.374v5.111c0 .235-.117.352-.351.352H5.539c-.234 0-.352-.117-.352-.352V.352c0-.235.118-.352.352-.352h2.397c.234 0 .351.117.351.352v14.496l6.396-6.495c.14-.14.293-.211.457-.211h3.35c.164 0 .258.07.281.211.023.164-.035.281-.176.351l-7.076 6.918 7.428 7.828c.117.117.164.234.14.351z"/></svg>',
      youtube:
        '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
      facebook:
        '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>'
    };
    return icons[network] || '';
  }

  bindThemeListener() {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = (e) => {
      if (!localStorage.getItem('yoletech_theme')) {
        this.applyTheme(e.matches ? 'light' : 'dark', false);
      }
    };
    if (mq.addEventListener) {
      mq.addEventListener('change', handler);
    } else if (mq.addListener) {
      mq.addListener(handler);
    }
  }

  // HEADER & FOOTER
  // ==========================================================================
  renderHeader() {
    const C = window.YOLETECH_COMPONENTS;
    const navItems = [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'about', label: 'About' },
      { id: 'services', label: 'Services' },
      { id: 'portfolio', label: 'Portfolio' },
      { id: 'testimonials', label: 'Testimonials' },
      { id: 'blog', label: 'Blog' },
      { id: 'contact', label: 'Contact' }
    ];

    let authButtons = '';
    if (this.user) {
      const dashPage = this.user.role === 'ADMIN' ? 'admin-dashboard' : 'portal';
      const dashLabel = this.user.role === 'ADMIN' ? 'Admin Dashboard' : 'Client Portal';
      authButtons = `
        <button class="btn btn-lime btn-sm" onclick="window.app.navigate('${dashPage}')">
          ${dashLabel} →
        </button>
        <button class="btn btn-outline btn-sm" onclick="window.app.logout()">
          Sign Out
        </button>
      `;
    } else {
      authButtons = `
        <button class="btn btn-outline btn-sm" onclick="window.app.navigate('login')">
          Client Login
        </button>
        <button class="btn btn-lime btn-sm" onclick="window.app.navigate('register')">
          Register Portal
        </button>
      `;
    }

    return `
      <header class="site-header">
        <div class="container nav-inner">
          ${C.renderBrandLogo()}
          <ul class="nav-links ${this.mobileMenuOpen ? 'mobile-open' : ''}">
            ${navItems
              .map(
                (item) => `
              <li>
                <a class="nav-link ${
                  this.currentPage === item.id ||
                  (item.id === 'blog' && this.currentPage === 'blog-detail')
                    ? 'active'
                    : ''
                }" onclick="window.app.navigate('${item.id}')">${item.label}</a>
              </li>
            `
              )
              .join('')}
            <li class="mobile-nav-theme">${this.renderThemeToggle('mobile')}</li>
            <li class="mobile-nav-auth">${authButtons}</li>
          </ul>
          <div class="nav-actions">
            <div class="nav-auth-group">${authButtons}</div>
            ${this.renderThemeToggle('desktop')}
            <button class="mobile-menu-btn" onclick="window.app.mobileMenuOpen = !window.app.mobileMenuOpen; window.app.render();">
              ☰
            </button>
          </div>
        </div>
      </header>
    `;
  }

  renderFooter() {
    const D = window.YOLETECH_DATA.owner;
    const tabs = [
      { id: 'overview', label: 'Overview', detail: 'Who we are' },
      { id: 'services', label: 'Services', detail: 'What we do' },
      { id: 'explore', label: 'Explore', detail: 'Useful links' },
      { id: 'contact', label: 'Contact', detail: 'Get in touch' }
    ];
    const activeTab = tabs.some((tab) => tab.id === this.footerTab) ? this.footerTab : 'overview';

    return `
      <footer class="site-footer">
        <div class="container">
          <div class="footer-cta-banner">
            <div class="footer-cta-copy">
              <span class="footer-kicker"><span class="eyebrow-dot"></span> LET'S BUILD SOMETHING BETTER</span>
              <h2>Ready to move your next idea forward?</h2>
              <p>
                Thoughtful web, data, and automation solutions built around the way your business works.
              </p>
            </div>
            <div class="footer-cta-actions">
              <a href="${D.whatsappUrl}" target="_blank" rel="noopener" class="btn btn-lime">
                Start a WhatsApp chat <span aria-hidden="true">↗</span>
              </a>
              <button class="btn btn-outline" onclick="window.app.navigate('contact')">
                Tell me about your project
              </button>
            </div>
          </div>

          <div class="footer-information">
            <div class="footer-section-heading">
              <div>
                <span class="footer-kicker"><span class="eyebrow-dot"></span> YOLETECH</span>
                <h2>Good work starts with a good conversation.</h2>
              </div>
              <p>Explore the studio, services, and ways to connect.</p>
            </div>

            <div class="footer-tabs-nav" role="tablist" aria-label="Footer information">
              ${tabs
                .map(
                  (tab) => `
                <button
                  type="button"
                  id="footer-tab-${tab.id}"
                  class="footer-tab-btn ${activeTab === tab.id ? 'active' : ''}"
                  role="tab"
                  aria-selected="${activeTab === tab.id}"
                  aria-controls="footer-tab-panel"
                  tabindex="${activeTab === tab.id ? '0' : '-1'}"
                  onclick="window.app.selectFooterTab('${tab.id}')"
                  onkeydown="window.app.handleFooterTabKeydown(event, '${tab.id}')"
                >
                  <span class="footer-tab-label">${tab.label}</span>
                  <span class="footer-tab-detail">${tab.detail}</span>
                </button>
              `
                )
                .join('')}
            </div>

            <div
              id="footer-tab-panel"
              class="footer-tab-panel"
              role="tabpanel"
              aria-labelledby="footer-tab-${activeTab}"
              tabindex="0"
            >
              ${this.renderFooterTabContent(activeTab, D)}
            </div>
          </div>

          <div class="footer-legal">
            <span>© ${new Date().getFullYear()} YOLETECH. All rights reserved.</span>
            <span>${D.location}</span>
          </div>
        </div>
      </footer>


    `;
  }

  renderFooterTabContent(tab, owner = window.YOLETECH_DATA.owner) {
    const content = {
      overview: `
        <div class="footer-overview">
          <div class="footer-about-brand">
            ${window.YOLETECH_COMPONENTS.renderBrandLogo()}
            <p>Data analytics, business intelligence, workflow automation, and full-stack web solutions engineered for clarity and scale.</p>
          </div>
          <div class="footer-social-block">
            <h3>Connect with YOLETECH</h3>
            <p>Follow the work, explore projects, or start a conversation.</p>
            <div class="social-icon-row">
              <a href="${owner.socials.github}" target="_blank" rel="noopener noreferrer" class="social-btn">${this.renderSocialIcon('github')} <span>GitHub</span> <span aria-hidden="true">↗</span></a>
              <a href="${owner.socials.linkedin}" target="_blank" rel="noopener noreferrer" class="social-btn">${this.renderSocialIcon('linkedin')} <span>LinkedIn</span> <span aria-hidden="true">↗</span></a>
              <a href="${owner.socials.kaggle}" target="_blank" rel="noopener noreferrer" class="social-btn">${this.renderSocialIcon('kaggle')} <span>Kaggle</span> <span aria-hidden="true">↗</span></a>
              <a href="${owner.socials.youtube}" target="_blank" rel="noopener noreferrer" class="social-btn">${this.renderSocialIcon('youtube')} <span>YouTube</span> <span aria-hidden="true">↗</span></a>
              <a href="${owner.socials.facebook}" target="_blank" rel="noopener noreferrer" class="social-btn">${this.renderSocialIcon('facebook')} <span>Facebook</span> <span aria-hidden="true">↗</span></a>
              <a href="${owner.socials.whatsapp}" target="_blank" rel="noopener noreferrer" class="social-btn">WhatsApp <span aria-hidden="true">↗</span></a>
            </div>
          </div>
        </div>
      `,
      services: `
        <div class="footer-tab-content">
          <div class="footer-tab-intro">
            <span class="footer-panel-index">01 / WHAT WE DO</span>
            <h3>Services built around your goals</h3>
            <p>Practical expertise across modern web, data, and digital operations.</p>
          </div>
          <ul class="footer-link-grid">
            <li><a onclick="window.app.navigate('services')"><span>Full-Stack Web Development</span><span aria-hidden="true">↗</span></a></li>
            <li><a onclick="window.app.navigate('services')"><span>Data Analytics &amp; BI Dashboards</span><span aria-hidden="true">↗</span></a></li>
            <li><a onclick="window.app.navigate('services')"><span>AI &amp; Python/VBA Automation</span><span aria-hidden="true">↗</span></a></li>
            <li><a onclick="window.app.navigate('services')"><span>Tech Tutorials &amp; Staff Training</span><span aria-hidden="true">↗</span></a></li>
            <li><a onclick="window.app.navigate('services')"><span>Graphic Design &amp; Video Editing</span><span aria-hidden="true">↗</span></a></li>
            <li><a onclick="window.app.navigate('services')"><span>IT &amp; Database Support</span><span aria-hidden="true">↗</span></a></li>
          </ul>
        </div>
      `,
      explore: `
        <div class="footer-tab-content">
          <div class="footer-tab-intro">
            <span class="footer-panel-index">02 / DISCOVER</span>
            <h3>Explore the work and ideas</h3>
            <p>See how thoughtful engineering turns complex challenges into clear outcomes.</p>
          </div>
          <ul class="footer-link-grid">
            <li><a onclick="window.app.navigate('about')"><span>About YOLETECH</span><span aria-hidden="true">↗</span></a></li>
            <li><a onclick="window.app.navigate('portfolio')"><span>Portfolio &amp; Case Studies</span><span aria-hidden="true">↗</span></a></li>
            <li><a onclick="window.app.navigate('testimonials')"><span>Client Testimonials</span><span aria-hidden="true">↗</span></a></li>
            <li><a onclick="window.app.navigate('blog')"><span>Blog &amp; Tutorials</span><span aria-hidden="true">↗</span></a></li>
            <li><a onclick="window.app.navigate('login')"><span>Client Portal</span><span aria-hidden="true">↗</span></a></li>
            <li><a href="/cv.html" target="_blank" rel="noopener"><span>Curriculum Vitae</span><span aria-hidden="true">↗</span></a></li>
          </ul>
        </div>
      `,
      contact: `
        <div class="footer-tab-content">
          <div class="footer-tab-intro">
            <span class="footer-panel-index">03 / GET IN TOUCH</span>
            <h3>Let's talk about what you need</h3>
            <p>Reach out directly or send a project inquiry to get started.</p>
          </div>
          <div class="footer-contact-grid">
            <a class="footer-contact-item" href="mailto:${owner.email}">
              <span class="footer-contact-label">EMAIL</span>
              <strong>${owner.email}</strong>
              <span class="footer-contact-arrow" aria-hidden="true">↗</span>
            </a>
            <a class="footer-contact-item" href="${owner.whatsappUrl}" target="_blank" rel="noopener">
              <span class="footer-contact-label">WHATSAPP / PHONE</span>
              <strong>${owner.phone}</strong>
              <span class="footer-contact-arrow" aria-hidden="true">↗</span>
            </a>
            <div class="footer-contact-item">
              <span class="footer-contact-label">WORKING HOURS</span>
              <strong>${owner.workingHours}</strong>
            </div>
            <div class="footer-contact-item">
              <span class="footer-contact-label">LOCATION</span>
              <strong>${owner.location}</strong>
            </div>
          </div>
        </div>
      `
    };

    return content[tab] || content.overview;
  }

  selectFooterTab(tab, shouldFocus = false) {
    const tabIds = ['overview', 'services', 'explore', 'contact'];
    if (!tabIds.includes(tab)) return;

    this.footerTab = tab;
    const panel = document.getElementById('footer-tab-panel');
    const activeButton = document.getElementById(`footer-tab-${tab}`);
    if (!panel || !activeButton) return;

    panel.innerHTML = this.renderFooterTabContent(tab);
    panel.setAttribute('aria-labelledby', `footer-tab-${tab}`);
    tabIds.forEach((tabId) => {
      const button = document.getElementById(`footer-tab-${tabId}`);
      const isActive = tabId === tab;
      button?.classList.toggle('active', isActive);
      button?.setAttribute('aria-selected', String(isActive));
      button?.setAttribute('tabindex', isActive ? '0' : '-1');
    });

    if (shouldFocus) activeButton.focus();
  }

  handleFooterTabKeydown(event, currentTab) {
    const tabIds = ['overview', 'services', 'explore', 'contact'];
    const currentIndex = tabIds.indexOf(currentTab);
    let nextIndex;

    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabIds.length;
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabIds.length) % tabIds.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tabIds.length - 1;
    else return;

    event.preventDefault();
    this.selectFooterTab(tabIds[nextIndex], true);
  }

  // ==========================================================================
  // PAGE 1: HOME (HERO SLIDESHOW + 8-SERVICE STRIP + METRICS + LIVE PREVIEWS)
  // ==========================================================================
  renderHeroSlideInner() {
    const slides = window.YOLETECH_DATA.heroSlides;
    const slide = slides[this.currentSlide] || slides[0];
    const C = window.YOLETECH_COMPONENTS;

    let visualHtml = '';
    if (slide.visualType === 'portrait') {
      visualHtml = C.renderPortraitHeroWidget();
    } else if (slide.visualType === 'dashboard') {
      visualHtml = C.renderDataOverviewWidget();
    } else if (slide.visualType === 'codesync') {
      visualHtml = C.renderCodeSyncWidget();
    } else {
      visualHtml = C.renderWorkflowDiagramWidget();
    }

    return `
      <div class="hero-slide-grid">
        <div>
          <div class="eyebrow">
            <span class="eyebrow-dot"></span> ${slide.eyebrow}
          </div>
          <h1 class="hero-title">${slide.titleHtml}</h1>
          <p class="hero-subtitle">${slide.subtitle}</p>
          <div class="hero-tags-row">
            ${slide.tags
              .map(
                (t, idx) =>
                  `<span class="tech-pill ${idx === 0 ? 'lime' : idx === 1 ? 'orange' : ''}">${t}</span>`
              )
              .join('')}
          </div>
          <div class="hero-cta-row">
            <button class="btn btn-lime" onclick="window.app.navigate('${slide.primaryCta.page}')">
              ${slide.primaryCta.label}
            </button>
            <button class="btn btn-outline" onclick="window.app.navigate('${slide.secondaryCta.page}')">
              ${slide.secondaryCta.label}
            </button>
          </div>
        </div>

        <div class="hero-visual-box">
          ${visualHtml}
        </div>
      </div>

      <div class="slideshow-controls">
        <div class="slide-pills">
          ${slides
            .map(
              (s, i) => `
            <button class="slide-pill-btn ${i === this.currentSlide ? 'active' : ''}" onclick="window.app.setSlide(${i})">
              <span>0${i + 1}</span>
              <span>${s.eyebrow.split('&')[0].trim()}</span>
            </button>
          `
            )
            .join('')}
        </div>
        <div class="slide-arrows">
          <button class="slide-arrow-btn" title="Previous Slide" onclick="window.app.setSlide(${this.currentSlide - 1})">←</button>
          <button class="slide-arrow-btn" title="Next Slide" onclick="window.app.setSlide(${this.currentSlide + 1})">→</button>
        </div>
      </div>
    `;
  }

  renderHomePage() {
    const D = window.YOLETECH_DATA;
    const C = window.YOLETECH_COMPONENTS;
    const featuredPool = this.portfolio.filter((p) => p.featured !== false);
    const featuredProjects = (featuredPool.length > 0 ? featuredPool : this.portfolio).slice(0, 3);
    const recentBlogs = this.blogPosts.slice(0, 3);

    return `
      <div class="home-page-view">
      <!-- HERO SECTION WITH SLIDESHOW & 8-SERVICE FEATURE STRIP -->
      <section class="hero-section" onmouseenter="window.app.slidePaused = true" onmouseleave="window.app.slidePaused = false">
        <div class="container hero-slideshow-wrapper" id="hero-slideshow-mount">
          ${this.renderHeroSlideInner()}
        </div>

        <!-- 8-Service Feature Strip -->
        <div class="service-strip-bar">
          <div class="container">
            <div class="service-strip-grid">
              ${D.eightServicesStrip
                .map(
                  (srv) => `
                <div class="service-strip-item" onclick="window.app.navigate('services')">
                  <div class="service-strip-icon">${C.getIcon(srv.icon)}</div>
                  <div>
                    <div class="service-strip-title">${srv.title}</div>
                    <div class="service-strip-sub">${srv.sub}</div>
                  </div>
                </div>
              `
                )
                .join('')}
            </div>
          </div>
        </div>
      </section>

      <!-- IMPACT METRICS & 3 CORE VALUE PILLARS -->
      <section class="section">
        <div class="container">
          <div class="metrics-strip">
            <div class="metric-cell">
              <div class="metric-number" data-kpi-target="5" data-kpi-suffix="+">5+</div>
              <div class="metric-label">Years Data, BI &amp;<br/>Full-Stack Experience</div>
            </div>
            <div class="metric-cell">
              <div class="metric-number" data-kpi-target="200" data-kpi-suffix="+">200+</div>
              <div class="metric-label">Analytics Interns<br/>Trained &amp; Mentored</div>
            </div>
            <div class="metric-cell">
              <div class="metric-number" data-kpi-target="8" data-kpi-suffix="+">8+</div>
              <div class="metric-label">Google, Coursera &amp;<br/>Kaggle Certifications</div>
            </div>
            <div class="metric-cell">
              <div class="metric-number" data-kpi-target="100" data-kpi-suffix="%">100%</div>
              <div class="metric-label">Data Integrity &amp;<br/>Quality Commitment</div>
            </div>
          </div>

          <div class="section-header">
            <div class="eyebrow"><span class="eyebrow-dot"></span> CORE CAPABILITIES</div>
            <h2 class="section-title">Bridging Full-Stack Web Platforms, Executive BI &amp; Automated Workflows</h2>
            <p class="section-desc">
              Combining software engineering with statistical analysis, database governance, and modern web architecture.
            </p>
          </div>

          <div class="grid-3">
            <div class="glass-card">
              <span class="tech-pill lime" style="margin-bottom:14px;">Web &amp; Digital Platforms</span>
              <h3 style="font-size:21px;font-weight:800;margin-bottom:10px;">Full-Stack Web Development</h3>
              <p style="font-size:14px;color:var(--yole-text-muted);margin-bottom:18px;">
                Frontend and backend system implementation using React.js, JavaScript, HTML/CSS, WordPress, and relational SQL databases—built without bloat.
              </p>
              <div style="display:flex;flex-wrap:wrap;gap:6px;">
                <span class="tech-pill">React.js</span>
                <span class="tech-pill">JavaScript</span>
                <span class="tech-pill">WordPress</span>
                <span class="tech-pill">HTML5/CSS3</span>
              </div>
            </div>

            <div class="glass-card">
              <span class="tech-pill orange" style="margin-bottom:14px;">Data Analytics &amp; BI</span>
              <h3 style="font-size:21px;font-weight:800;margin-bottom:10px;">Data Analytics &amp; Business Intelligence</h3>
              <p style="font-size:14px;color:var(--yole-text-muted);margin-bottom:18px;">
                Transforming complex multi-departmental datasets into validated insights and interactive Power BI &amp; Tableau dashboards for executive decision-making.
              </p>
              <div style="display:flex;flex-wrap:wrap;gap:6px;">
                <span class="tech-pill">Power BI</span>
                <span class="tech-pill">Tableau</span>
                <span class="tech-pill">Python (Pandas)</span>
                <span class="tech-pill">R &amp; SPSS</span>
                <span class="tech-pill">SQL</span>
              </div>
            </div>

            <div class="glass-card">
              <span class="tech-pill lime" style="margin-bottom:14px;">AI &amp; Automation</span>
              <h3 style="font-size:21px;font-weight:800;margin-bottom:10px;">Predictive ML &amp; Workflow Automation</h3>
              <p style="font-size:14px;color:var(--yole-text-muted);margin-bottom:18px;">
                Forecasting outcomes with Machine Learning and automating repetitive reporting bottlenecks via Advanced Microsoft Excel VBA macros and Python scripts.
              </p>
              <div style="display:flex;flex-wrap:wrap;gap:6px;">
                <span class="tech-pill">Machine Learning</span>
                <span class="tech-pill">Excel VBA</span>
                <span class="tech-pill">SQL Server</span>
                <span class="tech-pill">MySQL</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- INTERACTIVE SYSTEM ARCHITECTURE & DASHBOARD SHOWCASE -->
      <section class="section section-alt">
        <div class="container">
          <div class="section-header">
            <div class="eyebrow"><span class="eyebrow-dot"></span> INTERACTIVE PREVIEW</div>
            <h2 class="section-title">Explore How Your Data &amp; Web Systems Operate</h2>
            <div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:22px;">
              <button class="selector-pill ${this.showcaseTab === 'dashboard' ? 'active' : ''}" onclick="window.app.showcaseTab='dashboard';window.app.render();">
                📊 Executive BI Dashboard
              </button>
              <button class="selector-pill ${this.showcaseTab === 'codesync' ? 'active' : ''}" onclick="window.app.showcaseTab='codesync';window.app.render();">
                💻 Full-Stack Code &amp; Sync UI
              </button>
              <button class="selector-pill ${this.showcaseTab === 'workflow' ? 'active' : ''}" onclick="window.app.showcaseTab='workflow';window.app.render();">
                ⚡ API-to-Python Automation Flow
              </button>
            </div>
          </div>

          <div style="max-width:980px;margin:0 auto;">
            ${
              this.showcaseTab === 'dashboard'
                ? C.renderDataOverviewWidget()
                : this.showcaseTab === 'codesync'
                ? C.renderCodeSyncWidget()
                : C.renderWorkflowDiagramWidget()
            }
          </div>
        </div>
      </section>

      <!-- FEATURED PORTFOLIO HIGHLIGHTS -->
      <section class="section">
        <div class="container">
          <div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:16px;margin-bottom:36px;">
            <div>
              <div class="eyebrow"><span class="eyebrow-dot"></span> PROVEN TRACK RECORD</div>
              <h2 class="section-title" style="margin-bottom:0;">Featured Portfolio &amp; Case Studies</h2>
            </div>
            <button class="btn btn-outline" onclick="window.app.navigate('portfolio')">
              View All Projects →
            </button>
          </div>

          <div class="grid-3">
            ${featuredProjects
              .map(
                (p) => `
              <div class="glass-card" style="display:flex;flex-direction:column;justify-content:space-between;">
                <div>
                  <div style="border-radius:12px;overflow:hidden;margin-bottom:16px;border:1px solid rgba(255,255,255,0.12);height:175px;">
                    <img src="${p.preview_image}" alt="${p.title}" style="width:100%;height:100%;object-fit:cover;" />
                  </div>
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <span class="tech-pill lime">${p.category}</span>
                    <span style="font-size:12px;color:var(--yole-text-muted);">${p.period}</span>
                  </div>
                  <h3 style="font-size:19px;font-weight:800;margin-bottom:8px;">${p.title}</h3>
                  <p style="font-size:13.5px;color:var(--yole-text-muted);margin-bottom:14px;">${p.summary}</p>
                </div>
                <div>
                  <div style="background:rgba(200,230,30,0.08);border-left:3px solid #C8E61E;padding:8px 12px;font-size:12px;color:#FFFFFF;margin-bottom:14px;border-radius:0 8px 8px 0;">
                    <strong>Impact:</strong> ${p.impact_metrics}
                  </div>
                  <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">
                    ${(p.tech_stack || []).map((t) => `<span class="tech-pill">${t}</span>`).join('')}
                  </div>
                  <div style="display:flex;gap:8px;border-top:1px solid rgba(255,255,255,0.1);padding-top:12px;">
                    ${
                      p.demo_url || p.live_url
                        ? `<a href="${p.demo_url || p.live_url}" target="_blank" rel="noopener" class="btn btn-lime btn-sm" style="flex:1;">
                            Live Demo ↗
                          </a>`
                        : ''
                    }
                    <button class="btn btn-outline btn-sm" style="flex:1;" onclick="window.app.navigate('portfolio')">
                      Case Study →
                    </button>
                  </div>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      </section>

      <!-- LATEST BLOG ARTICLES -->
      <section class="section section-alt">
        <div class="container">
          <div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:16px;margin-bottom:36px;">
            <div>
              <div class="eyebrow"><span class="eyebrow-dot"></span> INSIGHTS &amp; TUTORIALS</div>
              <h2 class="section-title" style="margin-bottom:0;">Latest Articles &amp; Guides</h2>
            </div>
            <button class="btn btn-outline" onclick="window.app.navigate('blog')">
              Read All Articles →
            </button>
          </div>

          <div class="grid-3">
            ${recentBlogs
              .map(
                (post) => `
              <div class="glass-card" style="display:flex;flex-direction:column;justify-content:space-between;cursor:pointer;" onclick="window.app.navigate('blog-detail', '${post.slug}')">
                <div>
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                    <span class="tech-pill orange">${post.category}</span>
                    <span style="font-size:12px;color:var(--yole-text-muted);">${post.readTime}</span>
                  </div>
                  <h3 style="font-size:19px;font-weight:800;margin-bottom:10px;line-height:1.35;">${post.title}</h3>
                  <p style="font-size:13.5px;color:var(--yole-text-muted);margin-bottom:16px;">${post.summary}</p>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid rgba(255,255,255,0.1);font-size:13px;font-weight:700;color:#C8E61E;">
                  <span>${post.date}</span>
                  <span>Read Article →</span>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      </div>
      </section>
    `;
  }

  // ==========================================================================
  // PAGE 2: ABOUT
  // ==========================================================================
  renderAboutPage() {
    const D = window.YOLETECH_DATA;
    const C = window.YOLETECH_COMPONENTS;
    const tabs = [
      { id: 'skills', number: '01', label: 'Skills & Competencies', detail: 'Technical strengths' },
      { id: 'experience', number: '02', label: 'Experience', detail: 'Career history' },
      { id: 'education', number: '03', label: 'Education & Credentials', detail: 'Academic & certifications' }
    ];
    const activeTab = tabs.some((tab) => tab.id === this.aboutTab) ? this.aboutTab : 'skills';

    return `
      <section class="section">
        <div class="container">
          <div class="hero-slide-grid section-block-gap">
            <div>
              <div class="eyebrow"><span class="eyebrow-dot"></span> ABOUT YOLETECH</div>
              <h1 class="hero-title" style="font-size:clamp(32px,4vw,48px);">
                The Developer, Analyst &amp; <span class="accent-lime">Automator Behind Your Project</span>
              </h1>
              <p style="font-size:16px;color:var(--yole-text-muted);margin-bottom:26px;">
                ${D.owner.summary}
              </p>
              <div class="hero-cta-row">
                <button class="btn btn-lime" onclick="window.app.navigate('contact')">
                  Let's Discuss Your Project →
                </button>
                <a href="/cv.html" target="_blank" class="btn btn-outline">
                  View Curriculum Vitae
                </a>
              </div>
            </div>
            <div class="hero-visual-box">
              ${C.renderPortraitHeroWidget('about')}
            </div>
          </div>

          <section class="about-profile" aria-label="Professional profile">
            <header class="about-profile-heading">
              <div>
                <div class="eyebrow"><span class="eyebrow-dot"></span> CAREER PROFILE</div>
                <h2 class="section-title">Experience, expertise &amp; education</h2>
                <p>Explore the capabilities and credentials behind my work.</p>
              </div>
            </header>

            <div class="about-tabs-nav" role="tablist" aria-label="Professional profile sections">
              ${tabs
                .map(
                  (tab) => `
                <button
                  id="about-tab-${tab.id}"
                  class="about-tab-btn ${activeTab === tab.id ? 'active' : ''}"
                  type="button"
                  role="tab"
                  aria-selected="${activeTab === tab.id}"
                  aria-controls="about-panel"
                  tabindex="${activeTab === tab.id ? '0' : '-1'}"
                  onclick="window.app.selectAboutTab('${tab.id}')"
                  onkeydown="window.app.handleAboutTabKeydown(event, '${tab.id}')"
                >
                  <span class="about-tab-number">${tab.number}</span>
                  <span class="about-tab-copy">
                    <span class="about-tab-label">${tab.label}</span>
                    <span class="about-tab-detail">${tab.detail}</span>
                  </span>
                  <span class="about-tab-arrow" aria-hidden="true">↗</span>
                </button>
              `
                )
                .join('')}
            </div>

            <div id="about-panel" class="about-tab-panel glass-card" role="tabpanel" aria-labelledby="about-tab-${activeTab}" tabindex="0">
              ${
                activeTab === 'skills'
                  ? `
                <div class="about-panel-heading">
                  <div>
                    <div class="eyebrow"><span class="eyebrow-dot"></span> TECHNICAL ARSENAL</div>
                    <h3>Core technical proficiencies</h3>
                    <p>A versatile toolkit for solving data, technology, and business challenges.</p>
                  </div>
                </div>
                <div class="about-skill-grid">
                  ${D.coreProficiencies
                    .map(
                      (prof) => `
                    <article class="about-info-card">
                      <h4 class="about-accent-${prof.accent}">${prof.category}</h4>
                      <div class="about-skill-list">
                        ${prof.skills.map((skill) => `<span class="tech-pill">${skill}</span>`).join('')}
                      </div>
                    </article>
                  `
                    )
                    .join('')}
                  <article class="about-info-card about-competencies">
                    <h4 class="accent-lime">Professional competencies</h4>
                    <div class="about-competency-list">
                      ${D.competencies
                        .map(
                          (comp) => `
                        <div class="about-competency">
                          <span class="about-check" aria-hidden="true">✓</span>
                          <div>
                            <strong>${comp.title}</strong>
                            <p>${comp.description}</p>
                          </div>
                        </div>
                      `
                        )
                        .join('')}
                    </div>
                  </article>
                </div>
              `
                  : activeTab === 'experience'
                    ? `
                <div class="about-panel-heading">
                  <div>
                    <div class="eyebrow"><span class="eyebrow-dot"></span> CAREER TRACK RECORD</div>
                    <h3>Professional experience</h3>
                    <p>Hands-on experience delivering accurate analysis and dependable systems.</p>
                  </div>
                </div>
                <div class="about-experience-list">
                  ${D.experience
                    .map(
                      (exp) => `
                    <article class="about-info-card about-experience-card">
                      <div class="about-experience-heading">
                        <div>
                          <h4>${exp.role}</h4>
                          <p class="about-company">${exp.company} <span>·</span> ${exp.location}</p>
                        </div>
                        <span class="about-period">${exp.period}</span>
                      </div>
                      <ul class="about-highlights">
                        ${exp.highlights.map((highlight) => `<li>${highlight}</li>`).join('')}
                      </ul>
                    </article>
                  `
                    )
                    .join('')}
                </div>
              `
                    : `
                <div class="about-panel-heading">
                  <div>
                    <div class="eyebrow"><span class="eyebrow-dot"></span> EDUCATION &amp; CREDENTIALS</div>
                    <h3>Learning backed by credentials</h3>
                    <p>Academic foundations and professional certifications supporting continued growth.</p>
                  </div>
                </div>
                <div class="about-credentials-grid">
                  <section class="about-info-card">
                    <h4>Education</h4>
                    <div class="about-education-list">
                      ${D.education
                        .map(
                          (ed) => `
                        <article class="about-education-item">
                          <div>
                            <h5>${ed.degree}</h5>
                            <p>${ed.institution}</p>
                          </div>
                          <span class="about-period">${ed.period}</span>
                        </article>
                      `
                        )
                        .join('')}
                    </div>
                  </section>
                  <section class="about-info-card">
                    <h4>Certifications &amp; specializations</h4>
                    <div class="about-cert-group">
                      <h5>Google &amp; Coursera professional credentials</h5>
                      ${D.certifications.googleCoursera
                        .map(
                          (certification) => `
                        <div class="about-cert-item">
                          <span class="about-check" aria-hidden="true">✓</span>
                          <span>${certification}</span>
                        </div>
                      `
                        )
                        .join('')}
                    </div>
                    <div class="about-cert-group">
                      <h5>Kaggle technical certifications</h5>
                      ${D.certifications.kaggle
                        .map(
                          (certification) => `
                        <div class="about-cert-item">
                          <span class="about-star" aria-hidden="true">★</span>
                          <span>${certification}</span>
                        </div>
                      `
                        )
                        .join('')}
                    </div>
                  </section>
                </div>
              `
              }
            </div>
          </section>
        </div>
      </section>
    `;
  }

  selectAboutTab(tab) {
    if (!['skills', 'experience', 'education'].includes(tab)) return;
    const scrollPosition = window.scrollY;
    this.aboutTab = tab;
    this.render();
    window.scrollTo(0, scrollPosition);
    document.getElementById(`about-tab-${tab}`)?.focus({ preventScroll: true });
  }

  handleAboutTabKeydown(event, currentTab) {
    const tabIds = ['skills', 'experience', 'education'];
    const currentIndex = tabIds.indexOf(currentTab);
    let nextIndex;

    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabIds.length;
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabIds.length) % tabIds.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tabIds.length - 1;
    else return;

    event.preventDefault();
    this.selectAboutTab(tabIds[nextIndex]);
  }

  // ==========================================================================
  // PAGE 3: SERVICES (SAMPLE 6584d141.jpg + 8 SERVICES + SCOPE TABLE)
  // ==========================================================================
  renderServicesPage() {
    const D = window.YOLETECH_DATA;
    const C = window.YOLETECH_COMPONENTS;

    return `
      <section class="section">
        <div class="container">
          <div class="hero-slide-grid section-block-gap">
            <div>
              <div class="eyebrow"><span class="eyebrow-dot"></span> YOLETECH DIGITAL &amp; DATA SERVICES</div>
              <h1 class="hero-title" style="font-size:clamp(32px,4vw,46px);">
                Web Development, Data Analytics &amp; <span class="accent-lime">Automated Systems</span> for Growing Businesses
              </h1>
              <p class="hero-subtitle">
                Scalable full-stack web applications, interactive Power BI &amp; Tableau dashboards, predictive machine learning models, and technical training tailored to your organization.
              </p>
              <div class="hero-cta-row">
                <button class="btn btn-lime" onclick="window.app.navigate('contact')">
                  Schedule a Discovery Call →
                </button>
                <button class="btn btn-outline" onclick="window.app.navigate('portfolio')">
                  View Case Studies
                </button>
              </div>
            </div>
            <div class="hero-visual-box">
              ${C.renderDataOverviewWidget()}
            </div>
          </div>

          <div class="section-header">
            <div class="eyebrow"><span class="eyebrow-dot"></span> OUR SERVICES</div>
            <h2 class="section-title">Complete Service Tracks Under One Roof</h2>
            <p class="section-desc">Select any service track below to start a tailored project inquiry.</p>
          </div>

          <div class="grid-2 section-block-gap">
            ${D.eightServicesStrip
              .map(
                (srv, idx) => `
              <div class="glass-card" style="display:flex;flex-direction:column;justify-content:space-between;">
                <div>
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                    <div class="service-strip-icon">${C.getIcon(srv.icon)}</div>
                    <span class="tech-pill ${idx % 2 === 0 ? 'lime' : 'orange'}">${srv.category}</span>
                  </div>
                  <h3 style="font-size:22px;font-weight:900;margin-bottom:6px;">${srv.title}</h3>
                  <div style="font-size:13px;font-weight:700;color:#C8E61E;margin-bottom:12px;">${srv.sub}</div>
                  <p style="font-size:14px;color:var(--yole-text-muted);margin-bottom:16px;">${srv.description}</p>
                </div>

                <div>
                  <div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:14px;margin-bottom:16px;">
                    <div style="font-size:12px;font-weight:800;color:var(--yole-text-muted);text-transform:uppercase;margin-bottom:8px;">
                      Key Deliverables:
                    </div>
                    <div class="deliverables-grid">
                      ${srv.deliverables
                        .map(
                          (del) => `
                        <div style="font-size:12.5px;display:flex;align-items:center;gap:6px;">
                          <span style="color:#C8E61E;">✓</span> <span>${del}</span>
                        </div>
                      `
                        )
                        .join('')}
                    </div>
                  </div>
                  <button class="btn btn-outline btn-sm" onclick="window.app.selectContactService('${srv.title}')">
                    Request ${srv.title} →
                  </button>
                </div>
              </div>
            `
              )
              .join('')}
          </div>

          <!-- SERVICE OVERVIEW & DELIVERY SCOPE (INTERACTIVE TABS) -->
          <div class="section-header">
            <div class="eyebrow"><span class="eyebrow-dot"></span> TRANSPARENT EXECUTION</div>
            <h2 class="section-title">Service Overview &amp; Delivery Scope</h2>
            <p class="section-desc">Select a service track tab below to view its core tech stack, timeline, and delivery standards.</p>
          </div>

          <div class="scope-tabs-container section-block-gap">
            <div class="scope-tabs-nav" role="tablist">
              ${D.serviceScopeTable
                .map((row, idx) => {
                  const shortNames = [
                    'Web Development',
                    'Data Analytics & BI',
                    'AI & Automation',
                    'Database Governance',
                    'Tutorials & Training',
                    'Design, Video & IT'
                  ];
                  const isActive = (this.serviceScopeTab || 0) === idx;
                  return `
                    <button
                      type="button"
                      role="tab"
                      aria-selected="${isActive}"
                      class="scope-tab-btn ${isActive ? 'active' : ''}"
                      onclick="window.app.serviceScopeTab = ${idx}; window.app.render();"
                    >
                      <span class="scope-tab-num">0${idx + 1}</span>
                      <span class="scope-tab-label">${shortNames[idx] || row.track}</span>
                    </button>
                  `;
                })
                .join('')}
            </div>

            ${(() => {
              const activeIdx = this.serviceScopeTab || 0;
              const activeRow = D.serviceScopeTable[activeIdx] || D.serviceScopeTable[0];
              const totalTracks = D.serviceScopeTable.length;
              const prevIdx = (activeIdx - 1 + totalTracks) % totalTracks;
              const nextIdx = (activeIdx + 1) % totalTracks;
              const deliverableItems = String(activeRow.deliverables || '')
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);

              return `
                <div class="glass-card scope-tab-panel">
                  <div class="scope-panel-header">
                    <div>
                      <div class="scope-track-step">SERVICE TRACK 0${activeIdx + 1} OF 0${totalTracks}</div>
                      <h3 class="scope-track-title">${activeRow.track}</h3>
                    </div>
                    <div class="scope-timeline-box">
                      <span class="scope-timeline-label">Typical Timeline</span>
                      <span class="tech-pill orange scope-timeline-pill">⏱ ${activeRow.timeline}</span>
                    </div>
                  </div>

                  <div class="scope-panel-grid">
                    <div class="scope-subcard">
                      <div class="scope-subcard-title">Core Tech Stack</div>
                      <div class="scope-stack-pills">
                        ${activeRow.stack
                          .map((s) => `<span class="tech-pill lime">${s}</span>`)
                          .join('')}
                      </div>
                    </div>

                    <div class="scope-subcard">
                      <div class="scope-subcard-title">Deliverables &amp; Execution Standards</div>
                      <ul class="scope-deliverables-list">
                        ${deliverableItems
                          .map(
                            (item) => `
                          <li>
                            <span class="scope-check">✓</span>
                            <span>${item.charAt(0).toUpperCase() + item.slice(1)}</span>
                          </li>
                        `
                          )
                          .join('')}
                      </ul>
                    </div>
                  </div>

                  <div class="scope-panel-footer">
                    <div class="scope-step-nav">
                      <button type="button" class="btn btn-outline btn-sm" onclick="window.app.serviceScopeTab = ${prevIdx}; window.app.render();">
                        ← Prev
                      </button>
                      <button type="button" class="btn btn-outline btn-sm" onclick="window.app.serviceScopeTab = ${nextIdx}; window.app.render();">
                        Next →
                      </button>
                    </div>
                    <button type="button" class="btn btn-lime btn-sm scope-request-btn" onclick="window.app.selectContactService('${activeRow.track}')">
                      Request ${activeRow.track} →
                    </button>
                  </div>
                </div>
              `;
            })()}
          </div>

${C.renderRoiCalculatorWidget ? C.renderRoiCalculatorWidget() : ""}

          <!-- HOW WE WORK 4-STEP PROCESS -->
          <div class="section-header">
            <div class="eyebrow"><span class="eyebrow-dot"></span> PROVEN METHODOLOGY</div>
            <h2 class="section-title">How We Work</h2>
            <p class="section-desc">A structured 4-stage engineering and data governance workflow from discovery to deployment.</p>
          </div>

          <div class="metrics-strip" style="margin-bottom:0;">
            <div class="metric-cell" style="flex-direction:column;align-items:flex-start;text-align:left;">
              <span class="tech-pill lime">Step 01</span>
              <div style="font-size:18px;font-weight:900;margin-top:6px;">Discovery &amp; Data Audit</div>
              <div style="font-size:13px;color:var(--yole-text-muted);">Assess requirements, audit existing datasets or systems, and define KPIs.</div>
            </div>
            <div class="metric-cell" style="flex-direction:column;align-items:flex-start;text-align:left;">
              <span class="tech-pill orange">Step 02</span>
              <div style="font-size:18px;font-weight:900;margin-top:6px;">Architecture &amp; Schema</div>
              <div style="font-size:13px;color:var(--yole-text-muted);">Design SQL databases, clean pipelines, or full-stack web wireframes.</div>
            </div>
            <div class="metric-cell" style="flex-direction:column;align-items:flex-start;text-align:left;">
              <span class="tech-pill lime">Step 03</span>
              <div style="font-size:18px;font-weight:900;margin-top:6px;">Build &amp; Automate</div>
              <div style="font-size:13px;color:var(--yole-text-muted);">Develop React/Web apps, Power BI/Tableau views, or Python/VBA scripts.</div>
            </div>
            <div class="metric-cell" style="flex-direction:column;align-items:flex-start;text-align:left;">
              <span class="tech-pill orange">Step 04</span>
              <div style="font-size:18px;font-weight:900;margin-top:6px;">Validation &amp; Launch</div>
              <div style="font-size:13px;color:var(--yole-text-muted);">Statistical quality checks, staff handover training, and live support.</div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  // ==========================================================================
  // PAGE 4: PORTFOLIO (FILTERABLE CASE STUDIES — POWERED BY DECAP BRIDGE)
  // ==========================================================================
  renderPortfolioPage() {
    const categories = [
      'ALL',
      'Data Analytics & BI',
      'Full-Stack Web',
      'AI & Machine Learning',
      'AI & Workflow Automation',
      'Tech Tutorials & Training'
    ];

    const filtered =
      this.portfolioFilter === 'ALL'
        ? this.portfolio
        : this.portfolio.filter((p) => p.category === this.portfolioFilter);

    return `
      <section class="section">
        <div class="container">
          <div class="section-header">
            <div class="eyebrow"><span class="eyebrow-dot"></span> PORTFOLIO &amp; CASE STUDIES</div>
            <h1 class="section-title">Proven Data, BI, Automation &amp; Full-Stack Projects</h1>
            <p class="section-desc">
              Selected projects across data analytics, business intelligence, workflow automation, and full-stack web development.
            </p>
            ${
              this.user?.role === 'ADMIN'
                ? `<div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:16px;">
                    <button class="btn btn-lime btn-sm" onclick="window.app.adminTab='portfolio';window.app.navigate('admin-dashboard')">+ Add Project in Admin</button>
                    <a href="/admin/" target="_blank" class="btn btn-outline btn-sm">Open Decap Bridge CMS ↗</a>
                  </div>`
                : ''
            }
            <div style="display:flex;justify-content:center;flex-wrap:wrap;gap:8px;margin-top:24px;">
              ${categories
                .map(
                  (cat) => `
                <button class="selector-pill ${this.portfolioFilter === cat ? 'active' : ''}" onclick="window.app.portfolioFilter='${cat}';window.app.render();">
                  ${cat === 'ALL' ? 'All Case Studies' : cat}
                </button>
              `
                )
                .join('')}
            </div>
          </div>

          <div class="grid-3">
            ${filtered
              .map(
                (p) => `
              <article class="glass-card portfolio-project-card">
                <div class="portfolio-project-image">
                  <img src="${p.preview_image}" alt="${p.title}" loading="lazy" decoding="async" />
                </div>
                <h2 class="portfolio-project-title">${p.title}</h2>
                <div class="portfolio-project-actions">
                    ${
                      p.demo_url || p.live_url
                        ? `<a href="${p.demo_url || p.live_url}" target="_blank" rel="noopener noreferrer" class="btn btn-lime btn-sm portfolio-project-action">
                            Live Demo <span aria-hidden="true">↗</span>
                          </a>`
                        : ''
                    }
                    ${
                      p.github_url
                        ? `<a href="${p.github_url}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm portfolio-project-action">
                            GitHub / Source <span aria-hidden="true">↗</span>
                          </a>`
                        : ''
                    }
                    <button class="btn btn-outline btn-sm portfolio-project-action portfolio-project-action-wide" onclick="window.app.selectContactService('${p.category}')">
                      Build Similar <span aria-hidden="true">→</span>
                    </button>
                </div>
              </article>
            `
              )
              .join('')}
          </div>
        </div>
      </section>
    `;
  }

  // ==========================================================================
  // PAGE 5: TESTIMONIALS
  // ==========================================================================

  setTestimonialPage(page) {
    this.testimonialPage = Math.max(1, page);
    this.render();
    const el = document.getElementById('testimonials-wall');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  renderTestimonialsPage() {
    const list = this.testimonials || [];
    const pageSize = 8;
    const totalCount = list.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    if (!this.testimonialPage || this.testimonialPage < 1) this.testimonialPage = 1;
    if (this.testimonialPage > totalPages) this.testimonialPage = totalPages;
    const cur = this.testimonialPage;
    const startIdx = (cur - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, totalCount);
    const paginatedTestimonials = list.slice(startIdx, endIdx);

    const delta = 2;
    const range = [];
    for (let i = Math.max(2, cur - delta); i <= Math.min(totalPages - 1, cur + delta); i++) {
      range.push(i);
    }
    if (cur - delta > 2) range.unshift('...');
    if (cur + delta < totalPages - 1) range.push('...');
    range.unshift(1);
    if (totalPages > 1) range.push(totalPages);

    const pagerHtml = totalPages > 1 ? `
      <div class="testimonials-pager" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px;margin-bottom:48px;padding:14px 20px;background:var(--yole-indigo-card);border:1px solid var(--yole-border-subtle);border-radius:14px;box-shadow:var(--shadow-card);">
        <div style="font-size:13.5px;color:var(--yole-text-muted);">
          Showing <strong>${totalCount > 0 ? startIdx + 1 : 0}–${endIdx}</strong> of <strong>${totalCount}</strong> verified client testimonies (8 per page)
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
          <button type="button" class="btn btn-outline btn-sm" style="padding:6px 14px;font-size:12.5px;" ${cur <= 1 ? 'disabled' : ''} onclick="window.app.setTestimonialPage(${cur - 1})">
            ← Prev
          </button>
          ${range.map(p => {
            if (p === '...') return '<span style="padding:0 4px;color:var(--yole-text-muted);">…</span>';
            const active = p === cur;
            return `<button type="button" class="btn ${active ? 'btn-lime' : 'btn-outline'} btn-sm" style="padding:6px 12px;font-size:12px;min-width:34px;" onclick="window.app.setTestimonialPage(${p})">${p}</button>`;
          }).join('')}
          <button type="button" class="btn btn-outline btn-sm" style="padding:6px 14px;font-size:12.5px;" ${cur >= totalPages ? 'disabled' : ''} onclick="window.app.setTestimonialPage(${cur + 1})">
            Next →
          </button>
        </div>
      </div>
    ` : '';

    return `
      <section class="section">
        <div class="container">
          <div class="section-header">
            <div class="eyebrow"><span class="eyebrow-dot"></span> CLIENT &amp; MENTEE ENDORSEMENTS</div>
            <h1 class="section-title">What Stakeholders, Clients &amp; Mentees Say</h1>
            <p class="section-desc">
              Feedback from executive research stakeholders, departmental supervisors, and graduates of our <strong style="color:#C8E61E;" data-kpi-target="200" data-kpi-suffix="+">200+</strong> intern analytics mentorship program.
            </p>
          </div>

          <div id="testimonials-wall" class="grid-2" style="margin-bottom:28px;">
            ${paginatedTestimonials
              .map(
                (t) => `
              <div class="glass-card" style="display:flex;flex-direction:column;justify-content:space-between;">
                <div>
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                    <span class="tech-pill lime">${t.service_track}</span>
                    <span style="color:#F7941D;font-size:16px;letter-spacing:2px;">
                      ${'★'.repeat(Number(t.rating) || 5)}
                    </span>
                  </div>
                  <p style="font-size:15.5px;color:#FFFFFF;font-style:italic;margin-bottom:20px;line-height:1.65;">
                    "${t.content}"
                  </p>
                </div>
                <div style="display:flex;align-items:center;gap:12px;border-top:1px solid rgba(255,255,255,0.1);padding-top:14px;">
                  <div style="width:42px;height:42px;border-radius:50%;background:#2F2B73;border:1.5px solid #C8E61E;display:flex;align-items:center;justify-content:center;font-weight:900;color:#C8E61E;">
                    ${t.author_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style="font-weight:800;font-size:15px;">${t.author_name}</div>
                    <div style="font-size:12.5px;color:var(--yole-text-muted);">${t.author_role} • ${t.company}</div>
                  </div>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
          ${pagerHtml}

          <!-- SUBMIT A TESTIMONIAL CARD (FULL CONTAINER WIDTH) -->
          <div class="glass-card testimonial-form-card" style="width:100%;max-width:100%;padding:clamp(36px, 4.5vw, 60px);border-radius:24px;">
            <div class="eyebrow"><span class="eyebrow-dot"></span> SHARE YOUR FEEDBACK</div>
            <h2 style="font-size:clamp(26px, 3vw, 36px);font-weight:900;line-height:1.2;margin-bottom:10px;">Share Your Experience with YOLETECH</h2>
            <p style="font-size:16px;color:var(--yole-text-muted);max-width:820px;margin-bottom:32px;line-height:1.6;">
              Your feedback helps organizations, executives, and learners understand the quality and business impact of our data analytics, full-stack web applications, and automated workflow solutions.
            </p>
            <form novalidate onsubmit="window.app.handleTestimonialSubmit(event)">
              <div class="grid-2" style="gap:24px;margin-bottom:24px;">
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label" style="font-size:14px;font-weight:700;margin-bottom:8px;display:block;">Your Full Name *</label>
                  <input type="text" name="author_name" required class="form-control" style="min-height:52px;font-size:15px;padding:14px 18px;border-radius:12px;" placeholder="e.g. Marcus Vance" value="${
                    this.user ? this.user.name : ''
                  }" />
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label" style="font-size:14px;font-weight:700;margin-bottom:8px;display:block;">Your Role / Title</label>
                  <input type="text" name="author_role" class="form-control" style="min-height:52px;font-size:15px;padding:14px 18px;border-radius:12px;" placeholder="e.g. Head of Data Operations, Lead Developer" />
                </div>
              </div>
              <div class="grid-2" style="gap:24px;margin-bottom:24px;">
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label" style="font-size:14px;font-weight:700;margin-bottom:8px;display:block;">Organization / Cohort</label>
                  <input type="text" name="company" class="form-control" style="min-height:52px;font-size:15px;padding:14px 18px;border-radius:12px;" placeholder="e.g. Global EduMetrix, Prime Logistics, Bayelsa Tech" value="${
                    this.user ? this.user.company : ''
                  }" />
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label" style="font-size:14px;font-weight:700;margin-bottom:8px;display:block;">Service Track</label>
                  <select name="service_track" class="form-control" style="min-height:52px;font-size:15px;padding:14px 18px;border-radius:12px;">
                    <option value="Data Analytics & BI">Data Analytics &amp; Business Intelligence</option>
                    <option value="Full-Stack Web Development">Full-Stack Web Development</option>
                    <option value="AI & Workflow Automation">AI &amp; Workflow Automation</option>
                    <option value="Tech Tutorials & Mentorship">Tech Tutorials &amp; Mentorship</option>
                    <option value="IT & Database Support">IT &amp; Database Support</option>
                  </select>
                </div>
              </div>
              <div class="form-group" style="margin-bottom:28px;">
                <label class="form-label" style="font-size:14px;font-weight:700;margin-bottom:8px;display:block;">Your Testimonial *</label>
                <textarea name="content" rows="6" required class="form-control" style="font-size:15px;padding:16px 18px;border-radius:14px;line-height:1.65;min-height:150px;" placeholder="Share your experience working with John Oruebi Eniekpo / YOLETECH: project outcomes, delivered dashboards, technical mentorship, or workflow efficiency gains..."></textarea>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:20px;padding-top:8px;">
                <button type="submit" id="testimonial-submit-btn" class="btn btn-lime" style="padding:16px 40px;font-size:15.5px;font-weight:800;border-radius:12px;min-height:52px;">
                  Submit Testimonial →
                </button>
                <span style="font-size:13.5px;color:var(--yole-text-muted);">
                  Verified testimonials are published directly to the endorsements wall and platform dashboard.
                </span>
              </div>
              ${this.renderFormConfirmation('testimonial')}
            </form>
          </div>
        </div>
      </section>
    `;
  }

  async handleTestimonialSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const isValid = this.validateForm(form, 'testimonial', [
      { name: 'author_name', label: 'Full Name', required: true, minLength: 2 },
      { name: 'content', label: 'Testimonial Message', required: true, minLength: 10 }
    ]);
    if (!isValid) return;

    const submitBtn = form.querySelector ? form.querySelector('button[type="submit"]') : document.getElementById('testimonial-submit-btn');
    const origText = submitBtn ? submitBtn.textContent : 'Submit Testimonial →';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting Testimonial...';
    }

    const payload = {
      author_name: form.author_name.value.trim(),
      author_role: (form.author_role?.value || '').trim() || 'Client Partner',
      company: (form.company?.value || '').trim() || 'Independent Client',
      service_track: form.service_track.value,
      rating: 5,
      content: form.content.value.trim()
    };
    try {
      try {
        await this.api('/api/testimonials', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        await this.loadPublicData();
      } catch {
        const localTestimonial = {
          id: Date.now(),
          ...payload,
          approved: 1,
          created_at: new Date().toISOString().slice(0, 10)
        };
        this.testimonials = [localTestimonial, ...(this.testimonials || [])];
      }
      form.reset();
      this.setFormConfirmation('testimonial', {
        title: 'Testimonial Submitted & Confirmed!',
        message: `Thank you, <strong>${payload.author_name}</strong>! Your endorsement for <strong>${payload.service_track}</strong> has been validated and published.`
      });
      this.showToast('Thank you! Your testimonial has been published.');
      this.render();
    } catch (err) {
      this.setFormConfirmation('testimonial', {
        type: 'error',
        title: 'Submission Error',
        message: err.message || 'Could not submit testimonial.'
      });
      this.showToast(err.message, 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = origText;
      }
    }
  }

  // ==========================================================================
  // PAGE 6: BLOG & ARTICLE READER
  // ==========================================================================
  renderBlogPage() {
    const categories = [
      'ALL',
      'Data Analytics & BI',
      'AI & Workflow Automation',
      'Python & Machine Learning',
      'Tech Tutorials & Mentorship',
      'Full-Stack Web Development'
    ];

    const filtered =
      this.blogFilter === 'ALL'
        ? this.blogPosts
        : this.blogPosts.filter((p) => p.category === this.blogFilter);

    return `
      <section class="section">
        <div class="container">
          <div class="section-header">
            <div class="eyebrow"><span class="eyebrow-dot"></span> INSIGHTS &amp; TUTORIALS</div>
            <h1 class="section-title">Articles on Data Analytics, BI, Python &amp; Web Engineering</h1>
            <p class="section-desc">
              Practical guides, technical walkthroughs, and architectural insights.
            </p>
            ${
              this.user?.role === 'ADMIN'
                ? `<div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:16px;">
                    <button class="btn btn-lime btn-sm" onclick="window.app.adminTab='blog';window.app.navigate('admin-dashboard')">+ Write New Article</button>
                  </div>`
                : ''
            }

            <div style="display:flex;justify-content:center;flex-wrap:wrap;gap:8px;margin-top:24px;">
              ${categories
                .map(
                  (cat) => `
                <button class="selector-pill ${this.blogFilter === cat ? 'active' : ''}" onclick="window.app.blogFilter='${cat}';window.app.render();">
                  ${cat === 'ALL' ? 'All Articles' : cat}
                </button>
              `
                )
                .join('')}
            </div>
          </div>

          <div class="grid-2">
            ${filtered
              .map(
                (post) => `
              <div class="glass-card blog-card" onclick="window.app.navigate('blog-detail', '${post.slug}')">
                <div>
                  <div class="blog-card-image" style="aspect-ratio:4/5;">
                    <img src="${post.coverImage}" alt="${post.title}" loading="lazy" decoding="async" />
                  </div>
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <span class="tech-pill lime">${post.category}</span>
                    <span style="font-size:12.5px;color:var(--yole-text-muted);">${post.date} • ${post.readTime}</span>
                  </div>
                  <h2 style="font-size:22px;font-weight:800;margin-bottom:10px;line-height:1.3;">${post.title}</h2>
                  <p style="font-size:14px;color:var(--yole-text-muted);margin-bottom:16px;">${post.summary}</p>
                </div>

                <div>
                  <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">
                    ${(post.tags || []).map((t) => `<span class="tech-pill">${t}</span>`).join('')}
                  </div>
                  <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(255,255,255,0.1);padding-top:12px;font-size:13.5px;font-weight:700;color:#C8E61E;">
                    <span>By ${post.author}</span>
                    <span>Read Full Article →</span>
                  </div>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      </section>
    `;
  }

  formatMarkdownToHtml(md) {
    if (!md) return '';

    const codeBlocks = [];
    const textWithPlaceholders = String(md).replace(/```([a-zA-Z0-9_-]*)\r?\n([\s\S]*?)```/g, (_, lang, code) => {
      const escaped = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .trimEnd();
      const idx = codeBlocks.length;
      const langBadge = lang
        ? `<div style="font-size:11px;font-weight:800;text-transform:uppercase;color:#F7941D;margin-bottom:8px;letter-spacing:0.08em;">${lang}</div>`
        : '';
      codeBlocks.push(
        `<pre style="background:#0B0920;border:1px solid rgba(200,230,30,0.35);padding:18px;border-radius:12px;overflow-x:auto;margin:18px 0;font-family:monospace;font-size:13px;color:#C8E61E;line-height:1.6;">${langBadge}<code>${escaped}</code></pre>`
      );
      return `\n\n@@CODE_BLOCK_${idx}@@\n\n`;
    });

    const formatInline = (str) =>
      str
        .replace(/`([^`]+)`/g, '<code style="background:rgba(200,230,30,0.14);color:#C8E61E;padding:2px 6px;border-radius:5px;font-family:monospace;">$1</code>')
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#FFFFFF;">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:#C8E61E;text-decoration:underline;">$1</a>');

    const lines = textWithPlaceholders.split(/\r?\n/);
    const htmlParts = [];
    let paragraphBuffer = [];
    let listBuffer = [];
    let listType = null; // 'ul' | 'ol'

    const flushParagraph = () => {
      if (paragraphBuffer.length > 0) {
        const text = formatInline(paragraphBuffer.join(' ').trim());
        if (text) {
          htmlParts.push(
            `<p style="margin-bottom:16px;color:var(--yole-text-muted);font-size:16px;line-height:1.75;">${text}</p>`
          );
        }
        paragraphBuffer = [];
      }
    };

    const flushList = () => {
      if (listBuffer.length > 0) {
        const tag = listType === 'ol' ? 'ol' : 'ul';
        const itemsHtml = listBuffer
          .map((item) => `<li style="margin-bottom:8px;line-height:1.7;">${formatInline(item)}</li>`)
          .join('');
        htmlParts.push(
          `<${tag} style="padding-left:22px;margin:14px 0 18px;color:var(--yole-text-muted);font-size:15.5px;">${itemsHtml}</${tag}>`
        );
        listBuffer = [];
        listType = null;
      }
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (!line) {
        flushParagraph();
        flushList();
        continue;
      }

      const codeMatch = line.match(/^@@CODE_BLOCK_(\d+)@@$/);
      if (codeMatch) {
        flushParagraph();
        flushList();
        htmlParts.push(codeBlocks[Number(codeMatch[1])] || '');
        continue;
      }

      if (line.startsWith('### ')) {
        flushParagraph();
        flushList();
        htmlParts.push(
          `<h3 style="font-size:20px;font-weight:800;color:#C8E61E;margin:24px 0 10px;">${formatInline(line.slice(4))}</h3>`
        );
        continue;
      }

      if (line.startsWith('## ')) {
        flushParagraph();
        flushList();
        htmlParts.push(
          `<h2 style="font-size:25px;font-weight:900;color:#FFFFFF;margin:30px 0 12px;border-bottom:1px solid rgba(255,255,255,0.12);padding-bottom:8px;">${formatInline(line.slice(3))}</h2>`
        );
        continue;
      }

      if (line.startsWith('# ')) {
        flushParagraph();
        flushList();
        htmlParts.push(
          `<h2 style="font-size:27px;font-weight:900;color:#FFFFFF;margin:30px 0 12px;">${formatInline(line.slice(2))}</h2>`
        );
        continue;
      }

      const ulMatch = line.match(/^(\*|-)\s+(.*)$/);
      if (ulMatch) {
        flushParagraph();
        if (listType && listType !== 'ul') flushList();
        listType = 'ul';
        listBuffer.push(ulMatch[2]);
        continue;
      }

      const olMatch = line.match(/^\d+\.\s+(.*)$/);
      if (olMatch) {
        flushParagraph();
        if (listType && listType !== 'ol') flushList();
        listType = 'ol';
        listBuffer.push(olMatch[1]);
        continue;
      }

      flushList();
      paragraphBuffer.push(line);
    }

    flushParagraph();
    flushList();

    return htmlParts.join('\n');
  }

  renderBlogPostDetail() {
    const post = this.activeBlogPost || this.blogPosts[0];
    if (!post) {
      return `<section class="section"><div class="container"><p>Article not found.</p></div></section>`;
    }

    return `
      <section class="section">
        <div class="container" style="max-width:860px;">
          <button class="btn btn-outline btn-sm" style="margin-bottom:24px;" onclick="window.app.navigate('blog')">
            ← Back to All Articles
          </button>

          <div class="glass-card article-detail-card">
            <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:14px;">
              <span class="tech-pill lime">${post.category}</span>
              <span class="tech-pill orange">${post.readTime}</span>
              <span style="font-size:13px;color:var(--yole-text-muted);">Published ${post.date}</span>
            </div>

            <h1 style="font-size:clamp(26px,3.6vw,38px);font-weight:900;line-height:1.2;margin-bottom:16px;">
              ${post.title}
            </h1>

            <div style="display:flex;align-items:center;gap:12px;padding-bottom:22px;margin-bottom:24px;border-bottom:1px solid rgba(255,255,255,0.12);">
              <img src="/assets/yoletech-icon.png" alt="YOLETECH" style="width:40px;height:40px;border-radius:10px;" />
              <div>
                <div style="font-weight:800;font-size:14.5px;">${post.author}</div>
                <div style="font-size:12px;color:#C8E61E;">Data Analyst | Business Intelligence Specialist | Full-Stack Web Developer</div>
              </div>
            </div>

            <div style="border-radius:14px;overflow:hidden;margin-bottom:28px;max-height:340px;border:1px solid rgba(255,255,255,0.15);">
              <img src="${post.coverImage}" alt="${post.title}" style="width:100%;height:100%;object-fit:cover;" />
            </div>

            <div class="article-content">
              ${this.formatMarkdownToHtml(post.body)}
            </div>

            <div style="margin-top:32px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.12);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                ${(post.tags || []).map((t) => `<span class="tech-pill">${t}</span>`).join('')}
              </div>
              <button class="btn btn-lime btn-sm" onclick="window.app.navigate('contact')">
                Discuss This Topic With John →
              </button>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  // ==========================================================================
  // PAGE 7: CONTACT (SAMPLE 8917b911.jpg LAYOUT)
  // ==========================================================================
  renderContactPage() {
    const D = window.YOLETECH_DATA;
    const serviceCategories = [
      'Web Development',
      'Data Analysis & Analytics',
      'AI Automation',
      'Tech Tutorials',
      'Graphic Design',
      'Video Editing',
      'Customer Support',
      'IT Support'
    ];

    return `
      <section class="section">
        <div class="container">
          <div style="max-width:680px;margin-bottom:40px;">
            <div class="eyebrow"><span class="eyebrow-dot"></span> GET IN TOUCH WITH YOLETECH</div>
            <h1 class="hero-title" style="font-size:clamp(32px,4vw,48px);margin-bottom:12px;">
              Let's Build Something <span class="accent-lime">Great Together</span>
            </h1>
            <p style="font-size:16px;color:var(--yole-text-muted);">
              Describe your project or tell me about your manual data bottlenecks. You'll get a direct response within 24 hours.
            </p>
          </div>

          <div class="grid-2" style="align-items:start;">
            <!-- LEFT COLUMN: INTERACTIVE PROJECT INQUIRY FORM -->
            <div class="glass-card" style="border-color:rgba(200,230,30,0.45);">
              <h3 style="font-size:18px;font-weight:800;margin-bottom:12px;">What are we building?</h3>
              <div class="service-selector-pills">
                ${serviceCategories
                  .map(
                    (pill) => `
                  <button type="button" class="selector-pill ${
                    this.contactServiceSelected === pill ? 'active' : ''
                  }" onclick="window.app.contactServiceSelected='${pill}';window.app.render();">
                    ${pill}
                  </button>
                `
                  )
                  .join('')}
              </div>

              <form novalidate onsubmit="window.app.handleContactSubmit(event)">
                <div class="form-group">
                  <label class="form-label">Your Full Name *</label>
                  <input type="text" name="name" required class="form-control" placeholder="Your Name" value="${
                    this.user ? this.user.name : ''
                  }" />
                </div>

                <div class="grid-2" style="gap:14px;">
                  <div class="form-group">
                    <label class="form-label">Email Address *</label>
                    <input type="email" name="email" required class="form-control" placeholder="you@company.com" value="${
                      this.user ? this.user.email : ''
                    }" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">WhatsApp / Phone</label>
                    <input type="text" name="phone" class="form-control" placeholder="+234 ..." value="${
                      this.user ? this.user.phone || '' : ''
                    }" />
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">Project Category *</label>
                  <select name="service_category" class="form-control" onchange="window.app.contactServiceSelected=this.value;">
                    ${serviceCategories
                      .map(
                        (cat) => `
                      <option value="${cat}" ${this.contactServiceSelected === cat ? 'selected' : ''}>${cat}</option>
                    `
                      )
                      .join('')}
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Project Details &amp; Goals *</label>
                  <textarea name="message" rows="5" required class="form-control" placeholder="Tell me about your project, datasets, goals, or the manual problems you need solved..."></textarea>
                </div>

                <button type="submit" id="contact-submit-btn" class="btn btn-lime" style="width:100%;font-size:15px;padding:14px;">
                  Send Message to yoletech@yolestica.com →
                </button>
                ${this.renderFormConfirmation('contact')}
              </form>
            </div>

            <!-- RIGHT COLUMN: DISCOVERY CALL, DIRECT CONTACT & QUICK FAQ -->
            <div style="display:flex;flex-direction:column;gap:22px;">
              <div class="glass-card" style="background:linear-gradient(135deg,#2F2B73 0%,#1B184A 100%);border-color:#C8E61E;">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;">
                  <div>
                    <span class="tech-pill lime" style="margin-bottom:8px;">Instant Discovery Call</span>
                    <h3 style="font-size:21px;font-weight:900;">Book a 15-Minute Discovery Call</h3>
                    <p style="font-size:13.5px;color:var(--yole-text-muted);margin-top:4px;">
                      Connect directly on WhatsApp to scope your project requirements.
                    </p>
                  </div>
                  <a href="${D.owner.whatsappUrl}" target="_blank" rel="noopener" class="btn btn-lime">
                    Chat on WhatsApp →
                  </a>
                </div>
              </div>

              <div class="glass-card">
                <div style="display:flex;flex-direction:column;gap:14px;">
                  <div>
                    <div style="font-size:12px;font-weight:800;color:#C8E61E;text-transform:uppercase;">Direct Email</div>
                    <a href="mailto:${D.owner.email}" style="font-size:16px;font-weight:700;color:#FFFFFF;">${D.owner.email}</a>
                  </div>
                  <div>
                    <div style="font-size:12px;font-weight:800;color:#F7941D;text-transform:uppercase;">WhatsApp &amp; Direct Line</div>
                    <a href="${D.owner.whatsappUrl}" target="_blank" style="font-size:16px;font-weight:700;color:#FFFFFF;">${D.owner.phone}</a>
                  </div>
                  <div>
                    <div style="font-size:12px;font-weight:800;color:#C8E61E;text-transform:uppercase;">Working Hours &amp; Location</div>
                    <div style="font-size:14px;color:var(--yole-text-muted);">
                      ${D.owner.workingHours}<br/>
                      ${D.owner.location}
                    </div>
                  </div>
                </div>

                <div style="margin-top:18px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.12);">
                  <div style="font-size:12.5px;font-weight:800;margin-bottom:10px;">Find me on</div>
                  <div class="social-icon-row" style="margin-top:0;">
                    <a href="${D.owner.socials.github}" target="_blank" rel="noopener noreferrer" class="social-btn">
                      ${this.renderSocialIcon('github')}
                      <span>GitHub</span>
                    </a>
                    <a href="${D.owner.socials.linkedin}" target="_blank" rel="noopener noreferrer" class="social-btn">
                      ${this.renderSocialIcon('linkedin')}
                      <span>LinkedIn</span>
                    </a>
                    <a href="${D.owner.socials.kaggle}" target="_blank" rel="noopener noreferrer" class="social-btn">
                      ${this.renderSocialIcon('kaggle')}
                      <span>Kaggle</span>
                    </a>
                    <a href="${D.owner.socials.youtube}" target="_blank" rel="noopener noreferrer" class="social-btn">
                      ${this.renderSocialIcon('youtube')}
                      <span>YouTube</span>
                    </a>
                    <a href="${D.owner.socials.facebook}" target="_blank" rel="noopener noreferrer" class="social-btn">
                      ${this.renderSocialIcon('facebook')}
                      <span>Facebook</span>
                    </a>
                  </div>
                </div>
              </div>

              <!-- QUICK FAQ ACCORDION -->
              <div class="glass-card">
                <h3 style="font-size:19px;font-weight:900;margin-bottom:14px;">Quick FAQ</h3>
                <div style="display:flex;flex-direction:column;gap:10px;">
                  ${D.faqs
                    .map(
                      (faq, i) => `
                    <details style="background:rgba(15,13,44,0.7);border:1px solid rgba(255,255,255,0.14);border-radius:10px;padding:12px 15px;" ${
                      i === 0 ? 'open' : ''
                    }>
                      <summary style="font-weight:800;font-size:14px;cursor:pointer;color:#FFFFFF;list-style:none;display:flex;justify-content:space-between;align-items:center;">
                        <span>${faq.q}</span>
                        <span style="color:#C8E61E;font-weight:900;">(+)</span>
                      </summary>
                      <p style="font-size:13.5px;color:var(--yole-text-muted);margin-top:10px;">${faq.a}</p>
                    </details>
                  `
                    )
                    .join('')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  async handleContactSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const isValid = this.validateForm(form, 'contact', [
      { name: 'name', label: 'Full Name', required: true, minLength: 2 },
      { name: 'email', label: 'Email Address', required: true, type: 'email' },
      { name: 'phone', label: 'WhatsApp / Phone', required: false, type: 'phone' },
      { name: 'service_category', label: 'Project Category', required: true },
      { name: 'message', label: 'Project Details & Goals', required: true, minLength: 10 }
    ]);
    if (!isValid) return;

    const submitBtn = document.getElementById('contact-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = `Sending to ${this.notifyEmail}...`;
    }

    const selectedCategory = form.service_category ? form.service_category.value : this.contactServiceSelected;
    const payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      phone: (form.phone.value || '').trim(),
      service_category: selectedCategory,
      message: form.message.value.trim()
    };

    const subject = `[YOLETECH Project Inquiry] ${payload.service_category} — ${payload.name}`;
    const emailBody = [
      `Full Name: ${payload.name}`,
      `Email: ${payload.email}`,
      `WhatsApp / Phone: ${payload.phone || 'N/A'}`,
      `Project Category: ${payload.service_category}`,
      '',
      'Project Details & Goals:',
      payload.message
    ].join('\n');

    const mailtoUrl = `mailto:${this.notifyEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
    const whatsappUrl = `https://wa.me/2348025526389?text=${encodeURIComponent(subject + '\n\n' + emailBody)}`;

    try {
      let savedInquiry = null;
      try {
        const res = await this.api('/api/inquiries', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        savedInquiry = res.inquiry;
      } catch (apiErr) {
        console.warn('Saving inquiry locally as fallback:', apiErr.message);
        savedInquiry = {
          id: Date.now(),
          user_id: this.user?.id || null,
          ...payload,
          status: 'NEW',
          project_progress: 15,
          admin_response: '',
          created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
        };
      }

      if (savedInquiry) {
        this.saveLocalInquiry(savedInquiry);
      }

      await this.sendEmailToYoletech({
        subject,
        replyTo: payload.email,
        fields: {
          'Client Name': payload.name,
          'Client Email': payload.email,
          'WhatsApp / Phone': payload.phone || 'Not provided',
          'Project Category': payload.service_category,
          'Project Details & Goals': payload.message
        }
      });

      this.lastContactSubmission = {
        ...payload,
        mailtoUrl,
        whatsappUrl
      };

      form.reset();
      this.setFormConfirmation('contact', {
        title: `Inquiry Sent & Confirmed (${this.notifyEmail})`,
        message: `Thank you, <strong>${payload.name}</strong>! Your <strong>${payload.service_category}</strong> inquiry has been validated, logged, and emailed to <strong>${this.notifyEmail}</strong>. We will respond within 24 hours.`,
        actionsHtml: `
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <a href="${mailtoUrl}" class="btn btn-lime btn-sm">
              ✉️ Open in Email App (${this.notifyEmail}) ↗
            </a>
            <a href="${whatsappUrl}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">
              💬 Send Copy on WhatsApp ↗
            </a>
          </div>
        `
      });
      this.showToast(`Inquiry sent to ${this.notifyEmail}! We will respond within 24 hours.`);
      this.render();
    } catch (err) {
      this.setFormConfirmation('contact', {
        type: 'error',
        title: 'Submission Error',
        message: err.message || 'Could not send message.'
      });
      this.showToast(err.message || 'Could not send message.', 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = `Send Message to ${this.notifyEmail} →`;
      }
    }
  }

  // ==========================================================================
  // PAGE 8: USER REGISTRATION & LOGIN PORTAL
  // ==========================================================================
  renderAuthPage() {
    const isLogin = this.authMode === 'login';
    const pwdType = this.showPassword ? 'text' : 'password';

    return `
      <section class="section">
        <div class="container" style="max-width:540px;">
          <div class="glass-card auth-card" style="border-color:#C8E61E;">
            <div style="text-align:center;margin-bottom:24px;">
              <div class="eyebrow" style="justify-content:center;"><span class="eyebrow-dot"></span> CLIENT PORTAL</div>
              <h1 style="font-size:28px;font-weight:900;">
                ${isLogin ? 'Sign In to Your Portal' : 'Create a Client Account'}
              </h1>
              <p style="font-size:14px;color:var(--yole-text-muted);margin-top:6px;">
                ${
                  isLogin
                    ? 'Sign in to track your project deliverables and manage service requests.'
                    : 'Register to request projects, track deliverables, and manage your account.'
                }
              </p>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;background:#110E30;padding:6px;border-radius:999px;margin-bottom:24px;">
              <button type="button" class="btn btn-sm ${isLogin ? 'btn-lime' : ''}" style="${
      !isLogin ? 'background:transparent;color:#fff;' : ''
    }" onclick="window.app.authMode='login';window.app.render();">
                Sign In
              </button>
              <button type="button" class="btn btn-sm ${!isLogin ? 'btn-lime' : ''}" style="${
      isLogin ? 'background:transparent;color:#fff;' : ''
    }" onclick="window.app.authMode='register';window.app.render();">
                Client Registration
              </button>
            </div>

            ${
              isLogin
                ? `
              <form novalidate onsubmit="window.app.handleLoginSubmit(event)">
                <div class="form-group">
                  <label class="form-label">Email Address *</label>
                  <input type="email" id="login-email" name="email" required autocomplete="email" class="form-control" placeholder="you@company.com" />
                </div>
                <div class="form-group">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;">
                    <label class="form-label" style="margin-bottom:0;">Password *</label>
                    <button type="button" style="background:none;border:none;color:#C8E61E;font-size:12px;font-weight:700;cursor:pointer;" onclick="window.app.showPassword=!window.app.showPassword;const el=document.getElementById('login-password');if(el)el.type=window.app.showPassword?'text':'password';this.textContent=window.app.showPassword?'Hide Password':'Show Password';">
                      ${this.showPassword ? 'Hide Password' : 'Show Password'}
                    </button>
                  </div>
                  <input type="${pwdType}" id="login-password" name="password" required autocomplete="current-password" class="form-control" placeholder="••••••••••••" />
                </div>
                <button type="submit" id="auth-login-btn" class="btn btn-lime" style="width:100%;padding:14px;">
                  Sign In to Portal →
                </button>
                ${this.renderFormConfirmation('login')}
                <div style="text-align:center;margin-top:16px;font-size:13px;color:var(--yole-text-muted);">
                  Don't have a client account yet?
                  <a style="color:#C8E61E;font-weight:700;cursor:pointer;margin-left:4px;" onclick="window.app.authMode='register';window.app.render();">
                    Register here →
                  </a>
                </div>
              </form>
            `
                : `
              <form novalidate onsubmit="window.app.handleRegisterSubmit(event)">
                <div class="form-group">
                  <label class="form-label">Full Name *</label>
                  <input type="text" name="name" required autocomplete="name" class="form-control" placeholder="Your full name" />
                </div>
                <div class="grid-2" style="gap:12px;">
                  <div class="form-group">
                    <label class="form-label">Email Address *</label>
                    <input type="email" name="email" required autocomplete="email" class="form-control" placeholder="you@company.com" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">WhatsApp / Phone *</label>
                    <input type="text" name="phone" required autocomplete="tel" class="form-control" placeholder="+234 ..." />
                  </div>
                </div>
                <div class="grid-2" style="gap:12px;">
                  <div class="form-group">
                    <label class="form-label">Company / Organization</label>
                    <input type="text" name="company" autocomplete="organization" class="form-control" placeholder="Organization Name" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Primary Service Interest</label>
                    <select name="service_interest" class="form-control">
                      <option value="Web Development">Web Development</option>
                      <option value="Data Analysis & Analytics" selected>Data Analysis &amp; Analytics</option>
                      <option value="AI Automation">AI Automation</option>
                      <option value="Tech Tutorials">Tech Tutorials</option>
                      <option value="Graphic Design">Graphic Design</option>
                      <option value="Video Editing">Video Editing</option>
                      <option value="Customer Support">Customer Support</option>
                      <option value="IT Support">IT Support</option>
                    </select>
                  </div>
                </div>
                <div class="form-group">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;">
                    <label class="form-label" style="margin-bottom:0;">Create Password *</label>
                    <button type="button" style="background:none;border:none;color:#C8E61E;font-size:12px;font-weight:700;cursor:pointer;" onclick="window.app.showPassword=!window.app.showPassword;const el=document.getElementById('register-password');if(el)el.type=window.app.showPassword?'text':'password';this.textContent=window.app.showPassword?'Hide Password':'Show Password';">
                      ${this.showPassword ? 'Hide Password' : 'Show Password'}
                    </button>
                  </div>
                  <input type="${pwdType}" id="register-password" name="password" required minlength="6" autocomplete="new-password" class="form-control" placeholder="At least 6 characters" />
                </div>
                <button type="submit" id="auth-register-btn" class="btn btn-lime" style="width:100%;padding:14px;">
                  Complete Registration →
                </button>
                ${this.renderFormConfirmation('register')}
                <div style="text-align:center;margin-top:16px;font-size:13px;color:var(--yole-text-muted);">
                  Already have an account?
                  <a style="color:#C8E61E;font-weight:700;cursor:pointer;margin-left:4px;" onclick="window.app.authMode='login';window.app.render();">
                    Sign In →
                  </a>
                </div>
              </form>
            `
            }
          </div>
        </div>
      </section>
    `;
  }

  authenticateLocalFallback(email, password) {
    const normEmail = String(email || '').trim().toLowerCase();
    // 1. Check Master Admin credentials (both yoletech@yoletica.com and yoletech@yolestica.com)
    if (
      (normEmail === 'yoletech@yoletica.com' || normEmail === 'yoletech@yolestica.com') &&
      password === 'YoleTech@2026#Admin'
    ) {
      return {
        token: 'local-admin-jwt-' + Date.now(),
        user: {
          id: 1,
          name: 'John Oruebi Eniekpo',
          email: normEmail,
          phone: '+234 802 552 6389',
          company: 'YOLETECH Headquarters',
          service_interest: 'Full-Stack, BI & AI Architecture',
          role: 'ADMIN',
          status: 'ACTIVE',
          created_at: '2026-01-10 09:00:00'
        }
      };
    }

    // 2. Check Demo Client account
    if (normEmail === 'client@example.com' && password === 'Client@2026') {
      return {
        token: 'local-client-jwt-' + Date.now(),
        user: {
          id: 2,
          name: 'Demo Client Partner',
          email: 'client@example.com',
          phone: '+234 802 552 6389',
          company: 'Demo Client Organization',
          service_interest: 'Data Analysis & Analytics',
          role: 'CLIENT',
          status: 'ACTIVE',
          created_at: '2026-09-01 10:00:00'
        }
      };
    }

    // 3. Check locally registered clients in browser storage
    const localUsers = this.getLocalRegisteredUsers();
    const matched = localUsers.find(
      (u) => String(u.email || '').toLowerCase() === normEmail && u._pwd === password
    );
    if (matched) {
      const { _pwd, ...cleanUser } = matched;
      return {
        token: 'local-client-jwt-' + Date.now(),
        user: cleanUser
      };
    }

    return null;
  }

  async handleLoginSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const isValid = this.validateForm(form, 'login', [
      { name: 'email', label: 'Email Address', required: true, type: 'email' },
      { name: 'password', label: 'Password', required: true, minLength: 6, trim: false }
    ]);
    if (!isValid) return;

    const submitBtn = document.getElementById('auth-login-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing In...';
    }

    const email = form.email.value.trim().toLowerCase();
    const password = form.password.value;

    try {
      let authData = null;
      try {
        authData = await this.api('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });
      } catch (apiErr) {
        // Fallback to local registry / seeded accounts if serverless container reset
        const fallbackAuth = this.authenticateLocalFallback(email, password);
        if (fallbackAuth) {
          authData = fallbackAuth;
        } else {
          throw apiErr;
        }
      }

      const { token, user } = authData;
      this.token = token;
      this.user = user;
      this.saveLocalRegisteredUser(user, password);
      localStorage.setItem('yoletech_token', token);
      localStorage.setItem('yoletech_user', JSON.stringify(user));

      this.setFormConfirmation('login', {
        title: 'Sign-In Confirmed!',
        message: `Welcome back, <strong>${user.name}</strong>! Opening your portal...`
      });
      this.setFormConfirmation('auth-welcome', {
        title: 'Sign-In Confirmed',
        message: `Welcome back, <strong>${user.name}</strong> (${user.email})! Your session is verified and active.`
      });
      this.showToast(`Welcome back, ${user.name}!`);
      if (user.role === 'ADMIN') {
        await this.loadAdminData();
        this.navigate('admin-dashboard');
      } else {
        await this.loadClientData();
        this.navigate('portal');
      }
    } catch (err) {
      this.setFormConfirmation('login', {
        type: 'error',
        title: 'Sign-In Failed',
        message: err.message || 'Invalid email or password. Please verify your credentials and try again.'
      });
      this.showToast(err.message || 'Invalid email or password.', 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In to Portal →';
      }
    }
  }

  async handleRegisterSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const isValid = this.validateForm(form, 'register', [
      { name: 'name', label: 'Full Name', required: true, minLength: 2 },
      { name: 'email', label: 'Email Address', required: true, type: 'email' },
      { name: 'phone', label: 'WhatsApp / Phone', required: true, type: 'phone' },
      { name: 'service_interest', label: 'Primary Service Interest', required: true },
      { name: 'password', label: 'Password', required: true, minLength: 6, trim: false }
    ]);
    if (!isValid) return;

    const submitBtn = document.getElementById('auth-register-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating Your Account...';
    }

    const payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim().toLowerCase(),
      phone: form.phone.value.trim(),
      company: (form.company.value || '').trim(),
      service_interest: form.service_interest.value,
      password: form.password.value
    };

    try {
      let regData = null;
      try {
        regData = await this.api('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      } catch (apiErr) {
        if (String(apiErr.message || '').toLowerCase().includes('already exists')) {
          throw apiErr;
        }
        // Fallback registration if serverless function is unreachable
        const existingLocal = this.getLocalRegisteredUsers().find(
          (u) => String(u.email || '').toLowerCase() === payload.email
        );
        if (existingLocal) {
          throw new Error('An account with this email already exists. Please sign in.');
        }
        const fallbackUser = {
          id: Date.now(),
          name: payload.name,
          email: payload.email,
          phone: payload.phone,
          company: payload.company,
          service_interest: payload.service_interest,
          role: 'CLIENT',
          status: 'ACTIVE',
          created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
        };
        regData = {
          token: 'local-client-jwt-' + Date.now(),
          user: fallbackUser
        };
      }

      const { token, user } = regData;
      this.saveLocalRegisteredUser(user, payload.password);

      // Dispatch new client registration notification email to yoletech@yolestica.com
      await this.sendEmailToYoletech({
        subject: `[YOLETECH New Client Registration] ${user.name} — ${user.service_interest}`,
        replyTo: user.email,
        fields: {
          Event: 'New Client Portal Registration',
          'Client Full Name': user.name,
          'Client Email': user.email,
          'WhatsApp / Phone': user.phone || 'Not provided',
          'Company / Organization': user.company || 'Independent Client',
          'Primary Service Interest': user.service_interest,
          'Registered At': user.created_at || new Date().toISOString()
        }
      });

      this.token = token;
      this.user = user;
      localStorage.setItem('yoletech_token', token);
      localStorage.setItem('yoletech_user', JSON.stringify(user));
      await this.loadClientData();
      if (typeof this.loadDashboardData === 'function') await this.loadDashboardData(true);

      this.setFormConfirmation('register', {
        title: 'Registration Confirmed!',
        message: `Account created for <strong>${user.name}</strong> (${user.email}). Welcome to YOLETECH!`
      });
      this.setFormConfirmation('auth-welcome', {
        title: 'Registration Confirmed — Welcome to YOLETECH!',
        message: `Thank you for registering, <strong>${user.name}</strong>! Your Client Portal account is now active under the <strong>${user.service_interest}</strong> track, and a confirmation has been dispatched to <strong>${this.notifyEmail}</strong>.`
      });
      this.showToast(`Account created! Welcome to YOLETECH, ${user.name}.`);
      this.navigate('portal');
    } catch (err) {
      this.setFormConfirmation('register', {
        type: 'error',
        title: 'Registration Error',
        message: err.message || 'Registration failed. Please check your details and try again.'
      });
      this.showToast(err.message || 'Registration failed.', 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Complete Registration →';
      }
    }
  }

  renderClientPortalPage() {
    if (!this.user) {
      return this.renderAuthPage();
    }

    return `
      <section class="section">
        <div class="container">
          ${this.renderFormConfirmation('auth-welcome')}
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;margin-bottom:36px;">
            <div>
              <div class="eyebrow"><span class="eyebrow-dot"></span> REGISTERED CLIENT WORKSPACE</div>
              <h1 style="font-size:32px;font-weight:900;">Welcome, ${this.user.name}</h1>
              <p style="color:var(--yole-text-muted);font-size:14.5px;">
                ${this.user.company || 'Client Partner'} • Primary Track: <strong style="color:#C8E61E;">${this.user.service_interest}</strong>
              </p>
            </div>
            <div style="display:flex;gap:12px;flex-wrap:wrap;">
              ${
                this.user.role === 'ADMIN'
                  ? `<button class="btn btn-outline btn-sm" onclick="window.app.navigate('admin-dashboard')">Open Admin CRM →</button>`
                  : ''
              }
              <a href="https://wa.me/2348025526389" target="_blank" class="btn btn-lime btn-sm">
                Direct WhatsApp Support →
              </a>
              <button class="btn btn-outline btn-sm" onclick="window.app.logout()">Sign Out</button>
            </div>
          </div>

          <div class="grid-2" style="align-items:start;">
            <!-- MY PROJECTS & INQUIRIES -->
            <div class="glass-card">
              <h3 style="font-size:20px;font-weight:900;margin-bottom:16px;">Your Projects &amp; Service Requests</h3>
              ${
                this.inquiries.length === 0
                  ? `<p style="color:var(--yole-text-muted);font-size:14px;">You haven't submitted a project request yet. Use the form on the right to start a new project!</p>`
                  : `<div style="display:flex;flex-direction:column;gap:16px;">
                      ${this.inquiries
                        .map(
                          (inq) => `
                        <div style="background:rgba(15,13,44,0.75);border:1px solid rgba(200,230,30,0.3);border-radius:12px;padding:16px;">
                          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                            <span class="tech-pill lime">${inq.service_category}</span>
                            <span class="tech-pill orange">${inq.status}</span>
                          </div>
                          <p style="font-size:14px;color:#FFFFFF;margin-bottom:12px;">${inq.message}</p>
                          <div style="margin-bottom:8px;">
                            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
                              <span>Project Completion Progress</span>
                              <strong style="color:#C8E61E;" data-kpi-target="${inq.project_progress || 15}" data-kpi-suffix="%">${inq.project_progress || 15}%</strong>
                            </div>
                            <div style="height:8px;background:#2F2B73;border-radius:999px;overflow:hidden;">
                              <div style="width:${inq.project_progress || 15}%;height:100%;background:#C8E61E;"></div>
                            </div>
                          </div>
                          ${
                            inq.admin_response
                              ? `<div style="margin-top:10px;padding:10px;background:rgba(200,230,30,0.08);border-left:3px solid #C8E61E;font-size:12.5px;">
                                  <strong style="color:#C8E61E;">Update from John Eniekpo:</strong> ${inq.admin_response}
                                </div>`
                              : ''
                          }
                        </div>
                      `
                        )
                        .join('')}
                    </div>`
              }
            </div>

            <!-- SUBMIT NEW PROJECT BRIEF & PROFILE SETTINGS -->
            <div style="display:flex;flex-direction:column;gap:24px;">
              <div class="glass-card">
                <h3 style="font-size:20px;font-weight:900;margin-bottom:16px;">Request a New Service / Project</h3>
                <form novalidate onsubmit="window.app.handleClientPortalInquiry(event)">
                  <div class="form-group">
                    <label class="form-label">Project Category *</label>
                    <select name="service_category" class="form-control">
                      <option value="Web Development">Web Development</option>
                      <option value="Data Analysis & Analytics" selected>Data Analysis &amp; Analytics</option>
                      <option value="AI Automation">AI Automation</option>
                      <option value="Tech Tutorials">Tech Tutorials</option>
                      <option value="Graphic Design">Graphic Design</option>
                      <option value="Video Editing">Video Editing</option>
                      <option value="Customer Support">Customer Support</option>
                      <option value="IT Support">IT Support</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Project Scope &amp; Deliverables *</label>
                    <textarea name="message" rows="4" required class="form-control" placeholder="Describe the dataset, dashboard, web platform, or workflow automation you need..."></textarea>
                  </div>
                  <button type="submit" id="portal-inquiry-submit-btn" class="btn btn-lime" style="width:100%;">Submit Request to John →</button>
                  ${this.renderFormConfirmation('portal-inquiry')}
                </form>
              </div>

              <!-- CLIENT PROFILE SETTINGS -->
              <div class="glass-card">
                <h3 style="font-size:19px;font-weight:900;margin-bottom:14px;">Account &amp; Profile Settings</h3>
                <form novalidate onsubmit="window.app.handleProfileUpdateSubmit(event)">
                  <div class="grid-2" style="gap:12px;">
                    <div class="form-group">
                      <label class="form-label">Full Name *</label>
                      <input type="text" name="name" required class="form-control" value="${(this.user.name || '').replace(/"/g, '&quot;')}" />
                    </div>
                    <div class="form-group">
                      <label class="form-label">WhatsApp / Phone</label>
                      <input type="text" name="phone" class="form-control" value="${(this.user.phone || '').replace(/"/g, '&quot;')}" />
                    </div>
                  </div>
                  <div class="grid-2" style="gap:12px;">
                    <div class="form-group">
                      <label class="form-label">Organization / Company</label>
                      <input type="text" name="company" class="form-control" value="${(this.user.company || '').replace(/"/g, '&quot;')}" />
                    </div>
                    <div class="form-group">
                      <label class="form-label">Primary Service Track</label>
                      <select name="service_interest" class="form-control">
                        <option value="Data Analytics & BI" ${this.user.service_interest === 'Data Analytics & BI' ? 'selected' : ''}>Data Analytics &amp; BI</option>
                        <option value="Full-Stack Web Development" ${this.user.service_interest === 'Full-Stack Web Development' ? 'selected' : ''}>Full-Stack Web Development</option>
                        <option value="AI & Workflow Automation" ${this.user.service_interest === 'AI & Workflow Automation' ? 'selected' : ''}>AI &amp; Workflow Automation</option>
                        <option value="Tech Tutorials & Mentorship" ${this.user.service_interest === 'Tech Tutorials & Mentorship' ? 'selected' : ''}>Tech Tutorials &amp; Mentorship</option>
                        <option value="Graphic Design & Video" ${this.user.service_interest === 'Graphic Design & Video' ? 'selected' : ''}>Graphic Design &amp; Video</option>
                        <option value="IT & Customer Support" ${this.user.service_interest === 'IT & Customer Support' ? 'selected' : ''}>IT &amp; Customer Support</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" id="profile-submit-btn" class="btn btn-outline btn-sm">Save Profile Changes</button>
                  ${this.renderFormConfirmation('profile-settings')}
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  async handleProfileUpdateSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const isValid = this.validateForm(form, 'profile-settings', [
      { name: 'name', label: 'Full Name', required: true, minLength: 2 },
      { name: 'phone', label: 'WhatsApp / Phone', required: false, type: 'phone' },
      { name: 'service_interest', label: 'Primary Service Track', required: true }
    ]);
    if (!isValid) return;

    const submitBtn = document.getElementById('profile-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving Changes...';
    }

    const updatedFields = {
      name: form.name.value.trim(),
      phone: (form.phone.value || '').trim(),
      company: (form.company.value || '').trim(),
      service_interest: form.service_interest.value
    };

    try {
      let updatedUser = null;
      try {
        const { user } = await this.api('/api/auth/profile', {
          method: 'PUT',
          body: JSON.stringify(updatedFields)
        });
        updatedUser = user;
      } catch {
        updatedUser = { ...this.user, ...updatedFields };
      }
      this.user = updatedUser;
      this.saveLocalRegisteredUser(updatedUser);
      localStorage.setItem('yoletech_user', JSON.stringify(updatedUser));
      this.setFormConfirmation('profile-settings', {
        title: 'Profile Settings Saved!',
        message: `Your profile details for <strong>${updatedUser.name}</strong> and primary service track (<strong>${updatedUser.service_interest}</strong>) have been validated and updated.`
      });
      this.showToast('Profile settings updated!');
      this.render();
    } catch (err) {
      this.setFormConfirmation('profile-settings', {
        type: 'error',
        title: 'Update Failed',
        message: err.message || 'Could not update profile settings.'
      });
      this.showToast(err.message, 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Profile Changes';
      }
    }
  }

  async handleClientPortalInquiry(e) {
    e.preventDefault();
    const form = e.target;
    const isValid = this.validateForm(form, 'portal-inquiry', [
      { name: 'service_category', label: 'Project Category', required: true },
      { name: 'message', label: 'Project Scope & Deliverables', required: true, minLength: 10 }
    ]);
    if (!isValid) return;

    const submitBtn = document.getElementById('portal-inquiry-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting Request to John...';
    }

    const payload = {
      name: this.user.name,
      email: this.user.email,
      phone: this.user.phone || '',
      service_category: form.service_category.value,
      message: form.message.value.trim()
    };

    const subject = `[YOLETECH Client Portal Request] ${payload.service_category} — ${payload.name}`;
    const emailBody = [
      `Client Name: ${payload.name}`,
      `Client Email: ${payload.email}`,
      `WhatsApp / Phone: ${payload.phone || 'N/A'}`,
      `Project Category: ${payload.service_category}`,
      '',
      'Project Scope & Deliverables:',
      payload.message
    ].join('\n');
    const mailtoUrl = `mailto:${this.notifyEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
    const whatsappUrl = `https://wa.me/2348025526389?text=${encodeURIComponent(subject + '\n\n' + emailBody)}`;

    try {
      let savedInquiry = null;
      try {
        const res = await this.api('/api/inquiries', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        savedInquiry = res.inquiry;
      } catch {
        savedInquiry = {
          id: Date.now(),
          user_id: this.user.id,
          ...payload,
          status: 'NEW',
          project_progress: 15,
          admin_response: '',
          created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
        };
      }

      if (savedInquiry) {
        this.saveLocalInquiry(savedInquiry);
      }

      await this.sendEmailToYoletech({
        subject,
        replyTo: payload.email,
        fields: {
          Source: 'Registered Client Portal',
          'Client Name': payload.name,
          'Client Email': payload.email,
          'WhatsApp / Phone': payload.phone || 'Not provided',
          'Project Category': payload.service_category,
          'Project Scope & Deliverables': payload.message
        }
      });

      await this.loadClientData();
      form.reset();
      this.setFormConfirmation('portal-inquiry', {
        title: 'Service / Project Request Confirmed!',
        message: `Thank you, <strong>${payload.name}</strong>! Your <strong>${payload.service_category}</strong> request ("<em>${payload.message.slice(0, 80)}${payload.message.length > 80 ? '...' : ''}</em>") has been submitted to John Eniekpo (<strong>${this.notifyEmail}</strong>) and added to <strong>Your Projects &amp; Service Requests</strong>.`,
        actionsHtml: `
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <a href="${whatsappUrl}" target="_blank" rel="noopener" class="btn btn-lime btn-sm">
              💬 Follow Up on WhatsApp ↗
            </a>
            <a href="${mailtoUrl}" class="btn btn-outline btn-sm">
              ✉️ Open in Email App (${this.notifyEmail}) ↗
            </a>
          </div>
        `
      });
      this.showToast(`Project request submitted and emailed to ${this.notifyEmail}!`);
      this.render();
    } catch (err) {
      this.setFormConfirmation('portal-inquiry', {
        type: 'error',
        title: 'Request Could Not Be Sent',
        message: err.message || 'Failed to submit project request.'
      });
      this.showToast(err.message, 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Request to John →';
      }
    }
  }

  // ==========================================================================
  // PAGE 10: MASTER ADMIN CLIENT MANAGEMENT DASHBOARD (/admin-dashboard)
  // ==========================================================================
  renderAdminAnalyticsOverview(activeCount, onboardingCount, completedCount) {
    return `
      <div class="grid-3" style="margin-bottom:28px;">
        <div class="glass-card" style="padding:20px;">
          <div style="font-size:12px;font-weight:800;color:#C8E61E;text-transform:uppercase;">Client Status Breakdown</div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px;">
            <div style="display:flex;flex-direction:column;gap:6px;font-size:13px;">
              <span><strong style="color:#C8E61E;">● Active:</strong> <span data-kpi-target="${activeCount}">${activeCount}</span></span>
              <span><strong style="color:#F7941D;">● Onboarding:</strong> <span data-kpi-target="${onboardingCount}">${onboardingCount}</span></span>
              <span><strong style="color:#FFFFFF;">● Completed:</strong> <span data-kpi-target="${completedCount}">${completedCount}</span></span>
            </div>
            <svg width="76" height="76" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="14" fill="none" stroke="#2F2B73" stroke-width="5"></circle>
              <circle cx="18" cy="18" r="14" fill="none" stroke="#C8E61E" stroke-width="5" stroke-dasharray="55 35" stroke-dashoffset="15"></circle>
              <circle cx="18" cy="18" r="14" fill="none" stroke="#F7941D" stroke-width="5" stroke-dasharray="22 68" stroke-dashoffset="-40"></circle>
            </svg>
          </div>
        </div>

        <div class="glass-card" style="padding:20px;">
          <div style="font-size:12px;font-weight:800;color:#F7941D;text-transform:uppercase;">Service Track Demand</div>
          <div style="display:flex;align-items:flex-end;justify-content:space-between;height:78px;padding-top:14px;gap:10px;">
            <div style="flex:1;text-align:center;">
              <div style="height:52px;background:#C8E61E;border-radius:4px 4px 0 0;"></div>
              <div style="font-size:10px;margin-top:4px;color:var(--yole-text-muted);">Data/BI</div>
            </div>
            <div style="flex:1;text-align:center;">
              <div style="height:40px;background:#F7941D;border-radius:4px 4px 0 0;"></div>
              <div style="font-size:10px;margin-top:4px;color:var(--yole-text-muted);">Web Dev</div>
            </div>
            <div style="flex:1;text-align:center;">
              <div style="height:46px;background:#C8E61E;border-radius:4px 4px 0 0;"></div>
              <div style="font-size:10px;margin-top:4px;color:var(--yole-text-muted);">AI/VBA</div>
            </div>
            <div style="flex:1;text-align:center;">
              <div style="height:34px;background:#F7941D;border-radius:4px 4px 0 0;"></div>
              <div style="font-size:10px;margin-top:4px;color:var(--yole-text-muted);">Training</div>
            </div>
          </div>
        </div>

        <div class="glass-card" style="padding:20px;display:flex;flex-direction:column;justify-content:space-between;">
          <div>
            <div style="font-size:12px;font-weight:800;color:#C8E61E;text-transform:uppercase;">Data Export</div>
            <div style="font-size:20px;font-weight:900;margin-top:6px;">CRM Records Ready</div>
            <div style="font-size:12.5px;color:var(--yole-text-muted);margin-top:2px;">Export client directory for reporting</div>
          </div>
          <button class="btn btn-outline btn-sm" style="margin-top:12px;" onclick="window.app.exportClientsToCSV()">
            ⬇ Export Clients to CSV
          </button>
        </div>
      </div>
    `;
  }

  renderAdminDashboardPage() {
    if (!this.user || this.user.role !== 'ADMIN') {
      return `
        <section class="section">
          <div class="container" style="max-width:540px;text-align:center;">
            <div class="glass-card">
              <h2 style="font-size:24px;font-weight:900;margin-bottom:10px;">Admin Access Required</h2>
              <p style="color:var(--yole-text-muted);margin-bottom:20px;">
                Please sign in with an administrator account to access the management dashboard.
              </p>
              <button class="btn btn-lime" onclick="window.app.navigate('login')">Go to Sign In →</button>
            </div>
          </div>
        </section>
      `;
    }

    const totalClients = this.clients.filter((c) => c.role !== 'ADMIN').length;
    const activeClients = this.clients.filter((c) => c.role !== 'ADMIN' && c.status === 'ACTIVE').length;
    const onboardingClients = this.clients.filter((c) => c.role !== 'ADMIN' && c.status === 'ONBOARDING').length;
    const completedClients = this.clients.filter((c) => c.role !== 'ADMIN' && c.status === 'COMPLETED').length;

    const filteredClients = this.clients
      .filter((c) => c.role !== 'ADMIN')
      .filter((c) => {
        if (this.clientStatusFilter !== 'ALL' && c.status !== this.clientStatusFilter) return false;
        if (!this.clientSearch) return true;
        const q = this.clientSearch.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.company || '').toLowerCase().includes(q) ||
          (c.service_interest || '').toLowerCase().includes(q)
        );
      });

    return `
      <section class="section" style="padding-top:40px;">
        <div class="container">
          <!-- ADMIN HEADER BAR -->
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;margin-bottom:28px;">
            <div>
              <div class="eyebrow"><span class="eyebrow-dot"></span> ADMIN DASHBOARD</div>
              <h1 style="font-size:30px;font-weight:900;">Client CRM &amp; Platform Management</h1>
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
              <button class="btn btn-outline btn-sm" onclick="window.app.exportClientsToCSV()">
                ⬇ Export Clients CSV
              </button>
              <button class="btn btn-lime btn-sm" onclick="window.app.loadAdminData().then(() => window.app.render())">
                ↻ Refresh Data
              </button>
            </div>
          </div>

          <!-- DATA OVERVIEW KPI ROW -->
          <div class="metrics-strip" style="margin-bottom:24px;">
            <div class="metric-cell">
              <div class="metric-number" data-kpi-target="${totalClients}">${totalClients}</div>
              <div class="metric-label">Registered<br/>Clients</div>
            </div>
            <div class="metric-cell">
              <div class="metric-number" style="color:#F7941D;" data-kpi-target="${this.inquiries.length}">${this.inquiries.length}</div>
              <div class="metric-label">Active Project<br/>Inquiries</div>
            </div>
            <div class="metric-cell">
              <div class="metric-number" data-kpi-target="${this.portfolio.length}">${this.portfolio.length}</div>
              <div class="metric-label">Portfolio<br/>Case Studies</div>
            </div>
            <div class="metric-cell">
              <div class="metric-number" style="color:#F7941D;" data-kpi-target="${this.blogPosts.length}">${this.blogPosts.length}</div>
              <div class="metric-label">Published<br/>Blog Posts</div>
            </div>
          </div>

          ${this.renderAdminAnalyticsOverview(activeClients, onboardingClients, completedClients)}

          <!-- ADMIN NAVIGATION TABS -->
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:28px;">
            <button class="selector-pill ${this.adminTab === 'clients' ? 'active' : ''}" onclick="window.app.adminTab='clients';window.app.render();">
              👥 Clients (${totalClients})
            </button>
            <button class="selector-pill ${this.adminTab === 'inquiries' ? 'active' : ''}" onclick="window.app.adminTab='inquiries';window.app.render();">
              📩 Inquiries (${this.inquiries.length})
            </button>
            <button class="selector-pill ${this.adminTab === 'blog' ? 'active' : ''}" onclick="window.app.adminTab='blog';window.app.render();">
              ✍️ Blog Articles (${this.blogPosts.length})
            </button>
            <button class="selector-pill ${this.adminTab === 'portfolio' ? 'active' : ''}" onclick="window.app.adminTab='portfolio';window.app.render();">
              🚀 Portfolio (${this.portfolio.length})
            </button>
            <button class="selector-pill ${this.adminTab === 'testimonials' ? 'active' : ''}" onclick="window.app.adminTab='testimonials';window.app.render();">
              💬 Testimonials (${this.testimonials.length})
            </button>
          </div>

          ${
            this.adminTab === 'clients'
              ? this.renderAdminClientsTab(filteredClients, activeClients, onboardingClients, completedClients)
              : this.adminTab === 'inquiries'
              ? this.renderAdminInquiriesTab()
              : this.adminTab === 'blog'
              ? this.renderAdminBlogTab()
              : this.adminTab === 'portfolio'
              ? this.renderAdminPortfolioTab()
              : this.renderAdminTestimonialsTab()
          }
        </div>
      </section>
    `;
  }



  updateRoiCalculation() {
    const hoursEl = document.getElementById('roi-hours');
    const staffEl = document.getElementById('roi-staff');
    const rateEl = document.getElementById('roi-rate');
    if (!hoursEl || !staffEl || !rateEl) return;

    const hours = parseInt(hoursEl.value, 10);
    const staff = parseInt(staffEl.value, 10);
    const rate = parseInt(rateEl.value, 10);

    const hoursVal = document.getElementById('roi-hours-val');
    const staffVal = document.getElementById('roi-staff-val');
    const rateVal = document.getElementById('roi-rate-val');
    const currentCostEl = document.getElementById('roi-current-cost');
    const hoursSavedEl = document.getElementById('roi-hours-saved');
    const netSavingsEl = document.getElementById('roi-net-savings');

    if (hoursVal) hoursVal.textContent = `${hours} hrs / wk`;
    if (staffVal) staffVal.textContent = `${staff} Staff`;
    if (rateVal) rateVal.textContent = `${rate} / hr`;

    const totalHoursPerYear = hours * staff * 52;
    const annualCost = totalHoursPerYear * rate;
    const hoursSaved = Math.round(totalHoursPerYear * 0.75);
    const netSavings = Math.round(annualCost * 0.75);

    if (currentCostEl) currentCostEl.innerHTML = `${annualCost.toLocaleString()} <span style="font-size:15px;color:var(--yole-text-muted);font-weight:500;">/ year</span>`;
    if (hoursSavedEl) hoursSavedEl.textContent = `${hoursSaved.toLocaleString()} hrs`;
    if (netSavingsEl) netSavingsEl.textContent = `${netSavings.toLocaleString()} / yr`;
  }

  applyRoiEstimateToInquiry() {
    const hoursEl = document.getElementById('roi-hours');
    const staffEl = document.getElementById('roi-staff');
    const rateEl = document.getElementById('roi-rate');

    const hours = hoursEl ? hoursEl.value : 15;
    const staff = staffEl ? staffEl.value : 3;
    const rate = rateEl ? rateEl.value : 35;
    const totalHoursPerYear = hours * staff * 52;
    const annualCost = (totalHoursPerYear * rate).toLocaleString();
    const netSavings = Math.round(totalHoursPerYear * rate * 0.75).toLocaleString();

    this.contactServiceSelected = 'Data Analysis & Analytics';
    this.pendingInquiryMessage = `Hi John, based on your interactive ROI calculator, our team spends approximately ${hours} hrs/week across ${staff} staff on manual reporting (approx. ${annualCost}/year). We would like to discuss implementing an automated Power BI & SQL pipeline to reclaim operational time and achieve an estimated ${netSavings}/year in savings.`;

    this.navigate('contact');
    setTimeout(() => {
      const msgArea = document.querySelector('textarea[name="message"]');
      if (msgArea) {
        msgArea.value = this.pendingInquiryMessage;
        msgArea.focus();
        msgArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 120);
  }

  setAdminClientPage(page) {
    this.adminClientPage = Math.max(1, page);
    this.render();
  }

  renderAdminClientsTab(filteredClients, activeClients, onboardingClients, completedClients) {
    const pageSize = 30;
    const totalCount = filteredClients.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    if (!this.adminClientPage || this.adminClientPage < 1) this.adminClientPage = 1;
    if (this.adminClientPage > totalPages) this.adminClientPage = totalPages;
    const startIdx = (this.adminClientPage - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, totalCount);
    const paginatedClients = filteredClients.slice(startIdx, endIdx);

    const cur = this.adminClientPage;
    const delta = 2;
    const range = [];
    for (let i = Math.max(2, cur - delta); i <= Math.min(totalPages - 1, cur + delta); i++) {
      range.push(i);
    }
    if (cur - delta > 2) range.unshift('...');
    if (cur + delta < totalPages - 1) range.push('...');
    range.unshift(1);
    if (totalPages > 1) range.push(totalPages);

    const pagerHtml = totalPages > 1 ? `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-top:16px;padding:12px 18px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);border-radius:10px;">
        <div style="font-size:13px;color:var(--yole-text-muted);">
          Showing <strong>${totalCount > 0 ? startIdx + 1 : 0}–${endIdx}</strong> of <strong>${totalCount}</strong> clients (30 per page)
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
          <button type="button" class="btn btn-outline btn-sm" style="padding:5px 12px;font-size:12px;" ${cur <= 1 ? 'disabled' : ''} onclick="window.app.setAdminClientPage(${cur - 1})">
            ← Prev
          </button>
          ${range.map(p => {
            if (p === '...') return '<span style="padding:0 4px;color:var(--yole-text-muted);">…</span>';
            const active = p === cur;
            return `<button type="button" class="btn ${active ? 'btn-lime' : 'btn-outline'} btn-sm" style="padding:5px 10px;font-size:12px;min-width:32px;" onclick="window.app.setAdminClientPage(${p})">${p}</button>`;
          }).join('')}
          <button type="button" class="btn btn-outline btn-sm" style="padding:5px 12px;font-size:12px;" ${cur >= totalPages ? 'disabled' : ''} onclick="window.app.setAdminClientPage(${cur + 1})">
            Next →
          </button>
        </div>
      </div>
    ` : '';

    return `
      <!-- FILTER & SEARCH BAR -->
      <div class="glass-card" style="margin-bottom:24px;padding:20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px;">
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="selector-pill ${this.clientStatusFilter === 'ALL' ? 'active' : ''}" onclick="window.app.clientStatusFilter='ALL';window.app.adminClientPage=1;window.app.render();">
              All Clients
            </button>
            <button class="selector-pill ${this.clientStatusFilter === 'ACTIVE' ? 'active' : ''}" onclick="window.app.clientStatusFilter='ACTIVE';window.app.adminClientPage=1;window.app.render();">
              ● Active (${activeClients})
            </button>
            <button class="selector-pill ${this.clientStatusFilter === 'ONBOARDING' ? 'active' : ''}" onclick="window.app.clientStatusFilter='ONBOARDING';window.app.adminClientPage=1;window.app.render();">
              ● Onboarding (${onboardingClients})
            </button>
            <button class="selector-pill ${this.clientStatusFilter === 'COMPLETED' ? 'active' : ''}" onclick="window.app.clientStatusFilter='COMPLETED';window.app.adminClientPage=1;window.app.render();">
              ● Completed (${completedClients})
            </button>
          </div>

          <div style="flex:1;max-width:340px;">
            <input id="admin-client-search" type="text" class="form-control" placeholder="Search client name, email, company..." value="${this.clientSearch}" oninput="window.app.clientSearch=this.value;window.app.adminClientPage=1;window.app.render();" />
          </div>
        </div>
      </div>

      <!-- REGISTERED CLIENTS TABLE -->
      <div style="font-size:12.5px;color:var(--yole-text-muted);margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
        <span>Page <strong>${cur}</strong> of <strong>${totalPages}</strong> (${totalCount} clients total)</span>
        <span>Displaying 30 clients per page</span>
      </div>
      <div class="table-wrapper" style="margin-bottom:16px;">
        <table class="yole-table">
          <thead>
            <tr>
              <th>Client &amp; Organization</th>
              <th>Contact (Email / WhatsApp)</th>
              <th>Service Track</th>
              <th>Status</th>
              <th>Admin Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${paginatedClients
              .map(
                (c) => `
              <tr>
                <td>
                  <div style="font-weight:800;font-size:15px;">${c.name}</div>
                  <div style="font-size:12px;color:var(--yole-text-muted);">${c.company || 'Independent Client'} • Joined ${String(c.created_at).slice(0, 10)}</div>
                </td>
                <td>
                  <div><a href="mailto:${c.email}" style="color:#C8E61E;font-weight:600;">${c.email}</a></div>
                  <div style="font-size:12.5px;color:var(--yole-text-muted);">${c.phone || '—'}</div>
                </td>
                <td>
                  <span class="tech-pill">${c.service_interest}</span>
                </td>
                <td>
                  <select class="form-control" style="padding:6px 10px;font-size:12.5px;width:135px;" onchange="window.app.updateClientField(${c.id}, { status: this.value })">
                    <option value="ACTIVE" ${c.status === 'ACTIVE' ? 'selected' : ''}>ACTIVE</option>
                    <option value="ONBOARDING" ${c.status === 'ONBOARDING' ? 'selected' : ''}>ONBOARDING</option>
                    <option value="COMPLETED" ${c.status === 'COMPLETED' ? 'selected' : ''}>COMPLETED</option>
                    <option value="LEAD" ${c.status === 'LEAD' ? 'selected' : ''}>LEAD</option>
                  </select>
                </td>
                <td>
                  <input type="text" class="form-control" style="padding:6px 10px;font-size:12.5px;min-width:200px;" value="${(c.admin_notes || '').replace(/"/g, '&quot;')}" onchange="window.app.updateClientField(${c.id}, { admin_notes: this.value })" placeholder="Add CRM note..." />
                </td>
                <td>
                  <div style="display:flex;gap:6px;">
                    ${
                      c.phone
                        ? `<a href="https://wa.me/${c.phone.replace(/[^0-9]/g, '')}" target="_blank" class="btn btn-lime btn-sm" style="padding:6px 10px;font-size:11.5px;">WhatsApp</a>`
                        : ''
                    }
                    <button class="btn btn-outline btn-sm" style="padding:6px 10px;font-size:11.5px;border-color:#ef4444;color:#ef4444;" onclick="window.app.deleteClient(${c.id})">
                      Delete
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
      ${pagerHtml}
      <div style="margin-bottom:32px;"></div>

      <!-- MANUALLY REGISTER A NEW CLIENT FROM ADMIN -->
      <div class="glass-card" style="max-width:740px;">
        <h3 style="font-size:20px;font-weight:900;margin-bottom:14px;">+ Add New Client to CRM</h3>
        <form onsubmit="window.app.handleAdminAddClient(event)">
          <div class="grid-2" style="gap:14px;">
            <div class="form-group">
              <label class="form-label">Client Full Name *</label>
              <input type="text" name="name" required class="form-control" placeholder="Client Name" />
            </div>
            <div class="form-group">
              <label class="form-label">Client Email *</label>
              <input type="email" name="email" required class="form-control" placeholder="client@company.com" />
            </div>
          </div>
          <div class="grid-3" style="gap:14px;">
            <div class="form-group">
              <label class="form-label">Phone / WhatsApp</label>
              <input type="text" name="phone" class="form-control" placeholder="+234 ..." />
            </div>
            <div class="form-group">
              <label class="form-label">Company</label>
              <input type="text" name="company" class="form-control" placeholder="Company Name" />
            </div>
            <div class="form-group">
              <label class="form-label">Service Track</label>
              <select name="service_interest" class="form-control">
                <option value="Data Analytics & BI">Data Analytics &amp; BI</option>
                <option value="Full-Stack Web Development">Full-Stack Web Development</option>
                <option value="AI & Workflow Automation">AI &amp; Workflow Automation</option>
                <option value="Tech Tutorials & Mentorship">Tech Tutorials &amp; Mentorship</option>
                <option value="Graphic Design & Video">Graphic Design &amp; Video</option>
                <option value="IT & Customer Support">IT &amp; Customer Support</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Admin Notes</label>
            <input type="text" name="admin_notes" class="form-control" placeholder="Initial project scope or onboarding notes..." />
          </div>
          <button type="submit" class="btn btn-lime">Add Client to Database →</button>
        </form>
      </div>
    `;
  }

  async updateClientField(clientId, updates) {
    try {
      await this.api(`/api/clients/${clientId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      await this.loadAdminData();
      if (typeof this.loadDashboardData === 'function') await this.loadDashboardData(true);
      this.showToast('Client record updated.');
      this.render();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  async deleteClient(clientId) {
    try {
      await this.api(`/api/clients/${clientId}`, { method: 'DELETE' });
      await this.loadAdminData();
      if (typeof this.loadDashboardData === 'function') await this.loadDashboardData(true);
      this.showToast('Client removed.');
      this.render();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  async handleAdminAddClient(e) {
    e.preventDefault();
    const form = e.target;
    try {
      await this.api('/api/clients', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.value,
          email: form.email.value,
          phone: form.phone.value,
          company: form.company.value,
          service_interest: form.service_interest.value,
          admin_notes: form.admin_notes.value,
          status: 'ACTIVE'
        })
      });
      await this.loadAdminData();
      form.reset();
      this.showToast('New client added to CRM!');
      this.render();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  renderAdminInquiriesTab() {
    return `
      <div class="grid-2">
        ${this.inquiries
          .map(
            (inq) => `
          <div class="glass-card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
              <span class="tech-pill lime">${inq.service_category}</span>
              <span class="tech-pill orange">${inq.status || 'NEW'}</span>
            </div>
            <h3 style="font-size:19px;font-weight:800;">${inq.name}</h3>
            <div style="font-size:13px;color:#C8E61E;margin-bottom:10px;">
              ${inq.email} • ${inq.phone || 'No phone'}
            </div>
            <p style="font-size:14px;color:var(--yole-text-muted);background:rgba(15,13,44,0.7);padding:12px;border-radius:10px;margin-bottom:14px;">
              ${inq.message}
            </p>

            <div class="grid-2" style="gap:12px;margin-bottom:12px;">
              <div>
                <label class="form-label">Status</label>
                <select class="form-control" onchange="window.app.updateInquiry(${inq.id}, { status: this.value })">
                  <option value="NEW" ${inq.status === 'NEW' ? 'selected' : ''}>NEW</option>
                  <option value="IN_PROGRESS" ${inq.status === 'IN_PROGRESS' ? 'selected' : ''}>IN_PROGRESS</option>
                  <option value="RESOLVED" ${inq.status === 'RESOLVED' ? 'selected' : ''}>RESOLVED</option>
                </select>
              </div>
              <div>
                <label class="form-label">Progress (${inq.project_progress || 15}%)</label>
                <input type="range" min="0" max="100" step="5" value="${inq.project_progress || 15}" class="form-control" onchange="window.app.updateInquiry(${inq.id}, { project_progress: Number(this.value) })" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Status Note Visible in Client Portal</label>
              <input type="text" class="form-control" value="${(inq.admin_response || '').replace(/"/g, '&quot;')}" onchange="window.app.updateInquiry(${inq.id}, { admin_response: this.value })" placeholder="Write milestone update for client..." />
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.1);">
              <div style="display:flex;gap:8px;">
                <a href="mailto:${inq.email}" class="btn btn-outline btn-sm" style="padding:5px 10px;font-size:11.5px;">Email Client</a>
                ${
                  inq.phone
                    ? `<a href="https://wa.me/${inq.phone.replace(/[^0-9]/g, '')}" target="_blank" class="btn btn-lime btn-sm" style="padding:5px 10px;font-size:11.5px;">WhatsApp</a>`
                    : ''
                }
              </div>
              <button class="btn btn-outline btn-sm" style="padding:5px 10px;font-size:11.5px;border-color:#ef4444;color:#ef4444;" onclick="window.app.deleteInquiry(${inq.id})">
                Delete Inquiry
              </button>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  async deleteInquiry(id) {
    try {
      await this.api(`/api/inquiries/${id}`, { method: 'DELETE' });
      await this.loadAdminData();
      this.showToast('Project inquiry deleted.');
      this.render();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  async updateInquiry(id, updates) {
    try {
      await this.api(`/api/inquiries/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      await this.loadAdminData();
      this.showToast('Project inquiry updated.');
      this.render();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  renderAdminBlogTab() {
    const editing = this.editingBlogPost;
    return `
      <div class="grid-2" style="align-items:start;">
        <div class="glass-card">
          <div class="eyebrow"><span class="eyebrow-dot"></span> BLOG PUBLISHER</div>
          <h3 style="font-size:21px;font-weight:900;margin-bottom:14px;">
            ${editing ? `Edit Article: ${editing.title}` : 'Publish New Blog Article'}
          </h3>

          <form onsubmit="window.app.handleAdminBlogPublish(event)">
            <div class="form-group">
              <label class="form-label">Article Title *</label>
              <input type="text" name="title" required class="form-control" value="${editing ? editing.title.replace(/"/g, '&quot;') : ''}" placeholder="e.g. Automating SQL Reports with Python & Power BI" />
            </div>
            <div class="grid-2" style="gap:12px;">
              <div class="form-group">
                <label class="form-label">Category</label>
                <select name="category" class="form-control">
                  <option value="Data Analytics & BI" ${editing?.category === 'Data Analytics & BI' ? 'selected' : ''}>Data Analytics &amp; BI</option>
                  <option value="Full-Stack Web Development" ${editing?.category === 'Full-Stack Web Development' ? 'selected' : ''}>Full-Stack Web Development</option>
                  <option value="Python & Machine Learning" ${editing?.category === 'Python & Machine Learning' ? 'selected' : ''}>Python &amp; Machine Learning</option>
                  <option value="AI & Workflow Automation" ${editing?.category === 'AI & Workflow Automation' ? 'selected' : ''}>AI &amp; Workflow Automation</option>
                  <option value="Tech Tutorials & Mentorship" ${editing?.category === 'Tech Tutorials & Mentorship' ? 'selected' : ''}>Tech Tutorials &amp; Mentorship</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Read Time</label>
                <input type="text" name="readTime" class="form-control" value="${editing ? editing.readTime : '5 min read'}" />
              </div>
            </div>
            <div class="grid-2" style="gap:12px;">
              <div class="form-group">
                <label class="form-label">Tags (comma-separated)</label>
                <input type="text" name="tags" class="form-control" value="${editing ? (editing.tags || []).join(', ') : 'Python, SQL, Power BI'}" />
              </div>
              <div class="form-group">
                <label class="form-label">Cover Image</label>
                <input type="text" name="coverImage" class="form-control" value="${editing ? editing.coverImage || '/assets/dashboard-preview.jpg' : '/assets/dashboard-preview.jpg'}" placeholder="/assets/dashboard-preview.jpg" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Executive Summary *</label>
              <textarea name="summary" rows="2" required class="form-control" placeholder="Brief summary shown on blog cards...">${editing ? editing.summary : ''}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Markdown Article Body *</label>
              <textarea name="body" rows="7" required class="form-control" placeholder="## Introduction\n\nWrite your technical tutorial or insight in Markdown...">${editing ? editing.body : ''}</textarea>
            </div>
            <div style="display:flex;gap:10px;">
              <button type="submit" class="btn btn-lime" style="flex:1;">
                ${editing ? 'Save Changes to Markdown →' : 'Publish Markdown Article →'}
              </button>
              ${
                editing
                  ? `<button type="button" class="btn btn-outline" onclick="window.app.editingBlogPost=null;window.app.render();">Cancel</button>`
                  : ''
              }
            </div>
          </form>
        </div>

        <div class="glass-card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h3 style="font-size:20px;font-weight:900;">Published Articles</h3>
          </div>
          <div style="display:flex;flex-direction:column;gap:12px;">
            ${this.blogPosts
              .map(
                (p) => `
              <div style="padding:14px;background:rgba(15,13,44,0.75);border:1px solid rgba(255,255,255,0.12);border-radius:12px;display:flex;justify-content:space-between;align-items:center;gap:12px;">
                <div>
                  <div style="font-weight:800;font-size:15px;">${p.title}</div>
                  <div style="font-size:12px;color:#C8E61E;">${p.category} • ${p.date}</div>
                </div>
                <div style="display:flex;gap:6px;">
                  <button class="btn btn-outline btn-sm" onclick="window.app.startEditBlogPost('${p.slug}')">Edit</button>
                  <button class="btn btn-outline btn-sm" onclick="window.app.navigate('blog-detail', '${p.slug}')">View</button>
                  <button class="btn btn-outline btn-sm" style="border-color:#ef4444;color:#ef4444;" onclick="window.app.deleteBlogPost('${p.slug}')">Delete</button>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      </div>
    `;
  }

  startEditBlogPost(slug) {
    const found = this.blogPosts.find((p) => p.slug === slug);
    if (found) {
      this.editingBlogPost = found;
      this.render();
    }
  }

  async handleAdminBlogPublish(e) {
    e.preventDefault();
    const form = e.target;
    const payload = {
      title: form.title.value,
      category: form.category.value,
      readTime: form.readTime.value,
      tags: form.tags.value,
      coverImage: form.coverImage?.value || '/assets/dashboard-preview.jpg',
      summary: form.summary.value,
      body: form.body.value
    };
    try {
      if (this.editingBlogPost) {
        await this.api(`/api/blog/${this.editingBlogPost.slug}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        this.editingBlogPost = null;
        this.showToast('Markdown article updated!');
      } else {
        await this.api('/api/blog', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        this.showToast('Markdown article saved to /content/blog and published!');
      }
      await this.loadPublicData();
      form.reset();
      this.render();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  async deleteBlogPost(slug) {
    try {
      await this.api(`/api/blog/${slug}`, { method: 'DELETE' });
      await this.loadPublicData();
      this.showToast('Article deleted.');
      this.render();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  renderAdminPortfolioTab() {
    const editing = this.editingPortfolioProject;
    return `
      <div class="grid-2" style="align-items:start;">
        <div class="glass-card">
          <div class="eyebrow"><span class="eyebrow-dot"></span> PORTFOLIO PUBLISHER (DECAP BRIDGE)</div>
          <h3 style="font-size:20px;font-weight:900;margin-bottom:14px;">
            ${editing ? `Edit Project: ${editing.title}` : '+ Add Portfolio Case Study'}
          </h3>
          <form onsubmit="window.app.handleAdminPortfolioAdd(event)">
            <div class="form-group">
              <label class="form-label">Project Title *</label>
              <input type="text" name="title" required class="form-control" value="${editing ? editing.title.replace(/"/g, '&quot;') : ''}" placeholder="Project Title" />
            </div>
            <div class="grid-2" style="gap:12px;">
              <div class="form-group">
                <label class="form-label">Category</label>
                <select name="category" class="form-control">
                  <option value="Data Analytics & BI" ${editing?.category === 'Data Analytics & BI' ? 'selected' : ''}>Data Analytics &amp; BI</option>
                  <option value="Full-Stack Web" ${editing?.category === 'Full-Stack Web' ? 'selected' : ''}>Full-Stack Web</option>
                  <option value="AI & Machine Learning" ${editing?.category === 'AI & Machine Learning' ? 'selected' : ''}>AI &amp; Machine Learning</option>
                  <option value="AI & Workflow Automation" ${editing?.category === 'AI & Workflow Automation' ? 'selected' : ''}>AI &amp; Workflow Automation</option>
                  <option value="Tech Tutorials & Training" ${editing?.category === 'Tech Tutorials & Training' ? 'selected' : ''}>Tech Tutorials &amp; Training</option>
                  <option value="Graphic Design & Video" ${editing?.category === 'Graphic Design & Video' ? 'selected' : ''}>Graphic Design &amp; Video</option>
                  <option value="IT & Customer Support" ${editing?.category === 'IT & Customer Support' ? 'selected' : ''}>IT &amp; Customer Support</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Project Card Image URL *</label>
              <input type="text" name="preview_image" required class="form-control" value="${editing ? editing.preview_image : '/assets/dashboard-preview.jpg'}" placeholder="/assets/project-preview.jpg" />
            </div>
            <div class="grid-2" style="gap:12px;">
              <div class="form-group">
                <label class="form-label">Live Demo Project URL (Optional)</label>
                <input type="url" name="demo_url" class="form-control" value="${editing ? (editing.demo_url || editing.live_url || '').replace(/"/g, '&quot;') : ''}" placeholder="https://demo.yolestica.com or Kaggle/Dashboard link" />
              </div>
              <div class="form-group">
                <label class="form-label">GitHub / Source URL (Optional)</label>
                <input type="url" name="github_url" class="form-control" value="${editing ? (editing.github_url || '').replace(/"/g, '&quot;') : 'https://github.com/Eniekpo'}" placeholder="https://github.com/Eniekpo/..." />
              </div>
            </div>
            <div class="form-group portfolio-featured-field">
              <label class="portfolio-featured-label">
                <input type="checkbox" name="featured" ${editing?.featured !== false ? 'checked' : ''} />
                <span>Feature this project on the home page</span>
              </label>
            </div>
            <div style="display:flex;gap:10px;">
              <button type="submit" class="btn btn-lime" style="flex:1;">
                ${editing ? 'Save Project Changes →' : 'Publish Project →'}
              </button>
              ${
                editing
                  ? `<button type="button" class="btn btn-outline" onclick="window.app.editingPortfolioProject=null;window.app.render();">Cancel</button>`
                  : ''
              }
            </div>
          </form>
        </div>

        <div class="glass-card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
            <h3 style="font-size:20px;font-weight:900;">Published Portfolio Projects</h3>
            <a href="/admin/" target="_blank" class="btn btn-outline btn-sm">Open Decap CMS ↗</a>
          </div>
          <div style="display:flex;flex-direction:column;gap:12px;">
            ${this.portfolio
              .map(
                (p) => `
              <div style="padding:14px;background:rgba(15,13,44,0.75);border:1px solid rgba(255,255,255,0.12);border-radius:12px;display:flex;justify-content:space-between;align-items:center;gap:12px;">
                <div>
                  <div style="font-weight:800;font-size:15px;">${p.title}</div>
                  <div style="font-size:12px;color:#C8E61E;">${p.category} • ${p.organization}</div>
                  ${
                    p.demo_url || p.live_url
                      ? `<div style="font-size:11.5px;margin-top:2px;"><a href="${p.demo_url || p.live_url}" target="_blank" style="color:#F7941D;">🔗 Demo: ${p.demo_url || p.live_url}</a></div>`
                      : ''
                  }
                </div>
                <div style="display:flex;gap:6px;">
                  <button class="btn btn-outline btn-sm" onclick="window.app.startEditPortfolioProject('${p.slug || p.id}')">Edit</button>
                  <button class="btn btn-outline btn-sm" style="border-color:#ef4444;color:#ef4444;" onclick="window.app.deletePortfolioProject('${p.slug || p.id}')">Delete</button>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      </div>
    `;
  }

  startEditPortfolioProject(slugOrId) {
    const found = this.portfolio.find((p) => String(p.slug || p.id) === String(slugOrId));
    if (found) {
      this.editingPortfolioProject = found;
      this.render();
    }
  }

  async handleAdminPortfolioAdd(e) {
    e.preventDefault();
    const form = e.target;
    const payload = {
      title: form.title.value,
      category: form.category.value,
      preview_image: form.preview_image?.value || '/assets/dashboard-preview.jpg',
      demo_url: form.demo_url?.value || '',
      github_url: form.github_url?.value || '',
      featured: form.featured.checked
    };
    try {
      if (this.editingPortfolioProject) {
        const targetSlug = this.editingPortfolioProject.slug || this.editingPortfolioProject.id;
        await this.api(`/api/portfolio/${targetSlug}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        this.editingPortfolioProject = null;
        this.showToast('Portfolio project updated!');
      } else {
        await this.api('/api/portfolio', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        this.showToast('Portfolio project published!');
      }
      await this.loadPublicData();
      form.reset();
      this.render();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  async deletePortfolioProject(slugOrId) {
    try {
      await this.api(`/api/portfolio/${slugOrId}`, { method: 'DELETE' });
      await this.loadPublicData();
      this.showToast('Portfolio project removed.');
      this.render();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  renderAdminTestimonialsTab() {
    return `
      <div class="grid-2" style="align-items:start;">
        <div class="glass-card">
          <h3 style="font-size:20px;font-weight:900;margin-bottom:14px;">+ Add Verified Testimonial</h3>
          <form onsubmit="window.app.handleTestimonialSubmit(event)">
            <div class="form-group">
              <label class="form-label">Client / Mentee Full Name *</label>
              <input type="text" name="author_name" required class="form-control" placeholder="Client or mentee full name" />
            </div>
            <div class="grid-2" style="gap:12px;">
              <div class="form-group">
                <label class="form-label">Role / Title</label>
                <input type="text" name="author_role" class="form-control" placeholder="e.g. Research Director" />
              </div>
              <div class="form-group">
                <label class="form-label">Company / Organization</label>
                <input type="text" name="company" class="form-control" placeholder="Organization Name" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Service Track</label>
              <select name="service_track" class="form-control">
                <option value="Data Analytics & BI">Data Analytics &amp; BI</option>
                <option value="Full-Stack Web Development">Full-Stack Web Development</option>
                <option value="AI & Workflow Automation">AI &amp; Workflow Automation</option>
                <option value="Tech Tutorials & Mentorship">Tech Tutorials &amp; Mentorship</option>
                <option value="IT & Database Support">IT &amp; Database Support</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Testimonial Message *</label>
              <textarea name="content" rows="4" required class="form-control" placeholder="Client endorsement..."></textarea>
            </div>
            <button type="submit" class="btn btn-lime" style="width:100%;">Add Testimonial →</button>
          </form>
        </div>

        <div class="glass-card">
          <h3 style="font-size:20px;font-weight:900;margin-bottom:14px;">Published Testimonials (${this.testimonials.length})</h3>
          <div style="display:flex;flex-direction:column;gap:12px;">
            ${this.testimonials
              .map(
                (t) => `
              <div style="padding:14px;background:rgba(15,13,44,0.75);border:1px solid rgba(255,255,255,0.12);border-radius:12px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;gap:8px;flex-wrap:wrap;">
                  <div>
                    <strong style="font-size:15px;">${t.author_name}</strong>
                    <span style="font-size:12px;color:#C8E61E;margin-left:8px;">${t.service_track}</span>
                    <span class="tech-pill ${t.approved ? 'lime' : 'orange'}" style="font-size:10px;padding:2px 8px;margin-left:6px;">
                      ${t.approved ? 'Approved' : 'Hidden'}
                    </span>
                  </div>
                  <div style="display:flex;gap:6px;">
                    <button class="btn btn-outline btn-sm" style="padding:4px 10px;font-size:11.5px;" onclick="window.app.toggleTestimonialApproval(${t.id}, ${t.approved ? 0 : 1})">
                      ${t.approved ? 'Hide' : 'Approve'}
                    </button>
                    <button class="btn btn-outline btn-sm" style="border-color:#ef4444;color:#ef4444;padding:4px 10px;font-size:11.5px;" onclick="window.app.deleteTestimonial(${t.id})">
                      Delete
                    </button>
                  </div>
                </div>
                <div style="font-size:12px;color:var(--yole-text-muted);margin-bottom:6px;">${t.author_role} • ${t.company}</div>
                <p style="font-size:13px;color:#FFFFFF;font-style:italic;">"${t.content}"</p>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      </div>
    `;
  }

  async toggleTestimonialApproval(id, approved) {
    try {
      await this.api(`/api/testimonials/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ approved })
      });
      await this.loadPublicData();
      this.showToast(approved ? 'Testimonial approved!' : 'Testimonial hidden from public view.');
      this.render();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  async deleteTestimonial(id) {
    try {
      await this.api(`/api/testimonials/${id}`, { method: 'DELETE' });
      await this.loadPublicData();
      this.showToast('Testimonial removed.');
      this.render();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  // ==========================================================================
  // MASTER RENDER
  // ==========================================================================
  render() {
    const root = document.getElementById('app-root');
    if (!root) return;
    const pageChanged = this.renderedPage !== this.currentPage;

    const activeEl = document.activeElement;
    const preserveSearchFocus = activeEl && activeEl.id === 'admin-client-search';
    const selStart = preserveSearchFocus ? activeEl.selectionStart : null;
    const selEnd = preserveSearchFocus ? activeEl.selectionEnd : null;

    let pageContent = '';
    switch (this.currentPage) {
      case 'home':
        pageContent = this.renderHomePage();
        break;
      case 'dashboard':
        pageContent = typeof this.renderDashboardPage === 'function' ? this.renderDashboardPage() : this.renderHomePage();
        break;
      case 'about':
        pageContent = this.renderAboutPage();
        break;
      case 'services':
        pageContent = this.renderServicesPage();
        break;
      case 'portfolio':
        pageContent = this.renderPortfolioPage();
        break;
      case 'testimonials':
        pageContent = this.renderTestimonialsPage();
        break;
      case 'blog':
        pageContent = this.renderBlogPage();
        break;
      case 'blog-detail':
        pageContent = this.renderBlogPostDetail();
        break;
      case 'contact':
        pageContent = this.renderContactPage();
        break;
      case 'login':
        pageContent = this.renderAuthPage();
        break;
      case 'portal':
        pageContent = this.renderClientPortalPage();
        break;
      case 'admin-dashboard':
        pageContent = this.renderAdminDashboardPage();
        break;
      default:
        pageContent = this.renderHomePage();
    }

    root.innerHTML = `
      ${this.renderHeader()}
      <main class="${pageChanged ? 'page-enter' : ''}">${pageContent}</main>
      ${this.renderFooter()}
      <div id="toast-container"></div>
    `;
    this.renderedPage = this.currentPage;
    if (pageChanged) {
      const page = root.querySelector('main.page-enter');
      if (page) {
        const finishPageAnimation = (event) => {
          if (event.target === page && event.animationName === 'site-page-enter') {
            page.classList.remove('page-enter');
            page.removeEventListener('animationend', finishPageAnimation);
          }
        };
        page.addEventListener('animationend', finishPageAnimation);
      }
    }
    this.renderToast();
    this.initKpiCounters(root);
    if (this.currentPage === 'dashboard' && typeof this.mountDashboard === 'function') {
      this.mountDashboard();
    }

    if (preserveSearchFocus) {
      const searchInput = document.getElementById('admin-client-search');
      if (searchInput) {
        searchInput.focus();
        if (selStart !== null && selEnd !== null) {
          searchInput.setSelectionRange(selStart, selEnd);
        }
      }
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new YoletechApp();
  window.app.init();
});
