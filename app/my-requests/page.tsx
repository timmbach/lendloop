"use client";

import { useMutation, useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { DataTable } from "@/components/data-table";
import {
  buildRequestColumns,
  RequestDetails,
  type RequestRow,
} from "@/components/requests-table";
import dynamic from "next/dynamic";

const LoadingSpinner = dynamic(() => import("@/components/LoadingSpinner"), {
  loading: () => <p className="text-muted-foreground">Loading…</p>,
});

export default function MyRequestsPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(api.users.getMe);
  const cancel = useMutation(api.loanRequests.cancelLoanRequest);
  const markReturned = useMutation(api.loanRequests.markReturned);

  const requests = useQuery(
    api.loanRequests.getMyRequests,
    isAuthenticated ? {} : "skip",
  );

  if (isLoading || requests === undefined)
    return (
      <LoadingSpinner
        width={48}
        height={48}
        message="Loading your requests..."
      />
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

  const columns = buildRequestColumns("borrower");

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <h1 className="text-2xl font-bold">My Requests</h1>
          <p className="text-muted-foreground">
            Requests you&apos;ve made to borrow tools.
          </p>
        </div>
        <DataTable
          data={rows}
          columns={columns}
          isAuthenticated={isAuthenticated}
          isAdmin={me?.role === "admin"}
          currentUserId={me?._id ?? null}
          enableSelection
          renderDetails={(row) => <RequestDetails item={row} />}
          meta={{
            onCancel: (row: RequestRow) => cancel({ loanRequestId: row.id }),
            onMarkReturned: (row: RequestRow) =>
              markReturned({ loanRequestId: row.id }),
          }}
          emptyMessage="You haven't requested any tools yet."
        />
      </div>
    </div>
  );
}
