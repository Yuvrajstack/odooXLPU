# StockSense Architecture Specification

## 1. Executive Summary & Vision

StockSense is a high-reliability, production-grade Inventory Management System engineered to replace fragmented physical ledgers and spreadsheets with a centralized, real-time transactional system.

This system is built as a **Modular Monolith** prioritizing:
- **Transactional Correctness:** Zero ghost mutations or untracked changes.
- **Auditability:** Complete, append-only, immutable inventory ledger for every mutation.
- **Operational Density:** Fast keyboard-friendly interface, Linear/Vercel-inspired visual restraint, and maximum information readability.
- **Role-Based Security:** Multi-tiered authorization enforced strictly at the database and service layers.

---

## 2. Non-Negotiable Core Principle: Immutable Mutation Model

> **Rule:** Stock is NEVER directly or arbitrarily edited from the client or through arbitrary `UPDATE inventory SET quantity = X` operations.

Every single stock mutation in StockSense MUST satisfy these conditions:

1. **Originates from a Validated Transaction Document:**
   - **RECEIPT:** Increases stock upon goods intake validation.
   - **DELIVERY:** Decreases stock upon customer fulfillment validation (with strict non-negative stock guards).
   - **TRANSFER:** Decreases stock at source location and increases stock at destination location atomically. Total company quantity remains balanced.
   - **ADJUSTMENT:** Reconciles system count with verified physical count with a mandatory justification.

2. **Atomic Ledger Generation:**
   Every stock mutation and its corresponding `StockLedger` audit entries are executed within the **same interactive database transaction (`prisma.$transaction`)**.

3. **Rollback Guarantee:**
   If any ledger write or constraint validation fails, the entire transaction rolls back. There is mathematically zero scenario where inventory is modified without a ledger trace.

---

## 3. System Architecture & Flow

```
┌────────────────────────────────────────────────────────┐
│                   Client Layer (UI)                    │
│   Next.js 15 App Router + React 19 + shadcn/ui/Radix   │
└───────────────────────────┬────────────────────────────┘
                            │ (Form Submit / Mutation Request)
                            ▼
┌────────────────────────────────────────────────────────┐
│                   Validation Layer                     │
│               Zod Schema Validation                    │
└───────────────────────────┬────────────────────────────┘
                            │ (Parsed, Sanitized Data)
                            ▼
┌────────────────────────────────────────────────────────┐
│                  Authorization Layer                   │
│   NextAuth Session Check + Role-Based Access Control   │
│   (ADMIN | INVENTORY_MANAGER | WAREHOUSE_STAFF)        │
└───────────────────────────┬────────────────────────────┘
                            │ (Authorized Actor Context)
                            ▼
┌────────────────────────────────────────────────────────┐
│             Domain Application Services                │
│    (inventory.service, receipt.service, etc.)          │
│    - Stock availability re-validation                  │
│    - Concurrency check                                 │
└───────────────────────────┬────────────────────────────┘
                            │ (Atomic Execution Plan)
                            ▼
┌────────────────────────────────────────────────────────┐
│              Prisma Interactive Transaction            │
│  - Lock row / Verify current quantity                  │
│  - Mutate physical inventory record                    │
│  - Write immutable StockLedger record(s)               │
│  - Update transaction status to DONE                   │
└───────────────────────────┬────────────────────────────┘
                            │ (Commit)
                            ▼
┌────────────────────────────────────────────────────────┐
│                 PostgreSQL Database                    │
└────────────────────────────────────────────────────────┘
```

---

## 4. Directory & Codebase Structure

The project follows a domain-driven modular monolith directory layout:

