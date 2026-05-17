CREATE TYPE "public"."density" AS ENUM('compact', 'comfortable');--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"timezone" text NOT NULL,
	"density" "density" DEFAULT 'comfortable' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
