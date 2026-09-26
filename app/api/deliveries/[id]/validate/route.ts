import { NextRequest, NextResponse } from "next/server";
import { DeliveryService } from "@/services/delivery.service";
import { getCurrentUser, assertRole } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    // Explicit RBAC: Warehouse staff cannot validate delivery orders. Only Admin & Inventory Manager can.
    assertRole(user, ["ADMIN", "INVENTORY_MANAGER"]);

    const { id } = await params;
    const validatedDelivery = await DeliveryService.validateAndExecute(id, user.id);

    return NextResponse.json({
      success: true,
      message: `Delivery order ${validatedDelivery.deliveryNumber} successfully validated and inventory updated.`,
      delivery: validatedDelivery,
    });
  } catch (error: any) {
    if (error.name === "AuthorizationError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to validate delivery order" },
      { status: 400 }
    );
  }
}
