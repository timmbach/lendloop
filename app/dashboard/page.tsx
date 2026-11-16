"use client";

import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { DataTable } from "@/components/data-table";
import {
  ToolDetails,
  toolColumns,
  type ToolRow,
} from "@/components/tools-table";
import rawData from "./data.json";
import dynamic from "next/dynamic";

const USE_DUMMY_DATA = true; // flip to false when Convex is ready

type ToolSource = {
  _id: Id<"tools">;
  ownerId: Id<"users">;
  name: string;
  category: string;
  condition: Doc<"tools">["condition"];
  description: string;
  status: Doc<"tools">["status"];
  createdAt: number;
  ownerName?: string | null;
};

function toToolRow(t: ToolSource): ToolRow {
  return {
    id: t._id,
    ownerId: t.ownerId,
    name: t.name,
    category: t.category,
    condition: t.condition,
    description: t.description,
    status: t.status,
    createdAt: t.createdAt,
    ownerName: t.ownerName ?? null,
  };
}

const LoadingSpinner = dynamic(() => import("@/components/LoadingSpinner"), {
  loading: () => <p className="text-muted-foreground">Loading…</p>,
});

export default function DashboardPage() {
  const { isAuthenticated } = useConvexAuth();
  const me = useQuery(api.users.getMe);

  const toolsFromConvex = useQuery(
    api.tools.getAllToolListings,
    USE_DUMMY_DATA ? "skip" : {},
  );

  const source: ToolSource[] | undefined = USE_DUMMY_DATA
    ? (rawData as ToolSource[])
    : toolsFromConvex;

  if (source === undefined)
    return (
      <LoadingSpinner width={48} height={48} message="Loading listings..." />
    );

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex items-center justify-between px-4 lg:px-6">
          <div>
            <h1 className="text-2xl font-bold">Listings Dashboard</h1>
            <p className="text-muted-foreground">
              Browse tools shared on LendLoop
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <DataTable
          data={source.map(toToolRow)}
          columns={toolColumns}
          isAuthenticated={isAuthenticated}
          isAdmin={me?.role === "admin"}
          currentUserId={me?._id ?? null}
          renderDetails={(row) => <ToolDetails item={row} />}
          emptyMessage="No tools listed yet."
        />
      </div>
    </div>
  );
}
