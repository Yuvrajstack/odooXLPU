import { NextRequest, NextResponse } from "next/server";
import { TransferService } from "@/services/transfer.service";
import { getCurrentUser, assertRole } from "@/lib/auth";
import { OperationStatus } from "@/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    assertRole(user, ["ADMIN", "INVENTORY_MANAGER", "WAREHOUSE_STAFF"]);

    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status || !["DRAFT", "WAITING", "READY", "CANCELED"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status transition. Use dedicated validation endpoint to mark DONE." },
        { status: 400 }
      );
    }

    const result = await TransferService.updateStatus(id, status as OperationStatus);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error.name === "AuthorizationError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to update transfer status" },
      { status: 400 }
    );
  }
}
