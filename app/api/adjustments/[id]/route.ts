import { NextRequest, NextResponse } from "next/server";
import { AdjustmentService } from "@/services/adjustment.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adjustment = await AdjustmentService.getAdjustmentById(id);
    return NextResponse.json(adjustment);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Adjustment not found" },
      { status: 404 }
    );
  }
}
