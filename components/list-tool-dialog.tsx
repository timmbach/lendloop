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
  DialogTrigger,
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

export function ListToolDialog({ children }: { children: React.ReactElement }) {
  const [open, setOpen] = React.useState(false);
  const [selectedImage, setSelectedImage] = React.useState<File | null>(null);
  const [imageError, setImageError] = React.useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = React.useState(0);

  const generateUploadUrl = useMutation(api.tools.generateImageUploadUrl);
  const createTool = useMutation(api.tools.createToolListing);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: undefined as unknown as FormValues["category"],
      condition: undefined as unknown as FormValues["condition"],
      description: "",
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

  function resetAll() {
    form.reset();
    clearImage();
  }

  async function onSubmit(values: FormValues) {
    if (!selectedImage) {
      setImageError("An image is required");
      return;
    }

    try {
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

      await createTool({ ...values, imageId: storageId });

      toast.success("Tool listed successfully");
      resetAll();
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to list tool");
    }
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetAll();
      }}
    >
      <DialogTrigger render={children} />
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>List a tool</DialogTitle>
          <DialogDescription>
            Share something you own. Others can request to borrow it.
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
                  <Input
                    placeholder="e.g. DeWalt 18V Cordless Drill"
                    aria-invalid={fieldState.invalid}
                    {...field}
                  />
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
                    placeholder="Lightly used, comes with two batteries and a charger."
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
              {imagePreview ? (
                <div className="relative aspect-video w-full overflow-hidden rounded-md border">
                  <Image
                    src={imagePreview}
                    alt="Selected tool"
                    fill
                    sizes="(max-width: 768px) 100vw, 480px"
                    className="object-cover"
                    unoptimized
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
              {imageError && <FieldError errors={[{ message: imageError }]} />}
            </Field>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Listing…" : "List tool"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
