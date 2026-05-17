import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

config({ path: ".env.local" });

// DATABASE_URL_DIRECT (db.[ref].supabase.co) may be unreachable on some networks
// (DNS propagation delay, IPv6-only routing). The session-mode pooler (DATABASE_URL,
// port 5432) resolves reliably and supports all SQL operations migrations need.
const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set");
}

const client = postgres(url, { max: 1, prepare: false });
const db = drizzle(client);

void (async () => {
  try {
    await migrate(db, { migrationsFolder: "./db/migrations" });
    console.log("Migration applied successfully.");
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
