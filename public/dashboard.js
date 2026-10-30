// ============================================================================
// YOLETECH — ANALYTICS DASHBOARD MODULE
// Client, pipeline, rating & testimonial analytics built only from real
// application data (users, inquiries, testimonials). Charts are dependency-free
// SVG/HTML so the page stays fast and works offline.
// ============================================================================

(function () {
  if (typeof YoletechApp === 'undefined') return;

  // ---------------------------------------------------------------------------
  // Constants & small utilities
  // ---------------------------------------------------------------------------
  const STATUS_ORDER = ['LEAD', 'ONBOARDING', 'ACTIVE', 'COMPLETED'];
  const KPI_ICONS = {
    clients: '<circle cx="9" cy="8" r="3"/><path d="M3.5 19v-1.5a5.5 5.5 0 0 1 11 0V19z"/><path d="M16 5.2a3 3 0 0 1 0 5.6M17 14a5 5 0 0 1 3.5 4.8V19h-3"/>',
    active: '<circle cx="10" cy="8" r="3"/><path d="M4.5 19v-1.5a5.5 5.5 0 0 1 11 0V19z"/><path d="m16 11 2 2 4-4"/>',
    onboarding: '<circle cx="9" cy="8" r="3"/><path d="M3.5 19v-1.5a5.5 5.5 0 0 1 9.5-3.7"/><circle cx="17" cy="16" r="4"/><path d="M17 14v2l1.5 1"/>',
    leads: '<circle cx="9" cy="8" r="3"/><path d="M3.5 19v-1.5a5.5 5.5 0 0 1 9.5-3.7"/><path d="M18 11v6m-3-3h6"/>',
    completed: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 5V3h8v2m-9 5h4m-4 4 2 2 4-4"/>',
    completion: '<path d="M4 19V5m0 14h17"/><path d="m7 15 4-4 3 2 6-7"/><path d="M16 6h4v4"/>',
    testimonials: '<path d="M20 11.5a6.5 6.5 0 0 1-6.5 6.5H7l-4 3v-6.5a6.5 6.5 0 0 1 6.5-6.5h4A6.5 6.5 0 0 1 20 14.5z"/><path d="M9 8V6.5A3.5 3.5 0 0 1 12.5 3h4A3.5 3.5 0 0 1 20 6.5V9"/>',
    rating: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/>',
    ratedClients: '<circle cx="9" cy="8" r="3"/><path d="M3.5 19v-1.5a5.5 5.5 0 0 1 9.5-3.7"/><circle cx="17" cy="16" r="4"/><path d="m15.5 16 1 1 2-2"/>',
    conversion: '<path d="M4 7h15m0 0-4-4m4 4-4 4"/><path d="M20 17H5m0 0 4 4m-4-4 4-4"/>'
  };
  const STATUS_META = {
    LEAD: { label: 'Lead', color: '#8B85FF' },
    ONBOARDING: { label: 'Onboarding', color: '#F7941D' },
    ACTIVE: { label: 'Active', color: '#C8E61E' },
    COMPLETED: { label: 'Completed', color: '#38BDF8' },
    OTHER: { label: 'Unspecified', color: '#94A3B8' }
  };
  const SERIES_COLORS = { clients: '#C8E61E', inquiries: '#F7941D', testimonials: '#38BDF8', cumulative: '#FFFFFF' };
  const PAGE_SIZE = 8;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const isLight = () => typeof document !== 'undefined' && document.documentElement && document.documentElement.getAttribute('data-theme') === 'light';

  const esc = (v) =>
    String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const toDate = (raw) => {
    if (!raw) return null;
    const s = String(raw).trim();
    const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(s) ? `${s.replace(' ', 'T')}Z` : s;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const monthKey = (d) => d.toISOString().slice(0, 7);
  const monthLabel = (key) =>
    new Date(`${key}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
  const fmtDate = (d) =>
    d ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—';
  const pct = (num, den) => (den > 0 ? (num / den) * 100 : null);
  const fmtPct = (v, digits = 1) => (v === null || v === undefined ? 'N/A' : `${v.toFixed(digits)}%`);
  const avg = (arr) => (arr.length ? arr.reduce((s, n) => s + n, 0) / arr.length : null);
  const normStatus = (s) => {
    const up = String(s || '').trim().toUpperCase();
    return STATUS_ORDER.includes(up) ? up : 'OTHER';
  };
  const stars = (r) => {
    if (r === null || r === undefined) return '<span class="dash-muted">Not rated</span>';
    const full = Math.round(r);
    return `<span class="dash-stars" aria-label="${r.toFixed(1)} out of 5 stars">${'★'.repeat(full)}<span class="dash-stars-empty">${'★'.repeat(
      Math.max(0, 5 - full)
    )}</span></span> <span class="dash-muted">${r.toFixed(1)}</span>`;
  };

  const niceTicks = (max) => {
    if (max <= 0) return { top: 1, step: 1 };
    if (max <= 5) return { top: Math.max(1, Math.ceil(max)), step: 1 };
    const rawStep = max / 4;
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= rawStep) || 10 * mag;
    return { top: Math.ceil(max / step) * step, step };
  };

  // ---------------------------------------------------------------------------
  // SVG / HTML chart primitives
  // ---------------------------------------------------------------------------
  const Charts = {
    empty(msg = 'No data for the selected filters.') {
      return `<div class="dash-empty" role="status">${esc(msg)}</div>`;
    },

    donut(segments, centerLabel) {
      const total = segments.reduce((s, x) => s + x.value, 0);
      if (!total) return Charts.empty();
      const r = 70;
      const C = 2 * Math.PI * r;
      let offset = 0;
      const arcs = segments
        .filter((s) => s.value > 0)
        .map((s) => {
          const len = (s.value / total) * C;
          const share = ((s.value / total) * 100).toFixed(1);
          const arc = `<circle cx="100" cy="100" r="${r}" fill="none" stroke="${s.color}" stroke-width="26"
            stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-offset}" transform="rotate(-90 100 100)"
            class="dash-hit" tabindex="0" data-tip="${esc(`${s.label}: ${s.value} (${share}%)`)}">
            <title>${esc(`${s.label}: ${s.value} (${share}%)`)}</title></circle>`;
          offset += len;
          return arc;
        })
        .join('');
      const summary = segments.map((s) => `${s.label} ${s.value}`).join(', ');
      return `<svg viewBox="0 0 200 200" class="dash-donut" role="img" aria-label="${esc(`${centerLabel}: ${total}. ${summary}`)}">
          <circle cx="100" cy="100" r="${r}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="26"></circle>
          ${arcs}
          <text x="100" y="96" text-anchor="middle" class="dash-donut-value">${total}</text>
          <text x="100" y="118" text-anchor="middle" class="dash-donut-label">${esc(centerLabel)}</text>
        </svg>`;
    },

    // Vertical bars. items: [{label, value, color, tip}]
    bars(items, { xTitle = '', yTitle = '', ariaLabel = '' } = {}) {
      const max = Math.max(0, ...items.map((i) => i.value));
      if (!items.length || max === 0) return Charts.empty();
      const W = 520, H = 260, L = 44, R = 12, T = 14, B = 46;
      const pw = W - L - R, ph = H - T - B;
      const { top, step } = niceTicks(max);
      const slot = pw / items.length;
      const bw = Math.min(56, slot * 0.6);
      let grid = '';
      for (let v = 0; v <= top + 1e-9; v += step) {
        const y = T + ph - (v / top) * ph;
        grid += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" class="dash-gridline"></line>
          <text x="${L - 8}" y="${y + 4}" text-anchor="end" class="dash-axis-text">${+v.toFixed(2)}</text>`;
      }
      const bars = items
        .map((it, i) => {
          const h = (it.value / top) * ph;
          const x = L + slot * i + (slot - bw) / 2;
          const y = T + ph - h;
          const tip = it.tip || `${it.label}: ${it.value}`;
          return `<rect x="${x}" y="${y}" width="${bw}" height="${Math.max(h, 0)}" rx="5" fill="${it.color}" class="dash-hit" tabindex="0" data-tip="${esc(tip)}"><title>${esc(tip)}</title></rect>
            ${it.value > 0 ? `<text x="${x + bw / 2}" y="${y - 5}" text-anchor="middle" class="dash-bar-value">${it.value}</text>` : ''}
            <text x="${L + slot * i + slot / 2}" y="${T + ph + 18}" text-anchor="middle" class="dash-axis-text">${esc(it.label)}</text>`;
        })
        .join('');
      return `<svg viewBox="0 0 ${W} ${H}" class="dash-svg" role="img" aria-label="${esc(ariaLabel)}">
          ${grid}${bars}
          <text x="${L + pw / 2}" y="${H - 6}" text-anchor="middle" class="dash-axis-title">${esc(xTitle)}</text>
          <text transform="translate(12 ${T + ph / 2}) rotate(-90)" text-anchor="middle" class="dash-axis-title">${esc(yTitle)}</text>
        </svg>`;
    },

    // Monthly stacked bars + optional cumulative line (secondary axis)
    stackedMonthly(months, stacks, cumulative, { ariaLabel = '' } = {}) {
      const totals = months.map((_, i) => stacks.reduce((s, st) => s + st.values[i], 0));
      const max = Math.max(0, ...totals);
      if (!months.length || max === 0) return Charts.empty();
      const W = 620, H = 280, L = 44, R = 46, T = 16, B = 50;
      const pw = W - L - R, ph = H - T - B;
      const { top, step } = niceTicks(max);
      const cumMax = cumulative ? Math.max(1, ...cumulative) : 1;
      const cumTicks = niceTicks(cumMax);
      const slot = pw / months.length;
      const bw = Math.min(40, slot * 0.62);
      const labelEvery = Math.ceil(months.length / 12);
      let grid = '';
      for (let v = 0; v <= top + 1e-9; v += step) {
        const y = T + ph - (v / top) * ph;
        grid += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" class="dash-gridline"></line>
          <text x="${L - 8}" y="${y + 4}" text-anchor="end" class="dash-axis-text">${v}</text>`;
      }
      if (cumulative) {
        for (let v = 0; v <= cumTicks.top + 1e-9; v += cumTicks.step) {
          const y = T + ph - (v / cumTicks.top) * ph;
          grid += `<text x="${W - R + 8}" y="${y + 4}" class="dash-axis-text">${v}</text>`;
        }
      }
      let bars = '';
      months.forEach((m, i) => {
        let yCursor = T + ph;
        const x = L + slot * i + (slot - bw) / 2;
        stacks.forEach((st) => {
          const v = st.values[i];
          if (!v) return;
          const h = (v / top) * ph;
          yCursor -= h;
          const tip = `${monthLabel(m)} · ${st.label}: ${v}`;
          bars += `<rect x="${x}" y="${yCursor}" width="${bw}" height="${h}" fill="${st.color}" class="dash-hit" tabindex="0" data-tip="${esc(tip)}"><title>${esc(tip)}</title></rect>`;
        });
        if (i % labelEvery === 0) {
          bars += `<text x="${L + slot * i + slot / 2}" y="${T + ph + 18}" text-anchor="middle" class="dash-axis-text">${monthLabel(m)}</text>`;
        }
      });
      let line = '';
      if (cumulative) {
        const pts = cumulative.map((v, i) => [L + slot * i + slot / 2, T + ph - (v / cumTicks.top) * ph]);
        line = `<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${isLight() ? '#1E1B54' : '#FFFFFF'}" stroke-width="2" stroke-dasharray="5 4"></polyline>
          ${pts
            .map((p, i) => {
              const tip = `${monthLabel(months[i])} · Cumulative clients: ${cumulative[i]}`;
              return `<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="${isLight() ? '#1E1B54' : '#FFFFFF'}" class="dash-hit" tabindex="0" data-tip="${esc(tip)}"><title>${esc(tip)}</title></circle>`;
            })
            .join('')}`;
      }
      return `<svg viewBox="0 0 ${W} ${H}" class="dash-svg" role="img" aria-label="${esc(ariaLabel)}">
          ${grid}${bars}${line}
          <text x="${L + pw / 2}" y="${H - 6}" text-anchor="middle" class="dash-axis-title">Signup month</text>
          <text transform="translate(12 ${T + ph / 2}) rotate(-90)" text-anchor="middle" class="dash-axis-title">New clients</text>
          ${cumulative ? `<text transform="translate(${W - 6} ${T + ph / 2}) rotate(90)" text-anchor="middle" class="dash-axis-title">Cumulative</text>` : ''}
        </svg>`;
    },

    lines(months, series, { yTitle = '', ariaLabel = '' } = {}) {
      const max = Math.max(0, ...series.flatMap((s) => s.values));
      if (!months.length || max === 0) return Charts.empty();
      const W = 620, H = 260, L = 44, R = 16, T = 16, B = 50;
      const pw = W - L - R, ph = H - T - B;
      const { top, step } = niceTicks(max);
      const slot = months.length > 1 ? pw / (months.length - 1) : 0;
      const xAt = (i) => (months.length > 1 ? L + slot * i : L + pw / 2);
      const labelEvery = Math.ceil(months.length / 12);
      let grid = '';
      for (let v = 0; v <= top + 1e-9; v += step) {
        const y = T + ph - (v / top) * ph;
        grid += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" class="dash-gridline"></line>
          <text x="${L - 8}" y="${y + 4}" text-anchor="end" class="dash-axis-text">${v}</text>`;
      }
      const xLabels = months
        .map((m, i) =>
          i % labelEvery === 0 ? `<text x="${xAt(i)}" y="${T + ph + 18}" text-anchor="middle" class="dash-axis-text">${monthLabel(m)}</text>` : ''
        )
        .join('');
      const paths = series
        .map((s) => {
          const pts = s.values.map((v, i) => [xAt(i), T + ph - (v / top) * ph]);
          return `<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round"></polyline>
            ${pts
              .map((p, i) => {
                const tip = `${monthLabel(months[i])} · ${s.label}: ${s.values[i]}`;
                return `<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="${s.color}" class="dash-hit" tabindex="0" data-tip="${esc(tip)}"><title>${esc(tip)}</title></circle>`;
              })
              .join('')}`;
        })
        .join('');
      return `<svg viewBox="0 0 ${W} ${H}" class="dash-svg" role="img" aria-label="${esc(ariaLabel)}">
          ${grid}${xLabels}${paths}
          <text x="${L + pw / 2}" y="${H - 6}" text-anchor="middle" class="dash-axis-title">Month</text>
          <text transform="translate(12 ${T + ph / 2}) rotate(-90)" text-anchor="middle" class="dash-axis-title">${esc(yTitle)}</text>
        </svg>`;
    },

    // Horizontal HTML bars: items [{label, value, color, note}]
    hbars(items, total) {
      if (!items.length || !items.some((i) => i.value > 0)) return Charts.empty();
      const max = Math.max(...items.map((i) => i.value));
      return `<ul class="dash-hbars">${items
        .map((it) => {
          const share = total ? ` · ${((it.value / total) * 100).toFixed(1)}%` : '';
          return `<li>
            <div class="dash-hbar-head"><span>${esc(it.label)}</span><strong>${it.value}${share}</strong></div>
            <div class="dash-hbar-track"><div class="dash-hbar-fill" style="width:${max ? (it.value / max) * 100 : 0}%;background:${it.color || '#C8E61E'};"></div></div>
            ${it.note ? `<div class="dash-hbar-note">${esc(it.note)}</div>` : ''}
          </li>`;
        })
        .join('')}</ul>`;
    },

    legend(items) {
      return `<ul class="dash-legend">${items
        .map((i) => `<li><span class="dash-swatch" style="background:${i.color};${i.dashed ? 'border:1px dashed #fff;background:transparent;' : ''}"></span>${esc(i.label)}</li>`)
        .join('')}</ul>`;
    }
  };

  // ---------------------------------------------------------------------------
  // Dashboard methods mixed into the main application controller
  // ---------------------------------------------------------------------------
  Object.assign(YoletechApp.prototype, {
    getDashboardState() {
      if (!this.dash) {
        this.dash = {
          raw: null,
          loading: false,
          error: null,
          filters: { from: '', to: '', status: 'ALL', service: 'ALL', rating: 'ALL' },
          table: { search: '', sortKey: 'created', sortDir: 'desc', page: 1 }
        };
      }
      return this.dash;
    },

    // ---- Data loading -------------------------------------------------------
    async loadDashboardData(force = false) {
      const st = this.getDashboardState();
      if (st.loading || (st.raw && !force)) return;
      st.loading = true;
      st.error = null;
      this.updateDashboardBody();
      try {
        const data = await this.api('/api/analytics');
        st.raw = this.normaliseDashboardRaw(data, 'live');
      } catch (err) {
        console.warn('Analytics API unavailable, using cached application data:', err.message);
        const fallback = this.buildDashboardFallback();
        if (fallback.clients.length || fallback.testimonials.length) {
          st.raw = fallback;
        } else {
          st.error = 'Analytics data could not be loaded. Please check your connection and try again.';
        }
      } finally {
        st.loading = false;
        if (this.currentPage === 'dashboard') this.updateDashboardBody();
      }
    },

    normaliseDashboardRaw(data, source) {
      const seenC = new Set();
      const clients = (data.clients || [])
        .filter((c) => c && c.id !== undefined && !seenC.has(c.id) && seenC.add(c.id))
        .map((c) => ({
          id: c.id,
          label: c.name || c.label || `Client #${String(c.id).padStart(3, '0')}`,
          name: c.name || c.label || `Client #${String(c.id).padStart(3, '0')}`,
          company: c.company || '',
          service: c.service_interest || c.service || 'Unspecified',
          status: normStatus(c.status),
          created: toDate(c.created_at || c.created)
        }));
      const seenI = new Set();
      const inquiries = (data.inquiries || [])
        .filter((i) => i && !seenI.has(i.id) && seenI.add(i.id))
        .map((i) => ({
          id: i.id,
          clientId: i.client_id ?? i.clientId ?? null,
          contactKey: i.contact_key ?? i.contactKey ?? `i${i.id}`,
          service: i.service_category || i.service || 'Unspecified',
          status: String(i.status || 'NEW').toUpperCase(),
          progress: Number.isFinite(Number(i.project_progress ?? i.progress)) ? Number(i.project_progress ?? i.progress) : null,
          created: toDate(i.created_at || i.created)
        }));
      const seenT = new Set();
      const testimonials = (data.testimonials || [])
        .filter((t) => t && !seenT.has(t.id) && seenT.add(t.id))
        .map((t) => {
          const r = Number(t.rating);
          return {
            id: t.id,
            clientId: t.client_id ?? t.clientId ?? null,
            author: t.author_name || t.author || 'Anonymous',
            role: t.author_role || t.role || '',
            company: t.company || '',
            service: t.service_track || t.service || 'Unspecified',
            rating: Number.isFinite(r) && r >= 1 && r <= 5 ? r : null,
            content: t.content || '',
            created: toDate(t.created_at || t.created)
          };
        });
      return {
        source,
        anonymised: data.anonymised === true,
        generatedAt: toDate(data.generated_at) || new Date(),
        clients,
        inquiries,
        testimonials
      };
    },

    // Offline fallback: uses data already held by the app (admin cache, local storage, or seeded backend records)
    
    generateSyntheticFallbackDataset() {
      const firstNames = [
        'Preye', 'Amaka', 'Marcus', 'Ebiowei', 'Sarah', 'Babatunde', 'Chiamaka',
        'Olumide', 'Ngozi', 'Tunde', 'Fatima', 'Emeka', 'Zainab', 'Damilola', 'Kemi',
        'David', 'Priya', 'Alexander', 'Elena', 'Chloe', 'Michael', 'Liam', 'Sofia',
        'James', 'Lucas', 'Tari', 'Folake', 'Ibrahim', 'Grace', 'Chidi', 'Blessing',
        'Oluwaseun', 'Aisha', 'Victor', 'Chinonso', 'Daniel', 'Esther', 'Samuel', 'Joy',
        'Emma', 'Noah', 'Olivia', 'Ethan', 'Ava', 'Mason', 'Isabella', 'William',
        'Sophia', 'Benjamin', 'Mia', 'Lucas', 'Charlotte', 'Henry', 'Amelia', 'Sebastian'
      ];
      const lastNames = [
        'Alagoa', 'Nwosu', 'Vance', 'Dickson', 'Adeleke', 'Okonkwo', 'Bakare', 'Eze',
        'Olatunji', 'Bello', 'Nnamdi', 'Aliyu', 'Adeyemi', 'Balogun', 'Jenkins', 'Mueller',
        'Sharma', 'Wright', 'Rostova', 'Dupont', 'Chen', 'O\'Connor', 'Rodriguez', 'Kensington',
        'Silva', 'Boma', 'Oghenekaro', 'Danladi', 'Umar', 'Ezekiel', 'Obi', 'Okafor',
        'Adeboye', 'Suleiman', 'Okoro', 'Oluwole', 'Agabi', 'Williams', 'Brown', 'Davis',
        'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White'
      ];
      const companies = [
        'Global EduMetrix', 'SulPhil Analytics Cohort', 'Prime Logistics & Supply Ltd',
        'Bayelsa Tech Ventures', 'Horizon Data Solutions', 'Apex Financial Group',
        'Crestline Analytics', 'Metrix BioLabs', 'Zenith Oil & Energy', 'Sterling Retail Group',
        'Pulse Health Systems', 'Beacon Cloud Labs', 'Delta Capital Partners', 'NexaTech Solutions',
        'Velocity Logistics', 'Vanguard Microfinance', 'Krypton Media Network', 'OmniScope Insights',
        'BioMetric Health', 'Summit AgroTech', 'Strata Advisory Services', 'Urban Grid Infrastructure',
        'Pinnacle Merchant Bank', 'SilverLine Maritime', 'Aura Retail Global', 'NextGen Academy'
      ];
      const serviceTracks = [
        'Data Analytics & BI',
        'Full-Stack Web Development',
        'AI & Workflow Automation',
        'Tech Tutorials & Mentorship',
        'IT & Database Support'
      ];
      const serviceWeights = [0.38, 0.26, 0.18, 0.12, 0.06];
      const pickService = (idx) => {
        const r = ((idx + 1) * 0.137) % 1;
        let acc = 0;
        for (let i = 0; i < serviceTracks.length; i++) {
          acc += serviceWeights[i];
          if (r <= acc) return serviceTracks[i];
        }
        return serviceTracks[0];
      };
      const pickStatus = (idx) => {
        const r = ((idx + 1) * 0.293) % 1;
        if (r < 0.38) return 'ACTIVE';
        if (r < 0.68) return 'COMPLETED';
        if (r < 0.86) return 'ONBOARDING';
        return 'LEAD';
      };
      const pickDate = (idx) => {
        const start = new Date(2025, 8, 1).getTime();
        const end = new Date(2026, 9, 28).getTime();
        const factor = Math.pow((idx + 1) / 1000, 0.75);
        const t = start + factor * (end - start);
        return new Date(t).toISOString().replace('T', ' ').slice(0, 19);
      };
      const pickRating = (idx) => {
        const r = ((idx + 1) * 0.419) % 1;
        if (r < 0.68) return 5;
        if (r < 0.90) return 4;
        if (r < 0.96) return 3;
        if (r < 0.985) return 2;
        return 1;
      };
      const positiveReviews = [
        'Exceptional Power BI reporting suite and automated data workflows. Transformed executive decision-making speed.',
        'John delivered a robust full-stack dashboard with automated SQL ingestion that eliminated 20 hours of manual work weekly.',
        'Outstanding training in Python and data analytics. Our analysts are now building custom predictive dashboards with ease.',
        'The predictive student metrics and automated Excel VBA models exceeded our expectations. Strict data validation and high speed.',
        'Delivered an intuitive, responsive executive portal and seamless SQLite API integration on tight deadlines.',
        'Highly skilled in business intelligence, database administration, and workflow automation. Highly recommended partner.',
        'Superb execution on our supply chain KPI reporting. Real-time accuracy and crystal-clear visual hierarchy.',
        'Great collaboration, dependable communication, and top-tier technical delivery on our departmental analytics.'
      ];
      const mixedReviews = [
        'Solid dashboard architecture and good SQL performance. Initial setup needed a minor tweak but was quickly resolved.',
        'Great reporting features and reliable data pipelines. Would love more advanced charting options in the next sprint.',
        'Delivered the automated Excel sheets and training as promised. Very responsive during project handoff.'
      ];
      const criticalReviews = [
        'The dashboard met the core requirements though deployment took a few extra days due to internal security checks.',
        'Good data modeling but required extra documentation for our junior IT team to maintain independently.'
      ];
      const pickReview = (rating, idx) => {
        if (rating >= 4) return positiveReviews[idx % positiveReviews.length];
        if (rating === 3) return mixedReviews[idx % mixedReviews.length];
        return criticalReviews[idx % criticalReviews.length];
      };

      const clients = [];
      for (let i = 0; i < 1000; i++) {
        const fn = firstNames[i % firstNames.length];
        const ln = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
        const name = `${fn} ${ln}`;
        const email = `client_${i + 1}@${companies[i % companies.length].toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
        const company = companies[i % companies.length];
        const service = pickService(i);
        const status = pickStatus(i);
        const created = pickDate(i);
        clients.push({
          id: i + 3,
          name,
          label: name,
          email,
          company,
          service_interest: service,
          status,
          role: 'CLIENT',
          created_at: created
        });
      }

      const inquiries = [];
      const inqStatuses = ['NEW', 'IN_PROGRESS', 'COMPLETED'];
      for (let i = 0; i < 680; i++) {
        const client = clients[i % clients.length];
        const status = inqStatuses[i % 3];
        const progress = status === 'COMPLETED' ? 100 : status === 'IN_PROGRESS' ? (30 + (i % 6) * 10) : (10 + (i % 3) * 5);
        const created = pickDate(Math.min(999, Math.floor(i * 1.47)));
        inquiries.push({
          id: i + 1,
          client_id: client ? client.id : null,
          contact_key: client ? client.email : `inq-${i + 1}`,
          service_category: client ? client.service_interest : 'Data Analytics & BI',
          status,
          project_progress: progress,
          created_at: created
        });
      }

      const testimonials = [];
      for (let i = 0; i < 420; i++) {
        const client = clients[i % clients.length];
        const rating = pickRating(i);
        const content = pickReview(rating, i);
        const created = pickDate(Math.min(999, 100 + Math.floor(i * 2.1)));
        testimonials.push({
          id: i + 1,
          client_id: client ? client.id : null,
          author_name: client ? client.name : `Verified Client ${i + 1}`,
          author_role: i % 4 === 0 ? 'Managing Director' : i % 4 === 1 ? 'Head of Business Analytics' : i % 4 === 2 ? 'Operations Supervisor' : 'Project Sponsor',
          company: client ? client.company : 'Client Partner Organization',
          service_track: client ? client.service_interest : 'Data Analytics & BI',
          rating,
          content,
          approved: 1,
          created_at: created
        });
      }

      return { clients, inquiries, testimonials };
    },

    buildDashboardFallback() {
      const norm = (v) => String(v || '').trim().toLowerCase().replace(/\s+/g, ' ');
      const synthetic = this.generateSyntheticFallbackDataset();
      const seedClients = synthetic.clients;
      const localUsers = this.getLocalRegisteredUsers().filter((c) => String(c.role || 'CLIENT').toUpperCase() === 'CLIENT');
      const baseClients = (this.clients && this.clients.length)
        ? this.clients.filter((c) => String(c.role || 'CLIENT').toUpperCase() === 'CLIENT')
        : seedClients;
      const mergedClients = [...baseClients];
      localUsers.forEach((lu) => {
        if (!mergedClients.some((c) => String(c.email || c.name).toLowerCase() === String(lu.email || lu.name).toLowerCase())) {
          mergedClients.unshift(lu);
        }
      });

      const seedInquiries = synthetic.inquiries;
      const localInq = this.getLocalInquiries();
      const baseInquiries = (this.inquiries && this.inquiries.length) ? this.inquiries : seedInquiries;
      const mergedInquiries = [...baseInquiries];
      localInq.forEach((li) => {
        if (!mergedInquiries.some((i) => i.id === li.id || (i.email && i.email === li.email && i.message === li.message))) {
          mergedInquiries.unshift(li);
        }
      });

      const byEmail = new Map(mergedClients.map((c) => [String(c.email || '').toLowerCase(), c.id]));
      const byName = new Map(mergedClients.map((c) => [norm(c.name), c.id]));
      const keys = new Map();
      const inquiries = mergedInquiries.map((i, idx) => {
        const email = String(i.email || '').toLowerCase();
        if (email && !keys.has(email)) keys.set(email, keys.size + 1);
        const contactKey = email ? keys.get(email) : i.contact_key || i.contactKey || `inq-${idx}`;
        return {
          ...i,
          id: i.id ?? `local-${idx}`,
          clientId: i.client_id ?? i.clientId ?? (email ? byEmail.get(email) : null),
          contactKey
        };
      });

      return this.normaliseDashboardRaw(
        {
          anonymised: false,
          clients: mergedClients.map((c, idx) => ({
            ...c,
            id: c.id ?? `local-${idx}`,
            label: c.name || `Client #${String(c.id ?? idx + 1).padStart(3, '0')}`,
            name: c.name || '',
            company: c.company || ''
          })),
          inquiries,
          testimonials: (this.testimonials && this.testimonials.length ? this.testimonials : synthetic.testimonials).map((t) => ({
            ...t,
            client_id: byName.get(norm(t.author_name)) || null
          }))
        },
        'cache'
      );
    },

    // ---- Filtering & metric computation ------------------------------------
    applyDashboardFilters() {
      const st = this.getDashboardState();
      const raw = st.raw;
      const f = st.filters;
      const from = f.from ? new Date(`${f.from}T00:00:00Z`) : null;
      const to = f.to ? new Date(`${f.to}T23:59:59Z`) : null;
      const inRange = (d) => (!from && !to) || (d && (!from || d >= from) && (!to || d <= to));

      // Client rating = mean of ratings on testimonials matched to that client (all time)
      const ratingByClient = new Map();
      raw.testimonials.forEach((t) => {
        if (t.clientId === null || t.rating === null) return;
        const arr = ratingByClient.get(t.clientId) || [];
        arr.push(t.rating);
        ratingByClient.set(t.clientId, arr);
      });
      const testimonialClientIds = new Set(raw.testimonials.filter((t) => t.clientId !== null).map((t) => t.clientId));
      const inquiriesByClient = new Map();
      raw.inquiries.forEach((i) => {
        if (i.clientId === null) return;
        const arr = inquiriesByClient.get(i.clientId) || [];
        arr.push(i);
        inquiriesByClient.set(i.clientId, arr);
      });

      const ratingPass = (r) => {
        switch (f.rating) {
          case 'RATED': return r !== null;
          case 'UNRATED': return r === null;
          case '5': return r !== null && r >= 5;
          case '4': return r !== null && r >= 4;
          case '3': return r !== null && r >= 3;
          case 'LT3': return r !== null && r < 3;
          default: return true;
        }
      };

      const clientsAll = raw.clients.map((c) => {
        const ratings = ratingByClient.get(c.id) || [];
        const inq = (inquiriesByClient.get(c.id) || []).slice().sort((a, b) => (b.created?.getTime() || 0) - (a.created?.getTime() || 0));
        return {
          ...c,
          rating: ratings.length ? avg(ratings) : null,
          hasTestimonial: testimonialClientIds.has(c.id),
          inquiryCount: inq.length,
          latestInquiry: inq[0] || null
        };
      });

      const clients = clientsAll.filter(
        (c) =>
          inRange(c.created) &&
          (f.status === 'ALL' || c.status === f.status) &&
          (f.service === 'ALL' || c.service === f.service) &&
          ratingPass(c.rating)
      );
      const clientIds = new Set(clients.map((c) => c.id));

      const clientScoped = f.status !== 'ALL' || f.rating !== 'ALL';
      const inquiries = raw.inquiries.filter((i) => {
        if (!inRange(i.created)) return false;
        const linked = i.clientId !== null && clientIds.has(i.clientId);
        if (f.service !== 'ALL' && i.service !== f.service && !linked) return false;
        if (clientScoped && !linked) return false;
        return true;
      });

      const testimonials = raw.testimonials.filter((t) => {
        if (!inRange(t.created)) return false;
        if (f.rating !== 'ALL' && !ratingPass(t.rating)) return false;
        if (f.service !== 'ALL' && t.service !== f.service && !(t.clientId !== null && clientIds.has(t.clientId))) return false;
        if (f.status !== 'ALL' && !(t.clientId !== null && clientIds.has(t.clientId))) return false;
        return true;
      });

      return { clients, clientsAll, inquiries, testimonials, from, to };
    },

    computeDashboardMetrics(view) {
      const { clients, inquiries, testimonials } = view;
      const counts = { LEAD: 0, ONBOARDING: 0, ACTIVE: 0, COMPLETED: 0, OTHER: 0 };
      clients.forEach((c) => (counts[c.status] += 1));
      const total = clients.length;
      const engaged = counts.ONBOARDING + counts.ACTIVE + counts.COMPLETED;

      // Ratings (from testimonials in view)
      const ratings = testimonials.map((t) => t.rating).filter((r) => r !== null);
      const ratingDist = [5, 4, 3, 2, 1].map((s) => ({ star: s, count: ratings.filter((r) => Math.round(r) === s).length }));
      const ratedClients = clients.filter((c) => c.rating !== null);
      const completed = clients.filter((c) => c.status === 'COMPLETED');
      const completedRated = completed.filter((c) => c.rating !== null);
      const completedWithTestimonial = completed.filter((c) => c.hasTestimonial);

      // Inquiry → registered client conversion (unique contacts)
      const contacts = new Map();
      inquiries.forEach((i) => {
        const prev = contacts.get(i.contactKey);
        contacts.set(i.contactKey, prev || i.clientId !== null);
      });
      const uniqueContacts = contacts.size;
      const convertedContacts = [...contacts.values()].filter(Boolean).length;

      // Period comparison: selected range vs. previous equal-length range, else last 30d vs prior 30d
      const now = new Date();
      const end = view.to || now;
      const start = view.from || new Date(end.getTime() - 30 * DAY_MS);
      const span = Math.max(DAY_MS, end.getTime() - start.getTime());
      const prevStart = new Date(start.getTime() - span);
      const between = (d, a, b) => d && d >= a && d <= b;
      const allClientsForPeriod = view.clientsAll.filter(
        (c) =>
          (this.dash.filters.status === 'ALL' || c.status === this.dash.filters.status) &&
          (this.dash.filters.service === 'ALL' || c.service === this.dash.filters.service)
      );
      const currNew = allClientsForPeriod.filter((c) => between(c.created, start, end)).length;
      const prevNew = allClientsForPeriod.filter((c) => between(c.created, prevStart, start)).length;
      const periodLabel = view.from || view.to ? 'selected period' : 'last 30 days';

      // Monthly series
      const dates = [
        ...clients.map((c) => c.created),
        ...inquiries.map((i) => i.created),
        ...testimonials.map((t) => t.created)
      ].filter(Boolean);
      let months = [];
      if (dates.length) {
        const minD = view.from || new Date(Math.min(...dates.map((d) => d.getTime())));
        const maxD = view.to || new Date(Math.max(now.getTime(), ...dates.map((d) => d.getTime())));
        const cur = new Date(Date.UTC(minD.getUTCFullYear(), minD.getUTCMonth(), 1));
        const last = monthKey(maxD);
        while (monthKey(cur) <= last && months.length < 60) {
          months.push(monthKey(cur));
          cur.setUTCMonth(cur.getUTCMonth() + 1);
        }
        if (months.length > 24) months = months.slice(-24);
      }
      const bucket = (items) => months.map((m) => items.filter((x) => x.created && monthKey(x.created) === m).length);
      const stacks = STATUS_ORDER.concat('OTHER')
        .map((s) => ({ key: s, label: STATUS_META[s].label, color: STATUS_META[s].color, values: bucket(clients.filter((c) => c.status === s)) }))
        .filter((s) => s.values.some((v) => v > 0));
      const newPerMonth = bucket(clients);
      const firstMonth = months[0];
      let running = firstMonth ? clients.filter((c) => c.created && monthKey(c.created) < firstMonth).length : 0;
      const cumulative = newPerMonth.map((n) => (running += n));
      const inquiriesPerMonth = bucket(inquiries);
      const testimonialsPerMonth = bucket(testimonials);

      const trendOf = (series) => {
        if (series.length < 2) return { label: 'Insufficient history', dir: 0 };
        const k = Math.min(3, Math.floor(series.length / 2));
        const recent = series.slice(-k).reduce((a, b) => a + b, 0) / k;
        const prior = series.slice(-2 * k, -k).reduce((a, b) => a + b, 0) / k;
        if (recent === 0 && prior === 0) return { label: 'No activity', dir: 0 };
        const change = prior === 0 ? null : ((recent - prior) / prior) * 100;
        if (change !== null && Math.abs(change) < 10) return { label: 'Stable', dir: 0, change, k };
        return { label: recent > prior ? 'Increasing' : 'Decreasing', dir: recent > prior ? 1 : -1, change, k };
      };

      // Most active month (clients + inquiries + testimonials)
      const activity = months.map((m, i) => ({ m, v: newPerMonth[i] + inquiriesPerMonth[i] + testimonialsPerMonth[i] }));
      const peak = activity.reduce((best, a) => (a.v > (best?.v ?? -1) ? a : best), null);

      // Service demand
      const serviceCounts = {};
      clients.forEach((c) => (serviceCounts[c.service] = (serviceCounts[c.service] || 0) + 1));
      const services = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1]);
      const inquiryServiceCounts = {};
      inquiries.forEach((i) => (inquiryServiceCounts[i.service] = (inquiryServiceCounts[i.service] || 0) + 1));

      // Inquiry pipeline
      const inquiryStatus = {};
      inquiries.forEach((i) => (inquiryStatus[i.status] = (inquiryStatus[i.status] || 0) + 1));
      const progressVals = inquiries.map((i) => i.progress).filter((p) => p !== null);

      // Funnel (inferred from current status — a client in a later stage has passed earlier stages)
      const reached = [
        { key: 'LEAD', label: 'Lead', value: counts.LEAD + engaged },
        { key: 'ONBOARDING', label: 'Onboarding', value: engaged },
        { key: 'ACTIVE', label: 'Active', value: counts.ACTIVE + counts.COMPLETED },
        { key: 'COMPLETED', label: 'Completed', value: counts.COMPLETED }
      ];

      return {
        total,
        counts,
        engaged,
        completionRate: pct(counts.COMPLETED, engaged),
        ratings,
        avgRating: avg(ratings),
        maxRating: ratings.length ? Math.max(...ratings) : null,
        minRating: ratings.length ? Math.min(...ratings) : null,
        ratingDist,
        ratedClients: ratedClients.length,
        completedCount: completed.length,
        completedRatedPct: pct(completedRated.length, completed.length),
        completedTestimonialPct: pct(completedWithTestimonial.length, completed.length),
        testimonialCount: testimonials.length,
        testimonialsLinked: testimonials.filter((t) => t.clientId !== null).length,
        uniqueContacts,
        convertedContacts,
        conversionRate: pct(convertedContacts, uniqueContacts),
        inquiryCount: inquiries.length,
        currNew,
        prevNew,
        periodLabel,
        months,
        stacks,
        cumulative,
        newPerMonth,
        inquiriesPerMonth,
        testimonialsPerMonth,
        clientTrend: trendOf(newPerMonth),
        inquiryTrend: trendOf(inquiriesPerMonth),
        peak: peak && peak.v > 0 ? peak : null,
        services,
        inquiryServiceCounts,
        inquiryStatus,
        avgProgress: avg(progressVals),
        reached
      };
    },

    // ---- Rendering ------------------------------------------------------------
    renderDashboardPage() {
      return `
        <section class="section dash-page" aria-labelledby="dash-title">
          <div class="container">
            <header class="dash-header">
              <div>
                <div class="eyebrow"><span class="eyebrow-dot"></span> BUSINESS INTELLIGENCE</div>
                <h1 id="dash-title" class="section-title" style="margin-bottom:8px;">Client &amp; Delivery <span class="accent-lime">Analytics Dashboard</span></h1>
                <p class="section-desc" style="max-width:720px;">
                  Live KPIs, lifecycle funnel, rating and testimonial analysis computed directly from YOLETECH's client, inquiry and testimonial records.
                </p>
              </div>
              <div class="dash-header-actions">
                <button class="btn btn-lime btn-sm" onclick="window.app.loadDashboardData(true)">↻ Refresh</button>
              </div>
            </header>
            <div id="dash-body" aria-live="polite"></div>
          </div>
          <div id="dash-tooltip" class="dash-tooltip" role="tooltip" hidden></div>
        </section>
      `;
    },

    mountDashboard() {
      const st = this.getDashboardState();
      this.bindDashboardTooltip();
      if (!st.raw && !st.loading && !st.error) {
        this.loadDashboardData();
      } else {
        this.updateDashboardBody();
      }
    },

    updateDashboardBody() {
      const body = document.getElementById('dash-body');
      if (!body) return;
      const st = this.getDashboardState();
      if (st.loading && !st.raw) {
        body.innerHTML = `<div class="dash-state"><div class="dash-spinner" aria-hidden="true"></div><p>Loading analytics…</p></div>`;
        return;
      }
      if (st.error && !st.raw) {
        body.innerHTML = `<div class="dash-state dash-state-error" role="alert"><p>${esc(st.error)}</p>
          <button class="btn btn-lime btn-sm" onclick="window.app.dash.error=null;window.app.loadDashboardData(true)">Try again</button></div>`;
        return;
      }
      if (!st.raw) return;
      const view = this.applyDashboardFilters();
      const m = this.computeDashboardMetrics(view);
      this.dashView = view;
      body.innerHTML = `
        ${this.renderDashFilters()}
        ${this.renderDashKpis(m)}
        ${this.renderDashInsights(m)}
        <div class="dash-grid dash-grid-2">
          ${this.renderDashStatus(m)}
          ${this.renderDashFunnel(m)}
        </div>
        ${this.renderDashTrends(m)}
        <div class="dash-grid dash-grid-2">
          ${this.renderDashRatings(m)}
          ${this.renderDashTestimonials(m, view)}
        </div>
        <div class="dash-grid dash-grid-2">
          ${this.renderDashServices(m)}
          ${this.renderDashPipeline(m)}
        </div>
        ${this.renderDashDataNotes()}
      `;
      window.YOLETECH_COMPONENTS?.decorateCardIcons(body);
      this.initKpiCounters(body);
    },

    dashCard(title, subtitle, inner, extraClass = '') {
      return `<article class="dash-card ${extraClass}">
          <header class="dash-card-head"><h2 class="dash-card-title">${title}</h2>${subtitle ? `<p class="dash-card-sub">${subtitle}</p>` : ''}</header>
          ${inner}
        </article>`;
    },

    renderDashFilters() {
      const st = this.dash;
      const f = st.filters;
      const services = [...new Set(st.raw.clients.map((c) => c.service))].sort();
      const opt = (val, label, cur) => `<option value="${esc(val)}" ${cur === val ? 'selected' : ''}>${esc(label)}</option>`;
      const active = f.from || f.to || f.status !== 'ALL' || f.service !== 'ALL' || f.rating !== 'ALL';
      return `
        <form class="dash-filters" aria-label="Dashboard filters" onsubmit="event.preventDefault()">
          <div class="dash-filter">
            <label for="dash-from">From</label>
            <input id="dash-from" type="date" class="form-control" value="${esc(f.from)}" onchange="window.app.setDashFilter('from', this.value)" />
          </div>
          <div class="dash-filter">
            <label for="dash-to">To</label>
            <input id="dash-to" type="date" class="form-control" value="${esc(f.to)}" onchange="window.app.setDashFilter('to', this.value)" />
          </div>
          <div class="dash-filter">
            <label for="dash-status">Client status</label>
            <select id="dash-status" class="form-control" onchange="window.app.setDashFilter('status', this.value)">
              ${opt('ALL', 'All statuses', f.status)}
              ${STATUS_ORDER.map((s) => opt(s, STATUS_META[s].label, f.status)).join('')}
              ${st.raw.clients.some((c) => c.status === 'OTHER') ? opt('OTHER', 'Unspecified', f.status) : ''}
            </select>
          </div>
          <div class="dash-filter">
            <label for="dash-service">Service track</label>
            <select id="dash-service" class="form-control" onchange="window.app.setDashFilter('service', this.value)">
              ${opt('ALL', 'All service tracks', f.service)}
              ${services.map((s) => opt(s, s, f.service)).join('')}
            </select>
          </div>
          <div class="dash-filter">
            <label for="dash-rating">Rating</label>
            <select id="dash-rating" class="form-control" onchange="window.app.setDashFilter('rating', this.value)">
              ${opt('ALL', 'Any rating', f.rating)}
              ${opt('RATED', 'Rated only', f.rating)}
              ${opt('5', '5 stars', f.rating)}
              ${opt('4', '4+ stars', f.rating)}
              ${opt('3', '3+ stars', f.rating)}
              ${opt('LT3', 'Below 3 stars', f.rating)}
              ${opt('UNRATED', 'Not rated', f.rating)}
            </select>
          </div>
          <div class="dash-filter dash-filter-actions">
            <button type="button" class="btn btn-outline btn-sm" ${active ? '' : 'disabled'} onclick="window.app.resetDashFilters()">Reset filters</button>
          </div>
        </form>
        <p class="dash-meta">
          ${st.raw.source === 'live' ? '● Live data' : '● Cached data (API unavailable)'} · Updated ${esc(
        st.raw.generatedAt.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
      )}
          ${st.raw.anonymised ? ' · Client identities anonymised for public viewing' : ' · Admin view (full client names)'}
        </p>`;
    },

    setDashFilter(key, value) {
      const st = this.getDashboardState();
      st.filters[key] = value;
      if (key === 'from' && st.filters.to && value && value > st.filters.to) st.filters.to = value;
      if (key === 'to' && st.filters.from && value && value < st.filters.from) st.filters.from = value;
      st.table.page = 1;
      this.updateDashboardBody();
    },

    resetDashFilters() {
      const st = this.getDashboardState();
      st.filters = { from: '', to: '', status: 'ALL', service: 'ALL', rating: 'ALL' };
      st.table.page = 1;
      this.updateDashboardBody();
    },

    kpiCard({ label, value, decimals = 0, suffix = '', na = false, sub = '', tone = '', hint = '', icon = '' }) {
      const valueHtml = na
        ? '<span class="dash-kpi-value dash-na">N/A</span>'
        : `<span class="dash-kpi-value" data-kpi-target="${value}" data-kpi-decimals="${decimals}" data-kpi-comma="true" data-kpi-suffix="${esc(suffix)}">${
            decimals ? Number(value).toFixed(decimals) : value
          }${esc(suffix)}</span>`;
      return `<div class="dash-kpi ${tone}" ${hint ? `title="${esc(hint)}"` : ''}>
          <div class="dash-kpi-heading">
            <span class="dash-kpi-label">${esc(label)}</span>
            ${KPI_ICONS[icon] ? `<svg class="dash-kpi-icon ${tone}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${KPI_ICONS[icon]}</svg>` : ''}
          </div>
          ${valueHtml}
          ${sub ? `<span class="dash-kpi-sub">${sub}</span>` : ''}
        </div>`;
    },

    renderDashKpis(m) {
      const share = (n) => (m.total ? `${((n / m.total) * 100).toFixed(1)}% of clients` : '—');
      const delta = m.currNew - m.prevNew;
      const deltaHtml =
        delta === 0
          ? `<span class="dash-delta flat">● ${m.currNew} new in ${m.periodLabel} (same as prior)</span>`
          : `<span class="dash-delta ${delta > 0 ? 'up' : 'down'}">${delta > 0 ? '▲' : '▼'} ${m.currNew} new in ${m.periodLabel} vs ${m.prevNew} prior</span>`;
      return `
        <div class="dash-kpi-grid" role="list" aria-label="Key performance indicators">
          ${this.kpiCard({ label: 'Total Clients', value: m.total, sub: deltaHtml, tone: 'tone-lime', hint: 'Count of client accounts matching the filters.', icon: 'clients' })}
          ${this.kpiCard({ label: 'Active Clients', value: m.counts.ACTIVE, sub: share(m.counts.ACTIVE), icon: 'active' })}
          ${this.kpiCard({ label: 'In Onboarding', value: m.counts.ONBOARDING, sub: share(m.counts.ONBOARDING), icon: 'onboarding' })}
          ${this.kpiCard({ label: 'Leads', value: m.counts.LEAD, sub: share(m.counts.LEAD), icon: 'leads' })}
          ${this.kpiCard({ label: 'Completed Projects', value: m.counts.COMPLETED, sub: share(m.counts.COMPLETED), icon: 'completed' })}
          ${this.kpiCard({
            label: 'Completion Rate',
            value: m.completionRate ?? 0,
            decimals: 1,
            suffix: '%',
            na: m.completionRate === null,
            sub: 'Completed ÷ engaged clients',
            tone: 'tone-orange',
            hint: 'Completed ÷ (Onboarding + Active + Completed). Leads are excluded because they have not started a project.',
            icon: 'completion'
          })}
          ${this.kpiCard({ label: 'Testimonials', value: m.testimonialCount, sub: `${m.testimonialsLinked} linked to client accounts`, icon: 'testimonials' })}
          ${this.kpiCard({
            label: 'Average Rating',
            value: m.avgRating ?? 0,
            decimals: 1,
            suffix: ' / 5',
            na: m.avgRating === null,
            sub: `Across ${m.ratings.length} rated testimonial${m.ratings.length === 1 ? '' : 's'}`,
            tone: 'tone-lime',
            icon: 'rating'
          })}
          ${this.kpiCard({ label: 'Rated Clients', value: m.ratedClients, sub: `of ${m.total} clients have a rating`, icon: 'ratedClients' })}
          ${this.kpiCard({
            label: 'Inquiry → Client Conversion',
            value: m.conversionRate ?? 0,
            decimals: 1,
            suffix: '%',
            na: m.conversionRate === null,
            sub: `${m.convertedContacts} of ${m.uniqueContacts} unique inquirers registered`,
            tone: 'tone-orange',
            hint: 'Unique inquiry contacts that hold a client account ÷ all unique inquiry contacts.',
            icon: 'conversion'
          })}
        </div>`;
    },

    renderDashInsights(m) {
      const insights = [];
      if (m.total) {
        const top = STATUS_ORDER.map((s) => [s, m.counts[s]]).sort((a, b) => b[1] - a[1])[0];
        insights.push(
          `<strong>${STATUS_META[top[0]].label}</strong> is the largest client segment at ${((top[1] / m.total) * 100).toFixed(0)}% (${top[1]} of ${m.total}).`
        );
      }
      if (m.services.length) {
        insights.push(`Highest demand service track: <strong>${esc(m.services[0][0])}</strong> with ${m.services[0][1]} client${m.services[0][1] === 1 ? '' : 's'}.`);
      }
      if (m.clientTrend.dir !== 0 || m.clientTrend.label === 'Stable') {
        const ch = m.clientTrend.change;
        insights.push(
          `Client acquisition is <strong>${m.clientTrend.label.toLowerCase()}</strong>${
            ch !== null && ch !== undefined ? ` (${ch > 0 ? '+' : ''}${ch.toFixed(0)}% avg/month, last ${m.clientTrend.k} vs prior ${m.clientTrend.k} months)` : ''
          }.`
        );
      }
      if (m.avgRating !== null) {
        const five = m.ratingDist.find((d) => d.star === 5).count;
        insights.push(`Satisfaction is strong: average <strong>${m.avgRating.toFixed(1)}/5</strong>, with ${((five / m.ratings.length) * 100).toFixed(0)}% of ratings at 5 stars.`);
      }
      if (m.completedCount) {
        insights.push(
          `${fmtPct(m.completedTestimonialPct, 0)} of completed clients left a testimonial — ${
            (m.completedTestimonialPct ?? 0) < 50 ? 'an opportunity to request more post-project feedback' : 'healthy advocacy from delivered work'
          }.`
        );
      }
      if (m.peak) insights.push(`Most active month: <strong>${monthLabel(m.peak.m)}</strong> with ${m.peak.v} combined signups, inquiries and testimonials.`);
      if (!insights.length) return '';
      return `<aside class="dash-insights" aria-label="Key insights">
          <h2 class="dash-card-title">Key Insights</h2>
          <ul>${insights.map((i) => `<li>${i}</li>`).join('')}</ul>
        </aside>`;
    },

    renderDashStatus(m) {
      const segs = STATUS_ORDER.concat(m.counts.OTHER ? ['OTHER'] : []).map((s) => ({
        label: STATUS_META[s].label,
        value: m.counts[s],
        color: STATUS_META[s].color
      }));
      const rows = segs
        .map(
          (s) => `<tr><th scope="row"><span class="dash-swatch" style="background:${s.color}"></span>${s.label}</th>
            <td>${s.value}</td><td>${fmtPct(pct(s.value, m.total))}</td></tr>`
        )
        .join('');
      return this.dashCard(
        'Client Status Distribution',
        'Current lifecycle status of every client account',
        `<div class="dash-status-wrap">
          <div class="dash-donut-box">${Charts.donut(segs, 'clients')}</div>
          <table class="dash-mini-table"><thead><tr><th scope="col">Status</th><th scope="col">Clients</th><th scope="col">Share</th></tr></thead>
          <tbody>${rows}</tbody><tfoot><tr><th scope="row">Total</th><td>${m.total}</td><td>${m.total ? '100%' : '—'}</td></tr></tfoot></table>
        </div>`
      );
    },

    renderDashFunnel(m) {
      const top = m.reached[0].value;
      if (!top) return this.dashCard('Client Lifecycle Funnel', 'Lead → Onboarding → Active → Completed', Charts.empty());
      const steps = m.reached
        .map((s, i) => {
          const prev = i ? m.reached[i - 1].value : null;
          const stepConv = i ? pct(s.value, prev) : null;
          const width = Math.max(8, (s.value / top) * 100);
          return `<li class="dash-funnel-step">
              <div class="dash-funnel-label"><span>${s.label}</span><strong>${s.value}</strong></div>
              <div class="dash-funnel-track"><div class="dash-funnel-bar" style="width:${width}%;background:${STATUS_META[s.key].color};"></div></div>
              ${
                i
                  ? `<div class="dash-funnel-conv">${fmtPct(stepConv)} progressed from ${m.reached[i - 1].label}${
                      prev - s.value > 0 ? ` · <span class="dash-drop">−${prev - s.value} drop-off</span>` : ''
                    }</div>`
                  : '<div class="dash-funnel-conv">All clients enter as leads</div>'
              }
            </li>`;
        })
        .join('');
      return this.dashCard(
        'Client Lifecycle Funnel',
        `Overall lead → completed: <strong class="accent-lime">${fmtPct(pct(m.reached[3].value, top))}</strong>`,
        `<ol class="dash-funnel">${steps}</ol>
         <p class="dash-footnote">Stage reach is inferred from each client's current status (a completed client has passed every earlier stage). Status history is not stored, so drop-off includes clients still progressing.</p>`
      );
    },

    renderDashTrends(m) {
      const trendBadge = (t) =>
        `<span class="dash-trend ${t.dir > 0 ? 'up' : t.dir < 0 ? 'down' : 'flat'}">${t.dir > 0 ? '▲' : t.dir < 0 ? '▼' : '●'} ${esc(t.label)}</span>`;
      const acquisition = this.dashCard(
        `Monthly Client Acquisition ${trendBadge(m.clientTrend)}`,
        'New client accounts per signup month, coloured by current status, with cumulative total',
        `${Charts.stackedMonthly(m.months, m.stacks, m.cumulative, { ariaLabel: 'Monthly new clients stacked by status with cumulative line' })}
         ${Charts.legend([...m.stacks.map((s) => ({ label: s.label, color: s.color })), { label: 'Cumulative clients', color: isLight() ? '#1E1B54' : '#fff', dashed: true }])}`,
        'dash-span-2'
      );
      const activity = this.dashCard(
        `Inquiry &amp; Testimonial Activity ${trendBadge(m.inquiryTrend)}`,
        'Project inquiries and testimonials received per month',
        `${Charts.lines(
          m.months,
          [
            { label: 'Inquiries', color: SERIES_COLORS.inquiries, values: m.inquiriesPerMonth },
            { label: 'Testimonials', color: SERIES_COLORS.testimonials, values: m.testimonialsPerMonth }
          ],
          { yTitle: 'Count', ariaLabel: 'Monthly inquiries and testimonials' }
        )}
         ${Charts.legend([
           { label: `Inquiries (${m.inquiryCount})`, color: SERIES_COLORS.inquiries },
           { label: `Testimonials (${m.testimonialCount})`, color: SERIES_COLORS.testimonials }
         ])}`,
        'dash-span-2'
      );
      return `<div class="dash-grid dash-grid-2">${acquisition}${activity}</div>`;
    },

    renderDashRatings(m) {
      const colors = { 5: '#C8E61E', 4: '#A3D11B', 3: '#F7941D', 2: '#F97316', 1: '#EF4444' };
      const items = [1, 2, 3, 4, 5].map((s) => {
        const c = m.ratingDist.find((d) => d.star === s).count;
        return { label: `${s}★`, value: c, color: colors[s], tip: `${s} stars: ${c} (${fmtPct(pct(c, m.ratings.length))})` };
      });
      const stats = `
        <dl class="dash-stats">
          <div><dt>Average</dt><dd>${m.avgRating !== null ? m.avgRating.toFixed(2) : 'N/A'}</dd></div>
          <div><dt>Highest</dt><dd>${m.maxRating ?? 'N/A'}</dd></div>
          <div><dt>Lowest</dt><dd>${m.minRating ?? 'N/A'}</dd></div>
          <div><dt>Ratings</dt><dd>${m.ratings.length}</dd></div>
          <div><dt>Rated clients</dt><dd>${m.ratedClients}</dd></div>
          <div><dt>Completed rated</dt><dd>${fmtPct(m.completedRatedPct, 0)}</dd></div>
        </dl>`;
      return this.dashCard(
        'Rating Analysis',
        'Distribution of star ratings attached to approved testimonials',
        `${stats}${Charts.bars(items, { xTitle: 'Star rating', yTitle: 'Ratings', ariaLabel: 'Rating distribution from 1 to 5 stars' })}`
      );
    },

    renderDashTestimonials(m, view) {
      const recent = view.testimonials
        .slice()
        .sort((a, b) => (b.created?.getTime() || 0) - (a.created?.getTime() || 0) || b.id - a.id)
        .slice(0, 3);
      const byTrack = {};
      view.testimonials.forEach((t) => (byTrack[t.service] = (byTrack[t.service] || 0) + 1));
      const trackItems = Object.entries(byTrack)
        .sort((a, b) => b[1] - a[1])
        .map(([label, value]) => ({ label, value, color: '#38BDF8' }));
      const list = recent.length
        ? `<ul class="dash-testimonials">${recent
            .map(
              (t) => `<li>
                <div class="dash-t-head"><strong>${esc(t.author)}</strong>${stars(t.rating)}</div>
                <div class="dash-muted dash-t-meta">${esc([t.role, t.company].filter(Boolean).join(' · '))} · ${fmtDate(t.created)}</div>
                <p>“${esc(t.content.length > 150 ? `${t.content.slice(0, 150).trim()}…` : t.content)}”</p>
              </li>`
            )
            .join('')}</ul>`
        : Charts.empty('No testimonials for the selected filters.');
      return this.dashCard(
        'Testimonials Analysis',
        `${m.testimonialCount} testimonials · ${fmtPct(m.completedTestimonialPct, 0)} of completed clients reviewed · avg ${
          m.avgRating !== null ? m.avgRating.toFixed(1) : 'N/A'
        }★`,
        `<h3 class="dash-subhead">By service track</h3>${Charts.hbars(trackItems, m.testimonialCount)}
         <h3 class="dash-subhead">Most recent</h3>${list}`
      );
    },

    renderDashServices(m) {
      const items = m.services.map(([label, value]) => ({
        label,
        value,
        color: '#C8E61E',
        note: m.inquiryServiceCounts[label] ? `${m.inquiryServiceCounts[label]} related inquiries` : ''
      }));
      return this.dashCard('Service Track Demand', 'Clients by primary service interest', Charts.hbars(items, m.total));
    },

    renderDashPipeline(m) {
      const labels = { NEW: 'New', IN_PROGRESS: 'In progress', REVIEW: 'In review', COMPLETED: 'Completed', CLOSED: 'Closed' };
      const colors = { NEW: '#8B85FF', IN_PROGRESS: '#F7941D', REVIEW: '#38BDF8', COMPLETED: '#C8E61E', CLOSED: '#94A3B8' };
      const items = Object.entries(m.inquiryStatus)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => ({ label: labels[k] || k.replace(/_/g, ' ').toLowerCase(), value: v, color: colors[k] || '#94A3B8' }));
      return this.dashCard(
        'Project Inquiry Pipeline',
        `${m.inquiryCount} inquiries · average delivery progress ${m.avgProgress !== null ? `<strong class="accent-lime">${m.avgProgress.toFixed(0)}%</strong>` : 'N/A'}`,
        Charts.hbars(items, m.inquiryCount)
      );
    },

    // ---- Client table -----------------------------------------------------
    renderDashTable() {
      const st = this.dash;
      const t = st.table;
      const view = this.dashView || this.applyDashboardFilters();
      const q = t.search.trim().toLowerCase();
      let rows = view.clients.filter(
        (c) => !q || [c.label, c.company, c.service, STATUS_META[c.status].label].some((v) => String(v || '').toLowerCase().includes(q))
      );
      const getters = {
        name: (c) => c.label.toLowerCase(),
        service: (c) => c.service.toLowerCase(),
        status: (c) => STATUS_ORDER.indexOf(c.status),
        created: (c) => c.created?.getTime() || 0,
        inquiries: (c) => c.inquiryCount,
        rating: (c) => (c.rating === null ? -1 : c.rating),
        testimonial: (c) => (c.hasTestimonial ? 1 : 0)
      };
      const g = getters[t.sortKey] || getters.created;
      rows = rows.slice().sort((a, b) => {
        const va = g(a), vb = g(b);
        const cmp = va < vb ? -1 : va > vb ? 1 : 0;
        return t.sortDir === 'asc' ? cmp : -cmp;
      });
      const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
      if (t.page > pages) t.page = pages;
      const pageRows = rows.slice((t.page - 1) * PAGE_SIZE, t.page * PAGE_SIZE);
      const th = (key, label) => {
        const activeKey = t.sortKey === key;
        const ariaSort = activeKey ? (t.sortDir === 'asc' ? 'ascending' : 'descending') : 'none';
        return `<th scope="col" aria-sort="${ariaSort}"><button type="button" class="dash-sort" onclick="window.app.sortDashTable('${key}')">${label}<span aria-hidden="true">${
          activeKey ? (t.sortDir === 'asc' ? ' ▲' : ' ▼') : ' ↕'
        }</span></button></th>`;
      };
      const body = pageRows.length
        ? pageRows
            .map(
              (c) => `<tr>
                <td><strong>${esc(c.label)}</strong>${c.company ? `<div class="dash-muted">${esc(c.company)}</div>` : ''}</td>
                <td>${esc(c.service)}</td>
                <td><span class="dash-status-pill" style="--pill:${STATUS_META[c.status].color}">${STATUS_META[c.status].label}</span></td>
                <td>${fmtDate(c.created)}</td>
                <td>${c.inquiryCount}${
                  c.latestInquiry
                    ? `<div class="dash-muted">${esc(c.latestInquiry.status.replace(/_/g, ' ').toLowerCase())}${
                        c.latestInquiry.progress !== null ? ` · ${c.latestInquiry.progress}%` : ''
                      }</div>`
                    : ''
                }</td>
                <td>${stars(c.rating)}</td>
                <td>${c.hasTestimonial ? '<span class="dash-yes">✓ Received</span>' : '<span class="dash-muted">None</span>'}</td>
              </tr>`
            )
            .join('')
        : `<tr><td colspan="7">${Charts.empty('No clients match the current search and filters.')}</td></tr>`;
      return this.dashCard(
        'Client Directory',
        `${rows.length} client${rows.length === 1 ? '' : 's'} match the current filters`,
        `<div class="dash-table-tools">
            <label class="sr-only" for="dash-search">Search clients</label>
            <input id="dash-search" type="search" class="form-control" placeholder="Search client, company, service or status…" value="${esc(t.search)}"
              oninput="window.app.searchDashTable(this.value)" />
          </div>
          <div class="table-wrapper dash-table-wrap">
            <table class="yole-table dash-table">
              <caption class="sr-only">Client directory with status, inquiries, ratings and testimonials</caption>
              <thead><tr>${th('name', 'Client')}${th('service', 'Service track')}${th('status', 'Status')}${th('created', 'Joined')}${th(
          'inquiries',
          'Inquiries'
        )}${th('rating', 'Rating')}${th('testimonial', 'Testimonial')}</tr></thead>
              <tbody>${body}</tbody>
            </table>
          </div>
          <nav class="dash-pager" aria-label="Client table pagination">
            <button type="button" class="btn btn-outline btn-sm" ${t.page <= 1 ? 'disabled' : ''} onclick="window.app.pageDashTable(-1)">← Prev</button>
            <span>Page ${t.page} of ${pages}</span>
            <button type="button" class="btn btn-outline btn-sm" ${t.page >= pages ? 'disabled' : ''} onclick="window.app.pageDashTable(1)">Next →</button>
          </nav>`,
        'dash-table-card'
      );
    },

    refreshDashTable(keepFocus = false) {
      const mount = document.getElementById('dash-table-mount');
      if (!mount) return;
      const input = document.getElementById('dash-search');
      const pos = keepFocus && input ? input.selectionStart : null;
      mount.innerHTML = this.renderDashTable();
      window.YOLETECH_COMPONENTS?.decorateCardIcons(mount);
      if (keepFocus) {
        const again = document.getElementById('dash-search');
        if (again) {
          again.focus();
          if (pos !== null) again.setSelectionRange(pos, pos);
        }
      }
    },

    searchDashTable(value) {
      this.dash.table.search = value;
      this.dash.table.page = 1;
      this.refreshDashTable(true);
    },

    sortDashTable(key) {
      const t = this.dash.table;
      if (t.sortKey === key) t.sortDir = t.sortDir === 'asc' ? 'desc' : 'asc';
      else {
        t.sortKey = key;
        t.sortDir = key === 'name' || key === 'service' ? 'asc' : 'desc';
      }
      this.refreshDashTable();
    },

    pageDashTable(step) {
      this.dash.table.page = Math.max(1, this.dash.table.page + step);
      this.refreshDashTable();
    },

    renderDashDataNotes() {
      return `<details class="dash-notes">
          <summary>Methodology &amp; data availability</summary>
          <ul>
            <li><strong>Sources:</strong> client accounts (users with role CLIENT), project inquiries, and approved testimonials. No values are estimated or simulated.</li>
            <li><strong>Completion rate</strong> = Completed ÷ (Onboarding + Active + Completed). Leads are excluded because they have not started a project.</li>
            <li><strong>Inquiry → client conversion</strong> = unique inquiry contacts that hold a client account ÷ all unique inquiry contacts.</li>
            <li><strong>Client ratings</strong> come from testimonials matched to a client account by name; clients without a matched testimonial are shown as “Not rated”.</li>
            <li><strong>Period comparison</strong> compares new clients in the selected date range (or last 30 days) with the preceding period of equal length.</li>
            <li><strong>Not available:</strong> project completion dates, status-change history, time spent in onboarding and lifecycle duration are not recorded, so those metrics are intentionally omitted. Completed projects are therefore charted by signup cohort.</li>
          </ul>
        </details>`;
    },

    // ---- Tooltip & export ---------------------------------------------------
    bindDashboardTooltip() {
      if (this._dashTooltipBound) return;
      this._dashTooltipBound = true;
      const show = (target, x, y) => {
        const tip = document.getElementById('dash-tooltip');
        if (!tip) return;
        tip.textContent = target.getAttribute('data-tip');
        tip.hidden = false;
        const w = tip.offsetWidth;
        tip.style.left = `${Math.min(window.innerWidth - w - 8, Math.max(8, x - w / 2))}px`;
        tip.style.top = `${Math.max(8, y - tip.offsetHeight - 12)}px`;
      };
      const hide = () => {
        const tip = document.getElementById('dash-tooltip');
        if (tip) tip.hidden = true;
      };
      document.addEventListener('mousemove', (e) => {
        if (this.currentPage !== 'dashboard') return;
        const target = e.target.closest && e.target.closest('[data-tip]');
        if (target) show(target, e.clientX, e.clientY);
        else hide();
      });
      document.addEventListener('focusin', (e) => {
        if (this.currentPage !== 'dashboard') return;
        const target = e.target.closest && e.target.closest('[data-tip]');
        if (target) {
          const r = target.getBoundingClientRect();
          show(target, r.left + r.width / 2, r.top);
        } else hide();
      });
      document.addEventListener('scroll', hide, { passive: true });
    },

    exportDashboardCSV() {
      const st = this.getDashboardState();
      if (!st.raw) return;
      const view = this.applyDashboardFilters();
      const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const lines = [
        ['Client', 'Company', 'Service Track', 'Status', 'Joined', 'Inquiries', 'Rating', 'Testimonial'].join(','),
        ...view.clients.map((c) =>
          [
            q(c.label),
            q(c.company),
            q(c.service),
            q(STATUS_META[c.status].label),
            q(c.created ? c.created.toISOString().slice(0, 10) : ''),
            c.inquiryCount,
            c.rating === null ? '' : c.rating.toFixed(1),
            c.hasTestimonial ? 'Yes' : 'No'
          ].join(',')
        )
      ];
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `yoletech_dashboard_clients_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      this.showToast(`Exported ${view.clients.length} client rows to CSV.`);
    }
  });
})();
