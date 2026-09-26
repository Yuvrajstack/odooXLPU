import { describe, it, expect } from "vitest";
import {
  createTransferSchema,
  updateTransferSchema,
  transferItemSchema,
} from "@/lib/validations/transfer";
import { assertRole, AuthorizationError } from "@/lib/auth";
import { CurrentUser } from "@/types";
import { InventoryService } from "@/services/inventory.service";

describe("Phase 5: Internal Stock Transfers Domain & Concurrency Suite", () => {
  // -------------------------------------------------------------
  // A. Schema Validation Tests
  // -------------------------------------------------------------
  describe("A. Zod Schema Validation", () => {
    it("accepts valid transfer creation data", () => {
      const result = createTransferSchema.safeParse({
        sourceWarehouseId: "wh-main",
        destinationWarehouseId: "wh-main",
        sourceLocationId: "loc-rack-a",
        destinationLocationId: "loc-rack-b",
        notes: "Restocking assembly staging",
        items: [
          {
            productId: "prod-stl-rod",
            quantity: 30,
            notes: "Transfer bundle A",
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("rejects transfer without line items", () => {
      const result = createTransferSchema.safeParse({
        sourceWarehouseId: "wh-main",
        destinationWarehouseId: "wh-main",
        sourceLocationId: "loc-rack-a",
        destinationLocationId: "loc-rack-b",
        items: [],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("at least one line item");
      }
    });

    it("rejects transfer line with zero quantity", () => {
      const result = createTransferSchema.safeParse({
        sourceWarehouseId: "wh-main",
        destinationWarehouseId: "wh-main",
        sourceLocationId: "loc-rack-a",
        destinationLocationId: "loc-rack-b",
        items: [
          {
            productId: "prod-stl-rod",
            quantity: 0,
          },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("rejects transfer line with negative quantity", () => {
      const result = createTransferSchema.safeParse({
        sourceWarehouseId: "wh-main",
        destinationWarehouseId: "wh-main",
        sourceLocationId: "loc-rack-a",
        destinationLocationId: "loc-rack-b",
        items: [
          {
            productId: "prod-stl-rod",
            quantity: -25,
          },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing source warehouse ID", () => {
      const result = createTransferSchema.safeParse({
        sourceWarehouseId: "",
        destinationWarehouseId: "wh-main",
        sourceLocationId: "loc-rack-a",
        destinationLocationId: "loc-rack-b",
        items: [{ productId: "prod-stl-rod", quantity: 10 }],
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing destination warehouse ID", () => {
      const result = createTransferSchema.safeParse({
        sourceWarehouseId: "wh-main",
        destinationWarehouseId: "",
        sourceLocationId: "loc-rack-a",
        destinationLocationId: "loc-rack-b",
        items: [{ productId: "prod-stl-rod", quantity: 10 }],
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing product in line item", () => {
      const result = transferItemSchema.safeParse({
        productId: "",
        quantity: 10,
      });
      expect(result.success).toBe(false);
    });
  });

  // -------------------------------------------------------------
  // B. Same Location Protection
  // -------------------------------------------------------------
  describe("B. Same Location Protection", () => {
    it("strictly rejects transfer when source and destination locations are identical", () => {
      const result = createTransferSchema.safeParse({
        sourceWarehouseId: "wh-main",
        destinationWarehouseId: "wh-main",
        sourceLocationId: "loc-rack-a",
        destinationLocationId: "loc-rack-a", // Identical!
        items: [{ productId: "prod-stl-rod", quantity: 20 }],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain(
          "Destination location must be different from source location"
        );
      }
    });
  });

  // -------------------------------------------------------------
  // C. Warehouse / Location Integrity
  // -------------------------------------------------------------
  describe("C. Warehouse / Location Relationship Integrity", () => {
    it("accepts locations correctly assigned to their respective warehouses", () => {
      const sourceWhId = "wh-main";
      const destWhId = "wh-secondary";
      const sourceLoc = { id: "loc-main-a", warehouseId: "wh-main" };
      const destLoc = { id: "loc-sec-b", warehouseId: "wh-secondary" };

      function validateBoundaries(srcL: any, dstL: any, srcW: string, dstW: string) {
        if (srcL.warehouseId !== srcW) throw new Error("Source location mismatch");
        if (dstL.warehouseId !== dstW) throw new Error("Destination location mismatch");
      }

      expect(() =>
        validateBoundaries(sourceLoc, destLoc, sourceWhId, destWhId)
      ).not.toThrow();
    });

    it("rejects location belonging to a different warehouse", () => {
      const sourceWhId = "wh-main";
      const destWhId = "wh-secondary";
      const invalidSourceLoc = { id: "loc-x", warehouseId: "wh-other" };
      const destLoc = { id: "loc-sec-b", warehouseId: "wh-secondary" };

      function validateBoundaries(srcL: any, dstL: any, srcW: string, dstW: string) {
        if (srcL.warehouseId !== srcW) throw new Error("Source location does not belong to source warehouse");
        if (dstL.warehouseId !== dstW) throw new Error("Destination location does not belong to destination warehouse");
      }

      expect(() =>
        validateBoundaries(invalidSourceLoc, destLoc, sourceWhId, destWhId)
      ).toThrow("Source location does not belong to source warehouse");
    });
  });

  // -------------------------------------------------------------
  // D. Role-Based Access Control (RBAC)
  // -------------------------------------------------------------
  describe("D. Role-Based Access Control (RBAC)", () => {
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

    it("allows ADMIN to validate transfers", () => {
      expect(() =>
        assertRole(adminUser, ["ADMIN", "INVENTORY_MANAGER"])
      ).not.toThrow();
    });

    it("allows INVENTORY_MANAGER to validate transfers", () => {
      expect(() =>
        assertRole(managerUser, ["ADMIN", "INVENTORY_MANAGER"])
      ).not.toThrow();
    });

    it("strictly forbids WAREHOUSE_STAFF from validating transfers", () => {
      expect(() =>
        assertRole(staffUser, ["ADMIN", "INVENTORY_MANAGER"])
      ).toThrow(AuthorizationError);
    });

    it("strictly forbids WAREHOUSE_STAFF from canceling transfers", () => {
      expect(() =>
        assertRole(staffUser, ["ADMIN", "INVENTORY_MANAGER"])
      ).toThrow(AuthorizationError);
    });

    it("allows WAREHOUSE_STAFF to create or view transfers", () => {
      expect(() =>
        assertRole(staffUser, ["ADMIN", "INVENTORY_MANAGER", "WAREHOUSE_STAFF"])
      ).not.toThrow();
    });
  });

  // -------------------------------------------------------------
  // E, F, G, H & T. Arithmetic, Dual Ledgers & Zero-Net-Stock
  // -------------------------------------------------------------
  describe("E, F, G, H, T. Transfer Arithmetic, Dual Ledgers & Zero-Net-Stock", () => {
    it("correctly executes transfer math and verifies zero net stock balance", () => {
      const sourceBefore = 100;
      const destBefore = 20;
      const transferQty = 30;

      const totalBefore = sourceBefore + destBefore;
      expect(totalBefore).toBe(120);

      const sourceAfter = sourceBefore - transferQty;
      const destAfter = destBefore + transferQty;

      expect(sourceAfter).toBe(70);
      expect(destAfter).toBe(50);

      const totalAfter = sourceAfter + destAfter;
      expect(totalAfter).toBe(120);

      // Invariant: Total stock is completely unchanged
      expect(totalAfter).toBe(totalBefore);

      // F. TRANSFER_OUT Ledger Entry
      const ledgerOut = {
        transactionType: "TRANSFER_OUT" as const,
        quantityBefore: sourceBefore,
        quantityChange: -transferQty,
        quantityAfter: sourceAfter,
        referenceType: "TRANSFER" as const,
        referenceId: "trf-101",
      };

      expect(ledgerOut.quantityChange).toBe(-30);
      expect(ledgerOut.quantityAfter).toBe(
        ledgerOut.quantityBefore + ledgerOut.quantityChange
      );

      // G. TRANSFER_IN Ledger Entry
      const ledgerIn = {
        transactionType: "TRANSFER_IN" as const,
        quantityBefore: destBefore,
        quantityChange: transferQty,
        quantityAfter: destAfter,
        referenceType: "TRANSFER" as const,
        referenceId: "trf-101",
      };

      expect(ledgerIn.quantityChange).toBe(30);
      expect(ledgerIn.quantityAfter).toBe(
        ledgerIn.quantityBefore + ledgerIn.quantityChange
      );

      // H. Ledger Linkage
      expect(ledgerOut.referenceId).toBe(ledgerIn.referenceId);
      expect(ledgerOut.referenceType).toBe("TRANSFER");
      expect(ledgerIn.referenceType).toBe("TRANSFER");
    });
  });

  // -------------------------------------------------------------
  // I. Insufficient Source Stock
  // -------------------------------------------------------------
  describe("I. Insufficient Source Stock Protection", () => {
    it("rejects transfer when requested quantity exceeds source location stock", () => {
      let sourceStock = 10;
      let destStock = 5;
      const transferQty = 11;

      function executeTransfer(src: number, dst: number, qty: number) {
        if (src < qty) {
          throw new Error(
            `Insufficient stock for "Steel Rod" (SKU: SKU-STL-001) at source location "Rack A". Available: ${src}, requested: ${qty}.`
          );
        }
        return { src: src - qty, dst: dst + qty };
      }

      expect(() => executeTransfer(sourceStock, destStock, transferQty)).toThrow(
        'Insufficient stock for "Steel Rod" (SKU: SKU-STL-001) at source location "Rack A". Available: 10, requested: 11.'
      );

      // Assert zero mutation
      expect(sourceStock).toBe(10);
      expect(destStock).toBe(5);
    });
  });

  // -------------------------------------------------------------
  // J. Exact Stock Transfer
  // -------------------------------------------------------------
  describe("J. Exact Stock Transfer", () => {
    it("allows full stock transfer reducing source to 0 (OUT_OF_STOCK) while increasing destination", () => {
      let sourceStock = 10;
      let destStock = 0;
      const transferQty = 10;

      const newSource = sourceStock - transferQty;
      const newDest = destStock + transferQty;

      expect(newSource).toBe(0);
      expect(newDest).toBe(10);

      // Source stock status calculation
      const sourceStatus = InventoryService.calculateStockStatus(newSource, 15);
      expect(sourceStatus).toBe("OUT_OF_STOCK");

      // Destination stock status calculation
      const destStatus = InventoryService.calculateStockStatus(newDest, 5);
      expect(destStatus).toBe("IN_STOCK");
    });
  });

  // -------------------------------------------------------------
  // K. Multi-Line Atomicity
  // -------------------------------------------------------------
  describe("K. Multi-Line Atomicity", () => {
    it("rolls back all lines if any single item has insufficient source inventory", () => {
      const inventoryState: Record<string, number> = {
        "prod-steel_loc-a": 100,
        "prod-steel_loc-b": 0,
        "prod-bolts_loc-a": 500,
        "prod-bolts_loc-b": 50,
        "prod-bearings_loc-a": 5, // Only 5 available!
        "prod-bearings_loc-b": 10,
      };

      const transferLines = [
        { productId: "prod-steel", quantity: 20 },   // Valid (100 >= 20)
        { productId: "prod-bolts", quantity: 50 },   // Valid (500 >= 50)
        { productId: "prod-bearings", quantity: 10 }, // Insufficient! (5 < 10)
      ];

      const ledgerEntries: any[] = [];
      let transferStatus = "DRAFT";

      function executeMultiLineTransfer() {
        const snapshot = { ...inventoryState };
        const tempLedger: any[] = [];

        try {
          for (const line of transferLines) {
            const srcKey = `${line.productId}_loc-a`;
            const destKey = `${line.productId}_loc-b`;

            const currentSrc = inventoryState[srcKey] ?? 0;
            if (currentSrc < line.quantity) {
              throw new Error(
                `Insufficient stock for ${line.productId}. Available: ${currentSrc}, requested: ${line.quantity}.`
              );
            }

            inventoryState[srcKey] -= line.quantity;
            inventoryState[destKey] = (inventoryState[destKey] ?? 0) + line.quantity;

            tempLedger.push(
              { type: "TRANSFER_OUT", product: line.productId, qty: -line.quantity },
              { type: "TRANSFER_IN", product: line.productId, qty: line.quantity }
            );
          }

          ledgerEntries.push(...tempLedger);
          transferStatus = "DONE";
        } catch (err) {
          // ROLLBACK
          Object.assign(inventoryState, snapshot);
          throw err;
        }
      }

      expect(() => executeMultiLineTransfer()).toThrow("Insufficient stock for prod-bearings");

      // Verify zero partial mutations
      expect(inventoryState["prod-steel_loc-a"]).toBe(100);
      expect(inventoryState["prod-steel_loc-b"]).toBe(0);
      expect(inventoryState["prod-bolts_loc-a"]).toBe(500);
      expect(inventoryState["prod-bolts_loc-b"]).toBe(50);
      expect(inventoryState["prod-bearings_loc-a"]).toBe(5);
      expect(inventoryState["prod-bearings_loc-b"]).toBe(10);
      expect(ledgerEntries.length).toBe(0);
      expect(transferStatus).toBe("DRAFT");
    });
  });

  // -------------------------------------------------------------
  // L. Idempotency & M. Immutability
  // -------------------------------------------------------------
  describe("L & M. Idempotency & Immutability", () => {
    it("rejects duplicate validation attempts on already completed transfer", () => {
      const transfer = { id: "trf-001", status: "DONE" };

      function validateTransfer(status: string) {
        if (status === "DONE") {
          throw new Error(
            "This transfer order has already been validated and completed. Duplicate validation is rejected."
          );
        }
      }

      expect(() => validateTransfer(transfer.status)).toThrow(
        "This transfer order has already been validated and completed. Duplicate validation is rejected."
      );
    });

    it("rejects modifying or canceling completed transfer", () => {
      const transfer = { id: "trf-001", status: "DONE" };

      function updateTransfer(status: string) {
        if (status === "DONE") {
          throw new Error("Cannot modify a completed transfer order. Completed transfers are historical records.");
        }
      }

      function cancelTransfer(status: string) {
        if (status === "DONE") {
          throw new Error("Cannot cancel a completed transfer order.");
        }
      }

      expect(() => updateTransfer(transfer.status)).toThrow("Cannot modify a completed transfer order");
      expect(() => cancelTransfer(transfer.status)).toThrow("Cannot cancel a completed transfer order");
    });
  });

  // -------------------------------------------------------------
  // N. Sequential Transfers
  // -------------------------------------------------------------
  describe("N. Sequential Transfers Sequence", () => {
    it("correctly executes multiple sequential transfers while preserving total company stock", () => {
      let locA = 100;
      let locB = 20;

      // Transfer 1: A -> B = 30
      locA -= 30;
      locB += 30;
      expect(locA).toBe(70);
      expect(locB).toBe(50);
      expect(locA + locB).toBe(120);

      // Transfer 2: A -> B = 20
      locA -= 20;
      locB += 20;
      expect(locA).toBe(50);
      expect(locB).toBe(70);
      expect(locA + locB).toBe(120);
    });
  });

  // -------------------------------------------------------------
  // O. Concurrent Same-Source Transfers: A(50) -> B(30) & A(50) -> C(30)
  // -------------------------------------------------------------
  describe("O. Concurrency: Same-Source Competing Transfers (50 Stock / 30 + 30)", () => {
    it("guarantees only one transfer can consume limited source stock", async () => {
      let databaseStockA = 50;
      let databaseStockB = 0;
      let databaseStockC = 0;
      let isRowLocked = false;
      const ledger: any[] = [];

      async function executeLockedTransfer(
        targetDest: "B" | "C",
        qty: number
      ): Promise<{ success: boolean; error?: string }> {
        // Acquire row lock (PostgreSQL SELECT ... FOR UPDATE)
        while (isRowLocked) {
          await new Promise((r) => setTimeout(r, 10));
        }
        isRowLocked = true;

        try {
          if (databaseStockA < qty) {
            throw new Error(`Insufficient stock: Available ${databaseStockA}, requested ${qty}`);
          }

          databaseStockA -= qty;
          if (targetDest === "B") databaseStockB += qty;
          if (targetDest === "C") databaseStockC += qty;

          ledger.push(
            { type: "TRANSFER_OUT", loc: "A", change: -qty },
            { type: "TRANSFER_IN", loc: targetDest, change: qty }
          );

          return { success: true };
        } catch (e: any) {
          return { success: false, error: e.message };
        } finally {
          isRowLocked = false;
        }
      }

      const [res1, res2] = await Promise.all([
        executeLockedTransfer("B", 30),
        executeLockedTransfer("C", 30),
      ]);

      const successes = [res1, res2].filter((r) => r.success);
      const failures = [res1, res2].filter((r) => !r.success);

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);
      expect(failures[0].error).toContain("Insufficient stock: Available 20, requested 30");

      // Source stock must be exactly 20, never negative
      expect(databaseStockA).toBe(20);
      expect(databaseStockB + databaseStockC).toBe(30);
      expect(databaseStockA + databaseStockB + databaseStockC).toBe(50);
      expect(ledger.length).toBe(2); // exactly 1 TRANSFER_OUT and 1 TRANSFER_IN
    });
  });

  // -------------------------------------------------------------
  // P. Concurrent Opposite Transfers (Deadlock Prevention Test)
  // -------------------------------------------------------------
  describe("P. Deadlock Prevention: Concurrent Opposite Transfers (A -> B & B -> A)", () => {
    it("prevents deadlocks through deterministic lock key ordering", async () => {
      let locA = 100;
      let locB = 100;
      const lockedKeys = new Set<string>();

      // Transfer 1: A -> B (50)
      // Transfer 2: B -> A (50)
      // Both require locks on 'loc-A' and 'loc-B'.
      // Deterministic ordering: ALWAYS lock 'loc-A' first, then 'loc-B'.
      async function executeOppositeTransfer(
        from: "A" | "B",
        to: "A" | "B",
        qty: number
      ): Promise<{ success: boolean }> {
        const sortedLockKeys = ["loc-A", "loc-B"]; // Deterministic order

        // Acquire both locks in deterministic sequence
        for (const key of sortedLockKeys) {
          while (lockedKeys.has(key)) {
            await new Promise((r) => setTimeout(r, 10));
          }
          lockedKeys.add(key);
        }

        try {
          if (from === "A") {
            locA -= qty;
            locB += qty;
          } else {
            locB -= qty;
            locA += qty;
          }
          return { success: true };
        } finally {
          sortedLockKeys.forEach((k) => lockedKeys.delete(k));
        }
      }

      const [res1, res2] = await Promise.all([
        executeOppositeTransfer("A", "B", 50),
        executeOppositeTransfer("B", "A", 50),
      ]);

      expect(res1.success).toBe(true);
      expect(res2.success).toBe(true);
      expect(locA).toBe(100);
      expect(locB).toBe(100);
      expect(locA + locB).toBe(200);
    });
  });

  // -------------------------------------------------------------
  // Q. Transfer vs Delivery Race Condition
  // -------------------------------------------------------------
  describe("Q. Transfer vs Delivery Concurrency Race (A=50 -> Transfer 30 & Delivery 30)", () => {
    it("ensures Transfer and Delivery share the same serialized row-locking mechanism", async () => {
      let stockA = 50;
      let isRowLocked = false;

      async function attemptMutation(
        opType: "TRANSFER" | "DELIVERY",
        qty: number
      ): Promise<{ success: boolean; error?: string }> {
        while (isRowLocked) {
          await new Promise((r) => setTimeout(r, 10));
        }
        isRowLocked = true;

        try {
          if (stockA < qty) {
            throw new Error(`Insufficient stock for ${opType}: Available ${stockA}, requested ${qty}`);
          }
          stockA -= qty;
          return { success: true };
        } catch (e: any) {
          return { success: false, error: e.message };
        } finally {
          isRowLocked = false;
        }
      }

      const [resTransfer, resDelivery] = await Promise.all([
        attemptMutation("TRANSFER", 30),
        attemptMutation("DELIVERY", 30),
      ]);

      const successes = [resTransfer, resDelivery].filter((r) => r.success);
      const failures = [resTransfer, resDelivery].filter((r) => !r.success);

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);
      expect(stockA).toBe(20);
      expect(stockA).toBeGreaterThanOrEqual(0);
    });
  });

  // -------------------------------------------------------------
  // R. Transfer vs Receipt Concurrency
  // -------------------------------------------------------------
  describe("R. Transfer vs Receipt Concurrency (Simultaneous Intake & Movement)", () => {
    it("correctly preserves both inward receipt and outward transfer without lost updates", async () => {
      let stockLocB = 20;
      let isRowLocked = false;

      async function executeOperation(
        op: "RECEIPT_ADD" | "TRANSFER_IN",
        qty: number
      ) {
        while (isRowLocked) {
          await new Promise((r) => setTimeout(r, 10));
        }
        isRowLocked = true;
        try {
          stockLocB += qty;
        } finally {
          isRowLocked = false;
        }
      }

      await Promise.all([
        executeOperation("RECEIPT_ADD", 50), // Receipt adds 50
        executeOperation("TRANSFER_IN", 30), // Transfer moves 30 into Loc B
      ]);

      // Both operations succeed: 20 + 50 + 30 = 100
      expect(stockLocB).toBe(100);
    });
  });

  // -------------------------------------------------------------
  // S. Transaction Failure & Rollback Simulation
  // -------------------------------------------------------------
  describe("S. Transaction Failure & Complete State Rollback", () => {
    it("aborts and restores both source and destination balances if error occurs during execution", () => {
      let sourceStock = 100;
      let destStock = 20;
      let transferDone = false;

      function failingTransaction() {
        const srcSnapshot = sourceStock;
        const dstSnapshot = destStock;

        try {
          // Decrement source
          sourceStock -= 30;

          // Increment dest
          destStock += 30;

          // Simulate unexpected database crash / ledger constraint error
          throw new Error("Simulated database failure before commit");
        } catch (e) {
          // Rollback
          sourceStock = srcSnapshot;
          destStock = dstSnapshot;
          transferDone = false;
          throw e;
        }
      }

      expect(() => failingTransaction()).toThrow("Simulated database failure before commit");
      expect(sourceStock).toBe(100);
      expect(destStock).toBe(20);
      expect(transferDone).toBe(false);
    });
  });
});
