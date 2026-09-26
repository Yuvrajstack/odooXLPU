import { NextRequest, NextResponse } from "next/server";
import { ReceiptService } from "@/services/receipt.service";
import { createReceiptSchema } from "@/lib/validations/receipt";
import { getCurrentUser, assertRole } from "@/lib/auth";
import { OperationStatus } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    assertRole(user, ["ADMIN", "INVENTORY_MANAGER", "WAREHOUSE_STAFF"]);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const status = (searchParams.get("status") as OperationStatus) || undefined;
    const warehouseId = searchParams.get("warehouseId") || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 20;

    const data = await ReceiptService.getReceipts({
      search,
      status,
      warehouseId,
      page,
      limit,
    });

    return NextResponse.json(data);
  } catch (error: any) {
    if (error.name === "AuthorizationError") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to fetch receipts" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    assertRole(user, ["ADMIN", "INVENTORY_MANAGER", "WAREHOUSE_STAFF"]);

    const body = await req.json();
    const validated = createReceiptSchema.parse(body);
    const receipt = await ReceiptService.createReceipt(validated, user.id);
    return NextResponse.json(receipt, { status: 201 });
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
      { error: error.message || "Failed to create receipt" },
      { status: 400 }
    );
  }
}
