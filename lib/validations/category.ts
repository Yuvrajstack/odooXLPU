import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters").max(100),
  code: z
    .string()
    .min(2, "Category code must be at least 2 characters")
    .max(20)
    .regex(/^[A-Z0-9_-]+$/i, "Code must contain only letters, numbers, hyphens, and underscores")
    .transform((v) => v.toUpperCase()),
  description: z.string().max(500).optional().nullable(),
  active: z.boolean().default(true),
});

export type CategoryFormData = z.infer<typeof categorySchema>;
