import { prisma } from "@/lib/db";
import { CreateTransferFormData, UpdateTransferFormData } from "@/lib/validations/transfer";
import { OperationStatus } from "@/types";

export interface TransferQueryFilters {
  search?: string;
  status?: OperationStatus;
  sourceWarehouseId?: string;
  destinationWarehouseId?: string;
  page?: number;
  limit?: number;
}

export class TransferService {
  /**
   * Generates a unique transfer sequence: TRF-YYYY-XXXX
   */
  static async generateTransferNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `TRF-${year}-`;

    const latest = await prisma.transfer.findFirst({
      where: {
        transferNumber: { startsWith: prefix },
      },
      orderBy: { transferNumber: "desc" },
      select: { transferNumber: true },
    });

    let nextSeq = 1;
    if (latest && latest.transferNumber) {
      const parts = latest.transferNumber.split("-");
      const currentSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(currentSeq)) {
        nextSeq = currentSeq + 1;
      }
    }

    return `${prefix}${nextSeq.toString().padStart(4, "0")}`;
  }

  /**
   * Retrieves paginated transfers with filters and line summaries.
   */
  static async getTransfers(filters?: TransferQueryFilters) {
    const page = Math.max(1, filters?.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters?.limit ?? 20));
    const skip = (page - 1) * limit;

    const where = {
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.sourceWarehouseId ? { sourceWarehouseId: filters.sourceWarehouseId } : {}),
      ...(filters?.destinationWarehouseId
        ? { destinationWarehouseId: filters.destinationWarehouseId }
        : {}),
      ...(filters?.search
        ? {
            OR: [
              { transferNumber: { contains: filters.search, mode: "insensitive" as const } },
              { notes: { contains: filters.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [transfers, totalCount] = await Promise.all([
      prisma.transfer.findMany({
        where,
        include: {
          sourceWarehouse: { select: { id: true, name: true, code: true } },
          destinationWarehouse: { select: { id: true, name: true, code: true } },
          sourceLocation: { select: { id: true, name: true, code: true, type: true } },
          destinationLocation: { select: { id: true, name: true, code: true, type: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          validatedBy: { select: { id: true, name: true, email: true } },
          items: {
            select: {
              quantity: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.transfer.count({ where }),
    ]);

    const items = transfers.map((t) => {
      const totalQuantity = t.items.reduce((acc, i) => acc + i.quantity, 0);

      return {
        id: t.id,
        transferNumber: t.transferNumber,
        sourceWarehouseId: t.sourceWarehouseId,
        sourceWarehouse: t.sourceWarehouse,
        destinationWarehouseId: t.destinationWarehouseId,
        destinationWarehouse: t.destinationWarehouse,
        sourceLocationId: t.sourceLocationId,
        sourceLocation: t.sourceLocation,
        destinationLocationId: t.destinationLocationId,
        destinationLocation: t.destinationLocation,
        status: t.status,
        notes: t.notes,
        createdById: t.createdById,
        createdBy: t.createdBy,
        validatedById: t.validatedById,
        validatedBy: t.validatedBy,
        validatedAt: t.validatedAt,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        lineItemsCount: t.items.length,
        totalQuantity,
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
   * Retrieves single transfer with full items, products, and location details.
   */
  static async getTransferById(id: string) {
    const transfer = await prisma.transfer.findUnique({
      where: { id },
      include: {
        sourceWarehouse: {
          select: { id: true, name: true, code: true, address: true, city: true },
        },
        destinationWarehouse: {
          select: { id: true, name: true, code: true, address: true, city: true },
        },
        sourceLocation: {
          select: { id: true, name: true, code: true, type: true, warehouseId: true },
        },
        destinationLocation: {
          select: { id: true, name: true, code: true, type: true, warehouseId: true },
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
                reorderPoint: true,
                costPrice: true,
                sellingPrice: true,
              },
            },
          },
          orderBy: { id: "asc" },
        },
      },
    });

    if (!transfer) {
      throw new Error(`Transfer order with ID "${id}" was not found.`);
    }

    const totalQuantity = transfer.items.reduce((acc, i) => acc + i.quantity, 0);

    return {
      ...transfer,
      totalQuantity,
      lineItemsCount: transfer.items.length,
    };
  }

  /**
   * Creates an internal transfer in DRAFT status with full boundary validation.
   */
  static async createTransfer(data: CreateTransferFormData, userId: string) {
    // 1. Same-location guard
    if (data.sourceLocationId === data.destinationLocationId) {
      throw new Error(
        "Source location and destination location cannot be the same location."
      );
    }

    // 2. Verify warehouses exist
    const [sourceWh, destWh] = await Promise.all([
      prisma.warehouse.findUnique({ where: { id: data.sourceWarehouseId } }),
      prisma.warehouse.findUnique({ where: { id: data.destinationWarehouseId } }),
    ]);

    if (!sourceWh) {
      throw new Error(`Source warehouse "${data.sourceWarehouseId}" does not exist.`);
    }
    if (!destWh) {
      throw new Error(`Destination warehouse "${data.destinationWarehouseId}" does not exist.`);
    }

    // 3. Verify locations exist and belong to their respective warehouses
    const [sourceLoc, destLoc] = await Promise.all([
      prisma.location.findUnique({ where: { id: data.sourceLocationId } }),
      prisma.location.findUnique({ where: { id: data.destinationLocationId } }),
    ]);

    if (!sourceLoc) {
      throw new Error(`Source location "${data.sourceLocationId}" does not exist.`);
    }
    if (sourceLoc.warehouseId !== data.sourceWarehouseId) {
      throw new Error(
        `Source location "${sourceLoc.name}" (${sourceLoc.code}) does not belong to source warehouse "${sourceWh.name}".`
      );
    }

    if (!destLoc) {
      throw new Error(`Destination location "${data.destinationLocationId}" does not exist.`);
    }
    if (destLoc.warehouseId !== data.destinationWarehouseId) {
      throw new Error(
        `Destination location "${destLoc.name}" (${destLoc.code}) does not belong to destination warehouse "${destWh.name}".`
      );
    }

    // 4. Validate line items
    if (!data.items || data.items.length === 0) {
      throw new Error("A transfer order must contain at least one line item.");
    }

    for (const item of data.items) {
      if (item.quantity <= 0) {
        throw new Error("Transfer item quantity must be greater than zero.");
      }
    }

    // 5. Generate or verify transferNumber
    const transferNumber =
      data.transferNumber?.trim() || (await this.generateTransferNumber());
    const existing = await prisma.transfer.findUnique({
      where: { transferNumber },
    });
    if (existing) {
      throw new Error(`Transfer with number "${transferNumber}" already exists.`);
    }

    // 6. Create Draft Transfer with line items
    return prisma.transfer.create({
      data: {
        transferNumber,
        sourceWarehouseId: data.sourceWarehouseId,
        destinationWarehouseId: data.destinationWarehouseId,
        sourceLocationId: data.sourceLocationId,
        destinationLocationId: data.destinationLocationId,
        status: OperationStatus.DRAFT,
        notes: data.notes?.trim() || null,
        createdById: userId,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            notes: item.notes?.trim() || null,
          })),
        },
      },
      include: {
        sourceWarehouse: true,
        destinationWarehouse: true,
        sourceLocation: true,
        destinationLocation: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  /**
   * Updates an existing draft/waiting transfer order.
   */
  static async updateTransfer(
    id: string,
    data: UpdateTransferFormData,
    userId: string
  ) {
    const existing = await this.getTransferById(id);

    // Prevent modifying completed or canceled transfers
    if (existing.status === OperationStatus.DONE) {
      throw new Error(
        "Cannot modify a completed transfer order. Completed transfers are historical records."
      );
    }
    if (existing.status === OperationStatus.CANCELED) {
      throw new Error("Cannot modify a canceled transfer order.");
    }

    const targetSourceWhId = data.sourceWarehouseId || existing.sourceWarehouseId;
    const targetDestWhId = data.destinationWarehouseId || existing.destinationWarehouseId;
    const targetSourceLocId = data.sourceLocationId || existing.sourceLocationId;
    const targetDestLocId = data.destinationLocationId || existing.destinationLocationId;

    if (targetSourceLocId === targetDestLocId) {
      throw new Error(
        "Source location and destination location cannot be the same location."
      );
    }

    // Validate location boundaries if changed
    const [sourceLoc, destLoc] = await Promise.all([
      prisma.location.findUnique({ where: { id: targetSourceLocId } }),
      prisma.location.findUnique({ where: { id: targetDestLocId } }),
    ]);

    if (!sourceLoc || sourceLoc.warehouseId !== targetSourceWhId) {
      throw new Error("Source location does not belong to the selected source warehouse.");
    }
    if (!destLoc || destLoc.warehouseId !== targetDestWhId) {
      throw new Error("Destination location does not belong to the selected destination warehouse.");
    }

    if (data.items) {
      if (data.items.length === 0) {
        throw new Error("A transfer order must contain at least one line item.");
      }
      for (const item of data.items) {
        if (item.quantity <= 0) {
          throw new Error("Transfer item quantity must be greater than zero.");
        }
      }
    }

    // Transactionally update transfer header and recreate items
    return prisma.$transaction(async (tx) => {
      if (data.items) {
        await tx.transferItem.deleteMany({
          where: { transferId: id },
        });

        await tx.transferItem.createMany({
          data: data.items.map((item) => ({
            transferId: id,
            productId: item.productId,
            quantity: item.quantity,
            notes: item.notes?.trim() || null,
          })),
        });
      }

      return tx.transfer.update({
        where: { id },
        data: {
          ...(data.sourceWarehouseId ? { sourceWarehouseId: data.sourceWarehouseId } : {}),
          ...(data.destinationWarehouseId ? { destinationWarehouseId: data.destinationWarehouseId } : {}),
          ...(data.sourceLocationId ? { sourceLocationId: data.sourceLocationId } : {}),
          ...(data.destinationLocationId ? { destinationLocationId: data.destinationLocationId } : {}),
          ...(data.notes !== undefined ? { notes: data.notes?.trim() || null } : {}),
          ...(data.status ? { status: data.status } : {}),
        },
        include: {
          sourceWarehouse: true,
          destinationWarehouse: true,
          sourceLocation: true,
          destinationLocation: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    });
  }

  /**
   * Updates transfer status (e.g., DRAFT -> WAITING -> READY).
   */
  static async updateStatus(id: string, status: OperationStatus) {
    const transfer = await prisma.transfer.findUnique({
      where: { id },
    });

    if (!transfer) {
      throw new Error("Transfer order not found.");
    }

    if (transfer.status === OperationStatus.DONE) {
      throw new Error("Cannot modify a transfer order that is already completed (DONE).");
    }

    if (transfer.status === OperationStatus.CANCELED) {
      throw new Error("Cannot modify a transfer order that is canceled.");
    }

    return prisma.transfer.update({
      where: { id },
      data: { status },
      include: {
        sourceWarehouse: true,
        destinationWarehouse: true,
        sourceLocation: true,
        destinationLocation: true,
        items: true,
      },
    });
  }

  /**
   * CRITICAL ATOMIC TRANSACTION: Validates transfer order, acquires deterministic row locks
   * on all touched inventory records to prevent deadlocks, decrements source stock,
   * increments destination stock, and appends dual TRANSFER_OUT & TRANSFER_IN StockLedger records.
   *
   * ZERO-NET-STOCK GUARANTEE: Total company stock before === Total stock after.
   */
  static async validateAndExecute(id: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      // 1. Fetch transfer with all relations inside the transaction
      const transfer = await tx.transfer.findUnique({
        where: { id },
        include: {
          sourceWarehouse: true,
          destinationWarehouse: true,
          sourceLocation: true,
          destinationLocation: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!transfer) {
        throw new Error(`Transfer order with ID "${id}" does not exist.`);
      }

      // 2. IDEMPOTENCY GUARD: Check status
      if (transfer.status === OperationStatus.DONE) {
        throw new Error(
          "This transfer order has already been validated and completed. Duplicate validation is rejected."
        );
      }
      if (transfer.status === OperationStatus.CANCELED) {
        throw new Error("Cannot validate a canceled transfer order.");
      }

      // 3. Verify lines exist
      if (!transfer.items || transfer.items.length === 0) {
        throw new Error("Cannot validate transfer: The transfer order has no line items.");
      }

      // 4. Verify boundary integrity
      if (transfer.sourceLocationId === transfer.destinationLocationId) {
        throw new Error(
          "Transfer integrity error: Source and destination locations cannot be identical."
        );
      }
      if (transfer.sourceLocation.warehouseId !== transfer.sourceWarehouseId) {
        throw new Error(
          `Location integrity error: Source location "${transfer.sourceLocation.name}" does not belong to warehouse "${transfer.sourceWarehouse.name}".`
        );
      }
      if (transfer.destinationLocation.warehouseId !== transfer.destinationWarehouseId) {
        throw new Error(
          `Location integrity error: Destination location "${transfer.destinationLocation.name}" does not belong to warehouse "${transfer.destinationWarehouse.name}".`
        );
      }

      const now = new Date();

      // 5. DEADLOCK PREVENTION VIA DETERMINISTIC ROW LOCKING:
      // Collect all distinct (productId, locationId) keys for both source and destination locations.
      const lockKeyMap = new Map<string, { productId: string; locationId: string; warehouseId: string }>();

      for (const item of transfer.items) {
        const srcKey = `${item.productId}_${transfer.sourceLocationId}`;
        const destKey = `${item.productId}_${transfer.destinationLocationId}`;

        if (!lockKeyMap.has(srcKey)) {
          lockKeyMap.set(srcKey, {
            productId: item.productId,
            locationId: transfer.sourceLocationId,
            warehouseId: transfer.sourceWarehouseId,
          });
        }
        if (!lockKeyMap.has(destKey)) {
          lockKeyMap.set(destKey, {
            productId: item.productId,
            locationId: transfer.destinationLocationId,
            warehouseId: transfer.destinationWarehouseId,
          });
        }
      }

      // Sort all keys deterministically by (productId, locationId)
      const sortedKeys = Array.from(lockKeyMap.values()).sort((a, b) => {
        const prodCmp = a.productId.localeCompare(b.productId);
        if (prodCmp !== 0) return prodCmp;
        return a.locationId.localeCompare(b.locationId);
      });

      // 6. Acquire row-level exclusive locks in exact deterministic order
      const lockedStockMap = new Map<
        string,
        { id?: string; quantity: number; reservedQuantity: number; exists: boolean }
      >();

      for (const key of sortedKeys) {
        const mapKey = `${key.productId}_${key.locationId}`;

        const lockedRows = await tx.$queryRaw<
          Array<{ id: string; quantity: number; reservedQuantity: number }>
        >`
          SELECT id, quantity, "reservedQuantity"
          FROM "Inventory"
          WHERE "productId" = ${key.productId} AND "locationId" = ${key.locationId}
          FOR UPDATE
        `;

        if (lockedRows && lockedRows.length > 0) {
          lockedStockMap.set(mapKey, {
            id: lockedRows[0].id,
            quantity: lockedRows[0].quantity,
            reservedQuantity: lockedRows[0].reservedQuantity,
            exists: true,
          });
        } else {
          // Record doesn't exist yet at location (e.g. destination has 0 stock)
          lockedStockMap.set(mapKey, {
            quantity: 0,
            reservedQuantity: 0,
            exists: false,
          });
        }
      }

      // 7. Process each line item: Decrement Source, Increment Destination, and Append Dual Ledger Entries
      for (const item of transfer.items) {
        if (item.quantity <= 0) {
          throw new Error(
            `Invalid quantity for product "${item.product.name}": Transfer quantity must be greater than 0.`
          );
        }

        const srcKey = `${item.productId}_${transfer.sourceLocationId}`;
        const destKey = `${item.productId}_${transfer.destinationLocationId}`;

        const srcRecord = lockedStockMap.get(srcKey)!;
        const destRecord = lockedStockMap.get(destKey)!;

        // Authoritative stock availability check
        if (srcRecord.quantity < item.quantity) {
          throw new Error(
            `Insufficient stock for "${item.product.name}" (${item.product.sku}) at source location "${transfer.sourceLocation.name}". Available: ${srcRecord.quantity}, requested: ${item.quantity}.`
          );
        }

        const newSourceQty = srcRecord.quantity - item.quantity;
        const newDestQty = destRecord.quantity + item.quantity;

        // Invariant check: Source stock must never become negative
        if (newSourceQty < 0) {
          throw new Error(
            `Negative stock violation: Quantity after transfer would be negative (${newSourceQty}) for "${item.product.name}".`
          );
        }

        // A. Mutate Source Inventory (Decrease)
        if (srcRecord.id) {
          await tx.inventory.update({
            where: { id: srcRecord.id },
            data: { quantity: newSourceQty },
          });
        } else {
          await tx.inventory.create({
            data: {
              productId: item.productId,
              locationId: transfer.sourceLocationId,
              warehouseId: transfer.sourceWarehouseId,
              quantity: newSourceQty,
              reservedQuantity: 0,
            },
          });
        }

        // B. Mutate Destination Inventory (Increase)
        if (destRecord.id) {
          await tx.inventory.update({
            where: { id: destRecord.id },
            data: { quantity: newDestQty },
          });
        } else {
          const createdDestInv = await tx.inventory.create({
            data: {
              productId: item.productId,
              locationId: transfer.destinationLocationId,
              warehouseId: transfer.destinationWarehouseId,
              quantity: newDestQty,
              reservedQuantity: 0,
            },
          });
          destRecord.id = createdDestInv.id;
        }

        // C. Create TRANSFER_OUT StockLedger audit entry for source
        await tx.stockLedger.create({
          data: {
            productId: item.productId,
            warehouseId: transfer.sourceWarehouseId,
            locationId: transfer.sourceLocationId,
            transactionType: "TRANSFER_OUT",
            quantityBefore: srcRecord.quantity,
            quantityChange: -item.quantity,
            quantityAfter: newSourceQty,
            referenceType: "TRANSFER",
            referenceId: transfer.id,
            referenceNumber: transfer.transferNumber,
            notes:
              item.notes ||
              `Internal transfer to ${transfer.destinationLocation.name} (${transfer.destinationWarehouse.code})`,
            createdById: userId,
            createdAt: now,
          },
        });

        // D. Create TRANSFER_IN StockLedger audit entry for destination
        await tx.stockLedger.create({
          data: {
            productId: item.productId,
            warehouseId: transfer.destinationWarehouseId,
            locationId: transfer.destinationLocationId,
            transactionType: "TRANSFER_IN",
            quantityBefore: destRecord.quantity,
            quantityChange: item.quantity,
            quantityAfter: newDestQty,
            referenceType: "TRANSFER",
            referenceId: transfer.id,
            referenceNumber: transfer.transferNumber,
            notes:
              item.notes ||
              `Internal transfer from ${transfer.sourceLocation.name} (${transfer.sourceWarehouse.code})`,
            createdById: userId,
            createdAt: now,
          },
        });

        // Update in-memory tracker for potential repeated product lines
        srcRecord.quantity = newSourceQty;
        destRecord.quantity = newDestQty;
      }

      // 8. Mark Transfer as DONE with validator attribution
      const completedTransfer = await tx.transfer.update({
        where: { id },
        data: {
          status: OperationStatus.DONE,
          validatedById: userId,
          validatedAt: now,
        },
        include: {
          sourceWarehouse: true,
          destinationWarehouse: true,
          sourceLocation: true,
          destinationLocation: true,
          createdBy: { select: { id: true, name: true, email: true } },
          validatedBy: { select: { id: true, name: true, email: true } },
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      return completedTransfer;
    });
  }

  /**
   * Backward compatibility alias for validateAndExecute
   */
  static async validateTransfer(id: string, userId: string) {
    return this.validateAndExecute(id, userId);
  }

  /**
   * Cancels a draft, waiting, or ready transfer order.
   */
  static async cancelTransfer(id: string, userId: string) {
    const transfer = await this.getTransferById(id);

    if (transfer.status === OperationStatus.DONE) {
      throw new Error("Cannot cancel a completed transfer order.");
    }
    if (transfer.status === OperationStatus.CANCELED) {
      return transfer;
    }

    return prisma.transfer.update({
      where: { id },
      data: {
        status: OperationStatus.CANCELED,
      },
      include: {
        sourceWarehouse: true,
        destinationWarehouse: true,
        sourceLocation: true,
        destinationLocation: true,
        items: true,
      },
    });
  }
}
