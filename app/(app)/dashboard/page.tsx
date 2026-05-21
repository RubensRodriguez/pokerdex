import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { NewUpdateModal } from "@/components/new-update-modal";
import { getLastUpdate } from "@/lib/queries/events";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const siteId = process.env.SEED_SITE_ID;
  if (!siteId) {
    return <main className="p-8">SEED_SITE_ID non configurato.</main>;
  }

  const lastUpdate = await getLastUpdate(userId, siteId);

  return (
    <main className="p-8 space-y-4">
      <h1 className="text-xl font-semibold">POKERDEX</h1>
      <NewUpdateModal currentBalance={lastUpdate?.balance ?? null} />
      {lastUpdate && (
        <p className="text-sm text-text-dim">
          Ultimo aggiornamento:{" "}
          {new Intl.NumberFormat("it-IT", {
            style: "currency",
            currency: "EUR",
          }).format(lastUpdate.balance)}{" "}
          alle{" "}
          {lastUpdate.occurredAt.toLocaleTimeString("it-IT", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}
    </main>
  );
}
