import { NextRequest, NextResponse } from "next/server";
import { WarehouseService } from "@/services/warehouse.service";
import { locationSchema } from "@/lib/validations/location";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const location = await WarehouseService.getLocationById(id);
    return NextResponse.json(location);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Location not found" },
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
    const validated = locationSchema.partial().parse(body);
    const updated = await WarehouseService.updateLocation(id, validated);
    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to update location" },
      { status: 400 }
    );
  }
}
