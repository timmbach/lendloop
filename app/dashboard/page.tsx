"use client";

import { DataTable, type ToolRow } from "@/components/data-table";
import type { Doc } from "@/convex/_generated/dataModel";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import rawData from "./data.json";

const USE_DUMMY_DATA = true; // flip to false when Convex is ready

// Shape of BOTH sources before normalization.
// Not ToolRow — it still has _id instead of id.
type ToolSource = {
  _id: string;
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
    name: t.name,
    category: t.category,
    condition: t.condition,
    description: t.description,
    status: t.status,
    createdAt: t.createdAt,
    ownerName: t.ownerName ?? null,
  };
}

export default function DashboardPage() {
  const { isAuthenticated } = useConvexAuth();

  const toolsFromConvex = useQuery(
    api.tools.getAllToolListings,
    USE_DUMMY_DATA ? "skip" : {},
  );

  const source: ToolSource[] | undefined = USE_DUMMY_DATA
    ? (rawData as ToolSource[])
    : toolsFromConvex;

  if (source === undefined) return <div>Loading…</div>;

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Available Tools</h1>
            <p className="text-muted-foreground">
              Browse tools shared by everyone.
            </p>
          </div>
          {/* <Button onClick={onCreateTool}>List a Tool</Button> */}
        </div>
      </div>

      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <DataTable
          data={source.map(toToolRow)}
          isAuthenticated={isAuthenticated}
        />
      </div>
    </div>
  );
}
