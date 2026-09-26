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


