"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EllipsisVerticalIcon, ShieldCheckIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  type DataTableColumn,
  type DataTableFeatures,
  type DataTableMeta,
} from "@/components/data-table";
import type { Id } from "@/convex/_generated/dataModel";

export type UserRow = {
  id: Id<"users">;
  name: string;
  email: string;
  role: "admin" | "user";
  trustedLender: boolean;
};

type UserMeta = DataTableMeta<UserRow> & {
  onToggleTrusted?: (row: UserRow) => void;
};

const columnHelper = createColumnHelper<DataTableFeatures, UserRow>();

export const adminUserColumns: DataTableColumn<UserRow>[] =
  columnHelper.columns([
    columnHelper.accessor("name", { header: "Name" }),
    columnHelper.accessor("email", { header: "Email" }),
    columnHelper.accessor("role", {
      header: "Role",
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.original.role}
        </Badge>
      ),
    }),
    columnHelper.accessor("trustedLender", {
      header: "Trusted",
      cell: ({ row }) =>
        row.original.trustedLender ? (
          <Badge variant="outline" className="gap-1">
            <ShieldCheckIcon className="size-3" />
            Trusted
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    }),
    columnHelper.display({
      id: "actions",
      cell: ({ row, table }) => {
        const meta = table.options.meta as UserMeta;
        if (!meta.isAdmin) return null;
        const handleToggle = meta.onToggleTrusted;
        if (!handleToggle) return null;

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
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => handleToggle(row.original)}>
                {row.original.trustedLender
                  ? "Unmark as trusted lender"
                  : "Mark as trusted lender"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    }),
  ]);
