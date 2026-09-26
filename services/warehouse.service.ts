import { prisma } from "@/lib/db";
import { WarehouseFormData } from "@/lib/validations/warehouse";
import { LocationFormData } from "@/lib/validations/location";
import { InventoryService } from "@/services/inventory.service";

export interface WarehouseQueryFilters {
  search?: string;
  activeOnly?: boolean;
}

export class WarehouseService {
  /**
   * Retrieves all warehouses with aggregated locations, product counts, and total units stored.
   */
  static async getWarehouses(filters?: WarehouseQueryFilters) {
    const where = {
      ...(filters?.activeOnly ? { active: true } : {}),
      ...(filters?.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: "insensitive" as const } },
              { code: { contains: filters.search, mode: "insensitive" as const } },
              { city: { contains: filters.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const warehouses = await prisma.warehouse.findMany({
      where,
      include: {
        locations: {
          select: { id: true, active: true },
        },
        inventories: {
          select: {
            productId: true,
            quantity: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return warehouses.map((wh) => {
      const distinctProductIds = new Set(wh.inventories.map((i) => i.productId));
      const totalStock = wh.inventories.reduce((acc, i) => acc + (i.quantity ?? 0), 0);

      return {
        id: wh.id,
        name: wh.name,
        code: wh.code,
        address: wh.address,
        city: wh.city,
        state: wh.state,
        country: wh.country,
        active: wh.active,
        locationsCount: wh.locations.length,
        activeLocationsCount: wh.locations.filter((l) => l.active).length,
        totalProducts: distinctProductIds.size,
        totalStock,
        updatedAt: wh.updatedAt,
        createdAt: wh.createdAt,
      };
    });
  }

  /**
   * Retrieves single warehouse with location breakdown and inventory metrics.
   */
  static async getWarehouseById(id: string) {
    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        locations: {
          include: {
            inventories: {
              include: {
                product: {
                  select: { id: true, name: true, sku: true, uom: true, reorderPoint: true },
                },
              },
            },
          },
          orderBy: { code: "asc" },
        },
      },
    });

    if (!warehouse) {
      throw new Error(`Warehouse with ID "${id}" was not found.`);
    }

    const allInventories = warehouse.locations.flatMap((l) => l.inventories);
    const distinctProductIds = new Set(allInventories.map((i) => i.productId));
    const totalUnits = allInventories.reduce((acc, i) => acc + (i.quantity ?? 0), 0);

    const locationsWithMetrics = warehouse.locations.map((loc) => {
      const locationTotalUnits = loc.inventories.reduce(
        (acc, inv) => acc + (inv.quantity ?? 0),
        0
      );
      return {
        id: loc.id,
        warehouseId: loc.warehouseId,
        name: loc.name,
        code: loc.code,
        type: loc.type,
        active: loc.active,
        productsCount: loc.inventories.length,
        totalQuantity: locationTotalUnits,
        inventories: loc.inventories.map((inv) => ({
          productId: inv.productId,
          productName: inv.product.name,
          sku: inv.product.sku,
          uom: inv.product.uom,
          quantity: inv.quantity,
          status: InventoryService.calculateStockStatus(inv.quantity, inv.product.reorderPoint),
        })),
        createdAt: loc.createdAt,
        updatedAt: loc.updatedAt,
      };
    });

    return {
      id: warehouse.id,
      name: warehouse.name,
      code: warehouse.code,
      address: warehouse.address,
      city: warehouse.city,
      state: warehouse.state,
      country: warehouse.country,
      active: warehouse.active,
      totalLocations: warehouse.locations.length,
      productsStoredCount: distinctProductIds.size,
      totalUnits,
      locations: locationsWithMetrics,
      createdAt: warehouse.createdAt,
      updatedAt: warehouse.updatedAt,
    };
  }

  /**
   * Creates a new warehouse.
   */
  static async createWarehouse(data: WarehouseFormData) {
    const existing = await prisma.warehouse.findUnique({
      where: { code: data.code },
    });
    if (existing) {
      throw new Error(`A warehouse with code "${data.code}" already exists.`);
    }

    return prisma.warehouse.create({
      data: {
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        address: data.address?.trim() || null,
        city: data.city?.trim() || null,
        state: data.state?.trim() || null,
        country: data.country?.trim() || null,
        active: data.active ?? true,
      },
    });
  }

  /**
   * Updates an existing warehouse.
   */
  static async updateWarehouse(id: string, data: Partial<WarehouseFormData>) {
    const warehouse = await this.getWarehouseById(id);

    if (data.code && data.code !== warehouse.code) {
      const conflict = await prisma.warehouse.findUnique({
        where: { code: data.code },
      });
      if (conflict) {
        throw new Error(`A warehouse with code "${data.code}" already exists.`);
      }
    }

    return prisma.warehouse.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.code ? { code: data.code.trim().toUpperCase() } : {}),
        ...(data.address !== undefined ? { address: data.address?.trim() || null } : {}),
        ...(data.city !== undefined ? { city: data.city?.trim() || null } : {}),
        ...(data.state !== undefined ? { state: data.state?.trim() || null } : {}),
        ...(data.country !== undefined ? { country: data.country?.trim() || null } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
    });
  }

  /**
   * Creates a new storage location inside a warehouse.
   */
  static async createLocation(data: LocationFormData) {
    // Assert warehouse exists
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: data.warehouseId },
    });
    if (!warehouse) {
      throw new Error(`Warehouse with ID "${data.warehouseId}" does not exist.`);
    }

