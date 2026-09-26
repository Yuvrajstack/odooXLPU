import { NextRequest, NextResponse } from "next/server";
import { TransferService } from "@/services/transfer.service";
import { createTransferSchema } from "@/lib/validations/transfer";
import { getCurrentUser, assertRole } from "@/lib/auth";
import { OperationStatus } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    assertRole(user, ["ADMIN", "INVENTORY_MANAGER", "WAREHOUSE_STAFF"]);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const status = (searchParams.get("status") as OperationStatus) || undefined;
    const sourceWarehouseId = searchParams.get("sourceWarehouseId") || undefined;
    const destinationWarehouseId =
      searchParams.get("destinationWarehouseId") || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 20;

    const result = await TransferService.getTransfers({
      search,
      status,
      sourceWarehouseId,
      destinationWarehouseId,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.name === "AuthorizationError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to fetch transfers" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    assertRole(user, ["ADMIN", "INVENTORY_MANAGER", "WAREHOUSE_STAFF"]);

    const body = await req.json();
    const validated = createTransferSchema.parse(body);

    const transfer = await TransferService.createTransfer(validated, user.id);
    return NextResponse.json(transfer, { status: 201 });
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
      { error: error.message || "Failed to create transfer" },
      { status: 400 }
    );
  }
}
