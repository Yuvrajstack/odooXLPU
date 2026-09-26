import { prisma } from "@/lib/db";
import { OperationStatus } from "@/types";

export interface DashboardFilterParams {
  documentType?: "ALL" | "RECEIPT" | "DELIVERY" | "TRANSFER" | "ADJUSTMENT";
  status?: OperationStatus;
  warehouseId?: string;
  locationId?: string;
  categoryId?: string;
  limit?: number;
}

export class DashboardService {
  /**
   * Computes live KPIs directly from database tables.
   */
  static async getKPIs() {
    // 1. Fetch Products with inventories
    const products = await prisma.product.findMany({
      where: { active: true },
      include: {
        inventories: {
          select: { quantity: true },
        },
      },
    });

    let totalProductsInStock = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const p of products) {
      const stock = p.inventories.reduce((sum, inv) => sum + inv.quantity, 0);
      if (stock > 0) {
        totalProductsInStock++;
      }
      if (stock === 0) {
        outOfStockCount++;
      } else if (stock <= p.reorderPoint) {
        lowStockCount++;
      }
    }

    // 2. Pending Receipts (DRAFT, WAITING, READY)
    const pendingReceipts = await prisma.receipt.count({
      where: {
        status: { in: [OperationStatus.DRAFT, OperationStatus.WAITING, OperationStatus.READY] },
      },
    });

    // 3. Pending Deliveries
    const pendingDeliveries = await prisma.delivery.count({
      where: {
        status: { in: [OperationStatus.DRAFT, OperationStatus.WAITING, OperationStatus.READY] },
      },
    });

    // 4. Internal Transfers Scheduled
    const internalTransfersScheduled = await prisma.transfer.count({
      where: {
        status: { in: [OperationStatus.DRAFT, OperationStatus.WAITING, OperationStatus.READY] },
      },
    });

