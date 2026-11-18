import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireAuth, requireOwnerOrAdmin } from "./authz";

const ToolCondition = v.union(
  v.literal("new"),
  v.literal("like_new"),
  v.literal("good"),
  v.literal("fair"),
  v.literal("poor"),
);

export const generateImageUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const createToolListing = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    condition: ToolCondition,
    description: v.string(),
    imageId: v.id("_storage"), // ← required
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    await ctx.db.insert("tools", {
      ownerId: user._id,
      name: args.name,
      category: args.category,
      condition: args.condition,
      description: args.description,
      status: "available",
      createdAt: Date.now(),
      imageId: args.imageId, // ← always present
    });
  },
});
export const editToolListing = mutation({
  args: {
    toolId: v.id("tools"),
    name: v.optional(v.string()),
    category: v.optional(v.string()),
    condition: v.optional(ToolCondition),
    description: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")), // ← new
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool) throw new Error("Tool not found");

    requireOwnerOrAdmin(user, tool.ownerId);

    const updates = {
      ...(args.name !== undefined ? { name: args.name } : {}),
      ...(args.category !== undefined ? { category: args.category } : {}),
      ...(args.condition !== undefined ? { condition: args.condition } : {}),
      ...(args.description !== undefined
        ? { description: args.description }
        : {}),
      ...(args.imageId !== undefined ? { imageId: args.imageId } : {}),
    };
    await ctx.db.patch(args.toolId, updates);
  },
});

export const deleteToolListing = mutation({
  args: { toolId: v.id("tools") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool) throw new Error("Tool not found");

    requireOwnerOrAdmin(user, tool.ownerId);

    await ctx.db.patch(args.toolId, { status: "deleted" });
  },
});

export const setToolAvailability = mutation({
  args: {
    toolId: v.id("tools"),
    available: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool) throw new Error("Tool not found");

    requireOwnerOrAdmin(user, tool.ownerId);

    await ctx.db.patch(args.toolId, {
      status: args.available ? "available" : "unavailable",
    });
  },
});

/**
 * Shared helper: resolve a tool's imageId to a URL.
 * Returns null when the tool has no image.
 */
async function resolveImageUrl(
  ctx: { storage: { getUrl: (id: Id<"_storage">) => Promise<string | null> } },
  imageId: Id<"_storage"> | undefined,
): Promise<string | null> {
  if (!imageId) return null;
  return await ctx.storage.getUrl(imageId);
}

export const getMyToolListings = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);
    const tools = await ctx.db
      .query("tools")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    return await Promise.all(
      tools.map(async (t) => ({
        ...t,
        imageUrl: await resolveImageUrl(ctx, t.imageId), // ← new
      })),
    );
  },
});

export const getAvailableToolListings = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const tools = await ctx.db
      .query("tools")
      .withIndex("by_status", (q) => q.eq("status", "available"))
      .collect();

    return await Promise.all(
      tools.map(async (t) => ({
        ...t,
        imageUrl: await resolveImageUrl(ctx, t.imageId), // ← new
      })),
    );
  },
});

export const getToolListingById = query({
  args: { toolId: v.id("tools") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool) throw new Error("Tool not found");

    return {
      ...tool,
      imageUrl: await resolveImageUrl(ctx, tool.imageId),
    };
  },
});

export const getAllToolListings = query({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const isAuthenticated = identity !== null;

    // Resolve the current user's _id (only when authenticated)
    let currentUserId: Id<"users"> | null = null;
    if (isAuthenticated) {
      const me = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
        .first();
      currentUserId = me?._id ?? null;
    }

    const [available, unavailable] = await Promise.all([
      ctx.db
        .query("tools")
        .withIndex("by_status", (q) => q.eq("status", "available"))
        .collect(),
      ctx.db
        .query("tools")
        .withIndex("by_status", (q) => q.eq("status", "unavailable"))
        .collect(),
    ]);

    const all = [...available, ...unavailable];

    // Exclude the signed-in user's own tools
    const notMine = currentUserId
      ? all.filter((t) => t.ownerId !== currentUserId)
      : all;

    const visible = args.category
      ? notMine.filter((t) => t.category === args.category)
      : notMine;

    if (!isAuthenticated) {
      return visible.map((t) => ({
        ...t,
        ownerName: null,
        imageUrl: null,
      }));
    }

    return await Promise.all(
      visible.map(async (t) => {
        const owner = await ctx.db.get(t.ownerId);
        return {
          ...t,
          ownerName: owner?.name ?? "Unknown",
          imageUrl: await resolveImageUrl(ctx, t.imageId),
        };
      }),
    );
  },
});