```
a:/odooXLPU/
├── app/                           # Next.js App Router
│   ├── (auth)/                    # Authentication Route Group (Login, Signup, Reset)
│   ├── (dashboard)/               # Authenticated Application Shell Route Group
│   │   ├── dashboard/             # Operational Dashboard
│   │   ├── products/              # Product Catalog & SKU Management
│   │   ├── warehouses/            # Warehouses & Location Topologies
│   │   ├── operations/
│   │   │   ├── receipts/          # Inbound receipts workflow
│   │   │   ├── deliveries/        # Outbound deliveries workflow
│   │   │   ├── transfers/         # Internal transfers workflow
│   │   │   ├── adjustments/       # Stock reconciliation workflow
│   │   │   └── ledger/            # Immutable stock audit ledger
│   │   ├── settings/              # System & operational settings
│   │   └── profile/               # User profile & credentials
│   ├── api/                       # REST/JSON Route Handlers
│   ├── globals.css                # Base stylesheet, design tokens, CSS variables
│   ├── layout.tsx                 # Root layout & providers
│   └── page.tsx                   # Index redirection
├── components/                    # Component hierarchy
│   ├── layout/                    # Shell components (Sidebar, TopNav, MobileNav)
│   ├── ui/                        # Reusable atomic UI primitives (Button, Table, Card, etc.)
│   └── shared/                    # Composite business widgets (StatusBadge, PageHeader)
├── config/                        # Static application & navigation configs
├── hooks/                         # Custom React hooks
├── lib/                           # Core utilities, Auth, Prisma instance, Zod schemas
│   ├── auth.ts                    # NextAuth configuration and helpers
│   ├── db.ts                      # Singleton Prisma Client instance
│   └── utils.ts                   # Formatting, classes, and calculation helpers
├── prisma/                        # Database schema, migrations, seeders
│   ├── schema.prisma              # Database model definition
│   └── seed.ts                    # Idempotent development seeder
├── services/                      # Domain Business Logic Layer
│   ├── adjustment.service.ts      # Adjustment validation and execution
│   ├── delivery.service.ts        # Outbound allocation and execution
│   ├── inventory.service.ts       # Stock calculations and availability checks
│   ├── ledger.service.ts          # Ledger queries and auditing
│   ├── product.service.ts         # Catalog management
│   ├── receipt.service.ts         # Inbound stock intake and execution
│   ├── transfer.service.ts        # Intra-warehouse / inter-location transfers
│   └── warehouse.service.ts       # Facility and location management
└── types/                         # Shared TypeScript interfaces & DTOs
```

---

## 5. Domain Services Architecture

Domain services are pure TypeScript modules containing business rules, assertions, and transactional execution logic. They are decoupled from the HTTP transport layer (Next.js Request/Response) so they can be invoked cleanly by Route Handlers, Server Actions, or CLI scripts.

### Key Service Contracts:

1. **`inventory.service.ts`**
   - `getAvailableStock(productId, locationId)`
   - `assertStockAvailability(tx, productId, locationId, requestedQuantity)`
   - `calculateStockStatus(onHand, reorderPoint)`: `IN_STOCK | LOW_STOCK | OUT_OF_STOCK`

2. **`receipt.service.ts`**
   - `createDraft(receiptData, userId)`
   - `validateAndExecute(receiptId, userId)`: Evaluates items, checks locations, executes atomic stock increment, writes ledger entries, marks status `DONE`.

3. **`delivery.service.ts`**
   - `createDraft(deliveryData, userId)`
   - `validateAndExecute(deliveryId, userId)`: Validates available stock inside transaction, decreases inventory, writes ledger entries, marks status `DONE`. Rejects with human-readable error if stock is insufficient.

4. **`transfer.service.ts`**
   - `createDraft(transferData, userId)`
   - `validateAndExecute(transferId, userId)`: Atomically decrements source location inventory and increments destination location inventory, writing paired `TRANSFER_OUT` and `TRANSFER_IN` ledger records.

5. **`adjustment.service.ts`**
   - `createDraft(adjustmentData, userId)`
   - `validateAndExecute(adjustmentId, userId)`: Computes `difference = physical - system`, updates inventory count to match physical count, records `ADJUSTMENT` ledger record with the mandatory reason.

---

## 6. Authentication & Role-Based Access Control (RBAC)

### User Roles:
- **`ADMIN`**:
  - Full read/write access across all tenants, products, warehouses, locations, users, and audit records.
  - Can configure system settings, reorder thresholds, and invite users.
- **`INVENTORY_MANAGER`**:
  - Full access to catalog, warehouses, stock levels, and operations.
  - Can create and validate Receipts, Deliveries, Transfers, and Adjustments.
  - Cannot alter system-wide authentication settings or delete audit logs.
- **`WAREHOUSE_STAFF`**:
  - Read access to inventory, locations, and assigned warehouses.
  - Can draft operations and perform counts.
  - Validation of major stock adjustments requires manager/admin role.

### Security Guarantees:
- Passwords hashed using `bcryptjs` with standard salt rounds.
- Session verified on every server action / API request via `getServerSession`.
- Front-end navigation controls adapt to roles, but back-end services strictly enforce authorization independently.

---

## 7. Concurrency & Integrity Strategy

