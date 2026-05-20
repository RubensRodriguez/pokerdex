import { headers } from "next/headers";
import { Webhook } from "svix";

import { createUserFromClerk, deleteUserFromClerk } from "@/lib/queries/users";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error("clerk-webhook: CLERK_WEBHOOK_SECRET not set");
    return new Response("Server misconfigured", { status: 500 });
  }

  const h = await headers();
  const svixId = h.get("svix-id");
  const svixTimestamp = h.get("svix-timestamp");
  const svixSignature = h.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing Svix headers", { status: 400 });
  }

  const body = await req.text();

  let event: unknown;
  try {
    const wh = new Webhook(secret);
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch (err) {
    console.warn("clerk-webhook: signature verification failed", err);
    return new Response("Invalid signature", { status: 400 });
  }

  const e = event as { type?: string; data?: unknown };
  if (!e?.type || !e?.data) {
    return new Response("Malformed payload", { status: 400 });
  }

  try {
    switch (e.type) {
      case "user.created": {
        const data = e.data as {
          id?: string;
          primary_email_address_id?: string;
          email_addresses?: Array<{ id: string; email_address: string }>;
        };
        const clerkUserId = data.id;
        const primaryId = data.primary_email_address_id;
        const emails = data.email_addresses ?? [];
        const primary = emails.find((x) => x.id === primaryId);

        if (!clerkUserId || !primary?.email_address) {
          return new Response("Missing user id or primary email", {
            status: 400,
          });
        }

        await createUserFromClerk({
          clerkUserId,
          email: primary.email_address,
        });
        break;
      }

      case "user.deleted": {
        const data = e.data as { id?: string };
        const clerkUserId = data.id;
        if (!clerkUserId) {
          return new Response("Missing user id", { status: 400 });
        }
        await deleteUserFromClerk(clerkUserId);
        break;
      }

      default:
        console.log(`clerk-webhook: ignored event type ${e.type}`);
        break;
    }
  } catch (err) {
    console.error("clerk-webhook: handler error", err);
    return new Response("Internal error", { status: 500 });
  }

  return new Response(null, { status: 200 });
}
