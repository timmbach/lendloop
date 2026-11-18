"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { DataTable } from "@/components/data-table";
import {
  buildRequestColumns,
  RequestDetails,
  type RequestRow,
} from "@/components/requests-table";
import { toast } from "sonner";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function IncomingRequestsPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(api.users.getMe, {});
  const approveDecline = useMutation(
    api.loanRequests.approveDeclineLoanRequest,
  );
  const markReturned = useMutation(api.loanRequests.markReturned);

  const requests = useQuery(
    api.loanRequests.getIncomingRequests,
    isAuthenticated ? {} : "skip",
  );

  const handleApprove = async (row: RequestRow) => {
    try {
      await approveDecline({
        loanRequestId: row.id,
        status: "approved",
      });
      toast.success("Request approved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve");
    }
  };

  const handleDecline = async (row: RequestRow) => {
    try {
      await approveDecline({
        loanRequestId: row.id,
        status: "declined",
      });
      toast.success("Request declined");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to decline");
    }
  };

  const handleMarkReturned = async (row: RequestRow) => {
    if (row.status === "returned")
      return toast.info("You've already marked this tool as returned");
    if (row.status !== "approved") {
      return toast.info("You're yet to approve this loan");
    }
    try {
      await markReturned({ loanRequestId: row.id });
      toast.success("Marked as returned");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to mark returned",
      );
    }
  };

  if (isLoading || requests === undefined)
    return (
      <LoadingSpinner width={48} height={48} message="Loading requests..." />
    );

  const rows: RequestRow[] = requests.map((r) => ({
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

  const columns = buildRequestColumns("owner");

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <h1 className="text-2xl font-bold">Incoming Requests</h1>
          <p className="text-muted-foreground">
            Approve or decline requests for your tools.
          </p>
        </div>
        <DataTable
          data={rows}
          columns={columns}
          isAuthenticated={isAuthenticated}
          isAdmin={me?.role === "admin"}
          currentUserId={me?._id ?? null}
          enableSelection
          renderDetails={(row) => (
            <RequestDetails item={row} onMarkReturned={handleMarkReturned} />
          )}
          meta={{
            onApprove: handleApprove,
            onDecline: handleDecline,
            onMarkReturned: handleMarkReturned,
          }}
          emptyMessage="No incoming requests yet."
        />
      </div>
    </div>
  );
}