When multiple warehouse operators pick items or receive shipments simultaneously:
1. **In-Transaction Re-Validation:** Stock availability is never assumed based on frontend query results. The quantity check is re-executed inside the transaction.
2. **Deterministic Locking Sequence:** When modifying multiple inventory records, locations are queried and locked deterministically to prevent deadlocks.
3. **Optimistic/Pessimistic Guards:** If stock decreases below zero during transaction validation, an explicit `InsufficientStockError` is thrown, aborting the transaction before commit.

---

## 8. Design Tokens & UI Aesthetics

StockSense rejects generic, low-contrast AI dashboards in favor of:
- **Primary:** Deep Blue / Navy (`#1E3A8A` / `#2563EB`)
- **Background:** Crisp Light Slate (`#F8FAFC`)
- **Surface:** Pure White (`#FFFFFF`) with subtle 1px border (`#E2E8F0`)
- **Typography:** Clean sans-serif hierarchy (Inter / Geist) with crisp tabular numbers (`font-mono` where appropriate for SKUs and quantities).
- **Status Communicators:**
  - `DONE` / `IN_STOCK`: Emerald Green
  - `WAITING` / `LOW_STOCK`: Amber Warning
  - `OUT_OF_STOCK` / `CANCELED`: Rose Red
  - `DRAFT` / `READY`: Slate / Indigo

---

## 9. Phase 2 Architecture: Catalog, Topology & Inventory Visibility

Phase 2 establishes the complete structural foundation for managing products, categories, warehouse facilities, locations, and global inventory visibility without any premature stock mutations:

1. **Category Management (`/products/categories`):**
   - Unique code and name enforcement.
   - Referential integrity: Categories with active assigned products cannot be deleted.

2. **Product Catalog (`/products` and `/products/[id]`):**
   - Unique SKU enforcement.
   - Aggregate on-hand stock calculated dynamically across all locations.
   - Single domain-level stock status evaluator (`InventoryService.calculateStockStatus`).
   - Audit safety: Products with historical `StockLedger` entries cannot be deleted, only deactivated.

3. **Warehouse & Location Topology (`/warehouses` and `/warehouses/[id]`):**
   - Hierarchical facilities with storage zones categorized by `LocationType` (`RACK`, `SHELF`, `BIN`, `PALLET`, `FLOOR`, `INCOMING`, `OUTGOING`, `PRODUCTION`).
   - Unique compound constraint `[warehouseId, code]`.

4. **Global Inventory Balances (`/inventory`):**
   - Server-side, database-backed filtering by warehouse, location, category, and stock status.
   - Full URL query parameter synchronization.
   - Strict adherence to the non-negotiable invariant: Zero direct manual stock editing from the UI.

---

## 10. Phase 3 Architecture: Receipts / Stock Inward Workflow

Phase 3 implements the first physical stock mutation path in StockSense strictly governed by transactional invariants.

### 10.1 Invariant Statement
> **Receipt Validation Invariant:** Receipt validation atomically updates inventory, writes the corresponding `StockLedger` entries, and completes the receipt. If any operation fails, the entire transaction rolls back. There is zero possibility of partial stock mutations.

### 10.2 Lifecycle & State Machine
```
[ DRAFT ] ────────► [ READY / WAITING ] ────────► [ DONE (Locked) ]
    │
    └───────────────► [ CANCELED ]
```
- **`DRAFT`:** Can add/remove items, adjust quantities, change supplier information or destination locations.
- **`DONE`:** Terminal completed state. Historical record locked against modifications. Physical stock has been increased, and permanent ledger entries exist.
- **`CANCELED`:** Voided shipment with zero stock or ledger effect.

### 10.3 Transactional Flow (`ReceiptService.validateAndExecute`)
1. **Interactive Transaction Context (`prisma.$transaction`):** Ensures all operations share an atomic boundary.
2. **Idempotency Guard:** Checks `status !== "DONE"` inside the transaction. If already completed, duplicate attempts are immediately rejected without duplicate stock or ledger writes.
3. **Location-Warehouse Integrity:** Asserts every destination location belongs to the receipt's target warehouse (`location.warehouseId === receipt.warehouseId`).
4. **Physical Inventory Upsert:**
   - Reads current on-hand quantity for each `(productId, locationId)`.
   - Calculates `newQuantity = currentQuantity + inwardQuantity`.
   - Updates or creates the `Inventory` record.
5. **Immutable StockLedger Entry:**
   - Appends an audit record capturing `quantityBefore`, `quantityChange` (+), `quantityAfter`, `referenceId = receipt.id`, and `referenceNumber = receipt.receiptNumber`.
