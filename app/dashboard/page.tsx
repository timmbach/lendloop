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
import { Button } from "@/components/ui/button";
import { ListToolDialog } from "@/components/list-tool-dialog";
import { CirclePlusIcon } from "lucide-react";
import { useState } from "react";
import { RequestToolDialog } from "@/components/request-tool-dialog";
import LoadingSpinner from "@/components/LoadingSpinner";

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
  ownerTrusted?: boolean;
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
    ownerName: t.ownerName ?? null,
    ownerTrusted: t.ownerTrusted ?? false,
    imageUrl: t.imageUrl ?? null,
  };
}

export default function DashboardPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(api.users.getMe);
  const [requestTool, setRequestTool] = useState<ToolRow | null>(null);
  const openRequestDialog = (row: ToolRow) => setRequestTool(row);

  const tools = useQuery(api.tools.getAllToolListings, {});

  if (isLoading || tools === undefined)
    return (
      <LoadingSpinner width={48} height={48} message="Loading listings..." />
    );

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <h1 className="text-2xl font-bold">Available Tools</h1>
          <p className="text-muted-foreground">
            Browse tools shared by everyone.
          </p>
        </div>

        {isAuthenticated && (
          <div className="flex justify-center">
            <ListToolDialog>
              <Button>
                <CirclePlusIcon />
                List a tool
              </Button>
            </ListToolDialog>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <DataTable
          data={tools.map(toToolRow)}
          columns={toolColumns}
          isAuthenticated={isAuthenticated}
          isAdmin={me?.role === "admin"}
          currentUserId={me?._id ?? null}
          renderDetails={(row) => (
            <ToolDetails
              item={row}
              canRequest={
                isAuthenticated &&
                !!me?._id &&
                row.ownerId !== me._id &&
                row.status === "available"
              }
              onRequestBorrow={() => openRequestDialog(row)}
            />
          )}
          emptyMessage="No tools listed yet."
        />
        <RequestToolDialog
          toolId={requestTool?.id ?? null}
          toolName={requestTool?.name ?? null}
          open={!!requestTool}
          onOpenChange={(open) => {
            if (!open) setRequestTool(null);
          }}
        />
      </div>
    </div>
  );
}
