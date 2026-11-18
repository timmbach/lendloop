"use client";

import * as React from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { DataTable } from "@/components/data-table";
import {
  toolColumns,
  ToolDetails,
  type ToolRow,
} from "@/components/tools-table";
import {
  buildRequestColumns,
  RequestDetails,
  type RequestRow,
} from "@/components/requests-table";
import { adminUserColumns, type UserRow } from "@/components/users-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(api.users.getMe, {});
  const isAdmin = me?.role === "admin";

  const tools = useQuery(api.tools.getAllToolListings, isAdmin ? {} : "skip");
  const loans = useQuery(
    api.loanRequests.listAllForAdmin,
    isAdmin ? {} : "skip",
  );
  const users = useQuery(api.users.getAllUsers, isAdmin ? {} : "skip");

  const removeTool = useMutation(api.tools.deleteToolListing);
  const setTrusted = useMutation(api.users.markTrustedLender);

  React.useEffect(() => {
    if (!isLoading && me !== undefined && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [isLoading, me, isAdmin, router]);

  if (isLoading || me === undefined)
    return (
      <LoadingSpinner width={48} height={48} message="Loading Admin menu..." />
    );
  if (!isAdmin) return null;

  const toolRows: ToolRow[] = (tools ?? []).map((t) => ({
    id: t._id,
    ownerId: t.ownerId,
    name: t.name,
    category: t.category,
    condition: t.condition,
    description: t.description,
    status: t.status,
    createdAt: t.createdAt,
    ownerName: t.ownerName ?? null,
    ownerTrusted: t.ownerTrusted ?? false,
    imageUrl: t.imageUrl ?? null,
  }));

  const loanRows: RequestRow[] = (loans ?? []).map((r) => ({
    id: r._id,
    ownerId: r.ownerId,
    borrowerId: r.borrowerId,
    toolName: r.toolName,
    ownerName: r.ownerName,
    borrowerName: r.borrowerName,
    startDate: r.startDate,
    endDate: r.endDate,
    status: r.status,
    createdAt: r.createdAt,
  }));

  const userRows: UserRow[] = (users ?? []).map((u) => ({
    id: u._id,
    name: u.name ?? "—",
    email: u.email ?? "—",
    role: u.role,
    trustedLender: u.trustedLender ?? false,
  }));

  return (
    <div className="@container/main flex flex-1 flex-col gap-2 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-muted-foreground">
          Manage listings, loans, and lenders.
        </p>
      </div>

      <Tabs defaultValue="listings" className="flex flex-col gap-4 w-full">
        <TabsList className="w-full mx-auto justify-center">
          <TabsTrigger value="listings">Listings</TabsTrigger>
          <TabsTrigger value="loans">Loans</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="listings">
          <DataTable
            data={toolRows}
            columns={toolColumns}
            isAuthenticated={isAuthenticated}
            isAdmin
            currentUserId={me._id}
            onRemove={async (row) => {
              try {
                await removeTool({ toolId: row.id });
                toast.success("Listing removed");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed");
              }
            }}
            renderDetails={(row) => <ToolDetails item={row} />}
            emptyMessage="No listings."
          />
        </TabsContent>

        <TabsContent value="loans">
          <DataTable
            data={loanRows}
            columns={buildRequestColumns("owner")}
            isAuthenticated={isAuthenticated}
            isAdmin
            currentUserId={me._id}
            renderDetails={(row) => <RequestDetails item={row} />}
            emptyMessage="No loan requests."
          />
        </TabsContent>

        <TabsContent value="users">
          <DataTable
            data={userRows}
            columns={adminUserColumns}
            isAuthenticated={isAuthenticated}
            isAdmin
            currentUserId={me._id}
            meta={{
              onToggleTrusted: async (row: UserRow) => {
                try {
                  await setTrusted({
                    userId: row.id,
                    trusted: !row.trustedLender,
                  });
                  toast.success(
                    row.trustedLender
                      ? "Unmarked as trusted"
                      : "Marked as trusted lender",
                  );
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed");
                }
              },
            }}
            emptyMessage="No users."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
