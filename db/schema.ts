import { pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

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
