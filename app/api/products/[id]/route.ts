import { NextRequest, NextResponse } from "next/server";
import { ProductService } from "@/services/product.service";
import { productSchema } from "@/lib/validations/product";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await ProductService.getProductById(id);
    return NextResponse.json(product);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Product not found" },
      { status: 404 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const validated = productSchema.partial().parse(body);
    const updated = await ProductService.updateProduct(id, validated);
    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to update product" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await ProductService.deleteProduct(id);
    return NextResponse.json({ success: true, message: "Product deleted" });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete product" },
      { status: 400 }
    );
  }
}
