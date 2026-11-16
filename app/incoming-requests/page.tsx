"use client";

import {
  RequestDataTable,
  type RequestRow,
} from "@/components/request-data-table";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function IncomingRequestsPage() {
  const { isAuthenticated } = useConvexAuth();

  const requests = useQuery(api.loanRequests.getIncomingRequests);

  if (requests === undefined) return <div>Loading…</div>;

  const rows: RequestRow[] = requests.map((r) => ({
    id: r._id,
    toolName: r.toolName,
    ownerName: r.ownerName,
    borrowerName: r.borrowerName,
    startDate: r.startDate,
    endDate: r.endDate,
    status: r.status,
    createdAt: r.createdAt,
  }));

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <h1 className="text-2xl font-bold">Incoming Requests</h1>
          <p className="text-muted-foreground">
            Approve or decline requests for your tools.
          </p>
        </div>
        <RequestDataTable
          data={rows}
          isAuthenticated={isAuthenticated}
          enableSelection
        />
      </div>
    </div>
  );
}
