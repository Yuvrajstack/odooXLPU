import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validations/auth";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = loginSchema.parse(body);

    const input = validated.loginId.trim();

    // Look up by loginId OR email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { loginId: input },
          { email: input.toLowerCase() },
        ],
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid Login Id or Password" },
        { status: 401 }
      );
    }

    const isMatch = await bcrypt.compare(validated.password, user.passwordHash);

    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid Login Id or Password" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        loginId: user.loginId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Invalid Login Id or Password" },
      { status: 400 }
    );
  }
}
