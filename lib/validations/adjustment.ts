import { z } from "zod";

export const adjustmentItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  systemQuantity: z.coerce.number().default(0),
  physicalQuantity: z.coerce
    .number()
    .min(0, "Physical counted quantity cannot be negative"),
  notes: z.string().max(500).optional().nullable(),
});

export const createAdjustmentSchema = z.object({
  adjustmentNumber: z
    .string()
    .max(50)
    .regex(/^[A-Z0-9_-]+$/i, "Adjustment number can only contain alphanumeric characters, hyphens, and underscores")
    .optional()
    .nullable(),
  warehouseId: z.string().min(1, "Warehouse is required"),
  locationId: z.string().min(1, "Location is required"),
  reason: z
    .string()
    .min(3, "Mandatory reason must be at least 3 characters")
    .max(250),
  notes: z.string().max(1000).optional().nullable(),
  items: z
    .array(adjustmentItemSchema)
    .min(1, "Adjustment must contain at least one item to reconcile"),
});

export const updateAdjustmentSchema = z.object({
  reason: z.string().min(3).max(250).optional(),
  notes: z.string().max(1000).optional().nullable(),
  status: z.enum(["DRAFT", "WAITING", "READY", "DONE", "CANCELED"]).optional(),
  items: z
    .array(adjustmentItemSchema)
    .min(1, "Adjustment must contain at least one item to reconcile")
    .optional(),
});

export type AdjustmentItemFormData = z.infer<typeof adjustmentItemSchema>;
export type CreateAdjustmentFormData = z.infer<typeof createAdjustmentSchema>;
export type UpdateAdjustmentFormData = z.infer<typeof updateAdjustmentSchema>;
