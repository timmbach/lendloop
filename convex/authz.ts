// convex/authz.ts
import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { Doc } from "./_generated/dataModel";

type Ctx = QueryCtx | MutationCtx;
type Role = "admin" | "user";

/**
 * Resolve the currently authenticated user from the database.
 * Throws if not authenticated or if the user hasn't been synced.
 */
export async function requireAuth(ctx: Ctx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity(); // <-- must await
  if (!identity) throw new Error("Not authenticated");

  const user = await ctx.db
    .query("users")
    .withIndex(
      "by_clerk_id",
      (q) => q.eq("clerkId", identity.tokenIdentifier), // stable, globally unique
    )
    .first();

  if (!user) throw new Error("User not found in database");
  return user;
}

/**
 * Assert the user has one of the allowed roles.
 */
export function requireRole(
  user: { role: "admin" | "user" },
  ...allowed: Role[]
) {
  if (!allowed.includes(user.role)) {
    throw new Error(
      `Forbidden: requires role ${allowed.join(" or ")}, got ${user.role}`,
    );
  }
  return user;
}

/**
 * Convenience: auth + admin role.
 */
export async function requireAdmin(ctx: Ctx) {
  const user = await requireAuth(ctx);
  requireRole(user, "admin");
  return user;
}

/**
 * Assert the user owns a resource. Uses Convex Id equality directly.
 */
export function requireOwnership(
  userId: Id<"users">,
  resourceOwnerId: Id<"users">,
) {
  if (userId !== resourceOwnerId) {
    throw new Error("Forbidden: you do not own this resource");
  }
  return true;
}

/**
 * Allow either the resource owner OR an admin.
 * Useful for "admin can remove any listing" while users manage their own.
 */
export function requireOwnerOrAdmin(
  user: Doc<"users">,
  resourceOwnerId: Id<"users">,
): Doc<"users"> {
  if (user.role !== "admin" && user._id !== resourceOwnerId) {
    throw new Error("Forbidden: you must own this resource or be an admin");
  }
  return user;
}
