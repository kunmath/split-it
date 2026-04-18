import { httpRouter } from "convex/server";
import { Webhook } from "svix";

import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

type ClerkEmailAddress = {
  email_address?: string | null;
  id?: string | null;
};

type ClerkUserWebhookData = {
  email_addresses?: ClerkEmailAddress[];
  first_name?: string | null;
  id: string;
  image_url?: string | null;
  last_name?: string | null;
  primary_email_address_id?: string | null;
  username?: string | null;
};

type ClerkWebhookEvent = {
  data: ClerkUserWebhookData;
  type: string;
};

const http = httpRouter();

function getPrimaryEmailAddress(data: ClerkUserWebhookData) {
  const primaryEmail =
    data.email_addresses?.find((emailAddress) => emailAddress.id === data.primary_email_address_id)
    ?? data.email_addresses?.[0];
  const value = primaryEmail?.email_address?.trim().toLowerCase();

  if (!value) {
    throw new Error(`Clerk user ${data.id} is missing a primary email address`);
  }

  return value;
}

function getDisplayName(data: ClerkUserWebhookData, email: string) {
  const firstName = data.first_name?.trim();
  const lastName = data.last_name?.trim();
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return fullName || data.username?.trim() || email;
}

async function validateClerkWebhook(request: Request): Promise<ClerkWebhookEvent | null> {
  const secret = process.env.CLERK_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error("Missing CLERK_WEBHOOK_SECRET in Convex environment");
    return null;
  }

  const payload = await request.text();
  const svixHeaders = {
    "svix-id": request.headers.get("svix-id") ?? "",
    "svix-signature": request.headers.get("svix-signature") ?? "",
    "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
  };

  if (!svixHeaders["svix-id"] || !svixHeaders["svix-signature"] || !svixHeaders["svix-timestamp"]) {
    console.error("Missing Svix headers on Clerk webhook request");
    return null;
  }

  try {
    return new Webhook(secret).verify(payload, svixHeaders) as ClerkWebhookEvent;
  } catch (error) {
    console.error("Failed to verify Clerk webhook request", error);
    return null;
  }
}

http.route({
  path: "/clerk-users-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const event = await validateClerkWebhook(request);
    if (event === null) {
      return new Response("Invalid webhook", { status: 400 });
    }

    switch (event.type) {
      case "user.created":
      case "user.updated": {
        const email = getPrimaryEmailAddress(event.data);

        await ctx.runMutation(internal.users.upsertFromClerk, {
          clerkUserId: event.data.id,
          email,
          imageUrl: event.data.image_url?.trim() || undefined,
          name: getDisplayName(event.data, email),
        });
        break;
      }
      case "user.deleted":
        // Keep historical user records because other tables reference them by ID.
        console.log("Ignoring Clerk user.deleted event to preserve historical records", event.data.id);
        break;
      default:
        console.log("Ignoring Clerk webhook event", event.type);
    }

    return new Response(null, { status: 200 });
  }),
});

export default http;
