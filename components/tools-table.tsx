"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CircleCheckIcon,
  CircleXIcon,
  EllipsisVerticalIcon,
  ShieldCheckIcon,
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
  ownerTrusted: boolean;
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
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span>{row.original.ownerName ?? "—"}</span>
        {row.original.ownerTrusted && (
          <Badge variant="outline" className="gap-1">
            <ShieldCheckIcon className="size-3" />
            Trusted
          </Badge>
        )}
      </div>
    ),
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
      const handleEdit = meta.onEdit;
      const handleRemove = meta.onRemove;
      const handleRequestBorrow = meta.onRequestBorrow;

      const isOwner =
        meta.currentUserId !== null &&
        row.original.ownerId === meta.currentUserId;
      const isAvailable = row.original.status === "available";

      const canEdit = !!handleEdit && (meta.isAdmin || isOwner);
      const canRemove = !!handleRemove && (meta.isAdmin || isOwner);
      const canRequest = !!handleRequestBorrow && !isOwner && isAvailable;

      if (!handleView && !canRemove && !canRequest) return null;

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
          <DropdownMenuContent align="end" className="w-48">
            {handleView && (
              <DropdownMenuItem onClick={() => handleView(row.original)}>
                View details
              </DropdownMenuItem>
            )}
            {canEdit && (
              <DropdownMenuItem onClick={() => handleEdit(row.original)}>
                Edit
              </DropdownMenuItem>
            )}
            {canRequest && (
              <DropdownMenuItem
                onClick={() => handleRequestBorrow(row.original)}
              >
                Request to borrow
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

export function ToolDetails({
  item,
  canRequest,
  onRequestBorrow,
}: {
  item: ToolRow;
  canRequest?: boolean;
  onRequestBorrow?: () => void;
}) {
  return (
    <div className="py-6">
      <div className="px-4">
        <h3 className="text-lg font-semibold">{item.name}</h3>
        <p className="text-sm text-muted-foreground">
          {item.category} · {item.condition.replace("_", " ")} · listed{" "}
          {new Date(item.createdAt).toLocaleDateString()}
        </p>
      </div>
      <div className="flex flex-col gap-4 overflow-y-auto p-4 text-sm">
        {item.imageUrl && (
          <div className="relative aspect-video w-full overflow-hidden rounded-md border">
            <Image
              src={item.imageUrl}
              alt={item.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 480px"
            />
          </div>
        )}
        <p>{item.description}</p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Owner:</span>
            <span>{item.ownerName ?? "—"}</span>
          </div>
          {item.ownerTrusted && (
            <Badge variant="outline" className="gap-1 w-fit">
              <ShieldCheckIcon className="size-3" />
              Trusted
            </Badge>
          )}
        </div>

        <Badge variant="outline" className="w-fit capitalize">
          {item.status}
        </Badge>
        {canRequest && onRequestBorrow && (
          <Button onClick={onRequestBorrow} className="w-full">
            Request to borrow
          </Button>
        )}
      </div>
    </div>
  );
}
