import { prisma } from "@/lib/db";
import { ProductFormData } from "@/lib/validations/product";
import { InventoryService } from "@/services/inventory.service";
import { StockStatus } from "@/types";

export interface ProductQueryFilters {
  search?: string;
  categoryId?: string;
  status?: StockStatus;
  active?: boolean;
  page?: number;
  limit?: number;
  sortBy?: "name" | "sku" | "createdAt" | "reorderPoint";
  sortOrder?: "asc" | "desc";
}

export class ProductService {
  /**
   * Retrieves products with pagination, search, category filter, and calculated stock status.
   */
  static async getProducts(filters?: ProductQueryFilters) {
    const page = Math.max(1, filters?.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters?.limit ?? 20));
    const skip = (page - 1) * limit;

    const where = {
      ...(filters?.active !== undefined ? { active: filters.active } : {}),
      ...(filters?.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters?.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: "insensitive" as const } },
              { sku: { contains: filters.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const sortBy = filters?.sortBy ?? "name";
    const sortOrder = filters?.sortOrder ?? "asc";

    const [rawProducts, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true, code: true },
          },
          inventories: {
            select: {
              quantity: true,
              reservedQuantity: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    // Compute totalStock and stockStatus using domain rules
    const items = rawProducts.map((p) => {
      const totalStock = p.inventories.reduce(
        (acc, inv) => acc + (inv.quantity ?? 0),
        0
      );
      const stockStatus = InventoryService.calculateStockStatus(
        totalStock,
        p.reorderPoint
      );

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        description: p.description,
        categoryId: p.categoryId,
        category: p.category,
        uom: p.uom,
        reorderPoint: p.reorderPoint,
        minStockLevel: p.minStockLevel,
        maxStockLevel: p.maxStockLevel,
        costPrice: Number(p.costPrice),
        sellingPrice: Number(p.sellingPrice),
        active: p.active,
        totalStock,
        stockStatus,
        updatedAt: p.updatedAt,
        createdAt: p.createdAt,
      };
    });

    // If client filtered by stockStatus, filter and adjust counts
    let filteredItems = items;
    if (filters?.status) {
      filteredItems = items.filter((item) => item.stockStatus === filters.status);
    }

    return {
      items: filteredItems,
      total: filters?.status ? filteredItems.length : totalCount,
      page,
      limit,
      totalPages: Math.ceil((filters?.status ? filteredItems.length : totalCount) / limit),
    };
  }

  /**
   * Retrieves single product with detailed location inventory and recent ledger history.
   */
  static async getProductById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        inventories: {
          include: {
            warehouse: {
              select: { id: true, name: true, code: true, active: true },
            },
            location: {
              select: { id: true, name: true, code: true, type: true, active: true },
            },
          },
          orderBy: [
            { warehouse: { name: "asc" } },
            { location: { code: "asc" } },
          ],
        },
        ledgerEntries: {
          include: {
            warehouse: { select: { name: true, code: true } },
            location: { select: { name: true, code: true } },
            createdBy: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!product) {
      throw new Error(`Product with ID "${id}" was not found.`);
    }

    const totalStock = product.inventories.reduce(
      (acc, inv) => acc + (inv.quantity ?? 0),
      0
    );
    const stockStatus = InventoryService.calculateStockStatus(
      totalStock,
      product.reorderPoint
    );

    return {
      ...product,
      costPrice: Number(product.costPrice),
      sellingPrice: Number(product.sellingPrice),
      totalStock,
      stockStatus,
      locationsCount: product.inventories.length,
    };
  }

  /**
   * Creates a new product catalog entry.
   */
  static async createProduct(data: ProductFormData) {
    // 1. Assert unique SKU
    const existingSku = await prisma.product.findUnique({
      where: { sku: data.sku },
    });
    if (existingSku) {
      throw new Error(`Product with SKU "${data.sku}" already exists.`);
    }

    // 2. Assert valid category
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) {
      throw new Error(`Specified category does not exist.`);
    }

    return prisma.product.create({
      data: {
        name: data.name.trim(),
        sku: data.sku.trim().toUpperCase(),
        description: data.description?.trim() || null,
        categoryId: data.categoryId,
        uom: data.uom.trim().toLowerCase(),
        reorderPoint: data.reorderPoint,
        minStockLevel: data.minStockLevel,
        maxStockLevel: data.maxStockLevel ?? null,
        costPrice: data.costPrice,
        sellingPrice: data.sellingPrice,
        active: data.active ?? true,
      },
      include: {
        category: true,
      },
    });
  }

  /**
   * Updates an existing product catalog entry.
   */
  static async updateProduct(id: string, data: Partial<ProductFormData>) {
    const product = await this.getProductById(id);

    // Validate SKU uniqueness if changing
    if (data.sku && data.sku !== product.sku) {
      const conflict = await prisma.product.findUnique({
        where: { sku: data.sku },
      });
      if (conflict) {
        throw new Error(`Product with SKU "${data.sku}" already exists.`);
      }
    }

    // Validate category if changing
    if (data.categoryId && data.categoryId !== product.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
      });
      if (!category) {
        throw new Error(`Specified category does not exist.`);
      }
    }

    return prisma.product.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.sku ? { sku: data.sku.trim().toUpperCase() } : {}),
        ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
        ...(data.categoryId ? { categoryId: data.categoryId } : {}),
        ...(data.uom ? { uom: data.uom.trim().toLowerCase() } : {}),
        ...(data.reorderPoint !== undefined ? { reorderPoint: data.reorderPoint } : {}),
        ...(data.minStockLevel !== undefined ? { minStockLevel: data.minStockLevel } : {}),
        ...(data.maxStockLevel !== undefined ? { maxStockLevel: data.maxStockLevel } : {}),
        ...(data.costPrice !== undefined ? { costPrice: data.costPrice } : {}),
        ...(data.sellingPrice !== undefined ? { sellingPrice: data.sellingPrice } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
      include: {
        category: true,
      },
    });
  }

  /**
   * Deletes a product if no ledger history or positive stock exists.
   */
  static async deleteProduct(id: string) {
    const product = await this.getProductById(id);

    // Check ledger entries (immutable audit trail preservation)
    const ledgerCount = await prisma.stockLedger.count({
      where: { productId: id },
    });
    if (ledgerCount > 0) {
      throw new Error(
        `Cannot delete product "${product.name}" (${product.sku}): It has ${ledgerCount} historical ledger transaction(s). Deactivate the product instead.`
      );
    }

    // Check active inventory balance
    if (product.totalStock > 0) {
      throw new Error(
        `Cannot delete product: It currently holds ${product.totalStock} units across warehouse locations. Clear stock via adjustments before deleting.`
      );
    }

    // Delete zero-balance inventory rows first
    await prisma.inventory.deleteMany({
      where: { productId: id },
    });

    return prisma.product.delete({
      where: { id },
    });
  }
}
