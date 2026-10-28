CREATE TABLE "inquiries" (
	"id" serial PRIMARY KEY,
	"user_id" integer,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text DEFAULT '',
	"service_category" text NOT NULL,
	"budget" text DEFAULT '$1,500 - $5,000',
	"message" text NOT NULL,
	"status" text DEFAULT 'NEW',
	"project_progress" integer DEFAULT 15,
	"admin_response" text DEFAULT '',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "portfolio_projects" (
	"id" serial PRIMARY KEY,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"organization" text NOT NULL,
	"period" text NOT NULL,
	"summary" text NOT NULL,
	"impact_metrics" text NOT NULL,
	"tech_stack" text NOT NULL,
	"preview_image" text NOT NULL,
	"live_url" text DEFAULT '',
	"github_url" text DEFAULT 'https://github.com/Eniekpo',
	"featured" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "testimonials" (
	"id" serial PRIMARY KEY,
	"author_name" text NOT NULL,
	"author_role" text NOT NULL,
	"company" text NOT NULL,
	"service_track" text NOT NULL,
	"rating" integer DEFAULT 5,
	"content" text NOT NULL,
	"approved" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"password_hash" text NOT NULL,
	"phone" text DEFAULT '',
	"company" text DEFAULT '',
	"service_interest" text DEFAULT 'Data Analytics & BI',
	"role" text DEFAULT 'CLIENT',
	"status" text DEFAULT 'ACTIVE',
	"admin_notes" text DEFAULT '',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");