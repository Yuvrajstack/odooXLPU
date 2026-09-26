import { NextRequest, NextResponse } from "next/server";
import { TransferService } from "@/services/transfer.service";
import { getCurrentUser, assertRole } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    // Explicit RBAC: Warehouse staff cannot validate internal transfers. Only Admin & Inventory Manager can.
    assertRole(user, ["ADMIN", "INVENTORY_MANAGER"]);

    const { id } = await params;
    const validatedTransfer = await TransferService.validateAndExecute(id, user.id);

    return NextResponse.json({
      success: true,
      message: `Transfer order ${validatedTransfer.transferNumber} successfully validated and inventory moved.`,
      transfer: validatedTransfer,
    });
  } catch (error: any) {
    if (error.name === "AuthorizationError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to validate transfer order" },
      { status: 400 }
    );
  }
}
