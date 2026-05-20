import { eq } from "drizzle-orm";

import { db } from "@/db";
import { sites, users } from "@/db/schema";
import { withUser } from "@/db/with-user";

const USER_A = "rls_test_user_a";
const USER_B = "rls_test_user_b";

async function seed() {
  await db
    .insert(users)
    .values([
      {
        id: USER_A,
        email: "a@test.invalid",
        timezone: "Europe/Rome",
        density: "comfortable",
      },
      {
        id: USER_B,
        email: "b@test.invalid",
        timezone: "Europe/Rome",
        density: "comfortable",
      },
    ])
    .onConflictDoNothing();

  await db.insert(sites).values([
    { userId: USER_A, name: "Site A1" },
    { userId: USER_A, name: "Site A2" },
    { userId: USER_B, name: "Site B1" },
  ]);
}

async function cleanup() {
  // Cascade removes sites.
  await db.delete(users).where(eq(users.id, USER_A));
  await db.delete(users).where(eq(users.id, USER_B));
}

async function main() {
  console.log("verify-rls: seeding…");
  await seed();

  // Sanity: as user A, see exactly 2 sites.
  const aSees = await withUser(USER_A, (tx) => tx.select().from(sites));
  if (aSees.length !== 2) {
    throw new Error(`Expected user A to see 2 sites; saw ${aSees.length}`);
  }
  console.log(`verify-rls: user A sees ${aSees.length} sites ✓`);

  // The real test: as user B, with NO application-layer filter,
  // ask for every row in sites. RLS must restrict the result
  // to B's rows only.
  const bSees = await withUser(USER_B, (tx) => tx.select().from(sites));
  const leaked = bSees.filter((r) => r.userId === USER_A);
  if (leaked.length > 0) {
    throw new Error(`RLS LEAK: user B saw ${leaked.length} row(s) belonging to user A`);
  }
  console.log(`verify-rls: user B sees ${bSees.length} sites, 0 leaked from A ✓`);

  // Additionally: user B attempting to INSERT a row claiming user A's ID
  // must be blocked by the policy's WITH CHECK clause.
  let insertBlocked = false;
  try {
    await withUser(USER_B, (tx) =>
      tx.insert(sites).values({ userId: USER_A, name: "Forged by B" }),
    );
  } catch {
    insertBlocked = true;
  }
  if (!insertBlocked) {
    throw new Error("RLS LEAK: user B was able to insert a row as user A");
  }
  console.log("verify-rls: cross-user INSERT was blocked ✓");

  console.log("verify-rls: cleaning up…");
  await cleanup();

  console.log("\nverify-rls: ALL CHECKS PASSED");
}

main().catch(async (err) => {
  console.error("\nverify-rls: FAILED");
  console.error(err);
  await cleanup().catch(() => {});
  process.exit(1);
});
