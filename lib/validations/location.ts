import { z } from "zod";

export const locationSchema = z.object({
  warehouseId: z.string().min(1, "Warehouse is required"),
  name: z.string().min(2, "Location name must be at least 2 characters").max(100),
  code: z
    .string()
    .min(2, "Location code must be at least 2 characters")
    .max(30)
    .regex(/^[A-Z0-9_-]+$/i, "Code must contain only letters, numbers, hyphens, and underscores")
    .transform((v) => v.toUpperCase()),
  type: z.enum([
    "RACK",
    "SHELF",
    "BIN",
    "PALLET",
    "FLOOR",
    "INCOMING",
    "OUTGOING",
    "PRODUCTION",
  ]).default("RACK"),
  active: z.boolean().default(true),
});

export type LocationFormData = z.infer<typeof locationSchema>;
