import { NextRequest, NextResponse } from "next/server";
import { WarehouseService } from "@/services/warehouse.service";
import { warehouseSchema } from "@/lib/validations/warehouse";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const warehouse = await WarehouseService.getWarehouseById(id);
    return NextResponse.json(warehouse);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Warehouse not found" },
      { status: 404 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const validated = warehouseSchema.partial().parse(body);
    const updated = await WarehouseService.updateWarehouse(id, validated);
    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to update warehouse" },
      { status: 400 }
    );
  }
}
