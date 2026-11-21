import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { verifyWebhook } from "@clerk/backend/webhooks";
import type { WebhookEvent } from "@clerk/backend";
import { verifyHmac } from "./lib/verifyHmac";

const http = httpRouter();

// CLERK
http.route({
  path: "/clerk-users-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let event: WebhookEvent;

    try {
      event = await verifyWebhook(request, {
        signingSecret: process.env.CLERK_WEBHOOK_SECRET!,
      });
    } catch (error) {
      console.error("Webhook signature verification failed", error);
      return new Response("Invalid signature", { status: 400 });
    }

    switch (event.type) {
      case "user.created":
      case "user.updated":
        await ctx.runMutation(internal.users.upsertFromClerk, {
          data: event.data,
        });
        break;
      case "user.deleted": {
        const clerkUserId = event.data.id;
        if (clerkUserId) {
          await ctx.runMutation(internal.users.deleteFromClerk, {
            clerkUserId,
          });
        }
        break;
      }
      default:
        console.log("Ignored Clerk webhook event", event.type);
    }

    return new Response(null, { status: 200 });
  }),
});

// N8N
// POST /overdue-loans — n8n fetches overdue loans
http.route({
  path: "/overdue-loans",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.N8N_INBOUND_SECRET;
    if (!secret) return new Response("Server misconfigured", { status: 500 });

    const rawBody = await request.text();
    const signature = request.headers.get("X-Signature") ?? "";

    if (!(await verifyHmac(secret, signature, rawBody))) {
      return new Response("Invalid signature", { status: 401 });
    }

    const loans = await ctx.runQuery(internal.loanRequests.getOverdue, {
      now: Date.now(),
    });

    return new Response(JSON.stringify(loans), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// POST /reminder-sent — n8n marks a reminder as sent (idempotent)
http.route({
  path: "/reminder-sent",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.N8N_INBOUND_SECRET;
    if (!secret) return new Response("Server misconfigured", { status: 500 });

    const rawBody = await request.text();
    const signature = request.headers.get("X-Signature") ?? "";

    if (!(await verifyHmac(secret, signature, rawBody))) {
      return new Response("Invalid signature", { status: 401 });
    }

    let parsed: { loanRequestId?: unknown };
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    if (typeof parsed.loanRequestId !== "string") {
      return new Response("Missing loanRequestId", { status: 400 });
    }

    await ctx.runMutation(internal.loanRequests.markReminderSent, {
      loanRequestId: parsed.loanRequestId as any,
    });

    return new Response("OK", { status: 200 });
  }),
});

export default http;
