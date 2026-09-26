import { prisma } from "@/lib/db";
import { CategoryFormData } from "@/lib/validations/category";

export interface CategoryQueryFilters {
  search?: string;
  activeOnly?: boolean;
  page?: number;
  limit?: number;
}

export class CategoryService {
  /**
   * Retrieves categories with pagination, search, and product counts.
   */
  static async getCategories(filters?: CategoryQueryFilters) {
    const page = Math.max(1, filters?.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters?.limit ?? 20));
    const skip = (page - 1) * limit;

    const where = {
      ...(filters?.activeOnly ? { active: true } : {}),
      ...(filters?.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: "insensitive" as const } },
              { code: { contains: filters.search, mode: "insensitive" as const } },
              { description: { contains: filters.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.category.findMany({
        where,
        include: {
          _count: {
            select: { products: true },
          },
        },
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.category.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Returns a single category with its products.
   */
  static async getCategoryById(id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      throw new Error(`Category with ID "${id}" was not found.`);
    }

    return category;
  }

  /**
   * Creates a new category ensuring unique name and code.
   */
  static async createCategory(data: CategoryFormData) {
    const existingCode = await prisma.category.findUnique({
      where: { code: data.code },
    });
    if (existingCode) {
      throw new Error(`A category with code "${data.code}" already exists.`);
    }

    const existingName = await prisma.category.findUnique({
      where: { name: data.name },
    });
    if (existingName) {
      throw new Error(`A category with name "${data.name}" already exists.`);
    }

    return prisma.category.create({
      data: {
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        description: data.description?.trim() || null,
        active: data.active ?? true,
      },
    });
  }

  /**
   * Updates an existing category.
   */
  static async updateCategory(id: string, data: Partial<CategoryFormData>) {
    const category = await this.getCategoryById(id);

    if (data.code && data.code !== category.code) {
      const conflict = await prisma.category.findUnique({
        where: { code: data.code },
      });
      if (conflict) {
        throw new Error(`A category with code "${data.code}" already exists.`);
      }
    }

    if (data.name && data.name !== category.name) {
      const conflict = await prisma.category.findUnique({
        where: { name: data.name },
      });
      if (conflict) {
        throw new Error(`A category with name "${data.name}" already exists.`);
      }
    }

    return prisma.category.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.code ? { code: data.code.trim().toUpperCase() } : {}),
        ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
    });
  }

  /**
   * Safely deletes a category, rejecting if products depend on it.
   */
  static async deleteCategory(id: string) {
    const productCount = await prisma.product.count({
      where: { categoryId: id },
    });

    if (productCount > 0) {
      throw new Error(
        `Cannot delete category: ${productCount} active product(s) are assigned to it. Reassign or delete those products first.`
      );
    }

    return prisma.category.delete({
      where: { id },
    });
  }
}
