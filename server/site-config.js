'use strict';

const CANONICAL_HOST = 'www.yolestica.com';
const CANONICAL_ORIGIN = `https://${CANONICAL_HOST}`;

const OWNER = {
  name: 'John Oruebi Eniekpo',
  credentials: 'B.Sc. Computer Science (M.Sc. IT in progress)',
  jobTitle: 'Data Analyst, Business Intelligence Specialist & Full-Stack Web Developer',
  location: 'Yenagoa, Bayelsa State, Nigeria',
  serviceArea: 'Yenagoa, Bayelsa State, Nigeria & Remote Worldwide',
  locationUrl: 'https://www.google.com/maps/search/?api=1&query=Yenagoa%2C+Bayelsa+State%2C+Nigeria',
  email: 'yoletech@yolestica.com',
  phoneDisplay: '+234 802 552 6389',
  phoneE164: '+2348025526389',
  whatsappUrl: 'https://wa.me/2348025526389',
  bookingUrlPlaceholder: 'TODO(owner): Add your Calendly or Cal.com discovery call booking URL',
  workingHours: 'Monday – Friday, 9:00 AM – 6:00 PM WAT (UTC+1)',
  responseTimeStatement: 'We respond to all project and training inquiries within 1 business day (24 hours on working days).',
  socials: {
    github: 'https://github.com/Eniekpo',
    linkedin: 'https://linkedin.com/in/yolestica',
    kaggle: 'https://kaggle.com/Yoletech',
    youtube: 'https://youtube.com/@yole-tech',
    facebook: 'https://facebook.com/Yoletech',
    whatsapp: 'https://wa.me/2348025526389'
  },
  bio: 'Founder of YOLETECH, focused on data analytics, executive business intelligence, workflow automation, full-stack web engineering, and practical technology training.'
};

