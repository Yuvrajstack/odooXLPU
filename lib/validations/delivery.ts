import { z } from "zod";

export const deliveryItemSchema = z.object({
  productId: z.string().trim().min(1, "Product is required"),
  locationId: z.string().trim().min(1, "Source location is required"),
  requestedQuantity: z.coerce
    .number()
    .gt(0, "Requested quantity must be greater than 0"),
  deliveredQuantity: z.coerce
    .number()
    .min(0, "Delivered quantity cannot be negative")
    .default(0),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const createDeliverySchema = z.object({
  deliveryNumber: z
    .string()
    .trim()
    .max(50)
    .regex(/^[A-Z0-9_-]+$/i, "Delivery number can only contain alphanumeric characters, hyphens, and underscores")
    .optional()
    .nullable(),
  customerName: z
    .string()
    .trim()
    .min(2, "Customer name must be at least 2 characters")
    .max(150),
  customerContact: z.string().trim().max(100).optional().nullable(),
  warehouseId: z.string().trim().min(1, "Warehouse is required"),
  notes: z.string().trim().max(1000).optional().nullable(),
  deliveryDate: z.string().optional().nullable(),
  items: z
    .array(deliveryItemSchema)
    .min(1, "Delivery order must contain at least one line item"),
});

export const updateDeliverySchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(2, "Customer name must be at least 2 characters")
    .max(150)
    .optional(),
  customerContact: z.string().trim().max(100).optional().nullable(),
  warehouseId: z.string().trim().min(1, "Warehouse is required").optional(),
  notes: z.string().trim().max(1000).optional().nullable(),
  deliveryDate: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "WAITING", "READY", "DONE", "CANCELED"]).optional(),
  items: z
    .array(deliveryItemSchema)
    .min(1, "Delivery order must contain at least one line item")
    .optional(),
});

export type DeliveryItemFormData = z.infer<typeof deliveryItemSchema>;
export type CreateDeliveryFormData = z.infer<typeof createDeliverySchema>;
export type UpdateDeliveryFormData = z.infer<typeof updateDeliverySchema>;
