import { NextRequest, NextResponse } from "next/server";
import { ReceiptService } from "@/services/receipt.service";
import { getCurrentUser, assertRole } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    // Explicit RBAC: Warehouse staff cannot validate receipts. Only Admin & Inventory Manager can.
    assertRole(user, ["ADMIN", "INVENTORY_MANAGER"]);

    const { id } = await params;
    const validatedReceipt = await ReceiptService.validateAndExecute(id, user.id);

    return NextResponse.json({
      success: true,
      message: `Receipt ${validatedReceipt.receiptNumber} successfully validated and inventory updated.`,
      receipt: validatedReceipt,
    });
  } catch (error: any) {
    if (error.name === "AuthorizationError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to validate receipt" },
      { status: 400 }
    );
  }
}
