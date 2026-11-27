export type CourseMode = 'online' | 'in-person' | 'hybrid';
export type CourseStatus = 'draft' | 'published';
export type EnrollmentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
export type LearnerGender = 'Male' | 'Female' | 'Prefer not to say';

export interface LearnFaqItem {
  question: string;
  answer: string;
}

export interface SeedCourseInput {
  title: string;
  slug: string;
  image_url: string;
  short_description: string;
  outcomes: string[];
  level: string;
  mode: CourseMode;
  duration: string;
  price: string;
  status: CourseStatus;
  display_order: number;
}

export interface LearnPageContentData {
  headline: string;
  subheadline: string;
  cta_label: string;
  faq: LearnFaqItem[];
  updated_at?: string;
}

export const DEFAULT_SEED_COURSES: SeedCourseInput[] = [
  {
    title: 'Full-Stack Web Development',
    slug: 'full-stack-web-development',
    image_url: '/assets/code-sync-preview.jpg',
    short_description:
      'Build responsive web applications from user interfaces to backend APIs and relational databases through guided, hands-on projects.',
    outcomes: [
      'Structure accessible HTML, modern CSS, and interactive JavaScript interfaces',
      'Design and build RESTful backend endpoints with server-side validation',
      'Model relational database tables and write safe parameterized queries',
      'Deploy and maintain a working web application from development to production'
    ],
    level: 'Beginner to Intermediate',
    mode: 'hybrid',
    duration: '',
    price: '',
    status: 'published',
    display_order: 1
  },
  {
    title: 'Data Analysis and Business Intelligence',
    slug: 'data-analysis-and-business-intelligence',
    image_url: '/assets/dashboard-preview.jpg',
    short_description:
      'Learn how to clean, analyze, and turn raw spreadsheets and database tables into clear dashboards and decision-ready reports.',
    outcomes: [
      'Clean, transform, and validate structured datasets with spreadsheets, SQL, and Python',
      'Write SQL queries to aggregate, filter, and join multi-table business data',
      'Build interactive dashboards and KPI summaries in BI tools',
      'Communicate analytical findings clearly to non-technical stakeholders'
    ],
    level: 'Beginner to Intermediate',
    mode: 'hybrid',
    duration: '',
    price: '',
    status: 'published',
    display_order: 2
  },
  {
    title: 'AI Automation',
    slug: 'ai-automation',
    image_url: '/assets/workflow-diagram.jpg',
    short_description:
      'Streamline repetitive business tasks by connecting APIs, scripts, and AI-assisted workflows to save manual effort and reduce errors.',
    outcomes: [
      'Map manual operational processes and identify practical automation opportunities',
      'Build reliable workflow automations connecting forms, spreadsheets, email, and APIs',
      'Use AI prompts and structured outputs safely inside repeatable tasks',
      'Monitor, test, and maintain automated pipelines with clear error handling'
    ],
    level: 'Intermediate',
    mode: 'online',
    duration: '',
    price: '',
    status: 'published',
    display_order: 3
  },
  {
    title: 'Customer Support Solutions (AI assistants and chatbots)',
    slug: 'customer-support-solutions-ai-assistants-and-chatbots',
    image_url: '/assets/about-analytics-workspace.jpg',
    short_description:
      'Design helpful customer support workflows, knowledge bases, and AI-assisted chat experiences with clear human handoff.',
    outcomes: [
      'Organize FAQs and help documentation into structured support knowledge bases',
      'Configure conversational assistants and chat flows for common customer requests',
      'Set up escalation rules and human handoff paths for complex inquiries',
      'Review support conversations to improve response clarity and reliability'
    ],
    level: 'Beginner to Intermediate',
    mode: 'online',
    duration: '',
    price: '',
    status: 'published',
    display_order: 4
  },
  {
    title: 'IT Support',
    slug: 'it-support',
    image_url: '/assets/home-hero-analyst.jpg',
    short_description:
      'Develop practical skills in workstation setup, networking basics, system troubleshooting, backups, and everyday technical support.',
    outcomes: [
      'Diagnose and resolve common hardware, operating system, and software issues',
      'Configure user accounts, local networks, and core office productivity tools',
      'Apply foundational security hygiene, updates, and data backup practices',
      'Document incidents and communicate clearly when assisting end users'
    ],
    level: 'Beginner',
    mode: 'hybrid',
    duration: '',
    price: '',
    status: 'published',
    display_order: 5
  },
  {
    title: 'AI-Powered Content Creation and Graphic Design',
    slug: 'ai-powered-content-creation-and-graphic-design',
    image_url: '/assets/yoletech-hero-banner.png',
    short_description:
      'Combine core visual design principles with modern AI-assisted tools to produce consistent brand graphics, layouts, and digital media.',
    outcomes: [
      'Apply typography, color contrast, and layout hierarchy across digital assets',
      'Use AI-assisted ideation and editing tools responsibly within a creative workflow',
      'Create reusable templates for social media, presentations, and web visuals',
      'Prepare and export clean design files for web and print formats'
    ],
    level: 'Beginner',
    mode: 'online',
    duration: '',
    price: '',
    status: 'published',
    display_order: 6
  },
  {
    title: 'Tech Tutorials (general tech skills)',
    slug: 'tech-tutorials-general-tech-skills',
    image_url: '/assets/about-analytics-workspace.jpg',
    short_description:
      'Strengthen everyday digital fluency—from productivity suites and cloud collaboration to basic troubleshooting and safe online habits.',
    outcomes: [
      'Work confidently with spreadsheets, documents, email, and cloud storage',
      'Organize files, collaborate online, and manage digital workflows efficiently',
      'Practice account security, password hygiene, and safe browsing habits',
      'Build a foundation for transitioning into specialized technical tracks'
    ],
    level: 'Beginner',
    mode: 'hybrid',
    duration: '',
    price: '',
    status: 'published',
    display_order: 7
  }
];

export const LEGACY_DEFAULT_LEARN_HEADLINE = 'Practical Tech Training Built Around Real-World Skills';
export const LEGACY_DEFAULT_LEARN_SUBHEADLINE =
  'Explore structured training programs across every Yoletech discipline—from full-stack web development and data analytics to AI automation, IT support, and digital skills. Register below to reserve your place.';

export const DEFAULT_LEARN_PAGE_CONTENT: LearnPageContentData = {
  headline: 'Build In-Demand Tech Skills. Learn by Doing.',
  subheadline:
    'Hands-on training in web development, data analytics, AI automation, and IT—guided step by step from day one.',
  cta_label: 'Register Now',
  faq: [
    {
      question: 'Who can register for a Yoletech training program?',
      answer:
        'Programs are open to beginners, students, career switchers, and working professionals who want practical, guided training in technology and digital operations.'
    },
    {
      question: 'How are sessions delivered?',
      answer:
        'Delivery mode depends on the selected course and may be online, in-person, or hybrid. Specific schedule details are shared after your registration is reviewed.'
    },
    {
      question: 'What happens after I submit the registration form?',
      answer:
        'Your learner account is created immediately and your enrollment starts in Pending status. You can sign in to your learner dashboard anytime to check your status while the Yoletech team reviews your application.'
    },
    {
      question: 'Do I need prior technical experience before registering?',
      answer:
        'Not for beginner tracks. Each course card shows its intended level so you can choose a program that fits your current background.'
    }
  ]
};
