import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireAdmin, requireOwnership } from "./authz";

export const createLoanRequest = mutation({
  args: {
    toolId: v.id("tools"),
    startDate: v.number(), // Unix ms
    endDate: v.number(), // Unix ms
  },
  handler: async (ctx, args) => {
    const borrower = await requireAuth(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool) throw new Error("Tool not found");
    if (tool.status !== "available") throw new Error("Tool is not available");
    if (tool.ownerId === borrower._id) {
      throw new Error("You cannot borrow your own tool");
    }
    if (args.endDate <= args.startDate) {
      throw new Error("endDate must be after startDate");
    }

    await ctx.db.insert("loanRequests", {
      toolId: args.toolId,
      borrowerId: borrower._id,
      ownerId: tool.ownerId,
      startDate: args.startDate,
      endDate: args.endDate,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const approveDeclineLoanRequest = mutation({
  args: {
    loanRequestId: v.id("loanRequests"),
    status: v.union(v.literal("approved"), v.literal("declined")),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const loan = await ctx.db.get(args.loanRequestId);
    if (!loan) throw new Error("Loan request not found");

    // Only the tool owner (lender) can approve or decline
    requireOwnership(user._id, loan.ownerId);

    await ctx.db.patch(loan._id, { status: args.status });
  },
});

export const markReturned = mutation({
  args: { loanRequestId: v.id("loanRequests") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const loan = await ctx.db.get(args.loanRequestId);
    if (!loan) throw new Error("Loan request not found");

    // Only the tool owner can mark as returned
    requireOwnership(user._id, loan.ownerId);

    await ctx.db.patch(loan._id, {
      status: "returned",
      returnedAt: Date.now(),
    });
  },
});

export const getMyLoanRequestsAsBorrower = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);
    return await ctx.db
      .query("loanRequests")
      .withIndex("by_borrower", (q) => q.eq("borrowerId", user._id))
      .collect();
  },
});

export const getLoanRequestsOnMyTools = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);
    return await ctx.db
      .query("loanRequests")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
  },
});

export const getAllLoanRequests = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("loanRequests").collect();
  },
});
