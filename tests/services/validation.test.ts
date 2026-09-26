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

  describe("Authentication Validation (Mockup Rules)", () => {
    it("accepts valid signup data matching all 4 rules", async () => {
      const { signupSchema } = await import("@/lib/validations/auth");
      const result = signupSchema.safeParse({
        loginId: "manager_01",
        email: "manager@test.com",
        password: "Password123!",
        confirmPassword: "Password123!",
      });
      expect(result.success).toBe(true);
    });

    it("rejects login ID shorter than 6 or longer than 12 chars", async () => {
      const { signupSchema } = await import("@/lib/validations/auth");
      const shortResult = signupSchema.safeParse({
        loginId: "user",
        email: "user@test.com",
        password: "Password123!",
        confirmPassword: "Password123!",
      });
      expect(shortResult.success).toBe(false);

      const longResult = signupSchema.safeParse({
        loginId: "super_long_user_id_123",
        email: "user@test.com",
        password: "Password123!",
        confirmPassword: "Password123!",
      });
      expect(longResult.success).toBe(false);
    });

    it("rejects password missing special characters or shorter than 9 chars", async () => {
      const { signupSchema } = await import("@/lib/validations/auth");
      const noSpecial = signupSchema.safeParse({
        loginId: "valid_user",
        email: "user@test.com",
        password: "Password1234",
        confirmPassword: "Password1234",
      });
      expect(noSpecial.success).toBe(false);

      const tooShort = signupSchema.safeParse({
        loginId: "valid_user",
        email: "user@test.com",
        password: "Pass1!",
        confirmPassword: "Pass1!",
      });
      expect(tooShort.success).toBe(false);
    });
  });
});
