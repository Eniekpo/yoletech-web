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
    this.authMode = 'login';
    this.adminTab = 'clients';
    this.clientSearch = '';
    this.clientStatusFilter = 'ALL';
    this.contactServiceSelected = 'Data Analytics & Dashboards';
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
  }

  async init() {
    this.bindPopState();
    this.resolveInitialRoute();
    await this.loadPublicData();
    if (this.token) {
      await this.verifySession();
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
    const path = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
    const validPages = [
      'home',
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
    if (!path || path === '') {
      this.currentPage = 'home';
    } else if (path.startsWith('blog/')) {
      this.currentPage = 'blog-detail';
      this.activeBlogSlug = path.split('/')[1];
      if (this.blogPosts.length > 0) {
        this.activeBlogPost = this.blogPosts.find((p) => p.slug === this.activeBlogSlug) || null;
      }
    } else if (validPages.includes(path)) {
      if (path === 'register') {
        this.currentPage = 'login';
        this.authMode = 'register';
      } else {
        this.currentPage = path;
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

  async loadPublicData() {
    try {
      const [portRes, testRes, blogRes] = await Promise.all([
        this.api('/api/portfolio'),
        this.api('/api/testimonials'),
        this.api('/api/blog')
      ]);
      this.portfolio = portRes.projects || [];
      this.testimonials = testRes.testimonials || [];
      this.blogPosts = blogRes.posts || [];
      if (this.currentPage === 'blog-detail' && this.activeBlogSlug) {
        this.activeBlogPost = this.blogPosts.find((p) => p.slug === this.activeBlogSlug) || null;
      }
    } catch (err) {
      console.error('Error loading public data:', err);
    }
  }

  async verifySession() {
    try {
      const { user } = await this.api('/api/auth/me');
      this.user = user;
      localStorage.setItem('yoletech_user', JSON.stringify(user));
      if (user.role === 'ADMIN') {
        await this.loadAdminData();
      } else {
        await this.loadClientData();
      }
    } catch {
      this.logout(false);
    }
  }

  async loadAdminData() {
    try {
      const data = await this.api('/api/clients');
      this.clients = data.clients || [];
      this.inquiries = data.inquiries || [];
    } catch (err) {
      console.error('Admin data load error:', err);
    }
  }

  async loadClientData() {
    try {
      const data = await this.api('/api/inquiries');
      this.inquiries = data.inquiries || [];
    } catch (err) {
      console.error('Client data load error:', err);
    }
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
      <div style="position:fixed;bottom:24px;right:24px;z-index:9999;background:${
        isErr ? '#7f1d1d' : '#1E1B54'
      };border:2px solid ${
      isErr ? '#F7941D' : '#C8E61E'
    };color:#FFFFFF;padding:14px 22px;border-radius:14px;box-shadow:0 16px 40px rgba(0,0,0,0.6);display:flex;align-items:center;gap:12px;font-weight:700;font-size:14px;">
        <span style="color:${isErr ? '#F7941D' : '#C8E61E'};font-size:18px;">${isErr ? '⚠️' : '✓'}</span>
        <span>${this.toastMessage.msg}</span>
      </div>
    `;
  }

  selectContactService(rawService) {
    const map = {
      'Web Development': 'Web Development',
      'Full-Stack Web': 'Web Development',
      'Full-Stack Web Development': 'Web Development',
      'Data Analysis & Analytics': 'Data Analytics & Dashboards',
      'Data Analytics & BI': 'Data Analytics & Dashboards',
      'Data Analytics & Dashboards': 'Data Analytics & Dashboards',
      'AI Automation': 'AI & Automation',
      'AI & Machine Learning': 'AI & Automation',
      'AI & Workflow Automation': 'AI & Automation',
      'AI & Automation': 'AI & Automation',
      'Tech Tutorials': 'Tech Tutorials & Training',
      'Tech Tutorials & Mentorship': 'Tech Tutorials & Training',
      'Tech Tutorials & Training': 'Tech Tutorials & Training',
      'Graphic Design': 'Graphic Design & Video',
      'Video Editing': 'Graphic Design & Video',
      'Graphic Design & Video': 'Graphic Design & Video',
      'Customer Support': 'IT & Customer Support',
      'IT Support': 'IT & Customer Support',
      'IT & Database Support': 'IT & Customer Support',
      'IT & Customer Support': 'IT & Customer Support'
    };
    this.contactServiceSelected = map[rawService] || rawService || 'Data Analytics & Dashboards';
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
    }
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
  // HEADER & FOOTER
  // ==========================================================================
  renderHeader() {
    const C = window.YOLETECH_COMPONENTS;
    const navItems = [
      { id: 'home', label: 'Home' },
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
          </ul>
          <div class="nav-actions">
            ${authButtons}
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
    const C = window.YOLETECH_COMPONENTS;

    return `
      <footer class="site-footer">
        <div class="container">
          <div class="footer-cta-banner">
            <div>
              <span class="eyebrow"><span class="eyebrow-dot"></span> GLOBAL REMOTE READY • YENAGOA, NIGERIA (GMT+1)</span>
              <h2 style="font-size:clamp(24px,3vw,34px);font-weight:900;">Ready to build your next digital engine?</h2>
              <p style="color:var(--yole-text-muted);max-width:560px;margin-top:6px;">
                From React.js &amp; WordPress platforms to interactive Power BI/Tableau dashboards and Python/VBA automation pipelines—let's make your business run faster.
              </p>
            </div>
            <div style="display:flex;gap:14px;flex-wrap:wrap;">
              <a href="${D.whatsappUrl}" target="_blank" rel="noopener" class="btn btn-lime">
                Schedule via WhatsApp →
              </a>
              <button class="btn btn-outline" onclick="window.app.navigate('contact')">
                Send a Message
              </button>
            </div>
          </div>

          <div class="footer-grid">
            <div>
              ${C.renderBrandLogo()}
              <p style="color:var(--yole-text-muted);font-size:14px;margin-top:14px;max-width:340px;">
                <strong>${D.name}</strong> — Data Analyst, Business Intelligence Specialist &amp; Full-Stack Web Developer bridging high-performance web platforms, statistical insights, and automated backend systems.
              </p>
              <div class="social-icon-row">
                <a href="${D.socials.github}" target="_blank" rel="noopener" class="social-btn">GitHub</a>
                <a href="${D.socials.linkedin}" target="_blank" rel="noopener" class="social-btn">LinkedIn</a>
                <a href="${D.socials.kaggle}" target="_blank" rel="noopener" class="social-btn">Kaggle</a>
                <a href="${D.socials.youtube}" target="_blank" rel="noopener" class="social-btn">YouTube</a>
                <a href="${D.socials.facebook}" target="_blank" rel="noopener" class="social-btn">Facebook</a>
                <a href="${D.socials.whatsapp}" target="_blank" rel="noopener" class="social-btn" style="border-color:#C8E61E;color:#C8E61E;">WhatsApp</a>
              </div>
            </div>

            <div>
              <div class="footer-col-title"><span class="eyebrow-dot"></span> CORE SERVICES</div>
              <ul class="footer-links">
                <li><a onclick="window.app.navigate('services')">Full-Stack Web Development</a></li>
                <li><a onclick="window.app.navigate('services')">Data Analytics &amp; BI Dashboards</a></li>
                <li><a onclick="window.app.navigate('services')">AI &amp; Python/VBA Automation</a></li>
                <li><a onclick="window.app.navigate('services')">Tech Tutorials &amp; Staff Training</a></li>
                <li><a onclick="window.app.navigate('services')">Graphic Design &amp; Video Editing</a></li>
                <li><a onclick="window.app.navigate('services')">IT &amp; Database Support</a></li>
              </ul>
            </div>

            <div>
              <div class="footer-col-title"><span class="eyebrow-dot"></span> NAVIGATION &amp; PORTALS</div>
              <ul class="footer-links">
                <li><a onclick="window.app.navigate('about')">About John Eniekpo (CV)</a></li>
                <li><a onclick="window.app.navigate('portfolio')">Portfolio &amp; Case Studies</a></li>
                <li><a onclick="window.app.navigate('testimonials')">Client &amp; Mentee Testimonials</a></li>
                <li><a onclick="window.app.navigate('blog')">Blog &amp; Tech Tutorials</a></li>
                <li><a onclick="window.app.navigate('login')">Client &amp; Admin Login Portal</a></li>
                <li><a href="/admin/" target="_blank">Decap Bridge CMS (/admin)</a></li>
                <li><a href="/cv.html" target="_blank">Printable Official CV (PDF)</a></li>
              </ul>
            </div>

            <div>
              <div class="footer-col-title"><span class="eyebrow-dot"></span> CONNECT &amp; STATUS</div>
              <div style="font-size:13.5px;color:var(--yole-text-muted);margin-bottom:8px;">
                <strong style="color:#FFFFFF;">Direct Email:</strong><br/>
                <a href="mailto:${D.email}" style="color:#C8E61E;">${D.email}</a>
              </div>
              <div style="font-size:13.5px;color:var(--yole-text-muted);margin-bottom:12px;">
                <strong style="color:#FFFFFF;">WhatsApp / Phone:</strong><br/>
                <a href="${D.whatsappUrl}" target="_blank" style="color:#FFFFFF;">${D.phone}</a>
              </div>

              <div class="status-badge-card">
                <span><span class="pulse-dot"></span>All Systems Operational</span>
                <span style="color:#C8E61E;">99.9%</span>
              </div>
              <div class="status-badge-card" style="background:rgba(47,43,115,0.45);border-color:rgba(255,255,255,0.18);margin-top:8px;">
                <span>⚡ Site &amp; SQLite Engine</span>
                <span style="color:#F7941D;">&lt; 1.5s Load</span>
              </div>
            </div>
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;padding-top:24px;font-size:13px;color:var(--yole-text-subtle);">
            <div>© 2026 YOLETECH — John Oruebi Eniekpo, B.Sc. All rights reserved.</div>
            <div>Yenagoa, Bayelsa State, Nigeria • Available for Global Remote</div>
          </div>
        </div>
      </footer>

      <!-- FLOATING WHATSAPP QUICK CONNECT -->
      <a href="${D.whatsappUrl}" target="_blank" rel="noopener" title="Chat with John Oruebi Eniekpo on WhatsApp" style="position:fixed;bottom:22px;left:22px;z-index:990;background:#19164B;border:2px solid #C8E61E;color:#FFFFFF;padding:10px 16px;border-radius:999px;box-shadow:0 12px 30px rgba(0,0,0,0.55);display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:800;">
        <span style="width:9px;height:9px;border-radius:50%;background:#C8E61E;box-shadow:0 0 8px #C8E61E;"></span>
        <span>WhatsApp John</span>
      </a>
    `;
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
          <div class="hero-slide-badge">${slide.badge}</div>
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
    const featuredProjects = this.portfolio.slice(0, 3);
    const recentBlogs = this.blogPosts.slice(0, 3);

    return `
      <!-- HERO SECTION WITH SLIDESHOW & 8-SERVICE FEATURE STRIP -->
      <section class="hero-section" onmouseenter="window.app.slidePaused = true" onmouseleave="window.app.slidePaused = false">
        <div class="container hero-slideshow-wrapper" id="hero-slideshow-mount">
          ${this.renderHeroSlideInner()}
        </div>

        <!-- 8-Service Feature Strip (Exact Match to Hero Banner Reference) -->
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

      <!-- CV IMPACT METRICS & 3 CORE VALUE PILLARS -->
      <section class="section">
        <div class="container">
          <div class="metrics-strip">
            <div class="metric-cell">
              <div class="metric-number">5+</div>
              <div class="metric-label">Years Data, BI &amp;<br/>Full-Stack Experience</div>
            </div>
            <div class="metric-cell">
              <div class="metric-number">200+</div>
              <div class="metric-label">Analytics Interns<br/>Trained &amp; Mentored</div>
            </div>
            <div class="metric-cell">
              <div class="metric-number">8+</div>
              <div class="metric-label">Google, Coursera &amp;<br/>Kaggle Certifications</div>
            </div>
            <div class="metric-cell">
              <div class="metric-number">100%</div>
              <div class="metric-label">Data Integrity &amp;<br/>Global Remote Ready</div>
            </div>
          </div>

          <div class="section-header">
            <div class="eyebrow"><span class="eyebrow-dot"></span> HOW I BRING VALUE TO YOUR BUSINESS</div>
            <h2 class="section-title">Bridging Full-Stack Web Platforms, Executive BI &amp; Automated Workflows</h2>
            <p class="section-desc">
              Led by <strong>John Oruebi Eniekpo, B.Sc.</strong> — combining Computer Science engineering with statistical analysis, database governance, and modern web architecture.
            </p>
          </div>

          <div class="grid-3">
            <div class="glass-card">
              <span class="tech-pill lime" style="margin-bottom:14px;">01. Web &amp; Digital Platforms</span>
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
              <span class="tech-pill orange" style="margin-bottom:14px;">02. Data Analytics &amp; BI</span>
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
              <span class="tech-pill lime" style="margin-bottom:14px;">03. AI &amp; Automation</span>
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
            <div class="eyebrow"><span class="eyebrow-dot"></span> LIVE ARCHITECTURE &amp; BI PREVIEW</div>
            <h2 class="section-title">Explore How Your Data &amp; Web Systems Operate</h2>
            <p class="section-desc">
              Switch between our interactive Business Intelligence overview, full-stack API code synchronization, and automated Python/VBA pipeline architecture.
            </p>
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
              View All ${this.portfolio.length} Projects →
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
                  <div style="display:flex;flex-wrap:wrap;gap:6px;">
                    ${(p.tech_stack || []).map((t) => `<span class="tech-pill">${t}</span>`).join('')}
                  </div>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      </section>

      <!-- LATEST BLOG ARTICLES (DECAP CMS) -->
      <section class="section section-alt">
        <div class="container">
          <div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:16px;margin-bottom:36px;">
            <div>
              <div class="eyebrow"><span class="eyebrow-dot"></span> INSIGHTS &amp; TUTORIALS (DECAP BRIDGE CMS)</div>
              <h2 class="section-title" style="margin-bottom:0;">Latest Articles by John Eniekpo</h2>
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
      </section>
    `;
  }

  // ==========================================================================
  // PAGE 2: ABOUT (100% CV DATA + SAMPLE 88a21eec.jpg LAYOUT)
  // ==========================================================================
  renderAboutPage() {
    const D = window.YOLETECH_DATA;
    const C = window.YOLETECH_COMPONENTS;

    return `
      <section class="section">
        <div class="container">
          <div class="hero-slide-grid" style="margin-bottom:56px;">
            <div>
              <div class="eyebrow"><span class="eyebrow-dot"></span> ABOUT JOHN ORUEBI ENIEKPO, B.Sc.</div>
              <h1 class="hero-title" style="font-size:clamp(32px,4vw,48px);">
                The Developer, Analyst &amp; <span class="accent-lime">Automator Behind Your Project</span>
              </h1>
              <p style="font-size:16px;color:var(--yole-text-muted);margin-bottom:20px;">
                ${D.owner.summary}
              </p>
              <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:26px;">
                <span class="tech-pill lime">📍 ${D.owner.location}</span>
                <span class="tech-pill orange">🎓 M.Sc. IT (In-View) • B.Sc. Computer Science</span>
              </div>
              <div class="hero-cta-row">
                <button class="btn btn-lime" onclick="window.app.navigate('contact')">
                  Let's Discuss Your Project →
                </button>
                <a href="/cv.html" target="_blank" class="btn btn-outline">
                  View / Download Official CV (PDF)
                </a>
              </div>
            </div>
            <div>
              ${C.renderPortraitHeroWidget()}
            </div>
          </div>

          <!-- CORE TECHNICAL PROFICIENCIES -->
          <div class="section-header">
            <div class="eyebrow"><span class="eyebrow-dot"></span> TECHNICAL ARSENAL</div>
            <h2 class="section-title">Core Technical Proficiencies</h2>
          </div>

          <div class="grid-3" style="margin-bottom:64px;">
            ${D.coreProficiencies
              .map(
                (prof) => `
              <div class="glass-card">
                <h3 style="font-size:18px;font-weight:800;color:${
                  prof.accent === 'lime' ? '#C8E61E' : '#F7941D'
                };margin-bottom:14px;">
                  ${prof.category}
                </h3>
                <div style="display:flex;flex-wrap:wrap;gap:8px;">
                  ${prof.skills.map((s) => `<span class="tech-pill">${s}</span>`).join('')}
                </div>
              </div>
            `
              )
              .join('')}

            <div class="glass-card">
              <h3 style="font-size:18px;font-weight:800;color:#C8E61E;margin-bottom:14px;">
                Professional Competencies
              </h3>
              ${D.competencies
                .map(
                  (comp) => `
                <div style="margin-bottom:12px;">
                  <div style="font-weight:800;font-size:14px;color:#FFFFFF;">✓ ${comp.title}</div>
                  <div style="font-size:12.5px;color:var(--yole-text-muted);">${comp.description}</div>
                </div>
              `
                )
                .join('')}
            </div>
          </div>

          <!-- PROFESSIONAL EXPERIENCE TIMELINE -->
          <div class="section-header">
            <div class="eyebrow"><span class="eyebrow-dot"></span> CAREER TRACK RECORD</div>
            <h2 class="section-title">Professional Experience</h2>
          </div>

          <div class="grid-2" style="margin-bottom:64px;">
            ${D.experience
              .map(
                (exp) => `
              <div class="glass-card">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
                  <div>
                    <h3 style="font-size:21px;font-weight:900;color:#FFFFFF;">${exp.role}</h3>
                    <div style="font-size:15px;font-weight:700;color:#C8E61E;">${exp.company} — ${exp.location}</div>
                  </div>
                  <span class="tech-pill orange">${exp.period}</span>
                </div>
                <ul style="padding-left:18px;color:var(--yole-text-muted);font-size:14px;display:flex;flex-direction:column;gap:8px;">
                  ${exp.highlights.map((h) => `<li>${h}</li>`).join('')}
                </ul>
              </div>
            `
              )
              .join('')}
          </div>

          <!-- EDUCATION & PROFESSIONAL CERTIFICATIONS -->
          <div class="grid-2">
            <div class="glass-card">
              <div class="eyebrow"><span class="eyebrow-dot"></span> ACADEMIC CREDENTIALS</div>
              <h3 style="font-size:24px;font-weight:900;margin-bottom:20px;">Education</h3>
              <div style="display:flex;flex-direction:column;gap:16px;">
                ${D.education
                  .map(
                    (ed) => `
                  <div style="padding:14px;background:rgba(15,13,44,0.65);border:1px solid rgba(255,255,255,0.12);border-radius:12px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px;">
                      <span style="font-weight:800;font-size:15px;color:#FFFFFF;">${ed.degree}</span>
                      <span class="tech-pill lime" style="font-size:11px;">${ed.period}</span>
                    </div>
                    <div style="font-size:13.5px;color:var(--yole-text-muted);">${ed.institution}</div>
                  </div>
                `
                  )
                  .join('')}
              </div>
            </div>

            <div class="glass-card">
              <div class="eyebrow"><span class="eyebrow-dot"></span> VERIFIED SPECIALIZATIONS</div>
              <h3 style="font-size:24px;font-weight:900;margin-bottom:20px;">Certifications &amp; Specializations</h3>

              <div style="margin-bottom:20px;">
                <h4 style="font-size:15px;font-weight:800;color:#C8E61E;margin-bottom:10px;">
                  Google &amp; Coursera Professional Credentials
                </h4>
                <div style="display:flex;flex-direction:column;gap:8px;">
                  ${D.certifications.googleCoursera
                    .map(
                      (c) => `
                    <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(15,13,44,0.65);border-radius:10px;font-size:13.5px;">
                      <span style="color:#C8E61E;font-weight:900;">✓</span>
                      <span>${c}</span>
                    </div>
                  `
                    )
                    .join('')}
                </div>
              </div>

              <div>
                <h4 style="font-size:15px;font-weight:800;color:#F7941D;margin-bottom:10px;">
                  Kaggle Technical Certifications
                </h4>
                <div style="display:flex;flex-direction:column;gap:8px;">
                  ${D.certifications.kaggle
                    .map(
                      (c) => `
                    <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(15,13,44,0.65);border-radius:10px;font-size:13.5px;">
                      <span style="color:#F7941D;font-weight:900;">★</span>
                      <span>${c}</span>
                    </div>
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

  // ==========================================================================
  // PAGE 3: SERVICES (SAMPLE 6584d141.jpg + 8 SERVICES + SCOPE TABLE)
  // ==========================================================================
  renderServicesPage() {
    const D = window.YOLETECH_DATA;
    const C = window.YOLETECH_COMPONENTS;

    return `
      <section class="section">
        <div class="container">
          <div class="hero-slide-grid" style="margin-bottom:56px;">
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
            <div>
              ${C.renderDataOverviewWidget()}
            </div>
          </div>

          <div class="section-header">
            <div class="eyebrow"><span class="eyebrow-dot"></span> OUR SERVICES</div>
            <h2 class="section-title">8 Complete Service Tracks Under One Roof</h2>
            <p class="section-desc">Select any service track below to start a tailored project inquiry.</p>
          </div>

          <div class="grid-2" style="margin-bottom:68px;">
            ${D.eightServicesStrip
              .map(
                (srv, idx) => `
              <div class="glass-card" style="display:flex;flex-direction:column;justify-content:space-between;">
                <div>
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                    <div class="service-strip-icon">${C.getIcon(srv.icon)}</div>
                    <span class="tech-pill ${idx % 2 === 0 ? 'lime' : 'orange'}">0${idx + 1} • ${srv.category}</span>
                  </div>
                  <h3 style="font-size:22px;font-weight:900;margin-bottom:6px;">0${idx + 1}. ${srv.title}</h3>
                  <div style="font-size:13px;font-weight:700;color:#C8E61E;margin-bottom:12px;">${srv.sub}</div>
                  <p style="font-size:14px;color:var(--yole-text-muted);margin-bottom:16px;">${srv.description}</p>
                </div>

                <div>
                  <div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:14px;margin-bottom:16px;">
                    <div style="font-size:12px;font-weight:800;color:var(--yole-text-muted);text-transform:uppercase;margin-bottom:8px;">
                      Key Deliverables:
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
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

          <!-- SERVICE OVERVIEW & DELIVERY SCOPE TABLE (Sample 6584d141.jpg) -->
          <div class="section-header">
            <div class="eyebrow"><span class="eyebrow-dot"></span> TRANSPARENT EXECUTION</div>
            <h2 class="section-title">Service Overview &amp; Delivery Scope</h2>
          </div>

          <div class="table-wrapper" style="margin-bottom:68px;">
            <table class="yole-table">
              <thead>
                <tr>
                  <th>Service Track</th>
                  <th>Core Tech Stack</th>
                  <th>Typical Timeline</th>
                  <th>Deliverables &amp; Standards</th>
                </tr>
              </thead>
              <tbody>
                ${D.serviceScopeTable
                  .map(
                    (row) => `
                  <tr>
                    <td style="font-weight:800;color:#FFFFFF;">${row.track}</td>
                    <td>
                      <div style="display:flex;flex-wrap:wrap;gap:6px;">
                        ${row.stack.map((s) => `<span class="tech-pill lime" style="font-size:11px;">${s}</span>`).join('')}
                      </div>
                    </td>
                    <td><span class="tech-pill orange">${row.timeline}</span></td>
                    <td style="color:var(--yole-text-muted);">${row.deliverables}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>

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
  // PAGE 4: PORTFOLIO (FILTERABLE CASE STUDIES)
  // ==========================================================================
  renderPortfolioPage() {
    const categories = [
      'ALL',
      'Data Analytics & BI',
      'AI & Machine Learning',
      'AI & Workflow Automation',
      'Full-Stack Web',
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
              Real-world deliverables across SulPhil Tech Hub, Feasibility Giant Company, and YOLETECH client engagements.
            </p>
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
              <div class="glass-card" style="display:flex;flex-direction:column;justify-content:space-between;">
                <div>
                  <div style="border-radius:12px;overflow:hidden;margin-bottom:16px;border:1px solid rgba(255,255,255,0.14);height:190px;">
                    <img src="${p.preview_image}" alt="${p.title}" style="width:100%;height:100%;object-fit:cover;" />
                  </div>
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <span class="tech-pill lime">${p.category}</span>
                    <span style="font-size:12px;color:var(--yole-text-muted);">${p.organization} (${p.period})</span>
                  </div>
                  <h3 style="font-size:20px;font-weight:800;margin-bottom:10px;">${p.title}</h3>
                  <p style="font-size:14px;color:var(--yole-text-muted);margin-bottom:14px;">${p.summary}</p>
                </div>

                <div>
                  <div style="background:rgba(200,230,30,0.08);border-left:3px solid #C8E61E;padding:10px 12px;font-size:12.5px;color:#FFFFFF;margin-bottom:14px;border-radius:0 8px 8px 0;">
                    <strong>Verified Outcome:</strong> ${p.impact_metrics}
                  </div>
                  <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;">
                    ${(p.tech_stack || []).map((t) => `<span class="tech-pill">${t}</span>`).join('')}
                  </div>
                  <div style="display:flex;gap:10px;border-top:1px solid rgba(255,255,255,0.1);padding-top:12px;">
                    <a href="${p.github_url || 'https://github.com/Eniekpo'}" target="_blank" rel="noopener" class="btn btn-outline btn-sm" style="flex:1;">
                      GitHub / Source
                    </a>
                    <button class="btn btn-lime btn-sm" style="flex:1;" onclick="window.app.selectContactService('${p.category}')">
                      Build Similar →
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
    `;
  }

  // ==========================================================================
  // PAGE 5: TESTIMONIALS
  // ==========================================================================
  renderTestimonialsPage() {
    return `
      <section class="section">
        <div class="container">
          <div class="section-header">
            <div class="eyebrow"><span class="eyebrow-dot"></span> CLIENT &amp; MENTEE ENDORSEMENTS</div>
            <h1 class="section-title">What Stakeholders, Clients &amp; Mentees Say</h1>
            <p class="section-desc">
              Feedback from executive research stakeholders, departmental supervisors, and graduates of our 200+ intern analytics mentorship program.
            </p>
          </div>

          <div class="grid-2" style="margin-bottom:64px;">
            ${this.testimonials
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

          <!-- SUBMIT A TESTIMONIAL CARD -->
          <div class="glass-card" style="max-width:740px;margin:0 auto;">
            <div class="eyebrow"><span class="eyebrow-dot"></span> WORKED WITH JOHN OR JOINED A COHORT?</div>
            <h3 style="font-size:24px;font-weight:900;margin-bottom:16px;">Share Your Experience with YOLETECH</h3>
            <form onsubmit="window.app.handleTestimonialSubmit(event)">
              <div class="grid-2" style="gap:16px;">
                <div class="form-group">
                  <label class="form-label">Your Full Name *</label>
                  <input type="text" name="author_name" required class="form-control" placeholder="e.g. Engr. Tariye Peters" value="${
                    this.user ? this.user.name : ''
                  }" />
                </div>
                <div class="form-group">
                  <label class="form-label">Your Role / Title</label>
                  <input type="text" name="author_role" class="form-control" placeholder="e.g. Operations Manager / Analytics Mentee" />
                </div>
              </div>
              <div class="grid-2" style="gap:16px;">
                <div class="form-group">
                  <label class="form-label">Organization / Cohort</label>
                  <input type="text" name="company" class="form-control" placeholder="e.g. SulPhil Tech Hub / Company Name" value="${
                    this.user ? this.user.company : ''
                  }" />
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
              </div>
              <div class="form-group">
                <label class="form-label">Your Testimonial *</label>
                <textarea name="content" rows="3" required class="form-control" placeholder="Share how our dashboards, web development, automation, or training helped you..."></textarea>
              </div>
              <button type="submit" class="btn btn-lime">Submit Testimonial →</button>
            </form>
          </div>
        </div>
      </section>
    `;
  }

  async handleTestimonialSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const payload = {
      author_name: form.author_name.value,
      author_role: form.author_role.value,
      company: form.company.value,
      service_track: form.service_track.value,
      rating: 5,
      content: form.content.value
    };
    try {
      await this.api('/api/testimonials', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      await this.loadPublicData();
      form.reset();
      this.showToast('Thank you! Your testimonial has been published.');
      this.render();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  // ==========================================================================
  // PAGE 6: BLOG & ARTICLE READER (POWERED BY DECAP CMS / DECAP BRIDGE)
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
            <div class="eyebrow"><span class="eyebrow-dot"></span> YOLETECH TECHNICAL BLOG • POWERED BY DECAP BRIDGE</div>
            <h1 class="section-title">Articles on Data Analytics, BI, Python &amp; Web Engineering</h1>
            <p class="section-desc">
              Practical guides, SQL/Python code walkthroughs, and architectural insights written by <strong>John Oruebi Eniekpo, B.Sc.</strong>
            </p>
            <div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:16px;">
              <a href="/admin/" target="_blank" class="btn btn-outline btn-sm">
                Open Decap CMS (/admin) ↗
              </a>
              ${
                this.user?.role === 'ADMIN'
                  ? `<button class="btn btn-lime btn-sm" onclick="window.app.adminTab='blog';window.app.navigate('admin-dashboard')">+ Write New Article in Admin Studio</button>`
                  : ''
              }
            </div>

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
              <div class="glass-card" style="display:flex;flex-direction:column;justify-content:space-between;cursor:pointer;" onclick="window.app.navigate('blog-detail', '${post.slug}')">
                <div>
                  <div style="border-radius:12px;overflow:hidden;margin-bottom:16px;height:200px;border:1px solid rgba(255,255,255,0.12);">
                    <img src="${post.coverImage}" alt="${post.title}" style="width:100%;height:100%;object-fit:cover;" />
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

          <div class="glass-card" style="padding:40px;">
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
    const servicePills = [
      'Web Development',
      'Data Analytics & Dashboards',
      'AI & Automation',
      'Tech Tutorials & Training',
      'Graphic Design & Video',
      'IT & Customer Support'
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
                ${servicePills
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

              <form onsubmit="window.app.handleContactSubmit(event)">
                <input type="hidden" name="service_category" value="${this.contactServiceSelected}" />
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
                  <label class="form-label">Estimated Budget</label>
                  <select name="budget" class="form-control">
                    <option value="$500 - $1,500">$500 – $1,500 (Standard Dashboard / Web / Automation)</option>
                    <option value="$1,500 - $5,000" selected>$1,500 – $5,000 (Full-Stack Platform / Enterprise BI)</option>
                    <option value="$5,000+">$5,000+ (Multi-Departmental System / Retainer)</option>
                    <option value="Under $500 / Consultation">Under $500 / Training / Quick Audit</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Project Details &amp; Goals *</label>
                  <textarea name="message" rows="5" required class="form-control" placeholder="Tell me about your project, datasets, goals, or the manual problems you need solved..."></textarea>
                </div>

                <button type="submit" class="btn btn-lime" style="width:100%;font-size:15px;padding:14px;">
                  Send Message →
                </button>
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
                      Connect directly with John Oruebi Eniekpo on WhatsApp or Zoom to scope your project.
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
                    <a href="${D.owner.socials.github}" target="_blank" class="social-btn">GitHub</a>
                    <a href="${D.owner.socials.linkedin}" target="_blank" class="social-btn">LinkedIn</a>
                    <a href="${D.owner.socials.kaggle}" target="_blank" class="social-btn">Kaggle</a>
                    <a href="${D.owner.socials.youtube}" target="_blank" class="social-btn">YouTube</a>
                    <a href="${D.owner.socials.facebook}" target="_blank" class="social-btn">Facebook</a>
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
    const payload = {
      name: form.name.value,
      email: form.email.value,
      phone: form.phone.value,
      service_category: form.service_category.value,
      budget: form.budget.value,
      message: form.message.value
    };
    try {
      await this.api('/api/inquiries', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      form.reset();
      this.showToast('Project inquiry sent! Saved to YOLETECH database.');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  // ==========================================================================
  // PAGE 8: USER REGISTRATION & LOGIN PORTAL
  // ==========================================================================
  renderAuthPage() {
    const isLogin = this.authMode === 'login';

    return `
      <section class="section">
        <div class="container" style="max-width:540px;">
          <div class="glass-card" style="border-color:#C8E61E;padding:36px;">
            <div style="text-align:center;margin-bottom:24px;">
              <div class="eyebrow" style="justify-content:center;"><span class="eyebrow-dot"></span> YOLETECH SECURE PORTAL</div>
              <h1 style="font-size:28px;font-weight:900;">
                ${isLogin ? 'Sign In to Your Portal' : 'Create a Client Account'}
              </h1>
              <p style="font-size:14px;color:var(--yole-text-muted);margin-top:6px;">
                ${
                  isLogin
                    ? 'Access your Client Project Portal or the Master Admin CRM Dashboard.'
                    : 'Register to request projects, track deliverables, and collaborate with John Oruebi Eniekpo.'
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
              <form onsubmit="window.app.handleLoginSubmit(event)">
                <div class="form-group">
                  <label class="form-label">Email Address *</label>
                  <input type="email" id="login-email" name="email" required class="form-control" placeholder="yoletech@yolestica.com" />
                </div>
                <div class="form-group">
                  <label class="form-label">Password *</label>
                  <input type="password" id="login-password" name="password" required class="form-control" placeholder="••••••••••••" />
                </div>
                <button type="submit" class="btn btn-lime" style="width:100%;padding:14px;">
                  Sign In to Portal →
                </button>
              </form>

              <div style="margin-top:24px;padding-top:18px;border-top:1px solid rgba(255,255,255,0.12);">
                <div style="font-size:12px;font-weight:800;color:#C8E61E;text-transform:uppercase;margin-bottom:10px;">
                  Quick Credentials Fill (Admin &amp; Demo Client)
                </div>
                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                  <button type="button" class="btn btn-outline btn-sm" style="flex:1;" onclick="document.getElementById('login-email').value='yoletech@yolestica.com';document.getElementById('login-password').value='YoleTech@2026#Admin';">
                    🔑 Fill Admin Login
                  </button>
                  <button type="button" class="btn btn-outline btn-sm" style="flex:1;" onclick="document.getElementById('login-email').value='client@example.com';document.getElementById('login-password').value='Client@2026';">
                    👤 Fill Demo Client
                  </button>
                </div>
              </div>
            `
                : `
              <form onsubmit="window.app.handleRegisterSubmit(event)">
                <div class="form-group">
                  <label class="form-label">Full Name *</label>
                  <input type="text" name="name" required class="form-control" placeholder="e.g. Dr. Tarila Okoro" />
                </div>
                <div class="grid-2" style="gap:12px;">
                  <div class="form-group">
                    <label class="form-label">Email Address *</label>
                    <input type="email" name="email" required class="form-control" placeholder="you@company.com" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">WhatsApp / Phone *</label>
                    <input type="text" name="phone" required class="form-control" placeholder="+234 ..." />
                  </div>
                </div>
                <div class="grid-2" style="gap:12px;">
                  <div class="form-group">
                    <label class="form-label">Company / Organization</label>
                    <input type="text" name="company" class="form-control" placeholder="Organization Name" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Primary Service Interest</label>
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
                  <label class="form-label">Create Password *</label>
                  <input type="password" name="password" required minlength="6" class="form-control" placeholder="At least 6 characters" />
                </div>
                <button type="submit" class="btn btn-lime" style="width:100%;padding:14px;">
                  Complete Registration →
                </button>
              </form>
            `
            }
          </div>
        </div>
      </section>
    `;
  }

  async handleLoginSubmit(e) {
    e.preventDefault();
    const form = e.target;
    try {
      const { token, user } = await this.api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: form.email.value,
          password: form.password.value
        })
      });
      this.token = token;
      this.user = user;
      localStorage.setItem('yoletech_token', token);
      localStorage.setItem('yoletech_user', JSON.stringify(user));
      this.showToast(`Welcome back, ${user.name}!`);
      if (user.role === 'ADMIN') {
        await this.loadAdminData();
        this.navigate('admin-dashboard');
      } else {
        await this.loadClientData();
        this.navigate('portal');
      }
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  async handleRegisterSubmit(e) {
    e.preventDefault();
    const form = e.target;
    try {
      const { token, user } = await this.api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.value,
          email: form.email.value,
          phone: form.phone.value,
          company: form.company.value,
          service_interest: form.service_interest.value,
          password: form.password.value
        })
      });
      this.token = token;
      this.user = user;
      localStorage.setItem('yoletech_token', token);
      localStorage.setItem('yoletech_user', JSON.stringify(user));
      await this.loadClientData();
      this.showToast(`Account created! Welcome to YOLETECH, ${user.name}.`);
      this.navigate('portal');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  // ==========================================================================
  // PAGE 9: REGISTERED CLIENT PORTAL (/portal)
  // ==========================================================================
  renderClientPortalPage() {
    if (!this.user) {
      return this.renderAuthPage();
    }

    return `
      <section class="section">
        <div class="container">
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
                              <strong style="color:#C8E61E;">${inq.project_progress || 15}%</strong>
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
                <form onsubmit="window.app.handleClientPortalInquiry(event)">
                  <div class="form-group">
                    <label class="form-label">Service Track</label>
                    <select name="service_category" class="form-control">
                      <option value="Data Analytics & Dashboards">Data Analytics &amp; BI Dashboards</option>
                      <option value="Web Development">Full-Stack Web Development</option>
                      <option value="AI & Automation">AI, ML &amp; Excel VBA Automation</option>
                      <option value="Tech Tutorials & Training">Tech Tutorials &amp; Staff Training</option>
                      <option value="Graphic Design & Video">Graphic Design &amp; Video Editing</option>
                      <option value="IT & Customer Support">IT &amp; Database Support</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Estimated Budget</label>
                    <select name="budget" class="form-control">
                      <option value="$500 - $1,500">$500 – $1,500</option>
                      <option value="$1,500 - $5,000" selected>$1,500 – $5,000</option>
                      <option value="$5,000+">$5,000+</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Project Scope &amp; Deliverables *</label>
                    <textarea name="message" rows="4" required class="form-control" placeholder="Describe the dataset, dashboard, web platform, or workflow automation you need..."></textarea>
                  </div>
                  <button type="submit" class="btn btn-lime" style="width:100%;">Submit Request to John →</button>
                </form>
              </div>

              <!-- CLIENT PROFILE SETTINGS -->
              <div class="glass-card">
                <h3 style="font-size:19px;font-weight:900;margin-bottom:14px;">Account &amp; Profile Settings</h3>
                <form onsubmit="window.app.handleProfileUpdateSubmit(event)">
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
                  <button type="submit" class="btn btn-outline btn-sm">Save Profile Changes</button>
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
    try {
      const { user } = await this.api('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: form.name.value,
          phone: form.phone.value,
          company: form.company.value,
          service_interest: form.service_interest.value
        })
      });
      this.user = user;
      localStorage.setItem('yoletech_user', JSON.stringify(user));
      this.showToast('Profile settings updated!');
      this.render();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  async handleClientPortalInquiry(e) {
    e.preventDefault();
    const form = e.target;
    try {
      await this.api('/api/inquiries', {
        method: 'POST',
        body: JSON.stringify({
          name: this.user.name,
          email: this.user.email,
          phone: this.user.phone,
          service_category: form.service_category.value,
          budget: form.budget.value,
          message: form.message.value
        })
      });
      await this.loadClientData();
      form.reset();
      this.showToast('New project request submitted!');
      this.render();
    } catch (err) {
      this.showToast(err.message, 'error');
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
              <span><strong style="color:#C8E61E;">● Active:</strong> ${activeCount}</span>
              <span><strong style="color:#F7941D;">● Onboarding:</strong> ${onboardingCount}</span>
              <span><strong style="color:#FFFFFF;">● Completed:</strong> ${completedCount}</span>
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
            <div style="font-size:12px;font-weight:800;color:#C8E61E;text-transform:uppercase;">SQLite &amp; Decap Bridge Health</div>
            <div style="font-size:20px;font-weight:900;margin-top:6px;">All Pipelines Synced</div>
            <div style="font-size:12.5px;color:var(--yole-text-muted);margin-top:2px;">Database: <code>server/yoletech.db</code></div>
          </div>
          <button class="btn btn-outline btn-sm" style="margin-top:12px;" onclick="window.app.exportClientsToCSV()">
            ⬇ Export Clients to CSV (Excel / Power BI)
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
                Please sign in with the master administrator credentials (<strong>yoletech@yolestica.com</strong>) to manage registered clients, inquiries, and Decap Bridge blog articles.
              </p>
              <button class="btn btn-lime" onclick="window.app.navigate('login')">Go to Admin Login →</button>
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
              <div class="eyebrow"><span class="eyebrow-dot"></span> YOLETECH COMMAND CENTER • SQLITE BACKEND</div>
              <h1 style="font-size:30px;font-weight:900;">Client CRM &amp; Platform Dashboard</h1>
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
              <button class="btn btn-outline btn-sm" onclick="window.app.exportClientsToCSV()">
                ⬇ Export Clients CSV
              </button>
              <a href="/admin/" target="_blank" class="btn btn-outline btn-sm">
                Open Decap Bridge CMS (/admin) ↗
              </a>
              <button class="btn btn-lime btn-sm" onclick="window.app.loadAdminData().then(() => window.app.render())">
                ↻ Refresh Live Data
              </button>
            </div>
          </div>

          <!-- DATA OVERVIEW KPI ROW (Matches Sample f2e39467.jpg) -->
          <div class="metrics-strip" style="margin-bottom:24px;">
            <div class="metric-cell">
              <div class="metric-number">${totalClients}</div>
              <div class="metric-label">Registered<br/>Clients</div>
            </div>
            <div class="metric-cell">
              <div class="metric-number" style="color:#F7941D;">${this.inquiries.length}</div>
              <div class="metric-label">Active Project<br/>Inquiries</div>
            </div>
            <div class="metric-cell">
              <div class="metric-number">${this.portfolio.length}</div>
              <div class="metric-label">Portfolio<br/>Case Studies</div>
            </div>
            <div class="metric-cell">
              <div class="metric-number" style="color:#F7941D;">${this.blogPosts.length}</div>
              <div class="metric-label">Decap Markdown<br/>Blog Posts</div>
            </div>
          </div>

          ${this.renderAdminAnalyticsOverview(activeClients, onboardingClients, completedClients)}

          <!-- ADMIN NAVIGATION TABS -->
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:28px;">
            <button class="selector-pill ${this.adminTab === 'clients' ? 'active' : ''}" onclick="window.app.adminTab='clients';window.app.render();">
              👥 Registered Clients CRM (${totalClients})
            </button>
            <button class="selector-pill ${this.adminTab === 'inquiries' ? 'active' : ''}" onclick="window.app.adminTab='inquiries';window.app.render();">
              📩 Project Inquiries (${this.inquiries.length})
            </button>
            <button class="selector-pill ${this.adminTab === 'blog' ? 'active' : ''}" onclick="window.app.adminTab='blog';window.app.render();">
              ✍️ Decap Bridge Blog Publisher (${this.blogPosts.length})
            </button>
            <button class="selector-pill ${this.adminTab === 'portfolio' ? 'active' : ''}" onclick="window.app.adminTab='portfolio';window.app.render();">
              🚀 Portfolio Manager (${this.portfolio.length})
            </button>
            <button class="selector-pill ${this.adminTab === 'testimonials' ? 'active' : ''}" onclick="window.app.adminTab='testimonials';window.app.render();">
              💬 Testimonials Manager (${this.testimonials.length})
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

  renderAdminClientsTab(filteredClients, activeClients, onboardingClients, completedClients) {
    return `
      <!-- FILTER & SEARCH BAR -->
      <div class="glass-card" style="margin-bottom:24px;padding:20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px;">
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="selector-pill ${this.clientStatusFilter === 'ALL' ? 'active' : ''}" onclick="window.app.clientStatusFilter='ALL';window.app.render();">
              All Clients
            </button>
            <button class="selector-pill ${this.clientStatusFilter === 'ACTIVE' ? 'active' : ''}" onclick="window.app.clientStatusFilter='ACTIVE';window.app.render();">
              ● Active (${activeClients})
            </button>
            <button class="selector-pill ${this.clientStatusFilter === 'ONBOARDING' ? 'active' : ''}" onclick="window.app.clientStatusFilter='ONBOARDING';window.app.render();">
              ● Onboarding (${onboardingClients})
            </button>
            <button class="selector-pill ${this.clientStatusFilter === 'COMPLETED' ? 'active' : ''}" onclick="window.app.clientStatusFilter='COMPLETED';window.app.render();">
              ● Completed (${completedClients})
            </button>
          </div>

          <div style="flex:1;max-width:340px;">
            <input id="admin-client-search" type="text" class="form-control" placeholder="Search client name, email, company..." value="${this.clientSearch}" oninput="window.app.clientSearch=this.value;window.app.render();" />
          </div>
        </div>
      </div>

      <!-- REGISTERED CLIENTS TABLE -->
      <div class="table-wrapper" style="margin-bottom:32px;">
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
            ${filteredClients
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
      this.showToast('Client record updated in SQLite.');
      this.render();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  async deleteClient(clientId) {
    try {
      await this.api(`/api/clients/${clientId}`, { method: 'DELETE' });
      await this.loadAdminData();
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
              <span class="tech-pill orange">${inq.budget}</span>
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
          <div class="eyebrow"><span class="eyebrow-dot"></span> DECAP BRIDGE MARKDOWN STUDIO</div>
          <h3 style="font-size:21px;font-weight:900;margin-bottom:8px;">
            ${editing ? `Edit Article: ${editing.slug}.md` : 'Publish New Blog Article (.md)'}
          </h3>
          <p style="font-size:13px;color:var(--yole-text-muted);margin-bottom:18px;">
            Writes standard YAML-frontmatter Markdown files directly to <code>/content/blog/*.md</code>—100% compatible with Decap CMS &amp; Decap Bridge.
          </p>

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
            <h3 style="font-size:20px;font-weight:900;">Published Decap CMS Articles</h3>
            <a href="/admin/" target="_blank" class="btn btn-outline btn-sm">Launch /admin ↗</a>
          </div>
          <div style="display:flex;flex-direction:column;gap:12px;">
            ${this.blogPosts
              .map(
                (p) => `
              <div style="padding:14px;background:rgba(15,13,44,0.75);border:1px solid rgba(255,255,255,0.12);border-radius:12px;display:flex;justify-content:space-between;align-items:center;gap:12px;">
                <div>
                  <div style="font-weight:800;font-size:15px;">${p.title}</div>
                  <div style="font-size:12px;color:#C8E61E;">/content/blog/${p.slug}.md • ${p.date}</div>
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
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Organization</label>
                <input type="text" name="organization" class="form-control" value="${editing ? editing.organization : 'YOLETECH'}" />
              </div>
            </div>
            <div class="grid-2" style="gap:12px;">
              <div class="form-group">
                <label class="form-label">Period / Year</label>
                <input type="text" name="period" class="form-control" value="${editing ? editing.period : '2026'}" placeholder="e.g. 2024 – Present" />
              </div>
              <div class="form-group">
                <label class="form-label">Preview Image URL</label>
                <input type="text" name="preview_image" class="form-control" value="${editing ? editing.preview_image : '/assets/dashboard-preview.jpg'}" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Tech Stack (comma-separated)</label>
              <input type="text" name="tech_stack" class="form-control" value="${editing ? (editing.tech_stack || []).join(', ') : 'Python, SQL, Power BI, React.js'}" />
            </div>
            <div class="form-group">
              <label class="form-label">Measurable Impact Metric *</label>
              <input type="text" name="impact_metrics" required class="form-control" value="${editing ? editing.impact_metrics.replace(/"/g, '&quot;') : ''}" placeholder="e.g. Reduced reporting compilation time by 70%" />
            </div>
            <div class="form-group">
              <label class="form-label">Summary *</label>
              <textarea name="summary" rows="3" required class="form-control" placeholder="Project summary...">${editing ? editing.summary : ''}</textarea>
            </div>
            <div style="display:flex;gap:10px;">
              <button type="submit" class="btn btn-lime" style="flex:1;">
                ${editing ? 'Save Project Changes →' : 'Add Project to Portfolio →'}
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
          <h3 style="font-size:20px;font-weight:900;margin-bottom:14px;">Existing Portfolio Projects</h3>
          <div style="display:flex;flex-direction:column;gap:12px;">
            ${this.portfolio
              .map(
                (p) => `
              <div style="padding:14px;background:rgba(15,13,44,0.75);border:1px solid rgba(255,255,255,0.12);border-radius:12px;display:flex;justify-content:space-between;align-items:center;gap:12px;">
                <div>
                  <div style="font-weight:800;font-size:15px;">${p.title}</div>
                  <div style="font-size:12px;color:#C8E61E;">${p.category} • ${p.organization}</div>
                </div>
                <div style="display:flex;gap:6px;">
                  <button class="btn btn-outline btn-sm" onclick="window.app.startEditPortfolioProject(${p.id})">Edit</button>
                  <button class="btn btn-outline btn-sm" style="border-color:#ef4444;color:#ef4444;" onclick="window.app.deletePortfolioProject(${p.id})">Delete</button>
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

  startEditPortfolioProject(id) {
    const found = this.portfolio.find((p) => p.id === id);
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
      organization: form.organization.value,
      period: form.period?.value || '2026',
      preview_image: form.preview_image?.value || '/assets/dashboard-preview.jpg',
      tech_stack: form.tech_stack.value,
      impact_metrics: form.impact_metrics.value,
      summary: form.summary.value
    };
    try {
      if (this.editingPortfolioProject) {
        await this.api(`/api/portfolio/${this.editingPortfolioProject.id}`, {
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
        this.showToast('Portfolio project added!');
      }
      await this.loadPublicData();
      form.reset();
      this.render();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  async deletePortfolioProject(id) {
    try {
      await this.api(`/api/portfolio/${id}`, { method: 'DELETE' });
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
              <input type="text" name="author_name" required class="form-control" placeholder="e.g. Dr. Tarila Okoro" />
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

    const activeEl = document.activeElement;
    const preserveSearchFocus = activeEl && activeEl.id === 'admin-client-search';
    const selStart = preserveSearchFocus ? activeEl.selectionStart : null;
    const selEnd = preserveSearchFocus ? activeEl.selectionEnd : null;

    let pageContent = '';
    switch (this.currentPage) {
      case 'home':
        pageContent = this.renderHomePage();
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
      <main>${pageContent}</main>
      ${this.renderFooter()}
      <div id="toast-container"></div>
    `;
    this.renderToast();

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
