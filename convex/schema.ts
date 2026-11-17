import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    role: v.union(v.literal("admin"), v.literal("user")),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    trustedLender: v.optional(v.boolean()),
  }).index("by_clerk_id", ["clerkId"]),

  tools: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    category: v.string(), // e.g. "power tools", "garden", "kitchen", "camping"
    condition: v.union(
      v.literal("new"),
      v.literal("like_new"),
      v.literal("good"),
      v.literal("fair"),
      v.literal("poor"),
    ),
    description: v.string(),
    status: v.union(
      v.literal("available"),
      v.literal("unavailable"),
      v.literal("deleted"),
    ),
    imageId: v.id("_storage"),
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_status", ["status"])
    .index("by_category", ["category"]),

  loanRequests: defineTable({
    toolId: v.id("tools"),
    borrowerId: v.id("users"),
    ownerId: v.id("users"), // denormalized: the tool owner / lender
    startDate: v.number(), // Unix ms
    endDate: v.number(), // Unix ms
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("declined"),
      v.literal("returned"),
      v.literal("cancelled"),
    ),
    createdAt: v.number(),
    returnedAt: v.optional(v.number()), // set when marked returned
  })
    .index("by_tool", ["toolId"])
    .index("by_borrower", ["borrowerId"])
    .index("by_owner", ["ownerId"])
    .index("by_status", ["status"]),
});
