import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireOwnerOrAdmin } from "./authz";

const ToolCondition = v.union(
  v.literal("new"),
  v.literal("like_new"),
  v.literal("good"),
  v.literal("fair"),
  v.literal("poor"),
);

export const createToolListing = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    condition: ToolCondition,
    description: v.string(),
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
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool) throw new Error("Tool not found");

    requireOwnerOrAdmin(user, tool.ownerId); // ← replaced

    const updates = {
      ...(args.name !== undefined ? { name: args.name } : {}),
      ...(args.category !== undefined ? { category: args.category } : {}),
      ...(args.condition !== undefined ? { condition: args.condition } : {}),
      ...(args.description !== undefined
        ? { description: args.description }
        : {}),
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

/** Owner or admin can toggle a tool between available and unavailable. */
export const setToolAvailability = mutation({
  args: {
    toolId: v.id("tools"),
    available: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool) throw new Error("Tool not found");

    requireOwnerOrAdmin(user, tool.ownerId); // ← replaced

    await ctx.db.patch(args.toolId, {
      status: args.available ? "available" : "unavailable",
    });
  },
});

export const getMyToolListings = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);
    return await ctx.db
      .query("tools")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
  },
});

export const getAvailableToolListings = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("tools")
      .withIndex("by_status", (q) => q.eq("status", "available"))
      .collect();
  },
});

export const getToolListingById = query({
  args: { toolId: v.id("tools") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool) throw new Error("Tool not found");
    return tool;
  },
});

export const getAllToolListings = query({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const isAuthenticated = identity !== null;

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

    const visible = args.category
      ? all.filter((t) => t.category === args.category)
      : all;

    if (!isAuthenticated) {
      // Anonymous: never return owner identity
      return visible.map((t) => ({ ...t, ownerName: null }));
    }

    return await Promise.all(
      visible.map(async (t) => {
        const owner = await ctx.db.get(t.ownerId);
        return { ...t, ownerName: owner?.name ?? "Unknown" };
      }),
    );
  },
});
