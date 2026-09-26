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

  // 2. Categories
  const catRaw = await prisma.category.upsert({
    where: { code: "RAW" },
    update: {},
    create: {
      name: "Raw Materials",
      code: "RAW",
      description: "Base metals, structural polymers, and raw fabrication inputs",
    },
  });

  const catFinished = await prisma.category.upsert({
    where: { code: "FIN" },
    update: {},
    create: {
      name: "Finished Goods",
      code: "FIN",
      description: "Completed products ready for customer fulfillment",
    },
  });

  const catHardware = await prisma.category.upsert({
    where: { code: "HW" },
    update: {},
    create: {
      name: "Hardware",
      code: "HW",
      description: "Mechanical fasteners, bearings, bolts, and fittings",
    },
  });

  const catFurniture = await prisma.category.upsert({
    where: { code: "FURN" },
    update: {},
    create: {
      name: "Furniture",
      code: "FURN",
      description: "Office, warehouse, and industrial furnishings",
    },
  });

  const catElectronics = await prisma.category.upsert({
    where: { code: "ELEC" },
    update: {},
    create: {
      name: "Electronics",
      code: "ELEC",
      description: "Cables, sensors, controllers, and wiring components",
    },
  });

  console.log("Categories seeded successfully.");

  // 3. Warehouses & Locations
  const mainWarehouse = await prisma.warehouse.upsert({
    where: { code: "WH-MAIN" },
    update: {},
    create: {
      name: "Main Warehouse",
      code: "WH-MAIN",
      address: "100 Industrial Pkwy",
      city: "Chicago",
      state: "IL",
      country: "USA",
      active: true,
    },
  });

  const locRackA = await prisma.location.upsert({
    where: {
      warehouseId_code: { warehouseId: mainWarehouse.id, code: "LOC-RACK-A" },
    },
    update: {},
    create: {
      warehouseId: mainWarehouse.id,
      name: "Rack A",
      code: "LOC-RACK-A",
      type: LocationType.RACK,
      active: true,
    },
  });

  const locRackB = await prisma.location.upsert({
    where: {
      warehouseId_code: { warehouseId: mainWarehouse.id, code: "LOC-RACK-B" },
    },
    update: {},
    create: {
      warehouseId: mainWarehouse.id,
      name: "Rack B",
      code: "LOC-RACK-B",
      type: LocationType.RACK,
      active: true,
    },
  });

  const locLoading = await prisma.location.upsert({
    where: {
      warehouseId_code: { warehouseId: mainWarehouse.id, code: "LOC-LOAD" },
    },
    update: {},
    create: {
      warehouseId: mainWarehouse.id,
      name: "Loading Area",
      code: "LOC-LOAD",
      type: LocationType.INCOMING,
      active: true,
    },
  });

  const prodWarehouse = await prisma.warehouse.upsert({
    where: { code: "WH-PROD" },
    update: {},
    create: {
      name: "Production Warehouse",
      code: "WH-PROD",
      address: "45 Assembly Rd",
      city: "Detroit",
      state: "MI",
      country: "USA",
      active: true,
    },
  });

  const locRawMaterial = await prisma.location.upsert({
    where: {
      warehouseId_code: { warehouseId: prodWarehouse.id, code: "LOC-RAW" },
    },
    update: {},
    create: {
      warehouseId: prodWarehouse.id,
      name: "Raw Material Area",
      code: "LOC-RAW",
      type: LocationType.FLOOR,
      active: true,
    },
  });

  const locFinishedGoods = await prisma.location.upsert({
    where: {
      warehouseId_code: { warehouseId: prodWarehouse.id, code: "LOC-FIN" },
    },
    update: {},
    create: {
      warehouseId: prodWarehouse.id,
      name: "Finished Goods Bay",
      code: "LOC-FIN",
      type: LocationType.RACK,
      active: true,
    },
  });

  console.log("Warehouses and locations seeded successfully.");

  // 4. Products
  const pSteelRod = await prisma.product.upsert({
    where: { sku: "SKU-STL-0012" },
    update: {},
    create: {
      name: "Steel Rod 12mm",
      sku: "SKU-STL-0012",
      description: "Cold-rolled structural steel bar 12mm x 3m",
      categoryId: catRaw.id,
      uom: "meters",
      reorderPoint: 50,
      minStockLevel: 20,
      costPrice: 14.5,
      sellingPrice: 22.0,
      active: true,
    },
  });

  const pBolt = await prisma.product.upsert({
    where: { sku: "SKU-BLT-1050" },
    update: {},
    create: {
      name: "Hex Bolt M10x50",
      sku: "SKU-BLT-1050",
      description: "Zinc-plated grade 8.8 structural bolt",
      categoryId: catHardware.id,
      uom: "boxes",
      reorderPoint: 200,
      minStockLevel: 50,
      costPrice: 18.0,
      sellingPrice: 32.5,
      active: true,
    },
  });

  const pBearing = await prisma.product.upsert({
    where: { sku: "SKU-BRG-6204" },
    update: {},
    create: {
      name: "Ball Bearing 6204-2RS",
      sku: "SKU-BRG-6204",
      description: "Deep groove sealed ball bearing 20x47x14mm",
      categoryId: catHardware.id,
      uom: "units",
      reorderPoint: 50,
      minStockLevel: 15,
      costPrice: 4.25,
      sellingPrice: 8.5,
      active: true,
    },
  });

  const pChair = await prisma.product.upsert({
    where: { sku: "SKU-CHR-010" },
    update: {},
    create: {
      name: "Ergonomic Industrial Chair",
      sku: "SKU-CHR-010",
      description: "High-durability polyurethane ESD assembly chair",
      categoryId: catFurniture.id,
      uom: "units",
      reorderPoint: 15,
      minStockLevel: 5,
      costPrice: 85.0,
      sellingPrice: 140.0,
      active: true,
    },
  });

  const pTable = await prisma.product.upsert({
    where: { sku: "SKU-TBL-044" },
    update: {},
    create: {
      name: "Heavy Duty Workstation Table",
      sku: "SKU-TBL-044",
      description: "Steel frame workbench 1800x800mm with laminate top",
      categoryId: catFurniture.id,
      uom: "units",
      reorderPoint: 8,
      minStockLevel: 2,
      costPrice: 220.0,
      sellingPrice: 380.0,
      active: true,
    },
  });

  const pCable = await prisma.product.upsert({
    where: { sku: "SKU-CBL-4X15" },
    update: {},
    create: {
      name: "Industrial Copper Cable 4-Core",
      sku: "SKU-CBL-4X15",
      description: "Flexible PVC insulated power cable 4x1.5mm2",
      categoryId: catElectronics.id,
      uom: "meters",
      reorderPoint: 100,
      minStockLevel: 40,
      costPrice: 2.8,
      sellingPrice: 4.5,
      active: true,
    },
  });

  console.log("Products seeded successfully.");

  // 5. Physical Inventory Balances across Locations
  // Steel Rod: 150 at Rack A, 60 at Rack B, 30 at Raw Material (Total 240, In Stock)
  await prisma.inventory.upsert({
    where: {
      productId_locationId: { productId: pSteelRod.id, locationId: locRackA.id },
    },
    update: { quantity: 150 },
    create: {
      productId: pSteelRod.id,
      locationId: locRackA.id,
      warehouseId: mainWarehouse.id,
      quantity: 150,
      reservedQuantity: 0,
    },
  });

  await prisma.inventory.upsert({
    where: {
      productId_locationId: { productId: pSteelRod.id, locationId: locRackB.id },
    },
    update: { quantity: 60 },
    create: {
      productId: pSteelRod.id,
      locationId: locRackB.id,
      warehouseId: mainWarehouse.id,
      quantity: 60,
      reservedQuantity: 0,
    },
  });

  await prisma.inventory.upsert({
    where: {
      productId_locationId: { productId: pSteelRod.id, locationId: locRawMaterial.id },
    },
    update: { quantity: 30 },
    create: {
      productId: pSteelRod.id,
      locationId: locRawMaterial.id,
      warehouseId: prodWarehouse.id,
      quantity: 30,
      reservedQuantity: 0,
    },
  });

  // Bearing: 8 at Rack B (Reorder point 50 -> Low Stock!)
  await prisma.inventory.upsert({
    where: {
      productId_locationId: { productId: pBearing.id, locationId: locRackB.id },
    },
    update: { quantity: 8 },
    create: {
      productId: pBearing.id,
      locationId: locRackB.id,
      warehouseId: mainWarehouse.id,
      quantity: 8,
      reservedQuantity: 0,
    },
  });

  // Bolt: 0 units anywhere (Reorder point 200 -> Out of Stock!)
  await prisma.inventory.upsert({
    where: {
      productId_locationId: { productId: pBolt.id, locationId: locRackA.id },
    },
    update: { quantity: 0 },
    create: {
      productId: pBolt.id,
      locationId: locRackA.id,
      warehouseId: mainWarehouse.id,
      quantity: 0,
      reservedQuantity: 0,
    },
  });

  // Chair: 25 at Finished Goods Bay (In Stock)
  await prisma.inventory.upsert({
    where: {
      productId_locationId: { productId: pChair.id, locationId: locFinishedGoods.id },
    },
    update: { quantity: 25 },
    create: {
      productId: pChair.id,
      locationId: locFinishedGoods.id,
      warehouseId: prodWarehouse.id,
      quantity: 25,
      reservedQuantity: 2,
    },
  });

  // Table: 4 at Finished Goods Bay (Reorder point 8 -> Low Stock!)
  await prisma.inventory.upsert({
    where: {
      productId_locationId: { productId: pTable.id, locationId: locFinishedGoods.id },
    },
    update: { quantity: 4 },
    create: {
      productId: pTable.id,
      locationId: locFinishedGoods.id,
      warehouseId: prodWarehouse.id,
      quantity: 4,
      reservedQuantity: 0,
    },
  });

  // Cable: 350 at Rack A (In Stock)
  await prisma.inventory.upsert({
    where: {
      productId_locationId: { productId: pCable.id, locationId: locRackA.id },
    },
    update: { quantity: 350 },
    create: {
      productId: pCable.id,
      locationId: locRackA.id,
      warehouseId: mainWarehouse.id,
      quantity: 350,
      reservedQuantity: 20,
    },
  });

  console.log("Physical inventories seeded successfully.");

  // 6. Inbound Receipts
  // A. Completed Receipt: RCP-2026-0001
  const completedReceipt = await prisma.receipt.upsert({
    where: { receiptNumber: "RCP-2026-0001" },
    update: {},
    create: {
      receiptNumber: "RCP-2026-0001",
      supplierName: "Apex Industrial Supply Corp",
      supplierContact: "sales@apexindustrial.com",
      warehouseId: mainWarehouse.id,
      status: "DONE",
      notes: "Initial structural stock shipment received and inspected.",
      receivedDate: new Date("2026-09-20"),
      createdById: admin.id,
      validatedById: admin.id,
      validatedAt: new Date("2026-09-20"),
      items: {
        create: [
          {
            productId: pSteelRod.id,
            locationId: locRackA.id,
            expectedQuantity: 150,
            receivedQuantity: 150,
            unitCost: 14.5,
            notes: "Batch #STL-9812",
          },
        ],
      },
    },
  });

  // Matching StockLedger entry for completed receipt
  const existingLedger = await prisma.stockLedger.findFirst({
    where: { referenceNumber: "RCP-2026-0001" },
  });
  if (!existingLedger) {
    await prisma.stockLedger.create({
      data: {
        productId: pSteelRod.id,
        warehouseId: mainWarehouse.id,
        locationId: locRackA.id,
        transactionType: "RECEIPT",
        quantityBefore: 0,
        quantityChange: 150,
        quantityAfter: 150,
        referenceType: "RECEIPT",
        referenceId: completedReceipt.id,
        referenceNumber: "RCP-2026-0001",
        createdById: admin.id,
        createdAt: new Date("2026-09-20"),
        notes: "Stock received via RCP-2026-0001 from Apex Industrial Supply Corp",
      },
    });
  }

  // B. Draft Receipt: RCP-2026-0002 ready for validation testing in UI
  await prisma.receipt.upsert({
    where: { receiptNumber: "RCP-2026-0002" },
    update: {},
    create: {
      receiptNumber: "RCP-2026-0002",
      supplierName: "Midwest Dynamics Fasteners",
      supplierContact: "orders@midwestdynamics.com",
      warehouseId: mainWarehouse.id,
      status: "DRAFT",
      notes: "Replenishment for low-stock bearings and fittings.",
      receivedDate: new Date("2026-09-26"),
      createdById: staff.id,
      items: {
        create: [
          {
            productId: pBearing.id,
            locationId: locRackB.id,
            expectedQuantity: 40,
            receivedQuantity: 40,
            unitCost: 4.25,
            notes: "Bearing restock",
          },
        ],
      },
    },
  });

  console.log("Inbound receipts seeded successfully.");
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
