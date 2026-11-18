"use client";

import * as React from "react";
import Image from "next/image";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { XIcon } from "lucide-react";
import type { ToolRow } from "@/components/tools-table";

const CONDITIONS = ["new", "like_new", "good", "fair", "poor"] as const;
const CATEGORIES = ["power tools", "garden", "kitchen", "camping"] as const;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  category: z.enum(CATEGORIES, { message: "Pick a category" }),
  condition: z.enum(CONDITIONS, { message: "Pick a condition" }),
  description: z
    .string()
    .min(10, "Describe the tool in at least 10 characters"),
});

type FormValues = z.infer<typeof formSchema>;

export function EditListingDialog({
  tool,
  open,
  onOpenChange,
}: {
  tool: ToolRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [selectedImage, setSelectedImage] = React.useState<File | null>(null);
  const [imageError, setImageError] = React.useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = React.useState(0);

  const generateUploadUrl = useMutation(api.tools.generateImageUploadUrl);
  const editTool = useMutation(api.tools.editToolListing);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: tool?.name ?? "",
      category: (tool?.category as FormValues["category"]) ?? undefined,
      condition: tool?.condition ?? undefined,
      description: tool?.description ?? "",
    },
  });

  const imagePreview = React.useMemo(
    () => (selectedImage ? URL.createObjectURL(selectedImage) : null),
    [selectedImage],
  );

  React.useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImageError(null);

    if (!file) {
      setSelectedImage(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setImageError("Please choose an image file");
      setSelectedImage(null);
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError("Image must be 5 MB or smaller");
      setSelectedImage(null);
      return;
    }
    setSelectedImage(file);
  }

  function clearImage() {
    setSelectedImage(null);
    setImageError(null);
    setFileInputKey((k) => k + 1);
  }

  async function onSubmit(values: FormValues) {
    if (!tool) return;

    try {
      let imageId: Id<"_storage"> | undefined;

      if (selectedImage) {
        const postUrl = await generateUploadUrl();
        const uploadRes = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": selectedImage.type },
          body: selectedImage,
        });
        if (!uploadRes.ok) throw new Error("Image upload failed");
        const { storageId } = (await uploadRes.json()) as {
          storageId: Id<"_storage">;
        };
        imageId = storageId;
      }

      await editTool({
        toolId: tool.id,
        ...values,
        ...(imageId ? { imageId } : {}),
      });

      toast.success("Listing updated");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    }
  }

  const isSubmitting = form.formState.isSubmitting;
  const displayImage = imagePreview ?? tool?.imageUrl ?? null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setSelectedImage(null);
          setImageError(null);
        }
      }}
    >
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit listing</DialogTitle>
          <DialogDescription>
            Update the details of your tool listing.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col gap-4"
        >
          <div className="-mr-2 flex-1 space-y-4 overflow-y-auto pr-2">
            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Tool name</FieldLabel>
                  <Input aria-invalid={fieldState.invalid} {...field} />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="category"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Category</FieldLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                    >
                      <SelectTrigger aria-invalid={fieldState.invalid}>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c} className="capitalize">
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="condition"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Condition</FieldLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                    >
                      <SelectTrigger aria-invalid={fieldState.invalid}>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        {CONDITIONS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c.replace("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </div>

            <Controller
              control={form.control}
              name="description"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Short description</FieldLabel>
                  <Textarea
                    rows={4}
                    aria-invalid={fieldState.invalid}
                    {...field}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Field data-invalid={!!imageError}>
              <FieldLabel>Photo</FieldLabel>
              {displayImage ? (
                <div className="relative aspect-video w-full overflow-hidden rounded-md border">
                  <Image
                    src={displayImage}
                    alt={tool?.name ?? "Tool"}
                    fill
                    sizes="(max-width: 768px) 100vw, 480px"
                    className="object-cover"
                    unoptimized={!!imagePreview}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute top-2 right-2 size-7"
                    onClick={clearImage}
                    aria-label="Remove image"
                  >
                    <XIcon />
                  </Button>
                </div>
              ) : (
                <Input
                  key={fileInputKey}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  aria-invalid={!!imageError}
                />
              )}
              {selectedImage && (
                <p className="text-xs text-muted-foreground">
                  A new photo will replace the current one.
                </p>
              )}
              {!selectedImage && tool?.imageUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFileInputKey((k) => k + 1)}
                >
                  Choose a different photo
                </Button>
              )}
              {imageError && <FieldError errors={[{ message: imageError }]} />}
            </Field>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
