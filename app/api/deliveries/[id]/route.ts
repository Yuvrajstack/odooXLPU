import { NextRequest, NextResponse } from "next/server";
import { DeliveryService } from "@/services/delivery.service";
import { updateDeliverySchema } from "@/lib/validations/delivery";
import { getCurrentUser, assertRole } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    assertRole(user, ["ADMIN", "INVENTORY_MANAGER", "WAREHOUSE_STAFF"]);

    const { id } = await params;
    const delivery = await DeliveryService.getDeliveryById(id);
    return NextResponse.json(delivery);
  } catch (error: any) {
    if (error.name === "AuthorizationError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || "Delivery not found" },
      { status: 404 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    assertRole(user, ["ADMIN", "INVENTORY_MANAGER", "WAREHOUSE_STAFF"]);

    const { id } = await params;
    const body = await req.json();
    const validated = updateDeliverySchema.parse(body);
    const updated = await DeliveryService.updateDelivery(id, validated, user.id);
    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.name === "AuthorizationError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to update delivery" },
      { status: 400 }
    );
  }
}