const CORE_SERVICES = [
  {
    id: 'full-stack-web-development',
    title: 'Full-Stack Web Development',
    shortTag: 'React.js · Node.js · JavaScript · SQL · WordPress',
    scope: 'Custom websites, role-based client portals, web applications, and relational database backends built for speed, security, and maintainability.',
    deliverables: [
      'Responsive frontend interfaces with WCAG 2.1 AA accessibility',
      'REST API backends with server-side validation and secure authentication',
      'Relational SQL database design and parameterized queries',
      'Production deployment, SSL setup, and handover documentation'
    ],
    tools: ['JavaScript', 'TypeScript', 'React.js', 'Node.js', 'HTML5/CSS3', 'SQL', 'WordPress'],
    process: 'Discovery and architecture wireframing, iterative frontend/backend development, QA testing, and documented launch.',
    faq: {
      q: 'Can you modernize an existing website or build a custom client portal from scratch?',
      a: 'Yes. We audit existing sites for performance, SEO, and usability or architect new full-stack applications tailored to your workflow.'
    }
  },
  {
    id: 'data-analysis-executive-bi',
    title: 'Data Analysis & Executive BI',
    shortTag: 'Power BI · Tableau · Python · SQL · Excel · SPSS',
    scope: 'Structured data cleaning, statistical auditing, KPI modeling, and interactive Power BI and Tableau dashboards built for clear leadership decisions.',
    deliverables: [
      'Cleaned, validated, and documented datasets',
      'SQL reporting views and KPI data models',
      'Interactive Power BI and Tableau executive dashboards',
      'Stakeholder walkthrough and metric dictionary'
    ],
    tools: ['Power BI', 'Tableau', 'Python (Pandas)', 'SQL', 'Microsoft Excel', 'R', 'SPSS'],
    process: 'Data source audit, cleaning and validation rules, KPI modeling, dashboard build, and executive review.',
    faq: {
      q: 'What data sources can be connected to my BI dashboard?',
      a: 'We work with Excel/CSV files, SQL Server, MySQL, PostgreSQL, SQLite, and REST APIs, standardizing schemas before visualization.'
    }
  },
  {
    id: 'ai-workflow-automation',
    title: 'AI & Workflow Automation',
    shortTag: 'Python ETL · Excel VBA · APIs · AI Workflows',
    scope: 'Automated reporting pipelines, scheduled Python scripts, Excel VBA macros, and AI-assisted operational workflows that eliminate repetitive manual tasks.',
    deliverables: [
      'Process audit identifying high-effort manual bottlenecks',
      'Automated Python/SQL ETL pipelines or Excel VBA workbooks',
      'API and webhook integrations connecting forms, sheets, and email',
      'Error handling, logging, and team handover guides'
    ],
    tools: ['Python', 'Pandas', 'OpenPyXL', 'Excel VBA', 'Node.js', 'REST APIs', 'Scikit-Learn'],
    process: 'Workflow mapping, prototype automation on real sample files, edge-case testing, and scheduled rollout.',
    faq: {
      q: 'Will my team be able to run the automation without writing code?',
      a: 'Yes. Automations are delivered with one-click triggers or scheduled runs plus clear step-by-step operating instructions.'
    }
  },
  {
    id: 'tech-training-mentorship',
    title: 'Tech Training & Mentorship',
    shortTag: 'Python · SQL · Power BI · Excel · Web Dev',
    scope: 'Structured, hands-on training programs and staff upskilling in data analytics, SQL, Python, business intelligence, and practical web engineering.',
    deliverables: [
      'Structured curriculum with guided practical exercises',
      'Hands-on project feedback and code/dashboard reviews',
      'Corporate staff data-standards and reporting workshops',
      'Self-paced reference materials and templates'
    ],
    tools: ['Python', 'SQL', 'Power BI', 'Microsoft Excel', 'Git', 'JavaScript'],
    process: 'Skill-level assessment, structured module delivery, guided capstone projects, and progress check-ins.',
    faq: {
      q: 'Do beginners need prior coding experience to enroll?',
      a: 'No. Beginner tracks start with foundational concepts and build step by step through practical exercises.'
    }
  },
  {
    id: 'customer-support-solutions',
    title: 'Customer Support Solutions',
    shortTag: 'AI Assistants · Chatbots · Help Desk Workflows',
    scope: 'Structured customer support workflows, FAQ knowledge bases, and AI-assisted chat experiences configured with clear escalation to human agents.',
    deliverables: [
      'Organized FAQ and support knowledge base structure',
      'Web chat widget and automated triage workflows',
      'Human handoff rules for complex customer inquiries',
      'Response quality review and workflow documentation'
    ],
    tools: ['Chatwoot', 'Node.js', 'Webhooks', 'WhatsApp Business', 'CRM Workflows'],
    process: 'Common inquiry audit, knowledge base setup, chat flow integration, escalation testing, and live monitoring.',
    faq: {
      q: 'Can customers still reach a real person when a chatbot cannot help?',
      a: 'Yes. Every support setup includes clear escalation paths to email, WhatsApp, or live agent handoff.'
    }
  },
  {
    id: 'it-support',
    title: 'IT Support & Database Administration',
    shortTag: 'SQL Admin · System Setup · Troubleshooting · Backups',
    scope: 'Practical IT support, relational database administration, workstation setup, routine backups, and multi-departmental system troubleshooting.',
    deliverables: [
      'SQL Server, MySQL, and MS Access administration and maintenance',
      'Workstation, user account, and office software configuration',
      'Data backup routines and basic security hygiene checks',
      'Incident tracking and clear troubleshooting documentation'
    ],
    tools: ['SQL Server', 'MySQL', 'SQLite', 'MS Access', 'Windows/macOS', 'Cloud Storage'],
    process: 'System health check, issue triage and remediation, backup verification, and ongoing support cadence.',
    faq: {
      q: 'Do you support remote troubleshooting as well as local setups?',
      a: 'Yes. Most database administration, software setup, and technical support tasks are handled remotely, with on-site options in Bayelsa State.'
    }
  },
  {
    id: 'ai-content-creation-graphic-design',
    title: 'AI-Powered Content Creation & Graphic Design',
    shortTag: 'Brand Graphics · Report Layouts · Video & Visual Media',
    scope: 'Clean brand graphics, presentation and report layouts, social media templates, and edited tutorial or explainer media enhanced with modern AI tools.',
    deliverables: [
      'Consistent brand graphics and reusable social media templates',
      'Executive presentation decks and visual report layouts',
      'Edited tutorial, demo, and promotional video assets',
      'Web-ready and print-ready exported source files'
    ],
    tools: ['Graphic Design Suites', 'AI Creative Tools', 'Video Editing Suites', 'Presentation Tools'],
    process: 'Brand brief, layout concepts, feedback revisions, and final multi-format asset export.',
    faq: {
      q: 'Will we receive editable files or reusable templates?',
      a: 'Yes. Projects include web-optimized exports along with reusable templates where agreed in scope.'
    }
  }
];

