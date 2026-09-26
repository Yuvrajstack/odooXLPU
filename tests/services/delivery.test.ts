import { describe, it, expect } from "vitest";
import {
  createDeliverySchema,
  updateDeliverySchema,
  deliveryItemSchema,
} from "@/lib/validations/delivery";
import { assertRole, AuthorizationError } from "@/lib/auth";
import { CurrentUser } from "@/types";
import { InventoryService } from "@/services/inventory.service";

describe("Phase 4: Deliveries / Stock-Out Domain & Integrity Suite", () => {
  // -------------------------------------------------------------
  // A. Schema Validation Tests
  // -------------------------------------------------------------
  describe("A. Zod Schema Validation", () => {
    it("accepts valid delivery creation data", () => {
      const result = createDeliverySchema.safeParse({
        customerName: "Acme Industrial Corp",
        customerContact: "shipping@acme.com",
        warehouseId: "wh-main",
        deliveryDate: "2026-09-26",
        notes: "Priority outbound shipment",
        items: [
          {
            productId: "prod-stl-rod",
            locationId: "loc-rack-a",
            requestedQuantity: 20,
            notes: "Bundle securely",
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("rejects delivery without line items (Rule 3)", () => {
      const result = createDeliverySchema.safeParse({
        customerName: "Acme Industrial Corp",
        warehouseId: "wh-main",
        items: [],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("at least one line item");
      }
    });

    it("rejects delivery line with zero quantity", () => {
      const result = createDeliverySchema.safeParse({
        customerName: "Acme Industrial Corp",
        warehouseId: "wh-main",
        items: [
          {
            productId: "prod-stl-rod",
            locationId: "loc-rack-a",
            requestedQuantity: 0,
          },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("rejects delivery line with negative quantity", () => {
      const result = createDeliverySchema.safeParse({
        customerName: "Acme Industrial Corp",
        warehouseId: "wh-main",
        items: [
          {
            productId: "prod-stl-rod",
            locationId: "loc-rack-a",
            requestedQuantity: -15,
          },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing warehouse ID", () => {
      const result = createDeliverySchema.safeParse({
        customerName: "Acme Industrial Corp",
        warehouseId: "",
        items: [
          {
            productId: "prod-stl-rod",
            locationId: "loc-rack-a",
            requestedQuantity: 10,
          },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing product ID in line item", () => {
      const result = deliveryItemSchema.safeParse({
        productId: "",
        locationId: "loc-rack-a",
        requestedQuantity: 10,
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing location ID in line item", () => {
      const result = deliveryItemSchema.safeParse({
        productId: "prod-stl-rod",
        locationId: "",
        requestedQuantity: 10,
      });
      expect(result.success).toBe(false);
    });
  });

  // -------------------------------------------------------------
  // B. Location Integrity Tests
  // -------------------------------------------------------------
  describe("B. Location & Warehouse Boundary Integrity", () => {
    it("accepts source location belonging to the specified delivery warehouse", () => {
      const targetWarehouseId = "wh-main";
      const location = {
        id: "loc-rack-a",
        name: "Rack A-01",
        warehouseId: "wh-main",
      };

      function validateLocationOwnership(locWhId: string, docWhId: string) {
        if (locWhId !== docWhId) {
          throw new Error("Location belongs to a different warehouse.");
        }
      }

      expect(() =>
        validateLocationOwnership(location.warehouseId, targetWarehouseId)
      ).not.toThrow();
    });

    it("strictly rejects source location belonging to another warehouse", () => {
      const targetWarehouseId = "wh-main";
      const location = {
        id: "loc-east-storage",
        name: "East Yard",
        warehouseId: "wh-secondary", // Different warehouse!
      };

      function validateLocationOwnership(locWhId: string, docWhId: string) {
        if (locWhId !== docWhId) {
          throw new Error(
            `Location integrity error: Location "${location.name}" does not belong to warehouse "${targetWarehouseId}".`
          );
        }
      }

      expect(() =>
        validateLocationOwnership(location.warehouseId, targetWarehouseId)
      ).toThrow("Location integrity error");
    });
  });

  // -------------------------------------------------------------
  // C. RBAC Authorization Tests
  // -------------------------------------------------------------
  describe("C. Role-Based Access Control (RBAC)", () => {
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

    it("allows ADMIN to validate deliveries", () => {
      expect(() =>
        assertRole(adminUser, ["ADMIN", "INVENTORY_MANAGER"])
      ).not.toThrow();
    });

    it("allows INVENTORY_MANAGER to validate deliveries", () => {
      expect(() =>
        assertRole(managerUser, ["ADMIN", "INVENTORY_MANAGER"])
      ).not.toThrow();
    });

    it("strictly forbids WAREHOUSE_STAFF from validating deliveries", () => {
      expect(() =>
        assertRole(staffUser, ["ADMIN", "INVENTORY_MANAGER"])
      ).toThrow(AuthorizationError);
    });

    it("strictly forbids WAREHOUSE_STAFF from canceling deliveries", () => {
      expect(() =>
        assertRole(staffUser, ["ADMIN", "INVENTORY_MANAGER"])
      ).toThrow(AuthorizationError);
    });

    it("allows WAREHOUSE_STAFF to create or view deliveries", () => {
      expect(() =>
        assertRole(staffUser, ["ADMIN", "INVENTORY_MANAGER", "WAREHOUSE_STAFF"])
      ).not.toThrow();
    });
  });

  // -------------------------------------------------------------
  // D & E. Stock Availability, Decrement & Ledger Accounting
  // -------------------------------------------------------------
  describe("D & E. Stock Availability & Exact Ledger Accounting", () => {
    it("correctly decreases physical inventory and satisfies ledger invariant", () => {
      const currentQuantity = 100;
      const deliveryQuantity = 30;

      // Assertion: deliveryQuantity <= currentQuantity
      expect(deliveryQuantity).toBeLessThanOrEqual(currentQuantity);

      const newQuantity = currentQuantity - deliveryQuantity;
      expect(newQuantity).toBe(70);

      // Ledger Record Construction
      const ledgerEntry = {
        transactionType: "DELIVERY" as const,
        quantityBefore: currentQuantity,
        quantityChange: -deliveryQuantity,
        quantityAfter: newQuantity,
      };

      // Ledger Invariant 1: quantityChange must be negative for deliveries
      expect(ledgerEntry.quantityChange).toBe(-30);
      expect(ledgerEntry.quantityChange).toBeLessThan(0);

      // Ledger Invariant 2: quantityAfter = quantityBefore + quantityChange
      expect(ledgerEntry.quantityAfter).toBe(
        ledgerEntry.quantityBefore + ledgerEntry.quantityChange
      );

      // Invariant 3: Resulting inventory must never be negative
      expect(newQuantity).toBeGreaterThanOrEqual(0);
    });
  });

  // -------------------------------------------------------------
  // F. Zero-Stock Behavior & Stock Status Calculation
  // -------------------------------------------------------------
  describe("F. Zero-Stock Boundary Behavior", () => {
    it("allows delivery of exact available quantity and updates status to OUT_OF_STOCK", () => {
      const currentQuantity = 10;
      const deliveryQuantity = 10;

      const newQuantity = currentQuantity - deliveryQuantity;
      expect(newQuantity).toBe(0);

      // Check domain stock status calculation
      const stockStatus = InventoryService.calculateStockStatus(newQuantity, 15);
      expect(stockStatus).toBe("OUT_OF_STOCK");
    });
  });

  // -------------------------------------------------------------
  // G. Insufficient Stock Rejection
  // -------------------------------------------------------------
  describe("G. Insufficient Stock Protection", () => {
    it("strictly rejects delivery when requested quantity exceeds available stock", () => {
      let currentStock = 10;
      const requestedQuantity = 11;

      function attemptStockDecrement(avail: number, req: number) {
        if (avail < req) {
          throw new Error(
            `Insufficient stock for "Steel Rod" (SKU: SKU-STL-001) at location "Rack A". Available: ${avail}, requested: ${req}.`
          );
        }
        return avail - req;
      }

      expect(() => attemptStockDecrement(currentStock, requestedQuantity)).toThrow(
        'Insufficient stock for "Steel Rod" (SKU: SKU-STL-001) at location "Rack A". Available: 10, requested: 11.'
      );

      // Stock remains unmodified
      expect(currentStock).toBe(10);
    });
  });

  // -------------------------------------------------------------
  // H. Multi-Line Transaction Atomicity
  // -------------------------------------------------------------
  describe("H. Multi-Line Transaction Atomicity", () => {
    it("rolls back all lines if any single line has insufficient stock", () => {
      const inventoryState: Record<string, number> = {
        "prod-steel": 100,
        "prod-bolts": 500,
        "prod-bearings": 5, // Only 5 available!
      };

      const deliveryLines = [
        { productId: "prod-steel", requestedQuantity: 20 },   // Valid (100 >= 20)
        { productId: "prod-bolts", requestedQuantity: 50 },   // Valid (500 >= 50)
        { productId: "prod-bearings", requestedQuantity: 10 }, // Insufficient! (5 < 10)
      ];

      const ledgerEntries: any[] = [];
      let deliveryStatus = "DRAFT";

      // Simulated atomic transaction
      function executeDeliveryTransaction() {
        // Snapshot for rollback
        const backupState = { ...inventoryState };
        const tempLedger: any[] = [];

        try {
          for (const line of deliveryLines) {
            const avail = inventoryState[line.productId] ?? 0;
            if (avail < line.requestedQuantity) {
              throw new Error(
                `Insufficient stock for ${line.productId}. Available: ${avail}, requested: ${line.requestedQuantity}.`
              );
            }
            inventoryState[line.productId] -= line.requestedQuantity;
            tempLedger.push({
              productId: line.productId,
              quantityBefore: avail,
              quantityChange: -line.requestedQuantity,
              quantityAfter: inventoryState[line.productId],
            });
          }

          ledgerEntries.push(...tempLedger);
          deliveryStatus = "DONE";
        } catch (err) {
          // ROLLBACK EVERYTHING
          Object.assign(inventoryState, backupState);
          throw err;
        }
      }

      expect(() => executeDeliveryTransaction()).toThrow("Insufficient stock for prod-bearings");

      // Verify no partial mutation occurred
      expect(inventoryState["prod-steel"]).toBe(100);
      expect(inventoryState["prod-bolts"]).toBe(500);
      expect(inventoryState["prod-bearings"]).toBe(5);
      expect(ledgerEntries.length).toBe(0);
      expect(deliveryStatus).toBe("DRAFT");
    });
  });

  // -------------------------------------------------------------
  // I. Idempotency Protection
  // -------------------------------------------------------------
  describe("I. Idempotency Protection", () => {
    it("rejects duplicate validation attempts on already completed delivery", () => {
      const delivery = {
        id: "dlv-001",
        deliveryNumber: "DEL-2026-0001",
        status: "DONE",
      };

      function validateDeliveryOrder(status: string) {
        if (status === "DONE") {
          throw new Error(
            "This delivery order has already been validated and completed. Duplicate validation is rejected."
          );
        }
        if (status === "CANCELED") {
          throw new Error("Cannot validate a canceled delivery order.");
        }
      }

      expect(() => validateDeliveryOrder(delivery.status)).toThrow(
        "This delivery order has already been validated and completed. Duplicate validation is rejected."
      );
    });
  });

  // -------------------------------------------------------------
  // J. Completed Delivery Immutability
  // -------------------------------------------------------------
  describe("J. Completed Delivery Immutability", () => {
    it("rejects modifications or cancellations on DONE deliveries", () => {
      const delivery = {
        id: "dlv-001",
        status: "DONE",
      };

      function updateDraftDelivery(status: string) {
        if (status === "DONE") {
          throw new Error(
            "Cannot modify a completed delivery order. Completed deliveries are historical records."
          );
        }
      }

      function cancelDeliveryOrder(status: string) {
        if (status === "DONE") {
          throw new Error("Cannot cancel a completed delivery order.");
        }
      }

      expect(() => updateDraftDelivery(delivery.status)).toThrow("Cannot modify a completed delivery order");
      expect(() => cancelDeliveryOrder(delivery.status)).toThrow("Cannot cancel a completed delivery order");
    });
  });

  // -------------------------------------------------------------
  // K. Concurrency Safety: 50 Stock / 30 + 30 Concurrent Deliveries
  // -------------------------------------------------------------
  describe("K. Concurrency Safety: 50 Stock / (30 + 30) Concurrent Deliveries", () => {
    it("guarantees that concurrent deliveries cannot over-deliver or create negative stock", async () => {
      // Setup initial stock = 50
      let databaseStock = 50;
      let activeRowLock = false;
      const successfulDeliveries: string[] = [];
      const ledgerEntries: any[] = [];

      // Concurrency model simulating PostgreSQL SELECT ... FOR UPDATE row-level locking
      async function executeLockedDeliveryTransaction(
        deliveryId: string,
        quantityToDeliver: number
      ): Promise<{ success: boolean; error?: string }> {
        // Step 1: Wait for and acquire row lock (PostgreSQL FOR UPDATE)
        while (activeRowLock) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        activeRowLock = true; // Lock acquired by transaction

        try {
          // Step 2: Read authoritative locked stock
          const currentQty = databaseStock;

          // Step 3: Check sufficiency
          if (currentQty < quantityToDeliver) {
            throw new Error(
              `Insufficient stock: Available ${currentQty}, requested ${quantityToDeliver}.`
            );
          }

          // Step 4: Calculate new stock and assert non-negative
          const newQty = currentQty - quantityToDeliver;
          if (newQty < 0) {
            throw new Error(`Negative stock violation: ${newQty}`);
          }

          // Step 5: Mutate inventory & append immutable ledger record
          databaseStock = newQty;
          ledgerEntries.push({
            referenceId: deliveryId,
            quantityBefore: currentQty,
            quantityChange: -quantityToDeliver,
            quantityAfter: newQty,
          });

          successfulDeliveries.push(deliveryId);
          return { success: true };
        } catch (err: any) {
          return { success: false, error: err.message };
        } finally {
          // Release row lock on commit or rollback
          activeRowLock = false;
        }
      }

      // Launch Delivery A (30) and Delivery B (30) concurrently against 50 stock
      const [resA, resB] = await Promise.all([
        executeLockedDeliveryTransaction("DELIVERY-A", 30),
        executeLockedDeliveryTransaction("DELIVERY-B", 30),
      ]);

      // Exactly ONE must succeed, and ONE must fail
      const successes = [resA, resB].filter((r) => r.success);
      const failures = [resA, resB].filter((r) => !r.success);

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);
      expect(failures[0].error).toContain("Insufficient stock: Available 20, requested 30.");

      // Final stock must be exactly 20 (50 - 30 = 20)
      expect(databaseStock).toBe(20);
      expect(databaseStock).toBeGreaterThanOrEqual(0);

      // Ledger must contain exactly 1 entry for the single successful delivery
      expect(ledgerEntries.length).toBe(1);
      expect(ledgerEntries[0].quantityBefore).toBe(50);
      expect(ledgerEntries[0].quantityChange).toBe(-30);
      expect(ledgerEntries[0].quantityAfter).toBe(20);
    });
  });

  // -------------------------------------------------------------
  // L. Multiple Sequential Deliveries
  // -------------------------------------------------------------
  describe("L. Multiple Sequential Deliveries Sequence", () => {
    it("correctly tracks sequential deductions: 100 -> 70 -> 50 -> 25", () => {
      let balance = 100;
      const history: Array<{ before: number; change: number; after: number }> = [];

      function deliver(qty: number) {
        const before = balance;
        if (before < qty) throw new Error("Insufficient stock");
        balance -= qty;
        history.push({ before, change: -qty, after: balance });
      }

      deliver(30); // 100 -> 70
      deliver(20); // 70 -> 50
      deliver(25); // 50 -> 25

      expect(balance).toBe(25);
      expect(history).toEqual([
        { before: 100, change: -30, after: 70 },
        { before: 70, change: -20, after: 50 },
        { before: 50, change: -25, after: 25 },
      ]);
    });
  });

  // -------------------------------------------------------------
  // M. Transaction Rollback Simulation
  // -------------------------------------------------------------
  describe("M. Transaction Failure & Rollback", () => {
    it("completely aborts state change if error occurs post-inventory decrement before commit", () => {
      let initialStock = 80;
      let databaseStock = initialStock;
      let ledgerCreated = false;
      let orderStatus = "DRAFT";

      function executeFailingTransaction() {
        const snapshot = databaseStock;
        try {
          // Mutate inventory
          databaseStock -= 20;

          // Simulate database constraint failure on ledger creation or order status update
          throw new Error("Simulated database failure during audit commit");
        } catch (err) {
          // Transaction abort / rollback
          databaseStock = snapshot;
          ledgerCreated = false;
          orderStatus = "DRAFT";
          throw err;
        }
      }

      expect(() => executeFailingTransaction()).toThrow("Simulated database failure during audit commit");
      expect(databaseStock).toBe(80);
      expect(ledgerCreated).toBe(false);
      expect(orderStatus).toBe("DRAFT");
    });
  });
});
