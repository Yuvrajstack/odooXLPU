# StockSense — UI Requirements Implementation Checklist

| Requirement | Page | Implemented | Notes |
| ----------- | ---- | ----------- | ----- |
| **Authentication: Sign In** | `/login` | Yes | Login form with credentials input, demo user picker, validation, and link to password reset & signup |
| **Authentication: Sign Up** | `/signup` | Yes | Registration with role selection (Inventory Manager vs Warehouse Staff), password validation |
| **Authentication: OTP Password Reset** | `/forgot-password` | Yes | 2-step OTP flow: Email verification -> 6-digit OTP code input -> Password reset confirmation |
| **Dashboard: Total Products in Stock KPI** | `/dashboard` | Yes | Real-time active items count with total catalog SKUs from Prisma |
| **Dashboard: Low Stock / Out of Stock KPI** | `/dashboard` | Yes | Aggregated count of low and out-of-stock items based on reorderPoint threshold |
| **Dashboard: Pending Receipts KPI** | `/dashboard` | Yes | Live count of pending incoming goods receipts (Draft, Waiting, Ready) |
| **Dashboard: Pending Deliveries KPI** | `/dashboard` | Yes | Live count of pending outgoing customer delivery orders |
| **Dashboard: Internal Transfers Scheduled KPI** | `/dashboard` | Yes | Live count of scheduled internal stock transfers |
| **Dashboard: Dynamic Filter by Document Type** | `/dashboard` | Yes | Filter operations by Receipts, Deliveries, Transfers, Adjustments, or All |
| **Dashboard: Dynamic Filter by Status** | `/dashboard` | Yes | Filter operations by Draft, Waiting, Ready, Done, Canceled |
| **Dashboard: Dynamic Filter by Warehouse/Location** | `/dashboard` | Yes | Filter operations by specific distribution center and rack/bin |
| **Dashboard: Dynamic Filter by Product Category** | `/dashboard` | Yes | Filter operations by product category |
| **Products: Master Catalog Table** | `/products` | Yes | Compact table with Name, SKU/Code, Category, UOM, Stock Quantity, Status badges |
| **Products: Create & Update Product** | `/products` | Yes | Modal/form with Name, SKU, Category, UOM, Cost/Selling Price, Reorder Points |
| **Products: Stock Availability per Location** | `/products/[id]` | Yes | Breakdown of inventory counts per warehouse facility and storage location |
| **Products: Product Categories** | `/products/categories` | Yes | Taxonomy management with name, code, description, and product counts |
| **Products: Reordering Rules** | `/products`, `/products/[id]` | Yes | Configurable reorder point, minimum safety stock, and maximum levels |
| **Receipts: Incoming Stock Table** | `/operations/receipts` | Yes | Search, status/warehouse filters, receipt number, supplier, expected vs received |
| **Receipts: Create New Receipt** | `/operations/receipts/new` | Yes | Form with supplier details, warehouse, received date, line items with target locations |
| **Receipts: Validate Incoming Stock** | `/operations/receipts/[id]` | Yes | Atomic stock increment, status transition to DONE, and StockLedger logging |
| **Deliveries: Outgoing Stock Table** | `/operations/deliveries` | Yes | Customer name, warehouse, shipment date, requested vs delivered units, status badges |
| **Deliveries: Create New Delivery Order** | `/operations/deliveries/new` | Yes | Customer details, warehouse, scheduled date, source location per item, requested qty |
| **Deliveries: Pick, Pack & Validate Outgoing Stock** | `/operations/deliveries/[id]` | Yes | Workflow progression (Draft -> Waiting -> Ready -> Validate), stock deduction & ledger record |
| **Internal Transfers: Transfers Table** | `/operations/transfers` | Yes | Transfer number, source facility/location, destination facility/location, item counts |
| **Internal Transfers: Create Transfer** | `/operations/transfers/new` | Yes | Select source vs destination warehouse & location, line items, and quantities |
| **Internal Transfers: Validate & Move Stock** | `/operations/transfers/[id]` | Yes | Atomic source deduction + destination addition, dual TRANSFER_OUT/IN ledger entries |
| **Stock Adjustments: Adjustments Table** | `/operations/adjustments` | Yes | Adjustment number, facility/location, mandatory reason, net difference, status badges |
| **Stock Adjustments: Create Adjustment** | `/operations/adjustments/new` | Yes | Warehouse & location selector, mandatory reason, system qty vs counted physical qty |
| **Stock Adjustments: Validate & Reconcile** | `/operations/adjustments/[id]` | Yes | Reconciles physical stock into database and creates immutable ADJUSTMENT ledger entry |
| **Stock Ledger: Move History Table** | `/operations/ledger` | Yes | Append-only audit trail with timestamp, SKU, facility, type, before/delta/after, operator |
| **Stock Ledger: Transaction Type Filters** | `/operations/ledger` | Yes | Filter by Receipt, Delivery, Transfer In, Transfer Out, Adjustment |
| **Warehouses: Multi-Warehouse Facilities** | `/warehouses` | Yes | List and manage warehouses with code, active locations, and total stored units |
| **Warehouses: Storage Locations** | `/warehouses/[id]` | Yes | Racks, shelves, bins, pallets, incoming/outgoing zones per warehouse |
| **Settings: Warehouse & Inventory Rules** | `/settings` | Yes | Warehouse shortcuts, global reordering defaults, and transactional safety policy |
| **Profile Menu: My Profile** | `/profile` | Yes | Identity details, assigned user role (Inventory Manager / Warehouse Staff), update name |
| **Profile Menu: Logout** | Sidebar / Mobile | Yes | Quick logout trigger returning user to `/login` |
| **Navigation: Standard Left Sidebar** | `components/layout/sidebar.tsx` | Yes | Overview, Inventory (Products, Categories, Balances, Warehouses), Operations, System |
| **Navigation: Responsive Mobile Drawer** | `components/layout/mobile-nav.tsx` | Yes | Fully responsive drawer navigation with user profile shortcut |
