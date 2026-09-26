import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { profileUpdateSchema } from "@/lib/validations/auth";

export async function GET() {
  try {
    const user = await prisma.user.findFirst({
      where: { active: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "No user found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load profile" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = profileUpdateSchema.parse(body);

    const user = await prisma.user.findFirst({
      where: { active: true },
    });

    if (!user) {
      return NextResponse.json({ error: "No user found" }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(validated.name ? { name: validated.name } : {}),
        ...(validated.email ? { email: validated.email.toLowerCase() } : {}),
        ...(validated.avatar !== undefined ? { avatar: validated.avatar } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        active: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update profile" },
      { status: 400 }
    );
  }
}
