# StockSense Development & Operations Manual

## 1. Prerequisites

- **Node.js:** v20.x or v22.x LTS
- **Package Manager:** `pnpm` (v9.x or higher)
- **Database:** PostgreSQL (v14+) or Supabase PostgreSQL instance

---

## 2. Initial Setup

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd odooXLPU
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure Environment Variables:**
   Copy the template file to `.env`:
   ```bash
   cp .env.example .env
   ```
   Configure your PostgreSQL connection string:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/stocksense?schema=public"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secure-nextauth-secret-key-min-32-chars"
   ```

---

## 3. Database Migration & Seeding

1. **Generate Prisma Client:**
   ```bash
   pnpm prisma:generate
   ```

2. **Apply Migrations:**
   ```bash
   pnpm prisma:migrate
   ```

3. **Seed Initial Demo Data (Warehouses, Products, Users, Locations):**
   ```bash
   pnpm prisma:seed
   ```

### Default Seed Accounts:
| Role | Email | Password |
|---|---|---|
| Admin | `admin@stocksense.io` | `StockSense2026!` |
| Inventory Manager | `manager@stocksense.io` | `StockSense2026!` |
| Warehouse Staff | `staff@stocksense.io` | `StockSense2026!` |

---

## 4. Development Workflow

- **Start Local Dev Server:**
  ```bash
  pnpm dev
  ```
  Access at `http://localhost:3000`

- **Lint Codebase:**
  ```bash
  pnpm lint
  ```

- **Run Test Suite:**
  ```bash
  pnpm test
  ```

- **Compile Production Build:**
  ```bash
  pnpm build
  ```

---

## 5. Architectural Quality Checklist

Before submitting PRs or progressing phases:
- [ ] No direct stock edits from client components.
- [ ] Every stock mutation creates corresponding `StockLedger` entries in the same Prisma transaction.
- [ ] Zod schemas validate both input bounds and logical state requirements.
- [ ] Role authorization verified at service/API boundaries.
- [ ] All table views include responsive pagination, loading skeletons, and empty states.