const DELIVERY_PROCESS = [
  {
    step: '01',
    title: 'Discovery',
    detail: 'Clarify business goals, audit existing data or web systems, confirm scope, and agree on measurable deliverables.'
  },
  {
    step: '02',
    title: 'Build',
    detail: 'Implement clean architectures, validated data pipelines, dashboards, or web features with regular progress checkpoints.'
  },
  {
    step: '03',
    title: 'Delivery',
    detail: 'Run quality assurance, accessibility and security checks, deploy to production, and provide clear handover guides.'
  },
  {
    step: '04',
    title: 'Support',
    detail: 'Provide post-launch troubleshooting, staff walkthroughs, and iterative improvements as your needs evolve.'
  }
];

const CONTACT_FAQS = [
  {
    q: 'Do you sign NDAs and maintain data confidentiality?',
    a: 'Yes. We treat client data and source code confidentially and can sign a Non-Disclosure Agreement (NDA) before reviewing sensitive files.'
  },
  {
    q: 'Do you work with international and remote clients?',
    a: 'Yes. YOLETECH is based in Yenagoa, Bayelsa State, Nigeria (WAT / UTC+1) and collaborates remotely with organizations and learners worldwide.'
  },
  {
    q: 'How quickly will I receive a response after submitting the contact form?',
    a: 'All inquiries receive a direct response within 1 business day (24 hours on working days) with recommended next steps.'
  },
  {
    q: 'Can you audit or improve an existing spreadsheet, dashboard, or website?',
    a: 'Yes. We regularly audit existing spreadsheets, SQL databases, Power BI reports, and web applications to fix errors and automate manual steps.'
  }
];

const PRIMARY_NAV = [
  { id: 'home', path: '/', label: 'Home' },
  { id: 'services', path: '/services', label: 'Services' },
  { id: 'portfolio', path: '/portfolio', label: 'Portfolio' },
  { id: 'learn', path: '/learn', label: 'Learn' },
  { id: 'blog', path: '/blog', label: 'Blog' },
  { id: 'about', path: '/about', label: 'About' },
  { id: 'contact', path: '/contact', label: 'Contact' }
];

const LEGACY_QUERY_REDIRECTS = {
  home: '/',
  about: '/about',
  services: '/services',
  portfolio: '/portfolio',
  learn: '/learn',
  'learn-dashboard': '/learn/dashboard',
  blog: '/blog',
  contact: '/contact',
  login: '/login',
  register: '/register',
  signup: '/register',
  portal: '/portal',
  dashboard: '/dashboard',
  'admin-dashboard': '/admin-dashboard',
  testimonials: '/testimonials',
  privacy: '/privacy',
  terms: '/terms',
  cookies: '/cookies'
};

const BLOG_SLUG_REDIRECTS = {
  'from-housing-data-to-an-interactive-ml-app-predicting-real-estate-prices-with-python-scikit-learn-and-streamlit':
    'housing-price-ml-app-python-streamlit',
  'thomas-edison-the-inventor-who-made-electric-lighting-practical-for-the-modern-world':
    'thomas-edison-electric-lighting',
  'radia-perlman-the-engineer-who-solved-one-of-ethernets-biggest-networking-problems':
    'radia-perlman-spanning-tree-protocol',
  'margaret-hamilton-the-software-engineer-whose-code-helped-take-humans-to-the-moon':
    'margaret-hamilton-apollo-software',
  'frances-allen-the-computer-scientist-who-helped-make-software-run-faster':
    'frances-allen-compiler-optimization',
  'automating-customer-support-node-js-whatsapp-and-email-alerts':
    'automate-customer-support-nodejs-whatsapp',
  'building-a-fast-client-booking-portal-with-next-js-and-supabase':
    'client-booking-portal-nextjs-supabase',
  'build-an-interactive-sales-dashboard-with-python-and-streamlit':
    'sales-dashboard-python-streamlit',
  'technology-updates-12-november-2026': 'tech-news-weekly-digest-nov-2026',
  'yoletech-tech-news-13-november-2026': 'tech-news-weekly-digest-nov-2026'
};

module.exports = {
  CANONICAL_HOST,
  CANONICAL_ORIGIN,
  OWNER,
  CORE_SERVICES,
  DELIVERY_PROCESS,
  CONTACT_FAQS,
  PRIMARY_NAV,
  LEGACY_QUERY_REDIRECTS,
  BLOG_SLUG_REDIRECTS
};