6. **Receipt Completion:**
   - Marks receipt status as `DONE`, recording `validatedById` and `validatedAt`.
7. **Rollback Guarantee:**
   - Any database constraint failure, concurrency conflict, or validation error triggers an immediate rollback of all changes.

### 10.4 Server-Side RBAC Enforcement
- **Receipt Viewing & Drafting:** `ADMIN`, `INVENTORY_MANAGER`, `WAREHOUSE_STAFF`.
- **Receipt Validation:** Strictly restricted to `ADMIN` and `INVENTORY_MANAGER`. `WAREHOUSE_STAFF` attempts are rejected at the service/API layer with HTTP 403.

---

## 11. Phase 4 Architecture: Deliveries / Stock-Out Workflow

Phase 4 implements the second real inventory mutation workflow in StockSense: **Outgoing Shipments / Deliveries**.

While Receipts add stock (`+`), Deliveries decrease stock (`-`). The delivery workflow is engineered to enforce physical stock integrity, prevent negative balances under concurrent operations, maintain multi-line transaction atomicity, and append immutable audit records to the `StockLedger`.

### 11.1 Core Invariants
1. **Negative Stock Invariant:** Physical stock must **NEVER** become negative under any circumstance. For every delivery line:
   $$\text{deliveryQuantity} \le \text{currentAvailableStock}$$
   must hold true at the authoritative moment of database mutation.
2. **Atomic Inventory Mutation & Ledger Generation:**
   $$\text{newQuantity} = \text{oldQuantity} - \text{deliveryQuantity} \quad (\text{where } \text{newQuantity} \ge 0)$$
   $$\text{StockLedger: } \text{quantityBefore} = \text{oldQuantity}, \, \text{quantityChange} = -\text{deliveryQuantity}, \, \text{quantityAfter} = \text{newQuantity}$$
   $$\text{Ledger Invariant: } \text{quantityAfter} = \text{quantityBefore} + \text{quantityChange}$$
3. **Multi-Line Atomicity:** If any single line item in a delivery fails stock validation, the entire transaction rolls back. No partial inventory decrements and zero ledger records are written.
4. **Completed Document Immutability:** Once marked `DONE`, a delivery is permanently locked. No modifications or cancellations are permitted.

### 11.2 Lifecycle & State Machine
```
[ DRAFT ] ────────► [ WAITING (Picking) ] ────────► [ READY ] ────────► [ DONE (Locked) ]
    │                      │                            │
    └──────────────────────┴────────────────────────────┴─────────────► [ CANCELED ]
```
- **`DRAFT`:** Editable. Can add/remove items, alter quantities, update customer consignee information, or adjust source locations.
- **`WAITING`:** Warehouse staff picking stage.
- **`READY`:** Staged at loading dock, awaiting carrier dispatch and final inventory validation.
- **`DONE`:** Terminal validated state. Physical stock decremented, immutable `DELIVERY` records created in `StockLedger`, and document permanently locked.
- **`CANCELED`:** Order voided with zero stock or ledger effect.

### 11.3 Concurrency Strategy: PostgreSQL Row-Level Locking (`SELECT ... FOR UPDATE`)
To prevent the classic "lost update" race condition where two concurrent deliveries evaluate the same stock and both succeed (e.g. 50 initial stock, Delivery A requests 30, Delivery B requests 30):

1. **Deterministic Lock Ordering:** Line items are sorted by `(productId, locationId)` prior to lock acquisition to guarantee zero transaction deadlocks during concurrent multi-line operations.
2. **Row-Level Exclusive Locking:** Inside the interactive transaction (`prisma.$transaction`), the service executes:
   ```sql
   SELECT id, quantity, "reservedQuantity"
   FROM "Inventory"
   WHERE "productId" = $1 AND "locationId" = $2
   FOR UPDATE;
   ```
3. **Serialized Evaluation:**
   - Transaction A acquires the row lock, reads 50, updates stock to 20, writes ledger, and commits.
   - Transaction B waits on the row lock, then reads the committed balance (20).
   - Transaction B checks $20 < 30$, immediately throws an `Insufficient stock` error, and aborts completely without modifying stock or writing ledger entries.
   - **Result:** Stock remains 20 (never $-10$), total delivered is 30 ($\le 50$), and exactly one audit ledger entry exists.

