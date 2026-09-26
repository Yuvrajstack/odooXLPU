import { z } from "zod";

export const receiptItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  locationId: z.string().min(1, "Destination location is required"),
  expectedQuantity: z.coerce
    .number()
    .gt(0, "Expected quantity must be greater than 0"),
  receivedQuantity: z.coerce
    .number()
    .min(0, "Received quantity cannot be negative")
    .default(0),
  unitCost: z.coerce.number().min(0, "Unit cost cannot be negative").default(0),
  notes: z.string().max(500).optional().nullable(),
});

export const createReceiptSchema = z.object({
  receiptNumber: z
    .string()
    .max(50)
    .regex(/^[A-Z0-9_-]+$/i, "Receipt number can only contain alphanumeric characters, hyphens, and underscores")
    .optional()
    .nullable(),
  supplierName: z
    .string()
    .min(2, "Supplier name must be at least 2 characters")
    .max(150),
  supplierContact: z.string().max(100).optional().nullable(),
  warehouseId: z.string().min(1, "Warehouse is required"),
  notes: z.string().max(1000).optional().nullable(),
  receivedDate: z.string().optional().nullable(),
  items: z
    .array(receiptItemSchema)
    .min(1, "Receipt must contain at least one line item"),
});

export const updateReceiptSchema = z.object({
  supplierName: z
    .string()
    .min(2, "Supplier name must be at least 2 characters")
    .max(150)
    .optional(),
  supplierContact: z.string().max(100).optional().nullable(),
  warehouseId: z.string().min(1, "Warehouse is required").optional(),
  notes: z.string().max(1000).optional().nullable(),
  receivedDate: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "WAITING", "READY"]).optional(),
  items: z
    .array(receiptItemSchema)
    .min(1, "Receipt must contain at least one line item")
    .optional(),
});

export type ReceiptItemFormData = z.infer<typeof receiptItemSchema>;
export type CreateReceiptFormData = z.infer<typeof createReceiptSchema>;
export type UpdateReceiptFormData = z.infer<typeof updateReceiptSchema>;
