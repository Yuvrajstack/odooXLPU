import { describe, it, expect } from "vitest";
import { InventoryService } from "@/services/inventory.service";

describe("InventoryService - Domain Logic", () => {
  it("correctly identifies OUT_OF_STOCK when quantity is 0", () => {
    const status = InventoryService.calculateStockStatus(0, 50);
    expect(status).toBe("OUT_OF_STOCK");
  });

  it("correctly identifies OUT_OF_STOCK when quantity is negative", () => {
    const status = InventoryService.calculateStockStatus(-5, 50);
    expect(status).toBe("OUT_OF_STOCK");
  });

  it("correctly identifies LOW_STOCK when quantity is equal to reorder point", () => {
    const status = InventoryService.calculateStockStatus(50, 50);
    expect(status).toBe("LOW_STOCK");
  });

  it("correctly identifies LOW_STOCK when quantity is below reorder point but positive", () => {
    const status = InventoryService.calculateStockStatus(12, 50);
    expect(status).toBe("LOW_STOCK");
  });

  it("correctly identifies IN_STOCK when quantity is strictly greater than reorder point", () => {
    const status = InventoryService.calculateStockStatus(51, 50);
    expect(status).toBe("IN_STOCK");
  });

  it("handles high numbers with IN_STOCK", () => {
    const status = InventoryService.calculateStockStatus(10000, 100);
    expect(status).toBe("IN_STOCK");
  });
});