### 11.4 Transactional Execution Pipeline (`DeliveryService.validateAndExecute`)
```
BEGIN TRANSACTION
  1. Load Delivery with items, products, and locations inside transaction
  2. IDEMPOTENCY CHECK: Assert status !== "DONE" and status !== "CANCELED"
  3. LINE ITEMS CHECK: Assert delivery contains at least one line item
  4. LOCATION INTEGRITY: Assert all item source locations belong to Delivery.warehouseId
  5. DETERMINISTIC SORT: Order lines by (productId, locationId)
  6. FOR EACH LINE:
     a. Acquire row lock: SELECT ... FOR UPDATE on Inventory
     b. Authoritative Check: currentQuantity >= requestedQuantity
     c. Calculate: newQuantity = currentQuantity - requestedQuantity
     d. Invariant Check: newQuantity >= 0
     e. Update Inventory: SET quantity = newQuantity
     f. Append StockLedger:
          transactionType = DELIVERY
          quantityBefore = currentQuantity
          quantityChange = -requestedQuantity
          quantityAfter = newQuantity
          referenceType = DELIVERY
          referenceId = delivery.id
          referenceNumber = delivery.deliveryNumber
     g. Update DeliveryItem: deliveredQuantity = requestedQuantity
  7. Mark Delivery: status = DONE, validatedById = userId, validatedAt = now
COMMIT
(On any error: ROLLBACK EVERYTHING)
```

### 11.5 Role-Based Access Control (RBAC)
- **`ADMIN`:** Full read, create, update, validate, cancel permissions.
- **`INVENTORY_MANAGER`:** Full read, create, update, validate, cancel permissions.
- **`WAREHOUSE_STAFF`:** Permitted to view, create draft deliveries, and transition statuses (`DRAFT` $\to$ `WAITING` $\to$ `READY`). **Strictly forbidden** from executing validation or cancellation (enforced server-side with HTTP 403 / `AuthorizationError`).

---

## 12. Phase 5 Architecture: Internal Stock Transfers

Phase 5 introduces internal stock movements between physical locations: **Internal Transfers**.

A Transfer moves inventory from a source location to a destination location across intra-warehouse or cross-warehouse topologies. Crucially, a transfer is **NOT** implemented as independent Receipt and Delivery calls; it is executed as a **single, dedicated atomic transaction** that guarantees zero net stock change across the company.

### 12.1 Core Invariants
1. **Zero Net Stock Invariant:**
   $$\sum \text{Stock After (Affected Locations)} \equiv \sum \text{Stock Before (Affected Locations)}$$
   $$\text{Source After} = \text{Source Before} - \text{Transfer Quantity}$$
   $$\text{Destination After} = \text{Destination Before} + \text{Transfer Quantity}$$
   A transfer never creates or destroys inventory. Total enterprise stock is preserved identically.
2. **Negative Stock Invariant:**
   Source location physical stock must never become negative. For every transfer line:
   $$\text{transferQuantity} \le \text{authoritativeSourceInventory}$$
   must hold true under row-level locks at execution time.
3. **Dual-Sided Immutable Audit Trail:**
   Every transferred item generates exactly **two** linked records in `StockLedger`:
   - `TRANSFER_OUT`: `quantityBefore = sourceBefore`, `quantityChange = -transferQuantity`, `quantityAfter = sourceAfter`
   - `TRANSFER_IN`: `quantityBefore = destBefore`, `quantityChange = +transferQuantity`, `quantityAfter = destAfter`
   Both records share `referenceType = TRANSFER`, `referenceId = transfer.id`, and `referenceNumber = transfer.transferNumber`.
4. **Multi-Line Atomicity:**
   If any line in a multi-item transfer lacks sufficient source stock or fails validation, the entire transaction rolls back completely. Zero partial movements, zero decrements, and zero ledger records are committed.
5. **Completed Document Immutability & Idempotency:**
   Once marked `DONE`, a transfer is terminal and immutable. Duplicate validation attempts are safely rejected with an `Idempotency / Already Processed` error without additional mutations or duplicate ledger entries.

### 12.2 Lifecycle & State Machine
```
[ DRAFT ] ────────► [ WAITING (Staging) ] ────────► [ READY ] ────────► [ DONE (Locked) ]
    │                      │                               │
    └──────────────────────┴───────────────────────────────┴──────────► [ CANCELED ]
```
- **`DRAFT`:** Fully editable. Users can alter source/destination locations, add/remove items, adjust quantities, and save progress.
- **`WAITING`:** Internal movement scheduled, items being pulled or staged.
- **`READY`:** Stock prepared at staging point, ready for validation and transfer execution.
- **`DONE`:** Terminal validated state. Source inventory decremented, destination inventory incremented, dual `StockLedger` entries posted, and document locked.
- **`CANCELED`:** Transfer aborted prior to validation. Zero stock or ledger impact.

