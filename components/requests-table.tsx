"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CircleCheckIcon,
  CircleXIcon,
  ClockIcon,
  EllipsisVerticalIcon,
  RotateCcwIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DragColumn,
  SelectColumn,
  type DataTableColumn,
  type DataTableFeatures,
  type DataTableMeta,
} from "@/components/data-table";
import { Id } from "@/convex/_generated/dataModel";

export type RequestStatus =
  "pending" | "approved" | "declined" | "returned" | "cancelled";

export type RequestRow = {
  id: Id<"loanRequests">;
  ownerId: Id<"users">;
  borrowerId: Id<"users">;
  toolName: string;
  ownerName: string;
  borrowerName: string;
  startDate: number;
  endDate: number;
  status: RequestStatus;
  createdAt: number;
};

/**
 * Extra callbacks the requests table needs beyond the shared meta.
 * Thread these through `DataTable`'s `meta` via the page.
 */
export type RequestMeta = {
  onApprove?: (row: RequestRow) => void;
  onDecline?: (row: RequestRow) => void;
  onMarkReturned?: (row: RequestRow) => void;
  onCancel?: (row: RequestRow) => void;
};

const columnHelper = createColumnHelper<DataTableFeatures, RequestRow>();

function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <Badge
      variant="outline"
      className="px-1.5 capitalize text-muted-foreground"
    >
      {status === "approved" || status === "returned" ? (
        <CircleCheckIcon className="fill-green-500 dark:fill-green-400" />
      ) : status === "declined" || status === "cancelled" ? (
        <CircleXIcon className="text-muted-foreground" />
      ) : (
        <ClockIcon className="text-muted-foreground" />
      )}
      {status}
    </Badge>
  );
}

const formatDate = (ms: number) => new Date(ms).toLocaleDateString();

/**
 * `variant` decides which name column is shown:
 * - "borrower": My Requests view → show the tool + owner (you're the borrower)
 * - "owner":    Incoming Requests view → show the tool + borrower
 */
export function buildRequestColumns(
  variant: "borrower" | "owner",
): DataTableColumn<RequestRow>[] {
  return columnHelper.columns([
    DragColumn<RequestRow>(),
    SelectColumn<RequestRow>(),
    columnHelper.accessor("toolName", {
      header: "Tool",
      enableHiding: false,
    }),
    columnHelper.accessor(
      variant === "borrower" ? "ownerName" : "borrowerName",
      {
        id: variant === "borrower" ? "ownerName" : "borrowerName",
        header: variant === "borrower" ? "Owner" : "Borrower",
      },
    ),
    columnHelper.accessor("startDate", {
      header: "Start",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatDate(row.original.startDate)}
        </span>
      ),
    }),
    columnHelper.accessor("endDate", {
      header: "End",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatDate(row.original.endDate)}
        </span>
      ),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    }),
    columnHelper.accessor("createdAt", {
      header: "Requested",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    }),
    columnHelper.display({
      id: "actions",
      cell: ({ row, table }) => {
        const meta = table.options.meta as DataTableMeta<RequestRow> &
          RequestMeta;
        if (!meta.isAuthenticated) return null;

        const r = row.original;
        const isOwner =
          meta.currentUserId !== null && r.ownerId === meta.currentUserId;
        const isBorrower =
          meta.currentUserId !== null && r.borrowerId === meta.currentUserId;
        const isPending = r.status === "pending";
        const isApproved = r.status === "approved";

        const handleApprove = meta.onApprove;
        const handleDecline = meta.onDecline;
        const handleMarkReturned = meta.onMarkReturned;
        const handleCancel = meta.onCancel;

        const canApprove = !!handleApprove && isOwner && isPending;
        const canDecline = !!handleDecline && isOwner && isPending;
        const canMarkReturned = !!handleMarkReturned && isOwner && isApproved;
        const canCancel = !!handleCancel && isBorrower && isPending;

        const hasAny = canApprove || canDecline || canMarkReturned || canCancel;
        if (!hasAny) return null;

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
              {canApprove && (
                <DropdownMenuItem onClick={() => handleApprove(r)}>
                  Approve
                </DropdownMenuItem>
              )}
              {canDecline && (
                <DropdownMenuItem onClick={() => handleDecline(r)}>
                  Decline
                </DropdownMenuItem>
              )}
              {canMarkReturned && (
                <DropdownMenuItem onClick={() => handleMarkReturned(r)}>
                  <RotateCcwIcon />
                  Mark returned
                </DropdownMenuItem>
              )}
              {canCancel && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => handleCancel(r)}
                  >
                    Cancel request
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    }),
  ]);
}

export function RequestDetails({ item }: { item: RequestRow }) {
  return (
    <>
      <div className="px-4">
        <h3 className="text-lg font-semibold">{item.toolName}</h3>
        <p className="text-sm text-muted-foreground">
          {formatDate(item.startDate)} → {formatDate(item.endDate)}
        </p>
      </div>
      <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Owner:</span>
          <span>{item.ownerName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Borrower:</span>
          <span>{item.borrowerName}</span>
        </div>
        <StatusBadge status={item.status} />
      </div>
    </>
  );
}
