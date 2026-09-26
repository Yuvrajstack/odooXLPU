import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signupSchema } from "@/lib/validations/auth";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = signupSchema.parse(body);

    // Rule 1: Unique Login ID check
    const existingLoginId = await prisma.user.findFirst({
      where: { loginId: validated.loginId },
    });

    if (existingLoginId) {
      return NextResponse.json(
        { error: "This Login ID is already taken. Please choose another." },
        { status: 400 }
      );
    }

    // Rule 2: Unique Email ID check
    const existingEmail = await prisma.user.findUnique({
      where: { email: validated.email.toLowerCase() },
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: "This Email ID is already registered." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(validated.password, 10);

    const user = await prisma.user.create({
      data: {
        loginId: validated.loginId,
        name: validated.loginId,
        email: validated.email.toLowerCase(),
        passwordHash,
        role: (validated.role as any) || "WAREHOUSE_STAFF",
      },
      select: {
        id: true,
        loginId: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error: any) {
    if (error.errors && error.errors.length > 0) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to register user" },
      { status: 400 }
    );
  }
}
