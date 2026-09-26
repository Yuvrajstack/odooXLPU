import { NextRequest, NextResponse } from "next/server";
import { CategoryService } from "@/services/category.service";
import { categorySchema } from "@/lib/validations/category";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const activeOnly = searchParams.get("activeOnly") === "true";
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50;

    const data = await CategoryService.getCategories({
      search,
      activeOnly,
      page,
      limit,
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = categorySchema.parse(body);
    const category = await CategoryService.createCategory(validated);
    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to create category" },
      { status: 400 }
    );
  }
}
