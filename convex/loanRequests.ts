import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireAdmin } from "./authz";
import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";

type Ctx = QueryCtx | MutationCtx;

const LoanStatus = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("declined"),
  v.literal("returned"),
  v.literal("cancelled"),
);

/** Attach tool / owner / borrower names to a loan request. */
async function withNames(
  ctx: Ctx,
  r: Pick<Doc<"loanRequests">, "toolId" | "ownerId" | "borrowerId">,
) {
  const [tool, owner, borrower] = await Promise.all([
    ctx.db.get(r.toolId),
    ctx.db.get(r.ownerId),
    ctx.db.get(r.borrowerId),
  ]);
  return {
    toolName: tool?.name ?? "Unknown tool",
    ownerName: owner?.name ?? "Unknown",
    borrowerName: borrower?.name ?? "Unknown",
  };
}

export const createLoanRequest = mutation({
  args: {
    toolId: v.id("tools"),
    startDate: v.number(),
    endDate: v.number(),
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

    const owner = await ctx.db.get(tool.ownerId);
    await ctx.scheduler.runAfter(0, internal.n8n.notifyN8n, {
      event: "created",
      toolName: tool.name,
      status: "pending",
      recipientEmail: owner?.email ?? "",
      recipientName: owner?.name ?? "Tool owner",
      actorName: borrower.name ?? "Someone",
      startDate: args.startDate,
      endDate: args.endDate,
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

    // Admin can also approve/decline; owner is the normal case.
    if (loan.ownerId !== user._id && user.role !== "admin") {
      throw new Error("Forbidden: only the tool owner can respond");
    }

    // Guard against double-processing
    if (loan.status !== "pending") {
      throw new Error("This request has already been handled");
    }

    await ctx.db.patch(loan._id, { status: args.status });

    // Sync tool availability with the decision
    if (args.status === "approved") {
      await ctx.db.patch(loan.toolId, { status: "unavailable" });
    }

    const tool = await ctx.db.get(loan.toolId);
    const borrower = await ctx.db.get(loan.borrowerId);
    const owner = await ctx.db.get(loan.ownerId);

    await ctx.scheduler.runAfter(0, internal.n8n.notifyN8n, {
      event: "status_changed",
      toolName: tool?.name ?? "Tool",
      status: args.status,
      recipientEmail: borrower?.email ?? "",
      recipientName: borrower?.name ?? "Borrower",
      actorName: owner?.name ?? "Owner",
      startDate: loan.startDate,
      endDate: loan.endDate,
    });
  },
});

export const markReturned = mutation({
  args: { loanRequestId: v.id("loanRequests") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const loan = await ctx.db.get(args.loanRequestId);
    if (!loan) throw new Error("Loan request not found");

    // Owner or borrower can mark returned; admin can too.
    if (
      loan.ownerId !== user._id &&
      loan.borrowerId !== user._id &&
      user.role !== "admin"
    ) {
      throw new Error(
        "Forbidden: only the lender or borrower can mark returned",
      );
    }

    if (loan.status !== "approved") {
      throw new Error("Only approved loans can be marked returned");
    }

    await ctx.db.patch(loan._id, {
      status: "returned",
      returnedAt: Date.now(),
    });

    // Tool becomes available again
    await ctx.db.patch(loan.toolId, { status: "available" });

    const tool = await ctx.db.get(loan.toolId);
    const borrower = await ctx.db.get(loan.borrowerId);
    const owner = await ctx.db.get(loan.ownerId);

    // Notify the owner that their tool is back; the borrower already knows
    await ctx.scheduler.runAfter(0, internal.n8n.notifyN8n, {
      event: "status_changed",
      toolName: tool?.name ?? "Tool",
      status: "returned",
      recipientEmail: owner?.email ?? "",
      recipientName: owner?.name ?? "Owner",
      actorName: borrower?.name ?? "Borrower",
      startDate: loan.startDate,
      endDate: loan.endDate,
    });
  },
});

export const cancelLoanRequest = mutation({
  args: { loanRequestId: v.id("loanRequests") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const loan = await ctx.db.get(args.loanRequestId);
    if (!loan) throw new Error("Loan request not found");

    if (loan.borrowerId !== user._id) {
      throw new Error("Forbidden: only the borrower can cancel");
    }
    if (loan.status !== "pending") {
      throw new Error("Only pending requests can be cancelled");
    }

    await ctx.db.patch(loan._id, { status: "cancelled" });
  },
});

/** Borrower's view: requests I made, with tool + owner names. */
export const getMyRequests = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);
    const requests = await ctx.db
      .query("loanRequests")
      .withIndex("by_borrower", (q) => q.eq("borrowerId", user._id))
      .collect();

    return await Promise.all(
      requests.map(async (r) => ({
        ...r,
        ...(await withNames(ctx, r)),
      })),
    );
  },
});

/** Lender's view: requests on my tools, with tool + borrower names. */
export const getIncomingRequests = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);
    const requests = await ctx.db
      .query("loanRequests")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    return await Promise.all(
      requests.map(async (r) => ({
        ...r,
        ...(await withNames(ctx, r)),
      })),
    );
  },
});

/** Admin: every loan request, with all names resolved. */
export const listAllForAdmin = query({
  args: { status: v.optional(LoanStatus) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const requests = args.status
      ? await ctx.db
          .query("loanRequests")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .collect()
      : await ctx.db.query("loanRequests").collect();

    return await Promise.all(
      requests.map(async (r) => ({
        ...r,
        ...(await withNames(ctx, r)),
      })),
    );
  },
});
