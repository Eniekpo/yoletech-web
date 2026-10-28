// ============================================================================
// YOLETECH — REUSABLE UI COMPONENTS & INTERACTIVE SAMPLE MOCKUPS
// ============================================================================

window.YOLETECH_COMPONENTS = {
  renderBrandLogo() {
    return `
      <a href="/" class="brand-logo" title="Go to Home Page" onclick="event.preventDefault(); window.app.navigate('home')">
        <span class="brand-icon-box">
          <span class="y">Y</span><span class="t">T</span>
        </span>
        <span class="brand-wordmark">
          <span class="yole">YOLE</span><span class="tech">TECH
            <svg class="brand-swoosh" viewBox="0 0 36 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 14C12 14 25 9 35 1C29 9 20 15 1 14Z" fill="#F7941D" stroke="#F7941D" stroke-width="1.5"/>
            </svg>
          </span>
        </span>
      </a>
    `;
  },

  getIcon(name) {
    const icons = {
      code: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><polyline points="10 9 7 11 10 13"/><polyline points="14 9 17 11 14 13"/></svg>`,
      chart: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>`,
      video: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="3"/><polygon points="10 9 15 12 10 15 10 9" fill="currentColor"/></svg>`,
      cpu: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>`,
      brush: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z"/><path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7"/><path d="M14.5 17.5 3.5 15"/></svg>`,
      film: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>`,
      headset: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>`,
      settings: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
      check: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C8E61E" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
    };
    return icons[name] || icons.code;
  },

  // 1. Portrait Hero Widget
  renderPortraitHeroWidget(mode = 'home') {
    const isAbout = mode === 'about';
    const imgSrc = isAbout ? '/assets/john-portrait.png' : '/assets/home-hero-analyst.jpg';
    const imgAlt = isAbout
      ? 'John Oruebi Eniekpo — YOLETECH'
      : 'Data Analyst analyzing live Business Intelligence dashboard on computer screen — YOLETECH';
    const badgeTitle = isAbout ? 'John Oruebi Eniekpo' : 'Live BI &amp; Data Analytics Studio';
    const badgeSub = isAbout
      ? 'Data Analyst • BI Specialist • Full-Stack Dev'
      : 'Data Analytics • Power BI • Full-Stack Dev';

    return `
      <div class="portrait-orbit-card">
        <img src="${imgSrc}" alt="${imgAlt}" />
        <div class="portrait-floating-badge">
          <div>
            <div style="font-weight:800;font-size:14px;color:#FFFFFF;">${badgeTitle}</div>
            <div style="font-size:12px;color:#C8E61E;font-weight:600;">${badgeSub}</div>
          </div>
          <span class="tech-pill orange" style="font-size:11px;" data-kpi-target="5" data-kpi-suffix="+ Yrs Exp">5+ Yrs Exp</span>
        </div>
      </div>
    `;
  },

  // 2. Interactive Data Overview Dashboard Widget (Matches Sample f2e39467.jpg)
  renderDataOverviewWidget() {
    return `
      <div class="ui-mockup-frame">
        <div class="ui-window-bar">
          <div style="display:flex;align-items:center;gap:10px;">
            <div class="window-dots">
              <span class="window-dot red"></span>
              <span class="window-dot yellow"></span>
              <span class="window-dot green"></span>
            </div>
            <span style="font-size:12px;font-weight:800;color:#FFFFFF;letter-spacing:0.06em;">
              YOLE<span style="color:#C8E61E;">TECH</span> • BI &amp; DATA OVERVIEW
            </span>
          </div>
          <span class="tech-pill lime" style="font-size:11px;padding:3px 10px;">Power BI / Tableau / SQL</span>
        </div>

        <div class="dashboard-main">
          <div class="kpi-cards-row">
            <div class="mini-kpi-card">
              <div class="mini-kpi-title">Data &amp; API Workflows</div>
              <div class="mini-kpi-value" data-kpi-target="5903500" data-kpi-comma="true">5,903,500</div>
              <div style="font-size:11px;color:#C8E61E;font-weight:700;margin-top:4px;">
                ▲ <span data-kpi-target="12.5" data-kpi-decimals="1" data-kpi-prefix="+" data-kpi-suffix="%">+12.5%</span> vs baseline
              </div>
              <svg viewBox="0 0 160 36" style="width:100%;height:32px;margin-top:6px;">
                <path d="M2 30 Q 25 20, 45 25 T 90 15 T 130 18 T 158 6" fill="none" stroke="#C8E61E" stroke-width="2.5"/>
              </svg>
            </div>

            <div class="mini-kpi-card">
              <div class="mini-kpi-title">Records Audited</div>
              <div class="mini-kpi-value" data-kpi-target="43010" data-kpi-comma="true">43,010</div>
              <div style="display:flex;justify-content:space-between;margin-top:14px;font-size:11px;">
                <span><strong style="color:#C8E61E;" data-kpi-target="0.03" data-kpi-decimals="2" data-kpi-suffix="ms">0.03ms</strong> query</span>
                <span><strong style="color:#F7941D;" data-kpi-target="99.9" data-kpi-decimals="1" data-kpi-suffix="%">99.9%</strong> integrity</span>
              </div>
            </div>

            <div class="mini-kpi-card" style="display:flex;align-items:center;justify-content:space-between;">
              <div>
                <div class="mini-kpi-title">Pipeline Status</div>
                <div style="font-size:11px;color:#C8E61E;margin-bottom:3px;">● Validated</div>
                <div style="font-size:11px;color:#F7941D;margin-bottom:3px;">● Running</div>
                <div style="font-size:11px;color:#FFFFFF;">● Scheduled</div>
              </div>
              <svg width="62" height="62" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#2F2B73" stroke-width="4.5"></circle>
                <circle cx="18" cy="18" r="14" fill="none" stroke="#C8E61E" stroke-width="4.5" stroke-dasharray="62 28" stroke-dashoffset="15"></circle>
                <circle cx="18" cy="18" r="14" fill="none" stroke="#F7941D" stroke-width="4.5" stroke-dasharray="22 68" stroke-dashoffset="-47"></circle>
              </svg>
            </div>
          </div>

          <div class="dashboard-charts-row">
            <div class="mini-kpi-card">
              <div class="mini-kpi-title">Real-Time SQL Database &amp; Departmental Activity</div>
              <svg viewBox="0 0 280 90" style="width:100%;height:84px;">
                <defs>
                  <linearGradient id="limeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#C8E61E" stop-opacity="0.45"/>
                    <stop offset="100%" stop-color="#C8E61E" stop-opacity="0.0"/>
                  </linearGradient>
                </defs>
                <path d="M0 65 C 45 25, 85 70, 135 35 C 185 5, 225 50, 280 15 L 280 90 L 0 90 Z" fill="url(#limeGrad)"/>
                <path d="M0 65 C 45 25, 85 70, 135 35 C 185 5, 225 50, 280 15" fill="none" stroke="#C8E61E" stroke-width="2.5"/>
                <path d="M0 75 C 50 50, 95 30, 150 55 C 200 75, 235 25, 280 40" fill="none" stroke="#F7941D" stroke-width="2"/>
              </svg>
            </div>

            <div class="mini-kpi-card">
              <div class="mini-kpi-title">Active BI &amp; ML Load</div>
              <div style="display:flex;align-items:flex-end;justify-content:space-between;height:80px;padding-top:12px;gap:6px;">
                <div style="flex:1;height:45%;background:#2F2B73;border-top:2px solid #C8E61E;border-radius:4px 4px 0 0;"></div>
                <div style="flex:1;height:70%;background:#C8E61E;border-radius:4px 4px 0 0;"></div>
                <div style="flex:1;height:95%;background:#F7941D;border-radius:4px 4px 0 0;"></div>
                <div style="flex:1;height:65%;background:#C8E61E;border-radius:4px 4px 0 0;"></div>
                <div style="flex:1;height:85%;background:#2F2B73;border-top:2px solid #C8E61E;border-radius:4px 4px 0 0;"></div>
                <div style="flex:1;height:78%;background:#C8E61E;border-radius:4px 4px 0 0;"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // 3. Split-Screen Code & Workflow UI Mockup (Matches Sample 85fa46a6.jpg)
  renderCodeSyncWidget() {
    return `
      <div class="ui-mockup-frame">
        <div class="ui-window-bar">
          <div class="window-dots">
            <span class="window-dot red"></span>
            <span class="window-dot yellow"></span>
            <span class="window-dot green"></span>
          </div>
          <span style="font-size:12px;font-weight:700;color:#C8E61E;">yoletech_fullstack_sync.py • React.js + SQL</span>
        </div>
        <div class="code-sync-split">
          <div class="code-editor-pane">
            <div style="color:rgba(255,255,255,0.45);">// Register automated SQL &amp; Web API sync hook</div>
            <div><span style="color:#F7941D;">export async function</span> <span style="color:#C8E61E;">handleDataSync</span>(departmentId) {</div>
            <div style="padding-left:14px;">const endpoint = <span style="color:#C8E61E;">'https://api.yolestica.com/v2/sync'</span>;</div>
            <div style="padding-left:14px;">const response = <span style="color:#F7941D;">await</span> fetch(endpoint, { method: <span style="color:#C8E61E;">'POST'</span> });</div>
            <div style="padding-left:14px;margin-top:6px;"><span style="color:#F7941D;">if</span> (!response.ok) <span style="color:#F7941D;">return</span> { valid: <span style="color:#F7941D;">false</span> };</div>
            <div style="padding-left:14px;margin-top:6px;">const payload = <span style="color:#F7941D;">await</span> response.json();</div>
            <div style="padding-left:14px;"><span style="color:#F7941D;">return</span> auditAndPublishToDashboard(payload);</div>
            <div>}</div>
          </div>

          <div class="workflow-status-pane">
            <div>
              <div style="background:#2F2B73;border:1px solid rgba(200,230,30,0.4);border-radius:10px;padding:9px 12px;font-size:11.5px;display:flex;align-items:center;gap:8px;margin-bottom:14px;">
                <span style="background:#C8E61E;color:#17143A;font-weight:900;padding:2px 7px;border-radius:6px;">API</span>
                <span style="color:#FFFFFF;overflow:hidden;text-overflow:ellipsis;">https://api.yolestica.com/v2/sync</span>
              </div>
              <div style="font-size:11px;font-weight:800;color:var(--yole-text-muted);letter-spacing:0.08em;margin-bottom:8px;">
                WORKFLOW STATUS
              </div>
              <div class="status-mini-grid">
                <div class="status-mini-box">
                  <div style="font-size:12px;font-weight:800;">Deploy</div>
                  <div style="font-size:10px;color:#C8E61E;font-weight:800;margin-top:3px;">READY</div>
                </div>
                <div class="status-mini-box">
                  <div style="font-size:12px;font-weight:800;">Sync SQL</div>
                  <div style="font-size:10px;color:#F7941D;font-weight:800;margin-top:3px;">RUNNING</div>
                </div>
                <div class="status-mini-box">
                  <div style="font-size:12px;font-weight:800;">Automate</div>
                  <div style="font-size:10px;color:#C8E61E;font-weight:800;margin-top:3px;">ACTIVE</div>
                </div>
              </div>
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;margin-top:16px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.1);">
              <span style="color:var(--yole-text-muted);">Last validated sync: Just now</span>
              <span style="color:#C8E61E;font-weight:800;">● ONLINE</span>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // 4. API-to-Python Workflow Architecture Widget (Matches Sample f27d7828.jpg)
  renderWorkflowDiagramWidget() {
    return `
      <div class="ui-mockup-frame workflow-diagram-frame">
        <div class="workflow-diagram-header">
          <span class="eyebrow" style="margin:0;font-size:11.5px;">
            <span class="eyebrow-dot"></span> AUTOMATED DATA &amp; ML PIPELINE ARCHITECTURE
          </span>
          <span class="tech-pill orange" style="font-size:11px;">Excel VBA • SQL • Python</span>
        </div>

        <div class="workflow-diagram-grid">
          <div class="glass-card" style="padding:18px;text-align:center;border-color:#C8E61E;">
            <div style="font-size:24px;margin-bottom:6px;color:#C8E61E;">⚙️</div>
            <div style="font-weight:900;font-size:16px;">APIs &amp; SQL</div>
            <div style="font-size:11.5px;color:var(--yole-text-muted);">Multi-Dept Data Sources</div>
          </div>

          <div style="display:flex;flex-direction:column;gap:12px;">
            <div class="glass-card" style="padding:14px;border-color:rgba(200,230,30,0.45);">
              <div style="font-weight:800;font-size:14px;color:#C8E61E;">01. Data Validation &amp; Audit</div>
              <div style="font-size:11.5px;color:var(--yole-text-muted);">Pandas, R, SPSS &amp; Excel VBA Macros</div>
            </div>
            <div class="glass-card" style="padding:14px;border-color:rgba(247,148,29,0.55);">
              <div style="font-weight:800;font-size:14px;color:#F7941D;">02. Webhooks &amp; ETL Sync</div>
              <div style="font-size:11.5px;color:var(--yole-text-muted);">SQL Server • MySQL • MS Access</div>
            </div>
          </div>

          <div class="glass-card" style="padding:18px;text-align:center;border-color:#F7941D;">
            <div style="font-size:24px;margin-bottom:6px;">🐍</div>
            <div style="font-weight:900;font-size:16px;">Python &amp; BI</div>
            <div style="font-size:11.5px;color:var(--yole-text-muted);">Predictive ML &amp; Dashboards</div>
          </div>
        </div>
      </div>
    `;
  }
};
