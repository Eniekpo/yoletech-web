#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { runMigrations } = require('./migrate.js');

const DB_PATH = process.env.YOLETECH_DB_PATH || path.join(__dirname, '..', 'server', 'yoletech.db');

const DEFAULT_COURSES = [
  {
    title: 'Full-Stack Web Development',
    slug: 'full-stack-web-development',
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

const DEFAULT_PAGE_CONTENT = {
  headline: 'Practical Tech Training Built Around Real-World Skills',
  subheadline:
    'Explore structured training programs across every Yoletech discipline—from full-stack web development and data analytics to AI automation, IT support, and digital skills. Register below to reserve your place.',
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

function seedLearnDatabase(dbPath = DB_PATH) {
  runMigrations(dbPath);
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');

  const insertCourse = db.prepare(`
    INSERT OR IGNORE INTO courses
      (title, slug, short_description, outcomes_json, level, mode, duration, price, status, display_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let insertedCourses = 0;
  for (const c of DEFAULT_COURSES) {
    const res = insertCourse.run(
      c.title,
      c.slug,
      c.short_description,
      JSON.stringify(c.outcomes),
      c.level,
      c.mode,
      c.duration,
      c.price,
      c.status,
      c.display_order
    );
    if (res.changes > 0) insertedCourses += 1;
  }

  const existingContent = db.prepare('SELECT id FROM learn_page_content WHERE id = 1').get();
  let insertedContent = false;
  if (!existingContent) {
    db.prepare(`
      INSERT INTO learn_page_content (id, headline, subheadline, cta_label, faq_json)
      VALUES (1, ?, ?, ?, ?)
    `).run(
      DEFAULT_PAGE_CONTENT.headline,
      DEFAULT_PAGE_CONTENT.subheadline,
      DEFAULT_PAGE_CONTENT.cta_label,
      JSON.stringify(DEFAULT_PAGE_CONTENT.faq)
    );
    insertedContent = true;
  }

  const totalCourses = db.prepare('SELECT COUNT(*) as count FROM courses').get().count;
  db.close();
  return { dbPath, insertedCourses, totalCourses, insertedContent };
}

if (require.main === module) {
  const result = seedLearnDatabase();
  console.log(
    `Learn seed completed on ${result.dbPath}. Inserted ${result.insertedCourses} new course(s) (${result.totalCourses} total). Default page content ${
      result.insertedContent ? 'initialized' : 'already present'
    }.`
  );
}

module.exports = { seedLearnDatabase, DEFAULT_COURSES, DEFAULT_PAGE_CONTENT };
