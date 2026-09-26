import { prisma } from "@/lib/db";
import { CreateAdjustmentFormData, UpdateAdjustmentFormData } from "@/lib/validations/adjustment";
import { OperationStatus } from "@/types";

export interface AdjustmentQueryFilters {
  search?: string;
  status?: OperationStatus;
  warehouseId?: string;
  locationId?: string;
  page?: number;
  limit?: number;
}

export class AdjustmentService {
  /**
   * Generates a unique adjustment sequence: ADJ-YYYY-XXXX
   */
  static async generateAdjustmentNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `ADJ-${year}-`;

    const latest = await prisma.adjustment.findFirst({
      where: {
        adjustmentNumber: { startsWith: prefix },
      },
      orderBy: { adjustmentNumber: "desc" },
      select: { adjustmentNumber: true },
    });

    let nextSeq = 1;
    if (latest && latest.adjustmentNumber) {
      const parts = latest.adjustmentNumber.split("-");
      const currentSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(currentSeq)) {
        nextSeq = currentSeq + 1;
      }
    }

    return `${prefix}${nextSeq.toString().padStart(4, "0")}`;
  }

  /**
   * Retrieves paginated adjustments with filters.
   */
  static async getAdjustments(filters?: AdjustmentQueryFilters) {
    const page = Math.max(1, filters?.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters?.limit ?? 20));
    const skip = (page - 1) * limit;

    const where = {
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.warehouseId ? { warehouseId: filters.warehouseId } : {}),
      ...(filters?.locationId ? { locationId: filters.locationId } : {}),
      ...(filters?.search
        ? {
            OR: [
              { adjustmentNumber: { contains: filters.search, mode: "insensitive" as const } },
              { reason: { contains: filters.search, mode: "insensitive" as const } },
              { notes: { contains: filters.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [adjustments, totalCount] = await Promise.all([
      prisma.adjustment.findMany({
        where,
        include: {
          warehouse: { select: { id: true, name: true, code: true } },
          location: { select: { id: true, name: true, code: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          validatedBy: { select: { id: true, name: true, email: true } },
          items: {
            select: {
              systemQuantity: true,
              physicalQuantity: true,
              differenceQuantity: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.adjustment.count({ where }),
    ]);

    const items = adjustments.map((a) => {
      const totalDifference = a.items.reduce((acc, i) => acc + i.differenceQuantity, 0);

      return {
        id: a.id,
        adjustmentNumber: a.adjustmentNumber,
        warehouseId: a.warehouseId,
        warehouse: a.warehouse,
        locationId: a.locationId,
        location: a.location,
        reason: a.reason,
        status: a.status,
        notes: a.notes,
        createdById: a.createdById,
        createdBy: a.createdBy,
        validatedById: a.validatedById,
        validatedBy: a.validatedBy,
        validatedAt: a.validatedAt,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
        lineItemsCount: a.items.length,
        totalDifference,
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
   * Retrieves single adjustment with items.
   */
  static async getAdjustmentById(id: string) {
    const adjustment = await prisma.adjustment.findUnique({
      where: { id },
      include: {
        warehouse: true,
        location: true,
        createdBy: { select: { id: true, name: true, email: true } },
        validatedBy: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                uom: true,
              },
            },
          },
        },
      },
    });

    if (!adjustment) {
      throw new Error(`Adjustment with ID "${id}" was not found.`);
    }

    return adjustment;
  }

  /**
   * Creates a stock adjustment in DRAFT status with mandatory reason.
   */
  static async createAdjustment(data: CreateAdjustmentFormData, userId: string) {
    const adjustmentNumber =
      data.adjustmentNumber || (await this.generateAdjustmentNumber());

    // Calculate difference for each item
    const itemsData = await Promise.all(
      data.items.map(async (item) => {
        // Look up recorded system stock if not provided or to ensure accuracy
        const inv = await prisma.inventory.findUnique({
          where: {
            productId_locationId: {
              productId: item.productId,
              locationId: data.locationId,
            },
          },
        });

        const systemQty = inv ? inv.quantity : (item.systemQuantity || 0);
        const difference = item.physicalQuantity - systemQty;

        return {
          productId: item.productId,
          systemQuantity: systemQty,
          physicalQuantity: item.physicalQuantity,
          differenceQuantity: difference,
          notes: item.notes,
        };
      })
    );

    return prisma.adjustment.create({
      data: {
        adjustmentNumber,
        warehouseId: data.warehouseId,
        locationId: data.locationId,
        reason: data.reason,
        status: OperationStatus.DRAFT,
        notes: data.notes,
        createdById: userId,
        items: {
          create: itemsData,
        },
      },
      include: {
        warehouse: true,
        location: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  /**
   * Atomically validates stock adjustment:
   * - Reconciles physical inventory
   * - Appends ADJUSTMENT ledger entries
   * - Marks adjustment as DONE
   */
  static async validateAdjustment(id: string, validatorId: string) {
    return prisma.$transaction(async (tx) => {
      const adjustment = await tx.adjustment.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!adjustment) {
        throw new Error("Adjustment order not found.");
      }

      if (adjustment.status === OperationStatus.DONE) {
        throw new Error("Adjustment has already been validated.");
      }

      if (adjustment.status === OperationStatus.CANCELED) {
        throw new Error("Cannot validate a canceled adjustment.");
      }

      for (const item of adjustment.items) {
        const inv = await tx.inventory.findUnique({
          where: {
            productId_locationId: {
              productId: item.productId,
              locationId: adjustment.locationId,
            },
          },
        });

        const systemQty = inv ? inv.quantity : item.systemQuantity;
        const difference = item.physicalQuantity - systemQty;

        // Upsert inventory to match physical quantity
        await tx.inventory.upsert({
          where: {
            productId_locationId: {
              productId: item.productId,
              locationId: adjustment.locationId,
            },
          },
          update: {
            quantity: item.physicalQuantity,
          },
          create: {
            productId: item.productId,
            locationId: adjustment.locationId,
            warehouseId: adjustment.warehouseId,
            quantity: item.physicalQuantity,
          },
        });

        // Update item difference if needed
        await tx.adjustmentItem.update({
          where: { id: item.id },
          data: {
            systemQuantity: systemQty,
            differenceQuantity: difference,
          },
        });

        // Emit StockLedger entry
        await tx.stockLedger.create({
          data: {
            productId: item.productId,
            warehouseId: adjustment.warehouseId,
            locationId: adjustment.locationId,
            transactionType: "ADJUSTMENT",
            quantityBefore: systemQty,
            quantityChange: difference,
            quantityAfter: item.physicalQuantity,
            referenceType: "ADJUSTMENT",
            referenceId: adjustment.id,
            referenceNumber: adjustment.adjustmentNumber,
            notes: `Physical reconciliation: ${adjustment.reason}`,
            createdById: validatorId,
          },
        });
      }

      return tx.adjustment.update({
        where: { id },
        data: {
          status: OperationStatus.DONE,
          validatedById: validatorId,
          validatedAt: new Date(),
        },
        include: {
          warehouse: true,
          location: true,
          items: {
            include: {
              product: true,
            },
          },
          validatedBy: true,
        },
      });
    });
  }
}
