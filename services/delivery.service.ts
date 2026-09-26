import { prisma } from "@/lib/db";
import { CreateDeliveryFormData, UpdateDeliveryFormData } from "@/lib/validations/delivery";
import { OperationStatus } from "@/types";

export interface DeliveryQueryFilters {
  search?: string;
  status?: OperationStatus;
  warehouseId?: string;
  page?: number;
  limit?: number;
}

export class DeliveryService {
  /**
   * Generates a unique delivery sequence: DEL-YYYY-XXXX
   */
  static async generateDeliveryNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `DEL-${year}-`;

    const latest = await prisma.delivery.findFirst({
      where: {
        deliveryNumber: { startsWith: prefix },
      },
      orderBy: { deliveryNumber: "desc" },
      select: { deliveryNumber: true },
    });

    let nextSeq = 1;
    if (latest && latest.deliveryNumber) {
      const parts = latest.deliveryNumber.split("-");
      const currentSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(currentSeq)) {
        nextSeq = currentSeq + 1;
      }
    }

    return `${prefix}${nextSeq.toString().padStart(4, "0")}`;
  }

  /**
   * Retrieves paginated deliveries with search and filters.
   */
  static async getDeliveries(filters?: DeliveryQueryFilters) {
    const page = Math.max(1, filters?.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters?.limit ?? 20));
    const skip = (page - 1) * limit;

    const where = {
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.warehouseId ? { warehouseId: filters.warehouseId } : {}),
      ...(filters?.search
        ? {
            OR: [
              { deliveryNumber: { contains: filters.search, mode: "insensitive" as const } },
              { customerName: { contains: filters.search, mode: "insensitive" as const } },
              { notes: { contains: filters.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [deliveries, totalCount] = await Promise.all([
      prisma.delivery.findMany({
        where,
        include: {
          warehouse: { select: { id: true, name: true, code: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          validatedBy: { select: { id: true, name: true, email: true } },
          items: {
            select: {
              requestedQuantity: true,
              deliveredQuantity: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.delivery.count({ where }),
    ]);

    const items = deliveries.map((d) => {
      const totalRequested = d.items.reduce((acc, i) => acc + i.requestedQuantity, 0);
      const totalDelivered = d.items.reduce((acc, i) => acc + i.deliveredQuantity, 0);

      return {
        id: d.id,
        deliveryNumber: d.deliveryNumber,
        customerName: d.customerName,
        customerContact: d.customerContact,
        warehouseId: d.warehouseId,
        warehouse: d.warehouse,
        status: d.status,
        notes: d.notes,
        deliveryDate: d.deliveryDate,
        createdById: d.createdById,
        createdBy: d.createdBy,
        validatedById: d.validatedById,
        validatedBy: d.validatedBy,
        validatedAt: d.validatedAt,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        lineItemsCount: d.items.length,
        totalRequestedQuantity: totalRequested,
        totalDeliveredQuantity: totalDelivered,
      };
    });

    return {
      items,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    };
  }

  /**
   * Retrieves single delivery with complete items and location details.
   */
  static async getDeliveryById(id: string) {
    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: {
        warehouse: {
          select: { id: true, name: true, code: true, address: true, city: true },
        },
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        validatedBy: { select: { id: true, name: true, email: true, role: true } },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                uom: true,
                sellingPrice: true,
                reorderPoint: true,
              },
            },
            location: {
              select: { id: true, name: true, code: true, type: true, warehouseId: true },
            },
          },
          orderBy: { id: "asc" },
        },
      },
    });

    if (!delivery) {
      throw new Error(`Delivery order with ID "${id}" was not found.`);
    }

    const totalRequested = delivery.items.reduce((acc, i) => acc + i.requestedQuantity, 0);
    const totalDelivered = delivery.items.reduce((acc, i) => acc + i.deliveredQuantity, 0);

    return {
      ...delivery,
      totalRequestedQuantity: totalRequested,
      totalDeliveredQuantity: totalDelivered,
      lineItemsCount: delivery.items.length,
    };
  }

  /**
   * Creates a new delivery order in DRAFT status.
   */
  static async createDelivery(data: CreateDeliveryFormData, userId: string) {
    // 1. Verify warehouse exists and is active
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: data.warehouseId },
    });
    if (!warehouse) {
      throw new Error("Target warehouse does not exist.");
    }

    // 2. Validate line items
    if (!data.items || data.items.length === 0) {
      throw new Error("A delivery order must contain at least one line item.");
    }

    // 3. Verify all source locations belong to the specified warehouse
    const locationIds = Array.from(new Set(data.items.map((i) => i.locationId)));
    const locations = await prisma.location.findMany({
      where: { id: { in: locationIds } },
      select: { id: true, name: true, code: true, warehouseId: true },
    });

    const locationMap = new Map(locations.map((l) => [l.id, l]));
    for (const item of data.items) {
      const loc = locationMap.get(item.locationId);
      if (!loc) {
        throw new Error(`Source location "${item.locationId}" does not exist.`);
      }
      if (loc.warehouseId !== data.warehouseId) {
        throw new Error(
          `Location "${loc.name}" (${loc.code}) belongs to a different warehouse, not "${warehouse.name}".`
        );
      }
      if (item.requestedQuantity <= 0) {
        throw new Error("Line item requested quantity must be greater than zero.");
      }
    }

    // 4. Generate or verify deliveryNumber
    const deliveryNumber =
      data.deliveryNumber?.trim() || (await this.generateDeliveryNumber());
    const existing = await prisma.delivery.findUnique({
      where: { deliveryNumber },
    });
    if (existing) {
      throw new Error(`Delivery with number "${deliveryNumber}" already exists.`);
    }

    // 5. Create Draft Delivery with line items
    return prisma.delivery.create({
      data: {
        deliveryNumber,
        customerName: data.customerName.trim(),
        customerContact: data.customerContact?.trim() || null,
        warehouseId: data.warehouseId,
        status: OperationStatus.DRAFT,
        notes: data.notes?.trim() || null,
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : new Date(),
        createdById: userId,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            locationId: item.locationId,
            requestedQuantity: item.requestedQuantity,
            deliveredQuantity: item.deliveredQuantity ?? 0,
            notes: item.notes?.trim() || null,
          })),
        },
      },
      include: {
        warehouse: true,
        items: {
          include: {
            product: true,
            location: true,
          },
        },
      },
    });
  }

  /**
   * Updates an existing draft/waiting delivery order.
   */
  static async updateDelivery(
    id: string,
    data: UpdateDeliveryFormData,
    userId: string
  ) {
    const existing = await this.getDeliveryById(id);

    // Prevent modifying completed or canceled deliveries
    if (existing.status === OperationStatus.DONE) {
      throw new Error("Cannot modify a completed delivery order. Completed deliveries are historical records.");
    }
    if (existing.status === OperationStatus.CANCELED) {
      throw new Error("Cannot modify a canceled delivery order.");
    }

    const targetWarehouseId = data.warehouseId || existing.warehouseId;

    // If items are being updated, validate locations and quantities
    if (data.items) {
      if (data.items.length === 0) {
        throw new Error("A delivery order must contain at least one line item.");
      }

      const locationIds = Array.from(new Set(data.items.map((i) => i.locationId)));
      const locations = await prisma.location.findMany({
        where: { id: { in: locationIds } },
        select: { id: true, name: true, code: true, warehouseId: true },
      });

      const locationMap = new Map(locations.map((l) => [l.id, l]));
      for (const item of data.items) {
        const loc = locationMap.get(item.locationId);
        if (!loc) {
          throw new Error(`Source location "${item.locationId}" does not exist.`);
        }
        if (loc.warehouseId !== targetWarehouseId) {
          throw new Error(
            `Location "${loc.name}" (${loc.code}) does not belong to the selected warehouse.`
          );
        }
        if (item.requestedQuantity <= 0) {
          throw new Error("Line item requested quantity must be greater than zero.");
        }
      }
    }

    // Transactionally update delivery header and recreate items if provided
    return prisma.$transaction(async (tx) => {
      if (data.items) {
        await tx.deliveryItem.deleteMany({
          where: { deliveryId: id },
        });

        await tx.deliveryItem.createMany({
          data: data.items.map((item) => ({
            deliveryId: id,
            productId: item.productId,
            locationId: item.locationId,
            requestedQuantity: item.requestedQuantity,
            deliveredQuantity: item.deliveredQuantity ?? 0,
            notes: item.notes?.trim() || null,
          })),
        });
      }

      return tx.delivery.update({
        where: { id },
        data: {
          ...(data.customerName ? { customerName: data.customerName.trim() } : {}),
          ...(data.customerContact !== undefined ? { customerContact: data.customerContact?.trim() || null } : {}),
          ...(data.warehouseId ? { warehouseId: data.warehouseId } : {}),
          ...(data.notes !== undefined ? { notes: data.notes?.trim() || null } : {}),
          ...(data.deliveryDate ? { deliveryDate: new Date(data.deliveryDate) } : {}),
          ...(data.status ? { status: data.status } : {}),
        },
        include: {
          warehouse: true,
          items: {
            include: {
              product: true,
              location: true,
            },
          },
        },
      });
    });
  }

  /**
   * Updates delivery status (e.g., DRAFT -> WAITING -> READY -> CANCELED).
   */
  static async updateStatus(id: string, status: OperationStatus) {
    const delivery = await prisma.delivery.findUnique({
      where: { id },
    });

    if (!delivery) {
      throw new Error("Delivery order not found.");
    }

    if (delivery.status === OperationStatus.DONE) {
      throw new Error("Cannot modify a delivery order that is already completed (DONE).");
    }

    if (delivery.status === OperationStatus.CANCELED) {
      throw new Error("Cannot modify a delivery order that is canceled.");
    }

    return prisma.delivery.update({
      where: { id },
      data: { status },
      include: {
        warehouse: true,
        items: true,
      },
    });
  }

  /**
   * CRITICAL TRANSACTION: Validates delivery order, locks inventory rows, decrements physical stock,
   * and creates immutable StockLedger audit records.
   *
   * CONCURRENCY STRATEGY:
   * 1. Sort line items by (productId, locationId) to prevent PostgreSQL transaction deadlocks.
   * 2. Execute PostgreSQL row-level lock `SELECT ... FOR UPDATE` inside `prisma.$transaction`.
   * 3. Read authoritative locked quantity and verify `currentQuantity >= requestedQuantity`.
   * 4. Assert non-negative balance `newQuantity >= 0`.
   * 5. Atomically update inventory and append immutable StockLedger record.
   * 6. Mark delivery DONE.
   */
  static async validateAndExecute(id: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      // 1. Fetch delivery with line items inside transaction
      const delivery = await tx.delivery.findUnique({
        where: { id },
        include: {
          warehouse: true,
          items: {
            include: {
              product: true,
              location: true,
            },
          },
        },
      });

      if (!delivery) {
        throw new Error(`Delivery order with ID "${id}" does not exist.`);
      }

      // 2. IDEMPOTENCY GUARD: Check status inside transaction
      if (delivery.status === OperationStatus.DONE) {
        throw new Error(
          "This delivery order has already been validated and completed. Duplicate validation is rejected."
        );
      }
      if (delivery.status === OperationStatus.CANCELED) {
        throw new Error("Cannot validate a canceled delivery order.");
      }

      // 3. Verify line items exist
      if (!delivery.items || delivery.items.length === 0) {
        throw new Error("Cannot validate delivery: The delivery order has no line items.");
      }

      const now = new Date();

      // 4. Sort items deterministically by productId and locationId to prevent deadlocks across concurrent requests
      const sortedItems = [...delivery.items].sort((a, b) => {
        const prodComp = a.productId.localeCompare(b.productId);
        if (prodComp !== 0) return prodComp;
        return a.locationId.localeCompare(b.locationId);
      });

      // 5. Process each delivery line with concurrency-safe row locking
      for (const item of sortedItems) {
        // Enforce warehouse/location integrity
        if (item.location.warehouseId !== delivery.warehouseId) {
          throw new Error(
            `Location integrity error: Location "${item.location.name}" does not belong to warehouse "${delivery.warehouse.name}".`
          );
        }

        // Determine outbound quantity: must be positive
        const qtyToDeliver =
          item.deliveredQuantity > 0 ? item.deliveredQuantity : item.requestedQuantity;
        if (qtyToDeliver <= 0) {
          throw new Error(
            `Invalid quantity for product "${item.product.name}": Delivery quantity must be greater than 0.`
          );
        }

        // CONCURRENCY-SAFE ROW LOCK:
        // Use PostgreSQL `SELECT ... FOR UPDATE` to lock the inventory row for the duration of this transaction.
        // Concurrent transactions attempting to deliver from the same (productId, locationId) will block
        // until this transaction completes, ensuring serialized, authoritative balance inspection.
        const lockedRows = await tx.$queryRaw<
          Array<{ id: string; quantity: number; reservedQuantity: number }>
        >`
          SELECT id, quantity, "reservedQuantity"
          FROM "Inventory"
          WHERE "productId" = ${item.productId} AND "locationId" = ${item.locationId}
          FOR UPDATE
        `;

        if (!lockedRows || lockedRows.length === 0) {
          throw new Error(
            `Insufficient stock: No inventory record found for "${item.product.name}" (${item.product.sku}) at location "${item.location.name}". Available: 0, requested: ${qtyToDeliver}.`
          );
        }

        const currentQty = lockedRows[0].quantity;

        // Authoritative stock availability check
        if (currentQty < qtyToDeliver) {
          throw new Error(
            `Insufficient stock for "${item.product.name}" (${item.product.sku}) at location "${item.location.name}". Available: ${currentQty}, requested: ${qtyToDeliver}.`
          );
        }

        const newQty = currentQty - qtyToDeliver;

        // INVARIANT ASSERTION: Stock must never be negative
        if (newQty < 0) {
          throw new Error(
            `Negative stock invariant violation: Quantity after delivery would be negative (${newQty}) for "${item.product.name}".`
          );
        }

        // A. Mutate physical inventory (decrease stock)
        await tx.inventory.update({
          where: { id: lockedRows[0].id },
          data: {
            quantity: newQty,
          },
        });

        // B. Create immutable StockLedger audit entry
        await tx.stockLedger.create({
          data: {
            productId: item.productId,
            warehouseId: delivery.warehouseId,
            locationId: item.locationId,
            transactionType: "DELIVERY",
            quantityBefore: currentQty,
            quantityChange: -qtyToDeliver,
            quantityAfter: newQty,
            referenceType: "DELIVERY",
            referenceId: delivery.id,
            referenceNumber: delivery.deliveryNumber,
            notes:
              item.notes ||
              `Delivery order fulfilled for ${delivery.customerName} (${delivery.deliveryNumber})`,
            createdById: userId,
            createdAt: now,
          },
        });

        // C. Update line item deliveredQuantity
        await tx.deliveryItem.update({
          where: { id: item.id },
          data: { deliveredQuantity: qtyToDeliver },
        });
      }

      // 6. Mark delivery as DONE with validator attribution
      const completedDelivery = await tx.delivery.update({
        where: { id },
        data: {
          status: OperationStatus.DONE,
          validatedById: userId,
          validatedAt: now,
        },
        include: {
          warehouse: true,
          createdBy: { select: { id: true, name: true, email: true } },
          validatedBy: { select: { id: true, name: true, email: true } },
          items: {
            include: {
              product: true,
              location: true,
            },
          },
        },
      });

      return completedDelivery;
    });
  }

  /**
   * Backward compatibility alias for validateAndExecute
   */
  static async validateDelivery(id: string, userId: string) {
    return this.validateAndExecute(id, userId);
  }

  /**
   * Cancels a draft, waiting, or ready delivery order.
   */
  static async cancelDelivery(id: string, userId: string) {
    const delivery = await this.getDeliveryById(id);

    if (delivery.status === OperationStatus.DONE) {
      throw new Error("Cannot cancel a completed delivery order.");
    }
    if (delivery.status === OperationStatus.CANCELED) {
      return delivery;
    }

    return prisma.delivery.update({
      where: { id },
      data: {
        status: OperationStatus.CANCELED,
      },
      include: {
        warehouse: true,
        items: true,
      },
    });
  }
}
