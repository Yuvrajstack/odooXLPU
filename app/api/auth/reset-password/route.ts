import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { verifyOtp } from "@/lib/otp-store";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = resetPasswordSchema.parse(body);

    const isValidOtp = verifyOtp(validated.email, validated.otp);

    if (!isValidOtp) {
      return NextResponse.json(
        { error: "Invalid or expired OTP code. (For demo testing, you can also enter 123456)." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: validated.email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User account not found." },
        { status: 404 }
      );
    }

    const newPasswordHash = await bcrypt.hash(validated.newPassword, 10);

    await prisma.user.update({
      where: { email: validated.email.toLowerCase() },
      data: { passwordHash: newPasswordHash },
    });

    return NextResponse.json({
      message: "Password has been reset successfully. You can now sign in.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to reset password" },
      { status: 400 }
    );
  }
}
