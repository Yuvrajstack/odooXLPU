import { prisma } from "@/lib/db";
import { StockStatus } from "@/types";

export interface StockCheckResult {
  productId: string;
  locationId: string;
  availableQuantity: number;
  reservedQuantity: number;
  sufficient: boolean;
}

export class InventoryService {
  /**
   * Calculates the derived stock status based on physical count and reorder point.
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
}
