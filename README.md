# StockSense 📦

> **Enterprise Multi-Warehouse Inventory Management System**  
> Built with Next.js 15, React 19, TypeScript, Tailwind CSS, Prisma ORM, and PostgreSQL.

---

## 1. Overview

**StockSense** is a modern, high-reliability inventory operations platform engineered to replace error-prone spreadsheets, paper registers, and disconnected inventory logs with an auditable, real-time transactional system.

Designed for industrial operations, distribution hubs, and manufacturing facilities, StockSense enforces strict inventory invariants, location-level tracking, and an append-only audit ledger for every physical stock mutation.

---

## 2. Core Non-Negotiable Architectural Invariant

> **Stock is NEVER arbitrarily updated from the client.**

Every stock modification must originate from an authorized, validated transactional document executed inside an **atomic PostgreSQL transaction (`prisma.$transaction`)**:

```
RECEIPT      ──► Increases stock at receiving location
DELIVERY     ──► Decreases stock at source location (non-negative enforced)
TRANSFER     ──► Atomically decrements source & increments destination
ADJUSTMENT   ──► Reconciles system count with verified physical count (requires mandatory reason)
```

- **Atomic Ledger Generation:** Every mutation creates corresponding immutable `StockLedger` audit records within the same transaction.
- **Rollback Guarantee:** If any step, rule, or constraint check fails, the entire transaction rolls back. There is zero possibility of inventory drift or untracked changes.

---

## 3. Technology Stack

- **Framework:** [Next.js 15 (App Router)](https://nextjs.org/)
- **UI & Components:** [React 19](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [Radix UI](https://www.radix-ui.com/), [Lucide React](https://lucide.dev/)
- **Data & Tables:** [TanStack Table v8](https://tanstack.com/table/v8), [TanStack Query v5](https://tanstack.com/query/v5), [Recharts](https://recharts.org/)
- **Validation & Forms:** [Zod](https://zod.dev/), [React Hook Form](https://react-hook-form.com/)
- **Database & ORM:** [PostgreSQL](https://www.postgresql.org/), [Prisma ORM](https://www.prisma.io/)
- **Authentication & RBAC:** [NextAuth.js](https://next-auth.js.org/), Bcrypt password hashing
- **Package Manager:** `pnpm`

---

## 4. Key Capabilities & Modules

- **Operational Dashboard:** Real-time visibility into active stock, low stock thresholds, out-of-stock SKUs, pending receipts, pending deliveries, and recent ledger entries.
- **Product Catalog:** SKU registry, categories, units of measure (UOM), and automated reorder rules.
- **Multi-Warehouse Topology:** Hierarchical facilities and sub-locations (Racks, Bins, Pallets, Receiving Docks, Shipping Docks, Production Areas).
- **Inbound Receipts:** Vendor intake workflow: Draft ➔ Inspection ➔ Validation ➔ Stock Intake + Ledger Entry.
- **Outbound Deliveries:** Customer fulfillment workflow: Stock Availability Check ➔ Reservation ➔ Validation ➔ Stock Deduction + Ledger Entry.
- **Internal Transfers:** Atomic location-to-location and facility-to-facility inventory balancing.
- **Stock Adjustments:** Physical cycle counts with mandatory discrepancy justification.
- **Stock Ledger (Audit Trail):** Immutable audit log capturing `quantityBefore`, `quantityChange`, `quantityAfter`, timestamp, user attribution, and document reference.
- **Role-Based Access Control:** Pre-configured tiers for `ADMIN`, `INVENTORY_MANAGER`, and `WAREHOUSE_STAFF`.

---

## 5. Directory Structure

```
odooXLPU/
├── app/                           # Next.js App Router
│   ├── (auth)/                    # Authentication Route Group (Login, Signup, Reset)
│   ├── (dashboard)/               # Authenticated Application Shell
│   │   ├── dashboard/             # Operational overview & live metrics
│   │   ├── products/              # Master catalog & SKUs
│   │   ├── warehouses/            # Facilities & location zones
│   │   ├── operations/
│   │   │   ├── receipts/          # Inbound purchase receipts
│   │   │   ├── deliveries/        # Outbound fulfillment orders
│   │   │   ├── transfers/         # Intra-location stock transfers
│   │   │   ├── adjustments/       # Discrepancy reconciliation
│   │   │   └── ledger/            # Immutable audit trail
│   │   ├── settings/              # System & operational thresholds
│   │   └── profile/               # User credentials & preferences
│   ├── globals.css                # Design system tokens & CSS variables
│   └── layout.tsx                 # Root layout & providers
├── components/
│   ├── layout/                    # Sidebar, TopNav, MobileNav, AppShell
│   └── ui/                        # Reusable primitives (Button, Card, Table, Badge, etc.)
├── config/                        # Navigation trees and site config
├── lib/                           # Database singleton, auth, and utilities
├── prisma/                        # Prisma schema and seed scripts
├── services/                      # Pure domain service layer
└── types/                         # TypeScript interfaces and DTOs
```

---

## 6. Getting Started

### Prerequisites
- Node.js 20.x or 22.x LTS
- `pnpm` (v9+)
- PostgreSQL 14+ or Supabase instance

### Installation

1. **Clone repository:**
   ```bash
   git clone https://github.com/Yuvrajstack/odooXLPU.git
   cd odooXLPU
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure Environment:**
   ```bash
   cp .env.example .env
   ```
   Update `.env` with your PostgreSQL database credentials:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/stocksense?schema=public"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-development-secret-key"
   ```

4. **Run Database Migrations & Seed Data:**
   ```bash
   pnpm prisma:generate
   pnpm prisma:migrate
   pnpm prisma:seed
   ```

5. **Start Development Server:**
   ```bash
   pnpm dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 7. Default Seed Accounts

| Role | Email | Password | Access Level |
|---|---|---|---|
| **Admin** | `admin@stocksense.io` | `StockSense2026!` | Full administrative & operational access |
| **Inventory Manager** | `manager@stocksense.io` | `StockSense2026!` | Catalog, warehouse, and validation management |
| **Warehouse Staff** | `staff@stocksense.io` | `StockSense2026!` | Daily warehouse operations & drafting |

---

## 8. Documentation References

For deep dives into the technical specifications:
- [ARCHITECTURE.md](ARCHITECTURE.md) — System flow, services layer, concurrency, and security
- [DATABASE.md](DATABASE.md) — ERD, tables, relational constraints, and audit invariants
- [DEVELOPMENT.md](DEVELOPMENT.md) — Development guidelines, scripts, and production deployment

---

## 9. License

Private & Proprietary. All rights reserved.