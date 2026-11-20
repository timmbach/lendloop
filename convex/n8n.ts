import { internalAction } from "./_generated/server";
import { v } from "convex/values";

export const notifyN8n = internalAction({
  args: {
    event: v.union(v.literal("created"), v.literal("status_changed")),
    toolName: v.string(),
    status: v.string(),
    recipientEmail: v.string(),
    recipientName: v.string(),
    actorName: v.string(),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const secret = process.env.N8N_OUTBOUND_SECRET;
    const n8nUrl = process.env.N8N_WEBHOOK_URL;

    if (!secret) throw new Error("Missing N8N_OUTBOUND_SECRET");
    if (!n8nUrl) throw new Error("Missing N8N_WEBHOOK_URL");

    const payload = JSON.stringify(args);

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload),
    );
    const signatureHex = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const response = await fetch(n8nUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Signature": signatureHex,
      },
      body: payload,
    });

    if (!response.ok) {
      throw new Error(`n8n responded with ${response.status}`);
    }
  },
});
