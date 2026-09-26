import { NextRequest, NextResponse } from "next/server";
import { LedgerService } from "@/services/ledger.service";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const productId = searchParams.get("productId") || undefined;
    const warehouseId = searchParams.get("warehouseId") || undefined;
    const locationId = searchParams.get("locationId") || undefined;
    const transactionType = (searchParams.get("transactionType") as any) || undefined;
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const where = {
      ...(productId ? { productId } : {}),
      ...(warehouseId ? { warehouseId } : {}),
      ...(locationId ? { locationId } : {}),
      ...(transactionType ? { transactionType } : {}),
      ...(search
        ? {
            OR: [
              { referenceNumber: { contains: search, mode: "insensitive" as const } },
              { product: { name: { contains: search, mode: "insensitive" as const } } },
              { product: { sku: { contains: search, mode: "insensitive" as const } } },
              { notes: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const entries = await prisma.stockLedger.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, sku: true, uom: true } },
        warehouse: { select: { id: true, name: true, code: true } },
        location: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(entries);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch stock ledger" },
      { status: 500 }
    );
  }
}
