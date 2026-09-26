import { describe, it, expect } from "vitest";
import { productSchema } from "@/lib/validations/product";
import { categorySchema } from "@/lib/validations/category";
import { warehouseSchema } from "@/lib/validations/warehouse";
import { locationSchema } from "@/lib/validations/location";

describe("Domain Validation Schemas", () => {
  describe("Category Validation", () => {
    it("accepts valid category data", () => {
      const result = categorySchema.safeParse({
        name: "Raw Materials",
        code: "raw",
        description: "Base components",
        active: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.code).toBe("RAW"); // normalized to uppercase
      }
    });

    it("rejects empty category name", () => {
      const result = categorySchema.safeParse({
        name: "A",
        code: "RAW",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid characters in code", () => {
      const result = categorySchema.safeParse({
        name: "Raw Materials",
        code: "RAW MATERIAL!",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Product Validation", () => {
    it("accepts valid product with default uom and reorder point", () => {
      const result = productSchema.safeParse({
        name: "Steel Rod 12mm",
        sku: "sku-stl-0012",
        categoryId: "cat-123",
        uom: "meters",
        reorderPoint: 50,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sku).toBe("SKU-STL-0012");
      }
    });

    it("rejects negative reorder point", () => {
      const result = productSchema.safeParse({
        name: "Steel Rod 12mm",
        sku: "SKU-001",
        categoryId: "cat-123",
        uom: "meters",
        reorderPoint: -10,
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing categoryId", () => {
      const result = productSchema.safeParse({
        name: "Steel Rod",
        sku: "SKU-001",
        categoryId: "",
        uom: "units",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Warehouse Validation", () => {
    it("accepts valid warehouse data and transforms code to uppercase", () => {
      const result = warehouseSchema.safeParse({
        name: "Main Distribution Center",
        code: "wh-main",
        city: "Chicago",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.code).toBe("WH-MAIN");
      }
    });

    it("rejects invalid code with spaces", () => {
      const result = warehouseSchema.safeParse({
        name: "Main Distribution Center",
        code: "WH MAIN",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Location Validation", () => {
    it("accepts valid location and valid LocationType enum", () => {
      const result = locationSchema.safeParse({
        warehouseId: "wh-1",
        name: "Rack A-01",
        code: "loc-a01",
        type: "RACK",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.code).toBe("LOC-A01");
      }
    });

    it("rejects invalid LocationType", () => {
      const result = locationSchema.safeParse({
        warehouseId: "wh-1",
        name: "Rack A",
        code: "LOC-A",
        type: "INVALID_ZONE_TYPE",
      });
      expect(result.success).toBe(false);
    });
  });
});
