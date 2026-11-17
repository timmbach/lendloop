"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CircleCheckIcon,
  CircleXIcon,
  EllipsisVerticalIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DataTable,
  DragColumn,
  SelectColumn,
  type DataTableColumn,
  type DataTableFeatures,
  type DataTableMeta,
} from "@/components/data-table";
import { Id } from "@/convex/_generated/dataModel";
import Image from "next/image";

export type ToolRow = {
  id: Id<"tools">;
  ownerId: Id<"users">;
  name: string;
  category: string;
  condition: "new" | "like_new" | "good" | "fair" | "poor";
  description: string;
  status: "available" | "unavailable" | "deleted";
  createdAt: number;
  ownerName: string | null;
  imageUrl: string | null;
};

const columnHelper = createColumnHelper<DataTableFeatures, ToolRow>();

export const toolColumns: DataTableColumn<ToolRow>[] = columnHelper.columns([
  DragColumn<ToolRow>(),
  SelectColumn<ToolRow>(),
  columnHelper.accessor("name", {
    header: "Tool",
    enableHiding: false,
    cell: ({ row, table }) => {
      const meta = table.options.meta as DataTableMeta<ToolRow>;
      return (
        <Button
          variant="link"
          className="w-fit px-0 text-left text-foreground"
          onClick={() => meta.isAuthenticated && meta.onView(row.original)}
          disabled={!meta.isAuthenticated}
        >
          {row.original.name}
        </Button>
      );
    },
  }),
  columnHelper.accessor("category", {
    header: "Category",
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className="px-1.5 capitalize text-muted-foreground"
      >
        {row.original.category}
      </Badge>
    ),
  }),
  columnHelper.accessor("condition", {
    header: "Condition",
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className="px-1.5 capitalize text-muted-foreground"
      >
        {row.original.condition.replace("_", " ")}
      </Badge>
    ),
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className="px-1.5 capitalize text-muted-foreground"
      >
        {row.original.status === "available" ? (
          <CircleCheckIcon className="fill-green-500 dark:fill-green-400" />
        ) : (
          <CircleXIcon className="text-muted-foreground" />
        )}
        {row.original.status}
      </Badge>
    ),
  }),
  columnHelper.accessor("ownerName", {
    id: "ownerName",
    header: "Owner",
    cell: ({ row }) => row.original.ownerName ?? "—",
  }),
  columnHelper.accessor("createdAt", {
    header: "Listed",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {new Date(row.original.createdAt).toLocaleDateString()}
      </span>
    ),
  }),
  columnHelper.display({
    id: "actions",
    cell: ({ row, table }) => {
      const meta = table.options.meta as DataTableMeta<ToolRow>;
      if (!meta.isAuthenticated) return null;

      const handleView = meta.onView;
      const handleRemove = meta.onRemove;
      const isOwner =
        meta.currentUserId !== null &&
        row.original.ownerId === meta.currentUserId;
      const canRemove = !!handleRemove && (meta.isAdmin || isOwner);

      if (!handleView && !canRemove) return null;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                className="flex size-8 text-muted-foreground data-open:bg-muted"
                size="icon"
              />
            }
          >
            <EllipsisVerticalIcon />
            <span className="sr-only">Open menu</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {handleView && (
              <DropdownMenuItem onClick={() => handleView(row.original)}>
                View details
              </DropdownMenuItem>
            )}
            {canRemove && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => handleRemove(row.original)}
                >
                  Remove
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  }),
]);

export function ToolDetails({ item }: { item: ToolRow }) {
  return (
    <div className="py-6">
      <div className="px-4">
        <h3 className="text-lg font-semibold">{item.name}</h3>
        <p className="text-sm text-muted-foreground">
          {item.category} · {item.condition.replace("_", " ")} · listed{" "}
          {new Date(item.createdAt).toLocaleDateString()}
        </p>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
        {item.imageUrl && (
          <div className="relative aspect-video w-full overflow-hidden rounded-md border">
            <Image
              src={item.imageUrl}
              alt={item.name}
              fill
              sizes="(max-width: 768px) 100vw, 480px"
              className="object-cover"
            />
          </div>
        )}

        <p>{item.description}</p>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Owner:</span>
          <span>{item.ownerName ?? "—"}</span>
        </div>

        <Badge variant="outline" className="w-fit capitalize">
          {item.status}
        </Badge>
      </div>
    </div>
  );
}
