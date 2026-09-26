import { NextRequest, NextResponse } from "next/server";
import { WarehouseService } from "@/services/warehouse.service";
import { locationSchema } from "@/lib/validations/location";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: warehouseId } = await params;
    const body = await req.json();
    const validated = locationSchema.parse({ ...body, warehouseId });
    const location = await WarehouseService.createLocation(validated);
    return NextResponse.json(location, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to create location" },
      { status: 400 }
    );
  }
}
