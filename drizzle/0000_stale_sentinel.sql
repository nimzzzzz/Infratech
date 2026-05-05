CREATE TYPE "public"."app_status" AS ENUM('draft', 'pending_review', 'published', 'changes_requested', 'rejected', 'unpublished');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('pending', 'in_review', 'changes_requested', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."submission_type" AS ENUM('new', 'claim');--> statement-breakpoint
CREATE TYPE "public"."suggestion_status" AS ENUM('new', 'contacted', 'listed', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."admin_role" AS ENUM('admin', 'super_admin');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('unread', 'read', 'archived');--> statement-breakpoint
CREATE TABLE "capabilities" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"intro_md" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "industries" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_models" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regions" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stages" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"short_description" text,
	"intro_md" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_regions" (
	"vendor_id" integer NOT NULL,
	"region_id" integer NOT NULL,
	CONSTRAINT "vendor_regions_vendor_id_region_id_pk" PRIMARY KEY("vendor_id","region_id")
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"clerk_user_id" text,
	"name" text NOT NULL,
	"contact_email" text,
	"short_blurb" text,
	"description" text,
	"website_url" text,
	"linkedin_url" text,
	"founded_year" integer,
	"employee_band" text,
	"hq_country" text,
	"hq_city" text,
	"logo_url" text,
	"onboarded" boolean DEFAULT false NOT NULL,
	"suspended" boolean DEFAULT false NOT NULL,
	"claimed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_capabilities" (
	"app_id" integer NOT NULL,
	"capability_id" integer NOT NULL,
	CONSTRAINT "app_capabilities_app_id_capability_id_pk" PRIMARY KEY("app_id","capability_id")
);
--> statement-breakpoint
CREATE TABLE "app_industries" (
	"app_id" integer NOT NULL,
	"industry_id" integer NOT NULL,
	CONSTRAINT "app_industries_app_id_industry_id_pk" PRIMARY KEY("app_id","industry_id")
);
--> statement-breakpoint
CREATE TABLE "app_pricing_models" (
	"app_id" integer NOT NULL,
	"pricing_model_id" integer NOT NULL,
	CONSTRAINT "app_pricing_models_app_id_pricing_model_id_pk" PRIMARY KEY("app_id","pricing_model_id")
);
--> statement-breakpoint
CREATE TABLE "app_screenshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"app_id" integer NOT NULL,
	"url" text NOT NULL,
	"alt" text NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_stages" (
	"app_id" integer NOT NULL,
	"stage_id" integer NOT NULL,
	CONSTRAINT "app_stages_app_id_stage_id_pk" PRIMARY KEY("app_id","stage_id")
);
--> statement-breakpoint
CREATE TABLE "apps" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"vendor_id" integer NOT NULL,
	"name" text NOT NULL,
	"tagline" text,
	"description" text,
	"website_url" text NOT NULL,
	"logo_url" text,
	"founded_year" integer,
	"hq_location" text,
	"pricing_details" text,
	"integrations" text[] DEFAULT '{}'::text[] NOT NULL,
	"geographic_availability" text,
	"status" "app_status" DEFAULT 'draft' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"editor_note" text,
	"search_vector" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('english', coalesce(name, '')), 'A') || setweight(to_tsvector('english', coalesce(tagline, '')), 'B') || setweight(to_tsvector('english', coalesce(description, '')), 'C')) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "submission_type" NOT NULL,
	"status" "submission_status" DEFAULT 'pending' NOT NULL,
	"submitter_vendor_id" integer NOT NULL,
	"app_id" integer,
	"reviewer_admin_id" integer,
	"payload" jsonb NOT NULL,
	"review_notes" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"submitter_name" text NOT NULL,
	"submitter_email" text NOT NULL,
	"app_name" text NOT NULL,
	"app_url" text NOT NULL,
	"reason" text,
	"status" "suggestion_status" DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerk_user_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"role" "admin_role" DEFAULT 'admin' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" integer,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"app_id" integer NOT NULL,
	"vendor_id" integer NOT NULL,
	"sender_name" text NOT NULL,
	"sender_email" text NOT NULL,
	"sender_company" text,
	"sender_role" text,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"status" "message_status" DEFAULT 'unread' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_views" (
	"app_id" integer NOT NULL,
	"day" date NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "app_views_app_id_day_pk" PRIMARY KEY("app_id","day")
);
--> statement-breakpoint
CREATE TABLE "outbound_clicks" (
	"id" serial PRIMARY KEY NOT NULL,
	"app_id" integer NOT NULL,
	"clicked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_agent" text,
	"referrer" text
);
--> statement-breakpoint
ALTER TABLE "vendor_regions" ADD CONSTRAINT "vendor_regions_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_regions" ADD CONSTRAINT "vendor_regions_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_capabilities" ADD CONSTRAINT "app_capabilities_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_capabilities" ADD CONSTRAINT "app_capabilities_capability_id_capabilities_id_fk" FOREIGN KEY ("capability_id") REFERENCES "public"."capabilities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_industries" ADD CONSTRAINT "app_industries_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_industries" ADD CONSTRAINT "app_industries_industry_id_industries_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."industries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_pricing_models" ADD CONSTRAINT "app_pricing_models_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_pricing_models" ADD CONSTRAINT "app_pricing_models_pricing_model_id_pricing_models_id_fk" FOREIGN KEY ("pricing_model_id") REFERENCES "public"."pricing_models"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_screenshots" ADD CONSTRAINT "app_screenshots_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_stages" ADD CONSTRAINT "app_stages_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_stages" ADD CONSTRAINT "app_stages_stage_id_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apps" ADD CONSTRAINT "apps_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_submitter_vendor_id_vendors_id_fk" FOREIGN KEY ("submitter_vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_reviewer_admin_id_admins_id_fk" FOREIGN KEY ("reviewer_admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_views" ADD CONSTRAINT "app_views_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound_clicks" ADD CONSTRAINT "outbound_clicks_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_capabilities_slug" ON "capabilities" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_industries_slug" ON "industries" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_pricing_models_slug" ON "pricing_models" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_regions_slug" ON "regions" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_stages_slug" ON "stages" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_vendors_slug" ON "vendors" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_vendors_clerk_user_id" ON "vendors" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "ix_vendors_suspended" ON "vendors" USING btree ("suspended");--> statement-breakpoint
CREATE INDEX "ix_app_screenshots_app_id_position" ON "app_screenshots" USING btree ("app_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_apps_slug" ON "apps" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "ix_apps_status" ON "apps" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ix_apps_vendor_id" ON "apps" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "ix_apps_featured" ON "apps" USING btree ("featured");--> statement-breakpoint
CREATE INDEX "ix_apps_search_vector" ON "apps" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "ix_submissions_status_submitted_at" ON "submissions" USING btree ("status","submitted_at");--> statement-breakpoint
CREATE INDEX "ix_submissions_submitter" ON "submissions" USING btree ("submitter_vendor_id");--> statement-breakpoint
CREATE INDEX "ix_suggestions_status_created" ON "suggestions" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_admins_clerk_user_id" ON "admins" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ux_admins_email" ON "admins" USING btree ("email");--> statement-breakpoint
CREATE INDEX "ix_audit_target" ON "audit_log" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "ix_audit_admin_created" ON "audit_log" USING btree ("admin_id","created_at");--> statement-breakpoint
CREATE INDEX "ix_contact_messages_vendor_status" ON "contact_messages" USING btree ("vendor_id","status");--> statement-breakpoint
CREATE INDEX "ix_contact_messages_app_id" ON "contact_messages" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "ix_outbound_app_clicked" ON "outbound_clicks" USING btree ("app_id","clicked_at");