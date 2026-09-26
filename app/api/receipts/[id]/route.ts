import { NextRequest, NextResponse } from "next/server";
import { ReceiptService } from "@/services/receipt.service";
import { updateReceiptSchema } from "@/lib/validations/receipt";
import { getCurrentUser, assertRole } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    assertRole(user, ["ADMIN", "INVENTORY_MANAGER", "WAREHOUSE_STAFF"]);

    const { id } = await params;
    const receipt = await ReceiptService.getReceiptById(id);
    return NextResponse.json(receipt);
  } catch (error: any) {
    if (error.name === "AuthorizationError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || "Receipt not found" },
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
    const validated = updateReceiptSchema.parse(body);
    const updated = await ReceiptService.updateReceipt(id, validated, user.id);
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
      { error: error.message || "Failed to update receipt" },
      { status: 400 }
    );
  }
}
