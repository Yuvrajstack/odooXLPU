import { NextRequest, NextResponse } from "next/server";
import { AdjustmentService } from "@/services/adjustment.service";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await prisma.user.findFirst({
      where: { active: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "No active user found to validate" },
        { status: 400 }
      );
    }

    const result = await AdjustmentService.validateAdjustment(id, user.id);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to validate adjustment" },
      { status: 400 }
    );
  }
}
