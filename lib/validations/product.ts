import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters").max(150),
  sku: z
    .string()
    .min(2, "SKU must be at least 2 characters")
    .max(50)
    .regex(/^[A-Z0-9_.-]+$/i, "SKU must contain only letters, numbers, hyphens, periods, and underscores")
    .transform((v) => v.toUpperCase()),
  description: z.string().max(1000).optional().nullable(),
  categoryId: z.string().min(1, "Please select a category"),
  uom: z.string().min(1, "Unit of measure is required").default("units"),
  reorderPoint: z.coerce.number().min(0, "Reorder point must be greater than or equal to 0").default(10),
  minStockLevel: z.coerce.number().min(0, "Minimum stock level must be >= 0").default(5),
  maxStockLevel: z.coerce.number().min(0).optional().nullable(),
  costPrice: z.coerce.number().min(0, "Cost price must be >= 0").default(0),
  sellingPrice: z.coerce.number().min(0, "Selling price must be >= 0").default(0),
  active: z.boolean().default(true),
});

export type ProductFormData = z.infer<typeof productSchema>;
