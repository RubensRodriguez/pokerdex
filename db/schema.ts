import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const densityEnum = pgEnum("density", ["compact", "comfortable"]);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  timezone: text("timezone").notNull(),
  density: densityEnum("density").notNull().default("comfortable"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserRow = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;

export const eventType = pgEnum("event_type", ["balance_update", "deposit", "withdrawal"]);

export const sites = pgTable(
  "sites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sites_user_archived_idx").on(t.userId, t.archived)],
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    type: eventType("type").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }),
    balance: numeric("balance", { precision: 14, scale: 2 }),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "events_shape_check",
      sql`(
        (${t.type} = 'balance_update' AND ${t.balance} IS NOT NULL AND ${t.amount} IS NULL)
        OR
        (${t.type} IN ('deposit', 'withdrawal') AND ${t.amount} IS NOT NULL AND ${t.balance} IS NULL)
      )`,
    ),
    index("events_chart_idx").on(t.userId, t.siteId, t.occurredAt),
    index("events_user_type_idx").on(t.userId, t.type, t.occurredAt),
  ],
);

export const images = pgTable(
  "images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storagePath: text("storage_path").notNull(),
    caption: text("caption"),
    attachedDate: date("attached_date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("images_user_date_idx").on(t.userId, t.attachedDate)],
);
