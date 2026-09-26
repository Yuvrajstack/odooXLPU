import { NextRequest, NextResponse } from "next/server";
import { DashboardService } from "@/services/dashboard.service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const documentType = (searchParams.get("documentType") as any) || "ALL";
    const status = (searchParams.get("status") as any) || undefined;
    const warehouseId = searchParams.get("warehouseId") || undefined;
    const locationId = searchParams.get("locationId") || undefined;
    const categoryId = searchParams.get("categoryId") || undefined;

    const [kpis, operations] = await Promise.all([
      DashboardService.getKPIs(),
      DashboardService.getFilteredOperations({
        documentType,
        status,
        warehouseId,
        locationId,
        categoryId,
        limit: 25,
      }),
    ]);

    return NextResponse.json({
      kpis,
      operations,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}
