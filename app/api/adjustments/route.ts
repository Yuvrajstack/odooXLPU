import { NextRequest, NextResponse } from "next/server";
import { AdjustmentService } from "@/services/adjustment.service";
import { createAdjustmentSchema } from "@/lib/validations/adjustment";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") as any;
    const warehouseId = searchParams.get("warehouseId") || undefined;
    const locationId = searchParams.get("locationId") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await AdjustmentService.getAdjustments({
      search,
      status,
      warehouseId,
      locationId,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch adjustments" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = createAdjustmentSchema.parse(body);

    const user = await prisma.user.findFirst({
      where: { active: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "No active user found in database" },
        { status: 400 }
      );
    }

    const adjustment = await AdjustmentService.createAdjustment(validated, user.id);
    return NextResponse.json(adjustment, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create adjustment" },
      { status: 400 }
    );
  }
}
