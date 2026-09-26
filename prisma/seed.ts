import { PrismaClient, UserRole, LocationType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding StockSense database...");

  // 1. Users
  const passwordHash = await bcrypt.hash("StockSense2026!", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@stocksense.io" },
    update: {},
    create: {
      name: "Alex Vance",
      email: "admin@stocksense.io",
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@stocksense.io" },
    update: {},
    create: {
      name: "Marcus Brody",
      email: "manager@stocksense.io",
      passwordHash,
      role: UserRole.INVENTORY_MANAGER,
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: "staff@stocksense.io" },
    update: {},
    create: {
      name: "Sarah Jenkins",
      email: "staff@stocksense.io",
      passwordHash,
      role: UserRole.WAREHOUSE_STAFF,
    },
  });

  console.log("Users seeded successfully.");

  // 2. Warehouses & Locations
  const mainWarehouse = await prisma.warehouse.upsert({
    where: { code: "WH-MAIN" },
    update: {},
    create: {
      name: "Main Distribution Center",
      code: "WH-MAIN",
      address: "100 Industrial Pkwy",
      city: "Chicago",
      state: "IL",
      country: "USA",
      locations: {
        create: [
          { name: "Rack A-01", code: "LOC-A01", type: LocationType.RACK },
          { name: "Rack A-02", code: "LOC-A02", type: LocationType.RACK },
          { name: "Rack B-01", code: "LOC-B01", type: LocationType.RACK },
          { name: "Bin C-14", code: "LOC-C14", type: LocationType.BIN },
          { name: "Inbound Receiving Dock", code: "LOC-IN", type: LocationType.INCOMING },
          { name: "Outbound Shipping Dock", code: "LOC-OUT", type: LocationType.OUTGOING },
        ],
      },
    },
  });

  const prodWarehouse = await prisma.warehouse.upsert({
    where: { code: "WH-PROD" },
    update: {},
    create: {
      name: "Production Plant Warehouse",
      code: "WH-PROD",
      address: "45 Assembly Rd",
      city: "Detroit",
      state: "MI",
      country: "USA",
      locations: {
        create: [
          { name: "Raw Material Staging", code: "LOC-RAW", type: LocationType.FLOOR },
          { name: "Assembly Line 1", code: "LOC-PROD-1", type: LocationType.PRODUCTION },
          { name: "Finished Goods Rack", code: "LOC-FIN", type: LocationType.RACK },
        ],
      },
    },
  });

  console.log("Warehouses and locations seeded successfully.");

  // 3. Categories & Products
  const rawCat = await prisma.category.upsert({
    where: { code: "RAW" },
    update: {},
    create: {
      name: "Raw Materials",
      code: "RAW",
      description: "Base metals, ingots, and production inputs",
    },
  });

  const hwCat = await prisma.category.upsert({
    where: { code: "HW" },
    update: {},
    create: {
      name: "Hardware & Fasteners",
      code: "HW",
      description: "Bolts, nuts, bearings, and mechanical fasteners",
    },
  });

  const p1 = await prisma.product.upsert({
    where: { sku: "SKU-STL-0012" },
    update: {},
    create: {
      name: "Industrial Steel Rod 12mm",
      sku: "SKU-STL-0012",
      description: "Cold-rolled structural steel bar 12mm x 3m",
      categoryId: rawCat.id,
      uom: "meters",
      reorderPoint: 50,
      minStockLevel: 20,
      costPrice: 14.5,
      sellingPrice: 22.0,
    },
  });

  const p2 = await prisma.product.upsert({
    where: { sku: "SKU-BRG-6204" },
    update: {},
    create: {
      name: "Ball Bearing 6204-2RS",
      sku: "SKU-BRG-6204",
      description: "Deep groove sealed ball bearing 20x47x14mm",
      categoryId: hwCat.id,
      uom: "units",
      reorderPoint: 50,
      minStockLevel: 15,
      costPrice: 4.25,
      sellingPrice: 8.5,
    },
  });

  console.log("Products and categories seeded successfully.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
