import { NextRequest, NextResponse } from "next/server";
import { ProductService } from "@/services/product.service";
import { productSchema } from "@/lib/validations/product";
import { StockStatus } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const categoryId = searchParams.get("categoryId") || undefined;
    const status = (searchParams.get("status") as StockStatus) || undefined;
    const active =
      searchParams.get("active") === "true"
        ? true
        : searchParams.get("active") === "false"
        ? false
        : undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 20;

    const data = await ProductService.getProducts({
      search,
      categoryId,
      status,
      active,
      page,
      limit,
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = productSchema.parse(body);
    const product = await ProductService.createProduct(validated);
    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to create product" },
      { status: 400 }
    );
  }
}
