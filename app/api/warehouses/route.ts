import { NextRequest, NextResponse } from "next/server";
import { WarehouseService } from "@/services/warehouse.service";
import { warehouseSchema } from "@/lib/validations/warehouse";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const activeOnly = searchParams.get("activeOnly") === "true";

    const data = await WarehouseService.getWarehouses({ search, activeOnly });
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch warehouses" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = warehouseSchema.parse(body);
    const warehouse = await WarehouseService.createWarehouse(validated);
    return NextResponse.json(warehouse, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to create warehouse" },
      { status: 400 }
    );
  }
}
