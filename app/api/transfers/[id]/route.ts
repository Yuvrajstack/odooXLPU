import { NextRequest, NextResponse } from "next/server";
import { TransferService } from "@/services/transfer.service";
import { updateTransferSchema } from "@/lib/validations/transfer";
import { getCurrentUser, assertRole } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    assertRole(user, ["ADMIN", "INVENTORY_MANAGER", "WAREHOUSE_STAFF"]);

    const { id } = await params;
    const transfer = await TransferService.getTransferById(id);
    return NextResponse.json(transfer);
  } catch (error: any) {
    if (error.name === "AuthorizationError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || "Transfer not found" },
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
    const validated = updateTransferSchema.parse(body);
    const updated = await TransferService.updateTransfer(id, validated, user.id);
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
      { error: error.message || "Failed to update transfer" },
      { status: 400 }
    );
  }
}
