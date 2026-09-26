import { prisma } from "@/lib/db";

export class ProductService {
  static async getAll(filters?: {
    search?: string;
    categoryId?: string;
    activeOnly?: boolean;
  }) {
    return prisma.product.findMany({
      where: {
        ...(filters?.activeOnly ? { active: true } : {}),
        ...(filters?.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(filters?.search
          ? {
              OR: [
                { name: { contains: filters.search, mode: "insensitive" } },
                { sku: { contains: filters.search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        category: true,
        inventories: {
          include: {
            warehouse: true,
            location: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  static async getById(id: string) {
    return prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        inventories: {
          include: {
            warehouse: true,
            location: true,
          },
        },
      },
    });
  }
}
