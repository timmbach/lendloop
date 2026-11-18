"use client";

import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { DataTable } from "@/components/data-table";
import {
  ToolDetails,
  toolColumns,
  type ToolRow,
} from "@/components/tools-table";
import rawData from "../dashboard/data.json";
import { Button } from "@/components/ui/button";
import { ListToolDialog } from "@/components/list-tool-dialog";
import { CirclePlusIcon } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";

const USE_DUMMY_DATA = false;

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
  imageUrl?: string | null;
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
    ownerName: "Me",
    imageUrl: t.imageUrl ?? null,
  };
}

export default function MyListingsPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(api.users.getMe);
  const removeTool = useMutation(api.tools.deleteToolListing);

  const toolsFromConvex = useQuery(
    api.tools.getMyToolListings,
    isAuthenticated ? {} : "skip",
  );

  const source: ToolSource[] | undefined = USE_DUMMY_DATA
    ? (rawData as ToolSource[])
    : toolsFromConvex;

  if (isLoading || source === undefined)
    return (
      <LoadingSpinner
        width={48}
        height={48}
        message="Loading your listings..."
      />
    );

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <h1 className="text-2xl font-bold">My Listings</h1>
          <p className="text-muted-foreground">
            Manage the tools you&apos;ve shared.
          </p>
        </div>

        <div className="flex justify-center">
          <ListToolDialog>
            <Button>
              <CirclePlusIcon />
              List a tool
            </Button>
          </ListToolDialog>
        </div>
      </div>

      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <DataTable
          data={source.map(toToolRow)}
          columns={toolColumns}
          isAuthenticated={isAuthenticated}
          isAdmin={me?.role === "admin"}
          currentUserId={me?._id ?? null}
          enableSelection
          onRemove={(row) => removeTool({ toolId: row.id })}
          renderDetails={(row) => <ToolDetails item={row} />}
          emptyMessage="You haven't listed any tools yet."
        />
      </div>
    </div>
  );
}
