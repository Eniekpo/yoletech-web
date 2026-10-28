import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  phone: text("phone").default(""),
  company: text("company").default(""),
  serviceInterest: text("service_interest").default("Data Analytics & BI"),
  role: text("role").default("CLIENT"),
  status: text("status").default("ACTIVE"),
  adminNotes: text("admin_notes").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const inquiries = pgTable("inquiries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").default(""),
  serviceCategory: text("service_category").notNull(),
  budget: text("budget").default("$1,500 - $5,000"),
  message: text("message").notNull(),
  status: text("status").default("NEW"),
  projectProgress: integer("project_progress").default(15),
  adminResponse: text("admin_response").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const portfolioProjects = pgTable("portfolio_projects", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  organization: text("organization").notNull(),
  period: text("period").notNull(),
  summary: text("summary").notNull(),
  impactMetrics: text("impact_metrics").notNull(),
  techStack: text("tech_stack").notNull(),
  previewImage: text("preview_image").notNull(),
  liveUrl: text("live_url").default(""),
  githubUrl: text("github_url").default("https://github.com/Eniekpo"),
  featured: integer("featured").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const testimonials = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  authorName: text("author_name").notNull(),
  authorRole: text("author_role").notNull(),
  company: text("company").notNull(),
  serviceTrack: text("service_track").notNull(),
  rating: integer("rating").default(5),
  content: text("content").notNull(),
  approved: integer("approved").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});