    return {
      totalProductsInStock,
      totalActiveSKUs: products.length,
      lowStockCount,
      outOfStockCount,
      pendingReceipts,
      pendingDeliveries,
      internalTransfersScheduled,
    };
  }

  /**
   * Retrieves unified recent and filtered operational documents across all 4 movement types.
   */
  static async getFilteredOperations(filters?: DashboardFilterParams) {
    const docType = filters?.documentType || "ALL";
    const status = filters?.status;
    const warehouseId = filters?.warehouseId;
    const locationId = filters?.locationId;
    const categoryId = filters?.categoryId;
    const limit = filters?.limit || 30;

    const queries: Promise<any[]>[] = [];

    // Receipts
    if (docType === "ALL" || docType === "RECEIPT") {
      queries.push(
        prisma.receipt.findMany({
          where: {
            ...(status ? { status } : {}),
            ...(warehouseId ? { warehouseId } : {}),
            ...(categoryId || locationId
              ? {
                  items: {
                    some: {
                      ...(locationId ? { locationId } : {}),
                      ...(categoryId ? { product: { categoryId } } : {}),
                    },
                  },
                }
              : {}),
          },
          include: {
            warehouse: { select: { id: true, name: true, code: true } },
            createdBy: { select: { name: true } },
            items: {
              include: {
                product: { select: { name: true, sku: true, categoryId: true } },
                location: { select: { name: true, code: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: limit,
        }).then((docs) =>
          docs.map((d) => ({
            id: d.id,
            documentType: "RECEIPT" as const,
            documentNumber: d.receiptNumber,
            partner: d.supplierName,
            warehouse: d.warehouse.name,
            warehouseCode: d.warehouse.code,
            status: d.status,
            itemCount: d.items.length,
            primaryProduct: d.items[0]?.product?.name || "Multiple Items",
            primarySku: d.items[0]?.product?.sku || "",
            primaryLocation: d.items[0]?.location?.code || "",
            createdAt: d.createdAt,
            href: `/operations/receipts/${d.id}`,
          }))
        )
      );
    }

    // Deliveries
    if (docType === "ALL" || docType === "DELIVERY") {
      queries.push(
        prisma.delivery.findMany({
          where: {
            ...(status ? { status } : {}),
            ...(warehouseId ? { warehouseId } : {}),
            ...(categoryId || locationId
              ? {
                  items: {
                    some: {
                      ...(locationId ? { locationId } : {}),
                      ...(categoryId ? { product: { categoryId } } : {}),
                    },
                  },
                }
              : {}),
          },
          include: {
            warehouse: { select: { id: true, name: true, code: true } },
            createdBy: { select: { name: true } },
            items: {
              include: {
                product: { select: { name: true, sku: true, categoryId: true } },
                location: { select: { name: true, code: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: limit,
        }).then((docs) =>
          docs.map((d) => ({
            id: d.id,
            documentType: "DELIVERY" as const,
            documentNumber: d.deliveryNumber,
            partner: d.customerName,
            warehouse: d.warehouse.name,
            warehouseCode: d.warehouse.code,
            status: d.status,
            itemCount: d.items.length,
            primaryProduct: d.items[0]?.product?.name || "Multiple Items",
            primarySku: d.items[0]?.product?.sku || "",
            primaryLocation: d.items[0]?.location?.code || "",
            createdAt: d.createdAt,
            href: `/operations/deliveries/${d.id}`,
          }))
        )
      );
    }

    // Transfers
    if (docType === "ALL" || docType === "TRANSFER") {
      queries.push(
        prisma.transfer.findMany({
          where: {
            ...(status ? { status } : {}),
            ...(warehouseId
              ? {
                  OR: [
                    { sourceWarehouseId: warehouseId },
                    { destinationWarehouseId: warehouseId },
                  ],
                }
              : {}),
            ...(locationId
              ? {
                  OR: [
                    { sourceLocationId: locationId },
                    { destinationLocationId: locationId },
                  ],
                }
              : {}),
            ...(categoryId
              ? {
                  items: {
                    some: {
                      product: { categoryId },
                    },
                  },
                }
              : {}),
          },
          include: {
            sourceWarehouse: { select: { id: true, name: true, code: true } },
            destinationWarehouse: { select: { id: true, name: true, code: true } },
            sourceLocation: { select: { id: true, name: true, code: true } },
            destinationLocation: { select: { id: true, name: true, code: true } },
            createdBy: { select: { name: true } },
            items: {
              include: {
                product: { select: { name: true, sku: true, categoryId: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: limit,
        }).then((docs) =>
          docs.map((d) => ({
            id: d.id,
            documentType: "TRANSFER" as const,
            documentNumber: d.transferNumber,
            partner: `${d.sourceLocation.code} → ${d.destinationLocation.code}`,
            warehouse: d.sourceWarehouse.name,
            warehouseCode: d.sourceWarehouse.code,
            status: d.status,
            itemCount: d.items.length,
            primaryProduct: d.items[0]?.product?.name || "Multiple Items",
            primarySku: d.items[0]?.product?.sku || "",
            primaryLocation: `${d.sourceLocation.code} → ${d.destinationLocation.code}`,
            createdAt: d.createdAt,
            href: `/operations/transfers/${d.id}`,
          }))
        )
      );
    }

    // Adjustments
    if (docType === "ALL" || docType === "ADJUSTMENT") {
      queries.push(
        prisma.adjustment.findMany({
          where: {
            ...(status ? { status } : {}),
            ...(warehouseId ? { warehouseId } : {}),
            ...(locationId ? { locationId } : {}),
            ...(categoryId
              ? {
                  items: {
                    some: {
                      product: { categoryId },
                    },
                  },
                }
              : {}),
          },
          include: {
            warehouse: { select: { id: true, name: true, code: true } },
            location: { select: { id: true, name: true, code: true } },
            createdBy: { select: { name: true } },
            items: {
              include: {
                product: { select: { name: true, sku: true, categoryId: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: limit,
        }).then((docs) =>
          docs.map((d) => ({
            id: d.id,
            documentType: "ADJUSTMENT" as const,
            documentNumber: d.adjustmentNumber,
            partner: d.reason,
            warehouse: d.warehouse.name,
            warehouseCode: d.warehouse.code,
            status: d.status,
            itemCount: d.items.length,
            primaryProduct: d.items[0]?.product?.name || "Multiple Items",
            primarySku: d.items[0]?.product?.sku || "",
            primaryLocation: d.location.code,
            createdAt: d.createdAt,
            href: `/operations/adjustments/${d.id}`,
          }))
        )
      );
    }

    const results = await Promise.all(queries);
    const combined = results.flat().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return combined.slice(0, limit);
  }
}