    // Assert unique code within warehouse
    const existing = await prisma.location.findUnique({
      where: {
        warehouseId_code: {
          warehouseId: data.warehouseId,
          code: data.code.trim().toUpperCase(),
        },
      },
    });
    if (existing) {
      throw new Error(
        `Location code "${data.code}" already exists in warehouse "${warehouse.name}".`
      );
    }

    return prisma.location.create({
      data: {
        warehouseId: data.warehouseId,
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        type: data.type,
        active: data.active ?? true,
      },
    });
  }

  /**
   * Updates an existing location.
   */
  static async updateLocation(id: string, data: Partial<LocationFormData>) {
    const location = await prisma.location.findUnique({
      where: { id },
    });
    if (!location) {
      throw new Error(`Location with ID "${id}" was not found.`);
    }

    if (data.code && data.code !== location.code) {
      const conflict = await prisma.location.findUnique({
        where: {
          warehouseId_code: {
            warehouseId: location.warehouseId,
            code: data.code.trim().toUpperCase(),
          },
        },
      });
      if (conflict) {
        throw new Error(
          `Location code "${data.code}" already exists in this warehouse.`
        );
      }
    }

    return prisma.location.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.code ? { code: data.code.trim().toUpperCase() } : {}),
        ...(data.type ? { type: data.type } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
    });
  }

  /**
   * Retrieves single location with warehouse info and current physical inventory items.
   */
  static async getLocationById(id: string) {
    const location = await prisma.location.findUnique({
      where: { id },
      include: {
        warehouse: true,
        inventories: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
          orderBy: { product: { name: "asc" } },
        },
      },
    });

    if (!location) {
      throw new Error(`Location with ID "${id}" was not found.`);
    }

    const totalStock = location.inventories.reduce(
      (acc, inv) => acc + (inv.quantity ?? 0),
      0
    );

    const items = location.inventories.map((inv) => ({
      inventoryId: inv.id,
      productId: inv.productId,
      productName: inv.product.name,
      sku: inv.product.sku,
      categoryName: inv.product.category.name,
      uom: inv.product.uom,
      quantity: inv.quantity,
      reservedQuantity: inv.reservedQuantity,
      availableQuantity: inv.quantity - inv.reservedQuantity,
      reorderPoint: inv.product.reorderPoint,
      status: InventoryService.calculateStockStatus(
        inv.quantity,
        inv.product.reorderPoint
      ),
    }));

    return {
      id: location.id,
      name: location.name,
      code: location.code,
      type: location.type,
      active: location.active,
      warehouse: location.warehouse,
      totalItemsCount: items.length,
      totalUnits: totalStock,
      items,
      createdAt: location.createdAt,
      updatedAt: location.updatedAt,
    };
  }
}
