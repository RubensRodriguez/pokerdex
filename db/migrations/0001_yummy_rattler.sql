CREATE TYPE "public"."event_type" AS ENUM('balance_update', 'deposit', 'withdrawal');--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"site_id" uuid NOT NULL,
	"type" "event_type" NOT NULL,
	"amount" numeric(14, 2),
	"balance" numeric(14, 2),
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_shape_check" CHECK ((
        ("events"."type" = 'balance_update' AND "events"."balance" IS NOT NULL AND "events"."amount" IS NULL)
        OR
        ("events"."type" IN ('deposit', 'withdrawal') AND "events"."amount" IS NOT NULL AND "events"."balance" IS NULL)
      ))
);
--> statement-breakpoint
CREATE TABLE "images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"storage_path" text NOT NULL,
	"caption" text,
	"attached_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "images_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_chart_idx" ON "events" USING btree ("user_id","site_id","occurred_at");--> statement-breakpoint
CREATE INDEX "events_user_type_idx" ON "events" USING btree ("user_id","type","occurred_at");--> statement-breakpoint
CREATE INDEX "images_user_date_idx" ON "images" USING btree ("user_id","attached_date");--> statement-breakpoint
CREATE INDEX "sites_user_archived_idx" ON "sites" USING btree ("user_id","archived");

-- 1. Enable RLS on the three protected tables.
ALTER TABLE sites  ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;

-- 2. user_owns_row policy on each table.
-- Reads the Clerk user ID from the request-scoped session setting.
-- Both USING (read/update/delete visibility) and WITH CHECK (insert/update validity)
-- are enforced.

CREATE POLICY user_owns_row ON sites
  FOR ALL
  USING  (user_id = current_setting('request.jwt.claims', true)::json->>'sub')
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY user_owns_row ON events
  FOR ALL
  USING  (user_id = current_setting('request.jwt.claims', true)::json->>'sub')
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY user_owns_row ON images
  FOR ALL
  USING  (user_id = current_setting('request.jwt.claims', true)::json->>'sub')
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- 3. Grants. Supabase's `authenticated` role typically already has these on
-- public tables, but assert them explicitly so the migration is self-contained.
GRANT SELECT, INSERT, UPDATE, DELETE ON sites  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON images TO authenticated;