### 12.3 Concurrency & Deadlock Prevention Strategy
When multiple transfers or conflicting operations (e.g. transfers and deliveries) run concurrently, inconsistent lock acquisition orders cause database deadlocks (e.g. Transfer 1: $A \to B$ locks $A$ then $B$, while Transfer 2: $B \to A$ locks $B$ then $A$).

To guarantee total deadlock freedom:
1. **Deterministic Lock Sorting:**
   Before acquiring locks, the service collects every unique `(productId, locationId)` tuple touched across both source and destination locations for all line items. It sorts these lock keys deterministically in ascending alphanumeric order:
   $$\text{sortedKeys} = \text{sort}\big(\{(p_i, l_{\text{source}})\} \cup \{(p_i, l_{\text{dest}})\}\big) \quad \text{by } (productId \text{ ASC}, locationId \text{ ASC})$$
2. **Row-Level Exclusive Locking (`SELECT ... FOR UPDATE`):**
   The transaction iterates over the deterministically sorted keys and executes:
   ```sql
   SELECT id, quantity, "reservedQuantity"
   FROM "Inventory"
   WHERE "productId" = $1 AND "locationId" = $2
   FOR UPDATE;
   ```
3. **Unified Lock Protocol:**
   Because Receipts, Deliveries, and Transfers all share the same deterministic `SELECT ... FOR UPDATE` locking protocol over `(productId, locationId)`, concurrent cross-document operations (e.g. Transfer vs Delivery competing for Location A) serialize predictably without deadlocks or race conditions.

### 12.4 Transactional Execution Pipeline (`TransferService.validateAndExecute`)
```
BEGIN TRANSACTION (prisma.$transaction)
  1. Fetch Transfer header, items, source warehouse/location, and destination warehouse/location
  2. IDEMPOTENCY CHECK: Assert transfer.status !== "DONE" and status !== "CANCELED"
  3. LINE ITEMS CHECK: Assert transfer has at least one valid line item (quantity > 0)
  4. TOPOLOGY INTEGRITY:
     - Assert sourceLocation.warehouseId === transfer.sourceWarehouseId
     - Assert destinationLocation.warehouseId === transfer.destinationWarehouseId
     - Assert sourceLocationId !== destinationLocationId (Same Location Protection)
  5. COLLECT & SORT LOCK KEYS: Deterministically sort all (productId, locationId) pairs
  6. ACQUIRE EXCLUSIVE ROW LOCKS: Execute SELECT ... FOR UPDATE for all keys in sorted order
  7. RE-READ AUTHORITATIVE INVENTORY: Fetch authoritative source and destination balances
  8. STOCK VALIDATION: Assert sourceQuantity >= item.quantity for every line item
  9. FOR EACH LINE:
     a. Update Source: quantity = sourceBefore - quantity (Assert >= 0)
     b. Update/Upsert Destination: quantity = destBefore + quantity
     c. Append TRANSFER_OUT to StockLedger (quantityChange = -quantity)
     d. Append TRANSFER_IN to StockLedger (quantityChange = +quantity)
  10. Mark Transfer: status = DONE, validatedById = userId, validatedAt = now
COMMIT
(On any error: ROLLBACK EVERYTHING)
```

### 12.5 Cross-Warehouse Transfers
The system natively supports both intra-warehouse movements (e.g. *Main Warehouse / Rack A $\to$ Main Warehouse / Rack B*) and inter-warehouse movements (e.g. *Main Warehouse / Rack A $\to$ Production Warehouse / Raw Materials*). The transaction decrements the source inventory record and increments/upserts the destination inventory record with the correct destination `warehouseId`, maintaining enterprise-wide zero net stock delta.

### 12.6 Role-Based Access Control (RBAC)
- **`ADMIN`:** Full permissions (View, Create, Edit Draft, Transition Status, Validate, Cancel).
- **`INVENTORY_MANAGER`:** Full permissions (View, Create, Edit Draft, Transition Status, Validate, Cancel).
- **`WAREHOUSE_STAFF`:** Permitted to View, Create draft transfers, and Transition statuses (`DRAFT` $\to$ `WAITING` $\to$ `READY`). Validation (`POST /api/transfers/[id]/validate`) and Cancellation (`POST /api/transfers/[id]/cancel`) are strictly forbidden and rejected server-side with HTTP 403.




