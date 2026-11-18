"use client";

import * as React from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";

export function RequestToolDialog({
  toolId,
  toolName,
  open,
  onOpenChange,
}: {
  toolId: Id<"tools"> | null;
  toolName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createRequest = useMutation(api.loanRequests.createLoanRequest);
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  function reset() {
    setStartDate("");
    setEndDate("");
    setIsSubmitting(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!toolId) return;

    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    if (Number.isNaN(start) || Number.isNaN(end)) {
      toast.error("Pick valid dates");
      return;
    }
    if (end <= start) {
      toast.error("End date must be after start date");
      return;
    }

    setIsSubmitting(true);
    try {
      await createRequest({ toolId, startDate: start, endDate: end });
      toast.success("Borrow request sent");
      onOpenChange(false);
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Request failed");
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request to borrow</DialogTitle>
          <DialogDescription>
            {toolName ? `Borrow "${toolName}" for a time period.` : ""}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field>
            <FieldLabel>Start date</FieldLabel>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </Field>
          <Field>
            <FieldLabel>End date</FieldLabel>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </Field>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sending…" : "Send request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
