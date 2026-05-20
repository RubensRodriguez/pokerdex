import { auth } from "@clerk/nextjs/server";
import { count, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { events, images, sites, users } from "@/db/schema";
import { withUser } from "@/db/with-user";

export default async function HomePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // users: no RLS. Counting the current user's own row as a sanity check
  // that the webhook ran and the local row exists.
  const [userRow] = await db.select({ n: count() }).from(users).where(eq(users.id, userId));

  // sites/events/images: RLS-protected. Application-layer filter still
  // present per architecture contract; RLS is the safety net.
  const counts = await withUser(userId, async (tx) => {
    const [s] = await tx.select({ n: count() }).from(sites).where(eq(sites.userId, userId));
    const [e] = await tx.select({ n: count() }).from(events).where(eq(events.userId, userId));
    const [i] = await tx.select({ n: count() }).from(images).where(eq(images.userId, userId));
    return { sites: s?.n ?? 0, events: e?.n ?? 0, images: i?.n ?? 0 };
  });

  return (
    <main className="p-8 font-mono">
      <h1 className="text-2xl mb-6">POKERDEX</h1>
      <ul className="space-y-1">
        <li>users (you): {userRow?.n ?? 0}</li>
        <li>sites: {counts.sites}</li>
        <li>events: {counts.events}</li>
        <li>images: {counts.images}</li>
      </ul>
    </main>
  );
}
