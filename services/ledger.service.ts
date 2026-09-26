import { prisma } from "@/lib/db";
import { LedgerTransactionType, LedgerReferenceType } from "@/types";

export interface CreateLedgerEntryInput {
  productId: string;
  warehouseId: string;
  locationId: string;
  transactionType: LedgerTransactionType;
  quantityBefore: number;
  quantityChange: number;
  quantityAfter: number;
  referenceType: LedgerReferenceType;
  referenceId: string;
  referenceNumber: string;
  notes?: string;
  createdById: string;
}

export class LedgerService {
  /**
   * Retrieves append-only ledger history with optional filters.
   */
  static async getHistory(filters?: {
    productId?: string;
    warehouseId?: string;
    locationId?: string;
    transactionType?: LedgerTransactionType;
    limit?: number;
  }) {
    return prisma.stockLedger.findMany({
      where: {
        ...(filters?.productId ? { productId: filters.productId } : {}),
        ...(filters?.warehouseId ? { warehouseId: filters.warehouseId } : {}),
        ...(filters?.locationId ? { locationId: filters.locationId } : {}),
        ...(filters?.transactionType
          ? { transactionType: filters.transactionType }
          : {}),
      },
      include: {
        product: { select: { name: true, sku: true, uom: true } },
        warehouse: { select: { name: true, code: true } },
        location: { select: { name: true, code: true } },
        createdBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: filters?.limit ?? 50,
    });
  }
}
