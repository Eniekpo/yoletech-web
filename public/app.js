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
    this.portalTab = 'overview';
    this.portalProjectFilter = 'ALL';
    this.showPortalPassword = false;
    this.adminWorkspace = 'crm';
    this.adminTab = 'clients';
    this.milestoneSearch = '';
    this.milestoneStageFilter = 'ALL';
    this.milestonePage = 1;
    this.milestoneLimit = 10;
    this.footerTab = 'overview';
    this.clientSearch = '';
    this.clientStatusFilter = 'ALL';
    this.adminClientDateFrom = '';
    this.adminClientDateTo = '';
    this.adminDateFilteredClients = null;
    this.adminDateFilterError = '';
    this.adminClientPage = 1;
    this.adminClientLimit = 30;
    this.testimonialPage = 1;
    this.testimonialLimit = 8;
    this.testimonialTrackFilter = 'ALL';
    this.testimonialSearch = '';
    this.testimonialFormRating = 5;
    this.portfolioSearch = '';
    this.activePortfolioModal = null;
    this.blogSearch = '';
    this.contactServiceSelected = 'Data Analysis & Analytics';
    this.mobileMenuOpen = false;
    this.editingBlogPost = null;
    this.editingPortfolioProject = null;

    this.token = localStorage.getItem('yoletech_token') || null;
    this.user = JSON.parse(localStorage.getItem('yoletech_user') || 'null');

    this.portfolio = window.YOLETECH_DATA?.defaultPortfolio || [];
    this.testimonials = window.YOLETECH_DATA?.defaultTestimonials || [];
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
    this.bindScrollProgress();
    this.applyTheme(this.theme, false);
    this.bindThemeListener();
    this.resolveInitialRoute();
    this.render();
    this.startSlideshow();
    await this.loadPublicData();
    await this.verifySession();
    this.render();
    if (
      this.currentPage === 'dashboard' &&
      this.user &&
      this.getUserRole(this.user) === 'ADMIN' &&
      typeof this.loadDashboardData === 'function'
    ) {
      try {
        await this.loadDashboardData(true);
        this.render();
      } catch (e) {
        console.warn('Dashboard pre-load notice:', e);
      }
    }
  }

  bindScrollProgress() {
    if (this._scrollBound) return;
    this._scrollBound = true;
    const updateProgress = () => {
      const bar = document.getElementById('scroll-progress-bar');
      if (!bar) return;
      const docEl = document.documentElement;
      const scrollTop = window.scrollY || docEl.scrollTop || 0;
      const scrollHeight = Math.max(1, docEl.scrollHeight - docEl.clientHeight);
      const pct = Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100));
      bar.style.width = `${pct}%`;
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress, { passive: true });
  }

  initScrollReveal(rootEl = document) {
    if (!rootEl || !rootEl.querySelectorAll) return;
    const revealTargets = rootEl.querySelectorAll(
      '.glass-card, .metric-cell, .section-header, .about-info-card, .dash-card, .dash-kpi, .service-strip-item'
    );
    if (!revealTargets.length) return;

    if (!('IntersectionObserver' in window)) {
      revealTargets.forEach((el) => el.classList.add('is-revealed'));
      return;
    }

    if (this.revealObserver && rootEl === document) {
      this.revealObserver.disconnect();
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -24px 0px' }
    );

    if (rootEl === document) {
      this.revealObserver = observer;
    }

    revealTargets.forEach((el, idx) => {
      if (!el.classList.contains('is-revealed')) {
        el.classList.add('reveal-on-scroll');
        el.style.setProperty('--reveal-delay', `${(idx % 6) * 45}ms`);
        observer.observe(el);
      }
    });
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
      'learn',
      'learn-dashboard',
      'portfolio',
      'testimonials',
      'blog',
      'contact',
      'privacy',
      'terms',
      'cookies',
      'login',
      'register',
      'signup',
      'portal',
      'admin-dashboard'
    ];
    if (!path || path === '' || path === 'index.html') {
      this.currentPage = 'home';
    } else if (path === 'learn/dashboard') {
      this.currentPage = 'learn-dashboard';
      if (queryPage || hashPage) {
        window.history.replaceState({}, '', '/learn/dashboard');
      }
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
      if (path === 'register' || path === 'signup') {
        this.currentPage = 'login';
        this.authMode = 'register';
        if (path === 'signup' || queryPage || hashPage) {
          window.history.replaceState({}, '', '/register');
        }
      } else {
        this.currentPage = path;
        if (queryPage || hashPage) {
          window.history.replaceState({}, '', path === 'home' ? '/' : `/${path}`);
        }
      }
    } else {
      this.currentPage = 'not-found';
    }
  }

  async api(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    const res = await fetch(endpoint, { credentials: 'same-origin', ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Request failed');
    }
    return data;
  }

  getLocalRegisteredUsers() {
    try {
      const rows = JSON.parse(localStorage.getItem('yoletech_registered_clients') || '[]');
      return Array.isArray(rows)
        ? rows.filter(
            (u) =>
              u &&
              String(u.email || '').toLowerCase() !== 'client@example.com' &&
              !String(u.admin_notes || '').startsWith('Synthetic client partner record')
          )
        : [];
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

  removeLocalRegisteredUser(clientId, email = '') {
    try {
      const normEmail = String(email || '').trim().toLowerCase();
      const list = this.getLocalRegisteredUsers().filter((u) => {
        if (normEmail && String(u.email || '').trim().toLowerCase() === normEmail) return false;
        if (clientId !== undefined && clientId !== null && String(u.id) === String(clientId)) return false;
        return true;
      });
      localStorage.setItem('yoletech_registered_clients', JSON.stringify(list));
    } catch (e) {
      console.warn('Local user delete warning:', e);
    }
  }

  async syncLocalClientsToServer() {
    try {
      const localClients = this.getLocalRegisteredUsers().filter(
        (u) => u && u.email && String(u.role || 'CLIENT').toUpperCase() === 'CLIENT'
      );
      const localInquiries = this.getLocalInquiries().filter((i) => i && i.email && i.message);
      if (!localClients.length && !localInquiries.length) return;
      await this.api('/api/analytics/sync', {
        method: 'POST',
        body: JSON.stringify({
          clients: localClients.map(({ _pwd, ...rest }) => rest),
          inquiries: localInquiries
        })
      });
    } catch {
      // Ignore sync notice when offline
    }
  }

  getLocalInquiries() {
    try {
      const rows = JSON.parse(localStorage.getItem('yoletech_local_inquiries') || '[]');
      return Array.isArray(rows)
        ? rows.filter(
            (i) =>
              i &&
              String(i.email || '').toLowerCase() !== 'client@example.com' &&
              !/^Inquiry #\d+: Project scope for /.test(String(i.message || ''))
          )
        : [];
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
      let currentScalarKey = null;

      for (const line of lines) {
        const listItemMatch = line.match(/^\s*-\s+(.+)$/);
        if (listItemMatch && (currentListKey || currentScalarKey)) {
          const targetKey = currentListKey || currentScalarKey;
          if (!Array.isArray(meta[targetKey])) meta[targetKey] = [];
          currentListKey = targetKey;
          currentScalarKey = null;
          let itemVal = listItemMatch[1].trim();
          if ((itemVal.startsWith('"') && itemVal.endsWith('"')) || (itemVal.startsWith("'") && itemVal.endsWith("'"))) {
            itemVal = itemVal.slice(1, -1);
          }
          meta[targetKey].push(itemVal);
          continue;
        }
        if (/^\s+\S/.test(line) && currentScalarKey) {
          const cont = line.trim();
          meta[currentScalarKey] = meta[currentScalarKey]
            ? `${meta[currentScalarKey]} ${cont}`
            : cont;
          continue;
        }
        const kvMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
        if (!kvMatch) continue;
        const key = kvMatch[1].trim();
        let val = kvMatch[2].trim();
        if (val === '' || val === '>-' || val === '>' || val === '|-' || val === '|') {
          currentListKey = key;
          currentScalarKey = key;
          meta[key] = '';
          continue;
        }
        currentListKey = null;
        currentScalarKey = key;
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (val.startsWith('[') && val.endsWith(']')) {
          try {
            meta[key] = JSON.parse(val);
            currentScalarKey = null;
            continue;
          } catch {}
        }
        meta[key] = val;
      }
      for (const k of Object.keys(meta)) {
        if (typeof meta[k] === 'string') {
          meta[k] = meta[k].replace(/\s{2,}/g, ' ').trim();
        }
      }
    }
    return { slug, meta, body };
  }

  resolvePortfolioImage(previewImage, slug = '') {
    const slugMap = {
      'build-an-interactive-sales-dashboard-with-python-and-streamlit': '/assets/blog/streamlite-python-dashboard.png',
      'executive-business-intelligence-sales-forecasting-platform': '/assets/blog/executive_bi_linkedin_carousel.png',
      'from-housing-data-to-an-interactive-ml-app-predicting-real-estate-prices-with-python-scikit-learn-and-streamlit': '/assets/blog/real-estate-ml-model.png',
      'ow-to-automate-excel-reports-using-python-and-pandas': '/assets/blog/automate-excel-sales-reports-with-python-and-pandas.png',
      'how-to-automate-excel-reports-using-python-and-pandas': '/assets/blog/automate-excel-sales-reports-with-python-and-pandas.png',
      'predicting-real-estate-prices-with-python-and-scikit-learn': '/assets/blog/predicting-real-estate-prices-with-python-and-scikit-learn.png'
    };
    const legacyImageMap = {
      '/assets/blog/file_000000009ec871fd95c9cf798e33307c.png': '/assets/blog/streamlite-python-dashboard.png',
      '/assets/blog/1775645513292-file_00000000aaac720ab0333199e7794a7b.png': '/assets/blog/executive_bi_linkedin_carousel.png',
      '/assets/blog/Gemini_Generated_Image_bfpxp1bfpxp1bfpx.png': '/assets/blog/real-estate-ml-model.png',
      '/assets/blog/file_00000000ca2c724692ed9d7b1ff18db5.png': '/assets/blog/automate-excel-sales-reports-with-python-and-pandas.png',
      '/assets/blog/Gemini_Generated_Image_bfpxp1bfpxp1bfpx (1).png': '/assets/blog/predicting-real-estate-prices-with-python-and-scikit-learn.png'
    };
    const cleanImg = String(previewImage || '').trim();
    if (cleanImg && legacyImageMap[cleanImg]) {
      return legacyImageMap[cleanImg];
    }
    if (slug && slugMap[slug] && (!cleanImg || /file_0000|Gemini_Generated_Image/i.test(cleanImg))) {
      return slugMap[slug];
    }
    if (cleanImg) return cleanImg;
    if (slug && slugMap[slug]) return slugMap[slug];
    return '/assets/dashboard-preview.jpg';
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
              impact_metrics: meta.impact_metrics || 'Production architecture & delivery',
              tech_stack: techStack,
              preview_image: this.resolvePortfolioImage(meta.preview_image, slug),
              demo_url: meta.demo_url || meta.live_url || '',
              live_url: meta.demo_url || meta.live_url || '',
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
              coverImage: meta.coverImage || '',
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
    if (this.portfolio.length === 0 && window.YOLETECH_DATA?.defaultPortfolio) {
      this.portfolio = window.YOLETECH_DATA.defaultPortfolio;
    }
    this.portfolio = (this.portfolio || []).map((p) => ({
      ...p,
      preview_image: this.resolvePortfolioImage(p.preview_image, p.slug)
    }));
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

  getUserRole(user = this.user) {
    return String(user?.role || 'CLIENT').trim().toUpperCase();
  }

  getPortalRouteForRole(role) {
    const normalized = String(role || 'CLIENT').trim().toUpperCase();
    if (normalized === 'ADMIN') return 'admin-dashboard';
    if (normalized === 'LEARNER') return 'learn-dashboard';
    return 'portal';
  }

  async verifySession() {
    try {
      await this.syncLocalClientsToServer();
      const { user } = await this.api('/api/auth/me');
      this.user = { ...user, role: this.getUserRole(user) };
      localStorage.setItem('yoletech_user', JSON.stringify(this.user));
    } catch {
      // Preserve locally stored authenticated session if serverless container restarted
      if (!this.user) {
        this.logout(false);
        return;
      }
      this.user = { ...this.user, role: this.getUserRole(this.user) };
    }
    if (this.user?.email) {
      const localMatch = this.getLocalRegisteredUsers().find(
        (u) => String(u.email || '').toLowerCase() === String(this.user.email).toLowerCase()
      );
      if (localMatch && localMatch.updated_at && localMatch.status && localMatch.status !== this.user.status) {
        this.user = { ...this.user, status: localMatch.status };
        localStorage.setItem('yoletech_user', JSON.stringify(this.user));
      }
    }
    const role = this.getUserRole(this.user);
    if (role === 'ADMIN') {
      await this.loadAdminData();
    } else if (role === 'LEARNER') {
      if (this.currentPage === 'portal') {
        this.currentPage = 'learn-dashboard';
        window.history.replaceState({}, '', '/learn/dashboard');
      }
      if (typeof this.loadLearnerDashboardData === 'function') {
        await this.loadLearnerDashboardData(true);
      }
    } else if (this.user) {
      if (this.currentPage === 'learn-dashboard') {
        this.currentPage = 'portal';
        window.history.replaceState({}, '', '/portal');
      }
      await this.loadClientData();
    }
  }

  async loadAdminData() {
    await this.syncLocalClientsToServer();
    let apiClients = [];
    let apiInquiries = [];
    let dateFilteredApiClients = null;
    try {
      const data = await this.api('/api/clients');
      apiClients = data.clients || [];
      apiInquiries = data.inquiries || [];
    } catch (err) {
      console.warn('Admin API fallback used:', err.message);
    }

    if (this.adminClientDateFrom || this.adminClientDateTo) {
      const params = new URLSearchParams();
      if (this.adminClientDateFrom) params.set('from', this.adminClientDateFrom);
      if (this.adminClientDateTo) params.set('to', this.adminClientDateTo);
      try {
        const data = await this.api(`/api/clients?${params.toString()}`);
        dateFilteredApiClients = data.clients || [];
        this.adminDateFilterError = '';
      } catch (err) {
        this.adminDateFilterError = err.message || 'Could not filter clients by date.';
        console.error('Admin date filter failed:', err);
      }
    } else {
      this.adminDateFilterError = '';
    }

    const localUsers = this.getLocalRegisteredUsers().filter(
      (u) => u && String(u.role || 'CLIENT').trim().toUpperCase() === 'CLIENT'
    );
    const mergedClients = [...apiClients];
    localUsers.forEach((lu) => {
      if (!mergedClients.some((c) => String(c.email).toLowerCase() === String(lu.email).toLowerCase())) {
        mergedClients.unshift(lu);
      }
    });
    this.clients = mergedClients;
    this.adminDateFilteredClients = dateFilteredApiClients
      ? [
          ...dateFilteredApiClients,
          ...localUsers.filter((lu) => {
            if (dateFilteredApiClients.some((client) => String(client.email).toLowerCase() === String(lu.email).toLowerCase())) {
              return false;
            }
            const createdDate = String(lu.created_at || '').slice(0, 10);
            return (
              /^\d{4}-\d{2}-\d{2}$/.test(createdDate) &&
              (!this.adminClientDateFrom || createdDate >= this.adminClientDateFrom) &&
              (!this.adminClientDateTo || createdDate <= this.adminClientDateTo)
            );
          })
        ]
      : null;

    const localInq = this.getLocalInquiries();
    const mergedInq = apiInquiries.map((i) => ({ ...i }));
    localInq.forEach((li) => {
      const matchIdx = mergedInq.findIndex(
        (i) =>
          String(i.id) === String(li.id) ||
          (String(i.email || '').toLowerCase() === String(li.email || '').toLowerCase() &&
            String(i.message || '').trim() === String(li.message || '').trim())
      );
      if (matchIdx >= 0) {
        const apiItem = mergedInq[matchIdx];
        if (li.updated_at && (!apiItem.updated_at || String(li.updated_at) >= String(apiItem.updated_at))) {
          mergedInq[matchIdx] = {
            ...apiItem,
            status: li.status ?? apiItem.status,
            project_progress: li.project_progress ?? apiItem.project_progress,
            admin_response: li.admin_response ?? apiItem.admin_response
          };
        }
      } else {
        mergedInq.unshift(li);
      }
    });
    this.inquiries = mergedInq;
  }

  async loadClientData() {
    await this.syncLocalClientsToServer();
    let apiInquiries = [];
    try {
      const data = await this.api('/api/inquiries');
      apiInquiries = data.inquiries || [];
    } catch (err) {
      console.warn('Client inquiries local fallback used:', err.message);
    }
    const myEmail = String(this.user?.email || '').toLowerCase();
    const localInq = this.getLocalInquiries().filter((i) => String(i.email || '').toLowerCase() === myEmail);
    const merged = apiInquiries.map((i) => ({ ...i }));
    localInq.forEach((li) => {
      const matchIdx = merged.findIndex(
        (i) =>
          String(i.id) === String(li.id) ||
          (String(i.message || '').trim() === String(li.message || '').trim() &&
            String(i.service_category || '') === String(li.service_category || ''))
      );
      if (matchIdx >= 0) {
        const apiItem = merged[matchIdx];
        if (li.updated_at && (!apiItem.updated_at || String(li.updated_at) >= String(apiItem.updated_at))) {
          merged[matchIdx] = {
            ...apiItem,
            status: li.status ?? apiItem.status,
            project_progress: li.project_progress ?? apiItem.project_progress,
            admin_response: li.admin_response ?? apiItem.admin_response
          };
        }
      } else {
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

  showRegistrationSuccessModal() {
    let modalRoot = document.getElementById('registration-success-modal-root');
    if (!modalRoot) {
      modalRoot = document.createElement('div');
      modalRoot.id = 'registration-success-modal-root';
      document.body.appendChild(modalRoot);
    }

    modalRoot.innerHTML = `
      <div class="registration-success-backdrop" onclick="window.app.closeRegistrationSuccessModal()"></div>
      <div class="registration-success-modal" role="dialog" aria-modal="true" aria-labelledby="registration-success-message" tabindex="-1">
        <button type="button" class="registration-success-close" aria-label="Close" onclick="window.app.closeRegistrationSuccessModal()">×</button>
        <p id="registration-success-message">Sign Up Successful</p>
      </div>
    `;

    this.registrationSuccessPreviousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    modalRoot.querySelector('.registration-success-modal')?.focus();
    this.registrationSuccessEscapeHandler = (event) => {
      if (event.key === 'Escape') this.closeRegistrationSuccessModal();
    };
    window.addEventListener('keydown', this.registrationSuccessEscapeHandler);
  }

  closeRegistrationSuccessModal() {
    const modalRoot = document.getElementById('registration-success-modal-root');
    if (modalRoot) modalRoot.remove();
    if (this.registrationSuccessEscapeHandler) {
      window.removeEventListener('keydown', this.registrationSuccessEscapeHandler);
      this.registrationSuccessEscapeHandler = null;
    }
    document.body.style.overflow = this.registrationSuccessPreviousOverflow || '';
    this.registrationSuccessPreviousOverflow = null;
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
      'Data Analytics & BI Dashboards': 'Data Analysis & Analytics',
      'Data Analytics & Dashboards': 'Data Analysis & Analytics',
      'Database Architecture & Governance': 'Data Analysis & Analytics',
      'AI Automation': 'AI Automation',
      'AI & Machine Learning': 'AI Automation',
      'Python & Machine Learning': 'AI Automation',
      'AI, ML & Workflow Automation': 'AI Automation',
      'AI & Workflow Automation': 'AI Automation',
      'AI & Automation': 'AI Automation',
      'Tech Tutorials': 'Tech Tutorials',
      'Tech Tutorials & Mentorship': 'Tech Tutorials',
      'Tech Tutorials & Training': 'Tech Tutorials',
      'Tech Tutorials & Staff Training': 'Tech Tutorials',
      'Graphic Design': 'Graphic Design',
      'Graphic Design & Video': 'Graphic Design',
      'Graphic Design, Video & IT Support': 'Graphic Design',
      'Video Editing': 'Video Editing',
      'Customer Support': 'Customer Support',
      'IT Support': 'IT Support',
      'IT & Database Support': 'IT Support',
      'IT & Customer Support': 'IT Support'
    };
    this.contactServiceSelected = map[rawService] || 'Data Analysis & Analytics';
    this.navigate('contact');
  }

  async navigate(page, extra = null) {
    this.mobileMenuOpen = false;
    let targetPage = page;
    const role = this.user ? this.getUserRole(this.user) : '';
    if (targetPage === 'portal' && role === 'LEARNER') {
      targetPage = 'learn-dashboard';
    } else if (targetPage === 'learn-dashboard' && role === 'CLIENT') {
      targetPage = 'portal';
    }

    if (targetPage === 'blog-detail' && extra) {
      this.currentPage = 'blog-detail';
      this.activeBlogSlug = extra;
      this.activeBlogPost = this.blogPosts.find((p) => p.slug === extra) || null;
      window.history.pushState({}, '', `/blog/${extra}`);
    } else if (targetPage === 'register') {
      this.currentPage = 'login';
      this.authMode = 'register';
      window.history.pushState({}, '', '/register');
    } else if (targetPage === 'learn-dashboard') {
      this.currentPage = 'learn-dashboard';
      window.history.pushState({}, '', '/learn/dashboard');
    } else {
      this.currentPage = targetPage;
      if (targetPage === 'login' && !extra) this.authMode = 'login';
      const url = targetPage === 'home' ? '/' : `/${targetPage}`;
      window.history.pushState({}, '', url);
    }

    if (this.currentPage === 'admin-dashboard' && role === 'ADMIN') {
      await this.loadAdminData();
      if (this.adminWorkspace === 'learn' && typeof this.loadAdminLearnData === 'function') {
        await this.loadAdminLearnData();
      }
    } else if (this.currentPage === 'portal' && this.user) {
      await this.loadClientData();
    } else if (this.currentPage === 'learn' && typeof this.loadLearnPublicData === 'function') {
      await this.loadLearnPublicData();
      if (typeof this.loadLearnCountries === 'function') {
        void this.loadLearnCountries();
      }
    } else if (this.currentPage === 'learn-dashboard' && this.user && typeof this.loadLearnerDashboardData === 'function') {
      await this.loadLearnerDashboardData(true);
    } else if (this.currentPage === 'dashboard' && typeof this.loadDashboardData === 'function') {
      await this.loadDashboardData(true);
    }

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    this.render();
  }

  startSlideshow() {
    if (this.slideInterval) clearInterval(this.slideInterval);
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
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
      window.YOLETECH_COMPONENTS?.decorateCardIcons(container);
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

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (target <= 0 || reducedMotion) {
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
    this.inquiries = [];
    this.clients = [];
    if (this._learnState) {
      this._learnState.dashboardLoaded = false;
      this._learnState.dashboardLoading = false;
      this._learnState.dashboardProfile = null;
      this._learnState.dashboardEnrollments = [];
      this._learnState.dashboardError = '';
    }
    localStorage.removeItem('yoletech_token');
    localStorage.removeItem('yoletech_user');
    fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
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
        '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
      whatsapp:
        '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.52 3.48A11.86 11.86 0 0 0 12.08 0C5.5 0 .15 5.35.15 11.93c0 2.1.55 4.16 1.6 5.98L0 24l6.24-1.64a11.9 11.9 0 0 0 5.83 1.48h.01c6.58 0 11.93-5.35 11.93-11.93 0-3.19-1.24-6.19-3.49-8.43ZM12.08 21.8h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.7.97.99-3.6-.23-.37a9.9 9.9 0 0 1-1.52-5.28c0-5.47 4.45-9.92 9.93-9.92 2.65 0 5.14 1.03 7.01 2.91a9.86 9.86 0 0 1 2.91 7.02c0 5.47-4.45 9.92-9.92 9.92Zm5.45-7.43c-.3-.15-1.76-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.76-1.67-2.06-.18-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.38-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.48-.5-.67-.51h-.57c-.2 0-.52.08-.8.38-.27.3-1.04 1.02-1.04 2.48 0 1.47 1.06 2.89 1.21 3.09.15.2 2.09 3.19 5.06 4.47.71.31 1.27.5 1.7.64.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.42.25-.7.25-1.3.18-1.42-.08-.13-.28-.2-.58-.35Z"/></svg>'
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
    const isAdmin = Boolean(this.user && this.getUserRole(this.user) === 'ADMIN');
    const navItems = [
      { id: 'home', label: 'Home', path: '/' },
      { id: 'services', label: 'Services', path: '/services' },
      { id: 'portfolio', label: 'Portfolio', path: '/portfolio' },
      { id: 'learn', label: 'Learn', path: '/learn' },
      { id: 'blog', label: 'Blog', path: '/blog' },
      { id: 'about', label: 'About', path: '/about' },
      { id: 'contact', label: 'Contact', path: '/contact' },
      ...(isAdmin ? [{ id: 'dashboard', label: 'Dashboard', path: '/dashboard' }] : [])
    ];

    let authButtons = '';
    if (this.user) {
      const role = this.getUserRole(this.user);
      const dashPage = this.getPortalRouteForRole(role);
      const dashLabel =
        role === 'ADMIN'
          ? 'Admin Dashboard'
          : role === 'LEARNER'
          ? 'Learner Portal'
          : 'Client Portal';
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
          Create Account
        </button>
      `;
    }

    return `
      <header class="site-header">
        <div id="scroll-progress-bar" class="scroll-progress-bar" aria-hidden="true"></div>
        <div class="container nav-inner">
          ${C.renderBrandLogo()}
          <nav aria-label="Primary navigation">
            <ul class="nav-links ${this.mobileMenuOpen ? 'mobile-open' : ''}">
              ${navItems
                .map(
                  (item) => `
                <li>
                  <a href="${item.path || `/${item.id}`}" class="nav-link ${
                    this.currentPage === item.id ||
                    (item.id === 'learn' && this.currentPage === 'learn-dashboard') ||
                    (item.id === 'blog' && this.currentPage === 'blog-detail')
                      ? 'active'
                      : ''
                  }" onclick="event.preventDefault(); window.app.navigate('${item.id}')">${item.label}</a>
                </li>
              `
                )
                .join('')}
              <li class="mobile-nav-theme">${this.renderThemeToggle('mobile')}</li>
              <li class="mobile-nav-auth">${authButtons}</li>
            </ul>
          </nav>
          <div class="nav-actions">
            <div class="nav-auth-group">${authButtons}</div>
            ${this.renderThemeToggle('desktop')}
            <button type="button" class="mobile-menu-btn" aria-label="Toggle navigation menu" aria-expanded="${Boolean(this.mobileMenuOpen)}" onclick="window.app.mobileMenuOpen = !window.app.mobileMenuOpen; window.app.render();">
              ☰
            </button>
          </div>
        </div>
      </header>
    `;
  }

  renderFooter() {
    const D = window.YOLETECH_DATA.owner;
    const services = window.YOLETECH_DATA.eightServicesStrip || [];
    const C = window.YOLETECH_COMPONENTS;
    const showCtaBanner = this.currentPage !== 'contact';

    return `
      <footer class="site-footer">
        <div class="container">
          ${
            showCtaBanner
              ? `<div class="footer-cta-banner">
                  <div class="footer-cta-copy">
                    <span class="footer-kicker"><span class="eyebrow-dot"></span> LET'S BUILD SOMETHING BETTER</span>
                    <h2>Ready to move your next idea forward?</h2>
                    <p>
                      Practical web, data analytics, business intelligence, and automation solutions built around how your team works.
                    </p>
                  </div>
                  <div class="footer-cta-actions">
                    <button type="button" class="btn btn-lime" onclick="window.app.navigate('contact')">
                      Book a Discovery Call →
                    </button>
                    <a href="/learn" class="btn btn-outline" onclick="event.preventDefault();window.app.navigate('learn')">
                      Explore Training Programs
                    </a>
                  </div>
                </div>`
              : ''
          }

          <div class="footer-columns">
            <div class="footer-col">
              ${C ? C.renderBrandLogo() : '<strong>YOLETECH</strong>'}
              <p class="footer-col-desc">
                Data analytics, executive business intelligence, workflow automation, full-stack web engineering, and hands-on tech training.
              </p>
              <p class="footer-col-meta">${D.serviceArea}</p>
              <div class="social-icon-row" style="margin-top:14px;">
                <a href="${D.socials.github}" target="_blank" rel="noopener noreferrer" class="social-btn" aria-label="GitHub">${this.renderSocialIcon('github')}<span>GitHub</span></a>
                <a href="${D.socials.linkedin}" target="_blank" rel="noopener noreferrer" class="social-btn" aria-label="LinkedIn">${this.renderSocialIcon('linkedin')}<span>LinkedIn</span></a>
                <a href="${D.socials.kaggle}" target="_blank" rel="noopener noreferrer" class="social-btn" aria-label="Kaggle">${this.renderSocialIcon('kaggle')}<span>Kaggle</span></a>
                <a href="${D.socials.youtube}" target="_blank" rel="noopener noreferrer" class="social-btn" aria-label="YouTube">${this.renderSocialIcon('youtube')}<span>YouTube</span></a>
              </div>
            </div>

            <div class="footer-col">
              <h2 class="footer-col-title">Quick Links</h2>
              <ul class="footer-plain-links">
                <li><a href="/" onclick="event.preventDefault();window.app.navigate('home')">Home</a></li>
                <li><a href="/services" onclick="event.preventDefault();window.app.navigate('services')">Services</a></li>
                <li><a href="/portfolio" onclick="event.preventDefault();window.app.navigate('portfolio')">Portfolio</a></li>
                <li><a href="/learn" onclick="event.preventDefault();window.app.navigate('learn')">Learn</a></li>
                <li><a href="/blog" onclick="event.preventDefault();window.app.navigate('blog')">Blog</a></li>
                <li><a href="/about" onclick="event.preventDefault();window.app.navigate('about')">About</a></li>
                <li><a href="/contact" onclick="event.preventDefault();window.app.navigate('contact')">Contact</a></li>
                <li><a href="/cv.html" target="_blank" rel="noopener noreferrer">Curriculum Vitae ↗</a></li>
              </ul>
            </div>

            <div class="footer-col">
              <h2 class="footer-col-title">Services</h2>
              <ul class="footer-plain-links">
                ${services
                  .map(
                    (s) =>
                      `<li><a href="/services#${s.id}" onclick="event.preventDefault();window.app.navigate('services')">${s.title}</a></li>`
                  )
                  .join('')}
              </ul>
            </div>

            <div class="footer-col">
              <h2 class="footer-col-title">Legal &amp; Contact</h2>
              <ul class="footer-plain-links">
                <li><a href="/privacy" onclick="event.preventDefault();window.app.navigate('privacy')">Privacy Policy</a></li>
                <li><a href="/terms" onclick="event.preventDefault();window.app.navigate('terms')">Terms of Service</a></li>
                <li><a href="/cookies" onclick="event.preventDefault();window.app.navigate('cookies')">Cookie Notice</a></li>
                <li><button type="button" class="footer-cookie-btn" onclick="window.app.openCookiePreferences()">Cookie Settings</button></li>
                <li><a href="mailto:${D.email}">${D.email}</a></li>
                <li><span class="footer-col-meta">${D.workingHours}</span></li>
              </ul>
            </div>
          </div>

          <div class="footer-legal">
            <span>© ${new Date().getFullYear()} YOLETECH. All rights reserved.</span>
            <a class="footer-location-link" href="${D.locationUrl}" target="_blank" rel="noopener noreferrer" aria-label="Open ${D.location} in Google Maps">${D.location} ↗</a>
          </div>
        </div>
      </footer>
    `;
  }

  getCookieConsentState() {
    try {
      return localStorage.getItem('yoletech_cookie_consent') || '';
    } catch {
      return '';
    }
  }

  setCookieConsent(choice) {
    try {
      localStorage.setItem('yoletech_cookie_consent', choice);
    } catch {}
    this.showCookieSettingsModal = false;
    if (choice === 'accepted' && typeof window.yoletechLoadAnalytics === 'function') {
      window.yoletechLoadAnalytics();
    }
    this.showToast(choice === 'accepted' ? 'Analytics cookies enabled.' : 'Essential cookies only saved.');
    this.render();
  }

  openCookiePreferences() {
    this.showCookieSettingsModal = true;
    this.render();
  }

  renderCookieConsentBanner() {
    const consent = this.getCookieConsentState();
    if (consent && !this.showCookieSettingsModal) return '';
    return `
      <aside class="cookie-consent-banner" role="dialog" aria-label="Cookie preferences" aria-live="polite">
        <div class="cookie-consent-inner container">
          <div class="cookie-consent-copy">
            <strong>Cookie &amp; Privacy Preferences</strong>
            <p>
              YOLETECH uses essential session and theme storage to keep portals working. Optional analytics (Google Tag Manager) loads only with your consent.
              <a href="/cookies" onclick="event.preventDefault();window.app.showCookieSettingsModal=false;window.app.navigate('cookies')">Read Cookie Notice</a>.
            </p>
          </div>
          <div class="cookie-consent-actions">
            <button type="button" class="btn btn-outline btn-sm" onclick="window.app.setCookieConsent('essential')">Essential Only</button>
            <button type="button" class="btn btn-lime btn-sm" onclick="window.app.setCookieConsent('accepted')">Accept Analytics</button>
          </div>
        </div>
      </aside>
    `;
  }

  renderLegalPage(kind) {
    const D = window.YOLETECH_DATA.owner;
    const currentConsent = this.getCookieConsentState() || 'Not set yet';
    if (kind === 'privacy') {
      return `
        <section class="section">
          <div class="container" style="max-width:840px;">
            <div class="glass-card">
              <div class="eyebrow"><span class="eyebrow-dot"></span> LEGAL — DRAFT FOR OWNER REVIEW</div>
              <h1 style="font-size:clamp(28px,3.6vw,40px);font-weight:900;margin-bottom:14px;">Privacy Policy</h1>
              <p style="color:var(--yole-text-muted);margin-bottom:20px;">
                Draft prepared for YOLETECH (https://www.yolestica.com) referencing the <strong>Nigeria Data Protection Act (NDPA) 2023</strong>.
                <strong>TODO(owner):</strong> Confirm legal business registration details and Data Protection Officer contact prior to formal legal sign-off.
              </p>
              <h2 style="font-size:20px;margin:20px 0 8px;">1. Information We Collect</h2>
              <p style="color:var(--yole-text-muted);">When you submit a contact inquiry, register for the Client Portal, or enroll on the Learn page, we collect only the details you submit (name, email address, optional phone number, location, organization, and inquiry or course selection).</p>
              <h2 style="font-size:20px;margin:20px 0 8px;">2. Lawful Basis &amp; Use of Data</h2>
              <p style="color:var(--yole-text-muted);">We process your personal data with your consent or to fulfill requested services and course enrollments, respond to inquiries, and protect platform security. We do not sell personal data.</p>
              <h2 style="font-size:20px;margin:20px 0 8px;">3. Your Rights Under the NDPA (2023)</h2>
              <p style="color:var(--yole-text-muted);">You may request access, correction, portability, restriction, or deletion of your personal data by emailing <a href="mailto:${D.email}" style="color:var(--yole-lime);text-decoration:underline;">${D.email}</a>.</p>
              <h2 style="font-size:20px;margin:20px 0 8px;">4. Security &amp; Retention</h2>
              <p style="color:var(--yole-text-muted);">Account passwords are stored using salted scrypt hashing. Session cookies use HttpOnly and SameSite protections. Data is retained only as long as needed to deliver services or satisfy legal obligations.</p>
            </div>
          </div>
        </section>
      `;
    }
    if (kind === 'terms') {
      return `
        <section class="section">
          <div class="container" style="max-width:840px;">
            <div class="glass-card">
              <div class="eyebrow"><span class="eyebrow-dot"></span> LEGAL — DRAFT FOR OWNER REVIEW</div>
              <h1 style="font-size:clamp(28px,3.6vw,40px);font-weight:900;margin-bottom:14px;">Terms of Service</h1>
              <p style="color:var(--yole-text-muted);margin-bottom:20px;">
                Draft prepared for YOLETECH (https://www.yolestica.com).
                <strong>TODO(owner):</strong> Review governing jurisdiction, payment milestones, and refund terms with legal counsel.
              </p>
              <h2 style="font-size:20px;margin:20px 0 8px;">1. Digital Services &amp; Training</h2>
              <p style="color:var(--yole-text-muted);">Project scopes, timelines, deliverables, and fees for web development, data analytics, business intelligence, automation, IT support, and training are confirmed in writing before work commences.</p>
              <h2 style="font-size:20px;margin:20px 0 8px;">2. User Accounts &amp; Acceptable Use</h2>
              <p style="color:var(--yole-text-muted);">You agree to provide accurate registration information, safeguard your login credentials, and refrain from unauthorized access or automated abuse of YOLETECH services.</p>
              <h2 style="font-size:20px;margin:20px 0 8px;">3. Intellectual Property</h2>
              <p style="color:var(--yole-text-muted);">Site articles, tutorials, and training curriculum remain the intellectual property of YOLETECH unless ownership is explicitly transferred in a signed client contract.</p>
              <h2 style="font-size:20px;margin:20px 0 8px;">4. Contact</h2>
              <p style="color:var(--yole-text-muted);">Questions about these terms can be sent to <a href="mailto:${D.email}" style="color:var(--yole-lime);text-decoration:underline;">${D.email}</a>.</p>
            </div>
          </div>
        </section>
      `;
    }
    return `
      <section class="section">
        <div class="container" style="max-width:840px;">
          <div class="glass-card">
            <div class="eyebrow"><span class="eyebrow-dot"></span> LEGAL — DRAFT FOR OWNER REVIEW</div>
            <h1 style="font-size:clamp(28px,3.6vw,40px);font-weight:900;margin-bottom:14px;">Cookie Notice</h1>
            <p style="color:var(--yole-text-muted);margin-bottom:20px;">
              This notice explains how YOLETECH uses cookies and browser storage on https://www.yolestica.com.
            </p>
            <h2 style="font-size:20px;margin:20px 0 8px;">1. Essential Cookies &amp; Storage</h2>
            <p style="color:var(--yole-text-muted);">We use an HttpOnly session cookie (<code>yoletech_session</code>) for authenticated Client, Learner, and Admin portals, plus local storage for your dark/light theme preference and cookie consent choice.</p>
            <h2 style="font-size:20px;margin:20px 0 8px;">2. Optional Analytics Cookies</h2>
            <p style="color:var(--yole-text-muted);">Google Tag Manager is disabled by default and loads only if you click <strong>Accept Analytics</strong>. Current preference: <strong>${currentConsent}</strong>.</p>
            <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:20px;">
              <button type="button" class="btn btn-outline btn-sm" onclick="window.app.setCookieConsent('essential')">Use Essential Cookies Only</button>
              <button type="button" class="btn btn-lime btn-sm" onclick="window.app.setCookieConsent('accepted')">Accept Analytics Cookies</button>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  renderFooterTabContent(tab, owner = window.YOLETECH_DATA.owner) {
    const C = window.YOLETECH_COMPONENTS;
    const icon = (name) => `<span class="footer-item-icon" aria-hidden="true">${C ? C.getIcon(name) : ''}</span>`;
    const content = {
      overview: `
        <div class="footer-overview">
          <div class="footer-about-brand">
            ${window.YOLETECH_COMPONENTS.renderBrandLogo()}
            <p>Data analytics, business intelligence, workflow automation, and full-stack web solutions engineered for clarity and scale.</p>
          </div>
          <div class="footer-social-block">
            <div class="social-icon-row">
              <a href="${owner.socials.github}" target="_blank" rel="noopener noreferrer" class="social-btn">${this.renderSocialIcon('github')} <span>GitHub</span> <span aria-hidden="true">↗</span></a>
              <a href="${owner.socials.linkedin}" target="_blank" rel="noopener noreferrer" class="social-btn">${this.renderSocialIcon('linkedin')} <span>LinkedIn</span> <span aria-hidden="true">↗</span></a>
              <a href="${owner.socials.kaggle}" target="_blank" rel="noopener noreferrer" class="social-btn">${this.renderSocialIcon('kaggle')} <span>Kaggle</span> <span aria-hidden="true">↗</span></a>
              <a href="${owner.socials.youtube}" target="_blank" rel="noopener noreferrer" class="social-btn">${this.renderSocialIcon('youtube')} <span>YouTube</span> <span aria-hidden="true">↗</span></a>
              <a href="${owner.socials.facebook}" target="_blank" rel="noopener noreferrer" class="social-btn">${this.renderSocialIcon('facebook')} <span>Facebook</span> <span aria-hidden="true">↗</span></a>
              <a href="${owner.socials.whatsapp}" target="_blank" rel="noopener noreferrer" class="social-btn">${this.renderSocialIcon('whatsapp')} <span>WhatsApp</span> <span aria-hidden="true">↗</span></a>
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
            <li><a href="/services" onclick="event.preventDefault(); window.app.navigate('services')"><span class="footer-link-main">${icon('code')}<span>Full-Stack Web Development</span></span><span aria-hidden="true">↗</span></a></li>
            <li><a href="/services" onclick="event.preventDefault(); window.app.navigate('services')"><span class="footer-link-main">${icon('chart')}<span>Data Analytics &amp; BI Dashboards</span></span><span aria-hidden="true">↗</span></a></li>
            <li><a href="/services" onclick="event.preventDefault(); window.app.navigate('services')"><span class="footer-link-main">${icon('cpu')}<span>AI &amp; Python/VBA Automation</span></span><span aria-hidden="true">↗</span></a></li>
            <li><a href="/services" onclick="event.preventDefault(); window.app.navigate('services')"><span class="footer-link-main">${icon('graduation')}<span>Tech Tutorials &amp; Staff Training</span></span><span aria-hidden="true">↗</span></a></li>
            <li><a href="/services" onclick="event.preventDefault(); window.app.navigate('services')"><span class="footer-link-main">${icon('brush')}<span>Graphic Design &amp; Video Editing</span></span><span aria-hidden="true">↗</span></a></li>
            <li><a href="/services" onclick="event.preventDefault(); window.app.navigate('services')"><span class="footer-link-main">${icon('database')}<span>IT &amp; Database Support</span></span><span aria-hidden="true">↗</span></a></li>
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
            <li><a href="/learn" onclick="event.preventDefault(); window.app.navigate('learn')"><span class="footer-link-main">${icon('graduation')}<span>Learn &amp; Training</span></span><span aria-hidden="true">↗</span></a></li>
            <li><a href="/about" onclick="event.preventDefault(); window.app.navigate('about')"><span class="footer-link-main">${icon('users')}<span>About YOLETECH</span></span><span aria-hidden="true">↗</span></a></li>
            <li><a href="/portfolio" onclick="event.preventDefault(); window.app.navigate('portfolio')"><span class="footer-link-main">${icon('briefcase')}<span>Portfolio &amp; Case Studies</span></span><span aria-hidden="true">↗</span></a></li>
            <li><a href="/testimonials" onclick="event.preventDefault(); window.app.navigate('testimonials')"><span class="footer-link-main">${icon('quote')}<span>Client Testimonials</span></span><span aria-hidden="true">↗</span></a></li>
            <li><a href="/blog" onclick="event.preventDefault(); window.app.navigate('blog')"><span class="footer-link-main">${icon('document')}<span>Blog &amp; Tutorials</span></span><span aria-hidden="true">↗</span></a></li>
            <li><a href="/login" onclick="event.preventDefault(); window.app.navigate('login')"><span class="footer-link-main">${icon('portal')}<span>Client Portal</span></span><span aria-hidden="true">↗</span></a></li>
            <li><a href="/cv.html" target="_blank" rel="noopener"><span class="footer-link-main">${icon('graduation')}<span>Curriculum Vitae</span></span><span aria-hidden="true">↗</span></a></li>
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
              ${icon('mail')}
              <span class="footer-contact-copy">
                <span class="footer-contact-label">EMAIL</span>
                <strong>${owner.email}</strong>
              </span>
              <span class="footer-contact-arrow" aria-hidden="true">↗</span>
            </a>
            <a class="footer-contact-item" href="${owner.whatsappUrl}" target="_blank" rel="noopener">
              ${icon('phone')}
              <span class="footer-contact-copy">
                <span class="footer-contact-label">WHATSAPP / PHONE</span>
                <strong>${owner.phone}</strong>
              </span>
              <span class="footer-contact-arrow" aria-hidden="true">↗</span>
            </a>
            <div class="footer-contact-item">
              ${icon('clock')}
              <span class="footer-contact-copy">
                <span class="footer-contact-label">WORKING HOURS</span>
                <strong>${owner.workingHours}</strong>
              </span>
            </div>
            <a class="footer-contact-item" href="${owner.locationUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(owner.location)}`}" target="_blank" rel="noopener noreferrer" aria-label="Open ${owner.location} in Google Maps">
              ${icon('mapPin')}
              <span class="footer-contact-copy">
                <span class="footer-contact-label">LOCATION</span>
                <strong>${owner.location}</strong>
              </span>
              <span class="footer-contact-arrow" aria-hidden="true">↗</span>
            </a>
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
    window.YOLETECH_COMPONENTS?.decorateCardIcons(panel);
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
          <button type="button" class="slide-arrow-btn" aria-label="Previous slide" title="Previous Slide" onclick="window.app.setSlide(${this.currentSlide - 1})">←</button>
          <button type="button" class="slide-arrow-btn" aria-label="Next slide" title="Next Slide" onclick="window.app.setSlide(${this.currentSlide + 1})">→</button>
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

      <!-- GROUNDED CAPABILITY HIGHLIGHTS & 3 CORE VALUE PILLARS -->
      <section class="section">
        <div class="container">
          <div class="metrics-strip">
            <div class="metric-cell">
              <div class="metric-number">7</div>
              <div class="metric-label">Service &amp; Training<br/>Disciplines</div>
            </div>
            <div class="metric-cell">
              <div class="metric-number">1 Day</div>
              <div class="metric-label">Business-Day<br/>Inquiry Response</div>
            </div>
            <div class="metric-cell">
              <div class="metric-number">WAT</div>
              <div class="metric-label">Nigeria Based &amp;<br/>Remote Worldwide</div>
            </div>
            <div class="metric-cell">
              <div class="metric-number">AA</div>
              <div class="metric-label">WCAG 2.1 Accessibility<br/>&amp; Clean Code Focus</div>
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
              <h3 style="font-size:21px;font-weight:800;margin-bottom:10px;">Full-Stack Web Development</h3>
              <p style="font-size:14px;color:var(--yole-text-muted);margin-bottom:18px;">
                Frontend and backend system implementation using React.js, JavaScript, HTML/CSS, WordPress, and relational SQL databases—built without bloat.
              </p>
            </div>

            <div class="glass-card">
              <h3 style="font-size:21px;font-weight:800;margin-bottom:10px;">Data Analytics &amp; Business Intelligence</h3>
              <p style="font-size:14px;color:var(--yole-text-muted);margin-bottom:18px;">
                Transforming complex multi-departmental datasets into validated insights and interactive Power BI &amp; Tableau dashboards for executive decision-making.
              </p>
            </div>

            <div class="glass-card">
              <h3 style="font-size:21px;font-weight:800;margin-bottom:10px;">Predictive ML &amp; Workflow Automation</h3>
              <p style="font-size:14px;color:var(--yole-text-muted);margin-bottom:18px;">
                Forecasting outcomes with Machine Learning and automating repetitive reporting bottlenecks via Advanced Microsoft Excel VBA macros and Python scripts.
              </p>
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
            <div id="home-showcase-pills" style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:22px;">
              <button type="button" data-showcase="dashboard" class="selector-pill ${this.showcaseTab === 'dashboard' ? 'active' : ''}" onclick="window.app.setShowcaseTab('dashboard')">
                📊 Executive BI Dashboard
              </button>
              <button type="button" data-showcase="codesync" class="selector-pill ${this.showcaseTab === 'codesync' ? 'active' : ''}" onclick="window.app.setShowcaseTab('codesync')">
                💻 Full-Stack Code &amp; Sync UI
              </button>
              <button type="button" data-showcase="workflow" class="selector-pill ${this.showcaseTab === 'workflow' ? 'active' : ''}" onclick="window.app.setShowcaseTab('workflow')">
                ⚡ API-to-Python Automation Flow
              </button>
            </div>
          </div>

          <div id="home-showcase-mount" style="max-width:980px;margin:0 auto;">
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
                  <div style="border-radius:12px;overflow:hidden;margin-bottom:16px;border:1px solid rgba(255,255,255,0.12);height:175px;cursor:pointer;" onclick="window.app.openPortfolioModal('${p.slug}')">
                    <img src="${this.resolvePortfolioImage(p.preview_image, p.slug)}" alt="${p.title}" width="640" height="360" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='/assets/dashboard-preview.jpg';" style="width:100%;height:100%;object-fit:cover;" />
                  </div>
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
                    <span class="tech-pill lime" style="font-size:11px;padding:3px 10px;">${p.category || 'Data Analytics & BI'}</span>
                    <span style="font-size:12px;color:var(--yole-text-muted);">${p.period || p.date || '2026'}</span>
                  </div>
                  <h3 style="font-size:19px;font-weight:800;margin-bottom:8px;cursor:pointer;" onclick="window.app.openPortfolioModal('${p.slug}')">${p.title}</h3>
                  <p style="font-size:13.5px;color:var(--yole-text-muted);margin-bottom:14px;">${p.summary}</p>
                </div>
                <div>
                  <div style="background:rgba(200,230,30,0.08);border-left:3px solid #C8E61E;padding:8px 12px;font-size:12px;color:#FFFFFF;margin-bottom:14px;border-radius:0 8px 8px 0;">
                    <strong>Impact:</strong> ${p.impact_metrics}
                  </div>
                  <div style="display:flex;gap:8px;border-top:1px solid rgba(255,255,255,0.1);padding-top:12px;">
                    ${
                      p.demo_url || p.live_url
                        ? `<a href="${p.demo_url || p.live_url}" target="_blank" rel="noopener" class="btn btn-lime btn-sm" style="flex:1;">
                            Live Demo ↗
                          </a>`
                        : ''
                    }
                    <button class="btn btn-outline btn-sm" style="flex:1;" onclick="window.app.openPortfolioModal('${p.slug}')">
                      View Case Study →
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
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
                    <span class="tech-pill lime" style="font-size:11px;padding:3px 10px;">${post.category || 'Data Analytics & BI'}</span>
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
      </section>
    `;
  }

  // ==========================================================================
  // PAGE 2: ABOUT
  // ==========================================================================
  renderServicesTicker() {
    const services = window.YOLETECH_DATA.eightServicesStrip;
    const items = services
      .map((service) => `<span class="services-ticker-item">${service.title}<span aria-hidden="true">↗</span></span>`)
      .join('');

    return `
      <div class="services-ticker" role="region" aria-label="YOLETECH services">
        <div class="services-ticker-track">
          <div class="services-ticker-group">${items}</div>
          <div class="services-ticker-group" aria-hidden="true">${items}</div>
        </div>
      </div>
    `;
  }

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
                About ${D.owner.name} &amp; <span class="accent-lime">YOLETECH</span>
              </h1>
              <p style="font-size:15px;font-weight:700;color:var(--yole-lime);margin-bottom:10px;">
                ${D.owner.jobTitle} · ${D.owner.credentials}
              </p>
              <p style="font-size:16px;color:var(--yole-text-muted);margin-bottom:26px;">
                ${D.owner.summary}
              </p>
              <div class="hero-cta-row">
                <button class="btn btn-lime" onclick="window.app.navigate('contact')">
                  Book a Discovery Call →
                </button>
                <a href="/cv.html" target="_blank" rel="noopener noreferrer" class="btn btn-outline">
                  View Curriculum Vitae
                </a>
              </div>
            </div>
            <div class="hero-visual-box">
              ${C.renderPortraitHeroWidget('about')}
            </div>
          </div>

          <section class="section-block-gap" aria-labelledby="about-founder-approach-heading">
            <h2 id="about-founder-approach-heading" class="section-title" style="margin-bottom:18px;">Founder Story &amp; Engineering Approach</h2>
            <div class="grid-2">
              <article class="glass-card">
                <h3 style="font-size:18px;font-weight:800;margin-bottom:8px;">Founder Story</h3>
                <p style="font-size:14px;color:var(--yole-text-muted);">
                  YOLETECH was founded by ${D.owner.name} (${D.owner.credentials}) in ${D.owner.serviceArea} to combine practical full-stack engineering, reliable SQL data architecture, and clear business intelligence dashboards.
                </p>
              </article>
              <article class="glass-card">
                <h3 style="font-size:18px;font-weight:800;margin-bottom:8px;">How We Approach Every Project</h3>
                <p style="font-size:14px;color:var(--yole-text-muted);">
                  Every engagement begins with data and requirements clarity, favors clean maintainable systems over bloat, and finishes with plain-language documentation so your team owns what we build.
                </p>
              </article>
            </div>
          </section>

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
                    <article class="about-info-card about-prof-card about-prof-${prof.accent}">
                      <h4 class="about-accent-${prof.accent}">${prof.category}</h4>
                      <div class="about-skill-summary about-skill-tags">
                        ${prof.skills.map((skill) => `<span class="about-skill-chip">${skill}</span>`).join('')}
                      </div>
                    </article>
                  `
                    )
                    .join('')}
                  <article class="about-info-card about-competencies">
                    <h4 class="about-accent-lime">Professional competencies</h4>
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
                    <p style="font-size:12.5px;color:var(--yole-text-muted);margin-top:12px;">
                      ${D.certifications.verificationPlaceholder || 'TODO(owner): Add public verification URLs for certificates'}
                    </p>
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
    const processSteps = D.deliveryProcess || [];

    return `
      <section class="section">
        <div class="container">
          <div class="hero-slide-grid section-block-gap">
            <div>
              <div class="eyebrow"><span class="eyebrow-dot"></span> YOLETECH SERVICES</div>
              <h1 class="hero-title" style="font-size:clamp(32px,4vw,46px);">
                Data Analytics, BI, Automation &amp; <span class="accent-lime">Full-Stack Web Services</span>
              </h1>
              <p class="hero-subtitle">
                Structured web engineering, interactive Power BI &amp; Tableau dashboards, workflow automation, IT &amp; customer support, creative media, and hands-on tech training.
              </p>
              <div class="hero-cta-row">
                <button class="btn btn-lime" onclick="window.app.navigate('contact')">
                  Book a Discovery Call →
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
            <div class="eyebrow"><span class="eyebrow-dot"></span> SERVICE CATALOG</div>
            <h2 class="section-title section-title-nowrap">Services Tailored to Your Organization</h2>
            <p class="section-desc">Each service includes clear scope, deliverables, tools, process, and answers to common questions.</p>
          </div>

          <div class="grid-2 section-block-gap">
            ${D.eightServicesStrip
              .map(
                (srv) => `
              <article id="${srv.id}" class="glass-card" style="display:flex;flex-direction:column;justify-content:space-between;">
                <div>
                  <h3 style="font-size:22px;font-weight:900;margin-bottom:6px;">${srv.title}</h3>
                  <div style="font-size:13px;font-weight:700;color:#C8E61E;margin-bottom:12px;">${srv.sub}</div>
                  <p style="font-size:14px;color:var(--yole-text-muted);margin-bottom:14px;">${srv.description}</p>
                  ${
                    srv.process
                      ? `<p style="font-size:13px;color:var(--yole-text-muted);margin-bottom:12px;"><strong>Process:</strong> ${srv.process}</p>`
                      : ''
                  }
                  ${
                    Array.isArray(srv.tools) && srv.tools.length
                      ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">${srv.tools
                          .map((t) => `<span class="tech-pill" style="font-size:11px;padding:3px 9px;">${t}</span>`)
                          .join('')}</div>`
                      : ''
                  }
                </div>

                <div>
                  <div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:14px;margin-bottom:14px;">
                    <div style="font-size:12px;font-weight:800;color:var(--yole-text-muted);text-transform:uppercase;margin-bottom:8px;">
                      Key Deliverables
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
                  ${
                    srv.faq
                      ? `<details style="margin-bottom:14px;padding:10px 12px;border-radius:10px;border:1px solid var(--yole-border-subtle);">
                          <summary style="font-size:13px;font-weight:700;cursor:pointer;">${srv.faq.q}</summary>
                          <p style="font-size:13px;color:var(--yole-text-muted);margin-top:8px;">${srv.faq.a}</p>
                        </details>`
                      : ''
                  }
                  <button class="btn btn-lime btn-sm" onclick="window.app.selectContactService('${srv.title}')">
                    Book a Discovery Call →
                  </button>
                </div>
              </article>
            `
              )
              .join('')}
          </div>

          <!-- SERVICE OVERVIEW & DELIVERY SCOPE (INTERACTIVE TABS) -->
          <div class="section-header">
            <div class="eyebrow"><span class="eyebrow-dot"></span> TRANSPARENT EXECUTION</div>
            <h2 class="section-title">Service Overview &amp; Delivery Scope</h2>
            <p class="section-desc">Select a service track below to inspect its tools and delivery standards.</p>
          </div>

          <div class="scope-tabs-container section-block-gap">
            <div class="scope-tabs-nav" id="service-scope-tabs-nav" role="tablist">
              ${D.serviceScopeTable
                .map((row, idx) => {
                  const isActive = (this.serviceScopeTab || 0) === idx;
                  return `
                    <button
                      type="button"
                      role="tab"
                      data-scope-idx="${idx}"
                      aria-selected="${isActive}"
                      class="scope-tab-btn ${isActive ? 'active' : ''}"
                      onclick="window.app.setServiceScopeTab(${idx})"
                    >
                      <span class="scope-tab-num">0${idx + 1}</span>
                      <span class="scope-tab-label">${row.track}</span>
                    </button>
                  `;
                })
                .join('')}
            </div>

            <div id="service-scope-mount">
              ${this.renderServiceScopePanel()}
            </div>
          </div>

          ${C.renderRoiCalculatorWidget ? C.renderRoiCalculatorWidget() : ''}

          <!-- 4-STAGE DELIVERY PROCESS -->
          <div class="section-header">
            <div class="eyebrow"><span class="eyebrow-dot"></span> DELIVERY PROCESS</div>
            <h2 class="section-title">Discovery, Build, Delivery &amp; Support</h2>
            <p class="section-desc">A clear 4-stage process from initial discovery through post-launch support.</p>
          </div>

          <div class="metrics-strip" style="margin-bottom:0;">
            ${processSteps
              .map(
                (p) => `
              <div class="metric-cell" style="flex-direction:column;align-items:flex-start;text-align:left;">
                <div style="font-size:18px;font-weight:900;">${p.step}. ${p.title}</div>
                <div style="font-size:13px;color:var(--yole-text-muted);">${p.detail}</div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      </section>
    `;
  }

  renderServiceScopePanel() {
    const D = window.YOLETECH_DATA;
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
      <div class="glass-card scope-tab-panel is-revealed">
        <div class="scope-panel-header">
          <div>
            <div class="scope-track-step">SERVICE TRACK 0${activeIdx + 1} OF 0${totalTracks}</div>
            <h3 class="scope-track-title">${activeRow.track}</h3>
          </div>
          <div class="scope-timeline-box">
            <span class="scope-timeline-label">Typical Timeline</span>
            <span>${activeRow.timeline}</span>
          </div>
        </div>

        <div class="scope-panel-grid">
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
            <button type="button" class="btn btn-outline btn-sm" onclick="window.app.setServiceScopeTab(${prevIdx})">
              ← Prev
            </button>
            <button type="button" class="btn btn-outline btn-sm" onclick="window.app.setServiceScopeTab(${nextIdx})">
              Next →
            </button>
          </div>
          <button type="button" class="btn btn-lime btn-sm scope-request-btn" onclick="window.app.selectContactService('${activeRow.track}')">
            Request ${activeRow.track} →
          </button>
        </div>
      </div>
    `;
  }

  setServiceScopeTab(idx) {
    this.serviceScopeTab = idx;
    const mount = document.getElementById('service-scope-mount');
    const nav = document.getElementById('service-scope-tabs-nav');
    if (nav) {
      nav.querySelectorAll('.scope-tab-btn').forEach((btn) => {
        const isCurrent = Number(btn.getAttribute('data-scope-idx')) === idx;
        btn.classList.toggle('active', isCurrent);
        btn.setAttribute('aria-selected', String(isCurrent));
      });
    }
    if (mount) {
      mount.innerHTML = this.renderServiceScopePanel();
      window.YOLETECH_COMPONENTS?.decorateCardIcons(mount);
    } else {
      this.render();
    }
  }

  // ==========================================================================
  // PAGE 4: PORTFOLIO (FILTERABLE CASE STUDIES — POWERED BY DECAP BRIDGE)
  // ==========================================================================
  matchesPortfolioCategory(projectCategory, filterCat) {
    if (!filterCat || filterCat === 'ALL') return true;
    if (projectCategory === filterCat) return true;
    if (filterCat === 'AI & Machine Learning' && projectCategory === 'Python & Machine Learning') return true;
    return false;
  }

  getFilteredPortfolio() {
    const query = (this.portfolioSearch || '').trim().toLowerCase();
    return (this.portfolio || []).filter((p) => {
      const catMatch = this.matchesPortfolioCategory(p.category, this.portfolioFilter);
      if (!catMatch) return false;
      if (!query) return true;
      const haystack = `${p.title || ''} ${p.summary || ''} ${p.category || ''} ${p.organization || ''} ${p.impact_metrics || ''} ${(p.tech_stack || []).join(' ')}`.toLowerCase();
      return haystack.includes(query);
    });
  }

  renderPortfolioCardsHtml(filtered) {
    if (!filtered.length) {
      return `
        <div class="glass-card is-revealed" style="grid-column:1/-1;text-align:center;padding:42px 24px;">
          <h3 style="font-size:20px;font-weight:800;margin-bottom:8px;">No Matching Case Studies Found</h3>
          <p style="font-size:14px;color:var(--yole-text-muted);margin-bottom:16px;">Try clearing your search filter or selecting "All Case Studies".</p>
          <button type="button" class="btn btn-outline btn-sm" onclick="window.app.portfolioFilter='ALL';window.app.portfolioSearch='';window.app.render();">
            Reset Filters
          </button>
        </div>
      `;
    }
    const C = window.YOLETECH_COMPONENTS;
    return filtered
      .map((p) => {
        const imgSrc = this.resolvePortfolioImage(p.preview_image, p.slug);
        const iconName = C ? C.cardIconName(`${p.title || ''} ${p.category || ''}`) : 'briefcase';
        const iconSvg = C ? C.getIcon(iconName) : '';
        const isOrange = /workflow|automation|service|support/i.test(`${p.title || ''} ${p.category || ''}`);
        return `
      <article class="glass-card portfolio-project-card is-revealed">
        <div class="portfolio-project-image" style="cursor:pointer;" onclick="window.app.openPortfolioModal('${p.slug}')">
          <img src="${imgSrc}" alt="${p.title}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='/assets/dashboard-preview.jpg';" />
        </div>
        <div class="site-card-heading portfolio-card-heading">
          <span class="site-card-icon${isOrange ? ' site-card-icon-orange' : ''}" aria-hidden="true">${iconSvg}</span>
          <h2 class="portfolio-project-title" style="cursor:pointer;" onclick="window.app.openPortfolioModal('${p.slug}')">${p.title}</h2>
        </div>
        <div class="portfolio-project-actions">
            ${
              p.demo_url || p.live_url
                ? `<a href="${p.demo_url || p.live_url}" target="_blank" rel="noopener noreferrer" class="btn btn-lime btn-sm portfolio-project-action">
                    Live Demo <span aria-hidden="true">↗</span>
                  </a>`
                : ''
            }
            <button type="button" class="btn btn-outline btn-sm portfolio-project-action" onclick="window.app.openPortfolioModal('${p.slug}')">
              View Case Study
            </button>
            <button type="button" class="btn btn-outline btn-sm portfolio-project-action portfolio-project-action-wide" onclick="window.app.selectContactService('${p.category}')">
              Build Similar <span aria-hidden="true">→</span>
            </button>
        </div>
      </article>
    `;
      })
      .join('');
  }

  setPortfolioFilter(cat) {
    this.portfolioFilter = cat;
    const pillsWrap = document.getElementById('portfolio-filter-pills');
    const gridMount = document.getElementById('portfolio-grid-mount');
    if (pillsWrap && gridMount) {
      pillsWrap.querySelectorAll('.selector-pill').forEach((btn) => {
        btn.classList.toggle('active', btn.getAttribute('data-cat') === cat);
      });
      gridMount.innerHTML = this.renderPortfolioCardsHtml(this.getFilteredPortfolio());
      window.YOLETECH_COMPONENTS?.decorateCardIcons(gridMount);
    } else {
      this.render();
    }
  }

  handlePortfolioSearch(val) {
    this.portfolioSearch = val;
    const gridMount = document.getElementById('portfolio-grid-mount');
    if (gridMount) {
      gridMount.innerHTML = this.renderPortfolioCardsHtml(this.getFilteredPortfolio());
      window.YOLETECH_COMPONENTS?.decorateCardIcons(gridMount);
    }
  }

  openPortfolioModal(slug) {
    const project = (this.portfolio || []).find((p) => p.slug === slug);
    if (!project) return;
    this.activePortfolioModal = project;

    let modalRoot = document.getElementById('portfolio-case-modal-root');
    if (!modalRoot) {
      modalRoot = document.createElement('div');
      modalRoot.id = 'portfolio-case-modal-root';
      document.body.appendChild(modalRoot);
    }

    const techStack = Array.isArray(project.tech_stack) ? project.tech_stack : [];
    modalRoot.innerHTML = `
      <div class="case-modal-backdrop" onclick="window.app.closePortfolioModal()"></div>
      <div class="case-modal-dialog glass-card is-revealed" role="dialog" aria-modal="true" aria-label="${project.title}">
        <div class="case-modal-header">
          <div>
            <div class="eyebrow" style="margin-bottom:4px;"><span class="eyebrow-dot"></span> ${project.category || 'CASE STUDY'}</div>
            <h2 style="font-size:clamp(20px,2.6vw,28px);font-weight:900;line-height:1.25;margin:0;">${project.title}</h2>
          </div>
          <button type="button" class="contact-modal-close" aria-label="Close case study" onclick="window.app.closePortfolioModal()">✕</button>
        </div>

        <div class="case-modal-body">
          ${
            project.preview_image
              ? `<div style="border-radius:14px;overflow:hidden;max-height:280px;margin-bottom:18px;border:1px solid var(--yole-border-subtle);">
                  <img src="${this.resolvePortfolioImage(project.preview_image, project.slug)}" alt="${project.title}" onerror="this.onerror=null;this.src='/assets/dashboard-preview.jpg';" style="width:100%;height:100%;object-fit:cover;" />
                </div>`
              : ''
          }
          <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;font-size:13px;color:var(--yole-text-muted);margin-bottom:14px;">
            <span><strong>Organization:</strong> ${project.organization || 'Client Partner'}</span>
            <span><strong>Timeline:</strong> ${project.period || 'Completed'}</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:18px;">
            <div style="background:rgba(255,255,255,0.04);border:1px solid var(--yole-border-subtle);border-radius:10px;padding:12px 14px;">
              <strong style="display:block;font-size:12px;text-transform:uppercase;color:#C8E61E;margin-bottom:4px;">Problem</strong>
              <p style="font-size:13.5px;color:var(--yole-text-muted);margin:0;">${project.problem || 'TODO(owner): Document the business problem solved in this case study.'}</p>
            </div>
            <div style="background:rgba(255,255,255,0.04);border:1px solid var(--yole-border-subtle);border-radius:10px;padding:12px 14px;">
              <strong style="display:block;font-size:12px;text-transform:uppercase;color:#C8E61E;margin-bottom:4px;">Approach</strong>
              <p style="font-size:13.5px;color:var(--yole-text-muted);margin:0;">${project.approach || project.summary || 'TODO(owner): Describe the engineering or analytics approach.'}</p>
            </div>
            <div style="background:rgba(255,255,255,0.04);border:1px solid var(--yole-border-subtle);border-radius:10px;padding:12px 14px;">
              <strong style="display:block;font-size:12px;text-transform:uppercase;color:#F7941D;margin-bottom:4px;">Outcome</strong>
              <p style="font-size:13.5px;color:var(--yole-text-muted);margin:0;">${project.outcome || project.impact_metrics || 'TODO(owner): Add real client outcome or deployment summary.'}</p>
            </div>
          </div>
          ${
            techStack.length
              ? `<div style="margin-bottom:18px;">
                  <div style="font-size:12px;font-weight:800;text-transform:uppercase;color:var(--yole-text-muted);margin-bottom:8px;">Tools</div>
                  <div style="display:flex;flex-wrap:wrap;gap:8px;">
                    ${techStack.map((t) => `<span class="tech-pill lime" style="font-size:11.5px;padding:4px 10px;">${t}</span>`).join('')}
                  </div>
                </div>`
              : ''
          }
          ${
            project.body
              ? `<div class="article-content" style="border-top:1px solid var(--yole-border-subtle);padding-top:16px;">
                  ${this.formatMarkdownToHtml(project.body)}
                </div>`
              : ''
          }
        </div>

        <div class="case-modal-footer">
          ${
            project.demo_url || project.live_url
              ? `<a href="${project.demo_url || project.live_url}" target="_blank" rel="noopener noreferrer" class="btn btn-lime btn-sm">
                  Open Live Demo ↗
                </a>`
              : ''
          }
          <button type="button" class="btn btn-outline btn-sm" onclick="window.app.closePortfolioModal(); window.app.selectContactService('${project.category}')">
            Request Similar Solution →
          </button>
        </div>
      </div>
    `;
  }

  closePortfolioModal() {
    this.activePortfolioModal = null;
    const modalRoot = document.getElementById('portfolio-case-modal-root');
    if (modalRoot) modalRoot.innerHTML = '';
  }

  renderPortfolioPage() {
    const categories = [
      'ALL',
      'Data Analytics & BI',
      'Full-Stack Web',
      'AI & Machine Learning',
      'AI & Workflow Automation',
      'Tech Tutorials & Training'
    ];

    const filtered = this.getFilteredPortfolio();

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
                    <button class="btn btn-lime btn-sm" onclick="window.app.adminWorkspace='crm';window.app.adminTab='portfolio';window.app.navigate('admin-dashboard')">+ Add Project in Admin</button>
                    <a href="/admin/" target="_blank" class="btn btn-outline btn-sm">Open Decap Bridge CMS ↗</a>
                  </div>`
                : ''
            }
            <div style="max-width:440px;margin:20px auto 0;">
              <input
                type="search"
                id="portfolio-search-input"
                class="form-control"
                placeholder="Search case studies by keyword, stack, or outcome..."
                value="${this.portfolioSearch || ''}"
                oninput="window.app.handlePortfolioSearch(this.value)"
              />
            </div>
            <div id="portfolio-filter-pills" style="display:flex;justify-content:center;flex-wrap:wrap;gap:8px;margin-top:16px;">
              ${categories
                .map((cat) => {
                  const count =
                    cat === 'ALL'
                      ? (this.portfolio || []).length
                      : (this.portfolio || []).filter((p) => this.matchesPortfolioCategory(p.category, cat)).length;
                  return `
                    <button type="button" data-cat="${cat}" class="selector-pill ${this.portfolioFilter === cat ? 'active' : ''}" onclick="window.app.setPortfolioFilter('${cat}')">
                      ${cat === 'ALL' ? 'All Case Studies' : cat} (${count})
                    </button>
                  `;
                })
                .join('')}
            </div>
          </div>

          <div id="portfolio-grid-mount" class="grid-3">
            ${this.renderPortfolioCardsHtml(filtered)}
          </div>
        </div>
      </section>
    `;
  }

  // ==========================================================================
  // PAGE 5: TESTIMONIALS
  // ==========================================================================

  getRandomizedTestimonials(rawList = []) {
    if (!Array.isArray(rawList) || rawList.length === 0) return [];
    if (
      this._shuffledTestimonialsCache &&
      this._shuffledTestimonialsSourceLen === rawList.length
    ) {
      return this._shuffledTestimonialsCache;
    }
    const copy = [...rawList];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    // Spread out identical surnames so adjacent cards always show diverse clients
    const surnameOf = (item) =>
      String(item?.author_name || '')
        .trim()
        .split(/\s+/)
        .pop()
        .toLowerCase();
    for (let i = 1; i < copy.length; i++) {
      if (surnameOf(copy[i]) && surnameOf(copy[i]) === surnameOf(copy[i - 1])) {
        const swapIdx = copy.findIndex(
          (candidate, idx) => idx > i && surnameOf(candidate) !== surnameOf(copy[i - 1])
        );
        if (swapIdx > i) {
          [copy[i], copy[swapIdx]] = [copy[swapIdx], copy[i]];
        }
      }
    }
    this._shuffledTestimonialsCache = copy;
    this._shuffledTestimonialsSourceLen = rawList.length;
    return copy;
  }

  shuffleTestimonialsNow() {
    this._shuffledTestimonialsCache = null;
    this._shuffledTestimonialsSourceLen = 0;
    this.testimonialPage = 1;
    this.render();
  }

  renderTestimonialSliderCardHtml(t) {
    return `
      <div class="glass-card testimonial-slider-card is-revealed" style="display:flex;flex-direction:column;justify-content:space-between;padding:22px;">
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:8px;">
            <span style="font-size:11px;font-weight:700;color:#C8E61E;">${t.service_track || 'Client Feedback'}</span>
            <span style="color:#F7941D;font-size:14px;letter-spacing:1.5px;flex-shrink:0;">
              ${'★'.repeat(Number(t.rating) || 5)}
            </span>
          </div>
          <p style="font-size:14px;color:#FFFFFF;font-style:italic;margin-bottom:18px;line-height:1.6;">
            "${t.content}"
          </p>
        </div>
        <div style="display:flex;align-items:center;gap:10px;border-top:1px solid rgba(255,255,255,0.1);padding-top:12px;">
          <div style="width:38px;height:38px;flex-shrink:0;border-radius:50%;background:#2F2B73;border:1.5px solid #C8E61E;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14px;color:#C8E61E;">
            ${(t.author_name || 'C').charAt(0).toUpperCase()}
          </div>
          <div style="min-width:0;">
            <div style="font-weight:800;font-size:14px;line-height:1.3;">${t.author_name}</div>
            <div style="font-size:12px;color:var(--yole-text-muted);line-height:1.35;">${t.author_role} • ${t.company}</div>
          </div>
        </div>
      </div>
    `;
  }

  setTestimonialPage(page) {
    this.testimonialPage = Math.max(1, page);
    this.render();
    const el = document.getElementById('testimonials-wall');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  setTestimonialTrackFilter(track) {
    this.testimonialTrackFilter = track;
    this.testimonialPage = 1;
    this.render();
  }

  handleTestimonialSearch(val) {
    this.testimonialSearch = val;
    this.testimonialPage = 1;
    this.render();
    const input = document.getElementById('testimonial-search-input');
    if (input) {
      input.focus();
      const len = input.value.length;
      input.setSelectionRange(len, len);
    }
  }

  setTestimonialRating(stars) {
    this.testimonialFormRating = Math.min(5, Math.max(1, Number(stars) || 5));
    const wrap = document.getElementById('testimonial-star-picker');
    if (wrap) {
      wrap.querySelectorAll('.star-pick-btn').forEach((btn) => {
        const s = Number(btn.getAttribute('data-star'));
        btn.classList.toggle('is-filled', s <= this.testimonialFormRating);
      });
      const label = document.getElementById('testimonial-star-label');
      if (label) label.textContent = `${this.testimonialFormRating}.0 / 5.0 Stars`;
    }
  }

  renderTestimonialsPage() {
    const rawList = this.getRandomizedTestimonials(this.testimonials || []);
    const trackFilter = this.testimonialTrackFilter || 'ALL';
    const searchQ = (this.testimonialSearch || '').trim().toLowerCase();

    const list = rawList.filter((t) => {
      const trackMatch = trackFilter === 'ALL' || t.service_track === trackFilter;
      if (!trackMatch) return false;
      if (!searchQ) return true;
      const hay = `${t.author_name || ''} ${t.author_role || ''} ${t.company || ''} ${t.service_track || ''} ${t.content || ''}`.toLowerCase();
      return hay.includes(searchQ);
    });

    const tracks = [
      'ALL',
      'Data Analytics & BI',
      'Full-Stack Web Development',
      'AI & Workflow Automation',
      'Tech Tutorials & Mentorship',
      'IT & Database Support'
    ];

    const pageSize = 8;
    const totalCount = list.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    if (!this.testimonialPage || this.testimonialPage < 1) this.testimonialPage = 1;
    if (this.testimonialPage > totalPages) this.testimonialPage = totalPages;
    const cur = this.testimonialPage;
    const startIdx = (cur - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, totalCount);
    const paginatedTestimonials = list.slice(startIdx, endIdx);

    const buildRowPool = (seedSlice, offset) => {
      if (!list.length) return [];
      const pool = [...seedSlice];
      let cursor = (startIdx + offset) % list.length;
      const targetLen = Math.max(8, seedSlice.length);
      while (pool.length < targetLen) {
        pool.push(list[cursor % list.length]);
        cursor++;
      }
      return pool;
    };

    const row1Pool = buildRowPool(paginatedTestimonials.slice(0, 4), 8);
    const row2Pool = buildRowPool(
      paginatedTestimonials.slice(4, 8).length
        ? paginatedTestimonials.slice(4, 8)
        : paginatedTestimonials.slice(0, 4).reverse(),
      12
    );

    const row1GroupHtml = row1Pool.map((t) => this.renderTestimonialSliderCardHtml(t)).join('');
    const row2GroupHtml = row2Pool.map((t) => this.renderTestimonialSliderCardHtml(t)).join('');

    const activeStars = this.testimonialFormRating || 5;

    return `
      <section class="section">
        <div class="container">
          <div class="section-header">
            <div class="eyebrow"><span class="eyebrow-dot"></span> CLIENT &amp; MENTEE ENDORSEMENTS</div>
            <h1 class="section-title">What Stakeholders, Clients &amp; Mentees Say</h1>
            <p class="section-desc">
              Client and learner feedback shared directly with YOLETECH.
            </p>
          </div>

          <div id="testimonials-wall" class="testimonials-slider-wall" style="margin-bottom:48px;">
            ${
              list.length
                ? `
              <div class="testimonial-slider-row slide-right" role="region" aria-label="Client testimonials row 1 sliding right">
                <div class="testimonial-slider-track">
                  <div class="testimonial-slider-group">${row1GroupHtml}</div>
                  <div class="testimonial-slider-group" aria-hidden="true">${row1GroupHtml}</div>
                </div>
              </div>
              <div class="testimonial-slider-row slide-left" role="region" aria-label="Client testimonials row 2 sliding left">
                <div class="testimonial-slider-track">
                  <div class="testimonial-slider-group">${row2GroupHtml}</div>
                  <div class="testimonial-slider-group" aria-hidden="true">${row2GroupHtml}</div>
                </div>
              </div>
            `
                : `
              <div class="glass-card is-revealed" style="text-align:center;padding:36px 24px;">
                <p style="font-size:15px;color:var(--yole-text-muted);margin:0;">${
                  (this.testimonials || []).length === 0
                    ? 'No testimonials have been published yet. Be the first to share your experience below!'
                    : 'No matching testimonials found for this filter.'
                }</p>
              </div>
            `
            }
          </div>

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
                  <input type="text" name="author_name" required class="form-control" style="min-height:52px;font-size:15px;padding:14px 18px;border-radius:12px;" placeholder="Enter your full name" value="${
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
                  <input type="text" name="company" class="form-control" style="min-height:52px;font-size:15px;padding:14px 18px;border-radius:12px;" placeholder="Your company or organization" value="${
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
              <div class="form-group" style="margin-bottom:24px;">
                <label class="form-label" style="font-size:14px;font-weight:700;margin-bottom:8px;display:block;">Your Rating</label>
                <div id="testimonial-star-picker" style="display:flex;align-items:center;gap:8px;">
                  ${[1, 2, 3, 4, 5]
                    .map(
                      (s) => `
                    <button type="button" data-star="${s}" class="star-pick-btn ${s <= activeStars ? 'is-filled' : ''}" onclick="window.app.setTestimonialRating(${s})" aria-label="Rate ${s} stars">★</button>
                  `
                    )
                    .join('')}
                  <span id="testimonial-star-label" style="font-size:13.5px;font-weight:700;color:#F7941D;margin-left:8px;">${activeStars}.0 / 5.0 Stars</span>
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
                  Submitted testimonials are reviewed before appearing on the endorsements wall.
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
      rating: this.testimonialFormRating || 5,
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
      this.testimonialFormRating = 5;
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
  getFilteredBlogPosts() {
    const query = (this.blogSearch || '').trim().toLowerCase();
    return (this.blogPosts || []).filter((p) => {
      const catMatch = this.blogFilter === 'ALL' || p.category === this.blogFilter;
      if (!catMatch) return false;
      if (!query) return true;
      const hay = `${p.title || ''} ${p.summary || ''} ${p.category || ''} ${p.author || ''}`.toLowerCase();
      return hay.includes(query);
    });
  }

  renderBlogCardsHtml(filtered) {
    if (!filtered.length) {
      return `
        <div class="glass-card is-revealed" style="grid-column:1/-1;text-align:center;padding:42px 24px;">
          <h3 style="font-size:20px;font-weight:800;margin-bottom:8px;">No Matching Articles Found</h3>
          <p style="font-size:14px;color:var(--yole-text-muted);margin-bottom:16px;">Try searching a different topic or resetting the category filter.</p>
          <button type="button" class="btn btn-outline btn-sm" onclick="window.app.blogFilter='ALL';window.app.blogSearch='';window.app.render();">
            Show All Articles
          </button>
        </div>
      `;
    }
    return filtered
      .map(
        (post) => `
      <div class="glass-card blog-card is-revealed" onclick="window.app.navigate('blog-detail', '${post.slug}')">
        <div>
          ${post.coverImage ? `<div class="blog-card-image" style="aspect-ratio:1/1;"><img src="${post.coverImage}" alt="${post.title}" loading="lazy" decoding="async" /></div>` : ''}
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
            <span class="tech-pill lime" style="font-size:11px;padding:3px 10px;">${post.category || 'Data Analytics & BI'}</span>
            <span style="font-size:12.5px;color:var(--yole-text-muted);">${post.date} • ${post.readTime}</span>
          </div>
          <h2 style="font-size:22px;font-weight:800;margin-bottom:10px;line-height:1.3;">${post.title}</h2>
          <p style="font-size:14px;color:var(--yole-text-muted);margin-bottom:16px;">${post.summary}</p>
        </div>

        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(255,255,255,0.1);padding-top:12px;font-size:13.5px;font-weight:700;color:#C8E61E;">
            <span>By ${post.author}</span>
            <a href="/blog/${post.slug}" style="color:inherit;text-decoration:none;" onclick="event.preventDefault(); event.stopPropagation(); window.app.navigate('blog-detail', '${post.slug}')">Read Full Article →</a>
          </div>
        </div>
      </div>
    `
      )
      .join('');
  }

  setBlogFilter(cat) {
    this.blogFilter = cat;
    this.blogPage = 1;
    this.render();
  }

  setBlogPage(pageNum) {
    this.blogPage = Math.max(1, Number(pageNum) || 1);
    this.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  handleBlogSearch(val) {
    this.blogSearch = val;
    this.blogPage = 1;
    const gridMount = document.getElementById('blog-grid-mount');
    if (gridMount) {
      gridMount.innerHTML = this.renderBlogCardsHtml(this.getFilteredBlogPosts().slice(0, 9));
      window.YOLETECH_COMPONENTS?.decorateCardIcons(gridMount);
    }
  }

  renderBlogPage() {
    const categories = [
      'ALL',
      'Data Analytics & BI',
      'Full-Stack Web Development',
      'Python & Machine Learning',
      'AI & Workflow Automation',
      'Tech Tutorials & Mentorship',
      'Tech History',
      'Tech News Digest'
    ];

    const filtered = this.getFilteredBlogPosts();
    const pageSize = 9;
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const currentPage = Math.min(Math.max(1, Number(this.blogPage) || 1), totalPages);
    this.blogPage = currentPage;
    const pagePosts = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return `
      <section class="section">
        <div class="container">
          <div class="section-header">
            <div class="eyebrow"><span class="eyebrow-dot"></span> INSIGHTS &amp; TUTORIALS</div>
            <h1 class="section-title">Articles on Data Analytics, BI, Python &amp; Web Engineering</h1>
            <p class="section-desc">
              Practical guides, technical walkthroughs, computing history, and weekly technology digests.
            </p>
            ${
              this.user?.role === 'ADMIN'
                ? `<div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:16px;">
                    <button class="btn btn-lime btn-sm" onclick="window.app.adminWorkspace='crm';window.app.adminTab='blog';window.app.navigate('admin-dashboard')">+ Write New Article</button>
                  </div>`
                : ''
            }
            <div style="max-width:440px;margin:20px auto 0;">
              <label for="blog-search-input" class="sr-only">Search articles</label>
              <input
                type="search"
                id="blog-search-input"
                class="form-control"
                placeholder="Search articles by topic, tool, or title..."
                value="${this.blogSearch || ''}"
                oninput="window.app.handleBlogSearch(this.value)"
              />
            </div>

            <div id="blog-filter-pills" style="display:flex;justify-content:center;flex-wrap:wrap;gap:8px;margin-top:16px;">
              ${categories
                .map((cat) => {
                  const count =
                    cat === 'ALL'
                      ? (this.blogPosts || []).length
                      : (this.blogPosts || []).filter((p) => p.category === cat).length;
                  return `
                    <button type="button" data-cat="${cat}" class="selector-pill ${this.blogFilter === cat ? 'active' : ''}" onclick="window.app.setBlogFilter('${cat}')">
                      ${cat === 'ALL' ? 'All Articles' : cat} (${count})
                    </button>
                  `;
                })
                .join('')}
            </div>
          </div>

          <div id="blog-grid-mount" class="grid-3">
            ${this.renderBlogCardsHtml(pagePosts)}
          </div>

          ${
            totalPages > 1
              ? `<nav aria-label="Blog pagination" style="display:flex;justify-content:center;align-items:center;gap:10px;margin-top:32px;flex-wrap:wrap;">
                  <button type="button" class="btn btn-outline btn-sm" ${currentPage <= 1 ? 'disabled' : ''} onclick="window.app.setBlogPage(${currentPage - 1})">← Previous</button>
                  <span style="font-size:13.5px;color:var(--yole-text-muted);">Page ${currentPage} of ${totalPages} (${filtered.length} articles)</span>
                  <button type="button" class="btn btn-outline btn-sm" ${currentPage >= totalPages ? 'disabled' : ''} onclick="window.app.setBlogPage(${currentPage + 1})">Next →</button>
                </nav>`
              : ''
          }
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
      const languageLabel = lang
        ? `<span class="blog-code-language">${lang}</span>`
        : '<span class="blog-code-language">Plain text</span>';
      codeBlocks.push(
        `<div class="blog-code-block">${languageLabel}<button type="button" class="blog-code-copy" aria-label="Copy code snippet" onclick="window.app.copyBlogCode(this)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg><span>Copy</span></button><pre><code>${escaped}</code></pre></div>`
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

      const headingMatch = line.match(/^(#{1,6})\s+(.+?)\s*#*$/);
      if (headingMatch) {
        flushParagraph();
        flushList();
        const level = headingMatch[1].length;
        const semanticLevel = level === 1 ? 2 : level;
        const headingText = formatInline(headingMatch[2]);
        const headingStyles = {
          2: 'font-size:25px;font-weight:900;color:#FFFFFF;margin:30px 0 12px;border-bottom:1px solid rgba(255,255,255,0.12);padding-bottom:8px;',
          3: 'font-size:20px;font-weight:800;color:#C8E61E;margin:24px 0 10px;',
          4: 'font-size:18px;font-weight:800;color:#C8E61E;margin:22px 0 10px;',
          5: 'font-size:16px;font-weight:800;color:#FFFFFF;margin:20px 0 8px;',
          6: 'font-size:15px;font-weight:800;color:#FFFFFF;margin:18px 0 8px;'
        };
        htmlParts.push(`<h${semanticLevel} style="${headingStyles[semanticLevel]}">${headingText}</h${semanticLevel}>`);
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

  async copyBlogCode(button) {
    const code = button.closest('.blog-code-block')?.querySelector('pre code');
    if (!code) {
      this.showToast('Could not find the code snippet to copy.', 'error');
      return;
    }

    const copyWithFallback = () => {
      const textarea = document.createElement('textarea');
      textarea.value = code.textContent;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        return document.execCommand('copy');
      } finally {
        textarea.remove();
      }
    };

    const markCopied = () => {
      const label = button.querySelector('span');
      if (!label) return;
      label.textContent = 'Copied!';
      button.classList.add('is-copied');
      window.setTimeout(() => {
        label.textContent = 'Copy';
        button.classList.remove('is-copied');
      }, 1800);
    };

    try {
      let copied = false;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code.textContent);
        copied = true;
      } else {
        copied = copyWithFallback();
      }
      if (!copied) throw new Error('Clipboard copy was denied.');
      markCopied();
    } catch (error) {
      try {
        if (!copyWithFallback()) throw new Error('Clipboard copy was denied.');
        markCopied();
        return;
      } catch (fallbackError) {
        console.warn('Could not copy blog code snippet:', fallbackError || error);
      }
      this.showToast('Could not copy code. Please select and copy it manually.', 'error');
    }
  }

  async copyArticleLink(btn) {
    const url = window.location.href;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
      if (btn) {
        const orig = btn.innerHTML;
        btn.innerHTML = '✓ Link Copied!';
        setTimeout(() => {
          btn.innerHTML = orig;
        }, 2000);
      }
      this.showToast('Article link copied to clipboard!');
    } catch {
      this.showToast('Could not copy link automatically.', 'error');
    }
  }

  renderBlogPostDetail() {
    const post = this.activeBlogPost || this.blogPosts[0];
    if (!post) {
      return this.renderNotFoundPage();
    }
    const allPosts = this.blogPosts || [];
    const seriesPosts = post.series
      ? allPosts
          .filter((p) => p.series === post.series)
          .sort((a, b) => (a.seriesPart || 0) - (b.seriesPart || 0))
      : [];
    const relatedPosts = allPosts
      .filter((p) => p.slug !== post.slug && p.category === post.category)
      .slice(0, 3);
    const tags = Array.isArray(post.tags) ? post.tags : [];

    return `
      <section class="section">
        <div class="container" style="max-width:860px;">
          <nav aria-label="Breadcrumb" style="font-size:13px;color:var(--yole-text-muted);margin-bottom:14px;">
            <a href="/" onclick="event.preventDefault();window.app.navigate('home')">Home</a> /
            <a href="/blog" onclick="event.preventDefault();window.app.navigate('blog')">Blog</a> /
            <span>${post.title}</span>
          </nav>

          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:24px;">
            <button class="btn btn-outline btn-sm" onclick="window.app.navigate('blog')">
              ← Back to All Articles
            </button>
            <button type="button" class="btn btn-outline btn-sm" onclick="window.app.copyArticleLink(this)">
              Copy Article Link
            </button>
          </div>

          <article class="glass-card article-detail-card">
            <div style="font-size:13px;color:var(--yole-text-muted);margin-bottom:14px;">
              <span class="tech-pill lime" style="font-size:11px;padding:2px 9px;margin-right:8px;">${post.category}</span>
              Published <time datetime="${post.date}">${post.date}</time>${post.updated && post.updated !== post.date ? ` • Updated <time datetime="${post.updated}">${post.updated}</time>` : ''} • ${post.readTime}
            </div>

            <h1 style="font-size:clamp(26px,3.6vw,38px);font-weight:900;line-height:1.2;margin-bottom:16px;">
              ${post.title}
            </h1>

            <div style="display:flex;align-items:center;gap:12px;padding-bottom:22px;margin-bottom:24px;border-bottom:1px solid rgba(255,255,255,0.12);">
              <img src="/assets/yoletech-icon.png" alt="YOLETECH" width="40" height="40" style="width:40px;height:40px;border-radius:10px;" />
              <div>
                <div style="font-weight:800;font-size:14.5px;">${post.author}</div>
                <div style="font-size:12px;color:#C8E61E;">${window.YOLETECH_DATA?.owner?.jobTitle || 'Data Analyst, Business Intelligence Specialist & Full-Stack Web Developer'}</div>
              </div>
            </div>

            ${post.coverImage ? `<div style="border-radius:14px;overflow:hidden;margin-bottom:24px;max-height:360px;border:1px solid rgba(255,255,255,0.15);"><img src="${post.coverImage}" alt="${post.title}" width="960" height="540" style="width:100%;height:100%;object-fit:cover;" /></div>` : ''}

            ${
              seriesPosts.length > 1
                ? `<aside style="margin:0 0 22px;padding:14px 18px;border-radius:12px;border:1px solid rgba(200,230,30,0.35);background:rgba(200,230,30,0.06);" aria-label="Article series">
                    <div style="font-size:12px;font-weight:800;text-transform:uppercase;color:#C8E61E;margin-bottom:8px;">Series: ${post.series}</div>
                    <ol style="margin:0;padding-left:20px;font-size:14px;">
                      ${seriesPosts
                        .map((sp) =>
                          sp.slug === post.slug
                            ? `<li style="margin-bottom:4px;"><strong>Part ${sp.seriesPart || ''}: ${sp.title} (You are here)</strong></li>`
                            : `<li style="margin-bottom:4px;"><a href="/blog/${sp.slug}" onclick="event.preventDefault();window.app.navigate('blog-detail','${sp.slug}')" style="color:#C8E61E;text-decoration:underline;">Part ${sp.seriesPart || ''}: ${sp.title}</a></li>`
                        )
                        .join('')}
                    </ol>
                  </aside>`
                : ''
            }

            <div class="article-content">
              ${this.formatMarkdownToHtml(post.body)}
            </div>

            ${
              tags.length
                ? `<div style="margin-top:24px;display:flex;flex-wrap:wrap;gap:8px;" aria-label="Article tags">
                    ${tags.map((t) => `<span class="tech-pill" style="font-size:11.5px;padding:3px 10px;">#${t}</span>`).join('')}
                  </div>`
                : ''
            }

            <div style="margin-top:32px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.12);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
              <button type="button" class="btn btn-outline btn-sm" onclick="window.app.copyArticleLink(this)">
                Share Article
              </button>
              <button class="btn btn-lime btn-sm" onclick="window.app.navigate('contact')">
                Book a Discovery Call →
              </button>
            </div>
          </article>

          ${
            relatedPosts.length
              ? `<section style="margin-top:36px;" aria-labelledby="related-articles-heading">
                  <h2 id="related-articles-heading" style="font-size:22px;font-weight:900;margin-bottom:16px;">Related Articles</h2>
                  <div class="grid-3">
                    ${relatedPosts
                      .map(
                        (rp) => `
                      <article class="glass-card" style="cursor:pointer;" onclick="window.app.navigate('blog-detail','${rp.slug}')">
                        <span class="tech-pill lime" style="font-size:11px;padding:2px 9px;">${rp.category}</span>
                        <h3 style="font-size:16.5px;font-weight:800;margin:10px 0 8px;"><a href="/blog/${rp.slug}" onclick="event.preventDefault();event.stopPropagation();window.app.navigate('blog-detail','${rp.slug}')" style="color:inherit;text-decoration:none;">${rp.title}</a></h3>
                        <p style="font-size:13px;color:var(--yole-text-muted);margin:0;">${rp.date} • ${rp.readTime}</p>
                      </article>
                    `
                      )
                      .join('')}
                  </div>
                </section>`
              : ''
          }
        </div>
      </section>
    `;
  }

  // ==========================================================================
  // PAGE 7: CONTACT (SAMPLE 8917b911.jpg LAYOUT)
  // ==========================================================================
  selectContactPill(pill, btnEl) {
    this.contactServiceSelected = pill;
    const container = btnEl ? btnEl.closest('.service-selector-pills') : document.querySelector('.service-selector-pills');
    if (container) {
      container.querySelectorAll('.selector-pill').forEach((b) => {
        b.classList.toggle('active', b === btnEl || b.textContent.trim() === pill);
      });
    }
    const selectEl = document.querySelector('select[name="service_category"]');
    if (selectEl) {
      selectEl.value = pill;
    }
  }

  renderContactPage() {
    const D = window.YOLETECH_DATA;
    const serviceCategories = D.eightServicesStrip.map((s) => s.title);
    const activeService = serviceCategories.includes(this.contactServiceSelected)
      ? this.contactServiceSelected
      : serviceCategories[0];

    return `
      <section class="section">
        <div class="container">
          <div style="max-width:680px;margin-bottom:36px;">
            <div class="eyebrow"><span class="eyebrow-dot"></span> CONTACT YOLETECH</div>
            <h1 class="hero-title" style="font-size:clamp(32px,4vw,48px);margin-bottom:12px;">
              Start a Conversation About <span class="accent-lime">Your Project</span>
            </h1>
            <p style="font-size:16px;color:var(--yole-text-muted);">
              ${D.owner.responseTimeStatement}
            </p>
          </div>

          <div class="grid-2" style="align-items:start;">
            <!-- LEFT COLUMN: ACCESSIBLE PROJECT INQUIRY FORM -->
            <div class="glass-card" style="border-color:rgba(200,230,30,0.45);">
              <h2 style="font-size:20px;font-weight:800;margin-bottom:12px;">Send a Project Inquiry</h2>
              <div class="service-selector-pills" role="group" aria-label="Quick service selection">
                ${serviceCategories
                  .map(
                    (pill) => `
                  <button type="button" class="selector-pill ${
                    activeService === pill ? 'active' : ''
                  }" onclick="window.app.selectContactPill('${pill.replace(/'/g, "\\'")}', this)">
                    ${pill}
                  </button>
                `
                  )
                  .join('')}
              </div>

              <form id="yoletech-contact-form" novalidate onsubmit="window.app.handleContactSubmit(event)">
                <!-- Honeypot field for spam protection -->
                <div class="learn-honeypot" aria-hidden="true">
                  <label for="contact-website">Website</label>
                  <input id="contact-website" type="text" name="website" tabindex="-1" autocomplete="off" />
                </div>

                <div class="form-group">
                  <label class="form-label" for="contact-name">Your Full Name *</label>
                  <input id="contact-name" type="text" name="name" required autocomplete="name" class="form-control" placeholder="Your Full Name" value="${
                    this.user ? this.user.name : ''
                  }" />
                </div>

                <div class="grid-2" style="gap:14px;">
                  <div class="form-group">
                    <label class="form-label" for="contact-email">Email Address *</label>
                    <input id="contact-email" type="email" name="email" required autocomplete="email" class="form-control" placeholder="you@company.com" value="${
                      this.user ? this.user.email : ''
                    }" />
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="contact-phone">Phone / WhatsApp</label>
                    <input id="contact-phone" type="tel" name="phone" autocomplete="tel" class="form-control" placeholder="+234 ..." value="${
                      this.user ? this.user.phone || '' : ''
                    }" />
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label" for="contact-service">Service *</label>
                  <select id="contact-service" name="service_category" required class="form-control" onchange="window.app.selectContactPill(this.value)">
                    ${serviceCategories
                      .map(
                        (cat) => `
                      <option value="${cat}" ${activeService === cat ? 'selected' : ''}>${cat}</option>
                    `
                      )
                      .join('')}
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label" for="contact-message">Project Details &amp; Goals *</label>
                  <textarea id="contact-message" name="message" rows="5" required class="form-control" placeholder="Describe your goals, data sources, or technical requirements..."></textarea>
                </div>

                <div class="form-group">
                  <label class="learn-consent-label" for="contact-consent">
                    <input id="contact-consent" type="checkbox" name="consent" required />
                    <span>
                      I agree to YOLETECH's
                      <a href="/terms" onclick="event.preventDefault();window.app.navigate('terms');" style="text-decoration:underline;color:var(--yole-lime);">Terms of Service</a>
                      and
                      <a href="/privacy" onclick="event.preventDefault();window.app.navigate('privacy');" style="text-decoration:underline;color:var(--yole-lime);">Privacy Policy</a>
                      so you can respond to my inquiry.
                    </span>
                  </label>
                </div>

                <button type="submit" id="contact-submit-btn" class="btn btn-lime" style="width:100%;font-size:15px;padding:14px;">
                  Send Message →
                </button>
                ${this.renderFormConfirmation('contact')}
              </form>
            </div>

            <!-- RIGHT COLUMN: DIRECT CONTACT, HOURS, BOOKING & FAQ (NO SELF-LINKING CTA, PHONE SHOWN ONCE) -->
            <div style="display:flex;flex-direction:column;gap:22px;">
              <div class="glass-card">
                <h2 style="font-size:20px;font-weight:900;margin-bottom:14px;">Direct Contact &amp; Business Hours</h2>
                <div style="display:flex;flex-direction:column;gap:16px;">
                  <div>
                    <div style="font-size:12px;font-weight:800;color:#C8E61E;text-transform:uppercase;">Email</div>
                    <a href="mailto:${D.owner.email}" style="font-size:16px;font-weight:700;color:#FFFFFF;">${D.owner.email}</a>
                  </div>
                  <div>
                    <div style="font-size:12px;font-weight:800;color:#F7941D;text-transform:uppercase;">Tap to Call or Message on WhatsApp</div>
                    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:4px;">
                      <a href="tel:${D.owner.phoneE164 || '+2348025526389'}" style="font-size:16px;font-weight:700;color:#FFFFFF;">${D.owner.phone}</a>
                      <a href="${D.owner.whatsappUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">Open WhatsApp ↗</a>
                    </div>
                  </div>
                  <div>
                    <div style="font-size:12px;font-weight:800;color:#C8E61E;text-transform:uppercase;">Business Hours &amp; Time Zone</div>
                    <div style="font-size:14px;color:var(--yole-text-muted);">
                      ${D.owner.workingHours}<br/>
                      <a class="contact-location-link" href="${D.owner.locationUrl}" target="_blank" rel="noopener noreferrer">${D.owner.serviceArea} ↗</a>
                    </div>
                  </div>
                  <div>
                    <div style="font-size:12px;font-weight:800;color:#C8E61E;text-transform:uppercase;">Discovery Call Scheduling</div>
                    <p style="font-size:13.5px;color:var(--yole-text-muted);margin:4px 0 0;">
                      ${D.owner.bookingUrlPlaceholder}
                    </p>
                  </div>
                  <div>
                    <div style="font-size:12px;font-weight:800;color:#C8E61E;text-transform:uppercase;">Response Time</div>
                    <p style="font-size:13.5px;color:var(--yole-text-muted);margin:4px 0 0;">
                      ${D.owner.responseTimeStatement}
                    </p>
                  </div>
                </div>

                <div style="margin-top:18px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.12);">
                  <div style="font-size:12.5px;font-weight:800;margin-bottom:10px;">Official Profiles</div>
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
                <h2 style="font-size:19px;font-weight:900;margin-bottom:14px;">Frequently Asked Questions</h2>
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
      { name: 'service_category', label: 'Service', required: true },
      { name: 'message', label: 'Project Details & Goals', required: true, minLength: 10 }
    ]);
    if (!isValid) return;

    const consentBox = form.querySelector('input[name="consent"]');
    if (consentBox && !consentBox.checked) {
      this.setFormConfirmation('contact', {
        type: 'error',
        title: 'Consent Required',
        message: 'Please tick the Terms of Service and Privacy Policy consent checkbox before submitting.'
      });
      consentBox.focus();
      return;
    }

    const submitBtn = document.getElementById('contact-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending inquiry...';
    }

    const selectedCategory = form.service_category ? form.service_category.value : this.contactServiceSelected;
    const payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      phone: (form.phone.value || '').trim(),
      service_category: selectedCategory,
      message: form.message.value.trim(),
      consent: Boolean(consentBox ? consentBox.checked : true),
      website: form.website ? form.website.value : ''
    };

    const subject = `[YOLETECH Project Inquiry] ${payload.service_category} — ${payload.name}`;
    const emailBody = [
      `Full Name: ${payload.name}`,
      `Email: ${payload.email}`,
      `Phone / WhatsApp: ${payload.phone || 'N/A'}`,
      `Service: ${payload.service_category}`,
      '',
      'Project Details & Goals:',
      payload.message
    ].join('\n');

    const mailtoUrl = `mailto:${this.notifyEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
    const whatsappUrl = `https://wa.me/2348025526389?text=${encodeURIComponent(subject + '\n\n' + emailBody)}`;

    try {
      const res = await this.api('/api/inquiries', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const savedInquiry = res.inquiry || null;
      if (savedInquiry) {
        this.saveLocalInquiry(savedInquiry);
      }

      form.reset();
      this.setFormConfirmation('contact', {
        title: 'Inquiry Received',
        message: `Thank you, <strong>${payload.name}</strong>! Your <strong>${payload.service_category}</strong> inquiry has been received. We respond within 1 business day.`,
        actionsHtml: `
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <a href="${mailtoUrl}" class="btn btn-lime btn-sm">
              Open in Email App ↗
            </a>
            <a href="${whatsappUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">
              Send Copy on WhatsApp ↗
            </a>
          </div>
        `
      });
      this.showToast('Inquiry received! We will respond within 1 business day.');
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
        submitBtn.textContent = 'Send Message →';
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
              <div class="eyebrow" style="justify-content:center;">
                <span class="eyebrow-dot"></span> ${isLogin ? 'CLIENT & LEARNER PORTAL' : 'CLIENT PORTAL'}
              </div>
              <h1 style="font-size:28px;font-weight:900;">
                ${isLogin ? 'Sign In to Your Portal' : 'Create a Client Account'}
              </h1>
              <p style="font-size:14px;color:var(--yole-text-muted);margin-top:6px;">
                ${
                  isLogin
                    ? 'Sign in with your Client or Learner account — you will be directed automatically to your portal.'
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
                <div style="text-align:center;margin-top:16px;font-size:13px;color:var(--yole-text-muted);display:flex;flex-direction:column;gap:8px;">
                  <div>
                    New client?
                    <a style="color:#C8E61E;font-weight:700;cursor:pointer;margin-left:4px;" onclick="window.app.authMode='register';window.app.render();">
                      Create a Client Account →
                    </a>
                  </div>
                  <div>
                    Registering for a training program?
                    <a href="/learn" style="color:#C8E61E;font-weight:700;cursor:pointer;margin-left:4px;" onclick="event.preventDefault();window.app.navigate('learn').then(() => window.setTimeout(() => window.app.scrollToLearnRegistration?.(), 120));">
                      Register as a Learner →
                    </a>
                  </div>
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
    // Admin credentials are NEVER stored or verified client-side.
    // Only locally cached non-admin portal registrations may fall back when offline.
    const normEmail = String(email || '').trim().toLowerCase();
    const localUsers = this.getLocalRegisteredUsers().filter(
      (u) =>
        u &&
        String(u.email || '').toLowerCase() !== 'client@example.com' &&
        String(u.role || 'CLIENT').toUpperCase() !== 'ADMIN'
    );
    const matched = localUsers.find(
      (u) => String(u.email || '').toLowerCase() === normEmail && u._pwd === password
    );
    if (matched) {
      const { _pwd, ...cleanUser } = matched;
      const role = this.getUserRole(cleanUser);
      return {
        token: `local-${role.toLowerCase()}-jwt-${Date.now()}`,
        user: { ...cleanUser, role }
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

      const { token, user: rawUser } = authData;
      const userRole = this.getUserRole(rawUser);
      const user = { ...rawUser, role: userRole };
      this.token = token;
      this.user = user;
      this.inquiries = [];
      this.clients = [];
      if (this._learnState) {
        this._learnState.dashboardLoaded = false;
        this._learnState.dashboardProfile = null;
        this._learnState.dashboardEnrollments = [];
        this._learnState.dashboardError = '';
      }
      this.saveLocalRegisteredUser(user, password);
      localStorage.setItem('yoletech_token', token);
      localStorage.setItem('yoletech_user', JSON.stringify(user));

      const portalName =
        userRole === 'ADMIN'
          ? 'Admin Dashboard'
          : userRole === 'LEARNER'
          ? 'Learner Portal'
          : 'Client Portal';

      this.setFormConfirmation('login', {
        title: 'Sign-In Confirmed!',
        message: `Welcome back, <strong>${user.name}</strong>! Opening your ${portalName}...`
      });
      this.setFormConfirmation('auth-welcome', {
        title: 'Sign-In Confirmed',
        message: `Welcome back, <strong>${user.name}</strong> (${user.email})! Your session is verified and active.`
      });
      this.showToast(`Welcome back, ${user.name}!`);
      if (userRole === 'ADMIN') {
        const nextParam = new URLSearchParams(window.location.search || '').get('next') || '';
        if (nextParam === '/admin/' || nextParam === '/admin') {
          window.location.assign('/admin/');
          return;
        }
        await this.loadAdminData();
        await this.navigate('admin-dashboard');
      } else if (userRole === 'LEARNER') {
        if (typeof this.loadLearnerDashboardData === 'function') {
          await this.loadLearnerDashboardData(true);
        }
        await this.navigate('learn-dashboard');
      } else {
        await this.loadClientData();
        await this.navigate('portal');
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

      const { token, user: rawUser } = regData;
      const user = {
        ...rawUser,
        role: rawUser.role || 'CLIENT',
        status: rawUser.status || 'ACTIVE',
        created_at: rawUser.created_at || new Date().toISOString().slice(0, 19).replace('T', ' ')
      };
      this.saveLocalRegisteredUser(user, payload.password);

      this.token = token;
      this.user = user;
      localStorage.setItem('yoletech_token', token);
      localStorage.setItem('yoletech_user', JSON.stringify(user));
      if (typeof this.loadDashboardData === 'function') {
        this.loadDashboardData(true);
      }
      this.currentPage = 'portal';
      window.history.pushState({}, '', '/portal');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.render();
      this.showRegistrationSuccessModal();

      // Dispatch the registration notification without delaying portal access.
      this.sendEmailToYoletech({
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

      this.loadClientData().then(() => {
        if (this.currentPage === 'portal') this.render();
      });
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

  getPortalServiceTracks(currentTrack = '') {
    const baseTracks = [
      'Web Development',
      'Data Analysis & Analytics',
      'AI Automation',
      'Tech Tutorials',
      'Graphic Design',
      'Video Editing',
      'Customer Support',
      'IT Support'
    ];
    const clean = String(currentTrack || '').trim();
    if (clean && !baseTracks.includes(clean)) {
      return [clean, ...baseTracks];
    }
    return baseTracks;
  }

  getMilestoneDefinitions() {
    return [
      {
        step: 1,
        label: 'Submitted',
        shortLabel: 'Submitted',
        description: 'Brief verified & intake acknowledged',
        completedStatus: 'SCOPING',
        progress: 20,
        clientStatus: 'ONBOARDING'
      },
      {
        step: 2,
        label: 'Scoping',
        shortLabel: 'Scoping',
        description: 'Architecture, requirements & schedule locked',
        completedStatus: 'IN_PROGRESS',
        progress: 40,
        clientStatus: 'ACTIVE'
      },
      {
        step: 3,
        label: 'In Progress',
        shortLabel: 'In Progress',
        description: 'Core engineering, analytics & build delivered',
        completedStatus: 'REVIEW',
        progress: 60,
        clientStatus: 'ACTIVE'
      },
      {
        step: 4,
        label: 'Review',
        shortLabel: 'Review',
        description: 'Client staging preview & feedback approved',
        completedStatus: 'SIGN_OFF',
        progress: 80,
        clientStatus: 'ACTIVE'
      },
      {
        step: 5,
        label: 'Completed',
        shortLabel: 'Completed',
        description: 'Final handoff, documentation & sign-off complete',
        completedStatus: 'COMPLETED',
        progress: 100,
        clientStatus: 'COMPLETED'
      }
    ];
  }

  getCompletedMilestoneCount(inq) {
    const status = String(inq?.status || 'NEW').toUpperCase();
    const progress = Number.isFinite(Number(inq?.project_progress)) ? Number(inq.project_progress) : 10;
    if (status === 'COMPLETED' || status === 'RESOLVED' || progress >= 100) return 5;
    if (status === 'SIGN_OFF' || progress >= 80) return 4;
    if (status === 'REVIEW' || progress >= 60) return 3;
    if (status === 'IN_PROGRESS' || progress >= 40) return 2;
    if (status === 'SCOPING' || progress >= 20) return 1;
    return 0;
  }

  getPortalMilestoneStage(inq) {
    return Math.min(5, this.getCompletedMilestoneCount(inq) + 1);
  }

  parsePortalInquiryDetails(rawMessage = '') {
    const lines = String(rawMessage || '').split(/\r?\n/);
    const meta = { timeline: '', tier: '', referenceUrl: '' };
    const bodyLines = [];
    for (const line of lines) {
      const tl = line.match(/^\[Timeline:\s*(.+?)\]$/i);
      const tr = line.match(/^\[Engagement Tier:\s*(.+?)\]$/i);
      const rf = line.match(/^\[Reference Link:\s*(https?:\/\/[^\s\]]+)\]$/i);
      if (tl) meta.timeline = tl[1].trim();
      else if (tr) meta.tier = tr[1].trim();
      else if (rf) meta.referenceUrl = rf[1].trim();
      else bodyLines.push(line);
    }
    return {
      ...meta,
      cleanBody: bodyLines.join('\n').trim() || String(rawMessage || '').trim()
    };
  }

  extractDeliverableLinks(text = '') {
    const matches = String(text || '').match(/https?:\/\/[^\s<>"')\]]+/gi) || [];
    return [...new Set(matches.map((u) => u.replace(/[.,;:!?]+$/, '')))];
  }

  setPortalTab(tab) {
    this.portalTab = tab;
    this.render();
  }

  setPortalProjectFilter(filter) {
    this.portalProjectFilter = filter;
    this.render();
  }

  openPortalTestimonialCta(serviceTrack = '') {
    this.navigate('testimonials');
    setTimeout(() => {
      const formCard = document.querySelector('.testimonial-form-card');
      if (formCard) {
        const nameInput = formCard.querySelector('input[name="author_name"]');
        const companyInput = formCard.querySelector('input[name="company"]');
        const trackSelect = formCard.querySelector('select[name="service_track"]');
        if (nameInput && !nameInput.value && this.user?.name) nameInput.value = this.user.name;
        if (companyInput && !companyInput.value && this.user?.company) companyInput.value = this.user.company;
        if (trackSelect && serviceTrack) {
          const matchOpt = [...trackSelect.options].find(
            (o) => o.value.toLowerCase() === serviceTrack.toLowerCase()
          );
          if (matchOpt) trackSelect.value = matchOpt.value;
        }
        formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 140);
  }

  renderClientPortalPage() {
    if (!this.user) {
      return this.renderAuthPage();
    }
    if (this.getUserRole(this.user) === 'LEARNER' && typeof this.renderLearnerDashboardPage === 'function') {
      this.currentPage = 'learn-dashboard';
      if (typeof window !== 'undefined' && window.location.pathname !== '/learn/dashboard') {
        window.history.replaceState({}, '', '/learn/dashboard');
      }
      return this.renderLearnerDashboardPage();
    }

    const escHtml = (v) =>
      String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const userTrack = this.user.service_interest || 'Data Analysis & Analytics';
    const serviceTracks = this.getPortalServiceTracks(userTrack);
    const initials =
      String(this.user.name || 'YT')
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('') || 'YT';

    const joinedRaw = String(this.user.created_at || '').slice(0, 10);
    const joinedFormatted = /^\d{4}-\d{2}-\d{2}$/.test(joinedRaw)
      ? new Date(`${joinedRaw}T00:00:00Z`).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          timeZone: 'UTC'
        })
      : '';

    const allInquiries = Array.isArray(this.inquiries) ? this.inquiries : [];
    const isInqCompleted = (inq) => {
      const st = String(inq?.status || 'NEW').toUpperCase();
      const prog = Number(inq?.project_progress ?? 15);
      return st === 'COMPLETED' || st === 'RESOLVED' || prog >= 100;
    };

    const totalCount = allInquiries.length;
    const completedList = allInquiries.filter(isInqCompleted);
    const activeList = allInquiries.filter((inq) => !isInqCompleted(inq));
    const completedCount = completedList.length;
    const activeCount = activeList.length;
    const avgProgress = totalCount
      ? Math.round(
          allInquiries.reduce((sum, inq) => {
            const p = isInqCompleted(inq)
              ? 100
              : Number.isFinite(Number(inq.project_progress))
              ? Number(inq.project_progress)
              : 15;
            return sum + p;
          }, 0) / totalCount
        )
      : 0;

    const deliverables = [];
    allInquiries.forEach((inq, idx) => {
      const ticketId = `YT-${String(1000 + (Number(inq.id) % 9000 || idx + 1)).padStart(4, '0')}`;
      const urls = this.extractDeliverableLinks(inq.admin_response);
      urls.forEach((url) => {
        deliverables.push({
          ticketId,
          category: inq.service_category || userTrack,
          status: String(inq.status || 'IN_PROGRESS').toUpperCase(),
          url,
          note: String(inq.admin_response || '').replace(url, '').trim(),
          date: String(inq.created_at || '').slice(0, 10)
        });
      });
    });

    const activeTab = ['overview', 'new-request', 'deliverables', 'settings'].includes(this.portalTab)
      ? this.portalTab
      : 'overview';

    const discoveryCallText = encodeURIComponent(
      `Hello Yoletech, I am ${this.user.name}${this.user.company ? ` (${this.user.company})` : ''} from the Client Portal. I'd like to schedule a 15-minute discovery / review call regarding ${userTrack}.`
    );

    const statusMeta = {
      NEW: { label: 'Submitted', pillClass: 'orange', sla: '24h Scoping SLA' },
      SCOPING: { label: 'Scoping & Audit', pillClass: 'orange', sla: 'Architecture Review' },
      IN_PROGRESS: { label: 'In Development', pillClass: 'lime', sla: 'Active Build' },
      REVIEW: { label: 'Client Review', pillClass: 'lime', sla: 'Ready for Feedback' },
      SIGN_OFF: { label: 'Final Sign-Off', pillClass: 'lime', sla: 'Ready for Completion' },
      COMPLETED: { label: 'Completed', pillClass: 'lime', sla: 'Delivered & Signed Off' },
      RESOLVED: { label: 'Completed', pillClass: 'lime', sla: 'Delivered & Signed Off' }
    };

    const milestoneLabels = ['Submitted', 'Scoping', 'In Progress', 'Review', 'Completed'];

    const filteredInquiries =
      this.portalProjectFilter === 'ACTIVE'
        ? activeList
        : this.portalProjectFilter === 'COMPLETED'
        ? completedList
        : allInquiries;

    const renderProjectCard = (inq, idx) => {
      const rawStatus = String(inq.status || 'NEW').toUpperCase();
      const doneSteps = this.getCompletedMilestoneCount(inq);
      const completed = doneSteps >= 5 || isInqCompleted(inq);
      const progress = completed
        ? 100
        : Number.isFinite(Number(inq.project_progress))
        ? Math.min(99, Math.max(5, Number(inq.project_progress)))
        : 10;
      const meta = statusMeta[rawStatus] || statusMeta.NEW;
      const ticketId = `YT-${String(1000 + (Number(inq.id) % 9000 || idx + 1)).padStart(4, '0')}`;
      const createdDate = String(inq.created_at || '').slice(0, 10);
      const createdFmt = /^\d{4}-\d{2}-\d{2}$/.test(createdDate)
        ? new Date(`${createdDate}T00:00:00Z`).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            timeZone: 'UTC'
          })
        : 'Recent';
      const parsed = this.parsePortalInquiryDetails(inq.message);
      const links = this.extractDeliverableLinks(inq.admin_response);
      const followUpWa = `https://wa.me/2348025526389?text=${encodeURIComponent(
        `Hi Yoletech, following up on Portal Request #${ticketId} (${inq.service_category || userTrack}) for ${this.user.name}.`
      )}`;
      const followUpMail = `mailto:${this.notifyEmail}?subject=${encodeURIComponent(
        `[Follow-Up #${ticketId}] ${inq.service_category || userTrack} — ${this.user.name}`
      )}`;

      return `
        <article class="portal-project-card">
          <div class="portal-project-top">
            <div class="portal-project-badges">
              <span class="portal-ticket-id">#${escHtml(ticketId)}</span>
              <span class="tech-pill lime">${escHtml(inq.service_category || userTrack)}</span>
              <span class="portal-sla-chip">${escHtml(meta.sla)}</span>
            </div>
            <div class="portal-project-meta-right">
              <span class="portal-date-label">Submitted ${escHtml(createdFmt)}</span>
              <span class="tech-pill ${meta.pillClass}">${escHtml(meta.label)}</span>
            </div>
          </div>

          <p class="portal-project-scope">${escHtml(parsed.cleanBody)}</p>

          ${
            parsed.timeline || parsed.tier || parsed.referenceUrl
              ? `<div class="portal-brief-chips">
                  ${parsed.timeline ? `<span class="portal-brief-chip">⏱ Timeline: <strong>${escHtml(parsed.timeline)}</strong></span>` : ''}
                  ${parsed.tier ? `<span class="portal-brief-chip">📦 Tier: <strong>${escHtml(parsed.tier)}</strong></span>` : ''}
                  ${
                    parsed.referenceUrl
                      ? `<a href="${escHtml(parsed.referenceUrl)}" target="_blank" rel="noopener noreferrer" class="portal-brief-chip portal-brief-link">🔗 Reference / Dataset Link ↗</a>`
                      : ''
                  }
                </div>`
              : ''
          }

          <div class="portal-Stepper-wrap">
            <div class="portal-progress-header">
              <span>Delivery Milestone Tracker</span>
              <strong>${progress}% Complete</strong>
            </div>
            <div class="portal-progress-track" role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100">
              <div class="portal-progress-fill" style="width:${progress}%;"></div>
            </div>
            <ol class="portal-stepper" aria-label="Project milestones">
              ${milestoneLabels
                .map((lbl, i) => {
                  const stepNum = i + 1;
                  const stateClass =
                    stepNum <= doneSteps || completed
                      ? 'is-done'
                      : stepNum === doneSteps + 1
                      ? 'is-current'
                      : 'is-upcoming';
                  return `<li class="portal-step ${stateClass}">
                    <span class="portal-step-dot">${stepNum <= doneSteps || completed ? '✓' : stepNum}</span>
                    <span class="portal-step-label">${lbl}</span>
                  </li>`;
                })
                .join('')}
            </ol>
          </div>

          ${
            inq.admin_response
              ? `<div class="portal-admin-update">
                  <div class="portal-admin-update-head">
                    <strong>Update from Yoletech</strong>
                  </div>
                  <p>${escHtml(inq.admin_response)}</p>
                  ${
                    links.length
                      ? `<div class="portal-deliverable-btns">
                          ${links
                            .map(
                              (url, lIdx) => `
                            <a href="${escHtml(url)}" target="_blank" rel="noopener noreferrer" class="btn btn-lime btn-sm">
                              🔗 Open Deliverable${links.length > 1 ? ` #${lIdx + 1}` : ''} ↗
                            </a>
                          `
                            )
                            .join('')}
                        </div>`
                      : ''
                  }
                </div>`
              : ''
          }

          <div class="portal-project-actions">
            <div class="portal-project-actions-left">
              <a href="${followUpWa}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">
                💬 Follow Up on WhatsApp ↗
              </a>
              <a href="${followUpMail}" class="btn btn-outline btn-sm">
                ✉️ Email About #${escHtml(ticketId)}
              </a>
            </div>
            ${
              completed
                ? `<button type="button" class="btn btn-lime btn-sm" onclick="window.app.openPortalTestimonialCta('${escHtml(
                    inq.service_category || userTrack
                  )}')">
                    ★ Rate Delivery / Leave Review →
                  </button>`
                : ''
            }
          </div>
        </article>
      `;
    };

    const pwdType = this.showPortalPassword ? 'text' : 'password';

    return `
      <section class="section portal-section">
        <div class="container">
          ${this.renderFormConfirmation('auth-welcome')}

          <!-- BRANDED EXECUTIVE CLIENT HEADER -->
          <div class="glass-card portal-hero-banner">
            <div class="portal-hero-identity">
              <div class="portal-avatar" aria-hidden="true">${escHtml(initials)}</div>
              <div class="portal-hero-copy">
                <div class="eyebrow" style="margin-bottom:6px;"><span class="eyebrow-dot"></span> REGISTERED CLIENT WORKSPACE</div>
                <h1 class="portal-welcome-title">Welcome, ${escHtml(this.user.name)}</h1>
                <div class="portal-identity-chips">
                  <span class="portal-meta-chip">🏢 ${escHtml(this.user.company || 'Client Partner')}</span>
                  <span class="portal-meta-chip">✓ ${escHtml(this.user.email)}</span>
                  <span class="portal-meta-chip portal-meta-track">Primary Track: <strong>${escHtml(userTrack)}</strong></span>
                  <span class="portal-meta-chip portal-meta-status">● ${escHtml(
                    String(this.user.status || 'ACTIVE').toUpperCase()
                  )}${joinedFormatted ? ` • Since ${escHtml(joinedFormatted)}` : ''}</span>
                </div>
              </div>
            </div>

            <div class="portal-hero-actions">
              ${
                this.user.role === 'ADMIN'
                  ? `<button type="button" class="btn btn-outline btn-sm" onclick="window.app.navigate('admin-dashboard')">Open Admin CRM →</button>`
                  : ''
              }
              <a href="https://wa.me/2348025526389?text=${discoveryCallText}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">
                📅 Book 15-Min Call ↗
              </a>
              <a href="https://wa.me/2348025526389" target="_blank" rel="noopener noreferrer" class="btn btn-lime btn-sm">
                💬 Direct WhatsApp Support →
              </a>
              <button type="button" class="btn btn-outline btn-sm" onclick="window.app.logout()">Sign Out</button>
            </div>
          </div>

          <!-- 4-CARD KPI SUMMARY STRIP -->
          <div class="portal-kpi-grid" role="list" aria-label="Workspace summary metrics">
            <div class="glass-card portal-kpi-card" role="listitem">
              <span class="portal-kpi-label">Total Service Requests</span>
              <strong class="portal-kpi-value">${totalCount}</strong>
              <span class="portal-kpi-sub">${activeCount} active · ${completedCount} completed</span>
            </div>
            <div class="glass-card portal-kpi-card" role="listitem">
              <span class="portal-kpi-label">Active / In Delivery</span>
              <strong class="portal-kpi-value accent-lime">${activeCount}</strong>
              <span class="portal-kpi-sub">${activeCount ? 'In scoping, build, or review' : 'Ready for your next brief'}</span>
            </div>
            <div class="glass-card portal-kpi-card" role="listitem">
              <span class="portal-kpi-label">Completed Deliverables</span>
              <strong class="portal-kpi-value">${completedCount}</strong>
              <span class="portal-kpi-sub">${deliverables.length} shared deliverable link${deliverables.length === 1 ? '' : 's'}</span>
            </div>
            <div class="glass-card portal-kpi-card" role="listitem">
              <span class="portal-kpi-label">Overall Completion</span>
              <strong class="portal-kpi-value">${totalCount ? `${avgProgress}%` : '—'}</strong>
              <span class="portal-kpi-sub">${totalCount ? 'Average milestone progress' : 'Submit a request to track'}</span>
            </div>
          </div>

          <!-- BALANCED WORKSPACE TABS -->
          <div class="portal-tabs-bar" role="tablist" aria-label="Client portal sections">
            <button type="button" role="tab" aria-selected="${activeTab === 'overview'}" class="portal-tab-btn ${
      activeTab === 'overview' ? 'active' : ''
    }" onclick="window.app.setPortalTab('overview')">
              <span>📋 Overview &amp; Projects</span>
              <span class="portal-tab-count">${totalCount}</span>
            </button>
            <button type="button" role="tab" aria-selected="${activeTab === 'new-request'}" class="portal-tab-btn ${
      activeTab === 'new-request' ? 'active' : ''
    }" onclick="window.app.setPortalTab('new-request')">
              <span>＋ New Service Request</span>
            </button>
            <button type="button" role="tab" aria-selected="${activeTab === 'deliverables'}" class="portal-tab-btn ${
      activeTab === 'deliverables' ? 'active' : ''
    }" onclick="window.app.setPortalTab('deliverables')">
              <span>🚀 Deliverables &amp; Resources</span>
              <span class="portal-tab-count">${deliverables.length}</span>
            </button>
            <button type="button" role="tab" aria-selected="${activeTab === 'settings'}" class="portal-tab-btn ${
      activeTab === 'settings' ? 'active' : ''
    }" onclick="window.app.setPortalTab('settings')">
              <span>⚙️ Account &amp; Security</span>
            </button>
          </div>

          <!-- TAB 1: OVERVIEW & PROJECTS -->
          ${
            activeTab === 'overview'
              ? `
            <div class="portal-overview-layout">
              <div class="glass-card">
                <div class="portal-section-head">
                  <div>
                    <h2 style="font-size:21px;font-weight:900;margin:0;">Your Projects &amp; Service Requests</h2>
                    <p style="font-size:13.5px;color:var(--yole-text-muted);margin:4px 0 0;">Live milestone tracking, SLA status, and direct team updates.</p>
                  </div>
                  <div class="portal-filter-group">
                    <button type="button" class="selector-pill ${this.portalProjectFilter === 'ALL' ? 'active' : ''}" onclick="window.app.setPortalProjectFilter('ALL')">All (${totalCount})</button>
                    <button type="button" class="selector-pill ${this.portalProjectFilter === 'ACTIVE' ? 'active' : ''}" onclick="window.app.setPortalProjectFilter('ACTIVE')">Active (${activeCount})</button>
                    <button type="button" class="selector-pill ${this.portalProjectFilter === 'COMPLETED' ? 'active' : ''}" onclick="window.app.setPortalProjectFilter('COMPLETED')">Completed (${completedCount})</button>
                    <button type="button" class="btn btn-lime btn-sm" onclick="window.app.setPortalTab('new-request')">+ Request New Project</button>
                  </div>
                </div>

                ${
                  filteredInquiries.length === 0
                    ? `<div class="portal-empty-state">
                        <h3>${totalCount === 0 ? 'No Service Requests Submitted Yet' : 'No Matching Requests in This Filter'}</h3>
                        <p>${
                          totalCount === 0
                            ? `Ready to launch your next ${escHtml(userTrack)} deliverable? Submit a structured project brief and receive a scoped technical roadmap within 24 hours.`
                            : 'Switch the status filter above to view all your submitted requests.'
                        }</p>
                        <div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin-top:16px;">
                          ${
                            totalCount === 0
                              ? `<button type="button" class="btn btn-lime" onclick="window.app.setPortalTab('new-request')">Start a New Service Request →</button>`
                              : `<button type="button" class="btn btn-outline btn-sm" onclick="window.app.setPortalProjectFilter('ALL')">Show All Requests</button>`
                          }
                        </div>
                      </div>`
                    : `<div class="portal-projects-stack">
                        ${filteredInquiries.map((inq, idx) => renderProjectCard(inq, idx)).join('')}
                      </div>`
                }
              </div>

              <!-- SIDEBAR: QUICK ACTIONS & SLA GUARANTEES -->
              <aside class="portal-side-stack">
                <div class="glass-card contact-discovery-card">
                  <h3 style="font-size:19px;font-weight:900;margin-bottom:6px;">Need a New Deliverable?</h3>
                  <p style="font-size:13.5px;margin-bottom:16px;">
                    Submit a project brief with your target timeline and dataset/reference links for priority scoping.
                  </p>
                  <button type="button" class="btn btn-lime" style="width:100%;" onclick="window.app.setPortalTab('new-request')">
                    + Submit New Request →
                  </button>
                </div>

                <div class="glass-card">
                  <h3 style="font-size:17px;font-weight:900;margin-bottom:12px;">Client Delivery Standards</h3>
                  <ul class="portal-sla-list">
                    <li><strong>24-Hour Scoping SLA:</strong> Every new brief receives a technical review and response within 1 business day.</li>
                    <li><strong>Live Milestone Tracking:</strong> Track progress from <em>Submitted</em> through <em>Client Review</em> and <em>Completed</em>.</li>
                    <li><strong>Direct Deliverable Access:</strong> Staging links, dashboards, and repositories appear directly inside your ticket and the <em>Deliverables</em> tab.</li>
                  </ul>
                  <div style="margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.1);display:flex;flex-direction:column;gap:8px;font-size:13px;">
                    <div><strong>Priority Email:</strong> <a href="mailto:${escHtml(this.notifyEmail)}" style="color:#C8E61E;font-weight:700;">${escHtml(this.notifyEmail)}</a></div>
                    <div><strong>Hours:</strong> Mon – Fri, 9 AM – 6 PM (GMT+1)</div>
                  </div>
                </div>
              </aside>
            </div>
          `
              : ''
          }

          <!-- TAB 2: NEW SERVICE REQUEST -->
          ${
            activeTab === 'new-request'
              ? `
            <div class="portal-overview-layout">
              <div class="glass-card">
                <div style="margin-bottom:20px;">
                  <div class="eyebrow"><span class="eyebrow-dot"></span> PRIORITY PROJECT BRIEF</div>
                  <h2 style="font-size:22px;font-weight:900;margin:4px 0 6px;">Request a New Service / Project</h2>
                  <p style="font-size:14px;color:var(--yole-text-muted);margin:0;">Provide your scope, preferred timeline, and any reference links so Yoletech can prepare an accurate delivery plan.</p>
                </div>

                <form novalidate onsubmit="window.app.handleClientPortalInquiry(event)">
                  <div class="grid-2" style="gap:14px;">
                    <div class="form-group">
                      <label class="form-label">Project Category *</label>
                      <select name="service_category" class="form-control">
                        ${serviceTracks
                          .map(
                            (track) =>
                              `<option value="${escHtml(track)}" ${track === userTrack ? 'selected' : ''}>${escHtml(track)}</option>`
                          )
                          .join('')}
                      </select>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Target Timeline / Urgency</label>
                      <select name="timeline" class="form-control">
                        <option value="Standard (2 - 4 Weeks)" selected>Standard (2 – 4 Weeks)</option>
                        <option value="Priority / Urgent (Within 7 Days)">Priority / Urgent (Within 7 Days)</option>
                        <option value="Flexible / Exploratory">Flexible / Exploratory</option>
                        <option value="Ongoing Monthly Retainer">Ongoing Monthly Retainer</option>
                      </select>
                    </div>
                  </div>

                  <div class="grid-2" style="gap:14px;">
                    <div class="form-group">
                      <label class="form-label">Engagement Tier</label>
                      <select name="engagement_tier" class="form-control">
                        <option value="Standard End-to-End Project" selected>Standard End-to-End Project</option>
                        <option value="Single Deliverable / Quick Sprint">Single Deliverable / Quick Sprint</option>
                        <option value="Enterprise / Multi-Departmental">Enterprise / Multi-Departmental</option>
                        <option value="Need Custom Estimate">Need Custom Estimate</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Dataset / Reference URL (Optional)</label>
                      <input type="url" name="reference_url" class="form-control" placeholder="https://drive.google.com/... or Figma / repo link" />
                    </div>
                  </div>

                  <div class="form-group">
                    <label class="form-label">Project Scope &amp; Deliverables *</label>
                    <textarea name="message" rows="5" required class="form-control" placeholder="Describe your goals, data sources, key KPIs/features, and expected deliverables..."></textarea>
                  </div>

                  <button type="submit" id="portal-inquiry-submit-btn" class="btn btn-lime" style="width:100%;padding:14px;font-size:15px;">
                    Submit Request to Yoletech →
                  </button>
                  ${this.renderFormConfirmation('portal-inquiry')}
                </form>
              </div>

              <aside class="portal-side-stack">
                <div class="glass-card">
                  <h3 style="font-size:18px;font-weight:900;margin-bottom:14px;">How Your Request Progresses</h3>
                  <ol class="portal-roadmap-list">
                    <li><strong>1. Technical Scoping (Within 24h)</strong><span>We review your requirements, datasets, and timeline.</span></li>
                    <li><strong>2. Architecture &amp; Milestone Lock</strong><span>Scope, deliverables, and schedule are confirmed with you.</span></li>
                    <li><strong>3. Iterative Build &amp; Live Tracking</strong><span>Watch real-time progress and milestone notes in your portal.</span></li>
                    <li><strong>4. Review &amp; Final Handoff</strong><span>Test staging links/dashboards, approve delivery, and receive documentation.</span></li>
                  </ol>
                </div>
              </aside>
            </div>
          `
              : ''
          }

          <!-- TAB 3: DELIVERABLES & RESOURCES -->
          ${
            activeTab === 'deliverables'
              ? `
            <div style="display:flex;flex-direction:column;gap:24px;">
              <div class="glass-card">
                <h2 style="font-size:21px;font-weight:900;margin:0 0 6px;">Shared Project Deliverables &amp; Staging Links</h2>
                <p style="font-size:13.5px;color:var(--yole-text-muted);margin:0 0 18px;">All live dashboards, staging previews, repositories, and handoff folders shared on your projects appear here automatically.</p>

                ${
                  deliverables.length === 0
                    ? `<div class="portal-empty-state">
                        <h3>No Deliverable Links Published Yet</h3>
                        <p>As your active requests reach review and completion milestones, Yoletech will publish interactive dashboard links, staging URLs, and documentation right here.</p>
                        <button type="button" class="btn btn-outline btn-sm" style="margin-top:12px;" onclick="window.app.setPortalTab('overview')">View Active Requests →</button>
                      </div>`
                    : `<div class="grid-2" style="gap:16px;">
                        ${deliverables
                          .map(
                            (d) => `
                          <div class="portal-deliverable-card">
                            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;">
                              <span class="portal-ticket-id">#${escHtml(d.ticketId)}</span>
                              <span class="tech-pill lime">${escHtml(d.category)}</span>
                            </div>
                            ${d.note ? `<p style="font-size:13.5px;margin:0 0 12px;">${escHtml(d.note)}</p>` : ''}
                            <a href="${escHtml(d.url)}" target="_blank" rel="noopener noreferrer" class="btn btn-lime btn-sm">
                              🔗 Open Deliverable ↗
                            </a>
                          </div>
                        `
                          )
                          .join('')}
                      </div>`
                }
              </div>

              <div class="glass-card">
                <h3 style="font-size:19px;font-weight:900;margin:0 0 14px;">Client Resources &amp; Reference Guides</h3>
                <div class="grid-2" style="gap:16px;">
                  <div class="portal-resource-card">
                    <strong>Interactive Executive BI Dashboard</strong>
                    <p>Explore live KPI architectures, lifecycle funnels, and analytics benchmarks built by Yoletech.</p>
                    <button type="button" class="btn btn-outline btn-sm" onclick="window.app.navigate('dashboard')">Open Live Dashboard →</button>
                  </div>
                  <div class="portal-resource-card">
                    <strong>Case Studies &amp; Architectures</strong>
                    <p>Review Power BI, Streamlit ML, Python automation, and full-stack deployments.</p>
                    <button type="button" class="btn btn-outline btn-sm" onclick="window.app.navigate('portfolio')">View Case Studies →</button>
                  </div>
                  <div class="portal-resource-card">
                    <strong>Technical Guides &amp; Tutorials</strong>
                    <p>Read practical walkthroughs on SQL optimization, FastAPI, Next.js, and BI engineering.</p>
                    <button type="button" class="btn btn-outline btn-sm" onclick="window.app.navigate('blog')">Read Articles →</button>
                  </div>
                  <div class="portal-resource-card">
                    <strong>Share Feedback / Endorsement</strong>
                    <p>Worked with Yoletech on a completed milestone? Share your experience on our client wall.</p>
                    <button type="button" class="btn btn-outline btn-sm" onclick="window.app.openPortalTestimonialCta('${escHtml(userTrack)}')">Leave a Review ★</button>
                  </div>
                </div>
              </div>
            </div>
          `
              : ''
          }

          <!-- TAB 4: ACCOUNT & SECURITY SETTINGS -->
          ${
            activeTab === 'settings'
              ? `
            <div class="grid-2" style="align-items:start;gap:24px;">
              <div class="glass-card">
                <h2 style="font-size:20px;font-weight:900;margin:0 0 6px;">Account &amp; Profile Settings</h2>
                <p style="font-size:13.5px;color:var(--yole-text-muted);margin:0 0 18px;">Keep your organization details and primary service track up to date.</p>

                <form novalidate onsubmit="window.app.handleProfileUpdateSubmit(event)">
                  <div class="form-group">
                    <label class="form-label">Registered Email Address</label>
                    <input type="email" class="form-control" value="${escHtml(this.user.email || '')}" readonly disabled style="opacity:0.75;cursor:not-allowed;" />
                  </div>
                  <div class="grid-2" style="gap:12px;">
                    <div class="form-group">
                      <label class="form-label">Full Name *</label>
                      <input type="text" name="name" required class="form-control" value="${escHtml(this.user.name || '')}" />
                    </div>
                    <div class="form-group">
                      <label class="form-label">WhatsApp / Phone</label>
                      <input type="text" name="phone" class="form-control" value="${escHtml(this.user.phone || '')}" />
                    </div>
                  </div>
                  <div class="grid-2" style="gap:12px;">
                    <div class="form-group">
                      <label class="form-label">Organization / Company</label>
                      <input type="text" name="company" class="form-control" value="${escHtml(this.user.company || '')}" />
                    </div>
                    <div class="form-group">
                      <label class="form-label">Primary Service Track</label>
                      <select name="service_interest" class="form-control">
                        ${serviceTracks
                          .map(
                            (track) =>
                              `<option value="${escHtml(track)}" ${track === userTrack ? 'selected' : ''}>${escHtml(track)}</option>`
                          )
                          .join('')}
                      </select>
                    </div>
                  </div>
                  <button type="submit" id="profile-submit-btn" class="btn btn-lime btn-sm" style="padding:11px 22px;">Save Profile Changes →</button>
                  ${this.renderFormConfirmation('profile-settings')}
                </form>
              </div>

              <div class="glass-card">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;">
                  <h2 style="font-size:20px;font-weight:900;margin:0;">Password &amp; Security</h2>
                  <button type="button" style="background:none;border:none;color:#C8E61E;font-size:12px;font-weight:700;cursor:pointer;" onclick="window.app.showPortalPassword=!window.app.showPortalPassword;window.app.render();">
                    ${this.showPortalPassword ? 'Hide Passwords' : 'Show Passwords'}
                  </button>
                </div>
                <p style="font-size:13.5px;color:var(--yole-text-muted);margin:0 0 18px;">Update your portal sign-in password at any time.</p>

                <form novalidate onsubmit="window.app.handlePasswordUpdateSubmit(event)">
                  <div class="form-group">
                    <label class="form-label">Current Password *</label>
                    <input type="${pwdType}" name="current_password" required autocomplete="current-password" class="form-control" placeholder="Enter your current password" />
                  </div>
                  <div class="grid-2" style="gap:12px;">
                    <div class="form-group">
                      <label class="form-label">New Password *</label>
                      <input type="${pwdType}" name="new_password" required minlength="6" autocomplete="new-password" class="form-control" placeholder="Min. 6 characters" />
                    </div>
                    <div class="form-group">
                      <label class="form-label">Confirm New Password *</label>
                      <input type="${pwdType}" name="confirm_password" required minlength="6" autocomplete="new-password" class="form-control" placeholder="Re-enter new password" />
                    </div>
                  </div>
                  <button type="submit" id="password-submit-btn" class="btn btn-outline btn-sm" style="padding:11px 22px;">Update Password →</button>
                  ${this.renderFormConfirmation('password-settings')}
                </form>
              </div>
            </div>
          `
              : ''
          }
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
        const res = await this.api('/api/auth/profile', {
          method: 'PUT',
          body: JSON.stringify(updatedFields)
        });
        updatedUser = res.user;
        if (res.token) {
          this.token = res.token;
          localStorage.setItem('yoletech_token', res.token);
        }
      } catch {
        updatedUser = { ...this.user, ...updatedFields };
      }
      this.user = updatedUser;
      this.saveLocalRegisteredUser(updatedUser);
      localStorage.setItem('yoletech_user', JSON.stringify(updatedUser));
      if (typeof this.loadDashboardData === 'function') {
        this.loadDashboardData(true);
      }
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
        submitBtn.textContent = 'Save Profile Changes →';
      }
    }
  }

  async handlePasswordUpdateSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const curPwd = (form.current_password?.value || '').trim();
    const newPwd = (form.new_password?.value || '').trim();
    const confPwd = (form.confirm_password?.value || '').trim();

    if (!curPwd || !newPwd || !confPwd) {
      this.setFormConfirmation('password-settings', {
        type: 'error',
        title: 'Missing Password Fields',
        message: 'Please complete your current password, new password, and confirmation.'
      });
      this.render();
      return;
    }
    if (newPwd.length < 6) {
      this.setFormConfirmation('password-settings', {
        type: 'error',
        title: 'Password Too Short',
        message: 'Your new password must be at least 6 characters long.'
      });
      this.render();
      return;
    }
    if (newPwd !== confPwd) {
      this.setFormConfirmation('password-settings', {
        type: 'error',
        title: 'Passwords Do Not Match',
        message: 'New password and confirmation password do not match.'
      });
      this.render();
      return;
    }

    const submitBtn = document.getElementById('password-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Updating Password...';
    }

    try {
      try {
        const res = await this.api('/api/auth/profile', {
          method: 'PUT',
          body: JSON.stringify({
            name: this.user.name,
            phone: this.user.phone,
            company: this.user.company,
            service_interest: this.user.service_interest,
            current_password: curPwd,
            new_password: newPwd
          })
        });
        if (res?.token) {
          this.token = res.token;
          localStorage.setItem('yoletech_token', res.token);
        }
      } catch (apiErr) {
        if (String(apiErr.message || '').toLowerCase().includes('incorrect')) {
          throw apiErr;
        }
        const localRec = this.getLocalRegisteredUsers().find(
          (u) => String(u.email || '').toLowerCase() === String(this.user.email || '').toLowerCase()
        );
        if (localRec && localRec._pwd && localRec._pwd !== curPwd) {
          throw new Error('Current password is incorrect.');
        }
      }

      this.saveLocalRegisteredUser(this.user, newPwd);
      form.reset();
      this.setFormConfirmation('password-settings', {
        title: 'Password Updated!',
        message: 'Your Client Portal password has been securely updated.'
      });
      this.showToast('Password updated successfully!');
      this.render();
    } catch (err) {
      this.setFormConfirmation('password-settings', {
        type: 'error',
        title: 'Password Update Failed',
        message: err.message || 'Could not update your password.'
      });
      this.showToast(err.message || 'Could not update password.', 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Update Password →';
      }
      this.render();
    }
  }

  async handleClientPortalInquiry(e) {
    e.preventDefault();
    const form = e.target;
    const isValid = this.validateForm(form, 'portal-inquiry', [
      { name: 'service_category', label: 'Project Category', required: true },
      { name: 'reference_url', label: 'Dataset / Reference URL', required: false, type: 'url' },
      { name: 'message', label: 'Project Scope & Deliverables', required: true, minLength: 10 }
    ]);
    if (!isValid) return;

    const submitBtn = document.getElementById('portal-inquiry-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting Request to Yoletech...';
    }

    const timeline = (form.timeline?.value || '').trim();
    const engagementTier = (form.engagement_tier?.value || '').trim();
    const referenceUrl = (form.reference_url?.value || '').trim();
    const rawScope = form.message.value.trim();

    const metaHeaders = [
      timeline ? `[Timeline: ${timeline}]` : '',
      engagementTier ? `[Engagement Tier: ${engagementTier}]` : '',
      referenceUrl ? `[Reference Link: ${referenceUrl}]` : ''
    ].filter(Boolean);

    const formattedMessage = metaHeaders.length ? `${metaHeaders.join('\n')}\n${rawScope}` : rawScope;

    const payload = {
      name: this.user.name,
      email: this.user.email,
      phone: this.user.phone || '',
      service_category: form.service_category.value,
      budget: engagementTier || form.service_category.value,
      message: formattedMessage
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
      if (typeof this.loadDashboardData === 'function') {
        this.loadDashboardData(true);
      }
      form.reset();
      this.setFormConfirmation('portal-inquiry', {
        title: 'Service / Project Request Confirmed!',
        message: `Thank you, <strong>${payload.name}</strong>! Your <strong>${payload.service_category}</strong> request ("<em>${rawScope.slice(0, 80)}${rawScope.length > 80 ? '...' : ''}</em>") has been submitted to Yoletech (<strong>${this.notifyEmail}</strong>) and added to <strong>Overview &amp; Projects</strong>.`,
        actionsHtml: `
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button type="button" class="btn btn-lime btn-sm" onclick="window.app.setPortalTab('overview')">
              📋 View in Overview &amp; Projects →
            </button>
            <a href="${whatsappUrl}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">
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
        submitBtn.textContent = 'Submit Request to Yoletech →';
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

    const totalClients = this.clients.filter((c) => c.role !== 'ADMIN' && c.role !== 'LEARNER').length;
    const activeClients = this.clients.filter((c) => c.role !== 'ADMIN' && c.role !== 'LEARNER' && c.status === 'ACTIVE').length;
    const onboardingClients = this.clients.filter((c) => c.role !== 'ADMIN' && c.role !== 'LEARNER' && c.status === 'ONBOARDING').length;
    const completedClients = this.clients.filter((c) => c.role !== 'ADMIN' && c.role !== 'LEARNER' && c.status === 'COMPLETED').length;

    const clientsForDisplay =
      this.adminClientDateFrom || this.adminClientDateTo
        ? this.adminDateFilteredClients || []
        : this.clients;
    const filteredClients = clientsForDisplay
      .filter((c) => c.role !== 'ADMIN' && c.role !== 'LEARNER')
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

    const activeWorkspace =
      this.adminWorkspace === 'milestones'
        ? 'milestones'
        : this.adminWorkspace === 'learn'
        ? 'learn'
        : 'crm';
    const activeTrackedProjects = (this.inquiries || []).filter(
      (inq) => this.getCompletedMilestoneCount(inq) < 5
    ).length;
    const learnPendingBadge = this._adminLearnState?.summary
      ? `${this._adminLearnState.summary.pendingCount} pending`
      : 'Courses';

    return `
      <section class="section" style="padding-top:40px;">
        <div class="container">
          <!-- ADMIN HEADER BAR -->
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;margin-bottom:22px;">
            <div>
              <div class="eyebrow"><span class="eyebrow-dot"></span> ADMIN DASHBOARD</div>
              <h1 style="font-size:30px;font-weight:900;">
                ${
                  activeWorkspace === 'milestones'
                    ? 'Delivery Milestone Tracker'
                    : activeWorkspace === 'learn'
                    ? 'Learn Courses &amp; Registrations'
                    : 'Client CRM &amp; Platform Management'
                }
              </h1>
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
              ${
                activeWorkspace === 'learn'
                  ? `<button class="btn btn-lime btn-sm" onclick="window.app.loadAdminLearnData(true)">↻ Refresh Learn Data</button>`
                  : `<button class="btn btn-outline btn-sm" onclick="window.app.exportClientsToCSV()">⬇ Export Clients CSV</button>
                     <button class="btn btn-lime btn-sm" onclick="window.app.loadAdminData().then(() => window.app.render())">↻ Refresh Data</button>`
              }
            </div>
          </div>

          <!-- PRIMARY ADMIN INTERFACE TAB MENU -->
          <div class="admin-workspace-tabs" role="tablist" aria-label="Admin dashboard interfaces">
            <button
              type="button"
              role="tab"
              aria-selected="${activeWorkspace === 'crm'}"
              class="admin-workspace-tab ${activeWorkspace === 'crm' ? 'active' : ''}"
              onclick="window.app.setAdminWorkspace('crm')"
            >
              <span class="admin-workspace-tab-copy">
                <strong>Client CRM &amp; Platform</strong>
                <span>Clients, Inquiries, Blog, Portfolio &amp; Testimonials</span>
              </span>
              <span class="admin-workspace-tab-badge">${totalClients}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected="${activeWorkspace === 'milestones'}"
              class="admin-workspace-tab ${activeWorkspace === 'milestones' ? 'active' : ''}"
              onclick="window.app.setAdminWorkspace('milestones')"
            >
              <span class="admin-workspace-tab-copy">
                <strong>Delivery Milestone Tracker</strong>
                <span>Complete Steps 1–5 &amp; Sync Client Status</span>
              </span>
              <span class="admin-workspace-tab-badge">${activeTrackedProjects} active</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected="${activeWorkspace === 'learn'}"
              class="admin-workspace-tab ${activeWorkspace === 'learn' ? 'active' : ''}"
              onclick="window.app.setAdminWorkspace('learn')"
            >
              <span class="admin-workspace-tab-copy">
                <strong>Learn</strong>
                <span>Courses, Learner Registrations &amp; Page Content</span>
              </span>
              <span class="admin-workspace-tab-badge">${learnPendingBadge}</span>
            </button>
          </div>

          ${
            activeWorkspace === 'milestones'
              ? this.renderAdminMilestoneTrackerTab()
              : activeWorkspace === 'learn'
              ? typeof this.renderAdminLearnWorkspace === 'function'
                ? this.renderAdminLearnWorkspace()
                : ''
              : `
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

          <!-- CRM SUB-NAVIGATION TABS -->
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
          `
          }
        </div>
      </section>
    `;
  }

  setAdminWorkspace(mode) {
    this.adminWorkspace = mode === 'milestones' ? 'milestones' : mode === 'learn' ? 'learn' : 'crm';
    if (this.adminWorkspace === 'learn' && typeof this.loadAdminLearnData === 'function') {
      void this.loadAdminLearnData();
    }
    this.render();
  }

  openClientMilestones(query = '') {
    this.adminWorkspace = 'milestones';
    this.milestoneSearch = String(query || '').trim();
    this.milestoneStageFilter = 'ALL';
    this.milestonePage = 1;
    this.render();
  }

  renderAdminMilestoneTrackerTab() {
    const escHtml = (v) =>
      String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const steps = this.getMilestoneDefinitions();
    const allInquiries = Array.isArray(this.inquiries) ? this.inquiries : [];

    // Build fast client lookup by id and email so each card displays live synced client status
    const clientByEmail = new Map();
    const clientById = new Map();
    (this.clients || []).forEach((c) => {
      if (!c || String(c.role || 'CLIENT').toUpperCase() === 'ADMIN') return;
      if (c.email) clientByEmail.set(String(c.email).trim().toLowerCase(), c);
      if (c.id !== undefined && c.id !== null) clientById.set(String(c.id), c);
    });

    const stageCounts = { ALL: allInquiries.length, ACTIVE: 0, 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    allInquiries.forEach((inq) => {
      const done = this.getCompletedMilestoneCount(inq);
      stageCounts[done] = (stageCounts[done] || 0) + 1;
      if (done < 5) stageCounts.ACTIVE += 1;
    });

    const query = String(this.milestoneSearch || '').trim().toLowerCase();
    const filtered = allInquiries.filter((inq, idx) => {
      const done = this.getCompletedMilestoneCount(inq);
      if (this.milestoneStageFilter === 'ACTIVE' && done >= 5) return false;
      if (this.milestoneStageFilter === 'COMPLETED' && done < 5) return false;
      if (this.milestoneStageFilter === '3-4' && done !== 3 && done !== 4) return false;
      if (/^[0-5]$/.test(String(this.milestoneStageFilter)) && done !== Number(this.milestoneStageFilter)) {
        return false;
      }
      if (!query) return true;
      const ticketId = `yt-${String(1000 + (Number(inq.id) % 9000 || idx + 1)).padStart(4, '0')}`;
      const matchedClient =
        clientByEmail.get(String(inq.email || '').trim().toLowerCase()) ||
        (inq.user_id ? clientById.get(String(inq.user_id)) : null);
      const hay = `${ticketId} ${inq.name || ''} ${inq.email || ''} ${matchedClient?.company || ''} ${inq.service_category || ''} ${inq.message || ''} ${inq.status || ''}`.toLowerCase();
      return hay.includes(query);
    });

    const limit = this.milestoneLimit || 10;
    const totalFiltered = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / limit));
    if (!this.milestonePage || this.milestonePage < 1) this.milestonePage = 1;
    if (this.milestonePage > totalPages) this.milestonePage = totalPages;
    const curPage = this.milestonePage;
    const startIdx = (curPage - 1) * limit;
    const pageItems = filtered.slice(startIdx, startIdx + limit);

    const statusBadgeClass = (st) => {
      const up = String(st || 'ACTIVE').toUpperCase();
      if (up === 'COMPLETED') return 'is-completed';
      if (up === 'ACTIVE') return 'is-active';
      if (up === 'ONBOARDING') return 'is-onboarding';
      return 'is-lead';
    };

    const summaryCards = [
      { id: 'ALL', label: 'All Projects', count: stageCounts.ALL, sub: `${stageCounts.ACTIVE} active` },
      { id: '0', label: 'Awaiting Step 1', count: stageCounts[0], sub: 'New submissions' },
      { id: '1', label: 'Step 1 Done (Scoping)', count: stageCounts[1], sub: '20% · Onboarding' },
      { id: '2', label: 'Step 2 Done (Build)', count: stageCounts[2], sub: '40% · Active' },
      { id: '3-4', label: 'Step 3–4 (Review)', count: stageCounts[3] + stageCounts[4], sub: '60%–80% · Active' },
      { id: '5', label: 'Step 5 Completed', count: stageCounts[5], sub: '100% · Completed' }
    ];

    const renderMilestoneCard = (inq, idx) => {
      const doneSteps = this.getCompletedMilestoneCount(inq);
      const completed = doneSteps >= 5;
      const progress = completed
        ? 100
        : Number.isFinite(Number(inq.project_progress))
        ? Math.min(99, Math.max(0, Number(inq.project_progress)))
        : doneSteps * 20;
      const ticketId = `YT-${String(1000 + (Number(inq.id) % 9000 || startIdx + idx + 1)).padStart(4, '0')}`;
      const matchedClient =
        clientByEmail.get(String(inq.email || '').trim().toLowerCase()) ||
        (inq.user_id ? clientById.get(String(inq.user_id)) : null);
      const clientStatus = String(matchedClient?.status || (completed ? 'COMPLETED' : doneSteps >= 2 ? 'ACTIVE' : doneSteps === 1 ? 'ONBOARDING' : 'LEAD')).toUpperCase();
      const parsed = this.parsePortalInquiryDetails(inq.message);
      const links = this.extractDeliverableLinks(inq.admin_response);
      const createdDate = String(inq.created_at || '').slice(0, 10);
      const createdFmt = /^\d{4}-\d{2}-\d{2}$/.test(createdDate)
        ? new Date(`${createdDate}T00:00:00Z`).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            timeZone: 'UTC'
          })
        : 'Recent';
      const nextStepObj = doneSteps < 5 ? steps[doneSteps] : null;

      return `
        <article class="glass-card admin-milestone-card ${completed ? 'is-all-done' : ''}">
          <div class="admin-milestone-head">
            <div class="admin-milestone-client">
              <div class="admin-milestone-title-row">
                <span class="portal-ticket-id">#${escHtml(ticketId)}</span>
                <h3>${escHtml(inq.name || 'Client')}</h3>
                <span class="tech-pill lime">${escHtml(inq.service_category || 'General Service')}</span>
              </div>
              <div class="admin-milestone-submeta">
                <span>${escHtml(matchedClient?.company || 'Client Partner')}</span>
                <span>•</span>
                <a href="mailto:${escHtml(inq.email || '')}">${escHtml(inq.email || '—')}</a>
                <span>•</span>
                <span>Submitted ${escHtml(createdFmt)}</span>
              </div>
            </div>

            <div class="admin-milestone-status-cluster">
              <span class="admin-client-status-pill ${statusBadgeClass(clientStatus)}" title="Client account status automatically synced from milestone progress">
                Client Status: <strong>${escHtml(clientStatus)}</strong>
              </span>
              <span class="admin-progress-pill">${progress}% Complete</span>
            </div>
          </div>

          <p class="admin-milestone-scope">${escHtml(parsed.cleanBody)}</p>

          ${
            parsed.timeline || parsed.tier || parsed.referenceUrl
              ? `<div class="portal-brief-chips">
                  ${parsed.timeline ? `<span class="portal-brief-chip">⏱ Timeline: <strong>${escHtml(parsed.timeline)}</strong></span>` : ''}
                  ${parsed.tier ? `<span class="portal-brief-chip">📦 Tier: <strong>${escHtml(parsed.tier)}</strong></span>` : ''}
                  ${
                    parsed.referenceUrl
                      ? `<a href="${escHtml(parsed.referenceUrl)}" target="_blank" rel="noopener noreferrer" class="portal-brief-chip portal-brief-link">🔗 Client Reference Link ↗</a>`
                      : ''
                  }
                </div>`
              : ''
          }

          <!-- INTERACTIVE 5-STEP MILESTONE COMPLETION CONTROL -->
          <div class="admin-stepper-box">
            <div class="admin-stepper-top">
              <span><strong>Delivery Milestone Tracker</strong> · ${doneSteps} of 5 Steps Completed</span>
              <span>Click any step below to complete or adjust milestone progress</span>
            </div>

            <div class="portal-progress-track" role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100">
              <div class="portal-progress-fill" style="width:${progress}%;"></div>
            </div>

            <div class="admin-step-grid" role="group" aria-label="Milestone steps for ${escHtml(inq.name || ticketId)}">
              ${steps
                .map((st) => {
                  const isDone = st.step <= doneSteps;
                  const isNext = st.step === doneSteps + 1;
                  const targetStep = isDone && st.step === doneSteps ? st.step - 1 : st.step;
                  return `
                    <button
                      type="button"
                      class="admin-step-btn ${isDone ? 'is-done' : isNext ? 'is-next' : 'is-pending'}"
                      onclick="window.app.completeAdminMilestoneStep('${escHtml(String(inq.id))}', ${targetStep})"
                      title="${isDone && st.step === doneSteps ? `Click to unmark Step ${st.step}` : `Click to complete Step ${st.step} (${st.progress}% · Client → ${st.clientStatus})`}"
                    >
                      <span class="admin-step-badge">${isDone ? '✓' : st.step}</span>
                      <span class="admin-step-name">${st.step}. ${escHtml(st.label)}</span>
                      <span class="admin-step-meta">${st.progress}% · → ${escHtml(st.clientStatus)}</span>
                    </button>
                  `;
                })
                .join('')}
            </div>
          </div>

          <!-- QUICK COMPLETION CTA & CLIENT PORTAL NOTE / DELIVERABLE LINK -->
          <div class="admin-milestone-controls">
            <div class="admin-milestone-cta-row">
              ${
                nextStepObj
                  ? `<button type="button" class="btn btn-lime btn-sm" onclick="window.app.completeAdminMilestoneStep('${escHtml(String(inq.id))}', ${nextStepObj.step})">
                      ✓ Complete Step ${nextStepObj.step}: ${escHtml(nextStepObj.label)} (${nextStepObj.progress}%) →
                    </button>`
                  : `<span class="admin-complete-banner">✓ All 5 Milestones Completed · Client Status: COMPLETED</span>`
              }
              ${
                doneSteps > 0
                  ? `<button type="button" class="btn btn-outline btn-sm" onclick="window.app.completeAdminMilestoneStep('${escHtml(String(inq.id))}', ${doneSteps - 1})">
                      ← Step Back
                    </button>`
                  : ''
              }
              <div class="admin-milestone-contact-links">
                ${
                  inq.phone
                    ? `<a href="https://wa.me/${String(inq.phone).replace(/[^0-9]/g, '')}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">💬 WhatsApp ↗</a>`
                    : ''
                }
                ${
                  inq.email
                    ? `<a href="mailto:${escHtml(inq.email)}?subject=${encodeURIComponent(`[YOLETECH Update #${ticketId}] ${inq.service_category || ''}`)}" class="btn btn-outline btn-sm">✉️ Email</a>`
                    : ''
                }
              </div>
            </div>

            <div class="admin-milestone-note-row">
              <input
                type="text"
                id="milestone-note-${escHtml(String(inq.id))}"
                class="form-control"
                value="${escHtml(inq.admin_response || '')}"
                placeholder="Write milestone update or paste deliverable URL (https://...) visible on the client's portal..."
                onkeydown="if(event.key==='Enter'){event.preventDefault();window.app.saveAdminMilestoneNote('${escHtml(String(inq.id))}');}"
              />
              <button type="button" class="btn btn-outline btn-sm" onclick="window.app.saveAdminMilestoneNote('${escHtml(String(inq.id))}')">
                Save Update Note
              </button>
            </div>
            ${
              links.length
                ? `<div class="portal-deliverable-btns" style="margin-top:8px;">
                    ${links
                      .map(
                        (url, lIdx) =>
                          `<a href="${escHtml(url)}" target="_blank" rel="noopener noreferrer" class="portal-brief-chip portal-brief-link">🔗 Shared Deliverable${links.length > 1 ? ` #${lIdx + 1}` : ''} ↗</a>`
                      )
                      .join('')}
                  </div>`
                : ''
            }
          </div>
        </article>
      `;
    };

    return `
      <div class="admin-milestone-console">
        <div class="glass-card admin-milestone-intro">
          <div>
            <div class="eyebrow" style="margin-bottom:6px;"><span class="eyebrow-dot"></span> DELIVERY OPERATIONS CONSOLE</div>
            <h2 style="font-size:23px;font-weight:900;margin:0 0 6px;">Delivery Milestone Tracker</h2>
            <p style="font-size:14px;color:var(--yole-text-muted);margin:0;max-width:760px;">
              Complete milestones 1 through 5 for each client request. Progress immediately updates the client's portal stepper, delivery percentage, and synced CRM status (<strong>Step 1 → Onboarding</strong>, <strong>Steps 2–4 → Active</strong>, <strong>Step 5 → Completed</strong>).
            </p>
          </div>
        </div>

        <!-- 6-CARD PIPELINE SUMMARY FILTER STRIP -->
        <div class="admin-milestone-summary" role="group" aria-label="Filter projects by milestone stage">
          ${summaryCards
            .map(
              (card) => `
            <button
              type="button"
              class="glass-card admin-stage-tile ${String(this.milestoneStageFilter) === card.id ? 'is-selected' : ''}"
              onclick="window.app.milestoneStageFilter='${card.id}';window.app.milestonePage=1;window.app.render();"
            >
              <span class="admin-stage-tile-label">${escHtml(card.label)}</span>
              <strong class="admin-stage-tile-count">${card.count}</strong>
              <span class="admin-stage-tile-sub">${escHtml(card.sub)}</span>
            </button>
          `
            )
            .join('')}
        </div>

        <!-- SEARCH & FILTER TOOLBAR -->
        <div class="glass-card admin-milestone-toolbar">
          <div style="flex:1 1 280px;">
            <input
              type="search"
              id="admin-milestone-search"
              class="form-control"
              placeholder="Search by client name, email, company, ticket #YT-, or project scope..."
              value="${escHtml(this.milestoneSearch || '')}"
              oninput="window.app.milestoneSearch=this.value;window.app.milestonePage=1;window.app.render();"
            />
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            <button type="button" class="selector-pill ${this.milestoneStageFilter === 'ALL' ? 'active' : ''}" onclick="window.app.milestoneStageFilter='ALL';window.app.milestonePage=1;window.app.render();">All (${stageCounts.ALL})</button>
            <button type="button" class="selector-pill ${this.milestoneStageFilter === 'ACTIVE' ? 'active' : ''}" onclick="window.app.milestoneStageFilter='ACTIVE';window.app.milestonePage=1;window.app.render();">In Progress (${stageCounts.ACTIVE})</button>
            <button type="button" class="selector-pill ${this.milestoneStageFilter === 'COMPLETED' ? 'active' : ''}" onclick="window.app.milestoneStageFilter='COMPLETED';window.app.milestonePage=1;window.app.render();">Completed (${stageCounts[5]})</button>
            ${
              this.milestoneSearch || this.milestoneStageFilter !== 'ALL'
                ? `<button type="button" class="btn btn-outline btn-sm" onclick="window.app.milestoneSearch='';window.app.milestoneStageFilter='ALL';window.app.milestonePage=1;window.app.render();">Clear Filters</button>`
                : ''
            }
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;font-size:12.5px;color:var(--yole-text-muted);margin:0 2px 12px;">
          <span>Showing <strong>${totalFiltered ? startIdx + 1 : 0}–${Math.min(startIdx + limit, totalFiltered)}</strong> of <strong>${totalFiltered}</strong> tracked project${totalFiltered === 1 ? '' : 's'}</span>
          <span>Page <strong>${curPage}</strong> of <strong>${totalPages}</strong></span>
        </div>

        ${
          pageItems.length === 0
            ? `<div class="glass-card portal-empty-state">
                <h3>No Matching Projects Found</h3>
                <p>Adjust your stage filter or search query to locate client delivery requests.</p>
              </div>`
            : `<div class="admin-milestone-list">
                ${pageItems.map((inq, idx) => renderMilestoneCard(inq, idx)).join('')}
              </div>`
        }

        ${
          totalPages > 1
            ? `<div style="display:flex;justify-content:center;align-items:center;gap:12px;margin-top:20px;">
                <button type="button" class="btn btn-outline btn-sm" ${curPage <= 1 ? 'disabled' : ''} onclick="window.app.milestonePage=${curPage - 1};window.app.render();">← Previous</button>
                <span style="font-size:13px;font-weight:700;">Page ${curPage} of ${totalPages}</span>
                <button type="button" class="btn btn-outline btn-sm" ${curPage >= totalPages ? 'disabled' : ''} onclick="window.app.milestonePage=${curPage + 1};window.app.render();">Next →</button>
              </div>`
            : ''
        }
      </div>
    `;
  }

  async completeAdminMilestoneStep(inquiryId, targetStep) {
    const stepNum = Math.max(0, Math.min(5, Number(targetStep) || 0));
    const steps = this.getMilestoneDefinitions();
    const targetObj = stepNum > 0 ? steps[stepNum - 1] : null;
    const updates = targetObj
      ? {
          status: targetObj.completedStatus,
          project_progress: targetObj.progress,
          client_status: targetObj.clientStatus,
          sync_client_status: true
        }
      : {
          status: 'NEW',
          project_progress: 10,
          client_status: 'LEAD',
          sync_client_status: true
        };

    const noteInput = document.getElementById(`milestone-note-${inquiryId}`);
    if (noteInput) {
      updates.admin_response = noteInput.value.trim();
    }

    const label = targetObj
      ? `Step ${targetObj.step} (${targetObj.label}) completed — ${targetObj.progress}% · Client status synced to ${targetObj.clientStatus}`
      : 'Milestone reset to Submitted (10%) — Client status set to LEAD';

    await this.updateInquiry(inquiryId, updates, label);
  }

  async saveAdminMilestoneNote(inquiryId) {
    const noteInput = document.getElementById(`milestone-note-${inquiryId}`);
    if (!noteInput) return;
    await this.updateInquiry(
      inquiryId,
      { admin_response: noteInput.value.trim(), sync_client_status: false },
      'Milestone update note saved to Client Portal.'
    );
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
    if (rateVal) rateVal.textContent = `$${rate} / hr`;

    const totalHoursPerYear = hours * staff * 52;
    const annualCost = totalHoursPerYear * rate;
    const hoursSaved = Math.round(totalHoursPerYear * 0.75);
    const netSavings = Math.round(annualCost * 0.75);

    if (currentCostEl) currentCostEl.innerHTML = `$${annualCost.toLocaleString()} <span style="font-size:15px;color:var(--yole-text-muted);font-weight:500;">/ year</span>`;
    if (hoursSavedEl) hoursSavedEl.textContent = `${hoursSaved.toLocaleString()} hrs`;
    if (netSavingsEl) netSavingsEl.textContent = `$${netSavings.toLocaleString()} / yr`;
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
    this.pendingInquiryMessage = `Hi Yoletech, based on your interactive ROI calculator, our team spends approximately ${hours} hrs/week across ${staff} staff on manual reporting (approx. $${annualCost}/year). We would like to discuss implementing an automated Power BI & SQL pipeline to reclaim operational time and achieve an estimated $${netSavings}/year in savings.`;

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

  async setAdminClientDateFilter(field, value) {
    if (field === 'from') this.adminClientDateFrom = value;
    else if (field === 'to') this.adminClientDateTo = value;
    else return;

    this.adminClientPage = 1;
    await this.loadAdminData();
    this.render();
  }

  async resetAdminClientDateFilter() {
    this.adminClientDateFrom = '';
    this.adminClientDateTo = '';
    this.adminDateFilteredClients = null;
    this.adminDateFilterError = '';
    this.adminClientPage = 1;
    await this.loadAdminData();
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
        <div style="display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap;margin-top:16px;">
          <div>
            <label for="admin-client-date-from" style="display:block;margin-bottom:6px;font-size:12px;color:var(--yole-text-muted);">Registered from</label>
            <input id="admin-client-date-from" type="date" class="form-control" value="${this.adminClientDateFrom}" max="${this.adminClientDateTo || ''}" onchange="window.app.setAdminClientDateFilter('from', this.value)" />
          </div>
          <div>
            <label for="admin-client-date-to" style="display:block;margin-bottom:6px;font-size:12px;color:var(--yole-text-muted);">Registered to</label>
            <input id="admin-client-date-to" type="date" class="form-control" value="${this.adminClientDateTo}" min="${this.adminClientDateFrom || ''}" onchange="window.app.setAdminClientDateFilter('to', this.value)" />
          </div>
          <button type="button" class="btn btn-outline btn-sm" ${this.adminClientDateFrom || this.adminClientDateTo ? '' : 'disabled'} onclick="window.app.resetAdminClientDateFilter()">Clear dates</button>
        </div>
        ${this.adminDateFilterError ? '<p role="alert" style="margin:12px 0 0;color:#F7941D;">Date filter could not be applied by the database. Please try again or clear the dates.</p>' : ''}
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
    const existing = (this.clients || []).find((c) => String(c.id) === String(clientId));
    try {
      try {
        await this.api(`/api/clients/${clientId}`, {
          method: 'PUT',
          body: JSON.stringify(updates)
        });
      } catch (apiErr) {
        if (!existing) throw apiErr;
      }
      if (existing) {
        const localMatch = this.getLocalRegisteredUsers().find(
          (u) => String(u.id) === String(clientId) || (existing.email && String(u.email || '').toLowerCase() === String(existing.email).toLowerCase())
        );
        if (localMatch) {
          this.saveLocalRegisteredUser({ ...localMatch, ...updates });
        }
      }
      await this.loadAdminData();
      if (typeof this.loadDashboardData === 'function') await this.loadDashboardData(true);
      this.showToast('Client record updated.');
      this.render();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  async deleteClient(clientId) {
    const existing = (this.clients || []).find((c) => String(c.id) === String(clientId));
    try {
      try {
        await this.api(`/api/clients/${clientId}`, { method: 'DELETE' });
      } catch (apiErr) {
        if (!existing) throw apiErr;
      }
      this.removeLocalRegisteredUser(clientId, existing?.email || '');
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
    const clientPayload = {
      name: form.name.value.trim(),
      email: form.email.value.trim().toLowerCase(),
      phone: form.phone.value.trim(),
      company: form.company.value.trim(),
      service_interest: form.service_interest.value,
      admin_notes: form.admin_notes.value.trim(),
      status: 'ACTIVE'
    };
    try {
      const res = await this.api('/api/clients', {
        method: 'POST',
        body: JSON.stringify(clientPayload)
      });
      if (res?.client) {
        this.saveLocalRegisteredUser(res.client);
      }
      await this.loadAdminData();
      if (typeof this.loadDashboardData === 'function') await this.loadDashboardData(true);
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
                <label class="form-label">Milestone Stage</label>
                <select class="form-control" onchange="window.app.updateInquiry('${inq.id}', { status: this.value })">
                  <option value="NEW" ${inq.status === 'NEW' ? 'selected' : ''}>0. NEW (Awaiting Step 1 — 10%)</option>
                  <option value="SCOPING" ${inq.status === 'SCOPING' ? 'selected' : ''}>1. Step 1 Done — Scoping (20%)</option>
                  <option value="IN_PROGRESS" ${inq.status === 'IN_PROGRESS' ? 'selected' : ''}>2. Step 2 Done — In Progress (40%)</option>
                  <option value="REVIEW" ${inq.status === 'REVIEW' ? 'selected' : ''}>3. Step 3 Done — Review (60%)</option>
                  <option value="SIGN_OFF" ${inq.status === 'SIGN_OFF' ? 'selected' : ''}>4. Step 4 Done — Final Sign-Off (80%)</option>
                  <option value="COMPLETED" ${inq.status === 'COMPLETED' || inq.status === 'RESOLVED' ? 'selected' : ''}>5. Step 5 Done — Completed (100%)</option>
                </select>
              </div>
              <div>
                <label class="form-label">Progress (${inq.project_progress || 10}%)</label>
                <input type="range" min="0" max="100" step="5" value="${inq.project_progress || 10}" class="form-control" onchange="window.app.updateInquiry('${inq.id}', { project_progress: Number(this.value) })" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Milestone Note &amp; Deliverable URL (Visible in Client Portal)</label>
              <input type="text" class="form-control" value="${(inq.admin_response || '').replace(/"/g, '&quot;')}" onchange="window.app.updateInquiry('${inq.id}', { admin_response: this.value, sync_client_status: false })" placeholder="Write milestone update or paste deliverable link (https://...)..." />
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding-top:10px;border-top:1px solid rgba(255,255,255,0.1);">
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button type="button" class="btn btn-outline btn-sm" style="padding:5px 10px;font-size:11.5px;" onclick="window.app.openClientMilestones('${String(inq.email || inq.name || '').replace(/'/g, "\\'")}')">🎯 Milestones</button>
                <a href="mailto:${inq.email}" class="btn btn-outline btn-sm" style="padding:5px 10px;font-size:11.5px;">Email Client</a>
                ${
                  inq.phone
                    ? `<a href="https://wa.me/${inq.phone.replace(/[^0-9]/g, '')}" target="_blank" class="btn btn-lime btn-sm" style="padding:5px 10px;font-size:11.5px;">WhatsApp</a>`
                    : ''
                }
              </div>
              <button class="btn btn-outline btn-sm" style="padding:5px 10px;font-size:11.5px;border-color:#ef4444;color:#ef4444;" onclick="window.app.deleteInquiry('${inq.id}')">
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
      try {
        await this.api(`/api/inquiries/${id}`, { method: 'DELETE' });
      } catch (apiErr) {
        const localExists = this.getLocalInquiries().some((i) => String(i.id) === String(id));
        if (!localExists) throw apiErr;
      }
      try {
        const nextLocal = this.getLocalInquiries().filter((i) => String(i.id) !== String(id));
        localStorage.setItem('yoletech_local_inquiries', JSON.stringify(nextLocal));
      } catch {}
      await this.loadAdminData();
      this.showToast('Project inquiry deleted.');
      this.render();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  async updateInquiry(id, updates, customToast = '') {
    const stageDefaultProgress = {
      NEW: 10,
      SCOPING: 20,
      IN_PROGRESS: 40,
      REVIEW: 60,
      SIGN_OFF: 80,
      COMPLETED: 100,
      RESOLVED: 100
    };
    const deriveClientStatus = (st, prog) => {
      if (updates.client_status) return String(updates.client_status).toUpperCase();
      if (st === 'COMPLETED' || st === 'RESOLVED' || prog >= 100) return 'COMPLETED';
      if (st === 'IN_PROGRESS' || st === 'REVIEW' || st === 'SIGN_OFF' || prog >= 40) return 'ACTIVE';
      if (st === 'SCOPING' || prog >= 20) return 'ONBOARDING';
      return 'LEAD';
    };

    const existingInq = (this.inquiries || []).find((i) => String(i.id) === String(id));
    const nextUpdates = { ...updates };
    if (nextUpdates.status && nextUpdates.project_progress === undefined && stageDefaultProgress[nextUpdates.status] !== undefined) {
      nextUpdates.project_progress = stageDefaultProgress[nextUpdates.status];
    }
    const resolvedStatus = String(nextUpdates.status ?? existingInq?.status ?? 'NEW').toUpperCase();
    const resolvedProgress = Number.isFinite(Number(nextUpdates.project_progress))
      ? Number(nextUpdates.project_progress)
      : Number(existingInq?.project_progress ?? 10);
    const shouldSyncClient = nextUpdates.sync_client_status !== false;
    const syncedClientStatus = shouldSyncClient ? deriveClientStatus(resolvedStatus, resolvedProgress) : null;
    const nowStamp = new Date().toISOString();

    try {
      let apiResult = null;
      try {
        apiResult = await this.api(`/api/inquiries/${id}`, {
          method: 'PUT',
          body: JSON.stringify({
            ...nextUpdates,
            ...(syncedClientStatus ? { client_status: syncedClientStatus } : {}),
            ...(existingInq
              ? {
                  name: existingInq.name,
                  email: existingInq.email,
                  phone: existingInq.phone,
                  service_category: existingInq.service_category,
                  budget: existingInq.budget,
                  message: existingInq.message,
                  created_at: existingInq.created_at
                }
              : {})
          })
        });
      } catch (apiErr) {
        if (!existingInq) throw apiErr;
      }

      // Persist updated inquiry into localStorage so client & admin stay synced even across container rotations
      try {
        const localList = this.getLocalInquiries();
        const updatedRecord = {
          ...(existingInq || {}),
          ...(apiResult?.inquiry || {}),
          ...nextUpdates,
          status: resolvedStatus,
          project_progress: resolvedProgress,
          updated_at: nowStamp
        };
        const matchIdx = localList.findIndex(
          (i) =>
            String(i.id) === String(id) ||
            (existingInq &&
              String(i.email || '').toLowerCase() === String(existingInq.email || '').toLowerCase() &&
              String(i.message || '').trim() === String(existingInq.message || '').trim())
        );
        if (matchIdx >= 0) {
          localList[matchIdx] = { ...localList[matchIdx], ...updatedRecord };
        } else if (existingInq) {
          localList.unshift(updatedRecord);
        }
        localStorage.setItem('yoletech_local_inquiries', JSON.stringify(localList));
      } catch {}

      // Reflect milestone progress in the client's CRM & Portal status
      if (shouldSyncClient && syncedClientStatus && existingInq?.email) {
        const targetEmail = String(existingInq.email).trim().toLowerCase();
        const localUsers = this.getLocalRegisteredUsers().filter(
          (u) => u && String(u.role || 'CLIENT').trim().toUpperCase() === 'CLIENT'
        );
        const clientMatch =
          localUsers.find((u) => String(u.email || '').trim().toLowerCase() === targetEmail) ||
          (this.clients || []).find((c) => String(c.email || '').trim().toLowerCase() === targetEmail);
        if (clientMatch && String(clientMatch.role || 'CLIENT').toUpperCase() === 'CLIENT') {
          this.saveLocalRegisteredUser({
            ...clientMatch,
            ...(apiResult?.client || {}),
            status: syncedClientStatus,
            updated_at: nowStamp
          });
        }
        // Also update in-memory clients immediately
        this.clients = (this.clients || []).map((c) =>
          String(c.email || '').trim().toLowerCase() === targetEmail && String(c.role || 'CLIENT').toUpperCase() === 'CLIENT'
            ? { ...c, status: syncedClientStatus }
            : c
        );
      }

      // Immediately update in-memory inquiries
      this.inquiries = (this.inquiries || []).map((i) =>
        String(i.id) === String(id)
          ? {
              ...i,
              ...nextUpdates,
              status: resolvedStatus,
              project_progress: resolvedProgress,
              updated_at: nowStamp
            }
          : i
      );

      await this.loadAdminData();
      if (typeof this.loadDashboardData === 'function') await this.loadDashboardData(true);
      this.showToast(customToast || (syncedClientStatus ? `Milestone updated · Client status synced to ${syncedClientStatus}.` : 'Project inquiry updated.'));
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
            <div class="form-group">
              <label class="form-label">Cover Image *</label>
              <input type="text" name="coverImage" required class="form-control" value="${editing ? (editing.coverImage || '').replace(/"/g, '&quot;') : ''}" placeholder="/assets/blog/your-article-cover.jpg" />
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
      coverImage: form.coverImage.value.trim(),
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
            <div class="form-group">
              <label class="form-label">Live Demo Project URL (Optional)</label>
              <input type="url" name="demo_url" class="form-control" value="${editing ? (editing.demo_url || editing.live_url || '').replace(/"/g, '&quot;') : ''}" placeholder="https://yolestica.com or Kaggle/Dashboard link" />
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
          <h3 style="font-size:20px;font-weight:900;margin-bottom:14px;">+ Add Client Testimonial</h3>
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

  setShowcaseTab(tab) {
    this.showcaseTab = tab;
    const pillsWrap = document.getElementById('home-showcase-pills');
    const mount = document.getElementById('home-showcase-mount');
    const C = window.YOLETECH_COMPONENTS;
    if (pillsWrap) {
      pillsWrap.querySelectorAll('.selector-pill').forEach((btn) => {
        btn.classList.toggle('active', btn.getAttribute('data-showcase') === tab);
      });
    }
    if (mount && C) {
      mount.innerHTML =
        tab === 'dashboard'
          ? C.renderDataOverviewWidget()
          : tab === 'codesync'
          ? C.renderCodeSyncWidget()
          : C.renderWorkflowDiagramWidget();
      C.decorateCardIcons(mount);
      this.initKpiCounters(mount);
      this.initScrollReveal(mount);
    } else {
      this.render();
    }
  }

  setBiWidgetRange(btnEl, range) {
    const widget = btnEl ? btnEl.closest('.bi-overview-widget') : document.querySelector('.bi-overview-widget');
    if (!widget) return;

    widget.querySelectorAll('.bi-range-pill').forEach((b) => {
      b.classList.toggle('active', b === btnEl);
    });

    const presets = {
      live: {
        workflows: 5903500,
        delta: 12.5,
        records: 43010,
        latency: 0.03,
        integrity: 99.9,
        bars: ['45%', '70%', '95%', '65%', '85%', '78%'],
        spark: 'M2 30 Q 25 20, 45 25 T 90 15 T 130 18 T 158 6',
        area: 'M0 65 C 45 25, 85 70, 135 35 C 185 5, 225 50, 280 15 L 280 90 L 0 90 Z',
        lineLime: 'M0 65 C 45 25, 85 70, 135 35 C 185 5, 225 50, 280 15',
        lineOrange: 'M0 75 C 50 50, 95 30, 150 55 C 200 75, 235 25, 280 40'
      },
      '7d': {
        workflows: 1428900,
        delta: 8.4,
        records: 12480,
        latency: 0.04,
        integrity: 99.8,
        bars: ['62%', '54%', '82%', '76%', '68%', '91%'],
        spark: 'M2 28 Q 30 24, 52 18 T 96 22 T 132 12 T 158 9',
        area: 'M0 58 C 40 42, 90 30, 140 48 C 190 20, 230 35, 280 22 L 280 90 L 0 90 Z',
        lineLime: 'M0 58 C 40 42, 90 30, 140 48 C 190 20, 230 35, 280 22',
        lineOrange: 'M0 68 C 48 60, 95 45, 145 38 C 195 55, 235 32, 280 28'
      },
      '30d': {
        workflows: 4812400,
        delta: 16.2,
        records: 36920,
        latency: 0.03,
        integrity: 99.9,
        bars: ['52%', '84%', '66%', '92%', '74%', '88%'],
        spark: 'M2 32 Q 28 26, 55 20 T 98 14 T 134 10 T 158 5',
        area: 'M0 70 C 50 35, 92 55, 142 25 C 188 30, 228 18, 280 12 L 280 90 L 0 90 Z',
        lineLime: 'M0 70 C 50 35, 92 55, 142 25 C 188 30, 228 18, 280 12',
        lineOrange: 'M0 72 C 52 44, 100 62, 152 42 C 202 38, 238 48, 280 30'
      },
      ytd: {
        workflows: 18450200,
        delta: 24.8,
        records: 148500,
        latency: 0.02,
        integrity: 100.0,
        bars: ['68%', '78%', '88%', '82%', '94%', '98%'],
        spark: 'M2 34 Q 30 28, 60 22 T 105 14 T 138 8 T 158 3',
        area: 'M0 72 C 45 50, 90 42, 140 28 C 190 18, 235 14, 280 8 L 280 90 L 0 90 Z',
        lineLime: 'M0 72 C 45 50, 90 42, 140 28 C 190 18, 235 14, 280 8',
        lineOrange: 'M0 78 C 55 62, 102 48, 154 36 C 204 28, 240 22, 280 18'
      }
    };

    const cfg = presets[range] || presets.live;
    const updateCounter = (sel, val) => {
      const el = widget.querySelector(sel);
      if (!el) return;
      el.setAttribute('data-kpi-target', String(val));
      this.animateKpiElement(el);
    };

    updateCounter('.bi-val-workflows', cfg.workflows);
    updateCounter('.bi-val-delta', cfg.delta);
    updateCounter('.bi-val-records', cfg.records);
    updateCounter('.bi-val-latency', cfg.latency);
    updateCounter('.bi-val-integrity', cfg.integrity);

    const bars = widget.querySelectorAll('.bi-load-bar');
    bars.forEach((bar, i) => {
      if (cfg.bars[i]) bar.style.height = cfg.bars[i];
    });

    const spark = widget.querySelector('.bi-spark-path');
    if (spark) spark.setAttribute('d', cfg.spark);
    const area = widget.querySelector('.bi-area-path');
    if (area) area.setAttribute('d', cfg.area);
    const lineLime = widget.querySelector('.bi-line-lime');
    if (lineLime) lineLime.setAttribute('d', cfg.lineLime);
    const lineOrange = widget.querySelector('.bi-line-orange');
    if (lineOrange) lineOrange.setAttribute('d', cfg.lineOrange);
  }

  runCodeSyncDemo(btnEl) {
    const widget = btnEl ? btnEl.closest('.code-sync-widget') : document.querySelector('.code-sync-widget');
    if (!widget || widget._syncRunning) return;
    widget._syncRunning = true;

    const deployEl = widget.querySelector('.sync-step-deploy');
    const sqlEl = widget.querySelector('.sync-step-sql');
    const autoEl = widget.querySelector('.sync-step-auto');
    const tsEl = widget.querySelector('.sync-timestamp');
    const pillEl = widget.querySelector('.sync-online-pill');

    if (btnEl) btnEl.textContent = '⏳ Syncing...';
    if (deployEl) {
      deployEl.textContent = 'BUILDING...';
      deployEl.style.color = '#F7941D';
    }
    if (sqlEl) {
      sqlEl.textContent = 'QUEUED';
      sqlEl.style.color = 'rgba(255,255,255,0.6)';
    }
    if (pillEl) {
      pillEl.textContent = '● SYNCING';
      pillEl.style.color = '#F7941D';
    }

    setTimeout(() => {
      if (deployEl) {
        deployEl.textContent = 'VERIFIED ✓';
        deployEl.style.color = '#C8E61E';
      }
      if (sqlEl) {
        sqlEl.textContent = 'AUDITING...';
        sqlEl.style.color = '#F7941D';
      }
    }, 450);

    setTimeout(() => {
      if (sqlEl) {
        sqlEl.textContent = 'SYNCED ✓';
        sqlEl.style.color = '#C8E61E';
      }
      if (autoEl) {
        autoEl.textContent = 'PUBLISHED ✓';
        autoEl.style.color = '#C8E61E';
      }
      if (pillEl) {
        pillEl.textContent = '● ONLINE';
        pillEl.style.color = '#C8E61E';
      }
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      if (tsEl) tsEl.textContent = `Last validated sync: ${nowStr} (0.03ms)`;
      if (btnEl) btnEl.textContent = '▶ Run Sync Test';
      widget._syncRunning = false;
    }, 1050);
  }

  inspectWorkflowStage(cardEl, stageIdx) {
    const frame = cardEl ? cardEl.closest('.workflow-diagram-frame') : document.querySelector('.workflow-diagram-frame');
    if (!frame) return;

    frame.querySelectorAll('.workflow-node-card').forEach((c) => {
      c.classList.toggle('is-active-node', c === cardEl);
    });

    const stages = [
      {
        text: '<strong style="color:#C8E61E;">Stage 00 — Source Ingestion:</strong> Pulling departmental REST APIs, Excel workbooks &amp; relational SQL tables.',
        metric: 'Illustrative Preview'
      },
      {
        text: '<strong style="color:#C8E61E;">Stage 01 — Data Validation &amp; Audit:</strong> Running automated Pandas, R, SPSS &amp; Excel VBA quality rules.',
        metric: 'Schema Checks Active'
      },
      {
        text: '<strong style="color:#F7941D;">Stage 02 — Webhooks &amp; ETL Sync:</strong> Streaming validated records into SQL Server, MySQL &amp; MS Access.',
        metric: 'Automated Pipeline'
      },
      {
        text: '<strong style="color:#C8E61E;">Stage 03 — Python ML &amp; Executive BI:</strong> Publishing KPIs and forecasts to Power BI, Tableau &amp; React.',
        metric: 'Scheduled Refresh'
      }
    ];

    const info = stages[stageIdx] || stages[0];
    const textEl = frame.querySelector('.workflow-inspector-text');
    const metricEl = frame.querySelector('.workflow-inspector-metric');
    if (textEl) textEl.innerHTML = info.text;
    if (metricEl) metricEl.textContent = info.metric;
  }

  updatePageSeoMeta() {
    if (typeof document === 'undefined') return;
    const baseOrigin =
      typeof window !== 'undefined' &&
      window.location &&
      /^https?:/i.test(window.location.origin) &&
      /localhost|127\.0\.0\.1/.test(window.location.hostname)
        ? window.location.origin
        : 'https://www.yolestica.com';
    const siteLogoUrl = `${baseOrigin}/assets/yoletech-social-logo.png`;
    const seoMap = {
      home: {
        title: 'YOLETECH | Data Analytics, BI & Full-Stack Web Services',
        description:
          'YOLETECH builds full-stack web apps, Power BI & Tableau dashboards, Python/SQL automation, and practical tech training.',
        path: '/',
        type: 'website',
        image: siteLogoUrl,
        schemaType: 'WebPage'
      },
      dashboard: {
        title: 'Analytics Dashboard | YOLETECH',
        description: 'Authenticated YOLETECH client and operations analytics dashboard.',
        path: '/dashboard',
        type: 'website',
        image: siteLogoUrl,
        schemaType: 'WebPage',
        noindex: true
      },
      about: {
        title: 'About John Oruebi Eniekpo | YOLETECH',
        description:
          'Meet John Oruebi Eniekpo, Data Analyst, BI Specialist, and Full-Stack Web Developer behind YOLETECH in Nigeria and remote.',
        path: '/about',
        type: 'profile',
        image: siteLogoUrl,
        schemaType: 'AboutPage'
      },
      services: {
        title: 'Data Analytics, BI, Automation & Web Services | YOLETECH',
        description:
          'Explore YOLETECH services: full-stack web development, Power BI & Tableau BI, AI workflow automation, IT support, and training.',
        path: '/services',
        type: 'website',
        image: siteLogoUrl,
        schemaType: 'CollectionPage'
      },
      learn: {
        title: 'Learn Tech Skills & Training Programs | YOLETECH',
        description:
          'Hands-on training in web development, data analytics, AI automation, and IT—guided step by step from day one.',
        path: '/learn',
        type: 'website',
        image: siteLogoUrl,
        schemaType: 'CollectionPage'
      },
      'learn-dashboard': {
        title: 'Learner Portal | YOLETECH',
        description: 'View your YOLETECH learner profile and course enrollment status.',
        path: '/learn/dashboard',
        type: 'website',
        image: siteLogoUrl,
        schemaType: 'WebPage',
        noindex: true
      },
      portfolio: {
        title: 'Portfolio & Case Studies | YOLETECH',
        description:
          'Explore YOLETECH case studies across Power BI dashboards, Python machine learning apps, workflow automation, and web platforms.',
        path: '/portfolio',
        type: 'website',
        image: siteLogoUrl,
        schemaType: 'CollectionPage'
      },
      testimonials: {
        title: 'Client Testimonials | YOLETECH',
        description: 'Client feedback and endorsements submitted to YOLETECH.',
        path: '/testimonials',
        type: 'website',
        image: siteLogoUrl,
        schemaType: 'CollectionPage',
        noindex: true
      },
      blog: {
        title: 'Blog & Tech Tutorials | YOLETECH',
        description:
          'Practical tutorials and guides on Power BI, SQL, Python automation, machine learning, and full-stack web engineering.',
        path: '/blog',
        type: 'website',
        image: siteLogoUrl,
        schemaType: 'CollectionPage'
      },
      contact: {
        title: 'Contact YOLETECH | Book a Discovery Call',
        description:
          'Contact YOLETECH for full-stack web development, BI dashboards, SQL pipelines, automation, or training. Responses in 1 business day.',
        path: '/contact',
        type: 'website',
        image: siteLogoUrl,
        schemaType: 'ContactPage'
      },
      privacy: {
        title: 'Privacy Policy | YOLETECH',
        description: 'How YOLETECH collects, uses, and protects your personal data under the Nigeria Data Protection Act (NDPA).',
        path: '/privacy',
        type: 'website',
        image: siteLogoUrl,
        schemaType: 'WebPage'
      },
      terms: {
        title: 'Terms of Service | YOLETECH',
        description: 'Terms governing YOLETECH digital services, client portal accounts, and training program registrations.',
        path: '/terms',
        type: 'website',
        image: siteLogoUrl,
        schemaType: 'WebPage'
      },
      cookies: {
        title: 'Cookie Notice | YOLETECH',
        description: 'Details on essential cookies, session storage, and optional analytics consent on YOLETECH.',
        path: '/cookies',
        type: 'website',
        image: siteLogoUrl,
        schemaType: 'WebPage'
      },
      login: {
        title: 'Sign In | YOLETECH Portal',
        description: 'Sign in to your YOLETECH Client Portal or Learner Portal.',
        path: '/login',
        type: 'website',
        image: siteLogoUrl,
        schemaType: 'WebPage',
        noindex: true
      },
      register: {
        title: 'Create Account | YOLETECH Client Portal',
        description: 'Create a YOLETECH Client Portal account to request projects and track deliverables.',
        path: '/register',
        type: 'website',
        image: siteLogoUrl,
        schemaType: 'WebPage',
        noindex: true
      },
      portal: {
        title: 'Client Portal | YOLETECH',
        description: 'Manage your YOLETECH projects, inquiries, and account profile.',
        path: '/portal',
        type: 'website',
        image: siteLogoUrl,
        schemaType: 'WebPage',
        noindex: true
      },
      'admin-dashboard': {
        title: 'Admin Dashboard | YOLETECH',
        description: 'Authenticated YOLETECH administration workspace.',
        path: '/admin-dashboard',
        type: 'website',
        image: siteLogoUrl,
        schemaType: 'WebPage',
        noindex: true
      }
    };

    let meta = seoMap[this.currentPage] || seoMap.home;
    let schemaPayload = null;

    if (this.currentPage === 'learn' && Array.isArray(this._learnState?.courses)) {
      const publishedCourses = this._learnState.courses;
      schemaPayload = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: this._learnState?.content?.headline || meta.title,
        description: meta.description,
        url: `${baseOrigin}/learn`,
        itemListElement: publishedCourses.map((course, idx) => {
          const item = {
            '@type': 'Course',
            name: course.title,
            description: course.short_description,
            url: `${baseOrigin}/learn#${encodeURIComponent(course.slug)}`,
            provider: {
              '@type': 'Organization',
              '@id': `${baseOrigin}/#organization`,
              name: 'YOLETECH'
            },
            educationalLevel: course.level,
            hasCourseInstance: {
              '@type': 'CourseInstance',
              courseMode: course.mode
            }
          };
          if (course.duration) item.timeRequired = course.duration;
          if (course.price) item.offers = { '@type': 'Offer', description: course.price };
          return {
            '@type': 'ListItem',
            position: idx + 1,
            item
          };
        })
      };
    }

    if (this.currentPage === 'blog-detail') {
      const post = this.activeBlogPost || (this.blogPosts && this.blogPosts[0]);
      if (post) {
        const postImage = post.coverImage
          ? post.coverImage.startsWith('http')
            ? post.coverImage
            : `${baseOrigin}${post.coverImage.startsWith('/') ? '' : '/'}${post.coverImage}`
          : siteLogoUrl;
        meta = {
          title: `${post.title} | YOLETECH`,
          description: post.summary || `${post.title} — Technical article by ${post.author || 'John Oruebi Eniekpo'}.`,
          path: `/blog/${post.slug}`,
          type: 'article',
          image: postImage,
          imageAlt: post.title,
          schemaType: 'BlogPosting'
        };
        schemaPayload = {
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: post.title,
          description: meta.description,
          image: postImage,
          datePublished: post.date || '2026-10-15',
          dateModified: post.date || '2026-10-15',
          articleSection: post.category || 'Data Analytics & BI',
          author: {
            '@type': 'Person',
            name: post.author || 'John Oruebi Eniekpo',
            url: `${baseOrigin}/about`
          },
          publisher: {
            '@type': 'Organization',
            name: 'YOLETECH',
            logo: {
              '@type': 'ImageObject',
              url: `${baseOrigin}/assets/yoletech-icon.png`
            }
          },
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': `${baseOrigin}${meta.path}`
          }
        };
      }
    }

    const canonicalUrl = `${baseOrigin}${meta.path}`;
    document.title = meta.title;

    const setMetaTag = (attr, key, val) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', val);
    };

    setMetaTag('name', 'description', meta.description);
    setMetaTag(
      'name',
      'robots',
      meta.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
    );
    setMetaTag('property', 'og:type', meta.type);
    setMetaTag('property', 'og:title', meta.title);
    setMetaTag('property', 'og:description', meta.description);
    setMetaTag('property', 'og:url', canonicalUrl);
    setMetaTag('property', 'og:image', meta.image);
    setMetaTag('property', 'og:image:secure_url', meta.image);
    setMetaTag('property', 'og:image:alt', meta.imageAlt || 'YOLETECH Logo');
    setMetaTag('property', 'og:logo', siteLogoUrl);
    setMetaTag('name', 'twitter:title', meta.title);
    setMetaTag('name', 'twitter:description', meta.description);
    setMetaTag('name', 'twitter:image', meta.image);
    setMetaTag('name', 'twitter:image:alt', meta.imageAlt || 'YOLETECH Logo');

    let canonicalEl = document.querySelector('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', canonicalUrl);

    if (!schemaPayload) {
      schemaPayload = {
        '@context': 'https://schema.org',
        '@type': meta.schemaType || 'WebPage',
        name: meta.title,
        description: meta.description,
        url: canonicalUrl,
        isPartOf: { '@id': `${baseOrigin}/#website` }
      };
    }

    let ldScript = document.getElementById('dynamic-seo-jsonld');
    if (!ldScript) {
      ldScript = document.createElement('script');
      ldScript.id = 'dynamic-seo-jsonld';
      ldScript.type = 'application/ld+json';
      document.head.appendChild(ldScript);
    }
    ldScript.textContent = JSON.stringify(schemaPayload);
  }

  renderNotFoundPage() {
    const requestedPath = typeof window !== 'undefined' ? window.location.pathname : '';
    return `
      <section class="section">
        <div class="container" style="max-width:640px;text-align:center;">
          <div class="glass-card">
            <div class="eyebrow" style="justify-content:center;"><span class="eyebrow-dot"></span> ERROR 404</div>
            <h1 style="font-size:clamp(28px,4vw,40px);font-weight:900;margin-bottom:12px;">Page Not Found</h1>
            <p style="color:var(--yole-text-muted);margin-bottom:24px;">
              We could not find <code>${this.escapeHtml ? this.escapeHtml(requestedPath) : requestedPath.replace(/</g, '&lt;')}</code>. The page may have moved or the URL may contain a typo.
            </p>
            <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
              <a href="/" class="btn btn-lime" onclick="event.preventDefault();window.app.navigate('home')">Go to Home →</a>
              <a href="/services" class="btn btn-outline" onclick="event.preventDefault();window.app.navigate('services')">Explore Services</a>
              <a href="/blog" class="btn btn-outline" onclick="event.preventDefault();window.app.navigate('blog')">Read Blog</a>
              <a href="/contact" class="btn btn-outline" onclick="event.preventDefault();window.app.navigate('contact')">Contact Us</a>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  // ==========================================================================
  // MASTER RENDER
  // ==========================================================================
  render() {
    const root = document.getElementById('app-root');
    if (!root) return;
    ['contact-modal-backdrop', 'contact-options-modal', 'contact-widget-launcher'].forEach((id) => {
      const element = document.getElementById(id);
      if (element) element.hidden = false;
    });
    const pageChanged = this.renderedPage !== this.currentPage;

    const activeEl = document.activeElement;
    const preserveSearchId =
      activeEl && (activeEl.id === 'admin-client-search' || activeEl.id === 'admin-milestone-search')
        ? activeEl.id
        : null;
    const selStart = preserveSearchId ? activeEl.selectionStart : null;
    const selEnd = preserveSearchId ? activeEl.selectionEnd : null;

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
      case 'learn':
        pageContent = typeof this.renderLearnPage === 'function' ? this.renderLearnPage() : this.renderServicesPage();
        break;
      case 'learn-dashboard':
        pageContent = typeof this.renderLearnerDashboardPage === 'function' ? this.renderLearnerDashboardPage() : this.renderAuthPage();
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
      case 'privacy':
        pageContent = this.renderLegalPage('privacy');
        break;
      case 'terms':
        pageContent = this.renderLegalPage('terms');
        break;
      case 'cookies':
        pageContent = this.renderLegalPage('cookies');
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
      case 'not-found':
        pageContent = this.renderNotFoundPage();
        break;
      default:
        pageContent = this.renderNotFoundPage();
    }

    root.innerHTML = `
      <a href="#main-content" class="skip-link">Skip to main content</a>
      ${this.renderHeader()}
      <main id="main-content" class="${pageChanged ? 'page-enter' : ''}">${this.currentPage === 'home' ? this.renderServicesTicker() : ''}${pageContent}</main>
      ${this.renderFooter()}
      ${this.renderCookieConsentBanner()}
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
    this.updatePageSeoMeta();
    window.YOLETECH_COMPONENTS?.decorateCardIcons(root);
    this.initKpiCounters(root);
    this.initScrollReveal(root);
    if (this.currentPage === 'dashboard' && typeof this.mountDashboard === 'function') {
      this.mountDashboard();
    }
    if (this.currentPage === 'learn' && typeof this.mountLearnPage === 'function') {
      this.mountLearnPage();
    }

    if (preserveSearchId) {
      const searchInput = document.getElementById(preserveSearchId);
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
