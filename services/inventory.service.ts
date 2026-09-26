import { prisma } from "@/lib/db";
import { StockStatus } from "@/types";

export interface GlobalInventoryQueryFilters {
  search?: string;
  categoryId?: string;
  warehouseId?: string;
  locationId?: string;
  status?: StockStatus;
  page?: number;
  limit?: number;
}

export class InventoryService {
  /**
   * Domain-level calculation of stock status based on on-hand count and reorder point.
   */
  static calculateStockStatus(quantity: number, reorderPoint: number): StockStatus {
    if (quantity <= 0) return "OUT_OF_STOCK";
    if (quantity <= reorderPoint) return "LOW_STOCK";
    return "IN_STOCK";
  }

  /**
   * Returns current on-hand and reserved quantity for a product at a specific location.
   */
  static async getStockAtLocation(productId: string, locationId: string) {
    const record = await prisma.inventory.findUnique({
      where: {
        productId_locationId: { productId, locationId },
      },
    });

    return {
      quantity: record?.quantity ?? 0,
      reservedQuantity: record?.reservedQuantity ?? 0,
      available: (record?.quantity ?? 0) - (record?.reservedQuantity ?? 0),
    };
  }

  /**
   * Asserts whether sufficient stock exists at a location for an outbound operation.
   * Throws an error if stock is insufficient.
   */
  static async assertStockAvailability(
    productId: string,
    locationId: string,
    requestedQuantity: number
  ): Promise<void> {
    const stock = await this.getStockAtLocation(productId, locationId);
    if (stock.available < requestedQuantity) {
      throw new Error(
        `Insufficient stock: Location has ${stock.available} available units, but ${requestedQuantity} were requested.`
      );
    }
  }

  /**
   * Returns the total sum of inventory across all locations for a specific product.
   */
  static async getTotalProductStock(productId: string): Promise<number> {
    const aggregations = await prisma.inventory.aggregate({
      where: { productId },
      _sum: {
        quantity: true,
      },
    });
    return aggregations._sum.quantity ?? 0;
  }

  /**
   * Returns inventory records grouped by location for a single product.
   */
  static async getProductStockByLocation(productId: string) {
    return prisma.inventory.findMany({
      where: { productId },
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
    });
  }

  /**
   * Dedicated inventory overview with database-backed filtering, pagination, and calculated status.
   */
  static async getGlobalInventory(filters?: GlobalInventoryQueryFilters) {
    const page = Math.max(1, filters?.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters?.limit ?? 25));
    const skip = (page - 1) * limit;

    const where = {
      ...(filters?.warehouseId ? { warehouseId: filters.warehouseId } : {}),
      ...(filters?.locationId ? { locationId: filters.locationId } : {}),
      ...(filters?.categoryId
        ? {
            product: { categoryId: filters.categoryId },
          }
        : {}),
      ...(filters?.search
        ? {
            product: {
              OR: [
                { name: { contains: filters.search, mode: "insensitive" as const } },
                { sku: { contains: filters.search, mode: "insensitive" as const } },
              ],
            },
          }
        : {}),
    };

    const [records, totalCount] = await Promise.all([
      prisma.inventory.findMany({
        where,
        include: {
          product: {
            include: {
              category: true,
            },
          },
          warehouse: true,
          location: true,
        },
        orderBy: [
          { warehouse: { name: "asc" } },
          { location: { code: "asc" } },
          { product: { name: "asc" } },
        ],
        skip,
        take: limit,
      }),
      prisma.inventory.count({ where }),
    ]);

    const items = records.map((inv) => {
      const status = this.calculateStockStatus(
        inv.quantity,
        inv.product.reorderPoint
      );

      return {
        id: inv.id,
        productId: inv.productId,
        productName: inv.product.name,
        sku: inv.product.sku,
        categoryName: inv.product.category.name,
        categoryId: inv.product.categoryId,
        warehouseId: inv.warehouseId,
        warehouseName: inv.warehouse.name,
        warehouseCode: inv.warehouse.code,
        locationId: inv.locationId,
        locationName: inv.location.name,
        locationCode: inv.location.code,
        locationType: inv.location.type,
        quantity: inv.quantity,
        reservedQuantity: inv.reservedQuantity,
        availableQuantity: inv.quantity - inv.reservedQuantity,
        uom: inv.product.uom,
        reorderPoint: inv.product.reorderPoint,
        status,
        updatedAt: inv.updatedAt,
      };
    });

    let filteredItems = items;
    if (filters?.status) {
      filteredItems = items.filter((item) => item.status === filters.status);
    }

    return {
      items: filteredItems,
      total: filters?.status ? filteredItems.length : totalCount,
      page,
      limit,
      totalPages: Math.ceil((filters?.status ? filteredItems.length : totalCount) / limit),
    };
  }
}
