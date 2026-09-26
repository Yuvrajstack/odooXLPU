import { NextRequest, NextResponse } from "next/server";
import { InventoryService } from "@/services/inventory.service";
import { StockStatus } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const categoryId = searchParams.get("categoryId") || undefined;
    const warehouseId = searchParams.get("warehouseId") || undefined;
    const locationId = searchParams.get("locationId") || undefined;
    const status = (searchParams.get("status") as StockStatus) || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 25;

    const data = await InventoryService.getGlobalInventory({
      search,
      categoryId,
      warehouseId,
      locationId,
      status,
      page,
      limit,
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch inventory balances" },
      { status: 500 }
    );
  }
}
