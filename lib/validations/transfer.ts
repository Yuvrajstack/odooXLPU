import { z } from "zod";

export const transferItemSchema = z.object({
  productId: z.string().trim().min(1, "Product is required"),
  quantity: z.coerce.number().gt(0, "Transfer quantity must be greater than 0"),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const createTransferSchema = z
  .object({
    transferNumber: z
      .string()
      .trim()
      .max(50)
      .regex(
        /^[A-Z0-9_-]+$/i,
        "Transfer number can only contain alphanumeric characters, hyphens, and underscores"
      )
      .optional()
      .nullable(),
    sourceWarehouseId: z.string().trim().min(1, "Source warehouse is required"),
    destinationWarehouseId: z.string().trim().min(1, "Destination warehouse is required"),
    sourceLocationId: z.string().trim().min(1, "Source location is required"),
    destinationLocationId: z.string().trim().min(1, "Destination location is required"),
    notes: z.string().trim().max(1000).optional().nullable(),
    items: z
      .array(transferItemSchema)
      .min(1, "Transfer order must contain at least one line item"),
  })
  .refine(
    (data) => data.sourceLocationId !== data.destinationLocationId,
    {
      message: "Destination location must be different from source location",
      path: ["destinationLocationId"],
    }
  );

export const updateTransferSchema = z
  .object({
    sourceWarehouseId: z.string().trim().min(1, "Source warehouse is required").optional(),
    destinationWarehouseId: z.string().trim().min(1, "Destination warehouse is required").optional(),
    sourceLocationId: z.string().trim().min(1, "Source location is required").optional(),
    destinationLocationId: z.string().trim().min(1, "Destination location is required").optional(),
    notes: z.string().trim().max(1000).optional().nullable(),
    status: z.enum(["DRAFT", "WAITING", "READY", "DONE", "CANCELED"]).optional(),
    items: z
      .array(transferItemSchema)
      .min(1, "Transfer order must contain at least one line item")
      .optional(),
  })
  .refine(
    (data) =>
      !data.sourceLocationId ||
      !data.destinationLocationId ||
      data.sourceLocationId !== data.destinationLocationId,
    {
      message: "Destination location must be different from source location",
      path: ["destinationLocationId"],
    }
  );

export type TransferItemFormData = z.infer<typeof transferItemSchema>;
export type CreateTransferFormData = z.infer<typeof createTransferSchema>;
export type UpdateTransferFormData = z.infer<typeof updateTransferSchema>;
