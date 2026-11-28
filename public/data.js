// ============================================================================
// YOLETECH — STRUCTURED BRAND, SERVICES & PROFILE DATA
// ============================================================================

window.YOLETECH_DATA = {
  owner: {
    name: "John Oruebi Eniekpo",
    credentials: "B.Sc. Computer Science (M.Sc. IT in progress)",
    jobTitle: "Data Analyst, Business Intelligence Specialist & Full-Stack Web Developer",
    roles: ["Data Analyst", "Business Intelligence Specialist", "Full-Stack Web Developer"],
    location: "Yenagoa, Bayelsa State, Nigeria",
    serviceArea: "Yenagoa, Bayelsa State, Nigeria & Remote Worldwide",
    locationUrl: "https://www.google.com/maps/search/?api=1&query=Yenagoa%2C+Bayelsa+State%2C+Nigeria",
    phone: "+234 802 552 6389",
    phoneE164: "+2348025526389",
    whatsappUrl: "https://wa.me/2348025526389",
    email: "yoletech@yolestica.com",
    bookingUrlPlaceholder: "TODO(owner): Add your Calendly or Cal.com discovery call booking URL",
    workingHours: "Monday – Friday, 9:00 AM – 6:00 PM WAT (UTC+1)",
    responseTimeStatement: "We respond to all project and training inquiries within 1 business day (24 hours on working days).",
    socials: {
      linkedin: "https://linkedin.com/in/yolestica",
      github: "https://github.com/Eniekpo",
      kaggle: "https://kaggle.com/Yoletech",
      youtube: "https://youtube.com/@yole-tech",
      facebook: "https://facebook.com/Yoletech",
      whatsapp: "https://wa.me/2348025526389"
    },
    summary:
      "Founder of YOLETECH, focused on data analytics, executive business intelligence, workflow automation, full-stack web engineering, and practical technology training."
  },

  heroSlides: [
    {
      id: "brand-partner",
      eyebrow: "DATA ANALYTICS, BI & FULL-STACK ENGINEERING",
      titleHtml: `Data Analytics, <span class="accent-lime">Executive BI</span> &amp; Full-Stack Web Solutions.`,
      subtitle:
        "Practical digital services for businesses, professionals, and learners—delivering full-stack web applications, interactive BI dashboards, and automated workflows.",
      primaryCta: { label: "Book a Discovery Call →", page: "contact" },
      secondaryCta: { label: "View Case Studies", page: "portfolio" },
      visualType: "portrait"
    },
    {
      id: "data-bi",
      eyebrow: "DATA ANALYSIS & BUSINESS INTELLIGENCE",
      titleHtml: `Turn Complex Datasets Into <span class="accent-lime">Executive Clarity.</span>`,
      subtitle:
        "End-to-end data cleaning, statistical auditing, and interactive Power BI & Tableau dashboards built for clear leadership decisions.",
      primaryCta: { label: "Book a Discovery Call →", page: "contact" },
      secondaryCta: { label: "Explore Services", page: "services" },
      visualType: "dashboard"
    },
    {
      id: "web-dev",
      eyebrow: "FULL-STACK WEB DEVELOPMENT",
      titleHtml: `Modern Full-Stack <span class="accent-lime">Web Applications</span> &amp; Portals.`,
      subtitle:
        "Responsive frontend and backend systems built with React.js, Node.js, JavaScript, WordPress, and relational SQL databases.",
      primaryCta: { label: "Book a Discovery Call →", page: "contact" },
      secondaryCta: { label: "View Case Studies", page: "portfolio" },
      visualType: "codesync"
    },
    {
      id: "ai-automation",
      eyebrow: "AI & WORKFLOW AUTOMATION",
      titleHtml: `Eliminate Bottlenecks With <span class="accent-lime">AI &amp; Automation.</span>`,
      subtitle:
        "Automated reporting pipelines, scheduled Python scripts, Excel VBA macros, and API workflows that reduce repetitive manual effort.",
      primaryCta: { label: "Book a Discovery Call →", page: "contact" },
      secondaryCta: { label: "Explore Services", page: "services" },
      visualType: "workflow"
    }
  ],

  // 7 Confirmed Core & Extended Services (aligned with server/site-config.js and /learn)
  eightServicesStrip: [
    {
      id: "full-stack-web-development",
      title: "Full-Stack Web Development",
      sub: "React.js · Node.js · JavaScript · SQL · WordPress",
      icon: "code",
      category: "Full-Stack Web",
      description:
        "Custom websites, role-based client portals, web applications, and relational database backends built for speed, security, and maintainability.",
      deliverables: [
        "Responsive interfaces with WCAG 2.1 AA accessibility",
        "REST API backends with validation and secure authentication",
        "Relational SQL database design and parameterized queries",
        "Production deployment, SSL setup, and handover docs"
      ],
      tools: ["JavaScript", "TypeScript", "React.js", "Node.js", "HTML5/CSS3", "SQL", "WordPress"],
      process: "Discovery and wireframing, iterative frontend/backend build, QA testing, and documented launch.",
      faq: {
        q: "Can you modernize an existing website or build a custom client portal from scratch?",
        a: "Yes. We audit existing sites for performance, SEO, and usability or architect new full-stack applications tailored to your workflow."
      }
    },
    {
      id: "data-analysis-executive-bi",
      title: "Data Analysis & Executive BI",
      sub: "Power BI · Tableau · Python · SQL · Excel · SPSS",
      icon: "chart",
      category: "Data Analytics & BI",
      description:
        "Structured data cleaning, statistical auditing, KPI modeling, and interactive Power BI and Tableau dashboards built for clear leadership decisions.",
      deliverables: [
        "Cleaned, validated, and documented datasets",
        "SQL reporting views and KPI data models",
        "Interactive Power BI and Tableau executive dashboards",
        "Stakeholder walkthrough and metric dictionary"
      ],
      tools: ["Power BI", "Tableau", "Python (Pandas)", "SQL", "Microsoft Excel", "R", "SPSS"],
      process: "Data source audit, cleaning and validation rules, KPI modeling, dashboard build, and executive review.",
      faq: {
        q: "What data sources can be connected to my BI dashboard?",
        a: "We work with Excel/CSV files, SQL Server, MySQL, PostgreSQL, SQLite, and REST APIs, standardizing schemas before visualization."
      }
    },
    {
      id: "ai-workflow-automation",
      title: "AI & Workflow Automation",
      sub: "Python ETL · Excel VBA · APIs · AI Workflows",
      icon: "cpu",
      category: "AI & Workflow Automation",
      description:
        "Automated reporting pipelines, scheduled Python scripts, Excel VBA macros, and AI-assisted operational workflows that eliminate repetitive manual tasks.",
      deliverables: [
        "Process audit identifying high-effort manual bottlenecks",
        "Automated Python/SQL ETL pipelines or Excel VBA workbooks",
        "API and webhook integrations connecting forms, sheets, and email",
        "Error handling, logging, and team handover guides"
      ],
      tools: ["Python", "Pandas", "OpenPyXL", "Excel VBA", "Node.js", "REST APIs", "Scikit-Learn"],
      process: "Workflow mapping, prototype automation on real sample files, edge-case testing, and scheduled rollout.",
      faq: {
        q: "Will my team be able to run the automation without writing code?",
        a: "Yes. Automations are delivered with one-click triggers or scheduled runs plus clear step-by-step operating instructions."
      }
    },
    {
      id: "tech-training-mentorship",
      title: "Tech Training & Mentorship",
      sub: "Python · SQL · Power BI · Excel · Web Dev",
      icon: "video",
      category: "Tech Tutorials & Training",
      description:
        "Structured, hands-on training programs and staff upskilling in data analytics, SQL, Python, business intelligence, and practical web engineering.",
      deliverables: [
        "Structured curriculum with guided practical exercises",
        "Hands-on project feedback and code/dashboard reviews",
        "Corporate staff data-standards and reporting workshops",
        "Self-paced reference materials and templates"
      ],
      tools: ["Python", "SQL", "Power BI", "Microsoft Excel", "Git", "JavaScript"],
      process: "Skill-level assessment, structured module delivery, guided capstone projects, and progress check-ins.",
      faq: {
        q: "Do beginners need prior coding experience to enroll?",
        a: "No. Beginner tracks start with foundational concepts and build step by step through practical exercises."
      }
    },
    {
      id: "customer-support-solutions",
      title: "Customer Support Solutions",
      sub: "AI Assistants · Chatbots · Help Desk Workflows",
      icon: "headset",
      category: "Support & Operations",
      description:
        "Structured customer support workflows, FAQ knowledge bases, and AI-assisted chat experiences configured with clear escalation to human agents.",
      deliverables: [
        "Organized FAQ and support knowledge base structure",
        "Web chat widget and automated triage workflows",
        "Human handoff rules for complex customer inquiries",
        "Response quality review and workflow documentation"
      ],
      tools: ["Chatwoot", "Node.js", "Webhooks", "WhatsApp Business", "CRM Workflows"],
      process: "Common inquiry audit, knowledge base setup, chat flow integration, escalation testing, and live monitoring.",
      faq: {
        q: "Can customers still reach a real person when a chatbot cannot help?",
        a: "Yes. Every support setup includes clear escalation paths to email, WhatsApp, or live agent handoff."
      }
    },
    {
      id: "it-support",
      title: "IT Support & Database Administration",
      sub: "SQL Admin · System Setup · Troubleshooting · Backups",
      icon: "settings",
      category: "Support & Operations",
      description:
        "Practical IT support, relational database administration, workstation setup, routine backups, and multi-departmental system troubleshooting.",
      deliverables: [
        "SQL Server, MySQL, and MS Access administration and maintenance",
        "Workstation, user account, and office software configuration",
        "Data backup routines and basic security hygiene checks",
        "Incident tracking and clear troubleshooting documentation"
      ],
      tools: ["SQL Server", "MySQL", "SQLite", "MS Access", "Windows/macOS", "Cloud Storage"],
      process: "System health check, issue triage and remediation, backup verification, and ongoing support cadence.",
      faq: {
        q: "Do you support remote troubleshooting as well as local setups?",
        a: "Yes. Most database administration, software setup, and technical support tasks are handled remotely, with on-site options in Bayelsa State."
      }
    },
    {
      id: "ai-content-creation-graphic-design",
      title: "AI-Powered Content Creation & Graphic Design",
      sub: "Brand Graphics · Report Layouts · Video & Visual Media",
      icon: "brush",
      category: "Creative & Media",
      description:
        "Clean brand graphics, presentation and report layouts, social media templates, and edited tutorial or explainer media enhanced with modern AI tools.",
      deliverables: [
        "Consistent brand graphics and reusable social media templates",
        "Executive presentation decks and visual report layouts",
        "Edited tutorial, demo, and promotional video assets",
        "Web-ready and print-ready exported source files"
      ],
      tools: ["Graphic Design Suites", "AI Creative Tools", "Video Editing Suites", "Presentation Tools"],
      process: "Brand brief, layout concepts, feedback revisions, and final multi-format asset export.",
      faq: {
        q: "Will we receive editable files or reusable templates?",
        a: "Yes. Projects include web-optimized exports along with reusable templates where agreed in scope."
      }
    }
  ],

  deliveryProcess: [
    {
      step: "01",
      title: "Discovery",
      detail: "Clarify business goals, audit existing data or web systems, confirm scope, and agree on measurable deliverables."
    },
    {
      step: "02",
      title: "Build",
      detail: "Implement clean architectures, validated data pipelines, dashboards, or web features with regular progress checkpoints."
    },
    {
      step: "03",
      title: "Delivery",
      detail: "Run quality assurance, accessibility and security checks, deploy to production, and provide clear handover guides."
    },
    {
      step: "04",
      title: "Support",
      detail: "Provide post-launch troubleshooting, staff walkthroughs, and iterative improvements as your needs evolve."
    }
  ],

  serviceScopeTable: [
    {
      track: "Full-Stack Web Development",
      stack: ["React.js", "Node.js", "JavaScript", "HTML/CSS", "WordPress", "SQL"],
      timeline: "Scoped during discovery",
      deliverables: "Responsive frontend & backend systems, client portals, database integration, handover documentation"
    },
    {
      track: "Data Analysis & Executive BI",
      stack: ["Power BI", "Tableau", "Python", "SQL", "R", "SPSS"],
      timeline: "Scoped during discovery",
      deliverables: "Cleaned & validated datasets, SQL views, interactive executive KPI dashboards, metric dictionary"
    },
    {
      track: "AI & Workflow Automation",
      stack: ["Python", "Pandas", "Scikit-Learn", "Excel VBA", "REST APIs"],
      timeline: "Scoped during discovery",
      deliverables: "Automated Excel VBA workbooks, scheduled Python ETL report scripts, API/webhook workflows"
    },
    {
      track: "Tech Training & Mentorship",
      stack: ["Python", "SQL", "Power BI", "Excel", "Git", "JavaScript"],
      timeline: "Flexible / Cohort",
      deliverables: "Hands-on coding workshops, staff data entry standards training, guided capstone exercises"
    },
    {
      track: "Customer & IT Support",
      stack: ["SQL Server", "MySQL", "MS Access", "Chatwoot", "CRM"],
      timeline: "On-demand / Retainer",
      deliverables: "Relational database maintenance, chat support workflows, workstation troubleshooting, backup checks"
    },
    {
      track: "AI Content & Graphic Design",
      stack: ["Design Suites", "Video Editing", "Presentation Layouts"],
      timeline: "Scoped during discovery",
      deliverables: "Brand visuals, executive report layouts, edited tutorial/demo videos, reusable templates"
    }
  ],

  coreProficiencies: [
    {
      category: "Data Analysis & Science",
      accent: "lime",
      skills: ["Python (Pandas, Scikit-Learn)", "R Programming", "SPSS", "Predictive Modeling", "Data Cleaning", "Data Validation", "Statistical Auditing"]
    },
    {
      category: "Business Intelligence",
      accent: "orange",
      skills: ["Power BI", "Tableau", "Advanced Microsoft Excel", "Formulas & Pivot Tables", "Macros & VBA Automation", "Executive Dashboard Design"]
    },
    {
      category: "Database Management",
      accent: "lime",
      skills: ["SQL", "SQL Server", "MySQL", "SQLite", "Microsoft Access", "Database Architecture"]
    },
    {
      category: "Web Development",
      accent: "orange",
      skills: ["Full-Stack Development", "React.js", "Node.js", "JavaScript / TypeScript", "HTML5 & CSS3", "WordPress"]
    },
    {
      category: "AI & Machine Learning",
      accent: "lime",
      skills: ["Machine Learning (Scikit-Learn)", "AI Ethics", "Workflow Automation", "AI-Assisted Support Flows"]
    },
    {
      category: "IT Support & Technical Media",
      accent: "orange",
      skills: ["Python ETL & Report Automation", "REST API Integration", "IT Systems & Database Support", "Technical Documentation & Training", "Graphic Design & Video Editing"]
    }
  ],

  experience: [
    {
      role: "Data Analyst",
      company: "SulPhil Tech Hub",
      location: "Yenagoa, Bayelsa State, Nigeria",
      period: "May 2021 – October 2024",
      highlights: [
        "Managed, cleaned, and analyzed complex datasets for client research projects, strengthening analytical accuracy and reporting clarity.",
        "Designed interactive Power BI and Tableau dashboards to communicate key performance metrics to executive stakeholders.",
        "Developed predictive models to forecast student performance outcomes and institutional resource allocation.",
        "Executed regular data audits and validation checks to enforce data quality standards.",
        "Trained and mentored interns in data analytics, Python/SQL querying, and practical technical workflows."
      ]
    },
    {
      role: "Data Processing Officer",
      company: "Feasibility Giant Company",
      location: "Yenagoa, Bayelsa State, Nigeria",
      period: "June 2019 – February 2021",
      highlights: [
        "Processed and managed high-volume datasets across multiple departments while maintaining data accuracy and reporting timelines.",
        "Automated repetitive data processing workflows using Excel VBA and custom scripts to cut manual report compilation effort.",
        "Administered and updated SQL databases to maintain data consistency across organizational units.",
        "Generated scheduled analytical reports tracking student performance, enrollment trends, and academic research metrics.",
        "Partnered with IT and administrative teams to deploy data management systems and train staff on data entry standards."
      ]
    }
  ],

  education: [
    {
      degree: "M.Sc. in Information Technology (In Progress)",
      institution: "National Open University of Nigeria (NOUN)",
      period: "2025 – Present",
      badge: "Postgraduate"
    },
    {
      degree: "B.Sc. in Computer Science",
      institution: "National Open University of Nigeria (NOUN)",
      period: "2017 – 2021",
      badge: "Bachelor's Honours"
    },
    {
      degree: "National Youth Service Corps (NYSC) Exclusion Letter",
      institution: "Federal Republic of Nigeria",
      period: "2025",
      badge: "Federal Credential"
    },
    {
      degree: "Senior Secondary School Certificate",
      institution: "Okpokunou Secondary School, Nigeria",
      period: "2000 – 2003",
      badge: "Secondary Education"
    }
  ],

  certifications: {
    verificationPlaceholder: "TODO(owner): Add public verification URLs for Google / Coursera / Kaggle certificates",
    googleCoursera: [
      "Google Advanced Data Analytics Professional Certificate",
      "Google Business Intelligence Professional Certificate",
      "Google Data Analytics Professional Certificate",
      "Google AI Professional Certificate & AI Essentials Specialization"
    ],
    kaggle: [
      "Machine Learning Specialization (Intro & Intermediate Machine Learning)",
      "Intro to Game AI & Reinforcement Learning",
      "Intro to AI Ethics",
      "Pandas & Python Programming"
    ]
  },

  competencies: [
    {
      title: "Data Governance & Quality Control",
      description: "End-to-end data validation, discrepancy resolution, and compliance auditing across multi-departmental databases."
    },
    {
      title: "Technical Instruction & Leadership",
      description: "Software implementation coordination, staff training on data management practices, and practical learner mentorship."
    },
    {
      title: "Cross-Functional Collaboration",
      description: "Working alongside IT teams, researchers, and executive stakeholders to translate raw datasets into clear strategic reports."
    }
  ],

  faqs: [
    {
      q: "Do you sign NDAs and maintain data confidentiality?",
      a: "Yes. We treat client data and source code confidentially and gladly sign Non-Disclosure Agreements (NDAs) prior to reviewing sensitive datasets or repositories."
    },
    {
      q: "Are you available for international and remote projects?",
      a: "Yes. YOLETECH is based in Yenagoa, Bayelsa State, Nigeria (WAT / UTC+1) and collaborates remotely with organizations and learners worldwide."
    },
    {
      q: "How quickly will I receive a response after submitting an inquiry?",
      a: "We respond to all project and training inquiries within 1 business day (24 hours on working days) with recommended next steps."
    },
    {
      q: "Can you audit, clean, or improve an existing spreadsheet, SQL database, or website?",
      a: "Yes. We audit existing spreadsheets, SQL databases, Power BI dashboards, and web platforms to fix data inconsistencies and automate manual workflows."
    }
  ],

  defaultPortfolio: [
    {
      id: "predicting-real-estate-prices-with-python-and-scikit-learn",
      slug: "predicting-real-estate-prices-with-python-and-scikit-learn",
      title: "Predicting Real Estate Prices with Python and Scikit-Learn",
      date: "2026-04-12",
      category: "Python & Machine Learning",
      organization: "YOLETECH Analytics Lab",
      period: "2026",
      preview_image: "/assets/blog/predicting-real-estate-prices-with-python-and-scikit-learn.png",
      demo_url: "https://house-price-prediction-system.streamlit.app/",
      live_url: "https://house-price-prediction-system.streamlit.app/",
      problem: "Manual property valuation across multi-feature housing tables is inconsistent and slow to compare across neighborhoods.",
      approach: "Built a reproducible Python and Scikit-Learn preprocessing and regression pipeline with feature engineering and an interactive Streamlit valuation interface.",
      outcome: "Public interactive demo deployed on Streamlit. TODO(owner): Add confirmed validation metrics (MAE / RMSE / R²) from your notebook.",
      impact_metrics: "Interactive Python & Scikit-Learn property valuation demo deployed on Streamlit",
      tech_stack: ["Python", "Scikit-Learn", "Pandas", "NumPy", "Streamlit"],
      featured: true,
      summary: "Predictive analytics and regression modeling system built with Python and Scikit-Learn to estimate residential property values from structural and neighborhood features."
    },
    {
      id: "automate-excel-reports-python-pandas",
      slug: "automate-excel-reports-python-pandas",
      title: "How to Automate Excel Reports Using Python and Pandas",
      date: "2026-04-12",
      category: "AI & Workflow Automation",
      organization: "YOLETECH Automation Lab",
      period: "2026",
      preview_image: "/assets/blog/automate-excel-sales-reports-with-python-and-pandas.png",
      demo_url: "/blog/how-to-automate-excel-reports-using-python-and-pandas",
      live_url: "/blog/how-to-automate-excel-reports-using-python-and-pandas",
      problem: "Recurring multi-sheet spreadsheet consolidation relies on fragile copy-paste steps that introduce formula and schema errors.",
      approach: "Implemented a scripted Python, Pandas, and OpenPyXL workflow that validates columns, computes summary tables, and exports formatted Excel reports.",
      outcome: "Repeatable scripted reporting workflow documented as a full walkthrough. TODO(owner): Add real client before/after hours saved if approved for sharing.",
      impact_metrics: "Repeatable Python, Pandas & OpenPyXL workbook generation workflow",
      tech_stack: ["Python", "Pandas", "OpenPyXL", "ETL Automation", "Excel"],
      featured: true,
      summary: "Automated Python and Pandas reporting pipeline that ingests operational spreadsheets, validates schema integrity, and exports formatted Excel workbooks."
    },
    {
      id: "housing-price-ml-app-python-streamlit",
      slug: "housing-price-ml-app-python-streamlit",
      title: "Interactive Housing Price ML App with Python & Streamlit",
      date: "2026-04-12",
      category: "Python & Machine Learning",
      organization: "YOLETECH Analytics Lab",
      period: "2026",
      preview_image: "/assets/blog/real-estate-ml-model.png",
      demo_url: "https://house-price-prediction-system.streamlit.app/",
      live_url: "https://house-price-prediction-system.streamlit.app/",
      problem: "Trained machine learning notebooks are difficult for non-technical stakeholders to test with real property inputs.",
      approach: "Packaged the trained Scikit-Learn pipeline into a responsive Streamlit web application with interactive input controls and visual diagnostics.",
      outcome: "Live browser-accessible Streamlit ML demo. TODO(owner): Add verified model benchmark metrics and dataset attribution.",
      impact_metrics: "Browser-based Scikit-Learn & Streamlit real estate prediction application",
      tech_stack: ["Python", "Scikit-Learn", "Streamlit", "Pandas", "Machine Learning"],
      featured: true,
      summary: "End-to-end machine learning workflow transforming housing datasets into an interactive Streamlit web app for property valuation exploration."
    },
    {
      id: "sales-dashboard-python-streamlit",
      slug: "sales-dashboard-python-streamlit",
      title: "Interactive Sales Dashboard with Python and Streamlit",
      date: "2026-04-11",
      category: "Data Analytics & BI",
      organization: "YOLETECH Analytics Lab",
      period: "2026",
      preview_image: "/assets/blog/streamlite-python-dashboard.png",
      demo_url: "https://sales-analytics-suite.streamlit.app/",
      live_url: "https://sales-analytics-suite.streamlit.app/",
      problem: "Static monthly sales spreadsheets make it hard for managers to filter performance by region, product line, or time range.",
      approach: "Engineered a Python, Pandas, Plotly, and Streamlit dashboard supporting CSV/Excel ingestion and multi-dimensional KPI filtering.",
      outcome: "Live interactive sales intelligence demo deployed on Streamlit. TODO(owner): Add real client adoption note if applicable.",
      impact_metrics: "Interactive multi-region KPI filtering & automated CSV/Excel ingestion",
      tech_stack: ["Python", "Streamlit", "Pandas", "Plotly", "Data Analytics"],
      featured: true,
      summary: "Interactive web-based sales intelligence application built with Python, Pandas, and Streamlit for real-time revenue and margin filtering."
    },
    {
      id: "executive-business-intelligence-sales-forecasting-platform",
      slug: "executive-business-intelligence-sales-forecasting-platform",
      title: "Executive Business Intelligence & Sales Forecasting Platform",
      date: "2026-04-08",
      category: "Data Analytics & BI",
      organization: "YOLETECH BI Reference Architecture",
      period: "2025 – 2026",
      preview_image: "/assets/blog/executive_bi_linkedin_carousel.png",
      demo_url: "https://sales-analytics-suite.streamlit.app/",
      live_url: "https://sales-analytics-suite.streamlit.app/",
      problem: "Leadership teams reviewing disconnected spreadsheets lack a single view of KPIs and forward revenue trends.",
      approach: "Combined SQL data modeling, automated Python ETL pipelines, and executive KPI dashboards with rolling time-series forecasting.",
      outcome: "Reference BI and forecasting architecture deployed as an interactive demo. TODO(owner): Replace with verified client results once approved.",
      impact_metrics: "SQL warehouse modeling, Python ETL & rolling forecast KPI scorecards",
      tech_stack: ["Power BI", "Python", "SQL", "Streamlit", "Time-Series Forecasting"],
      featured: true,
      summary: "Executive Business Intelligence and revenue forecasting architecture combining SQL modeling, Python ETL pipelines, and interactive KPI scorecards."
    }
  ]
};
