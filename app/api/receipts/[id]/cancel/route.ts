import { NextRequest, NextResponse } from "next/server";
import { ReceiptService } from "@/services/receipt.service";
import { getCurrentUser, assertRole } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    assertRole(user, ["ADMIN", "INVENTORY_MANAGER"]);

    const { id } = await params;
    const canceledReceipt = await ReceiptService.cancelReceipt(id, user.id);

    return NextResponse.json({
      success: true,
      message: `Receipt ${canceledReceipt.receiptNumber} canceled.`,
      receipt: canceledReceipt,
    });
  } catch (error: any) {
    if (error.name === "AuthorizationError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to cancel receipt" },
      { status: 400 }
    );
  }
}
