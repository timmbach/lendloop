import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireAdmin } from "./authz";

/**
 * Creates the Convex user row on first sign-in.
 * Default role is "user". Idempotent — safe to call multiple times.
 */
export const ensureUserProfile = mutation({
  args: {
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const name = args.name ?? identity.name ?? undefined;
    const email = args.email ?? identity.email ?? undefined;

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (existing) {
      const updates: { name?: string; email?: string } = {};
      if (name !== undefined && name !== existing.name) updates.name = name;
      if (email !== undefined && email !== existing.email)
        updates.email = email;
      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(existing._id, updates);
      }
      return { userId: existing._id, role: existing.role };
    }

    const _id = await ctx.db.insert("users", {
      clerkId: identity.subject,
      role: "user",
      name,
      email,
      trustedLender: false,
    });

    return { userId: _id, role: "user" };
  },
});
/** Authenticated users can read their own profile only. */
export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);
    return {
      userId: user._id,
      clerkId: user.clerkId,
      role: user.role,
      name: user.name,
      email: user.email,
      trustedLender: user.trustedLender,
    };
  },
});
export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return null;
    return {
      _id: user._id,
      role: user.role,
      name: user.name,
      trustedLender: user.trustedLender ?? false,
    };
  },
});

/**
 * Admin-only: read any user's profile.
 * Useful for an admin user-management page.
 */
export const getUserProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    return {
      userId: user._id,
      clerkId: user.clerkId,
      role: user.role,
      name: user.name,
      email: user.email,
      trustedLender: user.trustedLender,
    };
  },
});

/**
 * Admin-only: list all users.
 */
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("users").collect();
  },
});

/**
 * Admin-only: change another user's role.
 */
export const setUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("user")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("User not found");

    await ctx.db.patch(args.userId, { role: args.role });
    return { success: true };
  },
});

/**
 * Admin-only: mark or unmark a trusted lender.
 */
export const markTrustedLender = mutation({
  args: {
    userId: v.id("users"),
    trusted: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("User not found");

    await ctx.db.patch(args.userId, { trustedLender: args.trusted });
    return { success: true };
  },
});

//  CLERK
// Called by webhook: create or update user
export const upsertFromClerk = internalMutation({
  args: { data: v.any() }, // Clerk UserJSON, simplified handling here
  handler: async (ctx, { data }) => {
    const clerkId = data.id;
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    const name = [data.first_name, data.last_name].filter(Boolean).join(" ");
    const email = data.email_addresses?.[0]?.email_address;

    if (existing) {
      await ctx.db.patch(existing._id, { name, email });
    } else {
      await ctx.db.insert("users", {
        clerkId,
        role: "user",
        name,
        email,
        trustedLender: false,
      });
    }
  },
});

// Called by webhook: delete user
export const deleteFromClerk = internalMutation({
  args: { clerkUserId: v.string() },
  handler: async (ctx, { clerkUserId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkUserId))
      .first();
    if (user) {
      // Recommendation: soft delete or clean up associated data, example here is hard delete
      await ctx.db.delete(user._id);
    }
  },
});
