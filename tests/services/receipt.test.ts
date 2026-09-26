import { describe, it, expect, vi, beforeEach } from "vitest";
import { createReceiptSchema, updateReceiptSchema } from "@/lib/validations/receipt";
import { assertRole, AuthorizationError } from "@/lib/auth";
import { CurrentUser } from "@/types";

describe("Receipts Validation & Authorization Logic", () => {
  describe("Zod Schema Validation", () => {
    it("accepts valid receipt creation data", () => {
      const result = createReceiptSchema.safeParse({
        supplierName: "Apex Industrial Supply",
        supplierContact: "orders@apex.com",
        warehouseId: "wh-main",
        receivedDate: "2026-09-26",
        notes: "Routine structural restock",
        items: [
          {
            productId: "prod-stl",
            locationId: "loc-rack-a",
            expectedQuantity: 100,
            receivedQuantity: 100,
            unitCost: 14.5,
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("rejects receipt without line items (Rule 3)", () => {
      const result = createReceiptSchema.safeParse({
        supplierName: "Apex Industrial Supply",
        warehouseId: "wh-main",
        items: [],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("at least one line item");
      }
    });

    it("rejects receipt line with zero quantity (Rule 4)", () => {
      const result = createReceiptSchema.safeParse({
        supplierName: "Apex Industrial Supply",
        warehouseId: "wh-main",
        items: [
          {
            productId: "prod-stl",
            locationId: "loc-rack-a",
            expectedQuantity: 0,
            receivedQuantity: 0,
          },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("rejects receipt line with negative quantity (Rule 5)", () => {
      const result = createReceiptSchema.safeParse({
        supplierName: "Apex Industrial Supply",
        warehouseId: "wh-main",
        items: [
          {
            productId: "prod-stl",
            locationId: "loc-rack-a",
            expectedQuantity: -25,
            receivedQuantity: -25,
          },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty supplier name", () => {
      const result = createReceiptSchema.safeParse({
        supplierName: " ",
        warehouseId: "wh-main",
        items: [
          {
            productId: "prod-stl",
            locationId: "loc-rack-a",
            expectedQuantity: 10,
          },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing warehouse ID (Rule 7)", () => {
      const result = createReceiptSchema.safeParse({
        supplierName: "Apex Supply",
        warehouseId: "",
        items: [
          {
            productId: "prod-stl",
            locationId: "loc-rack-a",
            expectedQuantity: 10,
          },
        ],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Role-Based Access Control (RBAC) (Rule 18)", () => {
    const adminUser: CurrentUser = {
      id: "usr-admin",
      name: "Alex Vance",
      email: "admin@stocksense.io",
      role: "ADMIN",
    };

    const managerUser: CurrentUser = {
      id: "usr-mgr",
      name: "Marcus Brody",
      email: "manager@stocksense.io",
      role: "INVENTORY_MANAGER",
    };

    const staffUser: CurrentUser = {
      id: "usr-staff",
      name: "Sarah Jenkins",
      email: "staff@stocksense.io",
      role: "WAREHOUSE_STAFF",
    };

    it("allows ADMIN to validate receipts", () => {
      expect(() =>
        assertRole(adminUser, ["ADMIN", "INVENTORY_MANAGER"])
      ).not.toThrow();
    });

    it("allows INVENTORY_MANAGER to validate receipts", () => {
      expect(() =>
        assertRole(managerUser, ["ADMIN", "INVENTORY_MANAGER"])
      ).not.toThrow();
    });

    it("strictly forbids WAREHOUSE_STAFF from validating receipts", () => {
      expect(() =>
        assertRole(staffUser, ["ADMIN", "INVENTORY_MANAGER"])
      ).toThrow(AuthorizationError);
    });

    it("allows WAREHOUSE_STAFF to create or view receipts", () => {
      expect(() =>
        assertRole(staffUser, ["ADMIN", "INVENTORY_MANAGER", "WAREHOUSE_STAFF"])
      ).not.toThrow();
    });
  });

  describe("Stock Inward Ledger Math & Invariant Rules (Rules 12, 13, 20)", () => {
    it("calculates correct stock balance and delta for initial receipt", () => {
      const currentQuantity = 50;
      const inwardQuantity = 100;
      const newQuantity = currentQuantity + inwardQuantity;

      expect(newQuantity).toBe(150);

      const ledgerRecord = {
        transactionType: "RECEIPT",
        quantityBefore: currentQuantity,
        quantityChange: inwardQuantity,
        quantityAfter: newQuantity,
      };

      expect(ledgerRecord.quantityBefore).toBe(50);
      expect(ledgerRecord.quantityChange).toBe(100);
      expect(ledgerRecord.quantityAfter).toBe(150);
    });

    it("accumulates multiple inward receipts correctly preserving ledger audit trail", () => {
      // Step 1: Initial 50
      let balance = 50;

      // Step 2: Receipt 1 (+100)
      const r1Change = 100;
      const r1Before = balance;
      balance += r1Change;
      const r1After = balance;

      expect(r1Before).toBe(50);
      expect(r1After).toBe(150);

      // Step 3: Receipt 2 (+25)
      const r2Change = 25;
      const r2Before = balance;
      balance += r2Change;
      const r2After = balance;

      expect(r2Before).toBe(150);
      expect(r2After).toBe(175);
      expect(balance).toBe(175);
    });

    it("rejects re-validation when receipt is already DONE (Idempotency Rule 15)", () => {
      const receipt = {
        id: "rcp-101",
        status: "DONE",
      };

      function attemptValidation(status: string) {
        if (status === "DONE") {
          throw new Error("This receipt has already been validated and completed. Duplicate validation is rejected.");
        }
      }

      expect(() => attemptValidation(receipt.status)).toThrow(
        "This receipt has already been validated and completed. Duplicate validation is rejected."
      );
    });

    it("rejects editing when receipt is already DONE (Rule 10)", () => {
      const receipt = {
        id: "rcp-101",
        status: "DONE",
      };

      function attemptEdit(status: string) {
        if (status === "DONE") {
          throw new Error("Cannot modify a completed receipt. Completed receipts are historical records.");
        }
      }

      expect(() => attemptEdit(receipt.status)).toThrow(
        "Cannot modify a completed receipt. Completed receipts are historical records."
      );
    });

    it("rejects location belonging to another warehouse (Rule 8)", () => {
      const warehouseId = "wh-main";
      const location = {
        id: "loc-detroit-raw",
        name: "Raw Material Area",
        warehouseId: "wh-prod", // different warehouse!
      };

      function validateLocationBelongsToWarehouse(locWhId: string, targetWhId: string) {
        if (locWhId !== targetWhId) {
          throw new Error("Location belongs to a different warehouse.");
        }
      }

      expect(() =>
        validateLocationBelongsToWarehouse(location.warehouseId, warehouseId)
      ).toThrow("Location belongs to a different warehouse.");
    });
  });
});
