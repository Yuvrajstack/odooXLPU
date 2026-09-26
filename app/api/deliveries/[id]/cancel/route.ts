import { NextRequest, NextResponse } from "next/server";
import { DeliveryService } from "@/services/delivery.service";
import { getCurrentUser, assertRole } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    // Explicit RBAC: Warehouse staff cannot cancel delivery orders. Only Admin & Inventory Manager can.
    assertRole(user, ["ADMIN", "INVENTORY_MANAGER"]);

    const { id } = await params;
    const canceledDelivery = await DeliveryService.cancelDelivery(id, user.id);

    return NextResponse.json({
      success: true,
      message: `Delivery order ${canceledDelivery.deliveryNumber} canceled.`,
      delivery: canceledDelivery,
    });
  } catch (error: any) {
    if (error.name === "AuthorizationError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to cancel delivery order" },
      { status: 400 }
    );
  }
}
