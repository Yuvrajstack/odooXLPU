import { prisma } from "@/lib/db";
import { CreateReceiptFormData, UpdateReceiptFormData } from "@/lib/validations/receipt";
import { OperationStatus } from "@/types";

export interface ReceiptQueryFilters {
  search?: string;
  status?: OperationStatus;
  warehouseId?: string;
  page?: number;
  limit?: number;
}

export class ReceiptService {
  /**
   * Generates a unique, human-readable receipt number: RCP-YYYY-XXXX
   */
  static async generateReceiptNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `RCP-${year}-`;

    const latest = await prisma.receipt.findFirst({
      where: {
        receiptNumber: { startsWith: prefix },
      },
      orderBy: { receiptNumber: "desc" },
      select: { receiptNumber: true },
    });

    let nextSeq = 1;
    if (latest && latest.receiptNumber) {
      const parts = latest.receiptNumber.split("-");
      const currentSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(currentSeq)) {
        nextSeq = currentSeq + 1;
      }
    }

    return `${prefix}${nextSeq.toString().padStart(4, "0")}`;
  }

  /**
   * Retrieves paginated list of receipts with filters.
   */
  static async getReceipts(filters?: ReceiptQueryFilters) {
    const page = Math.max(1, filters?.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters?.limit ?? 20));
    const skip = (page - 1) * limit;

    const where = {
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.warehouseId ? { warehouseId: filters.warehouseId } : {}),
      ...(filters?.search
        ? {
            OR: [
              { receiptNumber: { contains: filters.search, mode: "insensitive" as const } },
              { supplierName: { contains: filters.search, mode: "insensitive" as const } },
              { notes: { contains: filters.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [receipts, totalCount] = await Promise.all([
      prisma.receipt.findMany({
        where,
        include: {
          warehouse: { select: { id: true, name: true, code: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          validatedBy: { select: { id: true, name: true, email: true } },
          items: {
            select: {
              expectedQuantity: true,
              receivedQuantity: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.receipt.count({ where }),
    ]);

    const items = receipts.map((r) => {
      const totalExpected = r.items.reduce((acc, i) => acc + i.expectedQuantity, 0);
      const totalReceived = r.items.reduce((acc, i) => acc + i.receivedQuantity, 0);

      return {
        id: r.id,
        receiptNumber: r.receiptNumber,
        supplierName: r.supplierName,
        supplierContact: r.supplierContact,
        warehouseId: r.warehouseId,
        warehouse: r.warehouse,
        status: r.status,
        notes: r.notes,
        receivedDate: r.receivedDate,
        createdById: r.createdById,
        createdBy: r.createdBy,
        validatedById: r.validatedById,
        validatedBy: r.validatedBy,
        validatedAt: r.validatedAt,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        lineItemsCount: r.items.length,
        totalExpectedQuantity: totalExpected,
        totalReceivedQuantity: totalReceived,
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
   * Retrieves single receipt with full line item details and product/location contexts.
   */
  static async getReceiptById(id: string) {
    const receipt = await prisma.receipt.findUnique({
      where: { id },
      include: {
        warehouse: true,
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        validatedBy: { select: { id: true, name: true, email: true, role: true } },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, uom: true, costPrice: true },
            },
            location: {
              select: { id: true, name: true, code: true, type: true, warehouseId: true },
            },
          },
          orderBy: { id: "asc" },
        },
      },
    });

    if (!receipt) {
      throw new Error(`Receipt with ID "${id}" was not found.`);
    }

    const totalExpected = receipt.items.reduce((acc, i) => acc + i.expectedQuantity, 0);
    const totalReceived = receipt.items.reduce((acc, i) => acc + i.receivedQuantity, 0);

    return {
      ...receipt,
      totalExpectedQuantity: totalExpected,
      totalReceivedQuantity: totalReceived,
      lineItemsCount: receipt.items.length,
    };
  }

  /**
   * Creates a new receipt in DRAFT status.
   */
  static async createReceipt(data: CreateReceiptFormData, userId: string) {
    // 1. Verify warehouse exists and is active
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: data.warehouseId },
    });
    if (!warehouse) {
      throw new Error(`Target warehouse does not exist.`);
    }

    // 2. Validate line items
    if (!data.items || data.items.length === 0) {
      throw new Error("A receipt must contain at least one line item.");
    }

    // 3. Verify all destination locations belong to the specified warehouse
    const locationIds = Array.from(new Set(data.items.map((i) => i.locationId)));
    const locations = await prisma.location.findMany({
      where: { id: { in: locationIds } },
      select: { id: true, name: true, code: true, warehouseId: true },
    });

    const locationMap = new Map(locations.map((l) => [l.id, l]));
    for (const item of data.items) {
      const loc = locationMap.get(item.locationId);
      if (!loc) {
        throw new Error(`Destination location "${item.locationId}" does not exist.`);
      }
      if (loc.warehouseId !== data.warehouseId) {
        throw new Error(
          `Location "${loc.name}" (${loc.code}) belongs to a different warehouse, not "${warehouse.name}".`
        );
      }
      if (item.expectedQuantity <= 0) {
        throw new Error("Line item expected quantity must be greater than zero.");
      }
    }

    // 4. Generate or verify receiptNumber
    const receiptNumber = data.receiptNumber?.trim() || (await this.generateReceiptNumber());
    const existing = await prisma.receipt.findUnique({
      where: { receiptNumber },
    });
    if (existing) {
      throw new Error(`Receipt with number "${receiptNumber}" already exists.`);
    }

    // 5. Create Draft Receipt with line items
    return prisma.receipt.create({
      data: {
        receiptNumber,
        supplierName: data.supplierName.trim(),
        supplierContact: data.supplierContact?.trim() || null,
        warehouseId: data.warehouseId,
        status: OperationStatus.DRAFT,
        notes: data.notes?.trim() || null,
        receivedDate: data.receivedDate ? new Date(data.receivedDate) : new Date(),
        createdById: userId,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            locationId: item.locationId,
            expectedQuantity: item.expectedQuantity,
            receivedQuantity: item.receivedQuantity ?? item.expectedQuantity,
            unitCost: item.unitCost ?? 0,
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
   * Updates an existing draft/waiting receipt.
   */
  static async updateReceipt(
    id: string,
    data: UpdateReceiptFormData,
    userId: string
  ) {
    const existing = await this.getReceiptById(id);

    // Prevent modifying completed or canceled receipts
    if (existing.status === OperationStatus.DONE) {
      throw new Error("Cannot modify a completed receipt. Completed receipts are historical records.");
    }
    if (existing.status === OperationStatus.CANCELED) {
      throw new Error("Cannot modify a canceled receipt.");
    }

    const targetWarehouseId = data.warehouseId || existing.warehouseId;

    // If items are being updated, validate locations and quantities
    if (data.items) {
      if (data.items.length === 0) {
        throw new Error("A receipt must contain at least one line item.");
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
          throw new Error(`Destination location "${item.locationId}" does not exist.`);
        }
        if (loc.warehouseId !== targetWarehouseId) {
          throw new Error(
            `Location "${loc.name}" (${loc.code}) does not belong to the selected warehouse.`
          );
        }
        if (item.expectedQuantity <= 0) {
          throw new Error("Line item expected quantity must be greater than zero.");
        }
      }
    }

    // Transactionally update receipt header and recreate items if provided
    return prisma.$transaction(async (tx) => {
      if (data.items) {
        await tx.receiptItem.deleteMany({
          where: { receiptId: id },
        });

        await tx.receiptItem.createMany({
          data: data.items.map((item) => ({
            receiptId: id,
            productId: item.productId,
            locationId: item.locationId,
            expectedQuantity: item.expectedQuantity,
            receivedQuantity: item.receivedQuantity ?? item.expectedQuantity,
            unitCost: item.unitCost ?? 0,
            notes: item.notes?.trim() || null,
          })),
        });
      }

      return tx.receipt.update({
        where: { id },
        data: {
          ...(data.supplierName ? { supplierName: data.supplierName.trim() } : {}),
          ...(data.supplierContact !== undefined ? { supplierContact: data.supplierContact?.trim() || null } : {}),
          ...(data.warehouseId ? { warehouseId: data.warehouseId } : {}),
          ...(data.notes !== undefined ? { notes: data.notes?.trim() || null } : {}),
          ...(data.receivedDate ? { receivedDate: new Date(data.receivedDate) } : {}),
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
   * CRITICAL TRANSACTION: Validates receipt, mutates physical stock, and creates immutable StockLedger audit records.
   * Atomic invariance guaranteed: Everything succeeds or everything rolls back.
   */
  static async validateAndExecute(id: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      // 1. Fetch receipt with items inside transaction
      const receipt = await tx.receipt.findUnique({
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

      if (!receipt) {
        throw new Error(`Receipt with ID "${id}" does not exist.`);
      }

      // 2. IDEMPOTENCY GUARD: Check status
      if (receipt.status === OperationStatus.DONE) {
        throw new Error("This receipt has already been validated and completed. Duplicate validation is rejected.");
      }
      if (receipt.status === OperationStatus.CANCELED) {
        throw new Error("Cannot validate a canceled receipt.");
      }

      // 3. Verify lines exist
      if (!receipt.items || receipt.items.length === 0) {
        throw new Error("Cannot validate receipt: The receipt has no line items.");
      }

      const now = new Date();

      // 4. Process each receipt line atomically
      for (const item of receipt.items) {
        // Enforce warehouse/location integrity
        if (item.location.warehouseId !== receipt.warehouseId) {
          throw new Error(
            `Location integrity error: Location "${item.location.name}" does not belong to warehouse "${receipt.warehouse.name}".`
          );
        }

        // Determine inward quantity: must be positive
        const inwardQuantity = item.receivedQuantity > 0 ? item.receivedQuantity : item.expectedQuantity;
        if (inwardQuantity <= 0) {
          throw new Error(
            `Invalid quantity for product "${item.product.name}": Received quantity must be greater than 0.`
          );
        }

        // Fetch current physical stock at location
        const existingInventory = await tx.inventory.findUnique({
          where: {
            productId_locationId: {
              productId: item.productId,
              locationId: item.locationId,
            },
          },
        });

        const currentQuantity = existingInventory ? existingInventory.quantity : 0;
        const newQuantity = currentQuantity + inwardQuantity;

        // A. Mutate physical inventory (increase stock)
        if (existingInventory) {
          await tx.inventory.update({
            where: { id: existingInventory.id },
            data: {
              quantity: newQuantity,
            },
          });
        } else {
          await tx.inventory.create({
            data: {
              productId: item.productId,
              locationId: item.locationId,
              warehouseId: receipt.warehouseId,
              quantity: newQuantity,
              reservedQuantity: 0,
            },
          });
        }

        // B. Create immutable StockLedger audit entry
        await tx.stockLedger.create({
          data: {
            productId: item.productId,
            warehouseId: receipt.warehouseId,
            locationId: item.locationId,
            transactionType: "RECEIPT",
            quantityBefore: currentQuantity,
            quantityChange: inwardQuantity,
            quantityAfter: newQuantity,
            referenceType: "RECEIPT",
            referenceId: receipt.id,
            referenceNumber: receipt.receiptNumber,
            notes: item.notes || `Stock received from ${receipt.supplierName} (${receipt.receiptNumber})`,
            createdById: userId,
            createdAt: now,
          },
        });

        // C. Update item's receivedQuantity to match actual inward quantity
        if (item.receivedQuantity !== inwardQuantity) {
          await tx.receiptItem.update({
            where: { id: item.id },
            data: { receivedQuantity: inwardQuantity },
          });
        }
      }

      // 5. Mark receipt as DONE with validator attribution
      const completedReceipt = await tx.receipt.update({
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

      return completedReceipt;
    });
  }

  /**
   * Cancels a draft receipt.
   */
  static async cancelReceipt(id: string, userId: string) {
    const receipt = await this.getReceiptById(id);

    if (receipt.status === OperationStatus.DONE) {
      throw new Error("Cannot cancel a completed receipt.");
    }
    if (receipt.status === OperationStatus.CANCELED) {
      return receipt;
    }

    return prisma.receipt.update({
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
