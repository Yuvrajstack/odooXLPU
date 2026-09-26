import { z } from "zod";

export const warehouseSchema = z.object({
  name: z.string().min(2, "Warehouse name must be at least 2 characters").max(100),
  code: z
    .string()
    .min(2, "Warehouse code must be at least 2 characters")
    .max(20)
    .regex(/^[A-Z0-9_-]+$/i, "Code must contain only letters, numbers, hyphens, and underscores")
    .transform((v) => v.toUpperCase()),
  address: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  active: z.boolean().default(true),
});

export type WarehouseFormData = z.infer<typeof warehouseSchema>;
